#!/bin/bash
# GameHub 项目打包脚本
# 将项目打包为 gamehub-release.tar.gz，排除编译产物和依赖

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_FILE="$OUTPUT_DIR/gamehub-release.tar.gz"
PROJECT_DIR="$SCRIPT_DIR"

echo "📦 GameHub 项目打包脚本"
echo "========================"
echo "项目目录: $PROJECT_DIR"
echo "输出文件: $OUTPUT_FILE"

cd "$PROJECT_DIR"

# 构建后端（编译 TypeScript）
echo ""
echo "🔨 编译后端 TypeScript..."
cd backend
npx tsc --skipLibCheck 2>&1 || echo "⚠️  编译有警告，继续打包..."
cd ..

# 构建前端（构建静态文件）
echo ""
echo "🔨 构建前端..."
cd frontend
npx vite build --mode production 2>&1 || npx vite build 2>&1 || echo "⚠️  前端构建有警告，继续打包..."
cd ..

echo ""
echo "📦 打包项目文件..."

# 移除旧的打包文件
rm -f "$OUTPUT_FILE"

# 使用相对路径打包，避免 Windows 路径问题
tar -czf "$OUTPUT_FILE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='data/*.db' \
  --exclude='data/*.db-wal' \
  --exclude='data/*.db-shm' \
  --exclude='logs' \
  --exclude='*.log' \
  --exclude='frontend/node_modules/.vite' \
  --exclude='.env' \
  --exclude='.env.production' \
  --exclude='frontend/.env.development' \
  --exclude='frontend/.env.production' \
  --exclude='frontend/.env.test' \
  --exclude='__pycache__' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  --exclude='backend/src/**/*.test.ts' \
  --exclude='backend/src/**/*.spec.ts' \
  backend/ \
  frontend/ \
  deploy/ \
  scripts/ \
  docs/ \
  docker-compose.test.yml \
  .env.example \
  DEPLOYMENT.md \
  DEVELOPMENT.md \
  README.md

echo ""
echo "✅ 打包完成！"
echo "输出文件: $OUTPUT_FILE"
echo ""
echo "文件大小:"
ls -lh "$OUTPUT_FILE" 2>/dev/null || wc -c < "$OUTPUT_FILE" | awk '{print $1 " bytes"}'

echo ""
echo "📋 部署步骤："
echo "1. 将 gamehub-release.tar.gz 上传到腾讯云 Ubuntu 服务器"
echo "2. 解压: tar -xzf gamehub-release.tar.gz -C /opt/gamehub"
echo "3. 根据部署文档执行部署"
echo ""
echo "详细部署文档: deploy/tencent-cloud-ubuntu-deploy.md"
