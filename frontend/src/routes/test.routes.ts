import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { captureError, captureMessage } from '../monitoring/sentry';

const router = Router();

/**
 * @route GET /api/v1/test/sentry
 * @description 测试Sentry错误上报
 */
router.get(
  '/sentry',
  asyncHandler(async (req, res) => {
    // 测试Sentry消息捕获
    captureMessage('测试Sentry消息', 'info', {
      endpoint: '/api/v1/test/sentry',
      method: req.method,
      query: req.query,
    });

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: 'Sentry测试端点',
      sentryEnabled: true,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route GET /api/v1/test/error
 * @description 测试Sentry错误捕获
 */
router.get(
  '/error',
  asyncHandler(async (req, res) => {
    // 故意抛出一个错误
    const error = new Error('这是一个测试错误，用于验证Sentry错误上报');
    (error as any).statusCode = 500;
    (error as any).testData = {
      endpoint: '/api/v1/test/error',
      query: req.query,
      timestamp: new Date().toISOString(),
    };

    // 捕获错误到Sentry
    captureError(error, {
      endpoint: '/api/v1/test/error',
      method: req.method,
      query: req.query,
      userId: req.user?.id || 'anonymous',
    });

    // 返回错误响应
    res.status(500).json({
      success: false,
      error: error.message,
      testData: (error as any).testData,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route GET /api/v1/test/uncaught
 * @description 测试未捕获异常
 */
router.get(
  '/uncaught',
  asyncHandler(async () => {
    // 故意抛出一个未捕获的异常
    throw new Error('这是一个未捕获的测试异常，用于验证Sentry异常上报');
  })
);

/**
 * @route GET /api/v1/test/validation
 * @description 测试验证错误
 */
router.get(
  '/validation',
  asyncHandler(async (req, res) => {
    // 模拟验证错误
    const validationError = new Error('数据验证失败');
    validationError.name = 'ValidationError';
    (validationError as any).details = [
      { field: 'email', message: '邮箱格式不正确' },
      { field: 'password', message: '密码长度至少8位' },
    ];

    throw validationError;
  })
);

export default router;