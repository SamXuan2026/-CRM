import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Spinner, VStack, Text } from '@chakra-ui/react';
import { authApi } from '../services/api';
import { User, AuthContextType } from './AuthContext';
import { getDefaultRouteForRole } from '../config/navigation';

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

export const AuthContext = createContext<AuthContextType>({
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

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider 组件 - 提供全局认证管理
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * 加载登录状态 - 组件挂载时执行
   */
  useEffect(() => {
    loadAuthState();
  }, []);

  /**
   * 从本地存储加载认证状态
   */
  const loadAuthState = useCallback(async () => {
    try {
      const savedAccessToken = localStorage.getItem('access_token');
      const savedRefreshToken = localStorage.getItem('refresh_token');
      const savedUser = localStorage.getItem('user');

      if (savedAccessToken && savedUser) {
        setAccessToken(savedAccessToken);
        setRefreshToken(savedRefreshToken);
        setUser(JSON.parse(savedUser));

        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch (validationError) {
          console.error('Stored auth state is invalid:', validationError);
          clearAuthState();
        }
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 清除认证状态
   */
  const clearAuthState = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }, []);

  /**
   * 保存认证状态到本地存储
   */
  const saveAuthState = useCallback(
    (user: User, accessToken: string, refreshToken: string) => {
      setUser(user);
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    },
    []
  );

  /**
   * 用户登录
   */
  const login = useCallback(
    async (username: string, password: string) => {
      try {
        setIsLoading(true);
        const result = await authApi.login({ username, password });
        
        saveAuthState(
          result.user,
          result.access_token,
          result.refresh_token
        );
        
        navigate(getDefaultRouteForRole(result.user?.role));
      } catch (error: any) {
        console.error('Login failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, saveAuthState]
  );

  /**
   * 用户注册
   */
  const register = useCallback(
    async (data: any) => {
      try {
        setIsLoading(true);
        await authApi.register(data);
        // 注册后自动登录
        await login(data.username, data.password);
      } catch (error: any) {
        console.error('Registration failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [login]
  );

  /**
   * 用户登出
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
      clearAuthState();
      navigate('/login');
    } catch (error: any) {
      console.error('Logout failed:', error);
      // 即使API调用失败，也要清除本地状态
      clearAuthState();
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState, navigate]);

  /**
   * 刷新访问令牌
   */
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const result = await authApi.refreshToken(refreshToken);
      setAccessToken(result.access_token);
      localStorage.setItem('access_token', result.access_token);
      return result.access_token;
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      clearAuthState();
      throw error;
    }
  }, [refreshToken, clearAuthState]);

  /**
   * 检查权限
   */
  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  }, [user]);

  /**
   * 检查角色
   */
  const hasRole = useCallback((roles: string | string[]) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  }, [user]);

  /**
   * 检查任何一个权限
   */
  const hasAnyPermission = useCallback((...permissions: string[]) => {
    if (!user) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.some((perm) => userPermissions.includes(perm));
  }, [user]);

  const isAuthenticated = !!user && !!accessToken;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    accessToken,
    refreshToken,
    login,
    register,
    logout,
    refreshAccessToken,
    hasPermission,
    hasRole,
    hasAnyPermission,
  };

  // 初始化时显示加载界面
  if (isLoading) {
    return (
      <Box width="100%" height="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.600">加载中...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
