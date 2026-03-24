"""
用户管理路由
User Management Routes
"""
from flask import Blueprint, request
from models import User, db
from utils.response import AppResponse, not_found, bad_request, internal_error
from utils.rbac import require_permission, require_admin, get_current_user
from utils.db import (
    QueryBuilder, PaginationHelper, SortHelper, FilterHelper, safe_commit
)

users_bp = Blueprint('users', __name__)


@users_bp.route('/', methods=['GET'])
@require_permission('users:read')
def list_users():
    """
    获取用户列表
    
    Query Parameters:
    - page: 页码（默认1）
    - per_page: 每页数量（默认20，最大100）
    - role: 按角色过滤
    - status: 按状态过滤
    - sort_by: 排序字段（如: created_at, username）
    - sort_order: 排序方向（asc 或 desc，默认asc）
    """
    # 获取分页参数
    page, per_page = PaginationHelper.get_pagination_params()
    
    # 获取排序参数
    sort_by, sort_order = SortHelper.get_sort_params()
    
    # 构建查询
    query = User.query
    
    # 应用过滤
    role = request.args.get('role')
    if role:
        query = query.filter(User.role == role)
    
    is_active = request.args.get('is_active')
    if is_active is not None:
        is_active_bool = is_active.lower() in ['true', '1', 'yes']
        query = query.filter(User.is_active == is_active_bool)
    
    # 应用排序
    if sort_by:
        query = SortHelper.apply_sort(query, User, sort_by, sort_order)
    else:
        query = query.order_by(User.created_at.desc())
    
    # 执行分页
    items, total = PaginationHelper.paginate_query(query, page, per_page)
    
    return AppResponse.paginated(
        items=[user.to_dict() for user in items],
        total=total,
        page=page,
        per_page=per_page,
        message='Users retrieved successfully'
    )


@users_bp.route('/<int:user_id>', methods=['GET'])
@require_permission('users:read')
def get_user(user_id):
    """获取单个用户详情"""
    user = User.query.get(user_id)
    if not user:
        return not_found('User not found')
    
    return AppResponse.success(
        data=user.to_dict(),
        message='User retrieved successfully'
    )


@users_bp.route('/', methods=['POST'])
@require_permission('users:create')
def create_user():
    """
    创建新用户
    
    Required fields:
    - username: 用户名
    - email: 邮箱
    - password: 密码
    - role: 角色（admin, manager, sales, marketing, customer_service）
    
    Optional fields:
    - first_name: 名字
    - last_name: 姓氏
    - phone: 电话
    """
    data = request.get_json()
    
    # 验证必填字段
    required_fields = ['username', 'email', 'password', 'role']
    missing_fields = [f for f in required_fields if f not in data]
    if missing_fields:
        return bad_request(
            'Missing required fields',
            {'missing_fields': missing_fields}
        )
    
    # 验证角色
    valid_roles = ['admin', 'manager', 'sales', 'marketing', 'customer_service']
    if data['role'] not in valid_roles:
        return bad_request(
            f'Invalid role. Must be one of: {", ".join(valid_roles)}'
        )
    
    # 检查用户是否已存在
    if User.query.filter((User.username == data['username']) | (User.email == data['email'])).first():
        return bad_request('Username or email already exists')
    
    # 创建用户
    user = User(
        username=data['username'],
        email=data['email'],
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        phone=data.get('phone'),
        role=data['role']
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    if not safe_commit():
        return internal_error('Failed to create user')
    
    return AppResponse.success(
        data=user.to_dict(),
        message='User created successfully',
        status_code=201
    )


@users_bp.route('/<int:user_id>', methods=['PUT'])
@require_permission('users:update')
def update_user(user_id):
    """
    更新用户信息
    
    Allowed fields:
    - first_name, last_name, phone, email, role, is_active
    """
    user = User.query.get(user_id)
    if not user:
        return not_found('User not found')
    
    current_user = get_current_user()
    
    # 非管理员只能更新自己的信息
    if current_user.role != 'admin' and current_user.id != user_id:
        return bad_request('You can only update your own information')
    
    data = request.get_json()
    
    # 允许更新的字段
    allowed_fields = {
        'first_name', 'last_name', 'phone', 'email', 'role', 'is_active'
    }
    
    # 只有管理员才能更改角色
    if 'role' in data and current_user.role != 'admin':
        return bad_request('Only admins can change user roles')
    
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    if not safe_commit():
        return internal_error('Failed to update user')
    
    return AppResponse.success(
        data=user.to_dict(),
        message='User updated successfully'
    )


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@require_admin
def delete_user(user_id):
    """删除用户"""
    user = User.query.get(user_id)
    if not user:
        return not_found('User not found')
    
    current_user = get_current_user()
    if user.id == current_user.id:
        return bad_request('Cannot delete your own account')
    
    db.session.delete(user)
    
    if not safe_commit():
        return internal_error('Failed to delete user')
    
    return AppResponse.success(
        message='User deleted successfully'
    )


@users_bp.route('/<int:user_id>/password', methods=['PUT'])
@require_permission('users:update')
def change_password(user_id):
    """
    更改用户密码
    
    Required fields:
    - old_password: 旧密码
    - new_password: 新密码
    """
    user = User.query.get(user_id)
    if not user:
        return not_found('User not found')
    
    current_user = get_current_user()
    
    # 非管理员只能更改自己的密码
    if current_user.role != 'admin' and current_user.id != user_id:
        return bad_request('You can only change your own password')
    
    data = request.get_json()
    
    # 验证必填字段
    if 'old_password' not in data or 'new_password' not in data:
        return bad_request('old_password and new_password are required')
    
    # 非管理员需要验证旧密码
    if current_user.role != 'admin':
        if not user.check_password(data['old_password']):
            return bad_request('Old password is incorrect')
    
    # 设置新密码
    user.set_password(data['new_password'])
    
    if not safe_commit():
        return internal_error('Failed to change password')
    
    return AppResponse.success(
        message='Password changed successfully'
    )
