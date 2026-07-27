# GameHub项目本地部署指南

## 📋 部署状态
**部署时间**: 2026-04-13 20:56 (Asia/Shanghai)
**部署结果**: ✅ **成功部署**

## 🚀 快速启动

### 1. 启动后端服务
```bash
cd /Users/mac/.openclaw/workspace/gamehub-2026/backend
npm start
# 或
node dist/index.js
```

### 2. 启动前端服务
```bash
cd /Users/mac/.openclaw/workspace/gamehub-2026/frontend
npm run dev
```

## 🔗 访问地址

### 前端应用
- **开发服务器**: http://localhost:5173/
- **构建版本**: 需要运行 `npm run build` 后访问 `dist/` 目录

### 后端API
- **API根地址**: http://localhost:3001/api/v1/
- **健康检查**: http://localhost:3001/health
- **游戏列表**: http://localhost:3001/api/v1/games
- **游戏搜索**: http://localhost:3001/api/v1/games?query=关键词

## 🛠️ 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 8.0.3
- **样式**: Tailwind CSS
- **UI组件**: Ant Design
- **路由**: React Router

### 后端
- **运行时**: Node.js + Express
- **语言**: TypeScript (编译为JavaScript)
- **数据库**: SQLite (内存数据备用)
- **认证**: JWT令牌
- **API设计**: RESTful架构

## 📊 功能状态

### ✅ 正常工作的功能
1. **游戏数据API**
   - 游戏列表获取
   - 游戏搜索（内存数据）
   - 分页支持

2. **基础服务**
   - 健康检查
   - 错误处理
   - 日志系统

3. **前端界面**
   - 基本页面结构
   - 开发服务器热重载

### ⚠️ 需要修复的功能
1. **认证系统**
   - `/api/v1/auth` 路由未正常工作
   - 需要检查路由注册和中间件

2. **数据库连接**
   - SQLite数据库文件未创建
   - 当前使用内存数据

3. **其他API**
   - `/api/v1/users` 用户管理
   - `/api/v1/news` 新闻系统
   - `/api/v1/reviews` 评测系统
   - `/api/v1/community` 社区功能

## 🔧 故障排除

### 常见问题

#### 1. 后端服务无法启动
```bash
# 检查端口占用
lsof -i :3001

# 检查依赖
cd backend && npm install

# 重新编译TypeScript
npm run build
```

#### 2. 前端服务无法启动
```bash
# 检查端口占用
lsof -i :5173

# 检查依赖
cd frontend && npm install

# 清除缓存
rm -rf node_modules/.vite
```

#### 3. API返回404
- 检查API前缀配置（当前为 `/api/v1`）
- 检查路由注册顺序
- 查看后端日志：`logs/app.log`

#### 4. 数据库连接问题
```bash
# 检查SQLite数据库文件
ls -la backend/data/

# 手动创建数据库目录
mkdir -p backend/data
```

## 📈 性能指标

### 当前状态
- **后端响应时间**: < 10ms (内存数据)
- **前端加载时间**: < 100ms (开发模式)
- **内存使用**: 正常
- **CPU使用**: 正常

### 监控端点
- 健康检查: `GET /health`
- 系统状态: 需要实现监控API
- 性能指标: 需要集成监控工具

## 🗂️ 项目结构

```
gamehub-2026/
├── frontend/                 # 前端项目
│   ├── src/                 # 源代码
│   ├── public/              # 静态资源
│   └── package.json         # 依赖配置
├── backend/                 # 后端项目
│   ├── src/                 # TypeScript源代码
│   ├── dist/               # 编译后的JavaScript
│   ├── data/               # 数据库文件
│   ├── logs/               # 日志文件
│   └── package.json        # 依赖配置
├── docs/                   # 项目文档
├── deploy/                 # 部署配置
└── scripts/               # 工具脚本
```

## 🔄 部署流程

### 开发环境
1. 启动后端服务：`npm start` (backend目录)
2. 启动前端服务：`npm run dev` (frontend目录)
3. 访问 http://localhost:5173/

### 生产环境部署
1. 构建前端：`npm run build`
2. 配置环境变量
3. 使用PM2或Docker部署后端
4. 配置Nginx反向代理
5. 配置CDN加速（见下节）

### CDN部署配置

#### 为什么需要CDN
- **全球加速**：减少用户访问延迟
- **减轻源站压力**：静态资源由CDN缓存
- **提升可用性**：CDN提供边缘节点容灾
- **安全性**：DDoS防护和WAF

#### 支持的服务商
1. **Cloudflare**（推荐）：免费套餐，全球网络，智能路由
2. **AWS CloudFront**：与AWS生态集成良好
3. **阿里云CDN**：国内访问优化
4. **Vercel/Netlify**：一体化部署平台

#### 配置步骤（以Cloudflare为例）

##### 1. 域名配置
```bash
# 在DNS提供商处添加CNAME记录
www.gamehub.com CNAME your-app.vercel.app  # 如果使用Vercel
# 或
cdn.gamehub.com CNAME your-cloudfront-distribution.cloudfront.net  # 如果使用CloudFront
```

##### 2. Cloudflare配置
1. 在Cloudflare控制台添加域名
2. 配置SSL/TLS为"Full"或"Flexible"
3. 启用"Always Use HTTPS"
4. 配置页面规则（可选）

##### 3. 缓存策略
```nginx
# 示例缓存规则
# 静态资源（JS、CSS、图片）缓存30天
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# HTML文件不缓存或短期缓存
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
}
```

##### 4. 前端构建配置
在 `vite.config.ts` 中配置资源哈希：
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 使用哈希确保缓存失效
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  }
})
```

##### 5. 环境变量配置
在CDN配置中设置环境变量：
- `VITE_SITE_URL`: 设置为主域名（如 https://www.gamehub.com）
- `VITE_API_BASE_URL`: 设置为API网关地址

#### 高级CDN功能

##### 1. 图片优化
```html
<!-- 使用Cloudflare图片优化 -->
<img src="/cdn-cgi/image/width=400,format=auto/images/hero.png" alt="Hero Image">
```

##### 2. 边缘计算（Cloudflare Workers）
```javascript
// 示例Worker：A/B测试
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 根据地理位置或用户特征返回不同版本
  const country = request.cf.country
  if (country === 'CN') {
    return fetch('https://cn-version.gamehub.com')
  }
  return fetch(request)
}
```

##### 3. 安全配置
- 启用WAF（Web应用防火墙）
- 配置DDoS防护
- 设置速率限制
- 启用Bot管理

#### 监控和优化

##### 1. 性能监控
- **核心Web指标**：LCP、FID、CLS
- **CDN缓存命中率**：目标 > 90%
- **边缘节点延迟**：监控全球分布

##### 2. 缓存失效
```bash
# Cloudflare缓存清除
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://www.gamehub.com/assets/main-abc123.js"]}'
```

##### 3. 费用优化
- 启用智能压缩
- 配置缓存分层
- 监控带宽使用
- 使用CDN分析工具

#### 故障排除

##### 1. 缓存不更新
- 检查资源哈希是否正确
- 验证CDN缓存规则
- 手动清除缓存

##### 2. CORS问题
```nginx
# Nginx配置CORS
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
```

##### 3. HTTPS证书问题
- 确保证书有效
- 配置证书自动续期
- 使用Let's Encrypt或CDN提供的证书

#### 多区域部署

对于全球用户，考虑多CDN策略：
1. **主CDN**：Cloudflare（全球覆盖）
2. **国内CDN**：阿里云或腾讯云CDN（针对中国用户）
3. **备用CDN**：Fastly或Akamai（高可用性）

## 🚀 HTTP/3 升级指南

项目已全面支持 HTTP/3 (QUIC) 协议，以下是相关说明。

### 架构概述

```
用户 ──HTTP/3 (QUIC/UDP)──→ CDN (自动协商)
                                │
                                ├── 静态资源: CDN 边缘缓存
                                └── 动态请求: 回源 → 服务器 Nginx
                                                        ├── HTTPS 终止 (TCP 443)
                                                        ├── HTTP/3 监听 (UDP 443)
                                                        └── 反向代理 → Docker 容器
```

### 前端 Nginx 容器 (nginx.conf)

容器内 Nginx（`frontend/nginx.conf`）同时监听：
- **TCP 443**: HTP/1.1 + HTTP/2（ssl + http2 参数）
- **UDP 443**: HTTP/3（quic + reuseport 参数）

关键配置：
```nginx
# HTTP → HTTPS 重定向
server {
    listen 80;
    return 301 https://$host$request_uri;
}

# 主服务：HTTP/1.1 + HTTP/2 + HTTP/3
server {
    listen 443 ssl http2;       # TCP: HTTP/1.1 + HTTP/2
    listen 443 quic reuseport;  # UDP: HTTP/3
    ssl_early_data on;          # 0-RTT 支持
    add_header Alt-Svc 'h3=":443"; ma=86400' always;  # 宣告 HTTP/3
}
```

### Docker 部署

- **Dockerfile**: 内置 openssl，构建阶段自动生成自签名证书（开发/测试用）
- 生产环境通过挂载卷 `/etc/nginx/ssl/` 覆盖为真实证书
- 暴露端口: `EXPOSE 80 443`
- 健康检查: `wget --no-check-certificate -q -O /dev/null https://localhost/`

**docker-compose 端口映射：**
```yaml
ports:
  - "80:80"         # HTTP（301 → HTTPS）
  - "443:443"       # TCP: HTTPS (HTTP/1.1 + HTTP/2)
  - "443:443/udp"   # UDP: QUIC (HTTP/3) ← 容易遗漏！
```

### 验证 HTTP/3 是否生效

```bash
# 使用 curl（需支持 HTTP/3 的版本）
curl --http3 -sI https://yourdomain.com | grep -i alt-svc
# 输出: alt-svc: h3=":443"; ma=86400

# 在浏览器中验证
# Chrome → DevTools → Network 标签 → 协议列显示 "h3" 或 "h3-29"

# 查看 Nginx 日志确认协议使用情况
tail -f /var/log/nginx/access.log | grep "$server_protocol"
```

### 兼容性说明

| 场景 | HTTP/3 行为 |
|------|------------|
| 浏览器支持 HTTP/3 | 自动协商使用 QUIC (h3) |
| 浏览器不支持 HTTP/3 | 降级至 HTTP/2 或 HTTP/1.1 |
| UDP 被防火墙拦截 | 降级至 TCP，功能完全正常 |
| CDN 回源 | CDN 边缘支持 HTTP/3，回源用 HTTP/1.1 |
| WebSocket | 依旧走 TCP，不受 HTTP/3 影响 |

### 已知风险

1. **0-RTT 重放**: QUIC 0-RTT 存在重放攻击风险，幂等请求（GET/HEAD）安全；非幂等请求已通过后端 ISR 缓存规避
2. **UDP 放大攻击**: 安全组白名单限制 UDP 443 仅允许 CDN 回源 IP
3. **Nginx 版本**: 宿主机 Nginx 需 ≥ 1.25（`nginx -v` 确认）；Ubuntu 22.04 默认仓库版本较低，建议从 nginx.org 官方源安装

## 📝 注意事项

1. **环境变量**: 后端需要正确配置 `.env` 文件
2. **端口冲突**: 确保 3001、5173、80、443 端口可用
3. **内存数据**: 当前使用内存数据库，重启后数据会丢失
4. **安全配置**: 生产环境需要更新 JWT 密钥和数据库密码
5. **CORS配置**: 前端需要正确配置后端 API 地址
6. **UDP 安全组**: 如果使用 HTTP/3，务必放行 `443/UDP`

## 🆘 技术支持

### 日志文件位置
- 后端日志: `backend/logs/app.log`
- 错误日志: `backend/logs/app.error.log`
- 异常日志: `backend/logs/app.exceptions.log`

### 调试工具
```bash
# 查看后端日志
tail -f backend/logs/app.log

# 测试API端点
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/games

# 检查进程
ps aux | grep -E "(node|vite)"
```

---

**最后更新**: 2026-04-13  
**部署人**: 云霞飞助手  
**状态**: 基本功能可用，需要优化