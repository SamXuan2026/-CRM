
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
  HStack,
  Select,
  Spinner,
  useDisclosure,
  useToast,
  Badge,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Progress,
} from '@chakra-ui/react';
import { useLocation } from 'react-router-dom';
import { apiRequestRaw } from '../services/api';
import { ListRefreshingOverlay } from '../components/ListRefreshingOverlay';
import { ListDensity, ListDensityToggle } from '../components/ListDensityToggle';
import { SortableTh, SortOrder } from '../components/SortableTh';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedSearchInput } from '../hooks/useDebouncedSearchInput';

interface Opportunity {
  id: number;
  name: string;
  customer_id: number;
  assigned_to: number;
  stage: string;
  value: number;
  probability: number;
  assigned_to_name?: string | null;
  assigned_team_name?: string | null;
  expected_close_date?: string;
  description?: string;
  created_at: string;
}

interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  opportunity_id?: number;
  status: string;
  total_amount: number;
  currency: string;
  order_date: string;
  shipped_date?: string;
  delivered_date?: string;
  notes?: string;
  owner_name?: string | null;
  owner_team_name?: string | null;
  created_at: string;
}

interface PipelineSummary {
  total_opportunities: number;
  total_value: number;
  weighted_value: number;
  stages: Record<string, any>;
}

interface CustomerOption {
  id: number;
  label: string;
}

type StageDistributionMode = 'count' | 'value';

const formatCurrency = (value?: number, currencySymbol: string = '$') =>
  `${currencySymbol}${value?.toFixed(2) || '0.00'}`;

const Sales: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [oppPage, setOppPage] = useState(1);
  const [ordPage, setOrdPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [oppTotalPages, setOppTotalPages] = useState(1);
  const [ordTotalPages, setOrdTotalPages] = useState(1);
  const [tableDensity, setTableDensity] = useState<ListDensity>('comfortable');
  const {
    searchValue: oppSearch,
    bindInput: oppSearchInputProps,
    setInputValue: setOppSearchInputValue,
  } = useDebouncedSearchInput();
  const [oppSortBy, setOppSortBy] = useState('expected_close_date');
  const [oppSortOrder, setOppSortOrder] = useState<SortOrder>('asc');
  const [ordSearch, setOrdSearch] = useState('');
  const [orderSortBy, setOrderSortBy] = useState('order_date');
  const [orderSortOrder, setOrderSortOrder] = useState<SortOrder>('desc');
  const [stageFilter, setStageFilter] = useState('');
  const [opportunityCustomerFilter, setOpportunityCustomerFilter] = useState('');
  const [opportunityAssignedToFilter, setOpportunityAssignedToFilter] = useState('');
  const [opportunityMinValueFilter, setOpportunityMinValueFilter] = useState('');
  const [stageDistributionMode, setStageDistributionMode] = useState<StageDistributionMode>('count');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderCustomerFilter, setOrderCustomerFilter] = useState('');
  const [orderMinAmountFilter, setOrderMinAmountFilter] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [opportunityOptions, setOpportunityOptions] = useState<Opportunity[]>([]);
  const toast = useToast();
  const { user } = useAuth();

  const {
    isOpen: isOppCreateOpen,
    onOpen: onOppCreateOpen,
    onClose: onOppCreateClose,
  } = useDisclosure();
  const {
    isOpen: isOppDetailOpen,
    onOpen: onOppDetailOpen,
    onClose: onOppDetailClose,
  } = useDisclosure();
  const {
    isOpen: isOrdCreateOpen,
    onOpen: onOrdCreateOpen,
    onClose: onOrdCreateClose,
  } = useDisclosure();
  const {
    isOpen: isOrdDetailOpen,
    onOpen: onOrdDetailOpen,
    onClose: onOrdDetailClose,
  } = useDisclosure();
  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const aiSource = urlSearchParams.get('source') === 'ai';

  // Fetch opportunities
  const fetchOpportunities = async (page: number = 1) => {
    try {
      setOpportunitiesLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (oppSearch) params.search = oppSearch;
      if (stageFilter) params.stage = stageFilter;
      if (opportunityCustomerFilter) params.customer_id = Number(opportunityCustomerFilter);
      if (opportunityAssignedToFilter) params.assigned_to = Number(opportunityAssignedToFilter);
      if (opportunityMinValueFilter) params.min_value = Number(opportunityMinValueFilter);
      params.sort_by = oppSortBy;
      params.sort_order = oppSortOrder;

      const response = await apiRequestRaw('GET', '/sales/opportunities', undefined, params);

      if (response.success) {
        setOpportunities(response.data || []);
        setOppTotalPages(response.pagination?.total_pages || 1);
        setOppPage(page);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: error.message || '商机列表加载失败',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  // Fetch orders
  const fetchOrders = async (page: number = 1) => {
    try {
      setOrdersLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (ordSearch) params.search = ordSearch;
      if (orderStatusFilter) params.status = orderStatusFilter;
      if (orderCustomerFilter) params.customer_id = Number(orderCustomerFilter);
      if (orderMinAmountFilter) params.min_amount = Number(orderMinAmountFilter);
      params.sort_by = orderSortBy;
      params.sort_order = orderSortOrder;

      const response = await apiRequestRaw('GET', '/sales/orders', undefined, params);

      if (response.success) {
        setOrders(response.data || []);
        setOrdTotalPages(response.pagination?.total_pages || 1);
        setOrdPage(page);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: error.message || '订单列表加载失败',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch pipeline summary
  const fetchPipelineSummary = async () => {
    try {
      const response = await apiRequestRaw('GET', '/sales/pipeline/summary');

      if (response.success) {
        setPipelineSummary(response.data);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: '销售漏斗汇总加载失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [customersResponse, opportunitiesResponse] = await Promise.all([
        apiRequestRaw<any[]>('GET', '/customers', undefined, { per_page: 100 }),
        apiRequestRaw<any[]>('GET', '/sales/opportunities', undefined, { per_page: 100 }),
      ]);

      if (customersResponse.success) {
        setCustomerOptions(
          (customersResponse.data || []).map((customer) => ({
            id: customer.id,
            label: `${customer.first_name} ${customer.last_name}${customer.company ? ` · ${customer.company}` : ''}`,
          }))
        );
      }

      if (opportunitiesResponse.success) {
        setOpportunityOptions(opportunitiesResponse.data || []);
      }
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      fetchOpportunities(1);
      fetchPipelineSummary();
    } else {
      fetchOrders(1);
    }
  }, [
    activeTab,
    oppSearch,
    stageFilter,
    opportunityCustomerFilter,
    opportunityAssignedToFilter,
    opportunityMinValueFilter,
    orderStatusFilter,
    orderCustomerFilter,
    orderMinAmountFilter,
    ordSearch,
    pageSize,
    oppSortBy,
    oppSortOrder,
    orderSortBy,
    orderSortOrder,
  ]);

  useEffect(() => {
    setActiveTab(urlSearchParams.get('tab') === 'orders' ? 1 : 0);
    setOppSearchInputValue(urlSearchParams.get('search') || '');
    setStageFilter(urlSearchParams.get('stage') || '');
    setOpportunityCustomerFilter(urlSearchParams.get('customer_id') || '');
    setOpportunityAssignedToFilter(urlSearchParams.get('assigned_to') || '');
    setOpportunityMinValueFilter(urlSearchParams.get('min_value') || urlSearchParams.get('min_amount') || '');
    setOrdSearch(urlSearchParams.get('search') || '');
    setOrderStatusFilter(urlSearchParams.get('status') || '');
    setOrderCustomerFilter(urlSearchParams.get('customer_id') || '');
    setOrderMinAmountFilter(urlSearchParams.get('min_amount') || '');
  }, [urlSearchParams, setOppSearchInputValue]);

  const handleOpportunitySortToggle = (column: string) => {
    if (oppSortBy === column) {
      setOppSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setOppSortBy(column);
    setOppSortOrder(column === 'expected_close_date' ? 'asc' : 'desc');
  };

  const handleOrderSortToggle = (column: string) => {
    if (orderSortBy === column) {
      setOrderSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setOrderSortBy(column);
    setOrderSortOrder(column === 'order_date' ? 'desc' : 'asc');
  };

  const handleCreateOpportunity = async (data: Partial<Opportunity>) => {
    try {
      const response = await apiRequestRaw('POST', '/sales/opportunities', data);

      if (response.success) {
        toast({
          title: '创建成功',
          description: '商机已创建',
          status: 'success',
          isClosable: true,
        });
        onOppCreateClose();
        fetchOpportunities(1);
        fetchPipelineSummary();
      }
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '商机创建失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleUpdateOpportunity = async (data: Partial<Opportunity>) => {
    if (!selectedOpportunity) return;

    try {
      const response = await apiRequestRaw(
        'PUT',
        `/sales/opportunities/${selectedOpportunity.id}`,
        data
      );

      if (response.success) {
        toast({
          title: '更新成功',
          description: '商机已更新',
          status: 'success',
          isClosable: true,
        });
        onOppDetailClose();
        fetchOpportunities(oppPage);
        fetchPipelineSummary();
      }
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '商机更新失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleDeleteOpportunity = async () => {
    if (!selectedOpportunity || !confirm('确认删除这个商机吗？')) return;

    try {
      const response = await apiRequestRaw(
        'DELETE',
        `/sales/opportunities/${selectedOpportunity.id}`
      );

      if (response.success) {
        toast({
          title: '删除成功',
          description: '商机已删除',
          status: 'success',
          isClosable: true,
        });
        onOppDetailClose();
        fetchOpportunities(1);
        fetchPipelineSummary();
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '商机删除失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleCreateOrder = async (data: Partial<Order>) => {
    try {
      const response = await apiRequestRaw('POST', '/sales/orders', data);

      if (response.success) {
        toast({
          title: '创建成功',
          description: '订单已创建',
          status: 'success',
          isClosable: true,
        });
        onOrdCreateClose();
        fetchOrders(1);
      }
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '订单创建失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleUpdateOrder = async (data: Partial<Order>) => {
    if (!selectedOrder) return;

    try {
      const response = await apiRequestRaw(
        'PUT',
        `/sales/orders/${selectedOrder.id}`,
        data
      );

      if (response.success) {
        toast({
          title: '更新成功',
          description: '订单已更新',
          status: 'success',
          isClosable: true,
        });
        onOrdDetailClose();
        fetchOrders(ordPage);
      }
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '订单更新失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder || !confirm('确认删除这个订单吗？')) return;

    try {
      const response = await apiRequestRaw('DELETE', `/sales/orders/${selectedOrder.id}`);

      if (response.success) {
        toast({
          title: '删除成功',
          description: '订单已删除',
          status: 'success',
          isClosable: true,
        });
        onOrdDetailClose();
        fetchOrders(1);
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '订单删除失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: 'blue',
      qualification: 'cyan',
      proposal: 'purple',
      negotiation: 'orange',
      won: 'green',
      lost: 'red',
    };
    return colors[stage] || 'gray';
  };

  const getOrderStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      confirmed: 'blue',
      shipped: 'purple',
      delivered: 'green',
      cancelled: 'red',
    };
    return colors[status] || 'gray';
  };

  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      confirmed: '已确认',
      shipped: '已发货',
      delivered: '已交付',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const getCustomerLabel = (customerId: number) =>
    customerOptions.find((customer) => customer.id === customerId)?.label || `客户 #${customerId}`;

  const getOpportunityLabel = (opportunityId?: number) =>
    opportunityOptions.find((opportunity) => opportunity.id === opportunityId)?.name ||
    (opportunityId ? `商机 #${opportunityId}` : '未关联');

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      lead: '线索阶段',
      qualification: '需求确认',
      proposal: '方案报价',
      negotiation: '商务谈判',
      won: '赢单',
      lost: '输单',
    };
    return labels[stage] || stage;
  };

  const orderStatusSummary = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const orderStatusItems = Object.entries(orderStatusSummary).sort((a, b) => b[1] - a[1]);
  const maxOrderStatus = Math.max(...orderStatusItems.map(([, value]) => value), 1);
  const stageOrder = ['lead', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];
  const stageMetricLabel = stageDistributionMode === 'count' ? '商机数量占比' : '阶段金额占比';
  const stageSummaryItems = useMemo(() => {
    if (!pipelineSummary?.stages) {
      return [];
    }

    return Object.entries(pipelineSummary.stages)
      .sort(([left], [right]) => stageOrder.indexOf(left) - stageOrder.indexOf(right))
      .map(([stage, data]: any) => {
        const countShare = pipelineSummary.total_opportunities
          ? (data.count / pipelineSummary.total_opportunities) * 100
          : 0;
        const valueShare = pipelineSummary.total_value
          ? (data.total_value / pipelineSummary.total_value) * 100
          : 0;

        return {
          stage,
          count: data.count,
          totalValue: data.total_value,
          avgProbability: data.avg_probability,
          countShare,
          valueShare,
        };
      });
  }, [pipelineSummary]);

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {aiSource && (
        <Alert status="info" borderRadius="20px" bg="blue.50" color="gray.700">
          <AlertIcon color="brand.500" />
          <AlertDescription fontSize="sm">
            当前页面已按智能助手返回的商机或订单条件自动筛选。
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        index={activeTab}
        onChange={(index) => setActiveTab(index)}
        colorScheme="blue"
      >
        <TabList>
          <Tab>销售漏斗</Tab>
          <Tab>订单管理</Tab>
        </TabList>

        <TabPanels>
          {/* OPPORTUNITIES TAB */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Pipeline Summary */}
              {pipelineSummary && (
                <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
                  <VStack align="stretch" spacing={6}>
                    <StatGroup>
                      <Stat>
                        <StatLabel>商机总数</StatLabel>
                        <StatNumber>{pipelineSummary.total_opportunities}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>漏斗金额</StatLabel>
                        <StatNumber>{formatCurrency(pipelineSummary.total_value)}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>加权金额</StatLabel>
                        <StatNumber>{formatCurrency(pipelineSummary.weighted_value)}</StatNumber>
                      </Stat>
                    </StatGroup>

                    {/* Stage Breakdown */}
                    {pipelineSummary.stages && (
                      <Box>
                        <HStack justify="space-between" align="center" mb={4} wrap="wrap" spacing={3}>
                          <Box>
                            <Text fontWeight="bold">
                              各阶段商机分布
                            </Text>
                            <Text fontSize="sm" color="gray.500" mt={1}>
                              当前可按商机数量占比或阶段金额占比查看，避免统计口径混淆。
                            </Text>
                          </Box>
                          <HStack spacing={2}>
                            <Button
                              size="sm"
                              variant={stageDistributionMode === 'count' ? 'solid' : 'outline'}
                              colorScheme="blue"
                              onClick={() => setStageDistributionMode('count')}
                            >
                              按数量占比
                            </Button>
                            <Button
                              size="sm"
                              variant={stageDistributionMode === 'value' ? 'solid' : 'outline'}
                              colorScheme="blue"
                              onClick={() => setStageDistributionMode('value')}
                            >
                              按金额占比
                            </Button>
                          </HStack>
                        </HStack>
                        <HStack
                          justify="space-between"
                          align="center"
                          px={3}
                          py={2.5}
                          borderRadius="16px"
                          bg="blue.50"
                          color="gray.700"
                          fontSize="sm"
                          mb={3}
                        >
                          <Text>
                            当前条形口径：{stageMetricLabel}
                          </Text>
                          <Text color="gray.500">
                            总商机 {pipelineSummary.total_opportunities} 个，漏斗金额 {formatCurrency(pipelineSummary.total_value)}
                          </Text>
                        </HStack>
                        <VStack spacing={3} align="stretch">
                          {stageSummaryItems.map((item) => (
                            <Box
                              key={item.stage}
                              opacity={item.stage === 'lost' ? 0.7 : 1}
                            >
                              <HStack justify="space-between" mb={1}>
                                <HStack spacing={2}>
                                  <Text fontSize="sm" fontWeight="600">
                                    {getStageLabel(item.stage)}
                                  </Text>
                                  <Badge colorScheme={getStageColor(item.stage)} variant="subtle">
                                    占比 {(stageDistributionMode === 'count' ? item.countShare : item.valueShare).toFixed(1)}%
                                  </Badge>
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                  {item.count} 个商机 • {formatCurrency(item.totalValue)}
                                </Text>
                              </HStack>
                              <Progress
                                value={stageDistributionMode === 'count' ? item.countShare : item.valueShare}
                                size="sm"
                                borderRadius="full"
                                bg="gray.100"
                                colorScheme={getStageColor(item.stage)}
                              />
                              <HStack justify="space-between" mt={1.5}>
                                <Text fontSize="xs" color="gray.500">
                                  {stageDistributionMode === 'count'
                                    ? '该阶段商机数量占全部商机的比例'
                                    : '该阶段金额占全部漏斗金额的比例'}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  精确占比 {(stageDistributionMode === 'count' ? item.countShare : item.valueShare).toFixed(1)}% • 平均赢单概率 {item.avgProbability.toFixed(0)}%
                                </Text>
                              </HStack>
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                </Box>
              )}

              {pipelineSummary && (
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Card bg="rgba(255,255,255,0.95)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
                    <CardBody>
                      <Text fontSize="sm" color="gray.500">平均单个商机金额</Text>
                      <Text fontSize="2xl" fontWeight="800" color="gray.800" mt={2}>
                        {formatCurrency(
                          pipelineSummary.total_opportunities
                            ? pipelineSummary.total_value / pipelineSummary.total_opportunities
                            : 0
                        )}
                      </Text>
                    </CardBody>
                  </Card>
                  <Card bg="rgba(255,255,255,0.95)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
                    <CardBody>
                      <Text fontSize="sm" color="gray.500">高概率商机数量</Text>
                      <Text fontSize="2xl" fontWeight="800" color="gray.800" mt={2}>
                        {opportunities.filter((opportunity) => opportunity.probability >= 60).length}
                      </Text>
                    </CardBody>
                  </Card>
                  <Card bg="rgba(255,255,255,0.95)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
                    <CardBody>
                      <Text fontSize="sm" color="gray.500">最拥挤阶段</Text>
                      <Text fontSize="2xl" fontWeight="800" color="gray.800" mt={2}>
                        {Object.entries(pipelineSummary.stages || {}).sort((a: any, b: any) => b[1].count - a[1].count)[0]?.[0]
                          ? getStageLabel(Object.entries(pipelineSummary.stages || {}).sort((a: any, b: any) => b[1].count - a[1].count)[0][0])
                          : '暂无'}
                      </Text>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              )}

              {/* Opportunities Table */}
              <Box>
                <HStack justify="space-between" mb={6}>
                  <Text fontSize="2xl" fontWeight="bold">
                    商机管理
                  </Text>
                  <Button
                    colorScheme="blue"
                    onClick={onOppCreateOpen}
                    isDisabled={!user}
                  >
                    + 新建商机
                  </Button>
                </HStack>

                <HStack spacing={4} mb={6} wrap="wrap" justify="space-between" align="start">
                  <HStack spacing={4} wrap="wrap" flex="1">
                    <Input
                      placeholder="按商机名称搜索"
                      {...oppSearchInputProps}
                      width="250px"
                    />
                    <Select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      width="150px"
                    >
                      <option value="">全部阶段</option>
                      <option value="lead">线索阶段</option>
                      <option value="qualification">需求确认</option>
                      <option value="proposal">方案报价</option>
                      <option value="negotiation">商务谈判</option>
                      <option value="won">赢单</option>
                      <option value="lost">输单</option>
                    </Select>
                    <Select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      width="100px"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </Select>
                  </HStack>
                  <HStack spacing={3}>
                    <Text fontSize="sm" fontWeight="600" color="gray.500">列表密度</Text>
                    <ListDensityToggle value={tableDensity} onChange={setTableDensity} />
                  </HStack>
                </HStack>

                {opportunitiesLoading && opportunities.length === 0 ? (
                  <Box display="flex" justifyContent="center" py={10}>
                    <Spinner />
                  </Box>
                ) : opportunities.length === 0 ? (
                  <Box p={6} textAlign="center" bg="gray.50" borderRadius="md">
                    <Text color="gray.600">暂无商机数据</Text>
                  </Box>
                ) : (
                  <>
                    <Box position="relative">
                      {opportunitiesLoading && (
                        <HStack
                          justify="space-between"
                          px={3}
                          py={2}
                          mb={3}
                          borderRadius="16px"
                          bg="blue.50"
                          color="gray.600"
                          fontSize="sm"
                        >
                          <Text>正在刷新商机列表...</Text>
                          <Spinner size="sm" color="blue.500" />
                        </HStack>
                      )}
                      <Box
                        overflowX="auto"
                        opacity={opportunitiesLoading ? 0.72 : 1}
                        transition="opacity 0.18s ease"
                      >
                        <Table variant="simple" size={tableDensity === 'comfortable' ? 'md' : 'sm'}>
                          <Thead>
                            <Tr>
                              <SortableTh label="商机名称" column="name" activeSortBy={oppSortBy} activeSortOrder={oppSortOrder} onToggle={handleOpportunitySortToggle} />
                              <Th>客户 / 负责人</Th>
                              <SortableTh label="阶段" column="stage" activeSortBy={oppSortBy} activeSortOrder={oppSortOrder} onToggle={handleOpportunitySortToggle} />
                              <SortableTh label="金额" column="value" activeSortBy={oppSortBy} activeSortOrder={oppSortOrder} onToggle={handleOpportunitySortToggle} />
                              <SortableTh label="赢单概率" column="probability" activeSortBy={oppSortBy} activeSortOrder={oppSortOrder} onToggle={handleOpportunitySortToggle} />
                              <SortableTh label="预计关闭日期" column="expected_close_date" activeSortBy={oppSortBy} activeSortOrder={oppSortOrder} onToggle={handleOpportunitySortToggle} />
                              <Th>操作</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {opportunities.map((opp) => (
                              <Tr key={opp.id} _hover={{ bg: 'gray.50' }}>
                                <Td fontWeight="500">{opp.name}</Td>
                                <Td fontSize="sm" color="gray.600">
                                  <VStack align="start" spacing={0.5}>
                                    <Text fontSize="sm" color="gray.700">{getCustomerLabel(opp.customer_id)}</Text>
                                    <Text fontSize="sm" color="gray.500">
                                      {opp.assigned_to_name || '未分配'} · {opp.assigned_team_name || '未分组'}
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td>
                                  <Badge colorScheme={getStageColor(opp.stage)}>
                                    {getStageLabel(opp.stage)}
                                  </Badge>
                                </Td>
                                <Td fontWeight="500">{formatCurrency(opp.value)}</Td>
                                <Td>
                                  <HStack spacing={2}>
                                    <Box width="50px">
                                      <Progress value={opp.probability} size="sm" colorScheme="blue" />
                                    </Box>
                                    <Text fontSize="sm">{opp.probability}%</Text>
                                  </HStack>
                                </Td>
                                <Td fontSize="sm">
                                  {opp.expected_close_date
                                    ? new Date(opp.expected_close_date).toLocaleDateString()
                                    : '暂无'}
                                </Td>
                                <Td>
                                  <Button
                                    size="sm"
                                    colorScheme="blue"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedOpportunity(opp);
                                      onOppDetailOpen();
                                    }}
                                  >
                                    查看
                                  </Button>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                      {opportunitiesLoading && <ListRefreshingOverlay columns={7} />}
                    </Box>

                    {/* Pagination */}
                    {oppTotalPages > 1 && (
                      <HStack justify="center" mt={6} spacing={2}>
                        <Button
                          onClick={() => fetchOpportunities(Math.max(1, oppPage - 1))}
                          isDisabled={oppPage === 1}
                        >
                          上一页
                        </Button>
                        <Text>
                          第 {oppPage} / {oppTotalPages} 页
                        </Text>
                        <Button
                          onClick={() => fetchOpportunities(Math.min(oppTotalPages, oppPage + 1))}
                          isDisabled={oppPage === oppTotalPages}
                        >
                          下一页
                        </Button>
                      </HStack>
                    )}
                  </>
                )}
              </Box>
            </VStack>
          </TabPanel>

          {/* ORDERS TAB */}
          <TabPanel>
            <VStack spacing={6}>
              {orders.length > 0 && (
                <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)" width="100%">
                  <CardHeader pb={0}>
                    <Text fontSize="lg" fontWeight="700" color="gray.800">订单状态摘要</Text>
                    <Text fontSize="sm" color="gray.500">快速判断当前订单推进节奏</Text>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {orderStatusItems.map(([status, count]) => (
                        <Box key={status}>
                          <HStack justify="space-between" mb={1.5}>
                            <Text fontSize="sm" color="gray.700">{getOrderStatusLabel(status)}</Text>
                            <Text fontSize="sm" fontWeight="700" color="gray.800">{count}</Text>
                          </HStack>
                          <Progress
                            value={(count / maxOrderStatus) * 100}
                            colorScheme={getOrderStatusColor(status)}
                            borderRadius="full"
                            bg="gray.100"
                          />
                        </Box>
                      ))}
                    </SimpleGrid>
                  </CardBody>
                </Card>
              )}

              <HStack justify="space-between" width="100%">
                <Text fontSize="2xl" fontWeight="bold">
                  订单管理
                </Text>
                <Button
                  colorScheme="blue"
                  onClick={onOrdCreateOpen}
                  isDisabled={!user}
                >
                  + 新建订单
                </Button>
              </HStack>

              <HStack spacing={4} width="100%" wrap="wrap" justify="space-between" align="start">
                <HStack spacing={4} wrap="wrap" flex="1">
                  <Input
                    placeholder="按订单编号搜索"
                    value={ordSearch}
                    onChange={(e) => setOrdSearch(e.target.value)}
                    width="250px"
                  />
                  <Select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    width="150px"
                  >
                    <option value="">全部状态</option>
                    <option value="pending">待处理</option>
                    <option value="confirmed">已确认</option>
                    <option value="shipped">已发货</option>
                    <option value="delivered">已交付</option>
                    <option value="cancelled">已取消</option>
                  </Select>
                  <Select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    width="100px"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </Select>
                </HStack>
                <HStack spacing={3}>
                  <Text fontSize="sm" fontWeight="600" color="gray.500">列表密度</Text>
                  <ListDensityToggle value={tableDensity} onChange={setTableDensity} />
                </HStack>
              </HStack>

              {ordersLoading && orders.length === 0 ? (
                <Box display="flex" justifyContent="center" width="100%" py={10}>
                  <Spinner />
                </Box>
              ) : orders.length === 0 ? (
                <Box p={6} textAlign="center" width="100%" bg="gray.50" borderRadius="md">
                  <Text color="gray.600">暂无订单数据</Text>
                </Box>
              ) : (
                <>
                  <Box width="100%" position="relative">
                    {ordersLoading && (
                      <HStack
                        justify="space-between"
                        px={3}
                        py={2}
                        mb={3}
                        borderRadius="16px"
                        bg="blue.50"
                        color="gray.600"
                        fontSize="sm"
                      >
                        <Text>正在刷新订单列表...</Text>
                        <Spinner size="sm" color="blue.500" />
                      </HStack>
                    )}
                    <Box
                      overflowX="auto"
                      width="100%"
                      opacity={ordersLoading ? 0.72 : 1}
                      transition="opacity 0.18s ease"
                    >
                      <Table variant="simple" size={tableDensity === 'comfortable' ? 'md' : 'sm'}>
                        <Thead>
                          <Tr>
                            <SortableTh label="订单编号" column="order_number" activeSortBy={orderSortBy} activeSortOrder={orderSortOrder} onToggle={handleOrderSortToggle} />
                            <Th>客户 / 负责人</Th>
                            <SortableTh label="状态" column="status" activeSortBy={orderSortBy} activeSortOrder={orderSortOrder} onToggle={handleOrderSortToggle} />
                            <SortableTh label="金额" column="total_amount" activeSortBy={orderSortBy} activeSortOrder={orderSortOrder} onToggle={handleOrderSortToggle} />
                            <SortableTh label="下单日期" column="order_date" activeSortBy={orderSortBy} activeSortOrder={orderSortOrder} onToggle={handleOrderSortToggle} />
                            <Th>关联商机</Th>
                            <SortableTh label="交付节点" column="delivered_date" activeSortBy={orderSortBy} activeSortOrder={orderSortOrder} onToggle={handleOrderSortToggle} />
                            <Th>操作</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {orders.map((ord) => (
                            <Tr key={ord.id} _hover={{ bg: 'gray.50' }}>
                              <Td fontWeight="500">{ord.order_number}</Td>
                              <Td fontSize="sm" color="gray.600">
                                <VStack align="start" spacing={0.5}>
                                  <Text fontSize="sm" color="gray.700">{getCustomerLabel(ord.customer_id)}</Text>
                                  <Text fontSize="sm" color="gray.500">
                                    {ord.owner_name || '未分配'} · {ord.owner_team_name || '未分组'}
                                  </Text>
                                </VStack>
                              </Td>
                              <Td>
                                  <Badge colorScheme={getOrderStatusColor(ord.status)}>
                                    {getOrderStatusLabel(ord.status)}
                                  </Badge>
                              </Td>
                              <Td fontWeight="500">
                                {ord.currency} {ord.total_amount?.toFixed(2) || '0.00'}
                              </Td>
                              <Td fontSize="sm">
                                {new Date(ord.order_date).toLocaleDateString()}
                              </Td>
                              <Td fontSize="sm" color="gray.600">
                                {getOpportunityLabel(ord.opportunity_id)}
                              </Td>
                              <Td fontSize="sm">
                                {ord.delivered_date
                                  ? new Date(ord.delivered_date).toLocaleDateString()
                                  : ord.shipped_date
                                    ? new Date(ord.shipped_date).toLocaleDateString()
                                    : '暂无'}
                              </Td>
                              <Td>
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    onOrdDetailOpen();
                                  }}
                                >
                                  查看
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                    {ordersLoading && <ListRefreshingOverlay columns={8} />}
                  </Box>

                  {/* Pagination */}
                  {ordTotalPages > 1 && (
                    <HStack justify="center" spacing={2}>
                      <Button
                        onClick={() => fetchOrders(Math.max(1, ordPage - 1))}
                        isDisabled={ordPage === 1}
                      >
                        上一页
                      </Button>
                      <Text>
                        第 {ordPage} / {ordTotalPages} 页
                      </Text>
                      <Button
                        onClick={() => fetchOrders(Math.min(ordTotalPages, ordPage + 1))}
                        isDisabled={ordPage === ordTotalPages}
                      >
                        下一页
                      </Button>
                    </HStack>
                  )}
                </>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Modals */}
      <CreateOpportunityModal
        isOpen={isOppCreateOpen}
        onClose={onOppCreateClose}
        onSubmit={handleCreateOpportunity}
        customerOptions={customerOptions}
      />

      {selectedOpportunity && (
        <OpportunityDetailModal
          isOpen={isOppDetailOpen}
          onClose={onOppDetailClose}
          opportunity={selectedOpportunity}
          customerLabel={getCustomerLabel(selectedOpportunity.customer_id)}
          stageLabel={getStageLabel(selectedOpportunity.stage)}
          onUpdate={handleUpdateOpportunity}
          onDelete={handleDeleteOpportunity}
        />
      )}

      <CreateOrderModal
        isOpen={isOrdCreateOpen}
        onClose={onOrdCreateClose}
        onSubmit={handleCreateOrder}
        customerOptions={customerOptions}
        opportunityOptions={opportunityOptions}
      />

      {selectedOrder && (
        <OrderDetailModal
          isOpen={isOrdDetailOpen}
          onClose={onOrdDetailClose}
          order={selectedOrder}
          customerLabel={getCustomerLabel(selectedOrder.customer_id)}
          opportunityLabel={getOpportunityLabel(selectedOrder.opportunity_id)}
          onUpdate={handleUpdateOrder}
          onDelete={handleDeleteOrder}
        />
      )}
    </VStack>
  );
};

// ============ OPPORTUNITY MODALS ============

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Opportunity>) => void;
  customerOptions: CustomerOption[];
}

const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customerOptions,
}) => {
  const [formData, setFormData] = useState<Partial<Opportunity>>({
    stage: 'lead',
    probability: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    setFormData({ stage: 'lead', probability: 0 });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>新建商机</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>商机名称</FormLabel>
              <Input
                placeholder="例如：年度订阅续费项目"
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>客户</FormLabel>
              <Select
                placeholder="请选择客户"
                value={formData.customer_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer_id: Number(e.target.value),
                  })
                }
              >
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>商机金额（$）</FormLabel>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.value || ''}
                onChange={(e) =>
                  setFormData({ ...formData, value: Number(e.target.value) })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>阶段</FormLabel>
              <Select
                value={formData.stage || 'lead'}
                onChange={(e) =>
                  setFormData({ ...formData, stage: e.target.value })
                }
              >
                <option value="lead">线索阶段</option>
                <option value="qualification">需求确认</option>
                <option value="proposal">方案报价</option>
                <option value="negotiation">商务谈判</option>
                <option value="won">赢单</option>
                <option value="lost">输单</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>赢单概率（%）</FormLabel>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={formData.probability || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    probability: Number(e.target.value),
                  })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>预计关闭日期</FormLabel>
              <Input
                type="date"
                value={formData.expected_close_date || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expected_close_date: e.target.value,
                  })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>说明</FormLabel>
              <Textarea
                placeholder="补充本次商机的背景、需求和关键风险"
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            创建
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity;
  customerLabel: string;
  stageLabel: string;
  onUpdate: (data: Partial<Opportunity>) => void;
  onDelete: () => void;
}

const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  customerLabel,
  stageLabel,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(opportunity);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onUpdate(formData);
    setLoading(false);
    setIsEditing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{opportunity.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {isEditing ? (
              <>
                <FormControl>
                  <FormLabel>名称</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>阶段</FormLabel>
                  <Select
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({ ...formData, stage: e.target.value })
                    }
                  >
                    <option value="lead">线索阶段</option>
                    <option value="qualification">需求确认</option>
                    <option value="proposal">方案报价</option>
                    <option value="negotiation">商务谈判</option>
                    <option value="won">赢单</option>
                    <option value="lost">输单</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>金额（$）</FormLabel>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        value: Number(e.target.value),
                      })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>赢单概率（%）</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        probability: Number(e.target.value),
                      })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>预计关闭日期</FormLabel>
                  <Input
                    type="date"
                    value={formData.expected_close_date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expected_close_date: e.target.value,
                      })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>说明</FormLabel>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </>
            ) : (
              <>
                <Box>
                  <Text fontWeight="bold">客户</Text>
                  <Text>{customerLabel}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">负责人</Text>
                  <Text>{opportunity.assigned_to_name || '未分配'}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {opportunity.assigned_team_name || '未分组'}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">阶段</Text>
                  <Badge colorScheme="blue">{stageLabel}</Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">金额</Text>
                  <Text fontSize="lg" fontWeight="500">{formatCurrency(opportunity.value)}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">赢单概率</Text>
                  <HStack>
                    <Box width="100px">
                      <Progress value={opportunity.probability} colorScheme="blue" />
                    </Box>
                    <Text>{opportunity.probability}%</Text>
                  </HStack>
                </Box>
                <Box>
                  <Text fontWeight="bold">预计关闭日期</Text>
                  <Text>
                    {opportunity.expected_close_date
                      ? new Date(opportunity.expected_close_date).toLocaleDateString()
                      : '暂无'}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">说明</Text>
                  <Text color="gray.600">{opportunity.description || '暂无'}</Text>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                mr={3}
                onClick={() => {
                  setIsEditing(false);
                  setFormData(opportunity);
                }}
              >
                取消
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={loading}
              >
                保存
              </Button>
            </>
          ) : (
            <>
              <Button
                colorScheme="red"
                variant="ghost"
                mr={3}
                onClick={onDelete}
              >
                删除
              </Button>
              <Button colorScheme="blue" onClick={() => setIsEditing(true)}>
                编辑
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose} ml={2}>
            关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// ============ ORDER MODALS ============

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Order>) => void;
  customerOptions: CustomerOption[];
  opportunityOptions: Opportunity[];
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customerOptions,
  opportunityOptions,
}) => {
  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'pending',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    setFormData({ status: 'pending', currency: 'USD' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>新建订单</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>客户</FormLabel>
              <Select
                placeholder="请选择客户"
                value={formData.customer_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer_id: Number(e.target.value),
                  })
                }
              >
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>订单金额（$）</FormLabel>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.total_amount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_amount: Number(e.target.value),
                  })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>币种</FormLabel>
              <Select
                value={formData.currency || 'USD'}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CNY">CNY</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>状态</FormLabel>
              <Select
                value={formData.status || 'pending'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="pending">待处理</option>
                <option value="confirmed">已确认</option>
                <option value="shipped">已发货</option>
                <option value="delivered">已交付</option>
                <option value="cancelled">已取消</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>下单日期</FormLabel>
              <Input
                type="date"
                value={formData.order_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, order_date: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>关联商机（可选）</FormLabel>
              <Select
                placeholder="可关联已有商机"
                value={formData.opportunity_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    opportunity_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                {opportunityOptions.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>
                    #{opportunity.id} · {opportunity.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>备注</FormLabel>
              <Textarea
                placeholder="补充交付、账期或客户要求"
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            创建
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customerLabel: string;
  opportunityLabel: string;
  onUpdate: (data: Partial<Order>) => void;
  onDelete: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  customerLabel,
  opportunityLabel,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(order);
  const [loading, setLoading] = useState(false);
  const orderStatusColorMap: Record<string, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
  };
  const orderStatusLabelMap: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    shipped: '已发货',
    delivered: '已交付',
    cancelled: '已取消',
  };

  const handleSave = async () => {
    setLoading(true);
    await onUpdate(formData);
    setLoading(false);
    setIsEditing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{order.order_number}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {isEditing ? (
              <>
                <FormControl>
                  <FormLabel>状态</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="pending">待处理</option>
                    <option value="confirmed">已确认</option>
                    <option value="shipped">已发货</option>
                    <option value="delivered">已交付</option>
                    <option value="cancelled">已取消</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>金额</FormLabel>
                  <Input
                    type="number"
                    value={formData.total_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_amount: Number(e.target.value),
                      })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>发货日期</FormLabel>
                  <Input
                    type="date"
                    value={formData.shipped_date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shipped_date: e.target.value || undefined,
                      })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>交付日期</FormLabel>
                  <Input
                    type="date"
                    value={formData.delivered_date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delivered_date: e.target.value || undefined,
                      })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>备注</FormLabel>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </FormControl>
              </>
            ) : (
              <>
                <Box>
                  <Text fontWeight="bold">客户</Text>
                  <Text>{customerLabel}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">负责人</Text>
                  <Text>{order.owner_name || '未分配'}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {order.owner_team_name || '未分组'}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">状态</Text>
                  <Badge colorScheme={orderStatusColorMap[order.status] || 'gray'}>
                    {orderStatusLabelMap[order.status] || order.status}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">关联商机</Text>
                  <Text>{opportunityLabel}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">金额</Text>
                  <Text fontSize="lg" fontWeight="500">
                    {order.currency} {order.total_amount?.toFixed(2)}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">下单日期</Text>
                  <Text>{new Date(order.order_date).toLocaleDateString()}</Text>
                </Box>
                {order.shipped_date && (
                  <Box>
                    <Text fontWeight="bold">发货日期</Text>
                    <Text>
                      {new Date(order.shipped_date).toLocaleDateString()}
                    </Text>
                  </Box>
                )}
                {order.delivered_date && (
                  <Box>
                    <Text fontWeight="bold">交付日期</Text>
                    <Text>
                      {new Date(order.delivered_date).toLocaleDateString()}
                    </Text>
                  </Box>
                )}
                {order.notes && (
                  <Box>
                    <Text fontWeight="bold">备注</Text>
                    <Text color="gray.600">{order.notes}</Text>
                  </Box>
                )}
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                mr={3}
                onClick={() => {
                  setIsEditing(false);
                  setFormData(order);
                }}
              >
                取消
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={loading}
              >
                保存
              </Button>
            </>
          ) : (
            <>
              <Button
                colorScheme="red"
                variant="ghost"
                mr={3}
                onClick={onDelete}
              >
                删除
              </Button>
              <Button colorScheme="blue" onClick={() => setIsEditing(true)}>
                编辑
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose} ml={2}>
            关闭
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Sales;
