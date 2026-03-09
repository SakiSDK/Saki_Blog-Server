# Blog Server (Backend)

这是一个基于 Node.js (Express) + TypeScript 构建的博客系统后端服务。它提供了丰富的功能，包括文章管理、相册管理、用户认证、评论系统以及全文搜索支持。

## 🛠 技术栈

- **核心框架**: [Express](https://expressjs.com/) (v5) + [TypeScript](https://www.typescriptlang.org/)
- **数据库**: [MySQL](https://www.mysql.com/) (配合 [Sequelize](https://sequelize.org/) ORM)
- **缓存/会话**: [Redis](https://redis.io/)
- **搜索引擎**: [MeiliSearch](https://www.meilisearch.com/)
- **图片处理**: [Sharp](https://sharp.pixelplumbing.com/)
- **验证**: [Zod](https://zod.dev/)
- **日志**: [Winston](https://github.com/winstonjs/winston)
- **进程管理**: [PM2](https://pm2.keymetrics.io/)
- **包管理**: [pnpm](https://pnpm.io/)

## ✨ 主要功能

- **用户系统**: 注册、登录、JWT 认证、会话管理。
- **文章管理**: 文章的增删改查、分类、标签管理。
- **相册系统**: 支持相册创建、图片上传（本地/OSS）、缩略图生成、图片关联管理。
- **评论系统**: 文章评论、回复。
- **搜索功能**: 基于 MeiliSearch 的全文搜索。
- **文件上传**: 支持多文件上传、类型限制、大小限制。
- **权限控制**: 基于角色的权限管理（Admin/User）。

## 🚀 快速开始

### 1. 环境准备

确保你的本地环境已安装以下软件：
- [Node.js](https://nodejs.org/) (推荐 v18+)
- [pnpm](https://pnpm.io/)
- [MySQL](https://www.mysql.com/) (v5.7 或 v8.0)
- [Redis](https://redis.io/)
- [MeiliSearch](https://www.meilisearch.com/) (可选，用于搜索功能)

### 2. 安装依赖

```bash
git clone <your-repo-url>
cd server-new
pnpm install
```

### 3. 配置环境变量

项目根目录包含 `.env` (开发环境) 和 `.env.production` (生产环境) 配置文件。请根据实际环境修改配置：

```properties
# 示例配置项
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=blog_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
```

### 4. 启动项目

#### 开发模式
使用 `nodemon` 启动，支持热重载：
```bash
pnpm dev
```

#### 生产模式
编译 TypeScript 代码并运行：
```bash
pnpm build
pnpm start
```

或者使用 PM2 管理进程（推荐）：
```bash
# 启动
pm2 start ecosystem.config.js

# 查看日志
pm2 logs

# 停止
pm2 stop all
```

### 5. Docker 部署

项目包含 `Dockerfile` 和 `docker-compose.yml`，可以直接使用 Docker 启动服务栈（包含 Redis 和 MeiliSearch）：

```bash
docker-compose up -d
```

## 📂 目录结构

```
server-new/
├── src/
│   ├── config/         # 配置文件 (数据库, Redis, OSS等)
│   ├── controller/     # 控制器 (Admin端和Web端分离)
│   ├── models/         # Sequelize 模型定义
│   ├── routes/         # 路由定义
│   ├── services/       # 业务逻辑层
│   ├── middlewares/    # 中间件 (Auth, Upload, Validate)
│   ├── schemas/        # Zod 验证 Schema
│   ├── utils/          # 工具函数
│   └── app.ts          # 应用入口
├── public/             # 静态资源 (上传的文件等)
├── dist/               # 编译后的 JS 代码
├── ecosystem.config.js # PM2 配置文件
└── package.json
```

## 📄 许可证

ISC
