import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button, Result } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';

/**
 * SentryErrorBoundary 组件的属性接口
 *
 * @property children - 被该错误边界包裹的子组件
 * @property fallback - 自定义降级 UI，当捕获到错误时显示。若未提供则使用默认的错误页面
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * SentryErrorBoundary 组件的状态接口
 *
 * @property hasError - 是否已捕获到错误
 * @property error - 捕获到的 Error 对象
 * @property errorInfo - React 错误信息（包含组件堆栈）
 */
interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * SentryErrorBoundary — 集成 Sentry 异常监控的 React 错误边界组件
 *
 * 核心功能：
 * 1. 使用 React 16+ 的 Error Boundary 机制捕获子组件树中抛出的 JavaScript 错误
 * 2. 将捕获到的错误通过 Sentry SDK 上报到 Sentry 监控平台（包含组件堆栈信息）
 * 3. 捕获错误后渲染降级 UI，避免整个应用白屏
 * 4. 降级页面提供"刷新页面"和"返回首页"两个恢复操作按钮
 *
 * 使用方式：
 * ```tsx
 * <SentryErrorBoundary>
 *   <App />
 * </SentryErrorBoundary>
 * ```
 *
 * 注意：Error Boundary 无法捕获以下场景的错误：
 * - 事件处理器中的错误（需使用 try-catch）
 * - 异步代码中的错误（如 setTimeout、Promise）
 * - 服务端渲染（SSR）中的错误
 * - 错误边界自身抛出的错误
 */
class SentryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * React 生命周期方法 — 根据错误更新组件状态
   *
   * 当子组件抛出错误时，React 调用此静态方法更新状态，
   * 触发下一次渲染显示降级 UI 而非崩溃的组件树。
   *
   * @param error - 子组件抛出的 Error 对象
   * @returns 更新后的状态对象，设置 hasError 为 true 并保存错误信息
   */
  static getDerivedStateFromError(error: Error): State {
    // 更新state，下一次渲染将显示降级UI
    return { hasError: true, error };
  }

  /**
   * React 生命周期方法 — 错误发生后的副作用处理
   *
   * 在 getDerivedStateFromError 之后调用，用于执行错误上报等副作用：
   * - 调用 Sentry.captureException 将错误及组件堆栈上报到 Sentry 平台
   * - 更新组件状态以保存 errorInfo
   * - 在控制台打印错误信息以便调试
   *
   * @param error - 子组件抛出的 Error 对象
   * @param errorInfo - 包含 componentStack 的 React 错误信息对象
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 将错误上报到Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });

    // 更新状态
    this.setState({
      error,
      errorInfo,
    });

    // 这里可以添加额外的错误处理逻辑
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  /**
   * 刷新当前页面
   *
   * 用于降级 UI 中的"刷新页面"按钮，调用 window.location.reload() 重新加载应用。
   */
  handleReload = (): void => {
    window.location.reload();
  };

  /**
   * 导航到首页
   *
   * 用于降级 UI 中的"返回首页"按钮，通过设置 window.location.href 跳转到根路径。
   */
  handleGoHome = (): void => {
    window.location.href = '/';
  };

  /**
   * 渲染错误降级 UI
   *
   * 如果父组件通过 fallback prop 提供了自定义降级 UI，则直接使用；
   * 否则渲染默认的错误页面：
   * - 居中全屏布局
   * - Ant Design Result 组件显示"应用出现错误"标题和说明文字
   * - "刷新页面"主按钮和"返回首页"次要按钮
   *
   * @returns 降级 UI 的 ReactNode
   */
  renderFallback(): ReactNode {
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Result
          status="error"
          title="应用出现错误"
          subTitle="抱歉，应用遇到了问题。我们已经记录了这个错误，请尝试刷新页面或返回首页。"
          extra={[
            <Button
              key="reload"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={this.handleReload}
              className="mr-4"
            >
              刷新页面
            </Button>,
            <Button
              key="home"
              icon={<HomeOutlined />}
              onClick={this.handleGoHome}
            >
              返回首页
            </Button>,
          ]}
        />
      </div>
    );
  }

  /**
   * 组件渲染方法
   *
   * - 如果状态标记为有错误（hasError === true），则渲染降级 UI
   * - 否则正常渲染子组件
   *
   * @returns 子组件或降级 UI 的 ReactNode
   */
  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

/**
 * SentryErrorBoundaryWrapped — 使用 Sentry.withErrorBoundary HOC 包装后的错误边界组件
 *
 * Sentry 的 withErrorBoundary 会为错误边界添加额外的监控功能：
 * - 自动将错误上报到 Sentry
 * - 支持自定义 fallback 和 onError 回调
 *
 * 注意：此组件同时作为 SentryErrorBoundary 的 Sentry 包装版本导出，
 * 与默认导出的原始 SentryErrorBoundary 共存，按需使用。
 */
// eslint-disable-next-line react-refresh/only-export-components
export const SentryErrorBoundaryWrapped = Sentry.withErrorBoundary(
  SentryErrorBoundary,
  {
    fallback: <p>An error has occurred</p>,
    onError: (error, componentStack, eventId) => {
      console.log('Sentry error boundary caught error:', { error, componentStack, eventId });
    },
  }
);

export default SentryErrorBoundary;