#!/usr/bin/env python3
"""
八戒CRM - Main Application
"""
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

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
    from models import User, Customer, CustomerInteraction, Opportunity, Order, Lead, MarketingCampaign as Campaign
    # Additional models would be imported here
    
    # Import routes after initializing extensions
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.customers import customers_bp
    from routes.sales import sales_bp
    from routes.marketing import marketing_bp
    from routes.reports import reports_bp
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(sales_bp, url_prefix='/api/sales')
    app.register_blueprint(marketing_bp, url_prefix='/api/marketing')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    # Create tables if they don't exist
    with app.app_context():
        # Check if users table exists before creating all tables
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        if 'users' not in inspector.get_table_names():
            db.create_all()
            print("Tables created successfully")
        else:
            print("Tables already exist")
    
    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'message': '八戒CRM is running'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5006)
