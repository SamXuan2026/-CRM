import { FormEvent, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FiArrowRight, FiCpu, FiSearch, FiZap } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { aiApi, AiAssistantResponse } from '../services/api';

const quickPrompts = [
  '帮我找最近7天没有跟进的客户',
  '列出王越名下金额大于10万的商机',
  '总结一下当前销售报表',
  '查看客户John最近互动',
];

const formatValue = (value: string | number) => {
  if (typeof value === 'number') {
    return value.toLocaleString('zh-CN');
  }
  return value;
};

const fieldLabelMap: Record<string, string> = {
  name: '名称',
  company: '公司',
  status: '状态',
  owner_name: '负责人',
  stage: '阶段',
  value: '金额',
  order_number: '订单号',
  total_amount: '订单金额',
  subject: '主题',
  interaction_type: '互动类型',
  date: '时间',
  outcome: '结果',
};

const AIAssistant = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAssistantResponse | null>(null);

  const promptPlaceholders = useMemo(
    () => [
      '例如：帮我找最近7天没有跟进的客户',
      '例如：列出王越名下金额大于10万的商机',
      '例如：总结一下当前销售报表',
    ],
    []
  );

  const currentPlaceholder =
    promptPlaceholders[result ? result.items.length % promptPlaceholders.length : 0];

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const content = message.trim();

    if (!content) {
      toast({
        title: '请输入你的需求',
        description: '可以直接用自然语言描述查询或摘要请求。',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      const response = await aiApi.assist({
        message: content,
        context: {
          page: location.pathname,
        },
      });
      setResult(response);
    } catch (error: any) {
      toast({
        title: '智能助手暂时不可用',
        description: error.message || '请求失败，请稍后重试。',
        status: 'error',
        duration: 3200,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = () => {
    if (!result?.target_page) {
      return;
    }

    const search = new URLSearchParams();
    const normalizedQuery = { ...(result.target_query || {}) } as Record<string, any>;

    if (result.intent === 'search_opportunities' && normalizedQuery.min_amount && !normalizedQuery.min_value) {
      normalizedQuery.min_value = normalizedQuery.min_amount;
      delete normalizedQuery.min_amount;
    }

    Object.entries(normalizedQuery).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      search.set(key, String(value));
    });
    search.set('source', 'ai');
    search.set('intent', result.intent);

    navigate({
      pathname: result.target_page,
      search: search.toString() ? `?${search.toString()}` : '',
    });
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Card
        bg="linear-gradient(135deg, rgba(15,58,105,0.95), rgba(31,102,207,0.9) 58%, rgba(89,168,255,0.82))"
        color="white"
        overflow="hidden"
      >
        <CardBody py={{ base: 8, md: 10 }}>
          <Stack direction={{ base: 'column', lg: 'row' }} spacing={8} align={{ base: 'flex-start', lg: 'center' }}>
            <VStack align="stretch" spacing={4} flex="1">
              <Badge alignSelf="flex-start" bg="rgba(255,255,255,0.14)" color="white" border="1px solid rgba(255,255,255,0.18)">
                AI 工作台
              </Badge>
              <Heading size="lg" lineHeight="1.2">
                用自然语言直接拿到客户、商机和报表结果
              </Heading>
              <Text color="blue.50" maxW="720px">
                这是一种并行交互模式，不替代你现在的菜单和表单。你可以直接说出目标，系统会返回摘要、结果卡片，并引导你跳回现有页面继续操作。
              </Text>
              <HStack spacing={3} color="blue.50" flexWrap="wrap">
                <HStack spacing={2}>
                  <FiSearch />
                  <Text fontSize="sm">先支持只读查询</Text>
                </HStack>
                <HStack spacing={2}>
                  <FiCpu />
                  <Text fontSize="sm">复用现有权限与数据范围</Text>
                </HStack>
                <HStack spacing={2}>
                  <FiZap />
                  <Text fontSize="sm">结果可跳回现有页面</Text>
                </HStack>
              </HStack>
            </VStack>
            <Card
              minW={{ base: '100%', lg: '360px' }}
              bg="rgba(255,255,255,0.96)"
              color="gray.800"
              borderRadius="28px"
            >
              <CardBody>
                <Text fontSize="sm" color="gray.500">
                  当前账号
                </Text>
                <Heading size="md" mt={2}>
                  {user?.username}
                </Heading>
                <Text mt={2} color="gray.600">
                  当前角色：{user?.role || '未知'}
                </Text>
                <Divider my={4} />
                <Text fontSize="sm" color="gray.600">
                  第一阶段支持：查客户、查商机、查订单、看报表摘要、看最近互动、生成跟进建议。
                </Text>
              </CardBody>
            </Card>
          </Stack>
        </CardBody>
      </Card>

      <Card bg="rgba(255,255,255,0.95)">
        <CardHeader pb={2}>
          <Heading size="md">输入你的业务问题</Heading>
          <Text mt={2} color="gray.500">
            先从高频中文指令开始，例如“帮我找最近7天没有跟进的客户”。
          </Text>
        </CardHeader>
        <CardBody pt={0}>
          <Box as="form" onSubmit={handleSubmit}>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={currentPlaceholder}
                size="lg"
                bg="white"
              />
              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                isLoading={loading}
                loadingText="解析中"
                px={8}
              >
                立即解析
              </Button>
            </Stack>
          </Box>
          <HStack spacing={3} mt={4} flexWrap="wrap">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                size="sm"
                variant="outline"
                colorScheme="blue"
                onClick={() => setMessage(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </HStack>
        </CardBody>
      </Card>

      {loading && (
        <Card bg="rgba(255,255,255,0.95)">
          <CardBody>
            <HStack spacing={4}>
              <Spinner color="brand.500" thickness="3px" />
              <Text color="gray.600">正在理解你的意图并整理结果...</Text>
            </HStack>
          </CardBody>
        </Card>
      )}

      {result && !loading && (
        <VStack align="stretch" spacing={6}>
          <Alert status="info" borderRadius="24px" bg="blue.50" color="gray.700">
            <AlertIcon color="brand.500" />
            <Box flex="1">
              <AlertDescription fontWeight="600">{result.summary}</AlertDescription>
            </Box>
            {result.target_page && (
              <Button
                rightIcon={<FiArrowRight />}
                colorScheme="blue"
                variant="solid"
                onClick={handleNavigate}
              >
                打开对应页面
              </Button>
            )}
          </Alert>

          {result.cards.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
              {result.cards.map((card, index) => (
                <Card key={`${card.title}-${index}`} bg="rgba(255,255,255,0.95)">
                  <CardBody>
                    <Text fontSize="sm" color="gray.500">
                      {card.title}
                    </Text>
                    <Heading size="lg" mt={2} color="brand.700">
                      {formatValue(card.value)}
                    </Heading>
                    <Badge mt={4} colorScheme="blue" variant="subtle">
                      {card.type}
                    </Badge>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}

          <Card bg="rgba(255,255,255,0.95)">
            <CardHeader>
              <Heading size="md">结果明细</Heading>
              <Text mt={2} color="gray.500">
                当前先展示前 10 条核心结果，后续会逐步支持更多结构化联动。
              </Text>
            </CardHeader>
            <CardBody pt={0}>
              {result.items.length === 0 ? (
                <Text color="gray.500">这次返回的是摘要结果，没有明细列表。</Text>
              ) : (
                <VStack align="stretch" spacing={4}>
                  {result.items.map((item, index) => (
                    <Box
                      key={item.id || `${result.intent}-${index}`}
                      p={4}
                      borderRadius="20px"
                      bg="blue.50"
                      border="1px solid"
                      borderColor="blue.100"
                    >
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                        {Object.entries(item).map(([key, value]) => {
                          if (value === undefined || value === null || value === '') {
                            return null;
                          }
                          return (
                            <Box key={key}>
                              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                                {fieldLabelMap[key] || key}
                              </Text>
                              <Text mt={1} fontWeight="700" color="gray.800" wordBreak="break-word">
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
            </CardBody>
          </Card>
        </VStack>
      )}
    </VStack>
  );
};

export default AIAssistant;
