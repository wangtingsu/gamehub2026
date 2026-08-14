/**
 * 管理员认证中间件模块
 *
 * 提供管理员专用的 JWT 令牌验证中间件，与前端用户认证体系完全独立。
 * 管理员使用独立的 JWT 密钥进行令牌签名和验证，确保前后端用户权限分离。
 *
 * @module middlewares/admin-auth.middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

/**
 * 管理员 JWT 认证中间件
 *
 * 从请求头的 Authorization 字段中提取 Bearer token，
 * 使用管理员的独立 JWT 密钥验证令牌有效性。
 * 验证通过后，将管理员信息附加到 req.user 对象上，其中 isAdmin 标记为 true。
 *
 * @param req  - Express 请求对象，需包含 Authorization 请求头
 * @param res  - Express 响应对象，验证失败时返回 401/500 状态码
 * @param next - Express 下一个中间件函数
 * @returns 验证通过调用 next()，失败则返回 JSON 错误响应
 *
 * @throws 捕获 jwt.JsonWebTokenError 返回 401（无效令牌）
 * @throws 捕获 jwt.TokenExpiredError 返回 401（令牌过期）
 * @throws 其他未知错误返回 500（服务器内部错误）
 */
export const adminAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供管理员认证令牌',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.admin.jwtSecret) as {
      id: string;
      username: string;
      role: string;
    };

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      isAdmin: true,
    };

    return next();
  } catch (error) {
    // TokenExpiredError 继承自 JsonWebTokenError，必须先判断"过期"，
    // 否则会被 JsonWebTokenError 分支误报为"无效的管理员认证令牌"。
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: '管理员认证令牌已过期，请重新登录',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: '无效的管理员认证令牌',
      });
    }

    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
    });
  }
};

export default { adminAuthenticate };
