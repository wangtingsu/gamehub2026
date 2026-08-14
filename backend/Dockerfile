FROM node:20-alpine

RUN apk add --no-cache tzdata su-exec postgresql-client

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY dist/ ./dist/
COPY migrations/ ./migrations/
COPY .env.example .env

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# 预创建上传目录
RUN mkdir -p /app/uploads /app/uploads/temp && \
    chown -R nodejs:nodejs /app/uploads

# 入口脚本：以 root 运行，修复 volume 权限，再降权到 nodejs
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["npm", "start"]
