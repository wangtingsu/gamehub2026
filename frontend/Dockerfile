# 多阶段构建：构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY sentry.config.js ./
COPY index.html ./

# 安装依赖
RUN npm ci --legacy-peer-deps

# 构建时禁用 PWA（兼容 Vite 8 的 vite-plugin-pwa）
ENV VITE_DISABLE_PWA=true

# 允许通过构建参数配置 API 地址和站点 URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL

# 复制源代码
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY src/ ./src/
COPY pages/ ./pages/
COPY renderer/ ./renderer/
COPY hydrate/ ./hydrate/
COPY vite.hydrate.config.ts ./

# 构建客户端应用（跳过 tsc 类型检查，Vite/Esbuild 处理转译）
RUN npm run prebuild && npx vite build

# 构建 SSR 服务端渲染捆绑包（产出 dist/ssr/，供后端 SSR 中间件使用）
RUN npx vite build --ssr --outDir dist/ssr

# 构建独立的 hydration 入口（不含 vite-plugin-ssr，避免运行时冲突）
RUN npx vite build --config vite.hydrate.config.ts

# 生产阶段：使用Nginx提供静态文件
FROM nginx:alpine AS production

# 安装 openssl 用于生成自签名证书（开发/测试用）
RUN apk add --no-cache openssl

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 生成自签名 SSL 证书（开发环境默认使用，生产环境可通过挂载卷覆盖）
# 文件名必须匹配 nginx.conf 中的 ssl_certificate / ssl_certificate_key
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/privkey.pem \
        -out /etc/nginx/ssl/fullchain.pem \
        -subj "/CN=localhost/O=GameHub Development/C=CN"

# Vite 8 输出客户端文件在 dist/client/ 下，但 assets.json 中的路径不含 client/ 前缀
# 因此将 client/ 内容复制到 nginx 根目录，使 /assets/... 路径正确解析
COPY --from=builder /app/dist/client /usr/share/nginx/html
# 删除 nginx 默认 index.html，所有页面走 SSR
RUN rm -f /usr/share/nginx/html/index.html
# 复制 assets.json（供后端 SSR 读取）
COPY --from=builder /app/dist/assets.json /usr/share/nginx/html/assets.json
# 复制独立的 hydration 构建产物（含 manifest，供后端注入 hydration 脚本）
COPY --from=builder /app/dist/hydrate /usr/share/nginx/html
# server/ 保留在镜像中，供 docker cp 提取 SSR bundle 到后端挂载卷
COPY --from=builder /app/dist/server /usr/share/nginx/html/server

# 创建所需目录
RUN mkdir -p /tmp/nginx /var/cache/nginx /var/log/nginx

# 暴露端口（HTTP）
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-check-certificate -q -O /dev/null https://127.0.0.1/ || wget -q -O /dev/null http://127.0.0.1/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
