# 简历处理全流程设计

## 一、候选人状态流转

一个候选人从上传到完成，经历两个维度的状态：

### 1.1 upload_status（处理管线状态）

管控从文件上传到 AI 提取完成的管线。PDF 解析同步完成，HR 手动触发 AI 提取。

```
uploading ──→ pending ──→ completed
                   │
                   ▼
                failed
```

| 状态 | 触发 | 含义 | 可见性 |
|------|------|------|--------|
| `uploading` | 文件开始上传 | PDF 正在传输 | 仅上传弹框 |
| `pending` | 上传接口返回 | raw_text 已解析完成，等待 HR 点击"开始解析" | 上传页可见，显示"开始解析"按钮 |
| `completed` | AI 提取完成 | 结构化信息已入库，候选人信息完整 | 出现在候选人列表和管理流程 |
| `failed` | AI 提取失败 | 可重试 | 可见，显示"重试"按钮 |

- `uploading` → `pending`：上传接口同步完成（PDF 解析、raw_text 入库），接口返回时直接为 `pending`
- `pending` → `completed`：HR 手动点击"开始解析"，AI SSE 流 complete 事件后自动切换，同时 `status = pending`
- `pending` → `failed`：AI 提取出错；`failed` 可重新点击"重试"

### 1.2 status（业务状态）

管控 HR 的招聘流程。**只在 `upload_status = completed` 后生效**。

```
pending ──→ screened ──→ interviewing ──→ hired
  │            │              │
  │            │              └──→ rejected
  │            └──→ rejected
  └──→ rejected
```

| 状态 | 含义 |
|------|------|
| `pending` | AI 提取完成，等待 HR 筛选 |
| `screened` | 初筛通过 |
| `interviewing` | 面试中 |
| `hired` | 已录用（终态） |
| `rejected` | 已淘汰（终态，任何阶段可转入） |

### 1.3 两维度状态关系

```
时间线 →

upload_status: uploading → pending → completed
                                           │
status:                     (不关心)      pending → screened → interviewing → hired/rejected
```

- `upload_status` 是前置管线，AI 提取由 HR 手动触发
- `status` 是业务管线，由 HR 手动驱动
- `upload_status = completed` 时，`status` 自动设为 `pending`，进入候选人列表

---

## 二、核心流程

### 步骤 1：上传 + PDF 解析（同步）

**入口**: `/upload` 页面 → 点击上传按钮 → 弹出 UploadDialog 弹框

```
前端                            后端
 │                               │
 │  弹框: 选择岗位 + 拖入 PDF    │
 │  确认上传                     │
 │  ──── POST /resumes/upload ──→│
 │     (files[], jobId)          │
 │                               │ multer 接收文件
 │                               │ 存储到 uploads/
 │                               │ 创建 candidate
 │                               │   upload_status = pending
 │                               │   job_id = jobId
 │                               │   status = null
 │                               │
 │                               │ 同步执行:
 │                               │   pdfjs-dist 逐页提取文本
 │                               │   文本清洗 (去空白/规范化)
 │                               │   raw_text = 清洗后文本
 │                               │
 │  ←── 返回候选人列表 ──────────│
 │     [{ candidateId,           │
 │        uploadStatus:          │
 │        "pending" }]           │
 │                               │
 │  弹框关闭                     │
 │  页面主体展示候选人卡片       │
 │  每个卡片: 文件名 + "开始解析"按钮 │
```

**耗时**: 1-3 秒（单个 PDF）

**关键点**:
- 同步处理，接口返回时 PDF 已解析完成
- 候选人已落库，`upload_status = pending`，raw_text 已就绪，等待 HR 手动触发 AI 提取
- 弹框关闭后，页面主体展示候选人卡片，每个卡片有"开始解析"按钮，等待 HR 手动触发

---

### 步骤 2：AI 信息提取（SSE，HR 手动触发）

**触发条件**: HR 在上传页面点击候选人卡片上的"开始解析"按钮，且该候选人 `upload_status = pending`。

```
前端                            后端
 │                               │
 │  HR 点击候选人的"开始解析"    │
 │                               │
 │  ── POST /ai/extract/:id ───→│
 │     (建立 SSE 连接)           │
 │                               │ 读取 candidate.raw_text
 │                               │ 构造提取 Prompt
 │                               │ 调用 AI API (stream: true)
 │                               │
 │  ← event: progress ──────────│ "正在提取基本信息..."
 │    卡片显示进度文案            │
 │                               │
 │  ← event: partial ───────────│ { field: "basics",
 │    骨架屏→渲染: 姓名电话邮箱  │   data: {name:"张三",...} }
 │                               │
 │  ← event: partial ───────────│ { field: "education",
 │    骨架屏→渲染: 教育列表      │   data: [{school:"清华",...}] }
 │                               │
 │  ← event: partial ───────────│ { field: "workExperience",
 │    骨架屏→渲染: 工作经历      │   data: [{company:"字节",...}] }
 │                               │
 │  ← event: partial ───────────│ { field: "skills",
 │    骨架屏→渲染: 技能标签      │   data: [{name:"React",...}] }
 │                               │
 │                               │ 写入 DB:
 │                               │   candidate: name, phone, email, city
 │                               │   educations / work_experiences / skills
 │                               │   upload_status = completed
 │                               │   status = pending
 │                               │
 │  ← event: complete ──────────│ { candidateId,
 │                               │   uploadStatus: "completed" }
 │  SSE 连接关闭                 │
 │                               │
  │  该候选人卡片显示完成状态      │
 │  "开始解析"按钮消失            │
 │  候选人出现在 /candidates 列表│
 │                               │
 │  HR 可继续点击下一个候选人    │
 │  的"开始解析"按钮             │
```

**耗时**: 每个候选人 5-15 秒

**关键点**:
- HR 手动逐个触发，可自主决定解析顺序和是否解析
- 每个候选人有独立的卡片，骨架屏逐步替换为实际数据
- `complete` 后 `upload_status = completed`，`status = pending`，候选人出现在列表页
- 失败的候选人显示错误信息 + "重试"按钮，支持手动重新触发

---

### 步骤 3：AI 匹配评分（同步）

**入口**: 候选人详情页 `/candidates/[id]` → HR 点击"开始评分"

```
前端                            后端
 │                               │
 │  用户点击 "开始评分"           │
 │                               │
 │  ── POST /candidates/:id     │
 │     /score ─────────────────→│
 │                               │ 读取 candidate (结构化信息)
 │                               │ 读取关联 job (通过 job_id)
 │                               │ 构造评分 Prompt
 │                               │ 调用 AI API (非流式)
 │                               │
 │  ←── 返回评分结果 ────────────│
 │     { overallScore: 82,       │
 │       skillScore: 90,         │
 │       experienceScore: 75,    │
 │       educationScore: 80,     │
 │       aiComment: "..." }      │
 │                               │ 评分写入 candidate 记录
 │                               │
 │  渲染:                        │
 │    环形进度条 (综合分)         │
 │    雷达图 (四维评分)           │
 │    AI 评语卡                  │
```

**耗时**: 3-10 秒

---

## 三、端到端完整时序

```
HR 操作           前端                    后端                    AI API
  │                │                       │                       │
  │  打开/upload   │                       │                       │
  │ ─────────────→│                       │                       │
  │               │ 页面展示: 空状态或     │                       │
  │               │ 历史提取记录           │                       │
  │               │                       │                       │
  │  点击上传按钮 │                       │                       │
  │ ─────────────→│ 弹出 UploadDialog     │                       │
  │               │                       │                       │
  │  选择岗位     │                       │                       │
  │  拖入3份PDF   │                       │                       │
  │  确认上传     │                       │                       │
  │ ─────────────→│                       │                       │
  │               │ POST /resumes/upload   │                       │
  │               │ ──────────────────────→│                       │
  │               │                       │ 解析3份PDF (同步)      │
  │               │                       │ 创建3个candidate       │
  │               │                       │ upload_status=         │
  │               │                       │   pending              │
  │               │ ←─────────────────────│                       │
  │               │ 弹框关闭              │                       │
  │               │ 页面展示3个候选人卡片 │                       │
  │               │ 每个卡片: "开始解析"  │                       │
  │               │                       │                       │
  │  点击候选人1  │                       │                       │
  │  "开始解析"   │                       │                       │
  │ ─────────────→│                       │                       │
  │               │ POST /ai/extract/1    │                       │
  │               │ (SSE) ───────────────→│                       │
  │               │                       │ ─────────────────────→│
  │               │ ←─ partial: basics ───│ ←─ stream ───────────│
  │  卡片1:       │ ←─ partial: edu ─────│ ←─ stream ───────────│
  │  骨架屏逐步   │ ←─ partial: work ────│ ←─ stream ───────────│
  │  变为实际数据 │ ←─ partial: skills ──│ ←─ stream ───────────│
  │               │ ←─ complete ─────────│ upload→completed      │
  │               │                       │ status = pending      │
  │               │ 卡片1: 完成 ✓        │                       │
  │               │                       │                       │
  │  点击候选人2  │                       │                       │
  │  "开始解析"   │                       │                       │
  │ ─────────────→│                       │                       │
  │               │ POST /ai/extract/2    │                       │
  │               │ (SSE) ───────────────→│ ... 同上 ...          │
  │               │                       │                       │
  │  点击候选人3  │                       │                       │
  │  "开始解析"   │                       │                       │
  │ ─────────────→│                       │                       │
  │               │ POST /ai/extract/3    │                       │
  │               │ (SSE) ───────────────→│ ... 同上 ...          │
  │               │                       │                       │
  │  全部完成     │ 3个卡片全部完成       │                       │
  │  ────────────── 进入候选人管理流程 ─────────────────────────── │
  │               │                       │                       │
  │  打开/candidates│                      │                       │
  │ ─────────────→│ 列表展示3个候选人    │                       │
  │               │ status: pending       │                       │
  │               │                       │                       │
  │  点击候选人   │                       │                       │
  │ ─────────────→│                       │                       │
  │               │ 详情页:               │                       │
  │               │ 结构化信息 + "评分"   │                       │
  │  点击"评分"   │                       │                       │
  │ ─────────────→│                       │                       │
  │               │ POST /candidates/:id/score                     │
  │               │ ──────────────────────→│ ─────────────────────→│
  │               │                       │ ←─ JSON ──────────────│
  │               │ ←─────────────────────│                       │
  │  看到雷达图   │                       │                       │
```

---

## 四、PDF 解析方案选型

| 维度 | `pdf-parse` (v1.x) | `pdf2json` (v4.x) | `pdfjs-dist` (直接使用) |
|------|---------------------|--------------------|------------------------|
| **底层** | Mozilla PDF.js 封装 | 自有 PDF.js fork | Mozilla PDF.js 原生 |
| **API** | 最简洁 `pdf(buffer) → text` | 复杂，事件驱动，手动拼装 | 中等，逐页迭代 |
| **中文** | 好 | 不稳定，CJK 经常乱码 | 最好，完整 CMap |
| **多页** | 自动遍历 | 按页输出 | 逐页 API |
| **已知问题** | v1 测试文件 bug；CJK 需配置 | 静默挂起；中文乱码 | Node.js 需配置 worker |
| **适用** | 快速纯文本 | 需文本位置信息 | 精确控制提取 |

**推荐 `pdfjs-dist`**：中文简历是核心场景，CJK 支持最重要；`pdf-parse` 有已知 bug；`pdf2json` 中文不可靠。

```ts
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async extractText(buffer: Buffer): Promise<string> {
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    cMapUrl: './node_modules/pdfjs-dist/cmaps/',
    cMapPacked: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(pageText);
  }
  return pages.join('\n\n');
}
```
