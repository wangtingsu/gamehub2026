#!/bin/bash

# GameHub 开发环境启动脚本
# 同时启动前端和后端开发服务器

set -e  # 遇到错误退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "命令 '$1' 未找到，请先安装"
        exit 1
    fi
}

# 检查目录是否存在
check_directory() {
    if [ ! -d "$1" ]; then
        log_error "目录 '$1' 不存在"
        exit 1
    fi
}

# 清理函数
cleanup() {
    log_info "正在关闭开发服务器..."
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    log_success "开发服务器已关闭"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    log_info "🎮 启动 GameHub 开发环境..."

    # 检查必要命令
    check_command node
    check_command npm

    # 检查项目目录
    check_directory "backend"
    check_directory "frontend"

    # 检查依赖是否安装
    if [ ! -d "backend/node_modules" ]; then
        log_warning "后端依赖未安装，正在安装..."
        (cd backend && npm install)
    fi

    if [ ! -d "frontend/node_modules" ]; then
        log_warning "前端依赖未安装，正在安装..."
        (cd frontend && npm install)
    fi

    # 启动后端服务器
    log_info "启动后端服务器 (http://localhost:3000)..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..

    # 等待后端启动
    log_info "等待后端服务器启动..."
    sleep 3

    # 检查后端健康状态
    if curl -s http://localhost:3000/health > /dev/null; then
        log_success "后端服务器启动成功"
    else
        log_warning "后端服务器可能启动较慢，继续启动前端..."
    fi

    # 启动前端服务器
    log_info "启动前端开发服务器 (http://localhost:5173)..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    # 等待前端启动
    log_info "等待前端开发服务器启动..."
    sleep 5

    log_success "🎉 GameHub 开发环境启动完成!"
    log_info ""
    log_info "🌐 访问地址:"
    log_info "  前端: http://localhost:5173"
    log_info "  后端API: http://localhost:3000"
    log_info "  API文档: http://localhost:3000/api-docs"
    log_info ""
    log_info "📝 开发模式:"
    log_info "  前端当前使用: ${YELLOW}$(grep VITE_USE_MOCK frontend/.env.development | cut -d'=' -f2)${NC} 模式"
    log_info "  (Mock模式使用模拟数据，真实API模式连接后端服务)"
    log_info ""
    log_info "🔄 切换开发模式:"
    log_info "  编辑 frontend/.env.development 修改 VITE_USE_MOCK"
    log_info ""
    log_info "🛑 按 Ctrl+C 停止所有服务"
    log_info ""

    # 显示前端服务器日志
    log_info "前端服务器日志:"
    tail -f frontend/node_modules/.vite.log 2>/dev/null || echo "等待日志文件生成..."

    # 等待子进程
    wait
}

# 运行主函数
main "$@"