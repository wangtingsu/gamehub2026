#!/bin/bash
# GameHub 发布脚本 — 在服务器上执行
#
# 工作流程:
#   周一~周三 — 在测试环境验证:  ./release.sh test
#   周四       — 发布正式版本:    ./release.sh promote
#   随时       — 查看状态:        ./release.sh status
#
# 前置条件:
#   - 位于 /opt/gamehub-2026/gamehub-2026/frontend 目录
#   - 代码已更新到最新

set -euo pipefail

TEST_IMAGE="gamehub-frontend:test"
PROD_IMAGE="gamehub-2026-frontend"
TEST_CONTAINER="gamehub-frontend-test"
PROD_CONTAINER="gamehub-frontend"
TEST_PORT=8080
NGINX_TEST_CONF="/tmp/nginx-test.conf"

log() { echo -e "\e[1;32m[$(date +%H:%M:%S)]\e[0m $*"; }
err() { echo -e "\e[1;31m[ERROR]\e[0m $*" >&2; }

deploy_test() {
  log "===== 部署测试版本 (端口 $TEST_PORT) ====="

  # 1. 构建
  log "构建测试镜像..."
  docker build -t $TEST_IMAGE .

  # 2. 确保测试 nginx 配置存在
  if [ ! -f "$NGINX_TEST_CONF" ]; then
    err "缺少 $NGINX_TEST_CONF — 请从项目复制 nginx-test.conf"
    exit 1
  fi

  # 3. 重启测试容器
  log "启动测试容器..."
  docker stop $TEST_CONTAINER 2>/dev/null || true
  docker rm $TEST_CONTAINER 2>/dev/null || true
  docker run -d --name $TEST_CONTAINER --restart unless-stopped \
    -p $TEST_PORT:$TEST_PORT \
    -v $NGINX_TEST_CONF:/etc/nginx/nginx.conf:ro \
    --network gamehub-network \
    $TEST_IMAGE

  # 4. 验证
  sleep 3
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$TEST_PORT/ 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    log "✅ 测试版本就绪: http://43.128.56.249:$TEST_PORT"
  else
    err "❌ 测试版本异常 (HTTP $STATUS)"
    docker logs $TEST_CONTAINER --tail 20
    exit 1
  fi
}

promote() {
  log "===== 发布正式版本 ====="

  # 确认
  if [ "${1:-}" != "--force" ]; then
    echo ""
    echo -e "\e[1;33m⚠ 即将把测试版本提升为正式版本\e[0m"
    echo "   测试: http://43.128.56.249:$TEST_PORT"
    echo "   正式: https://www.gghubs.com"
    echo -n "确认继续？(yes/no): "
    read -r CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
      log "已取消"
      exit 0
    fi
  fi

  # 1. 标记版本
  TODAY=$(date +%Y%m%d)
  WEEK=$(date +%Y)-W$(date +%V)
  log "标记版本: $PROD_IMAGE:release-$TODAY ..."
  docker tag $TEST_IMAGE $PROD_IMAGE:latest
  docker tag $TEST_IMAGE $PROD_IMAGE:release-$TODAY

  # 2. 保留最近 5 个版本，清理旧的
  log "清理旧版本 (保留最近 5 个)..."
  docker images $PROD_IMAGE --format '{{.Tag}}' | grep '^release-' | sort -r | tail -n +6 | while read TAG; do
    docker rmi "$PROD_IMAGE:$TAG" 2>/dev/null || true
  done

  # 3. 替换生产容器
  log "替换生产容器..."
  docker stop $PROD_CONTAINER && docker rm $PROD_CONTAINER
  docker run -d --name $PROD_CONTAINER --restart unless-stopped \
    -p 80:80 -p 443:443 \
    -v /etc/letsencrypt/live/www.gghubs.com/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro \
    -v /etc/letsencrypt/live/www.gghubs.com/privkey.pem:/etc/nginx/ssl/privkey.pem:ro \
    --network gamehub-network \
    $PROD_IMAGE:latest

  # 4. 验证
  sleep 3
  STATUS=$(curl -sk -o /dev/null -w '%{http_code}' https://localhost/ 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    log "✅ 正式版本发布成功！https://www.gghubs.com"
    log "   版本标签: release-$TODAY (第 $(date +%V) 周发布)"
  else
    err "❌ 正式版本异常 (HTTP $STATUS)"
    docker logs $PROD_CONTAINER --tail 20
    exit 1
  fi
}

show_status() {
  echo ""
  echo "========== GameHub 部署状态 =========="
  echo ""
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep gamehub
  echo ""
  echo -e "  \e[1;36m测试:\e[0m  http://43.128.56.249:$TEST_PORT"
  echo -e "  \e[1;36m正式:\e[0m  https://www.gghubs.com"
  echo ""
  echo "最近发布的正式版本:"
  docker images $PROD_IMAGE --format 'table {{.Tag}}\t{{.CreatedAt}}' | head -6
  echo ""
}

case "${1:-help}" in
  test)
    deploy_test
    ;;
  promote)
    promote "${2:-}"
    ;;
  status)
    show_status
    ;;
  *)
    echo "用法: $0 {test|promote|status}"
    echo ""
    echo "  test      构建并部署测试版本到端口 $TEST_PORT"
    echo "  promote   将测试版本提升为正式版本（建议周四执行）"
    echo "  status    查看当前部署状态"
    echo ""
    echo "工作流程:"
    echo "  1. 更新代码 → ./release.sh test    (部署到测试环境)"
    echo "  2. 验证功能 → http://43.128.56.249:$TEST_PORT"
    echo "  3. 周四发布 → ./release.sh promote  (提升为正式版本)"
    exit 1
    ;;
esac
