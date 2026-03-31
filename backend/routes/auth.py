from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from models import User, db
from werkzeug.security import check_password_hash
from utils.response import AppResponse, bad_request, unauthorized, internal_error
from utils.rbac import require_login
from utils.db import safe_commit

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    用户注册
    
    Required fields:
    - username: 用户名
    - email: 邮箱
    - password: 密码
    
    Optional fields:
    - first_name: 名字
    - last_name: 姓氏
    - phone: 电话
    """
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password']
    missing_fields = [f for f in required_fields if f not in data]
    if missing_fields:
        return bad_request(
            'Missing required fields',
            {'missing_fields': missing_fields}
        )
    
    # Check if user already exists
    existing_user = User.query.filter(
        (User.username == data['username']) | (User.email == data['email'])
    ).first()
    
    if existing_user:
        return bad_request(
            'Username or email already exists',
            {'field': 'username' if existing_user.username == data['username'] else 'email'}
        )
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email'],
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        phone=data.get('phone'),
        role=data.get('role', 'sales')  # 默认角色为sales
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    
    if not safe_commit():
        return internal_error('Failed to create user')
    
    return AppResponse.success(
        data=user.to_dict(),
        message='User registered successfully',
        status_code=201
    )


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    用户登录
    
    Required fields:
    - username: 用户名或邮箱
    - password: 密码
    
    Response:
    - access_token: JWT访问令牌
    - refresh_token: JWT刷新令牌
    - user: 用户信息
    """
    data = request.get_json()
    
    # Validate required fields
    if not data.get('username') or not data.get('password'):
        return bad_request('Username and password are required')
    
    # Find user by username or email
    user = User.query.filter(
        (User.username == data['username']) | (User.email == data['username'])
    ).first()
    
    if not user or not user.check_password(data['password']):
        return unauthorized('Invalid username or password')
    
    if not user.is_active:
        return unauthorized('Account is deactivated')
    
    # Create tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return AppResponse.success(
        data={
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        },
        message='Login successful'
    )


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    刷新访问令牌
    
    Headers:
    - Authorization: Bearer <refresh_token>
    
    Response:
    - access_token: 新的JWT访问令牌
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return unauthorized('Invalid user')
    
    new_token = create_access_token(identity=current_user_id)
    return AppResponse.success(
        data={'access_token': new_token},
        message='Token refreshed successfully'
    )


@auth_bp.route('/me', methods=['GET'])
@require_login
def get_current_user():
    """获取当前登录用户信息"""
    from utils.rbac import get_current_user
    user = get_current_user()
    
    if not user:
        return unauthorized('User not found')
    
    return AppResponse.success(
        data=user.to_dict(),
        message='User info retrieved'
    )


@auth_bp.route('/logout', methods=['POST'])
@require_login
def logout():
    """
    用户登出
    （前端需要删除本地存储的token）
    """
    return AppResponse.success(
        message='Logged out successfully'
    )


@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'Invalid user'}), 401
    
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'Invalid user'}), 401
    
    data = request.get_json()
    
    # Update allowed fields
    allowed_fields = ['first_name', 'last_name', 'phone', 'email']
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    db.session.commit()
    
    return jsonify({'user': user.to_dict()}), 200
