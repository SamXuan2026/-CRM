import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
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
import { FiDownload, FiDollarSign, FiLayers, FiTarget, FiZap } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';

import { reportsApi } from '../services/api';

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
  user_activities: Record<string, number>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value || 0);

const typeLabelMap: Record<string, string> = {
  call: '电话',
  email: '邮件',
  meeting: '会议',
  note: '备注',
};

const colors = ['#2F80ED', '#56CCF2', '#1D4ED8', '#38BDF8', '#2563EB', '#0F766E'];

const BarChartCard = ({
  title,
  subtitle,
  items,
  currency = false,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
  currency?: boolean;
}) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 18px 45px rgba(20, 62, 120, 0.08)">
      <CardHeader>
        <Heading size="md">{title}</Heading>
        <Text mt={1} fontSize="sm" color="gray.500">
          {subtitle}
        </Text>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <Text color="gray.500">暂无图表数据</Text>
        ) : (
          <HStack align="end" spacing={4} minH="240px">
            {items.map((item, index) => (
              <VStack key={item.label} flex="1" justify="end" spacing={3}>
                <Text fontSize="xs" fontWeight="700" color="gray.700" textAlign="center">
                  {currency ? formatCurrency(item.value) : item.value.toLocaleString()}
                </Text>
                <Box
                  width="100%"
                  minH="12px"
                  height={`${Math.max((item.value / maxValue) * 180, 12)}px`}
                  borderRadius="20px 20px 8px 8px"
                  bg={`linear-gradient(180deg, ${colors[index % colors.length]} 0%, rgba(47,128,237,0.22) 100%)`}
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

const RingCard = ({
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
                w="180px"
                h="180px"
                borderRadius="full"
                bg={gradient}
                position="relative"
              >
                <Box
                  position="absolute"
                  inset="26px"
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

const MetricListCard = ({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) => (
  <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 18px 45px rgba(70, 41, 15, 0.08)">
    <CardHeader>
      <Heading size="md">{title}</Heading>
    </CardHeader>
    <CardBody>
      <VStack align="stretch" spacing={4}>
        {items.map((item) => (
          <HStack key={item.label} justify="space-between">
            <Text color="gray.600">{item.label}</Text>
            <Text fontWeight="800" color="gray.800">
              {item.value}
            </Text>
          </HStack>
        ))}
      </VStack>
    </CardBody>
  </Card>
);

const Reports = () => {
  const location = useLocation();
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [activityReport, setActivityReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const aiSource = urlSearchParams.get('source') === 'ai';

  useEffect(() => {
    const loadReports = async () => {
      try {
        setErrorMessage('');
        const [sales, activity] = await Promise.all([
          reportsApi.getSalesReport(),
          reportsApi.getActivityReport(),
        ]);
        setSalesReport(sales);
        setActivityReport(activity);
      } catch (error: any) {
        console.error('Failed to load reports:', error);
        setErrorMessage(error.message || '报表数据加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const revenueTrendItems = useMemo(
    () =>
      Object.entries(salesReport?.revenue_metrics.monthly_revenue || {})
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-6)
        .map(([month, value]) => ({
          label: month.replace('2026-', '').replace('2025-', ''),
          value: Math.round(value),
        })),
    [salesReport]
  );

  const activityMixItems = useMemo(
    () =>
      Object.entries(activityReport?.interaction_breakdown || {})
        .map(([key, value]) => ({
          label: typeLabelMap[key] || key,
          value,
        }))
        .sort((left, right) => right.value - left.value),
    [activityReport]
  );

  const executionItems = useMemo(
    () => [
      { label: '互动量', value: activityReport?.activity_counts.interactions || 0 },
      { label: '新增线索', value: activityReport?.activity_counts.new_leads || 0 },
      { label: '新增客户', value: activityReport?.activity_counts.new_customers || 0 },
      { label: '待处理订单', value: salesReport?.order_metrics.pending_orders || 0 },
      { label: '已交付订单', value: salesReport?.order_metrics.delivered_orders || 0 },
    ],
    [activityReport, salesReport]
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await reportsApi.exportReport('orders', 'csv');
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'bajiecrm-orders-report.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner />
      </Box>
    );
  }

  if (!salesReport || !activityReport) {
    return (
      <Box p={6}>
        <Alert status="warning" borderRadius="2xl">
          <AlertIcon />
          <AlertDescription>{errorMessage || '报表数据加载失败。'}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  const topStats = [
    {
      label: '总收入',
      value: formatCurrency(salesReport.revenue_metrics.total_revenue),
      help: `当前管道 ${formatCurrency(salesReport.opportunity_metrics.total_pipeline_value)}`,
      icon: FiDollarSign,
      accent: 'linear-gradient(135deg, #2F9B68 0%, #71D2A0 100%)',
    },
    {
      label: '订单总数',
      value: salesReport.order_metrics.total_orders.toLocaleString(),
      help: `已交付 ${salesReport.order_metrics.delivered_orders}`,
      icon: FiLayers,
      accent: 'linear-gradient(135deg, #1E6FB8 0%, #53A7E8 100%)',
    },
    {
      label: '销售赢单率',
      value: `${salesReport.opportunity_metrics.win_rate}%`,
      help: `赢单金额 ${formatCurrency(salesReport.opportunity_metrics.closed_won_value)}`,
      icon: FiTarget,
      accent: 'linear-gradient(135deg, #2F80ED 0%, #56CCF2 100%)',
    },
    {
      label: '互动总量',
      value: activityReport.activity_counts.interactions.toLocaleString(),
      help: `新增线索 ${activityReport.activity_counts.new_leads}`,
      icon: FiZap,
      accent: 'linear-gradient(135deg, #7A58C1 0%, #B299EC 100%)',
    },
  ];

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {aiSource && (
        <Alert status="info" borderRadius="20px" bg="blue.50" color="gray.700">
          <AlertIcon color="brand.500" />
          <AlertDescription fontSize="sm">
            当前报表页来自智能助手摘要结果，方便你继续查看完整分析面板。
          </AlertDescription>
        </Alert>
      )}

      <Box
        bg="linear-gradient(135deg, #123b67 0%, #1f66cf 55%, #6cb8ff 100%)"
        color="white"
        borderRadius="28px"
        p={{ base: 4, md: 5 }}
        boxShadow="0 18px 44px rgba(15, 58, 105, 0.2)"
      >
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="center">
          <VStack align="start" spacing={2}>
            <Text fontSize="10px" letterSpacing="0.18em" textTransform="uppercase" color="blue.100">
              Executive View
            </Text>
            <Heading size="md">报表分析驾驶舱</Heading>
            <Text color="blue.50" maxW="640px" fontSize="sm" lineHeight="1.7">
              聚合收入、订单、赢单率、互动效率和执行节奏，帮助团队从结果与过程两个层面判断业务健康度。
            </Text>
          </VStack>
          <HStack justify={{ base: 'start', lg: 'end' }} align="center">
            <Button
              leftIcon={<FiDownload />}
              onClick={handleExport}
              isLoading={exporting}
              size="sm"
              bg="white"
              color="gray.800"
              _hover={{ bg: 'blue.50' }}
            >
              导出订单报表
            </Button>
          </HStack>
        </SimpleGrid>
      </Box>

      {errorMessage && (
        <Alert status="warning" borderRadius="2xl" bg="white">
          <AlertIcon />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {topStats.map((stat) => (
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
          subtitle="按周期查看已交付收入走势"
          items={revenueTrendItems}
          currency
        />
        <RingCard
          title="互动类型占比"
          subtitle="电话、邮件、会议与备注的工作结构"
          items={activityMixItems}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6}>
        <MetricListCard
          title="销售概览"
          items={[
            { label: '待处理订单', value: salesReport.order_metrics.pending_orders.toLocaleString() },
            { label: '已交付订单', value: salesReport.order_metrics.delivered_orders.toLocaleString() },
            { label: '当前销售管道', value: formatCurrency(salesReport.opportunity_metrics.total_pipeline_value) },
            { label: '赢单金额', value: formatCurrency(salesReport.opportunity_metrics.closed_won_value) },
            { label: '丢单金额', value: formatCurrency(salesReport.opportunity_metrics.closed_lost_value) },
          ]}
        />
        <MetricListCard
          title="活动概览"
          items={[
            { label: '新增线索', value: activityReport.activity_counts.new_leads.toLocaleString() },
            { label: '新增客户', value: activityReport.activity_counts.new_customers.toLocaleString() },
            { label: '互动总量', value: activityReport.activity_counts.interactions.toLocaleString() },
            { label: '最活跃类型', value: activityMixItems[0]?.label || '暂无' },
            { label: '活跃用户数', value: Object.keys(activityReport.user_activities || {}).length.toLocaleString() },
          ]}
        />
        <BarChartCard
          title="执行动能"
          subtitle="从活动到销售执行的关键动作量"
          items={executionItems}
        />
      </SimpleGrid>

      <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 18px 45px rgba(70, 41, 15, 0.08)">
        <CardHeader>
          <Heading size="md">管理层速览</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Box>
              <Text fontSize="sm" color="gray.500">收入视角</Text>
              <Text mt={2} fontSize="lg" fontWeight="700" color="gray.800">
                当前已交付收入 {formatCurrency(salesReport.revenue_metrics.total_revenue)}
              </Text>
              <Text mt={2} color="gray.600" fontSize="sm">
                如果把当前开放商机全部推进，潜在可转化金额还有 {formatCurrency(salesReport.opportunity_metrics.total_pipeline_value)}。
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">执行视角</Text>
              <Text mt={2} fontSize="lg" fontWeight="700" color="gray.800">
                近周期共完成 {activityReport.activity_counts.interactions} 次触达
              </Text>
              <Text mt={2} color="gray.600" fontSize="sm">
                其中新增线索 {activityReport.activity_counts.new_leads} 条，新增客户 {activityReport.activity_counts.new_customers} 个。
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">效率视角</Text>
              <Text mt={2} fontSize="lg" fontWeight="700" color="gray.800">
                当前赢单率 {salesReport.opportunity_metrics.win_rate}%
              </Text>
              <Text mt={2} color="gray.600" fontSize="sm">
                已交付订单 {salesReport.order_metrics.delivered_orders} 张，待推进订单 {salesReport.order_metrics.pending_orders} 张。
              </Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default Reports;
