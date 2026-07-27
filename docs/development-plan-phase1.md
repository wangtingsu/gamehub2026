# GameHub 功能扩展 - 第一阶段开发计划

## 概述

本计划描述了GameHub游戏平台功能扩展的第一阶段实施工作，重点实现基础游戏库功能。

## 第一阶段目标

**时间**: 1-2周  
**优先级**: 高  
**目标**: 实现用户游戏库的基础管理功能

### 核心功能
1. 用户游戏库的增删改查
2. 游戏库状态管理（愿望单、已拥有、正在玩等）
3. 平台拥有情况跟踪
4. 个人评分和笔记
5. 基础统计和搜索

## 已完成工作

### 1. 设计文档
- ✅ `game-data-model-design.md` - 统一游戏数据模型设计
- ✅ `gamehub-feature-implementation-summary.md` - 功能扩展实施总结
- ✅ `path-based-i18n-migration.md` - 多语言URL迁移方案

### 2. 类型定义
- ✅ 前端类型定义：`frontend/src/api/game-types.ts`
- ✅ 后端类型定义：`backend/src/types/game-types.ts`
- ✅ 集成到现有类型系统

### 3. 数据模型
- ✅ `UserGameLibraryModel` - 用户游戏库模型
- ✅ 数据库迁移脚本：`007_create_game_library_tables.sql`

### 4. 后端服务
- ✅ `game-library.service.ts` - 游戏库业务逻辑
- ✅ `game-library.routes.ts` - RESTful API端点
- ✅ 路由注册到主应用

### 5. 数据库迁移
- ✅ 创建了4个新表：
  - `user_game_library` - 用户游戏库
  - `game_sessions` - 游戏会话记录
  - `game_achievements` - 游戏成就
  - `user_achievements` - 用户成就解锁
- ✅ 添加了索引优化

## 待完成工作

### 1. 数据库迁移执行
- [ ] 运行迁移脚本：`007_create_game_library_tables.sql`
- [ ] 验证表结构创建成功
- [ ] 创建测试数据

### 2. 后端测试
- [ ] 单元测试：`UserGameLibraryModel`
- [ ] 单元测试：`game-library.service.ts`
- [ ] 集成测试：API端点
- [ ] 错误处理和边界情况测试

### 3. 前端开发

#### 3.1 游戏库页面组件
- [ ] `GameLibraryPage.tsx` - 游戏库主页面
- [ ] `GameLibraryItem.tsx` - 单个游戏库条目组件
- [ ] `AddToLibraryModal.tsx` - 添加到库模态框
- [ ] `LibraryStatsCard.tsx` - 统计卡片组件

#### 3.2 API集成
- [ ] 创建游戏库API Hook：`useGameLibrary`
- [ ] 集成到现有API客户端
- [ ] 错误处理和加载状态

#### 3.3 用户界面
- [ ] 游戏库状态筛选器
- [ ] 平台筛选器
- [ ] 搜索功能
- [ ] 排序选项
- [ ] 分页组件

### 4. 集成测试
- [ ] 端到端测试：完整的游戏库管理流程
- [ ] 性能测试：大数据量下的响应时间
- [ ] 兼容性测试：与现有功能的集成

## 技术细节

### API端点
```
GET    /api/v1/library           # 获取用户游戏库
GET    /api/v1/library/stats     # 获取游戏库统计
POST   /api/v1/library           # 添加游戏到库
PUT    /api/v1/library/:id       # 更新游戏库条目
DELETE /api/v1/library/:id       # 从库中移除游戏
GET    /api/v1/library/:id/details # 获取条目详情
POST   /api/v1/library/import    # 导入外部游戏库
POST   /api/v1/library/:gameId/last-played # 更新最后游玩时间
GET    /api/v1/library/batch-status # 批量获取库状态
```

### 数据库表结构

#### user_game_library
```sql
CREATE TABLE user_game_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  game_title TEXT NOT NULL,
  game_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'wishlist',
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_played_at TEXT,
  status_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  platforms TEXT DEFAULT '[]',
  personal_rating REAL,
  personal_notes TEXT,
  tags TEXT DEFAULT '[]',
  primary_platform TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

## 实施步骤

### 第1天：环境准备
1. 运行数据库迁移
2. 验证后端服务启动
3. 创建测试用户和游戏数据

### 第2-3天：后端完善
1. 完善错误处理
2. 添加输入验证
3. 编写单元测试
4. 性能优化（索引、缓存）

### 第4-6天：前端开发
1. 创建基础组件
2. 实现API集成
3. 构建用户界面
4. 添加状态管理

### 第7-8天：测试和优化
1. 集成测试
2. 性能测试
3. UI/UX优化
4. 错误处理改进

### 第9-10天：部署和监控
1. 生产环境部署
2. 监控设置
3. 用户反馈收集
4. 文档更新

## 风险与缓解

### 技术风险
1. **数据库性能**：游戏库可能包含大量数据
   - 缓解：添加适当的索引，分页查询，缓存策略

2. **API响应时间**：复杂查询可能较慢
   - 缓解：优化SQL查询，添加缓存，异步处理

3. **前端状态管理**：游戏库状态可能复杂
   - 缓解：使用React Query或Redux进行状态管理

### 业务风险
1. **用户接受度**：新功能可能不被用户接受
   - 缓解：用户测试，渐进式推出，收集反馈

2. **数据迁移**：现有用户数据迁移
   - 缓解：提供导入工具，保持向后兼容

## 成功标准

### 技术标准
- [ ] API响应时间 < 200ms (P95)
- [ ] 页面加载时间 < 2秒
- [ ] 错误率 < 1%
- [ ] 测试覆盖率 > 80%

### 业务标准
- [ ] 用户游戏库使用率 > 30%
- [ ] 平均每个用户添加游戏数 > 5
- [ ] 用户满意度评分 > 4/5
- [ ] 功能缺陷报告 < 5个/周

## 团队分工

### 后端开发
- 数据库迁移和维护
- API开发和测试
- 性能优化
- 监控和日志

### 前端开发
- 组件开发
- 用户界面设计
- 状态管理
- 用户体验优化

### 测试
- 单元测试
- 集成测试
- 性能测试
- 用户验收测试

### 运维
- 部署和发布
- 监控设置
- 故障排除
- 容量规划

## 下一步行动

### 立即行动
1. 评审本开发计划
2. 分配开发任务
3. 设置开发环境
4. 创建详细的技术任务清单

### 短期行动（本周）
1. 执行数据库迁移
2. 开始后端开发
3. 设计前端组件
4. 创建测试计划

### 长期行动（下阶段）
1. 游戏时间追踪功能
2. 成就系统
3. 社区功能
4. 跨平台同步

---

**文档版本**: 1.0  
**最后更新**: 2026-04-22  
**负责人**: 开发团队