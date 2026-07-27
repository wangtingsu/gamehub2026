/**
 * 默认页面路由文件
 *
 * 该文件是 vite-plugin-ssr 框架要求的默认页面出口。
 * 所有的路由最终都会回退到此页面进行处理。
 *
 * 注意：
 * - 该组件本身返回 null，不会被直接渲染到 DOM 中
 * - 实际的页面渲染由 renderer/_default.page.server.tsx 和
 *   renderer/_default.page.client.tsx 中的渲染器接管
 * - vite-plugin-ssr 要求必须存在一个页面组件，因此这里保留
 *   一个空的占位组件以满足框架约定
 */

/**
 * 默认页面组件（占位组件）
 *
 * 该组件是 vite-plugin-ssr 框架约定的必需页面出口。
 * 实际渲染逻辑委托给了自定义渲染器（renderer），
 * 此组件仅作为框架路由系统的占位符存在。
 *
 * @returns 返回 null，不渲染任何实际内容
 */
export default function Page() {
  // 这个组件实际上不会被直接使用
  // 因为我们在渲染器中直接渲染App组件
  // 但vite-plugin-ssr需要一个页面组件
  return null
}