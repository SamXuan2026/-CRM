from typing import Optional

from sqlalchemy.orm import Query

from models import User


GLOBAL_SCOPE_ROLES = {'admin', 'manager'}
TEAM_SCOPE_ROLES = {'sales_lead'}


def has_global_scope(user: User) -> bool:
    return user.role in GLOBAL_SCOPE_ROLES


def has_team_scope(user: User) -> bool:
    return user.role in TEAM_SCOPE_ROLES and bool(user.team_id)


def get_accessible_user_ids(user: User):
    if has_global_scope(user):
        return None

    if has_team_scope(user):
        return [
            member.id
            for member in User.query.filter(
                User.team_id == user.team_id,
                User.is_active.is_(True),
            ).all()
        ]

    return [user.id]


def apply_owner_scope(query: Query, owner_column, user: User) -> Query:
    user_ids = get_accessible_user_ids(user)
    if user_ids is None:
        return query
    return query.filter(owner_column.in_(user_ids))


def can_access_user(current_user: User, target_user: User) -> bool:
    if has_global_scope(current_user):
        return True

    if current_user.id == target_user.id:
        return True

    return bool(
        has_team_scope(current_user)
        and current_user.team_id
        and current_user.team_id == target_user.team_id
    )


def can_manage_team_member(current_user: User, target_user: User) -> bool:
    if has_global_scope(current_user):
        return True

    if current_user.role != 'sales_lead' or not current_user.team_id:
        return False

    return (
        current_user.team_id == target_user.team_id
        and target_user.role in {'sales', 'sales_lead'}
    )


def ensure_team_assignment_for_scope(user: User) -> Optional[str]:
    if user.role == 'sales_lead' and not user.team_id:
        return '销售组长必须归属到一个销售组后才能使用团队范围权限'
    return None
