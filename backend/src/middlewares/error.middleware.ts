/**
 * 错误处理中间件模块
 *
 * 提供统一的错误处理体系，包括：
 * - 自定义错误类层次结构（ApiError 及其子类）
 * - 全局错误处理中间件（区分服务端/客户端错误，不同日志级别）
 * - 404 路由未匹配处理
 * - 异步错误包装器
 * - 未捕获异常/未处理 Promise 拒绝的全局处理器
 * - 数据库错误转换工具
 *
 * 所有错误都会记录日志，服务端错误（>=500）会上报 Sentry。
 *
 * @module middlewares/error.middleware
 */

import { Request, Response, NextFunction } from 'express';
import config from '../config';
import logger from '../utils/logger';
import { captureError } from '../monitoring/sentry';

/**
 * 自定义 API 错误基类
 *
 * 扩展自 Error，添加 statusCode（HTTP 状态码）和 isOperational（是否可预期）字段。
 * 可预期的操作错误（如验证失败）不会触发进程退出，
 * 不可预期的编程错误应当由全局异常处理器处理。
 */
export class ApiError extends Error {
  /** HTTP 状态码 */
  statusCode: number;
  /** 是否为可预期的操作错误（true=可预期，false=编程错误） */
  isOperational: boolean;

  /**
   * @param statusCode    - HTTP 响应状态码
   * @param message       - 错误描述信息
   * @param isOperational - 是否为可预期的操作错误，默认 true
   */
  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // 确保正确的原型链
    Object.setPrototypeOf(this, ApiError.prototype);

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 请求数据验证错误（400 Bad Request）
 * 包含详细的字段验证错误信息
 */
export class ValidationError extends ApiError {
  /** 字段级验证错误详情数组 */
  details: any[];

  /**
   * @param message - 错误描述，默认 "数据验证失败"
   * @param details - 字段级错误详情列表
   */
  constructor(message: string, details: any[] = []) {
    super(400, message);
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 认证失败错误（401 Unauthorized）
 * 用户未登录或令牌无效时使用
 */
export class AuthenticationError extends ApiError {
  /**
   * @param message - 错误描述，默认 "认证失败"
   */
  constructor(message = '认证失败') {
    super(401, message);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 权限不足错误（403 Forbidden）
 * 用户已登录但权限不足以访问资源时使用
 */
export class AuthorizationError extends ApiError {
  /**
   * @param message - 错误描述，默认 "权限不足"
   */
  constructor(message = '权限不足') {
    super(403, message);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * 资源未找到错误（404 Not Found）
 * 请求的资源不存在时使用
 */
export class NotFoundError extends ApiError {
  /**
   * @param message - 错误描述，默认 "资源未找到"
   */
  constructor(message = '资源未找到') {
    super(404, message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 资源冲突错误（409 Conflict）
 * 创建资源时发生唯一约束冲突等情况时使用
 */
export class ConflictError extends ApiError {
  /**
   * @param message - 错误描述，默认 "资源冲突"
   */
  constructor(message = '资源冲突') {
    super(409, message);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 错误请求错误（400 Bad Request）
 * 请求格式或内容不合法时使用
 */
export class BadRequestError extends ApiError {
  /**
   * @param message - 错误描述，默认 "错误的请求"
   */
  constructor(message = '错误的请求') {
    super(400, message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 服务器内部错误（500 Internal Server Error）
 * 服务端未预期的错误时使用
 */
export class InternalServerError extends ApiError {
  /**
   * @param message - 错误描述，默认 "服务器内部错误"
   */
  constructor(message = '服务器内部错误') {
    super(500, message);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 请求过多错误（429 Too Many Requests）
 * 触发速率限制时使用
 */
export class TooManyRequestsError extends ApiError {
  /**
   * @param message - 错误描述，默认 "请求过于频繁，请稍后重试"
   */
  constructor(message = '请求过于频繁，请稍后重试') {
    super(429, message);
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

/**
 * 404 路由未匹配处理中间件
 *
 * 当所有路由都不匹配当前请求路径时，创建一个 NotFoundError 并传递给
 * 下一个错误处理中间件。使用 next(error) 而不是直接返回响应，
 * 以便统一由 errorHandler 处理。
 *
 * @param req  - Express 请求对象
 * @param _res - Express 响应对象（未使用）
 * @param next - Express 下一个中间件函数
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new NotFoundError(`路径 ${req.originalUrl} 未找到`);
  next(error);
};

/**
 * 全局错误处理中间件
 *
 * 所有错误的统一出口，根据错误类型和状态码：
 * - 区分服务端错误（>=500）和客户端错误（<500），使用不同日志级别
 * - 服务端错误上报 Sentry（生产环境隐藏堆栈信息）
 - 客户端错误中的 401/403/429 也上报 Sentry
 * - 返回统一的 JSON 错误响应格式 { success: false, error, details?, stack? }
 *
 * @param error  - 捕获到的错误对象（可能是 ApiError 或普通 Error）
 * @param req    - Express 请求对象
 * @param res    - Express 响应对象
 * @param _next  - Express 下一个中间件函数（未使用）
 */
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 设置默认值
  let statusCode = 500;
  let message = '服务器内部错误';
  let details: any[] | undefined;
  let stack: string | undefined;

  // 处理自定义API错误
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;

    if (error instanceof ValidationError) {
      details = error.details;
    }
  }

  // 处理JWT错误
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的令牌';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '令牌已过期';
  }

  // 记录错误
  if (statusCode >= 500) {
    logger.error('服务器错误:', {
      message: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });

    // 捕获到Sentry（服务器错误）
    captureError(error, {
      statusCode,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    });

    // 生产环境不暴露堆栈信息
    if (config.nodeEnv === 'development') {
      stack = error.stack;
    }
  } else {
    logger.warn('客户端错误:', {
      statusCode,
      message: error.message,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id,
    });

    // 捕获到Sentry（客户端错误，仅限重要错误）
    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
      captureError(error, {
        statusCode,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id,
      });
    }
  }

  // 构建响应
  const response: any = {
    success: false,
    error: message,
  };

  if (details && details.length > 0) {
    response.details = details;
  }

  if (config.nodeEnv === 'development' && stack) {
    response.stack = stack;
  }

  // 发送响应
  res.status(statusCode).json(response);
};

/**
 * 异步错误包装器
 *
 * 用于包装 async 路由处理函数，自动捕获 Promise 中的未处理错误
 * 并传递给 Express 的 errorHandler 中间件，避免每个路由重复编写 try-catch。
 *
 * @param fn - 异步路由处理函数
 * @returns 包装后的 Express 中间件函数
 *
 * @example
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users);
 * }));
 * ```
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 未处理的 Promise 拒绝全局处理器
 *
 * 监听 process.on('unhandledRejection') 事件，记录日志并上报 Sentry。
 * 在生产环境中记录告警日志，建议服务重启以恢复干净状态。
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的Promise拒绝:', { reason, promise });

    // 捕获到Sentry
    const error = reason instanceof Error ? reason : new Error(`Unhandled Rejection: ${reason}`);
    captureError(error, { promise: String(promise) });

    // 在生产环境中，可能需要重启服务
    if (config.nodeEnv === 'production') {
      // 可以在这里添加重启逻辑
      logger.error('由于未处理的Promise拒绝，建议重启服务');
    }
  });
};

/**
 * 未捕获的异常全局处理器
 *
 * 监听 process.on('uncaughtException') 事件，记录日志并上报 Sentry。
 * 在生产环境中建议优雅关闭服务（process.exit(1)）以防止进入不一致状态。
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('未捕获的异常:', error);

    // 捕获到Sentry
    captureError(error, { type: 'uncaughtException' });

    // 在生产环境中，可能需要优雅关闭
    if (config.nodeEnv === 'production') {
      // 可以在这里添加优雅关闭逻辑
      logger.error('由于未捕获的异常，建议重启服务');
      process.exit(1);
    }
  });
};

/**
 * 请求验证错误处理工具函数
 *
 * 将 Mongoose/Joi 等验证库的 ValidationError 转换为应用统一的 ValidationError 实例，
 * 提取字段级别的错误详情以便前端展示。
 *
 * @param error - 原始错误对象（通常来自验证库）
 * @returns 转换后的 ValidationError 实例，或原错误对象（非验证错误时）
 */
export const handleValidationError = (error: any) => {
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
    }));

    return new ValidationError('数据验证失败', details);
  }

  return error;
};

/**
 * 数据库错误处理工具函数
 *
 * 将常见的 PostgreSQL 错误码转换为对应的应用错误：
 * - 23505（唯一约束违反）-> ConflictError
 * - 23503（外键约束违反）-> ValidationError
 * - 23502（非空约束违反）-> ValidationError
 *
 * @param error - 原始数据库错误对象
 * @returns 转换后的 ApiError 实例，或原错误对象（无法识别的错误码时）
 */
export const handleDatabaseError = (error: any) => {
  if (error.code === '23505') { // 唯一约束违反
    const match = error.detail?.match(/Key \((.*?)\)=\((.*?)\)/);
    const field = match ? match[1] : 'unknown';

    return new ConflictError(`${field} 已存在`);
  }

  if (error.code === '23503') { // 外键约束违反
    return new ValidationError('关联数据不存在');
  }

  if (error.code === '23502') { // 非空约束违反
    return new ValidationError('必填字段不能为空');
  }

  return error;
};

export default {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  InternalServerError,
  TooManyRequestsError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  handleValidationError,
  handleDatabaseError,
};
