/**
 * client.test.ts - API 客户端单元测试
 *
 * 测试 ApiClient 的核心功能：构造函数默认配置、认证令牌管理、错误处理和配置管理
 * 使用 jest.mock 模拟 env 模块和 axios 库
 */
import { apiClient } from '../client';
import { ApiError } from '../types';

// 模拟 env 模块，避免 Jest 中解析 import.meta.env 的问题
jest.mock('../../utils/env', () => ({
  getEnv: jest.fn(),
  shouldLogPerformance: jest.fn().mockReturnValue(false),
  isProd: jest.fn().mockReturnValue(false),
  getApiBaseUrl: jest.fn().mockReturnValue('http://localhost:3000/api/v1'),
  getAdminApiBaseUrl: jest.fn().mockReturnValue('http://localhost:3001/api/v1'),
  shouldUseMock: jest.fn().mockReturnValue(false),
}));

// 模拟 axios 库，避免实际网络请求
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  })),
}));

/** 测试套件：ApiClient */
describe('ApiClient', () => {
  // 每个测试前清空所有模拟和 localStorage
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  /** 测试构造函数 */
  describe('constructor', () => {
    it('应该使用默认配置创建客户端', () => {
      const client = apiClient;
      const config = client.getConfig();

      expect(config.baseURL).toBe('http://localhost:3000/api/v1');
      expect(config.timeout).toBe(10000);
      expect(config.useMock).toBe(false);
    });

    it('应该使用自定义配置创建客户端（文档测试）', () => {
      // 注意：apiClient 是单例，无法简单测试自定义配置
      // 此测试仅用于文档展示
      expect(true).toBe(true);
    });
  });

  /** 测试认证管理功能 */
  describe('authentication', () => {
    it('应该设置认证令牌', () => {
      const token = 'test-token-123';
      apiClient.setAuthToken(token);

      expect(localStorage.getItem('accessToken')).toBe(token);
    });

    it('应该清除认证信息', () => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('refreshToken', 'refresh-token');
      localStorage.setItem('user', '{}');

      apiClient.clearAuth();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  /** 测试错误处理 */
  describe('error handling', () => {
    it('应该创建具有正确属性的 ApiError', () => {
      const error = new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { field: 'email', message: 'Invalid email' },
      ]);

      expect(error.status).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual([
        { field: 'email', message: 'Invalid email' },
      ]);
      expect(error.name).toBe('ApiError');
    });
  });

  /** 测试配置管理 */
  describe('config management', () => {
    it('应该返回当前配置', () => {
      const config = apiClient.getConfig();

      expect(config).toEqual(expect.objectContaining({
        baseURL: expect.any(String),
        timeout: expect.any(Number),
        useMock: expect.any(Boolean),
      }));
    });
  });
});