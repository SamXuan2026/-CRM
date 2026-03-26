from __future__ import annotations

from datetime import datetime, timedelta
import uuid

from app import create_app
from models import (
    CampaignLead,
    Customer,
    CustomerInteraction,
    Lead,
    MarketingCampaign,
    Opportunity,
    Order,
    User,
    db,
)


class ScenarioFailure(Exception):
    pass


class ScenarioRunner:
    def __init__(self) -> None:
        self.app = create_app()
        self.client = self.app.test_client()
        self.tag = uuid.uuid4().hex[:8]
        self.created: dict[str, list[int]] = {
            'users': [],
            'customers': [],
            'interactions': [],
            'opportunities': [],
            'orders': [],
            'campaigns': [],
            'leads': [],
        }
        self.shared: dict[str, int] = {}

    def log(self, message: str) -> None:
        print(message)

    def _headers(self, token: str | None) -> dict[str, str]:
        if not token:
            return {}
        return {'Authorization': f'Bearer {token}'}

    def request(
        self,
        method: str,
        path: str,
        token: str | None = None,
        expected_status: int | None = None,
        json: dict | None = None,
        query_string: dict | None = None,
    ) -> dict:
        response = self.client.open(
            path,
            method=method,
            headers=self._headers(token),
            json=json,
            query_string=query_string,
        )
        payload = response.get_json(silent=True) or {}
        if expected_status is not None and response.status_code != expected_status:
            raise ScenarioFailure(
                f'{method} {path} expected {expected_status}, got {response.status_code}: {payload}'
            )
        return {
            'status_code': response.status_code,
            'payload': payload,
        }

    def login(self, username: str, password: str) -> str:
        result = self.request(
            'POST',
            '/api/login',
            expected_status=200,
            json={'username': username, 'password': password},
        )
        token = ((result['payload'].get('data') or {}).get('access_token'))
        if not token:
            raise ScenarioFailure(f'Login did not return access token for {username}')
        return token

    def track(self, kind: str, resource_id: int) -> None:
        self.created[kind].append(resource_id)

    def untrack(self, kind: str, resource_id: int) -> None:
        if resource_id in self.created[kind]:
            self.created[kind].remove(resource_id)

    def run(self) -> None:
        try:
            self.run_auth_guard_scenario()
            self.run_admin_scenario()
            self.run_manager_scenario()
            self.run_sales_scenario()
            self.run_sales_isolation_scenario()
            self.run_marketing_scenario()
            self.run_customer_service_scenario()
            self.run_admin_delete_scenario()
            self.log('All role scenarios passed.')
        finally:
            self.cleanup()

    def run_auth_guard_scenario(self) -> None:
        self.log('[auth] invalid login guard flow')
        self.request(
            'POST',
            '/api/login',
            expected_status=401,
            json={'username': 'sales_wang', 'password': 'wrong-password'},
        )

    def run_admin_scenario(self) -> None:
        self.log('\n[admin] user management flow')
        token = self.login('admin', 'admin123')

        self.request('GET', '/api/users', token=token, expected_status=200)

        username = f'temp_sales_{self.tag}'
        create = self.request(
            'POST',
            '/api/users',
            token=token,
            expected_status=201,
            json={
                'username': username,
                'email': f'{username}@example.com',
                'password': 'Temp12345!',
                'role': 'sales',
                'first_name': '回归',
                'last_name': '测试',
                'phone': '13800138000',
            },
        )
        user_id = create['payload']['data']['id']
        self.track('users', user_id)

        self.request(
            'POST',
            '/api/users',
            token=token,
            expected_status=400,
            json={
                'username': username,
                'email': f'{username}@example.com',
                'password': 'Temp12345!',
                'role': 'sales',
            },
        )

        self.request(
            'PUT',
            f'/api/users/{user_id}',
            token=token,
            expected_status=200,
            json={'phone': '13800138001', 'first_name': '回归用户'},
        )
        self.request(
            'PUT',
            f'/api/users/{user_id}/password',
            token=token,
            expected_status=200,
            json={'old_password': 'ignored-for-admin', 'new_password': 'Temp12345!new'},
        )
        self.login(username, 'Temp12345!new')
        self.shared['temp_user_id'] = user_id

    def run_manager_scenario(self) -> None:
        self.log('[manager] customer management flow')
        token = self.login('manager_li', 'demo123')

        customer = self.request(
            'POST',
            '/api/customers',
            token=token,
            expected_status=201,
            json={
                'first_name': '经理',
                'last_name': f'客户{self.tag}',
                'email': f'manager-customer-{self.tag}@example.com',
                'company': f'八戒演示企业-{self.tag}',
                'phone': '13900000001',
                'status': 'prospect',
                'customer_level': 'Premium',
                'notes': '经理创建的测试客户',
            },
        )
        customer_id = customer['payload']['data']['id']
        self.track('customers', customer_id)
        self.shared['manager_customer_id'] = customer_id

        self.request(
            'POST',
            '/api/customers',
            token=token,
            expected_status=400,
            json={
                'first_name': '重复',
                'last_name': '客户',
                'email': f'manager-customer-{self.tag}@example.com',
            },
        )

        self.request(
            'PUT',
            f'/api/customers/{customer_id}',
            token=token,
            expected_status=200,
            json={
                'status': 'active',
                'notes': '经理已完成首轮跟进',
                'customer_level': 'VIP',
            },
        )
        self.request('GET', f'/api/customers/{customer_id}', token=token, expected_status=200)
        self.request('GET', '/api/reports/dashboard', token=token, expected_status=200)

    def run_sales_scenario(self) -> None:
        self.log('[sales] customer to order flow')
        token = self.login('sales_wang', 'demo123')

        customer = self.request(
            'POST',
            '/api/customers',
            token=token,
            expected_status=201,
            json={
                'first_name': '销售',
                'last_name': f'客户{self.tag}',
                'email': f'sales-customer-{self.tag}@example.com',
                'company': f'销售线索公司-{self.tag}',
                'phone': '13900000002',
                'status': 'lead',
                'customer_level': 'Standard',
                'notes': '销售创建的回归客户',
            },
        )
        customer_id = customer['payload']['data']['id']
        self.track('customers', customer_id)
        self.shared['sales_customer_id'] = customer_id

        interaction = self.request(
            'POST',
            f'/api/customers/{customer_id}/interactions',
            token=token,
            expected_status=201,
            json={
                'interaction_type': 'call',
                'subject': f'首次外呼-{self.tag}',
                'description': '客户对产品方案感兴趣，希望获取报价。',
                'date': datetime.utcnow().isoformat(),
                'duration_minutes': 18,
                'outcome': 'positive',
                'next_action': '发送报价并安排演示',
            },
        )
        self.track('interactions', interaction['payload']['data']['id'])

        opportunity = self.request(
            'POST',
            '/api/sales/opportunities',
            token=token,
            expected_status=201,
            json={
                'name': f'年度订阅机会-{self.tag}',
                'customer_id': customer_id,
                'value': 58888,
                'stage': 'qualification',
                'probability': 40,
                'expected_close_date': (datetime.utcnow() + timedelta(days=21)).date().isoformat(),
                'description': '客户正在评估年度采购预算。',
            },
        )
        opportunity_id = opportunity['payload']['data']['id']
        self.track('opportunities', opportunity_id)
        self.shared['sales_opportunity_id'] = opportunity_id

        self.request(
            'PUT',
            f'/api/sales/opportunities/{opportunity_id}',
            token=token,
            expected_status=200,
            json={
                'stage': 'proposal',
                'probability': 65,
                'description': '已发正式报价，等待采购确认。',
            },
        )

        order = self.request(
            'POST',
            '/api/sales/orders',
            token=token,
            expected_status=201,
            json={
                'customer_id': customer_id,
                'opportunity_id': opportunity_id,
                'total_amount': 58888,
                'currency': 'CNY',
                'status': 'confirmed',
                'order_date': datetime.utcnow().date().isoformat(),
                'notes': '签约完成，等待项目启动。',
            },
        )
        order_id = order['payload']['data']['id']
        self.track('orders', order_id)
        self.shared['sales_order_id'] = order_id

        self.request(
            'PUT',
            f'/api/sales/orders/{order_id}',
            token=token,
            expected_status=200,
            json={
                'status': 'shipped',
                'shipped_date': datetime.utcnow().date().isoformat(),
                'notes': '已安排实施和交付启动会。',
            },
        )

        self.request('GET', f'/api/customers/{customer_id}', token=token, expected_status=200)
        self.request('GET', f'/api/sales/opportunities/{opportunity_id}', token=token, expected_status=200)
        self.request('GET', f'/api/sales/orders/{order_id}', token=token, expected_status=200)
        self.request('GET', '/api/sales/pipeline/summary', token=token, expected_status=200)

    def run_sales_isolation_scenario(self) -> None:
        self.log('[sales_zhou] data isolation flow')
        token = self.login('sales_zhou', 'demo123')
        customer_id = self.shared['sales_customer_id']
        opportunity_id = self.shared['sales_opportunity_id']

        self.request('GET', f'/api/customers/{customer_id}', token=token, expected_status=403)
        self.request('GET', f'/api/sales/opportunities/{opportunity_id}', token=token, expected_status=403)

    def run_marketing_scenario(self) -> None:
        self.log('[marketing] campaign and lead flow')
        token = self.login('marketing_chen', 'demo123')

        self.request('GET', '/api/customers', token=token, expected_status=200)

        campaign = self.request(
            'POST',
            '/api/marketing/campaigns',
            token=token,
            expected_status=201,
            json={
                'name': f'春季转化活动-{self.tag}',
                'description': '面向重点客户的活动跟进测试',
                'status': 'planned',
                'budget': 30000,
                'spent': 5000,
                'start_date': datetime.utcnow().date().isoformat(),
                'end_date': (datetime.utcnow() + timedelta(days=14)).date().isoformat(),
                'target_audience': '制造业客户',
                'channel': 'email',
            },
        )
        campaign_id = campaign['payload']['data']['id']
        self.track('campaigns', campaign_id)

        self.request(
            'PUT',
            f'/api/marketing/campaigns/{campaign_id}',
            token=token,
            expected_status=200,
            json={
                'status': 'active',
                'spent': 8000,
                'description': '活动已启动，第一批 EDM 已发送。',
            },
        )

        lead = self.request(
            'POST',
            '/api/marketing/leads',
            token=token,
            expected_status=201,
            json={
                'customer_id': self.shared['sales_customer_id'],
                'status': 'new',
                'source': 'event',
                'value': 42000,
                'expected_close_date': (datetime.utcnow() + timedelta(days=30)).date().isoformat(),
                'notes': '活动现场新增的高意向客户线索。',
            },
        )
        lead_id = lead['payload']['data']['id']
        self.track('leads', lead_id)

        self.request('GET', f'/api/marketing/leads/{lead_id}', token=token, expected_status=200)
        self.request(
            'PUT',
            f'/api/marketing/leads/{lead_id}',
            token=token,
            expected_status=200,
            json={
                'status': 'qualified',
                'value': 46000,
                'notes': '已确认需求，准备转交销售跟进。',
            },
        )
        self.request('GET', '/api/reports/dashboard', token=token, expected_status=200)
        self.request('GET', '/api/sales/opportunities', token=token, expected_status=403)

    def run_customer_service_scenario(self) -> None:
        self.log('[customer_service] support follow-up flow')
        token = self.login('service_zhao', 'demo123')
        customer_id = self.shared['sales_customer_id']

        customers = self.request('GET', '/api/customers', token=token, expected_status=200)
        if not customers['payload'].get('data'):
            raise ScenarioFailure('customer_service should be able to read customer data')

        self.request('GET', f'/api/customers/{customer_id}', token=token, expected_status=200)
        self.request(
            'PUT',
            f'/api/customers/{customer_id}',
            token=token,
            expected_status=200,
            json={
                'notes': '客服已回访交付准备事项，客户对上线节奏满意。',
                'status': 'active',
            },
        )

        interaction = self.request(
            'POST',
            f'/api/customers/{customer_id}/interactions',
            token=token,
            expected_status=201,
            json={
                'interaction_type': 'meeting',
                'subject': f'交付准备回访-{self.tag}',
                'description': '确认上线资源和培训安排。',
                'date': datetime.utcnow().isoformat(),
                'duration_minutes': 30,
                'outcome': 'positive',
                'next_action': '发送实施计划表',
            },
        )
        self.track('interactions', interaction['payload']['data']['id'])
        self.request(
            'GET',
            f'/api/customers/{customer_id}/interactions',
            token=token,
            expected_status=200,
        )
        self.request('GET', '/api/reports/dashboard', token=token, expected_status=403)

    def run_admin_delete_scenario(self) -> None:
        self.log('[admin] delete flow')
        token = self.login('admin', 'admin123')

        customer = self.request(
            'POST',
            '/api/customers',
            token=token,
            expected_status=201,
            json={
                'first_name': '删除',
                'last_name': f'验证{self.tag}',
                'email': f'delete-customer-{self.tag}@example.com',
                'company': f'删除验证企业-{self.tag}',
                'phone': '13900000009',
                'status': 'lead',
                'customer_level': 'Standard',
            },
        )
        customer_id = customer['payload']['data']['id']
        self.track('customers', customer_id)

        opportunity = self.request(
            'POST',
            '/api/sales/opportunities',
            token=token,
            expected_status=201,
            json={
                'name': f'删除链路商机-{self.tag}',
                'customer_id': customer_id,
                'value': 12000,
                'stage': 'lead',
                'probability': 20,
            },
        )
        opportunity_id = opportunity['payload']['data']['id']
        self.track('opportunities', opportunity_id)

        order = self.request(
            'POST',
            '/api/sales/orders',
            token=token,
            expected_status=201,
            json={
                'customer_id': customer_id,
                'opportunity_id': opportunity_id,
                'total_amount': 12000,
                'currency': 'CNY',
                'status': 'pending',
            },
        )
        order_id = order['payload']['data']['id']
        self.track('orders', order_id)

        campaign = self.request(
            'POST',
            '/api/marketing/campaigns',
            token=token,
            expected_status=201,
            json={
                'name': f'删除链路活动-{self.tag}',
                'description': '用于验证管理员删除能力',
                'status': 'planned',
                'budget': 5000,
                'spent': 0,
                'start_date': datetime.utcnow().date().isoformat(),
                'channel': 'email',
            },
        )
        campaign_id = campaign['payload']['data']['id']
        self.track('campaigns', campaign_id)

        self.request('DELETE', f'/api/marketing/campaigns/{campaign_id}', token=token, expected_status=200)
        self.untrack('campaigns', campaign_id)
        self.request('GET', f'/api/marketing/campaigns/{campaign_id}', token=token, expected_status=404)

        self.request('DELETE', f'/api/sales/orders/{order_id}', token=token, expected_status=200)
        self.untrack('orders', order_id)
        self.request('GET', f'/api/sales/orders/{order_id}', token=token, expected_status=404)

        self.request('DELETE', f'/api/sales/opportunities/{opportunity_id}', token=token, expected_status=200)
        self.untrack('opportunities', opportunity_id)
        self.request('GET', f'/api/sales/opportunities/{opportunity_id}', token=token, expected_status=404)

        self.request('DELETE', f'/api/customers/{customer_id}', token=token, expected_status=200)
        self.untrack('customers', customer_id)
        self.request('GET', f'/api/customers/{customer_id}', token=token, expected_status=404)

        temp_user_id = self.shared['temp_user_id']
        self.request('DELETE', f'/api/users/{temp_user_id}', token=token, expected_status=200)
        self.untrack('users', temp_user_id)
        self.request('GET', f'/api/users/{temp_user_id}', token=token, expected_status=404)

    def cleanup(self) -> None:
        with self.app.app_context():
            try:
                if self.created['campaigns']:
                    CampaignLead.query.filter(CampaignLead.campaign_id.in_(self.created['campaigns'])).delete(
                        synchronize_session=False
                    )
                if self.created['interactions']:
                    CustomerInteraction.query.filter(
                        CustomerInteraction.id.in_(self.created['interactions'])
                    ).delete(synchronize_session=False)
                if self.created['leads']:
                    Lead.query.filter(Lead.id.in_(self.created['leads'])).delete(synchronize_session=False)
                if self.created['orders']:
                    Order.query.filter(Order.id.in_(self.created['orders'])).delete(synchronize_session=False)
                if self.created['opportunities']:
                    Opportunity.query.filter(
                        Opportunity.id.in_(self.created['opportunities'])
                    ).delete(synchronize_session=False)
                if self.created['campaigns']:
                    MarketingCampaign.query.filter(
                        MarketingCampaign.id.in_(self.created['campaigns'])
                    ).delete(synchronize_session=False)
                if self.created['customers']:
                    Customer.query.filter(Customer.id.in_(self.created['customers'])).delete(
                        synchronize_session=False
                    )
                if self.created['users']:
                    User.query.filter(User.id.in_(self.created['users'])).delete(synchronize_session=False)
                db.session.commit()
            except Exception as exc:
                db.session.rollback()
                print(f'Cleanup warning: {exc}')


if __name__ == '__main__':
    ScenarioRunner().run()
