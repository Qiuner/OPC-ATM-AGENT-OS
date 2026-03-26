# PRD: WorkAny 竞品启发优化方案

**文档编号**: PRD-2026-004
**完成时间**: 2026-03-27
**参与人员**: @PM (产品负责人)
**输入来源**: @Researcher——WorkAny深度技术调研报告.md
**版本**: v1.0

---

## 目录

1. [背景与动机](#1-背景与动机)
2. [P0: CEO Agent Plan-Execute 两阶段模型](#2-p0-ceo-agent-plan-execute-两阶段模型)
3. [P1: SSE 消息协议标准化](#3-p1-sse-消息协议标准化)
4. [P1: 内容预览系统](#4-p1-内容预览系统)
5. [P2: Agent Provider 插件化](#5-p2-agent-provider-插件化)
6. [任务拆解与排期](#6-任务拆解与排期)
7. [风险评估](#7-风险评估)
8. [附录](#8-附录)

---

## 1. 背景与动机

### 1.1 竞品分析摘要

WorkAny (https://github.com/workany-ai/workany) 是一款桌面端 AI Agent 应用，核心特点为：
- **两阶段执行模型**: Plan -> 用户审批 -> Execute，用户对 AI 行为拥有控制权
- **标准化消息协议**: 精细的 SSE 事件类型，前端可根据类型渲染不同 UI
- **丰富的产物预览**: 内置 HTML/React/PDF/Excel/PPT 等多种文件预览
- **多 Provider 支持**: Claude / Codex / DeepAgents / Kimi 等多引擎切换

### 1.2 OPC MKT Agent OS 现状

| 维度 | 当前状态 | 差距 |
|------|---------|------|
| 任务执行模型 | CEO Agent 直接分发执行，无审批环节 | 用户无法在执行前审查/修改计划 |
| SSE 消息协议 | 已有基础 SSE（text/tool_call/tool_result/done/error） | 缺少 plan/plan_approved 等阶段性事件 |
| 内容预览 | 纯文本/Markdown 渲染 | 无平台拟真预览，用户无法直观感知发布效果 |
| Provider 抽象 | web/ 层有 LLMProvider 接口（6 家）；engine/ 层硬绑 Claude Agent SDK | engine 层无法切换 Provider |

### 1.3 优化目标

通过借鉴 WorkAny 的成熟设计模式，结合 OPC MKT Agent OS "出海 AI 营销团队" 的产品定位，在 4 个方向上进行针对性优化，提升用户可控性、开发体验和产品竞争力。

---

## 2. P0: CEO Agent Plan-Execute 两阶段模型

### 2.1 用户故事

**作为** 品牌营销负责人，
**我想要** 在 AI 团队开始执行前，先看到一份结构化的执行计划，
**以便** 我能审查、调整甚至拒绝不合理的方案，确保 AI 的行动符合我的业务意图。

**验收场景**:
1. 用户输入 "帮我策划一个黑五促销的全渠道内容方案"
2. CEO Agent 生成计划 JSON，UI 渲染为可视化看板
3. 用户可以修改某个任务的优先级、删除不需要的步骤、添加备注
4. 用户点击 "批准执行"，CEO Agent 按修改后的计划依次执行
5. 用户点击 "拒绝"，提供拒绝原因，CEO Agent 根据反馈重新规划

### 2.2 功能描述

#### 2.2.1 当前架构问题

当前 CEO Agent 在 `engine/agents/ceo.ts` 和 `engine/agents/registry.ts` 中，接收用户指令后直接通过 `query()` 函数调度子 Agent 执行。用户无法在执行前审查计划，一旦开始就只能等待完成。

核心调用链：
```
用户指令 -> POST /api/agent/execute -> executeAgent() -> query(supervisorConfig) -> 子Agent执行
```

#### 2.2.2 目标架构

引入 Plan-Execute 两阶段分离：

```
阶段1: Plan
用户指令 -> POST /api/agent/plan -> CEO planPhase() -> 返回 ExecutionPlan JSON

阶段2: 审批
UI 渲染计划 -> 用户修改/批准/拒绝 -> POST /api/agent/plan/approve

阶段3: Execute
批准的计划 -> POST /api/agent/execute -> CEO executePhase(plan) -> 按计划调度子Agent
```

### 2.3 数据结构设计

#### 2.3.1 ExecutionPlan（执行计划）

```typescript
interface ExecutionPlan {
  id: string;                    // 计划唯一ID，格式 "plan_xxxx"
  version: number;               // 版本号，每次修改+1
  status: PlanStatus;
  created_at: string;            // ISO 时间戳
  updated_at: string;
  user_prompt: string;           // 用户原始指令
  summary: string;               // CEO 对任务的理解摘要（1-3句话）
  estimated_duration: string;    // 预估总耗时，如 "3-5 分钟"
  steps: PlanStep[];             // 执行步骤列表
  dependencies: PlanDependency[];// 步骤间依赖关系
  metadata: {
    model: string;               // 生成计划使用的模型
    plan_tokens: number;         // 规划阶段消耗的 token
    confidence: number;          // CEO 对计划的置信度 0-100
  };
}

type PlanStatus =
  | "draft"        // CEO 生成中
  | "pending"      // 等待用户审批
  | "approved"     // 用户已批准
  | "rejected"     // 用户已拒绝
  | "executing"    // 正在执行
  | "completed"    // 执行完成
  | "failed";      // 执行失败

interface PlanStep {
  id: string;                    // 步骤ID，格式 "step_001"
  order: number;                 // 执行顺序（支持并行：相同 order 表示可并行）
  agent_id: string;              // 负责执行的 Agent ID
  agent_name: string;            // Agent 中文名（用于 UI 展示）
  action: string;                // 动作描述，如 "生成3条X/Twitter推文"
  input_context: string;         // 传给 Agent 的上下文/指令
  expected_output: string;       // 期望产出描述
  estimated_time: string;        // 预估耗时，如 "30秒"
  priority: "must" | "should" | "could";  // MoSCoW 优先级
  status: StepStatus;
  result?: string;               // 执行完成后的结果摘要
  error?: string;                // 执行失败的错误信息
  user_notes?: string;           // 用户在审批时添加的备注
}

type StepStatus =
  | "pending"      // 等待执行
  | "skipped"      // 用户跳过
  | "running"      // 执行中
  | "completed"    // 已完成
  | "failed";      // 失败

interface PlanDependency {
  from_step: string;   // 前置步骤 ID
  to_step: string;     // 后续步骤 ID
  type: "strict" | "soft";  // strict=必须等待完成, soft=建议先完成
}
```

#### 2.3.2 PlanApproval（审批记录）

```typescript
interface PlanApproval {
  id: string;
  plan_id: string;
  decision: "approved" | "rejected" | "modified";
  modifications?: PlanModification[];
  rejection_reason?: string;
  approved_at: string;
}

interface PlanModification {
  step_id: string;
  field: string;       // 修改的字段名
  old_value: unknown;
  new_value: unknown;
}
```

### 2.4 API 设计

#### POST /api/agent/plan

生成执行计划（SSE 流式返回，让用户看到 CEO 的思考过程）。

**Request:**
```json
{
  "message": "帮我策划一个黑五促销的全渠道内容方案",
  "context": { "campaign_id": "camp_001" }
}
```

**SSE Events:**
```
data: {"type":"text","agentId":"ceo","content":"正在分析任务需求..."}
data: {"type":"text","agentId":"ceo","content":"识别到需要X/Twitter、Email、Meta三个渠道..."}
data: {"type":"plan","plan":{...ExecutionPlan JSON...}}
data: {"type":"done","agentId":"ceo"}
```

#### POST /api/agent/plan/approve

审批执行计划。

**Request:**
```json
{
  "plan_id": "plan_xxxx",
  "decision": "approved",
  "modifications": [
    {
      "step_id": "step_003",
      "field": "priority",
      "old_value": "could",
      "new_value": "skipped"
    }
  ]
}
```

**Response:**
```json
{
  "plan_id": "plan_xxxx",
  "status": "approved",
  "execution_started": true
}
```

批准后，后端自动触发 `POST /api/agent/execute`，以修改后的计划作为 context 传入 CEO Agent。

#### POST /api/agent/plan/reject

拒绝计划，附带拒绝原因。

**Request:**
```json
{
  "plan_id": "plan_xxxx",
  "reason": "不需要Meta广告，预算只够做自然内容",
  "request_replan": true
}
```

当 `request_replan: true` 时，后端自动触发新的 plan 生成，将拒绝原因作为额外上下文。

### 2.5 CEO Agent 系统提示词改造

在 `engine/agents/registry.ts` 的 `buildSupervisorConfig()` 中，需要根据调用来源区分两种模式：

**Plan 模式提示词（新增）:**
```
你是 CEO 营销总监。当前处于【规划阶段】。

你的任务是分析用户需求，生成一份结构化的执行计划。
不要调用任何子 Agent，不要执行任何实际任务。

输出要求：
1. 先用 2-3 句话总结你对任务的理解
2. 然后输出一个 JSON 执行计划（用 ```json 包裹），格式如下：
{
  "summary": "任务理解摘要",
  "estimated_duration": "预估总耗时",
  "steps": [...],
  "dependencies": [...]
}
```

**Execute 模式提示词（现有，增强）:**
```
你是 CEO 营销总监。当前处于【执行阶段】。
以下是用户已批准的执行计划，请严格按照计划调度子 Agent 执行。

已批准计划：
{plan JSON}

注意：
- 跳过 status 为 "skipped" 的步骤
- 参考用户在各步骤上的 user_notes
- 相同 order 的步骤可以并行调度
```

### 2.6 UI 交互设计

#### 2.6.1 计划审批面板

位置：在现有 Workbench 执行面板的基础上，新增一个 "Plan Review" 状态。

布局结构：
```
+--------------------------------------------------+
| [计划概览区]                                       |
| CEO 分析: "这是一个全渠道黑五促销方案..."           |
| 预估耗时: 3-5 分钟  |  置信度: 85%  |  5个步骤     |
+--------------------------------------------------+
| [步骤列表 - 可拖拽排序]                             |
|                                                    |
| 1. [Content Agent] 生成3条X/Twitter推文   [must]   |
|    预估: 30s  |  备注: [可编辑输入框]               |
|    [跳过] [修改优先级]                              |
|                                                    |
| 2. [Email Agent] 撰写促销邮件序列        [should]  |
|    预估: 45s  |  依赖: 步骤1                        |
|    [跳过] [修改优先级]                              |
|                                                    |
| 3. [Visual Agent] 生成社媒配图           [could]   |
|    预估: 20s  |  无依赖                             |
|    [跳过] [修改优先级]                              |
|                                                    |
+--------------------------------------------------+
| [操作区]                                           |
| [批准执行 (绿色)]  [拒绝并重新规划 (红色)]          |
| [添加反馈意见...]                                   |
+--------------------------------------------------+
```

#### 2.6.2 执行进度面板

计划批准后，UI 切换为执行进度模式：
- 每个步骤显示实时状态：等待 / 执行中（动画） / 完成（绿勾） / 失败（红叉）
- 步骤完成后，可展开查看该步骤的产出结果
- 底部显示整体进度条

#### 2.6.3 交互状态机

```
[用户输入指令]
    |
    v
[CEO 规划中...] -- SSE text 事件 --> [显示思考过程]
    |
    v
[计划生成完毕] -- SSE plan 事件 --> [渲染审批面板]
    |
    +--- [用户批准] --> [执行中] --> [完成/失败]
    |
    +--- [用户修改后批准] --> [执行中] --> [完成/失败]
    |
    +--- [用户拒绝 + 请求重新规划] --> [CEO 重新规划中...]
    |
    +--- [用户拒绝 + 不重新规划] --> [回到初始状态]
```

### 2.7 验收标准

| 编号 | 验收条件 | 验证方法 |
|------|---------|---------|
| AC-01 | 用户输入任务后，CEO Agent 返回结构化 JSON 计划，不直接执行 | 调用 /api/agent/plan，检查 SSE 事件包含 type:"plan" |
| AC-02 | 计划 JSON 包含所有必填字段：summary, steps, dependencies | 对返回的 plan 做 schema 校验 |
| AC-03 | UI 正确渲染计划审批面板，每个步骤可交互 | 手动测试：步骤排序、跳过、修改优先级、添加备注 |
| AC-04 | 批准后按计划执行，跳过标记为 skipped 的步骤 | 标记某步骤为 skipped，确认执行日志中未出现该步骤 |
| AC-05 | 拒绝并重新规划时，新计划反映用户的拒绝原因 | 拒绝 "不需要Meta广告"，新计划中应无 Meta 相关步骤 |
| AC-06 | 计划和审批记录持久化到 Store | 检查 data/plans.json 中有对应记录 |

---

## 3. P1: SSE 消息协议标准化

### 3.1 用户故事

**作为** 前端开发者，
**我想要** 一套语义清晰、类型完备的 SSE 消息协议，
**以便** 我能根据不同的消息类型渲染不同的 UI 组件（文本、工具调用、计划审批、错误提示等），而不需要用正则或启发式规则解析消息内容。

### 3.2 功能描述

#### 3.2.1 当前协议问题

当前 `executor.ts` 中的 `AgentStreamEvent` 定义了 7 种事件类型，但存在以下不足：
- 缺少 `plan` 和 `plan_approved` 类型（与 P0 功能联动）
- 缺少 `result` 类型（最终产出与中间文本混在 `text` 类型中）
- `tool_call` 的 `input` 字段是序列化后的字符串，解析不便
- 没有统一的消息信封（envelope），缺少 `timestamp` 和 `sequence` 字段

#### 3.2.2 标准化消息协议

### 3.3 数据结构设计

#### 3.3.1 消息信封（Envelope）

所有 SSE 消息共享同一个信封结构：

```typescript
interface SSEEnvelope<T extends SSEEventType = SSEEventType> {
  seq: number;           // 自增序列号，用于客户端排序和去重
  timestamp: number;     // Unix 毫秒时间戳
  type: T;               // 事件类型
  agent_id: string;      // 产生该事件的 Agent ID
  payload: SSEPayloadMap[T]; // 类型安全的载荷
}
```

#### 3.3.2 事件类型与载荷定义

```typescript
type SSEEventType =
  | "text"           // Agent 输出的文本片段（流式）
  | "tool_use"       // Agent 调用工具
  | "tool_result"    // 工具执行结果
  | "plan"           // CEO 生成的执行计划
  | "plan_approved"  // 用户批准计划
  | "result"         // Agent 最终产出（完整结构化结果）
  | "error"          // 错误信息
  | "done";          // 流结束信号

interface SSEPayloadMap {
  text: {
    content: string;           // 文本内容片段
    is_thinking?: boolean;     // 是否为思考过程（可折叠显示）
  };

  tool_use: {
    tool_id: string;           // 工具调用ID
    tool_name: string;         // 工具名称
    input: Record<string, unknown>; // 工具输入（保持原始对象，不序列化为字符串）
    parent_agent_id?: string;  // 父Agent ID（子Agent调度场景）
  };

  tool_result: {
    tool_id: string;           // 对应的工具调用ID
    tool_name: string;         // 工具名称
    success: boolean;
    output: unknown;           // 工具输出（保持原始类型）
    duration_ms: number;       // 工具执行耗时
  };

  plan: {
    plan: ExecutionPlan;       // 完整的执行计划对象（见 P0 数据结构）
  };

  plan_approved: {
    plan_id: string;
    modifications: PlanModification[];
    approved_by: string;       // "user" | userId
  };

  result: {
    content_type: "markdown" | "json" | "html" | "structured";
    content: string;           // 最终产出内容
    metadata?: {
      platform?: string;       // 目标平台
      word_count?: number;
      content_id?: string;     // 保存后的 Content ID
    };
  };

  error: {
    code: string;              // 错误代码（如 "rate_limit", "context_too_long", "agent_failed"）
    message: string;           // 人类可读的错误描述
    recoverable: boolean;      // 是否可恢复（提示用户重试）
    details?: unknown;         // 附加调试信息
  };

  done: {
    total_steps?: number;
    completed_steps?: number;
    total_tokens?: number;
    duration_ms: number;       // 总执行耗时
  };
}
```

#### 3.3.3 向后兼容策略

为避免破坏现有前端代码，采用渐进式迁移：

1. **Phase A**: 在现有 SSE 输出中新增 `seq` 和 `timestamp` 字段，保持旧字段不变
2. **Phase B**: 新增 `plan`、`plan_approved`、`result` 事件类型
3. **Phase C**: 将 `tool_call.input` 从 string 改为 object，前端同步适配
4. **Phase D**: 移除废弃字段（`tool_call` 重命名为 `tool_use` 等）

### 3.4 前端消费示例

```typescript
// hooks/useSSEStream.ts
function useSSEStream(url: string) {
  const [events, setEvents] = useState<SSEEnvelope[]>([]);

  useEffect(() => {
    const source = new EventSource(url);
    source.onmessage = (e) => {
      const envelope: SSEEnvelope = JSON.parse(e.data);
      setEvents(prev => [...prev, envelope]);

      switch (envelope.type) {
        case "text":
          // 追加到文本流
          appendText(envelope.payload.content);
          break;
        case "plan":
          // 切换到计划审批模式
          showPlanReview(envelope.payload.plan);
          break;
        case "tool_use":
          // 显示工具调用动画
          showToolActivity(envelope.payload.tool_name);
          break;
        case "result":
          // 渲染最终结果（触发内容预览）
          showResult(envelope.payload);
          break;
        case "error":
          if (envelope.payload.recoverable) {
            showRetryPrompt(envelope.payload.message);
          } else {
            showErrorAlert(envelope.payload.message);
          }
          break;
        case "done":
          // 显示执行摘要
          showSummary(envelope.payload);
          break;
      }
    };
    return () => source.close();
  }, [url]);
}
```

### 3.5 验收标准

| 编号 | 验收条件 | 验证方法 |
|------|---------|---------|
| AC-01 | 所有 SSE 消息包含 seq、timestamp、type、agent_id 四个必填字段 | 单元测试校验所有发出的事件 |
| AC-02 | 8 种事件类型均有对应的 TypeScript 类型定义和 payload 校验 | tsc 编译通过 + runtime 校验 |
| AC-03 | tool_use 的 input 字段为原始对象而非 JSON 字符串 | 前端无需 JSON.parse 即可读取工具输入 |
| AC-04 | error 事件包含 code 和 recoverable 字段 | 模拟 rate_limit 错误，确认前端显示重试按钮 |
| AC-05 | seq 字段严格自增，客户端可用于排序和去重 | 并发测试：确认 seq 不重复、不跳号 |
| AC-06 | 向后兼容：旧前端代码在 Phase A 阶段能正常工作 | 在不修改前端的情况下运行现有功能 |

---

## 4. P1: 内容预览系统

### 4.1 用户故事

**作为** 品牌营销人员，
**我想要** 在内容发布前看到各社媒平台的拟真预览效果，
**以便** 我能准确判断内容在目标平台上的展示效果，及时调整文案长度、排版、配图等，避免发布后才发现问题。

**补充场景**:
- 作为用户，我想要将同一段内容在不同平台间切换预览，对比各平台的展示差异。
- 作为用户，我想要预览包含平台真实的视觉元素（logo、配色、字体、布局），而不是简单的富文本渲染。
- 作为用户，我想要在 Approval Center 审批内容时直接看到拟真预览，提升审批效率。

### 4.2 功能描述

#### 4.2.1 核心能力

1. **平台拟真渲染**: 8 种社媒平台 + Email + 海报的视觉模拟
2. **平台切换**: 同一内容一键切换不同平台预览
3. **响应式预览**: 支持移动端/桌面端两种预览尺寸
4. **集成位置**: Approval Center、内容详情页、Workbench 结果面板

#### 4.2.2 支持的预览平台

| 平台 | 优先级 | 说明 |
|------|--------|------|
| 小红书 (Xiaohongshu) | Must | 国内核心渠道 |
| X/Twitter | Must | 海外核心渠道 |
| Instagram | Must | 视觉内容核心渠道 |
| Meta/Facebook | Should | 广告投放主渠道 |
| TikTok | Should | 短视频文案预览 |
| LinkedIn | Should | B2B 营销渠道 |
| Email Template | Should | 邮件营销核心 |
| 海报/Banner | Could | 视觉素材预览 |

### 4.3 数据结构设计

#### 4.3.1 PreviewContent（预览内容数据）

```typescript
interface PreviewContent {
  /** 关联的 Content ID */
  content_id: string;
  /** 内容正文（Markdown 或纯文本） */
  body: string;
  /** 标题（部分平台需要） */
  title?: string;
  /** 媒体素材 URL 列表 */
  media_urls: string[];
  /** 作者信息 */
  author: {
    name: string;
    avatar_url: string;
    handle?: string;       // 如 @brandname
    verified?: boolean;
  };
  /** 互动数据（模拟） */
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    saves?: number;        // 小红书收藏
    retweets?: number;     // X/Twitter 转发
    views?: number;        // 阅读量
  };
  /** 平台特有元数据 */
  platform_meta?: Record<string, unknown>;
  /** 发布时间（模拟） */
  published_at?: string;
  /** 标签/话题 */
  tags?: string[];
  /** CTA 链接 */
  cta_url?: string;
  cta_text?: string;
}
```

#### 4.3.2 PreviewConfig（预览配置）

```typescript
interface PreviewConfig {
  platform: PreviewPlatform;
  theme: "light" | "dark";
  device: "mobile" | "desktop";
  locale: "zh-CN" | "en-US" | "ja-JP";  // 影响界面语言
  show_engagement: boolean;               // 是否显示互动数据
  show_timestamp: boolean;                // 是否显示时间
}

type PreviewPlatform =
  | "xiaohongshu"
  | "x-twitter"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "email"
  | "poster";
```

### 4.4 各平台预览规格

#### 4.4.1 小红书 (Xiaohongshu)

**视觉规格:**
- 品牌色: `#FF2442`（小红书红）
- 背景色: `#FFFFFF`（白色卡片），页面背景 `#F5F5F5`
- Logo: 小红书官方 logo（红色书本图标）
- 字体: 系统默认中文字体（PingFang SC / Noto Sans CHS）
- 卡片圆角: 12px
- 图片比例: 3:4（竖图优先）或 1:1（方图）

**布局结构:**
```
+----------------------------------+
| [小红书 Logo]  发现  |  搜索     |   <- 顶部导航栏 (#FF2442 背景)
+----------------------------------+
| +----------------------------+   |
| |                            |   |
| |      [封面图/轮播图]        |   |   <- 3:4 比例图片区
| |      (支持多图指示器)       |   |
| |                            |   |
| +----------------------------+   |
| | [头像] 作者名  [关注]      |   |   <- 作者信息栏
| +----------------------------+   |
| | 标题（加粗，最多2行）       |   |   <- 标题区（16px bold）
| +----------------------------+   |
| | 正文内容（14px，行高1.8）   |   |   <- 内容区
| | 支持 emoji、@提及           |   |
| | #话题标签# （蓝色高亮）     |   |
| +----------------------------+   |
| | [心] 123  [评] 45  [收] 67 |   |   <- 互动栏
| | [分享]                      |   |
| +----------------------------+   |
+----------------------------------+
```

**特有功能:**
- 话题标签 `#xxx#` 高亮为小红书蓝色 `#3E7FFF`
- @提及 高亮
- 正文中 emoji 正常渲染
- 图片区域支持多图轮播指示器（白色圆点）
- 收藏图标使用小红书特有的收藏样式

#### 4.4.2 X/Twitter

**视觉规格:**
- 品牌色: `#1DA1F2`（经典蓝）/ `#000000`（X黑）
- 暗色主题背景: `#000000`，文字 `#E7E9EA`
- 亮色主题背景: `#FFFFFF`，文字 `#0F1419`
- Logo: X logo（黑色或白色，根据主题）
- 字体: -apple-system, BlinkMacSystemFont, "Segoe UI"
- 推文卡片: 无明显边框，用分割线分隔
- 图片圆角: 16px

**布局结构:**
```
+------------------------------------------+
| [X Logo]                Home              |  <- 顶部（暗色/亮色）
+------------------------------------------+
| [头像]  作者名 @handle  ·  2小时前        |  <- 用户信息行
|                                           |
| 推文正文内容（15px/16px）                  |  <- 正文（最多280字符）
| 支持 @提及（蓝色）和 #话题（蓝色）         |
| 支持链接预览卡片                           |
|                                           |
| +---------------------------------------+|
| |  [图片区域 - 支持1-4图网格布局]        ||  <- 媒体区
| |  1图: 全宽 16:9                        ||
| |  2图: 左右各50%                        ||
| |  3图: 左大右二小                       ||
| |  4图: 2x2 网格                         ||
| +---------------------------------------+|
|                                           |
| [评论] 45   [转发] 123   [喜欢] 678      |  <- 互动栏
| [分享] [书签]                             |
+------------------------------------------+
```

**特有功能:**
- 字符计数显示（280 字符限制进度环）
- Thread 模式：多条推文纵向串联，左侧有连接线
- 引用推文：嵌套卡片样式
- 链接预览卡片（OG 图 + 标题 + 描述）
- 支持暗色/亮色主题切换
- 认证徽章显示（蓝色 / 金色 / 灰色）

#### 4.4.3 Instagram

**视觉规格:**
- 品牌色: 渐变 `linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)`
- 背景色: `#FFFFFF`（亮色）/ `#000000`（暗色）
- Logo: Instagram 渐变相机图标
- 字体: -apple-system, "Helvetica Neue"
- 图片比例: 1:1（方图）、4:5（竖图）、16:9（横图）
- 卡片圆角: 无（边到边设计）

**布局结构:**
```
+------------------------------------------+
| [IG Logo]  Instagram  [消息]              |  <- 顶部导航
+------------------------------------------+
| [头像] 作者名   [···]                     |  <- 作者栏
+------------------------------------------+
|                                           |
|           [图片/轮播]                      |  <- 全宽图片区（1:1）
|           支持多图轮播指示器               |
|                                           |
+------------------------------------------+
| [心] [评论] [分享]          [收藏]        |  <- 操作栏（图标行）
+------------------------------------------+
| xxx likes                                 |  <- 点赞数
| 作者名 正文内容（14px）                    |  <- 文案区
| 支持 @提及 和 #话题 （蓝色）              |
| ...more                                   |
+------------------------------------------+
| View all xx comments                      |  <- 评论入口
| 2 HOURS AGO                               |  <- 时间戳（大写灰色）
+------------------------------------------+
```

**特有功能:**
- 图片轮播指示器（彩色渐变点）
- 双击点赞动画（红心弹出）效果展示
- Story 预览：圆形头像 + 渐变边框
- Reel 预览：全屏竖版视频卡片布局
- 文案折叠："...more" 展开
- 30 个话题标签限制提示

#### 4.4.4 Meta/Facebook

**视觉规格:**
- 品牌色: `#1877F2`（Facebook 蓝）
- 背景色: `#FFFFFF`（卡片），`#F0F2F5`（页面背景）
- Logo: Facebook "f" 图标
- 字体: Helvetica, Arial
- 卡片圆角: 8px
- 阴影: `0 1px 2px rgba(0,0,0,0.1)`

**布局结构:**
```
+------------------------------------------+
| +--------------------------------------+ |
| | [头像] 作者名                        | |  <- 卡片头部
| |        页面名称 · 赞助/2小时前        | |
| |                              [···]    | |
| +--------------------------------------+ |
| |                                      | |
| | 帖子正文内容（14px）                  | |  <- 正文区
| | 支持 #话题 和 @提及                   | |
| | "查看更多" 折叠                       | |
| |                                      | |
| +--------------------------------------+ |
| |                                      | |
| |      [图片/视频/链接预览]             | |  <- 媒体区
| |      链接预览: 图 + 标题 + 描述       | |
| |      + 来源域名                       | |
| |                                      | |
| +--------------------------------------+ |
| |  [赞] 123   12条评论  5次分享        | |  <- 计数栏
| +--------------------------------------+ |
| |  [点赞]   [评论]   [分享]            | |  <- 操作栏
| +--------------------------------------+ |
+------------------------------------------+
```

**特有功能:**
- 广告标记："赞助内容" 标签
- 链接预览卡片（OG 协议）
- 多图网格：1图全宽，2图横排，3+图九宫格
- 表情回应（不只是点赞，还有爱心、哈哈、惊讶等）
- CTA 按钮："了解详情" / "立即购买" / "注册"

#### 4.4.5 TikTok

**视觉规格:**
- 品牌色: `#FF0050`（TikTok 粉红）+ `#00F2EA`（TikTok 青色）
- 背景色: `#000000`（全黑，沉浸式）
- Logo: TikTok 音符图标（粉+青双色叠影）
- 字体: Proxima Nova, -apple-system
- 全屏竖版布局: 9:16 比例

**布局结构:**
```
+-------------------------+
|                         |
|   [全屏背景图/视频]      |  <- 9:16 沉浸式背景
|                         |
|                         |
|                         |
|                    [头像]|  <- 右侧操作栏
|                    [心]  |
|                    12.3K |
|                    [评论]|
|                    456   |
|                    [收藏]|
|                    78    |
|                    [分享]|
|                    90    |
|                         |
| @handle                 |  <- 底部信息区
| 视频描述文案（白色文字） |
| #话题 #标签             |
| [音乐图标] 原声 - 作者名|  <- 音乐信息栏
+-------------------------+
```

**特有功能:**
- 沉浸式全屏预览（深色背景 + 白色文字叠加）
- 右侧垂直操作栏（头像 + 点赞 + 评论 + 收藏 + 分享）
- 底部文案区域（最多 2-3 行，可展开）
- 音乐信息栏（旋转唱片动画）
- 话题标签（#challenge 格式）
- 视频脚本预览：将文案分镜展示为时间轴

#### 4.4.6 LinkedIn

**视觉规格:**
- 品牌色: `#0A66C2`（LinkedIn 蓝）
- 背景色: `#FFFFFF`（卡片），`#F3F2EF`（页面背景）
- Logo: LinkedIn "in" 图标
- 字体: -apple-system, "Segoe UI"
- 卡片圆角: 8px
- 阴影: `0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`

**布局结构:**
```
+------------------------------------------+
| +--------------------------------------+ |
| | [头像] 作者名                        | |  <- 卡片头部
| |        职位 · 公司名                  | |
| |        2小时 · [地球图标]             | |
| |                              [···]    | |
| +--------------------------------------+ |
| |                                      | |
| | 帖子正文内容（14px）                  | |  <- 正文区
| | LinkedIn 风格：专业、洞察性           | |
| | 支持 #话题 和 @提及                   | |
| | ...see more                           | |
| |                                      | |
| +--------------------------------------+ |
| |                                      | |
| |      [图片/文章链接/文档/视频]        | |  <- 媒体区
| |      文章: 封面图 + 标题 + 描述       | |
| |                                      | |
| +--------------------------------------+ |
| | [赞][庆祝][支持][喜欢] 123           | |  <- 反应栏
| | 12 comments · 5 reposts              | |
| +--------------------------------------+ |
| | [Like] [Comment] [Repost] [Send]     | |  <- 操作栏
| +--------------------------------------+ |
+------------------------------------------+
```

**特有功能:**
- 专业化排版：段落间距更大，适合长文
- 多种反应类型（赞、庆祝、支持、喜欢、见解、有趣）
- 文章卡片预览（区别于普通帖子）
- 文档/轮播/PDF 预览模式
- 3 行以上文案自动折叠 + "...see more"
- 作者职位和公司信息展示

#### 4.4.7 Email Template

**视觉规格:**
- 模拟 Gmail / Outlook 邮件客户端界面
- 邮件正文宽度: 600px（邮件标准宽度）
- 背景色: `#FFFFFF`（邮件体），`#F5F5F5`（客户端背景）
- 字体: Arial, Helvetica（邮件安全字体）
- 预览头部模拟客户端工具栏

**布局结构:**
```
+--------------------------------------------------+
| [邮件客户端工具栏]                                  |
| [回复] [转发] [删除] [标记]        模拟 Gmail UI   |
+--------------------------------------------------+
| 发件人: Brand Name <noreply@brand.com>             |
| 收件人: subscriber@email.com                       |
| 主题: [邮件标题]                                    |
| 日期: March 27, 2026 at 10:30 AM                  |
+--------------------------------------------------+
|                                                    |
| +----------------------------------------------+  |
| |          [品牌 Logo / Header 图]              |  |  <- 邮件头部
| +----------------------------------------------+  |
| |                                              |  |
| |  邮件正文内容                                 |  |  <- 正文区（600px）
| |  支持标题、段落、粗体、链接                    |  |
| |  支持图片嵌入                                 |  |
| |                                              |  |
| |  +------------------------------------------+|  |
| |  | [CTA 按钮 - 品牌色背景]                   ||  |  <- CTA 按钮
| |  +------------------------------------------+|  |
| |                                              |  |
| +----------------------------------------------+  |
| |  社交媒体图标 | 退订链接 | 隐私政策           |  |  <- 邮件页脚
| +----------------------------------------------+  |
|                                                    |
+--------------------------------------------------+
```

**特有功能:**
- 模拟 Gmail 和 Outlook 两种客户端界面可切换
- 邮件头部信息（发件人、主题、日期）
- 600px 邮件标准宽度约束
- CTA 按钮渲染（带品牌色）
- 文本/HTML 两种预览模式
- 预检项提示：图片 alt 文本、链接有效性、退订链接

#### 4.4.8 海报/Banner

**视觉规格:**
- 支持多种尺寸模板
- 背景色: 可自定义
- 展示区域外围使用棋盘格透明背景

**尺寸模板:**

| 模板名称 | 尺寸 (px) | 用途 |
|---------|-----------|------|
| Instagram Post | 1080 x 1080 | IG 方形帖子 |
| Instagram Story | 1080 x 1920 | IG Story / Reel |
| Facebook Cover | 820 x 312 | FB 封面 |
| Twitter Header | 1500 x 500 | X/Twitter 头图 |
| LinkedIn Banner | 1584 x 396 | LinkedIn 背景 |
| Email Header | 600 x 200 | 邮件头部 |
| Blog Cover | 1200 x 630 | OG 图 / 博客封面 |
| TikTok Cover | 1080 x 1920 | TikTok 封面 |

**布局结构:**
```
+------------------------------------------+
| [尺寸选择器] IG Post | IG Story | FB...  |  <- 模板切换标签
+------------------------------------------+
|  +---------+                              |
|  |         |  <- 棋盘格透明背景            |
|  | [海报   |                              |
|  |  预览]  |  尺寸: 1080 x 1080           |
|  |         |  比例: 1:1                    |
|  |         |  文件大小: ~2.3MB             |
|  +---------+                              |
|                                           |
| [文案叠加区域]                             |
|  标题文案（大号粗体）                       |
|  副标题/描述                               |
|  CTA 文案                                 |
+------------------------------------------+
| [导出 PNG] [导出 JPG] [复制到剪贴板]       |
+------------------------------------------+
```

### 4.5 UI 组件架构

#### 4.5.1 组件层级

```
ContentPreview/                        # 预览系统根组件
├── PreviewShell.tsx                   # 外壳容器（平台切换标签 + 设备切换）
├── PreviewToolbar.tsx                 # 工具栏（主题切换、设备切换、导出）
├── platforms/                         # 各平台预览组件
│   ├── XiaohongshuPreview.tsx        # 小红书预览
│   ├── XTwitterPreview.tsx           # X/Twitter 预览
│   ├── InstagramPreview.tsx          # Instagram 预览
│   ├── FacebookPreview.tsx           # Facebook 预览
│   ├── TikTokPreview.tsx            # TikTok 预览
│   ├── LinkedInPreview.tsx          # LinkedIn 预览
│   ├── EmailPreview.tsx             # Email 模板预览
│   └── PosterPreview.tsx            # 海报/Banner 预览
├── shared/                           # 共享子组件
│   ├── PlatformLogo.tsx             # 平台 logo 集合
│   ├── EngagementBar.tsx            # 互动数据栏
│   ├── AuthorInfo.tsx               # 作者信息
│   ├── MediaGrid.tsx                # 图片网格布局
│   └── HashtagRenderer.tsx          # 话题标签渲染
└── hooks/
    ├── usePreviewContent.ts         # 内容适配 hook
    └── usePreviewConfig.ts          # 配置管理 hook
```

#### 4.5.2 统一接口

```typescript
interface PlatformPreviewProps {
  content: PreviewContent;
  config: PreviewConfig;
  className?: string;
}

// 每个平台组件都实现此接口
// <XiaohongshuPreview content={...} config={...} />
// <XTwitterPreview content={...} config={...} />
```

#### 4.5.3 平台切换交互

```
+---+---+---+---+---+---+---+---+
|XHS| X |IG |FB |TT |LI |EM |PS |   <- 平台标签栏（图标+名称）
+---+---+---+---+---+---+---+---+
          |
          v
  当前选中平台高亮，下方渲染对应预览组件
```

每个标签包含：平台 logo 小图标 + 平台缩写。当前选中标签使用平台品牌色高亮。

### 4.6 集成位置

#### 4.6.1 Approval Center 集成

在审批页面 (`/approval`) 的内容详情区域，替换当前的纯文本渲染为预览组件：

```
+------------------------------------------+
| [审批列表]         | [内容预览]            |
|                   |                        |
| 内容1 - 待审核    | [XHS | X | IG | ...]   |  <- 平台切换
| 内容2 - 已通过    |                        |
| 内容3 - 待审核    | [拟真预览渲染区域]      |
|                   |                        |
|                   | [通过] [拒绝] [修改]    |
+------------------------------------------+
```

#### 4.6.2 Workbench 结果面板集成

当 Agent 执行完成返回 `result` 事件后，在结果面板中嵌入预览组件：

```
[执行日志区域]
  CEO: 正在调度 XHS Agent...
  XHS Agent: 生成中...
  XHS Agent: 完成

[结果预览区域]
  [小红书预览 | X预览 | Instagram预览]
  [拟真预览渲染]
```

#### 4.6.3 Content 详情页集成

在内容列表的详情弹窗中，提供预览标签页：

```
[内容信息] [预览] [历史版本]
```

### 4.7 内容适配逻辑

不同平台对内容有不同的限制和格式要求，预览组件需要自动适配：

```typescript
const PLATFORM_LIMITS: Record<PreviewPlatform, PlatformLimits> = {
  "xiaohongshu": {
    maxTitleLength: 20,          // 标题最多20字
    maxBodyLength: 1000,         // 正文最多1000字
    maxImages: 18,               // 最多18张图
    imageRatio: ["3:4", "1:1"],  // 支持的图片比例
    maxTags: 10,                 // 最多10个话题标签
    tagFormat: "#话题#",         // 标签格式
  },
  "x-twitter": {
    maxBodyLength: 280,          // 推文最多280字符
    maxImages: 4,                // 最多4张图
    imageRatio: ["16:9", "1:1"],
    maxTags: 5,                  // 建议不超过5个话题
    tagFormat: "#hashtag",
    threadSupport: true,         // 支持 Thread
  },
  "instagram": {
    maxBodyLength: 2200,         // Caption 最多2200字符
    maxImages: 10,               // 轮播最多10张
    imageRatio: ["1:1", "4:5", "16:9"],
    maxTags: 30,
    tagFormat: "#hashtag",
  },
  "facebook": {
    maxBodyLength: 63206,        // 帖子字符上限
    maxImages: 10,
    imageRatio: ["16:9", "1:1"],
    tagFormat: "#hashtag",
  },
  "tiktok": {
    maxBodyLength: 2200,         // 描述最多2200字符
    maxImages: 1,                // 封面图1张
    imageRatio: ["9:16"],        // 竖版
    maxTags: 5,
    tagFormat: "#hashtag",
  },
  "linkedin": {
    maxBodyLength: 3000,         // 帖子最多3000字符
    maxImages: 9,
    imageRatio: ["1.91:1", "1:1", "4:5"],
    tagFormat: "#hashtag",
  },
  "email": {
    maxBodyLength: -1,           // 无限制
    contentWidth: 600,           // 标准邮件宽度
    supportHTML: true,
  },
  "poster": {
    maxBodyLength: 200,          // 海报文案简短
    imageRatio: ["1:1", "9:16", "16:9"],
  },
};
```

当内容超出平台限制时，预览组件应显示警告提示：
- 文案超长：显示红色字符计数 "285/280"
- 图片过多：灰化多余的图片
- 标签过多：灰化超出限制的标签

### 4.8 验收标准

| 编号 | 验收条件 | 验证方法 |
|------|---------|---------|
| AC-01 | 8 种平台预览组件均已实现且可正常渲染 | 逐一切换平台预览，截图对比真实平台 |
| AC-02 | 每个平台包含专属 logo、品牌配色、平台特有布局 | 视觉走查：对比真实平台截图 |
| AC-03 | 同一内容可在不同平台间一键切换预览 | 切换标签，确认内容自动适配 |
| AC-04 | X/Twitter 支持暗色/亮色主题切换 | 切换主题，确认配色变化 |
| AC-05 | 内容超出平台限制时显示警告 | 输入 300 字推文，确认显示超限提示 |
| AC-06 | 移动端/桌面端预览尺寸切换正常 | 切换设备模式，确认布局响应 |
| AC-07 | Approval Center 集成正常 | 在审批页面查看内容预览 |
| AC-08 | Workbench 结果面板集成正常 | 执行任务后在结果区看到预览 |
| AC-09 | 小红书预览包含收藏图标和话题标签高亮 | 视觉检查 |
| AC-10 | Email 预览模拟真实邮件客户端界面 | 视觉检查：包含发件人/主题/日期信息 |
| AC-11 | TikTok 预览为全屏竖版沉浸式布局 | 视觉检查：9:16 比例 + 右侧操作栏 |
| AC-12 | 海报预览支持多种尺寸模板切换 | 切换模板，确认预览尺寸变化 |

---

## 5. P2: Agent Provider 插件化

### 5.1 用户故事

**作为** 平台运维人员，
**我想要** 能根据任务类型和成本预算，灵活切换 AI 模型提供商（Claude / DeepSeek / Qwen / GPT 等），
**以便** 在保证质量的前提下优化成本，并且不被单一供应商锁定。

**补充场景**:
- 作为开发者，我想要一个标准化的 IAgent 接口，使新增 Provider 只需实现接口即可接入，无需修改核心调度逻辑。
- 作为用户，我想要能在设置页面配置不同 Agent 使用不同的 Provider（如 CEO 用 Claude，内容创作用 DeepSeek）。

### 5.2 功能描述

#### 5.2.1 当前架构问题

engine 层（`engine/agents/`）硬依赖 `@anthropic-ai/claude-agent-sdk` 的 `query()` 函数。虽然 web 层的 `web/src/lib/llm/` 已有多 Provider 抽象（支持 Claude / OpenAI / Gemini / DeepSeek / MiniMax / GLM），但两层的抽象不统一，且 engine 层的 Agent 编排能力（工具调用、子 Agent 调度）仅 Claude Agent SDK 支持。

#### 5.2.2 目标架构

定义统一的 `IAgentProvider` 接口，将 Agent 运行时能力（聊天、工具调用、子 Agent 编排）标准化。不同 Provider 声明自己支持的能力集，运行时根据任务需求选择合适的 Provider。

### 5.3 数据结构设计

#### 5.3.1 IAgentProvider 接口

```typescript
/**
 * Agent Provider 统一接口
 *
 * 所有 Provider 必须实现此接口。
 * 不同 Provider 可以声明不同的能力集（capabilities）。
 */
interface IAgentProvider {
  /** Provider 唯一标识 */
  readonly id: string;

  /** Provider 显示名称 */
  readonly name: string;

  /** 支持的模型列表 */
  readonly models: ModelInfo[];

  /** 能力声明 */
  readonly capabilities: ProviderCapabilities;

  /**
   * 基础聊天（所有 Provider 必须支持）
   */
  chat(params: ChatParams): Promise<ChatResponse>;

  /**
   * 流式聊天（可选，不支持则降级为 chat）
   */
  chatStream?(params: ChatParams): AsyncGenerator<ChatStreamEvent>;

  /**
   * 带工具调用的聊天（可选，需声明 toolUse capability）
   */
  chatWithTools?(params: ToolChatParams): AsyncGenerator<ToolChatEvent>;

  /**
   * Agent 编排模式（可选，需声明 agentOrchestration capability）
   * 对应当前 Claude Agent SDK 的 query() 功能
   */
  runAgent?(params: AgentRunParams): AsyncGenerator<AgentRunEvent>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<{ ok: boolean; latency_ms: number }>;
}

/** 能力声明 */
interface ProviderCapabilities {
  /** 基础文本生成 */
  textGeneration: true;

  /** 流式输出 */
  streaming: boolean;

  /** 工具/函数调用 */
  toolUse: boolean;

  /** 子 Agent 编排（Supervisor 模式） */
  agentOrchestration: boolean;

  /** 视觉理解（图片输入） */
  vision: boolean;

  /** 代码执行沙箱 */
  codeExecution: boolean;

  /** MCP 协议支持 */
  mcpSupport: boolean;

  /** 最大上下文窗口（tokens） */
  maxContextWindow: number;

  /** 支持的输出格式 */
  outputFormats: ("text" | "json" | "markdown")[];
}

/** 模型信息 */
interface ModelInfo {
  id: string;                    // 如 "claude-sonnet-4-20250514"
  name: string;                  // 如 "Claude Sonnet 4"
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePerMToken: number;   // 每百万 token 输入价格 (USD)
  outputPricePerMToken: number;  // 每百万 token 输出价格 (USD)
  supports: {
    vision: boolean;
    toolUse: boolean;
    streaming: boolean;
  };
}
```

#### 5.3.2 Provider 注册机制

```typescript
/**
 * Provider Registry — 单例，管理所有已注册的 Provider
 */
class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, IAgentProvider> = new Map();

  static getInstance(): ProviderRegistry { ... }

  /** 注册 Provider */
  register(provider: IAgentProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** 获取 Provider */
  get(id: string): IAgentProvider | undefined {
    return this.providers.get(id);
  }

  /** 按能力筛选 Provider */
  getByCapability(cap: keyof ProviderCapabilities): IAgentProvider[] {
    return [...this.providers.values()].filter(p => p.capabilities[cap]);
  }

  /** 获取支持 Agent 编排的 Provider（CEO 专用） */
  getOrchestrators(): IAgentProvider[] {
    return this.getByCapability("agentOrchestration");
  }

  /** 获取所有已注册 Provider */
  getAll(): IAgentProvider[] {
    return [...this.providers.values()];
  }

  /** 为指定任务选择最优 Provider（基于能力匹配 + 成本） */
  selectBest(requirements: Partial<ProviderCapabilities>): IAgentProvider | null {
    const candidates = [...this.providers.values()].filter(p => {
      for (const [key, value] of Object.entries(requirements)) {
        if (value === true && !p.capabilities[key as keyof ProviderCapabilities]) {
          return false;
        }
      }
      return true;
    });
    // 按成本排序（取最便宜的模型的输入价格）
    return candidates.sort((a, b) => {
      const aCost = Math.min(...a.models.map(m => m.inputPricePerMToken));
      const bCost = Math.min(...b.models.map(m => m.inputPricePerMToken));
      return aCost - bCost;
    })[0] || null;
  }
}
```

#### 5.3.3 内置 Provider 实现示例

```typescript
// providers/claude-agent-provider.ts
class ClaudeAgentProvider implements IAgentProvider {
  readonly id = "claude";
  readonly name = "Anthropic Claude";
  readonly models = [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      contextWindow: 200000,
      maxOutputTokens: 64000,
      inputPricePerMToken: 3,
      outputPricePerMToken: 15,
      supports: { vision: true, toolUse: true, streaming: true },
    },
    // ...其他模型
  ];
  readonly capabilities = {
    textGeneration: true as const,
    streaming: true,
    toolUse: true,
    agentOrchestration: true,    // Claude Agent SDK 独有
    vision: true,
    codeExecution: false,
    mcpSupport: true,            // Claude Agent SDK 原生支持 MCP
    maxContextWindow: 200000,
    outputFormats: ["text", "json", "markdown"] as const,
  };

  async chat(params: ChatParams): Promise<ChatResponse> { ... }
  async *chatStream(params: ChatParams): AsyncGenerator<ChatStreamEvent> { ... }
  async *chatWithTools(params: ToolChatParams): AsyncGenerator<ToolChatEvent> { ... }
  async *runAgent(params: AgentRunParams): AsyncGenerator<AgentRunEvent> {
    // 内部调用 @anthropic-ai/claude-agent-sdk 的 query()
  }
  async healthCheck() { ... }
}

// providers/deepseek-agent-provider.ts
class DeepSeekAgentProvider implements IAgentProvider {
  readonly id = "deepseek";
  readonly name = "DeepSeek";
  readonly capabilities = {
    textGeneration: true as const,
    streaming: true,
    toolUse: true,
    agentOrchestration: false,   // DeepSeek 不支持原生 Agent 编排
    vision: false,
    codeExecution: false,
    mcpSupport: false,
    maxContextWindow: 128000,
    outputFormats: ["text", "json", "markdown"] as const,
  };
  // ... 实现 chat / chatStream / chatWithTools
  // runAgent 不实现（能力声明中 agentOrchestration: false）
}
```

#### 5.3.4 Agent-Provider 绑定配置

```typescript
/** 存储在 settings.json 中的 Provider 配置 */
interface AgentProviderConfig {
  /** 默认 Provider（未显式配置的 Agent 使用此 Provider） */
  default_provider: string;       // Provider ID
  default_model: string;          // Model ID

  /** 每个 Agent 的 Provider 覆盖配置 */
  agent_overrides: Record<string, {
    provider: string;
    model: string;
  }>;

  /** Provider API Keys（加密存储） */
  api_keys: Record<string, string>;
}

// 示例配置
const config: AgentProviderConfig = {
  default_provider: "claude",
  default_model: "claude-sonnet-4-20250514",
  agent_overrides: {
    "global-content-agent": { provider: "deepseek", model: "deepseek-chat" },
    "xhs-agent": { provider: "deepseek", model: "deepseek-chat" },
    // CEO 保持 Claude（唯一支持 agentOrchestration 的 Provider）
  },
  api_keys: {
    claude: "sk-ant-xxx",
    deepseek: "sk-xxx",
  },
};
```

### 5.4 迁移策略

由于 engine 层核心调度（CEO Agent 的 Supervisor 模式）强依赖 Claude Agent SDK 的 `query()` 函数，完全解耦需要较大工作量。采用分阶段迁移：

**Phase 1 (本版本): 接口定义 + 非编排场景**
- 定义 `IAgentProvider` 接口和 `ProviderRegistry`
- 将 web 层现有的 6 个 LLMProvider 适配为 `IAgentProvider`
- 圆桌讨论（Roundtable）等非编排场景可以使用任意 Provider
- 单个 Agent Direct 模式的简单对话可以使用任意 Provider

**Phase 2 (未来): Agent 编排场景**
- 研究其他模型的 Function Calling / Tool Use 能力
- 实现基于通用 Tool Use 的轻量编排器（替代 Claude Agent SDK query）
- CEO Supervisor 模式可以切换 Provider

### 5.5 UI 交互设计

在设置页面（`/settings`）新增 "AI 模型配置" 区域：

```
+------------------------------------------+
| AI 模型配置                               |
+------------------------------------------+
| 默认 Provider:  [Claude v]               |
| 默认模型:       [Claude Sonnet 4 v]      |
+------------------------------------------+
| Agent 专属配置:                           |
|                                           |
| CEO 营销总监     | Claude  | Sonnet 4    |  <- 不可更改（需要编排能力）
| 全球内容创作     | [DeepSeek v] | [Chat v]|  <- 可切换
| 小红书创作专家   | [DeepSeek v] | [Chat v]|
| X/Twitter 专家   | [Claude v] | [Sonnet v]|
| 邮件营销专家     | [Claude v] | [Sonnet v]|
| ...                                       |
+------------------------------------------+
| API Keys:                                 |
| Anthropic: sk-ant-****** [编辑]           |
| DeepSeek:  sk-****** [编辑]              |
| [+ 添加 Provider]                         |
+------------------------------------------+
```

注意：CEO Agent 的 Provider 选择需要检查是否支持 `agentOrchestration` 能力，如果选择的 Provider 不支持，应显示警告 "此 Provider 不支持 Agent 编排，CEO 必须使用支持编排的 Provider"。

### 5.6 验收标准

| 编号 | 验收条件 | 验证方法 |
|------|---------|---------|
| AC-01 | IAgentProvider 接口定义完整，包含 chat / chatStream / chatWithTools / runAgent / healthCheck | TypeScript 类型检查 |
| AC-02 | ProviderRegistry 单例正常工作，支持注册/查询/按能力筛选 | 单元测试 |
| AC-03 | ClaudeAgentProvider 实现所有方法，runAgent 内部调用 Claude Agent SDK | 集成测试：通过 Provider 接口执行 CEO 任务 |
| AC-04 | DeepSeekAgentProvider 实现 chat / chatStream / chatWithTools | 集成测试：通过 Provider 接口执行内容创作 |
| AC-05 | 圆桌讨论可通过 ProviderRegistry 切换 Provider | 使用 DeepSeek 运行圆桌讨论 |
| AC-06 | 设置页面可配置 Agent-Provider 绑定 | UI 测试：修改配置后生效 |
| AC-07 | CEO Agent 不可切换到不支持编排的 Provider | UI 测试：选择 DeepSeek 时显示警告 |
| AC-08 | healthCheck 可检测 Provider 可用性和延迟 | 调用 healthCheck，确认返回 ok 和 latency_ms |

---

## 6. 任务拆解与排期

### 6.1 总体排期

| Phase | 内容 | 预估工时 | 优先级 |
|-------|------|---------|--------|
| Phase 1 | P0: Plan-Execute 两阶段模型 | 32h | P0 |
| Phase 2 | P1: SSE 消息协议标准化 | 16h | P1 |
| Phase 3 | P1: 内容预览系统 | 48h | P1 |
| Phase 4 | P2: Agent Provider 插件化 | 24h | P2 |
| **合计** | | **120h** | |

### 6.2 详细任务清单

#### Phase 1: Plan-Execute 两阶段模型 (P0)

```
## 任务清单

### Task-001: ExecutionPlan 数据模型定义
- 优先级: P0
- 负责人: @DEV
- 预计时间: 2小时
- 依赖: 无
- 验收标准: TypeScript 类型定义完整，包含 ExecutionPlan / PlanStep / PlanDependency / PlanApproval
- 产出物: engine/agents/types.ts + web/src/types/index.ts 新增类型

### Task-002: Plan Store（数据持久化）
- 优先级: P0
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: Task-001
- 验收标准: 支持 CRUD 操作，数据持久化到 data/plans.json
- 产出物: web/src/lib/store/plans.ts

### Task-003: POST /api/agent/plan 端点
- 优先级: P0
- 负责人: @DEV
- 预计时间: 6小时
- 依赖: Task-001, Task-002
- 验收标准: 接收用户指令，CEO Agent 返回结构化计划 JSON，通过 SSE 流式输出
- 产出物: web/src/app/api/agent/plan/route.ts

### Task-004: POST /api/agent/plan/approve 和 reject 端点
- 优先级: P0
- 负责人: @DEV
- 预计时间: 4小时
- 依赖: Task-002, Task-003
- 验收标准: 批准/拒绝/修改计划，批准后自动触发执行
- 产出物: web/src/app/api/agent/plan/approve/route.ts, reject/route.ts

### Task-005: CEO Agent 双模式提示词改造
- 优先级: P0
- 负责人: @DEV
- 预计时间: 5小时
- 依赖: Task-001
- 验收标准: CEO 在 Plan 模式只生成计划不执行，在 Execute 模式按计划执行
- 产出物: engine/agents/registry.ts 修改

### Task-006: 计划审批 UI 面板
- 优先级: P0
- 负责人: @DEV + @Designer
- 预计时间: 8小时
- 依赖: Task-003, Task-004
- 验收标准: 渲染计划步骤、支持跳过/修改优先级/添加备注/批准/拒绝
- 产出物: web/src/components/features/plan-review/

### Task-007: 执行进度面板
- 优先级: P0
- 负责人: @DEV
- 预计时间: 4小时
- 依赖: Task-006
- 验收标准: 实时显示每个步骤的执行状态、进度条、结果展开
- 产出物: web/src/components/features/plan-review/execution-progress.tsx
```

#### Phase 2: SSE 消息协议标准化 (P1)

```
### Task-008: SSE 消息类型定义
- 优先级: P1
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: Task-001
- 验收标准: 定义 SSEEnvelope + 8 种事件类型的 TypeScript 接口
- 产出物: web/src/types/sse.ts 或 engine/agents/types.ts 扩展

### Task-009: Executor SSE 输出改造
- 优先级: P1
- 负责人: @DEV
- 预计时间: 6小时
- 依赖: Task-008
- 验收标准: executor.ts 输出符合新协议，包含 seq/timestamp/envelope 结构
- 产出物: web/src/lib/agent-sdk/executor.ts 修改

### Task-010: 前端 SSE 消费层适配
- 优先级: P1
- 负责人: @DEV
- 预计时间: 5小时
- 依赖: Task-009
- 验收标准: useSSEStream hook 按新协议解析，所有现有功能不受影响
- 产出物: web/src/hooks/useSSEStream.ts 及相关组件适配

### Task-011: SSE 协议单元测试
- 优先级: P1
- 负责人: @QA
- 预计时间: 2小时
- 依赖: Task-009
- 验收标准: 覆盖所有 8 种事件类型的发送和解析
- 产出物: web/src/lib/agent-sdk/__tests__/sse-protocol.test.ts
```

#### Phase 3: 内容预览系统 (P1)

```
### Task-012: PreviewContent 数据模型与 hooks
- 优先级: P1
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: 无
- 验收标准: PreviewContent 类型定义、usePreviewContent hook、平台限制常量
- 产出物: web/src/types/preview.ts, web/src/hooks/usePreviewContent.ts

### Task-013: PreviewShell 外壳组件
- 优先级: P1
- 负责人: @DEV + @Designer
- 预计时间: 4小时
- 依赖: Task-012
- 验收标准: 平台切换标签栏、设备切换、主题切换、导出按钮
- 产出物: web/src/components/features/content-preview/PreviewShell.tsx

### Task-014: 小红书预览组件
- 优先级: P1 (Must)
- 负责人: @DEV
- 预计时间: 6小时
- 依赖: Task-013
- 验收标准: 还原小红书 feed 卡片样式，包含 logo/配色/布局/互动栏/话题高亮
- 产出物: web/src/components/features/content-preview/platforms/XiaohongshuPreview.tsx

### Task-015: X/Twitter 预览组件
- 优先级: P1 (Must)
- 负责人: @DEV
- 预计时间: 6小时
- 依赖: Task-013
- 验收标准: 还原推文卡片样式，支持暗色/亮色主题、Thread 模式、280 字符计数
- 产出物: web/src/components/features/content-preview/platforms/XTwitterPreview.tsx

### Task-016: Instagram 预览组件
- 优先级: P1 (Must)
- 负责人: @DEV
- 预计时间: 6小时
- 依赖: Task-013
- 验收标准: 还原 IG feed 帖子样式，包含轮播指示器、点赞动画、文案折叠
- 产出物: web/src/components/features/content-preview/platforms/InstagramPreview.tsx

### Task-017: Facebook 预览组件
- 优先级: P1 (Should)
- 负责人: @DEV
- 预计时间: 4小时
- 依赖: Task-013
- 验收标准: 还原 FB 帖子卡片，包含链接预览、多图网格、CTA 按钮
- 产出物: web/src/components/features/content-preview/platforms/FacebookPreview.tsx

### Task-018: TikTok 预览组件
- 优先级: P1 (Should)
- 负责人: @DEV
- 预计时间: 5小时
- 依赖: Task-013
- 验收标准: 全屏竖版沉浸式布局、右侧操作栏、底部文案区、音乐信息栏
- 产出物: web/src/components/features/content-preview/platforms/TikTokPreview.tsx

### Task-019: LinkedIn 预览组件
- 优先级: P1 (Should)
- 负责人: @DEV
- 预计时间: 4小时
- 依赖: Task-013
- 验收标准: 还原 LinkedIn 帖子卡片，包含多种反应类型、专业化排版
- 产出物: web/src/components/features/content-preview/platforms/LinkedInPreview.tsx

### Task-020: Email 模板预览组件
- 优先级: P1 (Should)
- 负责人: @DEV
- 预计时间: 5小时
- 依赖: Task-013
- 验收标准: 模拟 Gmail 邮件客户端，600px 邮件宽度，含邮件头/CTA/页脚
- 产出物: web/src/components/features/content-preview/platforms/EmailPreview.tsx

### Task-021: 海报/Banner 预览组件
- 优先级: P1 (Could)
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: Task-013
- 验收标准: 多尺寸模板切换、棋盘格透明背景、文案叠加
- 产出物: web/src/components/features/content-preview/platforms/PosterPreview.tsx

### Task-022: Approval Center 集成
- 优先级: P1
- 负责人: @DEV
- 预计时间: 4小时
- 依赖: Task-014 ~ Task-021
- 验收标准: 审批页面内容详情区显示拟真预览，可切换平台
- 产出物: web/src/app/approval/page.tsx 修改

### Task-023: Workbench 结果面板集成
- 优先级: P1
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: Task-014 ~ Task-021
- 验收标准: Agent 执行完成后在结果面板展示平台预览
- 产出物: web/src/components/features/workbench/result-summary.tsx 修改
```

#### Phase 4: Agent Provider 插件化 (P2)

```
### Task-024: IAgentProvider 接口定义
- 优先级: P2
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: 无
- 验收标准: 接口定义完整，包含能力声明、模型信息、所有方法签名
- 产出物: engine/agents/provider-interface.ts

### Task-025: ProviderRegistry 实现
- 优先级: P2
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: Task-024
- 验收标准: 单例、注册/查询/按能力筛选、selectBest 方法
- 产出物: engine/agents/provider-registry.ts

### Task-026: ClaudeAgentProvider 实现
- 优先级: P2
- 负责人: @DEV
- 预计时间: 6小时
- 依赖: Task-024, Task-025
- 验收标准: 包装现有 Claude Agent SDK 调用，实现全部 IAgentProvider 方法
- 产出物: engine/agents/providers/claude-agent-provider.ts

### Task-027: DeepSeekAgentProvider 实现
- 优先级: P2
- 负责人: @DEV
- 预计时间: 4小时
- 依赖: Task-024, Task-025
- 验收标准: 实现 chat / chatStream / chatWithTools（不含 runAgent）
- 产出物: engine/agents/providers/deepseek-agent-provider.ts

### Task-028: 设置页面 Provider 配置 UI
- 优先级: P2
- 负责人: @DEV + @Designer
- 预计时间: 5小时
- 依赖: Task-025, Task-026, Task-027
- 验收标准: 可配置默认 Provider、Agent 覆盖、API Key 管理
- 产出物: web/src/components/features/settings-panel.tsx 修改

### Task-029: Executor 适配 ProviderRegistry
- 优先级: P2
- 负责人: @DEV
- 预计时间: 3小时
- 依赖: Task-025, Task-026
- 验收标准: executor.ts 从 ProviderRegistry 获取 Provider 而非硬编码 Claude
- 产出物: web/src/lib/agent-sdk/executor.ts 修改
```

---

## 7. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| CEO Plan 模式提示词不稳定，输出非标准 JSON | P0 功能不可用 | 中 | 增加 JSON schema 校验 + 重试机制；使用 system prompt 强约束输出格式 |
| 内容预览组件开发量大，各平台频繁改版 | 延期交付 | 高 | 优先实现 Must 级别平台（小红书/X/IG），其余按需推进；预留 20% 缓冲时间 |
| SSE 协议变更导致现有前端功能回退 | 现有功能受损 | 中 | 采用向后兼容策略，分 Phase 迁移，每步保持双向兼容 |
| DeepSeek 等 Provider 的 Tool Use 能力不完善 | Agent 调度失败 | 中 | P2 阶段仅在非编排场景使用替代 Provider，编排场景保持 Claude |
| 平台 logo 使用的版权/商标问题 | 法律风险 | 低 | 使用简化/抽象版本的平台标识，标注 "模拟预览" 免责声明 |
| 计划审批增加用户操作步骤，影响快速执行体验 | 用户体验退化 | 低 | 提供 "快速执行"（跳过审批）选项，让用户自行选择 |

---

## 8. 附录

### 8.1 相关文档

- `@Researcher——WorkAny深度技术调研报告.md` — 竞品技术分析
- `@PM——产品优化方案-出海AI营销团队.md` — 产品方向
- `engine/CLAUDE.md` — Engine 层技术规范
- `engine/agents/types.ts` — 现有类型定义
- `web/src/lib/agent-sdk/executor.ts` — 现有 SSE 实现
- `web/src/lib/llm/types.ts` — 现有 LLM Provider 接口

### 8.2 技术依赖

| 依赖 | 用途 | 现有/新增 |
|------|------|---------|
| @anthropic-ai/claude-agent-sdk | CEO Agent 编排 | 现有 |
| next.js (App Router) | Web 框架 | 现有 |
| tailwind CSS | 样式 | 现有 |
| shadcn/ui | UI 组件库 | 现有 |
| lucide-react | 图标库 | 现有 |

### 8.3 术语表

| 术语 | 含义 |
|------|------|
| Plan-Execute | 先规划后执行的两阶段工作模式 |
| SSE | Server-Sent Events，服务端单向推送事件流 |
| Provider | AI 模型服务提供商（如 Anthropic、DeepSeek） |
| Supervisor | CEO Agent 编排模式，调度多个子 Agent 协作 |
| Direct | 单个 Agent 独立执行模式 |
| Roundtable | 多 Agent 圆桌讨论模式（共创） |
| MoSCoW | 优先级分类法：Must / Should / Could / Won't |

---

*文档结束*
