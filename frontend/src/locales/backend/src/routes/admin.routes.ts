import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import adminService from '../services/admin.service';

const router = Router();

/**
 * @route GET /api/v1/admin/stats
 * @desc 获取管理统计信息
 * @access Private/Admin
 */
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await adminService.getAdminStats();

    res.json({
      success: true,
      data: stats,
      message: '管理统计信息获取成功',
    });
  })
);

export default router;