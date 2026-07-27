/**
 * Favorite Service 单元测试
 *
 * 测试范围：favoriteService 的各公开方法
 * - addFavorite         添加收藏（成功 / 重复收藏抛 ConflictError）
 * - removeFavorite      取消收藏
 * - checkFavoriteStatus 检查收藏状态（已收藏 / 未收藏）
 *
 * 所有 Model 操作通过 jest.mock 隔离。
 */

import { favoriteModel } from '../../../src/models/Favorite';
import { ConflictError, NotFoundError } from '../../../src/middlewares/error.middleware';

// ================================================================
// Mock 依赖
// ================================================================
jest.mock('../../../src/models/Favorite');
jest.mock('../../../src/utils/logger');

const mockedFavoriteModel = favoriteModel as jest.Mocked<typeof favoriteModel>;

/* ================================================================
 *  Favorite Service 单元测试
 * ================================================================ */
describe('Favorite Service 单元测试', () => {
  const mockUserId = '1';
  const mockGameId = 'game-1';
  const mockFavorite = {
    id: 'fav-1',
    userId: mockUserId,
    gameId: mockGameId,
    createdAt: new Date().toISOString(),
    deletedAt: null,
    version: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------------------------------------
   *  addFavorite
   * -------------------------------------------------------------- */
  describe('addFavorite', () => {

    it('应该成功添加收藏并返回收藏记录', async () => {
      mockedFavoriteModel.favorite.mockResolvedValue(mockFavorite);

      const { favoriteService } = await import('../../../src/services/favorite.service');
      const result = await favoriteService.addFavorite(mockUserId, mockGameId);

      expect(mockedFavoriteModel.favorite).toHaveBeenCalledWith({
        userId: mockUserId,
        gameId: mockGameId,
      });
      expect(result).toEqual(mockFavorite);
    });

    it('当收藏已存在时应传播 ConflictError', async () => {
      mockedFavoriteModel.favorite.mockRejectedValue(new ConflictError('已收藏'));

      const { favoriteService } = await import('../../../src/services/favorite.service');
      await expect(favoriteService.addFavorite(mockUserId, mockGameId)).rejects.toThrow(ConflictError);
    });
  });

  /* --------------------------------------------------------------
   *  removeFavorite
   * -------------------------------------------------------------- */
  describe('removeFavorite', () => {

    it('应该成功取消收藏', async () => {
      mockedFavoriteModel.unfavorite.mockResolvedValue(true);

      const { favoriteService } = await import('../../../src/services/favorite.service');
      const result = await favoriteService.removeFavorite(mockUserId, mockGameId);

      expect(mockedFavoriteModel.unfavorite).toHaveBeenCalledWith(mockUserId, mockGameId);
      expect(result).toBe(true);
    });
  });

  /* --------------------------------------------------------------
   *  checkFavoriteStatus
   * -------------------------------------------------------------- */
  describe('checkFavoriteStatus', () => {

    it('已收藏时应返回 true', async () => {
      mockedFavoriteModel.hasFavorited.mockResolvedValue(true);

      const { favoriteService } = await import('../../../src/services/favorite.service');
      const result = await favoriteService.checkFavoriteStatus(mockUserId, mockGameId);

      expect(mockedFavoriteModel.hasFavorited).toHaveBeenCalledWith(mockUserId, mockGameId);
      expect(result).toBe(true);
    });

    it('未收藏时应返回 false', async () => {
      mockedFavoriteModel.hasFavorited.mockResolvedValue(false);

      const { favoriteService } = await import('../../../src/services/favorite.service');
      const result = await favoriteService.checkFavoriteStatus(mockUserId, mockGameId);

      expect(result).toBe(false);
    });
  });
});
