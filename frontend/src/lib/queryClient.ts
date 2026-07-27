import { QueryClient } from '@tanstack/react-query';

// 创建QueryClient实例并配置默认选项
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据在后台过期时间（毫秒），默认0表示永不过期
      staleTime: 1000 * 60 * 5, // 5分钟
      // 数据缓存时间（毫秒），默认5分钟
      gcTime: 1000 * 60 * 10, // 10分钟（React Query v4+中替代cacheTime）
      // 是否在窗口重新聚焦时重新获取数据
      refetchOnWindowFocus: false,
      // 是否在网络重新连接时重新获取数据
      refetchOnReconnect: false,
      // 失败时重试次数
      retry: 1,
      // 是否在组件挂载时重新获取数据
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});