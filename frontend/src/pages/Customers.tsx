import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  Card,
  CardBody,
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
  Wrap,
  WrapItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Progress,
  Divider,
} from '@chakra-ui/react';
import { FiActivity, FiCheckCircle, FiClock, FiPhoneCall } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { aiApi, AiAssistantResponse, apiRequestRaw } from '../services/api';
import { ListRefreshingOverlay } from '../components/ListRefreshingOverlay';
import { ListDensity, ListDensityToggle } from '../components/ListDensityToggle';
import { SortableTh, SortOrder } from '../components/SortableTh';
import { useDebouncedSearchInput } from '../hooks/useDebouncedSearchInput';
import { useAuth } from '../hooks/useAuth';
import { customerLevelLabelMap, customerStatusLabelMap } from '../constants/customerLabels';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  customer_level: string;
  created_at: string;
  assigned_sales_rep_id?: number;
  assigned_sales_rep_name?: string | null;
  assigned_sales_team_name?: string | null;
  notes?: string;
  interaction_summary?: InteractionSummary;
}

interface Interaction {
  id: number;
  interaction_type: string;
  subject: string;
  description?: string;
  date: string;
  outcome?: string;
  next_action?: string | null;
  next_follow_up_at?: string | null;
  reminder_status?: string | null;
  owner_name?: string | null;
}

interface InteractionFormData {
  interaction_type: string;
  subject: string;
  description: string;
  outcome: string;
  next_action?: string;
  duration_minutes?: number | '';
  date?: string;
  next_follow_up_at?: string;
  reminder_status?: string;
}

interface InteractionSummary {
  total_interactions: number;
  last_interaction_at?: string | null;
  last_interaction_type?: string | null;
  last_interaction_subject?: string | null;
  last_outcome?: string | null;
  next_action?: string | null;
  next_follow_up_at?: string | null;
  reminder_status?: string | null;
}

interface CustomerOverview {
  total: number;
  with_company: number;
  by_level: Record<string, number>;
  by_status: Record<string, number>;
  follow_up: {
    covered: number;
    missing: number;
    recent: number;
    with_next_action: number;
  };
}

const interactionTypeLabelMap: Record<string, string> = {
  email: '邮件',
  call: '电话',
  meeting: '会议',
  note: '备注',
  other: '其他',
};

const outcomeLabelMap: Record<string, string> = {
  positive: '推进顺利',
  neutral: '待观察',
  negative: '存在阻力',
};

const reminderStatusLabelMap: Record<string, string> = {
  pending: '待提醒',
  completed: '已完成',
  snoozed: '稍后跟进',
};

const assistantFieldLabelMap: Record<string, string> = {
  subject: '主题',
  interaction_type: '互动类型',
  date: '时间',
  outcome: '结果',
  owner_name: '负责人',
  name: '名称',
  company: '公司',
  status: '状态',
};

const TEAM_DETAIL_TARGET_CUSTOMER_KEY = 'crm_team_detail_target_customer_id';

const Customers: React.FC = () => {
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [customerOverview, setCustomerOverview] = useState<CustomerOverview>({
    total: 0,
    with_company: 0,
    by_level: {},
    by_status: {},
    follow_up: {
      covered: 0,
      missing: 0,
      recent: 0,
      with_next_action: 0,
    },
  });
  const [tableDensity, setTableDensity] = useState<ListDensity>('comfortable');
  const {
    searchValue: searchQuery,
    bindInput: customerSearchInputProps,
    setInputValue: setCustomerSearchInputValue,
  } = useDebouncedSearchInput();
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [staleDaysFilter, setStaleDaysFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [interactionDraft, setInteractionDraft] = useState<Partial<InteractionFormData> | null>(null);
  const [interactionEntrySource, setInteractionEntrySource] = useState<'list' | 'details'>('list');
  const toast = useToast();
  const { user, hasPermission, hasRole } = useAuth();
  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure();
  const {
    isOpen: isInteractionOpen,
    onOpen: onInteractionOpen,
    onClose: onInteractionClose,
  } = useDisclosure();
  const openedCustomerFromQueryRef = useRef<number | null>(null);
  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const aiSource = urlSearchParams.get('source') === 'ai';
  const aiIntent = urlSearchParams.get('intent');

  // Fetch customers
  const fetchCustomers = async (page: number = 1) => {
    try {
      setCustomersLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (levelFilter) params.level = levelFilter;
      if (assignedToFilter) params.assigned_to = Number(assignedToFilter);
      if (staleDaysFilter) params.stale_days = Number(staleDaysFilter);
      params.sort_by = sortBy;
      params.sort_order = sortOrder;

      const response = await apiRequestRaw(
        'GET',
        '/customers',
        undefined,
        params
      );

      if (response.success) {
        setCustomers(response.data || []);
        setTotalPages(response.pagination?.total_pages || 1);
        setTotalCustomers(response.pagination?.total || 0);
        setCurrentPage(page);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: error.message || '客户列表加载失败',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchCustomerOverview = async () => {
    try {
      setSummaryLoading(true);
      const params: Record<string, any> = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (levelFilter) params.level = levelFilter;
      if (assignedToFilter) params.assigned_to = Number(assignedToFilter);
      if (staleDaysFilter) params.stale_days = Number(staleDaysFilter);

      const response = await apiRequestRaw<CustomerOverview>(
        'GET',
        '/customers/summary',
        undefined,
        params
      );

      if (response.success && response.data) {
        setCustomerOverview(response.data);
      }
    } catch (error: any) {
      toast({
        title: '统计加载失败',
        description: error.message || '客户概览统计加载失败',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch customer interactions
  const fetchInteractions = async (customerId: number) => {
    try {
      const response = await apiRequestRaw(
        'GET',
        `/customers/${customerId}/interactions`
      );

      if (response.success) {
        setInteractions(response.data || []);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: '互动记录加载失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, [searchQuery, statusFilter, levelFilter, assignedToFilter, staleDaysFilter, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomerOverview();
  }, [searchQuery, statusFilter, levelFilter, assignedToFilter, staleDaysFilter]);

  useEffect(() => {
    setCustomerSearchInputValue(urlSearchParams.get('search') || '');
    setStatusFilter(urlSearchParams.get('status') || '');
    setLevelFilter(urlSearchParams.get('level') || '');
    setAssignedToFilter(urlSearchParams.get('assigned_to') || '');
    setStaleDaysFilter(urlSearchParams.get('stale_days') || '');
  }, [urlSearchParams, setCustomerSearchInputValue]);

  useEffect(() => {
    const targetCustomerId = localStorage.getItem(TEAM_DETAIL_TARGET_CUSTOMER_KEY);
    if (!targetCustomerId) return;

    const openTargetCustomer = async () => {
      try {
        const response = await apiRequestRaw<Customer>('GET', `/customers/${targetCustomerId}`);
        if (response.success && response.data) {
          await handleViewDetails(response.data);
        }
      } catch (error) {
        console.error('Failed to open target customer from team workspace:', error);
      } finally {
        localStorage.removeItem(TEAM_DETAIL_TARGET_CUSTOMER_KEY);
      }
    };

    openTargetCustomer();
  }, []);

  useEffect(() => {
    const customerId = Number(urlSearchParams.get('customer_id') || 0);
    if (!customerId || openedCustomerFromQueryRef.current === customerId) {
      return;
    }

    const openCustomerFromQuery = async () => {
      try {
        const response = await apiRequestRaw<Customer>('GET', `/customers/${customerId}`);
        if (response.success && response.data) {
          openedCustomerFromQueryRef.current = customerId;
          await handleViewDetails(response.data);
        }
      } catch (error) {
        console.error('Failed to open customer from query params:', error);
      }
    };

    openCustomerFromQuery();
  }, [urlSearchParams]);

  const handleSortToggle = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(column);
    setSortOrder(column === 'created_at' ? 'desc' : 'asc');
  };

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditingCustomer({ ...customer });
    await fetchInteractions(customer.id);
    onDetailOpen();
  };

  const handleQuickAddInteraction = (customer: Customer) => {
    setInteractionEntrySource('list');
    setSelectedCustomer(customer);
    setInteractionDraft(null);
    onInteractionOpen();
  };

  const handleAddInteractionFromDetails = () => {
    setInteractionEntrySource('details');
    setInteractionDraft(null);
    onDetailClose();
    onInteractionOpen();
  };

  const handleApplyInteractionDraft = (draft: Partial<InteractionFormData>) => {
    setInteractionEntrySource('details');
    setInteractionDraft(draft);
    onDetailClose();
    onInteractionOpen();
  };

  const handleCloseInteractionModal = () => {
    onInteractionClose();
    if (interactionEntrySource === 'details') {
      onDetailOpen();
    }
  };

  const handleCreateCustomer = async (data: Partial<Customer>) => {
    try {
      const response = await apiRequestRaw('POST', '/customers', data);

      if (response.success) {
        toast({
          title: '创建成功',
          description: '客户已创建',
          status: 'success',
          isClosable: true,
        });
        onCreateClose();
        fetchCustomers(1);
      }
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '客户创建失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer || !editingCustomer) return;

    try {
      const response = await apiRequestRaw(
        'PUT',
        `/customers/${selectedCustomer.id}`,
        editingCustomer
      );

      if (response.success) {
        toast({
          title: '更新成功',
          description: '客户信息已更新',
          status: 'success',
          isClosable: true,
        });
        onDetailClose();
        fetchCustomers(currentPage);
      }
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '客户信息更新失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleDeleteCustomer = async (customerId: number) => {
    if (!confirm('确认删除这个客户吗？')) return;

    try {
      const response = await apiRequestRaw('DELETE', `/customers/${customerId}`);

      if (response.success) {
        toast({
          title: '删除成功',
          description: '客户已删除',
          status: 'success',
          isClosable: true,
        });
        onDetailClose();
        fetchCustomers(1);
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '客户删除失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleAddInteraction = async (formData: InteractionFormData) => {
    if (!selectedCustomer) return;

    try {
      const response = await apiRequestRaw(
        'POST',
        `/customers/${selectedCustomer.id}/interactions`,
        formData
      );

      if (response.success) {
        toast({
          title: '记录成功',
          description: '互动记录已添加',
          status: 'success',
          isClosable: true,
        });
        await fetchCustomers(currentPage);
        onInteractionClose();
        await fetchInteractions(selectedCustomer.id);
        if (interactionEntrySource === 'details') {
          onDetailOpen();
        }
        return true;
      }
    } catch (error: any) {
      toast({
        title: '记录失败',
        description: error.message || '添加互动记录失败',
        status: 'error',
        isClosable: true,
      });
    }

    return false;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'blue',
      prospect: 'purple',
      customer: 'green',
      inactive: 'gray',
    };
    return colors[status] || 'gray';
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      VIP: 'gold',
      Premium: 'purple',
      Standard: 'gray',
    };
    return colors[level] || 'gray';
  };

  const statusItems = Object.entries(customerOverview.by_status).sort((a, b) => b[1] - a[1]);
  const maxStatusValue = Math.max(...statusItems.map(([, value]) => value), 1);
  const levelItems = ['VIP', 'Premium', 'Standard']
    .map((level) => ({
      key: level,
      label: customerLevelLabelMap[level] || level,
      count: customerOverview.by_level[level] || 0,
      colorScheme: getLevelColor(level),
    }))
    .filter((item) => item.count > 0);
  const canCreateCustomer = hasPermission('customers:create');
  const canUpdateCustomer = hasPermission('customers:update');
  const canDeleteCustomer = hasRole('admin');
  const canAddInteraction = canUpdateCustomer;

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box>
        <HStack justify="space-between" mb={6}>
          <Text fontSize="2xl" fontWeight="bold">
            客户管理
          </Text>
          <Button
            colorScheme="blue"
            onClick={onCreateOpen}
            isDisabled={!user || !canCreateCustomer}
          >
            + 新建客户
          </Button>
        </HStack>

        {aiSource && (
          <Alert status="info" borderRadius="20px" mb={5} bg="blue.50" color="gray.700">
            <AlertIcon color="brand.500" />
            <Box>
              <AlertTitle fontSize="sm">已应用智能助手结果</AlertTitle>
              <AlertDescription fontSize="sm">
                当前页面已根据智能助手请求自动带入客户筛选
                {aiIntent === 'get_customer_interactions'
                  ? '，并尝试直接打开目标客户详情。'
                  : staleDaysFilter
                    ? `，当前仅展示最近 ${staleDaysFilter} 天未跟进的客户。`
                    : '。'}
              </AlertDescription>
            </Box>
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={5} alignItems="stretch">
          <Card bg="rgba(255,255,255,0.94)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)" h="100%">
            <CardBody minH="184px" display="flex" flexDirection="column">
              <Text fontSize="sm" color="gray.500">当前视图客户数</Text>
              <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                {summaryLoading ? '...' : customerOverview.total}
              </Text>
              <Text mt="auto" pt={3} fontSize="sm" color="gray.600">
                当前筛选条件下匹配到的客户总量，本页展示 {customers.length} / {totalCustomers || customerOverview.total} 条
              </Text>
            </CardBody>
          </Card>
          <Card bg="rgba(255,255,255,0.94)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)" h="100%">
            <CardBody minH="184px" display="flex" flexDirection="column">
              <Text fontSize="sm" color="gray.500">企业客户占比</Text>
              <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                {customerOverview.total ? Math.round((customerOverview.with_company / customerOverview.total) * 100) : 0}%
              </Text>
              <Text mt="auto" pt={3} fontSize="sm" color="gray.600">
                填写了公司信息的客户 {customerOverview.with_company} 个
              </Text>
            </CardBody>
          </Card>
          <Card bg="rgba(255,255,255,0.94)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)" h="100%">
            <CardBody minH="184px" display="flex" flexDirection="column">
              <Text fontSize="sm" color="gray.500">客户等级分布</Text>
              <Wrap spacing={3} mt={3}>
                {levelItems.length > 0 ? (
                  levelItems.map((item) => (
                    <WrapItem key={item.key}>
                      <HStack
                        spacing={3}
                        px={3}
                        py={2}
                        borderRadius="18px"
                        bg="rgba(240, 246, 255, 0.9)"
                        border="1px solid rgba(47,128,237,0.08)"
                      >
                        <Badge colorScheme={item.colorScheme} whiteSpace="nowrap" px={3} py={1} borderRadius="full">
                          {item.label}
                        </Badge>
                        <Text fontSize="lg" fontWeight="800" color="gray.800" whiteSpace="nowrap">
                          {item.count} 个
                        </Text>
                      </HStack>
                    </WrapItem>
                  ))
                ) : (
                  <Text fontSize="sm" color="gray.500">当前筛选结果中暂无等级数据</Text>
                )}
              </Wrap>
              <Text mt="auto" pt={3} fontSize="sm" color="gray.600">
                直接查看当前筛选结果中各等级客户数量，便于判断客户池结构
              </Text>
            </CardBody>
          </Card>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={5} alignItems="stretch">
          <Card bg="linear-gradient(135deg, rgba(32, 174, 164, 0.14), rgba(255,255,255,0.96))" borderRadius="24px" boxShadow="0 16px 36px rgba(34, 104, 110, 0.10)" h="100%">
            <CardBody minH="172px" display="flex" flexDirection="column">
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">已建立跟进的客户</Text>
                  <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                    {customerOverview.follow_up.covered}
                  </Text>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    当前筛选范围内至少已有 1 条互动记录的客户数量
                  </Text>
                </Box>
                <Box p={3} borderRadius="20px" bg="whiteAlpha.700">
                  <FiActivity />
                </Box>
              </HStack>
            </CardBody>
          </Card>
          <Card bg="linear-gradient(135deg, rgba(240, 178, 74, 0.15), rgba(255,255,255,0.96))" borderRadius="24px" boxShadow="0 16px 36px rgba(135, 92, 19, 0.10)" h="100%">
            <CardBody minH="172px" display="flex" flexDirection="column">
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">72 小时内有跟进</Text>
                  <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                    {customerOverview.follow_up.recent}
                  </Text>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    以每个客户最近一次互动时间为准识别近期推进节奏
                  </Text>
                </Box>
                <Box p={3} borderRadius="20px" bg="whiteAlpha.700">
                  <FiClock />
                </Box>
              </HStack>
            </CardBody>
          </Card>
          <Card bg="linear-gradient(135deg, rgba(81, 166, 97, 0.16), rgba(255,255,255,0.96))" borderRadius="24px" boxShadow="0 16px 36px rgba(58, 110, 68, 0.10)" h="100%">
            <CardBody minH="172px" display="flex" flexDirection="column">
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">已写明下一步动作</Text>
                  <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                    {customerOverview.follow_up.with_next_action}
                  </Text>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    以每个客户最新互动中的下一步动作字段为准
                  </Text>
                </Box>
                <Box p={3} borderRadius="20px" bg="whiteAlpha.700">
                  <FiCheckCircle />
                </Box>
              </HStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Card bg="rgba(255,255,255,0.94)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)" mb={5}>
          <CardBody>
            <HStack justify="space-between" mb={3}>
              <Box>
                <Text fontSize="md" fontWeight="700" color="gray.800">客户状态概览</Text>
                <Text fontSize="sm" color="gray.500">用更直观的方式看当前客户池结构</Text>
              </Box>
            </HStack>
            {statusItems.length === 0 ? (
              <Text color="gray.500">暂无客户状态数据</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {statusItems.map(([status, count]) => (
                  <Box key={status}>
                    <HStack justify="space-between" mb={1.5}>
                      <Text fontSize="sm" color="gray.700">{customerStatusLabelMap[status] || status}</Text>
                      <Text fontSize="sm" fontWeight="700" color="gray.800">{count}</Text>
                    </HStack>
                    <Progress
                      value={(count / maxStatusValue) * 100}
                      colorScheme={getStatusColor(status)}
                      borderRadius="full"
                      bg="gray.100"
                    />
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </CardBody>
        </Card>

        {/* Filters and Search */}
        <HStack spacing={4} mb={6} wrap="wrap" justify="space-between" align="start">
          <HStack spacing={4} wrap="wrap" flex="1">
            <Input
              placeholder="按姓名、邮箱或公司搜索"
              {...customerSearchInputProps}
              width="300px"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              width="150px"
            >
              <option value="">全部状态</option>
              <option value="lead">{customerStatusLabelMap.lead}</option>
              <option value="prospect">{customerStatusLabelMap.prospect}</option>
              <option value="customer">{customerStatusLabelMap.customer}</option>
              <option value="inactive">{customerStatusLabelMap.inactive}</option>
            </Select>
            <Select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              width="150px"
            >
              <option value="">全部等级</option>
              <option value="VIP">重点</option>
              <option value="Premium">高价值</option>
              <option value="Standard">标准</option>
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

        {/* Customers Table */}
        {customersLoading && customers.length === 0 ? (
          <Box display="flex" justifyContent="center" py={10}>
            <Spinner />
          </Box>
        ) : customers.length === 0 ? (
          <Box p={6} textAlign="center" bg="gray.50" borderRadius="md">
            <Text color="gray.600">暂无客户数据</Text>
          </Box>
        ) : (
          <Box position="relative">
            {customersLoading && (
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
                <Text>正在刷新客户列表...</Text>
                <Spinner size="sm" color="blue.500" />
              </HStack>
            )}
            <Box
              overflowX="hidden"
              opacity={customersLoading ? 0.72 : 1}
              transition="opacity 0.18s ease"
            >
              <Table
                variant="simple"
                size={tableDensity === 'comfortable' ? 'md' : 'sm'}
                sx={{
                  tableLayout: 'fixed',
                  width: '100%',
                  th: { px: 2.5 },
                  td: { px: 2.5 },
                }}
              >
                <colgroup>
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <Thead>
                  <Tr>
                    <SortableTh label="姓名" column="first_name" activeSortBy={sortBy} activeSortOrder={sortOrder} onToggle={handleSortToggle} />
                    <SortableTh label="公司" column="company" activeSortBy={sortBy} activeSortOrder={sortOrder} onToggle={handleSortToggle} />
                    <Th whiteSpace="nowrap">负责人</Th>
                    <SortableTh label="状态" column="status" activeSortBy={sortBy} activeSortOrder={sortOrder} onToggle={handleSortToggle} />
                    <SortableTh label="等级" column="customer_level" activeSortBy={sortBy} activeSortOrder={sortOrder} onToggle={handleSortToggle} />
                    <Th whiteSpace="nowrap">跟进动态</Th>
                    <SortableTh label="创建时间" column="created_at" activeSortBy={sortBy} activeSortOrder={sortOrder} onToggle={handleSortToggle} />
                    <Th whiteSpace="nowrap">操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {customers.map((customer) => (
                    <Tr key={customer.id} _hover={{ bg: 'gray.50' }}>
                      <Td fontWeight="500">
                        <Text fontWeight="700" color="gray.800" noOfLines={2} title={`${customer.first_name} ${customer.last_name}`}>
                          {customer.first_name} {customer.last_name}
                        </Text>
                      </Td>
                      <Td>
                        <Text noOfLines={2} title={customer.company || '-'}>
                          {customer.company || '-'}
                        </Text>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0.5}>
                          <Text fontSize="sm" fontWeight="600" color="gray.700" noOfLines={1} wordBreak="keep-all" title={customer.assigned_sales_rep_name || '未分配'}>
                            {customer.assigned_sales_rep_name || '未分配'}
                          </Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={1} wordBreak="keep-all" title={customer.assigned_sales_team_name || '未分组'}>
                            {customer.assigned_sales_team_name || '未分组'}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(customer.status)} whiteSpace="nowrap">
                          {customerStatusLabelMap[customer.status] || customer.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={getLevelColor(customer.customer_level)} whiteSpace="nowrap">
                          {customerLevelLabelMap[customer.customer_level] || customer.customer_level}
                        </Badge>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1.5}>
                          <Wrap spacing={1.5}>
                            <WrapItem>
                              <Badge colorScheme={customer.interaction_summary?.total_interactions ? 'teal' : 'gray'} whiteSpace="nowrap">
                                {customer.interaction_summary?.total_interactions
                                  ? `${customer.interaction_summary.total_interactions} 次互动`
                                  : '待建立跟进'}
                              </Badge>
                            </WrapItem>
                            {customer.interaction_summary?.last_interaction_type && (
                              <WrapItem>
                                <Badge colorScheme="blue" whiteSpace="nowrap">
                                  {interactionTypeLabelMap[customer.interaction_summary.last_interaction_type] || customer.interaction_summary.last_interaction_type}
                                </Badge>
                              </WrapItem>
                            )}
                            {customer.interaction_summary?.last_outcome && (
                              <WrapItem>
                                <Badge colorScheme={customer.interaction_summary.last_outcome === 'positive' ? 'green' : customer.interaction_summary.last_outcome === 'negative' ? 'red' : 'orange'} whiteSpace="nowrap">
                                  {outcomeLabelMap[customer.interaction_summary.last_outcome] || customer.interaction_summary.last_outcome}
                                </Badge>
                              </WrapItem>
                            )}
                          </Wrap>
                          {customer.interaction_summary?.last_interaction_subject ? (
                            <>
                              <Text fontSize="sm" fontWeight="700" color="gray.700" noOfLines={1} title={customer.interaction_summary.last_interaction_subject}>
                                {customer.interaction_summary.last_interaction_subject}
                              </Text>
                              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                                最近跟进：{new Date(customer.interaction_summary.last_interaction_at || '').toLocaleString()}
                              </Text>
                              {customer.interaction_summary.next_follow_up_at && (
                                <Text fontSize="xs" color="blue.600" noOfLines={1}>
                                  下次跟进：{new Date(customer.interaction_summary.next_follow_up_at).toLocaleString()}
                                  {customer.interaction_summary.reminder_status
                                    ? ` · ${reminderStatusLabelMap[customer.interaction_summary.reminder_status] || customer.interaction_summary.reminder_status}`
                                    : ''}
                                </Text>
                              )}
                              <Text fontSize="xs" color="gray.600" noOfLines={1} title={customer.interaction_summary.next_action || '建议尽快补充下一步动作'}>
                                下一步：{customer.interaction_summary.next_action || '建议尽快补充下一步动作'}
                              </Text>
                            </>
                          ) : (
                            <Text fontSize="xs" color="gray.500" noOfLines={2}>
                              还没有互动记录，建议先补一条首次触达或需求确认。
                            </Text>
                          )}
                        </VStack>
                      </Td>
                      <Td fontSize="sm" textAlign="right">
                        <Text whiteSpace="nowrap">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </Text>
                      </Td>
                      <Td textAlign="right">
                        <VStack align="end" spacing={1}>
                          <Button
                            size="xs"
                            colorScheme="teal"
                            variant="solid"
                            minW="56px"
                            height="28px"
                            onClick={() => handleQuickAddInteraction(customer)}
                            isDisabled={!canAddInteraction}
                            px={2}
                          >
                            跟进
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="blue"
                            variant="ghost"
                            minW="56px"
                            height="24px"
                            onClick={() => handleViewDetails(customer)}
                            px={2}
                          >
                            查看
                          </Button>
                        </VStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            {customersLoading && (
              <ListRefreshingOverlay
                columns={7}
                getColumnFlex={(columnIndex) => (columnIndex === 5 ? 2 : columnIndex === 1 ? 1.2 : columnIndex === 2 ? 1.1 : 1)}
              />
            )}
          </Box>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <HStack justify="center" mt={6} spacing={2}>
            <Button
              onClick={() => fetchCustomers(Math.max(1, currentPage - 1))}
              isDisabled={currentPage === 1}
            >
              上一页
            </Button>
            <Text>
              第 {currentPage} / {totalPages} 页
            </Text>
            <Button
              onClick={() => fetchCustomers(Math.min(totalPages, currentPage + 1))}
              isDisabled={currentPage === totalPages}
            >
              下一页
            </Button>
          </HStack>
        )}
      </Box>

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onSubmit={handleCreateCustomer}
      />

      {/* Customer Details Modal */}
      {selectedCustomer && editingCustomer && (
        <CustomerDetailsModal
          isOpen={isDetailOpen}
          onClose={onDetailClose}
          customer={selectedCustomer}
          editingCustomer={editingCustomer}
          interactions={interactions}
          canUpdateCustomer={canUpdateCustomer}
          canDeleteCustomer={canDeleteCustomer}
          onUpdate={handleUpdateCustomer}
          onDelete={() => handleDeleteCustomer(selectedCustomer.id)}
          onAddInteraction={handleAddInteractionFromDetails}
          onApplyInteractionDraft={handleApplyInteractionDraft}
          onEditingChange={setEditingCustomer}
        />
      )}

      {/* Add Interaction Modal */}
      {selectedCustomer && (
        <AddInteractionModal
          isOpen={isInteractionOpen}
          onClose={handleCloseInteractionModal}
          onSubmit={handleAddInteraction}
          customer={selectedCustomer}
          initialDraft={interactionDraft}
        />
      )}
    </VStack>
  );
};

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Customer>) => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    status: 'lead',
    customer_level: 'Standard',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    setFormData({ status: 'lead', customer_level: 'Standard' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>新建客户</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>名</FormLabel>
              <Input
                placeholder="请输入名字"
                value={formData.first_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>姓</FormLabel>
              <Input
                placeholder="请输入姓氏"
                value={formData.last_name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>邮箱</FormLabel>
              <Input
                type="email"
                placeholder="请输入邮箱"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>公司</FormLabel>
              <Input
                placeholder="请输入公司名称"
                value={formData.company || ''}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>电话</FormLabel>
              <Input
                placeholder="请输入电话号码"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>状态</FormLabel>
              <Select
                value={formData.status || 'lead'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="lead">{customerStatusLabelMap.lead}</option>
                <option value="prospect">{customerStatusLabelMap.prospect}</option>
                <option value="customer">{customerStatusLabelMap.customer}</option>
                <option value="inactive">{customerStatusLabelMap.inactive}</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>客户等级</FormLabel>
              <Select
                value={formData.customer_level || 'Standard'}
                onChange={(e) =>
                  setFormData({ ...formData, customer_level: e.target.value })
                }
              >
                <option value="VIP">重点</option>
                <option value="Premium">高价值</option>
                <option value="Standard">标准</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>备注</FormLabel>
              <Textarea
                placeholder="补充客户背景、需求和跟进备注"
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
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={loading}
          >
            创建
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  editingCustomer: Partial<Customer>;
  interactions: Interaction[];
  canUpdateCustomer: boolean;
  canDeleteCustomer: boolean;
  onUpdate: () => void;
  onDelete: () => void;
  onAddInteraction: () => void;
  onApplyInteractionDraft: (draft: Partial<InteractionFormData>) => void;
  onEditingChange: (data: Partial<Customer>) => void;
}

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  editingCustomer,
  interactions,
  canUpdateCustomer,
  canDeleteCustomer,
  onUpdate,
  onDelete,
  onAddInteraction,
  onApplyInteractionDraft,
  onEditingChange,
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [updatingLoading, setUpdatingLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantResult, setAssistantResult] = useState<AiAssistantResponse | null>(null);

  useEffect(() => {
    setAssistantLoading(false);
    setAssistantError('');
    setAssistantPrompt('');
    setAssistantResult(null);
  }, [customer.id]);

  const handleSave = async () => {
    setUpdatingLoading(true);
    await onUpdate();
    setUpdatingLoading(false);
    setIsEditing(false);
  };

  const runAssistant = async (message: string) => {
    try {
      setAssistantLoading(true);
      setAssistantError('');
      const response = await aiApi.assist({
        message,
        context: {
          page: '/customers',
          customer_id: customer.id,
        },
      });
      setAssistantResult(response);
    } catch (error: any) {
      const message = error.message || '智能助手请求失败';
      setAssistantError(message);
      toast({
        title: '智能助手暂时不可用',
        description: message,
        status: 'error',
        duration: 3200,
        isClosable: true,
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleAssistantSubmit = async () => {
    const content = assistantPrompt.trim();
    if (!content) {
      toast({
        title: '请输入问题',
        description: '可以直接问“查看最近互动”或“生成下一步建议”。',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    await runAssistant(content);
  };

  const openAssistantWorkspace = () => {
    onClose();
    navigate('/assistant');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          客户详情：{customer.first_name} {customer.last_name}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList mb={4}>
              <Tab>基本信息</Tab>
              <Tab>互动记录（{interactions.length}）</Tab>
              <Tab>智能助手</Tab>
            </TabList>

            <TabPanels>
              {/* Information Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {isEditing ? (
                    <>
                      <FormControl>
                        <FormLabel>名</FormLabel>
                        <Input
                          value={editingCustomer.first_name || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              first_name: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>姓</FormLabel>
                        <Input
                          value={editingCustomer.last_name || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              last_name: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>邮箱</FormLabel>
                        <Input
                          value={editingCustomer.email || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              email: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>公司</FormLabel>
                        <Input
                          value={editingCustomer.company || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              company: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>电话</FormLabel>
                        <Input
                          value={editingCustomer.phone || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              phone: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>状态</FormLabel>
                        <Select
                          value={editingCustomer.status || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              status: e.target.value,
                            })
                          }
                        >
                          <option value="lead">{customerStatusLabelMap.lead}</option>
                          <option value="prospect">{customerStatusLabelMap.prospect}</option>
                          <option value="customer">{customerStatusLabelMap.customer}</option>
                          <option value="inactive">{customerStatusLabelMap.inactive}</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>客户等级</FormLabel>
                        <Select
                          value={editingCustomer.customer_level || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              customer_level: e.target.value,
                            })
                          }
                        >
                          <option value="VIP">重点</option>
                          <option value="Premium">高价值</option>
                          <option value="Standard">标准</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>备注</FormLabel>
                        <Textarea
                          value={editingCustomer.notes || ''}
                          onChange={(e) =>
                            onEditingChange({
                              ...editingCustomer,
                              notes: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                    </>
                  ) : (
                    <>
                      <Box>
                        <Text fontWeight="bold">邮箱</Text>
                        <Text>{customer.email}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">电话</Text>
                        <Text>{customer.phone || '暂无'}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">公司</Text>
                        <Text>{customer.company || '暂无'}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">状态</Text>
                        <Badge colorScheme="blue">{customerStatusLabelMap[customer.status] || customer.status}</Badge>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">客户等级</Text>
                        <Badge colorScheme="purple">
                          {customerLevelLabelMap[customer.customer_level] || customer.customer_level}
                        </Badge>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">备注</Text>
                        <Text>{customer.notes || '暂无备注'}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">创建时间</Text>
                        <Text fontSize="sm">
                          {new Date(customer.created_at).toLocaleString()}
                        </Text>
                      </Box>
                    </>
                  )}
                </VStack>
              </TabPanel>

              {/* Interactions Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Button
                    colorScheme="blue"
                    size="sm"
                    onClick={onAddInteraction}
                    isDisabled={!canUpdateCustomer}
                  >
                    + 新增互动
                  </Button>
                  {interactions.length === 0 ? (
                    <Box textAlign="center" py={6}>
                      <Text color="gray.500">暂无互动记录</Text>
                    </Box>
                  ) : (
                    interactions.map((interaction) => (
                      <Box
                        key={interaction.id}
                        p={4}
                        border="1px solid"
                        borderColor="rgba(183, 132, 70, 0.14)"
                        borderRadius="18px"
                        bg="rgba(255,255,255,0.72)"
                      >
                        <HStack justify="space-between" mb={2}>
                          <HStack spacing={2}>
                            <Badge colorScheme="blue">
                              {interactionTypeLabelMap[interaction.interaction_type] || interaction.interaction_type}
                            </Badge>
                            {interaction.outcome && (
                              <Badge colorScheme={interaction.outcome === 'positive' ? 'green' : interaction.outcome === 'negative' ? 'red' : 'orange'}>
                                {outcomeLabelMap[interaction.outcome] || interaction.outcome}
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" color="gray.500">
                            {new Date(interaction.date).toLocaleString()}
                          </Text>
                        </HStack>
                        <Wrap spacing={2} mb={2}>
                          {interaction.owner_name && (
                            <WrapItem>
                              <Badge colorScheme="cyan">负责人：{interaction.owner_name}</Badge>
                            </WrapItem>
                          )}
                          {interaction.next_follow_up_at && (
                            <WrapItem>
                              <Badge colorScheme="purple">
                                下次跟进：{new Date(interaction.next_follow_up_at).toLocaleString()}
                              </Badge>
                            </WrapItem>
                          )}
                          {interaction.reminder_status && (
                            <WrapItem>
                              <Badge colorScheme={interaction.reminder_status === 'completed' ? 'green' : interaction.reminder_status === 'snoozed' ? 'orange' : 'blue'}>
                                {reminderStatusLabelMap[interaction.reminder_status] || interaction.reminder_status}
                              </Badge>
                            </WrapItem>
                          )}
                        </Wrap>
                        <Text fontWeight="500">{interaction.subject}</Text>
                        {interaction.description && (
                          <Text fontSize="sm" color="gray.600" mt={2}>
                            {interaction.description}
                          </Text>
                        )}
                        {interaction.next_action && (
                          <Text fontSize="sm" color="gray.600" mt={2}>
                            下一步：{interaction.next_action}
                          </Text>
                        )}
                      </Box>
                    ))
                  )}
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Alert status="info" borderRadius="18px" bg="blue.50">
                    <AlertIcon color="brand.500" />
                    <AlertDescription fontSize="sm" color="gray.700">
                      当前问题会自动带入这位客户的上下文，你不用重复输入客户姓名。
                    </AlertDescription>
                  </Alert>

                  <HStack spacing={3} wrap="wrap">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => runAssistant('查看最近互动')}
                      isLoading={assistantLoading}
                    >
                      查看最近互动
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="teal"
                      variant="outline"
                      onClick={() => runAssistant('给这个客户生成下一步建议')}
                      isLoading={assistantLoading}
                    >
                      生成下一步建议
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      variant="outline"
                      onClick={() => runAssistant('给这个客户生成互动记录草稿')}
                      isLoading={assistantLoading}
                    >
                      生成互动草稿
                    </Button>
                    <Button size="sm" variant="ghost" onClick={openAssistantWorkspace}>
                      打开完整智能助手
                    </Button>
                  </HStack>

                  <HStack align="start">
                    <Input
                      placeholder="继续追问，例如：查看最近互动，或生成下一步建议"
                      value={assistantPrompt}
                      onChange={(event) => setAssistantPrompt(event.target.value)}
                    />
                    <Button
                      colorScheme="blue"
                      onClick={handleAssistantSubmit}
                      isLoading={assistantLoading}
                    >
                      提问
                    </Button>
                  </HStack>

                  {assistantError && (
                    <Alert status="error" borderRadius="18px">
                      <AlertIcon />
                      <AlertDescription>{assistantError}</AlertDescription>
                    </Alert>
                  )}

                  {assistantResult && (
                    <VStack align="stretch" spacing={4}>
                      <Box
                        p={4}
                        borderRadius="18px"
                        bg="rgba(240, 246, 255, 0.95)"
                        border="1px solid rgba(47,128,237,0.12)"
                      >
                        <Text fontSize="sm" color="gray.500">
                          AI 摘要
                        </Text>
                        <Text mt={2} fontWeight="700" color="gray.800">
                          {assistantResult.summary}
                        </Text>
                      </Box>

                      {assistantResult.cards.length > 0 && (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                          {assistantResult.cards.map((card, index) => (
                            <Box
                              key={`${card.title}-${index}`}
                              p={4}
                              borderRadius="18px"
                              bg="white"
                              border="1px solid rgba(47,128,237,0.1)"
                            >
                              <Text fontSize="sm" color="gray.500">
                                {card.title}
                              </Text>
                              <Text mt={2} fontSize="xl" fontWeight="800" color="brand.700">
                                {String(card.value)}
                              </Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      )}

                      {assistantResult.items.length > 0 && (
                        <VStack align="stretch" spacing={3}>
                          {assistantResult.items.map((item, index) => (
                            <Box
                              key={item.id || `${assistantResult.intent}-${index}`}
                              p={4}
                              borderRadius="18px"
                              bg="white"
                              border="1px solid rgba(47,128,237,0.1)"
                            >
                              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                {Object.entries(item).map(([key, value]) => {
                                  if (value === undefined || value === null || value === '') {
                                    return null;
                                  }

                                  return (
                                    <Box key={key}>
                                      <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                                        {assistantFieldLabelMap[key] || key}
                                      </Text>
                                      <Text mt={1} fontWeight="600" color="gray.800">
                                        {String(value)}
                                      </Text>
                                    </Box>
                                  );
                                })}
                              </SimpleGrid>
                            </Box>
                          ))}
                        </VStack>
                      )}

                      {assistantResult.draft && (
                        <Button
                          alignSelf="flex-start"
                          colorScheme="blue"
                          onClick={() => onApplyInteractionDraft(assistantResult.draft as Partial<InteractionFormData>)}
                          isDisabled={!canUpdateCustomer}
                        >
                          填入互动表单并确认
                        </Button>
                      )}
                    </VStack>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                mr={3}
                onClick={() => setIsEditing(false)}
              >
                取消
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={updatingLoading}
              >
                保存修改
              </Button>
            </>
          ) : (
            <>
              <Button
                colorScheme="red"
                variant="ghost"
                mr={3}
                onClick={onDelete}
                isDisabled={!canDeleteCustomer}
              >
                删除
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => setIsEditing(true)}
                isDisabled={!canUpdateCustomer}
              >
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

interface AddInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InteractionFormData) => Promise<boolean | void>;
  customer: Customer;
  initialDraft?: Partial<InteractionFormData> | null;
}

const AddInteractionModal: React.FC<AddInteractionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customer,
  initialDraft,
}) => {
  const getDefaultFormData = (): InteractionFormData => ({
    interaction_type: 'email',
    subject: '',
    description: '',
    outcome: 'positive',
    next_action: '',
    duration_minutes: '',
    date: new Date().toISOString().slice(0, 16),
    next_follow_up_at: '',
    reminder_status: 'pending',
  });
  const [formData, setFormData] = useState<InteractionFormData>(getDefaultFormData());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const base = getDefaultFormData();
    setFormData({
      ...base,
      ...(initialDraft || {}),
      date: initialDraft?.date || base.date,
      next_follow_up_at: initialDraft?.next_follow_up_at || '',
    });
  }, [initialDraft, isOpen]);

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      alert('请输入互动主题');
      return;
    }

    setLoading(true);
    const success = await onSubmit(formData);
    setLoading(false);
    if (success) {
      setFormData(getDefaultFormData());
      onClose();
    }
  };

  const formContent = (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="20px" bg="rgba(59, 130, 246, 0.08)">
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">把这次跟进记录完整一点</AlertTitle>
          <AlertDescription fontSize="sm">
            建议至少填写主题、结果和下一步动作，后续列表里就能直接看到推进节奏。
          </AlertDescription>
        </Box>
      </Alert>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel>互动类型</FormLabel>
          <Select
            value={formData.interaction_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                interaction_type: e.target.value,
              })
            }
          >
            <option value="email">邮件</option>
            <option value="call">电话</option>
            <option value="meeting">会议</option>
            <option value="note">备注</option>
            <option value="other">其他</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>互动时间</FormLabel>
          <Input
            type="datetime-local"
            value={formData.date || ''}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
          />
        </FormControl>
      </SimpleGrid>
      <FormControl isRequired>
        <FormLabel>主题</FormLabel>
        <Input
          placeholder="例如：首次电话沟通预算范围"
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
        />
      </FormControl>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>结果判断</FormLabel>
          <Select
            value={formData.outcome}
            onChange={(e) =>
              setFormData({ ...formData, outcome: e.target.value })
            }
          >
            <option value="positive">积极</option>
            <option value="neutral">中性</option>
            <option value="negative">消极</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>时长（分钟）</FormLabel>
          <Input
            type="number"
            min={0}
            placeholder="可选"
            value={formData.duration_minutes}
            onChange={(e) =>
              setFormData({
                ...formData,
                duration_minutes: e.target.value ? Number(e.target.value) : '',
              })
            }
          />
        </FormControl>
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>下次跟进时间</FormLabel>
          <Input
            type="datetime-local"
            value={formData.next_follow_up_at || ''}
            onChange={(e) =>
              setFormData({ ...formData, next_follow_up_at: e.target.value })
            }
          />
        </FormControl>
        <FormControl>
          <FormLabel>提醒状态</FormLabel>
          <Select
            value={formData.reminder_status || 'pending'}
            onChange={(e) =>
              setFormData({ ...formData, reminder_status: e.target.value })
            }
          >
            <option value="pending">待提醒</option>
            <option value="completed">已完成</option>
            <option value="snoozed">稍后跟进</option>
          </Select>
        </FormControl>
      </SimpleGrid>
      <FormControl>
        <FormLabel>说明</FormLabel>
        <Textarea
          minH="120px"
          placeholder="记录这次互动里客户表达的需求、顾虑、预算或决策信息"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </FormControl>
      <FormControl>
        <FormLabel>下一步动作</FormLabel>
        <Textarea
          minH="88px"
          placeholder="例如：周五前发送方案修订版，并在下周二安排演示"
          value={formData.next_action || ''}
          onChange={(e) =>
            setFormData({ ...formData, next_action: e.target.value })
          }
        />
      </FormControl>
      <Divider />
      <HStack spacing={3} align="start" color="gray.500" fontSize="sm">
        <FiPhoneCall />
        <Text>
          跟进记录会同步进入客户详情页的互动时间线，并带上下次跟进时间与提醒状态，方便后续推进和回看。
        </Text>
      </HStack>
    </VStack>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" motionPreset="slideInBottom">
      <ModalOverlay />
      <ModalContent my={6} maxH="calc(100vh - 3rem)" overflow="hidden">
        <ModalHeader>
          新增互动记录
          <Text mt={1} fontSize="sm" fontWeight="normal" color="gray.500">
            当前客户：{customer.first_name} {customer.last_name}
            {customer.company ? ` · ${customer.company}` : ''}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto" pb={6}>
          {formContent}
        </ModalBody>
        <ModalFooter borderTopWidth="1px" bg="white">
          <Button variant="ghost" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            添加
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Customers;
