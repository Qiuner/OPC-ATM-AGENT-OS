# OPC MKT Agent OS — 完整项目架构分析

**分析时间**: 2026-03-20
**项目目录**: `/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS`
**主要技术栈**: Next.js 16 + Node.js 20 + Claude Agent SDK + Supabase PostgreSQL

---

## 一、项目总体结构

```
OPC_MKT_Agent_OS/
├── agent-chat/              # 前端 UI + Team Studio（Next.js 应用）
│   ├── src/
│   │   ├── app/             # Next.js App Router（页面、API 路由）
│   │   ├── components/      # React 组件（侧边栏、聊天框、设置等）
│   │   ├── lib/             # 工具函数（存储、agent 管理、聊天引擎）
│   │   ├── types/           # TypeScript 类型定义
│   │   └── data/            # 静态数据
│   ├── public/              # 静态资源
│   ├── package.json         # 依赖：Next.js 16、React 19、Tailwind 4、Claude Agent SDK
│   └── launch-agents.sh     # 启动脚本（tmux + Claude CLI）
│
├── engine/                  # Agent 执行引擎（Node.js/TypeScript）
│   ├── agents/              # 三个核心 Agent
│   │   ├── ceo.ts          # CEO Agent（编排调度器）
│   │   ├── xhs-agent.ts    # XHS Agent（小红书内容创作）
│   │   ├── analyst-agent.ts # Analyst Agent（数据分析飞轮）
│   │   ├── types.ts        # 类型定义
│   │   └── bridge.ts       # Agent 间通信
│   │
│   ├── cli/                 # CreatorFlow API 命令行工具
│   │   ├── commands/        # CLI 命令集（竞品分析、素材管理、AI生成等）
│   │   ├── registry.ts      # 命令注册中心
│   │   ├── http-client.ts   # HTTP 客户端
│   │   └── run.ts          # CLI 主入口
│   │
│   ├── db/                  # 数据库层
│   │   ├── schema.sql      # PostgreSQL 数据库结构
│   │   ├── client.ts       # Supabase 客户端
│   │   └── migrations/     # 迁移脚本
│   │
│   ├── memory/              # 文件系统记忆库
│   │   ├── context/        # 品牌定位、受众、目标
│   │   └── winning-patterns/  # 各渠道胜出模式
│   │
│   ├── skills/              # Agent SOP 文件（SKILL.md）
│   │
│   ├── scheduler.ts        # cron 定时调度（CEO 每日 09:00，Analyst 每周一 08:00）
│   ├── package.json        # 依赖：Claude Agent SDK、Supabase、node-cron
│   └── CLAUDE.md          # Agent 系统提示与配置
│
├── src/                     # Python 原始 Agent（已弃用，保留参考）
│   ├── agents/            # planner、writer、publisher
│   └── main.py
│
├── data/                    # 静态数据和配置
│   └── context.example.json
│
├── config/                  # 配置文件
│   └── platforms.example.yaml
│
├── docs/                    # 项目文档（团队产出物）
│   ├── @PM——OPC-MKT-Agent-OS开发方案.md
│   ├── @Designer——MVP-UI设计方案.md
│   ├── @Researcher——技术调研报告.md
│   └── ... 其他文档
│
├── outputs/                 # Agent 生成的内容输出
│   ├── marketing_plan.md
│   ├── content_pack.json
│   └── ... 视觉资源
│
├── .firecrawl/             # 抓取的外部文档（飞书、Cotify 等）
└── README.md
```

---

## 二、三层核心架构

### 2.1 **第一层：前端 UI 层** (`agent-chat/`)

#### 技术栈
- **框架**: Next.js 16 (App Router) + React 19
- **样式**: Tailwind CSS v4 + shadcn/ui
- **主题**: next-themes（亮/暗模式）
- **即时通讯**: Claude Agent SDK (query 函数)

#### 核心功能
1. **Team Studio 界面** (`src/app/page.tsx`)
   - 多 Agent 圆桌讨论
   - 频道管理（类 Slack）
   - Agent 编辑器（自定义系统提示）
   - 消息历史（localStorage 持久化）

2. **API 路由** (`src/app/api/`)
   - `/chat` — 与 Agent 流式对话（SSE）
   - `/launch-team` — 启动 Agent 团队进程池
   - `/agent-status` — 检查 Agent 在线状态
   - `/chat-sdk` — 直接使用 Claude Agent SDK
   - `/notify/voice` — 语音播报通知
   - `/logs` — 日志查看
   - `/monitor` — 监控仪表板

3. **Client Lib** (`src/lib/`)
   - `agent-process-manager.ts` — 管理 Claude CLI 子进程池
   - `chat-engine.ts` — 聊天逻辑、Moderator Agent、圆桌讨论
   - `storage.ts` — localStorage 数据持久化

4. **Component Structure**
   ```
   src/components/
   ├── chat/                  # 聊天主体
   │   ├── message-item.tsx  # 单条消息渲染
   │   ├── message-input.tsx # 输入框
   │   └── agent-detail-modal.tsx
   ├── sidebar/              # 侧边栏
   │   ├── agent-panel.tsx   # Agent 列表与在线状态
   │   ├── role-pool.tsx     # 角色分配池
   │   └── channel-list.tsx  # 频道切换
   ├── settings/
   │   ├── agent-editor.tsx  # Agent 系统提示编辑
   │   └── settings-modal.tsx
   ├── ui/                   # 基础组件
   │   └── agent-avatar.tsx
   └── theme-provider.tsx    # 主题切换
   ```

#### 工作流
1. 用户在聊天框输入指令
2. 触发 `/chat` API，传入系统提示 + 对话历史
3. 后端调用 `claude` CLI（使用预热的进程池）
4. 流式返回 Agent 响应（SSE）
5. 前端实时更新消息

---

### 2.2 **第二层：Agent 执行引擎** (`engine/agents/`)

#### 三个核心 Agent

##### **1. CEO Agent** (`ceo.ts`)
**职责**: 营销编排与调度

**工作流程**:
1. 读取品牌定位、受众、胜出模式（从 `memory/` 文件系统）
2. 通过 CreatorFlow CLI 检查竞品动态、现有素材
3. 决策今日重点：创作、分析、优化
4. 调用子 Agent（xhs-agent、analyst-agent）执行具体任务
5. 汇总结果，生成日报

**子 Agent 定义** (via Claude Agent SDK):
```typescript
agents: {
  "xhs-agent": {
    description: "小红书内容创作专家",
    prompt: `${xhsSkill}\n${brandVoice}\n${audience}...`,
    tools: ["Read", "Write", "Glob"]
  }
}
```

**运行方式**:
```bash
npx tsx agents/ceo.ts "帮我写一篇关于OPC的小红书"
```

---

##### **2. XHS Agent** (`xhs-agent.ts`)
**职责**: 小红书内容创作

**输入**:
- 任务描述（主题、内容类型）
- Brand Voice（品牌调性）
- Target Audience（目标受众）
- SKILL.md（SOP 规范）
- Winning Patterns（胜出模式）

**输出**:
```markdown
# [标题]

[正文内容，含 emoji 分段]

---
### 元数据
- hook_type: question
- emotion_trigger: curiosity
- 预计字数: 450
```

**自检清单**:
- 是否包含有效 hook？
- 是否具有情绪触发因素？
- 话题标签 3-5 个?
- 字数 300-800?

---

##### **3. Analyst Agent** (`analyst-agent.ts`)
**职责**: 数据飞轮分析与优化

**核心方法论**:
1. 分析 Top 20% 内容的共同特征
2. 提炼 hook_type 和 emotion_trigger 的胜出组合
3. 更新 `winning_patterns` 表（Supabase）
4. 重写 SKILL.md，让下轮创作更好
5. 生成周报（人类审核）

**评分公式**:
- **小红书**: (收藏×3 + 点赞 + 评论×2) / 曝光量 × 100
- **抖音**: 完播率×50 + (点赞 + 分享×3) / 播放量 × 50
- **X/Twitter**: (likes + retweets×3 + replies×2) / impressions × 100

---

#### Claude Agent SDK 用法

所有 Agent 使用 `@anthropic-ai/claude-agent-sdk` 的 `query` 函数：

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "...",
  options: {
    model: "claude-sonnet-4-20250514",
    agents: {
      "sub-agent": {
        description: "...",
        prompt: "...",
        tools: ["Read", "Write", "Agent"]
      }
    },
    cwd: "/path/to/memory",
    allowedTools: ["Read", "Write", "Glob", "Grep", "Bash", "Agent"],
  },
})) {
  // 处理消息流
  if (message.type === "assistant") console.log(message.message);
  if (message.type === "result") console.log(message.result);
}
```

---

### 2.3 **第三层：CLI 工具层与数据库** (`engine/cli/` + `engine/db/`)

#### CLI 架构
模块化命令注册系统，所有命令汇聚到 `run.ts`：

```bash
npx tsx engine/cli/run.ts <module> <action> [--params]
```

**模块结构**:
```
commands/
├── competitors/      # 竞品分析
│   ├── list.ts      # 列出竞品
│   ├── sync.ts      # 竞品数据同步
│   ├── analyze.ts   # 竞品分析
│   ├── top-notes.ts # 爆款笔记
│   └── summarize.ts # 竞品总结
├── materials/       # 素材管理
│   ├── list.ts
│   ├── create.ts
│   ├── import-url.ts
│   └── search-trending.ts
├── ai/             # AI 生成
│   ├── generate.ts           # 生成脚本
│   ├── check-script.ts       # 质量检查
│   ├── optimize-script.ts    # 优化脚本
│   ├── publish.ts            # 生成发布文案
│   └── match-framework.ts    # 匹配框架
├── scripts/        # 脚本管理
└── publish/        # 发布管理
```

**Example CLI 命令**:
```bash
# 竞品分析
npx tsx engine/cli/run.ts competitors 竞品同步
npx tsx engine/cli/run.ts competitors 爆款笔记 --limit 20

# 素材创建
npx tsx engine/cli/run.ts materials 创建素材 --title "..." --content "..."

# AI 生成与优化
npx tsx engine/cli/run.ts ai 生成脚本 --materialId mat_xxx
npx tsx engine/cli/run.ts ai 质量检查 --scriptId scr_xxx
npx tsx engine/cli/run.ts ai 优化脚本 --scriptId scr_xxx
```

#### 数据库 Schema
PostgreSQL (Supabase) 中的核心表：

1. **content_pieces** — Agent 生成的内容
   - `id`, `channel`, `title`, `body`, `hook_type`, `emotion_trigger`, `tags`
   - `status` (draft/review/approved/published/rejected)
   - `created_by`, `created_at`, `published_at`

2. **performance_metrics** — 各渠道性能数据
   - `content_id`, `channel`
   - `impressions`, `likes`, `comments`, `shares`, `collects`, `view_count`
   - `completion_rate`, `ctr`, `roas`, `cpm`, `performance_score`
   - `recorded_at`

3. **winning_patterns** — 胜出模式记录（Analyst 更新）
   - `channel`, `hook_type`, `emotion_trigger`, `format_notes`
   - `avg_score`, `sample_size`, `active`

4. **task_items** — Agent 任务队列
   - `agent_name`, `task_type`, `priority`, `payload`
   - `status` (pending/running/done/failed)
   - `result`, `created_at`, `started_at`, `completed_at`

---

## 三、数据流与驱动逻辑

### 3.1 内容创作飞轮

```
CEO Agent (编排决策)
    ↓
    └→ XHS Agent (生成内容) → content_pieces (draft)
                             ↓
                      人类审核（通过/驳回）
                             ↓
                      发布 → 平台数据回收
                             ↓
Analyst Agent (周一早 8 点自动触发)
    ↓
    ├→ 分析 Top 20% 内容
    ├→ 提炼胜出模式 → winning_patterns
    ├→ 重写 SKILL.md
    └→ 生成周报 → 下轮优化建议
```

### 3.2 定时调度（Scheduler）

**运行方式**: `npx tsx scheduler.ts`

**定时任务**:
1. **CEO Agent** — 每日 09:00 (Asia/Shanghai)
   - 自动触发日常营销编排
   - 生成内容计划

2. **Analyst Agent** — 每周一 08:00 (Asia/Shanghai)
   - 分析上周数据
   - 更新胜出模式
   - 优化下周策略

3. **健康检查** — 每 5 分钟
   - 系统心跳日志

---

## 四、记忆系统（File-based Memory）

### 目录结构
```
engine/memory/
├── context/                      # 品牌与受众信息
│   ├── brand-voice.md           # 品牌调性、价值观、语言风格
│   ├── target-audience.md       # 目标用户画像、痛点、需求
│   └── cli-tools-reference.md  # CLI 工具文档
│
├── winning-patterns/             # Analyst 提炼的胜出模式
│   ├── xhs-patterns.md          # 小红书胜出模式
│   ├── douyin-patterns.md
│   └── x-patterns.md
│
└── content-calendar.json        # 内容日历
```

### 记忆更新流程
1. **初期**: 人工编写品牌定位、受众信息
2. **运行中**: CEO Agent 读取记忆，XHS Agent 遵循 SKILL.md
3. **分析后**: Analyst Agent 重写 winning-patterns 和 SKILL.md
4. **下轮迭代**: CEO/XHS Agent 读取更新的模式，质量持续提升

---

## 五、Team Studio 如何工作

### 启动流程

**方式 1: 前端启动**
```bash
cd agent-chat
npm run dev                    # 启动 Next.js（http://localhost:3000）

# 在另一个终端
npm run dev                    # 启动 Claude CLI Agent 进程（非必需，但推荐）
```

**方式 2: 脚本启动**
```bash
bash agent-chat/launch-agents.sh
# 在 tmux session 中启动 Claude CLI Agent，保持在线
```

### 运行时架构

```
前端 (Next.js UI)
    ↓ POST /api/chat
后端 (Node.js)
    ├→ Path 1: agentManager 进程池（预热）
    │           ↓
    │           Claude CLI (子进程)
    │           ↓ SSE 流式返回
    │           前端实时显示
    │
    └→ Path 2: 临时生成进程（备用）
                ↓
                spawn claude -p
                ↓ SSE 流式返回
                前端实时显示
```

### 关键代码

**1. 前端发送消息** (`src/page.tsx`)
```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    systemPrompt: agent.systemPrompt,
    conversationHistory: history,
    userMessage: input,
    agentName: agent.id
  })
});

const reader = response.body.getReader();
// SSE 流式处理
```

**2. 后端返回流** (`src/app/api/chat/route.ts`)
```typescript
const proc = spawn(CLAUDE_BIN, ["-p", "--dangerously-skip-permissions"], {
  env,
  stdio: ["pipe", "pipe", "pipe"]
});

proc.stdout?.on("data", (chunk: Buffer) => {
  writer.write(encoder.encode(`data: ${JSON.stringify({text})}\n\n`));
});

return new Response(readable, { headers: SSE_HEADERS });
```

**3. 进程池管理** (`src/lib/agent-process-manager.ts`)
- 为每个 Agent 维持 1 个 Claude CLI 子进程
- 发送消息到子进程的 stdin
- 从 stdout 读取响应（SSE 格式）
- 定期检查进程健康状态

---

## 六、技术依赖总览

### Frontend (`agent-chat/`)
```json
{
  "next": "16.1.6",
  "react": "19.2.3",
  "tailwindcss": "^4",
  "next-themes": "^0.4.6",
  "@anthropic-ai/claude-agent-sdk": "^0.2.74",
  "lucide-react": "^0.577.0",
  "react-markdown": "^10.1.0",
  "uuid": "^13.0.0"
}
```

### Engine (`engine/`)
```json
{
  "@anthropic-ai/claude-agent-sdk": "^0.2.74",
  "@supabase/supabase-js": "^2.49.0",
  "node-cron": "^4.0.0",
  "dotenv": "^16.5.0",
  "typescript": "^5.7.0",
  "tsx": "^4.19.0"
}
```

### Runtime
- Node.js 20+
- TypeScript 5.7+
- pnpm workspace（monorepo）
- Claude CLI（必需）
- Supabase PostgreSQL（可选，用于生产环保）

---

## 七、Agent 与外部系统集成

### CreatorFlow API 集成
CEO Agent 通过 CLI 工具调用 CreatorFlow API：
- 竞品同步 → 获取竞品最新内容
- 竞品分析 → 深度分析竞品策略
- 爆款笔记 → 识别高表现内容
- 素材创建 → 创建内容素材库
- 脚本生成 → AI 生成文案脚本
- 质量检查 → 自动检查内容质量

### Supabase 数据库集成
- 存储 Agent 生成的内容
- 记录平台性能指标
- 跟踪任务执行状态
- 保存胜出模式供 Analyst 分析

### MCP 工具集成（规划中）
- 文件系统：Read、Write、Glob、Grep
- 执行：Bash
- 通信：Agent（子 Agent 调用）

---

## 八、安全与权限模型

### Claude CLI 权限模式
- `claude -p` — 被动模式（等待输入）
- `--dangerously-skip-permissions` — 跳过权限验证（仅开发环境）

### 环境隔离
- 删除 CLAUDECODE、CLAUDE_CODE_ENTRYPOINT 环境变量
- 设置 PATH 确保 Claude CLI 可用
- 子进程使用独立的 env 副本

### 数据隐私
- API Key、数据库凭证存于 `.env`
- memory/ 目录中的敏感信息（品牌定位）仅限系统内部访问
- 所有 Agent 响应需人类最终审核

---

## 九、关键配置与环境变量

### `.env` 示例
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=...

# Claude
ANTHROPIC_API_KEY=sk-...

# CreatorFlow API（如需）
CREATORFLOW_API_KEY=...
CREATORFLOW_BASE_URL=...
```

### 启动检查清单
- [ ] Node.js 20+ 安装
- [ ] Claude CLI 安装并配置 PATH
- [ ] `.env` 文件配置完整
- [ ] Supabase 项目创建并运行迁移
- [ ] `pnpm install` 装依赖
- [ ] `npm run dev`（agent-chat）
- [ ] `npx tsx scheduler.ts`（engine）

---

## 十、工作流总结

### 1. **手动触发流程**
```bash
# 方式 A: 通过 web UI
访问 http://localhost:3000 → 在聊天框输入指令 → Team Studio 调用 Agent

# 方式 B: 直接运行 Agent
npx tsx agents/ceo.ts "写一篇小红书"
npx tsx agents/xhs-agent.ts "主题描述"
npx tsx agents/analyst-agent.ts
```

### 2. **自动化流程**
```bash
# 启动定时调度器
npx tsx scheduler.ts

# CEO 自动运行（每日 09:00）
# Analyst 自动运行（每周一 08:00）
```

### 3. **Team Studio 圆桌讨论**
多个 Agent 在前端进行实时讨论，由 Moderator Agent 控制轮流发言、总结共识。

---

## 十一、下一步扩展方向

1. **MCP 工具服务化** — 完整的 MCP 服务器实现
2. **Webhook 回调** — 实时接收平台数据更新
3. **数据库持久化** — 所有 Agent 结果存入 Supabase
4. **多渠道支持** — 抖音、微博、小红书 API 集成
5. **可观测性** — 日志、监控、追踪系统
6. **成本优化** — API 流量管理、缓存策略

---

**完毕。该项目是一个完整的 Multi-Agent 营销自动化系统，充分利用了 Claude Agent SDK 的分布式能力。**
