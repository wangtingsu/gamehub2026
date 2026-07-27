import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import spaceService from '../services/blog-spaces.service';

const router = Router();

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const spaces = await spaceService.getSpaces();
  res.json({ success: true, data: spaces, message: '空间列表获取成功' });
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const space = await spaceService.createSpace(req.body);
  res.status(201).json({ success: true, data: space, message: '空间创建成功' });
}));

router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  await spaceService.updateSpace(req.params.id, req.body);
  res.json({ success: true, message: '空间更新成功' });
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  await spaceService.deleteSpace(req.params.id);
  res.json({ success: true, message: '空间删除成功' });
}));

export default router;
