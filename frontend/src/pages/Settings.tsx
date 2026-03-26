import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Divider,
  Select,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
  Tabs,
  Switch,
  Progress,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiRequestRaw } from '../services/api';

interface TeamRecord {
  id: number;
  name: string;
  description?: string;
  leader_id?: number | null;
  leader_name?: string | null;
  member_count?: number;
  sales_count?: number;
  customer_count?: number;
  opportunity_count?: number;
  order_count?: number;
  won_opportunity_count?: number;
  won_rate?: number;
  order_total_amount?: number;
  recent_interaction_count?: number;
  is_active: boolean;
}

interface UserRecord {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  team_id?: number | null;
  team_name?: string | null;
  is_active: boolean;
}

interface CustomerRecord {
  id: number;
  first_name: string;
  last_name: string;
  company?: string;
  status: string;
  assigned_sales_rep_name?: string | null;
}

interface OpportunityRecord {
  id: number;
  name: string;
  stage: string;
  value: number;
  assigned_to_name?: string | null;
}

interface OrderRecord {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  owner_name?: string | null;
}

interface TeamWorkspaceRecord {
  team: TeamRecord;
  members: UserRecord[];
  customers: CustomerRecord[];
  opportunities: OpportunityRecord[];
  orders: OrderRecord[];
  stage_distribution: Record<string, number>;
  member_metrics: Array<{
    user_id: number;
    user_name: string;
    role: string;
    customer_count: number;
    opportunity_count: number;
    order_count: number;
    opportunity_value: number;
  }>;
  pending_followups: Array<{
    customer_id: number;
    customer_name: string;
    company?: string;
    owner_name?: string | null;
    status: string;
    last_interaction_at?: string | null;
    next_action?: string | null;
  }>;
  recent_interactions: Array<{
    id: number;
    customer_id: number;
    customer_name: string;
    owner_name?: string | null;
    interaction_type: string;
    subject: string;
    outcome?: string | null;
    date: string;
    next_action?: string | null;
  }>;
  order_trend: Array<{
    date: string;
    amount: number;
  }>;
}

const TEAM_DETAIL_TARGET_CUSTOMER_KEY = 'crm_team_detail_target_customer_id';

const roleLabelMap: Record<string, string> = {
  admin: '管理员',
  manager: '经理',
  sales_lead: '销售组长',
  sales: '销售',
  marketing: '营销',
  customer_service: '客服',
};

const roleColorMap: Record<string, string> = {
  admin: 'red',
  manager: 'purple',
  sales_lead: 'blue',
  sales: 'cyan',
  marketing: 'orange',
  customer_service: 'green',
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();
  const toast = useToast();
  const canReadUsers = hasPermission('users:read');
  const canCreateUsers = hasPermission('users:create');
  const canUpdateUsers = hasPermission('users:update');
  const canManageTeams = hasRole(['admin', 'manager']);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);
  const [workspaceTeam, setWorkspaceTeam] = useState<TeamWorkspaceRecord | null>(null);
  const [userForm, setUserForm] = useState<Record<string, any>>({});
  const [teamForm, setTeamForm] = useState<Record<string, any>>({});
  const [savingUser, setSavingUser] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<UserRecord | null>(null);
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceOwnerFilter, setWorkspaceOwnerFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userTeamFilter, setUserTeamFilter] = useState('');

  const {
    isOpen: isUserModalOpen,
    onOpen: onUserModalOpen,
    onClose: onUserModalClose,
  } = useDisclosure();
  const {
    isOpen: isTeamModalOpen,
    onOpen: onTeamModalOpen,
    onClose: onTeamModalClose,
  } = useDisclosure();
  const {
    isOpen: isPasswordModalOpen,
    onOpen: onPasswordModalOpen,
    onClose: onPasswordModalClose,
  } = useDisclosure();
  const {
    isOpen: isWorkspaceModalOpen,
    onOpen: onWorkspaceModalOpen,
    onClose: onWorkspaceModalClose,
  } = useDisclosure();

  const availableRoles = useMemo(() => {
    if (hasRole(['admin', 'manager'])) {
      return ['admin', 'manager', 'sales_lead', 'sales', 'marketing', 'customer_service'];
    }
    if (hasRole('sales_lead')) {
      return ['sales'];
    }
    return [];
  }, [hasRole]);

  const membersByTeam = useMemo(() => {
    const grouped = new Map<number, UserRecord[]>();
    users.forEach((item) => {
      if (!item.team_id) return;
      const current = grouped.get(item.team_id) || [];
      current.push(item);
      grouped.set(item.team_id, current);
    });
    return grouped;
  }, [users]);

  const loadUsers = async () => {
    if (!canReadUsers) return;
    try {
      setUsersLoading(true);
      const response = await apiRequestRaw<UserRecord[]>('GET', '/users', undefined, { per_page: 100, sort_by: 'created_at', sort_order: 'desc' });
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error: any) {
      toast({
        title: '用户加载失败',
        description: error.message || '无法加载用户列表',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTeams = async () => {
    if (!canReadUsers) return;
    try {
      setTeamsLoading(true);
      let response;
      try {
        response = await apiRequestRaw<TeamRecord[]>('GET', '/teams/overview');
      } catch (primaryError: any) {
        if (String(primaryError?.message || '').includes('404')) {
          response = await apiRequestRaw<TeamRecord[]>('GET', '/teams', undefined, { per_page: 100 });
        } else {
          throw primaryError;
        }
      }
      if (response.success) {
        setTeams(response.data || []);
      }
    } catch (error: any) {
      toast({
        title: '销售组加载失败',
        description: error.message || '无法加载销售组列表',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  const openCreateUser = () => {
    setSelectedUser(null);
    setUserForm({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: availableRoles[0] || 'sales',
      team_id: user?.team_id || '',
      is_active: true,
    });
    onUserModalOpen();
  };

  const openEditUser = (targetUser: UserRecord) => {
    setSelectedUser(targetUser);
    setUserForm({
      email: targetUser.email,
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      phone: targetUser.phone || '',
      role: targetUser.role,
      team_id: targetUser.team_id || '',
      is_active: targetUser.is_active,
    });
    onUserModalOpen();
  };

  const openCreateTeam = () => {
    setSelectedTeam(null);
    setTeamForm({
      name: '',
      description: '',
      leader_id: '',
      is_active: true,
    });
    onTeamModalOpen();
  };

  const openEditTeam = (team: TeamRecord) => {
    setSelectedTeam(team);
    setTeamForm({
      name: team.name,
      description: team.description || '',
      leader_id: team.leader_id || '',
      is_active: team.is_active,
    });
    onTeamModalOpen();
  };

  const handleSaveUser = async () => {
    try {
      setSavingUser(true);
      const payload = {
        ...userForm,
        team_id: userForm.team_id === '' ? null : Number(userForm.team_id),
      };

      if (selectedUser) {
        await apiRequestRaw('PUT', `/users/${selectedUser.id}`, payload);
        toast({ title: '用户已更新', status: 'success', isClosable: true });
      } else {
        await apiRequestRaw('POST', '/users', payload);
        toast({ title: '用户已创建', status: 'success', isClosable: true });
      }

      onUserModalClose();
      await Promise.all([loadUsers(), loadTeams()]);
    } catch (error: any) {
      toast({
        title: selectedUser ? '用户更新失败' : '用户创建失败',
        description: error.message || '请检查表单信息',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveTeam = async () => {
    try {
      setSavingTeam(true);
      const payload = {
        ...teamForm,
        leader_id: teamForm.leader_id === '' ? null : Number(teamForm.leader_id),
      };

      if (selectedTeam) {
        await apiRequestRaw('PUT', `/teams/${selectedTeam.id}`, payload);
        toast({ title: '销售组已更新', status: 'success', isClosable: true });
      } else {
        await apiRequestRaw('POST', '/teams', payload);
        toast({ title: '销售组已创建', status: 'success', isClosable: true });
      }

      onTeamModalClose();
      await Promise.all([loadUsers(), loadTeams()]);
    } catch (error: any) {
      toast({
        title: selectedTeam ? '销售组更新失败' : '销售组创建失败',
        description: error.message || '请检查销售组设置',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSavingTeam(false);
    }
  };

  const salesEligibleUsers = users.filter((item) => ['sales', 'sales_lead'].includes(item.role));
  const filteredUsers = users.filter((item) => {
    if (userRoleFilter && item.role !== userRoleFilter) return false;
    if (userTeamFilter) {
      const normalized = item.team_id ? String(item.team_id) : '';
      if (normalized !== userTeamFilter) return false;
    }
    return true;
  });
  const currentRoleLabel = user?.role ? roleLabelMap[user.role] || user.role : '-';

  const openResetPassword = (targetUser: UserRecord) => {
    setPasswordTarget(targetUser);
    setPasswordForm({ old_password: '', new_password: '' });
    onPasswordModalOpen();
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    try {
      setSavingPassword(true);
      await apiRequestRaw('PUT', `/users/${passwordTarget.id}/password`, {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      toast({ title: '密码已更新', status: 'success', isClosable: true });
      onPasswordModalClose();
    } catch (error: any) {
      toast({
        title: '密码更新失败',
        description: error.message || '请检查密码信息',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const openTeamWorkspace = async (team: TeamRecord) => {
    try {
      setWorkspaceLoading(true);
      setWorkspaceTeam(null);
      setWorkspaceOwnerFilter('');
      onWorkspaceModalOpen();
      const response = await apiRequestRaw<TeamWorkspaceRecord>('GET', `/teams/${team.id}/workspace`);
      if (response.success && response.data) {
        setWorkspaceTeam(response.data);
      }
    } catch (error: any) {
      toast({
        title: '团队详情加载失败',
        description: error.message || '无法加载团队详情',
        status: 'error',
        isClosable: true,
      });
      onWorkspaceModalClose();
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const filteredPendingFollowups = useMemo(() => {
    if (!workspaceTeam) return [];
    if (!workspaceOwnerFilter) return workspaceTeam.pending_followups;
    return workspaceTeam.pending_followups.filter((item) => item.owner_name === workspaceOwnerFilter);
  }, [workspaceOwnerFilter, workspaceTeam]);

  const filteredRecentInteractions = useMemo(() => {
    if (!workspaceTeam) return [];
    if (!workspaceOwnerFilter) return workspaceTeam.recent_interactions;
    return workspaceTeam.recent_interactions.filter((item) => item.owner_name === workspaceOwnerFilter);
  }, [workspaceOwnerFilter, workspaceTeam]);

  const maxTrendAmount = useMemo(() => {
    if (!workspaceTeam?.order_trend?.length) return 0;
    return Math.max(...workspaceTeam.order_trend.map((item) => item.amount), 0);
  }, [workspaceTeam]);

  const jumpToCustomerDetail = (customerId: number) => {
    localStorage.setItem(TEAM_DETAIL_TARGET_CUSTOMER_KEY, String(customerId));
    onWorkspaceModalClose();
    navigate('/customers');
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box>
        <Heading size="lg">系统设置</Heading>
        <Text color="gray.600" mt={2}>
          这里已经升级为蓝鲸CRM 的组织与配置工作台，可查看账户、管理成员和维护销售组结构。
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Card bg="linear-gradient(180deg, rgba(47,128,237,0.14), rgba(47,128,237,0.04))">
          <CardBody>
            <Stat>
              <StatLabel>当前角色</StatLabel>
              <StatNumber fontSize="2xl">{currentRoleLabel}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="linear-gradient(180deg, rgba(32,145,203,0.14), rgba(32,145,203,0.04))">
          <CardBody>
            <Stat>
              <StatLabel>所属销售组</StatLabel>
              <StatNumber fontSize="2xl">{user?.team_name || '未分组'}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="linear-gradient(180deg, rgba(17,94,163,0.12), rgba(17,94,163,0.03))">
          <CardBody>
            <Stat>
              <StatLabel>当前成员数</StatLabel>
              <StatNumber fontSize="2xl">{users.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="linear-gradient(180deg, rgba(9,78,162,0.12), rgba(9,78,162,0.03))">
          <CardBody>
            <Stat>
              <StatLabel>销售组数量</StatLabel>
              <StatNumber fontSize="2xl">{teams.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>账户概览</Tab>
          {canReadUsers && <Tab>用户管理</Tab>}
          {canReadUsers && <Tab>销售组管理</Tab>}
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <SimpleGrid columns={1} spacing={6}>
              <Card>
                <CardHeader>
                  <Heading size="md">当前账户</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between"><Text color="gray.600">用户名</Text><Text fontWeight="600">{user?.username || '-'}</Text></HStack>
                    <HStack justify="space-between"><Text color="gray.600">邮箱</Text><Text fontWeight="600">{user?.email || '-'}</Text></HStack>
                    <HStack justify="space-between"><Text color="gray.600">角色</Text><Badge colorScheme={roleColorMap[user?.role || 'sales']}>{currentRoleLabel}</Badge></HStack>
                    <HStack justify="space-between"><Text color="gray.600">姓名</Text><Text fontWeight="600">{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || '-'}</Text></HStack>
                    <HStack justify="space-between"><Text color="gray.600">电话</Text><Text fontWeight="600">{user?.phone || '-'}</Text></HStack>
                    <HStack justify="space-between"><Text color="gray.600">销售组</Text><Text fontWeight="600">{user?.team_name || '未分配'}</Text></HStack>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>

          {canReadUsers && (
            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <HStack justify="space-between">
                    <Box>
                      <Heading size="md">用户管理</Heading>
                      <Text mt={2} color="gray.600">
                        管理系统成员、角色和销售组归属。销售组长仅可管理本组销售成员。
                      </Text>
                    </Box>
                    {canCreateUsers && (
                      <Button colorScheme="blue" onClick={openCreateUser}>
                        + 新增成员
                      </Button>
                    )}
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  {usersLoading ? (
                    <Box py={12} textAlign="center"><Spinner /></Box>
                  ) : (
                    <>
                      <HStack mb={4} spacing={4} wrap="wrap">
                        <Select width="220px" value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
                          <option value="">全部角色</option>
                          {Object.entries(roleLabelMap).map(([role, label]) => (
                            <option key={role} value={role}>{label}</option>
                          ))}
                        </Select>
                        <Select width="220px" value={userTeamFilter} onChange={(e) => setUserTeamFilter(e.target.value)}>
                          <option value="">全部销售组</option>
                          {teams.map((team) => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </Select>
                      </HStack>
                      <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>姓名</Th>
                            <Th>用户名</Th>
                            <Th>邮箱</Th>
                            <Th>角色</Th>
                            <Th>销售组</Th>
                            <Th>状态</Th>
                            <Th>操作</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredUsers.map((item) => (
                            <Tr key={item.id}>
                              <Td fontWeight="600">{[item.first_name, item.last_name].filter(Boolean).join(' ') || '-'}</Td>
                              <Td>{item.username}</Td>
                              <Td>{item.email}</Td>
                              <Td><Badge colorScheme={roleColorMap[item.role] || 'gray'}>{roleLabelMap[item.role] || item.role}</Badge></Td>
                              <Td>{item.team_name || '未分组'}</Td>
                              <Td><Badge colorScheme={item.is_active ? 'green' : 'gray'}>{item.is_active ? '启用' : '停用'}</Badge></Td>
                              <Td>
                                {canUpdateUsers ? (
                                  <HStack spacing={1}>
                                    <Button size="sm" variant="ghost" colorScheme="blue" onClick={() => openEditUser(item)}>
                                      编辑
                                    </Button>
                                    <Button size="sm" variant="ghost" colorScheme="teal" onClick={() => openResetPassword(item)}>
                                      重置密码
                                    </Button>
                                  </HStack>
                                ) : (
                                  <Text color="gray.400" fontSize="sm">只读</Text>
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      </Box>
                    </>
                  )}
                </CardBody>
              </Card>
            </TabPanel>
          )}

          {canReadUsers && (
            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <HStack justify="space-between">
                    <Box>
                      <Heading size="md">销售组管理</Heading>
                      <Text mt={2} color="gray.600">
                        按销售组维护组长和成员结构，后续客户、商机、报表会按此组织隔离。
                      </Text>
                    </Box>
                    {canManageTeams && (
                      <Button colorScheme="blue" onClick={openCreateTeam}>
                        + 新建销售组
                      </Button>
                    )}
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  {teamsLoading ? (
                    <Box py={12} textAlign="center"><Spinner /></Box>
                  ) : (
                    <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                      {teams.map((team) => (
                        <Card
                          key={team.id}
                          bg="linear-gradient(180deg, rgba(47,128,237,0.1), rgba(47,128,237,0.03))"
                          border="1px solid rgba(47,128,237,0.1)"
                          boxShadow="none"
                        >
                          <CardBody>
                            <VStack align="stretch" spacing={3}>
                              <HStack justify="space-between">
                                <Heading size="sm">{team.name}</Heading>
                                <Badge colorScheme={team.is_active ? 'blue' : 'gray'}>{team.is_active ? '启用中' : '停用'}</Badge>
                              </HStack>
                              <Text color="gray.600" fontSize="sm" minH="44px">
                                {team.description || '暂无销售组说明'}
                              </Text>
                              <HStack justify="space-between" align="start">
                                <Box>
                                  <Text color="gray.500" fontSize="sm">组长</Text>
                                  <Text fontWeight="700">{team.leader_name || '待指定'}</Text>
                                </Box>
                                <Badge colorScheme="purple" variant="subtle">
                                  {team.member_count || 0} 人团队
                                </Badge>
                              </HStack>
                              <SimpleGrid columns={4} spacing={3}>
                                <Box bg="whiteAlpha.700" borderRadius="16px" p={3}>
                                  <Text fontSize="xs" color="gray.500">销售</Text>
                                  <Text fontWeight="800" color="brand.700">{team.sales_count ?? team.member_count ?? 0}</Text>
                                </Box>
                                <Box bg="whiteAlpha.700" borderRadius="16px" p={3}>
                                  <Text fontSize="xs" color="gray.500">客户</Text>
                                  <Text fontWeight="800" color="brand.700">{team.customer_count ?? 0}</Text>
                                </Box>
                                <Box bg="whiteAlpha.700" borderRadius="16px" p={3}>
                                  <Text fontSize="xs" color="gray.500">商机</Text>
                                  <Text fontWeight="800" color="brand.700">{team.opportunity_count ?? 0}</Text>
                                </Box>
                                <Box bg="whiteAlpha.700" borderRadius="16px" p={3}>
                                  <Text fontSize="xs" color="gray.500">订单</Text>
                                  <Text fontWeight="800" color="brand.700">{team.order_count ?? 0}</Text>
                                </Box>
                              </SimpleGrid>
                              <Box>
                                <Text color="gray.500" fontSize="sm" mb={2}>团队成员</Text>
                                <HStack spacing={2} wrap="wrap">
                                  {(membersByTeam.get(team.id) || []).map((member) => (
                                    <Badge
                                      key={member.id}
                                      colorScheme={member.role === 'sales_lead' ? 'purple' : 'blue'}
                                      variant="subtle"
                                    >
                                      {[member.first_name, member.last_name].filter(Boolean).join(' ') || member.username}
                                    </Badge>
                                  ))}
                                  {(membersByTeam.get(team.id) || []).length === 0 && (
                                    <Text fontSize="sm" color="gray.400">暂无成员</Text>
                                  )}
                                </HStack>
                              </Box>
                              <HStack spacing={2}>
                                <Button size="sm" colorScheme="blue" variant="solid" onClick={() => openTeamWorkspace(team)}>
                                  查看团队详情
                                </Button>
                                {canManageTeams && (
                                  <Button size="sm" variant="outline" colorScheme="blue" onClick={() => openEditTeam(team)}>
                                    编辑销售组
                                  </Button>
                                )}
                              </HStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  )}
                </CardBody>
              </Card>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      <Modal isOpen={isUserModalOpen} onClose={onUserModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedUser ? '编辑成员' : '新增成员'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {!selectedUser && (
                <>
                  <FormControl isRequired>
                    <FormLabel>用户名</FormLabel>
                    <Input value={userForm.username || ''} onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))} />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>初始密码</FormLabel>
                    <Input type="password" value={userForm.password || ''} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} />
                  </FormControl>
                </>
              )}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>邮箱</FormLabel>
                  <Input value={userForm.email || ''} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>角色</FormLabel>
                  <Select value={userForm.role || ''} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}>
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>{roleLabelMap[role] || role}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>名字</FormLabel>
                  <Input value={userForm.first_name || ''} onChange={(e) => setUserForm((prev) => ({ ...prev, first_name: e.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>姓氏</FormLabel>
                  <Input value={userForm.last_name || ''} onChange={(e) => setUserForm((prev) => ({ ...prev, last_name: e.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>电话</FormLabel>
                  <Input value={userForm.phone || ''} onChange={(e) => setUserForm((prev) => ({ ...prev, phone: e.target.value }))} />
                </FormControl>
                <FormControl isDisabled={hasRole('sales_lead')}>
                  <FormLabel>所属销售组</FormLabel>
                  <Select value={userForm.team_id ?? ''} onChange={(e) => setUserForm((prev) => ({ ...prev, team_id: e.target.value }))}>
                    <option value="">未分组</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <FormControl display="flex" alignItems="center" justifyContent="space-between" w="full">
                <FormLabel mb="0">启用状态</FormLabel>
                <Switch isChecked={!!userForm.is_active} onChange={(e) => setUserForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onUserModalClose}>取消</Button>
            <Button colorScheme="blue" onClick={handleSaveUser} isLoading={savingUser}>
              {selectedUser ? '保存修改' : '创建成员'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isTeamModalOpen} onClose={onTeamModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedTeam ? '编辑销售组' : '新建销售组'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>销售组名称</FormLabel>
                <Input value={teamForm.name || ''} onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>销售组说明</FormLabel>
                <Textarea value={teamForm.description || ''} onChange={(e) => setTeamForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} />
              </FormControl>
              <FormControl>
                <FormLabel>指定组长</FormLabel>
                <Select value={teamForm.leader_id ?? ''} onChange={(e) => setTeamForm((prev) => ({ ...prev, leader_id: e.target.value }))}>
                  <option value="">暂不指定</option>
                  {salesEligibleUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {[item.first_name, item.last_name].filter(Boolean).join(' ') || item.username}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl display="flex" alignItems="center" justifyContent="space-between" w="full">
                <FormLabel mb="0">启用状态</FormLabel>
                <Switch isChecked={!!teamForm.is_active} onChange={(e) => setTeamForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTeamModalClose}>取消</Button>
            <Button colorScheme="blue" onClick={handleSaveTeam} isLoading={savingTeam}>
              {selectedTeam ? '保存销售组' : '创建销售组'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isPasswordModalOpen} onClose={onPasswordModalClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>重置密码</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text w="full" color="gray.600">
                正在为 <Text as="span" fontWeight="700" color="gray.800">{passwordTarget?.username}</Text> 更新密码。
              </Text>
              <FormControl>
                <FormLabel>原密码</FormLabel>
                <Input
                  type="password"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))}
                  placeholder="管理员或销售组长代改时可留空"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>新密码</FormLabel>
                <Input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPasswordModalClose}>取消</Button>
            <Button colorScheme="blue" onClick={handleResetPassword} isLoading={savingPassword}>
              保存新密码
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isWorkspaceModalOpen} onClose={onWorkspaceModalClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{workspaceTeam?.team.name || '团队详情'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {workspaceLoading || !workspaceTeam ? (
              <Box py={12} textAlign="center"><Spinner /></Box>
            ) : (
              <VStack align="stretch" spacing={6}>
                <HStack justify="space-between" align="start" wrap="wrap">
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} flex="1">
                    <Card><CardBody><Stat><StatLabel>成员数</StatLabel><StatNumber>{workspaceTeam.team.member_count || 0}</StatNumber></Stat></CardBody></Card>
                    <Card><CardBody><Stat><StatLabel>客户数</StatLabel><StatNumber>{workspaceTeam.team.customer_count || 0}</StatNumber></Stat></CardBody></Card>
                    <Card><CardBody><Stat><StatLabel>商机数</StatLabel><StatNumber>{workspaceTeam.team.opportunity_count || 0}</StatNumber></Stat></CardBody></Card>
                    <Card><CardBody><Stat><StatLabel>订单数</StatLabel><StatNumber>{workspaceTeam.team.order_count || 0}</StatNumber></Stat></CardBody></Card>
                  </SimpleGrid>
                  <Box minW={{ base: 'full', xl: '220px' }}>
                    <Text fontSize="sm" color="gray.500" mb={2}>成员筛选</Text>
                    <Select value={workspaceOwnerFilter} onChange={(e) => setWorkspaceOwnerFilter(e.target.value)}>
                      <option value="">全部成员</option>
                      {workspaceTeam.members.map((member) => {
                        const label = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username;
                        return <option key={member.id} value={label}>{label}</option>;
                      })}
                    </Select>
                  </Box>
                </HStack>

                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <Card><CardBody><Stat><StatLabel>赢单率</StatLabel><StatNumber>{workspaceTeam.team.won_rate || 0}%</StatNumber></Stat></CardBody></Card>
                  <Card><CardBody><Stat><StatLabel>赢单数</StatLabel><StatNumber>{workspaceTeam.team.won_opportunity_count || 0}</StatNumber></Stat></CardBody></Card>
                  <Card><CardBody><Stat><StatLabel>成交金额</StatLabel><StatNumber>${(workspaceTeam.team.order_total_amount || 0).toFixed(0)}</StatNumber></Stat></CardBody></Card>
                  <Card><CardBody><Stat><StatLabel>近7天互动</StatLabel><StatNumber>{workspaceTeam.team.recent_interaction_count || 0}</StatNumber></Stat></CardBody></Card>
                </SimpleGrid>

                <Divider />

                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
                  <Card>
                    <CardHeader pb={0}><Heading size="sm">近30天成交金额趋势</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {workspaceTeam.order_trend.slice(-10).map((item) => (
                          <Box key={item.date}>
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="sm" color="gray.600">
                                {new Date(item.date).toLocaleDateString()}
                              </Text>
                              <Text fontSize="sm" fontWeight="700" color="gray.800">
                                ${item.amount.toFixed(0)}
                              </Text>
                            </HStack>
                            <Progress
                              value={maxTrendAmount ? (item.amount / maxTrendAmount) * 100 : 0}
                              colorScheme="blue"
                              borderRadius="full"
                              bg="gray.100"
                            />
                          </Box>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">待跟进客户清单</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {filteredPendingFollowups.map((item) => (
                          <HStack key={item.customer_id} justify="space-between" align="start">
                            <Box>
                              <Text fontWeight="700">{item.customer_name}</Text>
                              <Text fontSize="sm" color="gray.500">
                                {item.company || '未填写公司'} · {item.owner_name || '未分配'}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {item.last_interaction_at
                                  ? `最近跟进 ${new Date(item.last_interaction_at).toLocaleDateString()}`
                                  : '尚无互动记录'}
                              </Text>
                              <Text fontSize="sm" color="gray.500" noOfLines={1}>
                                下一步：{item.next_action || '建议尽快安排首次触达或回访'}
                              </Text>
                            </Box>
                            <VStack align="end" spacing={2}>
                              <Badge colorScheme="orange">{item.status}</Badge>
                              <Button
                                size="xs"
                                variant="outline"
                                colorScheme="blue"
                                onClick={() => jumpToCustomerDetail(item.customer_id)}
                              >
                                去客户详情
                              </Button>
                            </VStack>
                          </HStack>
                        ))}
                        {filteredPendingFollowups.length === 0 && (
                          <Text fontSize="sm" color="gray.400">当前没有待跟进客户，团队节奏不错。</Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">近 7 天互动动态</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {filteredRecentInteractions.map((item) => (
                          <HStack key={item.id} justify="space-between" align="start">
                            <Box>
                              <Text fontWeight="700">{item.subject}</Text>
                              <Text fontSize="sm" color="gray.500">
                                {item.customer_name} · {item.owner_name || '未知成员'}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {new Date(item.date).toLocaleString()} · {item.interaction_type}
                              </Text>
                              <Text fontSize="sm" color="gray.500" noOfLines={1}>
                                下一步：{item.next_action || '待补充后续动作'}
                              </Text>
                            </Box>
                            <Badge colorScheme={item.outcome === 'positive' ? 'green' : item.outcome === 'negative' ? 'red' : 'blue'}>
                              {item.outcome || 'neutral'}
                            </Badge>
                          </HStack>
                        ))}
                        {filteredRecentInteractions.length === 0 && (
                          <Text fontSize="sm" color="gray.400">近 7 天暂无新的团队互动记录。</Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">成员业绩排行</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {workspaceTeam.member_metrics.map((item, index) => (
                          <HStack key={item.user_id} justify="space-between" align="start">
                            <HStack align="start" spacing={3}>
                              <Badge colorScheme={index === 0 ? 'yellow' : index === 1 ? 'gray' : 'orange'}>
                                #{index + 1}
                              </Badge>
                              <Box>
                                <Text fontWeight="700">{item.user_name}</Text>
                                <Text fontSize="sm" color="gray.500">
                                  {roleLabelMap[item.role] || item.role} · 客户 {item.customer_count} · 商机 {item.opportunity_count} · 订单 {item.order_count}
                                </Text>
                              </Box>
                            </HStack>
                            <Text fontWeight="800" color="brand.700">
                              ${item.opportunity_value.toFixed(0)}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">本组阶段分布</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {Object.entries(workspaceTeam.stage_distribution).map(([stage, count]) => (
                          <HStack key={stage} justify="space-between">
                            <Text fontWeight="600">{stage}</Text>
                            <Badge colorScheme="blue">{count}</Badge>
                          </HStack>
                        ))}
                        {Object.keys(workspaceTeam.stage_distribution).length === 0 && (
                          <Text fontSize="sm" color="gray.400">暂无阶段数据</Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">团队成员</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {workspaceTeam.members.map((member) => (
                          <HStack key={member.id} justify="space-between">
                            <Box>
                              <Text fontWeight="700">{[member.first_name, member.last_name].filter(Boolean).join(' ') || member.username}</Text>
                              <Text fontSize="sm" color="gray.500">{member.username}</Text>
                            </Box>
                            <Badge colorScheme={roleColorMap[member.role] || 'gray'}>{roleLabelMap[member.role] || member.role}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">最近客户</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {workspaceTeam.customers.map((item) => (
                          <HStack key={item.id} justify="space-between" align="start">
                            <Box>
                              <Text fontWeight="700">{item.first_name} {item.last_name}</Text>
                              <Text fontSize="sm" color="gray.500">{item.company || '未填写公司'} · {item.assigned_sales_rep_name || '未分配'}</Text>
                            </Box>
                            <Badge colorScheme="blue">{item.status}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">最近商机</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {workspaceTeam.opportunities.map((item) => (
                          <HStack key={item.id} justify="space-between" align="start">
                            <Box>
                              <Text fontWeight="700">{item.name}</Text>
                              <Text fontSize="sm" color="gray.500">{item.assigned_to_name || '未分配'} · ${item.value.toFixed(2)}</Text>
                            </Box>
                            <Badge colorScheme="purple">{item.stage}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader pb={0}><Heading size="sm">最近订单</Heading></CardHeader>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        {workspaceTeam.orders.map((item) => (
                          <HStack key={item.id} justify="space-between" align="start">
                            <Box>
                              <Text fontWeight="700">{item.order_number}</Text>
                              <Text fontSize="sm" color="gray.500">{item.owner_name || '未分配'} · {item.currency} {item.total_amount.toFixed(2)}</Text>
                            </Box>
                            <Badge colorScheme="green">{item.status}</Badge>
                          </HStack>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onWorkspaceModalClose}>关闭</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default Settings;
