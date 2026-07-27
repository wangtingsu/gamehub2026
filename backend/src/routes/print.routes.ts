/**
 * 3D 打印路由模块
 *
 * 本模块提供 3D 打印相关的 REST API，包括：
 * - 提交 3D 打印订单（STL 模型数据、尺寸、材质、颜色、数量）
 * - 查询打印订单状态
 *
 * 注意：当前订单数据存储在内存中（In-memory），生产环境中应替换为数据库持久化存储
 *
 * @module routes/print
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';

const router = Router();

/**
 * 内存中的订单存储数组
 * 生产环境中应使用数据库替代
 *
 * @template Order
 * @property {string} id - 唯一订单标识，格式：print_时间戳_随机字符串
 * @property {string} modelData - 模型数据（base64 编码的 STL 文件）
 * @property {number} size - 打印尺寸，单位 mm（范围：10-500）
 * @property {string} material - 打印材质（如 pla、abs、resin 等）
 * @property {string} color - 颜色值（十六进制，如 #ffffff）
 * @property {number} quantity - 打印数量
 * @property {string} status - 订单状态（pending: 待处理）
 * @property {string} createdAt - 订单创建时间（ISO 8601 格式）
 */
const orders: Array<{
  id: string;
  modelData: string; // base64 encoded STL
  size: number;
  material: string;
  color: string;
  quantity: number;
  status: string;
  createdAt: string;
}> = [];

/**
 * @route POST /api/v1/print/order
 * @desc 提交 3D 打印订单
 * @access Public
 *
 * @param req.body.modelData - 模型数据（base64 编码的 STL 文件），必填
 * @param req.body.size - 打印尺寸，单位 mm，默认 100，范围 10-500
 * @param req.body.material - 打印材质，默认 'pla'
 * @param req.body.color - 颜色值，默认 '#ffffff'
 * @param req.body.quantity - 打印数量，默认 1
 *
 * @returns 201 - 订单创建成功，返回订单 ID、状态和创建时间
 * @returns 400 - 参数验证失败（缺少模型数据或尺寸超出范围）
 *
 * 验证规则：
 * - modelData 不能为空
 * - size 必须在 10-500mm 之间
 * - modelData 超过 50000 字符时会被截断以避免请求体过大
 */
router.post('/order', asyncHandler(async (req: Request, res: Response) => {
  const {
    modelData, // base64 encoded STL
    size = 100, // mm
    material = 'pla',
    color = '#ffffff',
    quantity = 1,
  } = req.body;

  if (!modelData) {
    return res.status(400).json({ success: false, error: '请提供模型数据' });
  }

  if (size < 10 || size > 500) {
    return res.status(400).json({ success: false, error: '尺寸必须在 10-500mm 之间' });
  }

  const order = {
    id: `print_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    modelData: modelData.slice(0, 50000), // Truncate very large payloads
    size,
    material,
    color,
    quantity,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);

  res.json({
    success: true,
    data: {
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt,
    },
    message: '打印订单已提交',
  });
}));

/**
 * @route GET /api/v1/print/order/:id
 * @desc 查询打印订单状态
 * @access Public
 *
 * @param req.params.id - 订单唯一标识
 *
 * @returns 200 - 订单信息获取成功
 * @returns 404 - 订单未找到
 *
 * 根据订单 ID 在内存存储中查找订单记录，返回订单的详细信息
 */
router.get('/order/:id', asyncHandler(async (req: Request, res: Response) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: '订单未找到' });
  }
  res.json({
    success: true,
    data: {
      id: order.id,
      size: order.size,
      material: order.material,
      color: order.color,
      quantity: order.quantity,
      status: order.status,
      createdAt: order.createdAt,
    },
    message: '成功',
  });
}));

export default router;
