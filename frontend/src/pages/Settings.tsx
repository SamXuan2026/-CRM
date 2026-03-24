
import {
  Box,
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
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { user } = useAuth();

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box>
        <Heading size="lg">系统设置</Heading>
        <Text color="gray.600" mt={2}>
          当前页面用于查看账户信息与本地部署建议，便于在 macOS 环境中继续扩展八戒CRM。
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card bg="linear-gradient(180deg, rgba(159,103,48,0.14), rgba(159,103,48,0.04))">
          <CardBody>
            <Stat>
              <StatLabel>当前角色</StatLabel>
              <StatNumber fontSize="2xl">{user?.role || '-'}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="linear-gradient(180deg, rgba(55,153,104,0.14), rgba(55,153,104,0.04))">
          <CardBody>
            <Stat>
              <StatLabel>账户状态</StatLabel>
              <StatNumber fontSize="2xl">{user?.is_active ? '启用' : '停用'}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="linear-gradient(180deg, rgba(42,105,172,0.12), rgba(42,105,172,0.03))">
          <CardBody>
            <Stat>
              <StatLabel>工作台</StatLabel>
              <StatNumber fontSize="2xl">v1.1</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

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
              <Text fontWeight="600">0.2.0</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.600">界面版本</Text>
              <Text fontWeight="600">v1.1</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.600">推荐下一步</Text>
              <Text fontWeight="600">客户页与商机页继续细化表单校验</Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default Settings;
