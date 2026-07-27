import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — 路由切换时自动将页面滚动到顶部的组件
 *
 * 该组件不渲染任何 UI 元素（返回 null），而是通过 React Router 的 location 变化
 * 监听路由切换事件。每次 pathname 发生变化时，自动将网页滚动位置重置到顶部，
 * 确保用户在导航到新页面时从顶部开始浏览。
 *
 * 实现细节：
 * - 使用 window.scrollTo(0, 0) 标准方法
 * - 额外设置 document.documentElement.scrollTop 和 document.body.scrollTop
 *   以兼容不同浏览器和文档模式
 * - 应放置在应用根路由内部，例如 <Routes> 上方或 Layout 组件中
 *
 * @returns null（纯逻辑组件，不渲染任何 DOM 元素）
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
