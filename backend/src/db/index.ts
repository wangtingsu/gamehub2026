/**
 * 数据库模块统一入口
 *
 * 本文件作为 GameHub 后端数据库访问层的统一导出入口。
 * 统一使用 SQLite（better-sqlite3），并将数据库实例的统一接口方法重新导出，
 * 使上层调用方无需关心底层实现细节。
 *
 * @module db/index
 */

/**
 * 加载 SQLite 数据库模块
 *
 * 所有被加载的模块均暴露同一套接口方法，包括：
 * connectDatabase, getConnection, query, execute, transaction,
 * checkHealth, closeDatabase, runMigrations。
 */
let dbModule: any = require('./sqlite').default;

/**
 * 连接数据库
 *
 * 建立与数据库的连接，初始化数据库文件并运行迁移。
 *
 * @returns {Promise<void>} 连接完成后 resolve
 * @throws 数据库连接失败时抛出错误
 */
export const connectDatabase = dbModule.connectDatabase;

/**
 * 获取数据库连接实例
 *
 * 返回底层数据库的连接实例。
 * - SQLite：返回 better-sqlite3 的 Database 实例
 *
 * @returns {any} 数据库连接实例
 */
export const getConnection = dbModule.getConnection;

/**
 * 执行数据库查询（读取操作）
 *
 * 执行 SELECT 类查询语句并返回结果行数组。
 * 支持参数化查询以防止 SQL 注入。
 *
 * @typeparam T - 结果行的类型，默认为 any
 * @param {string} sql - SQL 查询语句，支持 ? 占位符（SQLite 风格）或 $1 格式（自动转换）
 * @param {any[]} [params=[]] - 查询参数数组
 * @returns {Promise<T[]>} 查询结果行数组
 */
export const query = dbModule.query;

/**
 * 执行数据库写入操作
 *
 * 执行 INSERT / UPDATE / DELETE 等数据变更语句。
 * 返回变更行数和最后插入的行 ID（对 INSERT 语句）。
 *
 * @param {string} sql - SQL 语句
 * @param {any[]} [params=[]] - 执行参数数组
 * @returns {Promise<{ changes: number; lastInsertRowid: number }>} 执行结果
 */
export const execute = dbModule.execute || dbModule.query;

/**
 * 执行数据库事务
 *
 * 在事务上下文中执行回调函数。事务自动提交或回滚：
 * - 回调成功则提交（COMMIT）
 * - 回调抛出异常则回滚（ROLLBACK）
 *
 * @typeparam T - 回调函数的返回类型
 * @param {() => Promise<T>} callback - 要在事务内执行的回调函数
 * @returns {Promise<T>} 回调函数的返回值
 */
export const transaction = dbModule.transaction;

/**
 * 数据库健康检查
 *
 * 执行一个简单的查询以验证数据库连接是否正常。
 * 适用于负载均衡器和监控系统的健康检测端点。
 *
 * @returns {Promise<boolean>} 数据库正常返回 true，否则返回 false
 */
export const checkHealth = dbModule.checkHealth;

/**
 * 关闭数据库连接
 *
 * 优雅地关闭数据库连接或释放连接池资源。
 * 在应用关闭时调用，确保资源被正确释放。
 *
 * @returns {Promise<void>} 关闭完成后 resolve
 */
export const closeDatabase = dbModule.closeDatabase || dbModule.closePool;

/**
 * 运行数据库迁移
 *
 * 执行所有待处理的数据库迁移脚本，创建或更新数据库表结构。
 * 迁移包括：基础表创建、索引建立、软删除字段、全文搜索、
 * 多语言支持、用户等级/权限系统、游戏化系统等。
 *
 * @returns {Promise<void>} 迁移完成后 resolve
 */
export const runMigrations = dbModule.runMigrations;

/**
 * 数据库模块默认导出
 *
 * 聚合所有数据库操作方法为一个默认导出对象，
 * 方便整个应用的数据库访问统一引用。
 */
export default {
  connectDatabase,
  getConnection,
  query,
  execute,
  transaction,
  checkHealth,
  closeDatabase,
  runMigrations,
};
