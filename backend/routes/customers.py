from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Customer, CustomerInteraction, db
from utils.response import AppResponse
from utils.rbac import require_permission, require_role
from utils.db import PaginationHelper, FilterHelper
from datetime import datetime

customers_bp = Blueprint('customers', __name__)


def _has_customer_global_scope(user):
    return user.role in ['admin', 'manager', 'marketing', 'customer_service']

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
    
    # Build base query
    query = Customer.query
    
    # Get filter parameters
    status_filter = request.args.get('status')
    level_filter = request.args.get('level')
    search_query = request.args.get('search')
    assigned_to = request.args.get('assigned_to', type=int)
    
    # Apply filters
    if status_filter:
        query = query.filter(Customer.status == status_filter)
    
    if level_filter:
        query = query.filter(Customer.customer_level == level_filter)
    
    if assigned_to:
        query = query.filter(Customer.assigned_sales_rep_id == assigned_to)
    elif not _has_customer_global_scope(current_user):
        # Non-admin/manager users can only see their own customers
        query = query.filter(Customer.assigned_sales_rep_id == current_user_id)
    
    if search_query:
        search = f"%{search_query}%"
        query = query.filter(
            (Customer.first_name.ilike(search)) |
            (Customer.last_name.ilike(search)) |
            (Customer.company.ilike(search)) |
            (Customer.email.ilike(search))
        )
    
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
                },
            )
            summary['total_interactions'] += 1

            if summary['last_interaction_at'] is None:
                summary['last_interaction_at'] = interaction.date.isoformat()
                summary['last_interaction_type'] = interaction.interaction_type
                summary['last_interaction_subject'] = interaction.subject
                summary['last_outcome'] = interaction.outcome
                summary['next_action'] = interaction.next_action

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
            },
        )
    
    return AppResponse.paginated(
        data=serialized_customers,
        page=page,
        per_page=per_page,
        total=customers.total,
        pages=customers.pages
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
    
    # Non-admin users create customers assigned to them
    if current_user.role not in ['admin', 'manager']:
        data['assigned_sales_rep_id'] = current_user_id
    elif 'assigned_sales_rep_id' not in data:
        data['assigned_sales_rep_id'] = current_user_id
    
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
    if not _has_customer_global_scope(current_user) and customer.assigned_sales_rep_id != current_user_id:
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
    if not _has_customer_global_scope(current_user) and customer.assigned_sales_rep_id != current_user_id:
        return AppResponse.forbidden('You do not have permission to update this customer')
    
    data = request.get_json()
    
    # Update allowed fields
    allowed_fields = [
        'first_name', 'last_name', 'company', 'email', 'phone', 'address', 
        'city', 'state', 'country', 'postal_code', 'status', 'customer_level',
        'assigned_sales_rep_id', 'notes'
    ]
    
    try:
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
    if not _has_customer_global_scope(current_user) and customer.assigned_sales_rep_id != current_user_id:
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
    if not _has_customer_global_scope(current_user) and customer.assigned_sales_rep_id != current_user_id:
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
            next_action=data.get('next_action')
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
