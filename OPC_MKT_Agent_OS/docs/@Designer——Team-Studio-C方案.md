# Team Studio C 方案 — 基于现有 Monitor 的增量优化

> 完成时间: 2026-03-23
> 参与人员: @Designer (UI设计师)
> 设计原则: 不改变 Monitor 整体布局，只做增量增强

---

## 设计原则

1. **保留现有结构** — TopBar / Agent 卡片网格 / Terminal 日志 / 底部命令栏 / 右侧 Sidebar，一个不动
2. **增量增强** — 在现有组件上叠加 4 个能力：卡片展开产出、调度标签、日志分类高亮、状态总览栏
3. **最小改动** — 只新增 props/state，不拆分或重组现有组件文件结构
4. **保持克制** — 没有 SVG 连线、没有弹窗、没有新布局模式

---

## 现有 Monitor 结构（不变）

```
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR: ● LIVE | 任务摘要... | ⏱ 00:03:42 | [↻] [■ Stop] │
├─────────────────────────────────────────────────┬───────────┤
│                                                 │           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │ SIDEBAR   │
│  │  CEO    │ │  XHS    │ │ Analyst │ │Growth │ │ Progress  │
│  │ ● busy  │ │ ● busy  │ │ ○ idle  │ │● busy │ │ Context   │
│  │ ━━━░░░ │ │ ━━━━░░ │ │         │ │━━░░░ │ │ Skills    │
│  └─────────┘ └─────────┘ └─────────┘ └───────┘ │           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │           │
│  │Reviewer │ │Podcast  │ │X-Twitter│ │Visual │ │           │
│  └─────────┘ └─────────┘ └─────────┘ └───────┘ │           │
│  ┌─────────┐                                    │           │
│  │Strategst│                                    │           │
│  └─────────┘                                    │           │
│                                                 │           │
│ ──── Terminal ──────────────────────── events ── │           │
│  14:30:02 [CEO] 分析需求，拆解任务...            │           │
│  14:30:05 [CEO] → XHS: 撰写笔记                 │           │
│  14:30:08 [XHS] ⚙ Read brand-voice.md           │           │
│  14:30:12 [Growth] 完成选题分析                  │           │
│                                                 │           │
├─────────────────────────────────────────────────┤           │
│ $ 输入指令发送给 CEO（全员编排）...      [发送]  │           │
└─────────────────────────────────────────────────┴───────────┘
```

---

## 优化 1: 任务状态总览栏

**位置:** 在 Agent 卡片网格**上方**，TopBar 下方，新增一行总览栏。

### 布局

```
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR (不变)                                               │
├─────────────────────────────────────────────────────────────┤
│ 📋 "帮我写一篇小红书种草笔记"   [━━━━━━━━░░] 3/5 完成  ✓CEO ✓Growth ●XHS ○Reviewer ○Podcast │
├─────────────────────────────────────────────────────────────┤
│ Agent 卡片网格 (不变)                                        │
```

### 组件规范

```
任务总览栏容器:
  className="shrink-0 flex items-center gap-4 px-5 py-2.5"
  style={{
    background: 'rgba(167,139,250,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }}

任务描述文字:
  className="text-sm font-medium truncate flex-1 min-w-0"
  style={{ color: 'rgba(255,255,255,0.7)' }}

总进度条:
  外框: className="w-32 h-1.5 rounded-full shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)' }}
  内条: className="h-full rounded-full transition-all duration-500"
        style={{ width: `${completedPercent}%`, background: '#22c55e' }}

进度文字:
  className="text-xs font-medium tabular-nums shrink-0"
  style={{ fontFamily: 'var(--font-geist-mono)', color: 'rgba(255,255,255,0.4)' }}

Agent 进度标签 (每个 Agent 一个小标签):
  已完成: className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}
          内容: "✓ CEO"
  运行中: className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}
          内容: "● XHS"
  等待中: className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.03)' }}
          内容: "○ Reviewer"
```

### 状态逻辑

| 场景 | 显示内容 |
|------|----------|
| 空闲（无任务） | 不显示总览栏（高度 0，隐藏） |
| 执行中 | 任务描述 + 进度条 + Agent 完成标签 |
| 全部完成 | 绿色背景 `rgba(34,197,94,0.06)`，文字 "任务完成" + 汇总摘要（截断单行显示） |
| 出错 | 进度条变红，错误 Agent 标签变红 |

### 交互

- 进度条和标签随 Agent 状态实时更新
- 全部完成时总览栏背景渐变为绿色 `transition-colors duration-500`
- 总览栏不可交互（纯展示），保持克制

---

## 优化 2: Agent 卡片增强 — 就地展开产出

**改动范围:** 仅修改 `AgentStateCard` 组件，新增 `expanded` 状态和展开区域。

### 布局

```
正常态（不变）:
┌─────────────────────────────┐
│ [头像] CEO 营销总监  [状态]  │
│ ━━━━━━━━░░░ (进度条)        │
│ ⚙ Agent x3                  │
│ "分析需求，拆解任务..."      │
└─────────────────────────────┘

展开态（点击后）:
┌─────────────────────────────┐
│ [头像] CEO 营销总监  [状态]  │
│ ━━━━━━━━░░░ (进度条)        │
│ ⚙ Agent x3                  │
│ "分析需求，拆解任务..."      │
├─────────────────────────────┤
│  ▼ 产出内容                  │ ← 就地展开区域
│  ┌───────────────────────┐  │
│  │ # 选题方向分析          │  │
│  │ 1. 面膜种草笔记        │  │
│  │ 2. 成分党深度测评       │  │
│  │ 3. 使用前后对比...▌    │  │  ← 运行中时光标闪烁
│  └───────────────────────┘  │
│            [收起 ▲]         │
└─────────────────────────────┘

CEO 卡片展开态（特殊）:
┌─────────────────────────────┐
│ [头像] CEO 营销总监  [状态]  │
│ ━━━━━━━━░░░ (进度条)        │
│ ⚙ Agent x3                  │
│ "分析需求，拆解任务..."      │
├─────────────────────────────┤
│  调度: → XHS  → Growth       │ ← CEO 特有：调度标签行
│  ▼ 产出内容                  │
│  ┌───────────────────────┐  │
│  │ 任务拆解:              │  │
│  │ 1. Growth: 选题研究    │  │
│  │ 2. XHS: 笔记创作       │  │
│  │ 3. Reviewer: 审查...   │  │
│  └───────────────────────┘  │
│            [收起 ▲]         │
└─────────────────────────────┘
```

### 组件规范

```
卡片点击区域（整个卡片头部可点击）:
  新增: className="cursor-pointer"
  点击事件: onClick={() => toggleExpand(agent.id)}
  hover 增强: 已有 hover 效果不变，新增 hover 时底部出现 "点击展开 ▼" 提示

展开区域容器:
  className="overflow-hidden transition-all duration-300 ease-out"
  style={{
    maxHeight: expanded ? '280px' : '0',
    opacity: expanded ? 1 : 0,
    borderTop: expanded ? '1px solid rgba(255,255,255,0.04)' : 'none',
  }}

展开区域内部:
  className="px-4 pt-3 pb-2"

内容流区域:
  className="rounded-lg px-3 py-2.5 text-sm leading-relaxed overflow-y-auto"
  style={{
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.65)',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-geist-sans)',
  }}

运行中光标:
  className="inline-block w-1.5 h-4 ml-0.5 rounded-sm animate-pulse"
  style={{ background: agent.color, verticalAlign: 'text-bottom' }}

收起按钮:
  className="flex items-center justify-center gap-1 w-full py-1.5 text-xs cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.03)]"
  style={{ color: 'rgba(255,255,255,0.3)' }}
  内容: "收起 ▲"

CEO 调度标签行:
  className="flex items-center gap-1.5 flex-wrap px-4 pt-2"

单个调度标签:
  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
  style={{
    color: targetAgent.color,
    background: `${targetAgent.color}10`,
    border: `1px solid ${targetAgent.color}18`,
  }}
  内容: "→ XHS"
```

### 交互行为

| 操作 | 行为 |
|------|------|
| 点击卡片 | 展开/收起产出区域，`maxHeight` 过渡动画 300ms |
| 卡片 hover | 底部显示浅灰色 "点击展开 ▼" 文字（仅有内容时显示） |
| 展开时自动滚动 | 内容流区域在 `running` 状态自动滚动到底部 |
| 用户上滚 | 暂停自动滚动（与现有 Terminal 逻辑一致） |
| 同时展开多个 | 允许，展开的卡片占 `col-span-full`（跨全行），未展开的保持网格位置 |
| 空内容 | 不显示展开按钮/提示，卡片不可展开 |

### 网格布局调整

展开的卡片需要跨全行显示（因为内容区域需要宽度）：

```
正常: grid grid-cols-2 xl:grid-cols-4 gap-3
展开的卡片: 添加 className="col-span-2 xl:col-span-4"
```

这与现有 execute mode 的 `ExecTaskCard` 中 `expanded && hasContent && 'col-span-full'` 逻辑一致。

---

## 优化 3: CEO 卡片调度关系标签

**改动范围:** 仅在 `AgentStateCard` 中对 `agent.id === 'ceo'` 做特殊处理。

### 显示规则

CEO 卡片底部（进度条和工具信息之间），新增一行调度标签。

```
显示条件: CEO 处于 busy 状态，且有正在执行的子 Agent
数据来源: 从 execOverlay.tasks 中过滤 agentId !== 'ceo' 且 status === 'running' | 'done' 的 task
```

### 组件规范

```
调度标签容器:
  className="flex items-center gap-1 flex-wrap mt-1"

"调度" 前缀:
  className="text-xs font-medium"
  style={{ color: 'rgba(255,255,255,0.25)' }}
  内容: "调度:"

目标 Agent 标签:
  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium transition-all duration-200"

  状态样式:
    running:
      style={{ color: agent.color, background: `${agent.color}10`, border: `1px solid ${agent.color}20` }}
    done:
      style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}
      内容前缀: "✓ "
    error:
      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
      内容前缀: "✗ "
```

### 非展开态也显示

调度标签在 CEO 卡片的正常态（未展开）就可见，不需要展开。位置在现有 "最新活动" 文字的上方：

```
┌─────────────────────────────┐
│ [头像] CEO 营销总监  [状态]  │
│ ━━━━━━━━░░░ (进度条)        │
│ ⚙ Agent x3                  │
│ 调度: → XHS  → Growth  ✓BR  │  ← 新增此行
│ "分析需求，拆解任务..."      │
└─────────────────────────────┘
```

### 被调度 Agent 卡片边框激活

当一个子 Agent 被 CEO 调度时（status 从 waiting → running），其卡片边框颜色从默认 `rgba(255,255,255,0.08)` 变为 `${agent.color}40`:

```
已有逻辑（保留）:
  border: `1px solid ${isBusy ? `${agent.color}40` : T.border}`

无需额外改动 — 现有代码已处理 busy 态边框高亮。
只需确保 execOverlay 正确将子 Agent 状态映射为 busy。
```

---

## 优化 4: Terminal 日志增强 — 事件类型分类

**改动范围:** 修改 `TerminalLogStream` 组件的日志行渲染逻辑。

### 事件类型识别与样式

在现有的 `isInterAgentMsg` 和 `isApproval` 基础上，新增更多类型检测：

```typescript
// 事件类型检测函数
function getLogType(log: LogEntry): 'dispatch' | 'complete' | 'error' | 'tool' | 'normal' {
  if (log.level === 'error') return 'error';
  if (log.source.startsWith('send:') || log.message.includes('→')) return 'dispatch';
  if (log.level === 'success' || log.message.includes('完成') || log.message.includes('✓')) return 'complete';
  if (log.source.startsWith('tool:') || log.message.includes('⚙')) return 'tool';
  return 'normal';
}
```

### 各类型样式

| 事件类型 | 左边框色 | 背景色 | 文字色 | 图标 |
|----------|---------|--------|--------|------|
| `dispatch` (调度) | `#a78bfa` (紫色) | `rgba(167,139,250,0.04)` | `rgba(167,139,250,0.8)` | 无 |
| `complete` (完成) | `#22c55e` (绿色) | `rgba(34,197,94,0.04)` | `rgba(34,197,94,0.8)` | 无 |
| `error` (错误) | `#ef4444` (红色) | `rgba(239,68,68,0.04)` | `#ef4444` | 无 |
| `tool` (工具调用) | `transparent` | `transparent` | `rgba(251,191,36,0.6)` | 无 |
| `normal` (普通) | `transparent` | `transparent` | `rgba(255,255,255,0.6)` | 无 |

### Tailwind 类名参考

```
调度事件行:
  style={{
    background: 'rgba(167,139,250,0.04)',
    borderLeft: '2px solid rgba(167,139,250,0.4)',
  }}
  文字 style={{ color: 'rgba(167,139,250,0.8)' }}

完成事件行:
  style={{
    background: 'rgba(34,197,94,0.04)',
    borderLeft: '2px solid rgba(34,197,94,0.4)',
  }}
  文字 style={{ color: 'rgba(34,197,94,0.8)' }}

错误事件行:
  style={{
    background: 'rgba(239,68,68,0.04)',
    borderLeft: '2px solid rgba(239,68,68,0.4)',
  }}
  文字 style={{ color: '#ef4444' }}

工具事件行:
  style={{ borderLeft: '2px solid transparent' }}
  文字 style={{ color: 'rgba(251,191,36,0.6)' }}

普通事件行:
  style={{ borderLeft: '2px solid transparent' }}
  文字 style={{ color: 'rgba(255,255,255,0.6)' }}
```

### Agent 名称可点击

日志行中的 `[Agent Name]` 标签变为可点击：

```
Agent 名称标签:
  新增: className="cursor-pointer hover:underline"
  点击行为:
    1. 滚动到对应 Agent 卡片（scrollIntoView({ behavior: 'smooth', block: 'nearest' })）
    2. 卡片短暂高亮闪烁（添加 ring-2 ring-[agent.color] 0.8s 后移除）
```

实现方式：通过 ref 映射 `agentId → HTMLDivElement`，点击时调用 `scrollIntoView` + 临时 className。

---

## 数据流说明

### 新增 state（在 AgentMonitor 组件内）

```typescript
// 展开的 Agent 卡片 ID 集合
const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

// 高亮闪烁中的 Agent（点击日志后短暂高亮）
const [highlightAgent, setHighlightAgent] = useState<string | null>(null);

// 切换展开
const toggleExpand = (agentId: string) => {
  setExpandedAgents(prev => {
    const next = new Set(prev);
    if (next.has(agentId)) next.delete(agentId);
    else next.add(agentId);
    return next;
  });
};

// 从日志点击 Agent 名称
const scrollToAgent = (agentId: string) => {
  agentRefs.current[agentId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setHighlightAgent(agentId);
  setTimeout(() => setHighlightAgent(null), 800);
};
```

### Agent 卡片内容数据来源

```typescript
// 从 execOverlay 获取 Agent 产出内容
const agentContent = execOverlay?.tasks.find(t => t.agentId === agent.id)?.content ?? '';

// CEO 调度的子 Agent 列表
const dispatchedAgents = agent.id === 'ceo' && execOverlay?.isRunning
  ? execOverlay.tasks.filter(t => t.agentId !== 'ceo' && t.status !== 'waiting')
  : [];
```

### 任务总览栏数据

```typescript
// 总览数据
const taskPrompt = execOverlay?.isRunning ? execState.prompt : null;
const totalTasks = execOverlay?.tasks.length ?? 0;
const completedTasks = execOverlay?.tasks.filter(t => t.status === 'done').length ?? 0;
const hasError = execOverlay?.tasks.some(t => t.status === 'error') ?? false;
const allDone = totalTasks > 0 && completedTasks === totalTasks;
```

---

## 改动清单

| 文件 | 改动内容 | 影响范围 |
|------|----------|----------|
| `agent-monitor.tsx` — `AgentStateCard` | 新增 `expanded` prop + 展开区域 + CEO 调度标签 | 仅组件内部 |
| `agent-monitor.tsx` — `TerminalLogStream` | 新增 `getLogType` 分类函数 + Agent 名称可点击 | 仅组件内部 |
| `agent-monitor.tsx` — `AgentMonitor` | 新增 `expandedAgents` state + 任务总览栏 JSX + 传递 ref/props | 主组件 |
| `types.ts` | 无改动 | - |
| `globals.css` | 新增 `@keyframes highlight-flash` | 1 个 keyframes |

### 新增 CSS (globals.css)

```css
@keyframes highlight-flash {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 0 2px var(--flash-color, #a78bfa), 0 0 16px var(--flash-color, #a78bfa)40; }
}
.animate-highlight-flash {
  animation: highlight-flash 0.4s ease-in-out 2;
}
```

---

## 视觉对比 — 改动前后

### Before (现有 Monitor)

```
┌─────────────────────────────────────────────────┐
│ ● LIVE | 等待任务指令...      | ⏱ 00:00 | [↻]  │
├─────────────────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │
│ │ CEO   │ │ XHS   │ │ Anlst │ │Growth │        │
│ │ busy  │ │ busy  │ │ idle  │ │ busy  │        │
│ └───────┘ └───────┘ └───────┘ └───────┘        │
│ ┌───────┐ ┌───────┐ ...                         │
│ └───────┘ └───────┘                              │
│ ── Terminal ──────────────────── 12 events ──    │
│ 14:30:02 [CEO] 分析需求...                       │
│ 14:30:05 [CEO] → XHS: 创作                      │
│ 14:30:08 [XHS] ⚙ Read brand-voice.md            │
│                                                  │
│ $ 输入指令...                            [发送]  │
└──────────────────────────────────────────────────┘
```

### After (C 方案优化后)

```
┌──────────────────────────────────────────────────┐
│ ● LIVE | 等待任务指令...       | ⏱ 00:03 | [↻]  │
├──────────────────────────────────────────────────┤
│ 📋 "写小红书种草笔记" [━━━━━━░░] 3/5  ✓CEO ✓G ●XHS ○BR │  ← 新增: 总览栏
├──────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐        │
│ │ [CEO]  CEO 营销总监          [状态]    │        │
│ │ ━━━━━━━━━━ (进度)                      │        │
│ │ ⚙ Agent x3                            │        │
│ │ 调度: → XHS  → Growth  ✓ Reviewer     │        │  ← 新增: 调度标签
│ │ "拆解完成，等待子Agent..."             │        │
│ ├───────────────────────────────────────┤        │  ← 新增: 展开区域
│ │ ▼ 产出内容                             │        │
│ │ ┌─────────────────────────────────┐   │        │
│ │ │ 任务拆解:                        │   │        │
│ │ │ 1. Growth: 选题研究              │   │        │
│ │ │ 2. XHS: 撰写笔记                │   │        │
│ │ │ 3. Reviewer: 品牌审查...         │   │        │
│ │ └─────────────────────────────────┘   │        │
│ │                        [收起 ▲]       │        │
│ └───────────────────────────────────────┘        │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │
│ │ XHS   │ │ Anlst │ │Growth │ │Reviewr│        │
│ │●busy  │ │○idle  │ │●busy  │ │○wait  │        │
│ └───────┘ └───────┘ └───────┘ └───────┘        │
│                                                  │
│ ── Terminal ──────────────────── 12 events ──    │
│ 14:30:02 [CEO] 分析需求...                       │  普通: 默认样式
│ ┃14:30:05 [CEO] → XHS: 创作                     │  ← 调度: 紫色边框+背景
│ 14:30:08 [XHS] ⚙ Read brand-voice.md            │  工具: 黄色文字
│ ┃14:30:12 [Growth] ✓ 完成选题分析                │  ← 完成: 绿色边框+背景
│                                                  │
│ $ 输入指令...                            [发送]  │
└──────────────────────────────────────────────────┘
```

---

## 响应式说明

无需额外响应式改动。现有 Monitor 的 `grid-cols-2 xl:grid-cols-4` 已处理移动端适配。

新增组件的响应式行为：

| 组件 | Desktop (>= 1280px) | Tablet (768-1279px) | Mobile (< 768px) |
|------|---------------------|---------------------|-------------------|
| 任务总览栏 | 单行：描述 + 进度条 + Agent 标签 | 两行：描述占一行，进度+标签第二行 | Agent 标签换行显示 |
| 展开的卡片 | `col-span-4` 跨全行 | `col-span-2` 跨全行 | `col-span-2` 跨全行 |
| 收起按钮 | 右下角文字按钮 | 同左 | 同左 |

总览栏响应式：
```
容器: className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2.5"
  → flex-wrap 让内容在窄屏自动换行
Agent 标签区: className="flex items-center gap-1 flex-wrap"
  → 窄屏时标签自动换行
```

---

## 实现优先级

| 优先级 | 优化项 | 估计改动量 |
|--------|--------|-----------|
| P0 | Agent 卡片展开产出 | AgentStateCard 新增 ~60 行 |
| P0 | CEO 调度标签 | AgentStateCard 内 CEO 分支 ~20 行 |
| P1 | 任务总览栏 | AgentMonitor 新增 ~40 行 JSX |
| P1 | Terminal 日志分类高亮 | TerminalLogStream 修改 ~30 行 |
| P2 | 日志 Agent 名称可点击滚动 | ref 映射 + scrollIntoView ~20 行 |

总计约 170 行增量代码，无新文件、无新依赖、无结构重组。
