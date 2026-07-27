/**
 * LoadingSpinner（加载旋转器）组件
 *
 * 全屏/区域加载状态指示器。渲染一个带有旋转动画的圆形加载图标，
 * 中央显示"加载中..."文字提示。
 *
 * 适用于：
 * - 页面数据加载期间
 * - 异步操作等待时
 * - 路由懒加载过渡效果
 *
 * 注意：该组件无外部 Props，样式使用 Tailwind CSS，最小高度为 400px。
 */

import React from 'react';

/**
 * LoadingSpinner 组件
 *
 * 渲染一个居中显示的加载动画，包含：
 * - 外部旋转圆环（border-4，蓝色渐变，通过 animate-spin 实现旋转）
 * - 中央"加载中..."文字提示
 * - 最小高度 min-h-[400px] 确保在页面中有足够显示空间
 *
 * @example
 * // 在 Suspense 或异步组件中使用
 * <Suspense fallback={<LoadingSpinner />}>
 *   <LazyLoadedComponent />
 * </Suspense>
 */
const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative">
        {/* 旋转加载圆环 */}
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        {/* 中央文字提示 */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <span className="text-blue-600 text-sm font-medium">加载中...</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;