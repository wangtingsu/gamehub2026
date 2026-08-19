/**
 * 数据库种子数据模块
 *
 * 用于向 GameHub 数据库填充初始测试数据，包括用户、游戏、评论、
 * 收藏、新闻和邮件模板等预设内容。
 *
 * 可通过命令行直接调用：
 * ```bash
 * npx ts-node src/db/seed.ts          # 插入种子数据
 * npx ts-node src/db/seed.ts --clear   # 清空后插入种子数据
 * ```
 *
 * 种子账户：
 * - 管理员: admin@gamehub.com / Admin123!
 * - 版主: moderator@gamehub.com / Moderator123!
 * - 普通用户: user1@gamehub.com / User123!（另有 user2、user3）
 *
 * @module db/seed
 */

import bcrypt from 'bcryptjs';
import { connectDatabase, execute, runMigrations } from './index';
import config from '../config';
import logger from '../utils/logger';

/**
 * 密码哈希函数
 *
 * 使用 bcryptjs 对明文密码进行加盐哈希处理。
 * 盐的轮次由配置项 config.security.bcryptRounds 控制。
 *
 * @param {string} password - 明文密码
 * @returns {Promise<string>} bcrypt 哈希字符串
 */
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(config.security.bcryptRounds);
  return await bcrypt.hash(password, salt);
};

/**
 * 清空现有数据（可选）
 *
 * 按外键约束的顺序删除所有种子数据表中的记录，
 * 并重置 SQLite 自增 ID 计数器。
 * 删除顺序：favorites -> reviews -> games -> users
 *
 * @returns {Promise<void>} 清空完成后 resolve
 */
const clearExistingData = async (): Promise<void> => {
  logger.info('开始清空现有数据...');

  // 注意：外键约束需要按顺序删除
  await execute('DELETE FROM favorites');
  await execute('DELETE FROM reviews');
  await execute('DELETE FROM games');
  await execute('DELETE FROM users');

  // 重置自增ID（SQLite特定）
  await execute("DELETE FROM sqlite_sequence WHERE name IN ('users', 'games', 'reviews', 'favorites')");

  logger.info('现有数据已清空');
};

/**
 * 插入测试用户数据
 *
 * 创建 5 个预定义测试用户（admin、moderator、user1/user2/user3），
 * 使用 bcrypt 对密码进行哈希处理后写入数据库。
 * 返回用户名到用户 ID 的映射，供其他种子函数引用。
 *
 * @returns {Promise<Record<string, number>>} 用户名到用户 ID 的映射表
 */
const seedUsers = async (): Promise<Record<string, number>> => {
  logger.info('开始插入用户数据...');

  const users = [
    {
      username: 'admin',
      email: 'admin@gamehub.com',
      password: 'Admin123!',
      displayName: 'Administrator',
      role: 'admin',
      bio: 'System Administrator'
    },
    {
      username: 'moderator',
      email: 'moderator@gamehub.com',
      password: 'Moderator123!',
      displayName: '版主',
      role: 'moderator',
      bio: '社区版主'
    },
    {
      username: 'user1',
      email: 'user1@gamehub.com',
      password: 'User123!',
      displayName: '游戏玩家1',
      role: 'user',
      bio: '热爱游戏的玩家'
    },
    {
      username: 'user2',
      email: 'user2@gamehub.com',
      password: 'User123!',
      displayName: '游戏玩家2',
      role: 'user',
      bio: '硬核游戏玩家'
    },
    {
      username: 'user3',
      email: 'user3@gamehub.com',
      password: 'User123!',
      displayName: '游戏玩家3',
      role: 'user',
      bio: '休闲游戏爱好者'
    }
  ];

  const userIds: Record<string, number> = {};

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);

    const result = await execute(
      `INSERT INTO users (
        username, email, password_hash, display_name,
        role, email_verified, is_active, bio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.username,
        user.email,
        passwordHash,
        user.displayName,
        user.role,
        1,  // email_verified
        1,  // is_active
        user.bio
      ]
    );

    userIds[user.username] = result.lastInsertRowid;
    logger.debug(`用户创建成功: ${user.username} (ID: ${result.lastInsertRowid})`);
  }

  logger.info(`用户数据插入完成，共 ${users.length} 个用户`);
  return userIds;
};

/**
 * 插入测试游戏数据
 *
 * 创建 5 个预定义游戏（艾尔登法环、赛博朋克2077、博德之门3、
 * 星露谷物语、空洞骑士），包含完整的游戏信息。
 * 返回游戏 slug 到游戏 ID 的映射，供其他种子函数引用。
 *
 * @returns {Promise<Record<string, number>>} 游戏 slug 到游戏 ID 的映射表
 */
const seedGames = async (): Promise<Record<string, number>> => {
  logger.info('开始插入游戏数据...');

  const games = [
    {
      title: '艾尔登法环',
      slug: 'elden-ring',
      description: '由FromSoftware开发、万代南梦宫娱乐发行的黑暗幻想动作角色扮演游戏。',
      releaseDate: '2022-02-25',
      developer: 'FromSoftware',
      publisher: '万代南梦宫娱乐',
      genres: ['动作角色扮演', '开放世界', '黑暗幻想'],
      platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One'],
      rating: 9.5,
      price: 298.0,
      discount: 10,
      coverImageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop',
      screenshots: [
        'https://example.com/elden-ring-1.jpg',
        'https://example.com/elden-ring-2.jpg',
        'https://example.com/elden-ring-3.jpg'
      ],
      steamAppId: 1245620,
      rawgId: 326243,
      isFeatured: true,
      displayZone: 'recommended'
    },
    {
      title: '赛博朋克2077',
      slug: 'cyberpunk-2077',
      description: '由CD Projekt开发并发行的开放世界动作角色扮演游戏。',
      releaseDate: '2020-12-10',
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      genres: ['动作角色扮演', '开放世界', '赛博朋克'],
      platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One'],
      rating: 8.5,
      price: 298.0,
      discount: 30,
      coverImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop',
      screenshots: [
        'https://example.com/cyberpunk-1.jpg',
        'https://example.com/cyberpunk-2.jpg',
        'https://example.com/cyberpunk-3.jpg'
      ],
      steamAppId: 1091500,
      rawgId: 41494,
      isFeatured: true,
      displayZone: 'recommended'
    },
    {
      title: '博德之门3',
      slug: 'baldurs-gate-3',
      description: '由拉瑞安工作室开发的角色扮演游戏，基于龙与地下城5e规则。',
      releaseDate: '2023-08-03',
      developer: 'Larian Studios',
      publisher: 'Larian Studios',
      genres: ['角色扮演', '回合制策略', '奇幻'],
      platforms: ['PC', 'PlayStation 5', 'Xbox Series X/S', 'macOS'],
      rating: 9.8,
      price: 298.0,
      discount: 0,
      coverImageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop',
      screenshots: [
        'https://example.com/bg3-1.jpg',
        'https://example.com/bg3-2.jpg',
        'https://example.com/bg3-3.jpg'
      ],
      steamAppId: 1086940,
      rawgId: 340871,
      isFeatured: true,
      displayZone: 'recommended'
    },
    {
      title: '星露谷物语',
      slug: 'stardew-valley',
      description: '由ConcernedApe开发的模拟角色扮演游戏。',
      releaseDate: '2016-02-26',
      developer: 'ConcernedApe',
      publisher: 'Chucklefish',
      genres: ['模拟', '角色扮演', '休闲'],
      platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch', 'iOS', 'Android'],
      rating: 9.2,
      price: 48.0,
      discount: 20,
      coverImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop',
      screenshots: [
        'https://example.com/stardew-1.jpg',
        'https://example.com/stardew-2.jpg',
        'https://example.com/stardew-3.jpg'
      ],
      steamAppId: 413150,
      rawgId: 240720,
      isFeatured: false,
      displayZone: 'indie'
    },
    {
      title: '空洞骑士',
      slug: 'hollow-knight',
      description: '由Team Cherry开发的类银河战士恶魔城游戏。',
      releaseDate: '2017-02-24',
      developer: 'Team Cherry',
      publisher: 'Team Cherry',
      genres: ['动作冒险', '平台游戏', '类银河战士恶魔城'],
      platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
      rating: 9.3,
      price: 78.0,
      discount: 15,
      coverImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&auto=format&fit=crop',
      screenshots: [
        'https://example.com/hollow-1.jpg',
        'https://example.com/hollow-2.jpg',
        'https://example.com/hollow-3.jpg'
      ],
      steamAppId: 367520,
      rawgId: 100166,
      isFeatured: false,
      displayZone: 'indie'
    }
  ];

  const gameIds: Record<string, number> = {};

  for (const game of games) {
    const result = await execute(
      `INSERT INTO games (
        title, slug, description, release_date, developer, publisher,
        genres, platforms, rating, price, discount, cover_image_url,
        screenshots, steam_app_id, rawg_id, is_featured, display_zone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game.title,
        game.slug,
        game.description,
        game.releaseDate,
        game.developer,
        game.publisher,
        JSON.stringify(game.genres),
        JSON.stringify(game.platforms),
        game.rating,
        game.price,
        game.discount,
        game.coverImageUrl,
        JSON.stringify(game.screenshots),
        game.steamAppId,
        game.rawgId,
        game.isFeatured ? 1 : 0,
        game.displayZone || null
      ]
    );

    gameIds[game.slug] = result.lastInsertRowid;
    logger.debug(`游戏创建成功: ${game.title} (ID: ${result.lastInsertRowid})`);
  }

  logger.info(`游戏数据插入完成，共 ${games.length} 个游戏`);
  return gameIds;
};

/**
 * 插入测试评论数据
 *
 * 创建 8 条预定义的用户评论，覆盖不同的游戏和用户组合。
 * 评论内容包含评星评分和中文本地化评论文本。
 *
 * @param {Record<string, number>} userIds - 用户名到用户 ID 的映射
 * @param {Record<string, number>} gameIds - 游戏 slug 到游戏 ID 的映射
 * @returns {Promise<void>} 插入完成后 resolve
 */
const seedReviews = async (userIds: Record<string, number>, gameIds: Record<string, number>): Promise<void> => {
  logger.info('开始插入评论数据...');

  const reviews = [
    {
      userId: 'user1',
      gameSlug: 'elden-ring',
      rating: 5,
      content: '史诗级的开放世界体验！战斗系统深度十足，世界观构建令人惊叹。',
      likes: 42
    },
    {
      userId: 'user2',
      gameSlug: 'elden-ring',
      rating: 4,
      content: '画面精美，但难度确实很高，对新手不太友好。',
      likes: 18
    },
    {
      userId: 'user3',
      gameSlug: 'cyberpunk-2077',
      rating: 4,
      content: '经过多次更新后，现在的游戏体验已经很不错了，夜之城很迷人。',
      likes: 25
    },
    {
      userId: 'admin',
      gameSlug: 'cyberpunk-2077',
      rating: 3,
      content: '首发时问题很多，现在修复了不少，但仍有改进空间。',
      likes: 12
    },
    {
      userId: 'user1',
      gameSlug: 'baldurs-gate-3',
      rating: 5,
      content: '年度游戏实至名归！剧情和角色塑造都达到了新的高度。',
      likes: 56
    },
    {
      userId: 'moderator',
      gameSlug: 'baldurs-gate-3',
      rating: 5,
      content: '完美的D&D游戏体验，每个选择都有意义。',
      likes: 38
    },
    {
      userId: 'user2',
      gameSlug: 'stardew-valley',
      rating: 5,
      content: '治愈系神作！种田、钓鱼、挖矿，时间不知不觉就过去了。',
      likes: 45
    },
    {
      userId: 'user3',
      gameSlug: 'hollow-knight',
      rating: 5,
      content: '艺术风格和音乐都太棒了，探索感极强。',
      likes: 32
    }
  ];

  for (const review of reviews) {
    // Derive a short title from the review content
    const title = review.content.substring(0, 50) + (review.content.length > 50 ? '...' : '');
    await execute(
      `INSERT INTO reviews (
        author_id, game_id, title, rating, content, likes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userIds[review.userId],
        gameIds[review.gameSlug],
        title,
        review.rating,
        review.content,
        review.likes
      ]
    );
  }

  logger.info(`评论数据插入完成，共 ${reviews.length} 条评论`);
};

/**
 * 插入测试收藏数据
 *
 * 创建 7 条预定义的用户收藏记录，覆盖不同的用户-游戏组合。
 *
 * @param {Record<string, number>} userIds - 用户名到用户 ID 的映射
 * @param {Record<string, number>} gameIds - 游戏 slug 到游戏 ID 的映射
 * @returns {Promise<void>} 插入完成后 resolve
 */
const seedFavorites = async (userIds: Record<string, number>, gameIds: Record<string, number>): Promise<void> => {
  logger.info('开始插入收藏数据...');

  const favorites = [
    { userId: 'user1', gameSlug: 'elden-ring' },
    { userId: 'user1', gameSlug: 'baldurs-gate-3' },
    { userId: 'user2', gameSlug: 'cyberpunk-2077' },
    { userId: 'user2', gameSlug: 'stardew-valley' },
    { userId: 'user3', gameSlug: 'hollow-knight' },
    { userId: 'admin', gameSlug: 'elden-ring' },
    { userId: 'moderator', gameSlug: 'baldurs-gate-3' }
  ];

  for (const fav of favorites) {
    await execute(
      `INSERT INTO favorites (user_id, game_id) VALUES (?, ?)`,
      [userIds[fav.userId], gameIds[fav.gameSlug]]
    );
  }

  logger.info(`收藏数据插入完成，共 ${favorites.length} 条收藏记录`);
};

/**
 * 插入邮件模板种子数据
 *
 * 创建 3 个预设的邮件 HTML 模板（邮箱验证、欢迎邮件、密码重置），
 * 包含完整的 HTML 样式和内联 CSS，支持模板变量替换。
 *
 * @returns {Promise<void>} 插入完成后 resolve
 */
const seedEmailTemplates = async (): Promise<void> => {
  logger.info('开始插入邮件模板数据...');

  const templates = [
    {
      name: '邮箱验证',
      description: '用于新用户注册后的邮箱验证',
      templateType: 'verification',
      subject: '验证您的 GameHub 邮箱',
      body: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:#fff;margin:0;font-size:24px">GameHub</h1>
    <p style="color:rgba(255,255,255,0.8);margin:5px 0 0">游戏社区平台</p>
  </div>
  <div style="padding:30px;background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <h2 style="color:#333;margin-top:0">欢迎加入 GameHub，{{userName}}！</h2>
    <p style="color:#666;line-height:1.6">请点击下方按钮验证您的邮箱地址：</p>
    <div style="text-align:center;margin:30px 0">
      <a href="{{verificationLink}}" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;border-radius:5px;font-size:16px">验证邮箱</a>
    </div>
    <p style="color:#999;font-size:12px">此链接将在24小时后过期。如果您没有注册 GameHub 账户，请忽略此邮件。</p>
    <p style="color:#999;font-size:12px">© {{year}} GameHub. All rights reserved.</p>
  </div>
</div>`,
      variables: ['userName', 'verificationLink', 'year'],
    },
    {
      name: '欢迎邮件',
      description: '邮箱验证成功后发送的欢迎邮件',
      templateType: 'welcome',
      subject: '欢迎加入 GameHub！',
      body: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:#fff;margin:0;font-size:24px">GameHub</h1>
    <p style="color:rgba(255,255,255,0.8);margin:5px 0 0">游戏社区平台</p>
  </div>
  <div style="padding:30px;background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <h2 style="color:#333;margin-top:0">邮箱验证成功！</h2>
    <p style="color:#666;line-height:1.6">您好，{{userName}}！</p>
    <p style="color:#666;line-height:1.6">您的邮箱已成功验证。现在您可以：</p>
    <ul style="color:#666;line-height:1.8">
      <li>发表游戏评测和评论</li>
      <li>参与社区讨论</li>
      <li>收藏您喜爱的游戏</li>
      <li>与其他玩家互动</li>
    </ul>
    <p style="color:#666;line-height:1.6">祝您在 GameHub 玩得开心！</p>
    <p style="color:#999;font-size:12px">© {{year}} GameHub. All rights reserved.</p>
  </div>
</div>`,
      variables: ['userName', 'year'],
    },
    {
      name: '密码重置',
      description: '用户忘记密码时发送密码重置链接',
      templateType: 'password_reset',
      subject: '重置您的 GameHub 密码',
      body: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;border-radius:10px 10px 0 0">
    <h1 style="color:#fff;margin:0;font-size:24px">GameHub</h1>
    <p style="color:rgba(255,255,255,0.8);margin:5px 0 0">游戏社区平台</p>
  </div>
  <div style="padding:30px;background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px">
    <h2 style="color:#333;margin-top:0">重置密码请求</h2>
    <p style="color:#666;line-height:1.6">您好，{{userName}}！</p>
    <p style="color:#666;line-height:1.6">我们收到了您的密码重置请求。请点击下方按钮设置新密码：</p>
    <div style="text-align:center;margin:30px 0">
      <a href="{{resetLink}}" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;border-radius:5px;font-size:16px">重置密码</a>
    </div>
    <p style="color:#999;font-size:12px">此链接将在1小时后过期。如果您没有请求重置密码，请忽略此邮件。</p>
    <p style="color:#999;font-size:12px">© {{year}} GameHub. All rights reserved.</p>
  </div>
</div>`,
      variables: ['userName', 'resetLink', 'year'],
    },
  ];

  for (const template of templates) {
    await execute(
      `INSERT OR IGNORE INTO email_templates (name, description, template_type, subject, body, variables, is_active, version_string, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, '1.0.0', datetime('now'), datetime('now'))`,
      [
        template.name,
        template.description,
        template.templateType,
        template.subject,
        template.body,
        JSON.stringify(template.variables),
      ]
    );
    logger.debug(`邮件模板创建成功: ${template.name}`);
  }

  logger.info(`邮件模板数据插入完成，共 ${templates.length} 个模板`);
};

/**
 * 主种子函数
 *
 * 执行完整的数据库种子数据填充流程：
 * 1. 连接数据库
 * 2. 运行数据库迁移确保表结构存在
 * 3. 可选清空现有数据
 * 4. 依次插入用户、游戏、评论、收藏、新闻、邮件模板数据
 * 5. 打印种子数据统计信息
 *
 * 支持通过命令行参数 --clear 调用时清空已有数据。
 *
 * @param {boolean} [clear=false] - 是否在插入前清空现有数据
 * @returns {Promise<void>} 种子任务完成后 resolve
 * @throws 种子任务失败时抛出错误
 */
export const seedDatabase = async (clear: boolean = false): Promise<void> => {
  try {
    logger.info('开始数据库种子任务...');

    // 连接数据库
    await connectDatabase();
    logger.info('数据库连接成功');

    // 确保表结构已创建
    await runMigrations();
    logger.info('数据库迁移完成');

    if (clear) {
      await clearExistingData();
    }

    // 执行种子任务
    const userIds = await seedUsers();
    const gameIds = await seedGames();
    await seedReviews(userIds, gameIds);
    await seedFavorites(userIds, gameIds);
    await seedNews(userIds);
    await seedEmailTemplates();


    logger.info('数据库种子任务完成！');
    console.log(`
🎉 种子数据插入成功！
📊 统计数据：
   👥 用户: 5个 (admin, moderator, user1-3)
   🎮 游戏: 5个 (艾尔登法环、赛博朋克2077、博德之门3、星露谷物语、空洞骑士)
   📝 评论: 8条
   ⭐ 收藏: 7条
   📧 邮件模板: 3个 (邮箱验证、欢迎邮件、密码重置)

🔑 测试账户：
   管理员: admin@gamehub.com / Admin123!
   版主: moderator@gamehub.com / Moderator123!
   普通用户: user1@gamehub.com / User123!

🌐 现在可以访问：
   前端: http://localhost:5176
   后端API: http://localhost:3003
    `);
  } catch (error) {
    logger.error('数据库种子任务失败:', error);
    console.error('❌ 种子任务失败:', error);
    throw error;
  }
};

// 命令行支持
if (require.main === module) {
  const clear = process.argv.includes('--clear');

  seedDatabase(clear)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
/**
 * 插入测试新闻数据
 *
 * 创建 3 条预定义的游戏行业新闻，包含完整的中文本地化内容、
 * 分类标签和发布状态。由 admin 用户作为作者。
 *
 * @param {Record<string, number>} userIds - 用户名到用户 ID 的映射表
 * @returns {Promise<void>} 插入完成后 resolve
 */
const seedNews = async (userIds: Record<string, number>): Promise<void> => {
  logger.info('开始插入新闻数据...');

  const newsList = [
    {
      title: '2026年游戏行业趋势报告：AI与云游戏引领变革',
      slug: '2026-gaming-industry-trends',
      content: '随着2026年的到来，游戏行业正经历着前所未有的变革。人工智能技术正在彻底改变游戏开发流程，从程序化内容生成到智能NPC行为，AI的应用范围不断扩大。\n\n云游戏技术也取得了显著进展，5G网络的普及使得高画质游戏流式传输变得更为可行。多家大厂已经推出了成熟的云游戏服务，订阅制商业模式正在成为主流。\n\n此外，跨平台游戏的趋势也在加速。越来越多的游戏支持PC、主机和移动端之间的无缝联机，打破了传统的平台壁垒。',
      excerpt: 'AI技术、云游戏和跨平台趋势正在重塑游戏行业格局',
      category: '行业动态',
      tags: ['行业趋势', 'AI', '云游戏', '跨平台'],
      isPublished: true,
      publishedAt: new Date().toISOString()
    },
    {
      title: '国产游戏《黑神话：悟空》全球销量突破3000万份',
      slug: 'black-myth-wukong-30m-sales',
      content: '游戏科学工作室宣布，《黑神话：悟空》全球累计销量已突破3000万份，成为有史以来最畅销的国产游戏。\n\n该游戏自发布以来获得了广泛好评，其精美的画面、流畅的战斗系统和深厚的中国文化底蕴赢得了全球玩家的认可。\n\n据悉，游戏科学正在开发DLC内容，预计将在今年晚些时候发布。同时，电影的改编也在筹备中。',
      excerpt: '国产3A大作再创里程碑，DLC内容正在开发中',
      category: '新作发布',
      tags: ['黑神话：悟空', '国产游戏', '销量'],
      isPublished: true,
      publishedAt: new Date().toISOString()
    },
    {
      title: '索尼PS6主机规格疑似泄露：光追性能大幅提升',
      slug: 'sony-ps6-specs-leak',
      content: '近日有开发者在社交平台上曝光了下一代PlayStation主机的部分规格信息。据称，PS6将搭载AMD定制芯片，光线追踪性能相比PS5提升4倍以上。\n\n此外，新主机将支持8K分辨率游戏和最高240Hz刷新率。存储方面将采用更快的NVMe SSD，读取速度可达20GB/s。\n\n索尼官方尚未对此消息做出回应。业界分析认为，PS6有望在2027年假期季正式发布。',
      excerpt: '下一代PlayStation主机规格曝光，光线追踪性能提升4倍',
      category: '硬件科技',
      tags: ['索尼', 'PS6', '硬件', '光线追踪'],
      isPublished: true,
      publishedAt: new Date().toISOString()
    }
  ];

  for (const news of newsList) {
    const authorId = userIds['admin'];
    const result = await execute(
      'INSERT INTO news (title, slug, content, excerpt, author_id, category, tags, is_published, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
      [news.title, news.slug, news.content, news.excerpt, authorId, news.category, JSON.stringify(news.tags), news.isPublished ? 1 : 0, news.publishedAt]
    );
    logger.debug('新闻创建成功: ' + news.title + ' (ID: ' + result.lastInsertRowid + ')');
  }

  logger.info('新闻数据插入完成，共 ' + newsList.length + ' 条新闻');
};
