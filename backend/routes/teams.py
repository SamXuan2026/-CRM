from flask import Blueprint, request
from sqlalchemy import func

from datetime import datetime, timedelta

from models import Team, User, Customer, CustomerInteraction, Opportunity, Order, db
from utils.data_scope import can_access_user, get_accessible_user_ids, has_global_scope
from utils.db import PaginationHelper, safe_commit
from utils.rbac import get_current_user, require_permission
from utils.response import AppResponse, bad_request, not_found

teams_bp = Blueprint('teams', __name__)


def _get_visible_team_query(current_user):
    query = Team.query
    if has_global_scope(current_user):
        return query
    if current_user.team_id:
        return query.filter(Team.id == current_user.team_id)
    return query.filter(Team.id == -1)


def _build_team_summary(team, member_ids):
    if not member_ids:
        return {
            **team.to_dict(),
            'sales_count': 0,
            'customer_count': 0,
            'opportunity_count': 0,
            'order_count': 0,
            'won_opportunity_count': 0,
            'won_rate': 0,
            'order_total_amount': 0,
            'recent_interaction_count': 0,
        }

    customer_count = Customer.query.filter(Customer.assigned_sales_rep_id.in_(member_ids)).count()
    opportunity_count = Opportunity.query.filter(Opportunity.assigned_to.in_(member_ids)).count()
    won_opportunity_count = Opportunity.query.filter(
        Opportunity.assigned_to.in_(member_ids),
        Opportunity.stage.in_(['won', 'closed_won'])
    ).count()
    order_count = (
        Order.query.join(Customer, Order.customer_id == Customer.id)
        .filter(Customer.assigned_sales_rep_id.in_(member_ids))
        .count()
    )
    order_total_amount = (
        db.session.query(func.coalesce(func.sum(Order.total_amount), 0))
        .join(Customer, Order.customer_id == Customer.id)
        .filter(Customer.assigned_sales_rep_id.in_(member_ids))
        .scalar()
    ) or 0
    recent_cutoff = datetime.utcnow() - timedelta(days=7)
    recent_interaction_count = (
        CustomerInteraction.query
        .join(Customer, CustomerInteraction.customer_id == Customer.id)
        .filter(
            Customer.assigned_sales_rep_id.in_(member_ids),
            CustomerInteraction.date >= recent_cutoff,
        )
        .count()
    )
    sales_count = User.query.filter(User.team_id == team.id, User.role.in_(['sales', 'sales_lead'])).count()

    return {
        **team.to_dict(),
        'sales_count': sales_count,
        'customer_count': customer_count,
        'opportunity_count': opportunity_count,
        'order_count': order_count,
        'won_opportunity_count': won_opportunity_count,
        'won_rate': round((won_opportunity_count / opportunity_count) * 100, 1) if opportunity_count else 0,
        'order_total_amount': order_total_amount,
        'recent_interaction_count': recent_interaction_count,
    }


@teams_bp.route('', methods=['GET'])
@teams_bp.route('/', methods=['GET'])
@require_permission('users:read')
def list_teams():
    current_user = get_current_user()
    page, per_page = PaginationHelper.get_pagination_params()
    query = _get_visible_team_query(current_user)
    if request.args.get('is_active') is not None:
        query = query.filter(Team.is_active == (request.args.get('is_active', '').lower() in ['1', 'true', 'yes']))

    query = query.order_by(Team.created_at.desc())
    teams = query.paginate(page=page, per_page=per_page, error_out=False)
    return AppResponse.paginated(
        data=[team.to_dict() for team in teams.items],
        page=page,
        per_page=per_page,
        total=teams.total,
        pages=teams.pages,
        message='Teams retrieved successfully',
    )


@teams_bp.route('/overview', methods=['GET'])
@require_permission('users:read')
def list_team_overview():
    current_user = get_current_user()
    teams = _get_visible_team_query(current_user).order_by(Team.created_at.desc()).all()
    accessible_user_ids_raw = get_accessible_user_ids(current_user)
    accessible_user_ids = set(accessible_user_ids_raw) if accessible_user_ids_raw is not None else None
    team_summaries = []

    for team in teams:
        team_member_ids = [
            member.id for member in team.members
            if accessible_user_ids is None or member.id in accessible_user_ids
        ]
        team_summaries.append(_build_team_summary(team, team_member_ids))

    return AppResponse.success(
        data=team_summaries,
        message='Team overview retrieved successfully',
    )


@teams_bp.route('/<int:team_id>', methods=['GET'])
@require_permission('users:read')
def get_team(team_id):
    current_user = get_current_user()
    team = Team.query.get(team_id)
    if not team:
        return not_found('Team not found')
    if not has_global_scope(current_user) and current_user.team_id != team.id:
        return AppResponse.forbidden('You do not have permission to view this team')
    return AppResponse.success(data=team.to_dict(), message='Team retrieved successfully')


@teams_bp.route('', methods=['POST'])
@teams_bp.route('/', methods=['POST'])
@require_permission('users:create')
def create_team():
    current_user = get_current_user()
    if not has_global_scope(current_user):
        return AppResponse.forbidden('Only admins or managers can create teams')

    data = request.get_json() or {}
    if not data.get('name'):
        return bad_request('Team name is required')
    if Team.query.filter_by(name=data['name']).first():
        return bad_request('Team name already exists')

    team = Team(
        name=data['name'],
        description=data.get('description'),
        is_active=data.get('is_active', True),
    )
    db.session.add(team)
    db.session.flush()

    leader_id = data.get('leader_id')
    if leader_id:
        leader = User.query.get(leader_id)
        if not leader:
            db.session.rollback()
            return not_found('Leader not found')
        leader.team_id = team.id
        if leader.role == 'sales':
            leader.role = 'sales_lead'
        team.leader_id = leader.id

    if not safe_commit():
        return AppResponse.internal_error('Failed to create team')

    return AppResponse.success(data=team.to_dict(), message='Team created successfully', status_code=201)


@teams_bp.route('/<int:team_id>', methods=['PUT'])
@require_permission('users:update')
def update_team(team_id):
    current_user = get_current_user()
    if not has_global_scope(current_user):
        return AppResponse.forbidden('Only admins or managers can update teams')

    team = Team.query.get(team_id)
    if not team:
        return not_found('Team not found')

    data = request.get_json() or {}
    if 'name' in data and data['name']:
        existing = Team.query.filter(Team.name == data['name'], Team.id != team_id).first()
        if existing:
            return bad_request('Team name already exists')
        team.name = data['name']
    if 'description' in data:
        team.description = data['description']
    if 'is_active' in data:
        team.is_active = bool(data['is_active'])

    if 'leader_id' in data:
        leader_id = data['leader_id']
        if leader_id is None:
            team.leader_id = None
        else:
            leader = User.query.get(leader_id)
            if not leader:
                return not_found('Leader not found')
            leader.team_id = team.id
            if leader.role == 'sales':
                leader.role = 'sales_lead'
            team.leader_id = leader.id

    if not safe_commit():
        return AppResponse.internal_error('Failed to update team')

    return AppResponse.success(data=team.to_dict(), message='Team updated successfully')


@teams_bp.route('/<int:team_id>/members', methods=['GET'])
@require_permission('users:read')
def list_team_members(team_id):
    current_user = get_current_user()
    team = Team.query.get(team_id)
    if not team:
        return not_found('Team not found')
    if not has_global_scope(current_user) and current_user.team_id != team.id:
        return AppResponse.forbidden('You do not have permission to view this team')

    members = User.query.filter(User.team_id == team_id).order_by(User.created_at.desc()).all()
    return AppResponse.success(
        data=[member.to_dict() for member in members],
        message='Team members retrieved successfully',
    )


@teams_bp.route('/<int:team_id>/workspace', methods=['GET'])
@require_permission('users:read')
def get_team_workspace(team_id):
    current_user = get_current_user()
    team = Team.query.get(team_id)
    if not team:
        return not_found('Team not found')
    if not has_global_scope(current_user) and current_user.team_id != team.id:
        return AppResponse.forbidden('You do not have permission to view this team')

    accessible_user_ids_raw = get_accessible_user_ids(current_user)
    accessible_user_ids = set(accessible_user_ids_raw) if accessible_user_ids_raw is not None else None
    member_ids = [
        member.id for member in team.members
        if accessible_user_ids is None or member.id in accessible_user_ids
    ]
    members = [
        member.to_dict() for member in team.members
        if accessible_user_ids is None or member.id in accessible_user_ids
    ]

    customers = (
        Customer.query
        .filter(Customer.assigned_sales_rep_id.in_(member_ids))
        .order_by(Customer.updated_at.desc())
        .limit(8)
        .all()
        if member_ids else []
    )
    opportunities = (
        Opportunity.query
        .filter(Opportunity.assigned_to.in_(member_ids))
        .order_by(Opportunity.updated_at.desc())
        .limit(8)
        .all()
        if member_ids else []
    )
    orders = (
        Order.query
        .join(Customer, Order.customer_id == Customer.id)
        .filter(Customer.assigned_sales_rep_id.in_(member_ids))
        .order_by(Order.updated_at.desc())
        .limit(8)
        .all()
        if member_ids else []
    )
    pending_followups = []
    recent_interactions = []
    stage_distribution = {}
    member_metrics = []
    order_trend = []

    if member_ids:
        customer_rows = (
            Customer.query
            .filter(Customer.assigned_sales_rep_id.in_(member_ids))
            .all()
        )
        opportunity_rows = (
            Opportunity.query
            .filter(Opportunity.assigned_to.in_(member_ids))
            .all()
        )
        interaction_rows = (
            CustomerInteraction.query
            .join(Customer, CustomerInteraction.customer_id == Customer.id)
            .filter(Customer.assigned_sales_rep_id.in_(member_ids))
            .order_by(CustomerInteraction.date.desc())
            .all()
        )
        for item in opportunity_rows:
            stage_distribution[item.stage] = stage_distribution.get(item.stage, 0) + 1

        latest_interaction_by_customer = {}
        for interaction in interaction_rows:
            if interaction.customer_id not in latest_interaction_by_customer:
                latest_interaction_by_customer[interaction.customer_id] = interaction

        stale_cutoff = datetime.utcnow() - timedelta(days=7)
        pending_candidates = []
        for customer in customer_rows:
            latest_interaction = latest_interaction_by_customer.get(customer.id)
            latest_at = latest_interaction.date if latest_interaction else None
            needs_followup = latest_at is None or latest_at < stale_cutoff
            if not needs_followup:
                continue
            pending_candidates.append({
                'customer_id': customer.id,
                'customer_name': f'{customer.first_name} {customer.last_name}'.strip(),
                'company': customer.company,
                'owner_name': customer.assigned_sales_rep.display_name if customer.assigned_sales_rep else None,
                'status': customer.status,
                'last_interaction_at': latest_at.isoformat() if latest_at else None,
                'next_action': latest_interaction.next_action if latest_interaction else None,
            })

        pending_candidates.sort(
            key=lambda item: item['last_interaction_at'] or '',
        )
        pending_followups = pending_candidates[:8]

        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        recent_interactions = [
            {
                'id': interaction.id,
                'customer_id': interaction.customer_id,
                'customer_name': f'{interaction.customer.first_name} {interaction.customer.last_name}'.strip() if interaction.customer else '未知客户',
                'owner_name': interaction.user.display_name if interaction.user else None,
                'interaction_type': interaction.interaction_type,
                'subject': interaction.subject,
                'outcome': interaction.outcome,
                'date': interaction.date.isoformat(),
                'next_action': interaction.next_action,
            }
            for interaction in interaction_rows
            if interaction.date >= recent_cutoff
        ][:10]

        trend_cutoff = (datetime.utcnow() - timedelta(days=29)).date()
        trend_rows = (
            db.session.query(
                Order.order_date,
                func.coalesce(func.sum(Order.total_amount), 0),
            )
            .join(Customer, Order.customer_id == Customer.id)
            .filter(
                Customer.assigned_sales_rep_id.in_(member_ids),
                Order.order_date >= trend_cutoff,
            )
            .group_by(Order.order_date)
            .order_by(Order.order_date.asc())
            .all()
        )
        trend_map = {row[0].isoformat(): float(row[1] or 0) for row in trend_rows}
        for offset in range(30):
            trend_day = (trend_cutoff + timedelta(days=offset)).isoformat()
            order_trend.append({
                'date': trend_day,
                'amount': trend_map.get(trend_day, 0),
            })

        for member in team.members:
            if accessible_user_ids is not None and member.id not in accessible_user_ids:
                continue
            customer_count = Customer.query.filter(Customer.assigned_sales_rep_id == member.id).count()
            opportunity_count = Opportunity.query.filter(Opportunity.assigned_to == member.id).count()
            order_count = (
                Order.query
                .join(Customer, Order.customer_id == Customer.id)
                .filter(Customer.assigned_sales_rep_id == member.id)
                .count()
            )
            opportunity_value = (
                db.session.query(func.coalesce(func.sum(Opportunity.value), 0))
                .filter(Opportunity.assigned_to == member.id)
                .scalar()
            ) or 0
            member_metrics.append({
                'user_id': member.id,
                'user_name': member.display_name,
                'role': member.role,
                'customer_count': customer_count,
                'opportunity_count': opportunity_count,
                'order_count': order_count,
                'opportunity_value': opportunity_value,
            })

        member_metrics.sort(
            key=lambda item: (
                item['order_count'],
                item['opportunity_value'],
                item['opportunity_count'],
                item['customer_count'],
            ),
            reverse=True,
        )

    return AppResponse.success(
        data={
            'team': _build_team_summary(team, member_ids),
            'members': members,
            'customers': [item.to_dict() for item in customers],
            'opportunities': [item.to_dict() for item in opportunities],
            'orders': [item.to_dict() for item in orders],
            'stage_distribution': stage_distribution,
            'member_metrics': member_metrics,
            'pending_followups': pending_followups,
            'recent_interactions': recent_interactions,
            'order_trend': order_trend,
        },
        message='Team workspace retrieved successfully',
    )
