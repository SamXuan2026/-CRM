#!/usr/bin/env python3
"""
Initialize a realistic demo dataset for 八戒CRM.
"""
import os
import shutil
import sqlite3
from datetime import date, datetime, timedelta

from werkzeug.security import generate_password_hash


def dt(days_offset: int, hour: int = 10, minute: int = 0) -> str:
    return (
        datetime.now().replace(hour=hour, minute=minute, second=0, microsecond=0)
        + timedelta(days=days_offset)
    ).strftime('%Y-%m-%d %H:%M:%S')


def d(days_offset: int) -> str:
    return (date.today() + timedelta(days=days_offset)).isoformat()


def get_or_create_user(cursor, payload):
    cursor.execute("SELECT id FROM users WHERE username = ?", (payload['username'],))
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE users
            SET email = ?, password_hash = ?, role = ?, first_name = ?, last_name = ?, phone = ?, is_active = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload['email'],
                payload['password_hash'],
                payload['role'],
                payload['first_name'],
                payload['last_name'],
                payload['phone'],
                payload['is_active'],
                payload['updated_at'],
                row[0],
            ),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload['username'],
            payload['email'],
            payload['password_hash'],
            payload['role'],
            payload['first_name'],
            payload['last_name'],
            payload['phone'],
            payload['is_active'],
            payload['created_at'],
            payload['updated_at'],
        ),
    )
    return cursor.lastrowid


def get_or_create_customer(cursor, payload):
    cursor.execute("SELECT id FROM customers WHERE email = ?", (payload['email'],))
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE customers
            SET first_name = ?, last_name = ?, company = ?, phone = ?, address = ?, city = ?, state = ?, country = ?,
                postal_code = ?, status = ?, customer_level = ?, assigned_sales_rep_id = ?, notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload['first_name'],
                payload['last_name'],
                payload['company'],
                payload['phone'],
                payload['address'],
                payload['city'],
                payload['state'],
                payload['country'],
                payload['postal_code'],
                payload['status'],
                payload['customer_level'],
                payload['assigned_sales_rep_id'],
                payload['notes'],
                payload['updated_at'],
                row[0],
            ),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO customers (
            first_name, last_name, company, email, phone, address, city, state, country, postal_code,
            status, customer_level, assigned_sales_rep_id, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload['first_name'],
            payload['last_name'],
            payload['company'],
            payload['email'],
            payload['phone'],
            payload['address'],
            payload['city'],
            payload['state'],
            payload['country'],
            payload['postal_code'],
            payload['status'],
            payload['customer_level'],
            payload['assigned_sales_rep_id'],
            payload['notes'],
            payload['created_at'],
            payload['updated_at'],
        ),
    )
    return cursor.lastrowid


def get_or_create_lead(cursor, payload):
    cursor.execute(
        "SELECT id FROM leads WHERE customer_id = ? AND source = ? AND status = ?",
        (payload['customer_id'], payload['source'], payload['status']),
    )
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE leads
            SET assigned_to = ?, value = ?, expected_close_date = ?, notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload['assigned_to'],
                payload['value'],
                payload['expected_close_date'],
                payload['notes'],
                payload['updated_at'],
                row[0],
            ),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO leads (customer_id, assigned_to, status, source, value, expected_close_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload['customer_id'],
            payload['assigned_to'],
            payload['status'],
            payload['source'],
            payload['value'],
            payload['expected_close_date'],
            payload['notes'],
            payload['created_at'],
            payload['updated_at'],
        ),
    )
    return cursor.lastrowid


def get_or_create_opportunity(cursor, payload):
    cursor.execute(
        "SELECT id FROM opportunities WHERE name = ? AND customer_id = ?",
        (payload['name'], payload['customer_id']),
    )
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE opportunities
            SET assigned_to = ?, stage = ?, value = ?, probability = ?, expected_close_date = ?, description = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload['assigned_to'],
                payload['stage'],
                payload['value'],
                payload['probability'],
                payload['expected_close_date'],
                payload['description'],
                payload['updated_at'],
                row[0],
            ),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO opportunities (
            name, customer_id, assigned_to, stage, value, probability, expected_close_date, description, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload['name'],
            payload['customer_id'],
            payload['assigned_to'],
            payload['stage'],
            payload['value'],
            payload['probability'],
            payload['expected_close_date'],
            payload['description'],
            payload['created_at'],
            payload['updated_at'],
        ),
    )
    return cursor.lastrowid


def get_or_create_order(cursor, payload):
    cursor.execute("SELECT id FROM orders WHERE order_number = ?", (payload['order_number'],))
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE orders
            SET customer_id = ?, opportunity_id = ?, status = ?, total_amount = ?, currency = ?, order_date = ?,
                shipped_date = ?, delivered_date = ?, notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload['customer_id'],
                payload['opportunity_id'],
                payload['status'],
                payload['total_amount'],
                payload['currency'],
                payload['order_date'],
                payload['shipped_date'],
                payload['delivered_date'],
                payload['notes'],
                payload['updated_at'],
                row[0],
            ),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO orders (
            order_number, customer_id, opportunity_id, status, total_amount, currency, order_date,
            shipped_date, delivered_date, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload['order_number'],
            payload['customer_id'],
            payload['opportunity_id'],
            payload['status'],
            payload['total_amount'],
            payload['currency'],
            payload['order_date'],
            payload['shipped_date'],
            payload['delivered_date'],
            payload['notes'],
            payload['created_at'],
            payload['updated_at'],
        ),
    )
    return cursor.lastrowid


def get_or_create_campaign(cursor, payload):
    cursor.execute("SELECT id FROM marketing_campaigns WHERE name = ?", (payload['name'],))
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE marketing_campaigns
            SET description = ?, status = ?, start_date = ?, end_date = ?, budget = ?, spent = ?,
                target_audience = ?, channel = ?, manager_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload['description'],
                payload['status'],
                payload['start_date'],
                payload['end_date'],
                payload['budget'],
                payload['spent'],
                payload['target_audience'],
                payload['channel'],
                payload['manager_id'],
                payload['updated_at'],
                row[0],
            ),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO marketing_campaigns (
            name, description, status, start_date, end_date, budget, spent, target_audience, channel, manager_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload['name'],
            payload['description'],
            payload['status'],
            payload['start_date'],
            payload['end_date'],
            payload['budget'],
            payload['spent'],
            payload['target_audience'],
            payload['channel'],
            payload['manager_id'],
            payload['created_at'],
            payload['updated_at'],
        ),
    )
    return cursor.lastrowid


def get_or_create_interaction(cursor, payload):
    cursor.execute(
        """
        SELECT id FROM customer_interactions
        WHERE customer_id = ? AND user_id = ? AND subject = ? AND date = ?
        """,
        (payload['customer_id'], payload['user_id'], payload['subject'], payload['date']),
    )
    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE customer_interactions
            SET interaction_type = ?, description = ?, duration_minutes = ?, outcome = ?, next_action = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload['interaction_type'],
                payload['description'],
                payload['duration_minutes'],
                payload['outcome'],
                payload['next_action'],
                payload['updated_at'],
                row[0],
            ),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO customer_interactions (
            customer_id, user_id, interaction_type, subject, description, date, duration_minutes, outcome, next_action, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload['customer_id'],
            payload['user_id'],
            payload['interaction_type'],
            payload['subject'],
            payload['description'],
            payload['date'],
            payload['duration_minutes'],
            payload['outcome'],
            payload['next_action'],
            payload['created_at'],
            payload['updated_at'],
        ),
    )
    return cursor.lastrowid


def link_campaign_lead(cursor, campaign_id, lead_id, source, converted=False, conversion_date=None):
    cursor.execute(
        "SELECT id FROM campaign_leads WHERE campaign_id = ? AND lead_id = ?",
        (campaign_id, lead_id),
    )
    row = cursor.fetchone()
    if row:
        cursor.execute(
            "UPDATE campaign_leads SET source = ?, converted = ?, conversion_date = ? WHERE id = ?",
            (source, 1 if converted else 0, conversion_date, row[0]),
        )
        return row[0]

    cursor.execute(
        """
        INSERT INTO campaign_leads (campaign_id, lead_id, source, converted, conversion_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (campaign_id, lead_id, source, 1 if converted else 0, conversion_date, dt(-20)),
    )
    return cursor.lastrowid


def init_db():
    db_path = os.path.join(os.path.dirname(__file__), 'backend', 'crm.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")

    # Users
    users = {
        'admin': {
            'username': 'admin',
            'email': 'admin@example.com',
            'password_hash': generate_password_hash('admin123'),
            'role': 'admin',
            'first_name': '系统',
            'last_name': '管理员',
            'phone': '13800000001',
            'is_active': 1,
            'created_at': dt(-120),
            'updated_at': dt(-2),
        },
        'manager_li': {
            'username': 'manager_li',
            'email': 'li.manager@bajiecrm.local',
            'password_hash': generate_password_hash('demo123'),
            'role': 'manager',
            'first_name': '李',
            'last_name': '卓群',
            'phone': '13800000002',
            'is_active': 1,
            'created_at': dt(-110),
            'updated_at': dt(-2),
        },
        'sales_wang': {
            'username': 'sales_wang',
            'email': 'wang.sales@bajiecrm.local',
            'password_hash': generate_password_hash('demo123'),
            'role': 'sales',
            'first_name': '王',
            'last_name': '越',
            'phone': '13800000003',
            'is_active': 1,
            'created_at': dt(-100),
            'updated_at': dt(-1),
        },
        'sales_zhou': {
            'username': 'sales_zhou',
            'email': 'zhou.sales@bajiecrm.local',
            'password_hash': generate_password_hash('demo123'),
            'role': 'sales',
            'first_name': '周',
            'last_name': '岚',
            'phone': '13800000004',
            'is_active': 1,
            'created_at': dt(-95),
            'updated_at': dt(-1),
        },
        'marketing_chen': {
            'username': 'marketing_chen',
            'email': 'chen.marketing@bajiecrm.local',
            'password_hash': generate_password_hash('demo123'),
            'role': 'marketing',
            'first_name': '陈',
            'last_name': '璟',
            'phone': '13800000005',
            'is_active': 1,
            'created_at': dt(-90),
            'updated_at': dt(-1),
        },
        'service_zhao': {
            'username': 'service_zhao',
            'email': 'zhao.service@bajiecrm.local',
            'password_hash': generate_password_hash('demo123'),
            'role': 'customer_service',
            'first_name': '赵',
            'last_name': '宁',
            'phone': '13800000006',
            'is_active': 1,
            'created_at': dt(-85),
            'updated_at': dt(-1),
        },
    }
    user_ids = {key: get_or_create_user(cursor, payload) for key, payload in users.items()}

    # Customers
    customers = {
        'johndoe': {
            'first_name': 'John',
            'last_name': 'Doe',
            'company': 'ABC Company',
            'email': 'john.doe@example.com',
            'phone': '+1-555-123-4567',
            'address': '123 Main St',
            'city': 'New York',
            'state': 'NY',
            'country': 'USA',
            'postal_code': '10001',
            'status': 'customer',
            'customer_level': 'Premium',
            'assigned_sales_rep_id': user_ids['sales_wang'],
            'notes': '已签约 12 个月方案，关注续费折扣与多团队协作能力。',
            'created_at': dt(-75),
            'updated_at': dt(-2),
        },
        'linmei': {
            'first_name': '林',
            'last_name': '玫',
            'company': '星帆教育科技',
            'email': 'lin.mei@xingfan.edu',
            'phone': '13900010001',
            'address': '浦东新区张江路 88 号',
            'city': '上海',
            'state': '上海',
            'country': '中国',
            'postal_code': '200120',
            'status': 'customer',
            'customer_level': 'VIP',
            'assigned_sales_rep_id': user_ids['sales_zhou'],
            'notes': '校区扩张中，未来 6 个月存在二次增购机会。',
            'created_at': dt(-65),
            'updated_at': dt(-1),
        },
        'chenhao': {
            'first_name': '陈',
            'last_name': '昊',
            'company': '云麦制造',
            'email': 'chen.hao@yunmai.com',
            'phone': '13900010002',
            'address': '苏州工业园区金鸡湖大道 166 号',
            'city': '苏州',
            'state': '江苏',
            'country': '中国',
            'postal_code': '215000',
            'status': 'prospect',
            'customer_level': 'Premium',
            'assigned_sales_rep_id': user_ids['sales_wang'],
            'notes': '对工单和售后流程管理很感兴趣，决策链条较长。',
            'created_at': dt(-58),
            'updated_at': dt(-3),
        },
        'wangyue': {
            'first_name': '王',
            'last_name': '悦',
            'company': '青禾零售',
            'email': 'wang.yue@qinghe-retail.cn',
            'phone': '13900010003',
            'address': '杭州市西湖区古墩路 299 号',
            'city': '杭州',
            'state': '浙江',
            'country': '中国',
            'postal_code': '310000',
            'status': 'lead',
            'customer_level': 'Standard',
            'assigned_sales_rep_id': user_ids['sales_zhou'],
            'notes': '来自线下大会名单，尚未完成首轮需求访谈。',
            'created_at': dt(-41),
            'updated_at': dt(-4),
        },
        'liuna': {
            'first_name': '刘',
            'last_name': '娜',
            'company': '果岭医疗',
            'email': 'liu.na@greenmed.cn',
            'phone': '13900010004',
            'address': '成都市高新区天府大道 588 号',
            'city': '成都',
            'state': '四川',
            'country': '中国',
            'postal_code': '610000',
            'status': 'prospect',
            'customer_level': 'VIP',
            'assigned_sales_rep_id': user_ids['sales_wang'],
            'notes': '预算充足，但要求数据权限与审批流非常细。',
            'created_at': dt(-33),
            'updated_at': dt(-2),
        },
        'sunpeng': {
            'first_name': '孙',
            'last_name': '鹏',
            'company': '启程物流',
            'email': 'sun.peng@qichenglogistics.com',
            'phone': '13900010005',
            'address': '深圳市南山区科苑路 66 号',
            'city': '深圳',
            'state': '广东',
            'country': '中国',
            'postal_code': '518000',
            'status': 'customer',
            'customer_level': 'Standard',
            'assigned_sales_rep_id': user_ids['sales_zhou'],
            'notes': '已采购基础版，近期在评估客服团队扩容。',
            'created_at': dt(-29),
            'updated_at': dt(-1),
        },
        'gaoqi': {
            'first_name': '高',
            'last_name': '琪',
            'company': '曜石咨询',
            'email': 'gao.qi@obsidian-consulting.cn',
            'phone': '13900010006',
            'address': '北京市朝阳区望京 SOHO T3',
            'city': '北京',
            'state': '北京',
            'country': '中国',
            'postal_code': '100102',
            'status': 'inactive',
            'customer_level': 'Premium',
            'assigned_sales_rep_id': user_ids['manager_li'],
            'notes': '去年试用未续费，今年有望重新激活。',
            'created_at': dt(-150),
            'updated_at': dt(-8),
        },
        'tianxin': {
            'first_name': '田',
            'last_name': '欣',
            'company': '蓝岸家居',
            'email': 'tian.xin@bluecoast-home.com',
            'phone': '13900010007',
            'address': '佛山市顺德区北滘镇工业大道 18 号',
            'city': '佛山',
            'state': '广东',
            'country': '中国',
            'postal_code': '528000',
            'status': 'lead',
            'customer_level': 'Standard',
            'assigned_sales_rep_id': user_ids['sales_wang'],
            'notes': '官网表单线索，正在等待样板账号演示。',
            'created_at': dt(-12),
            'updated_at': dt(-1),
        },
    }
    extra_customer_profiles = [
        ('赵', '晨', '海右科技', '上海', '中国', 'prospect', 'Premium'),
        ('吴', '帆', '北辰传媒', '北京', '中国', 'lead', 'Standard'),
        ('冯', '逸', '朗曜资本', '深圳', '中国', 'customer', 'VIP'),
        ('谢', '晴', '松果健康', '杭州', '中国', 'prospect', 'Premium'),
        ('何', '立', '极客工场', '广州', '中国', 'lead', 'Standard'),
        ('许', '薇', '元象数据', '南京', '中国', 'customer', 'Premium'),
        ('邹', '睿', '云舟物流', '武汉', '中国', 'customer', 'Standard'),
        ('陶', '嘉', '霁光家居', '苏州', '中国', 'prospect', 'Standard'),
        ('蒋', '沐', '星联新能源', '合肥', '中国', 'lead', 'Premium'),
        ('沈', '拓', '衡石咨询', '长沙', '中国', 'inactive', 'Standard'),
        ('韩', '玥', '远川制造', '宁波', '中国', 'customer', 'VIP'),
        ('吕', '川', '灵犀软件', '厦门', '中国', 'prospect', 'Premium'),
        ('孔', '唯', '澄海生物', '天津', '中国', 'lead', 'Standard'),
        ('曹', '祺', '青沐文旅', '西安', '中国', 'customer', 'Premium'),
        ('严', '诺', '麦禾餐饮', '重庆', '中国', 'prospect', 'Standard'),
        ('华', '清', '曜云教育', '郑州', '中国', 'lead', 'Premium'),
    ]
    for index, profile in enumerate(extra_customer_profiles, start=1):
        first_name, last_name, company, city, country, status, level = profile
        owner_key = 'sales_wang' if index % 2 else 'sales_zhou'
        customers[f'bulk_customer_{index:02d}'] = {
            'first_name': first_name,
            'last_name': last_name,
            'company': company,
            'email': f"contact{index:02d}@{company.lower().replace(' ', '').replace('科技', 'tech').replace('传媒', 'media').replace('资本', 'capital').replace('健康', 'health').replace('工场', 'lab').replace('数据', 'data').replace('物流', 'logistics').replace('家居', 'home').replace('新能源', 'energy').replace('咨询', 'consulting').replace('制造', 'manufacturing').replace('软件', 'software').replace('生物', 'bio').replace('文旅', 'travel').replace('餐饮', 'food').replace('教育', 'edu')}.local",
            'phone': f"1391000{index:04d}",
            'address': f"{city}市示范大道 {100 + index} 号",
            'city': city,
            'state': city,
            'country': country,
            'postal_code': f"{200000 + index}",
            'status': status,
            'customer_level': level,
            'assigned_sales_rep_id': user_ids[owner_key],
            'notes': f'{company} 为八戒CRM 批量模拟客户，用于演示不同区域与行业的销售场景。',
            'created_at': dt(-60 + index),
            'updated_at': dt(-1),
        }
    customer_ids = {key: get_or_create_customer(cursor, payload) for key, payload in customers.items()}

    leads = {
        'johndoe_referral': {
            'customer_id': customer_ids['johndoe'],
            'assigned_to': user_ids['sales_wang'],
            'status': 'converted',
            'source': 'referral',
            'value': 5000,
            'expected_close_date': d(-55),
            'notes': '老客户推荐，成交周期短，已顺利转化。',
            'created_at': dt(-80),
            'updated_at': dt(-60),
        },
        'chenhao_website': {
            'customer_id': customer_ids['chenhao'],
            'assigned_to': user_ids['sales_wang'],
            'status': 'qualified',
            'source': 'website',
            'value': 28000,
            'expected_close_date': d(18),
            'notes': '官网预约演示，已进入技术评估阶段。',
            'created_at': dt(-24),
            'updated_at': dt(-2),
        },
        'wangyue_event': {
            'customer_id': customer_ids['wangyue'],
            'assigned_to': user_ids['sales_zhou'],
            'status': 'contacted',
            'source': 'event',
            'value': 12000,
            'expected_close_date': d(30),
            'notes': '展会获取名片，已完成首次电话沟通。',
            'created_at': dt(-16),
            'updated_at': dt(-1),
        },
        'liuna_referral': {
            'customer_id': customer_ids['liuna'],
            'assigned_to': user_ids['sales_wang'],
            'status': 'proposal',
            'source': 'referral',
            'value': 68000,
            'expected_close_date': d(12),
            'notes': '方案已发出，等待法务与采购审核。',
            'created_at': dt(-21),
            'updated_at': dt(-1),
        },
        'sunpeng_phone': {
            'customer_id': customer_ids['sunpeng'],
            'assigned_to': user_ids['sales_zhou'],
            'status': 'converted',
            'source': 'phone',
            'value': 9800,
            'expected_close_date': d(-10),
            'notes': '客服扩容项目已签单。',
            'created_at': dt(-35),
            'updated_at': dt(-9),
        },
        'tianxin_website': {
            'customer_id': customer_ids['tianxin'],
            'assigned_to': user_ids['sales_wang'],
            'status': 'new',
            'source': 'website',
            'value': 9000,
            'expected_close_date': d(25),
            'notes': '刚提交表单，等待销售回访。',
            'created_at': dt(-5),
            'updated_at': dt(-1),
        },
    }
    bulk_customer_keys = [key for key in customer_ids if key.startswith('bulk_customer_')]
    lead_status_cycle = ['new', 'contacted', 'qualified', 'proposal', 'converted', 'lost']
    lead_source_cycle = ['website', 'referral', 'event', 'email', 'phone']
    for index, customer_key in enumerate(bulk_customer_keys, start=1):
        owner_id = customers[customer_key]['assigned_sales_rep_id']
        leads[f'bulk_lead_{index:02d}'] = {
            'customer_id': customer_ids[customer_key],
            'assigned_to': owner_id,
            'status': lead_status_cycle[index % len(lead_status_cycle)],
            'source': lead_source_cycle[index % len(lead_source_cycle)],
            'value': 6000 + index * 2200,
            'expected_close_date': d((index % 45) - 10),
            'notes': f'批量模拟线索 {index}，用于验证漏斗、来源和转化率表现。',
            'created_at': dt(-25 + index),
            'updated_at': dt(-1),
        }
    lead_ids = {key: get_or_create_lead(cursor, payload) for key, payload in leads.items()}

    opportunities = {
        'john_renewal': {
            'name': 'ABC Company 年度续费',
            'customer_id': customer_ids['johndoe'],
            'assigned_to': user_ids['sales_wang'],
            'stage': 'closed_won',
            'value': 5000,
            'probability': 100,
            'expected_close_date': d(-50),
            'description': '年度续费加 3 个坐席扩容，已签约并回款。',
            'created_at': dt(-72),
            'updated_at': dt(-50),
        },
        'linmei_upgrade': {
            'name': '星帆教育多校区升级包',
            'customer_id': customer_ids['linmei'],
            'assigned_to': user_ids['sales_zhou'],
            'stage': 'negotiation',
            'value': 88000,
            'probability': 70,
            'expected_close_date': d(15),
            'description': '涉及总部与分校协同排班，正在谈判最终席位与实施范围。',
            'created_at': dt(-20),
            'updated_at': dt(-1),
        },
        'chenhao_factory_suite': {
            'name': '云麦制造工厂数字化套件',
            'customer_id': customer_ids['chenhao'],
            'assigned_to': user_ids['sales_wang'],
            'stage': 'proposal',
            'value': 28000,
            'probability': 45,
            'expected_close_date': d(18),
            'description': '已提交标准版加审批流增强方案。',
            'created_at': dt(-18),
            'updated_at': dt(-1),
        },
        'liuna_private_deploy': {
            'name': '果岭医疗私有化部署项目',
            'customer_id': customer_ids['liuna'],
            'assigned_to': user_ids['sales_wang'],
            'stage': 'qualification',
            'value': 126000,
            'probability': 35,
            'expected_close_date': d(40),
            'description': '已确认预算，但仍需补齐安全合规方案。',
            'created_at': dt(-12),
            'updated_at': dt(-1),
        },
        'sunpeng_support': {
            'name': '启程物流客服席位扩容',
            'customer_id': customer_ids['sunpeng'],
            'assigned_to': user_ids['sales_zhou'],
            'stage': 'won',
            'value': 9800,
            'probability': 100,
            'expected_close_date': d(-11),
            'description': '客户服务团队扩容 12 席位，已完成交付。',
            'created_at': dt(-30),
            'updated_at': dt(-9),
        },
        'gaoqi_reactivation': {
            'name': '曜石咨询重新激活试点',
            'customer_id': customer_ids['gaoqi'],
            'assigned_to': user_ids['manager_li'],
            'stage': 'lost',
            'value': 18000,
            'probability': 0,
            'expected_close_date': d(-20),
            'description': '预算冻结，项目暂时搁置。',
            'created_at': dt(-44),
            'updated_at': dt(-20),
        },
    }
    stage_cycle = ['lead', 'qualification', 'proposal', 'negotiation', 'won', 'lost']
    for index, customer_key in enumerate(bulk_customer_keys[:14], start=1):
        owner_id = customers[customer_key]['assigned_sales_rep_id']
        stage = stage_cycle[index % len(stage_cycle)]
        opportunities[f'bulk_opportunity_{index:02d}'] = {
            'name': f"{customers[customer_key]['company']} - 八戒CRM 方案 {index:02d}",
            'customer_id': customer_ids[customer_key],
            'assigned_to': owner_id,
            'stage': stage,
            'value': 12000 + index * 4500,
            'probability': 100 if stage in ['won', 'closed_won'] else 0 if stage in ['lost', 'closed_lost'] else 20 + (index % 4) * 20,
            'expected_close_date': d((index % 50) - 15),
            'description': f'批量模拟商机 {index}，覆盖从线索到赢单/输单的完整销售阶段。',
            'created_at': dt(-22 + index),
            'updated_at': dt(-1),
        }
    opportunity_ids = {key: get_or_create_opportunity(cursor, payload) for key, payload in opportunities.items()}

    orders = {
        'ORD-202603-001': {
            'order_number': 'ORD-202603-001',
            'customer_id': customer_ids['johndoe'],
            'opportunity_id': opportunity_ids['john_renewal'],
            'status': 'delivered',
            'total_amount': 5000,
            'currency': 'USD',
            'order_date': d(-50),
            'shipped_date': d(-48),
            'delivered_date': d(-45),
            'notes': '线上交付完成，客户已验收。',
            'created_at': dt(-50),
            'updated_at': dt(-45),
        },
        'ORD-202603-002': {
            'order_number': 'ORD-202603-002',
            'customer_id': customer_ids['sunpeng'],
            'opportunity_id': opportunity_ids['sunpeng_support'],
            'status': 'delivered',
            'total_amount': 9800,
            'currency': 'CNY',
            'order_date': d(-11),
            'shipped_date': d(-9),
            'delivered_date': d(-7),
            'notes': '客服扩容项目已上线。',
            'created_at': dt(-11),
            'updated_at': dt(-7),
        },
        'ORD-202603-003': {
            'order_number': 'ORD-202603-003',
            'customer_id': customer_ids['linmei'],
            'opportunity_id': opportunity_ids['linmei_upgrade'],
            'status': 'confirmed',
            'total_amount': 32000,
            'currency': 'CNY',
            'order_date': d(-2),
            'shipped_date': None,
            'delivered_date': None,
            'notes': '首付款已确认，等待交付排期。',
            'created_at': dt(-2),
            'updated_at': dt(-1),
        },
        'ORD-202603-004': {
            'order_number': 'ORD-202603-004',
            'customer_id': customer_ids['chenhao'],
            'opportunity_id': opportunity_ids['chenhao_factory_suite'],
            'status': 'pending',
            'total_amount': 28000,
            'currency': 'CNY',
            'order_date': d(3),
            'shipped_date': None,
            'delivered_date': None,
            'notes': '待客户确认采购流程后转正式订单。',
            'created_at': dt(-1),
            'updated_at': dt(-1),
        },
    }
    won_bulk_keys = [key for key, value in opportunities.items() if key.startswith('bulk_opportunity_') and value['stage'] == 'won']
    for index, opp_key in enumerate(won_bulk_keys[:8], start=1):
        opp = opportunities[opp_key]
        orders[f'BULK-ORD-{index:03d}'] = {
            'order_number': f'BULK-ORD-{index:03d}',
            'customer_id': opp['customer_id'],
            'opportunity_id': opportunity_ids[opp_key],
            'status': 'delivered' if index % 2 else 'confirmed',
            'total_amount': opp['value'],
            'currency': 'CNY',
            'order_date': d(-index * 2),
            'shipped_date': d(-(index * 2) + 1) if index % 2 else None,
            'delivered_date': d(-(index * 2) + 3) if index % 2 else None,
            'notes': f'批量模拟订单 {index}，用于展示真实交付节奏。',
            'created_at': dt(-index * 2),
            'updated_at': dt(-1),
        }
    get_or_create_order_ids = {key: get_or_create_order(cursor, payload) for key, payload in orders.items()}

    campaigns = {
        'spring_growth': {
            'name': '春季增长计划',
            'description': '面向教育与零售行业客户的线索培育活动。',
            'status': 'running',
            'start_date': d(-30),
            'end_date': d(20),
            'budget': 50000,
            'spent': 21800,
            'target_audience': '中型成长企业负责人',
            'channel': 'email',
            'manager_id': user_ids['marketing_chen'],
            'created_at': dt(-32),
            'updated_at': dt(-1),
        },
        'private_deploy': {
            'name': '医疗行业私有化专题',
            'description': '针对私有化部署场景的定向内容营销。',
            'status': 'planned',
            'start_date': d(5),
            'end_date': d(45),
            'budget': 80000,
            'spent': 12000,
            'target_audience': '医疗与制造行业信息化负责人',
            'channel': 'social',
            'manager_id': user_ids['marketing_chen'],
            'created_at': dt(-8),
            'updated_at': dt(-1),
        },
        'reactivation': {
            'name': '沉睡客户唤醒计划',
            'description': '针对半年未活跃客户的回访与权益优惠活动。',
            'status': 'running',
            'start_date': d(-18),
            'end_date': d(12),
            'budget': 30000,
            'spent': 9800,
            'target_audience': '历史试用或流失客户',
            'channel': 'sms',
            'manager_id': user_ids['manager_li'],
            'created_at': dt(-19),
            'updated_at': dt(-2),
        },
    }
    for index in range(1, 5):
        campaigns[f'bulk_campaign_{index:02d}'] = {
            'name': f'季度增长活动 {index:02d}',
            'description': f'批量模拟营销活动 {index}，用于验证渠道、预算和线索联动。',
            'status': 'running' if index % 2 else 'planned',
            'start_date': d(-10 * index),
            'end_date': d(20 + index * 3),
            'budget': 20000 + index * 15000,
            'spent': 4000 + index * 3500,
            'target_audience': '中型企业业务负责人',
            'channel': ['email', 'social', 'sms', 'direct'][index % 4],
            'manager_id': user_ids['marketing_chen'],
            'created_at': dt(-15 * index),
            'updated_at': dt(-1),
        }
    campaign_ids = {key: get_or_create_campaign(cursor, payload) for key, payload in campaigns.items()}

    interactions = [
        {
            'customer_id': customer_ids['chenhao'],
            'user_id': user_ids['sales_wang'],
            'interaction_type': 'meeting',
            'subject': '工厂场景需求梳理会',
            'description': '与运营负责人讨论工单流转、审批节点与多角色协同。',
            'date': dt(-6, 14, 30),
            'duration_minutes': 60,
            'outcome': 'positive',
            'next_action': '补充带审批流的演示环境',
            'created_at': dt(-6, 14, 30),
            'updated_at': dt(-6, 14, 30),
        },
        {
            'customer_id': customer_ids['linmei'],
            'user_id': user_ids['sales_zhou'],
            'interaction_type': 'call',
            'subject': '多校区授权范围确认',
            'description': '确认总部与分校权限边界，以及计划上线时间。',
            'date': dt(-3, 11, 0),
            'duration_minutes': 35,
            'outcome': 'positive',
            'next_action': '发送报价单修订版',
            'created_at': dt(-3, 11, 0),
            'updated_at': dt(-3, 11, 0),
        },
        {
            'customer_id': customer_ids['wangyue'],
            'user_id': user_ids['sales_zhou'],
            'interaction_type': 'email',
            'subject': '展会线索首次跟进',
            'description': '发送了产品介绍与演示预约链接。',
            'date': dt(-7, 9, 15),
            'duration_minutes': 10,
            'outcome': 'neutral',
            'next_action': '2 天后电话回访',
            'created_at': dt(-7, 9, 15),
            'updated_at': dt(-7, 9, 15),
        },
        {
            'customer_id': customer_ids['sunpeng'],
            'user_id': user_ids['service_zhao'],
            'interaction_type': 'note',
            'subject': '交付后一周回访',
            'description': '客户反馈客服排班效率明显提升，希望下季度增加机器人助手。',
            'date': dt(-4, 16, 20),
            'duration_minutes': 20,
            'outcome': 'positive',
            'next_action': '转销售评估增购机会',
            'created_at': dt(-4, 16, 20),
            'updated_at': dt(-4, 16, 20),
        },
        {
            'customer_id': customer_ids['gaoqi'],
            'user_id': user_ids['manager_li'],
            'interaction_type': 'call',
            'subject': '重新激活预算沟通',
            'description': '对方表示本季度预算冻结，但愿意保留下一轮接触窗口。',
            'date': dt(-20, 10, 45),
            'duration_minutes': 18,
            'outcome': 'negative',
            'next_action': '下季度初再次联系',
            'created_at': dt(-20, 10, 45),
            'updated_at': dt(-20, 10, 45),
        },
    ]
    for index, customer_key in enumerate(bulk_customer_keys[:16], start=1):
        owner_id = customers[customer_key]['assigned_sales_rep_id']
        interactions.append(
            {
                'customer_id': customer_ids[customer_key],
                'user_id': owner_id,
                'interaction_type': ['email', 'call', 'meeting', 'note'][index % 4],
                'subject': f"{customers[customer_key]['company']} 跟进记录 {index:02d}",
                'description': f'批量模拟互动 {index}，用于展示最近活动、互动分布和时间线。',
                'date': dt(-(index % 18) - 1, 9 + (index % 6), 10),
                'duration_minutes': 15 + (index % 4) * 15,
                'outcome': ['positive', 'neutral', 'negative'][index % 3],
                'next_action': '继续推进需求确认与报价节奏',
                'created_at': dt(-(index % 18) - 1, 9 + (index % 6), 10),
                'updated_at': dt(-(index % 18) - 1, 9 + (index % 6), 10),
            }
        )
    for interaction in interactions:
        get_or_create_interaction(cursor, interaction)

    link_campaign_lead(cursor, campaign_ids['spring_growth'], lead_ids['wangyue_event'], 'event', False, None)
    link_campaign_lead(cursor, campaign_ids['spring_growth'], lead_ids['chenhao_website'], 'website', False, None)
    link_campaign_lead(cursor, campaign_ids['private_deploy'], lead_ids['liuna_referral'], 'referral', False, None)
    link_campaign_lead(cursor, campaign_ids['reactivation'], lead_ids['johndoe_referral'], 'referral', True, dt(-55))
    link_campaign_lead(cursor, campaign_ids['reactivation'], lead_ids['sunpeng_phone'], 'phone', True, dt(-10))
    for index, lead_key in enumerate([key for key in lead_ids if key.startswith('bulk_lead_')][:12], start=1):
        campaign_key = list(campaign_ids.keys())[index % len(campaign_ids)]
        converted = leads[lead_key]['status'] == 'converted'
        link_campaign_lead(cursor, campaign_ids[campaign_key], lead_ids[lead_key], leads[lead_key]['source'], converted, dt(-index) if converted else None)

    conn.commit()
    conn.close()

    backend_instance_path = os.path.join(os.path.dirname(__file__), 'backend', 'instance', 'crm.db')
    os.makedirs(os.path.dirname(backend_instance_path), exist_ok=True)
    shutil.copy2(db_path, backend_instance_path)

    root_instance_path = os.path.join(os.path.dirname(__file__), 'instance', 'crm.db')
    os.makedirs(os.path.dirname(root_instance_path), exist_ok=True)
    shutil.copy2(db_path, root_instance_path)

    print("\n八戒CRM 初始化完成。")
    print("默认管理员: admin / admin123")
    print("演示账号: manager_li / demo123, sales_wang / demo123, sales_zhou / demo123, marketing_chen / demo123, service_zhao / demo123")
    print(f"已准备数据: {len(users)} 个用户, {len(customers)} 个客户, {len(leads)} 条线索, {len(opportunities)} 个商机, {len(orders)} 张订单, {len(campaigns)} 个营销活动。")


if __name__ == '__main__':
    init_db()
