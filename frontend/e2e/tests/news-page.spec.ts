/**
 * news-page.spec.ts - 新闻页面 E2E 测试
 *
 * 测试新闻页面的核心功能：页面加载、新闻列表渲染、搜索、分类筛选、分页、详情跳转和无数据状态
 */
import { test, expect } from '@playwright/test';

test.describe('新闻页面E2E测试', () => {
  /** 每个测试前访问新闻页面 */
  test.beforeEach(async ({ page }) => {
    await page.goto('/news');
  });

  test('应该正确加载新闻页面', async ({ page }) => {
    // 验证页面标题包含 "GameHub"
    await expect(page).toHaveTitle(/GameHub/);

    // 验证页面包含"游戏新闻"标题
    await expect(page.locator('h1')).toContainText('游戏新闻');

    // 验证搜索框存在
    await expect(page.locator('input[placeholder="搜索新闻..."]')).toBeVisible();

    // 验证分类选择器存在
    await expect(page.locator('.ant-select-selector')).toBeVisible();
  });

  test('应该加载新闻列表', async ({ page }) => {
    // 等待新闻卡片加载完成
    await page.waitForSelector('.ant-card');

    // 验证至少有一个新闻卡片
    const newsCards = page.locator('.ant-card');
    await expect(newsCards).toHaveCountGreaterThan(0);

    // 验证第一个新闻卡片包含必要信息
    const firstCard = newsCards.first();
    await expect(firstCard.locator('.ant-typography')).toBeVisible(); // 标题
    await expect(firstCard.locator('.ant-tag')).toBeVisible(); // 分类标签
    await expect(firstCard.locator('img')).toBeVisible(); // 缩略图
  });

  test('应该支持新闻搜索', async ({ page }) => {
    // 在搜索框中输入关键词
    const searchInput = page.locator('input[placeholder="搜索新闻..."]');
    await searchInput.fill('游戏');
    await searchInput.press('Enter');

    // 等待搜索结果加载（简单等待，实际应等待网络请求完成）
    await page.waitForTimeout(1000);

    // 验证搜索后仍有内容显示
    await expect(page.locator('.ant-card')).toBeVisible();
  });

  test('应该支持分类筛选', async ({ page }) => {
    // 点击分类选择器
    await page.locator('.ant-select-selector').click();

    // 选择第一个非"全部分类"的选项
    await page.locator('.ant-select-item-option').nth(1).click();

    // 等待筛选结果加载
    await page.waitForTimeout(1000);

    // 验证仍有内容显示
    await expect(page.locator('.ant-card')).toBeVisible();
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

      // 验证仍显示新闻卡片
      await expect(page.locator('.ant-card')).toBeVisible();
    }
  });

  test('应该显示新闻详情', async ({ page }) => {
    // 等待新闻列表加载
    await page.waitForSelector('.ant-card');

    // 点击第一个新闻的"阅读全文"按钮
    const readMoreButton = page.locator('.ant-card').first().locator('button:has-text("阅读全文")');
    if (await readMoreButton.isVisible()) {
      await readMoreButton.click();

      // 等待页面跳转或模态框打开
      await page.waitForTimeout(1000);

      // 验证页面 URL 已从 /news 跳转（进入详情页或打开模态框）
      await expect(page).not.toHaveURL('/news');
    }
  });

  test('应该处理无数据状态', async ({ page }) => {
    // 输入不可能匹配的搜索词
    const searchInput = page.locator('input[placeholder="搜索新闻..."]');
    await searchInput.fill('不可能的搜索词12345');
    await searchInput.press('Enter');

    // 等待搜索结果加载
    await page.waitForTimeout(1000);

    // 验证显示未找到相关新闻的提示（支持中英文两种文案）
    await expect(page.locator('h3')).toContainText('未找到相关新闻').or.toContainText('No news found');
  });
});