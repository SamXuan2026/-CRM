import { useContext } from 'react';
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
} from 'react-icons/fi';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

import { AuthContext } from './contexts/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Marketing from './pages/Marketing';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const APP_VERSION = 'v1.1';

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
  ].filter((item) => !item.permission || auth.hasPermission(item.permission));

  const defaultRoute = auth.hasPermission('reports:read')
    ? '/dashboard'
    : auth.hasPermission('customers:read')
      ? '/customers'
      : auth.hasPermission('sales:read')
        ? '/sales'
        : auth.hasPermission('marketing:read')
          ? '/marketing'
          : '/settings';

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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  /**
   * 已认证用户的主应用界面
   */
  return (
    <Flex
      direction="column"
      minHeight="100vh"
      bg="linear-gradient(180deg, #f7f1e7 0%, #f3eee6 45%, #efe7db 100%)"
    >
        {/* Header */}
        <Box
          bg="linear-gradient(135deg, #2d1f12 0%, #6f4b2a 52%, #b57c3d 100%)"
          px={4}
          py={3}
          boxShadow="0 18px 45px rgba(36, 19, 7, 0.18)"
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
            <Link to="/dashboard">
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
                  八戒
                </Box>
                <Box>
                  <Heading as="h1" size="md" color="white" lineHeight="1.1">
                    八戒CRM
                  </Heading>
                  <Text color="orange.100" fontSize="xs" display={{ base: 'none', md: 'block' }}>
                    客户经营工作台
                  </Text>
                </Box>
                <Badge colorScheme="orange" variant="solid">
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
              bg="linear-gradient(180deg, rgba(111,75,42,0.1), rgba(159,103,48,0.18))"
            >
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
                Workspace
              </Text>
              <Heading size="sm" mt={2} color="brand.700">
                八戒CRM {APP_VERSION}
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
              <DrawerHeader>八戒CRM</DrawerHeader>
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
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </Routes>
          </Box>
        </Flex>

        {/* Footer */}
        <Box bg="rgba(255,255,255,0.75)" borderTop="1px" borderColor="whiteAlpha.700" py={4} px={6}>
          <Container maxW="container.xl">
            <Flex justify="space-between" align="center" fontSize="sm" color="gray.600">
              <Text>
                &copy; {new Date().getFullYear()} 八戒CRM {APP_VERSION}。保留所有权利。
              </Text>
              <Text>当前用户: {auth.user?.username} ({auth.user?.role})</Text>
            </Flex>
          </Container>
        </Box>
      </Flex>
    );
};

export default App;
