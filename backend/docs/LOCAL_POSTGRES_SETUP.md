# 本地开发：统一使用 PostgreSQL

本地开发环境现已与生产一致，统一使用 PostgreSQL（`DB_TYPE=postgres`）。
启动后端前，需要本机先有一个 PostgreSQL 实例（监听 5432 端口）。

## 前置条件

本机需先装好 PostgreSQL（Docker Desktop 或原生安装，二选一）。

### 方案 A：Docker Desktop（推荐，与生产完全一致）

生产环境用的是 `postgres:16-alpine` 镜像，本地用同一镜像可保证 100% 一致。

1. 安装 Docker Desktop（Windows）。
2. 在仓库根目录启动数据库和缓存容器：

   ```bash
   docker compose up -d postgres redis
   ```

   - PostgreSQL 映射到 `127.0.0.1:5432`，库 `gamehub`，用户 `gamehub`，密码 `gamehub_password`
   - Redis 映射到 `127.0.0.1:6379`（可选，本地 `ENABLE_CACHING=false` 时非必需）

### 方案 B：本机安装 PostgreSQL

1. 从 https://www.postgresql.org/download/windows/ 安装 PostgreSQL 16。
2. 创建与 docker-compose 凭据一致的数据库和用户：

   ```sql
   CREATE USER gamehub WITH PASSWORD 'gamehub_password';
   CREATE DATABASE gamehub OWNER gamehub;
   ```

## 启动后端

`backend/.env` 已配置为 PostgreSQL（`localhost:5432`）。直接：

```bash
cd backend
npm run dev
```

首次启动时后端会自动执行 `runMigrations()`，创建全部 64 张表（与生产相同 schema），
无需手动迁移。

## 说明

- 旧 SQLite 数据（`backend/data/gamehub.db`）不再使用，可保留备份或删除。
- 测试环境（`test/setup.ts`）仍显式使用 SQLite 内存库，不受影响。
- 生产环境仍由 `docker-compose.yml` 注入 `DB_TYPE=postgres`，本地与线上 schema 完全一致，
  从根源上杜绝「本地 SQLite / 线上 PostgreSQL」方言不一致导致的 bug。
