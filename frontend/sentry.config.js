/**
 * sentry.config.js - Sentry 错误监控配置
 *
 * 动态加载 Sentry SDK，不阻塞首屏渲染
 * 使用 requestIdleCallback 或 setTimeout 延迟到浏览器空闲或 2 秒后加载
 * 参考：https://docs.sentry.io/platforms/javascript/guides/react/
 */

/**
 * 初始化 Sentry 错误监控
 * - 通过环境变量控制是否启用（VITE_SENTRY_ENABLED）
 * - 通过动态 import 延迟加载 @sentry/react，避免影响首屏性能
 * - 集成性能监控、会话回放和性能分析
 * - 生产环境采样率 10%，开发环境 100%
 */
const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_APP_ENV || 'development';
  const enableSentry = import.meta.env.VITE_SENTRY_ENABLED === 'true';

  // 未启用或 DSN 未配置时跳过初始化
  if (!enableSentry || !dsn || dsn === 'your_sentry_dsn_here') {
    if (import.meta.env.DEV) console.log('Sentry监控已禁用');
    return;
  }

  // 使用 requestIdleCallback 或 setTimeout 延迟加载 Sentry
  // 避免阻塞首屏渲染和交互
  const loadSentry = () => {
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn,
        environment,
        // 集成性能追踪、会话回放和性能分析
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
          Sentry.browserProfilingIntegration(),
        ],

        // 性能监控采样率：生产环境 10%，开发环境 100%
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // 会话回放采样率：常规 10%，出错时 100%
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // 性能分析采样率：生产环境 10%，开发环境 100%
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // 开发环境启用调试模式
        debug: environment === 'development',

        // 忽略已知的无害错误
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'NetworkError when attempting to fetch resource',
        ],

        // 发布版本号
        release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      });

      if (import.meta.env.DEV) console.log('Sentry监控已启用，环境:', environment);
    }).catch((err) => {
      if (import.meta.env.DEV) console.warn('Sentry加载失败:', err);
    });
  };

  // 延迟到浏览器空闲或 2 秒后执行
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(loadSentry, { timeout: 2000 });
  } else {
    setTimeout(loadSentry, 2000);
  }
};

export default initSentry;