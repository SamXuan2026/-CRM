from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Customer, Lead, MarketingCampaign, CampaignLead, db
from utils.response import AppResponse
from utils.rbac import require_permission, require_role
from utils.db import PaginationHelper
from datetime import datetime
import uuid
from sqlalchemy import func, or_

marketing_bp = Blueprint('marketing', __name__)


def _has_marketing_global_scope(user):
    return user.role in ['admin', 'manager', 'marketing']

# ============ MARKETING CAMPAIGNS ============

@marketing_bp.route('/campaigns', methods=['GET'])
@jwt_required()
@require_permission('marketing:read')
def get_campaigns():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    page, per_page = PaginationHelper.get_pagination_params()
    
    query = MarketingCampaign.query
    
    # Apply filters
    status_filter = request.args.get('status')
    channel_filter = request.args.get('channel')
    search_query = request.args.get('search')
    manager_id = request.args.get('manager_id', type=int)
    min_budget = request.args.get('min_budget', type=float)
    max_budget = request.args.get('max_budget', type=float)
    
    if status_filter:
        query = query.filter(MarketingCampaign.status == status_filter)
    
    if channel_filter:
        query = query.filter(MarketingCampaign.channel == channel_filter)
    
    if search_query:
        search = f"%{search_query}%"
        query = query.filter(MarketingCampaign.name.ilike(search))
    
    if manager_id:
        query = query.filter(MarketingCampaign.manager_id == manager_id)
    elif current_user.role not in ['admin', 'manager']:
        # Non-admin/manager users only see their own campaigns
        query = query.filter(MarketingCampaign.manager_id == current_user_id)
    
    if min_budget:
        query = query.filter(MarketingCampaign.budget >= min_budget)
    
    if max_budget:
        query = query.filter(MarketingCampaign.budget <= max_budget)
    
    # Apply sorting
    sort_by = request.args.get('sort_by', 'start_date')
    sort_order = request.args.get('sort_order', 'desc')
    
    if hasattr(MarketingCampaign, sort_by):
        if sort_order == 'asc':
            query = query.order_by(getattr(MarketingCampaign, sort_by))
        else:
            query = query.order_by(getattr(MarketingCampaign, sort_by).desc())
    
    campaigns = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return AppResponse.paginated(
        data=[campaign.to_dict() for campaign in campaigns.items],
        page=page,
        per_page=per_page,
        total=campaigns.total,
        pages=campaigns.pages
    )


@marketing_bp.route('/campaigns', methods=['POST'])
@jwt_required()
@require_permission('marketing:create')
def create_campaign():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'budget', 'start_date']
    missing = [f for f in required_fields if f not in data or not data[f]]
    if missing:
        return AppResponse.bad_request(f'Missing required fields: {", ".join(missing)}')
    
    try:
        campaign = MarketingCampaign(
            name=data['name'],
            description=data.get('description'),
            status=data.get('status', 'planned'),
            budget=data['budget'],
            spent=data.get('spent', 0),
            start_date=datetime.fromisoformat(data['start_date']).date() 
                if data.get('start_date') else None,
            end_date=datetime.fromisoformat(data['end_date']).date() 
                if data.get('end_date') else None,
            target_audience=data.get('target_audience'),
            channel=data.get('channel', 'email'),
            manager_id=data.get('manager_id', current_user_id)
        )
        
        db.session.add(campaign)
        db.session.commit()
        
        return AppResponse.success(
            data=campaign.to_dict(),
            message='Campaign created successfully',
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@marketing_bp.route('/campaigns/<int:campaign_id>', methods=['GET'])
@jwt_required()
@require_permission('marketing:read')
def get_campaign(campaign_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    campaign = MarketingCampaign.query.get(campaign_id)
    if not campaign:
        return AppResponse.not_found('Campaign not found')
    
    # Check access
    if current_user.role not in ['admin', 'manager'] and campaign.manager_id != current_user_id:
        return AppResponse.forbidden('You do not have permission to view this campaign')
    
    return AppResponse.success(data=campaign.to_dict())


@marketing_bp.route('/campaigns/<int:campaign_id>', methods=['PUT'])
@jwt_required()
@require_permission('marketing:update')
def update_campaign(campaign_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    campaign = MarketingCampaign.query.get(campaign_id)
    if not campaign:
        return AppResponse.not_found('Campaign not found')
    
    # Check access
    if current_user.role not in ['admin', 'manager'] and campaign.manager_id != current_user_id:
        return AppResponse.forbidden('You do not have permission to update this campaign')
    
    data = request.get_json()
    
    allowed_fields = ['name', 'description', 'status', 'budget', 'spent', 
                      'start_date', 'end_date', 'target_audience', 'channel']
    
    try:
        for field in allowed_fields:
            if field in data and data[field] is not None:
                if field in ['start_date', 'end_date']:
                    value = datetime.fromisoformat(data[field]).date() if data[field] else None
                else:
                    value = data[field]
                setattr(campaign, field, value)
        
        campaign.updated_at = datetime.utcnow()
        db.session.commit()
        
        return AppResponse.success(
            data=campaign.to_dict(),
            message='Campaign updated successfully'
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@marketing_bp.route('/campaigns/<int:campaign_id>', methods=['DELETE'])
@jwt_required()
@require_role('admin')
def delete_campaign(campaign_id):
    campaign = MarketingCampaign.query.get(campaign_id)
    if not campaign:
        return AppResponse.not_found('Campaign not found')
    
    try:
        db.session.delete(campaign)
        db.session.commit()
        
        return AppResponse.success(message='Campaign deleted successfully')
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


# ============ MARKETING LEADS ============

@marketing_bp.route('/leads', methods=['GET'])
@jwt_required()
@require_permission('marketing:read')
def get_leads():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    page, per_page = PaginationHelper.get_pagination_params()
    
    query = Lead.query
    
    # Apply filters
    status_filter = request.args.get('status')
    source_filter = request.args.get('source')
    search_query = request.args.get('search')
    assigned_to = request.args.get('assigned_to', type=int)
    min_value = request.args.get('min_value', type=float)
    max_value = request.args.get('max_value', type=float)
    
    if status_filter:
        query = query.filter(Lead.status == status_filter)
    
    if source_filter:
        query = query.filter(Lead.source == source_filter)

    if search_query:
        search = f"%{search_query}%"
        query = query.join(Customer, Lead.customer_id == Customer.id).filter(
            or_(
                Customer.first_name.ilike(search),
                Customer.last_name.ilike(search),
                Customer.company.ilike(search),
                Customer.email.ilike(search),
                Lead.notes.ilike(search),
            )
        )
    
    if min_value:
        query = query.filter(Lead.value >= min_value)
    
    if max_value:
        query = query.filter(Lead.value <= max_value)
    
    if assigned_to:
        query = query.filter(Lead.assigned_to == assigned_to)
    elif not _has_marketing_global_scope(current_user):
        # Non-admin/manager users only see leads assigned to them
        query = query.filter(Lead.assigned_to == current_user_id)
    
    # Apply sorting
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    
    if hasattr(Lead, sort_by):
        if sort_order == 'asc':
            query = query.order_by(getattr(Lead, sort_by))
        else:
            query = query.order_by(getattr(Lead, sort_by).desc())
    
    leads = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return AppResponse.paginated(
        data=[lead.to_dict() for lead in leads.items],
        page=page,
        per_page=per_page,
        total=leads.total,
        pages=leads.pages
    )


@marketing_bp.route('/leads', methods=['POST'])
@jwt_required()
@require_permission('marketing:create')
def create_lead():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['customer_id', 'status', 'source']
    missing = [f for f in required_fields if f not in data or not data[f]]
    if missing:
        return AppResponse.bad_request(f'Missing required fields: {", ".join(missing)}')
    
    # Verify customer exists
    customer = Customer.query.get(data['customer_id'])
    if not customer:
        return AppResponse.not_found('Customer not found')
    
    try:
        lead = Lead(
            customer_id=data['customer_id'],
            assigned_to=data.get('assigned_to', current_user_id),
            status=data.get('status', 'new'),
            source=data['source'],
            value=data.get('value', 0),
            expected_close_date=datetime.fromisoformat(data['expected_close_date']).date() 
                if data.get('expected_close_date') else None,
            notes=data.get('notes')
        )
        
        db.session.add(lead)
        db.session.commit()
        
        return AppResponse.success(
            data=lead.to_dict(),
            message='Lead created successfully',
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@marketing_bp.route('/leads/<int:lead_id>', methods=['GET'])
@jwt_required()
@require_permission('marketing:read')
def get_lead(lead_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    lead = Lead.query.get(lead_id)
    if not lead:
        return AppResponse.not_found('Lead not found')
    
    # Check access
    if not _has_marketing_global_scope(current_user) and lead.assigned_to != current_user_id:
        return AppResponse.forbidden('You do not have permission to view this lead')
    
    return AppResponse.success(data=lead.to_dict())


@marketing_bp.route('/leads/<int:lead_id>', methods=['PUT'])
@jwt_required()
@require_permission('marketing:update')
def update_lead(lead_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    lead = Lead.query.get(lead_id)
    if not lead:
        return AppResponse.not_found('Lead not found')
    
    # Check access
    if not _has_marketing_global_scope(current_user) and lead.assigned_to != current_user_id:
        return AppResponse.forbidden('You do not have permission to update this lead')
    
    data = request.get_json()
    
    allowed_fields = ['status', 'source', 'value', 'expected_close_date', 'assigned_to', 'notes']
    
    try:
        for field in allowed_fields:
            if field in data and data[field] is not None:
                if field == 'expected_close_date':
                    value = datetime.fromisoformat(data[field]).date() if data[field] else None
                else:
                    value = data[field]
                setattr(lead, field, value)
        
        lead.updated_at = datetime.utcnow()
        db.session.commit()
        
        return AppResponse.success(
            data=lead.to_dict(),
            message='Lead updated successfully'
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


# ============ CAMPAIGN LEAD ASSIGNMENT ============

@marketing_bp.route('/campaigns/<int:campaign_id>/leads', methods=['GET'])
@jwt_required()
@require_permission('marketing:read')
def get_campaign_leads(campaign_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    campaign = MarketingCampaign.query.get(campaign_id)
    if not campaign:
        return AppResponse.not_found('Campaign not found')
    
    # Check access
    if current_user.role not in ['admin', 'manager'] and campaign.manager_id != current_user_id:
        return AppResponse.forbidden('You do not have permission to view this campaign')
    
    page, per_page = PaginationHelper.get_pagination_params()
    
    campaign_leads = CampaignLead.query.filter(CampaignLead.campaign_id == campaign_id).paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return AppResponse.paginated(
        data=[cl.to_dict() for cl in campaign_leads.items],
        page=page,
        per_page=per_page,
        total=campaign_leads.total,
        pages=campaign_leads.pages
    )


@marketing_bp.route('/campaigns/<int:campaign_id>/leads/<int:lead_id>', methods=['POST'])
@jwt_required()
@require_permission('marketing:create')
def assign_lead_to_campaign(campaign_id, lead_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    campaign = MarketingCampaign.query.get(campaign_id)
    if not campaign:
        return AppResponse.not_found('Campaign not found')
    
    # Check access
    if current_user.role not in ['admin', 'manager'] and campaign.manager_id != current_user_id:
        return AppResponse.forbidden('You do not have permission to assign leads to this campaign')
    
    lead = Lead.query.get(lead_id)
    if not lead:
        return AppResponse.not_found('Lead not found')
    
    # Check if already assigned
    existing = CampaignLead.query.filter(
        CampaignLead.campaign_id == campaign_id,
        CampaignLead.lead_id == lead_id
    ).first()
    
    if existing:
        return AppResponse.bad_request('Lead is already assigned to this campaign')
    
    try:
        data = request.get_json() or {}
        
        campaign_lead = CampaignLead(
            campaign_id=campaign_id,
            lead_id=lead_id,
            source=data.get('source', 'manual'),
            converted=data.get('converted', False)
        )
        
        db.session.add(campaign_lead)
        db.session.commit()
        
        return AppResponse.success(
            data=campaign_lead.to_dict(),
            message='Lead assigned to campaign successfully',
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@marketing_bp.route('/campaigns/<int:campaign_id>/leads/<int:lead_id>', methods=['PUT'])
@jwt_required()
@require_permission('marketing:update')
def update_campaign_lead(campaign_id, lead_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user:
        return AppResponse.unauthorized('Invalid user')
    
    campaign = MarketingCampaign.query.get(campaign_id)
    if not campaign:
        return AppResponse.not_found('Campaign not found')
    
    # Check access
    if current_user.role not in ['admin', 'manager'] and campaign.manager_id != current_user_id:
        return AppResponse.forbidden('You do not have permission to update this campaign')
    
    campaign_lead = CampaignLead.query.filter(
        CampaignLead.campaign_id == campaign_id,
        CampaignLead.lead_id == lead_id
    ).first()
    
    if not campaign_lead:
        return AppResponse.not_found('Campaign lead assignment not found')
    
    data = request.get_json()
    
    try:
        if 'converted' in data:
            campaign_lead.converted = data['converted']
            if data['converted']:
                campaign_lead.conversion_date = datetime.utcnow()
        
        if 'source' in data:
            campaign_lead.source = data['source']
        
        db.session.commit()
        
        return AppResponse.success(
            data=campaign_lead.to_dict(),
            message='Campaign lead updated successfully'
        )
    except Exception as e:
        db.session.rollback()
        return AppResponse.internal_error(str(e))


@marketing_bp.route('/campaigns/stats/summary', methods=['GET'])
@jwt_required()
@require_permission('marketing:read')
def get_campaign_stats_summary():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user:
        return AppResponse.unauthorized('Invalid user')

    query = MarketingCampaign.query
    if current_user.role not in ['admin', 'manager']:
        query = query.filter(MarketingCampaign.manager_id == current_user_id)

    campaigns = query.all()
    total_budget = sum(campaign.budget or 0 for campaign in campaigns)
    total_spent = sum(campaign.spent or 0 for campaign in campaigns)

    campaigns_by_status = {}
    campaigns_by_channel = {}
    for campaign in campaigns:
        campaigns_by_status[campaign.status] = campaigns_by_status.get(campaign.status, 0) + 1
        campaigns_by_channel[campaign.channel or 'unknown'] = campaigns_by_channel.get(campaign.channel or 'unknown', 0) + 1

    return AppResponse.success(
        data={
            'total_campaigns': len(campaigns),
            'active_campaigns': campaigns_by_status.get('active', 0) + campaigns_by_status.get('running', 0),
            'total_budget': float(total_budget),
            'total_spent': float(total_spent),
            'budget_utilization': float((total_spent / total_budget) * 100) if total_budget else 0.0,
            'campaigns_by_status': campaigns_by_status,
            'campaigns_by_channel': campaigns_by_channel
        },
        message='Campaign stats retrieved successfully'
    )


@marketing_bp.route('/leads/stats/summary', methods=['GET'])
@jwt_required()
@require_permission('marketing:read')
def get_lead_stats_summary():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user:
        return AppResponse.unauthorized('Invalid user')

    query = Lead.query
    if current_user.role not in ['admin', 'manager']:
        query = query.filter(Lead.assigned_to == current_user_id)

    leads = query.all()
    leads_by_status = {}
    leads_by_source = {}
    for lead in leads:
        leads_by_status[lead.status] = leads_by_status.get(lead.status, 0) + 1
        leads_by_source[lead.source or 'unknown'] = leads_by_source.get(lead.source or 'unknown', 0) + 1

    converted_count = sum(1 for lead in leads if lead.status == 'converted')

    return AppResponse.success(
        data={
            'total_leads': len(leads),
            'total_value': float(sum(lead.value or 0 for lead in leads)),
            'leads_by_status': leads_by_status,
            'leads_by_source': leads_by_source,
            'conversion_rate': float((converted_count / len(leads)) * 100) if leads else 0.0
        },
        message='Lead stats retrieved successfully'
    )
