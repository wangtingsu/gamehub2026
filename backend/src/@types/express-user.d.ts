/**
 * Express 用户类型扩展声明
 *
 * 本文件用于扩展 Express 框架的 Request 对象类型定义，
 * 将 Passport.js 认证后的用户信息注入到 Express.Request 中，
 * 使得在 TypeScript 项目中可以安全地访问 req.user 及其属性。
 *
 * @module @types/express-user
 */

import 'express';

declare global {
  namespace Express {
    /**
     * 认证用户接口
     *
     * 定义由 Passport.js 反序列化后挂载到 req.user 上的用户对象结构。
     * 所有字段均使用 `any` 类型以保持灵活性，实际类型由业务层验证。
     * 该接口会通过 TypeScript 声明合并覆盖 Passport 的默认类型定义。
     *
     * @interface User
     * @property {any} id - 用户唯一标识（数字 ID 或字符串 UUID）
     * @property {any} username - 用户名
     * @property {any} role - 用户角色（如 "admin"、"user"、"moderator"）
     * @property {any} [displayName] - 用户显示名称
     * @property {any} [email] - 用户邮箱地址
     * @property {any} [avatar] - 用户头像 URL
     * @property {any} [nickname] - 用户昵称
     * @property {any} [key: string] - 其他扩展属性
     */
    interface User {
      /** 用户唯一标识 */
      id: any;
      /** 用户名 */
      username: any;
      /** 用户角色 */
      role: any;
      /** 用户显示名称 */
      displayName?: any;
      /** 用户邮箱地址 */
      email?: any;
      /** 用户头像 URL */
      avatar?: any;
      /** 用户昵称 */
      nickname?: any;
      /** 其他扩展属性 */
      [key: string]: any;
    }

    /**
     * Express 请求对象扩展
     *
     * 在 Express.Request 上注入额外的属性，
     * 用于认证中间件传递解析后的令牌信息。
     *
     * @interface Request
     * @property {string} [token] - 从请求头中解析出的 JWT 令牌字符串
     */
    interface Request {
      /** 从 Authorization 请求头中解析出的 JWT 令牌 */
      token?: string;
    }
  }
}

export {};
