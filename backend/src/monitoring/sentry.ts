/**
 * Sentry 错误监控模块
 *
 * 提供 Sentry (https://sentry.io) 集成的统一接口，用于：
 * - 初始化 Sentry 客户端（含 HTTP、Express 追踪等集成）
 * - 捕获和上报错误及消息
 * - 设置用户上下文和标签
 * - 性能监控（Span/Transaction）
 *
 * 所有操作都会先检查 Sentry 是否启用（通过 config.sentry.enabled），
 * 未启用时静默跳过，不会影响应用正常运行。
 *
 * @module monitoring/sentry
 */

import * as Sentry from '@sentry/node';
import {
  httpIntegration,
  expressIntegration,
  localVariablesIntegration,
  onUncaughtExceptionIntegration,
  onUnhandledRejectionIntegration,
} from '@sentry/node';
import config from '../config';

/**
 * 初始化 Sentry 监控
 *
 * 根据配置启用 Sentry，配置内容来自 config.sentry 对象。
 * 包含 HTTP 请求追踪、Express 集成、本地变量捕获、
 * 未捕获异常和未处理 Promise 拒绝的自动监控。
 *
 * @returns 初始化成功返回 true，失败或 Sentry 未启用返回 false
 */
export const initSentry = () => {
  const { sentry } = config;

  // 检查是否启用Sentry
  if (!sentry.enabled || !sentry.dsn) {
    console.log('Sentry监控已禁用');
    return false;
  }

  try {
    Sentry.init({
      dsn: sentry.dsn,
      environment: sentry.environment,
      tracesSampleRate: sentry.tracesSampleRate,
      debug: sentry.debug,
      release: sentry.release,

      // 集成配置
      integrations: [
        // 启用HTTP请求追踪
        httpIntegration(),
        // 启用Express集成
        expressIntegration(),
        // 启用本地变量捕获
        localVariablesIntegration({
          captureAllExceptions: true,
        }),
        // 启用未捕获异常监控
        onUncaughtExceptionIntegration(),
        onUnhandledRejectionIntegration(),
      ],

      // 忽略的错误类型
      ignoreErrors: [...sentry.ignoreErrors],

      // 忽略的事务
      ignoreTransactions: [...sentry.ignoreTransactions],

      // 性能监控配置
      ...(sentry.enablePerformanceMonitoring && {
        _experiments: {
          // 启用连续出口
          continuousProfiling: true,
        },
      }),
    });

    console.log(`Sentry监控已启用，环境: ${sentry.environment}`);
    return true;
  } catch (error) {
    console.error('Sentry初始化失败:', error);
    return false;
  }
};

/**
 * 捕获错误并上报到 Sentry
 *
 * 将错误对象和附加上下文信息发送到 Sentry。
 * 上下文信息作为额外数据（Extra）附加在错误事件上，便于调试。
 *
 * @param error   - 要捕获的错误对象
 * @param context - 可选的上下文数据，如请求信息、用户数据等
 */
export const captureError = (error: Error, context?: Record<string, any>) => {
  const { sentry } = config;

  if (!sentry.enabled) {
    return;
  }

  try {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureException(error);
    });
  } catch (sentryError) {
    console.error('Sentry错误捕获失败:', sentryError);
  }
};

/**
 * 捕获消息并上报到 Sentry
 *
 * 将文本消息作为 Sentry 事件上报，可用于记录业务层面的重要事件。
 *
 * @param message - 要上报的消息内容
 * @param level   - 消息级别，默认为 'info'
 * @param context - 可选的上下文数据
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  const { sentry } = config;

  if (!sentry.enabled) {
    return;
  }

  try {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureMessage(message, level);
    });
  } catch (error) {
    console.error('Sentry消息捕获失败:', error);
  }
};

/**
 * 设置 Sentry 用户上下文
 *
 * 将当前请求的用户信息关联到 Sentry 事件，便于在 Sentry 仪表板中
 * 按用户维度过滤和排查问题。
 *
 * @param user - 用户信息对象（含 id、email、username 等），设为 null 可清除上下文
 */
export const setUser = (user: Sentry.User | null) => {
  const { sentry } = config;

  if (!sentry.enabled) {
    return;
  }

  try {
    Sentry.setUser(user);
  } catch (error) {
    console.error('Sentry用户上下文设置失败:', error);
  }
};

/**
 * 设置 Sentry 标签
 *
 * 为 Sentry 事件添加键值对标签，用于事件的过滤和聚合。
 *
 * @param key   - 标签名
 * @param value - 标签值
 */
export const setTag = (key: string, value: string) => {
  const { sentry } = config;

  if (!sentry.enabled) {
    return;
  }

  try {
    Sentry.setTag(key, value);
  } catch (error) {
    console.error('Sentry标签设置失败:', error);
  }
};

/**
 * 设置 Sentry 额外数据
 *
 * 为 Sentry 事件添加额外的上下文数据，这些数据显示在事件的
 * "Additional Data" 选项卡中。
 *
 * @param key   - 数据键名
 * @param value - 数据值
 */
export const setExtra = (key: string, value: any) => {
  const { sentry } = config;

  if (!sentry.enabled) {
    return;
  }

  try {
    Sentry.setExtra(key, value);
  } catch (error) {
    console.error('Sentry额外数据设置失败:', error);
  }
};

/**
 * 获取当前活跃的 Span
 *
 * 用于性能监控，在自定义代码段中获取当前活跃的 Span 以添加子 Span 或标注。
 * 对应 Sentry v8/v9 的 getActiveSpan API。
 *
 * @returns 当前活跃的 Span，无活跃 Span 时返回 null
 */
export const getActiveSpan = () => {
  const { sentry } = config;

  if (!sentry.enabled) {
    return null;
  }

  return Sentry.getActiveSpan() ?? null;
};

/**
 * 启动一个 Sentry Span（不活跃的 Span）
 *
 * 用于手动创建性能追踪 Span，对应 Sentry v8/v9 的 startInactiveSpan API。
 * Span 需要手动调用 finish() 来结束计时。
 * 替代旧版 SDK 的 startTransaction API。
 *
 * @param name        - Span 名称（如 "database-query"）
 * @param op          - 操作类型（如 "db.query"）
 * @param description - 可选的详细描述
 * @param metadata    - 可选的元数据标签
 * @returns 创建的 Span 实例，Sentry 未启用时返回 null
 */
export const startSpan = (
  name: string,
  op?: string,
  description?: string,
  metadata?: Record<string, any>
) => {
  const { sentry } = config;

  if (!sentry.enabled) {
    return null;
  }

  return Sentry.startInactiveSpan({
    name,
    op,
    attributes: metadata,
  });
};

export default {
  initSentry,
  captureError,
  captureMessage,
  setUser,
  setTag,
  setExtra,
  getActiveSpan,
  startSpan,
};
