#!/bin/bash

echo "启动GameHub后端服务..."
cd "$(dirname "$0")"

# 检查端口是否被占用
if lsof -i :3001 > /dev/null 2>&1; then
    echo "端口3001已被占用，尝试停止现有进程..."
    pkill -f "node.*dist/index.js" 2>/dev/null
    sleep 1
fi

# 启动服务
echo "正在启动服务..."
node dist/index.js &

# 等待启动
sleep 3

# 检查服务状态
echo "检查服务状态..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功！"
    echo "访问地址:"
    echo "  - 根路径: http://localhost:3001/"
    echo "  - 健康检查: http://localhost:3001/health"
    echo "  - API: http://localhost:3001/api/v1/games"
else
    echo "❌ 服务启动失败"
    echo "请检查日志: logs/app.log"
fi