/**
 * 请求数据验证器模块
 *
 * 基于 Joi 库提供统一的请求数据验证规则和函数。
 * 覆盖所有 API 端点的输入验证，包括：
 * - 通用：分页参数、搜索参数
 * - 用户：注册、登录、手机号注册/登录、资料更新、密码修改
 * - 游戏：创建、更新
 * - 新闻：创建、更新
 * - 评测：创建、更新
 * - 社区：帖子创建、更新
 * - 评论：创建
 * - 文件：上传验证
 * - 私信：发送消息、创建对话
 * - 成就：创建、更新
 *
 * 每个 Schema 都包含详细的中文错误提示消息。
 *
 * @module validators/index
 */

import Joi from 'joi';

// ========== 通用验证规则 ==========

/**
 * 分页参数验证
 * - page: 页码，最小 1，默认 1
 * - limit: 每页数量，1-100，默认 20
 * - sortBy: 排序字段，支持 createdAt/updatedAt/title/rating/views/likes
 * - sortOrder: 排序方向，asc/desc，默认 desc
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'rating', 'views', 'likes').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * 搜索参数验证（继承分页参数）
 * - query: 搜索关键词，1-100 字符
 * - category: 分类筛选
 * - tags: 标签筛选数组
 */
export const searchSchema = paginationSchema.keys({
  query: Joi.string().min(1).max(100).optional(),
  category: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

// ========== 用户验证规则 ==========

/**
 * 用户注册验证规则
 * - username: 3-30 字符，仅字母/数字/下划线
 * - email: 有效邮箱格式
 * - password: 8-100 字符，必须包含大小写字母和数字
 * - displayName: 2-50 字符，可选
 */
export const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': '用户名只能包含字母、数字和下划线',
      'string.min': '用户名至少需要3个字符',
      'string.max': '用户名不能超过30个字符',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '请输入有效的邮箱地址',
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': '密码至少需要8个字符',
      'string.pattern.base': '密码必须包含大小写字母和数字',
    }),
  displayName: Joi.string()
    .min(2)
    .max(50)
    .optional(),
});

/**
 * 用户登录验证规则
 * - email: 有效邮箱格式
 * - password: 非空
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '请输入有效的邮箱地址',
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': '密码不能为空',
    }),
});

/**
 * 手机号登录验证规则
 * - phone: 国内手机号（1[3-9] 开头，11 位）
 * - code: 6 位数字验证码
 */
export const loginByPhoneSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
      'string.empty': '手机号码不能为空',
    }),
  code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': '验证码为6位数字',
      'string.pattern.base': '验证码为6位数字',
      'string.empty': '验证码不能为空',
    }),
});

/**
 * 手机号注册验证规则
 * - username: 3-30 字符，仅字母/数字/下划线
 * - phone: 国内手机号
 * - code: 6 位验证码
 * - password: 8-100 字符，大小写字母+数字
 * - displayName: 2-50 字符，可选
 */
export const registerByPhoneSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': '用户名只能包含字母、数字和下划线',
      'string.min': '用户名至少需要3个字符',
      'string.max': '用户名不能超过30个字符',
    }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
      'string.empty': '手机号码不能为空',
    }),
  code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': '验证码为6位数字',
      'string.pattern.base': '验证码为6位数字',
      'string.empty': '验证码不能为空',
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': '密码至少需要8个字符',
      'string.pattern.base': '密码必须包含大小写字母和数字',
    }),
  displayName: Joi.string()
    .min(2)
    .max(50)
    .optional(),
});

/**
 * 用户资料更新验证规则
 * - displayName: 2-50 字符，可选
 * - avatarUrl: 有效 URL，可选
 * - bio: 最多 500 字符，可选
 */
export const updateProfileSchema = Joi.object({
  displayName: Joi.string()
    .min(2)
    .max(50)
    .optional(),
  avatarUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': '请输入有效的URL地址',
    }),
  bio: Joi.string()
    .max(500)
    .optional(),
});

/**
 * 密码修改验证规则
 * - currentPassword: 当前密码，必填
 * - newPassword: 8-100 字符，大小写字母+数字
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': '当前密码不能为空',
    }),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': '新密码至少需要8个字符',
      'string.pattern.base': '新密码必须包含大小写字母和数字',
    }),
});

// ========== 游戏验证规则 ==========

/**
 * 游戏创建验证规则
 * - title: 1-200 字符，必填
 * - description: 最多 5000 字符，可选
 * - releaseDate: 不超过当前日期，可选
 * - developer/publisher: 最多 100 字符，可选
 * - genres: 至少 1 个，必填
 * - platforms: 至少 1 个，必填
 * - price: 0-10000，可选
 * - coverImageUrl: 有效 URL，可选
 */
export const gameCreateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': '游戏标题不能为空',
      'string.max': '游戏标题不能超过200个字符',
    }),
  description: Joi.string()
    .max(5000)
    .optional(),
  releaseDate: Joi.date()
    .max('now')
    .optional(),
  developer: Joi.string()
    .max(100)
    .optional(),
  publisher: Joi.string()
    .max(100)
    .optional(),
  genres: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': '至少选择一个游戏类型',
    }),
  platforms: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': '至少选择一个平台',
    }),
  price: Joi.number()
    .min(0)
    .max(10000)
    .optional(),
  coverImageUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': '请输入有效的封面图片URL',
    }),
});

/**
 * 游戏更新验证规则（所有字段可选）
 * - title: 1-200 字符
 * - description: 最多 5000 字符
 * - rating: 0-10
 * - price: 0-10000
 * - discount: 0-100（百分比）
 * - isFeatured: 布尔值
 */
export const gameUpdateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  description: Joi.string()
    .max(5000)
    .optional(),
  rating: Joi.number()
    .min(0)
    .max(10)
    .optional(),
  price: Joi.number()
    .min(0)
    .max(10000)
    .optional(),
  discount: Joi.number()
    .min(0)
    .max(100)
    .optional(),
  isFeatured: Joi.boolean()
    .optional(),
});

// ========== 新闻验证规则 ==========

/**
 * 新闻创建验证规则
 * - title: 1-200 字符，必填
 * - content: 至少 10 字符，必填
 * - excerpt: 最多 300 字符，可选
 * - coverImageUrl: 有效 URL，可选
 * - category: 必填
 * - tags: 字符串数组，可选
 */
export const newsCreateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': '新闻标题不能为空',
      'string.max': '新闻标题不能超过200个字符',
    }),
  content: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': '新闻内容至少需要10个字符',
      'string.empty': '新闻内容不能为空',
    }),
  excerpt: Joi.string()
    .max(300)
    .optional(),
  coverImageUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': '请输入有效的封面图片URL',
    }),
  category: Joi.string()
    .required()
    .messages({
      'string.empty': '新闻分类不能为空',
    }),
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
});

/**
 * 新闻更新验证规则（所有字段可选）
 */
export const newsUpdateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  content: Joi.string()
    .min(10)
    .optional(),
  excerpt: Joi.string()
    .max(300)
    .optional(),
  category: Joi.string()
    .optional(),
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
  isPublished: Joi.boolean()
    .optional(),
});

// ========== 评测验证规则 ==========

/**
 * 评测创建验证规则
 * - title: 1-200 字符，必填
 * - content: 至少 50 字符，必填
 * - rating: 0-10，必填
 * - gameId: UUID 格式，必填
 * - tags: 字符串数组，可选
 */
export const reviewCreateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': '评测标题不能为空',
      'string.max': '评测标题不能超过200个字符',
    }),
  content: Joi.string()
    .min(50)
    .required()
    .messages({
      'string.min': '评测内容至少需要50个字符',
      'string.empty': '评测内容不能为空',
    }),
  rating: Joi.number()
    .min(0)
    .max(10)
    .required()
    .messages({
      'number.min': '评分不能低于0',
      'number.max': '评分不能高于10',
    }),
  gameId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '游戏ID格式不正确',
    }),
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
});

/**
 * 评测更新验证规则（所有字段可选）
 */
export const reviewUpdateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  content: Joi.string()
    .min(50)
    .optional(),
  rating: Joi.number()
    .min(0)
    .max(10)
    .optional(),
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
});

// ========== 社区帖子验证规则 ==========

/**
 * 社区帖子创建验证规则
 * - title: 1-200 字符，必填
 * - content: 至少 10 字符，必填
 * - category: 必填
 * - tags: 字符串数组，可选
 */
export const communityPostCreateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': '帖子标题不能为空',
      'string.max': '帖子标题不能超过200个字符',
    }),
  content: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.min': '帖子内容至少需要10个字符',
      'string.empty': '帖子内容不能为空',
    }),
  category: Joi.string()
    .required()
    .messages({
      'string.empty': '帖子分类不能为空',
    }),
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
});

/**
 * 社区帖子更新验证规则（所有字段可选）
 */
export const communityPostUpdateSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  content: Joi.string()
    .min(10)
    .optional(),
  category: Joi.string()
    .optional(),
  tags: Joi.array()
    .items(Joi.string())
    .optional(),
});

// ========== 评论验证规则 ==========

/**
 * 评论创建验证规则
 * - content: 1-1000 字符，必填
 * - parentType: 必须为 review/news/community_post
 * - parentId: UUID 格式，必填
 */
export const commentCreateSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.empty': '评论内容不能为空',
      'string.max': '评论内容不能超过1000个字符',
    }),
  parentType: Joi.string()
    .valid('review', 'news', 'community_post')
    .required()
    .messages({
      'any.only': 'parentType必须是review、news或community_post',
    }),
  parentId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'parentId格式不正确',
    }),
});

// ========== 文件上传验证规则 ==========

/**
 * 文件上传验证规则
 * - fieldname/encoding/mimetype: 必填字符串
 * - originalname: 必填，原始文件名
 * - size: 不超过 10MB
 */
export const fileUploadSchema = Joi.object({
  fieldname: Joi.string()
    .required(),
  originalname: Joi.string()
    .required(),
  encoding: Joi.string()
    .required(),
  mimetype: Joi.string()
    .required(),
  size: Joi.number()
    .max(10 * 1024 * 1024) // 10MB
    .required()
    .messages({
      'number.max': '文件大小不能超过10MB',
    }),
});

// ========== 私信验证规则 ==========

/**
 * 发送消息验证规则
 * - content: 1-5000 字符，必填
 * - replyToId: 消息 ID，可选（用于回复消息）
 */
export const sendMessageSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required().messages({
    'string.empty': '消息内容不能为空',
    'string.max': '消息内容不能超过5000个字符',
  }),
  replyToId: Joi.string().optional(),
});

/**
 * 创建对话验证规则
 * - participantId: 参与者用户 ID，必填
 * - subject: 对话主题，最多 200 字符，可选（允许空字符串）
 */
export const createConversationSchema = Joi.object({
  participantId: Joi.string().required().messages({
    'string.empty': '请选择对话参与者',
  }),
  subject: Joi.string().max(200).optional().allow(''),
});

// ========== 成就验证规则 ==========

/**
 * 成就创建验证规则
 * - key: 2-50 字符，必填，唯一标识
 * - name: 1-100 字符，必填
 * - description: 1-500 字符，必填
 * - iconUrl: 有效 URL，可选
 * - category: 必须为 social/content/growth/milestone
 * - requirementType/value: 达成条件和值，必填
 * - xpReward/pointsReward: 奖励值，默认 0
 * - isHidden: 是否隐藏，默认 false
 * - sortOrder: 排序序号，默认 0
 */
export const achievementCreateSchema = Joi.object({
  key: Joi.string().min(2).max(50).required(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().min(1).max(500).required(),
  iconUrl: Joi.string().uri().optional().allow(''),
  category: Joi.string().valid('social', 'content', 'growth', 'milestone').required(),
  requirementType: Joi.string().required(),
  requirementValue: Joi.number().integer().min(1).required(),
  xpReward: Joi.number().integer().min(0).default(0),
  pointsReward: Joi.number().integer().min(0).default(0),
  isHidden: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().min(0).default(0),
});

/**
 * 成就更新验证规则（所有字段可选）
 */
export const achievementUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().min(1).max(500).optional(),
  iconUrl: Joi.string().uri().optional().allow(''),
  category: Joi.string().valid('social', 'content', 'growth', 'milestone').optional(),
  requirementType: Joi.string().optional(),
  requirementValue: Joi.number().integer().min(1).optional(),
  xpReward: Joi.number().integer().min(0).optional(),
  pointsReward: Joi.number().integer().min(0).optional(),
  isHidden: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

// ========== 验证辅助函数 ==========

/**
 * 通用数据验证函数
 *
 * 使用指定的 Joi Schema 验证数据，验证失败时抛出一个对象格式的错误
 * （包含 name: 'ValidationError' 和 details 数组），
 * 方便上层错误处理中间件捕获和格式化。
 *
 * @param schema - Joi 验证 Schema
 * @param data   - 要验证的数据
 * @returns 验证通过后的数据（已去除未知字段）
 * @throws {Object} 验证失败时抛出 { name: 'ValidationError', details: Array<{field, message}> }
 */
export const validate = (schema: Joi.Schema, data: any) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    throw {
      name: 'ValidationError',
      details,
    };
  }

  return value;
};

export default {
  // 通用
  paginationSchema,
  searchSchema,
  validate,

  // 用户
  registerSchema,
  loginSchema,
  loginByPhoneSchema,
  registerByPhoneSchema,
  updateProfileSchema,
  changePasswordSchema,

  // 游戏
  gameCreateSchema,
  gameUpdateSchema,

  // 新闻
  newsCreateSchema,
  newsUpdateSchema,

  // 评测
  reviewCreateSchema,
  reviewUpdateSchema,

  // 社区
  communityPostCreateSchema,
  communityPostUpdateSchema,

  // 评论
  commentCreateSchema,

  // 文件
  fileUploadSchema,

  // 私信
  sendMessageSchema,
  createConversationSchema,

  // 成就
  achievementCreateSchema,
  achievementUpdateSchema,
};
