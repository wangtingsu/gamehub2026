/**
 * AI 服务路由模块
 *
 * 本模块提供 AI 相关功能的 HTTP 接口，集成 DeepSeek 语言模型和 Meshy 3D 生成服务。
 * 包括以下功能区域：
 *
 * 一、AI 对话（SoulStation 心灵驿站）
 *   - POST /chat — 进行情感倾诉对话
 *
 * 二、AI 结构化内容生成
 *   - POST /generate — 根据模块类型生成结构化内容
 *     - npc 模块：搜索游戏攻略、视频、二创内容（返回 JSON）
 *     - companion 模块：根据性格测试推荐游戏角色（返回 JSON）
 *     - portrait 模块：生成角色背景描述（返回文本）
 *
 * 三、AI 图片转 3D 模型（Meshy API 集成）
 *   - POST /image-to-3d        — 提交图片生成 3D 模型任务
 *   - GET  /image-to-3d/:taskId — 查询 3D 生成任务状态
 *
 * 本模块接口无需管理员认证（面向普通用户）。
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import deepseekService from '../services/deepseek.service';
import { submitImageTo3D, queryTaskStatus, isMeshyEnabled } from '../services/meshy.service';
import { query, execute } from '../db';
import axios from 'axios';

const router = Router();

// B站搜索
async function searchBilibili(keyword: string): Promise<any[]> {
  try {
    const { data } = await axios.get('https://api.bilibili.com/x/web-interface/search/all/v2', {
      params: { keyword, page: 1 },
      headers: { 'User-Agent': 'GameHub/1.0', 'Referer': 'https://www.bilibili.com' },
      timeout: 5000,
    });
    if (data?.code === 0 && data?.data?.result) {
      const results: any[] = [];
      for (const item of data.data.result) {
        if (item.result_type === 'video') {
          for (const v of (item.data || []).slice(0, 3)) {
            results.push({
              title: v.title?.replace(/<[^>]*>/g, '') || '',
              author: v.author || '',
              views: Math.round((v.play || 0) / 10000) || 1,
              duration: v.duration || '',
              platform: 'B站',
              url: `https://www.bilibili.com/video/${v.bvid || ''}`,
              coverImageUrl: v.pic ? `/api/v1/ai/proxy-image?url=${encodeURIComponent(v.pic)}` : '',
            });
          }
        }
      }
      return results;
    }
  } catch {}
  return [];
}

/**
 * 各 AI 模块的系统提示词（System Prompt）配置
 * 每个模块有独立的提示词定义，引导 AI 的输出风格和格式
 *
 * soul:      心灵驿站 — 温暖友善的游戏情感陪伴
 * npc:       游戏百科 — 返回结构化的攻略/视频/二创 JSON 数据
 * companion: 角色推荐 — 根据性格测试推荐游戏角色，返回 JSON
 * portrait:  角色设定 — 根据自定义参数生成角色描述文本
 */
const SYSTEM_PROMPTS = {
  soul: `你是一个温暖友善的游戏心灵驿站 AI。你的职责是：
- 用中文和玩家聊天，倾听他们在游戏中的喜怒哀乐
- 语气亲切自然，像朋友一样
- 适当使用表情符号增强表达
- 回复简洁（50-150字），有共鸣感
- 不要评价玩家的感受，而是理解和接纳
- 围绕游戏话题展开，不要离题`,

  npc: `你是游戏攻略搜索引擎。严格按照以下步骤执行：

第一步：从以下平台搜索攻略文章，返回2-3条：
- NGA玩家社区 (nga.cn) - 搜索游戏攻略帖子
- 游民星空 (gamersky.com) - 搜索游戏攻略手册
- 知乎 (zhihu.com) - 搜索游戏攻略问答
每条攻略必须包含：真实可访问的URL（格式如https://nga.178.com/read.php?tid=数字）、攻略标题、难度、平台名

第二步：从以下平台搜索视频内容，返回3-5条：
- 哔哩哔哩 (bilibili.com) - 搜索游戏攻略/剧情/实况视频
- 抖音 (douyin.com) - 搜索游戏精彩片段
- 腾讯视频 (v.qq.com) - 搜索游戏攻略视频
每条视频必须包含：真实可访问的URL（B站用https://www.bilibili.com/video/BV开头的格式，抖音用https://www.douyin.com/video/格式）、视频标题、作者名、时长、平台名

第三步：从以下平台搜索二创内容，返回2-3条：
- 小红书 (xiaohongshu.com) - 游戏同人/Cosplay
- Pixiv (pixiv.net) - 游戏插图/同人画作
- 半次元 (bcy.net) - 游戏Cosplay

严格按以下JSON格式输出（不要markdown代码块）：
{
  "guides": [
    { "title": "...", "difficulty": "简单/中等/困难", "description": "50字内描述", "platform": "NGA/游民星空/知乎", "url": "https://..." }
  ],
  "videos": [
    { "title": "...", "author": "作者名", "duration": "15:30", "views": 120, "platform": "B站/抖音/腾讯视频", "url": "https://..." }
  ],
  "fanart": [
    { "title": "...", "author": "作者名", "type": "插画/Cosplay/壁纸", "likes": 500, "platform": "小红书/Pixiv/半次元" }
  ]
}

关键规则：
1. url必须是真实存在的链接格式，不能编造
2. B站视频URL格式：https://www.bilibili.com/video/BVxxxxxx
3. 抖音视频URL格式：https://www.douyin.com/video/xxxxxx
4. NGA攻略URL格式：https://nga.178.com/read.php?tid=数字
5. 每个平台至少生成1条内容。url可以放空字符串""，但title和description必须真实可信。不要因为缺少url就跳过某个平台`,

  companion: `你是一个专业的游戏角色推荐 AI。根据用户提供的游戏名称和性格测试答案，推荐最适合该游戏的角色和玩法。
请严格按照以下 JSON 格式返回（不要包含 markdown 代码块标记），确保是合法的 JSON：
{
  "recommendations": [
    {
      "name": "角色名/职业名",
      "role": "定位如 前排坦克/爆发输出/治疗辅助",
      "description": "为什么适合这个玩家",
      "matchScore": 匹配度数字(60-99),
      "playStyle": "开心玩法建议"
    }
  ],
  "matchedGame": "匹配到的游戏名称或null"
}
返回 2 个推荐角色。每个角色都要给出具体的开心玩法建议。`,

  portrait: `你是一个创意角色设定 AI。根据用户自定义的角色形象参数（名称、肤色、发型、发色、眼睛、嘴巴、预设职业），生成一段简短有创意的角色描述。
中文输出，100字左右，描绘这个角色的性格特征和背景故事，语气有趣生动。直接输出文本，不要 JSON。`,
};

/**
 * @route   POST /api/v1/ai/chat
 * @desc    与 SoulStation 心灵驿站 AI 进行对话
 *          支持多轮对话，根据上下文提供情感陪伴和游戏话题交流
 * @access  Public
 *
 * @param {Array<Object>} req.body.messages - 对话消息数组（必填，不能为空）
 *        每条消息包含 role（"user"/"assistant"）和 content（消息内容）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success      - 操作是否成功
 * @returns {Object}    .data         - 数据
 * @returns {string}    .data.reply   - AI 回复内容
 * @returns {string}    .message      - 提示消息
 *
 * @throws {400} 消息不能为空
 *
 * @example request body:
 *   {
 *     "messages": [
 *       { "role": "user", "content": "今天打游戏输了，好难过" }
 *     ]
 *   }
 * @example response:
 *   {
 *     "success": true,
 *     "data": { "reply": "别难过啦~ 输赢都是游戏的一部分呢！要不要分享一下你玩的是什么游戏？我可以给你一些实用的小技巧哦！" },
 *     "message": "成功"
 *   }
 *
 * @note 最多保留最近 10 条消息作为上下文，超出部分会被截断
 */
router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: '消息不能为空' });
  }

  const reply = await deepseekService.generateResponse(
    SYSTEM_PROMPTS.soul,
    messages.slice(-10), // 仅保留最近 10 条消息作为上下文窗口
    { temperature: 0.8, maxTokens: 512 },
  );

  res.json({
    success: true,
    data: { reply },
    message: '成功',
  });
}));

/**
 * @route   POST /api/v1/ai/generate
 * @desc    根据模块类型生成结构化或非结构化 AI 内容
 *          支持三种模块：
 *          - "npc"：      返回包含 guides（攻略）、videos（视频）、fanart（二创）的 JSON
 *          - "companion"：返回包含 recommendations（角色推荐）、matchedGame（匹配游戏）的 JSON
 *          - "portrait"： 返回纯文本的角色背景描述
 * @access  Public
 *
 * @param {string} req.params.module  - AI 模块名称（必填）："npc" | "companion" | "portrait"
 * @param {Object} req.body.params    - 模块参数（不同模块参数不同）
 *
 *        npc 模块参数：
 *          { "query": "游戏名称或关键词" }
 *        companion 模块参数：
 *          { "gameName": "游戏名称", "answers": ["选项1", "选项2", "选项3", "选项4"] }
 *        portrait 模块参数：
 *          { "name": "角色名称", "skinTone": "肤色", "hairStyle": "发型",
 *            "hairColor": "发色", "eyeStyle": "眼睛样式", "mouthStyle": "嘴巴样式",
 *            "selectedPreset": "预设职业" }
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success      - 操作是否成功
 * @returns {Object}    .data         - 生成结果（不同模块结构不同）
 * @returns {string}    .message      - 提示消息
 *
 * @throws {400} 无效的模块名称
 *
 * @example request body (npc 模块):
 *   { "module": "npc", "params": { "query": "原神" } }
 * @example response (npc 模块):
 *   {
 *     "success": true,
 *     "data": { "guides": [...], "videos": [...], "fanart": [...] },
 *     "message": "成功"
 *   }
 *
 * @example request body (companion 模块):
 *   { "module": "companion", "params": { "gameName": "英雄联盟", "answers": ["单人模式", "激进风格", "输出位", "困难"] } }
 * @example response (companion 模块):
 *   {
 *     "success": true,
 *     "data": { "recommendations": [...], "matchedGame": "英雄联盟" },
 *     "message": "成功"
 *   }
 *
 * @example request body (portrait 模块):
 *   { "module": "portrait", "params": { "name": "暗影行者", "skinTone": " pale", "selectedPreset": "刺客" } }
 * @example response (portrait 模块):
 *   {
 *     "success": true,
 *     "data": { "description": "暗影行者...一段背景故事..." },
 *     "message": "成功"
 *   }
 */
router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  const { module, params } = req.body;

  // 验证模块名称是否有效
  if (!module || !['portrait', 'npc', 'companion'].includes(module)) {
    return res.status(400).json({ success: false, error: '无效的模块名称' });
  }

  let systemPrompt: string;
  let userMessage: string;
  let temperature = 0.8;
  let maxTokens = 1024;
  let responseFormat: 'text' | 'json_object' = 'text';

  switch (module) {
    case 'npc': {
      const keyword = params?.query || '热门游戏';
      // 并行：B站真实搜索 + AI生成攻略/二创
      const [biliVideos, aiData] = await Promise.all([
        searchBilibili(keyword).catch(() => []),
        deepseekService.generateResponse(SYSTEM_PROMPTS.npc, [
          { role: 'user', content: `搜索游戏攻略和二创内容（不要生成视频，视频从B站API获取）：${keyword}` }
        ], { temperature: 0.7, maxTokens: 2048, responseFormat: 'json_object' }),
      ]);
      try {
        const parsed = JSON.parse(aiData);
        parsed.videos = biliVideos.length > 0 ? biliVideos : (parsed.videos || []);
        return res.json({ success: true, data: parsed, message: '成功' });
      } catch {
        return res.json({ success: true, data: { guides: [], videos: biliVideos, fanart: [] }, message: '成功' });
      }
    }
    case 'companion': {
      // 角色推荐模块：根据性格测试推荐最合适的游戏角色和玩法
      systemPrompt = SYSTEM_PROMPTS.companion;
      const answers = params?.answers || [];
      const gameName = params?.gameName || '热门游戏';
      userMessage = `游戏名称：${gameName}\n性格测试答案：\n1. 玩法偏好：${answers[0] || '未选择'}\n2. 游戏风格：${answers[1] || '未选择'}\n3. 团队角色：${answers[2] || '未选择'}\n4. 难度偏好：${answers[3] || '未选择'}\n\n请根据以上信息推荐最适合的角色和玩法。`;
      responseFormat = 'json_object';
      temperature = 0.7;
      maxTokens = 2048;
      break;
    }
    case 'portrait': {
      // 角色设定模块：根据自定义参数生成角色背景故事
      systemPrompt = SYSTEM_PROMPTS.portrait;
      userMessage = `角色名称：${params?.name || '未命名'}\n肤色：${params?.skinTone || '默认'}\n发型：${params?.hairStyle || '默认'}\n发色：${params?.hairColor || '默认'}\n眼睛样式：${params?.eyeStyle || '默认'}\n嘴巴样式：${params?.mouthStyle || '默认'}\n预设职业：${params?.selectedPreset || '无'}\n\n请为这个角色创作一段背景描述。`;
      temperature = 0.9;
      maxTokens = 512;
      break;
    }
    default: {
      return res.status(400).json({ success: false, error: '未知模块' });
    }
  }

  const rawReply = await deepseekService.generateResponse(
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    { temperature, maxTokens, responseFormat },
  );

  // 对需要 JSON 输出格式的模块进行解析处理
  if (responseFormat === 'json_object') {
    try {
      // 尝试从响应中提取 JSON（处理模型可能在 markdown 中包装 JSON 的情况）
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawReply;
      const parsed = JSON.parse(jsonStr);

      if (module === 'npc') {
        return res.json({
          success: true,
          data: {
            guides: parsed.guides || [],
            videos: parsed.videos || [],
            fanart: parsed.fanart || [],
          },
          message: '成功',
        });
      }

      if (module === 'companion') {
        return res.json({
          success: true,
          data: {
            recommendations: parsed.recommendations || [],
            matchedGame: parsed.matchedGame || params?.gameName || null,
          },
          message: '成功',
        });
      }
    } catch (e) {
      // JSON 解析失败时的降级处理：返回原始文本
      return res.json({
        success: true,
        data: { text: rawReply },
        message: '成功',
      });
    }
  }

  // portrait 模块返回纯文本描述
  res.json({
    success: true,
    data: { description: rawReply },
    message: '成功',
  });
}));

/**
 * @route   POST /api/v1/ai/image-to-3d
 * @desc    提交图片 URL 到 Meshy 服务，生成 3D 模型
 *          提交后返回一个任务 ID，用于后续查询生成进度
 * @access  Public
 *
 * @param {string} req.body.imageUrl - 输入图片的 URL 地址（必填）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success       - 操作是否成功
 * @returns {Object}    .data          - 数据
 * @returns {string}    .data.taskId   - 3D 生成任务 ID（用于查询进度）
 * @returns {string}    .message       - 提示消息
 *
 * @throws {400} 图片 URL 不能为空
 * @throws {503} 3D 生成服务未配置（MESHY_API_KEY 未设置）
 * @throws {502} 3D 服务调用失败
 *
 * @example request body:
 *   { "imageUrl": "https://example.com/character.png" }
 * @example response:
 *   {
 *     "success": true,
 *     "data": { "taskId": "meshy-task-xxxx" },
 *     "message": "任务已提交"
 *   }
 */
router.post('/image-to-3d', asyncHandler(async (req: Request, res: Response) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ success: false, error: '请提供图片 URL' });
  }

  try {
    // 检查 Meshy 服务是否已配置
    if (!isMeshyEnabled()) {
      return res.status(503).json({ success: false, error: '3D 生成服务未配置（请设置 MESHY_API_KEY）' });
    }
    const { taskId } = await submitImageTo3D(imageUrl);
    res.json({
      success: true,
      data: { taskId },
      message: '任务已提交',
    });
  } catch (error: any) {
    res.status(502).json({
      success: false,
      error: `3D 生成服务调用失败: ${error.message}`,
    });
  }
}));

/**
 * @route   GET /api/v1/ai/image-to-3d/:taskId
 * @desc    查询图片转 3D 模型的生成任务状态
 *          可用于轮询检查任务是否完成，完成后获取模型下载 URL
 * @access  Public
 *
 * @param {string} req.params.taskId - 3D 生成任务 ID（在提交时返回）
 *
 * @returns {Object}     响应体
 * @returns {boolean}    .success                - 操作是否成功
 * @returns {Object}     .data                   - 数据
 * @returns {string}     .data.taskId            - 任务 ID
 * @returns {string}     .data.status            - 任务状态（如 "pending", "processing", "succeeded", "failed"）
 * @returns {number}     .data.progress          - 进度百分比（0-100）
 * @returns {string[]}   .data.modelUrls         - 生成的 3D 模型文件 URL 列表（完成后才有）
 * @returns {string}     .data.errorMessage      - 错误信息（失败时）
 * @returns {string}     .message                - 提示消息
 *
 * @throws {502} 查询任务状态失败
 *
 * @example request:  GET /api/v1/ai/image-to-3d/meshy-task-xxxx
 * @example response（处理中）:
 *   {
 *     "success": true,
 *     "data": { "taskId": "meshy-task-xxxx", "status": "processing", "progress": 45, "modelUrls": null, "errorMessage": null },
 *     "message": "成功"
 *   }
 * @example response（完成）:
 *   {
 *     "success": true,
 *     "data": { "taskId": "meshy-task-xxxx", "status": "succeeded", "progress": 100, "modelUrls": ["https://...glb"], "errorMessage": null },
 *     "message": "成功"
 *   }
 */
router.get('/image-to-3d/:taskId', asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;

  try {
    const task = await queryTaskStatus(taskId);
    res.json({
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        progress: task.progress || 0,
        modelUrls: task.model_urls || null,
        errorMessage: task.error_message || null,
      },
      message: '成功',
    });
  } catch (error: any) {
    res.status(502).json({
      success: false,
      error: `查询任务状态失败: ${error.message}`,
    });
  }
}));

// 图片代理（解决B站等平台防盗链）
router.get('/proxy-image', asyncHandler(async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'Referer': 'https://www.bilibili.com', 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    const ct = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(response.data));
  } catch { res.status(404).end(); }
}));

// ====== AI 历史记录 ======
router.get('/history', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;
  let sql = 'SELECT id, type, title, created_at FROM ai_history WHERE user_id=?';
  if (type) sql += ' AND type=?';
  sql += ' ORDER BY updated_at DESC LIMIT 50';
  const params: any[] = [req.user!.id];
  if (type) params.push(type);
  const rows = await query(sql, params);
  res.json({ success: true, data: rows });
}));

router.get('/history/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const rows = await query('SELECT * FROM ai_history WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
  if (!rows.length) return res.json({ success: false, error: '未找到' });
  const r = rows[0] as any;
  res.json({ success: true, data: { ...r, content: JSON.parse(r.content || '[]') } });
}));

router.post('/history', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { type, title, content } = req.body;
  const r = await execute(
    'INSERT INTO ai_history (user_id, type, title, content, updated_at) VALUES (?,?,?,?,?)',
    [req.user!.id, type, title || '', JSON.stringify(content), new Date().toISOString()]
  );
  res.json({ success: true, data: { id: String(r.lastInsertRowid) } });
}));

router.put('/history/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { title, content } = req.body;
  await execute(
    'UPDATE ai_history SET title=?, content=?, updated_at=? WHERE id=? AND user_id=?',
    [title || '', JSON.stringify(content), new Date().toISOString(), req.params.id, req.user!.id]
  );
  res.json({ success: true });
}));

router.delete('/history/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  await execute('DELETE FROM ai_history WHERE id=? AND user_id=?', [req.params.id, req.user!.id]);
  res.json({ success: true });
}));

export default router;
