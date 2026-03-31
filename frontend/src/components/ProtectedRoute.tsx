import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@chakra-ui/react';
import { AuthContext } from '../contexts/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
}

/**
 * ProtectedRoute 组件 - 路由守卫
 * 检查用户是否已认证，以及是否有所需权限
 */
export const ProtectedRoute = ({
  children,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) => {
  const auth = useContext(AuthContext);

  // 加载中
  if (auth.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress isIndeterminate color="blue.300" />
      </Box>
    );
  }

  // 未认证，跳转到登录
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 检查所需角色
  if (requiredRole && !auth.hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 检查所需权限
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];
    
    const hasAllPermissions = permissions.every((perm) =>
      auth.hasPermission(perm)
    );

    if (!hasAllPermissions) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
