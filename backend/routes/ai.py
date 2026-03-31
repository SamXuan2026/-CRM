from flask import Blueprint, request

from services.ai_assistant import AIAssistantService
from utils.rbac import require_login, has_any_permission, get_current_user
from utils.response import AppResponse

ai_bp = Blueprint('ai', __name__)

assistant_service = AIAssistantService()


@ai_bp.route('/assist', methods=['POST'])
@require_login
def assist():
    current_user = get_current_user()

    if not current_user:
        return AppResponse.unauthorized('Invalid user')

    if not has_any_permission(current_user, 'customers:read', 'sales:read', 'reports:read'):
        return AppResponse.forbidden('当前账户没有可用的 AI 查询权限')

    data = request.get_json() or {}
    message = (data.get('message') or '').strip()
    context = data.get('context') or {}

    if not message:
        return AppResponse.bad_request('message is required')

    result = assistant_service.assist(current_user, message, context)
    return AppResponse.success(data=result, message='AI assistant response generated')
