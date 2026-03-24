"""
Unified API Response Handler
标准化所有API响应格式
"""
from flask import jsonify
from typing import Any, Optional


class AppResponse:
    """Application Response Helper"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = 'Success',
        status_code: int = 200,
        **kwargs
    ):
        """
        返回成功响应
        
        Args:
            data: 响应数据
            message: 成功消息
            status_code: HTTP状态码
            **kwargs: 其他要包含的字段
        """
        response = {
            'success': True,
            'message': message,
            'data': data,
            **kwargs
        }
        return jsonify(response), status_code
    
    @staticmethod
    def error(
        error: str,
        status_code: int = 400,
        error_code: Optional[str] = None,
        details: Optional[dict] = None,
        **kwargs
    ):
        """
        返回错误响应
        
        Args:
            error: 错误消息
            status_code: HTTP状态码
            error_code: 错误代码（用于前端处理）
            details: 错误详情
            **kwargs: 其他要包含的字段
        """
        response = {
            'success': False,
            'error': error,
            'error_code': error_code,
            **kwargs
        }
        if details:
            response['details'] = details
        return jsonify(response), status_code
    
    @staticmethod
    def paginated(
        items: Optional[list] = None,
        total: int = 0,
        page: int = 1,
        per_page: int = 20,
        message: str = 'Success',
        status_code: int = 200,
        data: Optional[list] = None,
        **kwargs
    ):
        """
        返回分页响应
        
        Args:
            items: 数据列表
            total: 总数
            page: 当前页
            per_page: 每页数量
            message: 消息
            status_code: HTTP状态码
        """
        payload = items if items is not None else (data if data is not None else [])
        total_pages = (total + per_page - 1) // per_page if per_page else 0
        response = {
            'success': True,
            'message': message,
            'data': payload,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': total_pages
            }
        }
        if kwargs:
            response.update(kwargs)
        return jsonify(response), status_code

    @staticmethod
    def unauthorized(message: str = 'Unauthorized'):
        return unauthorized(message)

    @staticmethod
    def forbidden(message: str = 'Access Denied'):
        return forbidden(message)

    @staticmethod
    def not_found(message: str = 'Resource not found'):
        return not_found(message)

    @staticmethod
    def bad_request(message: str = 'Bad Request', details: Optional[dict] = None):
        return bad_request(message, details)

    @staticmethod
    def internal_error(message: str = 'Internal Server Error'):
        return internal_error(message)


# 常见错误响应

def unauthorized(message: str = 'Unauthorized'):
    """401 未授权"""
    return AppResponse.error(error=message, status_code=401, error_code='UNAUTHORIZED')


def forbidden(message: str = 'Access Denied'):
    """403 禁止访问"""
    return AppResponse.error(error=message, status_code=403, error_code='FORBIDDEN')


def not_found(message: str = 'Resource not found'):
    """404 未找到"""
    return AppResponse.error(error=message, status_code=404, error_code='NOT_FOUND')


def bad_request(message: str = 'Bad Request', details: Optional[dict] = None):
    """400 请求错误"""
    return AppResponse.error(
        error=message,
        status_code=400,
        error_code='BAD_REQUEST',
        details=details
    )


def internal_error(message: str = 'Internal Server Error'):
    """500 服务器错误"""
    return AppResponse.error(
        error=message,
        status_code=500,
        error_code='INTERNAL_ERROR'
    )
