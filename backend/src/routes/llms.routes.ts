/**
 * LLMs 文本路由模块
 *
 * 本模块为 AI 大语言模型（LLM）爬虫提供站点描述文本文件。
 * 遵循 llms.txt 标准规范，为 AI 助手提供结构化的网站上下文信息，
 * 便于 LLM 在辅助用户时准确理解 GoodGameHubs 平台的功能和内容。
 *
 * 提供两个端点：
 * - /llms.txt      — 精简版站点概述，包含核心页面、用户功能、内容类型和 API 概览
 * - /llms-full.txt — 完整版站点上下文，涵盖平台概述、用户指南、API 参考、数据模型、管理功能和前端架构
 *
 * 路由前缀: /api/v1
 * 认证策略: 完全公开，无需认证
 * 缓存策略: 响应缓存 1 小时（max-age=3600）
 */

import { Router, Request, Response } from 'express';
import config from '../config';

const router = Router();

const SITE_URL = 'https://www.gghubs.com';
const API_URL = `${SITE_URL}/api/v1`;

const LLMS_TXT = `# GoodGameHubs

> GoodGameHubs (好游聚) is a full-featured game community platform for discovering, reviewing, and discussing games. Users can browse game catalogs, read and write reviews, share strategy guides, participate in community discussions, and use AI-powered game recommendations.

## Core Pages

- [Home](https://www.gghubs.com/): Landing page with featured games, trending content, latest news, and personalized recommendations
- [Game Library](https://www.gghubs.com/games): Browse and search game catalog with filters by category, platform, rating, and popularity
- [Game Detail](https://www.gghubs.com/games/:slug): Game info, rating, reviews, guides, screenshots, and community discussion
- [News](https://www.gghubs.com/news): Gaming industry news and articles
- [Reviews](https://www.gghubs.com/reviews): User-written game reviews with ratings and comments
- [Guides](https://www.gghubs.com/guides): Game strategy guides and walkthroughs
- [Community](https://www.gghubs.com/community): Forum-style discussion board for game topics
- [Discovery](https://www.gghubs.com/discovery): Trending games, leaderboards, popular content, and game recommendations
- [AI Assistant](https://www.gghubs.com/ai): AI-powered game recommendations, content generation, and interactive game companions
- [About](https://www.gghubs.com/about): Platform introduction and contact information

## User Features

- [User Profile](https://www.gghubs.com/en/profile): Personal profile, activity feed, achievement badges, game library, collection
- [Achievements](https://www.gghubs.com/en/achievements): Gamification achievements and XP points earned through participation
- [Messages](https://www.gghubs.com/en/messages): Private messaging between users
- [Notifications](https://www.gghubs.com/en/notifications): In-app notification center for replies, likes, and follows

## Content Types

- **Games**: Catalog with title, description, genre, platform, release date, ratings, screenshots, and developer info
- **News**: Gaming industry articles with title, content, category, tags, publish date, author, likes, and comments
- **Reviews**: User-written game evaluations with rating (1-5), content, game association, likes, and comments
- **Guides**: Game strategy guides with title, content, game association, category, likes, and comments
- **Community Posts**: Discussion topics with title, content, category, tags, likes, comments, and pin/lock status
- **Comments**: User comments with content, parent type (news/review/guide/comment), likes, and edit tracking

## API Overview

The platform provides a comprehensive REST API. All API endpoints are prefixed with \`/api/v1\`.

### Authentication
- POST \`${API_URL}/auth/register\` — Register with email
- POST \`${API_URL}/auth/login\` — Login with email and password
- POST \`${API_URL}/auth/logout\` — Logout
- POST \`${API_URL}/auth/refresh\` — Refresh JWT token

### Games
- GET \`${API_URL}/games\` — List games with pagination, search, and filters
- GET \`${API_URL}/games/:id\` — Get game details

### Content
- GET \`${API_URL}/news\` — List news articles
- GET \`${API_URL}/news/:id\` — Get news article details
- GET \`${API_URL}/community/reviews\` — List game reviews
- GET \`${API_URL}/community/posts\` — List community discussion posts
- GET \`${API_URL}/community/posts/:id\` — Get post details with comments
- GET \`${API_URL}/guides\` — List strategy guides

### Social
- GET \`${API_URL}/search?q=keyword\` — Global search across games, news, and users
- GET \`${API_URL}/discovery\` — Trending, popular, and recommended content
- GET \`${API_URL}/comments?parentType=:type&parentId=:id\` — Get comments for content

## AI Integration

GoodGameHubs features three AI-powered experiences:
1. **AI Assistant** (\`/ai\`): General-purpose chat for game recommendations, platform help, and content discovery
2. **Game Companion** (\`/ai/companion\`): Context-aware AI companion that follows the user's current game page
3. **Game NPC** (\`/ai/npc/:character\`): Interactive role-playing with game characters for entertainment

## Optional

- [Online Games](https://www.gghubs.com/library/online): Playable HTML5 games including Snake, Tetris, 2048, Minesweeper, Pong, Memory, Gobang, and Brick Breaker
- [Sitemap](https://www.gghubs.com/sitemap.xml): Full XML sitemap
- [Blog](https://www.gghubs.com/blog): Platform blog with updates and announcements
- Tech Stack: React + TypeScript frontend, Express + TypeScript backend, SQLite database, JWT authentication, Socket.IO real-time messaging`;

const LLMS_FULL_TXT = `# GoodGameHubs — Full Site Context

> This document contains the complete content overview of GoodGameHubs (好游聚), a game community platform at https://www.gghubs.com. It provides comprehensive context for AI assistants helping users with the platform.

## Platform Overview

GoodGameHubs is a bilingual (Chinese/English) game community platform where users discover games, write reviews, share strategy guides, participate in forum discussions, and use AI-powered features. The platform serves both casual gamers looking for their next game and dedicated gamers wanting to share expertise.

### Key Differentiators
- **AI Integration**: Three distinct AI modes (Assistant, Companion, NPC role-play)
- **Bilingual Support**: Full i18n with Chinese (zh-CN), English (en), Japanese (ja), Korean (ko), Spanish (es), French (fr)
- **Gamification**: XP points, achievements, levels, and leaderboards to reward community participation
- **Real-time Features**: Socket.IO-powered messaging and notifications
- **Playable Games**: Built-in HTML5 casual games (Snake, Tetris, 2048, Minesweeper, Pong, Memory, Gobang, Brick Breaker)

## User Guide

### Registration and Authentication
Users can register with email or phone number. Social login is available via Google, GitHub, WeChat, QQ, Facebook, Twitter, and Apple. The platform uses JWT tokens (7-day expiry) with refresh tokens (30-day expiry). Admin accounts use a separate JWT (8-hour expiry).

### Community Guidelines
- Users can write game reviews with ratings (1-5 stars)
- Community posts can be created in various categories
- Comments are available on news, reviews, guides, and community posts
- Content goes through a review/approval workflow before public visibility
- Users earn XP for contributing reviews, posts, and comments

### Content Moderation
All user-submitted content (news, reviews, community posts, guides) goes through an admin approval workflow:
- **Pending**: Awaiting review by moderator
- **Approved**: Visible to all users
- **Rejected**: Hidden from public, with moderator comment explaining reason
Only approved content appears on public-facing pages.

### Game Library
The game catalog includes:
- Game details: title, description, genre, platform, release date, developer, publisher
- Ratings: aggregate user rating from reviews
- Media: screenshots and cover images
- Related content: reviews, guides, and community discussions per game

## API Reference

Base URL: \`${API_URL}\`

### Authentication Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /auth/register | Register with email | No |
| POST | /auth/login | Login with email/password | No |
| POST | /auth/logout | Logout | Yes |
| POST | /auth/refresh | Refresh JWT | Refresh token |
| GET | /auth/me | Get current user profile | Yes |

### Game Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /games | List games (supports ?page, ?limit, ?search, ?category, ?platform, ?sortBy, ?sortOrder) |
| GET | /games/:id | Get game details |
| GET | /games/:id/reviews | Get reviews for a specific game |
| GET | /games/:id/guides | Get guides for a specific game |

### News Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /news | List news (supports ?page, ?limit, ?category) |
| GET | /news/:id | Get news detail |

### Community Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /community/reviews | List reviews (supports ?page, ?limit, ?gameId, ?sortBy) |
| POST | /community/reviews | Create review (auth required) |
| GET | /community/reviews/:id | Get review detail |
| PUT | /community/reviews/:id | Update review (owner only) |
| DELETE | /community/reviews/:id | Delete review (owner only) |
| GET | /community/posts | List community posts |
| POST | /community/posts | Create post (auth required) |
| GET | /community/posts/:id | Get post detail |

### Guide Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /guides | List guides (supports ?page, ?limit, ?gameId, ?category) |
| GET | /guides/:id | Get guide detail |

### Social Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /search?q= | Global search (games, news, users) |
| GET | /discovery | Trending, popular, and recommended content |
| GET | /comments?parentType=&parentId= | Get comments |
| POST | /comments | Create comment (auth required) |
| GET | /users/:id | Get user profile |
| GET | /users/:id/activities | Get user activity feed |
| GET | /notifications | Get user notifications (auth required) |
| GET | /messages | Get user messages (auth required) |

### AI Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /ai/chat | AI Assistant chat (requires API key) |
| POST | /ai/chat/companion | Game Companion chat (requires API key) |
| POST | /ai/chat/npc/:character | NPC role-play chat (requires API key) |

## Data Model

### User
Users have a role hierarchy: \`user\` (regular) < \`admin\` (content moderator) < \`super_admin\` (full access). Users accumulate XP and level up through community participation. Achievements are awarded for milestones.

### Game
Games have title, slug, description, genre, platforms, release date, developer, publisher, cover image, screenshots, average rating, view count, and like count.

### Review
Reviews link a user to a game with text content, rating (1-5), like count, comment count, and review status (pending/approved/rejected).

### Guide
Guides link a user to a game with title, text content, category, tags, like count, comment count, and review status.

### Community Post
Posts have title, content, category, tags, author, like count, comment count, pin/lock status, and review status.

## Administrator Features

The admin panel at \`/admin\` provides:
- **Dashboard**: Site statistics, user growth, content metrics, traffic analysis
- **User Management**: CRUD operations, role assignment, activity monitoring
- **Game Management**: CRUD operations, display zone configuration, metadata editing
- **Content Management**: News, reviews, community posts, guides — all with review queue for approval workflow
- **Review Queue**: Dedicated page for moderators to approve/reject pending content
- **File Management**: Upload and manage media files and images
- **System Config**: Platform settings and feature toggles
- **Audit Logs**: Track all admin actions for compliance
- **Analytics**: Business reports, user behavior analysis, content performance
- **Deployment**: Server management and deployment controls
- **Backup**: Database backup and restore

## Frontend Architecture

The frontend is a React 19 SPA with TypeScript, built with Vite. Key libraries:
- **Ant Design 5**: UI component framework
- **React Router 6**: Client-side routing with lazy-loaded pages
- **TanStack React Query**: Server state management and caching
- **@antv/g2**: Data visualization for admin dashboard
- **i18next**: Internationalization (zh-CN default, en, ja, ko, es, fr)
- **Socket.IO Client**: Real-time messaging and notifications

Pages are organized by route:
- \`/\`: Home page with hero banner, featured games, latest news, trending content
- \`/games\`: Game library with filters and search
- \`/games/:slug\`: Game detail page
- \`/news\`: News listing
- \`/news/:slug\`: News article
- \`/reviews\`: Review listing
- \`/reviews/:id\`: Review detail
- \`/guides\`: Strategy guides
- \`/guides/:id\`: Guide detail
- \`/community\`: Community forum
- \`/community/:id\`: Post detail
- \`/discovery\`: Discovery and trending
- \`/ai\`: AI Assistant
- \`/ai/companion\`: Game Companion
- \`/ai/npc/:character\`: NPC role-play
- \`/profile\`: User profile
- \`/profile/achievements\`: User achievements
- \`/profile/messages\`: Private messages
- \`/profile/favorites\`: Favorite games
- \`/profile/notifications\`: Notification center
- \`/about\`: About page
- \`/blog\`: Platform blog
- \`/admin\`: Admin dashboard
- \`/games/online\`: Playable HTML5 games

## Technical Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: JWT with dual-token system (user + admin)
- **Real-time**: Socket.IO for messaging and notifications
- **AI**: DeepSeek API integration for AI features
- **Caching**: ISR (Incremental Static Regeneration) pattern
- **Monitoring**: Sentry error tracking, Prometheus metrics
- **Deployment**: Docker, Nginx reverse proxy
- **Internationalization**: i18next with 6 languages`;

/**
 * @route GET /api/v1/llms.txt
 * @desc 提供站点精简版概述文本（llms.txt 标准）
 *       返回纯文本格式，内容包含核心页面导航、用户功能、内容类型说明和 API 概览。
 *       适用于 LLM 爬虫（如 ChatGPT、Claude 等）快速了解网站结构。
 * @access Public — 完全公开，无需认证
 *
 * @middleware 无认证中间件
 *
 * @response-header Content-Type: text/plain; charset=utf-8
 * @response-header Cache-Control: public, max-age=3600（缓存 1 小时）
 *
 * @returns {200} text/plain — llms.txt 格式的站点精简描述文本
 *
 * @example
 *   GET /api/v1/llms.txt
 *   Response: text/plain 格式的站点概述
 */
router.get('/llms.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(LLMS_TXT);
});

/**
 * @route GET /api/v1/llms-full.txt
 * @desc 提供站点完整版上下文文本（llms-full.txt 扩展标准）
 *       返回纯文本格式，内容比 llms.txt 更加详尽，包括：
 *       - 平台概述与差异化特性
 *       - 用户注册、社区指南和内容审核流程
 *       - 完整的 API 参考（含所有端点的表格）
 *       - 数据模型说明（User、Game、Review、Guide、Post）
 *       - 管理员功能与前端架构
 *       适用于需要深入了解全站功能的 LLM 辅助场景。
 * @access Public — 完全公开，无需认证
 *
 * @response-header Content-Type: text/plain; charset=utf-8
 * @response-header Cache-Control: public, max-age=3600（缓存 1 小时）
 *
 * @returns {200} text/plain — llms-full.txt 格式的站点完整描述文本
 *
 * @example
 *   GET /api/v1/llms-full.txt
 *   Response: text/plain 格式的站点完整上下文
 */
router.get('/llms-full.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(LLMS_FULL_TXT);
});

export default router;
