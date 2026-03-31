from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_, func
from models import User, Customer, CustomerInteraction, db
from utils.data_scope import get_accessible_user_ids
from utils.response import AppResponse
from utils.rbac import require_permission, require_role
from utils.db import PaginationHelper, FilterHelper
from datetime import datetime, timedelta

customers_bp = Blueprint('customers', __name__)


def _has_customer_global_scope(user):
    return user.role in ['admin', 'manager', 'marketing', 'customer_service']


def _get_customer_scope_ids(current_user):
    if current_user.role in ['marketing', 'customer_service']:
        return None
    return get_accessible_user_ids(current_user)


def _build_customer_query(current_user):
    query = Customer.query

    status_filter = request.args.get('status')
    level_filter = request.args.get('level')
    search_query = request.args.get('search')
    assigned_to = request.args.get('assigned_to', type=int)
    stale_days = request.args.get('stale_days', type=int)

    if status_filter:
        query = query.filter(Customer.status == status_filter)

    if level_filter:
        query = query.filter(Customer.customer_level == level_filter)

    accessible_user_ids = _get_customer_scope_ids(current_user)

    if assigned_to:
        query = query.filter(Customer.assigned_sales_rep_id == assigned_to)
    elif accessible_user_ids is not None:
        query = query.filter(Customer.assigned_sales_rep_id.in_(accessible_user_ids))

    if search_query:
        search = f"%{search_query}%"
        query = query.filter(
            (Customer.first_name.ilike(search)) |
            (Customer.last_name.ilike(search)) |
            (Customer.company.ilike(search)) |
            (Customer.email.ilike(search))
        )

    if stale_days:
        cutoff = datetime.utcnow() - timedelta(days=stale_days)
        latest_interaction_subquery = (
            db.session.query(
                CustomerInteraction.customer_id.label('customer_id'),
                func.max(CustomerInteraction.date).label('last_interaction_at'),
            )
            .group_by(CustomerInteraction.customer_id)
            .subquery()
        )
        query = (
            query
            .outerjoin(latest_interaction_subquery, Customer.id == latest_interaction_subquery.c.customer_id)
            .filter(
                (latest_interaction_subquery.c.last_interaction_at.is_(None)) |
                (latest_interaction_subquery.c.last_interaction_at < cutoff)
            )
        )

    return query

@customers_bp.route('/', methods=['GET'])
@jwt_required()
@require_permission('customers:read')
def get_customers():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    # Get pagination parameters
    page, per_page = PaginationHelper.get_pagination_params()
    
    query = _build_customer_query(current_user)
    
    # Apply sorting
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    if hasattr(Customer, sort_by):
        if sort_order == 'asc':
            query = query.order_by(getattr(Customer, sort_by))
        else:
            query = query.order_by(getattr(Customer, sort_by).desc())
    
    # Paginate
    customers = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    customer_items = customers.items
    serialized_customers = [customer.to_dict() for customer in customer_items]
    customer_id_list = [customer.id for customer in customer_items]

    interaction_summary_map = {}
    if customer_id_list:
        interaction_rows = (
            CustomerInteraction.query
            .filter(CustomerInteraction.customer_id.in_(customer_id_list))
            .order_by(CustomerInteraction.customer_id.asc(), CustomerInteraction.date.desc())
            .all()
        )

        for interaction in interaction_rows:
            summary = interaction_summary_map.setdefault(
                interaction.customer_id,
                {
                    'total_interactions': 0,
                    'last_interaction_at': None,
                    'last_interaction_type': None,
                    'last_interaction_subject': None,
                    'last_outcome': None,
                    'next_action': None,
                    'next_follow_up_at': None,
                    'reminder_status': None,
                },
            )
            summary['total_interactions'] += 1

            if summary['last_interaction_at'] is None:
                summary['last_interaction_at'] = interaction.date.isoformat()
                summary['last_interaction_type'] = interaction.interaction_type
                summary['last_interaction_subject'] = interaction.subject
                summary['last_outcome'] = interaction.outcome
                summary['next_action'] = interaction.next_action
                summary['next_follow_up_at'] = interaction.next_follow_up_at.isoformat() if interaction.next_follow_up_at else None
                summary['reminder_status'] = interaction.reminder_status

    for customer in serialized_customers:
        customer['interaction_summary'] = interaction_summary_map.get(
            customer['id'],
            {
                'total_interactions': 0,
                'last_interaction_at': None,
                'last_interaction_type': None,
                'last_interaction_subject': None,
                'last_outcome': None,
                'next_action': None,
                'next_follow_up_at': None,
                'reminder_status': None,
            },
        )
    
    return AppResponse.paginated(
        data=serialized_customers,
        page=page,
        per_page=per_page,
        total=customers.total,
        pages=customers.pages
    )


@customers_bp.route('/summary', methods=['GET'])
@jwt_required()
@require_permission('customers:read')
def get_customer_summary():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user:
        return AppResponse.unauthorized('Invalid user')

    query = _build_customer_query(current_user)
    customer_ids_subquery = query.with_entities(Customer.id).subquery()

    total = db.session.query(func.count()).select_from(customer_ids_subquery).scalar() or 0
    with_company = (
        db.session.query(func.count())
        .select_from(customer_ids_subquery)
        .join(Customer, Customer.id == customer_ids_subquery.c.id)
        .filter(
            Customer.company.isnot(None),
            func.length(func.trim(Customer.company)) > 0,
        )
        .scalar()
    ) or 0

    level_rows = (
        db.session.query(Customer.customer_level, func.count(Customer.id))
        .filter(Customer.id.in_(db.session.query(customer_ids_subquery.c.id)))
        .group_by(Customer.customer_level)
        .all()
    )
    status_rows = (
        db.session.query(Customer.status, func.count(Customer.id))
        .filter(Customer.id.in_(db.session.query(customer_ids_subquery.c.id)))
        .group_by(Customer.status)
        .all()
    )

    latest_date_subquery = (
        db.session.query(
            CustomerInteraction.customer_id.label('customer_id'),
            func.max(CustomerInteraction.date).label('last_interaction_at'),
        )
        .filter(CustomerInteraction.customer_id.in_(db.session.query(customer_ids_subquery.c.id)))
        .group_by(CustomerInteraction.customer_id)
        .subquery()
    )

    latest_interaction_subquery = (
        db.session.query(
            CustomerInteraction.customer_id.label('customer_id'),
            CustomerInteraction.date.label('last_interaction_at'),
            CustomerInteraction.next_action.label('next_action'),
        )
        .join(
            latest_date_subquery,
            and_(
                CustomerInteraction.customer_id == latest_date_subquery.c.customer_id,
                CustomerInteraction.date == latest_date_subquery.c.last_interaction_at,
            ),
        )
        .subquery()
    )

    covered = db.session.query(func.count()).select_from(latest_interaction_subquery).scalar() or 0
    recent_cutoff = datetime.utcnow() - timedelta(hours=72)
    recent = (
        db.session.query(func.count())
        .select_from(latest_interaction_subquery)
        .filter(latest_interaction_subquery.c.last_interaction_at >= recent_cutoff)
        .scalar()
    ) or 0
    with_next_action = (
        db.session.query(func.count())
        .select_from(latest_interaction_subquery)
        .filter(func.length(func.trim(func.coalesce(latest_interaction_subquery.c.next_action, ''))) > 0)
        .scalar()
    ) or 0

    return AppResponse.success(
        data={
            'total': total,
            'with_company': with_company,
            'by_level': {key or '未设置': value for key, value in level_rows},
            'by_status': {key or 'unknown': value for key, value in status_rows},
            'follow_up': {
                'covered': covered,
                'missing': max(total - covered, 0),
                'recent': recent,
                'with_next_action': with_next_action,
            },
        },
        message='Customer summary retrieved successfully',
    )


@customers_bp.route('/', methods=['POST'])
@jwt_required()
@require_permission('customers:create')
def create_customer():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['first_name', 'last_name', 'email']
    missing = [f for f in required_fields if f not in data or not data[f]]
    if missing:
        return AppResponse.bad_request(f'Missing required fields: {", ".join(missing)}')
    
    # Check if email already exists
    if Customer.query.filter_by(email=data['email']).first():
        return AppResponse.bad_request('Email already registered')
    
    accessible_user_ids = _get_customer_scope_ids(current_user)

    # Non-admin users create customers assigned to them
    if current_user.role not in ['admin', 'manager', 'sales_lead']:
        data['assigned_sales_rep_id'] = current_user_id
    elif 'assigned_sales_rep_id' not in data:
        data['assigned_sales_rep_id'] = current_user_id

    if accessible_user_ids is not None and data.get('assigned_sales_rep_id') not in accessible_user_ids:
        return AppResponse.forbidden('You can only assign customers within your accessible scope')
    
    try:
        customer = Customer(
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            company=data.get('company'),
            phone=data.get('phone'),
            address=data.get('address'),
            city=data.get('city'),
            state=data.get('state'),
            country=data.get('country'),
            postal_code=data.get('postal_code'),
            status=data.get('status', 'lead'),
            customer_level=data.get('customer_level', 'Standard'),
            assigned_sales_rep_id=data.get('assigned_sales_rep_id'),
            notes=data.get('notes')
        )
        
        db.session.add(customer)
        db.session.commit()
        
        return AppResponse.success(
            data=customer.to_dict(),
            message='Customer created successfully',
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@customers_bp.route('/<int:customer_id>', methods=['GET'])
@jwt_required()
@require_permission('customers:read')
def get_customer(customer_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    customer = Customer.query.get(customer_id)
    if not customer:
        return AppResponse.not_found('Customer not found')
    
    # Non-admin/manager users can only see customers assigned to them
    accessible_user_ids = _get_customer_scope_ids(current_user)
    if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to view this customer')
    
    return AppResponse.success(data=customer.to_dict())


@customers_bp.route('/<int:customer_id>', methods=['PUT'])
@jwt_required()
@require_permission('customers:update')
def update_customer(customer_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    customer = Customer.query.get(customer_id)
    if not customer:
        return AppResponse.not_found('Customer not found')
    
    # Non-admin/manager users can only update customers assigned to them
    accessible_user_ids = _get_customer_scope_ids(current_user)
    if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to update this customer')
    
    data = request.get_json()
    accessible_user_ids = _get_customer_scope_ids(current_user)
    
    # Update allowed fields
    allowed_fields = [
        'first_name', 'last_name', 'company', 'email', 'phone', 'address', 
        'city', 'state', 'country', 'postal_code', 'status', 'customer_level',
        'assigned_sales_rep_id', 'notes'
    ]
    
    try:
        if 'assigned_sales_rep_id' in data and accessible_user_ids is not None and data['assigned_sales_rep_id'] not in accessible_user_ids:
            return AppResponse.forbidden('You can only reassign customers within your accessible scope')
        for field in allowed_fields:
            if field in data and data[field] is not None:
                setattr(customer, field, data[field])
        
        customer.updated_at = datetime.utcnow()
        db.session.commit()
        
        return AppResponse.success(
            data=customer.to_dict(),
            message='Customer updated successfully'
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@customers_bp.route('/<int:customer_id>', methods=['DELETE'])
@jwt_required()
@require_role('admin')
def delete_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        return AppResponse.not_found('Customer not found')
    
    try:
        db.session.delete(customer)
        db.session.commit()
        
        return AppResponse.success(
            message='Customer deleted successfully'
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@customers_bp.route('/<int:customer_id>/interactions', methods=['GET'])
@jwt_required()
@require_permission('customers:read')
def get_customer_interactions(customer_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    customer = Customer.query.get(customer_id)
    if not customer:
        return AppResponse.not_found('Customer not found')
    
    # Non-admin/manager users can only see interactions for their customers
    accessible_user_ids = _get_customer_scope_ids(current_user)
    if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to view this customer')
    
    page, per_page = PaginationHelper.get_pagination_params()
    
    query = CustomerInteraction.query.filter_by(customer_id=customer_id)
    
    # Apply sorting
    sort_by = request.args.get('sort_by', 'date')
    sort_order = request.args.get('sort_order', 'desc')
    
    if hasattr(CustomerInteraction, sort_by):
        if sort_order == 'asc':
            query = query.order_by(getattr(CustomerInteraction, sort_by))
        else:
            query = query.order_by(getattr(CustomerInteraction, sort_by).desc())
    
    interactions = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return AppResponse.paginated(
        data=[i.to_dict() for i in interactions.items],
        page=page,
        per_page=per_page,
        total=interactions.total,
        pages=interactions.pages,
        message='Interactions retrieved successfully'
    )


@customers_bp.route('/<int:customer_id>/interactions', methods=['POST'])
@jwt_required()
@require_permission('customers:update')
def add_customer_interaction(customer_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    customer = Customer.query.get(customer_id)
    if not customer:
        return AppResponse.not_found('Customer not found')
    
    # Non-admin/manager users can only add interactions for their customers
    accessible_user_ids = _get_customer_scope_ids(current_user)
    if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to add interactions for this customer')
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['interaction_type', 'subject']
    missing = [f for f in required_fields if f not in data or not data[f]]
    if missing:
        return AppResponse.bad_request(f'Missing required fields: {", ".join(missing)}')
    
    try:
        interaction = CustomerInteraction(
            customer_id=customer_id,
            user_id=current_user_id,
            interaction_type=data['interaction_type'],
            subject=data['subject'],
            description=data.get('description'),
            date=datetime.fromisoformat(data['date']) if data.get('date') else datetime.utcnow(),
            duration_minutes=data.get('duration_minutes'),
            outcome=data.get('outcome'),
            next_action=data.get('next_action'),
            next_follow_up_at=datetime.fromisoformat(data['next_follow_up_at']) if data.get('next_follow_up_at') else None,
            reminder_status=data.get('reminder_status') or 'pending',
        )
        
        db.session.add(interaction)
        db.session.commit()
        
        return AppResponse.success(
            data=interaction.to_dict(),
            message='Interaction added successfully',
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))
