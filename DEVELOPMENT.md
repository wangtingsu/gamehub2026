# GameHub 开发指南

## 并行开发与API联调

本项目支持前后端并行开发，通过以下机制实现：

1. **API契约优先**：使用OpenAPI/Swagger定义API接口
2. **Mock数据支持**：前端开发时可使用Mock数据
3. **环境配置切换**：通过环境变量切换Mock/真实API
4. **热重载开发**：前后端独立开发服务器

## 环境要求

- Node.js 18+
- npm 9+
- Git

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置环境变量

```bash
# 后端环境变量（已预配置）
cp backend/.env.example backend/.env  # 如果.env不存在

# 前端环境变量（已预配置）
# .env.development - 开发环境
# .env.production - 生产环境
```

### 3. 启动开发服务器

#### 方案A：分别启动（推荐）

```bash
# 终端1 - 启动后端
cd backend
npm run dev

# 终端2 - 启动前端
cd frontend
npm run dev
```

#### 方案B：使用开发脚本

```bash
# 运行开发脚本（如果存在）
./scripts/dev.sh
```

## 开发工作流

### 前端开发（使用Mock数据）

1. 设置 `VITE_USE_MOCK=true`（默认）
2. 启动前端开发服务器
3. 前端使用Mock API客户端，无需后端服务
4. 所有API调用返回预定义的Mock数据

### 前后端联调

1. 设置 `VITE_USE_MOCK=false`
2. 同时启动前后端开发服务器
3. 前端调用真实后端API
4. 实时调试和测试API接口

### API开发流程

1. **定义API接口**：更新 `backend/docs/swagger.yaml`
2. **实现后端接口**：在相应路由文件中实现
3. **更新Mock数据**：更新 `frontend/src/data/mockData.ts`
4. **前端集成**：使用 `frontend/src/api` 客户端调用

## API文档

启动后端服务器后，访问API文档：
- Swagger UI: http://localhost:3000/api-docs
- API基础URL: http://localhost:3000/api/v1

## 项目结构

```
gamehub-2026/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── routes/         # API路由
│   │   ├── services/       # 业务逻辑
│   │   ├── middlewares/    # 中间件
│   │   └── db/            # 数据库
│   ├── docs/
│   │   └── swagger.yaml   # API文档
│   └── package.json
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── api/           # API客户端
│   │   │   ├── client.ts  # 真实API客户端
│   │   │   ├── mockClient.ts # Mock客户端
│   │   │   └── index.ts   # API服务工厂
│   │   ├── data/
│   │   │   └── mockData.ts # Mock数据
│   │   └── pages/         # 页面组件
│   └── package.json
└── docs/                   # 项目文档
```

## API客户端使用

### 基本使用

```typescript
import apiService from './api';

// 获取游戏列表
const games = await apiService.getGames({
  page: 1,
  limit: 20,
  search: '赛博'
});

// 用户登录
const result = await apiService.login({
  email: 'user@example.com',
  password: 'password123'
});
```

### 切换Mock/真实模式

```typescript
import { ApiServiceFactory } from './api';

// 使用Mock模式
const mockService = ApiServiceFactory.createService(true);

// 使用真实API模式
const realService = ApiServiceFactory.createService(false, {
  baseURL: 'http://localhost:3000/api/v1'
});
```

### 环境变量配置

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCK=true  # 开发时使用Mock数据
VITE_DEBUG=true

# .env.production
VITE_API_BASE_URL=https://api.gamehub.com/api/v1
VITE_USE_MOCK=false  # 生产环境使用真实API
VITE_DEBUG=false
```

## 开发技巧

### 1. 快速切换开发模式

```bash
# 临时使用真实API（覆盖环境变量）
VITE_USE_MOCK=false npm run dev

# 临时使用特定API地址
VITE_API_BASE_URL=http://localhost:3000/api/v1 VITE_USE_MOCK=false npm run dev
```

### 2. 查看API请求

- 前端：浏览器开发者工具 → Network标签
- 后端：控制台输出请求日志
- Mock模式：前端控制台输出模拟请求信息

### 3. 调试API响应

```typescript
try {
  const response = await apiService.getGames();
  console.log('API响应:', response);
} catch (error) {
  console.error('API错误:', error);
  // 错误处理
}
```

## 常见问题

### Q: 前端无法连接到后端API
- 检查后端服务是否运行：`http://localhost:3000/health`
- 检查CORS配置：后端 `.env` 中的 `CORS_ORIGIN`
- 检查API基地址：前端 `.env.development` 中的 `VITE_API_BASE_URL`

### Q: Mock数据不更新
- 检查 `frontend/src/data/mockData.ts` 是否已更新
- 重启前端开发服务器
- 清除浏览器缓存

### Q: Swagger文档无法访问
- 检查后端是否运行在开发模式（`NODE_ENV=development`）
- 检查 `backend/docs/swagger.yaml` 文件是否存在
- 查看后端日志中的警告信息

### Q: 如何添加新的API接口
1. 在 `backend/docs/swagger.yaml` 中定义接口
2. 在 `backend/src/routes/` 中实现路由
3. 在 `frontend/src/data/mockData.ts` 中添加Mock数据
4. 在 `frontend/src/api/mockClient.ts` 中实现Mock响应
5. 在 `frontend/src/api/index.ts` 中添加服务方法

## 开发约定

### 分支策略
- `main`: 生产环境代码
- `develop`: 开发环境代码
- `feature/*`: 功能开发分支
- `fix/*`: 问题修复分支

### 提交规范
- `feat`: 新功能
- `fix`: 问题修复
- `docs`: 文档更新
- `refactor`: 代码重构
- `test`: 测试相关

### 代码风格
- TypeScript严格模式
- ESLint + Prettier代码格式化
- 组件使用函数式组件和React Hooks
- API响应统一格式

## 下一步

- [ ] 添加单元测试
- [ ] 配置CI/CD流水线
- [ ] 添加E2E测试
- [ ] 优化打包配置
- [ ] 添加性能监控