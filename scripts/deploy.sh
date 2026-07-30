#!/bin/bash
# ============================================================
# GameHub 一键部署脚本
# 用法: bash ~/gamehub-2026/scripts/deploy.sh
# ============================================================
# set -e 已关闭，改用 run_with_spinner 的返回值判断，避免静默退出

APP_DIR=~/gamehub-2026
cd "$APP_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# 加载动画函数 — 后台运行，直到被 kill
spinner() {
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    while true; do
        for ((i=0; i<${#chars}; i++)); do
            printf "\r  ${CYAN}%s${NC} %s" "${chars:$i:1}" "$1"
            sleep 0.5
        done
    done
}

# 带加载动画执行命令
run_with_spinner() {
    local desc="$1"; shift
    spinner "$desc" &
    local spinner_pid=$!
    # 执行实际命令，捕获输出和状态
    local output
    if output=$("$@" 2>&1); then
        local status=0
    else
        local status=$?
    fi
    kill $spinner_pid 2>/dev/null
    wait $spinner_pid 2>/dev/null
    printf "\r\033[K"  # 清除旋转动画行
    if [ $status -eq 0 ]; then
        echo -e "  ${GREEN}✅${NC} $desc — 完成"
    else
        echo -e "  ${RED}❌${NC} $desc — 失败"
        echo "$output" | tail -5
    fi
    return $status
}

TOTAL_STEPS=6
CURRENT=0

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     🚀 GameHub 一键部署 v2.0           ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ========== 1. 拉取代码 ==========
CURRENT=$((CURRENT + 1))
echo -e "${BOLD}[${CURRENT}/${TOTAL_STEPS}]${NC} 📥 拉取最新代码..."
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    git stash 2>/dev/null || true
fi
if ! run_with_spinner "git pull" git pull origin main; then
    echo -e "  ${RED}无法拉取代码，请检查网络或git配置${NC}"
    exit 1
fi

# ========== 2. 编译后端 ==========
CURRENT=$((CURRENT + 1))
echo -e "${BOLD}[${CURRENT}/${TOTAL_STEPS}]${NC} 🔨 编译后端 TypeScript..."
sudo rm -rf "$APP_DIR/backend/dist" 2>/dev/null
run_with_spinner "npm build" bash -c "cd '$APP_DIR/backend' && npm run build"

# ========== 3. 重建 Docker 镜像 ==========
CURRENT=$((CURRENT + 1))
echo -e "${BOLD}[${CURRENT}/${TOTAL_STEPS}]${NC} 🐳 重建 Docker 镜像..."

# 3a. 主镜像
echo -e "   ${BLUE}├─ backend + admin-backend + frontend${NC}"
run_with_spinner "docker compose build" docker compose -f "$APP_DIR/docker-compose.yml" build --no-cache backend admin-backend frontend

# 3b. Admin 前端
echo -e "   ${BLUE}└─ admin-frontend${NC}"
run_with_spinner "admin docker build" bash -c "cd '$APP_DIR/frontend' && docker build -f admin.Dockerfile -t gamehub-admin-frontend ."

# ========== 4. 启动服务 ==========
CURRENT=$((CURRENT + 1))
echo -e "${BOLD}[${CURRENT}/${TOTAL_STEPS}]${NC} 🚀 启动服务..."

# 先清理死掉的容器，避免名字冲突
docker compose -f "$APP_DIR/docker-compose.yml" down --remove-orphans 2>/dev/null || true
for svc in postgres redis backend admin-backend frontend; do
    for cid in $(docker ps -a --filter name="gamehub-$svc" -q 2>/dev/null); do
        docker rm -f "$cid" 2>/dev/null || true
    done
done

run_with_spinner "docker compose up" docker compose -f "$APP_DIR/docker-compose.yml" up -d --force-recreate

# admin-frontend 容器（先清理同名容器，含已退出的）
docker stop gamehub-admin-frontend 2>/dev/null || true
docker rm -f gamehub-admin-frontend 2>/dev/null || true
for cid in $(docker ps -a --filter name=gamehub-admin-frontend -q); do
    docker rm -f "$cid" 2>/dev/null || true
done
run_with_spinner "admin-frontend 容器" bash -c "docker run -d --name gamehub-admin-frontend --network gamehub-network -p 127.0.0.1:8081:80 --restart unless-stopped gamehub-admin-frontend"

# ========== 5. SSL 证书 ==========
CURRENT=$((CURRENT + 1))
echo -e "${BOLD}[${CURRENT}/${TOTAL_STEPS}]${NC} 🔒 检查 SSL 证书..."
if command -v certbot &>/dev/null; then
    run_with_spinner "certbot renew" sudo certbot renew --quiet --no-self-upgrade || true
else
    echo -e "  ${YELLOW}⚠️${NC}  certbot 未安装，跳过"
fi

# ========== 6. 重载 Nginx ==========
CURRENT=$((CURRENT + 1))
echo -e "${BOLD}[${CURRENT}/${TOTAL_STEPS}]${NC} 🔄 重载 Nginx..."
run_with_spinner "nginx reload" bash -c "sudo nginx -t && sudo systemctl reload nginx"

# ========== 完成 ==========
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║     ✅ 全部完成！                       ║${NC}"
echo -e "${BOLD}${GREEN}║     🌐 https://www.gghubs.com           ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep gamehub
echo ""
