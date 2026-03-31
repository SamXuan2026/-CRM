import { useContext, useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Container,
  Heading,
  Text,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { AuthContext } from '../contexts/AuthProvider';

/**
 * Register 页面
 */
const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const auth = useContext(AuthContext);
  const toast = useToast();

  // 重定向已登录用户
  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * 处理表单输入变化
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * 验证表单数据
   */
  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('请输入用户名');
      return false;
    }

    if (formData.username.length < 3) {
      setError('用户名至少需要3个字符');
      return false;
    }

    if (!formData.email.trim()) {
      setError('请输入邮箱地址');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }

    if (!formData.password.trim()) {
      setError('请输入密码');
      return false;
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6个字符');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    return true;
  };

  /**
   * 处理注册表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      await auth.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
      });

      toast({
        title: '注册成功',
        description: '账户创建成功，欢迎使用蓝鲸CRM！',
        status: 'success',
        duration: 3,
        isClosable: true,
      });
    } catch (error: any) {
      const errorMessage = error.message || '注册失败，请稍后重试';
      setError(errorMessage);

      toast({
        title: '注册失败',
        description: errorMessage,
        status: 'error',
        duration: 3,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      bgGradient="linear(to-br, #f4f9ff, #dcebff, #bedcff)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={12}
      px={4}
    >
      <Container maxW="sm">
        <VStack spacing={8} align="stretch">
          {/* 头部 */}
          <Box textAlign="center">
            <Heading as="h1" size="2xl" mb={2} color="brand.700">
              创建账户
            </Heading>
            <Text color="gray.600" fontSize="md">
              加入蓝鲸CRM，开启高效销售之旅
            </Text>
          </Box>

          {/* 注册表单 */}
          <Box
            bg="rgba(255,255,255,0.92)"
            p={8}
            rounded="3xl"
            boxShadow="0 18px 55px rgba(18, 61, 117, 0.12)"
            as="form"
            onSubmit={handleSubmit}
            border="1px solid rgba(255,255,255,0.45)"
          >
            {/* 错误提示 */}
            {error && (
              <Alert status="error" rounded="md" mb={6}>
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* 用户名 */}
            <FormControl mb={4} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                用户名
              </FormLabel>
              <Input
                name="username"
                type="text"
                placeholder="选择一个用户名"
                value={formData.username}
                onChange={handleChange}
                isDisabled={isLoading}
                size="lg"
                border="2px"
                borderColor="gray.200"
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 1px blue.500',
                }}
              />
            </FormControl>

            {/* 邮箱 */}
            <FormControl mb={4} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                邮箱地址
              </FormLabel>
              <Input
                name="email"
                type="email"
                placeholder="输入您的邮箱"
                value={formData.email}
                onChange={handleChange}
                isDisabled={isLoading}
                size="lg"
                border="2px"
                borderColor="gray.200"
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 1px blue.500',
                }}
              />
            </FormControl>

            {/* 密码 */}
            <FormControl mb={4} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                密码
              </FormLabel>
              <InputGroup size="lg">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="创建密码"
                  value={formData.password}
                  onChange={handleChange}
                  isDisabled={isLoading}
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px blue.500',
                  }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label="切换密码显示"
                    icon={showPassword ? <FiEyeOff /> : <FiEye />}
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    isDisabled={isLoading}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {/* 确认密码 */}
            <FormControl mb={4} isRequired>
              <FormLabel fontWeight="bold" color="gray.700">
                确认密码
              </FormLabel>
              <InputGroup size="lg">
                <Input
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  isDisabled={isLoading}
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px blue.500',
                  }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label="切换密码显示"
                    icon={showConfirm ? <FiEyeOff /> : <FiEye />}
                    variant="ghost"
                    onClick={() => setShowConfirm(!showConfirm)}
                    isDisabled={isLoading}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {/* 名字和姓氏 */}
            <HStack mb={4} spacing={3}>
              <FormControl>
                <FormLabel fontWeight="bold" color="gray.700" fontSize="sm">
                  名字
                </FormLabel>
                <Input
                  name="firstName"
                  type="text"
                  placeholder="名字"
                  value={formData.firstName}
                  onChange={handleChange}
                  isDisabled={isLoading}
                  size="lg"
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px blue.500',
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="bold" color="gray.700" fontSize="sm">
                  姓氏
                </FormLabel>
                <Input
                  name="lastName"
                  type="text"
                  placeholder="姓氏"
                  value={formData.lastName}
                  onChange={handleChange}
                  isDisabled={isLoading}
                  size="lg"
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px blue.500',
                  }}
                />
              </FormControl>
            </HStack>

            {/* 电话 */}
            <FormControl mb={6}>
              <FormLabel fontWeight="bold" color="gray.700">
                电话（可选）
              </FormLabel>
              <Input
                name="phone"
                type="tel"
                placeholder="输入您的电话号码"
                value={formData.phone}
                onChange={handleChange}
                isDisabled={isLoading}
                size="lg"
                border="2px"
                borderColor="gray.200"
                _focus={{
                  borderColor: 'blue.500',
                  boxShadow: '0 0 0 1px blue.500',
                }}
              />
            </FormControl>

            {/* 注册按钮 */}
            <Button
              type="submit"
              width="100%"
              size="lg"
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="创建账户中..."
              mb={4}
            >
              创建账户
            </Button>

            {/* 登录链接 */}
            <Text textAlign="center" color="gray.600" fontSize="sm">
              已有账户？{' '}
              <RouterLink to="/login">
                <Text as="span" color="blue.600" fontWeight="bold" cursor="pointer">
                  立即登录
                </Text>
              </RouterLink>
            </Text>
          </Box>

          {/* 提示信息 */}
          <Box
            bg="gray.50"
            p={4}
            rounded="md"
            border="1px"
            borderColor="gray.200"
            fontSize="xs"
            color="gray.600"
            textAlign="center"
          >
            <Text>
              📋 注册时请使用真实信息，这有助于我们为您提供更好的服务
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default Register;
