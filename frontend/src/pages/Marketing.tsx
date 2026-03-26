
import React, { useState, useEffect } from 'react';
import {
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
import { apiRequestRaw } from '../services/api';
import { ListRefreshingOverlay } from '../components/ListRefreshingOverlay';
import { ListDensity, ListDensityToggle } from '../components/ListDensityToggle';
import { SortableTh, SortOrder } from '../components/SortableTh';
import { useDebouncedSearchInput } from '../hooks/useDebouncedSearchInput';

interface MarketingCampaign {
  id: number;
  name: string;
  description?: string;
  status: string;
  budget: number;
  spent: number;
  start_date: string;
  end_date?: string;
  target_audience?: string;
  channel: string;
  manager_id: number;
  manager_name?: string | null;
  manager_team_name?: string | null;
  created_at: string;
}

interface Lead {
  id: number;
  customer_id: number;
  assigned_to: number;
  status: string;
  source: string;
  value: number;
  assigned_to_name?: string | null;
  assigned_team_name?: string | null;
  expected_close_date?: string;
  notes?: string;
  created_at: string;
}

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  total_spent: number;
  budget_utilization: number;
  campaigns_by_status: Record<string, number>;
  campaigns_by_channel: Record<string, number>;
}

interface LeadStats {
  total_leads: number;
  total_value: number;
  leads_by_status: Record<string, number>;
  leads_by_source: Record<string, number>;
  conversion_rate: number;
}

interface CustomerOption {
  id: number;
  label: string;
}

const formatCurrency = (value?: number, currencySymbol: string = '$') =>
  `${currencySymbol}${value?.toFixed(2) || '0.00'}`;

const Marketing: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [campPage, setCampPage] = useState(1);
  const [leadPage, setLeadPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [campTotalPages, setCampTotalPages] = useState(1);
  const [leadTotalPages, setLeadTotalPages] = useState(1);
  const [tableDensity, setTableDensity] = useState<ListDensity>('comfortable');
  const { searchValue: campSearch, bindInput: campSearchInputProps } = useDebouncedSearchInput();
  const [campaignSortBy, setCampaignSortBy] = useState('start_date');
  const [campaignSortOrder, setCampaignSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const { searchValue: leadSearch, bindInput: leadSearchInputProps } = useDebouncedSearchInput();
  const [leadSortBy, setLeadSortBy] = useState('created_at');
  const [leadSortOrder, setLeadSortOrder] = useState<SortOrder>('desc');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const toast = useToast();
  const {
    isOpen: isCampCreateOpen,
    onOpen: onCampCreateOpen,
    onClose: onCampCreateClose,
  } = useDisclosure();
  const {
    isOpen: isCampDetailOpen,
    onOpen: onCampDetailOpen,
    onClose: onCampDetailClose,
  } = useDisclosure();
  const {
    isOpen: isLeadCreateOpen,
    onOpen: onLeadCreateOpen,
    onClose: onLeadCreateClose,
  } = useDisclosure();
  const {
    isOpen: isLeadDetailOpen,
    onOpen: onLeadDetailOpen,
    onClose: onLeadDetailClose,
  } = useDisclosure();

  // Fetch campaigns
  const fetchCampaigns = async (page: number = 1) => {
    try {
      setCampaignsLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (campSearch) params.search = campSearch;
      if (statusFilter) params.status = statusFilter;
      if (channelFilter) params.channel = channelFilter;
      params.sort_by = campaignSortBy;
      params.sort_order = campaignSortOrder;

      const response = await apiRequestRaw('GET', '/marketing/campaigns', undefined, params);

      if (response.success) {
        setCampaigns(response.data || []);
        setCampTotalPages(response.pagination?.total_pages || 1);
        setCampPage(page);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: error.message || '活动列表加载失败',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setCampaignsLoading(false);
    }
  };

  // Fetch leads
  const fetchLeads = async (page: number = 1) => {
    try {
      setLeadsLoading(true);
      const params: Record<string, any> = {
        page,
        per_page: pageSize,
      };
      if (leadSearch) params.search = leadSearch;
      if (leadStatusFilter) params.status = leadStatusFilter;
      if (leadSourceFilter) params.source = leadSourceFilter;
      params.sort_by = leadSortBy;
      params.sort_order = leadSortOrder;

      const response = await apiRequestRaw('GET', '/marketing/leads', undefined, params);

      if (response.success) {
        setLeads(response.data || []);
        setLeadTotalPages(response.pagination?.total_pages || 1);
        setLeadPage(page);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: error.message || '线索列表加载失败',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setLeadsLoading(false);
    }
  };

  // Fetch campaign stats
  const fetchCampaignStats = async () => {
    try {
      const response = await apiRequestRaw('GET', '/marketing/campaigns/stats/summary');

      if (response.success) {
        setCampaignStats(response.data);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: '活动统计加载失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  // Fetch lead stats
  const fetchLeadStats = async () => {
    try {
      const response = await apiRequestRaw('GET', '/marketing/leads/stats/summary');

      if (response.success) {
        setLeadStats(response.data);
      }
    } catch (error: any) {
      toast({
        title: '加载失败',
        description: '线索统计加载失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const fetchCustomerOptions = async () => {
    try {
      const response = await apiRequestRaw<any[]>('GET', '/customers', undefined, { per_page: 100 });
      if (response.success) {
        setCustomerOptions(
          (response.data || []).map((customer) => ({
            id: customer.id,
            label: `${customer.first_name} ${customer.last_name}${customer.company ? ` · ${customer.company}` : ''}`,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load customer options:', error);
    }
  };

  useEffect(() => {
    fetchCustomerOptions();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      fetchCampaigns(1);
      fetchCampaignStats();
    } else {
      fetchLeads(1);
      fetchLeadStats();
    }
  }, [activeTab, campSearch, statusFilter, channelFilter, leadSearch, leadStatusFilter, leadSourceFilter, pageSize, campaignSortBy, campaignSortOrder, leadSortBy, leadSortOrder]);

  const handleCampaignSortToggle = (column: string) => {
    if (campaignSortBy === column) {
      setCampaignSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setCampaignSortBy(column);
    setCampaignSortOrder(['budget', 'spent', 'name'].includes(column) ? 'asc' : 'desc');
  };

  const handleLeadSortToggle = (column: string) => {
    if (leadSortBy === column) {
      setLeadSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setLeadSortBy(column);
    setLeadSortOrder(column === 'created_at' ? 'desc' : 'asc');
  };

  const handleCreateCampaign = async (data: Partial<MarketingCampaign>) => {
    try {
      const response = await apiRequestRaw('POST', '/marketing/campaigns', data);

      if (response.success) {
        toast({
          title: '创建成功',
          description: '营销活动已创建',
          status: 'success',
          isClosable: true,
        });
        onCampCreateClose();
        fetchCampaigns(1);
        fetchCampaignStats();
      }
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '营销活动创建失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleUpdateCampaign = async (data: Partial<MarketingCampaign>) => {
    if (!selectedCampaign) return;

    try {
      const response = await apiRequestRaw(
        'PUT',
        `/marketing/campaigns/${selectedCampaign.id}`,
        data
      );

      if (response.success) {
        toast({
          title: '更新成功',
          description: '营销活动已更新',
          status: 'success',
          isClosable: true,
        });
        onCampDetailClose();
        fetchCampaigns(campPage);
        fetchCampaignStats();
      }
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '营销活动更新失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign || !confirm('确认删除这个营销活动吗？')) return;

    try {
      const response = await apiRequestRaw(
        'DELETE',
        `/marketing/campaigns/${selectedCampaign.id}`
      );

      if (response.success) {
        toast({
          title: '删除成功',
          description: '营销活动已删除',
          status: 'success',
          isClosable: true,
        });
        onCampDetailClose();
        fetchCampaigns(1);
        fetchCampaignStats();
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message || '营销活动删除失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleCreateLead = async (data: Partial<Lead>) => {
    try {
      const response = await apiRequestRaw('POST', '/marketing/leads', data);

      if (response.success) {
        toast({
          title: '创建成功',
          description: '线索已创建',
          status: 'success',
          isClosable: true,
        });
        onLeadCreateClose();
        fetchLeads(1);
        fetchLeadStats();
      }
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '线索创建失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const handleUpdateLead = async (data: Partial<Lead>) => {
    if (!selectedLead) return;

    try {
      const response = await apiRequestRaw(
        'PUT',
        `/marketing/leads/${selectedLead.id}`,
        data
      );

      if (response.success) {
        toast({
          title: '更新成功',
          description: '线索已更新',
          status: 'success',
          isClosable: true,
        });
        onLeadDetailClose();
        fetchLeads(leadPage);
        fetchLeadStats();
      }
    } catch (error: any) {
      toast({
        title: '更新失败',
        description: error.message || '线索更新失败',
        status: 'error',
        isClosable: true,
      });
    }
  };

  const getCampaignStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      planned: 'blue',
      completed: 'gray',
      paused: 'orange',
    };
    return colors[status] || 'gray';
  };

  const getLeadStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      contacted: 'cyan',
      qualified: 'purple',
      proposal: 'orange',
      converted: 'green',
      lost: 'red',
    };
    return colors[status] || 'gray';
  };

  const getCampaignStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: '计划中',
      active: '已激活',
      completed: '已完成',
      paused: '已暂停',
    };
    return labels[status] || status;
  };

  const getChannelLabel = (channel: string) => {
    const labels: Record<string, string> = {
      email: '邮件',
      social: '社交媒体',
      sms: '短信',
      direct: '直邮',
    };
    return labels[channel] || channel;
  };

  const getLeadSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      email: '邮件',
      phone: '电话',
      website: '官网',
      referral: '转介绍',
      event: '活动',
    };
    return labels[source] || source;
  };

  const getCustomerLabel = (customerId: number) =>
    customerOptions.find((customer) => customer.id === customerId)?.label || `客户 #${customerId}`;

  const getLeadStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: '新线索',
      contacted: '已接触',
      qualified: '已确认',
      proposal: '方案中',
      converted: '已转化',
      lost: '已流失',
    };
    return labels[status] || status;
  };

  const campaignStatusItems = Object.entries(campaignStats?.campaigns_by_status || {}).sort((a, b) => b[1] - a[1]);
  const channelItems = Object.entries(campaignStats?.campaigns_by_channel || {}).sort((a, b) => b[1] - a[1]);
  const leadSourceItems = Object.entries(leadStats?.leads_by_source || {}).sort((a, b) => b[1] - a[1]);
  const maxCampaignStatus = Math.max(...campaignStatusItems.map(([, value]) => value), 1);
  const maxLeadSource = Math.max(...leadSourceItems.map(([, value]) => value), 1);

  return (
    <Box p={6}>
      <Tabs index={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab>营销活动</Tab>
          <Tab>线索管理</Tab>
        </TabList>

        <TabPanels>
          {/* CAMPAIGNS TAB */}
          <TabPanel>
            {/* Campaign Stats */}
            {campaignStats && (
              <StatGroup mb={6}>
                <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} w="full">
                  <Stat>
                    <StatLabel>活动总数</StatLabel>
                    <StatNumber>{campaignStats.total_campaigns}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>进行中活动</StatLabel>
                    <StatNumber>{campaignStats.active_campaigns}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>总预算</StatLabel>
                    <StatNumber>{formatCurrency(campaignStats.total_budget)}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>已花费</StatLabel>
                    <StatNumber>{formatCurrency(campaignStats.total_spent)}</StatNumber>
                  </Stat>
                </SimpleGrid>
                <Box mt={4}>
                  <Text fontSize="sm" mb={2}>预算使用率</Text>
                  <Progress value={campaignStats.budget_utilization} colorScheme="blue" />
                  <Text fontSize="xs" color="gray.500">{campaignStats.budget_utilization.toFixed(1)}%</Text>
                </Box>
              </StatGroup>
            )}

            {campaignStats && (
              <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6} mb={6}>
                <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
                  <CardHeader pb={0}>
                    <Text fontSize="lg" fontWeight="700" color="gray.800">活动状态分布</Text>
                    <Text fontSize="sm" color="gray.500">查看当前活动池推进进度</Text>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      {campaignStatusItems.map(([status, count]) => (
                        <Box key={status}>
                          <HStack justify="space-between" mb={1.5}>
                            <Text fontSize="sm" color="gray.700">{getCampaignStatusLabel(status)}</Text>
                            <Text fontSize="sm" fontWeight="700" color="gray.800">{count}</Text>
                          </HStack>
                          <Progress
                            value={(count / maxCampaignStatus) * 100}
                            colorScheme={getCampaignStatusColor(status)}
                            borderRadius="full"
                            bg="gray.100"
                          />
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
                <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)">
                  <CardHeader pb={0}>
                    <Text fontSize="lg" fontWeight="700" color="gray.800">渠道投放焦点</Text>
                    <Text fontSize="sm" color="gray.500">当前活动最集中的渠道结构</Text>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      {channelItems.map(([channel, count]) => (
                        <HStack key={channel} justify="space-between">
                          <Text fontSize="sm" color="gray.700">{getChannelLabel(channel)}</Text>
                          <Text fontSize="sm" fontWeight="700" color="gray.800">{count}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            )}

            {/* Filter and Search */}
            <HStack mb={4} spacing={4} justify="space-between" align="start" wrap="wrap">
              <HStack spacing={4} wrap="wrap" flex="1">
                <Input
                  placeholder="按活动名称搜索"
                  {...campSearchInputProps}
                  width="300px"
                />
                <Select
                  placeholder="按状态筛选"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  width="200px"
                >
                  <option value="planned">计划中</option>
                  <option value="active">已激活</option>
                  <option value="completed">已完成</option>
                  <option value="paused">已暂停</option>
                </Select>
                <Select
                  placeholder="按渠道筛选"
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  width="200px"
                >
                  <option value="email">邮件</option>
                  <option value="social">社交媒体</option>
                  <option value="sms">SMS</option>
                  <option value="direct">直邮</option>
                </Select>
                <Button colorScheme="blue" onClick={onCampCreateOpen}>
                  + 新建活动
                </Button>
              </HStack>
              <HStack spacing={3}>
                <Text fontSize="sm" fontWeight="600" color="gray.500">列表密度</Text>
                <ListDensityToggle value={tableDensity} onChange={setTableDensity} />
              </HStack>
            </HStack>

            {/* Campaigns Table */}
            {campaignsLoading && campaigns.length === 0 ? (
              <Box textAlign="center" py={10}>
                <Spinner />
              </Box>
            ) : campaigns.length === 0 ? (
              <Text>暂无营销活动</Text>
            ) : (
              <>
                <Box position="relative">
                  {campaignsLoading && (
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
                      <Text>正在刷新活动列表...</Text>
                      <Spinner size="sm" color="blue.500" />
                    </HStack>
                  )}
                  <Box
                    overflowX="auto"
                    opacity={campaignsLoading ? 0.72 : 1}
                    transition="opacity 0.18s ease"
                  >
                    <Table variant="simple" size={tableDensity === 'comfortable' ? 'md' : 'sm'}>
                      <Thead>
                        <Tr>
                          <SortableTh label="活动名称" column="name" activeSortBy={campaignSortBy} activeSortOrder={campaignSortOrder} onToggle={handleCampaignSortToggle} />
                          <SortableTh label="状态" column="status" activeSortBy={campaignSortBy} activeSortOrder={campaignSortOrder} onToggle={handleCampaignSortToggle} />
                          <SortableTh label="渠道" column="channel" activeSortBy={campaignSortBy} activeSortOrder={campaignSortOrder} onToggle={handleCampaignSortToggle} />
                          <Th>负责人</Th>
                          <SortableTh label="预算" column="budget" activeSortBy={campaignSortBy} activeSortOrder={campaignSortOrder} onToggle={handleCampaignSortToggle} />
                          <SortableTh label="花费" column="spent" activeSortBy={campaignSortBy} activeSortOrder={campaignSortOrder} onToggle={handleCampaignSortToggle} />
                          <SortableTh label="周期" column="start_date" activeSortBy={campaignSortBy} activeSortOrder={campaignSortOrder} onToggle={handleCampaignSortToggle} />
                          <Th>操作</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {campaigns.map((campaign) => (
                          <Tr key={campaign.id}>
                            <Td>{campaign.name}</Td>
                            <Td>
                              <Badge colorScheme={getCampaignStatusColor(campaign.status)}>
                                {getCampaignStatusLabel(campaign.status)}
                              </Badge>
                            </Td>
                            <Td>{getChannelLabel(campaign.channel)}</Td>
                            <Td>
                              <VStack align="start" spacing={0.5}>
                                <Text fontSize="sm" color="gray.700">{campaign.manager_name || '未指定'}</Text>
                                <Text fontSize="sm" color="gray.500">{campaign.manager_team_name || '未分组'}</Text>
                              </VStack>
                            </Td>
                            <Td>{formatCurrency(campaign.budget)}</Td>
                            <Td>{formatCurrency(campaign.spent)}</Td>
                            <Td fontSize="sm">
                              {new Date(campaign.start_date).toLocaleDateString()}
                              {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
                            </Td>
                            <Td>
                              <Button
                                size="xs"
                                onClick={() => {
                                  setSelectedCampaign(campaign);
                                  onCampDetailOpen();
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
                  {campaignsLoading && <ListRefreshingOverlay columns={8} />}
                </Box>

                {/* Pagination */}
                <HStack mt={4} justify="space-between">
                  <HStack>
                    <Button
                      size="sm"
                      onClick={() => fetchCampaigns(campPage - 1)}
                      isDisabled={campPage === 1}
                    >
                      上一页
                    </Button>
                    <Text>
                      第 {campPage} / {campTotalPages} 页
                    </Text>
                    <Button
                      size="sm"
                      onClick={() => fetchCampaigns(campPage + 1)}
                      isDisabled={campPage === campTotalPages}
                    >
                      下一页
                    </Button>
                  </HStack>
                  <Select
                    width="120px"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value="5">5 条/页</option>
                    <option value="10">10 条/页</option>
                    <option value="25">25 条/页</option>
                    <option value="50">50 条/页</option>
                  </Select>
                </HStack>
              </>
            )}
          </TabPanel>

          {/* LEADS TAB */}
          <TabPanel>
            {/* Lead Stats */}
            {leadStats && (
              <StatGroup mb={6}>
                <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} w="full">
                  <Stat>
                    <StatLabel>线索总数</StatLabel>
                    <StatNumber>{leadStats.total_leads}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>线索总金额</StatLabel>
                    <StatNumber>{formatCurrency(leadStats.total_value)}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>转化率</StatLabel>
                    <StatNumber>{leadStats.conversion_rate.toFixed(1)}%</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>来源类型数</StatLabel>
                    <StatNumber>{Object.keys(leadStats.leads_by_source).length}</StatNumber>
                  </Stat>
                </SimpleGrid>
              </StatGroup>
            )}

            {leadStats && (
              <Card bg="rgba(255,255,255,0.95)" borderRadius="28px" boxShadow="0 16px 36px rgba(70, 41, 15, 0.08)" mb={6}>
                <CardHeader pb={0}>
                  <Text fontSize="lg" fontWeight="700" color="gray.800">线索来源分布</Text>
                  <Text fontSize="sm" color="gray.500">帮助判断当前哪类渠道更稳定地产出机会</Text>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {leadSourceItems.map(([source, count]) => (
                      <Box key={source}>
                        <HStack justify="space-between" mb={1.5}>
                          <Text fontSize="sm" color="gray.700">{getLeadSourceLabel(source)}</Text>
                          <Text fontSize="sm" fontWeight="700" color="gray.800">{count}</Text>
                        </HStack>
                        <Progress
                          value={(count / maxLeadSource) * 100}
                          colorScheme="blue"
                          borderRadius="full"
                          bg="gray.100"
                        />
                      </Box>
                    ))}
                  </SimpleGrid>
                </CardBody>
              </Card>
            )}

            {/* Filter */}
            <HStack mb={4} spacing={4} justify="space-between" align="start" wrap="wrap">
              <HStack spacing={4} wrap="wrap" flex="1">
                <Input
                  placeholder="按客户、公司、邮箱或备注搜索"
                  {...leadSearchInputProps}
                  width="320px"
                />
                <Select
                  placeholder="按状态筛选"
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  width="200px"
                >
                  <option value="new">新线索</option>
                  <option value="contacted">已接触</option>
                  <option value="qualified">已确认</option>
                  <option value="proposal">方案中</option>
                  <option value="converted">已转化</option>
                  <option value="lost">已流失</option>
                </Select>
                <Select
                  placeholder="按来源筛选"
                  value={leadSourceFilter}
                  onChange={(e) => setLeadSourceFilter(e.target.value)}
                  width="200px"
                >
                  <option value="email">邮件</option>
                  <option value="phone">电话</option>
                  <option value="website">官网</option>
                  <option value="referral">转介绍</option>
                  <option value="event">活动</option>
                </Select>
                <Button colorScheme="blue" onClick={onLeadCreateOpen}>
                  + 新建线索
                </Button>
              </HStack>
              <HStack spacing={3}>
                <Text fontSize="sm" fontWeight="600" color="gray.500">列表密度</Text>
                <ListDensityToggle value={tableDensity} onChange={setTableDensity} />
              </HStack>
            </HStack>

            {/* Leads Table */}
            {leadsLoading && leads.length === 0 ? (
              <Box textAlign="center" py={10}>
                <Spinner />
              </Box>
            ) : leads.length === 0 ? (
              <Text>暂无线索数据</Text>
            ) : (
              <>
                <Box position="relative">
                  {leadsLoading && (
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
                      <Text>正在刷新线索列表...</Text>
                      <Spinner size="sm" color="blue.500" />
                    </HStack>
                  )}
                  <Box
                    overflowX="auto"
                    opacity={leadsLoading ? 0.72 : 1}
                    transition="opacity 0.18s ease"
                  >
                    <Table variant="simple" size={tableDensity === 'comfortable' ? 'md' : 'sm'}>
                      <Thead>
                        <Tr>
                          <SortableTh label="线索编号" column="id" activeSortBy={leadSortBy} activeSortOrder={leadSortOrder} onToggle={handleLeadSortToggle} />
                          <Th>客户 / 负责人</Th>
                          <SortableTh label="状态" column="status" activeSortBy={leadSortBy} activeSortOrder={leadSortOrder} onToggle={handleLeadSortToggle} />
                          <SortableTh label="来源" column="source" activeSortBy={leadSortBy} activeSortOrder={leadSortOrder} onToggle={handleLeadSortToggle} />
                          <SortableTh label="金额" column="value" activeSortBy={leadSortBy} activeSortOrder={leadSortOrder} onToggle={handleLeadSortToggle} />
                          <SortableTh label="预计关闭日期" column="expected_close_date" activeSortBy={leadSortBy} activeSortOrder={leadSortOrder} onToggle={handleLeadSortToggle} />
                          <Th>操作</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {leads.map((lead) => (
                          <Tr key={lead.id}>
                            <Td>线索 #{lead.id}</Td>
                            <Td>
                              <VStack align="start" spacing={0.5}>
                                <Text fontSize="sm" color="gray.700">{getCustomerLabel(lead.customer_id)}</Text>
                                <Text fontSize="sm" color="gray.500">
                                  {lead.assigned_to_name || '未分配'} · {lead.assigned_team_name || '未分组'}
                                </Text>
                              </VStack>
                            </Td>
                            <Td>
                              <Badge colorScheme={getLeadStatusColor(lead.status)}>
                                {getLeadStatusLabel(lead.status)}
                              </Badge>
                            </Td>
                            <Td>{getLeadSourceLabel(lead.source)}</Td>
                            <Td>{formatCurrency(lead.value)}</Td>
                            <Td fontSize="sm">
                              {lead.expected_close_date
                                ? new Date(lead.expected_close_date).toLocaleDateString()
                                : '暂无'}
                            </Td>
                            <Td>
                              <Button
                                size="xs"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  onLeadDetailOpen();
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
                  {leadsLoading && <ListRefreshingOverlay columns={7} />}
                </Box>

                {/* Pagination */}
                <HStack mt={4} justify="space-between">
                  <HStack>
                    <Button
                      size="sm"
                      onClick={() => fetchLeads(leadPage - 1)}
                      isDisabled={leadPage === 1}
                    >
                      上一页
                    </Button>
                    <Text>
                      第 {leadPage} / {leadTotalPages} 页
                    </Text>
                    <Button
                      size="sm"
                      onClick={() => fetchLeads(leadPage + 1)}
                      isDisabled={leadPage === leadTotalPages}
                    >
                      下一页
                    </Button>
                  </HStack>
                  <Select
                    width="120px"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value="5">5 条/页</option>
                    <option value="10">10 条/页</option>
                    <option value="25">25 条/页</option>
                    <option value="50">50 条/页</option>
                  </Select>
                </HStack>
              </>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Create Campaign Modal */}
      <CampaignModal
        isOpen={isCampCreateOpen}
        onClose={onCampCreateClose}
        onSubmit={(data) => handleCreateCampaign(data)}
        title="新建营销活动"
      />

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <CampaignModal
          isOpen={isCampDetailOpen}
          onClose={onCampDetailClose}
          campaign={selectedCampaign}
          onSubmit={(data) => handleUpdateCampaign(data)}
          onDelete={() => handleDeleteCampaign()}
          title="活动详情"
        />
      )}

      {/* Create Lead Modal */}
      <LeadModal
        isOpen={isLeadCreateOpen}
        onClose={onLeadCreateClose}
        onSubmit={(data) => handleCreateLead(data)}
        title="新建线索"
        customerOptions={customerOptions}
      />

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadModal
          isOpen={isLeadDetailOpen}
          onClose={onLeadDetailClose}
          lead={selectedLead}
          onSubmit={(data) => handleUpdateLead(data)}
          title="线索详情"
          customerOptions={customerOptions}
          customerLabel={getCustomerLabel(selectedLead.customer_id)}
          statusLabel={getLeadStatusLabel(selectedLead.status)}
        />
      )}
    </Box>
  );
};

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: MarketingCampaign;
  onSubmit: (data: Partial<MarketingCampaign>) => void;
  onDelete?: () => void;
  title: string;
}

const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onSubmit,
  onDelete,
  title,
}) => {
  const [formData, setFormData] = useState<Partial<MarketingCampaign>>(
    campaign || {
      name: '',
      description: '',
      status: 'planned',
      budget: 0,
      spent: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      target_audience: '',
      channel: 'email',
    }
  );

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
    }
  }, [campaign]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>活动名称</FormLabel>
              <Input
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel>说明</FormLabel>
              <Textarea
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </FormControl>

            <FormControl>
              <FormLabel>状态</FormLabel>
              <Select
                value={formData.status || ''}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="planned">计划中</option>
                <option value="active">已激活</option>
                <option value="completed">已完成</option>
                <option value="paused">已暂停</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>渠道</FormLabel>
              <Select
                value={formData.channel || ''}
                onChange={(e) =>
                  setFormData({ ...formData, channel: e.target.value })
                }
              >
                <option value="email">邮件</option>
                <option value="social">社交媒体</option>
                <option value="sms">SMS</option>
                <option value="direct">直邮</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>预算</FormLabel>
              <Input
                type="number"
                value={formData.budget || 0}
                onChange={(e) =>
                  setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })
                }
                placeholder="请输入预算金额"
              />
            </FormControl>

            <FormControl>
              <FormLabel>已花费</FormLabel>
              <Input
                type="number"
                value={formData.spent || 0}
                onChange={(e) =>
                  setFormData({ ...formData, spent: parseFloat(e.target.value) || 0 })
                }
                placeholder="请输入已花费金额"
              />
            </FormControl>

            <FormControl>
              <FormLabel>开始日期</FormLabel>
              <Input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel>结束日期</FormLabel>
              <Input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel>目标人群</FormLabel>
              <Input
                value={formData.target_audience || ''}
                onChange={(e) =>
                  setFormData({ ...formData, target_audience: e.target.value })
                }
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          {campaign && onDelete && (
            <Button colorScheme="red" mr={3} onClick={onDelete}>
              删除
            </Button>
          )}
          <Button variant="ghost" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit}>
            {campaign ? '更新' : '创建'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead;
  onSubmit: (data: Partial<Lead>) => void;
  title: string;
  customerOptions: CustomerOption[];
  customerLabel?: string;
  statusLabel?: string;
}

const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSubmit,
  title,
  customerOptions,
  customerLabel,
  statusLabel,
}) => {
  const [formData, setFormData] = useState<Partial<Lead>>(
    lead || {
      customer_id: 0,
      assigned_to: 0,
      status: 'new',
      source: 'email',
      value: 0,
      expected_close_date: '',
      notes: '',
    }
  );

  useEffect(() => {
    if (lead) {
      setFormData(lead);
    }
  }, [lead]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>客户</FormLabel>
              <Select
                placeholder="请选择客户"
                value={formData.customer_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: parseInt(e.target.value) || 0 })
                }
              >
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>状态</FormLabel>
              <Select
                value={formData.status || ''}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="new">新线索</option>
                <option value="contacted">已接触</option>
                <option value="qualified">已确认</option>
                <option value="proposal">方案中</option>
                <option value="converted">已转化</option>
                <option value="lost">已流失</option>
              </Select>
            </FormControl>

            {lead && (
              <>
                <FormControl isReadOnly>
                  <FormLabel>当前客户</FormLabel>
                  <Input value={customerLabel || ''} isReadOnly />
                </FormControl>
                <FormControl isReadOnly>
                  <FormLabel>当前状态说明</FormLabel>
                  <Input value={statusLabel || ''} isReadOnly />
                </FormControl>
              </>
            )}

            <FormControl>
              <FormLabel>来源</FormLabel>
              <Select
                value={formData.source || ''}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
              >
                <option value="email">邮件</option>
                <option value="phone">电话</option>
                <option value="website">官网</option>
                <option value="referral">转介绍</option>
                <option value="event">活动</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>线索金额</FormLabel>
              <Input
                type="number"
                value={formData.value || 0}
                onChange={(e) =>
                  setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                }
                placeholder="请输入线索金额"
              />
            </FormControl>

            <FormControl>
              <FormLabel>预计关闭日期</FormLabel>
              <Input
                type="date"
                value={formData.expected_close_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, expected_close_date: e.target.value })
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
                rows={3}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit}>
            {lead ? '更新' : '创建'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Marketing;
