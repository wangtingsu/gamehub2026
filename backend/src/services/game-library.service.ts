/**
 * 用户游戏库服务
 * 管理用户的游戏收藏库，支持游戏的添加、更新、移除、搜索、统计和外部导入。
 * 每个用户的游戏库包含游戏状态（游玩中/已完成等）、平台拥有信息和个人评分笔记等。
 */

import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  UserGameLibrary,
  UserGameLibraryCreateInput,
  UserGameLibraryUpdateInput,
  PlatformOwnership,
  LibraryStatus,
  PlatformType,
  PaginationParams
} from '../types';
import { NotFoundError, ConflictError, ValidationError } from '../middlewares/error.middleware';
import { userGameLibraryModel } from '../models/UserGameLibrary';
import { gameModel } from '../models/Game';

/**
 * 获取用户游戏库
 * 支持按状态、平台过滤，以及分页和排序（按添加时间、最后游玩时间或游戏标题）。
 * @param userId - 用户ID
 * @param options - 查询选项（状态筛选、平台筛选、分页、排序）
 * @returns 游戏库条目列表及符合条件的总数
 */
export const getUserGameLibrary = async (
  userId: string,
  options?: {
    status?: LibraryStatus;
    platform?: PlatformType;
    limit?: number;
    offset?: number;
    sortBy?: 'added_at' | 'last_played_at' | 'game_title';
    sortOrder?: 'ASC' | 'DESC';
  }
): Promise<{ games: UserGameLibrary[]; total: number }> => {
  try {
    // 获取游戏库条目
    const libraryGames = await userGameLibraryModel.getUserLibrary(userId, options);

    // 获取总数
    let countSql = `SELECT COUNT(*) as count FROM user_game_library WHERE user_id = ?`;
    const countParams: any[] = [userId];

    if (options?.status) {
      countSql += ` AND status = ?`;
      countParams.push(options.status);
    }

    if (options?.platform) {
      countSql += ` AND platforms LIKE ?`;
      countParams.push(`%"platformType":"${options.platform}"%`);
    }

    countSql += ` AND deleted_at IS NULL`;

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.count || 0;

    return {
      games: libraryGames,
      total: Number(total)
    };
  } catch (error) {
    logger.error('获取用户游戏库失败:', error);
    throw error;
  }
};

/**
 * 添加游戏到用户游戏库
 * 验证游戏存在且未在库中，然后创建库条目并同步游戏标题等信息。
 * @param userId - 用户ID
 * @param data - 游戏库条目数据（游戏ID、状态、平台拥有信息、个人评分等）
 * @returns 创建的游戏库条目
 * @throws NotFoundError - 游戏不存在时抛出
 * @throws ConflictError - 游戏已在库中时抛出
 */
export const addGameToLibrary = async (
  userId: string,
  data: {
    gameId: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    personalRating?: number;
    personalNotes?: string;
    tags?: string[];
    primaryPlatform?: PlatformType;
  }
): Promise<UserGameLibrary> => {
  try {
    // 检查游戏是否存在
    const game = await gameModel.findById(data.gameId);
    if (!game) {
      throw new NotFoundError('游戏不存在');
    }

    // 检查是否已在库中
    const existing = await userGameLibraryModel.isGameInLibrary(userId, data.gameId);
    if (existing) {
      throw new ConflictError('游戏已在库中');
    }

    // 创建库条目
    const libraryItem: UserGameLibraryCreateInput = {
      userId,
      gameId: data.gameId,
      gameTitle: game.title,
      gameSlug: game.slug,
      status: data.status,
      platforms: data.platforms,
      personalRating: data.personalRating,
      personalNotes: data.personalNotes,
      tags: data.tags,
      primaryPlatform: data.primaryPlatform
    };

    return await userGameLibraryModel.create(libraryItem);
  } catch (error) {
    logger.error('添加游戏到库失败:', error);
    throw error;
  }
};

/**
 * 更新游戏库条目信息
 * 验证条目存在且属于当前用户后，更新状态、评分、笔记等信息。
 * @param userId - 用户ID（用于权限校验）
 * @param libraryId - 游戏库条目ID
 * @param data - 要更新的字段数据
 * @returns 更新后的游戏库条目
 * @throws NotFoundError - 条目不存在时抛出
 * @throws ValidationError - 无权更新时抛出
 */
export const updateGameLibraryEntry = async (
  userId: string,
  libraryId: string,
  data: UserGameLibraryUpdateInput
): Promise<UserGameLibrary> => {
  try {
    // 检查库条目是否存在且属于用户
    const libraryEntry = await userGameLibraryModel.findById(libraryId);
    if (!libraryEntry) {
      throw new NotFoundError('游戏库条目不存在');
    }

    if (libraryEntry.userId !== userId) {
      throw new ValidationError('无权更新此游戏库条目');
    }

    // 更新条目
    const updatedEntry = await userGameLibraryModel.update(libraryId, data);
    if (!updatedEntry) {
      throw new NotFoundError('更新游戏库条目失败');
    }

    return updatedEntry;
  } catch (error) {
    logger.error('更新游戏库条目失败:', error);
    throw error;
  }
};

/**
 * 从用户游戏库中移除游戏（软删除）
 * 验证条目存在且属于当前用户后执行删除操作。
 * @param userId - 用户ID（用于权限校验）
 * @param libraryId - 游戏库条目ID
 * @returns 删除是否成功
 * @throws NotFoundError - 条目不存在时抛出
 * @throws ValidationError - 无权删除时抛出
 */
export const removeGameFromLibrary = async (
  userId: string,
  libraryId: string
): Promise<boolean> => {
  try {
    // 检查库条目是否存在且属于用户
    const libraryEntry = await userGameLibraryModel.findById(libraryId);
    if (!libraryEntry) {
      throw new NotFoundError('游戏库条目不存在');
    }

    if (libraryEntry.userId !== userId) {
      throw new ValidationError('无权移除此游戏库条目');
    }

    // 软删除
    return await userGameLibraryModel.delete(libraryId);
  } catch (error) {
    logger.error('从库中移除游戏失败:', error);
    throw error;
  }
};

/**
 * 获取用户游戏库的统计信息
 * 包含游戏总数、按状态/平台分布、总游玩时长和平均评分等。
 * @param userId - 用户ID
 * @returns 游戏库统计数据
 */
export const getLibraryStats = async (
  userId: string
): Promise<{
  totalGames: number;
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  totalPlayTime: number;
  averageRating?: number;
}> => {
  try {
    return await userGameLibraryModel.getUserLibraryStats(userId);
  } catch (error) {
    logger.error('获取游戏库统计失败:', error);
    throw error;
  }
};

/**
 * 更新用户对指定游戏的最后游玩时间
 * @param userId - 用户ID
 * @param gameId - 游戏ID
 * @returns 更新是否成功
 */
export const updateLastPlayed = async (
  userId: string,
  gameId: string
): Promise<boolean> => {
  try {
    return await userGameLibraryModel.updateLastPlayed(userId, gameId);
  } catch (error) {
    logger.error('更新最后游玩时间失败:', error);
    throw error;
  }
};

/**
 * 批量检查多个游戏是否在用户游戏库中
 * 一次查询多个游戏，减少数据库调用次数。
 * @param userId - 用户ID
 * @param gameIds - 游戏ID列表
 * @returns 以游戏ID为键、是否在库中为值的映射表
 */
export const getBatchLibraryStatus = async (
  userId: string,
  gameIds: string[]
): Promise<Record<string, boolean>> => {
  try {
    return await userGameLibraryModel.getBatchLibraryStatus(userId, gameIds);
  } catch (error) {
    logger.error('批量获取游戏库状态失败:', error);
    throw error;
  }
};

/**
 * 从外部来源导入游戏库数据（如 Steam 等平台）
 * 批量创建游戏库条目，适用于首次迁移或同步。
 * @param userId - 用户ID
 * @param externalData - 外部游戏库数据列表（含游戏ID、标题、状态、平台等信息）
 * @returns 成功导入的条目数量
 */
export const importExternalLibrary = async (
  userId: string,
  externalData: Array<{
    gameId: string;
    gameTitle: string;
    gameSlug: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    purchaseDate?: Date;
  }>
): Promise<number> => {
  try {
    return await userGameLibraryModel.importExternalLibrary(userId, externalData);
  } catch (error) {
    logger.error('导入外部游戏库失败:', error);
    throw error;
  }
};

/**
 * 在用户游戏库中搜索游戏
 * 在已获取的库条目中对游戏标题、个人笔记和标签进行文本模糊匹配。
 * 注意：当前实现为内存过滤，大规模库时性能可能受限。
 * @param userId - 用户ID
 * @param queryText - 搜索关键词
 * @param options - 可选的过滤和分页参数
 * @returns 匹配的游戏库条目列表及总数
 */
export const searchUserLibrary = async (
  userId: string,
  queryText: string,
  options?: {
    status?: LibraryStatus;
    platform?: PlatformType;
    limit?: number;
    offset?: number;
  }
): Promise<{ games: UserGameLibrary[]; total: number }> => {
  try {
    // 先获取所有库游戏
    const allGames = await userGameLibraryModel.getUserLibrary(userId, {
      status: options?.status,
      platform: options?.platform
    });

    // 过滤搜索词
    const filteredGames = allGames.filter(game =>
      game.gameTitle.toLowerCase().includes(queryText.toLowerCase()) ||
      game.personalNotes?.toLowerCase().includes(queryText.toLowerCase()) ||
      game.tags?.some(tag => tag.toLowerCase().includes(queryText.toLowerCase()))
    );

    // 应用分页
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const paginatedGames = filteredGames.slice(offset, offset + limit);

    return {
      games: paginatedGames,
      total: filteredGames.length
    };
  } catch (error) {
    logger.error('搜索用户游戏库失败:', error);
    throw error;
  }
};

/**
 * 获取游戏库条目及其关联的游戏详情
 * 同时查询库条目和游戏表的信息，适用于详情展示页面。
 * @param userId - 用户ID（用于权限校验）
 * @param libraryId - 游戏库条目ID
 * @returns 包含库条目和游戏详情的复合对象
 * @throws NotFoundError - 条目不存在时抛出
 * @throws ValidationError - 无权访问时抛出
 */
export const getLibraryEntryWithGameDetails = async (
  userId: string,
  libraryId: string
): Promise<{
  libraryEntry: UserGameLibrary;
  gameDetails: any; // 游戏详情
}> => {
  try {
    // 获取库条目
    const libraryEntry = await userGameLibraryModel.findById(libraryId);
    if (!libraryEntry) {
      throw new NotFoundError('游戏库条目不存在');
    }

    if (libraryEntry.userId !== userId) {
      throw new ValidationError('无权访问此游戏库条目');
    }

    // 获取游戏详情
    const gameDetails = await gameModel.findById(libraryEntry.gameId);

    return {
      libraryEntry,
      gameDetails: gameDetails || null
    };
  } catch (error) {
    logger.error('获取游戏库条目详情失败:', error);
    throw error;
  }
};