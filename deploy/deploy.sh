#!/bin/bash
set -e

# 部署脚本示例
# 此脚本应在CI/CD流水线的部署阶段执行
# 需要设置以下环境变量：
# - DEPLOY_SSH_HOST: 部署服务器地址
# - DEPLOY_SSH_USER: SSH用户名
# - DEPLOY_SSH_KEY: SSH私钥
# - DOCKERHUB_USERNAME: DockerHub用户名
# - DOCKERHUB_TOKEN: DockerHub访问令牌

echo "🚀 开始部署 GameHub..."

# 检查必需的环境变量
required_vars=("DEPLOY_SSH_HOST" "DEPLOY_SSH_USER" "DEPLOY_SSH_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ 错误: 环境变量 $var 未设置"
    exit 1
  fi
done

# 创建SSH密钥文件
SSH_KEY_FILE="$(mktemp)"
echo "$DEPLOY_SSH_KEY" > "$SSH_KEY_FILE"
chmod 600 "$SSH_KEY_FILE"

# 部署函数
deploy_to_server() {
  local ssh_host="$1"
  local ssh_user="$2"
  local ssh_key="$3"

  echo "📦 部署到服务器: ${ssh_user}@${ssh_host}"

  # 通过SSH执行部署命令
  ssh -i "$ssh_key" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "${ssh_user}@${ssh_host}" "
    set -e
    echo '🔧 在远程服务器上执行部署命令...'

    # 拉取最新的Docker镜像
    docker pull ${DOCKERHUB_USERNAME:-gamehub}/gamehub-backend:latest || echo '⚠️ 无法拉取后端镜像'
    docker pull ${DOCKERHUB_USERNAME:-gamehub}/gamehub-frontend:latest || echo '⚠️ 无法拉取前端镜像'

    # 创建docker-compose.yml文件
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: ${DOCKERHUB_USERNAME:-gamehub}/gamehub-backend:latest
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped

  frontend:
    image: ${DOCKERHUB_USERNAME:-gamehub}/gamehub-frontend:latest
    ports:
      - '80:80'
    restart: unless-stopped
EOF

    # 启动服务
    docker-compose up -d

    echo '✅ 部署完成！'
    echo '🌐 前端访问: http://${ssh_host}'
    echo '🔗 后端API: http://${ssh_host}:3000'
  "

  if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
  else
    echo "❌ 部署失败"
    exit 1
  fi
}

# 执行部署
deploy_to_server "$DEPLOY_SSH_HOST" "$DEPLOY_SSH_USER" "$SSH_KEY_FILE"

# 清理临时文件
rm -f "$SSH_KEY_FILE"

echo "🎉 GameHub 部署完成！"