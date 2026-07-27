/**
 * vite.hydrate.config.ts - 客户端 hydration 专属 Vite 构建配置
 *
 * 完全独立的 hydration 构建，不使用 vite-plugin-ssr
 * 避免共享 chunk 污染导致加载 client-routing 运行时
 * 构建产物输出到 dist/hydrate 目录
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 完全独立的 hydration 构建，不使用 vite-plugin-ssr
// 避免共享 chunk 污染导致加载 client-routing 运行时
export default defineConfig({
  root: path.resolve(__dirname, 'hydrate'),  // 以 hydrate 目录为构建根目录
  base: '/',
  plugins: [react()],
  build: {
    outDir: '../dist/hydrate',  // 输出到 dist/hydrate
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: '/main.tsx',  // hydration 入口文件
      output: {
        entryFileNames: 'assets/hydrate.[hash].js',
        chunkFileNames: 'assets/hydrate-chunk.[hash].js',
        assetFileNames: 'assets/hydrate.[hash][extname]',
        // 不拆分包，保持单一入口，避免共享 chunk 导致加载问题
        manualChunks: undefined,
      },
    },
  },
})
