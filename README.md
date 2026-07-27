# GameHub - 游戏库管理平台

## 项目概述
GameHub是一个统一的游戏库管理平台，支持多平台游戏集成和管理。

## 项目状态
- **启动时间**: 2026-03-31
- **当前阶段**: 研发计划制定和基础框架搭建
- **技术栈**: React + Node.js + PostgreSQL

## 目录结构
```
gamehub/
├── frontend/          # 前端代码（React）
├── backend/           # 后端代码（Node.js）
├── db/                # 数据库脚本和迁移
├── docs/              # 项目文档
├── scripts/           # 开发脚本
└── deploy/            # 部署配置
```

## 技术架构
### 前端
- **框架**: React 19+
- **状态管理**: React Hooks + Context API
- **UI库**: Ant Design + Tailwind CSS
- **构建工具**: Vite + TypeScript
- **路由**: React Router v7

### 后端
- **运行时**: Node.js 18+
- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL / SQLite / Redis (可配置)
- **实时通信**: Socket.IO
- **API风格**: RESTful + WebSocket
- **认证授权**: JWT + 中间件

### 数据库
- **主数据库**: PostgreSQL (默认) / SQLite / 内存数据库
- **缓存**: Redis (可配置)
- **数据访问**: 原生驱动 + 连接池

## 开发计划
### MVP版本（1-3个月）
1. 基础框架搭建
2. 用户系统（注册登录）
3. 游戏库扫描和展示
4. 基本游戏管理功能

### 版本1.0（3-6个月）
1. 多平台游戏集成
2. 游戏启动器功能
3. 社交和社区功能
4. 移动端适配

## 快速开始
```bash
# 1. 克隆项目
git clone <repository-url>
cd gamehub-2026

# 2. 安装依赖
cd frontend && npm install
cd ../backend && npm install

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 文件，根据需要修改配置

# 4. 启动开发服务器
# 终端1: 启动后端
cd backend && npm run dev

# 终端2: 启动前端  
cd frontend && npm run dev

# 5. 访问应用
# 前端: http://localhost:5173
# 后端API: http://localhost:3000
# API文档: http://localhost:3000/api-docs (开发环境)
```

## 🚀 并行开发与API联调

GameHub支持前后端并行开发，提高开发效率：

### 开发模式
- **Mock模式** (`VITE_USE_MOCK=true`): 前端使用模拟数据，无需后端服务
- **联调模式** (`VITE_USE_MOCK=false`): 前端连接真实后端API，进行集成测试

### 快速切换
```bash
# 开发时使用Mock数据（默认）
VITE_USE_MOCK=true

# 联调时使用真实API
VITE_USE_MOCK=false
```

### API契约优先
- API接口使用OpenAPI规范定义 (`backend/docs/swagger.yaml`)
- 前后端基于同一份API契约独立开发
- 自动生成API文档和Mock数据

### 开发工具
- 统一API客户端 (`frontend/src/api/`)
- Mock数据管理 (`frontend/src/data/mockData.ts`)
- 开发启动脚本 (`scripts/dev.bat` / `scripts/dev.sh`)

详细开发指南请参阅 [DEVELOPMENT.md](./DEVELOPMENT.md)

## 开发团队
- **产品经理**: [待分配]
- **前端开发**: [待分配]
- **后端开发**: [待分配]
- **UI/UX设计**: [待分配]
- **测试工程师**: [待分配]

## 相关文档
- [功能需求文档](./docs/requirements.md)
- [技术架构文档](./docs/architecture.md)
- [API接口文档](./docs/api.md)
- [部署指南](./docs/deployment.md)

## 许可证
[待确定]