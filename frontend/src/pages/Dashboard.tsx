import { useEffect, useMemo, useState } from 'react';
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
import { FiActivity, FiDollarSign, FiTarget, FiTrendingUp, FiUsers } from 'react-icons/fi';
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

interface SalesReport {
  revenue_metrics: {
    total_revenue: number;
    monthly_revenue: Record<string, number>;
  };
  order_metrics: {
    total_orders: number;
    delivered_orders: number;
    pending_orders: number;
  };
  opportunity_metrics: {
    total_pipeline_value: number;
    closed_won_value: number;
    closed_lost_value: number;
    win_rate: number;
  };
}

interface ActivityReport {
  activity_counts: {
    interactions: number;
    new_leads: number;
    new_customers: number;
  };
  interaction_breakdown: Record<string, number>;
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value || 0);

const labelMap: Record<string, string> = {
  lead: '线索',
  prospect: '潜在客户',
  customer: '已成交客户',
  active: '活跃',
  inactive: '沉默客户',
  new: '新线索',
  contacted: '已接触',
  qualified: '已确认',
  proposal: '方案中',
  converted: '已转化',
  lost: '已流失',
  email: '邮件',
  call: '电话',
  meeting: '会议',
  note: '备注',
};

const colors = ['#2F80ED', '#56CCF2', '#1D4ED8', '#38BDF8', '#2563EB', '#0F766E'];

const getLabel = (value: string) => labelMap[value] || value.replace(/_/g, ' ');

const DistributionBars = ({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 18px 45px rgba(20, 62, 120, 0.08)">
      <CardHeader pb={0}>
        <Heading size="md">{title}</Heading>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <Text color="gray.500">暂无分布数据</Text>
        ) : (
          <VStack align="stretch" spacing={4}>
            {items.map((item, index) => (
              <Box key={item.label}>
                <HStack justify="space-between" mb={1.5}>
                  <Text fontSize="sm" color="gray.700">
                    {item.label}
                  </Text>
                  <Text fontSize="sm" fontWeight="700" color="gray.800">
                    {item.value}
                  </Text>
                </HStack>
                <Box h="10px" bg="blue.50" borderRadius="full" overflow="hidden">
                  <Box
                    h="full"
                    borderRadius="full"
                    width={`${(item.value / maxValue) * 100}%`}
                    bg={colors[index % colors.length]}
                  />
                </Box>
              </Box>
            ))}
          </VStack>
        )}
      </CardBody>
    </Card>
  );
};

const BarChartCard = ({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
}) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 18px 45px rgba(70, 41, 15, 0.08)">
      <CardHeader>
        <Heading size="md">{title}</Heading>
        <Text mt={1} fontSize="sm" color="gray.500">
          {subtitle}
        </Text>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <Text color="gray.500">暂无趋势数据</Text>
        ) : (
          <HStack align="end" spacing={4} minH="240px">
            {items.map((item, index) => (
              <VStack key={item.label} flex="1" justify="end" spacing={3}>
                <Text fontSize="xs" fontWeight="700" color="gray.700">
                  {item.value.toLocaleString()}
                </Text>
                <Box
                  width="100%"
                  minH="12px"
                  height={`${Math.max((item.value / maxValue) * 180, 12)}px`}
                  borderRadius="20px 20px 8px 8px"
                  bg={`linear-gradient(180deg, ${colors[index % colors.length]} 0%, rgba(183,106,43,0.22) 100%)`}
                  boxShadow="inset 0 -10px 24px rgba(255,255,255,0.2)"
                />
                <Text fontSize="xs" color="gray.500">
                  {item.label}
                </Text>
              </VStack>
            ))}
          </HStack>
        )}
      </CardBody>
    </Card>
  );
};

const DoughnutCard = ({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
}) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let current = 0;
  const gradient = items.length
    ? `conic-gradient(${items
        .map((item, index) => {
          const start = current;
          current += total ? (item.value / total) * 360 : 0;
          return `${colors[index % colors.length]} ${start}deg ${current}deg`;
        })
        .join(', ')})`
    : 'conic-gradient(#E2E8F0 0deg 360deg)';

  return (
    <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 18px 45px rgba(70, 41, 15, 0.08)">
      <CardHeader>
        <Heading size="md">{title}</Heading>
        <Text mt={1} fontSize="sm" color="gray.500">
          {subtitle}
        </Text>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <Text color="gray.500">暂无结构数据</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} alignItems="center">
            <Box display="flex" justifyContent="center">
              <Box
                w="190px"
                h="190px"
                borderRadius="full"
                bg={gradient}
                position="relative"
                boxShadow="inset 0 0 30px rgba(255,255,255,0.18)"
              >
                <Box
                  position="absolute"
                  inset="28px"
                  borderRadius="full"
                  bg="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="column"
                >
                  <Text fontSize="xs" color="gray.500">
                    总量
                  </Text>
                  <Text fontSize="2xl" fontWeight="800" color="gray.800">
                    {total}
                  </Text>
                </Box>
              </Box>
            </Box>
            <VStack align="stretch" spacing={3}>
              {items.map((item, index) => (
                <HStack key={item.label} justify="space-between">
                  <HStack spacing={3}>
                    <Box w="10px" h="10px" borderRadius="full" bg={colors[index % colors.length]} />
                    <Text fontSize="sm" color="gray.700">
                      {item.label}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="700" color="gray.800">
                    {item.value}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </SimpleGrid>
        )}
      </CardBody>
    </Card>
  );
};

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [activityReport, setActivityReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const canViewReports = hasPermission('reports:read');

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!canViewReports) {
        setDashboardData(emptyDashboardData);
        setSalesReport(null);
        setActivityReport(null);
        setLoading(false);
        setErrorMessage('');
        return;
      }

      try {
        setErrorMessage('');
        const [dashboard, sales, activity] = await Promise.all([
          reportsApi.getDashboardMetrics(),
          reportsApi.getSalesReport(),
          reportsApi.getActivityReport(),
        ]);
        setDashboardData(normalizeDashboardData(dashboard));
        setSalesReport(sales);
        setActivityReport(activity);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setDashboardData(emptyDashboardData);
        setSalesReport(null);
        setActivityReport(null);
        setErrorMessage(error.message || '仪表盘数据暂时无法加载');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [canViewReports]);

  const resolvedData = dashboardData || emptyDashboardData;

  const revenueTrendItems = useMemo(() => {
    const entries = Object.entries(salesReport?.revenue_metrics?.monthly_revenue || {});
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6)
      .map(([month, value]) => ({
        label: month.replace('2026-', '').replace('2025-', ''),
        value: Math.round(value),
      }));
  }, [salesReport]);

  const interactionMixItems = useMemo(
    () =>
      Object.entries(activityReport?.interaction_breakdown || {})
        .map(([key, value]) => ({ label: getLabel(key), value }))
        .sort((left, right) => right.value - left.value),
    [activityReport]
  );

  const momentumItems = useMemo(
    () => [
      { label: '新增客户', value: resolvedData.recent_activity.recent_customers },
      { label: '新增线索', value: resolvedData.recent_activity.recent_leads },
      { label: '新增商机', value: resolvedData.recent_activity.recent_opportunities },
      { label: '新增订单', value: resolvedData.recent_activity.recent_orders },
      { label: '新增互动', value: resolvedData.recent_activity.recent_interactions },
    ],
    [resolvedData.recent_activity]
  );

  const customerStatusItems = useMemo(
    () =>
      Object.entries(resolvedData.distributions.customer_status)
        .map(([key, value]) => ({ label: getLabel(key), value }))
        .sort((left, right) => right.value - left.value),
    [resolvedData.distributions.customer_status]
  );

  const leadStatusItems = useMemo(
    () =>
      Object.entries(resolvedData.distributions.lead_status)
        .map(([key, value]) => ({ label: getLabel(key), value }))
        .sort((left, right) => right.value - left.value),
    [resolvedData.distributions.lead_status]
  );

  const stats = [
    {
      label: '客户总数',
      value: resolvedData.metrics.total_customers.toLocaleString(),
      help: `近 30 天新增 ${resolvedData.recent_activity.recent_customers}`,
      icon: FiUsers,
      accent: 'linear-gradient(135deg, #2F80ED 0%, #56CCF2 100%)',
    },
    {
      label: '销售机会',
      value: resolvedData.metrics.total_opportunities.toLocaleString(),
      help: `近 30 天新增 ${resolvedData.recent_activity.recent_opportunities}`,
      icon: FiTarget,
      accent: 'linear-gradient(135deg, #1E6FB8 0%, #53A7E8 100%)',
    },
    {
      label: '已交付收入',
      value: formatCurrency(resolvedData.metrics.total_revenue),
      help: `当前管道 ${formatCurrency(resolvedData.metrics.pipeline_value)}`,
      icon: FiDollarSign,
      accent: 'linear-gradient(135deg, #2F9B68 0%, #71D2A0 100%)',
    },
    {
      label: '客户互动',
      value: resolvedData.metrics.total_interactions.toLocaleString(),
      help: `近 30 天新增 ${resolvedData.recent_activity.recent_interactions}`,
      icon: FiActivity,
      accent: 'linear-gradient(135deg, #7A58C1 0%, #B299EC 100%)',
    },
  ];

  const winRate = salesReport?.opportunity_metrics?.win_rate || 0;

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box
        bg="linear-gradient(135deg, #0f3a69 0%, #1f66cf 55%, #59a8ff 100%)"
        color="white"
        borderRadius="28px"
        p={{ base: 4, md: 5 }}
        boxShadow="0 18px 44px rgba(15, 58, 105, 0.2)"
      >
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="center">
          <VStack align="start" spacing={2}>
            <Text fontSize="10px" letterSpacing="0.18em" textTransform="uppercase" color="blue.100">
              Business Radar
            </Text>
            <Heading size="md">蓝鲸CRM 仪表盘</Heading>
            <Text color="blue.50" maxW="640px" fontSize="sm" lineHeight="1.7">
              汇总客户、线索、成交、互动和营销推进节奏，让团队可以一眼看清当前增长状态。
            </Text>
          </VStack>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
            <Box bg="rgba(255,255,255,0.12)" borderRadius="20px" p={3.5}>
              <HStack justify="space-between" mb={2}>
                <Text color="blue.100" fontSize="sm">赢单率</Text>
                <Icon as={FiTrendingUp} />
              </HStack>
              <Text fontSize="3xl" fontWeight="800">{winRate}%</Text>
              <Text color="blue.100" fontSize="sm">按当前周期成交表现估算</Text>
            </Box>
            <Box bg="rgba(255,255,255,0.12)" borderRadius="20px" p={3.5}>
              <Text color="blue.100" fontSize="sm" mb={2}>近 30 天新增线索</Text>
              <Text fontSize="3xl" fontWeight="800">{resolvedData.recent_activity.recent_leads}</Text>
              <Text color="blue.100" fontSize="sm">订单新增 {resolvedData.recent_activity.recent_orders}</Text>
            </Box>
          </SimpleGrid>
        </SimpleGrid>
      </Box>

      {!canViewReports && (
        <Alert status="info" borderRadius="2xl" bg="white">
          <AlertIcon />
          <Box>
            <AlertTitle>当前角色暂未开通报表权限</AlertTitle>
            <AlertDescription>
              {user?.role || '当前账户'} 仍可继续使用客户、销售或营销模块，获得 `reports:read` 权限后会自动展示完整仪表盘。
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
          <Card
            key={stat.label}
            borderRadius="28px"
            bg="rgba(255,255,255,0.95)"
            boxShadow="0 18px 40px rgba(20, 62, 120, 0.08)"
            overflow="hidden"
          >
            <Box h="6px" bg={stat.accent} />
            <CardBody>
              <HStack justify="space-between" align="start">
                <Stat>
                  <StatLabel color="gray.600">{stat.label}</StatLabel>
                  <StatNumber color="gray.800">{stat.value}</StatNumber>
                  <StatHelpText color="gray.500">{stat.help}</StatHelpText>
                </Stat>
                <Box
                  w="48px"
                  h="48px"
                  borderRadius="18px"
                  bg={stat.accent}
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={stat.icon} boxSize={5} />
                </Box>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <BarChartCard
          title="收入趋势柱状图"
          subtitle="按月查看已交付收入表现"
          items={revenueTrendItems}
        />
        <DoughnutCard
          title="互动结构占比"
          subtitle="电话、会议、邮件和备注的组合"
          items={interactionMixItems}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <BarChartCard
          title="近 30 天业务动能"
          subtitle="客户、线索、商机、订单与互动新增量"
          items={momentumItems}
        />
        <DistributionBars title="客户状态分布" items={customerStatusItems} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 1 }} spacing={6}>
        <DistributionBars title="线索状态分布" items={leadStatusItems} />
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
