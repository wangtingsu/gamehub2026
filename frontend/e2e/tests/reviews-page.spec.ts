/**
 * reviews-page.spec.ts - 评测页面 E2E 测试
 *
 * 测试评测页面的核心功能：页面加载、评测列表渲染、搜索、标签筛选、分页、详情跳转、热门评测区域和无数据状态
 */
import { test, expect } from '@playwright/test';

test.describe('评测页面E2E测试', () => {
  /** 每个测试前访问评测页面 */
  test.beforeEach(async ({ page }) => {
    await page.goto('/reviews');
  });

  test('应该正确加载评测页面', async ({ page }) => {
    // 验证页面标题包含 "GameHub"
    await expect(page).toHaveTitle(/GameHub/);

    // 验证页面包含"游戏评测"标题
    await expect(page.locator('h1')).toContainText('游戏评测');

    // 验证搜索框存在
    await expect(page.locator('input[placeholder="搜索游戏评测..."]')).toBeVisible();

    // 验证热门标签区域存在
    await expect(page.locator('h3')).toContainText('热门标签');
  });

  test('应该加载评测列表', async ({ page }) => {
    // 等待评测卡片加载完成
    await page.waitForSelector('.ant-card');

    // 验证至少有一个评测卡片
    const reviewCards = page.locator('.ant-card');
    await expect(reviewCards).toHaveCountGreaterThan(0);

    // 验证第一个评测卡片包含必要信息
    const firstCard = reviewCards.first();
    await expect(firstCard.locator('.ant-typography')).toBeVisible(); // 标题
    await expect(firstCard.locator('.ant-rate')).toBeVisible(); // 评分组件
    await expect(firstCard.locator('.ant-tag')).toBeVisible(); // 游戏标签
  });

  test('应该支持评测搜索', async ({ page }) => {
    // 在搜索框中输入关键词
    const searchInput = page.locator('input[placeholder="搜索游戏评测..."]');
    await searchInput.fill('游戏');
    await searchInput.press('Enter');

    // 等待搜索结果加载
    await page.waitForTimeout(1000);

    // 验证搜索后仍有内容显示
    await expect(page.locator('.ant-card')).toBeVisible();
  });

  test('应该支持标签筛选', async ({ page }) => {
    // 等待标签加载
    await page.waitForSelector('.ant-tag');

    // 点击第一个非"全部评测"的标签
    const tags = page.locator('.ant-tag');
    const firstTag = tags.nth(1); // 索引 0 为"全部评测"
    if (await firstTag.isVisible()) {
      const tagText = await firstTag.textContent();
      await firstTag.click();

      // 等待筛选结果加载
      await page.waitForTimeout(1000);

      // 验证标签被选中：class 中包含 ant-tag-blue 表示激活态
      await expect(firstTag).toHaveClass(/ant-tag-blue/);

      // 验证仍有内容显示
      await expect(page.locator('.ant-card')).toBeVisible();
    }
  });

  test('应该支持分页', async ({ page }) => {
    // 等待分页器出现
    await page.waitForSelector('.ant-pagination');

    // 点击第二页（如果可用）
    const secondPage = page.locator('.ant-pagination-item').filter({ hasText: '2' });
    if (await secondPage.isVisible()) {
      await secondPage.click();

      // 等待页面加载
      await page.waitForTimeout(1000);

      // 验证仍显示评测卡片
      await expect(page.locator('.ant-card')).toBeVisible();
    }
  });

  test('应该显示评测详情', async ({ page }) => {
    // 等待评测列表加载
    await page.waitForSelector('.ant-card');

    // 点击第一个评测的"阅读全文"按钮
    const readMoreButton = page.locator('.ant-card').first().locator('button:has-text("阅读全文")');
    if (await readMoreButton.isVisible()) {
      await readMoreButton.click();

      // 等待页面跳转
      await page.waitForTimeout(1000);

      // 验证 URL 跳转到评测详情页（包含 /reviews/ 路径）
      await expect(page).toHaveURL(/\/reviews\//);
    }
  });

  test('应该显示热门评测区域', async ({ page }) => {
    // 滚动到"热门评测"区域确保可见
    const hotReviewsSection = page.locator('h3').filter({ hasText: '热门评测' });
    await hotReviewsSection.scrollIntoViewIfNeeded();

    // 验证热门评测卡片存在（包含 fire 图标的卡片）
    const hotReviewCards = page.locator('.ant-card').filter({ has: page.locator('.anticon-fire') });
    await expect(hotReviewCards).toHaveCountGreaterThan(0);
  });

  test('应该处理无数据状态', async ({ page }) => {
    // 输入不可能匹配的搜索词
    const searchInput = page.locator('input[placeholder="搜索游戏评测..."]');
    await searchInput.fill('不可能的搜索词12345');
    await searchInput.press('Enter');

    // 等待搜索结果加载
    await page.waitForTimeout(1000);

    // 验证显示未找到相关评测的提示（支持中英文两种文案）
    await expect(page.locator('h3')).toContainText('未找到相关评测').or.toContainText('No reviews found');
  });

  test('应该显示评分组件', async ({ page }) => {
    // 等待评测列表加载
    await page.waitForSelector('.ant-card');

    // 获取第一个评测的评分元素
    const ratingElement = page.locator('.ant-card').first().locator('.ant-rate');

    // 验证评分组件存在
    await expect(ratingElement).toBeVisible();
  });
});