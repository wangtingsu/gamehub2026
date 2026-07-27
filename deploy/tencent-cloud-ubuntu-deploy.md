# GameHub 腾讯云 Ubuntu 部署方案

## 1. 环境概览

| 项目 | 说明 |
|------|------|
| 云厂商 | 腾讯云 |
| 操作系统 | Ubuntu 22.04 LTS |
| 后端 | Node.js 20 + Express + TypeScript |
| 前端 | React 18 + Vite + Nginx |
| 数据库 | SQLite（开发）/ PostgreSQL（生产推荐） |
| 进程管理 | PM2 |
| 反向代理 | Nginx |

---

## 2. 服务器初始化

### 2.1 登录服务器

```bash
ssh ubuntu@<服务器公网IP>
```

### 2.2 系统更新与基础工具

```bash
# 系统更新
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git unzip tar gcc g++ make
```

### 2.3 安装 Node.js 20

```bash
# 使用 NodeSource 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node -v   # 应输出 v20.x
npm -v    # 应输出 10.x
```

### 2.4 安装 PM2（进程管理）

```bash
npm install -g pm2

# 验证
pm2 -v

# 设置 PM2 开机自启
pm2 startup
```

### 2.5 安装 Nginx

```bash
sudo apt install -y nginx

# 验证
nginx -v

# 启动并开机自启
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.6 配置安全组（腾讯云控制台）

在腾讯云控制台 → 安全组中放行以下端口：

| 端口 | 协议 | 用途 |
|------|------|------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP |
| 443 | TCP/UDP | HTTPS/HTTP3 |
| 3001 | TCP | 后端 API（内部或白名单） |

---

## 3. 项目部署

### 3.1 创建项目目录

```bash
sudo mkdir -p /var/www/gamehub
sudo chown -R ubuntu:ubuntu /var/www/gamehub
cd /var/www/gamehub
```

### 3.2 上传项目文件

从本地将打包好的项目上传到服务器：

```bash
# 本地执行（在项目根目录）
scp -r gamehub-2026 ubuntu@<服务器IP>:/var/www/gamehub/
```

或者使用 rsync（更高效）：

```bash
# 本地执行
rsync -avz --progress gamehub-2026/ ubuntu@<服务器IP>:/var/www/gamehub/
```

### 3.3 后端部署

```bash
cd /var/www/gamehub/backend

# 安装依赖
npm ci --omit=dev --legacy-peer-deps

# 编译 TypeScript
npm run build

# 配置环境变量
cp .env.production .env
# 编辑 .env 文件，修改以下配置：
# - JWT_SECRET: 修改为随机字符串
# - JWT_REFRESH_SECRET: 修改为随机字符串
# - DB_PATH: 数据库路径
```

**必改环境变量（.env）：**

```properties
NODE_ENV=production
PORT=3001
JWT_SECRET=<生成随机字符串，如 openssl rand -hex 32>
JWT_REFRESH_SECRET=<生成随机字符串>
ADMIN_PASSWORD=<修改管理员密码>
```

### 3.4 前端部署

```bash
cd /var/www/gamehub/frontend

# 安装依赖
npm ci --legacy-peer-deps

# 构建前端
npm run build   # 或使用：npx vite build

# 构建产物在 dist/ 目录
```

### 3.5 配置 Nginx 反向代理

创建 Nginx 配置：

```bash
sudo nano /etc/nginx/sites-available/gamehub
```

```nginx
server {
    listen 80;
    server_name <你的域名或IP>;

    # 前端静态文件
    root /var/www/gamehub/frontend/dist;
    index index.html;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
    }

    # SPA 路由：所有非 API 请求返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/gamehub /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 3.6 使用 PM2 启动后端

```bash
cd /var/www/gamehub/backend

# 启动后端
pm2 start dist/index.js --name gamehub-backend

# 保存 PM2 进程列表（开机自启）
pm2 save

# 查看状态
pm2 status
pm2 logs gamehub-backend
```

---

## 4. HTTPS 配置（腾讯云 SSL 证书）

### 4.1 方案一：使用 Certbot（Let's Encrypt）

```bash
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（需要域名已解析到服务器）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 4.2 方案二：使用腾讯云 SSL 证书

1. 在腾讯云控制台 → SSL 证书 → 申请免费证书
2. 下载 Nginx 版证书
3. 上传到服务器并配置 Nginx

```bash
# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 上传证书文件到 /etc/nginx/ssl/（本地执行）
scp cert.pem ubuntu@<IP>:/etc/nginx/ssl/
scp key.pem ubuntu@<IP>:/etc/nginx/ssl/

# 更新 Nginx 配置添加 HTTPS
sudo nano /etc/nginx/sites-available/gamehub
```

添加 HTTPS server 块：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # ... 其他配置同上 ...
}
```

---

## 5. PostgreSQL 数据库（可选，推荐生产使用）

```bash
# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 启动
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 创建数据库和用户
sudo -u postgres psql -c "CREATE USER gamehub WITH PASSWORD 'strong-password';"
sudo -u postgres psql -c "CREATE DATABASE gamehub OWNER gamehub;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gamehub TO gamehub;"
```

更新后端 .env：

```properties
DB_TYPE=postgres
DATABASE_URL=postgresql://gamehub:strong-password@localhost:5432/gamehub
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gamehub
DB_USER=gamehub
DB_PASSWORD=strong-password
```

---

## 6. 监控与维护

### 6.1 PM2 常用命令

```bash
pm2 status                  # 查看进程状态
pm2 logs gamehub-backend    # 查看日志
pm2 restart gamehub-backend # 重启
pm2 stop gamehub-backend    # 停止
pm2 delete gamehub-backend  # 删除进程
pm2 monit                   # 监控面板
```

### 6.2 日志管理

```bash
# 后端日志
tail -f /var/www/gamehub/backend/logs/app.log

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 6.3 更新部署

```bash
cd /var/www/gamehub

# 拉取新代码
git pull  # 或重新上传文件

# 更新后端
cd backend && npm ci --omit=dev && npm run build && pm2 restart gamehub-backend

# 更新前端
cd ../frontend && npm ci && npm run build
```

---

## 7. 防火墙配置（UFW）

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw --force enable
sudo ufw status
```

---

## 8. 快速部署脚本

将以下内容保存为 `deploy/ubuntu-deploy.sh`：

```bash
#!/bin/bash
set -e

echo "🚀 GameHub Ubuntu 部署脚本"
echo "============================"

# 配置
APP_DIR="/var/www/gamehub"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# 1. 安装依赖
echo "📦 安装依赖..."
cd $BACKEND_DIR && npm ci --omit=dev --legacy-peer-deps
cd $FRONTEND_DIR && npm ci --legacy-peer-deps

# 2. 构建
echo "🔨 构建项目..."
cd $BACKEND_DIR && npm run build
cd $FRONTEND_DIR && npm run build

# 3. 确保数据库目录存在
mkdir -p $BACKEND_DIR/data $BACKEND_DIR/logs

# 4. 复制 .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp $BACKEND_DIR/.env.production $BACKEND_DIR/.env
    echo "⚠️  请编辑 $BACKEND_DIR/.env 配置环境变量"
fi

# 5. 启动后端（PM2）
echo "🚀 启动后端服务..."
cd $BACKEND_DIR
pm2 start dist/index.js --name gamehub-backend --update-env 2>/dev/null || \
    pm2 restart gamehub-backend --update-env
pm2 save

# 6. 验证
echo "✅ 部署完成！"
echo ""
echo "后端状态:"
pm2 status gamehub-backend
echo ""
echo "Nginx 状态:"
sudo systemctl status nginx --no-pager | head -3
```

```bash
chmod +x deploy/ubuntu-deploy.sh
```

---

## 9. 常见问题排查

### 后端无法启动
```bash
# 检查 Node.js 版本
node -v   # 需要 >= 18

# 检查端口占用
sudo lsof -i :3001

# 查看详细日志
cd /var/www/gamehub/backend
pm2 logs gamehub-backend
```

### 前端 404
```bash
# 检查 Nginx root 配置是否正确
# root 应指向 frontend/dist

# 检查 SPA 路由配置
# location / 必须有 try_files $uri $uri/ /index.html;
```

### 数据库问题
```bash
# 检查 SQLite 文件权限
ls -la /var/www/gamehub/backend/data/
sudo chown -R ubuntu:ubuntu /var/www/gamehub/backend/data

# PostgreSQL：检查连接
psql -U gamehub -d gamehub -h localhost
```

### 502 Bad Gateway
```bash
# 后端未启动
pm2 status

# Nginx 代理配置错误
sudo nginx -t
```
