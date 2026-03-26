import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  GridItem,
  Heading,
  HStack,
  ListItem,
  OrderedList,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  UnorderedList,
  VStack,
} from '@chakra-ui/react';
import { FiArrowRight, FiBookOpen, FiClock, FiLayers, FiMap, FiTarget } from 'react-icons/fi';

const DOC_SECTIONS = [
  {
    id: 'requirements',
    label: '需求说明书',
    icon: FiMap,
    summary: '面向业务、实施与开发团队的正式需求基线。',
  },
  {
    id: 'design',
    label: '详细设计',
    icon: FiLayers,
    summary: '覆盖架构、模块、接口、交互和部署方案。',
  },
  {
    id: 'guide',
    label: '用户使用说明书',
    icon: FiBookOpen,
    summary: '面向最终使用者的操作手册与常见问题指南。',
  },
  {
    id: 'journal',
    label: '开发日志回顾',
    icon: FiClock,
    summary: '按真实同日小时级节奏回顾建设与修复过程。',
  },
  {
    id: 'roadmap',
    label: 'v1.3 规划',
    icon: FiTarget,
    summary: '梳理下一阶段的高价值优化项与交付优先级。',
  },
] as const;

const SectionCard = ({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) => (
  <Card
    id={id}
    className="doc-section-card"
    scrollMarginTop="96px"
    bg="rgba(255,255,255,0.96)"
    borderRadius="28px"
    boxShadow="0 20px 48px rgba(16, 73, 143, 0.08)"
  >
    <CardHeader pb={3}>
      <Heading size="md" color="brand.700">
        {title}
      </Heading>
    </CardHeader>
    <CardBody pt={0}>{children}</CardBody>
  </Card>
);

const BlueprintCard = ({
  title,
  items,
}: {
  title: string;
  items: string[];
}) => (
  <Card
    bg="linear-gradient(180deg, rgba(47,128,237,0.12), rgba(47,128,237,0.03))"
    borderRadius="24px"
    border="1px solid rgba(47,128,237,0.12)"
    boxShadow="none"
  >
    <CardHeader pb={2}>
      <Heading size="sm" color="brand.700">
        {title}
      </Heading>
    </CardHeader>
    <CardBody pt={0}>
      <VStack align="stretch" spacing={2}>
        {items.map((item) => (
          <Text key={item} color="gray.700" fontSize="sm" lineHeight="1.8">
            {item}
          </Text>
        ))}
      </VStack>
    </CardBody>
  </Card>
);

const timelineEntries = [
  {
    time: '2026-03-24 09:00 - 09:35',
    title: '环境与入口基线确认',
    summary:
      '核对 CRM 前后端本地部署方式，统一局域网入口地址、Vite 监听配置、Flask 绑定地址和文档说明，确保系统具备在同一网段下被其他设备访问的最小可用能力。',
  },
  {
    time: '2026-03-24 09:35 - 10:05',
    title: '启动脚本与分发入口补齐',
    summary:
      '新增 `start.sh`、`stop.sh`、`status.sh` 等运维脚本，并补充 DMG 打包与 macOS 启动器能力，使非开发用户也能通过固定入口启动、停止和查看 CRM 服务状态。',
  },
  {
    time: '2026-03-24 10:05 - 10:30',
    title: '后端首页与健康检查修复',
    summary:
      '为后端根路径提供状态信息返回，调整 Flask 启动参数，减少热重载对服务稳定性的影响，使 `5006` 入口可直接用于服务存活验证和问题排查。',
  },
  {
    time: '2026-03-24 10:30 - 11:15',
    title: '客户互动链路增强',
    summary:
      '在客户列表新增快捷跟进入口，联通列表摘要、详情时间线与新增互动表单，解决从客户列表到互动录入之间步骤过多的问题，并提升客户经营主流程的连续性。',
  },
  {
    time: '2026-03-24 11:15 - 11:45',
    title: '演示数据结构重建',
    summary:
      '扩充初始化脚本，为每个模拟客户生成连续互动、商机与订单关系，增强客户全生命周期场景，保证仪表盘、客户页和报表页具备一致且完整的演示数据来源。',
  },
  {
    time: '2026-03-24 11:45 - 12:20',
    title: '新增互动交互体验修复',
    summary:
      '针对新增互动表单的滚动、刷新、提交反馈等问题迭代多轮方案，最终识别桌面端多层弹窗叠加导致的焦点与滚动上下文冲突，并通过拆分弹层交互修复桌面体验。',
  },
  {
    time: '2026-03-24 12:20 - 12:45',
    title: '认证初始化卡死排障',
    summary:
      '定位页面持续 loading 的根因在于失效 access token 与 refresh token 组合下，前端拦截器对 `/refresh` 请求进入重复等待；修复后 refresh 自身失败时会直接清理本地状态并跳回登录页。',
  },
  {
    time: '2026-03-24 12:45 - 13:10',
    title: '品牌改版与视觉统一',
    summary:
      '将系统品牌切换为“蓝鲸CRM”，统一主题色、登录页、导航、仪表盘、报表、设置页和后端返回文案，形成一致的蓝色品牌视觉语言。',
  },
  {
    time: '2026-03-24 13:10 - 13:45',
    title: '在线文档中心首版搭建',
    summary:
      '在系统设置下新增在线文档入口，并设计统一的文档展示页面，承接需求说明书、详细设计、用户使用说明书和开发日志等交付资料。',
  },
  {
    time: '2026-03-24 13:45 - 14:30',
    title: '文档专业化重构',
    summary:
      '将在线文档从说明性页面升级为正式软件文档形态，按需求、设计、手册、日志四类内容分别补充目标、范围、流程、规则、接口、部署、异常处理和真实时间轴。',
  },
];

const DOC_OUTLINES: Record<string, Array<{ id: string; label: string }>> = {
  requirements: [
    { id: 'requirements-overview', label: '1. 产品概述' },
    { id: 'requirements-flow', label: '2. 业务场景与流程' },
    { id: 'requirements-functional', label: '3. 功能性需求' },
    { id: 'requirements-rules', label: '4. 业务规则' },
    { id: 'requirements-nfr', label: '5. 非功能需求与验收标准' },
  ],
  design: [
    { id: 'design-architecture', label: '1. 总体架构设计' },
    { id: 'design-layering', label: '2. 分层设计' },
    { id: 'design-modules', label: '3. 模块详细设计' },
    { id: 'design-ui', label: '4. 交互与页面设计' },
    { id: 'design-api', label: '5. 接口与数据设计' },
    { id: 'design-deploy', label: '6. 部署与运行设计' },
  ],
  guide: [
    { id: 'guide-login', label: '1. 登录与进入系统' },
    { id: 'guide-process', label: '2. 主要操作流程' },
    { id: 'guide-pages', label: '3. 页面说明' },
    { id: 'guide-fields', label: '4. 字段口径与使用建议' },
    { id: 'guide-faq', label: '5. 常见问题与排障' },
  ],
  journal: timelineEntries.map((entry, index) => ({
    id: `journal-step-${index + 1}`,
    label: `Step ${String(index + 1).padStart(2, '0')} ${entry.title}`,
  })),
  roadmap: [
    { id: 'roadmap-goal', label: '1. 版本目标' },
    { id: 'roadmap-p0', label: '2. P0 必做事项' },
    { id: 'roadmap-p1', label: '3. P1 高价值增强' },
    { id: 'roadmap-ops', label: '4. 部署与运维优化' },
    { id: 'roadmap-longterm', label: '5. 中长期演进' },
  ],
};

const OnlineDocs = () => {
  const location = useLocation();

  const currentTabIndex = useMemo(() => {
    const hash = location.hash.replace('#', '');
    const index = DOC_SECTIONS.findIndex((section) => section.id === hash);
    return index >= 0 ? index : 0;
  }, [location.hash]);

  const currentSection = DOC_SECTIONS[currentTabIndex];

  return (
    <VStack
      spacing={6}
      align="stretch"
      p={6}
      sx={{
        '@media print': {
          padding: 0,
          background: 'white',
          color: '#111827',
        },
        '@media print .doc-hero': {
          boxShadow: 'none',
          color: '#111827',
          background: 'white !important',
          border: '1px solid #D9E5F7',
        },
        '@media print .doc-no-print': {
          display: 'none !important',
        },
        '@media print .doc-section-card': {
          boxShadow: 'none',
          border: '1px solid #E2E8F0',
          pageBreakInside: 'avoid',
        },
      }}
    >
      <Box
        className="doc-hero"
        bg="linear-gradient(135deg, #0f3a69 0%, #1f66cf 55%, #69b5ff 100%)"
        color="white"
        borderRadius="30px"
        px={{ base: 5, md: 7 }}
        py={{ base: 5, md: 6 }}
        boxShadow="0 20px 50px rgba(15, 58, 105, 0.22)"
      >
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5} alignItems="center">
          <VStack align="start" spacing={3}>
            <Badge colorScheme="blue" bg="rgba(255,255,255,0.14)" color="white" px={3} py={1} borderRadius="full">
              在线文档中心
            </Badge>
            <Heading size="lg">蓝鲸CRM 在线文档</Heading>
            <Text color="blue.50" maxW="680px" lineHeight="1.9">
              本文档中心按照交付文档思路整理，面向业务负责人、实施顾问、开发和运维人员提供统一的需求、设计、使用与过程资料入口。
            </Text>
            <HStack spacing={3} className="doc-no-print">
              <Button
                as={RouterLink}
                to="/settings"
                rightIcon={<FiArrowRight />}
                bg="white"
                color="brand.700"
                _hover={{ bg: 'blue.50' }}
              >
                返回系统设置
              </Button>
              <Button
                variant="outline"
                borderColor="rgba(255,255,255,0.45)"
                color="white"
                _hover={{ bg: 'rgba(255,255,255,0.12)' }}
                onClick={() => window.print()}
              >
                打印 / 导出 PDF
              </Button>
            </HStack>
          </VStack>

          <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={3}>
            {DOC_SECTIONS.map((section) => (
              <GridItem key={section.id}>
                <Card
                  bg="rgba(255,255,255,0.12)"
                  borderRadius="24px"
                  border="1px solid rgba(255,255,255,0.12)"
                  boxShadow="none"
                >
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Box
                        w="40px"
                        h="40px"
                        borderRadius="18px"
                        bg="rgba(255,255,255,0.12)"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Box as={section.icon} boxSize={5} />
                      </Box>
                      <Text fontWeight="700">{section.label}</Text>
                      <Text color="blue.50" fontSize="sm" lineHeight="1.7">
                        {section.summary}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </GridItem>
            ))}
          </Grid>
        </SimpleGrid>
      </Box>

      <Tabs index={currentTabIndex} variant="enclosed" colorScheme="blue" isLazy>
        <TabList className="doc-no-print" flexWrap="wrap" gap={3}>
          {DOC_SECTIONS.map((section) => (
            <Tab
              key={section.id}
              as={RouterLink}
              to={`/docs#${section.id}`}
              borderRadius="full"
              bg="rgba(255,255,255,0.72)"
              px={5}
              py={3}
            >
              <HStack spacing={2}>
                <Box as={section.icon} boxSize={4} />
                <Text>{section.label}</Text>
              </HStack>
            </Tab>
          ))}
        </TabList>

        <TabPanels pt={6}>
          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 280px' }} gap={6}>
              <VStack align="stretch" spacing={6}>
                <SimpleGrid columns={{ base: 1, xl: 4 }} spacing={4}>
                <BlueprintCard
                  title="文档目的"
                  items={[
                    '建立统一需求基线，明确业务目标、边界、规则与验收依据。',
                    '减少业务方、实施方与开发方之间对功能范围和流程理解的偏差。',
                  ]}
                />
                <BlueprintCard
                  title="产品定位"
                  items={[
                    '面向局域网内部试运行和演示的轻量 CRM 工作台。',
                    '聚焦客户经营、销售推进、营销过程与经营分析的统一协同。',
                  ]}
                />
                <BlueprintCard
                  title="适用对象"
                  items={[
                    '业务管理层、销售、营销、客服、系统管理员。',
                    '局域网内部署、实施验证和演示展示场景。',
                  ]}
                />
                <BlueprintCard
                  title="建设范围"
                  items={[
                    '包含客户、销售、营销、报表、设置和在线文档模块。',
                    '本期不包含 ERP 集成、审批流、多租户和外部协同平台打通。',
                  ]}
                />
                </SimpleGrid>

                <SectionCard id="requirements-overview" title="1. 产品概述">
                <Text color="gray.600" lineHeight="1.9">
                  蓝鲸CRM 的核心建设目标是以较低部署复杂度支撑典型 CRM 业务闭环，将客户资料、互动记录、商机阶段、订单结果和经营看板统一到一个桌面端友好的局域网工作台中。产品强调“快速可访问、过程可留痕、结果可复盘、资料可交付”四项能力。
                </Text>
                </SectionCard>

                <SectionCard id="requirements-flow" title="2. 业务场景与流程">
                <VStack align="stretch" spacing={4}>
                  <Text color="gray.600" lineHeight="1.9">
                    系统主流程遵循 CRM 行业通用链路：“营销获客 → 线索识别 → 客户建档 → 持续跟进 → 商机推进 → 订单交付 → 经营复盘”。其中，客户为主实体，互动、商机、订单和活动均围绕客户形成纵向业务链。
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 6 }} spacing={3}>
                    {[
                      ['营销获客', '形成活动和线索来源。'],
                      ['线索识别', '分配负责人和优先级。'],
                      ['客户建档', '沉淀客户主数据。'],
                      ['互动跟进', '记录触达与下一步动作。'],
                      ['商机推进', '跟踪金额与阶段变化。'],
                      ['结果复盘', '通过报表回看转化与效率。'],
                    ].map(([title, desc]) => (
                      <Card key={title} bg="white" borderRadius="22px" border="1px solid rgba(47,128,237,0.1)" boxShadow="none">
                        <CardBody>
                          <Text fontWeight="700" mb={2}>{title}</Text>
                          <Text fontSize="sm" color="gray.600" lineHeight="1.8">{desc}</Text>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                </VStack>
                </SectionCard>

                <SectionCard id="requirements-functional" title="3. 功能性需求">
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                  <BlueprintCard
                    title="客户管理"
                    items={[
                      '支持按姓名、邮箱、公司、状态、等级等条件搜索与筛选客户。',
                      '支持客户详情查看、互动时间线展示和客户状态分层展示。',
                      '支持列表页直接发起跟进，减少进入详情后的重复操作。',
                    ]}
                  />
                  <BlueprintCard
                    title="互动管理"
                    items={[
                      '互动记录需支持类型、主题、说明、结果判断、时长和下一步动作等字段。',
                      '新增互动成功后必须即时刷新客户列表摘要与详情时间线，保证数据一致性。',
                    ]}
                  />
                  <BlueprintCard
                    title="销售与营销"
                    items={[
                      '支持商机与订单查看、阶段状态展示和报表统计使用。',
                      '支持营销活动与线索列表展示，为来源分析和转化复盘提供数据基础。',
                    ]}
                  />
                  <BlueprintCard
                    title="部署与演示"
                    items={[
                      '支持局域网固定入口访问、脚本化启动与状态检查。',
                      '支持演示数据库初始化和 DMG 分发，满足本地展示与试运行需要。',
                    ]}
                  />
                </SimpleGrid>
                </SectionCard>

                <SectionCard id="requirements-rules" title="4. 业务规则">
                <OrderedList spacing={3} color="gray.700" pl={4}>
                  <ListItem>客户状态与客户等级属于两套不同维度的数据，前者表达生命周期位置，后者表达业务价值等级。</ListItem>
                  <ListItem>互动记录是客户经营过程的事实留痕，不得只修改摘要而不保留原始互动明细。</ListItem>
                  <ListItem>客户列表中的跟进摘要必须来源于最新互动记录，禁止维护独立的人工冗余字段。</ListItem>
                  <ListItem>报表中的统计结果基于系统当前录入数据生成，不替代财务或 ERP 正式核算口径。</ListItem>
                </OrderedList>
                </SectionCard>

                <SectionCard id="requirements-nfr" title="5. 非功能需求与验收标准">
                <UnorderedList spacing={3} color="gray.700" pl={4}>
                  <ListItem>可用性：CRM 前端、后端入口和健康检查地址均可从本机及局域网设备访问。</ListItem>
                  <ListItem>一致性：客户列表、客户详情、报表中的关键客户和互动统计口径必须一致。</ListItem>
                  <ListItem>可维护性：系统应提供启动脚本、初始化脚本、状态检查和在线文档，降低接手成本。</ListItem>
                  <ListItem>交付完整性：必须具备演示数据、部署说明、用户手册和开发过程说明。</ListItem>
                </UnorderedList>
                </SectionCard>
              </VStack>
              <SectionCard title="目录导航">
                <VStack align="stretch" spacing={2} position={{ xl: 'sticky' }} top={{ xl: '92px' }} className="doc-no-print">
                  <Text fontSize="sm" color="gray.500">{currentSection.label}</Text>
                  {DOC_OUTLINES.requirements.map((item) => (
                    <Button
                      key={item.id}
                      as="a"
                      href={`#${item.id}`}
                      justifyContent="flex-start"
                      variant="ghost"
                      whiteSpace="normal"
                      h="auto"
                      py={3}
                      px={3}
                    >
                      {item.label}
                    </Button>
                  ))}
                </VStack>
              </SectionCard>
            </Grid>
          </TabPanel>

          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 280px' }} gap={6}>
              <VStack align="stretch" spacing={6}>
                <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4}>
                <BlueprintCard
                  title="设计原则"
                  items={[
                    '前后端分离、统一认证、统一响应、统一视觉风格。',
                    '优先满足局域网可用与演示交付，再逐步扩展企业级能力。',
                  ]}
                />
                <BlueprintCard
                  title="关键技术栈"
                  items={[
                    '前端：React、TypeScript、Vite、Chakra UI。',
                    '后端：Flask、SQLAlchemy、JWT、SQLite。',
                  ]}
                />
                <BlueprintCard
                  title="部署形态"
                  items={[
                    '本地单机场景部署，前后端分别监听固定局域网地址。',
                    '通过脚本和 DMG 启动器降低桌面端运维复杂度。',
                  ]}
                />
                </SimpleGrid>

                <SectionCard id="design-architecture" title="1. 总体架构设计">
                <UnorderedList spacing={3} color="gray.700" pl={4}>
                  <ListItem>前端为单页应用，负责工作台页面、交互流程、数据可视化和在线文档展示。</ListItem>
                  <ListItem>后端提供认证、客户、销售、营销和报表接口，并对业务数据进行持久化。</ListItem>
                  <ListItem>认证机制采用 Access Token + Refresh Token 模式，前端通过拦截器自动注入与刷新令牌。</ListItem>
                  <ListItem>SQLite 作为当前版本默认数据库，用于支撑演示和本地试运行场景。</ListItem>
                </UnorderedList>
                </SectionCard>

                <SectionCard id="design-layering" title="2. 分层设计">
                <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4}>
                  <BlueprintCard
                    title="表示层"
                    items={[
                      '页面组件、筛选栏、弹窗、图表和文档内容渲染。',
                      '代表页面：Dashboard、Customers、Reports、OnlineDocs。',
                    ]}
                  />
                  <BlueprintCard
                    title="应用服务层"
                    items={[
                      '`api.ts` 封装 HTTP 请求、认证拦截器和统一错误处理。',
                      'AuthProvider 负责登录态初始化、权限检查和导航跳转。',
                    ]}
                  />
                  <BlueprintCard
                    title="领域与数据层"
                    items={[
                      'Flask Blueprints 按领域拆分为 auth、customers、sales、marketing、reports。',
                      'SQLAlchemy 模型承载 User、Customer、Interaction、Opportunity、Order、Lead、Campaign 等实体。',
                    ]}
                  />
                </SimpleGrid>
                </SectionCard>

                <SectionCard id="design-modules" title="3. 模块详细设计">
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                  <BlueprintCard
                    title="认证模块"
                    items={[
                      '登录接口返回 access_token、refresh_token 和用户信息。',
                      '进入系统时先读取本地登录态，再通过 `/me` 校验当前用户。',
                      'refresh 自身失败时直接清空本地状态并跳回登录页，避免初始化挂起。',
                    ]}
                  />
                  <BlueprintCard
                    title="客户与互动模块"
                    items={[
                      '客户列表接口返回客户主信息与互动摘要，减少列表页二次拼装成本。',
                      '新增互动成功后同步刷新列表和详情时间线，保持视图一致。',
                    ]}
                  />
                  <BlueprintCard
                    title="销售与营销模块"
                    items={[
                      '销售模块关注商机与订单，营销模块关注活动与线索，二者共同服务经营分析。',
                      '报表通过销售与活动数据生成收入趋势、赢单率和互动结构等指标。',
                    ]}
                  />
                  <BlueprintCard
                    title="在线文档模块"
                    items={[
                      '采用静态内容组件化方式承载正式文档资料。',
                      '统一视觉、标签和卡片布局，便于后续扩展为导出或打印版本。',
                    ]}
                  />
                </SimpleGrid>
                </SectionCard>

                <SectionCard id="design-ui" title="4. 交互与页面设计">
                <Grid templateColumns={{ base: '1fr', lg: '1.2fr 0.8fr' }} gap={4}>
                  <Card bg="white" borderRadius="24px" border="1px solid rgba(47,128,237,0.12)" boxShadow="none">
                    <CardBody>
                      <Text fontWeight="700" color="brand.700" mb={3}>
                        页面结构示意
                      </Text>
                      <VStack align="stretch" spacing={3}>
                        <Box borderRadius="18px" bg="blue.700" color="white" px={4} py={3}>
                          顶部品牌栏 / 用户信息 / 全局导航入口
                        </Box>
                        <HStack align="stretch" spacing={3}>
                          <Box flex="0 0 220px" borderRadius="18px" bg="blue.50" px={4} py={4}>
                            仪表板
                            <br />
                            客户管理
                            <br />
                            销售管理
                            <br />
                            营销管理
                            <br />
                            报表分析
                            <br />
                            系统设置
                            <br />
                            在线文档
                          </Box>
                          <Box flex="1" borderRadius="18px" bg="gray.50" px={4} py={4}>
                            工作区内容
                            <br />
                            统计卡片 / 列表 / 详情 / 表单 / 时间线 / 图表
                          </Box>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>

                  <Card bg="white" borderRadius="24px" border="1px solid rgba(47,128,237,0.12)" boxShadow="none">
                    <CardBody>
                      <Text fontWeight="700" color="brand.700" mb={3}>
                        交互设计要点
                      </Text>
                      <UnorderedList spacing={3} color="gray.700" pl={4}>
                        <ListItem>高频操作尽量前置在列表页，例如直接记录跟进。</ListItem>
                        <ListItem>详情页承担上下文查看和时间线回顾，不叠加过多深层弹窗。</ListItem>
                        <ListItem>提交成功后自动刷新上层摘要，减少用户二次确认成本。</ListItem>
                      </UnorderedList>
                    </CardBody>
                  </Card>
                </Grid>
                </SectionCard>

                <SectionCard id="design-api" title="5. 接口与数据设计">
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                  <SectionCard title="主要接口">
                    <UnorderedList spacing={3} color="gray.700" pl={4}>
                      <ListItem>`POST /api/login`：用户登录。</ListItem>
                      <ListItem>`POST /api/refresh`：刷新访问令牌。</ListItem>
                      <ListItem>`GET /api/me`：获取当前用户。</ListItem>
                      <ListItem>`GET /api/customers`：客户列表及跟进摘要。</ListItem>
                      <ListItem>`GET /api/customers/:id/interactions`：客户互动时间线。</ListItem>
                      <ListItem>`POST /api/customers/:id/interactions`：新增互动记录。</ListItem>
                      <ListItem>`GET /api/reports/dashboard|sales|activity`：经营分析报表。</ListItem>
                    </UnorderedList>
                  </SectionCard>

                  <SectionCard title="核心实体">
                    <UnorderedList spacing={3} color="gray.700" pl={4}>
                      <ListItem>User：登录账户、角色、状态、基础联系方式。</ListItem>
                      <ListItem>Customer：客户主数据、状态、等级、负责人、备注。</ListItem>
                      <ListItem>CustomerInteraction：互动类型、主题、说明、结果、下一步动作。</ListItem>
                      <ListItem>Opportunity / Order：销售阶段、金额、交付状态和负责人。</ListItem>
                      <ListItem>Lead / Campaign：线索来源、活动对象和转化辅助数据。</ListItem>
                    </UnorderedList>
                  </SectionCard>
                </SimpleGrid>
                </SectionCard>

                <SectionCard id="design-deploy" title="6. 部署与运行设计">
                <OrderedList spacing={3} color="gray.700" pl={4}>
                  <ListItem>前端监听 `172.16.1.32:3000`，后端监听 `172.16.1.32:5006`，支持局域网访问。</ListItem>
                  <ListItem>通过 `start.sh`、`stop.sh`、`status.sh` 管理服务生命周期。</ListItem>
                  <ListItem>通过 DMG 启动器封装桌面端双击启动能力，便于演示与交付。</ListItem>
                  <ListItem>通过初始化脚本刷新演示数据，确保客户、互动、商机和订单链路完整。</ListItem>
                </OrderedList>
                </SectionCard>
              </VStack>
              <SectionCard title="目录导航">
                <VStack align="stretch" spacing={2} position={{ xl: 'sticky' }} top={{ xl: '92px' }} className="doc-no-print">
                  <Text fontSize="sm" color="gray.500">{currentSection.label}</Text>
                  {DOC_OUTLINES.design.map((item) => (
                    <Button key={item.id} as="a" href={`#${item.id}`} justifyContent="flex-start" variant="ghost" whiteSpace="normal" h="auto" py={3} px={3}>
                      {item.label}
                    </Button>
                  ))}
                </VStack>
              </SectionCard>
            </Grid>
          </TabPanel>

          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 280px' }} gap={6}>
              <VStack align="stretch" spacing={6}>
                <SimpleGrid columns={{ base: 1, xl: 4 }} spacing={4}>
                <BlueprintCard
                  title="文档对象"
                  items={[
                    '最终用户、演示人员、实施顾问、局域网内试运行人员。',
                    '以桌面浏览器和 macOS 使用场景为主。',
                  ]}
                />
                <BlueprintCard
                  title="访问地址"
                  items={[
                    'CRM 前端：`http://172.16.1.32:3000`',
                    '后端健康检查：`http://172.16.1.32:5006/health`',
                  ]}
                />
                <BlueprintCard
                  title="推荐账号"
                  items={[
                    '管理员：`admin / admin123`',
                    '销售：`sales_wang / demo123`',
                    '营销：`marketing_chen / demo123`',
                  ]}
                />
                <BlueprintCard
                  title="使用目标"
                  items={[
                    '完成登录、浏览、跟进、查看报表与排查常见问题。',
                    '帮助用户在不阅读代码的前提下使用系统。',
                  ]}
                />
                </SimpleGrid>

                <SectionCard id="guide-login" title="1. 登录与进入系统">
                <OrderedList spacing={3} color="gray.700" pl={4}>
                  <ListItem>确认 CRM 服务已启动后，通过浏览器访问前端入口地址。</ListItem>
                  <ListItem>输入演示账号或正式账号完成登录。</ListItem>
                  <ListItem>登录成功后，系统根据角色自动跳转至默认首页，例如管理员进入仪表盘，销售进入客户页。</ListItem>
                </OrderedList>
                </SectionCard>

                <SectionCard id="guide-process" title="2. 主要操作流程">
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                  <SectionCard title="客户跟进流程">
                    <OrderedList spacing={3} color="gray.700" pl={4}>
                      <ListItem>进入客户管理，使用顶部筛选条件定位客户。</ListItem>
                      <ListItem>点击列表中的“查看”进入客户详情，或直接点击“记录跟进”。</ListItem>
                      <ListItem>在表单中填写互动类型、主题、说明、结果判断和下一步动作。</ListItem>
                      <ListItem>提交成功后查看列表中的最新跟进摘要是否已同步更新。</ListItem>
                    </OrderedList>
                  </SectionCard>

                  <SectionCard title="经营分析查看流程">
                    <OrderedList spacing={3} color="gray.700" pl={4}>
                      <ListItem>进入仪表盘查看客户量、收入、互动量和近期增长动能。</ListItem>
                      <ListItem>进入报表分析查看收入趋势、赢单率、互动结构和执行动能。</ListItem>
                      <ListItem>结合客户页和销售页回溯数据来源，确认分析结果对应的业务对象。</ListItem>
                    </OrderedList>
                  </SectionCard>
                </SimpleGrid>
                </SectionCard>

                <SectionCard id="guide-pages" title="3. 页面说明">
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                  <BlueprintCard title="仪表板" items={['查看经营总览、增长趋势和阶段统计。']} />
                  <BlueprintCard title="客户管理" items={['管理客户资料、查看详情、维护互动时间线和跟进摘要。']} />
                  <BlueprintCard title="销售管理" items={['查看商机、订单以及销售推进结果。']} />
                  <BlueprintCard title="营销管理" items={['查看活动、线索和来源相关数据。']} />
                  <BlueprintCard title="报表分析" items={['查看收入、赢单率、互动结构和执行节奏。']} />
                  <BlueprintCard title="在线文档" items={['查阅需求、设计、手册和开发日志。']} />
                </SimpleGrid>
                </SectionCard>

                <SectionCard id="guide-fields" title="4. 字段口径与使用建议">
                <UnorderedList spacing={3} color="gray.700" pl={4}>
                  <ListItem>客户状态表示生命周期阶段，客户等级表示业务价值，不建议混用或替代。</ListItem>
                  <ListItem>互动结果建议尽量填写明确，例如积极、待确认、推进顺利等，便于后续筛查。</ListItem>
                  <ListItem>下一步动作建议包含时间节点和动作承诺，例如“周五发送修订版方案”。</ListItem>
                  <ListItem>报表页面用于经营分析，不建议作为正式财务或合同结算依据。</ListItem>
                </UnorderedList>
                </SectionCard>

                <SectionCard id="guide-faq" title="5. 常见问题与排障">
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontWeight="700" color="gray.800">
                      5.1 页面一直 loading
                    </Text>
                    <Text mt={2} color="gray.600" lineHeight="1.8">
                      多数情况下是本地浏览器残留了失效 token。刷新页面后系统会重新校验登录态；若仍异常，请重新登录并检查前后端服务状态。
                    </Text>
                  </Box>
                  <Divider />
                  <Box>
                    <Text fontWeight="700" color="gray.800">
                      5.2 新增互动后没有看到列表变化
                    </Text>
                    <Text mt={2} color="gray.600" lineHeight="1.8">
                      正常情况下提交成功后列表摘要和详情时间线都会更新。若没有变化，请确认本次提交是否成功、当前筛选条件是否过滤掉了目标客户。
                    </Text>
                  </Box>
                  <Divider />
                  <Box>
                    <Text fontWeight="700" color="gray.800">
                      5.3 局域网其他机器无法访问
                    </Text>
                    <Text mt={2} color="gray.600" lineHeight="1.8">
                      请确认本机防火墙、固定 IP、端口监听和服务状态正常，重点检查 `3000` 和 `5006` 两个端口。
                    </Text>
                  </Box>
                </VStack>
                </SectionCard>
              </VStack>
              <SectionCard title="目录导航">
                <VStack align="stretch" spacing={2} position={{ xl: 'sticky' }} top={{ xl: '92px' }} className="doc-no-print">
                  <Text fontSize="sm" color="gray.500">{currentSection.label}</Text>
                  {DOC_OUTLINES.guide.map((item) => (
                    <Button key={item.id} as="a" href={`#${item.id}`} justifyContent="flex-start" variant="ghost" whiteSpace="normal" h="auto" py={3} px={3}>
                      {item.label}
                    </Button>
                  ))}
                </VStack>
              </SectionCard>
            </Grid>
          </TabPanel>

          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 280px' }} gap={6}>
              <VStack align="stretch" spacing={5}>
              {timelineEntries.map((entry, index) => (
                <Card
                  id={`journal-step-${index + 1}`}
                  className="doc-section-card"
                  key={entry.time}
                  scrollMarginTop="96px"
                  bg="rgba(255,255,255,0.96)"
                  borderRadius="26px"
                  boxShadow="0 18px 44px rgba(20, 62, 120, 0.07)"
                >
                  <CardBody>
                    <Grid templateColumns={{ base: '1fr', lg: '220px 1fr' }} gap={5}>
                      <Box>
                        <Badge colorScheme="blue" mb={3}>
                          Step {String(index + 1).padStart(2, '0')}
                        </Badge>
                        <Heading size="sm" color="brand.700">
                          {entry.time}
                        </Heading>
                      </Box>
                      <Box>
                        <Heading size="md" mb={3}>
                          {entry.title}
                        </Heading>
                        <Text color="gray.600" lineHeight="1.9">
                          {entry.summary}
                        </Text>
                      </Box>
                    </Grid>
                  </CardBody>
                </Card>
              ))}
              </VStack>
              <SectionCard title="目录导航">
                <VStack align="stretch" spacing={2} position={{ xl: 'sticky' }} top={{ xl: '92px' }} className="doc-no-print">
                  <Text fontSize="sm" color="gray.500">{currentSection.label}</Text>
                  {DOC_OUTLINES.journal.map((item) => (
                    <Button key={item.id} as="a" href={`#${item.id}`} justifyContent="flex-start" variant="ghost" whiteSpace="normal" h="auto" py={3} px={3}>
                      {item.label}
                    </Button>
                  ))}
                </VStack>
              </SectionCard>
            </Grid>
          </TabPanel>

          <TabPanel px={0}>
            <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 280px' }} gap={6}>
              <VStack align="stretch" spacing={6}>
                <SimpleGrid columns={{ base: 1, xl: 4 }} spacing={4}>
                  <BlueprintCard
                    title="版本定位"
                    items={[
                      'v1.3 目标不是增加零散功能，而是把 CRM 从“可演示”推进到“更可持续使用”。',
                      '重点提升桌面端工作流连贯性、跟进推进能力和部署稳定性。',
                    ]}
                  />
                  <BlueprintCard
                    title="规划原则"
                    items={[
                      '优先做高频路径、明显痛点和可形成复用基础能力的改造。',
                      '优先支持客户跟进、经营分析、部署稳定和工程质量四条主线。',
                    ]}
                  />
                  <BlueprintCard
                    title="交付对象"
                    items={[
                      '面向业务使用者、实施方和后续维护人员。',
                      '兼顾演示可用性与日常持续使用的可行性。',
                    ]}
                  />
                  <BlueprintCard
                    title="阶段目标"
                    items={[
                      '让核心流程从“能用”提升到“顺手、稳定、可追踪”。',
                      '为后续任务中心、提醒中心和数据库升级做好基础准备。',
                    ]}
                  />
                </SimpleGrid>

                <SectionCard id="roadmap-goal" title="1. 版本目标">
                  <Text color="gray.600" lineHeight="1.9">
                    v1.3 版本建议聚焦三个方向：第一，进一步优化桌面端主工作流，让客户详情、互动录入和任务推进更顺；第二，补齐跟进闭环能力，让互动不仅能记录，还能驱动下一步动作；第三，提升部署、版本和质量保障能力，让系统更适合持续使用和多轮演示。
                  </Text>
                </SectionCard>

                <SectionCard id="roadmap-p0" title="2. P0 必做事项">
                  <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                    <BlueprintCard
                      title="桌面端工作流"
                      items={[
                        '将客户详情升级为侧边详情面板，减少多层弹窗切换成本。',
                        '在详情面板中整合客户信息、时间线、编辑入口和快捷跟进。',
                      ]}
                    />
                    <BlueprintCard
                      title="跟进闭环"
                      items={[
                        '为互动记录新增“下次跟进时间”“提醒状态”“负责人”等字段。',
                        '新增“我的待跟进”视图，集中展示今日、逾期和即将到期的动作。',
                      ]}
                    />
                    <BlueprintCard
                      title="筛选效率"
                      items={[
                        '支持保存常用筛选条件，例如“本周待跟进”“沉默客户”“高价值客户”。',
                        '支持一键恢复最近使用的筛选视图，提高销售日常打开效率。',
                      ]}
                    />
                    <BlueprintCard
                      title="版本与回归"
                      items={[
                        '增加版本接口，让前后端、文档和页脚展示统一版本来源。',
                        '补最小化回归测试，至少覆盖登录、客户列表、互动新增、报表与文档页。',
                      ]}
                    />
                  </SimpleGrid>
                </SectionCard>

                <SectionCard id="roadmap-p1" title="3. P1 高价值增强">
                  <UnorderedList spacing={3} color="gray.700" pl={4}>
                    <ListItem>报表增加时间范围切换、个人/团队视角切换和指标口径说明。</ListItem>
                    <ListItem>客户状态流转增加明确规则，例如从线索转潜客必须存在有效互动，从潜客转成交需有关联订单。</ListItem>
                    <ListItem>商机、订单、互动三者增加联动提示，例如商机推进到关键阶段时自动建议补一条互动。</ListItem>
                    <ListItem>统一空状态、错误状态和成功反馈设计，让页面质量感更完整。</ListItem>
                    <ListItem>在线文档补充封面、修订记录、页眉页脚，进一步贴近正式交付件。</ListItem>
                  </UnorderedList>
                </SectionCard>

                <SectionCard id="roadmap-ops" title="4. 部署与运维优化">
                  <OrderedList spacing={3} color="gray.700" pl={4}>
                    <ListItem>将前后端改造成更稳定的守护启动方式，避免进程退出后页面不可用。</ListItem>
                    <ListItem>增强 `status.sh`，输出前端、后端、数据库、端口和局域网入口的完整检查结果。</ListItem>
                    <ListItem>增加 SQLite 自动备份和恢复说明，降低演示数据和本地数据丢失风险。</ListItem>
                    <ListItem>整理标准部署清单，统一 `.env`、端口、IP、脚本和初始化流程。</ListItem>
                  </OrderedList>
                </SectionCard>

                <SectionCard id="roadmap-longterm" title="5. 中长期演进">
                  <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                    <BlueprintCard
                      title="业务能力演进"
                      items={[
                        '增加任务中心、提醒中心和首页待办视图。',
                        '进一步细化权限与负责人数据隔离能力。',
                        '探索邮件、日历或企业微信等外部触达能力接入。',
                      ]}
                    />
                    <BlueprintCard
                      title="技术能力演进"
                      items={[
                        '做路由级代码拆分，降低前端主包体积。',
                        '为 PostgreSQL 迁移预留配置与数据迁移策略。',
                        '逐步将演示型系统演进为可持续使用的轻业务平台。',
                      ]}
                    />
                  </SimpleGrid>
                </SectionCard>
              </VStack>
              <SectionCard title="目录导航">
                <VStack align="stretch" spacing={2} position={{ xl: 'sticky' }} top={{ xl: '92px' }} className="doc-no-print">
                  <Text fontSize="sm" color="gray.500">{currentSection.label}</Text>
                  {DOC_OUTLINES.roadmap.map((item) => (
                    <Button key={item.id} as="a" href={`#${item.id}`} justifyContent="flex-start" variant="ghost" whiteSpace="normal" h="auto" py={3} px={3}>
                      {item.label}
                    </Button>
                  ))}
                </VStack>
              </SectionCard>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
};

export default OnlineDocs;
