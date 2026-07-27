# 多阶段构建：构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.admin.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY index.html ./
COPY admin.html ./

# 安装依赖
RUN npm ci --legacy-peer-deps

# 构建时禁用 PWA
ENV VITE_DISABLE_PWA=true

# 允许通过构建参数配置 API 地址
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 复制源代码
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY src/ ./src/

# 构建管理后台（使用admin配置）
RUN npm run prebuild && npx vite build --config vite.admin.config.ts

# 生产阶段：使用Nginx提供静态文件
FROM nginx:alpine AS production

# 安装 openssl 用于生成自签名证书
RUN apk add --no-cache openssl

# 复制nginx配置
COPY admin.nginx.conf /etc/nginx/nginx.conf

# 生成自签名 SSL 证书
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/CN=localhost/O=GameHub Admin/C=CN"

# 从构建阶段复制构建产物
COPY --from=builder /app/dist/admin /usr/share/nginx/html

# 删除 nginx 默认 index.html，避免干扰 admin SPA 路由
RUN rm -f /usr/share/nginx/html/index.html

# 创建非root用户运行nginx
RUN addgroup -g 1001 -S nginxuser && \
    adduser -S nginxuser -u 1001 && \
    mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html /etc/nginx/ssl /tmp/nginx && \
    chown -R nginxuser:nginxuser /var/cache/nginx && \
    chown -R nginxuser:nginxuser /var/log/nginx && \
    chown -R nginxuser:nginxuser /etc/nginx/conf.d && \
    chown -R nginxuser:nginxuser /usr/share/nginx/html && \
    chown -R nginxuser:nginxuser /etc/nginx/ssl && \
    chown -R nginxuser:nginxuser /tmp/nginx
USER nginxuser

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
