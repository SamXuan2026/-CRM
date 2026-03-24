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

const DEMO_ACCOUNTS = [
  {
    label: '管理员',
    username: 'admin',
    password: 'admin123',
    description: '可查看全部模块和完整报表数据',
    colorScheme: 'blue',
    accent: '全局视角',
  },
  {
    label: '销售',
    username: 'sales_wang',
    password: 'demo123',
    description: '适合演示客户、商机和订单跟进',
    colorScheme: 'blue',
    accent: '推荐体验',
  },
  {
    label: '销售二组',
    username: 'sales_zhou',
    password: 'demo123',
    description: '可切换查看另一条销售线索路径',
    colorScheme: 'cyan',
    accent: '数据隔离',
  },
  {
    label: '营销',
    username: 'marketing_chen',
    password: 'demo123',
    description: '适合演示活动、线索和总览报表',
    colorScheme: 'green',
    accent: '活动视角',
  },
];

const getDefaultRouteForRole = (role?: string) => {
  switch (role) {
    case 'admin':
    case 'manager':
      return '/dashboard';
    case 'sales':
      return '/customers';
    case 'marketing':
      return '/marketing';
    case 'customer_service':
      return '/customers';
    default:
      return '/settings';
  }
};

const PANEL_DESKTOP_HEIGHT = '640px';

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
          direction={{ base: 'column', lg: 'row' }}
          align="stretch"
          justify="center"
          gap={{ base: 8, lg: 8 }}
        >
          <Box flex="0 0 520px" maxW="100%">
            <Box
              bg="rgba(255,255,255,0.94)"
              p={{ base: 6, lg: 8 }}
              rounded="3xl"
              boxShadow="0 18px 55px rgba(18, 61, 117, 0.12)"
              as="form"
              onSubmit={handleSubmit}
              border="1px solid rgba(255,255,255,0.45)"
              h={{ base: 'auto', lg: PANEL_DESKTOP_HEIGHT }}
              display="flex"
              flexDirection="column"
            >
              <Box mb={5} textAlign={{ base: 'center', lg: 'left' }}>
                <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="gray.500">
                  Workspace
                </Text>
                <Heading as="h1" size="lg" mt={2} mb={2} color="brand.700">
                  蓝鲸CRM
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  集中管理客户数据，优化销售流程
                </Text>
                <Text color="gray.500" fontSize="xs" mt={2}>
                  首次体验建议直接使用右侧演示账号，无需手动记忆用户名和密码
                </Text>
              </Box>

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
              直接登录管理员演示账号
            </Button>

            {/* 分割线 */}
            <Divider my={5} />

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
                p={3.5}
                rounded="2xl"
                border="1px"
                borderColor="orange.100"
                mt="auto"
              >
                <Text fontSize="sm" fontWeight="bold" color="orange.800" mb={1.5}>
                  登录提示
                </Text>
                <VStack spacing={1} align="start" fontSize="xs" color="orange.900">
                  <Text>如果浏览器自动填充了旧密码，请先清空后再点“一键登录”或“填入账号”。</Text>
                  <Text>销售账号推荐使用 `sales_wang / demo123` 或 `sales_zhou / demo123`。</Text>
                  <Text>营销演示账号为 `marketing_chen / demo123`，管理员账号为 `admin / admin123`。</Text>
                </VStack>
              </Box>
            </Box>
          </Box>

          <Box flex="0 0 520px" maxW="100%">
            <Box
              bg="rgba(255,255,255,0.94)"
              border="1px solid rgba(255,255,255,0.45)"
              borderRadius="32px"
              p={{ base: 6, lg: 8 }}
              boxShadow="0 18px 55px rgba(64, 38, 17, 0.12)"
              h={{ base: 'auto', lg: PANEL_DESKTOP_HEIGHT }}
              display="flex"
              flexDirection="column"
            >
              <HStack justify="space-between" align="start" mb={5}>
                <Box>
                  <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="gray.500">
                    Demo Access
                  </Text>
                  <Heading size="lg" mt={2} color="gray.800">
                    演示账号快捷入口
                  </Heading>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    用更统一的栅格节奏，直接切换不同角色视角。
                  </Text>
                </Box>
              </HStack>

              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }}
                gap={3}
                flex="1"
                alignContent="stretch"
              >
                {DEMO_ACCOUNTS.map((account) => (
                  <GridItem
                    key={account.username}
                  >
                    <Box
                    bg="rgba(248, 244, 238, 0.92)"
                    border="1px solid rgba(226, 213, 193, 0.75)"
                    borderRadius="22px"
                    px={3.5}
                    py={3}
                    position="relative"
                    overflow="hidden"
                    h="100%"
                    minH={{ base: 'auto', md: '198px' }}
                  >
                    <Box
                      position="absolute"
                      insetX={0}
                      top={0}
                      height="4px"
                      bg={`${account.colorScheme}.400`}
                      opacity={0.9}
                    />
                    <VStack align="stretch" spacing={1.5} h="100%">
                      <Box flex="1">
                        <HStack justify="space-between" align="center" spacing={2} mb={1}>
                          <HStack spacing={2}>
                            <Text fontWeight="700" color="gray.800" fontSize="sm">
                              {account.label}
                            </Text>
                            <Badge colorScheme={account.colorScheme} borderRadius="full" px={2.5}>
                              {account.accent}
                            </Badge>
                          </HStack>
                          <Badge variant="subtle" colorScheme={account.colorScheme} fontSize="10px" px={2}>
                            DEMO
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="gray.600" lineHeight="1.5" noOfLines={2}>
                          {account.description}
                        </Text>
                        <VStack align="stretch" spacing={0.5} mt={2}>
                          <Text fontSize="xs" color="gray.700" lineHeight="1.45">
                            <Text as="span" fontWeight="700">账号</Text>
                            {' · '}
                            {account.username}
                          </Text>
                          <Text fontSize="xs" color="gray.700" lineHeight="1.45">
                            <Text as="span" fontWeight="700">密码</Text>
                            {' · '}
                            {account.password}
                          </Text>
                        </VStack>
                      </Box>
                      <HStack pt={1.5} spacing={2} mt="auto">
                        <Button
                          size="sm"
                          variant="outline"
                          flex="1"
                          onClick={() => fillDemoAccount(account.username, account.password)}
                          isDisabled={isLoading}
                        >
                          填入账号
                        </Button>
                        <Button
                          size="sm"
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
