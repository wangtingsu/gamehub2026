#!/bin/bash
# GameHub Ubuntu 一键部署脚本（在服务器上执行）
set -e

APP_DIR="/var/www/gamehub"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "========================"
echo "🚀 GameHub Ubuntu 部署脚本"
echo "========================"
echo ""

# 参数：可指定目录，默认为当前目录
DEPLOY_SOURCE_DIR="${1:-.}"
cd "$DEPLOY_SOURCE_DIR"

# 检查是否为项目根目录
if [ ! -f "backend/package.json" ] || [ ! -f "frontend/package.json" ]; then
  echo "❌ 错误：请在 GameHub 项目根目录执行此脚本"
  echo "用法: bash deploy/ubuntu-deploy.sh [项目目录]"
  exit 1
fi

echo "📂 源目录: $(pwd)"
echo "🎯 目标目录: $APP_DIR"
echo ""

# 1. 复制文件到目标目录
echo "📁 复制文件到 $APP_DIR ..."
sudo mkdir -p "$APP_DIR"
sudo cp -r . "$APP_DIR"
sudo chown -R ubuntu:ubuntu "$APP_DIR"

# 2. 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd "$BACKEND_DIR"
npm ci --omit=dev --legacy-peer-deps || npm install --production --legacy-peer-deps

# 3. 构建后端
echo ""
echo "🔨 构建后端..."
if [ -f "dist/index.js" ]; then
  echo "  后端已编译，跳过构建"
else
  npm run build
fi

# 4. 配置 .env
echo ""
if [ ! -f ".env" ]; then
  if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "⚠️  已从 .env.production 创建 .env，请检查以下配置项："
  elif [ -f "../.env.example" ]; then
    cp ../.env.example .env
    echo "⚠️  已从 .env.example 创建 .env，请检查以下配置项："
  fi
  echo "   - JWT_SECRET     → 修改为随机字符串"
  echo "   - JWT_REFRESH_SECRET → 修改为随机字符串"
  echo "   - ADMIN_PASSWORD → 设置管理员密码"
fi

# 5. 创建必要目录
mkdir -p data logs

# 6. 安装前端依赖并构建
echo ""
echo "📦 安装前端依赖..."
cd "$FRONTEND_DIR"
npm ci --legacy-peer-deps || npm install --legacy-peer-deps

echo ""
echo "🔨 构建前端..."
npm run build 2>/dev/null || npx vite build

# 7. 启动后端（PM2）
echo ""
echo "🚀 启动后端服务 (PM2)..."
cd "$BACKEND_DIR"
pm2 start dist/index.js --name gamehub-backend --update-env 2>/dev/null || \
  pm2 restart gamehub-backend --update-env 2>/dev/null || {
  echo "⚠️  PM2 未安装，尝试全局安装..."
  npm install -g pm2
  pm2 start dist/index.js --name gamehub-backend
}
pm2 save

# 8. 检查 Nginx
echo ""
echo "🔍 检查 Nginx 配置..."
if command -v nginx &> /dev/null; then
  if [ -f "/etc/nginx/sites-available/gamehub" ]; then
    echo "  Nginx 配置已存在: /etc/nginx/sites-available/gamehub"
    sudo nginx -t && sudo systemctl reload nginx
  else
    echo "⚠️  Nginx 配置文件未找到，请手动创建："
    echo "   deploy/tencent-cloud-ubuntu-deploy.md 中的 Nginx 配置"
  fi
else
  echo "⚠️  Nginx 未安装，请先安装：sudo apt install -y nginx"
fi

# 9. 验证
echo ""
echo "=============================="
echo "✅ 部署完成！"
echo "=============================="
echo ""
echo "📊 后端进程状态:"
pm2 status gamehub-backend 2>/dev/null || echo "  PM2 未运行"
echo ""
echo "📡 服务地址:"
echo "   后端 API: http://localhost:3001"
echo "   前端页面: http://localhost"
echo ""
echo "📋 后续操作:"
echo "   1. 检查后端 .env 配置: $BACKEND_DIR/.env"
echo "   2. 配置 Nginx（参考部署文档）"
echo "   3. 配置 HTTPS（Certbot 或腾讯云 SSL）"
echo "   4. 查看日志: pm2 logs gamehub-backend"
echo ""
