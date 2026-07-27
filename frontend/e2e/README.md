# GameHub E2E测试

## 概述
本项目使用Playwright进行端到端测试，确保关键用户流程正常工作。

## 安装依赖
要运行E2E测试，需要先安装Playwright和相关依赖：

```bash
# 进入frontend目录
cd frontend

# 安装Playwright依赖
npm install --save-dev @playwright/test

# 安装Playwright浏览器（需要管理员权限）
npx playwright install
```

## 运行测试
```bash
# 运行所有E2E测试
npm run e2e

# 运行特定测试文件
npx playwright test e2e/tests/news-page.spec.ts

# 使用UI模式运行测试（交互式）
npm run e2e:ui

# 安装浏览器（首次运行需要）
npm run e2e:install

# 查看测试报告
npm run e2e:report
```

## 测试环境配置
测试默认使用以下配置：
- 基础URL: `http://localhost:5173`（前端开发服务器）
- 测试前会自动启动开发服务器
- 支持Chrome、Firefox、Safari浏览器

可以通过环境变量覆盖配置：
```bash
# 指定基础URL
BASE_URL=http://localhost:3000 npm run e2e

# 指定浏览器
npx playwright test --project=chromium
```

## 测试场景
目前包含以下E2E测试：

### 新闻页面 (`news-page.spec.ts`)
1. 页面加载验证
2. 新闻列表加载
3. 搜索功能
4. 分类筛选
5. 分页功能
6. 新闻详情查看
7. 无数据状态处理

### 评测页面 (`reviews-page.spec.ts`)
1. 页面加载验证
2. 评测列表加载
3. 搜索功能
4. 标签筛选
5. 分页功能
6. 评测详情查看
7. 热门评测显示
8. 无数据状态处理
9. 评分显示验证

## 编写新测试
1. 在`e2e/tests/`目录下创建新的测试文件
2. 使用Playwright测试API编写测试用例
3. 遵循页面对象模型（Page Object Model）最佳实践
4. 使用数据驱动测试提高覆盖率

示例测试结构：
```typescript
import { test, expect } from '@playwright/test';

test.describe('功能描述', () => {
  test.beforeEach(async ({ page }) => {
    // 测试前准备
  });

  test('测试用例描述', async ({ page }) => {
    // 测试步骤和断言
  });
});
```

## CI/CD集成
在CI/CD流水线中运行E2E测试：
```yaml
# GitHub Actions示例
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run e2e:install
      - run: npm run e2e
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
```

## 故障排除
1. **测试失败**：检查网络连接、服务器状态和页面元素选择器
2. **浏览器启动失败**：运行`npx playwright install`重新安装浏览器
3. **测试超时**：调整`playwright.config.ts`中的超时设置
4. **选择器问题**：使用Playwright DevTools查看元素选择器

## 最佳实践
1. 使用有意义的测试描述
2. 避免硬编码等待，使用`page.waitForSelector()`等API
3. 保持测试独立，不依赖其他测试状态
4. 定期更新测试以适应UI变化
5. 添加必要的断言验证功能正确性

## 下一步
1. 添加更多页面的E2E测试（登录、注册、游戏详情等）
2. 实现API模拟（mocking）以减少对外部服务的依赖
3. 添加性能测试和可访问性测试
4. 集成可视化回归测试