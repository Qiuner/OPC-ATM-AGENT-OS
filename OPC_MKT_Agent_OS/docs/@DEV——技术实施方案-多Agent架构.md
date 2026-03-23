# [@DEV] 技术实施方案 — 多Agent协作架构

**完成时间：** 2026-03-20
**参与人员：** @DEV（技术架构师 & 高级开发工程师）
**文档版本：** V1.0
**依赖文档：** @DEV——多Agent架构技术分析.md、@PM——PRD（待出）

---

## 0. 决策确认

| # | 决策项 | 确认结果 |
|---|--------|----------|
| 1 | 架构模式 | 方案 C — 混合模式（CEO 调度 + Agent 间直连） |
| 2 | 核心框架 | Claude Agent SDK + MCP |
| 3 | 系统统一 | 方案 alpha — engine/ 为核心，web/ 为 UI 层 |
| 4 | Agent 范围 | P0: CEO/XHS/Analyst/Podcast，P1: X-Twitter/Visual-Gen/Strategist，P2: Outreach |
| 5 | 自动化 | 先手动触发，后续接入 Cron |

---

## 1. 方案 alpha — 统一架构设计

### 1.1 当前三套系统的关系

```
现状（三套独立系统）：

web/ (localhost:3002)          agent-chat/ (localhost:3001)       engine/ (CLI/Cron)
├─ BaseAgent (LLM直调)         ├─ AgentProcessManager (CLI进程池)  ├─ Claude Agent SDK
├─ /api/team-studio (SSE)      ├─ /api/chat-sdk (SDK query)       ├─ CEO + XHS + Analyst
├─ PMAgent/Writer/Publisher    ├─ /api/chat (CLI spawn)            ├─ Skills / Memory
└─ 6家 LLM Provider           └─ 圆桌讨论引擎                      └─ Supabase + Cron
     │                              │
     │ fetch SSE ──────────────────▶│ (web/ 调 agent-chat/ 的 API)
     └──────────────────────────────┘
```

### 1.2 统一后的目标架构

```
目标（engine/ 为核心，web/ 为 UI 层）：

web/ (主应用 — localhost:3002)
├─ app/                         # UI 页面（Team Studio / Dashboard / Monitor）
├─ app/api/agent/               # 新 API Routes — 统一 Agent 端点
│   ├─ execute/route.ts         # POST — 执行 Agent 任务（SSE 流式）
│   ├─ roundtable/route.ts      # POST — 共创圆桌模式（SSE 流式）
│   ├─ status/route.ts          # GET  — Agent 状态查询
│   └─ events/route.ts          # GET  — EventBus SSE 推送
├─ lib/agent-sdk/               # SDK 适配层 — 封装对 engine/ 的调用
│   ├─ executor.ts              # query() 封装 + EventBus 事件发射
│   ├─ agent-registry.ts        # Agent 注册表 — 从 engine/ 加载定义
│   ├─ roundtable.ts            # 圆桌讨论引擎（从 agent-chat/ 迁移核心逻辑）
│   └─ types.ts                 # SDK 相关类型
├─ lib/agents/                  # 保留 — 废弃路径中的渐进替换（见 1.5）
├─ lib/llm/                     # 保留 — 共创模式中非 Claude 模型仍需要
└─ components/                  # UI 组件

engine/ (Agent 核心 — 作为 npm workspace 依赖)
├─ agents/                      # Agent 实现（CEO, XHS, Analyst, Podcast...）
│   ├─ registry.ts              # 【新增】Agent 注册表 — 统一管理所有 Agent 定义
│   ├─ ceo.ts                   # CEO Supervisor（已有，增强）
│   ├─ xhs-agent.ts             # 小红书 Agent（已有）
│   ├─ analyst-agent.ts         # 数据分析 Agent（已有）
│   ├─ podcast-agent.ts         # 【新增 P0】播客 Agent
│   ├─ bridge.ts                # 保留 — 向后兼容
│   └─ types.ts                 # 类型定义
├─ skills/                      # SKILL.md 文件（Agent SOP）
├─ memory/                      # 文件系统记忆
├─ mcps/                        # 【新增】MCP Server 实现
├─ db/                          # Supabase 数据层
├─ scheduler.ts                 # Cron 调度器（保留独立运行）
└─ package.json                 # npm workspace 包

agent-chat/ → 废弃计划：
├─ chat-engine.ts 核心逻辑 → 迁移到 web/lib/agent-sdk/roundtable.ts
├─ agent-process-manager.ts → 废弃（用 SDK query() 替代 CLI 进程池）
├─ event-bus/ → 迁移到 web/lib/agent-sdk/event-bus.ts
└─ agents-preset.ts 角色定义 → 迁移到 engine/agents/registry.ts
```

### 1.3 web/ 调用 engine/ 的通信方式

**方案：npm workspace 直接 import（非 HTTP 调用）**

engine/ 作为 web/ 的 workspace 依赖，通过 TypeScript import 直接调用。无需 HTTP 通信、无需启动独立服务。

```jsonc
// web/package.json
{
  "dependencies": {
    "marketing-agent-os-engine": "workspace:*",
    "@anthropic-ai/claude-agent-sdk": "^0.2.74"
  }
}
```

```jsonc
// 根目录 pnpm-workspace.yaml
packages:
  - "web"
  - "engine"
```

**调用示例：**

```typescript
// web/src/lib/agent-sdk/executor.ts
import { AgentRegistry } from 'marketing-agent-os-engine/agents/registry';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { eventBus } from './event-bus';

export async function* executeAgent(
  agentName: string,
  userMessage: string,
  context?: Record<string, unknown>,
): AsyncGenerator<AgentStreamEvent> {
  const registry = AgentRegistry.getInstance();
  const config = await registry.buildSDKConfig(agentName, userMessage, context);

  eventBus.emit({ type: 'agent:start', agentId: agentName, data: { message: userMessage } });

  for await (const message of query(config)) {
    // 解析 SDK 消息，转换为统一事件格式
    const events = parseSDKMessage(message, agentName);
    for (const event of events) {
      eventBus.emit(event);
      yield event;
    }
  }

  eventBus.emit({ type: 'agent:done', agentId: agentName, data: {} });
}
```

### 1.4 统一 API 端点设计

#### `POST /api/agent/execute` — 执行 Agent 任务

请求体：
```typescript
interface ExecuteRequest {
  agent: string;           // Agent ID: 'ceo' | 'xhs-agent' | 'analyst-agent' | ...
  message: string;         // 用户指令
  context?: {              // 可选上下文
    conversationHistory?: string;
    campaignId?: string;
    dayPlan?: DayPlan;
  };
  mode?: 'supervisor' | 'direct';  // supervisor = CEO 编排, direct = 直接执行
}
```

响应（SSE 流）：
```typescript
// data: {...}\n\n 格式
type SSEEvent =
  | { type: 'text';           agentId: string; content: string }
  | { type: 'tool_call';      agentId: string; tool: string; input: string }
  | { type: 'tool_result';    agentId: string; tool: string; success: boolean }
  | { type: 'sub_agent_start'; agentId: string; parentId: string; task: string }
  | { type: 'sub_agent_done';  agentId: string; parentId: string; success: boolean }
  | { type: 'agent_message';  from: string; to: string; content: string }  // Agent Teams 消息
  | { type: 'done';           agentId: string }
  | { type: 'error';          agentId: string; message: string }
```

#### `POST /api/agent/roundtable` — 共创圆桌模式

请求体：
```typescript
interface RoundtableRequest {
  topic: string;                    // 讨论主题
  agents: string[];                 // 参与的 Agent IDs
  mode: 'explore' | 'debate' | 'synthesize';
  maxRounds: number;                // 最大轮次（默认 3）
  llmConfig?: {                     // 可选：非 Claude 模型配置
    provider: ProviderName;
    apiKey?: string;
  };
}
```

响应（SSE 流）：
```typescript
type RoundtableSSE =
  | { type: 'moderator'; content: string; round: number }
  | { type: 'agent_response'; agentId: string; agentName: string; content: string; round: number }
  | { type: 'summary'; content: string }
  | { type: 'done' }
```

#### `GET /api/agent/status` — Agent 状态查询

响应：
```typescript
interface AgentStatusResponse {
  agents: Array<{
    id: string;
    name: string;
    status: 'idle' | 'busy' | 'offline';
    currentTask?: string;
    lastActivity?: string;
    toolCallCount: number;
  }>;
}
```

#### `GET /api/agent/events?since={timestamp}` — EventBus SSE 推送

将 agent-chat/ 的 EventBus 机制迁移到 web/，用于 Agent Monitor 实时状态展示。

### 1.5 web/ BaseAgent 废弃路径

**渐进废弃策略：** 不一次性删除，按功能逐步替换。

| Phase | 操作 | 影响 |
|-------|------|------|
| Phase 1 | Team Studio 切换到 `/api/agent/execute`，不再调用 `/api/team-studio` | team-studio/route.ts 标记为 deprecated |
| Phase 1 | 保留 `/api/contents`、`/api/campaigns` 等数据 API | 无影响 |
| Phase 2 | 将 orchestrator.ts 的工作流路由逻辑迁移到 CEO Agent 的 Supervisor 模式 | orchestrator.ts 标记为 deprecated |
| Phase 3 | 确认所有 UI 页面都通过新 API 工作后，删除旧 Agent 代码 | 删除 lib/agents/ 中的 BaseAgent 系列 |

**保留不动的模块：**
- `lib/llm/` — 共创模式中非 Claude 模型仍需使用
- `lib/store/` — 内存数据存储，UI 层需要
- `lib/supabase/` — SSR 客户端
- `lib/openclaw/` — OpenClaw 集成
- 所有 `app/api/` 数据端点（contents/campaigns/metrics/tasks/approvals）

---

## 2. 方案 C — Agent Teams 混合模式实现

### 2.1 两种协作模式的实现

#### 模式 A: CEO Supervisor 模式（串行调度）

这是现有 `ceo.ts` 已验证的模式。CEO 通过 `options.agents` 定义子 Agent，子 Agent 在隔离上下文中运行。

```typescript
// engine/agents/ceo.ts — 增强版
const config = {
  prompt: ceoSystemPrompt,
  options: {
    model: "claude-sonnet-4-20250514",
    agents: {
      "xhs-agent":      { description, prompt, tools: ["Read", "Write", "Glob"] },
      "growth-agent":   { description, prompt, tools: ["Read", "Glob", "Grep", "Bash"] },
      "brand-reviewer": { description, prompt, tools: ["Read", "Glob"] },
      "podcast-agent":  { description, prompt, tools: ["Read", "Write", "Bash"] },
      "analyst-agent":  { description, prompt, tools: ["Read", "Write", "Glob", "Grep"] },
    },
    mcpServers: {
      // Phase 2 接入
    },
    allowedTools: ["Read", "Write", "Glob", "Grep", "Bash", "Agent"],
  },
};
```

**调度流程：**
```
用户指令 → CEO 分析 → CEO 决定调用哪个子Agent
                    → 子Agent A 执行（隔离上下文）→ 返回结果给 CEO
                    → CEO 判断是否需要下一个子Agent
                    → 子Agent B 执行 → 返回结果
                    → CEO 汇总 → 返回最终结果给用户
```

CEO 自主决策调度逻辑（不用硬编码流程）：
- CEO 的 System Prompt 定义标准工作流（选题 → 创作 → 审核）
- CEO 根据用户指令内容决定调用哪些子 Agent
- 子 Agent 通过 `Agent` 工具调用，SDK 自动处理上下文隔离

#### 模式 B: Agent Teams 模式（并行协作 + 直连消息）

Claude Agent SDK 的 Agent Teams 功能允许多个 Agent 实例并行运行，通过 `SendMessage` 和 `TaskList` 工具互相通信。

```typescript
// engine/agents/team-session.ts — 【新增】
import { query } from "@anthropic-ai/claude-agent-sdk";

interface TeamMember {
  id: string;
  description: string;
  prompt: string;
  tools: string[];
}

interface TeamSession {
  sessionId: string;
  members: TeamMember[];
  sharedTaskList: SharedTask[];
}

/**
 * 启动 Agent Teams 会话
 *
 * 场景：多 Agent 并行协作
 * 例如：XHS Agent + X-Twitter Agent 同时创作，共享选题上下文
 */
export async function* runTeamSession(
  session: TeamSession,
  instruction: string,
): AsyncGenerator<TeamEvent> {

  // Agent Teams 通过 query() 的 agents 参数 + Agent tool 实现
  // 每个 member 作为子 Agent 注册，CEO 作为协调者
  const agents: Record<string, { description: string; prompt: string; tools: string[] }> = {};

  for (const member of session.members) {
    agents[member.id] = {
      description: member.description,
      prompt: `${member.prompt}\n\n## 团队协作\n你正在一个团队中工作。其他成员：${session.members.filter(m => m.id !== member.id).map(m => `${m.id}(${m.description})`).join(', ')}。\n你可以通过消息与他们沟通。`,
      tools: [...member.tools, "SendMessage"],
    };
  }

  for await (const message of query({
    prompt: instruction,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      agents,
      allowedTools: ["Read", "Write", "Agent", "SendMessage"],
      cwd: ENGINE_DIR,
    },
  })) {
    yield parseTeamMessage(message);
  }
}
```

### 2.2 Agent 间直接通信的消息格式

在 Agent Teams 模式中，Agent 通过 `SendMessage` 工具互相发送消息。SDK 内部处理路由。

**消息数据结构（EventBus 侧，用于 UI 展示）：**

```typescript
// web/src/lib/agent-sdk/types.ts

/** Agent 间消息事件 */
interface AgentMessage {
  id: string;
  from: string;       // 发送者 Agent ID
  to: string;         // 接收者 Agent ID 或 '*' (广播)
  content: string;    // 消息内容
  type: 'task_assign' | 'task_result' | 'question' | 'feedback' | 'info';
  timestamp: number;
  metadata?: {
    taskId?: string;
    priority?: number;
    replyTo?: string;  // 回复哪条消息
  };
}

/** EventBus 中的 Agent 消息事件 */
interface AgentMessageEvent {
  type: 'agent:message';
  agentId: string;    // 发送者
  data: AgentMessage;
}
```

**消息路由机制：**

Agent Teams 的消息路由由 Claude Agent SDK 内部处理。web/ 层只需要：
1. 从 SDK 的流式输出中捕获 `SendMessage` tool_call 事件
2. 解析 tool_call 的 input（包含 from/to/content）
3. 发射 `agent:message` 事件到 EventBus
4. UI 监听 EventBus 展示消息流

### 2.3 CEO Agent 的任务分配 + 结果收集流程

**增强版 CEO System Prompt：**

```typescript
// engine/agents/ceo.ts — System Prompt 核心段落

const CEO_TEAM_PROTOCOL = `
## 团队管理协议

### 可用团队成员
${registry.getAgentList().map(a => `- ${a.id}: ${a.description}`).join('\n')}

### 标准工作流（按任务类型自动选择）

#### 小红书内容创作
1. 调用 growth-agent 做选题研究
2. 基于选题，调用 xhs-agent 创作
3. 调用 brand-reviewer 审查
4. 审查通过 → 输出最终内容；需修改 → 回传 xhs-agent

#### 播客制作
1. 分析主题，确定播客结构
2. 调用 podcast-agent 生成脚本
3. 调用 brand-reviewer 审查内容调性
4. 输出最终脚本 + 音频生成指令

#### 多平台联动
1. 调用 growth-agent 统一选题
2. 并行调用各平台 Agent（xhs-agent, x-twitter-agent 等）
3. 各平台内容独立审查
4. 汇总输出

### 任务分配规则
- 每个分配的任务必须明确：目标、输入上下文、期望产出
- 收到子 Agent 结果后，评估质量再决定下一步
- 遇到审查不通过，最多让子 Agent 修改 2 轮，仍不通过则报告用户

### 结果汇总规则
- 所有子 Agent 完成后，生成执行摘要
- 摘要格式：完成的任务 + 产出物列表 + 质量评估 + 下一步建议
`;
```

### 2.4 共享任务列表的数据结构

```typescript
// engine/agents/types.ts — 新增

/** 共享任务列表项 */
interface SharedTask {
  id: string;
  title: string;
  description: string;
  assignee: string;       // Agent ID
  createdBy: string;      // 谁创建的
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 1 | 2 | 3;   // 1=最高
  input: Record<string, unknown>;   // 任务输入
  output?: Record<string, unknown>; // 任务产出
  createdAt: string;
  completedAt?: string;
  dependencies?: string[];  // 依赖的其他 task ID
}

/** 共享任务列表 — 内存实现 */
class SharedTaskList {
  private tasks: Map<string, SharedTask> = new Map();

  addTask(task: Omit<SharedTask, 'id' | 'createdAt'>): SharedTask {
    const full: SharedTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(full.id, full);
    return full;
  }

  updateTask(id: string, update: Partial<SharedTask>): void {
    const task = this.tasks.get(id);
    if (task) {
      Object.assign(task, update);
      if (update.status === 'completed' || update.status === 'failed') {
        task.completedAt = new Date().toISOString();
      }
    }
  }

  getTasksByAssignee(agentId: string): SharedTask[] {
    return Array.from(this.tasks.values()).filter(t => t.assignee === agentId);
  }

  getPendingTasks(): SharedTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.priority - b.priority);
  }

  toJSON(): string {
    return JSON.stringify(Array.from(this.tasks.values()), null, 2);
  }
}
```

**注意：** 对于 Agent Teams 模式，共享任务列表可以作为 SDK query 的 prompt context 传入，也可以持久化到 Supabase 的 `task_queue` 表。Phase 1 用内存实现，Phase 3 接入数据库。

---

## 3. MCP Server 接入方案

### 3.1 需要的 MCP Server 清单

| MCP Server | 优先级 | 自研/开源 | 用途 | 对应 Agent |
|-----------|--------|----------|------|-----------|
| **CreatorFlow API** | P0 | 自研 | 小红书竞品同步、素材管理、脚本生成、质量检查 | CEO / XHS / Analyst |
| **小红书数据** | P0 | 自研 | 笔记数据回收、热搜话题、竞品监控 | Analyst / Growth |
| **Supabase DB** | P0 | 开源可用 | 数据库 CRUD、指标查询 | Analyst / CEO |
| **文件系统** | P0 | SDK 内置 | Read/Write/Glob — 已有 | 全部 |
| **Podcast/TTS** | P0 | 自研 | 文字转语音、播客音频生成 | Podcast |
| **图片生成** | P1 | 自研（封装 API） | 海报生成、配图生成 | Visual-Gen |
| **X/Twitter API** | P1 | 开源可用 | 发推、读取 timeline、分析互动 | X-Twitter |
| **邮件发送** | P2 | 开源可用 | 发送营销邮件、Newsletter | Outreach |
| **Web Search** | P1 | SDK 内置 | 热点搜索、竞品信息收集 | Growth / CEO |

### 3.2 自研 MCP Server 开发规范

**目录结构：**

```
engine/mcps/
├─ creatorflow/
│   ├─ index.ts         # MCP Server 入口
│   ├─ tools.ts         # Tool 定义
│   └─ README.md        # 使用说明
├─ xhs-data/
│   ├─ index.ts
│   └─ tools.ts
├─ podcast-tts/
│   ├─ index.ts
│   └─ tools.ts
└─ shared/
    ├─ types.ts         # 共享类型
    └─ utils.ts         # 工具函数
```

**MCP Server 模板：**

```typescript
// engine/mcps/creatorflow/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools, handleToolCall } from "./tools.js";

const server = new Server(
  { name: "creatorflow-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler("tools/list", async () => ({ tools }));
server.setRequestHandler("tools/call", async (request) => {
  return handleToolCall(request.params.name, request.params.arguments);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

```typescript
// engine/mcps/creatorflow/tools.ts
export const tools = [
  {
    name: "creatorflow_sync_competitors",
    description: "同步竞品账号的最新笔记到本地数据库",
    inputSchema: {
      type: "object" as const,
      properties: {
        competitorIds: { type: "array", items: { type: "string" }, description: "竞品账号 ID 列表" },
      },
    },
  },
  {
    name: "creatorflow_create_material",
    description: "创建素材（标题 + 正文）",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        content: { type: "string" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "creatorflow_generate_script",
    description: "基于素材 ID 生成脚本",
    inputSchema: {
      type: "object" as const,
      properties: {
        materialId: { type: "string" },
      },
      required: ["materialId"],
    },
  },
  // ... 更多工具
];

export async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "creatorflow_sync_competitors":
      // 调用 CreatorFlow CLI 或直接调用 API
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    // ...
  }
}
```

### 3.3 MCP Server 注册和管理机制

**在 Agent 中挂载 MCP Server：**

```typescript
// engine/agents/registry.ts — Agent 注册表

interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  skillFile: string;          // 对应 skills/*.SKILL.md
  model: string;
  tools: string[];            // 内置工具
  mcpServers?: Record<string, MCPServerConfig>;  // MCP 工具
  maxTurns?: number;
  level: 'orchestrator' | 'specialist' | 'reviewer';
}

interface MCPServerConfig {
  command: string;           // 启动命令
  args: string[];            // 命令参数
  env?: Record<string, string>;
}

// CEO Agent 的 MCP 挂载示例
const CEO_AGENT: AgentDefinition = {
  id: 'ceo',
  name: 'CEO 营销总监',
  description: '营销团队总指挥，负责需求拆解、子 Agent 调度与质量终审',
  skillFile: '',
  model: 'claude-sonnet-4-20250514',
  tools: ['Read', 'Write', 'Glob', 'Grep', 'Bash', 'Agent'],
  mcpServers: {
    creatorflow: {
      command: 'npx',
      args: ['tsx', 'engine/mcps/creatorflow/index.ts'],
    },
  },
  maxTurns: 30,
  level: 'orchestrator',
};
```

**传递给 SDK query：**

```typescript
// executor.ts 中自动从 AgentDefinition 构建 SDK config
function buildQueryConfig(agent: AgentDefinition, prompt: string) {
  return {
    prompt,
    options: {
      model: agent.model,
      allowedTools: agent.tools,
      mcpServers: agent.mcpServers ?? {},
      maxTurns: agent.maxTurns ?? 10,
      permissionMode: "acceptEdits" as const,
      cwd: ENGINE_DIR,
    },
  };
}
```

---

## 4. 新 Agent 开发规范

### 4.1 标准 Agent 开发模板

每个新 Agent 需要两个文件：

#### 文件 1: `engine/agents/{agent-id}.ts`

```typescript
/**
 * {Agent 名称} — {一句话描述}
 *
 * 运行方式：
 *   npx tsx agents/{agent-id}.ts "任务描述"           # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                     # 团队模式
 */

import "./env-fix.js";
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MEMORY_DIR = join(import.meta.dirname, "..", "memory");
const SKILLS_DIR = join(import.meta.dirname, "..", "skills");

// ============================================================
// 加载知识库
// ============================================================

async function loadContext() {
  const load = async (path: string) => {
    try { return await readFile(path, "utf-8"); } catch { return ""; }
  };
  return {
    skill: await load(join(SKILLS_DIR, "{agent-id}.SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
    // ... 其他上下文
  };
}

// ============================================================
// Agent 核心
// ============================================================

export async function run{AgentName}(taskDescription: string) {
  console.log("[{Agent ID}] 开始执行...\n");
  const ctx = await loadContext();

  const systemPrompt = `你是{角色描述}。\n\n## SOP\n${ctx.skill}\n\n## 品牌调性\n${ctx.brandVoice}\n\n## 目标受众\n${ctx.audience}`;

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## 任务\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob"],  // 根据 Agent 需要调整
      maxTurns: 5,
    },
  })) {
    // 标准输出处理（与 xhs-agent.ts 一致）
    const msg = message as Record<string, unknown>;
    if (msg.type === "assistant" && msg.message) {
      const content = (msg.message as Record<string, unknown>).content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === "text" && block?.text) {
            process.stdout.write(block.text);
          }
        }
      }
    }
    if (msg.type === "result") {
      console.log("\n\n[{Agent ID}] 执行完成");
    }
  }
}

// ============================================================
// 直接运行入口
// ============================================================
const taskInput = process.argv[2] || "默认任务描述";
run{AgentName}(taskInput).catch((err) => {
  console.error("[{Agent ID}] 执行失败:", err);
  process.exit(1);
});
```

#### 文件 2: `engine/skills/{agent-id}.SKILL.md`

```markdown
---
name: {agent-id}
description: {SOP 一句话描述}
version: 1.0.0
last_updated: {YYYY-MM-DD}
updated_by: human
---

# {Agent 名称} SOP

## 启动前必读
1. 读取 `./memory/context/brand-voice.md`（品牌调性）
2. 读取 `./memory/context/target-audience.md`（目标受众）
3. {其他上下文文件}

## 工作流程

### Step 1: {步骤名}
- {具体操作}

### Step 2: {步骤名}
- {具体操作}

## 输出格式
{定义标准输出格式}

## 自检清单
- [ ] {检查项 1}
- [ ] {检查项 2}

## 评分公式
```
score = {评分公式}
```
```

### 4.2 注册到 Agent 注册表

```typescript
// engine/agents/registry.ts — 【新增文件】

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ENGINE_DIR = join(import.meta.dirname, "..");
const SKILLS_DIR = join(ENGINE_DIR, "skills");
const MEMORY_DIR = join(ENGINE_DIR, "memory");

export interface AgentDefinition {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  skillFile: string;
  model: string;
  tools: string[];
  mcpServers?: Record<string, { command: string; args: string[] }>;
  maxTurns: number;
  level: 'orchestrator' | 'specialist' | 'reviewer';
  color: string;
  avatar: string;
}

export interface SubAgentConfig {
  description: string;
  prompt: string;
  tools: string[];
}

/**
 * Agent 注册表 — 统一管理所有 Agent 的定义和配置
 *
 * 单例模式，所有模块共享同一实例。
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentDefinition> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  // ========== 注册默认 Agent ==========
  private registerDefaults(): void {
    // P0 Agents
    this.register({
      id: 'ceo',
      name: 'CEO 营销总监',
      nameEn: 'CEO',
      description: '营销团队总指挥，需求拆解、子 Agent 调度与质量终审',
      skillFile: '',
      model: 'claude-sonnet-4-20250514',
      tools: ['Read', 'Write', 'Glob', 'Grep', 'Bash', 'Agent'],
      maxTurns: 30,
      level: 'orchestrator',
      color: '#e74c3c',
      avatar: 'CEO',
    });

    this.register({
      id: 'xhs-agent',
      name: '小红书创作专家',
      nameEn: 'XHS',
      description: '按 SOP 产出高质量小红书种草笔记',
      skillFile: 'xhs.SKILL.md',
      model: 'claude-sonnet-4-20250514',
      tools: ['Read', 'Write', 'Glob'],
      maxTurns: 5,
      level: 'specialist',
      color: '#ff2442',
      avatar: 'XHS',
    });

    this.register({
      id: 'analyst-agent',
      name: '数据飞轮分析师',
      nameEn: 'Analyst',
      description: '分析内容表现数据，提炼胜出模式，更新 SKILL.md',
      skillFile: 'analyst.SKILL.md',
      model: 'claude-sonnet-4-20250514',
      tools: ['Read', 'Write', 'Glob', 'Grep'],
      maxTurns: 10,
      level: 'specialist',
      color: '#3498db',
      avatar: 'AN',
    });

    this.register({
      id: 'growth-agent',
      name: '增长营销专家',
      nameEn: 'Growth',
      description: '选题研究、热点捕捉、竞品分析、发布策略',
      skillFile: 'growth.SKILL.md',
      model: 'claude-sonnet-4-20250514',
      tools: ['Read', 'Glob', 'Grep', 'Bash'],
      maxTurns: 8,
      level: 'specialist',
      color: '#00cec9',
      avatar: 'G',
    });

    this.register({
      id: 'brand-reviewer',
      name: '品牌风控审查',
      nameEn: 'Reviewer',
      description: '审查内容合规性与品牌调性一致性',
      skillFile: 'brand-reviewer.SKILL.md',
      model: 'claude-sonnet-4-20250514',
      tools: ['Read', 'Glob'],
      maxTurns: 3,
      level: 'reviewer',
      color: '#a855f7',
      avatar: 'BR',
    });

    this.register({
      id: 'podcast-agent',
      name: '播客制作专家',
      nameEn: 'Podcast',
      description: '生成播客脚本、音频内容',
      skillFile: 'podcast.SKILL.md',
      model: 'claude-sonnet-4-20250514',
      tools: ['Read', 'Write', 'Bash'],
      maxTurns: 8,
      level: 'specialist',
      color: '#e17055',
      avatar: 'POD',
    });
  }

  // ========== 注册/查询 ==========
  register(def: AgentDefinition): void {
    this.agents.set(def.id, def);
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  getByLevel(level: AgentDefinition['level']): AgentDefinition[] {
    return this.getAll().filter(a => a.level === level);
  }

  // ========== 构建 SDK 配置 ==========

  /** 为指定 Agent 构建独立运行的 SDK query 配置 */
  async buildDirectConfig(agentId: string, userMessage: string, context?: Record<string, unknown>): Promise<{
    prompt: string;
    options: Record<string, unknown>;
  }> {
    const agent = this.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const skill = agent.skillFile
      ? await this.loadFile(join(SKILLS_DIR, agent.skillFile))
      : '';
    const brandVoice = await this.loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
    const audience = await this.loadFile(join(MEMORY_DIR, "context", "target-audience.md"));

    const systemParts = [
      `你是${agent.name}。${agent.description}`,
      skill && `## SOP\n${skill}`,
      brandVoice && `## 品牌调性\n${brandVoice}`,
      audience && `## 目标受众\n${audience}`,
      context && `## 上下文\n${JSON.stringify(context, null, 2)}`,
    ].filter(Boolean).join('\n\n---\n\n');

    return {
      prompt: `${systemParts}\n\n---\n\nUser: ${userMessage}`,
      options: {
        model: agent.model,
        permissionMode: "acceptEdits",
        cwd: ENGINE_DIR,
        allowedTools: agent.tools,
        mcpServers: agent.mcpServers ?? {},
        maxTurns: agent.maxTurns,
      },
    };
  }

  /** 为 CEO 构建带子 Agent 的 Supervisor 配置 */
  async buildSupervisorConfig(userMessage: string, context?: Record<string, unknown>): Promise<{
    prompt: string;
    options: Record<string, unknown>;
  }> {
    const ceo = this.get('ceo');
    if (!ceo) throw new Error('CEO agent not found');

    // 构建子 Agent 定义
    const subAgents: Record<string, SubAgentConfig> = {};
    const specialists = this.getAll().filter(a => a.id !== 'ceo');

    for (const agent of specialists) {
      const skill = agent.skillFile
        ? await this.loadFile(join(SKILLS_DIR, agent.skillFile))
        : '';
      const brandVoice = await this.loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
      const audience = await this.loadFile(join(MEMORY_DIR, "context", "target-audience.md"));

      subAgents[agent.id] = {
        description: agent.description,
        prompt: [
          `你是${agent.name}。${agent.description}`,
          skill && `## SOP\n${skill}`,
          brandVoice && `## 品牌调性\n${brandVoice}`,
          audience && `## 目标受众\n${audience}`,
        ].filter(Boolean).join('\n\n'),
        tools: agent.tools,
      };
    }

    const brandVoice = await this.loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
    const audience = await this.loadFile(join(MEMORY_DIR, "context", "target-audience.md"));
    const calendar = await this.loadFile(join(MEMORY_DIR, "content-calendar.json"));

    const agentList = specialists.map(a => `- ${a.id}: ${a.description}`).join('\n');

    const ceoPrompt = `你是 CEO 营销总监，营销团队负责人。

## 可用团队成员
${agentList}

## 品牌信息
${brandVoice}

## 目标受众
${audience}

## 内容日历
${calendar}

## 工作规则
- 分析用户需求后，决定调用哪些子 Agent
- 标准流程：Growth 选题 → 对应 Agent 创作 → Brand Reviewer 审查 → 终审交付
- 每个任务给子 Agent 明确的目标和上下文
- 收到结果后评估质量，必要时要求修改
- 最终输出执行摘要

${context ? `## 上下文\n${JSON.stringify(context, null, 2)}` : ''}

User: ${userMessage}`;

    return {
      prompt: ceoPrompt,
      options: {
        model: ceo.model,
        permissionMode: "acceptEdits",
        cwd: ENGINE_DIR,
        allowedTools: ceo.tools,
        agents: subAgents,
        mcpServers: ceo.mcpServers ?? {},
        maxTurns: ceo.maxTurns,
      },
    };
  }

  // ========== 辅助方法 ==========
  private async loadFile(path: string): Promise<string> {
    try { return await readFile(path, "utf-8"); } catch { return ""; }
  }
}
```

### 4.3 注册新 Agent 的标准流程

**步骤清单：**

1. **创建 SKILL.md** — `engine/skills/{agent-id}.SKILL.md`，按模板填写 SOP
2. **创建 Agent 实现** — `engine/agents/{agent-id}.ts`，按模板实现
3. **注册到 Registry** — 在 `engine/agents/registry.ts` 的 `registerDefaults()` 中添加
4. **验证独立运行** — `npx tsx agents/{agent-id}.ts "测试任务"` 确认能正常工作
5. **CEO 自动发现** — Registry 注册后，CEO 的 Supervisor 配置会自动包含新 Agent

### 4.4 Agent 间通信接口定义

```typescript
// engine/agents/types.ts — 扩展

/** Agent 能力声明（用于注册表和 Agent Card） */
interface AgentCapability {
  name: string;           // 能力名称
  inputSchema: object;    // JSON Schema
  outputSchema: object;   // JSON Schema
}

/** Agent 执行结果（统一格式） */
interface AgentExecutionResult {
  agentId: string;
  status: 'success' | 'failed';
  output: {
    content: string;          // 主要产出内容
    artifacts?: Array<{       // 附件产出（文件、图片等）
      type: 'file' | 'image' | 'audio';
      path: string;
      description: string;
    }>;
    metadata?: Record<string, unknown>;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
  };
  error?: string;
}
```

---

## 5. 共创模式技术方案

### 5.1 圆桌讨论引擎核心逻辑

**从 agent-chat/ 迁移的核心组件：**

```typescript
// web/src/lib/agent-sdk/roundtable.ts

import { AgentRegistry } from 'marketing-agent-os-engine/agents/registry';
import { createProvider } from '@/lib/llm/provider';
import type { ProviderName, LLMOptions, ChatMessage } from '@/lib/llm/types';

type DiscussionMode = 'explore' | 'debate' | 'synthesize';

interface RoundtableConfig {
  topic: string;
  agentIds: string[];
  mode: DiscussionMode;
  maxRounds: number;
  llmConfig?: { provider: ProviderName; apiKey?: string };
}

interface RoundtableEvent {
  type: 'moderator' | 'agent_response' | 'summary' | 'done' | 'error';
  agentId?: string;
  agentName?: string;
  content: string;
  round?: number;
}

/**
 * 圆桌讨论引擎
 *
 * 流程：
 * 1. Moderator 开场 → 决定首轮发言者
 * 2. 被选中的 Agent 逐一发言
 * 3. Moderator 评估讨论质量 → 决定继续/切换/结束
 * 4. 重复直到达到 maxRounds 或 Moderator 决定结束
 * 5. Moderator 生成讨论总结
 *
 * 与 Supervisor 模式的区别：
 * - 共创模式用 LLM Provider（多模型支持），不用 Claude Agent SDK
 * - Agent 没有工具使用能力，纯对话
 * - 重点是多角度思考和讨论，不是任务执行
 */
export async function* runRoundtable(config: RoundtableConfig): AsyncGenerator<RoundtableEvent> {
  const registry = AgentRegistry.getInstance();
  const agents = config.agentIds
    .map(id => registry.get(id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  if (agents.length === 0) {
    yield { type: 'error', content: '没有找到有效的参与 Agent' };
    return;
  }

  const provider = createProvider(
    config.llmConfig?.provider ?? 'claude',
    config.llmConfig?.apiKey,
  );

  const transcript: string[] = [];
  let currentRound = 0;

  // ===== 开场 =====
  const openingPrompt = buildModeratorOpeningPrompt(agents, config.topic, config.mode, config.maxRounds);
  const openingResponse = await provider.chat(
    [{ role: 'system', content: openingPrompt }, { role: 'user', content: config.topic }],
    { temperature: 0.7, maxTokens: 800 },
  );

  const { displayText: openingText, decision: firstDecision } = parseModeratorDecision(openingResponse.content);
  transcript.push(`[主持人]: ${openingText}`);
  yield { type: 'moderator', content: openingText, round: 0 };

  // ===== 讨论循环 =====
  let nextAgentIds = firstDecision.nextAgentIds;

  while (currentRound < config.maxRounds) {
    currentRound++;

    if (firstDecision.action === 'end_discussion' || firstDecision.action === 'summarize') break;

    // 被选中的 Agent 发言
    const currentRoundResponses: Array<{ agentName: string; content: string }> = [];

    for (const agentNameEn of nextAgentIds) {
      const agent = agents.find(a => a.nameEn === agentNameEn || a.id === agentNameEn);
      if (!agent) continue;

      const agentSystemPrompt = buildRoundtableAgentPrompt(agent, agents, config.mode, currentRound, config.maxRounds);
      const context = transcript.join('\n\n');

      const agentResponse = await provider.chat(
        [
          { role: 'system', content: agentSystemPrompt },
          { role: 'user', content: `${context}\n\n请发表你的观点：` },
        ],
        { temperature: 0.8, maxTokens: 600 },
      );

      const responseText = agentResponse.content;
      transcript.push(`[${agent.name}]: ${responseText}`);
      currentRoundResponses.push({ agentName: agent.name, content: responseText });

      yield { type: 'agent_response', agentId: agent.id, agentName: agent.name, content: responseText, round: currentRound };
    }

    // Moderator 评估并决定下一步
    const turnPrompt = buildModeratorTurnPrompt(agents, transcript.join('\n\n'), currentRound, config.maxRounds, config.mode);
    const turnResponse = await provider.chat(
      [{ role: 'system', content: turnPrompt }, { role: 'user', content: '请评估讨论进展' }],
      { temperature: 0.7, maxTokens: 600 },
    );

    const { displayText: turnText, decision: turnDecision } = parseModeratorDecision(turnResponse.content);
    transcript.push(`[主持人]: ${turnText}`);
    yield { type: 'moderator', content: turnText, round: currentRound };

    if (turnDecision.action === 'summarize' || turnDecision.action === 'end_discussion') break;

    nextAgentIds = turnDecision.nextAgentIds;
  }

  // ===== 总结 =====
  const summaryPrompt = buildModeratorSummaryPrompt(transcript.join('\n\n'), config.topic);
  const summaryResponse = await provider.chat(
    [{ role: 'system', content: summaryPrompt }, { role: 'user', content: '请生成讨论总结' }],
    { temperature: 0.5, maxTokens: 1200 },
  );

  yield { type: 'summary', content: summaryResponse.content };
  yield { type: 'done', content: '' };
}

// Moderator prompt builders（从 agent-chat/chat-engine.ts 迁移）
// ... 复用已有的 buildModeratorOpeningPrompt / buildModeratorTurnPrompt / buildModeratorSummaryPrompt
// ... 复用已有的 parseModeratorDecision / buildRoundtableAgentPrompt
```

### 5.2 从讨论结果切换到执行模式的衔接

**衔接流程：**

```
圆桌讨论（共创模式）
    │
    ▼
讨论总结（含共识/分歧/洞察/建议）
    │
    ▼ 用户确认："按这个方案执行"
    │
    ▼
CEO Supervisor 模式（执行模式）
    │ 将讨论总结作为上下文传入 CEO
    ▼
CEO 分析总结 → 拆解为具体任务 → 调度子 Agent 执行
```

**API 设计：**

```typescript
// POST /api/agent/execute — 从共创切换到执行
{
  agent: "ceo",
  message: "按照刚才的讨论结论执行",
  mode: "supervisor",
  context: {
    roundtableSummary: "刚才圆桌讨论的总结内容...",
    agreedPlan: {
      // 讨论中达成共识的方案
    }
  }
}
```

**web/ UI 层的衔接：**

```typescript
// Team Studio 页面中的模式切换逻辑
function handleSwitchToExecution(summary: string) {
  // 圆桌讨论结束后，用户点击"执行"按钮
  // 将讨论总结作为上下文，切换到 CEO Supervisor 模式
  startAgentExecution({
    agent: 'ceo',
    message: `基于以下讨论共识，制定执行计划并开始执行：\n\n${summary}`,
    mode: 'supervisor',
    context: { roundtableSummary: summary },
  });
}
```

---

## 6. Phase 分步实施计划

### Phase 1: 统一系统（预计 3-5 天）

**目标：** web/ 接入 engine/，消除三套系统并行

**步骤：**

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1.1 | 配置 pnpm workspace 让 web/ 引用 engine/ | 根目录 pnpm-workspace.yaml, web/package.json | 无 |
| 1.2 | 创建 `engine/agents/registry.ts` — Agent 注册表 | engine/agents/registry.ts | 无 |
| 1.3 | 创建 `web/src/lib/agent-sdk/executor.ts` — SDK 执行器 | web/src/lib/agent-sdk/executor.ts | 1.2 |
| 1.4 | 创建 `web/src/lib/agent-sdk/event-bus.ts` — 事件总线 | 迁移自 agent-chat/src/lib/event-bus/ | 无 |
| 1.5 | 创建 `POST /api/agent/execute` — 统一执行端点 | web/src/app/api/agent/execute/route.ts | 1.3, 1.4 |
| 1.6 | 创建 `GET /api/agent/status` — 状态查询端点 | web/src/app/api/agent/status/route.ts | 1.2 |
| 1.7 | 创建 `GET /api/agent/events` — EventBus SSE 端点 | web/src/app/api/agent/events/route.ts | 1.4 |
| 1.8 | Team Studio 页面切换到新 API | web/src/app/team-studio/page.tsx | 1.5, 1.7 |
| 1.9 | 创建 Podcast Agent（P0） | engine/agents/podcast-agent.ts, engine/skills/podcast.SKILL.md | 1.2 |
| 1.10 | 集成测试：CEO 调度所有 P0 Agent | 手动验证 | 1.1-1.9 |

**Phase 1 完成标准：**
- web/ 的 Team Studio 页面通过 `/api/agent/execute` 调用 engine/ 中的 Agent
- CEO 可以调度 XHS / Growth / Brand Reviewer / Analyst / Podcast 五个子 Agent
- Agent Monitor 通过 `/api/agent/events` 实时展示 Agent 执行状态
- 旧的 `/api/team-studio` 端点标记为 deprecated
- `npm run build` 通过

### Phase 2: MCP 工具集成（预计 3-5 天）

**目标：** 接入 CreatorFlow API 和其他外部工具

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 2.1 | 安装 `@modelcontextprotocol/sdk` | engine/package.json | Phase 1 |
| 2.2 | 开发 CreatorFlow MCP Server | engine/mcps/creatorflow/ | 2.1 |
| 2.3 | 开发小红书数据 MCP Server | engine/mcps/xhs-data/ | 2.1 |
| 2.4 | 开发 Podcast TTS MCP Server | engine/mcps/podcast-tts/ | 2.1 |
| 2.5 | 在 Agent Registry 中挂载 MCP Server | engine/agents/registry.ts | 2.2-2.4 |
| 2.6 | 验证 CEO 通过 MCP 调用 CreatorFlow | 手动验证 | 2.5 |

**Phase 2 完成标准：**
- CEO Agent 可通过 MCP 调用 CreatorFlow API（竞品同步、素材创建等）
- Analyst Agent 可通过 MCP 查询小红书数据
- Podcast Agent 可通过 MCP 生成音频
- 所有 MCP Server 有使用文档

### Phase 3: Agent Teams 并行协作 + 共创模式（预计 3-5 天）

**目标：** 实现多 Agent 并行协作和共创圆桌模式

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 3.1 | 迁移圆桌讨论引擎到 web/ | web/src/lib/agent-sdk/roundtable.ts | Phase 1 |
| 3.2 | 创建 `POST /api/agent/roundtable` 端点 | web/src/app/api/agent/roundtable/route.ts | 3.1 |
| 3.3 | 实现共创 → 执行模式切换逻辑 | web/src/lib/agent-sdk/roundtable.ts + executor.ts | 3.1 |
| 3.4 | 实现 Agent Teams 会话（并行协作） | engine/agents/team-session.ts | Phase 1 |
| 3.5 | 开发 P1 Agent：X-Twitter Agent | engine/agents/x-twitter-agent.ts | Phase 1 |
| 3.6 | 开发 P1 Agent：Visual-Gen Agent | engine/agents/visual-gen-agent.ts | Phase 2 (MCP) |
| 3.7 | 开发 P1 Agent：Strategist Agent | engine/agents/strategist-agent.ts | Phase 1 |
| 3.8 | UI 更新：共创模式切换、Agent 消息流展示 | Team Studio 页面 | 3.2, 3.4 |

**Phase 3 完成标准：**
- Team Studio 支持"共创模式"和"执行模式"切换
- 圆桌讨论可使用多种 LLM（不限于 Claude）
- 讨论结论可一键切换到 CEO 执行
- P1 Agent（X-Twitter / Visual-Gen / Strategist）可用
- Agent Teams 支持多 Agent 并行执行（如同时为小红书和 X 创作内容）

---

## 7. 关键技术细节

### 7.1 环境变量隔离

Claude Agent SDK 在 Claude Code session 内运行时会继承环境变量导致冲突。`env-fix.ts` 已解决此问题。

```typescript
// 必须在 import SDK 之前执行
delete process.env.CLAUDECODE;
delete process.env.CLAUDE_CODE_ENTRYPOINT;
delete process.env.CLAUDE_CODE_IS_AGENT;
```

web/ 中同样需要：在 `/api/agent/execute/route.ts` 顶部清理这些环境变量。

### 7.2 长时间运行的处理

Agent SDK 的 `query()` 可能运行数分钟（CEO 调度多个子 Agent 时）。需要：

```typescript
// web/src/app/api/agent/execute/route.ts
export const runtime = "nodejs";
export const maxDuration = 300;  // 5 分钟超时
```

同时在 `vercel.json` 中配置 Pro 计划的函数超时：

```jsonc
{
  "functions": {
    "web/src/app/api/agent/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

### 7.3 并发控制

多个用户同时触发 Agent 时的处理：

```typescript
// web/src/lib/agent-sdk/executor.ts
const MAX_CONCURRENT_AGENTS = 3;  // 最多同时运行 3 个 Agent 会话
let activeCount = 0;

export async function* executeAgent(...) {
  if (activeCount >= MAX_CONCURRENT_AGENTS) {
    yield { type: 'error', content: 'Agent 繁忙，请稍后再试' };
    return;
  }
  activeCount++;
  try {
    // ... 执行逻辑
  } finally {
    activeCount--;
  }
}
```

### 7.4 错误恢复

```typescript
// SDK query 的错误处理
try {
  for await (const message of query(config)) {
    // ...
  }
} catch (err) {
  if (err instanceof Error && err.message.includes('context_length_exceeded')) {
    // 上下文超限 — 建议用户缩短指令或拆分任务
    yield { type: 'error', content: '上下文过长，请缩短指令或分步骤执行' };
  } else if (err instanceof Error && err.message.includes('rate_limit')) {
    // 限流 — 建议用户稍后重试
    yield { type: 'error', content: 'API 限流，请等待 30 秒后重试' };
  } else {
    yield { type: 'error', content: `Agent 执行失败: ${err instanceof Error ? err.message : '未知错误'}` };
  }
}
```

---

## 8. 文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `engine/agents/registry.ts` | Agent 注册表（核心） |
| `engine/agents/podcast-agent.ts` | Podcast Agent |
| `engine/agents/team-session.ts` | Agent Teams 会话管理 |
| `engine/skills/podcast.SKILL.md` | Podcast SOP |
| `engine/mcps/creatorflow/index.ts` | CreatorFlow MCP Server |
| `engine/mcps/creatorflow/tools.ts` | CreatorFlow MCP 工具定义 |
| `engine/mcps/podcast-tts/index.ts` | Podcast TTS MCP Server |
| `engine/mcps/xhs-data/index.ts` | 小红书数据 MCP Server |
| `web/src/lib/agent-sdk/executor.ts` | SDK 执行器 |
| `web/src/lib/agent-sdk/event-bus.ts` | 事件总线 |
| `web/src/lib/agent-sdk/roundtable.ts` | 圆桌讨论引擎 |
| `web/src/lib/agent-sdk/types.ts` | SDK 类型定义 |
| `web/src/app/api/agent/execute/route.ts` | 执行端点 |
| `web/src/app/api/agent/roundtable/route.ts` | 圆桌端点 |
| `web/src/app/api/agent/status/route.ts` | 状态端点 |
| `web/src/app/api/agent/events/route.ts` | EventBus SSE 端点 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| 根目录 `pnpm-workspace.yaml` | 添加 web/ 和 engine/ |
| `web/package.json` | 添加 engine workspace 依赖 + Claude Agent SDK |
| `engine/package.json` | 添加 exports 字段 |
| `web/src/app/team-studio/page.tsx` | 切换到新 API |
| `web/src/components/features/agent-monitor/` | 接入新 EventBus |

### 标记废弃

| 文件 | 废弃时间 |
|------|---------|
| `web/src/app/api/team-studio/route.ts` | Phase 1 完成后 |
| `web/src/lib/agents/orchestrator.ts` | Phase 2 完成后 |
| `web/src/lib/agents/base.ts` 及子类 | Phase 3 完成后 |
| `agent-chat/` 整个目录 | Phase 3 完成后 |

---

*[@DEV] 技术实施方案输出完成。所有代码示例均基于现有 codebase 中已验证的模式设计。等待 @PM 确认后可立即开始 Phase 1 实施。*
