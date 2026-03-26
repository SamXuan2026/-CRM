import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthProvider';
import { AuthContextType } from '../contexts/AuthContext';

/**
 * useAuth 勾子 - 在任何组件中使用认证功能
 *
 * @example
 * const { user, isAuthenticated, login, logout, hasPermission } = useAuth();
 *
 * if (!isAuthenticated) {
 *   return <Navigate to="/login" />;
 * }
 *
 * if (!hasPermission('customers:create')) {
 *   return <Unauthorized />;
 * }
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

/**
 * useIsAuthenticated 勾子 - 检查用户是否已认证
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

/**
 * useUser 勾子 - 获取当前用户对象
 */
export const useUser = () => {
  const { user } = useAuth();
  return user;
};

/**
 * usePermissions 勾子 - 权限检查
 */
export const usePermissions = () => {
  const { user, hasPermission, hasRole, hasAnyPermission } = useAuth();

  return {
    user,
    hasPermission,
    hasRole,
    hasAnyPermission,
    can: hasPermission, // 别名
  };
};

/**
 * useIsAdmin 勾子 - 检查是否为管理员
 */
export const useIsAdmin = (): boolean => {
  const { hasRole } = useAuth();
  return hasRole('admin');
};

/**
 * useIsManager 勾子 - 检查是否为经理
 */
export const useIsManager = (): boolean => {
  const { hasRole } = useAuth();
  return hasRole(['admin', 'manager', 'sales_lead']);
};
