# 高层设计文档：AI 赋能的智能简历分析平台

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js 16 (App Router)                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │  │
│  │  │ 上传+提取│ │ 候选人   │ │ 岗位管理  │ │ 对比分析 │  │  │
│  │  │ Upload   │ │ 管理     │ │ JD Mgr   │ │ Compare │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  Shadcn UI + Tailwind v4 + Recharts             │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │ REST API + SSE                  │
│                            ▼                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              NestJS Backend                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │  │
│  │  │ Resume   │ │ AI       │ │ Candidate│ │ Job     │  │  │
│  │  │ Module   │ │ Module   │ │ Module   │ │ Module  │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                    Render (Backend)                          │
│                            │                                │
│              ┌─────────────┼─────────────┐                  │
│              ▼             ▼             ▼                  │
│         ┌────────┐  ┌──────────┐  ┌──────────┐             │
│         │ SQLite │  │ OpenAI   │  │ PDF      │             │
│         │ (本地)  │  │ API      │  │ Parser   │             │
│         └────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## 2. 数据模型设计

### 2.1 ER 关系图

> **核心关系**: 一份简历对应一个岗位。上传时选定岗位，评分直接存储在候选人记录上。

```
┌──────────────────┐
│ job_descriptions  │
│──────────────────│
│ id               │
│ title            │
│ description      │
│ required_skills  │
│ bonus_skills     │
│ created_at       │
│ updated_at       │
└────────┬─────────┘
         │1
         │
         │*
┌────────┴─────────┐
│  candidates       │
│──────────────────│
│ id               │
│ job_id (FK)      │
│ name             │
│ phone            │
│ email            │
│ city             │
│ status           │
│ raw_text         │
│ file_name        │
│ file_path        │
│ file_size        │
│ page_count       │
│ upload_status    │
│ overall_score    │
│ skill_score      │
│ experience_score │
│ education_score  │
│ ai_comment       │
│ created_at       │
│ updated_at       │
└──────┬───────────┘
       │1
       │
┌──────┴───────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ educations       │  │work_experien.│  │   skills     │  │  projects    │
│──────────────────│  │──────────────│  │──────────────│  │──────────────│
│ id               │  │ id           │  │ id           │  │ id           │
│ candidate_id(FK) │  │candidate_id  │  │candidate_id  │  │candidate_id  │
│ school           │  │ company      │  │ name         │  │ name         │
│ major            │  │ position     │  │ category     │  │ tech_stack   │
│ degree           │  │ start_date   │  └──────────────┘  │responsibilit.│
│ graduated_at     │  │ end_date     │                     │ highlights   │
└──────────────────┘  │ summary      │                     └──────────────┘
                      └──────────────┘
```

### 2.2 数据库表定义 (SQLite)

#### `candidates` 候选人主表 (合并简历文件信息)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| job_id | TEXT (FK) | 关联岗位 (上传时选定，一份简历对应一个岗位) |
| name | TEXT | 姓名 |
| phone | TEXT | 电话 |
| email | TEXT | 邮箱 |
| city | TEXT | 所在城市 |
| status | TEXT | 候选人状态，见下方状态流转说明 |
| raw_text | TEXT | PDF 提取的原始文本 |
| file_name | TEXT | 原始文件名 |
| file_path | TEXT | PDF 存储路径 |
| file_size | INTEGER | 文件大小 (bytes) |
| page_count | INTEGER | PDF 页数 |
| upload_status | TEXT | 处理管线状态: `uploading` / `pending` / `completed` / `failed`，见下方说明 |
| overall_score | INTEGER | 综合评分 (0-100)，AI 评分后填入 |
| skill_score | INTEGER | 技能匹配度 |
| experience_score | INTEGER | 经验相关性 |
| education_score | INTEGER | 教育背景契合度 |
| ai_comment | TEXT | AI 评语 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**双维度状态说明：**

候选人有两个独立的状态字段，分别管控不同阶段：

### upload_status（处理管线状态）

管控从文件上传到 AI 提取完成的管线。PDF 解析同步完成，HR 手动触发 AI 提取。

```
uploading ──→ pending ──→ completed
                   │
                   ▼
                failed
```

| 状态 | 触发 | 含义 | 候选人可见性 |
|------|------|------|-------------|
| `uploading` | 文件开始上传 | PDF 文件正在传输中 | 仅上传弹框可见 |
| `pending` | 上传接口返回 | raw_text 已解析完成，等待 HR 点击"开始解析" | 上传页可见，显示"开始解析"按钮 |
| `completed` | HR 确认保存 | 结构化信息已入库，`status` 自动设为 `pending` | 出现在候选人列表和管理流程 |
| `failed` | AI 提取失败 | 可重试 | 可见，显示"重试"按钮 |

- `uploading` → `pending`：上传接口同步完成（PDF 解析、raw_text 入库），接口返回时直接为 `pending`
- `pending` → `completed`：HR 点击"开始解析" → AI SSE 返回提取数据 → 前端展示可编辑表单 → HR 确认保存后切换，同时 `status = pending`
- `pending` → `failed`：AI 提取过程出错；`failed` 可重新点击"重试"回到 `pending` 再触发提取

### status（业务状态）

管控 HR 的招聘流程。**只在 `upload_status = completed` 后生效**。

```
pending ──→ screened ──→ interviewing ──→ hired
  │            │              │
  │            │              └──→ rejected
  │            └──→ rejected
  └──→ rejected
```

| 状态 | 含义 | 视觉颜色 |
|------|------|----------|
| `pending` | 待筛选 — AI 提取完成，等待 HR 评估 | 灰色 (neutral) |
| `screened` | 初筛通过 — HR 确认候选人符合基本要求 | 蓝色 (blue) |
| `interviewing` | 面试中 — 候选人正在参与面试流程 | 黄色 (yellow/amber) |
| `hired` | 已录用 — 终态 | 绿色 (green) |
| `rejected` | 已淘汰 — 终态，任何阶段可转入 | 红色 (red) |

> 状态单向流转，`hired` 和 `rejected` 为终态不可回退。`upload_status` 非 `completed` 的候选人，`status` 字段无意义，不允许变更。

#### `educations` 教育背景表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| candidate_id | TEXT (FK) | 关联候选人 |
| school | TEXT | 学校 |
| major | TEXT | 专业 |
| degree | TEXT | 学历 (本科/硕士/博士等) |
| graduated_at | TEXT | 毕业时间 |

#### `work_experiences` 工作经历表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| candidate_id | TEXT (FK) | 关联候选人 |
| company | TEXT | 公司名称 |
| position | TEXT | 职位 |
| start_date | TEXT | 开始时间 |
| end_date | TEXT | 结束时间 |
| summary | TEXT | 工作内容摘要 |

#### `skills` 技能标签表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| candidate_id | TEXT (FK) | 关联候选人 |
| name | TEXT | 技能名称 |
| category | TEXT | 分类: `language` / `framework` / `tool` / `platform` / `other` |

#### `projects` 项目经历表 (加分项)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| candidate_id | TEXT (FK) | 关联候选人 |
| name | TEXT | 项目名称 |
| tech_stack | TEXT (JSON) | 技术栈 |
| responsibilities | TEXT | 个人职责 |
| highlights | TEXT | 项目亮点 |

#### `job_descriptions` 岗位需求表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| title | TEXT | 岗位名称 |
| description | TEXT | 岗位描述 |
| required_skills | TEXT (JSON) | 必备技能列表 |
| bonus_skills | TEXT (JSON) | 加分技能列表 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

> **初始化种子数据**: 应用首次启动时，自动在 `job_descriptions` 表中插入一条默认 JD 记录，确保上传简历时有可选项。默认 JD 内容为通用软件工程师岗位（title: "软件工程师"，包含常见的必备技能和加分技能）。

## 3. API 设计 (RESTful)

Base URL: `http://<backend-host>:3001/api/v1`

### 3.1 简历上传与解析

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/resumes/upload` | 批量上传 PDF (multipart/form-data, 字段名: `files`, `jobId`) |
| `GET` | `/candidates/:id/upload-status` | 查询简历解析状态 |
| `GET` | `/candidates/:id/thumbnail` | 获取首页缩略图 (加分项) |

**上传请求:** `jobId` 为必传字段，指定这批简历对应的岗位。

**上传响应示例：**
```json
{
  "data": [
    {
      "candidateId": "uuid-c1",
      "fileName": "resume_zhangsan.pdf",
      "uploadStatus": "pending"
    }
  ]
}
```

### 3.2 AI 信息提取 (SSE) + 档案保存

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/ai/extract/:candidateId` | 触发 AI 提取 (返回 SSE 流，不写入 DB) |
| `PUT` | `/candidates/:candidateId/profile` | 保存候选人档案 (HR 确认后的完整数据写入 DB) |

**SSE 事件格式（AI streaming 实时推送，不写 DB）：**
```
event: progress
data: {"step": "connecting", "message": "正在连接 AI 服务..."}

event: thinking
data: {"delta": "让我分析这份简历..."}

event: thinking
data: {"delta": "提取姓名和联系方式..."}

event: progress
data: {"step": "generating", "message": "正在生成基本信息..."}

event: partial
data: {"field": "basics", "data": {"name": "张三", "phone": "138xxxx", "email": null, "city": null}}

event: progress
data: {"step": "generating", "message": "正在生成教育背景..."}

event: partial
data: {"field": "education", "data": [{"school": "清华大学", "major": "CS", "degree": "本科", "graduatedAt": "2020"}]}

event: partial
data: {"field": "workExperience", "data": [{"company": "字节", ...}]}

event: partial
data: {"field": "skills", "data": [{"name": "React", "category": "framework"}]}

event: partial
data: {"field": "projects", "data": []}

event: complete
data: {"candidateId": "uuid-c1"}

event: error
data: {"message": "AI 服务异常"}
```

**SSE 事件类型说明：**

| 事件 | 说明 | 前端行为 |
|------|------|----------|
| `progress` | 阶段状态更新 | 显示进度文案（连接中、生成中...） |
| `thinking` | AI 思维链 token（仅支持 reasoning 的模型） | 滚动显示 AI 思考过程，让用户知道 AI 在工作 |
| `partial` | 一个完整字段解析完毕 | 渲染该字段的骨架屏 → 实际数据 |
| `complete` | 全部字段提取完毕 | 显示可编辑表单 + "确认保存"按钮 |
| `error` | 出错 | 显示错误信息 + "重试"按钮 |

**后端实现要点：**
- AI 调用必须使用 `stream: true`
- 逐 token 积累 buffer，通过括号匹配检测字段闭合（`"basics": {...}` 闭合时发送 partial）
- 如果模型返回 `reasoning_content`（如 DeepSeek），实时转发为 `thinking` 事件
- 所有事件基于 AI stream 实时产生，不等待完整响应

**档案保存请求 `PUT /candidates/:id/profile`：**
```json
{
  "basics": { "name": "张三", "phone": "138xxxx", "email": "zhang@example.com", "city": "北京" },
  "education": [{ "school": "清华大学", "major": "CS", "degree": "本科", "graduatedAt": "2020" }],
  "workExperience": [{ "company": "字节", "position": "前端", "startDate": "2020", "endDate": "2023", "summary": "..." }],
  "skills": [{ "name": "React", "category": "framework" }],
  "projects": [{ "name": "xxx", "techStack": ["React"], "responsibilities": "...", "highlights": "..." }]
}
```

**档案保存响应：** 返回更新后的候选人完整数据，`upload_status = completed`，`status = pending`。

### 3.3 候选人管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/candidates` | 候选人列表 (分页、搜索、排序、筛选) |
| `GET` | `/candidates/:id` | 候选人详情 |
| `PUT` | `/candidates/:id` | 更新候选人信息 (手动修正) |
| `PUT` | `/candidates/:id/status` | 更新候选人状态 |
| `DELETE` | `/candidates/:id` | 删除候选人 |

**列表查询参数：**
```
?page=1&pageSize=10
&search=张三
&status=pending
&jobId=uuid-j1
&sortBy=overallScore&sortOrder=desc
&skills=React,TypeScript
```

### 3.4 岗位管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/jobs` | 岗位列表 |
| `GET` | `/jobs/:id` | 岗位详情 |
| `POST` | `/jobs` | 创建岗位 |
| `PUT` | `/jobs/:id` | 更新岗位 |
| `DELETE` | `/jobs/:id` | 删除岗位 |

### 3.5 匹配评分

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/candidates/:id/score` | 对候选人进行 AI 匹配评分 (基于其关联的岗位) |

> 候选人已通过 `job_id` 关联岗位，无需再传 jobId。评分结果直接更新候选人记录的评分字段。

**评分响应：**
```json
{
  "data": {
    "overallScore": 82,
    "skillScore": 90,
    "experienceScore": 75,
    "educationScore": 80,
    "aiComment": "候选人在 React 和 TypeScript 方面有扎实的技术基础..."
  }
}
```

## 4. 前端页面与组件设计

### 4.1 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Dashboard | 数据概览 (统计卡片 + 各岗位候选人统计) |
| `/upload` | Upload & Extract | 简历上传 + AI 提取页 (模块一+模块二合一)。上传通过弹框完成，页面展示提取进度和结果 |
| `/candidates` | Candidate List | 候选人列表 (仅展示 upload_status=completed 的候选人，按岗位 Tab 分组 + 表格/卡片切换 + 筛选 + 搜索 + 分页) |
| `/candidates/[id]` | Candidate Detail | 候选人详情 (结构化信息 + 评分图表 + AI 评语 + PDF 预览) |
| `/jobs` | Job List | 岗位管理列表 (CRUD) |
| `/jobs/[id]` | Job Detail | JD 编辑器 (查看/编辑岗位需求) |
| `/compare` | Compare | 候选人对比 (加分项: 选择同岗位 2-3 人并排对比各维度评分) |

### 4.2 全局布局

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo + 搜索栏 + 主题切换 + 快捷键提示        │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │              Main Content                │
│          │                                          │
│ 📊 概览  │                                          │
│ 📤 上传  │                                          │
│ 👥 候选人│                                          │
│ 💼 岗位  │                                          │
│ ⚖️  对比  │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### 4.3 核心交互流程

#### 简历上传 + AI 提取流程 (`/upload` 页面)

```
HR 打开 /upload 页面
    ↓
页面主体: 空状态提示 "点击上传简历" 或展示已上传候选人的解析状态
    ↓
HR 点击上传按钮 → 弹出 UploadDialog 弹框
    ↓
弹框内容:
  ├── 岗位下拉选择 (必选)
  ├── 拖拽上传区域 (限制 PDF)
  └── 已选文件列表 (可移除)
    ↓
HR 确认上传 → 弹框关闭
    ↓
POST /resumes/upload (multipart, 含 jobId)
    ↓
后端同步: 接收文件 → 存储 PDF → 创建候选人 (upload_status=pending)
       → pdfjs-dist 解析文本 → raw_text 入库
    ↓
返回候选人列表 [{ candidateId, uploadStatus: "pending" }]
    ↓
页面主体展示每个候选人的卡片:
  ├── 文件名、上传时间
  ├── 状态: "待解析" (pending)
  └── "开始解析" 按钮
    ↓
HR 点击某个候选人的 "开始解析" 按钮
    ↓
POST /ai/extract/:id (SSE, AI stream)
    ↓
SSE 基于 AI stream 实时推送，用户立即看到数据流动:
   ├── progress: "正在连接 AI 服务..."
   ├── thinking: "让我分析这份简历..." ← AI 思维链（如果有）
   ├── progress: "正在生成基本信息..."
   ├── partial: basics → AI 刚输出完 basics 字段，立即渲染
   ├── progress: "正在生成教育背景..."
   ├── partial: education → AI 刚输出完 education 字段，立即渲染
   ├── partial: workExperience → 同上
   ├── partial: skills → 同上
   └── complete → 全部字段提取完毕（未写入 DB）
    ↓
卡片展示可编辑的提取结果表单，HR 可修改任意字段
    ↓
HR 点击 "确认保存" 按钮
    ↓
PUT /candidates/:id/profile (发送全部提取数据)
    ↓
后端写入 DB，upload_status = completed，status = pending
    ↓
该候选人卡片显示完成状态
候选人出现在 /candidates 列表页
    ↓
HR 继续点击下一个候选人的 "开始解析" 按钮
(如果某个候选人提取失败 → upload_status = failed，显示"重试"按钮)
```

#### 候选人匹配评分流程

```
HR 在候选人详情页 `/candidates/[id]` 点击"开始评分"
    ↓
POST /candidates/:id/score
    ↓
后端读取候选人信息 + 关联岗位 JD (通过 job_id)
    ↓
调用 AI 进行匹配分析
    ↓
返回评分结果 (各维度分数 + AI 评语)
    ↓
评分写入候选人记录 (overall_score 等)
    ↓
前端展示雷达图 + 环形进度条 + 评语卡片
```

#### 手动修正流程

**上传页（核心流程）**: AI 提取完成后，ExtractProgress 卡片直接展示可编辑表单，HR 在确认保存前即可修改任意字段。

**候选人详情页（加分项）**: 已确认保存的候选人，在详情页仍可二次编辑。

```
HR 在候选人详情页查看已保存的提取结果
    ↓
点击某区域的"编辑"按钮 → 切换为表单模式
    ↓
HR 修改字段 (如修正电话号码、补充工作经历)
    ↓
PUT /candidates/:id/profile → 保存更新
    ↓
表单切回展示模式，显示更新后的数据
```

### 4.4 关键组件清单

| 组件 | 目录 | 说明 |
|------|------|------|
| `UploadDialog` | `components/candidate/` | 上传弹框 (岗位选择 + 拖拽区 + 文件列表) |
| `ExtractProgress` | `components/candidate/` | 单个候选人卡片 (AI思考过程→骨架屏逐步填充→可编辑表单→确认保存) |
| `ExtractList` | `components/candidate/` | 上传页候选人卡片列表 (展示不同状态: 待解析/解析中/已完成/失败) |
| `PdfThumbnail` | `components/candidate/` | PDF 首页缩略图预览 (加分项) |
| `CandidateTable` | `components/candidate/` | 候选人表格视图 |
| `CandidateCard` | `components/candidate/` | 候选人卡片视图 |
| `CandidateForm` | `components/candidate/` | 信息编辑表单 (手动修正) |
| `StatusBadge` | `components/candidate/` | 候选人状态标签 |
| `StatusTimeline` | `components/candidate/` | 状态变更时间线 |
| `ScoreRadar` | `components/charts/` | 评分雷达图 |
| `ScoreBar` | `components/charts/` | 评分柱状图 |
| `ScoreRing` | `components/charts/` | 综合评分环形进度条 |
| `JdEditor` | `components/job/` | 岗位描述编辑器 |
| `SkillTags` | `components/job/` | 技能标签输入组件 |
| `ComparePanel` | `components/compare/` | 候选人对比面板 |
| `AppSidebar` | `components/layout/` | 应用侧边栏 |
| `AppHeader` | `components/layout/` | 应用头部 |
| `DataTable` | `components/ui/` | 通用数据表格 (Shadcn) |
| `Skeleton` | `components/ui/` | 骨架屏 (Shadcn) |

## 5. AI 集成设计

### 5.1 AI 调用策略

- **模型**: OpenAI Compatible API (支持任意兼容接口, 如 DeepSeek / Ollama / OpenAI)
- **配置**: 通过环境变量配置 `AI_API_BASE` + `AI_API_KEY` + `AI_MODEL`
- **流式调用**: 信息提取必须使用 `stream: true`，逐 token 解析，实时推送 SSE 事件
- **思维链支持**: 如果模型返回 `reasoning_content`（如 DeepSeek），实时转发为 `thinking` 事件
- **Prompt 工程**: 使用结构化 prompt + JSON schema 约束输出格式

### 5.2 信息提取流式解析策略

AI 以 `stream: true` 返回 token 流，后端需要实时解析并推送：

```
AI stream tokens:  { " b a s i c s " :   { " n a m e " : " 张 三 " ...
                                                          ↑ 括号闭合 → 检测到 basics 字段完成
                                                          → 发送 event: partial (basics)
```

**字段闭合检测算法**：
1. 维护一个字符串 buffer，逐 token 追加
2. 维护括号深度计数器（`{` +1, `}` -1）
3. 当检测到 `"fieldName":` 模式且后续的 `{...}` 或 `[...]` 闭合时（深度归零），提取该字段 JSON
4. 解析为结构化数据，发送 `event: partial`
5. 已解析的字段从 buffer 中移除，继续处理下一个字段

**思维链处理**：
- OpenAI SDK stream chunk 中如果包含 `reasoning_content` 字段，累加并发送 `event: thinking`
- 如果模型不支持思维链，跳过此步骤

### 5.2 信息提取 Prompt 设计

```
System: 你是一个专业的简历信息提取助手。请从简历文本中提取结构化信息，以 JSON 格式返回。

User:
请从以下简历文本中提取信息:
---
{raw_text}
---

请严格按照以下 JSON Schema 返回:
{
  "basics": { "name": "", "phone": "", "email": "", "city": "" },
  "education": [{ "school": "", "major": "", "degree": "", "graduatedAt": "" }],
  "workExperience": [{ "company": "", "position": "", "startDate": "", "endDate": "", "summary": "" }],
  "skills": [{ "name": "", "category": "" }],
  "projects": [{ "name": "", "techStack": [], "responsibilities": "", "highlights": "" }]
}

如果某个字段无法提取，请返回 null。
```

### 5.3 匹配评分 Prompt 设计

```
System: 你是一个专业的招聘匹配分析师。请根据候选人信息和岗位需求进行匹配度评分。

User:
候选人信息:
{candidate_json}

岗位需求:
{job_json}

请评分并返回 JSON:
{
  "overallScore": 0-100,
  "skillScore": 0-100,
  "experienceScore": 0-100,
  "educationScore": 0-100,
  "aiComment": "200字以内的评语，说明优势与不足"
}
```

> 候选人的 `job_id` 关联到具体岗位，评分时从候选人读取结构化信息，从关联岗位读取 JD，一起送给 AI 评分。

## 6. Monorepo 项目结构

```
asterfire-coding-test/
├── apps/
│   ├── web/                    # Next.js 16 前端 (已有基础)
│   │   ├── app/
│   │   │   ├── layout.tsx              # 根布局 (Theme + Sidebar)
│   │   │   ├── page.tsx                # Dashboard 仪表盘
│   │   │   ├── upload/
│   │   │   │   └── page.tsx            # 简历上传 + AI 提取页 (模块一+模块二)
│   │   │   ├── candidates/
│   │   │   │   ├── page.tsx            # 候选人列表
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx        # 候选人详情
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx            # 岗位管理列表
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx        # 岗位详情 / JD 编辑器
│   │   │   └── compare/
│   │   │       └── page.tsx            # 候选人对比页
│   │   ├── components/
│   │   │   ├── ui/                     # Shadcn 组件
│   │   │   ├── layout/                 # 布局组件 (Sidebar, Header)
│   │   │   ├── candidate/              # 候选人相关组件 (含上传)
│   │   │   ├── job/                    # 岗位相关组件
│   │   │   └── charts/                 # 图表组件
│   │   ├── hooks/                      # 自定义 Hooks
│   │   ├── lib/
│   │   │   ├── api-client.ts           # API 请求封装
│   │   │   └── utils.ts
│   │   └── types/                      # TypeScript 类型定义
│   │
│   └── api/                    # NestJS 后端 (新建)
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── modules/
│       │   │   ├── candidate/          # 候选人管理 (含上传、解析、评分)
│       │   │   ├── job/                # 岗位管理
│       │   │   └── ai/                 # AI 提取与评分
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── filters/
│       │   │   ├── interceptors/
│       │   │   └── decorators/
│       │   └── config/
│       └── uploads/                    # PDF 文件存储目录
│
├── packages/
│   └── shared/                 # 共享类型与常量
│       ├── src/
│       │   ├── types/          # 前后端共享的 TS 类型
│       │   └── constants/      # 共享常量 (状态枚举等)
│       └── package.json
│
├── docs/
├── pnpm-workspace.yaml
└── package.json
```

## 7. 技术选型详细

### 7.1 后端 (NestJS)

| 依赖 | 用途 |
|------|------|
| `@nestjs/core` | NestJS 核心 |
| `@nestjs/common` | 常用装饰器与工具 |
| `@nestjs/platform-express` | Express 适配器 (支持 multipart) |
| `multer` | 文件上传中间件 |
| `pdfjs-dist` | PDF 文本提取 (推荐，CJK 支持最好) |
| `better-sqlite3` | SQLite 驱动 (同步, 性能优) |
| `drizzle-orm` | ORM (轻量, 类型安全) |
| `openai` | OpenAI SDK (兼容模式) |

### 7.2 前端 (Next.js) 新增依赖

| 依赖 | 用途 |
|------|------|
| `recharts` | 图表可视化 (雷达图/柱状图/环形图) |
| `react-dropzone` | 拖拽上传 |
| `react-pdf` | PDF 预览 (加分项) |
| `@tanstack/react-query` | 数据请求与缓存管理 |
| Shadcn 新增组件 | `table`, `card`, `tabs`, `badge`, `input`, `select`, `skeleton`, `avatar`, `progress`, `tooltip`, `command` |

### 7.3 共享包 (`packages/shared`)

```typescript
// types/candidate.ts
export type CandidateStatus = 'pending' | 'screened' | 'interviewing' | 'hired' | 'rejected';

export interface CandidateBasics {
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
}

export interface Education {
  school: string;
  major: string;
  degree: string;
  graduatedAt: string | null;
}

// ... 其余类型定义
```

## 8. 部署方案

### 8.1 前端 (Vercel)

- 连接 Git 仓库，自动部署
- Root Directory 设置为 `apps/web`
- 环境变量: `NEXT_PUBLIC_API_URL` → 后端 Render 地址
- 构建命令: `pnpm build` (需要在项目根目录执行)

### 8.2 后端 (Render)

- 创建 Web Service，连接同一 Git 仓库
- Root Directory: `apps/api`
- Build Command: `pnpm install && pnpm build`
- Start Command: `node dist/main.js`
- 环境变量:
  - `AI_API_BASE` - AI API 地址
  - `AI_API_KEY` - API 密钥
  - `AI_MODEL` - 模型名称
  - `CORS_ORIGIN` - Vercel 前端地址
  - `UPLOAD_DIR` - 文件存储路径
  - `DB_PATH` - SQLite 数据库路径 (使用 Render 持久磁盘)

### 8.3 CORS 配置

后端配置 CORS，允许前端 Vercel 域名访问，并在响应头中设置：
```
Access-Control-Allow-Origin: https://<frontend>.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## 9. 非功能性设计

### 9.1 错误处理

- **前端**: 全局 Error Boundary + react-query 错误回退 + Toast 提示
- **后端**: NestJS 全局异常过滤器，统一错误响应格式
- **AI 调用**: 重试机制 (指数退避, 最多 3 次) + 超时控制 (30s)

### 9.2 Loading 状态

- 页面级: `loading.tsx` (Next.js 内置)
- 组件级: Skeleton 骨架屏
- 操作级: Button loading 状态 + Spinner
- 数据级: react-query `isPending` / `isFetching`

### 9.3 性能考虑

- PDF 解析同步完成，不阻塞上传响应（接口返回时已完成解析）
- AI 提取由 HR 在上传页面逐个手动触发，每次一个候选人
- AI 调用结果缓存到数据库，避免重复调用
- 前端列表使用分页，避免大量数据渲染
- 图表组件 lazy load

### 9.4 响应式设计

- 最小适配宽度: 1280px (桌面端)
- Sidebar 可折叠
- 表格横向滚动
- 图表自适应容器宽度
