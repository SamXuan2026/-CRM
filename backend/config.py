import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Database
    import os
    basedir = os.path.abspath(os.path.dirname(__file__))
    _database_url = os.environ.get('DATABASE_URL')
    if _database_url and _database_url.startswith('sqlite:///') and not _database_url.startswith('sqlite:////'):
        _db_path = _database_url.replace('sqlite:///', '', 1)
        SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, _db_path)
    else:
        SQLALCHEMY_DATABASE_URI = _database_url or 'sqlite:///' + os.path.join(basedir, 'crm.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string-change-in-production'
    JWT_IDENTITY_CLAIM = 'identity'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Email settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Other settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
