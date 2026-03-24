import { useContext, useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Container,
  Heading,
  Text,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { AuthContext } from '../contexts/AuthProvider';

/**
 * Login 页面
 */
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useContext(AuthContext);
  const toast = useToast();

  // 重定向已登录用户
  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * 处理登录表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 清除之前的错误
    setError('');
    
    // 验证输入
    if (!username.trim()) {
      setError('请输入用户名或邮箱');
      return;
    }
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    try {
      setIsLoading(true);
      await auth.login(username, password);
      
      toast({
        title: '登录成功',
        description: '欢迎回来！',
        status: 'success',
        duration: 2,
        isClosable: true,
      });
      
    } catch (error: any) {
      const errorMessage = error.message || '登录失败，请检查用户名和密码';
      setError(errorMessage);
      
      toast({
        title: '登录失败',
        description: errorMessage,
        status: 'error',
        duration: 3,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理演示账户快速登录
   */
  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // 演示账户：admin / admin123
      await auth.login('admin', 'admin123');
      
      toast({
        title: '演示登录成功',
        status: 'success',
        duration: 2,
        isClosable: true,
      });
    } catch (error: any) {
      setError('演示账户不可用，请使用实际账户登录');
      toast({
        title: '演示登录失败',
        description: '请使用有效的用户名和密码',
        status: 'error',
        duration: 3,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      bgGradient="linear(to-br, #f8f1e4, #eadcc7, #d8c1a1)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={12}
      px={4}
    >
      <Container maxW="sm">
        <VStack spacing={8} align="stretch">
          {/* 头部 */}
          <Box textAlign="center">
            <Heading as="h1" size="2xl" mb={2} color="brand.700">
              八戒CRM
            </Heading>
            <Text color="gray.600" fontSize="md">
              集中管理客户数据，优化销售流程
            </Text>
          </Box>

          {/* 登录表单 */}
          <Box
            bg="rgba(255,255,255,0.92)"
            p={8}
            rounded="3xl"
            boxShadow="0 18px 55px rgba(64, 38, 17, 0.12)"
            as="form"
            onSubmit={handleSubmit}
            border="1px solid rgba(255,255,255,0.45)"
          >
            {/* 错误提示 */}
            {error && (
              <Alert status="error" rounded="md" mb={6}>
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* 用户名/邮箱输入 */}
            <FormControl mb={4} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                用户名或邮箱
              </FormLabel>
              <Input
                type="text"
                placeholder="请输入用户名或邮箱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                size="lg"
                isDisabled={isLoading}
                border="2px"
                borderColor="gray.200"
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 1px blue.500',
                }}
              />
            </FormControl>

            {/* 密码输入 */}
            <FormControl mb={6} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                密码
              </FormLabel>
              <InputGroup size="lg">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isDisabled={isLoading}
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px blue.500',
                  }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label="切换密码显示"
                    icon={showPassword ? <FiEyeOff /> : <FiEye />}
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    isDisabled={isLoading}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {/* 登录按钮 */}
            <Button
              type="submit"
              width="100%"
              size="lg"
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="登录中..."
              mb={3}
            >
              登录
            </Button>

            {/* 演示登录按钮 */}
            <Button
              width="100%"
              size="lg"
              variant="outline"
              colorScheme="purple"
              onClick={handleDemoLogin}
              isLoading={isLoading}
              loadingText="加载演示账户..."
            >
              演示登录 (Admin)
            </Button>

            {/* 分割线 */}
            <Box my={4} textAlign="center" color="gray.400" fontSize="sm">
              或
            </Box>

            {/* 注册链接 */}
            <Text textAlign="center" color="gray.600" fontSize="sm">
              还没有账户？{' '}
              <RouterLink to="/register">
                <Text as="span" color="blue.600" fontWeight="bold" cursor="pointer">
                  立即注册
                </Text>
              </RouterLink>
            </Text>
          </Box>

          {/* 演示账户信息 */}
          <Box
            bg="blue.50"
            p={4}
            rounded="md"
            border="1px"
            borderColor="blue.200"
          >
            <Text fontSize="sm" fontWeight="bold" color="blue.800" mb={2}>
              📝 演示账户
            </Text>
            <VStack spacing={1} align="start" fontSize="xs" color="blue.700">
              <Text>
                <strong>Admin:</strong> admin / admin123
              </Text>
              <Text>
                <strong>Sales:</strong> sales_user / password123
              </Text>
              <Text>
                <strong>Manager:</strong> manager_user / password123
              </Text>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default Login;
