# 实施计划：AI 赋能的智能简历分析平台

> 本文档供 AI 编码助手使用。每个 Step 是一个独立、可运行、可验证的增量。
> 设计参考：`docs/HIGH-LEVEL-DESIGN.md`、`docs/PDF-PARSING-SOLUTION.md`

## 总览

```
Step 1  ~ Step 6:   Phase 1 — 基础骨架 (项目搭建 + DB + CRUD + 布局)
Step 7  ~ Step 9:   Phase 2 — 上传与解析 (PDF 上传 + pdfjs-dist 解析 + 上传页面)
Step 10 ~ Step 11:  Phase 3 — AI 信息提取 (AI SSE 提取 + 前端渲染)
Step 12 ~ Step 13:  Phase 4 — AI 匹配评分 (评分接口 + 图表 + 候选人详情)
Step 14 ~ Step 17:  Phase 5 — 候选人管理 + 岗位管理 (列表 + Dashboard + JD 编辑器)
Step 18:            Phase 6 — 部署 (Vercel + Render)
Step 19:            Phase 7 — 加分项
```

---

## Step 1: 创建 NestJS 后端项目

**目标**: 在 `apps/api/` 下初始化 NestJS 项目，能启动并响应健康检查。

**操作**:
1. 在 `apps/api/` 下用 `npx @nestjs/cli new .` 初始化（或手动创建最小 NestJS 项目）
2. `main.ts` 监听端口 `3001`，前缀 `/api/v1`
3. 配置 CORS（允许 `http://localhost:3000`）
4. 配置 `.env` 支持（`@nestjs/config` 或 `dotenv`）
5. 创建 `.env.example`，列出所有环境变量（AI_API_BASE, AI_API_KEY, AI_MODEL, DB_PATH, UPLOAD_DIR, CORS_ORIGIN）
6. 在根 `package.json` 添加脚本 `"dev:api": "pnpm --filter api dev"`

**验证**:
```bash
cd apps/api && pnpm dev
curl http://localhost:3001/api/v1
# → 返回 200 或 JSON
```

---

## Step 2: SQLite + Drizzle ORM + 全部表 Schema

**目标**: 定义全部 6 张表，应用启动时自动创建表。

**操作**:
1. 安装 `better-sqlite3`、`drizzle-orm`、`drizzle-kit`（dev）
2. 创建 `apps/api/src/db/schema.ts`，定义 6 张表（参照 HIGH-LEVEL-DESIGN.md 2.2）：
   - `candidates`（含 upload_status, status, raw_text, file_* 字段, score 字段）
   - `educations`
   - `work_experiences`
   - `skills`
   - `projects`
   - `job_descriptions`
3. 创建 `apps/api/src/db/connection.ts`，初始化 better-sqlite3 + drizzle
4. 在 `AppModule` 中初始化 DB 连接，使用 `drizzle-kit push` 或代码中 `exec` CREATE TABLE
5. DB 文件路径默认 `./data/sqlite.db`（可通过 DB_PATH 环境变量覆盖）

**验证**:
```bash
pnpm dev:api
# 启动后 data/sqlite.db 文件已创建
sqlite3 data/sqlite.db ".tables"
# → candidates, educations, work_experiences, skills, projects, job_descriptions
```

---

## Step 3: 种子数据 + 统一响应格式 + 异常过滤

**目标**: 启动时自动 seed 默认 JD；统一 API 响应格式。

**操作**:
1. 创建 `apps/api/src/db/seed.ts`：启动时检查 `job_descriptions` 表，为空则插入默认 JD
   - title: "软件工程师"
   - description: "负责全栈开发"
   - required_skills: `["JavaScript", "TypeScript", "React", "Node.js"]`
   - bonus_skills: `["Python", "Docker", "Kubernetes"]`
2. 创建全局拦截器 `TransformInterceptor`，统一返回 `{ code: 0, data, message: "ok" }`
3. 创建全局异常过滤器 `HttpExceptionFilter`，统一错误返回 `{ code: errno, message, data: null }`
4. 在 `main.ts` 或 `AppModule` 注册

**验证**:
```bash
pnpm dev:api
curl http://localhost:3001/api/v1/jobs
# → { code: 0, data: [{ id: "...", title: "软件工程师", ... }], message: "ok" }
```

---

## Step 4: Job CRUD

**目标**: 完成岗位的 CRUD API。

**操作**:
1. 创建 `modules/job/` 模块（Controller + Service）
2. 实现 `GET /jobs`（列表）、`GET /jobs/:id`（详情）、`POST /jobs`（创建）、`PUT /jobs/:id`（更新）、`DELETE /jobs/:id`（删除）
3. `required_skills` 和 `bonus_skills` 在 DB 中存为 JSON 字符串，读取时 parse，写入时 stringify
4. 输入校验：title 必填

**验证**:
```bash
curl http://localhost:3001/api/v1/jobs
# → 返回种子数据 JD

curl http://localhost:3001/api/v1/jobs -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"前端工程师","description":"负责前端","requiredSkills":["React","TypeScript"],"bonusSkills":["Vue"]}'
# → { code: 0, data: { id: "...", title: "前端工程师", ... } }

curl http://localhost:3001/api/v1/jobs
# → 返回 2 条记录
```

---

## Step 5: Candidate CRUD

**目标**: 完成候选人基础 CRUD + 列表查询（不含上传，上传在 Step 7）。

**操作**:
1. 创建 `modules/candidate/` 模块（Controller + Service）
2. `GET /candidates`：分页 (`page`, `pageSize`)、搜索 (`search` 匹配姓名/技能)、排序 (`sortBy`, `sortOrder`)、筛选 (`jobId`, `status`, `skills`)
   - 默认只返回 `upload_status=completed` 的候选人（除非显式传 `uploadStatus` 参数）
3. `GET /candidates/:id`：详情（含 educations, work_experiences, skills, projects 关联查询）
4. `PUT /candidates/:id`：更新候选人基本信息（手动修正用）
5. `PUT /candidates/:id/status`：更新业务状态，含状态流转校验（必须 `upload_status=completed`，单向流转，终态不可回退）
6. `DELETE /candidates/:id`：删除候选人（级联删除关联表数据）
7. 创建 DTO，添加基础校验

**验证**:
```bash
curl http://localhost:3001/api/v1/candidates
# → { code: 0, data: [], message: "ok" }（空列表）

curl http://localhost:3001/api/v1/candidates/no-id/status -X PUT \
  -H "Content-Type: application/json" \
  -d '{"status":"screened"}'
# → 404
```

---

## Step 6: 创建 shared 包 + 前端布局 + 路由

**目标**: 建立 shared 包，安装前端依赖，搭建 Sidebar + Header 布局，创建全部路由空壳。

**操作**:

### shared 包
1. 创建 `packages/shared/package.json`（name: "@app/shared"）
2. 创建类型定义文件：
   - `types/candidate.ts`：CandidateStatus, UploadStatus, CandidateBasics, Education, WorkExperience, Skill, Project, Candidate（完整类型）
   - `types/job.ts`：JobDescription
   - `types/api.ts`：ApiResponse<T>, PaginatedResponse<T>
   - `constants/status.ts`：状态枚举值
3. 配置 `packages/shared/tsconfig.json` 输出声明文件
4. 在 `apps/web/package.json` 和 `apps/api/package.json` 中添加依赖 `"@app/shared": "workspace:*"`

### 前端
5. 安装 Shadcn 新组件（在 `apps/web/` 下执行）：
   `pnpm dlx shadcn@latest add table card tabs badge input select skeleton avatar progress tooltip separator textarea label command dialog`
6. 安装新依赖：`recharts`、`react-dropzone`、`@tanstack/react-query`
7. 创建 `components/layout/app-sidebar.tsx`：侧边栏导航（概览、上传、候选人、岗位、对比）
8. 创建 `components/layout/app-header.tsx`：Header（Logo + 主题切换）
9. 修改 `app/layout.tsx`：集成 Sidebar + Header + QueryClientProvider + ThemeProvider
10. 创建路由空壳文件：
    - `app/page.tsx`（Dashboard）
    - `app/upload/page.tsx`
    - `app/candidates/page.tsx`
    - `app/candidates/[id]/page.tsx`
    - `app/jobs/page.tsx`
    - `app/jobs/[id]/page.tsx`
    - `app/compare/page.tsx`
11. 创建 `lib/api-client.ts`：基于 fetch 的统一请求客户端

**验证**:
```bash
pnpm install
# 无报错

cd apps/web && pnpm dev
# → 打开 http://localhost:3000
# → 看到 Sidebar + Header 布局
# → 点击侧边栏各菜单可切换路由
# → 暗色/亮色主题切换正常
# → 控制台无报错
```

---

## Step 7: PDF 上传接口 + pdfjs-dist 解析

**目标**: 实现 `POST /resumes/upload`，上传 PDF 后同步解析文本。

**操作**:
1. 安装 `multer`（`@types/multer` dev）、`pdfjs-dist`
2. 创建 `apps/api/uploads/` 目录（gitignore），配置 `UPLOAD_DIR` 环境变量
3. 创建 `modules/candidate/upload.controller.ts` 或在 CandidateController 中添加路由
4. `POST /resumes/upload`：
   - multer 接收 `files`（多文件）和 `jobId`（必传）
   - 对每个文件：
     1. 存储到 `uploads/<uuid>.pdf`
     2. 创建 candidate 记录（`upload_status=pending`, `job_id=jobId`, `status=null`, `file_name`, `file_path`, `file_size`）
     3. 调用 pdfjs-dist 同步解析 PDF 提取文本（参照 PDF-PARSING-SOLUTION.md 第四节）
     4. 清洗文本（去空白、规范化），写入 `raw_text`
     5. `upload_status` 保持 `pending`
   - 返回 `[{ candidateId, fileName, uploadStatus: "pending" }]`
5. 创建 `modules/candidate/pdf-parser.ts` 封装 pdfjs-dist 调用
6. 文件大小限制 10MB，只接受 `.pdf`
7. `GET /candidates/:id/upload-status`：返回 upload_status 和 raw_text

**验证**:
```bash
curl http://localhost:3001/api/v1/resumes/upload \
  -F "files=@test.pdf" \
  -F "jobId=<种子数据JD的id>"
# → [{ candidateId: "...", fileName: "test.pdf", uploadStatus: "pending" }]

curl http://localhost:3001/api/v1/candidates/<id>/upload-status
# → { uploadStatus: "pending", rawText: "解析出的文本..." }
```

---

## Step 8: 前端 — 上传页面 (UploadDialog + ExtractList)

**目标**: 实现 `/upload` 页面，HR 可上传 PDF 并看到候选人卡片列表。

**操作**:
1. 创建 `components/candidate/upload-dialog.tsx`：
   - 岗位下拉选择（必选，从 GET /jobs 获取列表）
   - react-dropzone 拖拽区域（限制 PDF，最多 10 个文件，每个 10MB）
   - 已选文件列表（可移除）
   - 确认上传按钮
2. 创建 `hooks/use-resume-upload.ts`：
   - 调用 `POST /resumes/upload`
   - 上传中状态、错误处理
3. 创建 `components/candidate/extract-progress.tsx`：
   - 单个候选人的状态卡片
   - 显示：文件名、上传时间、状态
   - `pending` 状态：显示"待解析" + "开始解析"按钮（按钮暂为 disabled，Step 10 接入）
   - `completed` 状态：显示完成标记
   - `failed` 状态：显示错误信息 + "重试"按钮
4. 创建 `components/candidate/extract-list.tsx`：
   - 展示已上传候选人的卡片列表
5. 组装 `app/upload/page.tsx`：
   - 顶部"上传简历"按钮 → 打开 UploadDialog
   - 主体展示 ExtractList
   - 页面加载时调用 `GET /candidates?uploadStatus=pending,failed,completed` 获取已有候选人

**验证**:
```bash
# 后端运行中
# 1. 打开 /upload 页面
#    → 看到"上传简历"按钮
#    → 点击弹出 UploadDialog
#    → 下拉选择岗位（有种子数据"软件工程师"）
#    → 拖入 PDF 文件，确认上传
#    → 弹框关闭，页面展示候选人卡片
#    → 每个卡片显示"待解析" + disabled 的"开始解析"按钮
```

---

## Step 9: 端到端验证 — 上传流程

**目标**: 验证 Phase 1 + Phase 2 完整流程可跑通。

**验证**:
```bash
# 1. 启动后端
cd apps/api && pnpm dev
# → 种子 JD 已创建

# 2. 启动前端
cd apps/web && pnpm dev

# 3. 浏览器打开 http://localhost:3000
#    → Sidebar 布局正常
#    → 点击"上传"进入 /upload
#    → 上传 3 份 PDF，选择"软件工程师"岗位
#    → 3 个候选人卡片出现，每个显示"待解析"
#    → "开始解析"按钮 disabled（等 Phase 3 接入 AI）

# 4. curl 验证
curl http://localhost:3001/api/v1/candidates?uploadStatus=pending
# → 返回 3 个候选人

curl http://localhost:3001/api/v1/jobs
# → 返回种子 JD
```

---

## Step 10: 后端 — AI 服务封装 + SSE 提取接口

**目标**: 接入 AI API，实现 `POST /ai/extract/:candidateId` SSE 流式提取。

**操作**:
1. 安装 `openai` SDK
2. 创建 `modules/ai/ai.module.ts` + `ai.service.ts`：
   - 从环境变量读取 `AI_API_BASE`、`AI_API_KEY`、`AI_MODEL`
   - 封装 `extractInfo(rawText)` 方法：调用 AI API（stream: true），使用信息提取 Prompt（参照 HIGH-LEVEL-DESIGN.md 5.2）
3. 创建 `modules/ai/extract.controller.ts`：
   - `POST /ai/extract/:candidateId`：
     1. 校验候选人存在且 `upload_status = pending` 或 `failed`
     2. 设置 `upload_status = pending`（如果是 failed 重试）
     3. 读取 `raw_text`，构造提取 Prompt
     4. 调用 AI API stream，逐步发送 SSE 事件：
        - `event: progress` + `data: {"step":"extracting","message":"正在提取基本信息..."}`
        - `event: partial` + `data: {"field":"basics","data":{...}}`
        - `event: partial` + `data: {"field":"education","data":[...]}`
        - ... (workExperience, skills, projects)
     5. 收到完整 JSON 后，解析并写入数据库：
        - 更新 candidate: name, phone, email, city
        - 插入 educations, work_experiences, skills, projects（先删除旧的再插入）
        - `upload_status = completed`, `status = pending`
     6. 发送 `event: complete` + `data: {"candidateId":"...","uploadStatus":"completed"}`
     7. 如果 AI 调用失败：`upload_status = failed`，发送 `event: error`
4. SSE 响应头设置 `Content-Type: text/event-stream`、`Cache-Control: no-cache`、`Connection: keep-alive`

**注意**: SSE 提取的实际做法——AI 流式返回的是一段一段的 token，后端需要积累完整 JSON 后再解析。partial 事件可以在收到特定段落时发送（比如积累到某个 field 完整时），或者简化为：AI 一次性返回完整 JSON，后端解析后分多个 partial 事件逐个发送给前端。

**验证**:
```bash
# 确保 .env 中配置了 AI_API_BASE, AI_API_KEY, AI_MODEL
# 先上传一份 PDF（Step 7），拿到 candidateId

curl -N http://localhost:3001/api/v1/ai/extract/<candidateId> -X POST
# → SSE 流式输出:
#   event: progress  data: {"step":"extracting","message":"正在提取基本信息..."}
#   event: partial   data: {"field":"basics","data":{"name":"张三","phone":"138xxxx"}}
#   event: partial   data: {"field":"education","data":[...]}
#   event: partial   data: {"field":"workExperience","data":[...]}
#   event: partial   data: {"field":"skills","data":[...]}
#   event: complete  data: {"candidateId":"...","uploadStatus":"completed"}

curl http://localhost:3001/api/v1/candidates/<id>
# → name, phone 等已填充，upload_status=completed, status=pending
```

---

## Step 11: 前端 — SSE 提取渲染 + 提取结果展示

**目标**: 前端对接 SSE 提取，逐步渲染候选人信息。

**操作**:
1. 创建 `hooks/use-ai-extract.ts`：
   - 封装 SSE 连接逻辑（`fetch` + `ReadableStream` 解析 SSE 事件，因为 POST 请求不能用 EventSource）
   - 管理 partial 数据状态
   - 处理 complete、error 事件
2. 更新 `components/candidate/extract-progress.tsx`：
   - "开始解析"按钮调用 SSE 提取
   - 收到 `progress` 事件：显示进度文案
   - 收到 `partial` 事件：逐步渲染骨架屏 → 实际数据
     - basics → 始名电话邮箱城市
     - education → 教育列表
     - workExperience → 工作经历时间线
     - skills → 技能标签云
   - 收到 `complete`：显示完成状态，按钮消失
   - 收到 `error`：显示错误信息 + "重试"按钮
3. 更新 `app/upload/page.tsx`：按钮 enabled，SSE 接入

**验证**:
```bash
# 1. 打开 /upload 页面上传一份 PDF
#    → 卡片显示"待解析" + "开始解析"按钮
# 2. 点击"开始解析"
#    → 卡片显示"正在提取..."
#    → 逐步渲染: 基本信息 → 教育列表 → 工作经历 → 技能标签
#    → 完成后显示 ✓
# 3. 上传 3 份 PDF，逐个点击"开始解析"
#    → 每个独立渲染，互不影响
```

---

## Step 12: 后端 — 匹配评分接口

**目标**: 实现 `POST /candidates/:id/score`，AI 匹配评分。

**操作**:
1. 在 `modules/ai/ai.service.ts` 中添加 `scoreCandidate(candidateJson, jobJson)` 方法：调用 AI API（非流式），使用评分 Prompt（参照 HIGH-LEVEL-DESIGN.md 5.3）
2. 创建 `modules/candidate/score.controller.ts` 或在 CandidateController 中添加
3. `POST /candidates/:id/score`：
   1. 读取候选人（含 educations, work_experiences, skills, projects）
   2. 校验 `upload_status = completed`
   3. 通过 `job_id` 读取关联岗位 JD
   4. 构造评分 Prompt
   5. 调用 AI API（非流式）
   6. 解析返回 JSON：overallScore, skillScore, experienceScore, educationScore, aiComment
   7. 写入 candidate 记录
   8. 返回评分结果
4. 错误处理：AI 调用失败返回 500 + 友好错误信息

**验证**:
```bash
# 先完成 AI 提取（Step 10），使候选人 upload_status=completed
curl http://localhost:3001/api/v1/candidates/<id>/score -X POST
# → { code: 0, data: { overallScore: 82, skillScore: 90, experienceScore: 75, educationScore: 80, aiComment: "..." } }
```

---

## Step 13: 前端 — 评分图表 + 候选人详情页

**目标**: 候选人详情页展示结构化信息 + 评分图表 + 状态管理。

**操作**:
1. 创建 `components/charts/score-radar.tsx`：Recharts 雷达图（技能、经验、教育、综合四维）
2. 创建 `components/charts/score-ring.tsx`：环形进度条（综合分）
3. 完善 `app/candidates/[id]/page.tsx`：
   - 基本信息区：姓名、电话、邮箱、城市
   - 教育区：学校、专业、学历、毕业时间列表
   - 工作经历：公司、职位、时间、摘要（时间线样式）
   - 技能标签：Tag 形式展示
   - 状态管理：StatusBadge + 状态变更下拉菜单
   - 评分区：
     - 未评分：显示"开始评分"按钮
     - 已评分：雷达图 + 环形进度条 + AI 评语卡片
     - 点击"开始评分" → `POST /candidates/:id/score` → loading → 显示评分图表
4. 创建 `components/candidate/status-badge.tsx`：彩色状态标签 + 状态变更下拉
5. 创建 `components/candidate/status-timeline.tsx`：状态变更时间线（可选）

**验证**:
```bash
# 1. 打开 /candidates/<id>（已完成 AI 提取的候选人）
#    → 看到完整结构化信息
#    → 状态：pending（灰色）
#    → 评分区：显示"开始评分"按钮
# 2. 点击"开始评分"
#    → loading 3-10 秒
#    → 雷达图 + 环形进度条 + AI 评语
# 3. 变更状态为 screened
#    → 状态标签变蓝
```

---

## Step 14: 前端 — 候选人列表页

**目标**: 实现候选人列表，支持多种视图和筛选。

**操作**:
1. 创建 `components/candidate/candidate-table.tsx`：表格视图（Shadcn DataTable）
   - 列：姓名、岗位、状态、综合评分、技能标签、上传时间
   - 可排序列、可点击行进入详情
2. 创建 `components/candidate/candidate-card.tsx`：卡片视图
3. 组装 `app/candidates/page.tsx`：
   - 顶部：岗位 Tab 切换（从 GET /jobs 获取）+ "全部"Tab
   - 工具栏：搜索框 + 表格/卡片视图切换 + 排序下拉
   - 主体：DataTable 或 CardGrid
   - 底部：分页
4. 默认只展示 `upload_status=completed` 的候选人
5. 使用 react-query 管理数据请求和缓存

**验证**:
```bash
# 1. 打开 /candidates
#    → 看到已分析完成的候选人列表
#    → 岗位 Tab 可切换筛选
#    → 搜索框可按姓名搜索
#    → 表格/卡片视图可切换
#    → 分页正常
# 2. 点击候选人进入详情页
```

---

## Step 15: 前端 — JD 编辑器 + 岗位管理

**目标**: 实现岗位列表 + JD 编辑器。

**操作**:
1. 创建 `components/job/jd-editor.tsx`：
   - 岗位名称 input
   - 岗位描述 textarea
   - 必备技能标签输入（输入 + Enter 添加，点击 x 删除）
   - 加分技能标签输入
2. 创建 `components/job/skill-tags.tsx`：技能标签输入组件
3. 完善 `app/jobs/page.tsx`：
   - 岗位列表（卡片或表格）
   - 新建按钮 → 弹出 JD 编辑器 Dialog
   - 每个岗位可编辑/删除
4. 完善 `app/jobs/[id]/page.tsx`：
   - JD 编辑器（查看/编辑模式）
   - 保存按钮 → `PUT /jobs/:id`

**验证**:
```bash
# 1. 打开 /jobs
#    → 看到种子数据"软件工程师"
#    → 可新建岗位
# 2. 点击岗位进入 /jobs/<id>
#    → JD 编辑器展示岗位信息
#    → 可编辑名称、描述、技能标签
#    → 保存成功
```

---

## Step 16: 前端 — Dashboard 仪表盘

**目标**: 首页展示统计数据。

**操作**:
1. 完善 `app/page.tsx`：
   - 统计卡片：总候选人数、各状态数量、平均评分
   - 各岗位候选人统计（按岗位分组）
   - 最近上传列表
2. 后端新增统计接口（可选，或前端用现有 API 聚合）：
   - `GET /stats/overview`：返回统计数据

**验证**:
```bash
# 打开 /
# → 看到统计卡片、岗位分布、最近上传
```

---

## Step 17: 端到端验证 — 本地完整流程

**目标**: 验证 Phase 1-5 全部完成，本地完整流程可跑通。

**验证**:
```bash
# 1. 启动后端 + 前端
# 2. 浏览器完整流程:
#    → 打开 / → Dashboard 统计
#    → 打开 /jobs → 新建岗位"前端工程师"
#    → 打开 /upload → 选择岗位 → 上传 3 份 PDF
#    → 逐个点击"开始解析" → SSE 逐步渲染
#    → 打开 /candidates → 列表展示 3 个候选人
#    → 点击候选人 → 详情页 → 点击"开始评分" → 雷达图 + 评语
#    → 变更状态 → 颜色反馈
#    → 打开 /jobs/<id> → JD 编辑器
#    → 暗色/亮色主题切换正常
# 3. 无控制台报错
```

---

## Step 18: 部署

**目标**: 部署到 Vercel + Render。

**前置**: Step 17 验证通过，本地完整流程可跑通。

### 后端 (Render)
1. 创建 Web Service，连接 Git 仓库
2. Root Directory: `apps/api`
3. Build Command: `pnpm install && pnpm build`
4. Start Command: `node dist/main.js`
5. 环境变量: AI_API_BASE, AI_API_KEY, AI_MODEL, CORS_ORIGIN, DB_PATH, UPLOAD_DIR
6. 配置持久磁盘（SQLite 数据库和 uploads 目录）

### 前端 (Vercel)
1. 连接 Git 仓库
2. Root Directory: `apps/web`
3. 环境变量: `NEXT_PUBLIC_API_URL` → Render 后端地址
4. 构建命令可能需要调整（monorepo 场景）

### 联调验证
1. 完整流程：创建岗位 → 上传 PDF → AI 提取 → 评分 → 列表管理 → 状态变更
2. 暗色/亮色主题
3. CORS 正常

---

## Step 19: 加分项

**前置**: Step 18 部署完成（或可独立在本地开发验证）。

### 19a. 手动修正表单
- 创建 `components/candidate/candidate-form.tsx`
- 候选人详情页各区域添加"编辑"按钮
- 切换为表单模式，可修改字段
- 保存调用 `PUT /candidates/:id`

### 19b. 候选人对比页
- 完善 `app/compare/page.tsx`
- 选择同岗位 2-3 人并排对比
- 多维度雷达图重叠 + 表格对比

### 19c. PDF 预览
- 安装 `react-pdf`
- 候选人详情页内嵌 PDF 查看器

### 19d. 项目经历展示
- 候选人详情页增加项目经历区域

### 19e. 骨架屏 + 动画
- 所有列表/详情页添加 Skeleton
- 页面切换淡入动画

### 19f. 键盘快捷键
- `Ctrl+K` 全局搜索

**验证**: 各功能独立可用。

---

## 依赖关系图

```
Step 1 (NestJS 项目)
  └→ Step 2 (DB Schema)
      └→ Step 3 (Seed + 响应格式)
          ├→ Step 4 (Job CRUD)
          └→ Step 5 (Candidate CRUD)
              └→ Step 7 (PDF 上传 + 解析) ← 依赖 Step 4（需要 jobId）

Step 6 (shared + 前端布局) ← 独立，可与 Step 1-5 并行
  └→ Step 8 (上传页面) ← 依赖 Step 7（后端上传接口）
      └→ Step 9 (端到端验证)

Step 10 (AI SSE 接口) ← 依赖 Step 7（需要候选人数据）
  └→ Step 11 (SSE 渲染)

Step 12 (评分接口) ← 依赖 Step 10（需要候选人提取完成）
  └→ Step 13 (评分图表 + 详情页)

Step 14 (候选人列表页) ← 依赖 Step 13 或可并行
Step 15 (JD 编辑器) ← 依赖 Step 4（Job CRUD）
Step 16 (Dashboard) ← 依赖 Step 14

Step 17 (端到端验证) ← 依赖 Step 14-16
Step 18 (部署) ← 依赖 Step 17
Step 19 (加分项) ← 依赖 Step 18
```

## 关键注意事项

- **upload_status 流转**: `uploading → pending → completed/failed`。上传接口返回时就是 `pending`（PDF 已同步解析）。AI 提取由 HR 手动触发。
- **status 生效时机**: 只有 `upload_status=completed` 后，`status` 才有意义。AI 提取完成时自动设置 `status=pending`。
- **SSE 用 POST 请求**: `POST /ai/extract/:id` 返回 SSE 流。前端用 `fetch` + `ReadableStream` 解析，不能用 `EventSource`（仅支持 GET）。
- **评分是同步调用**: `POST /candidates/:id/score` 是普通 REST 响应，不是 SSE。
- **本地开发**: 前端 `http://localhost:3000`，后端 `http://localhost:3001`。前端 `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`。
