/**
 * ioredis 的 Jest Mock 实现
 *
 * 在测试环境中替换真实的 Redis 客户端连接，避免测试时依赖外部 Redis 服务。
 *
 * Mock 覆盖了以下方法：
 * - 连接/断开：connect, disconnect
 * - 基本 KV：get, set, expire, ttl, keys
 * - 有序集合：zadd, zrange, zcard, zremrangebyscore
 * - 管道操作：pipeline（返回链式调用的 mock）
 * - 状态属性：status（固定返回 'ready'）
 *
 * 使用方式（在测试文件中）：
 *   jest.mock('ioredis');
 *   或由 Jest 自动发现 __mocks__/ 目录下的同名文件。
 */
const Redis = jest.fn().mockImplementation(() => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  zrange: jest.fn(),
  zadd: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  ttl: jest.fn(),
  pipeline: jest.fn(() => ({
    exec: jest.fn(),
    expire: jest.fn().mockReturnThis(),
  })),
  status: 'ready',
}));

module.exports = Redis;
