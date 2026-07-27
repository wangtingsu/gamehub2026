/**
 * 环境变量访问器
 * 在测试环境中使用 process.env，在浏览器环境中使用 import.meta.env
 */
export const getEnv = (key: string): string | undefined => {
  // Jest 测试环境
  if (typeof jest !== 'undefined' || process.env.NODE_ENV === 'test') {
    // 映射 Vite 环境变量到 process.env
    const envMap: Record<string, string> = {
      'VITE_API_BASE_URL': 'VITE_API_BASE_URL',
      'VITE_USE_MOCK': 'VITE_USE_MOCK',
      'VITE_LOG_PERFORMANCE': 'VITE_LOG_PERFORMANCE',
      'VITE_APP_ENV': 'VITE_APP_ENV',
      'PROD': 'PROD',
      'MODE': 'MODE',
      'DEV': 'DEV',
      'SSR': 'SSR',
    };

    const envKey = envMap[key];
    if (envKey && process.env[envKey] !== undefined) {
      return process.env[envKey];
    }

    // 尝试从全局模拟的 import.meta 中获取
    // @ts-ignore
    if (typeof globalThis !== 'undefined' && globalThis.import?.meta?.env?.[key] !== undefined) {
      // @ts-ignore
      return globalThis.import.meta.env[key];
    }

    return undefined;
  }

  // 浏览器环境（Vite）
  try {
    // 使用 eval 避免在非模块环境中解析 import.meta
    // eslint-disable-next-line no-eval
    const importMeta = eval('typeof import.meta !== "undefined" ? import.meta : undefined');
    if (importMeta?.env?.[key] !== undefined) {
      return importMeta.env[key];
    }
  } catch {
    // 忽略错误
  }

  return undefined;
};

/**
 * 获取环境变量，提供默认值
 */
export const getEnvWithDefault = (key: string, defaultValue: string): string => {
  return getEnv(key) || defaultValue;
};

/**
 * 检查是否在生产环境
 */
export const isProd = (): boolean => {
  return getEnv('PROD') === 'true' || getEnv('MODE') === 'production';
};

/**
 * 检查是否在开发环境
 */
export const isDev = (): boolean => {
  return getEnv('DEV') === 'true' || getEnv('MODE') === 'development';
};

/**
 * 检查是否在测试环境
 */
export const isTest = (): boolean => {
  return getEnv('MODE') === 'test' || process.env.NODE_ENV === 'test';
};

/**
 * 获取 API 基础 URL
 */
export const getApiBaseUrl = (): string => {
  // 直接使用 import.meta.env (Vite) 而非 eval 方式
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }
  const envVal = getEnv('VITE_API_BASE_URL');
  if (envVal) return envVal;
  // 浏览器环境下使用当前 origin，避免使用写死的 localhost
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin + '/api/v1';
  }
  return 'http://localhost:3000/api/v1';
};

/**
 * 获取管理后台 API 基础 URL（独立的管理服务器）
 */
export const getAdminApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_API_BASE_URL) {
    return import.meta.env.VITE_ADMIN_API_BASE_URL as string;
  }
  return getEnvWithDefault('VITE_ADMIN_API_BASE_URL', '/admin-api/v1');
};

/**
 * 是否使用 Mock 数据
 */
export const shouldUseMock = (): boolean => {
  return getEnv('VITE_USE_MOCK') === 'true' || false;
};

/**
 * 是否记录性能日志
 */
export const shouldLogPerformance = (): boolean => {
  return getEnv('VITE_LOG_PERFORMANCE') === 'true' || false;
};