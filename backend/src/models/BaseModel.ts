/**
 * ============================================================
 * 基础模型类 (BaseModel)
 * ============================================================
 * 本文件定义了项目中所有数据模型的抽象基类 BaseModel，
 * 提供通用的 CRUD（增删改查）操作，并内置以下功能：
 *   - 软删除 (Soft Delete)：标记删除而非物理删除
 *   - 乐观锁 (Optimistic Lock)：防止并发更新冲突
 *   - 审计日志 (Audit Log)：记录数据的创建者和更新者
 *   - 事务支持 (Transaction)：保证数据一致性
 *
 * 所有具体的业务模型（如 UserModel、GameModel）都应继承此类。
 * ============================================================
 */

import { query, execute, transaction as dbTransaction } from '../db';
import logger from '../utils/logger';

/**
 * 基础模型类 —— 抽象泛型基类
 *
 * @template T          模型实体类型（如 User、Game）
 * @template CreateInput 创建记录时所需的输入类型（默认 Partial<T>）
 * @template UpdateInput 更新记录时所需的输入类型（默认 Partial<T>）
 */
export abstract class BaseModel<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> {
  /** 数据库表名（子类必须实现） */
  protected abstract tableName: string;

  /** 主键字段名（子类必须实现，一般为 'id'） */
  protected abstract primaryKey: string;

  // ==================== 软删除字段配置 ====================
  /** 软删除时间戳字段名 */
  protected deletedAtField: string = 'deleted_at';
  /** 是否启用软删除功能（默认启用） */
  protected softDeleteEnabled: boolean = true;

  // ==================== 乐观锁字段配置 ====================
  /** 版本号字段名 */
  protected versionField: string = 'version';
  /** 是否启用乐观锁功能（默认禁用） */
  protected optimisticLockEnabled: boolean = false;

  // ==================== 审计日志字段配置 ====================
  /** 创建者字段名 */
  protected createdByField: string = 'created_by';
  /** 更新者字段名 */
  protected updatedByField: string = 'updated_by';
  /** 是否启用审计日志功能（默认禁用） */
  protected auditEnabled: boolean = false;

  /**
   * 将数据库行记录转换为模型实例对象
   * @param row 从数据库查询出的原始行数据
   * @returns 转换后的模型类型实例
   */
  protected abstract fromRow(row: any): T;

  /**
   * 将创建输入数据转换为数据库行记录
   * @param data 前端或服务层传入的创建数据
   * @returns 适配数据库列格式的行数据对象
   */
  protected abstract toRow(data: CreateInput): any;

  /**
   * 根据主键 ID 查找单条记录
   * @param id             记录主键值
   * @param includeDeleted 是否包含已软删除的记录（默认 false）
   * @returns 找到的记录，未找到则返回 null
   */
  async findById(id: string | number, includeDeleted?: boolean): Promise<T | null> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const params: any[] = [id];

      // 若启用软删除且未要求包含已删除记录，则自动过滤
      if (this.softDeleteEnabled && !includeDeleted) {
        sql += ` AND ${this.deletedAtField} IS NULL`;
      }

      const rows = await query(sql, params);
      if (rows.length === 0) {
        return null;
      }
      return this.fromRow(rows[0]);
    } catch (error) {
      logger.error(`查找${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 查找所有符合条件的记录（支持分页、排序、条件筛选）
   * @param options.limit           每页条数
   * @param options.offset          偏移量
   * @param options.orderBy         排序字段
   * @param options.orderDirection  排序方向 ASC | DESC
   * @param options.where           WHERE 条件语句（不含 WHERE 关键字）
   * @param options.params          WHERE 条件对应的参数数组
   * @param options.includeDeleted  是否包含已软删除的记录
   * @returns 模型实例数组
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    where?: string;
    params?: any[];
    includeDeleted?: boolean;
  }): Promise<T[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      // 构建 WHERE 子句
      let whereClause = '';
      if (options?.where) {
        whereClause = options.where;
        if (options.params) {
          params.push(...options.params);
        }
      }

      // 若启用软删除且未要求包含已删除记录，自动追加过滤条件
      if (this.softDeleteEnabled && !options?.includeDeleted) {
        if (whereClause) {
          whereClause += ` AND ${this.deletedAtField} IS NULL`;
        } else {
          whereClause = `${this.deletedAtField} IS NULL`;
        }
      }

      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }

      // 排序
      if (options?.orderBy) {
        const direction = options.orderDirection || 'ASC';
        sql += ` ORDER BY ${options.orderBy} ${direction}`;
      }

      // 分页
      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
        if (options.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const rows = await query(sql, params);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error(`查找所有${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 创建新记录
   * @param data            创建数据
   * @param options.userId  操作人 ID（用于审计日志）
   * @returns 新创建的记录
   */
  async create(
    data: CreateInput,
    options?: {
      userId?: string | number;
    }
  ): Promise<T> {
    try {
      const row = this.toRow(data);

      // 审计日志：记录创建者和更新者
      if (this.auditEnabled && options?.userId) {
        row[this.createdByField] = options.userId;
        row[this.updatedByField] = options.userId;
      }

      // 乐观锁：初始版本号为 1
      if (this.optimisticLockEnabled) {
        row[this.versionField] = 1;
      }

      // 软删除：确保 deleted_at 为 NULL
      if (this.softDeleteEnabled) {
        row[this.deletedAtField] = null;
      }

      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row).map(() => '?').join(', ');
      const values = Object.values(row);

      const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
      const result = await execute(sql, values);

      // 获取新创建的记录并返回
      const newRecord = await this.findById(result.lastInsertRowid);
      if (!newRecord) {
        throw new Error('创建记录后获取失败');
      }
      return newRecord;
    } catch (error) {
      logger.error(`创建${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 更新指定记录
   * @param id                     记录主键
   * @param data                   需要更新的数据
   * @param options.userId          操作用户 ID（审计日志）
   * @param options.skipVersionCheck 是否跳过乐观锁版本检查
   * @returns 更新后的记录，未找到则返回 null
   */
  async update(
    id: string | number,
    data: UpdateInput,
    options?: {
      userId?: string | number;
      skipVersionCheck?: boolean;
    }
  ): Promise<T | null> {
    try {
      // 先检查记录是否存在（包含已删除的，以便恢复场景）
      const existing = await this.findById(id, true);
      if (!existing) {
        return null;
      }

      const updates = { ...data } as Record<string, any>;

      // 自动设置更新时间戳
      if (!updates.updatedAt) {
        updates.updatedAt = new Date().toISOString();
      }

      // 审计日志：记录更新者
      if (this.auditEnabled && options?.userId) {
        updates[this.updatedByField] = options.userId;
      }

      // 构建 SET 子句
      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');

      // 构建 WHERE 子句：主键条件 + 可选乐观锁版本条件
      let whereClause = `${this.primaryKey} = ?`;
      const values = Object.values(updates);
      values.push(id);

      if (this.optimisticLockEnabled && !options?.skipVersionCheck) {
        if ((data as any)[this.versionField] !== undefined) {
          whereClause += ` AND ${this.versionField} = ?`;
          values.push((data as any)[this.versionField]);
        }
      }

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;
      const result = await execute(sql, values);

      if (result.changes === 0) {
        if (this.optimisticLockEnabled && !options?.skipVersionCheck) {
          throw new Error('版本冲突或记录不存在');
        }
        return null;
      }

      // 返回更新后的记录
      return this.findById(id);
    } catch (error) {
      logger.error(`更新${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 删除记录（根据是否启用软删除决定是软删还是硬删）
   * @param id         记录主键
   * @param hardDelete 是否强制硬删除（跳过软删除，默认 false）
   * @returns 是否删除成功
   */
  async delete(id: string | number, hardDelete: boolean = false): Promise<boolean> {
    try {
      if (this.softDeleteEnabled && !hardDelete) {
        // 软删除：将 deleted_at 设为当前时间
        const sql = `UPDATE ${this.tableName} SET ${this.deletedAtField} = ? WHERE ${this.primaryKey} = ?`;
        const result = await execute(sql, [new Date().toISOString(), id]);
        return result.changes > 0;
      } else {
        // 硬删除：从表中物理移除
        const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
        const result = await execute(sql, [id]);
        return result.changes > 0;
      }
    } catch (error) {
      logger.error(`删除${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 统计符合条件的数据行数
   * @param where          WHERE 条件语句
   * @param params         条件参数
   * @param includeDeleted 是否包含已软删除的记录
   * @returns 记录总数
   */
  async count(where?: string, params?: any[], includeDeleted?: boolean): Promise<number> {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      let whereClause = '';
      const queryParams = params ? [...params] : [];

      if (where) {
        whereClause = where;
      }

      // 软删除过滤
      if (this.softDeleteEnabled && !includeDeleted) {
        if (whereClause) {
          whereClause += ` AND ${this.deletedAtField} IS NULL`;
        } else {
          whereClause = `${this.deletedAtField} IS NULL`;
        }
      }

      if (whereClause) {
        sql += ` WHERE ${whereClause}`;
      }

      const rows = await query(sql, queryParams);
      return rows[0]?.count || 0;
    } catch (error) {
      logger.error(`统计${this.tableName}记录数失败:`, error);
      throw error;
    }
  }

  /**
   * 检查指定主键的记录是否存在
   * @param id             记录主键
   * @param includeDeleted 是否包含已软删除的记录
   * @returns 是否存在
   */
  async exists(id: string | number, includeDeleted?: boolean): Promise<boolean> {
    try {
      let sql = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const params: any[] = [id];
      if (this.softDeleteEnabled && !includeDeleted) {
        sql += ` AND ${this.deletedAtField} IS NULL`;
      }
      sql += ` LIMIT 1`;
      const rows = await query(sql, params);
      return rows.length > 0;
    } catch (error) {
      logger.error(`检查${this.tableName}记录是否存在失败:`, error);
      throw error;
    }
  }

  /**
   * 根据自定义条件查找单条记录
   * @param where          WHERE 条件语句（不含 WHERE 关键字）
   * @param params         条件参数
   * @param includeDeleted 是否包含已软删除的记录
   * @returns 符合条件的记录，未找到则返回 null
   */
  async findOne(where: string, params?: any[], includeDeleted?: boolean): Promise<T | null> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE ${where}`;
      const queryParams = params ? [...params] : [];

      if (this.softDeleteEnabled && !includeDeleted) {
        sql += ` AND ${this.deletedAtField} IS NULL`;
      }
      sql += ` LIMIT 1`;

      const rows = await query(sql, queryParams);
      if (rows.length === 0) {
        return null;
      }
      return this.fromRow(rows[0]);
    } catch (error) {
      logger.error(`查找单个${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 软删除指定记录（将 deleted_at 设为当前时间）
   * @param id 记录主键
   * @returns 是否操作成功
   */
  async softDelete(id: string | number): Promise<boolean> {
    try {
      if (!this.softDeleteEnabled) {
        throw new Error(`模型${this.tableName}未启用软删除功能`);
      }
      const sql = `UPDATE ${this.tableName} SET ${this.deletedAtField} = ? WHERE ${this.primaryKey} = ?`;
      const result = await execute(sql, [new Date().toISOString(), id]);
      return result.changes > 0;
    } catch (error) {
      logger.error(`软删除${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 恢复已被软删除的记录（将 deleted_at 置为 NULL）
   * @param id 记录主键
   * @returns 是否操作成功
   */
  async restore(id: string | number): Promise<boolean> {
    try {
      if (!this.softDeleteEnabled) {
        throw new Error(`模型${this.tableName}未启用软删除功能`);
      }
      const sql = `UPDATE ${this.tableName} SET ${this.deletedAtField} = NULL WHERE ${this.primaryKey} = ?`;
      const result = await execute(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error(`恢复${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 永久删除记录（硬删除），不可逆
   * @param id 记录主键
   * @returns 是否删除成功
   */
  async hardDelete(id: string | number): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const result = await execute(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error(`永久删除${this.tableName}记录失败:`, error);
      throw error;
    }
  }

  /**
   * 静态事务方法：执行数据库事务
   * @param callback 回调函数，包含需要在事务中执行的操作
   * @returns 事务回调的返回值
   */
  static async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return dbTransaction(callback);
  }

  /**
   * 实例事务方法：在当前模型实例中执行数据库事务
   * @param callback 回调函数
   * @returns 事务回调的返回值
   */
  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return dbTransaction(callback);
  }

  /**
   * 带乐观锁的更新操作
   * 仅在乐观锁启用时可用，通过版本号检测避免并发冲突
   * @param id             记录主键
   * @param data           需要更新的数据
   * @param currentVersion 当前版本号（从现有记录中获取）
   * @returns 更新后的记录
   * @throws 当版本冲突时抛出错误
   */
  async updateWithVersion(
    id: string | number,
    data: UpdateInput,
    currentVersion: number
  ): Promise<T | null> {
    try {
      if (!this.optimisticLockEnabled) {
        throw new Error(`模型${this.tableName}未启用乐观锁功能`);
      }

      // 先检查记录是否存在（包含已删除的）
      const existing = await this.findById(id, true);
      if (!existing) {
        return null;
      }

      const updates = { ...data } as Record<string, any>;

      // 自动更新时间戳
      if (!updates.updatedAt) {
        updates.updatedAt = new Date().toISOString();
      }

      // 版本号递增
      updates[this.versionField] = currentVersion + 1;

      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = Object.values(updates);
      values.push(id, currentVersion); // WHERE 条件中同时校验主键和版本号

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ? AND ${this.versionField} = ?`;
      const result = await execute(sql, values);

      if (result.changes === 0) {
        throw new Error('版本冲突或记录不存在');
      }

      return this.findById(id);
    } catch (error) {
      logger.error(`更新${this.tableName}记录失败（乐观锁）:`, error);
      throw error;
    }
  }
}
