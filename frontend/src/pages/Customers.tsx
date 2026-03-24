
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
} from '@chakra-ui/react';
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
}

interface Interaction {
  id: number;
  interaction_type: string;
  subject: string;
  description?: string;
  date: string;
  outcome?: string;
}

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
  const { user } = useAuth();
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

  const handleAddInteraction = async (formData: any) => {
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
      }
    } catch (error: any) {
      toast({
        title: '记录失败',
        description: error.message || '添加互动记录失败',
        status: 'error',
        isClosable: true,
      });
    }
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
            isDisabled={!user}
          >
            + 新建客户
          </Button>
        </HStack>

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
                        {customer.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={getLevelColor(customer.customer_level)}>
                        {customer.customer_level}
                      </Badge>
                    </Td>
                    <Td fontSize="sm">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={() => handleViewDetails(customer)}
                      >
                        查看
                      </Button>
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
                        <Badge colorScheme="blue">{customer.status}</Badge>
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
                        borderColor="gray.200"
                        borderRadius="md"
                      >
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="bold">
                            {interaction.interaction_type}
                          </Text>
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
                        {interaction.outcome && (
                          <Badge mt={2} colorScheme="green" fontSize="xs">
                            {interaction.outcome}
                          </Badge>
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
              >
                删除
              </Button>
              <Button
                colorScheme="blue"
                onClick={() => setIsEditing(true)}
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
  onSubmit: (data: any) => void;
}

const AddInteractionModal: React.FC<AddInteractionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    interaction_type: 'email',
    subject: '',
    description: '',
    outcome: 'positive',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      alert('请输入互动主题');
      return;
    }

    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    setFormData({
      interaction_type: 'email',
      subject: '',
      description: '',
      outcome: 'positive',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>新增互动记录</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
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
            <FormControl isRequired>
              <FormLabel>主题</FormLabel>
              <Input
                placeholder="请输入互动主题"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>说明</FormLabel>
              <Textarea
                placeholder="记录本次互动的详细内容"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel>结果</FormLabel>
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
