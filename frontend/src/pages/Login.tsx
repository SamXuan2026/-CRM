import { useContext, useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Flex,
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
  Badge,
  Divider,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { AuthContext } from '../contexts/AuthProvider';
import { DEMO_ACCOUNTS, getDefaultRouteForRole } from '../config/navigation';

const PANEL_DESKTOP_HEIGHT = '580px';

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
    return <Navigate to={getDefaultRouteForRole(auth.user?.role)} replace />;
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

  const fillDemoAccount = (usernameValue: string, passwordValue: string) => {
    setUsername(usernameValue);
    setPassword(passwordValue);
    setError('');
    setShowPassword(false);
  };

  const handleQuickLogin = async (usernameValue: string, passwordValue: string) => {
    try {
      setIsLoading(true);
      setError('');
      setUsername(usernameValue);
      setPassword(passwordValue);
      await auth.login(usernameValue, passwordValue);

      toast({
        title: '演示登录成功',
        description: `已进入 ${usernameValue} 账户`,
        status: 'success',
        duration: 2,
        isClosable: true,
      });
    } catch (error: any) {
      const errorMessage = error.message || '演示账号登录失败';
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

  return (
    <Box
      minHeight="100vh"
      bgGradient="linear(to-br, #f4f9ff, #dcebff, #bedcff)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={12}
      px={4}
    >
      <Container maxW="container.xl">
        <Flex
          direction={{ base: 'column', xl: 'row' }}
          align="stretch"
          justify="center"
          gap={{ base: 8, lg: 8 }}
        >
          <Box flex={{ base: '1', xl: '0 0 480px' }} maxW={{ base: '100%', xl: '480px' }}>
            <Box
              bg="rgba(255,255,255,0.94)"
              p={{ base: 6, lg: 7 }}
              rounded="3xl"
              boxShadow="0 18px 55px rgba(18, 61, 117, 0.12)"
              as="form"
              onSubmit={handleSubmit}
              border="1px solid rgba(255,255,255,0.45)"
              minH={{ base: 'auto', xl: PANEL_DESKTOP_HEIGHT }}
              display="flex"
              flexDirection="column"
            >
              <Box mb={4} textAlign={{ base: 'center', lg: 'left' }}>
                <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="gray.500">
                  Workspace
                </Text>
                <Heading as="h1" size="lg" mt={2} mb={2} color="brand.700">
                  蓝鲸CRM
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  集中管理客户数据，优化销售流程
                </Text>
                <Text color="gray.500" fontSize="xs" mt={1.5}>
                  首次体验建议直接使用右侧演示账号，无需手动记忆用户名和密码
                </Text>
              </Box>

            {/* 错误提示 */}
            {error && (
              <Alert status="error" rounded="md" mb={4}>
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* 用户名/邮箱输入 */}
            <FormControl mb={3.5} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                用户名或邮箱
              </FormLabel>
              <Input
                type="text"
                placeholder="请输入用户名或邮箱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                size="md"
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
            <FormControl mb={4} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                密码
              </FormLabel>
              <InputGroup size="md">
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
              size="md"
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="登录中..."
              mb={2.5}
            >
              登录
            </Button>

            {/* 演示登录按钮 */}
            <Button
              width="100%"
              size="md"
              variant="outline"
              colorScheme="purple"
              onClick={handleDemoLogin}
              isLoading={isLoading}
              loadingText="加载演示账户..."
            >
              直接登录管理员演示账号
            </Button>

            {/* 分割线 */}
            <Divider my={4} />

            {/* 注册链接 */}
            <Text textAlign="center" color="gray.600" fontSize="sm">
              还没有账户？{' '}
              <RouterLink to="/register">
                <Text as="span" color="blue.600" fontWeight="bold" cursor="pointer">
                  立即注册
                </Text>
              </RouterLink>
            </Text>

              {/* 演示账户信息 */}
              <Box
                bg="whiteAlpha.800"
                p={2.5}
                rounded="2xl"
                border="1px"
                borderColor="orange.100"
                mt="auto"
              >
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm" fontWeight="bold" color="orange.800">
                    登录提示
                  </Text>
                  <Badge colorScheme="orange" variant="subtle" borderRadius="full" px={2}>
                    Demo
                  </Badge>
                </HStack>
                <VStack spacing={0.5} align="start" fontSize="11px" color="orange.900">
                  <Text>推荐优先使用右侧“一键登录”，避免浏览器旧密码干扰。</Text>
                  <Text>组长可用 `lead_liu / demo123`，销售可用 `sales_wang / demo123` 或 `sales_qian / demo123`。</Text>
                  <Text>营销 `marketing_chen / demo123`，管理员 `admin / admin123`。</Text>
                </VStack>
              </Box>
            </Box>
          </Box>

          <Box flex={{ base: '1', xl: '0 0 580px' }} maxW={{ base: '100%', xl: '580px' }}>
            <Box
              bg="rgba(255,255,255,0.94)"
              border="1px solid rgba(255,255,255,0.45)"
              borderRadius="32px"
              p={{ base: 6, lg: 7 }}
              boxShadow="0 18px 55px rgba(64, 38, 17, 0.12)"
              minH={{ base: 'auto', xl: PANEL_DESKTOP_HEIGHT }}
              display="flex"
              flexDirection="column"
            >
              <HStack justify="space-between" align="start" mb={4}>
                <Box>
                  <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="gray.500">
                    Demo Access
                  </Text>
                  <Heading size="lg" mt={2} color="gray.800">
                    演示账号快捷入口
                  </Heading>
                  <Text mt={1.5} fontSize="sm" color="gray.600">
                    按不同体验场景快速进入系统，不必手动输入账号密码。
                  </Text>
                </Box>
              </HStack>

              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }}
                gap={2}
                alignContent="start"
                autoRows="auto"
              >
                {DEMO_ACCOUNTS.map((account) => (
                  <GridItem
                    key={account.username}
                  >
                    <Box
                    bg="rgba(248, 244, 238, 0.92)"
                    border="1px solid rgba(226, 213, 193, 0.75)"
                    borderRadius="18px"
                    px={2.5}
                    py={1.75}
                    position="relative"
                    overflow="hidden"
                    minH={{ base: 'auto', md: '128px' }}
                  >
                    <Box
                      position="absolute"
                      insetX={0}
                      top={0}
                      height="4px"
                      bg={`${account.colorScheme}.400`}
                      opacity={0.9}
                    />
                    <VStack align="stretch" spacing={1}>
                      <Box>
                        <HStack justify="space-between" align="start" spacing={2} mb={0.25}>
                          <HStack spacing={2}>
                            <Text fontWeight="700" color="gray.800" fontSize="xs" noOfLines={1}>
                              {account.label}
                            </Text>
                            <Badge colorScheme={account.colorScheme} borderRadius="full" px={2} fontSize="10px">
                              {account.accent}
                            </Badge>
                          </HStack>
                        </HStack>
                        <Text fontSize="10px" color="gray.600" lineHeight="1.4" noOfLines={2}>
                          {account.description}
                        </Text>
                        <VStack align="stretch" spacing={0.25} mt={0.75}>
                          <Text fontSize="10px" color="gray.700" lineHeight="1.35">
                            <Text as="span" fontWeight="700">账号</Text>
                            {' · '}
                            {account.username}
                          </Text>
                          <Text fontSize="10px" color="gray.700" lineHeight="1.35">
                            <Text as="span" fontWeight="700">密码</Text>
                            {' · '}
                            {account.password}
                          </Text>
                        </VStack>
                      </Box>
                      <HStack pt={0.5} spacing={1.5}>
                        <Button
                          size="xs"
                          variant="outline"
                          flex="1"
                          onClick={() => fillDemoAccount(account.username, account.password)}
                          isDisabled={isLoading}
                        >
                          填入账号
                        </Button>
                        <Button
                          size="xs"
                          colorScheme={account.colorScheme}
                          flex="1"
                          onClick={() => handleQuickLogin(account.username, account.password)}
                          isLoading={isLoading}
                        >
                          一键登录
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                  </GridItem>
                ))}
              </Grid>
            </Box>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
};

export default Login;
