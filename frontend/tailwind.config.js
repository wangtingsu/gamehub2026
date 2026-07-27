/**
 * tailwind.config.js - Tailwind CSS 主题配置
 *
 * 定义定制化颜色（primary、secondary、dark、gray）、字体和动画
 * 扩展了 Tailwind 默认主题，适配 GameHub 游戏社区风格
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 定制色彩方案
      colors: {
        // 主色调：蓝色系，用于主要按钮、链接和强调色
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // 次要色：紫色系，用于装饰和差异化元素
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        // 深色模式色板：暗色背景和边框
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // 灰色中性色板
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      // 字体族配置
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],        // 正文字体
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],  // 标题展示字体
      },
      // 自定义动画
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',         // 淡入
        'slide-up': 'slideUp 0.3s ease-out',          // 上滑
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',  // 慢速脉冲
      },
      // 动画关键帧定义
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // 使用 Tailwind Typography 插件增强文章排版
  ],
}