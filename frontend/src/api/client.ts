/**
 * API 客户端模块
 *
 * 提供基于 Axios 的 HTTP 请求封装，包含：
 * - 请求/响应拦截器（自动注入 Token、性能监控）
 * - Token 自动刷新（401 时自动尝试刷新，队列化等待请求）
 * - 性能监控（记录请求耗时、检测慢请求、上报 Sentry）
 * - 公共 API 客户端与管理员 API 客户端分离
 *
 * @module api/client
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiConfig, ApiResponse, ApiError, ExtendedAxiosRequestConfig } from './types';
import { getEnv, shouldLogPerformance, isProd, getApiBaseUrl, getAdminApiBaseUrl, shouldUseMock } from '../utils/env';

/**
 * 扩展 Window 接口以包含 Sentry 监控 SDK
 * 用于在浏览器端捕获 API 错误并上报到 Sentry 平台
 */
declare global {
  interface Window {
    Sentry?: {
      metrics: {
        distribution: (name: string, value: number, options: any) => void;
      };
      captureMessage: (message: string, options?: any) => void;
      captureException: (error: any, context?: any) => void;
    };
  }
}

/**
 * 性能指标接口
 * 记录单个 API 请求的性能数据
 */
interface PerformanceMetrics {
  /** 请求的 URL 地址 */
  url: string;
  /** HTTP 请求方法（GET/POST/PUT/DELETE 等） */
  method: string;
  /** 请求耗时（毫秒） */
  duration: number;
  /** HTTP 响应状态码 */
  status: number;
  /** 记录时间戳 */
  timestamp: number;
  /** 请求是否成功 */
  success: boolean;
}

/**
 * 捕获错误并上报到 Sentry 监控平台
 *
 * @param error - 错误对象
 * @param context - 附加上下文信息（如 URL、方法、状态码等）
 */
const captureErrorToSentry = (error: any, context?: any) => {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, {
      extra: context,
      tags: {
        type: 'api_error',
        environment: getEnv('VITE_APP_ENV') || 'development',
      },
    });
  }
};

/**
 * API 性能监控器
 *
 * 负责记录和统计所有 API 请求的性能指标，
 * 检测慢请求（超过 1 秒）并上报到 Sentry 等监控系统，
 * 提供性能统计信息的查询接口。
 */
class PerformanceMonitor {
  /** 存储性能指标的内置队列 */
  private metrics: PerformanceMetrics[] = [];
  /** 队列最大容量，超出时移除最早记录 */
  private readonly maxMetrics = 1000;
  /** 慢请求阈值，默认 1 秒（1000ms） */
  private readonly slowThreshold = 1000; // 1秒

  /**
   * 记录一条性能指标
   *
   * @param metric - 性能指标数据
   */
  record(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 发送到监控系统（如Sentry）
    this.sendToMonitoring(metric);

    // 检查慢请求
    this.checkSlowRequest(metric);

    // 开发环境下在控制台显示
    if (shouldLogPerformance()) {
      const level = metric.duration > this.slowThreshold ? 'warn' : 'debug';
      console[level](`📊 API Performance: ${metric.method} ${metric.url} - ${metric.duration}ms (${metric.status})`);
    }
  }

  /**
   * 发送性能指标到监控系统（如 Sentry）
   *
   * @param metric - 性能指标数据
   */
  private sendToMonitoring(metric: PerformanceMetrics) {
    // 这里可以集成Sentry、自定义后端等
    // 示例：发送到Sentry（仅浏览器环境）
    if (typeof window !== 'undefined' && window.Sentry && isProd()) {
      window.Sentry.metrics.distribution('api_request_duration', metric.duration, {
        unit: 'milliseconds',
        tags: {
          method: metric.method,
          status: metric.status.toString(),
          success: metric.success.toString(),
          url: this.normalizeUrl(metric.url)
        }
      });
    }
  }

  /**
   * 检查是否为慢请求，超过阈值时记录告警
   *
   * @param metric - 性能指标数据
   */
  private checkSlowRequest(metric: PerformanceMetrics) {
    if (metric.duration > this.slowThreshold) {
      console.warn(`🐌 Slow API Request: ${metric.method} ${metric.url} took ${metric.duration}ms`);

      // 可以发送告警或记录到专门的慢请求日志
      if (typeof window !== 'undefined' && window.Sentry && isProd()) {
        window.Sentry.captureMessage('Slow API request detected', {
          level: 'warning',
          extra: metric
        });
      }
    }
  }

  /**
   * 标准化 URL：移除查询参数，将数字 ID 替换为 :id 占位符
   * 用于聚合相同模式的请求（如 /games/123 和 /games/456 归并为 /games/:id）
   *
   * @param url - 原始 URL
   * @returns 标准化后的 URL
   */
  private normalizeUrl(url: string): string {
    if (!url) return 'unknown';

    // 移除查询参数
    const withoutQuery = url.split('?')[0];

    // 将数字ID替换为 :id
    return withoutQuery.replace(/\/(\d+)(\/|$)/g, '/:id$2');
  }

  /**
   * 获取当前性能统计信息
   *
   * @returns 包含总请求数、平均耗时、成功率、慢请求数量的统计对象
   */
  getStats() {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        successRate: 0,
        slowRequests: 0
      };
    }

    const successful = this.metrics.filter(m => m.success);
    const slowRequests = this.metrics.filter(m => m.duration > this.slowThreshold);

    return {
      totalRequests: this.metrics.length,
      averageDuration: Math.round(this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length),
      successRate: Math.round((successful.length / this.metrics.length) * 100),
      slowRequests: slowRequests.length
    };
  }
}

/** 创建全局性能监控器实例 */
const performanceMonitor = new PerformanceMonitor();

/**
 * Token 自动刷新状态
 * isRefreshing - 标记是否正在刷新 Token，防止并发刷新请求
 * failedQueue - 等待队列，存储在 Token 刷新期间发起的请求的 Promise 回调
 */
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

/**
 * 处理等待队列中的所有请求
 * 当 Token 刷新成功后，依次用新 Token 恢复队列中的请求
 * 当刷新失败时，队列中的请求也全部失败
 *
 * @param error - 刷新失败时的错误对象
 * @param token - 刷新成功后的新 Token，为 null 时表示刷新失败
 */
function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (token) {
      p.resolve(token)
    } else {
      p.reject(error)
    }
  })
  failedQueue = []
}

/**
 * 默认 API 客户端配置
 * baseURL - API 基础地址（根据环境变量配置）
 * timeout - 请求超时时间（10 秒）
 * useMock - 是否使用 Mock 数据（根据环境变量配置）
 */
const DEFAULT_CONFIG: ApiConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  useMock: shouldUseMock(),
};

/**
 * API 客户端类
 *
 * 封装 Axios 实例，提供统一的 HTTP 请求方法和错误处理机制。
 * 特性：
 * - 自动注入认证 Token（区分管理员和普通用户）
 * - 自动刷新过期 Token（401 时）
 * - 请求性能监控
 * - 统一的 API 响应解析和错误转换
 */
class ApiClient {
  /** Axios 实例 */
  private client: AxiosInstance;
  /** 客户端配置 */
  private config: ApiConfig;

  /**
   * 创建 API 客户端实例
   *
   * @param config - 部分配置项，会与默认配置合并
   */
  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = this.createClient();
  }

  /**
   * 创建并配置 Axios 实例
   * 包含请求拦截器和响应拦截器的初始化
   *
   * @returns 配置完成的 Axios 实例
   */
  private createClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    /**
     * 请求拦截器
     * 在发送请求前自动注入认证 Token，添加时间戳防止缓存，记录请求开始时间
     */
    client.interceptors.request.use(
      (config) => {
        // 仅浏览器环境添加 token（SSR 端无 localStorage）
        if (typeof localStorage !== 'undefined') {
          // 根据请求目标区分token
          // 管理员API使用adminToken，前端用户API优先使用accessToken
          // 若用户无accessToken（纯管理员场景），fallback到adminToken，
          // 以便管理员操作非/admin/前缀的API（如 /games 管理端CRUD）
          // 判断是否为管理员请求：URL含/admin/ 或 当前在admin页面 或 客户端配置为admin
          const isAdminRequest = config.url?.includes('/admin/') ||
            this.config.isAdmin ||
            (typeof window !== 'undefined' && window.location.pathname.includes('/admin'));
          const adminToken = localStorage.getItem('adminToken');
          const accessToken = localStorage.getItem('accessToken');
          // 管理员请求只用adminToken，否则accessToken优先，fallback到adminToken
          const finalToken = isAdminRequest ? adminToken : (accessToken || adminToken);

          if (finalToken) {
            config.headers.Authorization = `Bearer ${finalToken}`;
          }
        }

        // 添加请求时间戳防止缓存
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        // 性能监控：记录请求开始时间
        (config as ExtendedAxiosRequestConfig).metadata = {
          ...(config as ExtendedAxiosRequestConfig).metadata,
          startTime: Date.now(),
        };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    /**
     * 响应拦截器
     * 对成功响应进行统一格式校验，对失败响应进行错误分类和 Token 自动刷新
     */
    client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // 统一处理API响应格式
        if (response.data && typeof response.data === 'object') {
          if (response.data.success === false) {
            throw new ApiError(
              response.status,
              response.data.code || 'UNKNOWN_ERROR',
              response.data.error || '未知错误',
              response.data.details
            );
          }
        }

        // 性能监控：记录请求耗时
        const startTime = (response.config as ExtendedAxiosRequestConfig)?.metadata?.startTime;
        if (startTime) {
          const duration = Date.now() - startTime;
          const url = response.config.url || 'unknown';
          const method = response.config.method?.toUpperCase() || 'GET';

          // 记录性能指标
          performanceMonitor.record({
            url,
            method,
            duration,
            status: response.status,
            timestamp: Date.now(),
            success: true
          });

          // 开发环境日志
          if (shouldLogPerformance()) {
            console.debug(`🚀 API Performance: ${method} ${url} - ${duration}ms`);
          }
        }

        return response;
      },
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          const apiError = new ApiError(
            status,
            data?.code || 'HTTP_ERROR',
            data?.error || error.message,
            data?.details
          );

                    // 401未授权，尝试刷新Token（仅浏览器环境）
          if (status === 401 && typeof localStorage !== 'undefined') {
            const failedUrl = error.config?.url || '';
            const originalRequest = error.config;

            // 管理员上下文（URL 含 /admin/、客户端为 admin、或当前在 /admin 页面）直接跳管理登录，不刷新
            const isAdminContext = failedUrl.includes('/admin/') ||
              this.config.isAdmin ||
              (typeof window !== 'undefined' && window.location.pathname.includes('/admin'));
            if (isAdminContext) {
              localStorage.removeItem('adminToken');
              if (!window.location.pathname.includes('/admin/login')) {
                window.location.href = '/admin/login';
              }
              return Promise.reject(apiError);
            }

            // 避免在刷新请求自身失败时循环
            if (failedUrl.includes('/auth/refresh')) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              if (!window.location.pathname.includes('/login')) {
                const savedLang = localStorage.getItem('i18nextLng') || 'en';
                const i18nToUrl = { 'zh-CN': 'cn', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr' };
                const urlLang = i18nToUrl[savedLang] || savedLang;
                window.location.href = '/' + urlLang + '/login';
              }
              return Promise.reject(apiError);
            }

            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              if (!window.location.pathname.includes('/login')) {
                const savedLang = localStorage.getItem('i18nextLng') || 'en';
                const i18nToUrl = { 'zh-CN': 'cn', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr' };
                const urlLang = i18nToUrl[savedLang] || savedLang;
                window.location.href = '/' + urlLang + '/login';
              }
              return Promise.reject(apiError);
            }

            // 正在刷新中，将后续请求加入队列
            if (isRefreshing) {
              return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve: resolve, reject: reject });
              }).then(function(token) {
                if (originalRequest) {
                  originalRequest.headers.Authorization = 'Bearer ' + token;
                }
                return client(originalRequest);
              });
            }

            isRefreshing = true;

            // 尝试刷新 token
            return axios({
              method: 'POST',
              url: getApiBaseUrl() + '/auth/refresh',
              data: { refreshToken: refreshToken },
              headers: { 'Content-Type': 'application/json' }
            }).then(function(refreshResponse) {
              var data = refreshResponse.data;
              var newToken = (data && data.data && data.data.tokens && data.data.tokens.accessToken) || (data && data.accessToken);
              var newRefreshToken = (data && data.data && data.data.tokens && data.data.tokens.refreshToken) || (data && data.refreshToken);

              if (newToken) {
                localStorage.setItem('accessToken', newToken);
                if (newRefreshToken) {
                  localStorage.setItem('refreshToken', newRefreshToken);
                }
                processQueue(null, newToken);
                if (originalRequest) {
                  originalRequest.headers.Authorization = 'Bearer ' + newToken;
                }
                return client(originalRequest);
              }
              throw new Error('刷新Token失败：未获取到新令牌');
            }).catch(function(refreshError) {
              processQueue(refreshError, null);
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              if (!window.location.pathname.includes('/login')) {
                const savedLang = localStorage.getItem('i18nextLng') || 'en';
                const i18nToUrl = { 'zh-CN': 'cn', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr' };
                const urlLang = i18nToUrl[savedLang] || savedLang;
                window.location.href = '/' + urlLang + '/login';
              }
              return Promise.reject(apiError);
            }).finally(function() {
              isRefreshing = false;
            });
          }

          // 性能监控：记录错误请求耗时
          const startTime = (error.config as ExtendedAxiosRequestConfig)?.metadata?.startTime;
          let url = 'unknown';
          let method = 'GET';
          if (startTime) {
            const duration = Date.now() - startTime;
            url = error.config?.url || 'unknown';
            method = error.config?.method?.toUpperCase() || 'GET';

            // 记录性能指标
            performanceMonitor.record({
              url,
              method,
              duration,
              status,
              timestamp: Date.now(),
              success: false
            });

            // 开发环境日志
            if (shouldLogPerformance()) {
              console.warn(`🚨 API Error Performance: ${method} ${url} - ${duration}ms (${status})`);
            }
          }

          // 上报错误到 Sentry
          captureErrorToSentry(apiError, { url, method, status });

          return Promise.reject(apiError);
        }

        // 网络错误
        // 性能监控：记录网络错误请求耗时
        const startTime = (error.config as ExtendedAxiosRequestConfig)?.metadata?.startTime;
        let url = 'unknown';
        let method = 'GET';
        if (startTime) {
          const duration = Date.now() - startTime;
          url = error.config?.url || 'unknown';
          method = error.config?.method?.toUpperCase() || 'GET';

          // 记录性能指标
          performanceMonitor.record({
            url,
            method,
            duration,
            status: 0, // 网络错误状态码为0
            timestamp: Date.now(),
            success: false
          });

          // 开发环境日志
          if (shouldLogPerformance()) {
            console.error(`🌐 API Network Error: ${method} ${url} - ${duration}ms`);
          }
        }

        const networkError = new ApiError(
          0,
          'NETWORK_ERROR',
          '网络连接错误，请检查网络设置'
        );

        // 上报网络错误到 Sentry
        captureErrorToSentry(networkError, { url, method, status: 0 });

        return Promise.reject(networkError);
      }
    );

    return client;
  }

  /**
   * 基础请求方法
   * 执行 HTTP 请求并从响应中提取 data 字段
   *
   * @param config - Axios 请求配置
   * @returns 泛型 T，对应 ApiResponse.data 的类型
   */
  async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<ApiResponse<T>>(config);
    return response.data.data as T;
  }

  /**
   * 发送 GET 请求
   *
   * @param url - 请求路径
   * @param params - 查询参数
   * @param config - 额外的 Axios 请求配置
   * @returns 泛型 T
   */
  get<T = unknown>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'GET',
      url,
      params,
      ...config,
    });
  }

  /**
   * 发送 POST 请求
   *
   * @param url - 请求路径
   * @param data - 请求体数据
   * @param config - 额外的 Axios 请求配置
   * @returns 泛型 T
   */
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...config,
    });
  }

  /**
   * 发送 PUT 请求
   *
   * @param url - 请求路径
   * @param data - 请求体数据
   * @param config - 额外的 Axios 请求配置
   * @returns 泛型 T
   */
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    });
  }

  /**
   * 发送 PATCH 请求
   *
   * @param url - 请求路径
   * @param data - 请求体数据
   * @param config - 额外的 Axios 请求配置
   * @returns 泛型 T
   */
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'PATCH',
      url,
      data,
      ...config,
    });
  }

  /**
   * 发送 DELETE 请求
   *
   * @param url - 请求路径
   * @param params - 查询参数
   * @param config - 额外的 Axios 请求配置
   * @returns 泛型 T
   */
  delete<T = unknown>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      url,
      params,
      ...config,
    });
  }

  /**
   * 设置认证 Token 到 localStorage
   *
   * @param token - 认证 Token，为空时清除已存储的 Token
   */
  setAuthToken(token: string): void {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  /** 清除 localStorage 中的所有认证信息 */
  clearAuth(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * 获取当前客户端配置的副本
   *
   * @returns 当前 ApiConfig 对象
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * 更新客户端配置并重建 Axios 实例
   *
   * @param config - 需要更新合并的配置项
   */
  updateConfig(config: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...config };
    this.client = this.createClient();
  }
}

/**
 * 默认 API 客户端实例（公共服务器）
 * 用于前端用户页面的常规 API 请求，指向公共 API 服务器（端口 3001）
 */
export const apiClient = new ApiClient();

/**
 * 管理后台 API 客户端实例（独立的管理服务器）
 * 用于管理员页面的 API 请求，指向管理 API 服务器（端口 3002）
 * 会自动在请求头中注入管理员 Token
 */
export const adminApiClient = new ApiClient({
  baseURL: getAdminApiBaseUrl(),
  isAdmin: true,
});

/** 导出默认单例（公共 API 客户端） */
export default apiClient;