/// <reference types="vite/client" />

import axios, { AxiosRequestConfig } from 'axios';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      VITE_API_BASE_URL?: string;
    }
  }
}

// API 响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
  data?: T;
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  details?: Record<string, any>;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: any;
}

// API 基地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? 'http://localhost:5006/api' : '/api');

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器 - 添加认证令牌
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 处理错误、令牌过期和自动刷新
 */
let isRefreshing = false;
let failedQueue: Array<{
  onSuccess: (token: string) => void;
  onError: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.onError(error);
    } else {
      prom.onSuccess(token!);
    }
  });

  isRefreshing = false;
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const originalRequest = error.config;

    // 处理 401 未授权
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            onSuccess: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            onError: (err) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        return authApi
          .refreshToken(refreshToken)
          .then((result) => {
            const { access_token } = result;
            localStorage.setItem('access_token', access_token);
            api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            processQueue(null, access_token);
            return api(originalRequest);
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(err);
          });
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API 请求包装器 - 统一处理响应格式，返回完整响应
 */
export const apiRequestRaw = async <T = any>(
  method: string,
  url: string,
  data?: any,
  params?: Record<string, any>
): Promise<ApiResponse<T>> => {
  try {
    const config: AxiosRequestConfig = {
      method,
      url,
      ...(data && { data }),
      ...(params && { params }),
    };
    const response = await api.request<ApiResponse<T>>(config);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    throw new Error(message);
  }
};

/**
 * API 请求包装器 - 统一处理响应格式
 */
export const apiRequest = async <T = any>(
  config: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api.request<ApiResponse<T>>(config);
    
    if (!response.data.success && response.data.error) {
      throw new Error(response.data.error);
    }
    
    return response.data.data as T;
  } catch (error: any) {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    throw new Error(message);
  }
};

/**
 * 认证相关 API
 */
export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }) => apiRequest<any>({
    method: 'POST',
    url: '/register',
    data,
  }),

  login: (data: {
    username: string;
    password: string;
  }) => apiRequest<{
    access_token: string;
    refresh_token: string;
    user: any;
  }>({
    method: 'POST',
    url: '/login',
    data,
  }),

  refreshToken: (refreshToken: string) =>
    apiRequest<{ access_token: string }>({
      method: 'POST',
      url: '/refresh',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    }),

  getCurrentUser: () => apiRequest<any>({
    method: 'GET',
    url: '/me',
  }),

  logout: () =>
    apiRequest({
      method: 'POST',
      url: '/logout',
    }),
};

/**
 * 用户管理 API
 */
export const usersApi = {
  list: (params?: PaginationParams) =>
    apiRequest<any[]>({
      method: 'GET',
      url: '/users',
      params,
    }),

  get: (userId: number) =>
    apiRequest<any>({
      method: 'GET',
      url: `/users/${userId}`,
    }),

  create: (data: any) =>
    apiRequest<any>({
      method: 'POST',
      url: '/users',
      data,
    }),

  update: (userId: number, data: any) =>
    apiRequest<any>({
      method: 'PUT',
      url: `/users/${userId}`,
      data,
    }),

  delete: (userId: number) =>
    apiRequest({
      method: 'DELETE',
      url: `/users/${userId}`,
    }),

  changePassword: (userId: number, data: {
    old_password: string;
    new_password: string;
  }) =>
    apiRequest({
      method: 'PUT',
      url: `/users/${userId}/password`,
      data,
    }),
};

/**
 * 客户管理 API
 */
export const customersApi = {
  list: (params?: PaginationParams) =>
    apiRequest<any[]>({
      method: 'GET',
      url: '/customers',
      params,
    }),

  get: (customerId: number) =>
    apiRequest<any>({
      method: 'GET',
      url: `/customers/${customerId}`,
    }),

  create: (data: any) =>
    apiRequest<any>({
      method: 'POST',
      url: '/customers',
      data,
    }),

  update: (customerId: number, data: any) =>
    apiRequest<any>({
      method: 'PUT',
      url: `/customers/${customerId}`,
      data,
    }),

  delete: (customerId: number) =>
    apiRequest({
      method: 'DELETE',
      url: `/customers/${customerId}`,
    }),

  getInteractions: (customerId: number, params?: PaginationParams) =>
    apiRequest<any[]>({
      method: 'GET',
      url: `/customers/${customerId}/interactions`,
      params,
    }),

  addInteraction: (customerId: number, data: any) =>
    apiRequest<any>({
      method: 'POST',
      url: `/customers/${customerId}/interactions`,
      data,
    }),
};

/**
 * 销售管理 API
 */
export const salesApi = {
  getOpportunities: (params?: PaginationParams) =>
    apiRequest<any[]>({
      method: 'GET',
      url: '/sales/opportunities',
      params,
    }),

  getOrders: (params?: PaginationParams) =>
    apiRequest<any[]>({
      method: 'GET',
      url: '/sales/orders',
      params,
    }),

  createOpportunity: (data: any) =>
    apiRequest<any>({
      method: 'POST',
      url: '/sales/opportunities',
      data,
    }),

  updateOpportunity: (opportunityId: number, data: any) =>
    apiRequest<any>({
      method: 'PUT',
      url: `/sales/opportunities/${opportunityId}`,
      data,
    }),

  createOrder: (data: any) =>
    apiRequest<any>({
      method: 'POST',
      url: '/sales/orders',
      data,
    }),
};

/**
 * 营销管理 API
 */
export const marketingApi = {
  getCampaigns: (params?: PaginationParams) =>
    apiRequest<any[]>({
      method: 'GET',
      url: '/marketing/campaigns',
      params,
    }),

  getLeads: (params?: PaginationParams) =>
    apiRequest<any[]>({
      method: 'GET',
      url: '/marketing/leads',
      params,
    }),

  createCampaign: (data: any) =>
    apiRequest<any>({
      method: 'POST',
      url: '/marketing/campaigns',
      data,
    }),

  updateCampaign: (campaignId: number, data: any) =>
    apiRequest<any>({
      method: 'PUT',
      url: `/marketing/campaigns/${campaignId}`,
      data,
    }),
};

/**
 * 报表 API
 */
export const reportsApi = {
  getSalesReport: (params?: any) =>
    apiRequest<any>({
      method: 'GET',
      url: '/reports/sales',
      params,
    }),

  getActivityReport: (params?: any) =>
    apiRequest<any>({
      method: 'GET',
      url: '/reports/activity',
      params,
    }),

  getDashboardMetrics: () =>
    apiRequest<any>({
      method: 'GET',
      url: '/reports/dashboard',
    }),

  exportReport: (reportType: string, format: 'csv' | 'excel' | 'pdf') =>
    api.get('/reports/export', {
      params: {
        type: reportType,
        format,
      },
      responseType: format === 'pdf' ? 'blob' : 'arraybuffer',
    }),
};

export default api;
