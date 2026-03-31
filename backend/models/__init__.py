from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from enum import Enum

# Global db instance - will be initialized in app.py
db = SQLAlchemy()


class Team(db.Model):
    __tablename__ = 'teams'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.Text)
    leader_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = db.relationship('User', back_populates='team', foreign_keys='User.team_id', lazy=True)
    leader = db.relationship('User', back_populates='managed_team', foreign_keys=[leader_id], uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'leader_id': self.leader_id,
            'leader_name': (
                f'{self.leader.first_name or ""} {self.leader.last_name or ""}'.strip()
                if self.leader else None
            ),
            'is_active': self.is_active,
            'member_count': len(self.members),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='sales')
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    team = db.relationship('Team', back_populates='members', foreign_keys=[team_id])
    managed_team = db.relationship('Team', back_populates='leader', foreign_keys='Team.leader_id', uselist=False)
    assigned_customers = db.relationship('Customer', back_populates='assigned_sales_rep', foreign_keys='Customer.assigned_sales_rep_id', lazy=True)
    assigned_opportunities = db.relationship('Opportunity', back_populates='assigned_user', foreign_keys='Opportunity.assigned_to', lazy=True)
    managed_campaigns = db.relationship('MarketingCampaign', back_populates='manager_user', foreign_keys='MarketingCampaign.manager_id', lazy=True)
    customer_interactions = db.relationship('CustomerInteraction', backref='user', lazy=True)
    leads = db.relationship('Lead', back_populates='assigned_to_user', foreign_keys='Lead.assigned_to', lazy=True)

    @property
    def display_name(self):
        return f'{self.first_name or ""} {self.last_name or ""}'.strip() or self.username
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'team_id': self.team_id,
            'team_name': self.team.name if self.team else None,
            'is_team_lead': self.role == 'sales_lead',
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    company = db.Column(db.String(100))
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    city = db.Column(db.String(50))
    state = db.Column(db.String(50))
    country = db.Column(db.String(50))
    postal_code = db.Column(db.String(20))
    status = db.Column(db.String(20), default='lead')
    customer_level = db.Column(db.String(20))  # VIP, Premium, Standard, etc.
    assigned_sales_rep_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_sales_rep = db.relationship('User', back_populates='assigned_customers', foreign_keys=[assigned_sales_rep_id])
    interactions = db.relationship('CustomerInteraction', backref='customer', lazy=True)
    orders = db.relationship('Order', backref='customer', lazy=True)
    leads = db.relationship('Lead', backref='customer', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'company': self.company,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'postal_code': self.postal_code,
            'status': self.status,
            'customer_level': self.customer_level,
            'assigned_sales_rep_id': self.assigned_sales_rep_id,
            'assigned_sales_rep_name': self.assigned_sales_rep.display_name if self.assigned_sales_rep else None,
            'assigned_sales_team_id': self.assigned_sales_rep.team_id if self.assigned_sales_rep else None,
            'assigned_sales_team_name': self.assigned_sales_rep.team.name if self.assigned_sales_rep and self.assigned_sales_rep.team else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Lead(db.Model):
    __tablename__ = 'leads'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='new')
    source = db.Column(db.String(50))  # website, referral, social media, etc.
    value = db.Column(db.Float)  # estimated deal value
    expected_close_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    assigned_to_user = db.relationship('User', back_populates='leads', foreign_keys=[assigned_to])
    
    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'assigned_to': self.assigned_to,
            'assigned_to_name': self.assigned_to_user.display_name if self.assigned_to_user else None,
            'assigned_team_id': self.assigned_to_user.team_id if self.assigned_to_user else None,
            'assigned_team_name': self.assigned_to_user.team.name if self.assigned_to_user and self.assigned_to_user.team else None,
            'status': self.status,
            'source': self.source,
            'value': self.value,
            'expected_close_date': self.expected_close_date.isoformat() if self.expected_close_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class CustomerInteraction(db.Model):
    __tablename__ = 'customer_interactions'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    interaction_type = db.Column(db.String(20), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    duration_minutes = db.Column(db.Integer)  # for calls/meetings
    outcome = db.Column(db.String(200))  # positive, negative, neutral
    next_action = db.Column(db.Text)  # follow-up needed
    next_follow_up_at = db.Column(db.DateTime)
    reminder_status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'user_id': self.user_id,
            'interaction_type': self.interaction_type,
            'subject': self.subject,
            'description': self.description,
            'date': self.date.isoformat(),
            'duration_minutes': self.duration_minutes,
            'outcome': self.outcome,
            'next_action': self.next_action,
            'next_follow_up_at': self.next_follow_up_at.isoformat() if self.next_follow_up_at else None,
            'reminder_status': self.reminder_status,
            'owner_name': self.user.display_name if self.user else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Opportunity(db.Model):
    __tablename__ = 'opportunities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stage = db.Column(db.String(30), default='lead')
    value = db.Column(db.Float, nullable=False)
    probability = db.Column(db.Integer, default=0)  # percentage
    expected_close_date = db.Column(db.Date)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    assigned_user = db.relationship('User', back_populates='assigned_opportunities', foreign_keys=[assigned_to])
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'customer_id': self.customer_id,
            'assigned_to': self.assigned_to,
            'assigned_to_name': self.assigned_user.display_name if self.assigned_user else None,
            'assigned_team_id': self.assigned_user.team_id if self.assigned_user else None,
            'assigned_team_name': self.assigned_user.team.name if self.assigned_user and self.assigned_user.team else None,
            'stage': self.stage,
            'value': self.value,
            'probability': self.probability,
            'expected_close_date': self.expected_close_date.isoformat() if self.expected_close_date else None,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('opportunities.id'))
    status = db.Column(db.String(20), default='pending')
    total_amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='USD')
    order_date = db.Column(db.Date, default=datetime.utcnow)
    shipped_date = db.Column(db.Date)
    delivered_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    opportunity = db.relationship('Opportunity', foreign_keys=[opportunity_id])
    
    def to_dict(self):
        owner_user = self.opportunity.assigned_user if self.opportunity and self.opportunity.assigned_user else self.customer.assigned_sales_rep
        return {
            'id': self.id,
            'order_number': self.order_number,
            'customer_id': self.customer_id,
            'opportunity_id': self.opportunity_id,
            'owner_id': owner_user.id if owner_user else None,
            'owner_name': owner_user.display_name if owner_user else None,
            'owner_team_id': owner_user.team_id if owner_user else None,
            'owner_team_name': owner_user.team.name if owner_user and owner_user.team else None,
            'status': self.status,
            'total_amount': self.total_amount,
            'currency': self.currency,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'shipped_date': self.shipped_date.isoformat() if self.shipped_date else None,
            'delivered_date': self.delivered_date.isoformat() if self.delivered_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class MarketingCampaign(db.Model):
    __tablename__ = 'marketing_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='draft')
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    budget = db.Column(db.Float)
    spent = db.Column(db.Float, default=0.0)
    target_audience = db.Column(db.Text)
    channel = db.Column(db.String(50))  # email, social, ads, etc.
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    manager_user = db.relationship('User', back_populates='managed_campaigns', foreign_keys=[manager_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'budget': self.budget,
            'spent': self.spent,
            'target_audience': self.target_audience,
            'channel': self.channel,
            'manager_id': self.manager_id,
            'manager_name': self.manager_user.display_name if self.manager_user else None,
            'manager_team_id': self.manager_user.team_id if self.manager_user else None,
            'manager_team_name': self.manager_user.team.name if self.manager_user and self.manager_user.team else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class CampaignLead(db.Model):
    __tablename__ = 'campaign_leads'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('marketing_campaigns.id'), nullable=False)
    lead_id = db.Column(db.Integer, db.ForeignKey('leads.id'), nullable=False)
    source = db.Column(db.String(30), nullable=False)
    converted = db.Column(db.Boolean, default=False)
    conversion_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'lead_id': self.lead_id,
            'source': self.source,
            'converted': self.converted,
            'conversion_date': self.conversion_date.isoformat() if self.conversion_date else None,
            'created_at': self.created_at.isoformat()
        }
