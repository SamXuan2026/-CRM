
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
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
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Progress,
} from '@chakra-ui/react';
import { apiRequestRaw } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Opportunity {
  id: number;
  name: string;
  customer_id: number;
  assigned_to: number;
  stage: string;
  value: number;
  probability: number;
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

const Sales: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [oppPage, setOppPage] = useState(1);
  const [ordPage, setOrdPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [oppTotalPages, setOppTotalPages] = useState(1);
  const [ordTotalPages, setOrdTotalPages] = useState(1);
  const [oppSearch, setOppSearch] = useState('');
  const [ordSearch, setOrdSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
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

  // Fetch opportunities
  const fetchOpportunities = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (oppSearch) params.search = oppSearch;
      if (stageFilter) params.stage = stageFilter;

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
      setLoading(false);
    }
  };

  // Fetch orders
  const fetchOrders = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (ordSearch) params.search = ordSearch;
      if (orderStatusFilter) params.status = orderStatusFilter;

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
      setLoading(false);
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
  }, [activeTab, oppSearch, stageFilter, orderStatusFilter, pageSize]);

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

  return (
    <VStack spacing={6} align="stretch" p={6}>
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
                        <StatNumber>${pipelineSummary.total_value?.toFixed(2) || '0.00'}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>加权金额</StatLabel>
                        <StatNumber>${pipelineSummary.weighted_value?.toFixed(2) || '0.00'}</StatNumber>
                      </Stat>
                    </StatGroup>

                    {/* Stage Breakdown */}
                    {pipelineSummary.stages && (
                      <Box>
                        <Text fontWeight="bold" mb={4}>
                          各阶段商机分布
                        </Text>
                        <VStack spacing={3} align="stretch">
                          {Object.entries(pipelineSummary.stages).map(([stage, data]: any) => (
                            <Box key={stage}>
                              <HStack justify="space-between" mb={1}>
                                <Text fontSize="sm" fontWeight="500">
                                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  {data.count} 个商机 • ${data.total_value.toFixed(2)} • 平均 {data.avg_probability.toFixed(0)}%
                                </Text>
                              </HStack>
                              <Progress
                                value={data.avg_probability}
                                size="sm"
                                colorScheme={getStageColor(stage)}
                              />
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                </Box>
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

                <HStack spacing={4} mb={6} wrap="wrap">
                  <Input
                    placeholder="按商机名称搜索"
                    value={oppSearch}
                    onChange={(e) => setOppSearch(e.target.value)}
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

                {loading ? (
                  <Box display="flex" justifyContent="center" py={10}>
                    <Spinner />
                  </Box>
                ) : opportunities.length === 0 ? (
                  <Box p={6} textAlign="center" bg="gray.50" borderRadius="md">
                    <Text color="gray.600">暂无商机数据</Text>
                  </Box>
                ) : (
                  <>
                    <Box overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.100">
                          <Tr>
                            <Th>商机名称</Th>
                            <Th>阶段</Th>
                            <Th>金额</Th>
                            <Th>赢单概率</Th>
                            <Th>预计关闭日期</Th>
                            <Th>操作</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {opportunities.map((opp) => (
                            <Tr key={opp.id} _hover={{ bg: 'gray.50' }}>
                              <Td fontWeight="500">{opp.name}</Td>
                              <Td>
                                <Badge colorScheme={getStageColor(opp.stage)}>
                                  {opp.stage}
                                </Badge>
                              </Td>
                              <Td fontWeight="500">${opp.value?.toFixed(2) || '0.00'}</Td>
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

              <HStack spacing={4} width="100%" wrap="wrap">
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

              {loading ? (
                <Box display="flex" justifyContent="center" width="100%" py={10}>
                  <Spinner />
                </Box>
              ) : orders.length === 0 ? (
                <Box p={6} textAlign="center" width="100%" bg="gray.50" borderRadius="md">
                  <Text color="gray.600">暂无订单数据</Text>
                </Box>
              ) : (
                <>
                  <Box overflowX="auto" width="100%">
                    <Table variant="simple" size="sm">
                      <Thead bg="gray.100">
                        <Tr>
                          <Th>订单编号</Th>
                          <Th>状态</Th>
                          <Th>金额</Th>
                          <Th>下单日期</Th>
                          <Th>交付节点</Th>
                          <Th>操作</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {orders.map((ord) => (
                          <Tr key={ord.id} _hover={{ bg: 'gray.50' }}>
                            <Td fontWeight="500">{ord.order_number}</Td>
                            <Td>
                              <Badge colorScheme={getOrderStatusColor(ord.status)}>
                                {ord.status}
                              </Badge>
                            </Td>
                            <Td fontWeight="500">
                              {ord.currency} {ord.total_amount?.toFixed(2) || '0.00'}
                            </Td>
                            <Td fontSize="sm">
                              {new Date(ord.order_date).toLocaleDateString()}
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
              <FormLabel>客户 ID</FormLabel>
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
  onUpdate: (data: Partial<Opportunity>) => void;
  onDelete: () => void;
}

const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  isOpen,
  onClose,
  opportunity,
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
                  <Text fontWeight="bold">阶段</Text>
                  <Badge colorScheme="blue">{opportunity.stage}</Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold">金额</Text>
                  <Text fontSize="lg" fontWeight="500">${opportunity.value?.toFixed(2)}</Text>
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
              <FormLabel>客户 ID</FormLabel>
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
              <FormLabel>关联商机 ID（可选）</FormLabel>
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
  onUpdate: (data: Partial<Order>) => void;
  onDelete: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(order);
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
                  <Text fontWeight="bold">状态</Text>
                  <Badge colorScheme="blue">{order.status}</Badge>
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
