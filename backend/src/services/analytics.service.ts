/**
 * 数据统计分析服务
 *
 * 提供平台运营所需的各类数据统计功能，包括：
 * - 用户增长趋势分析
 * - 游戏热度排行
 * - 内容参与度统计
 * - 平台和类型分布
 * - 活跃用户分析
 * - Dashboard 综合统计
 * - 审计日志统计
 */

import { query, execute } from '../db';
import { getWeightedRatingGroupQuery } from './level.service';

/**
 * 获取用户增长趋势数据
 *
 * 按日/周/月维度统计指定天数内的新增用户数，并计算累计用户总量。
 *
 * @param period 统计周期：daily（每日）、weekly（每周）、monthly（每月），默认为 daily
 * @param days 统计天数范围，默认为 30 天
 * @returns 包含日期、新增用户数和累计用户数的数组
 */
export async function getUserGrowthTrend(
  period: 'daily' | 'weekly' | 'monthly' = 'daily',
  days: number = 30
): Promise<Array<{ date: string; newUsers: number; cumulative: number }>> {
  // 根据统计周期选择对应的日期格式化模板
  let dateFormat: string;
  if (period === 'daily') dateFormat = 'YYYY-MM-DD';
  else if (period === 'weekly') dateFormat = 'YYYY-IW';  // ISO 周格式
  else dateFormat = 'YYYY-MM';  // 月度格式

  // 查询统计周期内的新增用户分组数据
  const rows = await query(`
    SELECT TO_CHAR(created_at, '${dateFormat}') as date,
           COUNT(*) as newUsers
    FROM users
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY TO_CHAR(created_at, '${dateFormat}')
    ORDER BY date ASC
  `);

  // 查询统计起始时间之前的用户总数，作为累计基数值
  const totalBefore = await query(`
    SELECT COUNT(*) as total FROM users
    WHERE created_at < NOW() - INTERVAL '${days} days'
  `);

  // 遍历每日数据，逐日累加计算累计用户数
  let cumulative = (totalBefore[0] as any)?.total || 0;
  return (rows as any[]).map((row) => {
    cumulative += row.newUsers;
    return { date: row.date, newUsers: row.newUsers, cumulative };
  });
}

/**
 * 获取游戏热度排行
 *
 * 支持按评分、评测数或综合热度排序，返回指定数量的热门游戏列表。
 * 综合热度 = 评分 * 0.5 + 评测数 * 0.5。
 *
 * @param sortBy 排序依据：rating（评分）、reviews（评测数）、engagement（综合热度），默认为 rating
 * @param limit 返回数量限制，默认为 10
 * @returns 热门游戏列表，包含评分、评测数、价格、平台和类型等信息
 */
export async function getGamePopularity(
  sortBy: 'rating' | 'reviews' | 'engagement' = 'rating',
  limit: number = 10
): Promise<any[]> {
  // 根据排序依据构建不同的 ORDER BY 子句
  let orderClause: string;
  if (sortBy === 'rating') orderClause = 'g.rating DESC';
  else if (sortBy === 'reviews') orderClause = 'reviewCount DESC';
  else orderClause = '(g.rating * 0.5 + COALESCE(reviewCount, 0) * 0.5) DESC';

  const rows = await query(`
    SELECT g.id, g.title, g.rating, g.price, g.discount,
           g.platforms, g.genres, g.cover_image_url,
           COALESCE(r.reviewCount, 0) as reviewCount,
           COALESCE(r.avgScore, 0) as avgScore
    FROM games g
    LEFT JOIN (${getWeightedRatingGroupQuery()}) r ON g.id = r.game_id
    ORDER BY ${orderClause}
    LIMIT ?
  `, [limit]);

  /**
   * 解析平台/类型字段
   * 支持 JSON 数组、逗号分隔字符串和空值三种格式
   */
  const parseList = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val !== 'string') return [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return val.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  };

  return (rows as any[]).map((row) => ({
    id: String(row.id),
    title: row.title,
    rating: Number(row.rating) || 0,
    reviewCount: Number(row.reviewCount) || 0,
    avgScore: Number(row.avgScore) || 0,
    price: Number(row.price) || 0,
    discount: Number(row.discount) || 0,
    platforms: parseList(row.platforms),
    genres: parseList(row.genres),
    coverImageUrl: row.cover_image_url,
  }));
}

/**
 * 获取内容参与度统计数据
 *
 * 统计指定天数内的文章浏览量、评测数、帖子数和评论数，
 * 并提供按日维度的评测、帖子和评论趋势数据。
 *
 * @param days 统计天数范围，默认为 30 天
 * @returns 参与度汇总数据及每日趋势数组
 */
export async function getContentEngagement(
  days: number = 30
): Promise<{
  newsViews: number;
  reviews: number;
  posts: number;
  comments: number;
  daily: Array<{ date: string; type: string; count: number }>;
}> {
  // 统计文章总浏览量
  const newsResult = await query(`
    SELECT COALESCE(SUM(views), 0) as total FROM news
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `);

  // 统计评测总数
  const reviewResult = await query(`
    SELECT COUNT(*) as total FROM reviews
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `);

  // 统计帖子总数
  const postResult = await query(`
    SELECT COUNT(*) as total FROM community_posts
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `);

  // 统计评论总数
  const commentResult = await query(`
    SELECT COUNT(*) as total FROM comments
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `);

  // 使用 UNION ALL 获取每日各类内容的生成数量
  const dailyRows = await query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, 'reviews' as type, COUNT(*) as count
    FROM reviews WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    UNION ALL
    SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, 'posts' as type, COUNT(*) as count
    FROM community_posts WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    UNION ALL
    SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, 'comments' as type, COUNT(*) as count
    FROM comments WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY date ASC
  `);

  return {
    newsViews: (newsResult[0] as any)?.total || 0,
    reviews: (reviewResult[0] as any)?.total || 0,
    posts: (postResult[0] as any)?.total || 0,
    comments: (commentResult[0] as any)?.total || 0,
    daily: dailyRows as any[],
  };
}

/**
 * 获取游戏平台分布统计
 *
 * 解析所有游戏的 platforms 字段，统计各平台的游戏数量及占比。
 *
 * @returns 平台分布列表，按游戏数量降序排列，包含名称、数量和百分比
 */
export async function getPlatformDistribution(): Promise<Array<{ name: string; count: number; percentage: number }>> {
  const rows = await query(`SELECT platforms FROM games WHERE platforms IS NOT NULL`);
  const platformCount: Record<string, number> = {};
  let total = 0;

  // 遍历所有游戏，解析 platforms 字段并计数
  for (const row of rows as any[]) {
    try {
      const platforms = typeof row.platforms === 'string' ? JSON.parse(row.platforms) : row.platforms;
      if (Array.isArray(platforms)) {
        for (const p of platforms) {
          platformCount[p] = (platformCount[p] || 0) + 1;
          total++;
        }
      }
    } catch { /* 跳过解析失败的行 */ }
  }

  // 转换为数组格式并计算百分比（保留两位小数）
  return Object.entries(platformCount)
    .map(([name, count]) => ({ name, count, percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 获取游戏类型分布统计
 *
 * 解析所有游戏的 genres 字段，统计各类型的游戏数量及占比。
 *
 * @returns 类型分布列表，按游戏数量降序排列，包含名称、数量和百分比
 */
export async function getGenreDistribution(): Promise<Array<{ name: string; count: number; percentage: number }>> {
  const rows = await query(`SELECT genres FROM games WHERE genres IS NOT NULL`);
  const genreCount: Record<string, number> = {};
  let total = 0;

  // 遍历所有游戏，解析 genres 字段并计数
  for (const row of rows as any[]) {
    try {
      const genres = typeof row.genres === 'string' ? JSON.parse(row.genres) : row.genres;
      if (Array.isArray(genres)) {
        for (const g of genres) {
          genreCount[g] = (genreCount[g] || 0) + 1;
          total++;
        }
      }
    } catch { /* 跳过解析失败的行 */ }
  }

  // 转换为数组格式并计算百分比（保留两位小数）
  return Object.entries(genreCount)
    .map(([name, count]) => ({ name, count, percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 获取活跃用户分析数据
 *
 * 统计指定天数内的总登录次数、活跃用户数、新增用户数、
 * 平均每用户登录次数，以及每日登录趋势。
 *
 * @param days 统计天数范围，默认为 30 天
 * @returns 活跃用户分析数据，包含汇总指标和每日趋势
 */
export async function getActiveUsers(days: number = 30): Promise<{
  totalLogins: number;
  activeUsers: number;
  newUsers: number;
  avgLoginsPerUser: number;
  daily: Array<{ date: string; logins: number; activeUsers: number }>;
}> {
  // 查询总登录次数和活跃用户数（去重）
  const loginResult = await query(`
    SELECT COUNT(*) as totalLogins,
           COUNT(DISTINCT user_id) as activeUsers
    FROM login_logs
    WHERE login_time >= NOW() - INTERVAL '${days} days'
  `);

  // 查询统计周期内的新增用户数
  const newUsersResult = await query(`
    SELECT COUNT(*) as total FROM users
    WHERE created_at >= NOW() - INTERVAL '${days} days'
  `);

  // 查询每日登录趋势（含去重活跃用户数）
  const dailyRows = await query(`
    SELECT TO_CHAR(login_time, 'YYYY-MM-DD') as date,
           COUNT(*) as logins,
           COUNT(DISTINCT user_id) as activeUsers
    FROM login_logs
    WHERE login_time >= NOW() - INTERVAL '${days} days'
    GROUP BY TO_CHAR(login_time, 'YYYY-MM-DD')
    ORDER BY date ASC
  `);

  const totalLogins = (loginResult[0] as any)?.totalLogins || 0;
  const activeUsers = (loginResult[0] as any)?.activeUsers || 0;

  return {
    totalLogins,
    activeUsers,
    newUsers: (newUsersResult[0] as any)?.total || 0,
    // 计算平均每用户登录次数（保留两位小数）
    avgLoginsPerUser: activeUsers > 0 ? Math.round((totalLogins / activeUsers) * 100) / 100 : 0,
    daily: dailyRows as any[],
  };
}

/**
 * 获取 Dashboard 综合统计数据
 *
 * 提供管理后台概览页面所需的核心指标，包含：
 * - 用户、游戏、评测、文章、帖子、评论的当前总量
 * - 今日新增数据
 * - 与上月同期的环比增长率
 * - 最近 7 天用户增长趋势
 *
 * @returns Dashboard 综合统计对象
 */
export async function getDashboardStats(): Promise<any> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  // 计算上月同期的基准日期
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthDate = lastMonth.toISOString().split('T')[0];

  // 当前各实体总量统计
  const userCount = await query('SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM users');
  const gameCount = await query('SELECT COUNT(*) as total FROM games');
  const reviewCount = await query('SELECT COUNT(*) as total FROM reviews');
  const newsCount = await query('SELECT COUNT(*) as total FROM news');
  const postCount = await query('SELECT COUNT(*) as total FROM community_posts');
  const commentCount = await query('SELECT COUNT(*) as total FROM comments');

  // 今日新增数据
  const newUsersToday = await query("SELECT COUNT(*) as count FROM users WHERE created_at::date = ?::date", [today]);
  const newReviewsToday = await query("SELECT COUNT(*) as count FROM reviews WHERE created_at::date = ?::date", [today]);

  // 上月同期总量数据（用于计算环比增长率）
  const prevUserCount = await query("SELECT COUNT(*) as total FROM users WHERE created_at < ?::date", [lastMonthDate]);
  const prevGameCount = await query("SELECT COUNT(*) as total FROM games WHERE created_at < ?::date", [lastMonthDate]);
  const prevReviewCount = await query("SELECT COUNT(*) as total FROM reviews WHERE created_at < ?::date", [lastMonthDate]);

  // 最近 7 天用户增长趋势
  const weeklyUserTrend = await query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
    FROM users WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY date ASC
  `);

  /**
   * 计算环比增长率
   * @param current 当前值
   * @param previous 上期值
   * @returns 增长率百分比（保留一位小数），若上期值 <= 0 则返回 0
   */
  const calcGrowth = (current: number, previous: number): number => {
    if (previous <= 0) return 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  const currentTotal = (userCount[0] as any)?.total || 0;
  const prevTotal = (prevUserCount[0] as any)?.total || 0;

  return {
    users: {
      total: currentTotal,
      active: (userCount[0] as any)?.active || 0,
      newToday: (newUsersToday[0] as any)?.count || 0,
      growth: calcGrowth(currentTotal, prevTotal),
    },
    games: {
      total: (gameCount[0] as any)?.total || 0,
      growth: calcGrowth((gameCount[0] as any)?.total || 0, (prevGameCount[0] as any)?.total || 0),
    },
    news: { total: (newsCount[0] as any)?.total || 0 },
    reviews: {
      total: (reviewCount[0] as any)?.total || 0,
      newToday: (newReviewsToday[0] as any)?.count || 0,
      growth: calcGrowth((reviewCount[0] as any)?.total || 0, (prevReviewCount[0] as any)?.total || 0),
    },
    community: {
      posts: (postCount[0] as any)?.total || 0,
      comments: (commentCount[0] as any)?.total || 0,
    },
    trends: {
      users7d: weeklyUserTrend.map((r: any) => ({ date: r.date, count: r.count })),
    },
  };
}

/**
 * 获取审计日志的操作类型分布统计
 *
 * @param days 统计天数范围，默认为 30 天
 * @returns 各操作类型的出现次数列表，按次数降序排列
 */
export async function getAuditLogStats(days: number = 30): Promise<Array<{ action: string; count: number }>> {
  const rows = await query(`
    SELECT action, COUNT(*) as count FROM audit_logs
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY action ORDER BY count DESC
  `);
  return rows as any[];
}
