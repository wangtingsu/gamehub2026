/**
 * ============================================================
 * BaseController - 基础控制器类
 * ============================================================
 *
 * 本文件定义了所有控制器的抽象基类 BaseController，提供了一系列标准化的
 * HTTP 响应方法和工具函数，用于统一 API 响应格式、简化错误处理流程、
 * 以及提供分页、验证、文件下载等通用功能。
 *
 * 所有业务控制器（如 UserController、GameController 等）都应继承此类，
 * 以确保整个应用程序的 API 响应风格保持一致。
 *
 * @module controllers/BaseController
 */

import { Response } from 'express';
import { ApiResponse, PaginationParams } from '../types';
import logger from '../utils/logger';

/**
 * 基础控制器抽象类
 *
 * 提供标准化的 API 响应方法和通用工具函数。继承此类可以获得：
 * - 统一的成功/错误响应格式（sendSuccess / sendError 系列方法）
 * - 分页查询支持（calculatePagination / sendPaginated）
 * - 异步操作包装（handleAsync 统一错误处理）
 * - 请求数据验证（validateRequest）
 * - 文件下载支持（sendFile / sendJsonFile）
 *
 * @abstract
 * @example
 * ```typescript
 * class UserController extends BaseController {
 *   async getUsers(req: Request, res: Response) {
 *     const users = await userService.findAll();
 *     return this.sendSuccess(res, users);
 *   }
 * }
 * ```
 */
export abstract class BaseController {
  /**
   * 发送成功响应
   *
   * 封装备标准成功 JSON 响应，包含 success、data 和 message 字段。
   * 可根据需要自定义 HTTP 状态码（默认 200）。
   *
   * @template T - 响应数据类型
   * @param res - Express Response 对象
   * @param data - 返回给客户端的数据（可选）
   * @param message - 成功消息文本，默认 "操作成功"
   * @param statusCode - HTTP 状态码，默认 200
   * @returns Express Response 对象，支持链式调用
   */
  protected sendSuccess<T = any>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message: message || '操作成功',
    };

    return res.status(statusCode).json(response);
  }

  /**
   * 发送创建成功响应（HTTP 201）
   *
   * 适用于 POST 资源创建成功后的响应，状态码固定为 201 Created。
   *
   * @template T - 响应数据类型
   * @param res - Express Response 对象
   * @param data - 新创建的资源数据（可选）
   * @param message - 成功消息文本，默认 "创建成功"
   * @returns Express Response 对象
   */
  protected sendCreated<T = any>(
    res: Response,
    data?: T,
    message?: string
  ): Response {
    return this.sendSuccess(res, data, message || '创建成功', 201);
  }

  /**
   * 发送空内容成功响应（HTTP 204）
   *
   * 适用于删除操作或无需返回体内容的成功操作。
   * 不包含响应体，状态码固定为 204 No Content。
   *
   * @param res - Express Response 对象
   * @returns Express Response 对象
   */
  protected sendNoContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * 发送错误响应
   *
   * 封装标准错误 JSON 响应，根据状态码自动记录日志：
   * - 5xx 服务器错误：使用 logger.error 记录错误堆栈
   * - 4xx 客户端错误：使用 logger.warn 记录警告信息
   *
   * @param res - Express Response 对象
   * @param error - 错误信息，可以是字符串或 Error 对象
   * @param statusCode - HTTP 状态码，默认 500 内部服务器错误
   * @param details - 可选的错误详细信息，附加到响应体中
   * @returns Express Response 对象
   */
  protected sendError(
    res: Response,
    error: string | Error,
    statusCode: number = 500,
    details?: any
  ): Response {
    const errorMessage = typeof error === 'string' ? error : error.message;

    const response: ApiResponse = {
      success: false,
      error: errorMessage,
      message: errorMessage,
    };

    // 附加详细信息（如果提供），用于返回验证错误详情等场景
    if (details) {
      (response as any).details = details;
    }

    // 根据状态码区分日志级别：服务器错误记录 error，客户端错误记录 warn
    if (statusCode >= 500) {
      logger.error(`服务器错误: ${errorMessage}`, {
        statusCode,
        details,
        stack: typeof error !== 'string' ? error.stack : undefined,
      });
    } else {
      logger.warn(`客户端错误: ${errorMessage}`, {
        statusCode,
        details,
      });
    }

    return res.status(statusCode).json(response);
  }

  /**
   * 发送验证错误响应（HTTP 400）
   *
   * 快速发送 400 Bad Request 响应，适用于请求参数校验失败场景。
   *
   * @param res - Express Response 对象
   * @param message - 错误消息，默认 "验证失败"
   * @param details - 验证错误详情数组，可包含每个字段的具体错误信息
   * @returns Express Response 对象
   */
  protected sendValidationError(
    res: Response,
    message: string = '验证失败',
    details?: any[]
  ): Response {
    return this.sendError(res, message, 400, details);
  }

  /**
   * 发送认证错误响应（HTTP 401）
   *
   * 快速发送 401 Unauthorized 响应，适用于未登录或 token 无效场景。
   *
   * @param res - Express Response 对象
   * @param message - 错误消息，默认 "认证失败"
   * @returns Express Response 对象
   */
  protected sendAuthenticationError(
    res: Response,
    message: string = '认证失败'
  ): Response {
    return this.sendError(res, message, 401);
  }

  /**
   * 发送授权错误响应（HTTP 403）
   *
   * 快速发送 403 Forbidden 响应，适用于已登录但无权限访问的场景。
   *
   * @param res - Express Response 对象
   * @param message - 错误消息，默认 "权限不足"
   * @returns Express Response 对象
   */
  protected sendAuthorizationError(
    res: Response,
    message: string = '权限不足'
  ): Response {
    return this.sendError(res, message, 403);
  }

  /**
   * 发送未找到错误响应（HTTP 404）
   *
   * 快速发送 404 Not Found 响应，适用于请求的资源不存在场景。
   *
   * @param res - Express Response 对象
   * @param message - 错误消息，默认 "资源未找到"
   * @returns Express Response 对象
   */
  protected sendNotFound(
    res: Response,
    message: string = '资源未找到'
  ): Response {
    return this.sendError(res, message, 404);
  }

  /**
   * 发送冲突错误响应（HTTP 409）
   *
   * 快速发送 409 Conflict 响应，适用于资源状态冲突场景，
   * 如重复创建、数据版本冲突等。
   *
   * @param res - Express Response 对象
   * @param message - 错误消息，默认 "资源冲突"
   * @returns Express Response 对象
   */
  protected sendConflict(
    res: Response,
    message: string = '资源冲突'
  ): Response {
    return this.sendError(res, message, 409);
  }

  /**
   * 发送分页响应
   *
   * 封装带分页元数据的成功响应，响应中包含 data（当前页数据列表）
   * 和 meta（分页信息：当前页、每页条数、总数、总页数）。
   *
   * @template T - 列表项数据类型
   * @param res - Express Response 对象
   * @param data - 当前页的数据数组
   * @param pagination - 分页元数据对象
   * @param pagination.page - 当前页码
   * @param pagination.limit - 每页显示条数
   * @param pagination.total - 数据总条数
   * @param pagination.totalPages - 总页数
   * @param message - 成功消息文本，默认 "获取成功"
   * @returns Express Response 对象，HTTP 状态码固定为 200
   */
  protected sendPaginated<T = any>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message?: string
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      message: message || '获取成功',
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };

    return res.status(200).json(response);
  }

  /**
   * 计算分页参数（偏移量与限制）
   *
   * 将前端传入的 page/limit 转换为数据库查询所需的 offset/limit 参数。
   * 自动处理边界情况：页码最小为 1，每页数量不超过 maxLimit（默认 100）。
   *
   * @param page - 页码，支持数字或字符串，从 1 开始
   * @param limit - 每页条数，支持数字或字符串
   * @param defaultLimit - 默认每页条数，默认 20
   * @param maxLimit - 每页最大条数限制，默认 100
   * @returns 包含 offset（偏移量）、limit（限制数）、page（规范化后的页码）的对象
   */
  protected calculatePagination(
    page?: number | string,
    limit?: number | string,
    defaultLimit: number = 20,
    maxLimit: number = 100
  ): { offset: number; limit: number; page: number } {
    // 确保页码至少为 1
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    let limitNum = parseInt(String(limit), 10) || defaultLimit;

    // 限制每页最大数量，防止恶意超大分页请求
    if (limitNum > maxLimit) {
      limitNum = maxLimit;
    }

    // 计算数据库查询的偏移量
    const offset = (pageNum - 1) * limitNum;

    return {
      offset,
      limit: limitNum,
      page: pageNum,
    };
  }

  /**
   * 计算分页元数据
   *
   * 根据总数、当前页码和每页条数，计算完整的分页元数据，
   * 包含总页数以及是否有上一页/下一页等信息。
   *
   * @param total - 数据总条数
   * @param page - 当前页码（从 1 开始）
   * @param limit - 每页条数
   * @returns 分页元数据对象
   * @returns .page - 当前页码
   * @returns .limit - 每页条数
   * @returns .total - 数据总条数
   * @returns .totalPages - 总页数
   * @returns .hasNext - 是否有下一页
   * @returns .hasPrevious - 是否有上一页
   */
  protected calculatePaginationMeta(
    total: number,
    page: number,
    limit: number
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  } {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * 处理异步操作，统一错误处理
   *
   * 包装异步操作，自动捕获异常并根据错误类型智能推断 HTTP 状态码。
   * 支持通过错误名称或错误消息中的关键字匹配来确定状态码：
   * - NotFoundError / "未找到" -> 404
   * - ValidationError / "验证"    -> 400
   * - AuthenticationError / "认证" -> 401
   * - AuthorizationError / "权限"  -> 403
   * - ConflictError / "冲突"     -> 409
   * - 其他 -> 500
   *
   * @template T - 操作返回的数据类型
   * @param res - Express Response 对象
   * @param operation - 异步操作函数，返回 Promise<T>
   * @param successMessage - 成功时的消息文本（可选）
   * @param successStatus - 成功时的 HTTP 状态码，默认 200
   * @returns Promise<Response> - 成功或失败后的 Response 对象
   *
   * @example
   * ```typescript
   * return await this.handleAsync(res, () => userService.findById(id));
   * ```
   */
  protected async handleAsync<T>(
    res: Response,
    operation: () => Promise<T>,
    successMessage?: string,
    successStatus: number = 200
  ): Promise<Response> {
    try {
      const result = await operation();
      return this.sendSuccess(res, result, successMessage, successStatus);
    } catch (error) {
      // 根据错误类型和名称智能推断 HTTP 状态码
      let statusCode = 500;
      let errorMessage = '服务器内部错误';

      if (error instanceof Error) {
        errorMessage = error.message;

        // 优先通过错误名称匹配，其次通过错误消息中的关键字匹配
        if (errorMessage.includes('未找到') || error.name === 'NotFoundError') {
          statusCode = 404;
        } else if (errorMessage.includes('验证') || error.name === 'ValidationError') {
          statusCode = 400;
        } else if (errorMessage.includes('认证') || error.name === 'AuthenticationError') {
          statusCode = 401;
        } else if (errorMessage.includes('权限') || error.name === 'AuthorizationError') {
          statusCode = 403;
        } else if (errorMessage.includes('冲突') || error.name === 'ConflictError') {
          statusCode = 409;
        }
      }

      return this.sendError(res, error as Error, statusCode);
    }
  }

  /**
   * 验证请求数据
   *
   * 使用验证器函数对请求数据进行校验，返回验证结果。
   * 验证成功时返回 validatedData（类型安全的验证后数据），
   * 验证失败时返回 errors（错误信息数组）。
   *
   * @template T - 验证通过后的数据类型
   * @param data - 待验证的请求数据
   * @param validator - 验证器函数，接收数据并返回 { valid, errors? }
   * @returns 验证结果对象
   * @returns .valid - 是否通过验证
   * @returns .errors - 验证失败时的错误信息列表（仅在失败时存在）
   * @returns .validatedData - 验证通过后的类型安全数据（仅在成功时存在）
   */
  protected validateRequest<T>(
    data: any,
    validator: (data: any) => { valid: boolean; errors?: string[] }
  ): { valid: boolean; errors?: string[]; validatedData?: T } {
    const result = validator(data);

    if (result.valid) {
      return {
        valid: true,
        validatedData: data as T,
      };
    }

    return {
      valid: false,
      errors: result.errors,
    };
  }

  /**
   * 从请求中提取并解析分页参数
   *
   * 从 Express 请求的 query 参数中提取 page、limit、sortBy、sortOrder
   * 等分页相关参数，并转换为适当的类型。
   *
   * @param req - Express Request 对象（使用 any 类型以兼容不同版本）
   * @returns 解析后的分页参数对象
   * @returns .page - 页码（字符串转为数字，可选）
   * @returns .limit - 每页条数（字符串转为数字，可选）
   * @returns .sortBy - 排序字段名（可选）
   * @returns .sortOrder - 排序方向 "asc" | "desc"（可选）
   */
  protected extractPaginationParams(req: any): PaginationParams {
    const { page, limit, sortBy, sortOrder } = req.query;

    return {
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    };
  }

  /**
   * 从请求中提取搜索参数
   *
   * 从 Express 请求的 query 参数中分离出搜索关键字 query
   * 和其他过滤条件 filters（自动排除分页和排序参数）。
   *
   * @param req - Express Request 对象（使用 any 类型以兼容不同版本）
   * @returns 搜索参数对象
   * @returns .query - 搜索关键字（可选）
   * @returns .filters - 除分页/排序外的其他过滤条件键值对（可选，仅在存在时返回）
   */
  protected extractSearchParams(req: any): any {
    const { query, ...filters } = req.query;

    // 移除分页和排序相关参数，避免它们混入过滤条件
    const paginationKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
    paginationKeys.forEach(key => {
      delete filters[key];
    });

    return {
      query: query as string | undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  /**
   * 发送文件下载响应
   *
   * 将服务器上的文件以附件或直接预览形式发送给客户端。
   * 提供 filename 时触发浏览器下载对话框（Content-Disposition: attachment）；
   * 不提供时直接在浏览器中显示文件内容。
   *
   * @param res - Express Response 对象
   * @param filePath - 服务器上文件的绝对路径
   * @param filename - 下载时显示的文件名（可选），设置后触发下载
   */
  protected sendFile(
    res: Response,
    filePath: string,
    filename?: string
  ): void {
    if (filename) {
      // 指定文件名时触发浏览器下载
      res.download(filePath, filename);
    } else {
      // 不指定文件名时直接发送文件内容（浏览器内预览）
      res.sendFile(filePath);
    }
  }

  /**
   * 发送 JSON 文件下载响应
   *
   * 将 JavaScript 对象序列化为 JSON 字符串并以 .json 文件形式下载。
   * 设置 Content-Type 为 application/json 并添加 Content-Disposition 头
   * 以触发浏览器下载。
   *
   * @param res - Express Response 对象
   * @param data - 要导出为 JSON 的任意数据
   * @param filename - 下载的文件名，默认 "data.json"
   * @returns Express Response 对象
   */
  protected sendJsonFile(
    res: Response,
    data: any,
    filename: string = 'data.json'
  ): Response {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(data, null, 2));
  }
}
