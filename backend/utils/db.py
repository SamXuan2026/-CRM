"""
Database and Query Utilities
数据库查询和操作工具
"""
from typing import Any, List, Tuple, Optional, Type
from flask import request
from models import db
from sqlalchemy import and_, or_, asc, desc


class PaginationHelper:
    """分页助手"""
    
    DEFAULT_PAGE = 1
    DEFAULT_PER_PAGE = 20
    MAX_PER_PAGE = 100
    
    @classmethod
    def get_pagination_params(cls) -> Tuple[int, int]:
        """
        从请求参数获取分页参数
        
        Returns:
            (page, per_page) 元组
        """
        page = request.args.get('page', cls.DEFAULT_PAGE, type=int)
        per_page = request.args.get('per_page', cls.DEFAULT_PER_PAGE, type=int)
        
        # 验证参数
        page = max(1, page)
        per_page = min(max(1, per_page), cls.MAX_PER_PAGE)
        
        return page, per_page
    
    @classmethod
    def paginate_query(
        cls,
        query: Any,
        page: Optional[int] = None,
        per_page: Optional[int] = None
    ) -> Tuple[List, int]:
        """
        对查询结果进行分页
        
        Args:
            query: SQLAlchemy查询对象
            page: 页码（为None时从请求参数获取）
            per_page: 每页数量（为None时从请求参数获取）
        
        Returns:
            (items, total) 元组
        """
        if page is None or per_page is None:
            page, per_page = cls.get_pagination_params()
        
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return items, total


class SortHelper:
    """排序助手"""
    
    @staticmethod
    def get_sort_params() -> Tuple[Optional[str], Optional[str]]:
        """
        从请求参数获取排序参数
        
        Returns:
            (sort_by, sort_order) 元组
            sort_order 为 'asc' 或 'desc'
        """
        sort_by = request.args.get('sort_by')
        sort_order = request.args.get('sort_order', 'asc')
        
        if sort_order not in ['asc', 'desc']:
            sort_order = 'asc'
        
        return sort_by, sort_order
    
    @staticmethod
    def apply_sort(query: Any, model: Type, sort_by: str, sort_order: str = 'asc') -> Any:
        """
        对查询应用排序
        
        Args:
            query: SQLAlchemy查询对象
            model: 模型类
            sort_by: 排序字段名
            sort_order: 排序方向 'asc' 或 'desc'
        
        Returns:
            排序后的查询对象
        """
        if not sort_by:
            return query
        
        # 检查字段是否存在
        if not hasattr(model, sort_by):
            return query
        
        column = getattr(model, sort_by)
        
        if sort_order == 'desc':
            return query.order_by(desc(column))
        else:
            return query.order_by(asc(column))


class FilterHelper:
    """过滤助手"""
    
    @staticmethod
    def build_filter_from_request(
        model: Type,
        allowed_fields: List[str]
    ) -> List:
        """
        从请求参数构建过滤条件
        
        Args:
            model: 模型类
            allowed_fields: 允许过滤的字段列表
        
        Returns:
            过滤条件列表
        """
        filters = []
        
        for field in allowed_fields:
            value = request.args.get(field)
            if value and hasattr(model, field):
                column = getattr(model, field)
                # 支持模糊搜索（使用 %value% 进行模糊匹配）
                if field.endswith('_search'):
                    filters.append(column.like(f'%{value}%'))
                else:
                    filters.append(column == value)
        
        return filters
    
    @staticmethod
    def apply_filters(query: Any, filters: List) -> Any:
        """
        对查询应用多个过滤条件
        
        Args:
            query: SQLAlchemy查询对象
            filters: 过滤条件列表
        
        Returns:
            过滤后的查询对象
        """
        if filters:
            query = query.filter(and_(*filters))
        return query


class QueryBuilder:
    """查询构建器 - 综合使用分页、排序、过滤"""
    
    def __init__(self, query: Any, model: Type):
        self.query = query
        self.model = model
    
    def filter(self, filters: List) -> 'QueryBuilder':
        """应用过滤"""
        self.query = FilterHelper.apply_filters(self.query, filters)
        return self
    
    def sort(self, sort_by: Optional[str] = None, sort_order: str = 'asc') -> 'QueryBuilder':
        """应用排序"""
        if sort_by:
            self.query = SortHelper.apply_sort(self.query, self.model, sort_by, sort_order)
        return self
    
    def paginate(
        self,
        page: Optional[int] = None,
        per_page: Optional[int] = None
    ) -> Tuple[List, int]:
        """应用分页并返回结果"""
        return PaginationHelper.paginate_query(self.query, page, per_page)
    
    def get_all(self) -> List:
        """获取所有结果"""
        return self.query.all()
    
    def get_one(self) -> Optional[Any]:
        """获取单个结果"""
        return self.query.first()
    
    def count(self) -> int:
        """计数"""
        return self.query.count()


# 通用操作函数

def safe_commit() -> bool:
    """安全地提交数据库事务"""
    try:
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Database commit error: {str(e)}")
        return False


def safe_delete(obj: Any) -> bool:
    """安全地删除对象"""
    try:
        db.session.delete(obj)
        return safe_commit()
    except Exception as e:
        print(f"Delete error: {str(e)}")
        return False


def safe_add(obj: Any) -> bool:
    """安全地添加对象"""
    try:
        db.session.add(obj)
        return safe_commit()
    except Exception as e:
        print(f"Add error: {str(e)}")
        return False
