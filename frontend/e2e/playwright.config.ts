/**
 * playwright.config.ts - Playwright E2E 测试配置文件
 *
 * 配置测试运行器、浏览器项目、测试选项和开发服务器
 * 支持 Chromium、Firefox、WebKit、移动端和 Edge 浏览器
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * 可从环境变量文件中读取配置
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Playwright 测试配置
 * 详见 https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* 在文件级别并行运行测试 */
  fullyParallel: true,
  /* CI 环境禁止残留 test.only，确保执行全量测试 */
  forbidOnly: !!process.env.CI,
  /* CI 环境测试失败时最多重试 2 次 */
  retries: process.env.CI ? 2 : 0,
  /* CI 环境不启用并行 worker */
  workers: process.env.CI ? 1 : undefined,
  /* 使用 HTML 报告生成器 */
  reporter: 'html',
  /* 所有项目的共享配置，详见 https://playwright.dev/docs/api/class-testoptions */
  use: {
    /* 测试中页面导航的基础 URL */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    /* 首次失败重试时收集 trace 日志，详见 https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* 测试失败时自动截图 */
    screenshot: 'only-on-failure',

    /* 测试失败时保留视频 */
    video: 'retain-on-failure',
  },

  /* 配置各主流浏览器项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* 移动端浏览器测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* 品牌浏览器测试 */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],

  /* 测试前自动启动本地开发服务器 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,  // CI 环境每次都新建服务器
    timeout: 120 * 1000,  // 启动超时时间 2 分钟
  },
});