from datetime import datetime, timedelta
import csv
import io

from flask import Blueprint, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from models import Customer, CustomerInteraction, Lead, Opportunity, Order, User, db
from utils.data_scope import get_accessible_user_ids
from utils.rbac import require_permission
from utils.response import AppResponse, forbidden, unauthorized, bad_request

reports_bp = Blueprint('reports', __name__)


def _get_current_user():
    user = User.query.get(get_jwt_identity())
    if not user or not user.is_active:
        return None
    return user


def _is_manager_scope(user):
    return user.role in ['admin', 'manager', 'sales_lead']


def _has_global_report_scope(user):
    return user.role in ['admin', 'manager', 'marketing']


@reports_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@require_permission('reports:read')
def get_dashboard_data():
    current_user = _get_current_user()
    if not current_user:
        return unauthorized('Invalid user')

    customer_query = Customer.query
    lead_query = Lead.query
    opportunity_query = Opportunity.query
    order_query = Order.query
    interaction_query = CustomerInteraction.query
    accessible_user_ids = get_accessible_user_ids(current_user)

    if accessible_user_ids is not None and not _has_global_report_scope(current_user):
        customer_query = customer_query.filter(Customer.assigned_sales_rep_id.in_(accessible_user_ids))
        lead_query = lead_query.filter(Lead.assigned_to.in_(accessible_user_ids))
        opportunity_query = opportunity_query.filter(Opportunity.assigned_to.in_(accessible_user_ids))
        order_query = order_query.join(Customer, Customer.id == Order.customer_id).filter(
            Customer.assigned_sales_rep_id.in_(accessible_user_ids)
        )
        interaction_query = interaction_query.filter(CustomerInteraction.user_id.in_(accessible_user_ids))

    total_customers = customer_query.count()
    total_leads = lead_query.count()
    total_opportunities = opportunity_query.count()
    total_orders = order_query.count()
    total_interactions = interaction_query.count()

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_customers = customer_query.filter(Customer.created_at >= thirty_days_ago).count()
    recent_leads = lead_query.filter(Lead.created_at >= thirty_days_ago).count()
    recent_opportunities = opportunity_query.filter(Opportunity.created_at >= thirty_days_ago).count()
    recent_orders = order_query.filter(Order.created_at >= thirty_days_ago).count()
    recent_interactions = interaction_query.filter(CustomerInteraction.date >= thirty_days_ago).count()

    total_revenue = sum(order.total_amount or 0 for order in order_query.filter(Order.status == 'delivered').all())
    open_pipeline = opportunity_query.filter(
        Opportunity.stage.notin_(['won', 'lost', 'closed_won', 'closed_lost'])
    ).all()
    pipeline_value = sum(opportunity.value or 0 for opportunity in open_pipeline)

    customer_status = {}
    for status, count in customer_query.with_entities(Customer.status, func.count(Customer.id)).group_by(Customer.status).all():
        customer_status[status or 'unknown'] = count

    lead_status = {}
    for status, count in lead_query.with_entities(Lead.status, func.count(Lead.id)).group_by(Lead.status).all():
        lead_status[status or 'unknown'] = count

    return AppResponse.success(
        data={
            'metrics': {
                'total_customers': total_customers,
                'total_leads': total_leads,
                'total_opportunities': total_opportunities,
                'total_orders': total_orders,
                'total_interactions': total_interactions,
                'total_revenue': float(total_revenue),
                'pipeline_value': float(pipeline_value),
            },
            'recent_activity': {
                'recent_customers': recent_customers,
                'recent_leads': recent_leads,
                'recent_opportunities': recent_opportunities,
                'recent_orders': recent_orders,
                'recent_interactions': recent_interactions,
            },
            'distributions': {
                'customer_status': customer_status,
                'lead_status': lead_status,
            },
        },
        message='Dashboard data retrieved successfully'
    )


@reports_bp.route('/sales', methods=['GET'])
@jwt_required()
@require_permission('reports:read')
def get_sales_report():
    current_user = _get_current_user()
    if not current_user:
        return unauthorized('Invalid user')

    start_date_raw = request.args.get('start_date')
    end_date_raw = request.args.get('end_date')

    start_date = datetime.fromisoformat(start_date_raw.split('T')[0]) if start_date_raw else datetime.utcnow() - timedelta(days=30)
    end_date = datetime.fromisoformat(end_date_raw.split('T')[0]) if end_date_raw else datetime.utcnow()

    orders_query = Order.query
    opportunities_query = Opportunity.query
    accessible_user_ids = get_accessible_user_ids(current_user)
    if accessible_user_ids is not None and not _has_global_report_scope(current_user):
        orders_query = orders_query.join(Customer, Customer.id == Order.customer_id).filter(
            Customer.assigned_sales_rep_id.in_(accessible_user_ids)
        )
        opportunities_query = opportunities_query.filter(Opportunity.assigned_to.in_(accessible_user_ids))

    orders = orders_query.filter(Order.created_at >= start_date, Order.created_at <= end_date).all()
    opportunities = opportunities_query.filter(
        Opportunity.created_at >= start_date,
        Opportunity.created_at <= end_date
    ).all()

    total_revenue = sum(order.total_amount or 0 for order in orders if order.status == 'delivered')
    delivered_orders = sum(1 for order in orders if order.status == 'delivered')
    pending_orders = sum(1 for order in orders if order.status in ['pending', 'confirmed'])
    open_pipeline = [opp for opp in opportunities if opp.stage not in ['won', 'lost', 'closed_won', 'closed_lost']]
    won_pipeline = [opp for opp in opportunities if opp.stage in ['won', 'closed_won']]
    lost_pipeline = [opp for opp in opportunities if opp.stage in ['lost', 'closed_lost']]
    total_closed = len(won_pipeline) + len(lost_pipeline)

    monthly_revenue = {}
    for order in orders:
        if order.status == 'delivered':
            key = order.created_at.strftime('%Y-%m')
            monthly_revenue[key] = monthly_revenue.get(key, 0) + (order.total_amount or 0)

    return AppResponse.success(
        data={
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
            },
            'revenue_metrics': {
                'total_revenue': float(total_revenue),
                'monthly_revenue': {key: float(value) for key, value in monthly_revenue.items()},
            },
            'order_metrics': {
                'total_orders': len(orders),
                'delivered_orders': delivered_orders,
                'pending_orders': pending_orders,
            },
            'opportunity_metrics': {
                'total_pipeline_value': float(sum(opp.value or 0 for opp in open_pipeline)),
                'closed_won_value': float(sum(opp.value or 0 for opp in won_pipeline)),
                'closed_lost_value': float(sum(opp.value or 0 for opp in lost_pipeline)),
                'win_rate': round((len(won_pipeline) / total_closed) * 100, 2) if total_closed else 0.0,
            },
        },
        message='Sales report retrieved successfully'
    )


@reports_bp.route('/activity', methods=['GET'])
@jwt_required()
@require_permission('reports:read')
def get_activity_report():
    current_user = _get_current_user()
    if not current_user:
        return unauthorized('Invalid user')

    start_date_raw = request.args.get('start_date')
    end_date_raw = request.args.get('end_date')

    start_date = datetime.fromisoformat(start_date_raw.split('T')[0]) if start_date_raw else datetime.utcnow() - timedelta(days=30)
    end_date = datetime.fromisoformat(end_date_raw.split('T')[0]) if end_date_raw else datetime.utcnow()

    interactions_query = CustomerInteraction.query
    leads_query = Lead.query
    customers_query = Customer.query
    accessible_user_ids = get_accessible_user_ids(current_user)

    if accessible_user_ids is not None and not _has_global_report_scope(current_user):
        interactions_query = interactions_query.filter(CustomerInteraction.user_id.in_(accessible_user_ids))
        leads_query = leads_query.filter(Lead.assigned_to.in_(accessible_user_ids))
        customers_query = customers_query.filter(Customer.assigned_sales_rep_id.in_(accessible_user_ids))

    interactions = interactions_query.filter(
        CustomerInteraction.date >= start_date,
        CustomerInteraction.date <= end_date
    ).all()
    leads = leads_query.filter(Lead.created_at >= start_date, Lead.created_at <= end_date).all()
    customers = customers_query.filter(Customer.created_at >= start_date, Customer.created_at <= end_date).all()

    interaction_breakdown = {}
    user_activities = {}
    for interaction in interactions:
        interaction_breakdown[interaction.interaction_type] = interaction_breakdown.get(interaction.interaction_type, 0) + 1
        if _is_manager_scope(current_user):
            user_key = str(interaction.user_id)
            user_activities[user_key] = user_activities.get(user_key, 0) + 1

    return AppResponse.success(
        data={
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
            },
            'activity_counts': {
                'interactions': len(interactions),
                'new_leads': len(leads),
                'new_customers': len(customers),
            },
            'interaction_breakdown': interaction_breakdown,
            'user_activities': user_activities,
        },
        message='Activity report retrieved successfully'
    )


@reports_bp.route('/export', methods=['GET'])
@jwt_required()
@require_permission('reports:export')
def export_data():
    current_user = _get_current_user()
    if not current_user:
        return unauthorized('Invalid user')
    if current_user.role not in ['admin', 'manager']:
        return forbidden('Insufficient permissions')

    report_type = request.args.get('type', 'customers')
    start_date_raw = request.args.get('start_date')
    end_date_raw = request.args.get('end_date')

    start_date = datetime.fromisoformat(start_date_raw.split('T')[0]) if start_date_raw else None
    end_date = datetime.fromisoformat(end_date_raw.split('T')[0]) if end_date_raw else None

    if report_type == 'customers':
        model = Customer
    elif report_type == 'leads':
        model = Lead
    elif report_type == 'opportunities':
        model = Opportunity
    elif report_type == 'orders':
        model = Order
    else:
        return bad_request('Invalid report type')

    query = model.query
    if start_date:
        query = query.filter(model.created_at >= start_date)
    if end_date:
        query = query.filter(model.created_at <= end_date)

    records = [record.to_dict() for record in query.all()]
    output = io.StringIO()

    if records:
        writer = csv.DictWriter(output, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={report_type}_export.csv'}
    )
