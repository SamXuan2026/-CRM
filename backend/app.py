#!/usr/bin/env python3
"""
蓝鲸CRM - Main Application
"""
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import inspect, text
from config import Config


def _ensure_schema_updates(db):
    inspector = inspect(db.engine)
    table_names = inspector.get_table_names()

    db.create_all()

    if 'users' in table_names:
        user_columns = {column['name'] for column in inspector.get_columns('users')}
        if 'team_id' not in user_columns:
            db.session.execute(text('ALTER TABLE users ADD COLUMN team_id INTEGER'))
            db.session.commit()

    if 'customer_interactions' in table_names:
        interaction_columns = {column['name'] for column in inspector.get_columns('customer_interactions')}
        if 'next_follow_up_at' not in interaction_columns:
            db.session.execute(text('ALTER TABLE customer_interactions ADD COLUMN next_follow_up_at DATETIME'))
            db.session.commit()
        if 'reminder_status' not in interaction_columns:
            db.session.execute(text("ALTER TABLE customer_interactions ADD COLUMN reminder_status VARCHAR(20) DEFAULT 'pending'"))
            db.session.commit()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.url_map.strict_slashes = False
    
    # Initialize extensions
    CORS(app)
    JWTManager(app)
    
    # Import and initialize models after app creation
    from models import db
    db.init_app(app)
    
    # Import all models to register them with SQLAlchemy
    from models import Team, User, Customer, CustomerInteraction, Opportunity, Order, Lead, MarketingCampaign as Campaign
    # Additional models would be imported here
    
    # Import routes after initializing extensions
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.teams import teams_bp
    from routes.customers import customers_bp
    from routes.sales import sales_bp
    from routes.marketing import marketing_bp
    from routes.reports import reports_bp
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(teams_bp, url_prefix='/api/teams')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(sales_bp, url_prefix='/api/sales')
    app.register_blueprint(marketing_bp, url_prefix='/api/marketing')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    # Create tables if they don't exist
    with app.app_context():
        _ensure_schema_updates(db)
        print("Schema checked successfully")
    
    # Health check endpoint
    @app.route('/')
    def index():
        return {
            'name': '蓝鲸CRM Backend',
            'status': 'running',
            'health': '/health',
            'frontend': 'http://172.16.1.32:3000',
            'api_base': '/api'
        }

    @app.route('/health')
    def health():
        return {'status': 'healthy', 'message': '蓝鲸CRM is running'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=False, host='0.0.0.0', port=5006, use_reloader=False)
