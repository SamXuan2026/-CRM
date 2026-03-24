"""
Role-Based Access Control (RBAC) System
基于角色的访问控制
"""
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from models import User, db
from utils.response import forbidden, unauthorized, not_found


# 定义系统中的角色和权限
ROLE_PERMISSIONS = {
    'admin': [
        'users:create', 'users:read', 'users:update', 'users:delete',
        'customers:create', 'customers:read', 'customers:update', 'customers:delete',
        'sales:create', 'sales:read', 'sales:update', 'sales:delete',
        'marketing:create', 'marketing:read', 'marketing:update', 'marketing:delete',
        'reports:read', 'reports:export',
        'settings:read', 'settings:update',
        'emails:send', 'emails:read'
    ],
    'manager': [
        'users:read', 'users:update',
        'customers:create', 'customers:read', 'customers:update',
        'sales:create', 'sales:read', 'sales:update',
        'marketing:create', 'marketing:read', 'marketing:update',
        'reports:read', 'reports:export',
        'emails:send', 'emails:read'
    ],
    'sales': [
        'customers:read', 'customers:update',
        'sales:create', 'sales:read', 'sales:update',
        'reports:read',
        'emails:send', 'emails:read'
    ],
    'marketing': [
        'customers:read',
        'marketing:create', 'marketing:read', 'marketing:update',
        'reports:read',
        'emails:send', 'emails:read'
    ],
    'customer_service': [
        'customers:read', 'customers:update',
        'emails:send', 'emails:read'
    ]
}


def get_user_permissions(role: str) -> list:
    """获取角色的所有权限"""
    return ROLE_PERMISSIONS.get(role, [])


def require_login(f):
    """
    要求用户登录的装饰器
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        
        # 从数据库加载用户信息
        user = User.query.get(current_user_id)
        if not user or not user.is_active:
            return unauthorized('User not found or inactive')
        
        # 将用户对象注入到请求上下文
        request.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function


def require_permission(permission: str):
    """
    需要特定权限的装饰器
    
    Args:
        permission: 权限字符串，格式为 "resource:action"
                  例如: "users:create", "customers:delete"
    """
    def decorator(f):
        @wraps(f)
        @require_login
        def decorated_function(*args, **kwargs):
            user = request.current_user
            user_permissions = get_user_permissions(user.role)
            
            # 检查权限
            if permission not in user_permissions:
                return forbidden(
                    f'Permission denied: {permission} required'
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_role(*roles):
    """
    需要特定角色的装饰器
    
    Args:
        *roles: 一个或多个角色名
               例如: @require_role('admin', 'manager')
    """
    def decorator(f):
        @wraps(f)
        @require_login
        def decorated_function(*args, **kwargs):
            user = request.current_user
            
            if user.role not in roles:
                return forbidden(
                    f'Role required: {", ".join(roles)}'
                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_admin(f):
    """只允许管理员"""
    return require_role('admin')(f)


def require_not_anonymous(f):
    """要求非匿名用户（已登录）"""
    return require_login(f)


def check_resource_owner(resource_user_id_field: str):
    """
    检查用户是否是资源的所有者
    
    Args:
        resource_user_id_field: 资源中表示所有者的字段名
                               例如: 'assigned_sales_rep_id'
    """
    def decorator(f):
        @wraps(f)
        @require_login
        def decorated_function(*args, **kwargs):
            user = request.current_user
            
            # 管理员可以访问任何资源
            if user.role == 'admin':
                return f(*args, **kwargs)
            
            # 其他用户只能访问自己的资源
            resource = kwargs.get('resource')
            if resource:
                owner_id = getattr(resource, resource_user_id_field, None)
                if owner_id != user.id:
                    return forbidden('You can only access your own resources')
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


# 上下文工具函数

def get_current_user() -> User:
    """获取当前登录的用户对象"""
    return request.current_user if hasattr(request, 'current_user') else None


def has_permission(user: User, permission: str) -> bool:
    """检查用户是否有特定权限"""
    permissions = get_user_permissions(user.role)
    return permission in permissions


def has_role(user: User, *roles) -> bool:
    """检查用户是否有特定角色"""
    return user.role in roles


def has_any_permission(user: User, *permissions) -> bool:
    """检查用户是否有任何一个权限"""
    user_permissions = get_user_permissions(user.role)
    return any(perm in user_permissions for perm in permissions)
