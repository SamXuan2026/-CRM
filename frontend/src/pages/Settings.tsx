
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  ListItem,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  UnorderedList,
  VStack,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiArrowRight, FiClock, FiFileText, FiLayers, FiMap } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { user } = useAuth();

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box>
        <Heading size="lg">系统设置</Heading>
        <Text color="gray.600" mt={2}>
          当前页面用于查看账户信息与本地部署建议，便于在 macOS 环境中继续扩展蓝鲸CRM。
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card bg="linear-gradient(180deg, rgba(47,128,237,0.14), rgba(47,128,237,0.04))">
          <CardBody>
            <Stat>
              <StatLabel>当前角色</StatLabel>
              <StatNumber fontSize="2xl">{user?.role || '-'}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="linear-gradient(180deg, rgba(32,145,203,0.14), rgba(32,145,203,0.04))">
          <CardBody>
            <Stat>
              <StatLabel>账户状态</StatLabel>
              <StatNumber fontSize="2xl">{user?.is_active ? '启用' : '停用'}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="linear-gradient(180deg, rgba(17,94,163,0.12), rgba(17,94,163,0.03))">
          <CardBody>
            <Stat>
              <StatLabel>工作台</StatLabel>
              <StatNumber fontSize="2xl">v1.2</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardHeader>
          <HStack justify="space-between" align="start">
            <Box>
              <Heading size="md">在线文档</Heading>
              <Text mt={2} color="gray.600">
                统一查看需求说明、详细设计、用户使用说明书和开发日志回顾。
              </Text>
            </Box>
            <Button
              as={RouterLink}
              to="/docs"
              rightIcon={<FiArrowRight />}
              colorScheme="blue"
              variant="outline"
            >
              打开文档中心
            </Button>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
            {[
              { icon: FiMap, title: '需求说明书', text: '聚焦业务目标、角色职责、模块边界和流程设计。' },
              { icon: FiLayers, title: '详细设计', text: '整理架构、页面层次、接口协作与部署方案。' },
              { icon: FiFileText, title: '用户使用说明书', text: '沉淀登录、客户跟进、报表查看等操作方法。' },
              { icon: FiClock, title: '开发日志回顾', text: '以日记形式回顾每轮迭代和阶段成果。' },
            ].map((item) => (
              <Card
                key={item.title}
                bg="linear-gradient(180deg, rgba(47,128,237,0.12), rgba(47,128,237,0.03))"
                borderRadius="24px"
                boxShadow="none"
                border="1px solid rgba(47,128,237,0.1)"
              >
                <CardBody>
                  <VStack align="start" spacing={3}>
                    <Box
                      w="42px"
                      h="42px"
                      borderRadius="18px"
                      bg="white"
                      color="brand.600"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Box as={item.icon} boxSize={5} />
                    </Box>
                    <Heading size="sm">{item.title}</Heading>
                    <Text color="gray.600" fontSize="sm" lineHeight="1.8">
                      {item.text}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md">当前账户</Heading>
        </CardHeader>
        <CardBody>
          <Text>用户名：{user?.username || '-'}</Text>
          <Text>邮箱：{user?.email || '-'}</Text>
          <Text>角色：{user?.role || '-'}</Text>
          <Text>姓名：{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || '-'}</Text>
          <Text>电话：{user?.phone || '-'}</Text>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md">本地部署建议</Heading>
        </CardHeader>
        <CardBody>
          <UnorderedList spacing={2}>
            <ListItem>SQLite 适合本地单机场景，后续可切换到 PostgreSQL 提升并发与备份能力。</ListItem>
            <ListItem>建议将 `.env` 中的密钥替换为随机值，并启用定时备份脚本写入指定本地目录。</ListItem>
            <ListItem>邮件与日历集成可通过环境变量配置第三方服务，先在本地网络环境中完成连通性测试。</ListItem>
          </UnorderedList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md">当前建议</Heading>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text color="gray.600">前端版本</Text>
              <Text fontWeight="600">1.2.0</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.600">界面版本</Text>
              <Text fontWeight="600">v1.2</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.600">推荐下一步</Text>
              <Text fontWeight="600">继续补全角色化登录引导与详情页联动</Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default Settings;
