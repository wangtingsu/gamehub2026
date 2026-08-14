/**
 * 用户画像分析服务
 *
 * 提供用户标签管理、用户分组（静态/动态）、行为分析和画像生成等功能。
 * 标签用于标记用户特征（如活跃用户、高消费用户等），
 * 分组支持静态手动添加和动态规则匹配两种模式，
 * 行为分析基于登录日志、评测、评论等数据生成完整的用户行为画像。
 * 主要用于运营分析、精准推荐和用户分层管理。
 */
import { query, execute } from '../db';

// ========== 标签管理 ==========

/** 用户标签数据结构 */
export interface UserTag {
  id: number;
  name: string;
  color: string;
  description?: string;
  created_at?: string;
}

/**
 * 获取所有用户标签
 *
 * 返回系统中定义的所有标签，按名称字母序排列。
 *
 * @returns 标签数组
 */
export async function getAllTags(): Promise<UserTag[]> {
  const rows = await query('SELECT * FROM user_tags ORDER BY name ASC');
  return rows as UserTag[];
}

/**
 * 创建新的用户标签
 *
 * @param name - 标签名称
 * @param color - 标签颜色（十六进制，默认 #1890ff）
 * @param description - 标签描述（可选）
 * @returns 创建成功的标签对象
 */
export async function createTag(name: string, color: string = '#1890ff', description?: string): Promise<UserTag> {
  const result = await execute(
    'INSERT INTO user_tags (name, color, description) VALUES (?, ?, ?)',
    [name, color, description || null]
  );
  const rows = await query('SELECT * FROM user_tags WHERE id = ?', [result.lastInsertRowid]);
  return (rows[0] as UserTag);
}

/**
 * 删除标签
 *
 * 删除指定标签，关联的用户标签分配由数据库 CASCADE 自动处理。
 *
 * @param id - 标签 ID
 */
export async function deleteTag(id: number): Promise<void> {
  await execute('DELETE FROM user_tags WHERE id = ?', [id]);
}

/**
 * 为用户分配标签
 *
 * 将指定标签分配给用户，使用 INSERT OR IGNORE 避免重复分配。
 *
 * @param userId - 用户 ID
 * @param tagId - 标签 ID
 * @param assignedBy - 操作人 ID（可选）
 */
export async function assignTagToUser(userId: string, tagId: number, assignedBy?: string): Promise<void> {
  await execute(
    'INSERT OR IGNORE INTO user_tag_assignments (user_id, tag_id, assigned_by) VALUES (?, ?, ?)',
    [userId, tagId, assignedBy || null]
  );
}

/**
 * 移除用户的标签
 *
 * @param userId - 用户 ID
 * @param tagId - 标签 ID
 */
export async function removeTagFromUser(userId: string, tagId: number): Promise<void> {
  await execute(
    'DELETE FROM user_tag_assignments WHERE user_id = ? AND tag_id = ?',
    [userId, tagId]
  );
}

/**
 * 获取用户的所有标签
 *
 * @param userId - 用户 ID
 * @returns 该用户被分配的标签数组
 */
export async function getUserTags(userId: string): Promise<UserTag[]> {
  const rows = await query(`
    SELECT t.* FROM user_tags t
    INNER JOIN user_tag_assignments a ON t.id = a.tag_id
    WHERE a.user_id = ?
    ORDER BY t.name ASC
  `, [userId]);
  return rows as UserTag[];
}

// ========== 用户分组 ==========

/** 用户分组（用户段）数据结构 */
export interface UserSegment {
  id: number;
  name: string;
  description?: string;
  criteria?: string;
  is_dynamic: number;
  memberCount?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 获取所有用户分组
 *
 * 返回所有分组的列表，并附带各分组的成员数量统计。
 *
 * @returns 用户分组数组
 */
export async function getAllSegments(): Promise<UserSegment[]> {
  const rows = await query(`
    SELECT s.*, (SELECT COUNT(*) FROM segment_members WHERE segment_id = s.id) as memberCount
    FROM user_segments s ORDER BY s.created_at DESC
  `);
  return rows as UserSegment[];
}

/**
 * 创建用户分组
 *
 * 支持创建静态分组（手动管理成员）和动态分组（基于规则自动匹配成员）。
 *
 * @param data - 分组配置（名称、描述、筛选条件、是否动态、创建人）
 * @returns 创建成功的分组对象（成员数为 0）
 */
export async function createSegment(data: {
  name: string;
  description?: string;
  criteria?: string;
  isDynamic?: number;
  createdBy?: string;
}): Promise<UserSegment> {
  const result = await execute(
    `INSERT INTO user_segments (name, description, criteria, is_dynamic, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.description || null, data.criteria || null, data.isDynamic || 0, data.createdBy || null]
  );
  const rows = await query('SELECT * FROM user_segments WHERE id = ?', [result.lastInsertRowid]);
  return { ...(rows[0] as UserSegment), memberCount: 0 };
}

/**
 * 更新用户分组
 *
 * 只更新提供的字段，未提供的字段保持不变。
 *
 * @param id - 分组 ID
 * @param data - 需要更新的字段
 * @returns 更新后的分组对象
 */
export async function updateSegment(id: number, data: {
  name?: string;
  description?: string;
  criteria?: string;
  isDynamic?: number;
}): Promise<UserSegment> {
  const sets: string[] = [];
  const params: any[] = [];

  // 动态构建 SET 子句，仅包含有值的字段
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.criteria !== undefined) { sets.push('criteria = ?'); params.push(data.criteria); }
  if (data.isDynamic !== undefined) { sets.push('is_dynamic = ?'); params.push(data.isDynamic); }

  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    params.push(id);
    await execute(`UPDATE user_segments SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  const rows = await query('SELECT * FROM user_segments WHERE id = ?', [id]);
  return rows[0] as UserSegment;
}

/**
 * 删除用户分组
 *
 * 物理删除分组记录，关联的成员数据由数据库级联删除处理。
 *
 * @param id - 分组 ID
 */
export async function deleteSegment(id: number): Promise<void> {
  await execute('DELETE FROM user_segments WHERE id = ?', [id]);
}

/**
 * 向分组添加成员
 *
 * 使用 INSERT OR IGNORE 避免重复添加。
 *
 * @param segmentId - 分组 ID
 * @param userId - 用户 ID
 * @param addedBy - 操作人 ID（可选）
 */
export async function addMemberToSegment(segmentId: number, userId: string, addedBy?: string): Promise<void> {
  await execute(
    'INSERT OR IGNORE INTO segment_members (segment_id, user_id, added_by) VALUES (?, ?, ?)',
    [segmentId, userId, addedBy || null]
  );
}

/**
 * 从分组移除成员
 *
 * @param segmentId - 分组 ID
 * @param userId - 用户 ID
 */
export async function removeMemberFromSegment(segmentId: number, userId: string): Promise<void> {
  await execute(
    'DELETE FROM segment_members WHERE segment_id = ? AND user_id = ?',
    [segmentId, userId]
  );
}

/**
 * 获取分组成员列表
 *
 * 分页获取指定分组的成员及其详细信息（用户名、头像、角色、等级等）。
 *
 * @param segmentId - 分组 ID
 * @param page - 页码（默认 1）
 * @param limit - 每页数量（默认 20）
 * @returns 成员列表和总成员数
 */
export async function getSegmentMembers(
  segmentId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ members: any[]; total: number }> {
  const offset = (page - 1) * limit;

  const totalResult = await query(
    'SELECT COUNT(*) as total FROM segment_members WHERE segment_id = ?',
    [segmentId]
  );

  const members = await query(`
    SELECT sm.*, u.username, u.display_name, u.avatar_url, u.email, u.role, u.level,
           u.last_login, u.is_active, u.created_at
    FROM segment_members sm
    JOIN users u ON sm.user_id = u.id
    WHERE sm.segment_id = ?
    ORDER BY sm.added_at DESC
    LIMIT ? OFFSET ?
  `, [segmentId, limit, offset]);

  return {
    members: members as any[],
    total: (totalResult[0] as any)?.total || 0,
  };
}

/**
 * 评估动态分组成员
 *
 * 根据分组配置的筛选条件（等级、活跃度、角色、登录/注册天数等）查询匹配的用户，
 * 清空原有成员列表后重新插入匹配结果。
 * 仅支持 is_dynamic = 1 的动态分组。
 *
 * @param segmentId - 动态分组的 ID
 * @returns 受影响的用户数量
 * @throws 当分组不是动态分组时抛出错误
 * @throws 当筛选条件无效或为空时抛出错误
 */
export async function evaluateDynamicSegment(segmentId: number): Promise<{ affected: number }> {
  const segment = await query('SELECT * FROM user_segments WHERE id = ?', [segmentId]);
  if (!segment || (segment[0] as any)?.is_dynamic !== 1) {
    throw new Error('只能评估动态分组');
  }

  const seg = segment[0] as any;
  let whereClause = '';
  let params: any[] = [];

  try {
    // 解析 JSON 格式的筛选条件
    const criteria = JSON.parse(seg.criteria || '{}');

    // 按最低等级筛选
    if (criteria.minLevel) {
      whereClause += `${whereClause ? ' AND ' : ''} u.level >= ?`;
      params.push(criteria.minLevel);
    }
    // 按最高等级筛选
    if (criteria.maxLevel) {
      whereClause += `${whereClause ? ' AND ' : ''} u.level <= ?`;
      params.push(criteria.maxLevel);
    }
    // 按最低总登录时间筛选
    if (criteria.minLoginTime) {
      whereClause += `${whereClause ? ' AND ' : ''} u.total_login_time >= ?`;
      params.push(criteria.minLoginTime);
    }
    // 按活跃状态筛选
    if (criteria.isActive !== undefined) {
      whereClause += `${whereClause ? ' AND ' : ''} u.is_active = ?`;
      params.push(criteria.isActive ? 1 : 0);
    }
    // 按角色筛选
    if (criteria.roles && criteria.roles.length > 0) {
      whereClause += `${whereClause ? ' AND ' : ''} u.role IN (${criteria.roles.map(() => '?').join(',')})`;
      params.push(...criteria.roles);
    }
    // 按最近登录天数筛选（超过指定天数未登录的用户）
    if (criteria.daysSinceLogin) {
      whereClause += `${whereClause ? ' AND ' : ''} (u.last_login IS NULL OR u.last_login < datetime('now', '-${criteria.daysSinceLogin} days'))`;
    }
    // 按注册天数筛选（指定天数内注册的用户）
    if (criteria.daysSinceRegister) {
      whereClause += `${whereClause ? ' AND ' : ''} u.created_at >= datetime('now', '-${criteria.daysSinceRegister} days')`;
    }
  } catch {
    throw new Error('无效的筛选条件');
  }

  if (!whereClause) {
    throw new Error('请至少设置一个筛选条件');
  }

  // 查询匹配的用户
  const sql = `SELECT u.id FROM users u WHERE ${whereClause}`;
  const matchingUsers = await query(sql, params);

  // 清空原成员后重新插入
  await execute('DELETE FROM segment_members WHERE segment_id = ?', [segmentId]);

  // 逐个插入匹配的用户
  for (const user of matchingUsers as any[]) {
    await execute(
      'INSERT OR IGNORE INTO segment_members (segment_id, user_id) VALUES (?, ?)',
      [segmentId, user.id]
    );
  }

  return { affected: matchingUsers.length };
}

// ========== 行为分析 ==========

/** 用户行为画像数据结构 */
export interface BehaviorProfile {
  userId: string;
  username: string;
  displayName?: string;
  totalLogins: number;
  lastLogin?: string;
  totalLoginTime: number;
  avgSessionDuration: number;
  logins30d: number;
  loginFrequency: 'high' | 'medium' | 'low' | 'inactive';
  peakHour: number;
  reviewsCount: number;
  commentsCount: number;
  postsCount: number;
  tags: UserTag[];
}

/**
 * 获取用户的完整行为画像
 *
 * 综合分析用户的登录记录、内容产出（评测/评论/帖子）和标签信息，
 * 生成全面的用户行为画像，包括登录频率分级和活跃时段分析。
 *
 * 登录频率分级标准：
 * - high: 30 天内登录 >= 15 次
 * - medium: 30 天内登录 >= 5 次
 * - low: 30 天内登录 >= 1 次
 * - inactive: 30 天内未登录
 *
 * @param userId - 用户 ID
 * @returns 用户行为画像对象
 * @throws 当用户不存在时抛出错误
 */
export async function getUserBehaviorProfile(userId: string): Promise<BehaviorProfile> {
  // 获取用户基本信息
  const userRows = await query(
    'SELECT id, username, display_name, total_login_time, last_login FROM users WHERE id = ?',
    [userId]
  );
  if (!userRows.length) throw new Error('用户不存在');
  const user = (userRows[0] as any);

  // 获取登录统计（总登录次数、平均会话时长）
  const loginStats = await query(`
    SELECT COUNT(*) as totalLogins,
           COALESCE(AVG(duration_minutes), 0) as avgDuration
    FROM login_logs WHERE user_id = ?
  `, [userId]);

  // 获取近 30 天登录次数
  const logins30 = await query(`
    SELECT COUNT(*) as count FROM login_logs
    WHERE user_id = ? AND login_time >= datetime('now', '-30 days')
  `, [userId]);

  // 获取活跃时段（登录最集中的小时）
  const peakHourResult = await query(`
    SELECT CAST(strftime('%H', login_time) AS INTEGER) as hour,
           COUNT(*) as count
    FROM login_logs WHERE user_id = ?
    GROUP BY hour ORDER BY count DESC LIMIT 1
  `, [userId]);

  // 并行获取内容产出统计
  const contentCounts = await Promise.all([
    query('SELECT COUNT(*) as count FROM reviews WHERE author_id = ?', [userId]),
    query('SELECT COUNT(*) as count FROM comments WHERE author_id = ?', [userId]),
    query('SELECT COUNT(*) as count FROM community_posts WHERE author_id = ?', [userId]),
  ]);

  // 获取用户标签
  const tags = await getUserTags(userId.toString());

  const totalLogins = (loginStats[0] as any)?.totalLogins || 0;
  const logins30d = (logins30[0] as any)?.count || 0;

  // 根据近 30 天登录次数划分活跃等级
  let loginFrequency: 'high' | 'medium' | 'low' | 'inactive';
  if (logins30d >= 15) loginFrequency = 'high';
  else if (logins30d >= 5) loginFrequency = 'medium';
  else if (logins30d >= 1) loginFrequency = 'low';
  else loginFrequency = 'inactive';

  return {
    userId: String(user.id),
    username: user.username,
    displayName: user.display_name,
    totalLogins,
    lastLogin: user.last_login,
    totalLoginTime: user.total_login_time || 0,
    avgSessionDuration: Math.round((loginStats[0] as any)?.avgDuration || 0),
    logins30d,
    loginFrequency,
    peakHour: (peakHourResult[0] as any)?.hour ?? -1,
    reviewsCount: (contentCounts[0][0] as any)?.count || 0,
    commentsCount: (contentCounts[1][0] as any)?.count || 0,
    postsCount: (contentCounts[2][0] as any)?.count || 0,
    tags,
  };
}

/**
 * 获取登录频率分布
 *
 * 统计全平台用户在近 30 天内，按登录频率分级的分布情况。
 * 用于了解用户活跃度的整体画像。
 *
 * @returns 各级别用户数量（high/medium/low/inactive）
 */
export async function getLoginFrequencyDistribution(): Promise<{ high: number; medium: number; low: number; inactive: number }> {
  const rows = await query(`
    SELECT
      SUM(CASE WHEN l.count >= 15 THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN l.count >= 5 AND l.count < 15 THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN l.count >= 1 AND l.count < 5 THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN l.count IS NULL OR l.count = 0 THEN 1 ELSE 0 END) as inactive
    FROM (
      SELECT u.id, COUNT(ll.id) as count
      FROM users u
      LEFT JOIN login_logs ll ON u.id = ll.user_id
        AND ll.login_time >= datetime('now', '-30 days')
      GROUP BY u.id
    ) l
  `);

  const r = rows[0] as any;
  return {
    high: r?.high || 0,
    medium: r?.medium || 0,
    low: r?.low || 0,
    inactive: r?.inactive || 0,
  };
}

/**
 * 获取用户等级分布
 *
 * 统计各等级的用户数量分布，用于了解用户成长情况。
 *
 * @returns 等级分布数组（[{ level, count }]）
 */
export async function getLevelDistribution(): Promise<Array<{ level: number; count: number }>> {
  const rows = await query(`
    SELECT level, COUNT(*) as count FROM users
    WHERE level IS NOT NULL
    GROUP BY level ORDER BY level ASC
  `);
  return rows as any[];
}

/**
 * 获取登录高峰时段分布
 *
 * 统计指定天数内的用户登录时段分布，用于了解用户的活跃时间规律。
 *
 * @param days - 统计天数范围（默认 30 天）
 * @returns 各小时的登录次数分布
 */
export async function getPeakLoginHours(days: number = 30): Promise<Array<{ hour: number; count: number }>> {
  const rows = await query(`
    SELECT CAST(strftime('%H', login_time) AS INTEGER) as hour, COUNT(*) as count
    FROM login_logs
    WHERE login_time >= datetime('now', '-${days} days')
    GROUP BY hour ORDER BY hour ASC
  `);
  return rows as any[];
}
