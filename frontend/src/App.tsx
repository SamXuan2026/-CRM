import { Suspense, lazy, useContext } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Container,
  Flex,
  Spacer,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  HStack,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure,
  Badge,
} from '@chakra-ui/react';
import {
  FiMenu,
  FiUser,
  FiLogOut,
  FiHome,
  FiUsers,
  FiBriefcase,
  FiMail,
  FiBarChart2,
  FiSettings,
  FiChevronDown,
  FiBookOpen,
} from 'react-icons/fi';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

import { AuthContext } from './contexts/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Sales = lazy(() => import('./pages/Sales'));
const Marketing = lazy(() => import('./pages/Marketing'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const OnlineDocs = lazy(() => import('./pages/OnlineDocs'));

const APP_VERSION = 'v1.2';

const getDefaultRouteForRole = (role?: string) => {
  switch (role) {
    case 'admin':
    case 'manager':
    case 'sales_lead':
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

const App = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const navItems = [
    { label: '仪表板', path: '/dashboard', icon: FiHome },
    { label: '客户管理', path: '/customers', icon: FiUsers, permission: 'customers:read' },
    { label: '销售管理', path: '/sales', icon: FiBriefcase, permission: 'sales:read' },
    { label: '营销管理', path: '/marketing', icon: FiMail, permission: 'marketing:read' },
    { label: '报表分析', path: '/reports', icon: FiBarChart2, permission: 'reports:read' },
    { label: '系统设置', path: '/settings', icon: FiSettings },
    { label: '在线文档', path: '/docs', icon: FiBookOpen },
  ].filter((item) => !item.permission || auth.hasPermission(item.permission));

  const defaultRoute = getDefaultRouteForRole(auth.user?.role);

  const routeFallback = (
    <Flex minH="240px" align="center" justify="center">
      <Text color="brand.700" fontWeight="600">
        页面加载中...
      </Text>
    </Flex>
  );

  /**
   * 处理用户登出
   */
  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * 导航菜单项组件
   */
  const NavItem = ({ icon: Icon, label, path }: any) => (
    <Link to={path} style={{ textDecoration: 'none' }}>
      <Button
        leftIcon={<Icon />}
        variant="ghost"
        justifyContent="flex-start"
        width="100%"
        borderRadius="2xl"
        py={6}
        _hover={{ bg: 'brand.50', transform: 'translateX(2px)' }}
        _active={{ bg: 'brand.100' }}
        onClick={onClose}
      >
        {label}
      </Button>
    </Link>
  );

  /**
   * 如果未认证，显示Login/Register页面
   */
  if (!auth.isAuthenticated) {
    return (
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Suspense>
    );
  }

  /**
   * 已认证用户的主应用界面
   */
  return (
    <Flex
      direction="column"
      minHeight="100vh"
      bg="linear-gradient(180deg, #f3f8ff 0%, #edf4ff 45%, #e3efff 100%)"
    >
        {/* Header */}
        <Box
          bg="linear-gradient(135deg, #0f3a69 0%, #1f66cf 52%, #59a8ff 100%)"
          px={4}
          py={3}
          boxShadow="0 18px 45px rgba(15, 58, 105, 0.24)"
        >
          <Flex alignItems="center">
            {/* Mobile Menu Button */}
            <IconButton
              icon={<FiMenu />}
              variant="ghost"
              aria-label="Menu"
              color="white"
              mr={4}
              display={{ base: 'flex', md: 'none' }}
              onClick={onOpen}
              _hover={{ bg: 'rgba(255,255,255,0.12)' }}
            />

            {/* Logo */}
            <Link to={defaultRoute}>
              <HStack spacing={3} cursor="pointer" _hover={{ opacity: 0.9 }}>
                <Box
                  w="42px"
                  h="42px"
                  borderRadius="2xl"
                  bg="rgba(255,255,255,0.12)"
                  border="1px solid rgba(255,255,255,0.16)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontWeight="900"
                  letterSpacing="0.08em"
                >
                  蓝鲸
                </Box>
                <Box>
                  <Heading as="h1" size="md" color="white" lineHeight="1.1">
                    蓝鲸CRM
                  </Heading>
                  <Text color="blue.100" fontSize="xs" display={{ base: 'none', md: 'block' }}>
                    客户经营工作台
                  </Text>
                </Box>
                <Badge colorScheme="blue" variant="solid">
                  {APP_VERSION}
                </Badge>
              </HStack>
            </Link>

            <Spacer />

            {/* User Menu */}
            {auth.user && (
              <Menu>
                <MenuButton
                  as={Button}
                  rounded="full"
                  variant="ghost"
                  cursor="pointer"
                  minW={0}
                  color="white"
                  rightIcon={<FiChevronDown />}
                  _hover={{ bg: 'rgba(255,255,255,0.2)' }}
                >
                  <HStack spacing={2}>
                    <Box
                      width="32px"
                      height="32px"
                      borderRadius="full"
                      bg="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="brand.600"
                      fontWeight="bold"
                    >
                      {auth.user.username.charAt(0).toUpperCase()}
                    </Box>
                    <Text display={{ base: 'none', md: 'block' }}>
                      {auth.user.username}
                    </Text>
                  </HStack>
                </MenuButton>
                <MenuList>
                  <MenuItem
                    icon={<FiUser />}
                    onClick={() => navigate('/settings')}
                  >
                    个人资料
                  </MenuItem>
                  <MenuItem
                    icon={<FiSettings />}
                    onClick={() => navigate('/settings')}
                  >
                    设置
                  </MenuItem>
                  <MenuItem
                    icon={<FiLogOut />}
                    onClick={handleLogout}
                    color="red.500"
                  >
                    登出
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </Flex>
        </Box>

        {/* Main Content */}
        <Flex flex="1" overflow="hidden">
          {/* Desktop Sidebar */}
          <Box
            width="250px"
            bg="rgba(255,255,255,0.7)"
            borderRight="1px"
            borderColor="whiteAlpha.700"
            p={4}
            overflowY="auto"
            display={{ base: 'none', md: 'block' }}
            boxShadow="inset -1px 0 0 rgba(255,255,255,0.35)"
            backdropFilter="blur(12px)"
          >
            <Box
              mb={4}
              p={4}
              borderRadius="3xl"
              bg="linear-gradient(180deg, rgba(47,128,237,0.1), rgba(47,128,237,0.18))"
            >
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
                Workspace
              </Text>
              <Heading size="sm" mt={2} color="brand.700">
                蓝鲸CRM {APP_VERSION}
              </Heading>
              <Text mt={2} fontSize="sm" color="gray.600">
                把客户、商机、营销和报表放在同一个节奏里。
              </Text>
            </Box>
            <VStack align="stretch" spacing={2}>
              {navItems.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                />
              ))}
            </VStack>
          </Box>

          {/* Mobile Drawer */}
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent>
              <DrawerCloseButton />
              <DrawerHeader>蓝鲸CRM</DrawerHeader>
              <DrawerBody>
                <VStack align="stretch" spacing={2}>
                  {navItems.map((item) => (
                    <NavItem
                      key={item.path}
                      icon={item.icon}
                      label={item.label}
                      path={item.path}
                    />
                  ))}
                </VStack>
              </DrawerBody>
            </DrawerContent>
          </Drawer>

          {/* Page Content */}
          <Box flex="1" overflowY="auto" p={{ base: 4, md: 6 }}>
            <Suspense fallback={routeFallback}>
              <Routes>
                <Route path="/" element={<Navigate to={defaultRoute} replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute requiredPermission="customers:read">
                      <Customers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute requiredPermission="sales:read">
                      <Sales />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/marketing"
                  element={
                    <ProtectedRoute requiredPermission="marketing:read">
                      <Marketing />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute requiredPermission="reports:read">
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/docs"
                  element={
                    <ProtectedRoute>
                      <OnlineDocs />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to={defaultRoute} replace />} />
              </Routes>
            </Suspense>
          </Box>
        </Flex>

        {/* Footer */}
        <Box bg="rgba(255,255,255,0.75)" borderTop="1px" borderColor="whiteAlpha.700" py={4} px={6}>
          <Container maxW="container.xl">
            <Flex justify="space-between" align="center" fontSize="sm" color="gray.600">
              <Text>
                &copy; {new Date().getFullYear()} 蓝鲸CRM {APP_VERSION}。保留所有权利。
              </Text>
              <Text>当前用户: {auth.user?.username} ({auth.user?.role})</Text>
            </Flex>
          </Container>
        </Box>
      </Flex>
    );
};

export default App;
