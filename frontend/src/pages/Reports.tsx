
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  VStack,
} from '@chakra-ui/react';

import { reportsApi } from '../services/api';

const Reports = () => {
  const [salesReport, setSalesReport] = useState<any>(null);
  const [activityReport, setActivityReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [sales, activity] = await Promise.all([
          reportsApi.getSalesReport(),
          reportsApi.getActivityReport(),
        ]);
        setSalesReport(sales);
        setActivityReport(activity);
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

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
        <Text>报表数据加载失败。</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box>
        <Heading size="lg">报表分析</Heading>
        <Text color="gray.600" mt={2}>
          这里集中展示销售表现、活动数据与当前阶段业务趋势。
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>总收入</StatLabel>
              <StatNumber>${salesReport.revenue_metrics.total_revenue.toLocaleString()}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>订单总数</StatLabel>
              <StatNumber>{salesReport.order_metrics.total_orders}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>销售赢单率</StatLabel>
              <StatNumber>{salesReport.opportunity_metrics.win_rate}%</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>互动总量</StatLabel>
              <StatNumber>{activityReport.activity_counts.interactions}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader>
            <Heading size="md">销售概览</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text>待处理订单</Text>
                <Text fontWeight="bold">{salesReport.order_metrics.pending_orders}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>已交付订单</Text>
                <Text fontWeight="bold">{salesReport.order_metrics.delivered_orders}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>当前销售管道</Text>
                <Text fontWeight="bold">${salesReport.opportunity_metrics.total_pipeline_value.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>丢单金额</Text>
                <Text fontWeight="bold">${salesReport.opportunity_metrics.closed_lost_value.toLocaleString()}</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="md">活动概览</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text>新增线索</Text>
                <Text fontWeight="bold">{activityReport.activity_counts.new_leads}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text>新增客户</Text>
                <Text fontWeight="bold">{activityReport.activity_counts.new_customers}</Text>
              </HStack>
              {Object.entries(activityReport.interaction_breakdown).map(([type, count]) => (
                <HStack key={type} justify="space-between">
                  <Text textTransform="capitalize">{type}</Text>
                  <Text fontWeight="bold">{count as number}</Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <HStack>
        <Button
          colorScheme="blue"
          onClick={() => reportsApi.exportReport('export', 'csv')}
        >
          导出报表
        </Button>
      </HStack>
    </VStack>
  );
};

export default Reports;
