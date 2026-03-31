from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Customer, Opportunity, Order, db
from utils.data_scope import get_accessible_user_ids
from utils.response import AppResponse
from utils.rbac import require_permission, require_role
from utils.db import PaginationHelper
from datetime import datetime
import uuid
import random

sales_bp = Blueprint('sales', __name__)


def _get_sales_scope_ids(current_user):
    return get_accessible_user_ids(current_user)

# ============ OPPORTUNITIES ============

@sales_bp.route('/opportunities', methods=['GET'])
@jwt_required()
@require_permission('sales:read')
def get_opportunities():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    page, per_page = PaginationHelper.get_pagination_params()
    
    query = Opportunity.query
    
    # Apply filters
    stage_filter = request.args.get('stage')
    customer_filter = request.args.get('customer_id', type=int)
    assigned_to = request.args.get('assigned_to', type=int)
    min_value = request.args.get('min_value', type=float)
    max_value = request.args.get('max_value', type=float)
    search_query = request.args.get('search')
    
    if stage_filter:
        query = query.filter(Opportunity.stage == stage_filter)
    
    if customer_filter:
        query = query.filter(Opportunity.customer_id == customer_filter)
    
    if min_value:
        query = query.filter(Opportunity.value >= min_value)
    
    if max_value:
        query = query.filter(Opportunity.value <= max_value)
    
    if search_query:
        search = f"%{search_query}%"
        query = query.filter(Opportunity.name.ilike(search))
    
    accessible_user_ids = _get_sales_scope_ids(current_user)

    if assigned_to:
        query = query.filter(Opportunity.assigned_to == assigned_to)
    elif accessible_user_ids is not None:
        query = query.filter(Opportunity.assigned_to.in_(accessible_user_ids))
    
    # Apply sorting - opportunities sorted by expected_close_date desc (urgent first)
    sort_by = request.args.get('sort_by', 'expected_close_date')
    sort_order = request.args.get('sort_order', 'asc')
    
    if hasattr(Opportunity, sort_by):
        if sort_order == 'asc':
            query = query.order_by(getattr(Opportunity, sort_by))
        else:
            query = query.order_by(getattr(Opportunity, sort_by).desc())
    
    opportunities = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return AppResponse.paginated(
        data=[opp.to_dict() for opp in opportunities.items],
        page=page,
        per_page=per_page,
        total=opportunities.total,
        pages=opportunities.pages
    )


@sales_bp.route('/opportunities', methods=['POST'])
@jwt_required()
@require_permission('sales:create')
def create_opportunity():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'customer_id', 'value']
    missing = [f for f in required_fields if f not in data or not data[f]]
    if missing:
        return AppResponse.bad_request(f'Missing required fields: {", ".join(missing)}')
    
    # Verify customer exists
    customer = Customer.query.get(data['customer_id'])
    if not customer:
        return AppResponse.not_found('Customer not found')

    accessible_user_ids = _get_sales_scope_ids(current_user)
    if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to create opportunities for this customer')
    
    try:
        assigned_to = data.get('assigned_to', current_user_id)
        if accessible_user_ids is not None and assigned_to not in accessible_user_ids:
            return AppResponse.forbidden('You can only assign opportunities within your accessible scope')
        opportunity = Opportunity(
            name=data['name'],
            customer_id=data['customer_id'],
            assigned_to=assigned_to,
            stage=data.get('stage', 'lead'),
            value=data['value'],
            probability=data.get('probability', 0),
            expected_close_date=datetime.fromisoformat(data['expected_close_date']).date() 
                if data.get('expected_close_date') else None,
            description=data.get('description')
        )
        
        db.session.add(opportunity)
        db.session.commit()
        
        return AppResponse.success(
            data=opportunity.to_dict(),
            message='Opportunity created successfully',
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@sales_bp.route('/opportunities/<int:opportunity_id>', methods=['GET'])
@jwt_required()
@require_permission('sales:read')
def get_opportunity(opportunity_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return AppResponse.not_found('Opportunity not found')
    
    # Check access
    accessible_user_ids = _get_sales_scope_ids(current_user)
    if accessible_user_ids is not None and opportunity.assigned_to not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to view this opportunity')
    
    return AppResponse.success(data=opportunity.to_dict())


@sales_bp.route('/opportunities/<int:opportunity_id>', methods=['PUT'])
@jwt_required()
@require_permission('sales:update')
def update_opportunity(opportunity_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return AppResponse.not_found('Opportunity not found')
    
    # Check access
    accessible_user_ids = _get_sales_scope_ids(current_user)
    if accessible_user_ids is not None and opportunity.assigned_to not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to update this opportunity')
    
    data = request.get_json()
    
    allowed_fields = ['name', 'stage', 'value', 'probability', 'expected_close_date', 
                      'description', 'assigned_to']
    
    try:
        if 'assigned_to' in data and accessible_user_ids is not None and data['assigned_to'] not in accessible_user_ids:
            return AppResponse.forbidden('You can only reassign opportunities within your accessible scope')
        for field in allowed_fields:
            if field in data and data[field] is not None:
                if field == 'expected_close_date':
                    value = datetime.fromisoformat(data[field]).date() if data[field] else None
                else:
                    value = data[field]
                setattr(opportunity, field, value)
        
        opportunity.updated_at = datetime.utcnow()
        db.session.commit()
        
        return AppResponse.success(
            data=opportunity.to_dict(),
            message='Opportunity updated successfully'
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@sales_bp.route('/opportunities/<int:opportunity_id>', methods=['DELETE'])
@jwt_required()
@require_role('admin')
def delete_opportunity(opportunity_id):
    opportunity = Opportunity.query.get(opportunity_id)
    if not opportunity:
        return AppResponse.not_found('Opportunity not found')
    
    try:
        db.session.delete(opportunity)
        db.session.commit()
        
        return AppResponse.success(message='Opportunity deleted successfully')
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


# ============ ORDERS ============

@sales_bp.route('/orders', methods=['GET'])
@jwt_required()
@require_permission('sales:read')
def get_orders():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    page, per_page = PaginationHelper.get_pagination_params()
    
    query = Order.query
    
    # Apply filters
    status_filter = request.args.get('status')
    customer_filter = request.args.get('customer_id', type=int)
    min_amount = request.args.get('min_amount', type=float)
    max_amount = request.args.get('max_amount', type=float)
    search_query = request.args.get('search')
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    if customer_filter:
        query = query.filter(Order.customer_id == customer_filter)
    
    if min_amount:
        query = query.filter(Order.total_amount >= min_amount)
    
    if max_amount:
        query = query.filter(Order.total_amount <= max_amount)
    
    if search_query:
        search = f"%{search_query}%"
        query = query.filter(Order.order_number.ilike(search))

    accessible_user_ids = _get_sales_scope_ids(current_user)
    if accessible_user_ids is not None:
        query = query.join(Customer, Customer.id == Order.customer_id).filter(
            Customer.assigned_sales_rep_id.in_(accessible_user_ids)
        )
    
    # Apply sorting
    sort_by = request.args.get('sort_by', 'order_date')
    sort_order = request.args.get('sort_order', 'desc')
    
    if hasattr(Order, sort_by):
        if sort_order == 'asc':
            query = query.order_by(getattr(Order, sort_by))
        else:
            query = query.order_by(getattr(Order, sort_by).desc())
    
    orders = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return AppResponse.paginated(
        data=[ord.to_dict() for ord in orders.items],
        page=page,
        per_page=per_page,
        total=orders.total,
        pages=orders.pages
    )


@sales_bp.route('/orders', methods=['POST'])
@jwt_required()
@require_permission('sales:create')
def create_order():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['customer_id', 'total_amount']
    missing = [f for f in required_fields if f not in data or (isinstance(data[f], (int, float)) and data[f] is None)]
    if missing:
        return AppResponse.bad_request(f'Missing required fields: {", ".join(missing)}')
    
    # Verify customer exists
    customer = Customer.query.get(data['customer_id'])
    if not customer:
        return AppResponse.not_found('Customer not found')
    
    try:
        # Generate order number
        order_number = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Verify opportunity if provided
        opportunity_id = data.get('opportunity_id')
        if opportunity_id:
            opportunity = Opportunity.query.get(opportunity_id)
            if not opportunity:
                return AppResponse.not_found('Opportunity not found')
        
        order = Order(
            order_number=order_number,
            customer_id=data['customer_id'],
            opportunity_id=opportunity_id,
            status=data.get('status', 'pending'),
            total_amount=data['total_amount'],
            currency=data.get('currency', 'USD'),
            order_date=datetime.fromisoformat(data['order_date']).date() 
                if data.get('order_date') else datetime.utcnow().date(),
            notes=data.get('notes')
        )
        
        db.session.add(order)
        db.session.commit()
        
        return AppResponse.success(
            data=order.to_dict(),
            message='Order created successfully',
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@sales_bp.route('/orders/<int:order_id>', methods=['GET'])
@jwt_required()
@require_permission('sales:read')
def get_order(order_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        return AppResponse.unauthorized('Invalid user')

    order = Order.query.get(order_id)
    if not order:
        return AppResponse.not_found('Order not found')
    accessible_user_ids = _get_sales_scope_ids(current_user)
    if accessible_user_ids is not None and order.customer and order.customer.assigned_sales_rep_id not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to view this order')
    
    return AppResponse.success(data=order.to_dict())


@sales_bp.route('/orders/<int:order_id>', methods=['PUT'])
@jwt_required()
@require_permission('sales:update')
def update_order(order_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        return AppResponse.unauthorized('Invalid user')

    order = Order.query.get(order_id)
    if not order:
        return AppResponse.not_found('Order not found')
    accessible_user_ids = _get_sales_scope_ids(current_user)
    if accessible_user_ids is not None and order.customer and order.customer.assigned_sales_rep_id not in accessible_user_ids:
        return AppResponse.forbidden('You do not have permission to update this order')
    
    data = request.get_json()
    
    allowed_fields = ['status', 'total_amount', 'shipped_date', 'delivered_date', 'notes']
    
    try:
        for field in allowed_fields:
            if field in data and data[field] is not None:
                if field in ['shipped_date', 'delivered_date']:
                    value = datetime.fromisoformat(data[field]).date() if data[field] else None
                else:
                    value = data[field]
                setattr(order, field, value)
        
        order.updated_at = datetime.utcnow()
        db.session.commit()
        
        return AppResponse.success(
            data=order.to_dict(),
            message='Order updated successfully'
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@sales_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@jwt_required()
@require_role('admin')
def delete_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        return AppResponse.not_found('Order not found')
    
    try:
        db.session.delete(order)
        db.session.commit()
        
        return AppResponse.success(message='Order deleted successfully')
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


# ============ PIPELINE ANALYTICS ============

@sales_bp.route('/pipeline/summary', methods=['GET'])
@jwt_required()
@require_permission('sales:read')
def get_pipeline_summary():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    # Build query
    query = Opportunity.query
    accessible_user_ids = _get_sales_scope_ids(current_user)
    if accessible_user_ids is not None:
        query = query.filter(Opportunity.assigned_to.in_(accessible_user_ids))
    
    # Calculate pipeline stats
    stages = {}
    for opportunity in query.all():
        stage = opportunity.stage
        if stage not in stages:
            stages[stage] = {
                'count': 0,
                'total_value': 0.0,
                'avg_probability': 0,
                'opportunities': []
            }
        
        stages[stage]['count'] += 1
        stages[stage]['total_value'] += opportunity.value or 0
        stages[stage]['opportunities'].append(opportunity.id)
    
    # Calculate average probability per stage
    for stage in stages:
        if stages[stage]['count'] > 0:
            total_prob = sum(Opportunity.query.get(opp_id).probability for opp_id in stages[stage]['opportunities'])
            stages[stage]['avg_probability'] = total_prob / stages[stage]['count']
    
    summary = {
        'total_opportunities': len(query.all()),
        'total_value': sum(opp.value or 0 for opp in query.all()),
        'stages': stages,
        'weighted_value': sum((opp.value or 0) * (opp.probability / 100) for opp in query.all())
    }
    
    return AppResponse.success(data=summary, message='Pipeline summary retrieved successfully')
