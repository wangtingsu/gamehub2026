// Jest mock for src/utils/env.ts
// Vite's import.meta.env is not available in Jest/CommonJS

export const getEnv = (key: string, defaultValue?: string): string | undefined => {
  const envMap: Record<string, string | undefined> = {
    VITE_API_BASE_URL: 'http://localhost:3001',
    VITE_ADMIN_API_BASE_URL: 'http://localhost:3002',
    VITE_SITE_URL: 'http://localhost:5173',
    VITE_ENABLE_MOCK: 'true',
  };
  return envMap[key] ?? defaultValue;
};

export const shouldLogPerformance = (): boolean => false;
export const isProd = (): boolean => false;
export const getApiBaseUrl = (): string => 'http://localhost:3001';
export const getAdminApiBaseUrl = (): string => 'http://localhost:3002';
export const shouldUseMock = (): boolean => true;
