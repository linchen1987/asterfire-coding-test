# Asterfire - AI 智能简历分析平台

AI 赋能的招聘管理工具，支持 PDF 简历上传、AI 结构化信息提取、候选人匹配评分与对比分析。

---

## 项目架构

```
asterfire-coding-test/
├── apps/
│   ├── web/          # Next.js 16 前端 (App Router)
│   └── api/          # NestJS 后端 (REST API + SSE)
├── packages/
│   └── shared/       # 前后端共享类型与常量
└── docs/             # 设计文档
```

**前端** (`apps/web`): 页面路由包括 Dashboard、简历上传、候选人管理、岗位管理、候选人对比。组件按职责分为 `ui/`、`layout/`、`candidate/`、`job/`、`charts/`。

**后端** (`apps/api`): NestJS 模块化架构，包含 `candidate`、`job`、`ai`、`stats` 四个业务模块。SQLite + Drizzle ORM 存储数据，SSE 流式推送 AI 提取结果。

**共享** (`packages/shared`): 前后端共用的 TypeScript 类型和常量，通过 pnpm workspace 引用。

## 技术选型及理由

| 层级 | 技术 | 理由 |
|------|------|------|
| 前端框架 | Next.js 16 (App Router) | RSC 支持好，生态成熟，App Router 提供流式渲染 |
| 样式 | Tailwind CSS v4 + Shadcn UI | 原子化 CSS 开发效率高，Shadcn 提供"代码属于你"的可定制组件 |
| 数据请求 | TanStack React Query | 缓存、重试、loading 状态管理开箱即用 |
| 图表 | Recharts | React 声明式 API，适合雷达图/环形图等评分可视化 |
| 后端框架 | NestJS | 模块化架构清晰，TypeScript 原生支持，装饰器语法简洁 |
| 数据库 | SQLite + Drizzle ORM | 零配置部署，Drizzle 轻量且类型安全 |
| AI 集成 | OpenAI SDK (兼容模式) | 一套代码适配 OpenAI / DeepSeek / Ollama 等多家模型 |
| PDF 解析 | pdfjs-dist | 纯 JS 实现，CJK 支持好，无需系统依赖 |
| 包管理 | pnpm workspaces | monorepo 原生支持，磁盘效率高 |

## 本地开发

### 前置要求

- Node.js >= 18
- pnpm >= 10

### 安装与启动

```bash
# 安装依赖
pnpm install

# 配置后端环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env，填入 AI_API_KEY 等配置

# 启动前端 (http://localhost:3000)
pnpm dev

# 启动后端 (http://localhost:3001)，另开终端
pnpm dev:api
```

### 常用命令

```bash
pnpm build          # 生产构建
pnpm lint           # ESLint 检查
pnpm tsc --noEmit   # 类型检查 (在 apps/web/ 下执行)
```

## 部署方式

**前端 - Vercel**: 连接 Git 仓库，Root Directory 设为 `apps/web`，环境变量 `NEXT_PUBLIC_API_URL` 指向后端地址。

**后端 - Render**: 创建 Web Service，Root Directory 设为 `apps/api`，Build Command: `pnpm install && pnpm build`，Start Command: `node dist/main.js`。需配置持久磁盘用于 SQLite 数据库和上传文件存储，并设置 `AI_API_BASE`、`AI_API_KEY`、`AI_MODEL` 等环境变量。