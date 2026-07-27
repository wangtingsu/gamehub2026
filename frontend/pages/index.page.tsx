/**
 * 首页页面路由文件
 *
 * 该文件定义了 GameHub 网站的首页入口页面组件。
 * 使用 vite-plugin-ssr 框架的文件系统路由约定，
 * 此文件位于 pages/ 目录下，自动映射为网站根路由（/）。
 *
 * 职责：
 * - 渲染 HomePage 组件作为页面内容
 * - 提供 onBeforeRender 钩子用于服务端数据预取（SSR）
 */

import React from 'react'
import HomePage from '../src/pages/HomePage'
import type { PageContext } from 'vite-plugin-ssr/types'

/**
 * 首页页面组件
 *
 * 作为网站入口页面，渲染 HomePage 组件。
 * 该组件是服务器端渲染（SSR）的入口点之一，
 * 由 vite-plugin-ssr 在匹配根路由时自动调用。
 *
 * @returns 包含 HomePage 的 React 元素
 */
export default function Page() {
  return <HomePage />
}

/**
 * 首页服务器端数据预取钩子
 *
 * 在服务器端渲染（SSR）期间，于页面组件渲染之前执行。
 * 用于提前获取首页所需的动态数据（如特色游戏、最新新闻等），
 * 然后将数据注入到页面上下文中，实现完整的服务端渲染。
 *
 * @param pageContext - vite-plugin-ssr 提供的页面上下文对象，包含当前请求的路由和参数信息
 * @returns 包含 pageProps 的页面上下文，这些 props 会传递给页面组件
 *
 * @example
 * // 实际使用时可解构 API 调用：
 * // const { featuredGames, news } = await fetchHomePageData()
 * // return { pageContext: { pageProps: { featuredGames, news } } }
 */
export async function onBeforeRender(pageContext: PageContext) {
  // 首页需要预取的数据：
  // 1. 特色游戏列表
  // 2. 最新新闻
  // 3. 热门游戏

  // 注意：在开发环境中，我们可能使用Mock数据
  // 在生产环境中，这里应该调用API获取真实数据

  const pageProps = {
    // 这里可以添加从API获取的数据
    // 例如：featuredGames: await apiService.getFeaturedGames(),
    // news: await apiService.getLatestNews(),
  }

  return {
    pageContext: {
      pageProps
    }
  }
}