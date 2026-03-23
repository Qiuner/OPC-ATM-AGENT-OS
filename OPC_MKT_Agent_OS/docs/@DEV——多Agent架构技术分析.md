# [@DEV] 多Agent架构技术分析

**完成时间：** 2026-03-20
**参与人员：** @DEV（技术架构师 & 高级开发工程师）
**文档版本：** V1.0

---

## 1. 现有系统架构分析

### 1.1 项目整体结构

OPC MKT Agent OS 当前是一个**三模块并行架构**：

```
OPC_MKT_Agent_OS/
├── web/              # 主控制面板 — Next.js 16 Web App
├── engine/           # Agent 引擎 — Claude Agent SDK 驱动
├── agent-chat/       # 聊天式 Agent UI — Next.js 独立应用
├── src/              # Python 原型（已弃用，仅保留 main.py 入口）
├── config/           # 平台配置模板
└── data/             # 上下文数据模板
```

### 1.2 三个模块的技术实现分析

#### Module A: `web/`（主控制面板）

- **框架：** Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS v4
- **LLM 集成：** 自建多 Provider 抽象层（`lib/llm/`），支持 6 家 LLM：
  - Claude（@anthropic-ai/sdk ^0.78.0）
  - OpenAI（openai ^6.27.0）
  - Gemini / DeepSeek / MiniMax / GLM
- **Agent 实现：** 纯服务端 Agent，继承 `BaseAgent` 抽象类：
  - `PMAgent` — 任务拆解
  - `StrategistAgent` — 策略制定
  - `WriterAgent` / `SocialAgent` / `ArticleAgent` / `VideoAgent` / `EmailAgent` — 内容生成
  - `PublisherAgent` — 发布格式化
  - `AnalystAgent` — 数据分析
- **编排方式：** `orchestrator.ts` 实现串行 Pipeline（Strategist → Writer → Publisher），`marketing-team.ts` 定义 Agent UI 展示数据
- **Team Studio：** 通过 SSE 流式端点（`/api/team-studio`）驱动，PM Agent 拆解任务后按优先级串行调用各 Agent
- **数据层：** Supabase SSR Client
- **关键发现：** 这套 Agent 是**基于 LLM API 直调的简单 Agent**，没有工具使用能力、没有上下文隔离、没有 Agent 间通信

#### Module B: `engine/`（Claude Agent SDK 引擎）

- **框架：** 纯 TypeScript + tsx 运行时（非 Next.js）
- **Agent SDK：** `@anthropic-ai/claude-agent-sdk ^0.2.74`（`query()` 函数）
- **Agent 实现：**
  - `ceo.ts` — CEO Supervisor Agent，使用 Claude Agent SDK 的 `agents` 参数定义子 Agent（xhs-agent），支持 Read/Write/Glob/Grep/Bash/Agent 工具
  - `xhs-agent.ts` — 小红书创作 Agent，可独立运行也可被 CEO 调度
  - `analyst-agent.ts` — 数据飞轮分析 Agent
  - `bridge.ts` — 连接 agent-chat UI 与 engine 的桥接器
- **调度：** `scheduler.ts` 使用 `node-cron` 定时触发（CEO 每日9点，Analyst 每周一8点）
- **数据层：** Supabase PostgreSQL（`db/client.ts`）
- **记忆系统：** 文件系统（`memory/` 目录 + `skills/` SKILL.md 文件）
- **关键发现：** 这是**真正的多 Agent 系统**——CEO 作为 Supervisor 可以调度子 Agent，每个子 Agent 在隔离上下文中运行。但目前只有 3 个 Agent（CEO、XHS、Analyst），且通过 CLI 或 Cron 触发，没有 Web UI 集成

#### Module C: `agent-chat/`（聊天式 Agent UI）

- **框架：** Next.js 16.1.6 + React 19 + TypeScript
- **Agent SDK：** `@anthropic-ai/claude-agent-sdk ^0.2.74`
- **核心架构：**
  - `agent-process-manager.ts` — 维护预热的 `claude -p` 进程池（Singleton），通过 `spawn` 调用 Claude CLI
  - `chat-engine.ts` — 圆桌讨论引擎，支持 Moderator 主持人模式、多轮讨论（explore/debate/synthesize 三种模式）
  - SSE 流式通信（`/api/chat-sdk`, `/api/chat-api`, `/api/events`）
- **关键发现：** 这是一个**独立的聊天 Agent 系统**，使用进程池管理 Claude CLI 实例。与 engine/ 通过 bridge.ts 连接，但与 web/ 的 Agent 系统完全独立

### 1.3 当前 Team Studio 技术实现评估

Team Studio（`web/src/app/team-studio/page.tsx`）的实现方式：

| 方面 | 现状 | 评估 |
|------|------|------|
| **Agent 执行** | 通过 `/api/team-studio` SSE 端点串行执行 | 真实调用 LLM，非纯前端展示 |
| **Agent 间通信** | 无直接通信，PM 线性分配任务 | 缺少 Agent 协作能力 |
| **工具使用** | 无（BaseAgent 仅做 LLM chat 调用） | 缺少 Tool-Use 能力 |
| **上下文管理** | 每个 Agent 独立调用，不共享上下文 | 上下文隔离但也无法共享必要信息 |
| **状态持久化** | 无持久化，SSE 流结束即丢失 | 无法恢复或追踪 |
| **Monitor 视图** | `agent-monitor/` 组件显示 Agent 状态 | 纯前端展示，连接 agent-chat 的进程池 |

**结论：** web/ 中的 Agent 是"半成品"——有 LLM 调用能力但缺少 Tool-Use、Agent 间通信、状态管理。engine/ 中的 Agent 是"有能力但无 UI"——有 Claude Agent SDK 驱动的真实 Agent 但缺少 Web 界面。两套系统**需要统一**。

### 1.4 现有技术栈盘点

| 技术 | web/ | engine/ | agent-chat/ | 可复用 |
|------|------|---------|-------------|--------|
| Next.js 16 | ✅ | - | ✅ | ✅ 保留 web/ 作为主 App |
| TypeScript | ✅ | ✅ | ✅ | ✅ 全栈统一 |
| Tailwind CSS v4 | ✅ | - | ✅ | ✅ |
| shadcn/ui | ✅ | - | - | ✅ |
| Claude Agent SDK | - | ✅ 0.2.74 | ✅ 0.2.74 | ✅ 作为核心引擎 |
| Anthropic SDK | ✅ 0.78.0 | - | - | ⚠️ 与 Agent SDK 重叠 |
| OpenAI SDK | ✅ 6.27.0 | - | ✅ 6.27.0 | ⚠️ 多模型支持需要 |
| Supabase | ✅ SSR | ✅ Service Role | - | ✅ 数据层 |
| node-cron | - | ✅ | - | ✅ 调度层 |
| next-themes | ✅ | - | ✅ | ✅ |

---

## 2. 候选框架技术适用性分析

### 2.1 Claude Agent SDK

**与现有技术栈的集成度：★★★★★（最高）**

- engine/ 已在使用 `@anthropic-ai/claude-agent-sdk`，有成熟的 `query()` 调用模式
- agent-chat/ 已验证 CLI 进程池模式
- TypeScript 原生支持，无语言切换成本
- `ceo.ts` 已实现 Supervisor Pattern（options.agents 定义子 Agent）

**核心能力匹配：**

```typescript
// 已在 ceo.ts 中验证的模式
for await (const message of query({
  prompt: systemPrompt,
  options: {
    model: "claude-sonnet-4-20250514",
    agents: {
      "xhs-agent": { description, prompt, tools: ["Read", "Write", "Glob"] },
    },
    mcpServers: { /* MCP 工具集成 */ },
    allowedTools: ["Read", "Write", "Glob", "Grep", "Bash", "Agent"],
  },
})) { /* 流式处理 */ }
```

**优势：**
- 零迁移成本——engine/ 已有完整实现
- 20+ 内置工具（Read/Write/Bash/Grep/Glob/WebSearch/WebFetch）
- Subagent 上下文隔离，父 Agent 只接收摘要
- Agent Teams 支持多 Agent 并行协作 + 消息互发
- MCP 原生集成，可连接外部工具
- Hooks 系统提供安全边界

**劣势：**
- 模型锁定于 Claude 系列
- Subagent 不支持嵌套（仅单层）
- 缺乏可视化工作流编辑器

**适用性评分：9/10** — 已有代码验证 + TypeScript 原生 + 营销场景匹配

### 2.2 LangGraph

**与现有技术栈的集成度：★★★☆☆（中等）**

- TypeScript 版本可用，但社区和文档以 Python 为主
- 需要学习图式编程范式，团队切换成本高
- 与现有 Next.js API Routes 集成需要额外适配层
- 没有内置工具系统，需要自行实现

**核心能力匹配：**

```typescript
// LangGraph TS 伪代码
const graph = new StateGraph({ channels: {...} })
  .addNode("strategist", strategistNode)
  .addNode("writer", writerNode)
  .addEdge("strategist", "writer")
  .addConditionalEdge("writer", routeByPlatform)
  .compile();
```

**优势：**
- 图式架构提供最细粒度工作流控制
- 内置状态检查点，支持暂停/恢复
- 企业采用率最高，LangSmith 可观测性
- 模型无关

**劣势：**
- 学习曲线陡峭
- TS 版生态不及 Python 版
- 需要自建工具系统（web/ 已有的 BaseAgent 架构需要大改）
- 引入大量新依赖（@langchain/langgraph 等）

**适用性评分：6/10** — 能力强但迁移成本高，与现有架构不匹配

### 2.3 DeerFlow 2.0

**与现有技术栈的集成度：★★☆☆☆（低）**

- 底层基于 LangGraph + LangChain（Python）
- TS 前端只是 UI 层，核心逻辑是 Python
- 需要引入 Docker 运行时
- 与现有 Next.js 全栈架构冲突

**优势：**
- 开箱即用（沙盒、记忆、文件系统、子 Agent）
- Docker 隔离执行
- 跨会话持久记忆
- Skill 模块系统（与 engine/skills/ 理念一致）

**劣势：**
- Python 核心，TypeScript 项目集成困难
- 2026 年初刚发布，生态不成熟
- 引入 Docker 依赖增加部署复杂度
- 需要重写整个 Agent 层

**适用性评分：4/10** — 理念好但语言栈不匹配

### 2.4 CrewAI

**与现有技术栈的集成度：★☆☆☆☆（极低）**

- 纯 Python 框架
- 无 TypeScript SDK
- Token 消耗 3× 开销
- 复杂分支逻辑支持弱

**适用性评分：2/10** — 语言不匹配 + 性能差

### 2.5 OpenAI Agents SDK

**与现有技术栈的集成度：★★☆☆☆（低）**

- Python SDK，无 TypeScript 版本
- Handoff 模式较简单，不支持复杂 Agent 协作
- 缺少内置状态持久化

**适用性评分：3/10** — 语言不匹配 + 能力不足

---

## 3. 技术方案推荐

### 3.1 推荐方案：Claude Agent SDK 为核心 + MCP 工具层

**理由：**

1. **零迁移成本**：engine/ 已有 Claude Agent SDK 的完整实现（ceo.ts, xhs-agent.ts, analyst-agent.ts）
2. **TypeScript 原生**：与 Next.js + TS 全栈架构完美对齐
3. **验证成熟度**：Claude Code 同款引擎，Apple Xcode 和 Microsoft Agent Framework 已集成
4. **营销场景验证**：研究报告明确推荐"Claude Agent SDK + MCP"用于营销 Agent OS（Polsia 架构验证）
5. **能力完备**：Supervisor Pattern + Subagent 隔离 + MCP 工具 + Hooks 安全边界 + Skills 系统

### 3.2 推荐架构设计

```
┌─────────────────────────────────────────────────────┐
│                    Web UI Layer                       │
│    Next.js 16 (App Router) + Tailwind + shadcn/ui    │
│    Team Studio / Agent Chat / Dashboard / Monitor     │
├───────────────────────┬─────────────────────────────┤
│    API Routes (SSE)   │     WebSocket (实时)          │
│   /api/agent/*        │   状态推送 / 进度通知          │
├───────────────────────┴─────────────────────────────┤
│              Agent Orchestration Layer                │
│         Claude Agent SDK — query() 函数               │
│                                                       │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │ CEO     │──▶│ 子Agent  │   │ Agent Teams 模式  │  │
│  │Supervisor│   │ (隔离ctx) │   │ (并行协作+消息) │  │
│  └─────────┘   └──────────┘   └──────────────────┘  │
│       │                                               │
│       ▼                                               │
│  ┌─────────────────────────────────────────────────┐  │
│  │           MCP Tool Servers                       │  │
│  │  ┌────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │小红书API│ │图片生成   │ │CreatorFlow CLI    │  │  │
│  │  │(MCP)   │ │(MCP)     │ │(MCP)             │  │  │
│  │  └────────┘ └──────────┘ └──────────────────┘  │  │
│  │  ┌────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │邮件发送 │ │播客/视频 │ │数据分析           │  │  │
│  │  │(MCP)   │ │(MCP)     │ │(MCP)             │  │  │
│  │  └────────┘ └──────────┘ └──────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────┤
│              Persistence Layer                        │
│    ┌──────────┐  ┌───────────┐  ┌─────────────────┐  │
│    │ Supabase │  │ 文件系统   │  │ Skills/Memory   │  │
│    │ (DB)     │  │ (产出物)   │  │ (SKILL.md)      │  │
│    └──────────┘  └───────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### 3.3 Agent 架构模式选择

基于营销场景需求，推荐 **Supervisor Pattern + Agent Teams 混合模式**：

| 模式 | 使用场景 | 实现方式 |
|------|----------|----------|
| **Supervisor Pattern** | 标准营销工作流（选题→创作→审核→发布） | CEO Agent 通过 `options.agents` 定义子 Agent，串行/条件调度 |
| **Agent Teams** | 需要多 Agent 并行协作的场景（如多平台同时创作、圆桌讨论） | 多个 Claude 实例共享 TaskList + SendMessage 互发消息 |
| **单 Agent + MCP** | 简单直接任务（如"发一封邮件"、"生成一张海报"） | 单个 Agent 配置对应 MCP Server 直接执行 |

### 3.4 后端架构需求

| 需求 | 技术选择 | 理由 |
|------|----------|------|
| **Agent 执行** | API Routes (Route Handlers) | Next.js 原生，SSE 流式输出 |
| **实时状态推送** | SSE（Server-Sent Events） | 已有实现模式（team-studio route），单向足够 |
| **Agent 间消息** | Claude Agent SDK 内置 Agent Teams | SDK 原生支持，无需自建消息系统 |
| **任务队列** | Supabase + node-cron | 已有实现（engine/scheduler.ts + db/task_queue） |
| **MCP 工具** | MCP Server（stdio/HTTP） | Claude Agent SDK 原生集成 |
| **文件存储** | 本地文件系统 + Supabase Storage | 产出物本地存储，发布素材上传 Supabase |

**暂不需要 WebSocket**：当前场景（用户发起任务 → Agent 执行 → 流式返回结果）SSE 完全够用。如后续有双向实时协作需求（如用户中途干预 Agent 执行），再引入 WebSocket。

### 3.5 是否需要组合多个框架？

**短期（MVP）：不需要。Claude Agent SDK 单框架足够覆盖所有需求。**

理由：
- Supervisor Pattern 覆盖串行工作流
- Agent Teams 覆盖并行协作
- MCP 覆盖外部工具集成
- Hooks 覆盖安全边界
- Skills 覆盖知识管理

**长期（如需跨组织 Agent 互操作）：可选加入 A2A 协议层。**

场景：如果 OPC MKT Agent OS 需要与其他团队/公司的 Agent 系统互联互通（如接入第三方 SEO Agent、社交媒体管理 Agent），可以通过 A2A Agent Card + HTTP 端点暴露我们的 Agent 能力。但这是远期需求，当前不需要。

---

## 4. 需要引入的新依赖分析

### 4.1 必须引入

| 依赖 | 版本 | 用途 | 影响 |
|------|------|------|------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.74 | web/ 引入 Agent SDK（engine/ 已有） | web/package.json 新增 |

### 4.2 按需引入（MCP Server 开发时）

| 依赖 | 版本 | 用途 | 影响 |
|------|------|------|------|
| `@modelcontextprotocol/sdk` | latest | 开发自定义 MCP Server（如小红书 API、图片生成） | 新建 mcp-servers/ 目录 |

### 4.3 不需要引入

| 依赖 | 理由 |
|------|------|
| `@langchain/*` / `langgraph` | 语言栈和架构不匹配 |
| `crewai` | Python only |
| `openai-agents` | Python only |
| `ws` / `socket.io` | SSE 足够，暂不需要 WebSocket |

### 4.4 可移除（统一后）

| 依赖 | 位置 | 理由 |
|------|------|------|
| `@anthropic-ai/sdk` | web/ | 被 Claude Agent SDK 替代（Agent SDK 内部已包含 Anthropic API 调用能力） |

---

## 5. 统一架构路线图

### Phase 1: 统一 Agent 引擎

**目标：** 将 engine/ 的 Claude Agent SDK 能力集成到 web/ 中，消除三套系统并行的局面

**步骤：**
1. web/ 引入 `@anthropic-ai/claude-agent-sdk`
2. 将 engine/ 的 Agent 定义（ceo.ts, xhs-agent.ts, analyst-agent.ts）迁移到 web/src/lib/agents-sdk/
3. 重写 `/api/team-studio` 端点，使用 Claude Agent SDK 的 `query()` 替代现有 BaseAgent 直调
4. 保留 engine/ 的 scheduler.ts 作为独立定时任务进程
5. 将 agent-chat/ 的进程池模式作为备选方案（高并发时使用）

### Phase 2: MCP 工具集成

**目标：** 通过 MCP Server 连接外部工具，替代 Bash 直调

**步骤：**
1. 为 CreatorFlow API 开发 MCP Server（engine/mcps/ 目录已预留）
2. 为图片生成、邮件发送等能力开发 MCP Server
3. 在 Agent 定义中通过 `mcpServers` 参数挂载工具
4. 实现 MCP 工具的自动发现和按需加载

### Phase 3: Agent Teams 多 Agent 协作

**目标：** 实现多 Agent 并行协作场景

**步骤：**
1. 为多平台同时创作场景实现 Agent Teams 模式
2. 实现 Agent 间消息通信（TaskList + SendMessage）
3. Web UI 展示 Agent 协作状态和消息流
4. 实现人在回路（Human-in-the-Loop）审批节点

---

## 6. 风险评估

| 风险 | 级别 | 应对方案 |
|------|------|----------|
| Claude 模型锁定 | 中 | web/ 已有多 Provider 抽象层（6 家 LLM），非 Agent 场景可继续使用其他模型。Agent 核心用 Claude，辅助功能保持多模型 |
| Agent SDK 版本不稳定 | 低 | SDK 已在 Claude Code 生产环境验证，Apple/Microsoft 已集成。锁定 ^0.2.74 |
| MCP Server 开发工作量 | 中 | 优先用已有的社区 MCP Server（数千个），仅为业务专有能力（CreatorFlow API）开发自定义 Server |
| 17× 错误放大效应 | 高 | 遵循研究报告建议——先把单 Agent 做到极致，多 Agent 仅在确实需要时引入。Supervisor Pattern 比 GroupChat 更可控 |
| 上下文窗口限制 | 中 | Claude Agent SDK 内置自动 Compact（上下文接近限制时自动摘要），Subagent 隔离也有效管理上下文 |

---

## 7. 结论与建议

### 核心结论

1. **框架选择：Claude Agent SDK**——已在 engine/ 中验证，与 TypeScript 全栈架构完美匹配，无迁移成本
2. **架构模式：Supervisor + Agent Teams 混合**——串行工作流用 Supervisor，并行协作用 Agent Teams
3. **工具层：MCP Protocol**——标准化外部工具连接，复用社区生态
4. **后端通信：SSE**——已有成熟实现，暂不需要 WebSocket
5. **最小化变更：** 不需要引入新框架或新语言，核心是统一现有三套系统

### 给 @PM 的建议

- 优先统一 web/ 和 engine/ 的 Agent 架构（Phase 1），这是后续所有功能的基础
- 不要同时追求太多 Agent——先把 CEO + XHS + Analyst 三个 Agent 做到稳定可靠
- MCP 工具集成可与 Agent 统一并行进行
- Agent Teams 模式作为进阶功能，在基础稳定后再开发

### 给 @Designer 的建议

- Team Studio UI 需要重新设计 Agent 状态展示（online/busy/offline 三态 + 当前执行的工具）
- Agent 间消息流的可视化（Supervisor 调度 → 子 Agent 执行 → 结果回传）
- 人在回路审批节点的交互设计

---

*[@DEV] 技术分析完成。等待 @PM 确认方向后，可立即输出详细技术方案。*
