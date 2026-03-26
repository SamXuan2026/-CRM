import { createContext } from 'react';

/**
 * 用户类型定义
 */
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'sales_lead' | 'sales' | 'marketing' | 'customer_service';
  first_name?: string;
  last_name?: string;
  phone?: string;
  team_id?: number | null;
  team_name?: string | null;
  is_team_lead?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 认证上下文类型
 */
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  
  // 认证方法
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
  
  // 权限检查方法
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
}

/**
 * 权限映射表
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'customers:create', 'customers:read', 'customers:update', 'customers:delete',
    'sales:create', 'sales:read', 'sales:update', 'sales:delete',
    'marketing:create', 'marketing:read', 'marketing:update', 'marketing:delete',
    'reports:read', 'reports:export',
    'settings:read', 'settings:update',
  ],
  manager: [
    'users:read', 'users:update',
    'customers:create', 'customers:read', 'customers:update',
    'sales:create', 'sales:read', 'sales:update',
    'marketing:create', 'marketing:read', 'marketing:update',
    'reports:read', 'reports:export',
  ],
  sales_lead: [
    'users:create', 'users:read', 'users:update',
    'customers:create', 'customers:read', 'customers:update',
    'sales:create', 'sales:read', 'sales:update',
    'reports:read', 'reports:export',
  ],
  sales: [
    'customers:create', 'customers:read', 'customers:update',
    'sales:create', 'sales:read', 'sales:update',
    'reports:read',
  ],
  marketing: [
    'customers:read',
    'marketing:create', 'marketing:read', 'marketing:update',
    'reports:read',
  ],
  customer_service: [
    'customers:read', 'customers:update',
  ],
};

/**
 * 创建认证上下文
 */
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshAccessToken: async () => '',
  hasPermission: () => false,
  hasRole: () => false,
  hasAnyPermission: () => false,
});

export default AuthContext;

/**
 * 勾子函数：检查用户权限
 */
export const usePermissions = (user: User | null) => {
  const getPermissions = (role?: string) => {
    if (!role) return [];
    return ROLE_PERMISSIONS[role] || [];
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const permissions = getPermissions(user.role);
    return permissions.includes(permission);
  };

  const hasRole = (roles: string | string[]) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  };

  const hasAnyPermission = (...permissions: string[]) => {
    if (!user) return false;
    const userPermissions = getPermissions(user.role);
    return permissions.some((perm) => userPermissions.includes(perm));
  };

  return {
    getPermissions,
    hasPermission,
    hasRole,
    hasAnyPermission,
  };
};
