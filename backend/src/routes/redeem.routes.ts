import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { query, execute } from '../db';

const router = Router();

/**
 * GET /api/redeem/codes
 * 获取所有可用的兑换码（公开接口，按热度/时间排序）
 */
router.get('/codes', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const data = await query(
    `SELECT id, code, title, description, game_name, reward_type, reward_value,
            min_order_amount, usage_limit, used_count, starts_at, expires_at, created_at
     FROM redeem_codes
     WHERE is_active = 1
       AND (starts_at IS NULL OR starts_at <= ?)
       AND (expires_at IS NULL OR expires_at > ?)
       AND (usage_limit = 0 OR used_count < usage_limit)
     ORDER BY created_at DESC
     LIMIT 10`,
    [now, now]
  );
  res.json({ success: true, data });
}));

/**
 * GET /api/redeem/codes/:code
 * 查询单个兑换码是否有效
 */
router.get('/codes/:code', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const now = new Date().toISOString();
  const rows: any = await query(
    `SELECT id, code, title, description, game_name, reward_type, reward_value,
            min_order_amount, usage_limit, used_count, starts_at, expires_at
     FROM redeem_codes
     WHERE code = ? AND is_active = 1
       AND (starts_at IS NULL OR starts_at <= ?)
       AND (expires_at IS NULL OR expires_at > ?)
       AND (usage_limit = 0 OR used_count < usage_limit)`,
    [code.toUpperCase(), now, now]
  );
  if (!rows.length) {
    return res.status(404).json({ success: false, message: '兑换码无效或已过期' });
  }
  res.json({ success: true, data: rows[0] });
}));

/**
 * POST /api/redeem/redeem
 * 用户兑换（需要登录）
 */
router.post('/redeem', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;
  const userId = (req as any).user?.id;

  if (!code) {
    return res.status(400).json({ success: false, message: '请输入兑换码' });
  }

  const now = new Date().toISOString();
  const rows: any = await query(
    `SELECT id, code, title, reward_type, reward_value, usage_limit, used_count
     FROM redeem_codes
     WHERE code = ? AND is_active = 1
       AND (starts_at IS NULL OR starts_at <= ?)
       AND (expires_at IS NULL OR expires_at > ?)`,
    [code.toUpperCase(), now, now]
  );

  if (!rows.length) {
    return res.status(404).json({ success: false, message: '兑换码无效或已过期' });
  }

  const redeemCode = rows[0];

  // 检查使用次数
  if (redeemCode.usage_limit > 0 && redeemCode.used_count >= redeemCode.usage_limit) {
    return res.status(400).json({ success: false, message: '兑换码已用完' });
  }

  // 检查用户是否已兑换过
  const existing: any = await query(
    'SELECT id FROM redeem_logs WHERE code_id = ? AND user_id = ?',
    [redeemCode.id, userId]
  );
  if (existing.length > 0) {
    return res.status(400).json({ success: false, message: '你已经兑换过该兑换码' });
  }

  // 记录兑换
  await execute(
    'INSERT INTO redeem_logs (code_id, user_id, ip_address) VALUES (?, ?, ?)',
    [redeemCode.id, userId, req.ip || '']
  );

  // 增加使用计数
  await execute('UPDATE redeem_codes SET used_count = used_count + 1 WHERE id = ?', [redeemCode.id]);

  res.json({
    success: true,
    data: {
      code: redeemCode.code,
      title: redeemCode.title,
      reward_type: redeemCode.reward_type,
      reward_value: redeemCode.reward_value,
    },
    message: '兑换成功！',
  });
}));

/**
 * GET /api/redeem/my
 * 获取当前用户的兑换记录
 */
router.get('/my', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const data = await query(
    `SELECT rl.id, rl.redeemed_at, rc.code, rc.title, rc.reward_type, rc.reward_value, rc.game_name
     FROM redeem_logs rl
     INNER JOIN redeem_codes rc ON rc.id = rl.code_id
     WHERE rl.user_id = ?
     ORDER BY rl.redeemed_at DESC
     LIMIT 20`,
    [userId]
  );
  res.json({ success: true, data });
}));

export default router;
