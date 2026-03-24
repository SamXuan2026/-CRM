
import React, { useState, useEffect } from 'react';
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
import { FiActivity, FiArrowRight, FiCheckCircle, FiClock, FiMessageCircle, FiPhoneCall } from 'react-icons/fi';
import { apiRequestRaw } from '../services/api';
import { useAuth } from '../hooks/useAuth';

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
}

interface InteractionFormData {
  interaction_type: string;
  subject: string;
  description: string;
  outcome: string;
  next_action?: string;
  duration_minutes?: number | '';
  date?: string;
}

interface InteractionSummary {
  total_interactions: number;
  last_interaction_at?: string | null;
  last_interaction_type?: string | null;
  last_interaction_subject?: string | null;
  last_outcome?: string | null;
  next_action?: string | null;
}

const statusLabelMap: Record<string, string> = {
  lead: '线索',
  prospect: '潜在客户',
  customer: '已成交客户',
  inactive: '沉默客户',
};

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

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
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

  // Fetch customers
  const fetchCustomers = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (levelFilter) params.level = levelFilter;

      const response = await apiRequestRaw(
        'GET',
        '/customers',
        undefined,
        params
      );

      if (response.success) {
        setCustomers(response.data || []);
        setTotalPages(response.pagination?.total_pages || 1);
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
      setLoading(false);
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
  }, [searchQuery, statusFilter, levelFilter, pageSize]);

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditingCustomer({ ...customer });
    await fetchInteractions(customer.id);
    onDetailOpen();
  };

  const handleQuickAddInteraction = (customer: Customer) => {
    setSelectedCustomer(customer);
    onInteractionOpen();
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
        onInteractionClose();
        await fetchInteractions(selectedCustomer.id);
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

  const customerSummary = customers.reduce(
    (acc, customer) => {
      acc.total += 1;
      acc.byStatus[customer.status] = (acc.byStatus[customer.status] || 0) + 1;
      acc.byLevel[customer.customer_level] = (acc.byLevel[customer.customer_level] || 0) + 1;
      if (customer.company) {
        acc.withCompany += 1;
      }
      return acc;
    },
    {
      total: 0,
      withCompany: 0,
      byStatus: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
    }
  );

  const followUpSummary = customers.reduce(
    (acc, customer) => {
      const summary = customer.interaction_summary;
      if (!summary?.total_interactions) {
        acc.missing += 1;
        return acc;
      }

      acc.covered += 1;

      if (summary.last_interaction_at) {
        const diffHours = (Date.now() - new Date(summary.last_interaction_at).getTime()) / (1000 * 60 * 60);
        if (diffHours <= 72) {
          acc.recent += 1;
        }
      }

      if (summary.next_action) {
        acc.withNextAction += 1;
      }

      return acc;
    },
    {
      covered: 0,
      missing: 0,
      recent: 0,
      withNextAction: 0,
    }
  );

  const statusItems = Object.entries(customerSummary.byStatus).sort((a, b) => b[1] - a[1]);
  const maxStatusValue = Math.max(...statusItems.map(([, value]) => value), 1);
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

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={5}>
          <Card bg="rgba(255,255,255,0.94)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
            <CardBody>
              <Text fontSize="sm" color="gray.500">当前视图客户数</Text>
              <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                {customerSummary.total}
              </Text>
              <Text mt={2} fontSize="sm" color="gray.600">
                当前筛选条件下已加载的客户规模
              </Text>
            </CardBody>
          </Card>
          <Card bg="rgba(255,255,255,0.94)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
            <CardBody>
              <Text fontSize="sm" color="gray.500">企业客户占比</Text>
              <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                {customerSummary.total ? Math.round((customerSummary.withCompany / customerSummary.total) * 100) : 0}%
              </Text>
              <Text mt={2} fontSize="sm" color="gray.600">
                填写了公司信息的客户 {customerSummary.withCompany} 个
              </Text>
            </CardBody>
          </Card>
          <Card bg="rgba(255,255,255,0.94)" borderRadius="24px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
            <CardBody>
              <Text fontSize="sm" color="gray.500">客户等级焦点</Text>
              <Text fontSize="xl" fontWeight="800" color="gray.800" mt={2}>
                {Object.entries(customerSummary.byLevel).sort((a, b) => b[1] - a[1])[0]?.[0] || '暂无'}
              </Text>
              <Text mt={2} fontSize="sm" color="gray.600">
                更快识别当前客户池的价值层级
              </Text>
            </CardBody>
          </Card>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={5}>
          <Card bg="linear-gradient(135deg, rgba(32, 174, 164, 0.14), rgba(255,255,255,0.96))" borderRadius="24px" boxShadow="0 16px 36px rgba(34, 104, 110, 0.10)">
            <CardBody>
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">已建立跟进的客户</Text>
                  <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                    {followUpSummary.covered}
                  </Text>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    当前页内已有互动记录的客户数量
                  </Text>
                </Box>
                <Box p={3} borderRadius="20px" bg="whiteAlpha.700">
                  <FiActivity />
                </Box>
              </HStack>
            </CardBody>
          </Card>
          <Card bg="linear-gradient(135deg, rgba(240, 178, 74, 0.15), rgba(255,255,255,0.96))" borderRadius="24px" boxShadow="0 16px 36px rgba(135, 92, 19, 0.10)">
            <CardBody>
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">72 小时内有跟进</Text>
                  <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                    {followUpSummary.recent}
                  </Text>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    用来识别近期仍在推进的客户节奏
                  </Text>
                </Box>
                <Box p={3} borderRadius="20px" bg="whiteAlpha.700">
                  <FiClock />
                </Box>
              </HStack>
            </CardBody>
          </Card>
          <Card bg="linear-gradient(135deg, rgba(81, 166, 97, 0.16), rgba(255,255,255,0.96))" borderRadius="24px" boxShadow="0 16px 36px rgba(58, 110, 68, 0.10)">
            <CardBody>
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.500">已写明下一步动作</Text>
                  <Text fontSize="3xl" fontWeight="800" color="gray.800" mt={2}>
                    {followUpSummary.withNextAction}
                  </Text>
                  <Text mt={2} fontSize="sm" color="gray.600">
                    帮助团队把跟进从记录变成明确动作
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
                      <Text fontSize="sm" color="gray.700">{statusLabelMap[status] || status}</Text>
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
        <HStack spacing={4} mb={6} wrap="wrap">
          <Input
            placeholder="按姓名、邮箱或公司搜索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            width="300px"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            width="150px"
          >
            <option value="">全部状态</option>
            <option value="lead">线索</option>
            <option value="prospect">潜在客户</option>
            <option value="customer">正式客户</option>
            <option value="inactive">未活跃</option>
          </Select>
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            width="150px"
          >
            <option value="">全部等级</option>
            <option value="VIP">VIP</option>
            <option value="Premium">Premium</option>
            <option value="Standard">Standard</option>
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

        {/* Customers Table */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <Spinner />
          </Box>
        ) : customers.length === 0 ? (
          <Box p={6} textAlign="center" bg="gray.50" borderRadius="md">
            <Text color="gray.600">暂无客户数据</Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="gray.100">
                <Tr>
                  <Th>姓名</Th>
                  <Th>邮箱</Th>
                  <Th>公司</Th>
                  <Th>状态</Th>
                  <Th>等级</Th>
                  <Th>跟进动态</Th>
                  <Th>创建时间</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {customers.map((customer) => (
                  <Tr key={customer.id} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="500">
                      {customer.first_name} {customer.last_name}
                    </Td>
                    <Td fontSize="sm">{customer.email}</Td>
                    <Td>{customer.company || '-'}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(customer.status)}>
                        {statusLabelMap[customer.status] || customer.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={getLevelColor(customer.customer_level)}>
                        {customer.customer_level}
                      </Badge>
                    </Td>
                    <Td minW="280px">
                      <VStack align="start" spacing={2}>
                        <Wrap spacing={2}>
                          <WrapItem>
                            <Badge colorScheme={customer.interaction_summary?.total_interactions ? 'teal' : 'gray'}>
                              {customer.interaction_summary?.total_interactions
                                ? `${customer.interaction_summary.total_interactions} 次互动`
                                : '待建立跟进'}
                            </Badge>
                          </WrapItem>
                          {customer.interaction_summary?.last_interaction_type && (
                            <WrapItem>
                              <Badge colorScheme="blue">
                                {interactionTypeLabelMap[customer.interaction_summary.last_interaction_type] || customer.interaction_summary.last_interaction_type}
                              </Badge>
                            </WrapItem>
                          )}
                          {customer.interaction_summary?.last_outcome && (
                            <WrapItem>
                              <Badge colorScheme={customer.interaction_summary.last_outcome === 'positive' ? 'green' : customer.interaction_summary.last_outcome === 'negative' ? 'red' : 'orange'}>
                                {outcomeLabelMap[customer.interaction_summary.last_outcome] || customer.interaction_summary.last_outcome}
                              </Badge>
                            </WrapItem>
                          )}
                        </Wrap>
                        {customer.interaction_summary?.last_interaction_subject ? (
                          <>
                            <Text fontSize="sm" fontWeight="700" color="gray.700" noOfLines={1}>
                              {customer.interaction_summary.last_interaction_subject}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              最近跟进：{new Date(customer.interaction_summary.last_interaction_at || '').toLocaleString()}
                            </Text>
                            <Text fontSize="xs" color="gray.600" noOfLines={2}>
                              下一步：{customer.interaction_summary.next_action || '建议尽快补充下一步动作'}
                            </Text>
                          </>
                        ) : (
                          <Text fontSize="sm" color="gray.500">
                            还没有互动记录，建议先补一条首次触达或需求确认。
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td fontSize="sm">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </Td>
                    <Td>
                      <VStack align="stretch" spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="teal"
                          leftIcon={<FiMessageCircle />}
                          boxShadow="0 8px 18px rgba(31, 150, 143, 0.20)"
                          onClick={() => handleQuickAddInteraction(customer)}
                          isDisabled={!canAddInteraction}
                        >
                          记录跟进
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          rightIcon={<FiArrowRight />}
                          onClick={() => handleViewDetails(customer)}
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
          onAddInteraction={onInteractionOpen}
          onEditingChange={setEditingCustomer}
        />
      )}

      {/* Add Interaction Modal */}
      {selectedCustomer && (
        <AddInteractionModal
          isOpen={isInteractionOpen}
          onClose={onInteractionClose}
          onSubmit={handleAddInteraction}
          customer={selectedCustomer}
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
                <option value="lead">线索</option>
                <option value="prospect">潜在客户</option>
                <option value="customer">正式客户</option>
                <option value="inactive">未活跃</option>
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
                <option value="VIP">VIP</option>
                <option value="Premium">Premium</option>
                <option value="Standard">Standard</option>
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
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [updatingLoading, setUpdatingLoading] = useState(false);

  const handleSave = async () => {
    setUpdatingLoading(true);
    await onUpdate();
    setUpdatingLoading(false);
    setIsEditing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
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
                          <option value="lead">线索</option>
                          <option value="prospect">潜在客户</option>
                          <option value="customer">正式客户</option>
                          <option value="inactive">未活跃</option>
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
                          <option value="VIP">VIP</option>
                          <option value="Premium">Premium</option>
                          <option value="Standard">Standard</option>
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
                        <Badge colorScheme="blue">{statusLabelMap[customer.status] || customer.status}</Badge>
                      </Box>
                      <Box>
                        <Text fontWeight="bold">客户等级</Text>
                        <Badge colorScheme="purple">
                          {customer.customer_level}
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
                        <Text fontWeight="500">{interaction.subject}</Text>
                        {interaction.description && (
                          <Text fontSize="sm" color="gray.600" mt={2}>
                            {interaction.description}
                          </Text>
                        )}
                      </Box>
                    ))
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
}

const AddInteractionModal: React.FC<AddInteractionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customer,
}) => {
  const [formData, setFormData] = useState<InteractionFormData>({
    interaction_type: 'email',
    subject: '',
    description: '',
    outcome: 'positive',
    next_action: '',
    duration_minutes: '',
    date: new Date().toISOString().slice(0, 16),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      alert('请输入互动主题');
      return;
    }

    setLoading(true);
    const success = await onSubmit(formData);
    setLoading(false);
    if (success) {
      setFormData({
        interaction_type: 'email',
        subject: '',
        description: '',
        outcome: 'positive',
        next_action: '',
        duration_minutes: '',
        date: new Date().toISOString().slice(0, 16),
      });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          新增互动记录
          <Text mt={1} fontSize="sm" fontWeight="normal" color="gray.500">
            当前客户：{customer.first_name} {customer.last_name}
            {customer.company ? ` · ${customer.company}` : ''}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
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
                跟进记录会同步进入客户详情页的互动时间线，方便后续继续补充和回看。
              </Text>
            </HStack>
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
            添加
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Customers;
