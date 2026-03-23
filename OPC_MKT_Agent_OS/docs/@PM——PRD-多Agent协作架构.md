# PRD — OPC MKT Agent OS 多Agent协作架构

> **版本**: v1.0
> **完成时间**: 2026-03-20
> **参与人员**: @PM（PRD撰写）、老板（决策确认）
> **状态**: 正式版（五项决策已确认）

---

## 1. 背景与目标

### 1.1 解决什么问题

一人公司创始人需要同时运营多个内容平台（小红书、X/Twitter、播客、公众号等），但缺少一支营销团队。当前系统已实现 CEO + XHS + Analyst 三个 Agent 的基础协作（252+ 次工作流执行），但 Agent 种类不足、协作模式单一、缺乏可视化监控。

### 1.2 目标用户

1. 一人公司创始人（Founder-Operator）— 主要用户，自己就是第一个用户
2. 小型内容营销团队（2-10人）— 扩展用户

### 1.3 成功指标

| 指标 | 基线（当前） | 目标（MVP 完成后） |
|------|-------------|-------------------|
| 可用 Agent 数量 | 3 个 | 7 个（P0+P1） |
| 单次内容生产耗时 | ~5 分钟/播客 | ~3 分钟/任意内容类型 |
| 一周内容产出量 | 7 篇小红书 | 7 篇小红书 + 7 条推文 + 2 期播客 + 配图 |
| 工作流成功率 | >90% | >90%（含重试后） |
| Agent 间协作 | 仅通过 CEO 中转 | 支持 Agent 间直接通信 |

---

## 2. 用户故事

### US-01：一键多平台内容生产

> 作为一人公司创始人，我希望输入一条需求（如"关于 AI 工具的内容"），CEO Agent 自动拆解为小红书笔记 + X 推文 + 播客 + 配图四个并行任务，各专业 Agent 协作完成，关键节点我审核确认后一次性交付所有素材。

### US-02：Agent 间直接协作

> 作为系统使用者，我希望 XHS Agent 生成笔记后可以直接将标题和关键词传递给 Visual Gen Agent 生成配图，而不是所有信息都绕回 CEO Agent 中转，减少延迟和 Token 消耗。

### US-03：数据驱动自动进化

> 作为创始人，我希望 Analyst Agent 每周分析各平台内容表现，自动更新各 Agent 的 SKILL.md 写作规则，让内容质量持续提升。

### US-04：实时可观测

> 作为老板，我希望在 Web 看板上实时看到每个 Agent 的运行状态、正在执行的任务、已产出的内容，像 Polsia Live 一样一目了然。

### US-05：共创模式（圆桌讨论）

> 作为创始人，我希望可以发起一个"圆桌讨论"，让多个 Agent 从不同角度讨论一个营销话题（如"下周内容策略"），我从讨论中获取灵感和决策依据。

### US-06：手动触发工作流

> 作为用户，MVP 阶段我通过飞书消息、Web UI 或 CLI 主动下达指令触发 Agent 执行，系统不做自动定时任务（跑稳后再加）。

---

## 3. 架构设计

### 3.1 核心决策：混合模式（Supervisor + Agent-to-Agent）

```
┌──────────────────────────────────────────────────────────────┐
│                    用户入口（飞书 / Web UI / CLI）              │
└──────────────────────────┬───────────────────────────────────┘
                           │ POST /api/openclaw
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   CEO Agent（编排调度器）                       │
│                                                                │
│   意图识别 → 任务拆解（DAG）→ 分配 → 监督 → 汇总交付          │
│   工具：Agent Registry / Task DAG / MCP 工具                  │
└──────┬──────────┬──────────┬──────────┬──────────┬───────────┘
       │          │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌───▼─────┐ ┌──▼──────────┐
  │  XHS   │ │   X    │ │ Pod  │ │ Visual  │ │ Strategist  │
  │ Agent  │ │ Agent  │ │ cast │ │  Gen    │ │   Agent     │
  │        │ │        │ │Agent │ │ Agent   │ │             │
  └───┬────┘ └────────┘ └──────┘ └────▲────┘ └─────────────┘
      │                                │
      │   Agent-to-Agent 直接通信       │
      └────────────────────────────────┘
      (XHS 生成笔记后直接传标题给 Visual Gen 生成配图)

  ┌──────────┐
  │ Analyst  │  ← 独立运行：分析数据 → 更新各 Agent 的 SKILL.md
  │  Agent   │
  └──────────┘
```

### 3.2 核心框架：Claude Agent SDK + MCP 工具层

| 层 | 选型 | 职责 |
|----|------|------|
| Agent 运行时 | Claude Agent SDK（TypeScript） | Agent 生命周期、调度、事件流 |
| 工具接入 | MCP 协议 | 连接外部工具（小红书API、X API、图片生成、TTS 等） |
| Web UI | Next.js 15 + Tailwind + shadcn/ui | 页面展示、交互、Agent Monitor |
| 数据库 | Supabase PostgreSQL | 工作流记录、内容资产、指标数据 |
| 通知 | 飞书机器人 | 事件订阅 + 消息推送 |

**不引入其他框架**（不用 LangChain/LangGraph/AutoGen），保持技术栈纯粹。

### 3.3 系统统一方案（方案 α）

```
OPC_MKT_Agent_OS/
├── engine/                    # Agent 核心（所有 Agent 逻辑在这里）
│   ├── agents/                # Agent 实现
│   │   ├── ceo.ts             # CEO Agent — 编排调度
│   │   ├── xhs-agent.ts       # XHS Agent — 小红书内容
│   │   ├── x-agent.ts         # X/Twitter Agent — 推文/Thread [新增]
│   │   ├── podcast-agent.ts   # Podcast Agent — 播客制作 [新增]
│   │   ├── visual-gen-agent.ts# Visual Gen Agent — 图片+视频 [新增]
│   │   ├── strategist-agent.ts# Strategist Agent — 策略规划 [新增]
│   │   ├── analyst-agent.ts   # Analyst Agent — 数据飞轮
│   │   ├── roundtable.ts      # 圆桌讨论引擎（从 agent-chat 合并）[新增]
│   │   ├── bridge.ts          # Agent 间通信桥接
│   │   ├── registry.ts        # Agent 注册中心 [新增]
│   │   └── types.ts           # 统一类型定义
│   ├── skills/                # SKILL.md 活文档（各 Agent 的 SOP）
│   ├── memory/                # 品牌语气 / 受众画像 / 胜出模式
│   ├── tasks/                 # 任务管理
│   ├── cli/                   # CLI 入口
│   ├── db/                    # 数据库
│   └── scheduler.ts           # 定时调度（MVP 后启用）
│
├── web/                       # UI 层（页面、交互、展示）
│   ├── src/app/
│   │   ├── api/openclaw/      # API Gateway（保持不变）
│   │   ├── dashboard/         # 老板仪表盘 [新增]
│   │   ├── monitor/           # Agent Monitor 实时面板 [新增]
│   │   ├── roundtable/        # 圆桌讨论页面 [新增]
│   │   └── ...
│   └── ...
│
├── agent-chat/                # 逐步废弃，圆桌能力合并到 engine/
│
├── src/                       # Python 原型（已废弃，保留参考）
├── config/                    # 平台配置
├── data/                      # 静态数据
├── docs/                      # 项目文档
└── outputs/                   # 输出文件
```

**迁移策略：**
- `agent-chat/` 的圆桌讨论能力合并到 `engine/agents/roundtable.ts`
- `web/` 的 BaseAgent 逐步废弃，改为调用 `engine/` 的 Agent
- `agent-chat/` 的 UI 组件（如果需要）迁移到 `web/`
- 迁移完成后 `agent-chat/` 标记为 deprecated

---

## 4. Agent 详细规格

### 4.1 CEO Agent（编排调度器）

**职责**: 意图识别、任务拆解、Agent 调度、结果汇总

**输入**: 用户自然语言指令

**输出**: 任务 DAG + 调度指令 + 汇总报告

**核心能力**:
- 将用户需求拆解为 Task DAG（有向无环图），标注依赖关系
- 从 Agent Registry 查询可用 Agent，匹配任务
- 并行调度无依赖的任务
- 在 Intervention 节点暂停等待用户确认
- 汇总所有 Agent 产出，生成交付包

**任务拆解输出格式**:
```typescript
interface TaskDAG {
  id: string;
  tasks: {
    taskId: string;
    agentId: string;         // 负责的 Agent
    action: string;          // 具体动作
    input: Record<string, unknown>;  // 输入参数
    dependsOn: string[];     // 依赖的 taskId 列表（空=可立即执行）
    intervention: boolean;   // 是否需要人工确认
  }[];
}
```

**示例 DAG**:
```
用户："帮我做一期 AI 工具的播客，配小红书笔记和推文"

TaskDAG:
├── T1: collect_materials (CEO) — dependsOn: []
├── T2: generate_podcast (Podcast Agent) — dependsOn: [T1]
├── T3: generate_xhs_note (XHS Agent) — dependsOn: [T1]
├── T4: generate_tweet (X Agent) — dependsOn: [T1]
├── T5: generate_cover (Visual Gen Agent) — dependsOn: [T3] ← Agent间直接通信
└── T6: summarize (CEO) — dependsOn: [T2, T3, T4, T5]
```

**SKILL.md**: `engine/skills/ceo.SKILL.md`（调度策略、优先级规则）

---

### 4.2 XHS Agent（小红书内容专家）

**职责**: 生成符合小红书平台规则的笔记内容

**输入**: 主题/素材 + 品牌调性 + 胜出模式

**输出**: 完整笔记（标题 + 正文 + 标签 + CTA）

**核心能力**:
- 加载 `xhs.SKILL.md` 写作 SOP（标题前 18 字含 2+ 关键词、正文 300-800 字等）
- 加载 `winning-patterns/xhs-patterns.md` 爆款模式
- 加载 `brand-voice.md` 品牌调性
- 生成后执行自检清单（SEO 关键词密度、CTA 引导、敏感词检测）
- 不合格自动重写

**Agent-to-Agent 通信**:
- 生成完成后，可直接将 `{ title, keywords, style }` 传递给 Visual Gen Agent 请求配图
- 接收 Analyst Agent 的规则更新推送

**输出格式**:
```typescript
interface XHSOutput {
  title: string;           // 标题（前18字优化）
  body: string;            // 正文（300-800字）
  tags: string[];          // 标签（5-10个）
  cta: string;             // 互动引导
  seoKeywords: string[];   // SEO 关键词
  selfCheckScore: number;  // 自检得分（0-100）
  coverRequest?: {         // 传给 Visual Gen Agent
    title: string;
    keywords: string[];
    style: 'minimal' | 'bold' | 'photo';
  };
}
```

**现状**: 已实现，252+ 次执行验证

**SKILL.md**: `engine/skills/xhs.SKILL.md`（已存在）

---

### 4.3 X/Twitter Agent（推文创作专家）

**职责**: 生成符合 X/Twitter 平台特点的推文和 Thread

**输入**: 主题/素材 + 品牌调性 + 目标受众

**输出**: 单条推文 或 Thread（多条串联）

**核心能力**:
- 英文为主（全球化分发），可选中英双语
- 单推文 ≤280 字符，Thread 3-7 条
- Hook 优先：第一条推文决定存亡
- 支持 Reply Guy 模式（对行业大V的推文生成回复）
- 自动生成 hashtags

**与 XHS Agent 的区别**（为什么独立而不合并）:
- 语言不同：X 以英文为主，小红书纯中文
- 内容风格不同：X 偏观点输出/技术分享，小红书偏实用教程/种草
- 涨粉逻辑不同：X 靠 Thread 传播和大V互动，小红书靠 SEO 搜索流量
- 平台规则不同：字符限制、标签策略、CTA 方式完全不同

**输出格式**:
```typescript
interface XOutput {
  type: 'single' | 'thread';
  tweets: {
    text: string;          // ≤280 字符
    hashtags: string[];
    hasMedia: boolean;     // 是否需要配图
  }[];
  replyTarget?: string;   // Reply Guy 模式的目标推文 URL
}
```

**SKILL.md**: `engine/skills/x.SKILL.md`（新建）

---

### 4.4 Podcast Agent（播客制作专家）

**职责**: 端到端播客制作（脚本生成 → 人工确认 → TTS 合成）

**输入**: 主题/URL + 时长要求 + 风格偏好

**输出**: 双人对话脚本 + 合成音频 + 文字版

**核心能力**:
- 自动爬取素材（通过 CreatorFlow 万能爬虫）
- 生成双人对话脚本（小杰 × 星星风格，已验证有效）
- 脚本生成后触发 Intervention（推送飞书预览，等待确认）
- 确认后触发扣子空间 TTS 合成音频
- 输出完整 Episode 包（脚本 + 音频 + 文字版 + Coze 输入）

**工作流状态机**:
```
queued → scraping → generating_script → paused_for_intervention
    → (用户确认) → tts_synthesis → completed
    → (用户拒绝) → regenerating_script → paused_for_intervention
```

**输出格式**:
```typescript
interface PodcastOutput {
  episodeId: string;           // 如 pod_20260320_xxxx
  script: string;              // 双人对话脚本（6000-8000字）
  audioUrl?: string;           // TTS 合成后的音频 URL
  textVersion: string;         // 公众号文字版
  cozeInput: string;           // 扣子空间 TTS 输入
  sources: {                   // 素材来源
    url: string;
    title: string;
    extractedLength: number;
  }[];
  duration: string;            // 预估时长如 "8-10min"
}
```

**现状**: 工作流已实现（web/api/openclaw 中 generate_podcast 指令），需要封装为独立 Agent

**SKILL.md**: `engine/skills/podcast.SKILL.md`（新建）

---

### 4.5 Visual Gen Agent（视觉生成专家）

**职责**: 图片生成 + 视频封面/缩略图生成

**输入**: 标题/关键词 + 风格要求 + 尺寸规格

**输出**: 生成的图片/视频素材

**核心能力**:
- 对接 nano-banana-pro 图片生成 API（已有 Claude Code Skill）
- 支持多种尺寸：小红书封面（3:4）、X 配图（16:9）、播客封面（1:1）
- 支持风格参数：minimal / bold / photo / illustration
- 可接收其他 Agent 的直接请求（Agent-to-Agent）

**为什么合并图片和视频**:
- 共享同一套视觉风格系统和品牌规范
- 视频封面/缩略图生成与图片生成逻辑相似
- 减少 Agent 数量降低系统复杂度
- MVP 阶段视频制作以封面/缩略图为主，完整视频剪辑后期再拓展

**Agent-to-Agent 通信**:
- 接收 XHS Agent 的 `coverRequest` 直接生成配图
- 接收 Podcast Agent 的封面请求
- 完成后将结果直接回传请求方 Agent

**输出格式**:
```typescript
interface VisualGenOutput {
  type: 'image' | 'video_cover' | 'thumbnail';
  url: string;               // 生成的图片 URL
  width: number;
  height: number;
  style: string;             // 使用的风格
  prompt: string;            // 实际使用的生成 prompt（可追溯）
  requestedBy?: string;      // 请求方 Agent ID
}
```

**SKILL.md**: `engine/skills/visual-gen.SKILL.md`（新建）

---

### 4.6 Strategist Agent（策略规划专家）

**职责**: 生成内容策略和排期计划

**输入**: 品牌定位 + Analyst 的数据分析 + 热点信息

**输出**: 周计划/月计划 + 内容日历

**核心能力**:
- 基于 Analyst Agent 的数据洞察制定内容方向
- 生成 7 天内容日历（每日主题 + 平台分配 + 内容类型）
- 热点追踪 + 时效性内容规划
- 内容类型配比建议（教育:案例:互动 = 4:3:3）

**依赖**:
- 读取 Analyst Agent 的周报和胜出模式
- 读取 `memory/content-calendar.json` 历史排期
- 读取 `memory/context/target-audience.md` 受众画像

**输出格式**:
```typescript
interface StrategyOutput {
  period: string;            // 如 "2026-03-20 ~ 2026-03-26"
  theme: string;             // 本周主题
  calendar: {
    date: string;            // YYYY-MM-DD
    platform: string;        // xhs / x / podcast / wechat
    contentType: string;     // 痛点型 / 方法型 / 案例型 / 招募型
    topic: string;           // 具体选题
    priority: 'P0' | 'P1' | 'P2';
    notes: string;           // 创作指引
  }[];
  rationale: string;         // 策略依据（数据支撑）
}
```

**SKILL.md**: `engine/skills/growth.SKILL.md`（已存在，需扩展）

---

### 4.7 Analyst Agent（数据飞轮引擎）

**职责**: 分析内容表现、提炼胜出模式、更新 Agent SOP

**输入**: 各平台已发布内容的表现指标

**输出**: 数据分析报告 + SKILL.md 更新 + 周报

**核心能力**:
- 收集各渠道内容表现指标
- 找出 Top 20% 内容的共同特征（hook 类型、情绪触发、标题词汇、发布时间）
- 与现有胜出模式对比，发现新信号
- 更新各 Agent 的 SKILL.md（样本量 >= 10 才更新，新规则标注 `[NEW]`）
- 生成中文周报

**小红书评分公式**: `(收藏x3 + 点赞 + 评论x2) / 曝光量 x 100`

**更新规则的克制原则**:
- 样本量 >= 10 才更新
- 新规则标注 `[NEW]` 和数据来源
- 失效规则标注 `[DEPRECATED]`
- 人工设定的基础规则不会被覆盖

**现状**: 已实现

**SKILL.md**: `engine/skills/analyst.SKILL.md`（已存在）

---

### 4.8 圆桌讨论引擎（Roundtable）

**职责**: 多 Agent 围绕一个话题进行结构化讨论，为用户提供多角度洞察

**输入**: 讨论主题 + 参与 Agent 列表 + 讨论轮数

**输出**: 讨论记录 + 各方观点总结 + 行动建议

**核心能力**:
- 从 agent-chat 的知识型 Agent 能力合并而来
- 支持 2-5 个 Agent 参与讨论
- 每轮讨论中 Agent 可以引用和反驳其他 Agent 的观点
- 自动提炼共识和分歧点
- 最终输出结构化的行动建议

**与 CEO 调度的区别**:
- CEO 调度 = 分工执行（每个 Agent 独立完成各自任务）
- 圆桌讨论 = 协作共创（多个 Agent 围绕同一个问题交叉讨论）

**输出格式**:
```typescript
interface RoundtableOutput {
  topic: string;
  participants: string[];      // Agent 名称列表
  rounds: {
    roundNumber: number;
    contributions: {
      agentId: string;
      perspective: string;     // 角度（如"数据驱动"、"用户体验"）
      content: string;
      referencedAgents?: string[]; // 引用了谁的观点
    }[];
  }[];
  consensus: string[];         // 共识点
  divergences: string[];       // 分歧点
  actionItems: string[];       // 建议行动
}
```

**UI**: `web/src/app/roundtable/` 轻量页面

---

## 5. Agent 间通信协议

### 5.1 通信模式

系统支持两种通信模式：

| 模式 | 路径 | 适用场景 |
|------|------|----------|
| 经 CEO 调度 | Agent → CEO → Agent | 任务分配、汇总、错误处理 |
| Agent-to-Agent 直接通信 | Agent → Agent | 中间结果传递、协作请求 |

### 5.2 统一消息格式

```typescript
interface AgentMessage {
  id: string;                  // 消息唯一 ID
  from: string;                // 发送方 Agent ID
  to: string;                  // 接收方 Agent ID
  type: 'task_assign' | 'result' | 'request' | 'notification' | 'error';
  payload: Record<string, unknown>;
  timestamp: number;
  correlationId: string;       // 关联的工作流 ID
}
```

### 5.3 Agent-to-Agent 通信规则

1. **只允许传递中间结果**，不允许 Agent 互相修改对方的 SOP
2. **必须携带 correlationId**，确保可追溯
3. **接收方可以拒绝请求**（如 Visual Gen Agent 队列满时）
4. **CEO Agent 可以观测所有 Agent-to-Agent 通信**（但不阻断）
5. **通信记录持久化到数据库**，支持事后审计

---

## 6. Agent 注册中心（Agent Registry）

### 6.1 注册协议

每个 Agent 在 `engine/agents/registry.ts` 中注册：

```typescript
interface AgentRegistration {
  id: string;                  // 如 'xhs-agent'
  name: string;                // 如 '小红书内容专家'
  description: string;         // Agent 能力描述
  skillFile: string;           // SKILL.md 路径
  capabilities: string[];     // 能力标签如 ['content_creation', 'xhs', 'chinese']
  acceptsDirectMessages: boolean; // 是否接受 Agent-to-Agent 直接通信
  inputSchema: object;         // 输入参数 Schema（Zod）
  outputSchema: object;        // 输出参数 Schema（Zod）
  status: 'active' | 'inactive' | 'degraded';
}
```

### 6.2 CEO Agent 查询可用 Agent

```typescript
// CEO Agent 根据任务类型查询匹配的 Agent
const agents = registry.findByCapability('content_creation');
const xhsAgent = registry.get('xhs-agent');
const available = registry.getAvailable(); // status === 'active'
```

---

## 7. MCP 工具层

### 7.1 MCP 工具清单

| MCP 工具 | 对接服务 | 使用的 Agent |
|----------|----------|-------------|
| `mcp-creatorflow` | CreatorFlow 自媒体工具链 | CEO, XHS, Podcast |
| `mcp-scraper` | 万能爬虫（13+ 平台） | CEO, Podcast |
| `mcp-image-gen` | nano-banana-pro 图片生成 | Visual Gen |
| `mcp-coze-tts` | 扣子空间 TTS 音频合成 | Podcast |
| `mcp-feishu` | 飞书消息推送 | CEO（通知） |
| `mcp-supabase` | Supabase 数据库操作 | Analyst, CEO |
| `mcp-x-api` | X/Twitter API（发布/分析） | X Agent（后期） |
| `mcp-xhs-api` | 小红书 API（数据回收） | Analyst（后期） |

### 7.2 MCP 工具与 Agent 工具的区别

- **Agent 自带工具**: Read / Write / Glob / Grep / Bash — Claude Agent SDK 内置
- **MCP 工具**: 外部服务集成 — 通过 MCP 协议标准化接入

---

## 8. 工作流状态机

### 8.1 工作流生命周期

```
                    ┌──────────────────────────────┐
                    │                              │
queued → planning → dispatching → executing ──→ completed
                                     │    ↑         │
                                     │    │         │
                                     ▼    │         ▼
                           paused_for_    │     partially_
                           intervention ──┘     completed
                                                (部分失败)
                                     │
                                     ▼
                                  failed
                              (全部失败)
```

### 8.2 状态说明

| 状态 | 说明 |
|------|------|
| `queued` | 工作流已创建，等待处理 |
| `planning` | CEO Agent 正在拆解任务、构建 DAG |
| `dispatching` | CEO Agent 正在分配任务给各 Agent |
| `executing` | 各 Agent 正在执行任务（可能有并行） |
| `paused_for_intervention` | 等待用户确认（至少一个任务需要审核） |
| `completed` | 全部任务完成 |
| `partially_completed` | 部分任务完成、部分失败（已重试仍失败） |
| `failed` | 全部任务失败 |

---

## 9. 核心流程

### 9.1 标准内容生产流程

```
1. 用户输入需求
   "帮我做关于 AI 工具 10x 效率的内容，要小红书、推文和配图"

2. API Gateway 接收（web/src/app/api/openclaw/route.ts）
   → 创建工作流 wfr-xxxx
   → 转发给 CEO Agent

3. CEO Agent 意图识别 + 任务拆解
   → T1: collect_materials (CEO, dependsOn: [])
   → T2: generate_xhs_note (XHS Agent, dependsOn: [T1])
   → T3: generate_tweet (X Agent, dependsOn: [T1])
   → T4: generate_cover (Visual Gen Agent, dependsOn: [T2])

4. 执行阶段
   → T1 完成 → T2, T3 并行启动
   → T2 完成 → XHS Agent 直接传 coverRequest 给 Visual Gen Agent → T4 启动
   → T3 完成
   → T4 完成

5. Intervention（可选）
   → XHS 笔记推送飞书预览 → 用户确认/修改
   → 推文推送预览 → 用户确认/修改

6. 汇总交付
   → CEO Agent 汇总所有产出
   → 存入内容资产库（Supabase）
   → 飞书通知用户
   → Web Dashboard 更新
```

### 9.2 圆桌讨论流程

```
1. 用户发起讨论
   "下周内容策略怎么定？让 Strategist、XHS、Analyst 一起讨论"

2. 圆桌引擎初始化
   → 确认参与 Agent
   → 加载各 Agent 的上下文（SKILL.md、最新数据）

3. 讨论轮次（3-5 轮）
   Round 1: 各 Agent 从各自角度发表观点
   Round 2: 互相引用/补充/反驳
   Round 3: 尝试达成共识

4. 输出
   → 共识点 + 分歧点 + 行动建议
   → 用户参考后做最终决策
```

---

## 10. 数据模型扩展

基于现有 PRD 的 9 张表，新增/修改：

### 10.1 新增表

```sql
-- Agent 注册信息
CREATE TABLE agents (
  id TEXT PRIMARY KEY,              -- 如 'xhs-agent'
  name TEXT NOT NULL,               -- 如 '小红书内容专家'
  description TEXT,
  skill_file TEXT,                  -- SKILL.md 路径
  capabilities TEXT[],              -- 能力标签数组
  status TEXT DEFAULT 'active',     -- active / inactive / degraded
  config JSONB,                     -- Agent 配置
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 间通信记录
CREATE TABLE agent_messages (
  id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES workflows(id),
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  type TEXT NOT NULL,               -- task_assign / result / request / notification / error
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 圆桌讨论记录
CREATE TABLE roundtable_sessions (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  participants TEXT[],              -- Agent ID 列表
  rounds JSONB,                     -- 各轮讨论内容
  consensus TEXT[],
  divergences TEXT[],
  action_items TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.2 修改表

```sql
-- agent_runs 表增加字段
ALTER TABLE agent_runs ADD COLUMN
  direct_messages_sent INTEGER DEFAULT 0,   -- 发出的 Agent-to-Agent 消息数
  direct_messages_received INTEGER DEFAULT 0; -- 收到的 Agent-to-Agent 消息数

-- workflows 表（原 campaigns 扩展）
-- 增加 task_dag 字段存储任务依赖图
ALTER TABLE workflows ADD COLUMN
  task_dag JSONB;                           -- TaskDAG 结构
```

---

## 11. 错误处理与降级策略

### 11.1 Agent 级别错误处理

| 错误类型 | 处理策略 |
|----------|----------|
| Agent 超时（>60s） | 自动重试 1 次，仍失败则标记 degraded |
| LLM 返回质量不达标 | Agent 自检不合格，自动重写（最多 2 次） |
| MCP 工具调用失败 | 重试 1 次，仍失败则 CEO 收到通知决定是否跳过 |
| Agent-to-Agent 通信失败 | 降级为经 CEO 中转 |

### 11.2 工作流级别错误处理

| 场景 | 处理策略 |
|------|----------|
| 单个 Agent 失败 | 其他 Agent 继续执行，最终状态 partially_completed |
| CEO Agent 失败 | 整个工作流 failed，通知用户 |
| 全部 Agent 失败 | 工作流 failed，通知用户 + 记录错误日志 |

### 11.3 Token 预算控制

- 每个工作流设置 Token 上限（默认 100K tokens）
- 超过 80% 时 CEO Agent 收到警告
- 超过 100% 时停止新的 Agent 调用，汇总已有结果交付

---

## 12. Intervention（人机协同）机制

### 12.1 需要人工确认的节点

| Agent | 确认节点 | 确认方式 |
|-------|----------|----------|
| Podcast Agent | 脚本生成后 | 飞书卡片预览 + Web 审核 |
| XHS Agent | 笔记生成后（可选） | 飞书消息 + Web 审核 |
| X Agent | 推文/Thread 生成后（可选） | Web 审核 |
| Visual Gen Agent | 配图生成后（可选） | Web 图片预览 |

### 12.2 确认操作

- **通过**: 工作流继续执行下一步
- **修改后通过**: 用户修改内容 → 保存修改版 → 继续
- **拒绝重做**: Agent 基于用户反馈重新生成（最多 2 次）
- **跳过**: 丢弃该任务的产出，不影响其他任务

### 12.3 快速模式

用户可设置全局偏好：
- `intervention: 'always'` — 每个内容都确认（默认）
- `intervention: 'podcast_only'` — 只确认播客脚本
- `intervention: 'never'` — 全部自动通过（风险自担）

---

## 13. 验收标准（AC）

### AC-01：Agent 注册与调度

- [ ] CEO Agent 可从 Registry 查询所有已注册 Agent
- [ ] CEO Agent 可根据用户需求正确拆解任务 DAG
- [ ] 无依赖的任务可并行执行
- [ ] 有依赖的任务按序执行

### AC-02：Agent-to-Agent 直接通信

- [ ] XHS Agent 生成笔记后可直接传 coverRequest 给 Visual Gen Agent
- [ ] Visual Gen Agent 完成后直接回传结果给请求方
- [ ] 所有 Agent-to-Agent 通信记录持久化到 agent_messages 表
- [ ] CEO Agent 可观测但不阻断直接通信

### AC-03：新增 Agent 可运行

- [ ] X/Twitter Agent 可独立运行生成推文/Thread
- [ ] Podcast Agent 封装完成，可通过 CEO 调度
- [ ] Visual Gen Agent 可生成小红书封面（3:4）和 X 配图（16:9）
- [ ] Strategist Agent 可生成 7 天内容日历

### AC-04：工作流端到端

- [ ] 用户输入"生成小红书+推文+配图"→ 三个 Agent 并行执行 → 汇总交付
- [ ] 工作流每个步骤有时间戳和结果摘要
- [ ] Intervention 节点正确暂停并推送飞书通知
- [ ] 工作流成功率 >90%（含重试后）

### AC-05：圆桌讨论

- [ ] 可发起 2-5 个 Agent 的圆桌讨论
- [ ] 讨论输出包含共识点、分歧点、行动建议
- [ ] 讨论记录持久化

### AC-06：系统统一

- [ ] 所有 Agent 逻辑在 engine/ 中
- [ ] web/ 只负责 UI 展示和 API Gateway
- [ ] agent-chat/ 圆桌能力已合并到 engine/

### AC-07：可观测性

- [ ] Web Monitor 页面实时展示各 Agent 状态
- [ ] Agent 运行日志可追溯（输入/输出/耗时/状态）
- [ ] 工作流历史可查看

---

## 14. 优先级与分期

### Phase 1：巩固 + 标准化（P0，1-2 天）

| 任务 | 负责 | 产出 |
|------|------|------|
| 定义 AgentMessage / AgentRegistration 类型 | @DEV | `engine/agents/types.ts` |
| 实现 Agent Registry | @DEV | `engine/agents/registry.ts` |
| 封装 Podcast Agent | @DEV | `engine/agents/podcast-agent.ts` |
| CEO Agent 支持 TaskDAG 拆解 | @DEV | 更新 `engine/agents/ceo.ts` |
| Agent-to-Agent bridge 通信 | @DEV | 更新 `engine/agents/bridge.ts` |

### Phase 2：扩展 Agent 池（P1，2-3 天）

| 任务 | 负责 | 产出 |
|------|------|------|
| 实现 X/Twitter Agent | @DEV | `engine/agents/x-agent.ts` + `engine/skills/x.SKILL.md` |
| 实现 Visual Gen Agent | @DEV | `engine/agents/visual-gen-agent.ts` + `engine/skills/visual-gen.SKILL.md` |
| 实现 Strategist Agent | @DEV | `engine/agents/strategist-agent.ts` |
| 更新 CEO Agent 调度逻辑（支持新 Agent） | @DEV | 更新 `engine/agents/ceo.ts` |
| 端到端测试（多 Agent 并行工作流） | @QA | 测试报告 |

### Phase 3：可观测性 + 圆桌（P1，1-2 天）

| 任务 | 负责 | 产出 |
|------|------|------|
| Agent Monitor 实时面板 | @Designer + @DEV | `web/src/app/monitor/` |
| 圆桌讨论引擎 | @DEV | `engine/agents/roundtable.ts` |
| 圆桌讨论 UI | @Designer + @DEV | `web/src/app/roundtable/` |
| 事件总线打通（engine <-> web） | @DEV | 统一事件系统 |

### Phase 4：自动化管线（P2，后期）

| 任务 | 负责 | 产出 |
|------|------|------|
| Cron 定时工作流 | @DEV | 更新 `engine/scheduler.ts` |
| 工作流模板系统 | @DEV | 用户自定义 Pipeline |
| Outreach Agent（Email+触达） | @DEV | `engine/agents/outreach-agent.ts` |

---

## 15. 风险与应对

| 风险 | 等级 | 应对 |
|------|------|------|
| 多 Agent 串行复合错误率 | 高 | 独立重试 + 并行执行 + 部分完成机制 |
| Agent-to-Agent 通信死锁 | 中 | 超时机制（30s）+ 降级为 CEO 中转 |
| Token 成本失控 | 中 | 每工作流设预算上限（100K tokens） |
| agent-chat 合并引入 bug | 低 | 渐进式迁移 + 充分测试 |
| SKILL.md 被 Analyst 错误更新 | 低 | 更新需 >= 10 样本 + 人工规则不可覆盖 |

---

*[@PM] | 2026-03-20*
