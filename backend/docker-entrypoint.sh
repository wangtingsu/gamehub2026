#!/bin/sh
set -e

# 修复 volume 挂载目录权限（Docker volume 挂载后可能属于 root）
for dir in /app/uploads /app/backups; do
  if [ -d "$dir" ]; then
    chown -R nodejs:nodejs "$dir" 2>/dev/null || true
  fi
done

# 以 nodejs 用户身份执行主命令
exec su-exec nodejs "$@"
