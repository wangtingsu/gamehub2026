/**
 * 收藏服务
 * 负责用户游戏收藏的增删改查操作，提供收藏状态检查、批量查询及统计功能。
 * 委托 favoriteModel 完成数据持久化，在此之上添加日志记录和错误处理。
 */

import { favoriteModel } from '../models/Favorite';
import { Favorite, FavoriteCreateInput } from '../types';
import logger from '../utils/logger';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';

/**
 * 收藏服务类
 * 封装用户收藏游戏的核心业务逻辑，包括添加/取消收藏、状态检查和统计查询。
 */
class FavoriteService {
  /**
   * 添加收藏
   * 用户收藏指定游戏，委托 favoriteModel 完成数据写入。
   * @param userId - 用户ID
   * @param gameId - 游戏ID
   * @returns 创建的收藏记录
   * @throws 可能抛出模型层的数据库异常
   */
  async addFavorite(userId: string, gameId: string): Promise<Favorite> {
    try {
      // 检查游戏是否存在（可选，如果需要可以添加）
      // const game = await gameModel.findById(gameId);
      // if (!game) {
      //   throw new NotFoundError('游戏不存在');
      // }

      const favoriteInput: FavoriteCreateInput = {
        userId,
        gameId
      };

      const favorite = await favoriteModel.favorite(favoriteInput);
      logger.info(`用户 ${userId} 收藏了游戏 ${gameId}`);

      return favorite;
    } catch (error) {
      logger.error('添加收藏失败:', error);
      throw error;
    }
  }

  /**
   * 取消收藏
   * 用户取消对指定游戏的收藏。
   * @param userId - 用户ID
   * @param gameId - 游戏ID
   * @returns 取消操作是否成功
   */
  async removeFavorite(userId: string, gameId: string): Promise<boolean> {
    try {
      const result = await favoriteModel.unfavorite(userId, gameId);
      if (result) {
        logger.info(`用户 ${userId} 取消收藏游戏 ${gameId}`);
      }
      return result;
    } catch (error) {
      logger.error('取消收藏失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已收藏指定游戏
   * @param userId - 用户ID
   * @param gameId - 游戏ID
   * @returns 已收藏返回 true，否则返回 false
   */
  async checkFavoriteStatus(userId: string, gameId: string): Promise<boolean> {
    try {
      return await favoriteModel.hasFavorited(userId, gameId);
    } catch (error) {
      logger.error('检查收藏状态失败:', error);
      throw error;
    }
  }

  /**
   * 批量检查收藏状态
   * 一次查询多个游戏的收藏状态，减少数据库查询次数。
   * @param userId - 用户ID
   * @param gameIds - 游戏ID列表
   * @returns 以游戏ID为键、收藏状态为值的映射表
   */
  async batchCheckFavoriteStatus(userId: string, gameIds: string[]): Promise<Record<string, boolean>> {
    try {
      if (gameIds.length === 0) {
        return {};
      }
      return await favoriteModel.getBatchFavoriteStatus(userId, gameIds);
    } catch (error) {
      logger.error('批量检查收藏状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的收藏列表
   * 支持分页、排序等查询选项。
   * @param userId - 用户ID
   * @param options - 查询选项（分页、排序字段和方向）
   * @returns 用户收藏的游戏列表
   */
  async getUserFavorites(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: 'created_at' | 'game_id';
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<Favorite[]> {
    try {
      return await favoriteModel.getUserFavorites(userId, options);
    } catch (error) {
      logger.error('获取用户收藏列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定游戏的收藏数量
   * @param gameId - 游戏ID
   * @returns 收藏总数
   */
  async getGameFavoriteCount(gameId: string): Promise<number> {
    try {
      return await favoriteModel.getFavoriteCount(gameId);
    } catch (error) {
      logger.error('获取游戏收藏数失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的收藏总数量
   * @param userId - 用户ID
   * @returns 收藏总数
   */
  async getUserFavoriteCount(userId: string): Promise<number> {
    try {
      return await favoriteModel.getUserFavoriteCount(userId);
    } catch (error) {
      logger.error('获取用户收藏数量失败:', error);
      throw error;
    }
  }

  /**
   * 获取全站收藏统计信息
   * 包含总收藏数、被收藏最多的游戏列表和用户平均收藏数。
   * @returns 收藏统计信息
   */
  async getFavoriteStats(): Promise<{
    totalFavorites: number;
    topFavoritedGames: Array<{ gameId: string; count: number }>;
    averageFavoritesPerUser: number;
  }> {
    try {
      return await favoriteModel.getFavoriteStats();
    } catch (error) {
      logger.error('获取收藏统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户收藏的游戏ID列表
   * @param userId - 用户ID
   * @returns 收藏的游戏ID数组
   */
  async getUserFavoriteGameIds(userId: string): Promise<string[]> {
    try {
      return await favoriteModel.getUserFavoriteGameIds(userId);
    } catch (error) {
      logger.error('获取用户收藏游戏ID列表失败:', error);
      throw error;
    }
  }
}

/** 导出 FavoriteService 单例实例 */
export const favoriteService = new FavoriteService();
export default favoriteService;