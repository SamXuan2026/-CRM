import { useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Spinner,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiActivity, FiDollarSign, FiTarget, FiUsers } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';

import { reportsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface DashboardData {
  metrics: {
    total_customers: number;
    total_leads: number;
    total_opportunities: number;
    total_orders: number;
    total_interactions: number;
    total_revenue: number;
    pipeline_value: number;
  };
  recent_activity: {
    recent_customers: number;
    recent_leads: number;
    recent_opportunities: number;
    recent_orders: number;
    recent_interactions: number;
  };
  distributions: {
    customer_status: Record<string, number>;
    lead_status: Record<string, number>;
  };
}

const emptyDashboardData: DashboardData = {
  metrics: {
    total_customers: 0,
    total_leads: 0,
    total_opportunities: 0,
    total_orders: 0,
    total_interactions: 0,
    total_revenue: 0,
    pipeline_value: 0,
  },
  recent_activity: {
    recent_customers: 0,
    recent_leads: 0,
    recent_opportunities: 0,
    recent_orders: 0,
    recent_interactions: 0,
  },
  distributions: {
    customer_status: {},
    lead_status: {},
  },
};

const normalizeDashboardData = (data: Partial<DashboardData> | null | undefined): DashboardData => ({
  metrics: {
    ...emptyDashboardData.metrics,
    ...(data?.metrics || {}),
  },
  recent_activity: {
    ...emptyDashboardData.recent_activity,
    ...(data?.recent_activity || {}),
  },
  distributions: {
    customer_status: data?.distributions?.customer_status || {},
    lead_status: data?.distributions?.lead_status || {},
  },
});

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const canViewReports = hasPermission('reports:read');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!canViewReports) {
        setDashboardData(emptyDashboardData);
        setLoading(false);
        setErrorMessage('');
        return;
      }

      try {
        setErrorMessage('');
        const data = await reportsApi.getDashboardMetrics();
        setDashboardData(normalizeDashboardData(data));
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setDashboardData(emptyDashboardData);
        setErrorMessage(error.message || '仪表盘数据暂时无法加载');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [canViewReports]);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner />
      </Box>
    );
  }

  const resolvedData = dashboardData || emptyDashboardData;

  const stats = [
    {
      label: '客户总数',
      value: resolvedData.metrics.total_customers,
      help: `近 30 天新增 ${resolvedData.recent_activity.recent_customers}`,
      icon: FiUsers,
      color: 'blue.500',
    },
    {
      label: '销售机会',
      value: resolvedData.metrics.total_opportunities,
      help: `近 30 天新增 ${resolvedData.recent_activity.recent_opportunities}`,
      icon: FiTarget,
      color: 'orange.500',
    },
    {
      label: '已交付收入',
      value: `$${resolvedData.metrics.total_revenue.toLocaleString()}`,
      help: `管道金额 $${resolvedData.metrics.pipeline_value.toLocaleString()}`,
      icon: FiDollarSign,
      color: 'green.500',
    },
    {
      label: '客户互动',
      value: resolvedData.metrics.total_interactions,
      help: `近 30 天新增 ${resolvedData.recent_activity.recent_interactions}`,
      icon: FiActivity,
      color: 'purple.500',
    },
  ];

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box>
        <Heading size="lg">八戒CRM 仪表盘</Heading>
        <Text color="gray.600" mt={2}>
          汇总客户、销售、营销与活动数据，帮助本地团队快速掌握业务状态。
        </Text>
      </Box>

      {!canViewReports && (
        <Alert status="info" borderRadius="2xl" bg="white">
          <AlertIcon />
          <Box>
            <AlertTitle>当前角色暂未开通报表权限</AlertTitle>
            <AlertDescription>
              {user?.role || '当前账户'} 仍可继续使用客户管理、销售或营销模块，仪表盘会在获得 `reports:read` 权限后自动展示统计数据。
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {canViewReports && errorMessage && (
        <Alert status="warning" borderRadius="2xl" bg="white">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>仪表盘加载失败</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Box>
        </Alert>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody>
              <HStack justify="space-between" align="start">
                <Stat>
                  <StatLabel>{stat.label}</StatLabel>
                  <StatNumber>{stat.value}</StatNumber>
                  <StatHelpText>{stat.help}</StatHelpText>
                </Stat>
                <Icon as={stat.icon} boxSize={6} color={stat.color} />
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader>
            <Heading size="md">客户状态分布</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(resolvedData.distributions.customer_status).length === 0 ? (
              <Text color="gray.500">暂无客户状态数据</Text>
            ) : (
              <VStack align="stretch" spacing={3}>
                {Object.entries(resolvedData.distributions.customer_status).map(([status, count]) => (
                  <HStack key={status} justify="space-between">
                    <Text textTransform="capitalize">{status.replace('_', ' ')}</Text>
                    <Text fontWeight="bold">{count}</Text>
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">线索状态分布</Heading>
          </CardHeader>
          <CardBody>
            {Object.keys(resolvedData.distributions.lead_status).length === 0 ? (
              <Text color="gray.500">暂无线索状态数据</Text>
            ) : (
              <VStack align="stretch" spacing={3}>
                {Object.entries(resolvedData.distributions.lead_status).map(([status, count]) => (
                  <HStack key={status} justify="space-between">
                    <Text textTransform="capitalize">{status.replace('_', ' ')}</Text>
                    <Text fontWeight="bold">{count}</Text>
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>

      {!canViewReports && (
        <HStack spacing={3}>
          <Button as={RouterLink} to="/customers" colorScheme="orange">
            去客户管理
          </Button>
          <Button as={RouterLink} to="/sales" variant="outline">
            去销售管理
          </Button>
        </HStack>
      )}
    </VStack>
  );
};

export default Dashboard;
