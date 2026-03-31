from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import or_

from models import Customer, CustomerInteraction, Opportunity, Order, User
from utils.data_scope import get_accessible_user_ids


CUSTOMER_STATUS_LABELS = {
    'customer': '客户',
    'lead': '线索',
    'prospect': '潜客',
    'active': '活跃',
    'inactive': '沉默',
    'converted': '已转化',
}

OPPORTUNITY_STAGE_LABELS = {
    'lead': '线索',
    'qualification': '需求确认',
    'proposal': '方案报价',
    'negotiation': '商务谈判',
    'won': '已赢单',
    'lost': '已丢单',
}

ORDER_STATUS_LABELS = {
    'pending': '待处理',
    'confirmed': '已确认',
    'processing': '处理中',
    'shipped': '已发货',
    'delivered': '已交付',
    'cancelled': '已取消',
}

CUSTOMER_STATUS_SYNONYMS = {
    '客户': 'customer',
    '线索': 'lead',
    '潜客': 'prospect',
    '活跃': 'active',
    '沉默': 'inactive',
    '已转化': 'converted',
}

OPPORTUNITY_STAGE_SYNONYMS = {
    '线索': 'lead',
    '需求确认': 'qualification',
    '方案报价': 'proposal',
    '商务谈判': 'negotiation',
    '已赢单': 'won',
    '已丢单': 'lost',
}


@dataclass
class ParsedIntent:
    intent: str
    filters: dict[str, Any]


class AIAssistantService:
    def assist(self, user: User, message: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        parsed = self._parse_message(message, context or {})

        if parsed.intent == 'search_customers':
            return self._search_customers(user, parsed.filters)
        if parsed.intent == 'search_opportunities':
            return self._search_opportunities(user, parsed.filters)
        if parsed.intent == 'search_orders':
            return self._search_orders(user, parsed.filters)
        if parsed.intent == 'get_dashboard_summary':
            return self._get_dashboard_summary(user)
        if parsed.intent == 'get_customer_interactions':
            return self._get_customer_interactions(user, parsed.filters)
        if parsed.intent == 'generate_follow_up_suggestion':
            return self._generate_follow_up_suggestion(user, parsed.filters)
        if parsed.intent == 'generate_interaction_draft':
            return self._generate_interaction_draft(user, parsed.filters)

        return {
            'intent': 'unsupported',
            'summary': '暂时无法理解这条请求，建议改成“查客户”“查商机”“查订单”“看报表摘要”或“查看某客户最近互动”。',
            'result_mode': 'summary',
            'cards': [],
            'items': [],
        }

    def _parse_message(self, message: str, context: dict[str, Any]) -> ParsedIntent:
        text = (message or '').strip()
        normalized = text.lower()

        customer_id = context.get('customer_id')
        if customer_id and any(keyword in text for keyword in ['草稿', '记录', '跟进']) and any(
            keyword in text for keyword in ['互动', '跟进', '记录']
        ):
            return ParsedIntent('generate_interaction_draft', {'customer_id': customer_id})

        if ('建议' in text or '下一步' in text) and customer_id:
            return ParsedIntent('generate_follow_up_suggestion', {'customer_id': customer_id})

        if '互动' in text and ('最近' in text or '最近一次' in text or '上次' in text):
            filters = {}
            if customer_id:
                filters['customer_id'] = customer_id
            else:
                customer_name = self._extract_customer_name(text)
                if customer_name:
                    filters['customer_name'] = customer_name
            return ParsedIntent('get_customer_interactions', filters)

        if any(keyword in text for keyword in ['报表', '仪表盘', '摘要', '总结']):
            return ParsedIntent('get_dashboard_summary', {})

        if '订单' in text:
            return ParsedIntent('search_orders', self._extract_common_filters(text, normalized))

        if any(keyword in text for keyword in ['商机', '赢单', '丢单', '报价', '谈判']):
            filters = self._extract_common_filters(text, normalized)
            filters['stage'] = self._extract_opportunity_stage(text)
            return ParsedIntent('search_opportunities', filters)

        if any(keyword in text for keyword in ['客户', '跟进', '线索', '潜客']):
            filters = self._extract_common_filters(text, normalized)
            filters['status'] = self._extract_customer_status(text)
            filters['stale_days'] = self._extract_stale_days(text)
            return ParsedIntent('search_customers', filters)

        return ParsedIntent('unsupported', {})

    def _extract_common_filters(self, text: str, normalized: str) -> dict[str, Any]:
        filters: dict[str, Any] = {}
        owner_name = self._extract_owner_name(text)
        if owner_name:
            filters['owner_name'] = owner_name

        min_amount = self._extract_min_amount(text)
        if min_amount is not None:
            filters['min_amount'] = min_amount

        search_value = self._extract_customer_name(text)
        if search_value:
            filters['search'] = search_value

        if '最近' in text or '新增' in text:
            filters['recent_only'] = True

        if '高价值' in text and min_amount is None:
            filters['min_amount'] = 100000

        if '本周' in text:
            filters['days'] = 7
        elif '最近30天' in normalized or '近30天' in text:
            filters['days'] = 30

        return filters

    def _extract_customer_name(self, text: str) -> str | None:
        match = re.search(r'(?:客户|查看客户|查一下客户|查找客户|给我找客户)([\u4e00-\u9fa5A-Za-z0-9_-]{2,20}?)(?:最近|互动|的|$)', text)
        if match:
            return match.group(1)
        return None

    def _extract_owner_name(self, text: str) -> str | None:
        match = re.search(r'([\u4e00-\u9fa5]{2,4})名下', text)
        if match:
            return match.group(1)
        return None

    def _extract_min_amount(self, text: str) -> float | None:
        match = re.search(r'(?:大于|超过|高于)(\d+)(?:万)?', text)
        if not match:
            return None
        value = float(match.group(1))
        if '万' in text[match.start():match.end() + 1]:
            value *= 10000
        return value

    def _extract_stale_days(self, text: str) -> int | None:
        match = re.search(r'最近\s*(\d+)\s*天.*(?:没(?:有)?跟进|未跟进)', text)
        if match:
            return int(match.group(1))
        if '本周没跟进' in text or '本周没有跟进' in text or '本周未跟进' in text:
            return 7
        return None

    def _extract_customer_status(self, text: str) -> str | None:
        for label, value in CUSTOMER_STATUS_SYNONYMS.items():
            if label in text:
                return value
        return None

    def _extract_opportunity_stage(self, text: str) -> str | None:
        for label, value in OPPORTUNITY_STAGE_SYNONYMS.items():
            if label in text:
                return value
        return None

    def _resolve_owner_ids(self, current_user: User, owner_name: str | None) -> list[int] | None:
        accessible_user_ids = get_accessible_user_ids(current_user)
        if not owner_name:
            return accessible_user_ids

        query = User.query.filter(User.is_active.is_(True))
        if accessible_user_ids is not None:
            query = query.filter(User.id.in_(accessible_user_ids))

        matched = query.filter(
            or_(
                User.first_name.ilike(f'%{owner_name}%'),
                User.last_name.ilike(f'%{owner_name}%'),
                User.username.ilike(f'%{owner_name}%'),
            )
        ).all()
        return [item.id for item in matched]

    def _search_customers(self, user: User, filters: dict[str, Any]) -> dict[str, Any]:
        query = Customer.query
        owner_ids = self._resolve_owner_ids(user, filters.get('owner_name'))
        if owner_ids is not None:
            query = query.filter(Customer.assigned_sales_rep_id.in_(owner_ids))

        if filters.get('status'):
            query = query.filter(Customer.status == filters['status'])

        if filters.get('search'):
            search = f"%{filters['search']}%"
            query = query.filter(
                or_(
                    Customer.first_name.ilike(search),
                    Customer.last_name.ilike(search),
                    Customer.company.ilike(search),
                    Customer.email.ilike(search),
                )
            )

        if filters.get('recent_only'):
            query = query.filter(Customer.created_at >= datetime.utcnow() - timedelta(days=filters.get('days', 30)))

        customers = query.order_by(Customer.updated_at.desc()).limit(20).all()

        if filters.get('stale_days'):
            cutoff = datetime.utcnow() - timedelta(days=filters['stale_days'])
            stale_customers = []
            for customer in customers:
                latest = (
                    CustomerInteraction.query
                    .filter(CustomerInteraction.customer_id == customer.id)
                    .order_by(CustomerInteraction.date.desc())
                    .first()
                )
                if not latest or latest.date < cutoff:
                    stale_customers.append(customer)
            customers = stale_customers

        items = [
            {
                'id': customer.id,
                'name': f'{customer.first_name} {customer.last_name}',
                'company': customer.company,
                'status': CUSTOMER_STATUS_LABELS.get(customer.status, customer.status),
                'owner_name': customer.assigned_sales_rep.display_name if customer.assigned_sales_rep else None,
            }
            for customer in customers[:10]
        ]

        summary = f'找到 {len(items)} 位客户。'
        if filters.get('stale_days'):
            summary = f'找到 {len(items)} 位最近 {filters["stale_days"]} 天未跟进的客户。'

        return {
            'intent': 'search_customers',
            'summary': summary,
            'filters': filters,
            'result_mode': 'page_and_summary',
            'target_page': '/customers',
            'target_query': filters,
            'cards': [{'type': 'metric', 'title': '客户结果数', 'value': len(items)}],
            'items': items,
        }

    def _search_opportunities(self, user: User, filters: dict[str, Any]) -> dict[str, Any]:
        query = Opportunity.query
        owner_ids = self._resolve_owner_ids(user, filters.get('owner_name'))
        if owner_ids is not None:
            query = query.filter(Opportunity.assigned_to.in_(owner_ids))

        if filters.get('stage'):
            query = query.filter(Opportunity.stage == filters['stage'])
        if filters.get('min_amount') is not None:
            query = query.filter(Opportunity.value >= filters['min_amount'])
        if filters.get('search'):
            query = query.filter(Opportunity.name.ilike(f'%{filters["search"]}%'))
        if filters.get('recent_only'):
            query = query.filter(Opportunity.created_at >= datetime.utcnow() - timedelta(days=filters.get('days', 30)))

        opportunities = query.order_by(Opportunity.updated_at.desc()).limit(20).all()
        items = [
            {
                'id': item.id,
                'name': item.name,
                'stage': OPPORTUNITY_STAGE_LABELS.get(item.stage, item.stage),
                'value': item.value,
                'owner_name': item.assigned_to_name,
            }
            for item in opportunities[:10]
        ]
        total_value = sum(item['value'] or 0 for item in items)

        return {
            'intent': 'search_opportunities',
            'summary': f'找到 {len(items)} 条商机，合计金额 {round(total_value, 2)}。',
            'filters': filters,
            'result_mode': 'page_and_summary',
            'target_page': '/sales',
            'target_query': filters,
            'cards': [
                {'type': 'metric', 'title': '商机结果数', 'value': len(items)},
                {'type': 'metric', 'title': '商机总金额', 'value': round(total_value, 2)},
            ],
            'items': items,
        }

    def _search_orders(self, user: User, filters: dict[str, Any]) -> dict[str, Any]:
        query = Order.query.join(Customer, Customer.id == Order.customer_id)
        owner_ids = self._resolve_owner_ids(user, filters.get('owner_name'))
        if owner_ids is not None:
            query = query.filter(Customer.assigned_sales_rep_id.in_(owner_ids))

        if filters.get('min_amount') is not None:
            query = query.filter(Order.total_amount >= filters['min_amount'])
        if filters.get('recent_only'):
            query = query.filter(Order.created_at >= datetime.utcnow() - timedelta(days=filters.get('days', 30)))

        orders = query.order_by(Order.updated_at.desc()).limit(20).all()
        items = [
            {
                'id': item.id,
                'order_number': item.order_number,
                'status': ORDER_STATUS_LABELS.get(item.status, item.status),
                'total_amount': item.total_amount,
                'owner_name': item.owner_name,
            }
            for item in orders[:10]
        ]
        return {
            'intent': 'search_orders',
            'summary': f'找到 {len(items)} 条订单。',
            'filters': filters,
            'result_mode': 'page_and_summary',
            'target_page': '/sales',
            'target_query': {'tab': 'orders', **filters},
            'cards': [{'type': 'metric', 'title': '订单结果数', 'value': len(items)}],
            'items': items,
        }

    def _get_dashboard_summary(self, user: User) -> dict[str, Any]:
        accessible_user_ids = get_accessible_user_ids(user)

        customer_query = Customer.query
        opportunity_query = Opportunity.query
        order_query = Order.query.join(Customer, Customer.id == Order.customer_id)
        if accessible_user_ids is not None and user.role not in ['admin', 'manager', 'marketing']:
            customer_query = customer_query.filter(Customer.assigned_sales_rep_id.in_(accessible_user_ids))
            opportunity_query = opportunity_query.filter(Opportunity.assigned_to.in_(accessible_user_ids))
            order_query = order_query.filter(Customer.assigned_sales_rep_id.in_(accessible_user_ids))

        total_customers = customer_query.count()
        total_opportunities = opportunity_query.count()
        delivered_amount = sum(item.total_amount or 0 for item in order_query.filter(Order.status == 'delivered').all())

        return {
            'intent': 'get_dashboard_summary',
            'summary': f'当前共有客户 {total_customers} 位，商机 {total_opportunities} 条，已交付收入 {round(delivered_amount, 2)}。',
            'filters': {},
            'result_mode': 'page_and_summary',
            'target_page': '/reports',
            'target_query': {},
            'cards': [
                {'type': 'metric', 'title': '客户总数', 'value': total_customers},
                {'type': 'metric', 'title': '商机数', 'value': total_opportunities},
                {'type': 'metric', 'title': '已交付收入', 'value': round(delivered_amount, 2)},
            ],
            'items': [],
        }

    def _get_customer_interactions(self, user: User, filters: dict[str, Any]) -> dict[str, Any]:
        customer = None
        accessible_user_ids = get_accessible_user_ids(user)

        if filters.get('customer_id'):
            customer = Customer.query.get(filters['customer_id'])
        elif filters.get('customer_name'):
            search = f"%{filters['customer_name']}%"
            query = Customer.query.filter(
                or_(
                    Customer.first_name.ilike(search),
                    Customer.last_name.ilike(search),
                    Customer.company.ilike(search),
                )
            )
            if accessible_user_ids is not None:
                query = query.filter(Customer.assigned_sales_rep_id.in_(accessible_user_ids))
            customer = query.order_by(Customer.updated_at.desc()).first()

        if not customer:
            return {
                'intent': 'get_customer_interactions',
                'summary': '没有找到对应客户，建议提供更具体的客户姓名或从客户详情页进入。',
                'filters': filters,
                'result_mode': 'summary',
                'cards': [],
                'items': [],
            }

        if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
            return {
                'intent': 'get_customer_interactions',
                'summary': '你没有权限查看该客户的互动记录。',
                'filters': filters,
                'result_mode': 'summary',
                'cards': [],
                'items': [],
            }

        interactions = (
            CustomerInteraction.query
            .filter(CustomerInteraction.customer_id == customer.id)
            .order_by(CustomerInteraction.date.desc())
            .limit(5)
            .all()
        )
        items = [
            {
                'id': item.id,
                'subject': item.subject,
                'interaction_type': item.interaction_type,
                'date': item.date.isoformat(),
                'outcome': item.outcome,
                'owner_name': item.user.display_name if item.user else None,
            }
            for item in interactions
        ]
        return {
            'intent': 'get_customer_interactions',
            'summary': f'{customer.first_name}{customer.last_name} 最近共有 {len(items)} 条互动记录。',
            'filters': filters,
            'result_mode': 'page_and_summary',
            'target_page': '/customers',
            'target_query': {'customer_id': customer.id},
            'cards': [{'type': 'metric', 'title': '最近互动数', 'value': len(items)}],
            'items': items,
        }

    def _generate_follow_up_suggestion(self, user: User, filters: dict[str, Any]) -> dict[str, Any]:
        customer = Customer.query.get(filters.get('customer_id')) if filters.get('customer_id') else None
        if not customer:
            return {
                'intent': 'generate_follow_up_suggestion',
                'summary': '当前没有可用于生成建议的客户上下文。',
                'result_mode': 'summary',
                'cards': [],
                'items': [],
            }

        accessible_user_ids = get_accessible_user_ids(user)
        if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
            return {
                'intent': 'generate_follow_up_suggestion',
                'summary': '你没有权限为该客户生成跟进建议。',
                'result_mode': 'summary',
                'cards': [],
                'items': [],
            }

        latest = (
            CustomerInteraction.query
            .filter(CustomerInteraction.customer_id == customer.id)
            .order_by(CustomerInteraction.date.desc())
            .first()
        )
        latest_subject = latest.subject if latest else '暂无历史互动'
        suggestion = f'建议先回顾“{latest_subject}”，再围绕当前客户状态“{CUSTOMER_STATUS_LABELS.get(customer.status, customer.status)}”补一条电话或会议跟进，并明确下一步动作和时间。'

        return {
            'intent': 'generate_follow_up_suggestion',
            'summary': suggestion,
            'filters': filters,
            'result_mode': 'summary',
            'cards': [{'type': 'next_actions', 'title': '建议动作', 'value': suggestion}],
            'items': [],
        }

    def _generate_interaction_draft(self, user: User, filters: dict[str, Any]) -> dict[str, Any]:
        customer = Customer.query.get(filters.get('customer_id')) if filters.get('customer_id') else None
        if not customer:
            return {
                'intent': 'generate_interaction_draft',
                'summary': '当前没有可用于生成互动草稿的客户上下文。',
                'result_mode': 'summary',
                'cards': [],
                'items': [],
            }

        accessible_user_ids = get_accessible_user_ids(user)
        if accessible_user_ids is not None and customer.assigned_sales_rep_id not in accessible_user_ids:
            return {
                'intent': 'generate_interaction_draft',
                'summary': '你没有权限为该客户生成互动草稿。',
                'result_mode': 'summary',
                'cards': [],
                'items': [],
            }

        latest = (
            CustomerInteraction.query
            .filter(CustomerInteraction.customer_id == customer.id)
            .order_by(CustomerInteraction.date.desc())
            .first()
        )

        customer_name = f'{customer.first_name}{customer.last_name}'
        status_label = CUSTOMER_STATUS_LABELS.get(customer.status, customer.status)
        latest_subject = latest.subject if latest else '暂无历史互动'
        interaction_type = latest.interaction_type if latest and latest.interaction_type else 'call'
        outcome = latest.outcome if latest and latest.outcome else 'neutral'
        next_action = (
            latest.next_action
            if latest and latest.next_action
            else f'结合当前{status_label}状态，确认下一次沟通时间，并推进需求、预算或决策节点。'
        )
        draft = {
            'interaction_type': interaction_type,
            'subject': f'{customer_name} 跟进沟通',
            'description': (
                f'参考最近一次互动“{latest_subject}”，围绕客户当前状态“{status_label}”继续推进，'
                '建议补充本次沟通中的需求变化、预算反馈和关键决策信息。'
            ),
            'outcome': outcome,
            'next_action': next_action,
            'reminder_status': 'pending',
        }

        return {
            'intent': 'generate_interaction_draft',
            'summary': f'已为 {customer_name} 生成一份互动记录草稿，请确认后再提交。',
            'filters': filters,
            'result_mode': 'summary',
            'cards': [
                {'type': 'draft', 'title': '建议互动类型', 'value': interaction_type},
                {'type': 'draft', 'title': '建议结果判断', 'value': outcome},
            ],
            'items': [
                {'field': 'subject', 'value': draft['subject']},
                {'field': 'description', 'value': draft['description']},
                {'field': 'next_action', 'value': draft['next_action']},
            ],
            'draft': draft,
        }
