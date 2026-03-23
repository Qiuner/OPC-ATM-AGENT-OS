> **完成时间**: 2026-03-20
> **参与人员**: @Designer
> **文档版本**: v1.0
> **状态**: 待老板确认

---

# Agent 工作台 UI 设计方案

## 一、设计总则

### 1.1 设计理念

延续项目现有 **Cotify 暗色主题**，对标 Polsia Live Monitor + Linear.app 的信息密度：

- **暗色沉浸**：深黑底色 `#030305`，信息在暗色中自发光
- **状态即信息**：颜色、动画、辉光（glow）传达 Agent 实时状态
- **克制留白**：信息密度高但不拥挤，用间距和层级区分模块
- **流式体验**：用户从「输入需求 → 观察执行 → 获取结果」一气呵成

### 1.2 沿用现有设计系统

| Token | 值 | 说明 |
|-------|-----|------|
| 页面背景 | `#030305` | 与现有 `globals.css` 一致 |
| 卡片背景 | `#0a0a0f` | `.cotify-card` |
| 主色 (Accent) | `#a78bfa` (紫色) | 品牌主色，按钮、高亮、选中态 |
| 辅助色 (Cyan) | `#22d3ee` | 连线、数据流、成功反馈 |
| 成功色 | `#22c55e` | Agent 在线、任务完成 |
| 警告色 | `#fbbf24` | Agent 工作中、待审核 |
| 错误色 | `#ef4444` | 离线、失败 |
| 边框 | `rgba(255,255,255,0.08)` | 统一边框色 |
| 文字-主 | `#ffffff` | 标题、Agent 名称 |
| 文字-次 | `rgba(255,255,255,0.6)` | 正文描述 |
| 文字-弱 | `rgba(255,255,255,0.3)` | 时间戳、占位符 |
| 字体 | Geist Sans / Geist Mono | 正文 / 终端日志 |
| 圆角-小 | 6px → `rounded-md` | Badge、按钮 |
| 圆角-中 | 12px → `rounded-xl` | 卡片、输入框 |
| 圆角-大 | 16px → `rounded-2xl` | 大容器、模态框 |
| 间距基准 | 4px 网格 | 4/8/12/16/24/32 |

### 1.3 Agent 品牌色矩阵

每个 Agent 拥有独立品牌色，贯穿卡片边框、状态指示、日志标签：

| Agent | 色值 | 用途 |
|-------|------|------|
| CEO | `#e74c3c` (红) | 决策调度 |
| XHS | `#ff2442` (小红书红) | 小红书内容 |
| Analyst | `#22d3ee` (青) | 数据分析 |
| Podcast | `#f59e0b` (琥珀) | 播客生产 |
| X/Twitter | `#1DA1F2` (Twitter蓝) | 推文分发 |
| Visual Gen | `#ec4899` (粉) | 图片生成 |
| Strategist | `#8b5cf6` (紫) | 策略规划 |

---

## 二、信息架构与导航

### 2.1 侧边栏导航更新

在现有 Sidebar 中新增 **Workbench** 入口，替代原有 Team Studio 成为核心工作界面：

```
Sidebar（左侧 240px）
├── Dashboard
├── Workbench ★ ← 新增，核心入口，badge: "LIVE"
│    （点击后右侧内容区切换为全功能工作台）
├── Agent Manager ★ ← 新增
├── Context Vault
├── Campaigns
├── Task Board
├── Approval Center
├── Publishing Hub
├── CreatorFlow
└── Analytics
```

Tailwind 参考（沿用现有 sidebar.tsx 风格）：
```
// 导航项
className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium"
// 激活态
style={{ background: 'rgba(167,139,250,0.1)', boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.15)' }}
```

### 2.2 工作台内部 Tab 切换

工作台顶部设 Tab 栏，切换两种工作模式：

```
┌─────────────────────────────────────────────────────┐
│  [执行模式]   [共创模式]   [Agent Monitor]          │
└─────────────────────────────────────────────────────┘
```

- Tab 样式：底部 2px 高亮线，选中态文字 `#ffffff`，未选中 `rgba(255,255,255,0.4)`
- 切换时无页面跳转，组件级切换

Tailwind 参考：
```
// Tab 容器
className="flex items-center gap-1 px-4 h-11 shrink-0"
style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}

// Tab 项 - 未选中
className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors cursor-pointer"

// Tab 项 - 选中
className="px-4 py-2 text-[13px] font-medium text-white relative"
// 底部指示线用 ::after 或绝对定位 div
style={{ borderBottom: '2px solid #a78bfa' }}
```

---

## 三、执行模式主界面（核心页面）

### 3.1 整体布局

Desktop（1280px+）三栏布局：

```
┌──────────────────────────────────────────────────────────────────────┐
│  Sidebar(240px) │        主内容区 (flex-1)         │ 右面板 (320px) │
│                 │                                   │                │
│  (现有导航)      │  ┌─ 任务头部 ─────────────────┐  │  ┌─ Progress ─┐│
│                 │  │ 需求摘要 + 状态 + 时间       │  │  │ 环形进度    ││
│                 │  └─────────────────────────────┘  │  │ Agent 状态  ││
│                 │                                   │  └────────────┘│
│                 │  ┌─ 执行面板 ─────────────────┐  │                │
│                 │  │                             │  │  ┌─ Timeline ─┐│
│                 │  │   Agent 任务卡片网格         │  │  │ 任务步骤    ││
│                 │  │   (2-3列, 实时状态更新)      │  │  │ 时间线视图  ││
│                 │  │                             │  │  └────────────┘│
│                 │  └─────────────────────────────┘  │                │
│                 │                                   │  ┌─ Stats ────┐│
│                 │  ┌─ 终端日志流 ───────────────┐  │  │ Token消耗   ││
│                 │  │  实时 Agent 活动日志         │  │  │ 执行耗时    ││
│                 │  │  (可折叠)                    │  │  │ Agent通信   ││
│                 │  └─────────────────────────────┘  │  └────────────┘│
│                 │                                   │                │
│                 │  ┌─ 指令输入栏 ───────────────┐  │                │
│                 │  │ $ 输入需求...      [发送]   │  │                │
│                 │  └─────────────────────────────┘  │                │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 任务头部区域

用户输入需求后，CEO Agent 解析并展示任务摘要：

```
┌────────────────────────────────────────────────────────────────┐
│ ● LIVE    帮我做一期关于 AI Agent 的播客...          ⏱ 02:34  │
│                                                               │
│  CEO 已拆解为 4 个子任务 · 2 并行执行中 · 1 等待中 · 1 已完成   │
│                                                    [■ Stop]   │
└────────────────────────────────────────────────────────────────┘
```

设计细节：
- 连接状态指示灯：绿色脉冲圆点 `animate-pulse`
- LIVE 标签：`color: #a78bfa, background: rgba(167,139,250,0.08)`
- 任务摘要文字：`text-[15px] font-semibold text-white`
- 子任务统计：`text-[13px] text-[rgba(255,255,255,0.4)]`
- 计时器：等宽字体 `font-mono text-[rgba(255,255,255,0.6)]`
- Stop 按钮：`color: #ef4444, background: rgba(239,68,68,0.10)`

Tailwind 参考：
```
// 任务头部容器
className="shrink-0 px-5 py-3 flex flex-col gap-2"
style={{
  background: 'rgba(19,19,27,0.75)',
  backdropFilter: 'blur(20px) saturate(1.2)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}}
```

### 3.3 Agent 任务卡片网格（核心组件）

CEO 拆解任务后，每个子任务展示为独立卡片，按执行顺序排列：

```
┌─ Task 1 ────────────┐  ┌─ Task 2 ────────────┐  ┌─ Task 3 ────────────┐
│ ┌──┐                 │  │ ┌──┐                 │  │ ┌──┐                 │
│ │🎤│ Podcast Agent   │  │ │📕│ XHS Agent       │  │ │📊│ Analyst Agent   │
│ └──┘                 │  │ └──┘                 │  │ └──┘                 │
│ 生成播客脚本          │  │ 撰写小红书笔记       │  │ 数据分析选题热度     │
│                      │  │                      │  │                      │
│ ━━━━━━━━━━━━ 65%    │  │ ━━━━━━━━ 40%        │  │ ━━━━━━━━━━━━━━ ✓    │
│                      │  │                      │  │                      │
│ ⚙ 写方案... x12     │  │ ⏳ 等待 Analyst 结果 │  │ ✅ 已完成 · 23s     │
│                      │  │                      │  │                      │
│ 依赖: Analyst ✓      │  │ 依赖: Analyst ✓      │  │ 依赖: 无             │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

#### 卡片状态设计

| 状态 | 顶部边框色 | 辉光效果 | 进度条 | 动画 |
|------|-----------|---------|--------|------|
| 等待中 (waiting) | Agent 品牌色 20% | 无 | 灰色 `rgba(255,255,255,0.06)` | 无 |
| 执行中 (running) | Agent 品牌色 100% | `radial-gradient(ellipse at 50% 0%, ${color}12, transparent 70%)` | 动态流光 | 进度条 `monitor-progress` 动画 |
| 已完成 (done) | `#22c55e` | 微弱绿色辉光 | 满格绿色 | 完成时 scale(1.02) 弹跳 |
| 失败 (error) | `#ef4444` | 红色辉光 | 红色停止 | shake 动画 |
| 需人工确认 (intervention) | `#fbbf24` | 琥珀色辉光脉冲 | 暂停状态 | breathe 脉冲 |

Tailwind 参考：
```
// 任务卡片 - 基础
className="cotify-card p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-300"
style={{
  borderTop: `3px solid ${agentColor}`,
}}

// 执行中辉光层
className="absolute inset-0 pointer-events-none"
style={{
  background: `radial-gradient(ellipse at 50% 0%, ${agentColor}12, transparent 70%)`
}}

// Agent 头像区
className="flex items-center gap-3"
// 像素风头像容器
className="w-10 h-10 rounded-xl flex items-center justify-center"
style={{ background: `${agentColor}10`, border: `1px solid ${agentColor}25` }}

// Agent 名称
className="text-sm font-semibold text-white"
// 任务描述
className="text-[13px] text-[rgba(255,255,255,0.5)]"

// 进度条容器
className="h-1.5 rounded-full overflow-hidden"
style={{ background: `${agentColor}15` }}
// 进度条填充（执行中带动画）
className="h-full rounded-full transition-all duration-500"
style={{
  width: `${progress}%`,
  background: `linear-gradient(90deg, ${agentColor}60, ${agentColor}, ${agentColor}60)`,
  animation: isRunning ? 'monitor-progress 2s ease-in-out infinite' : 'none',
}}

// 当前工具显示
className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px]"
style={{
  background: `${agentColor}10`,
  border: `1px solid ${agentColor}20`,
  fontFamily: 'var(--font-geist-mono)',
  color: agentColor,
}}

// 依赖关系
className="text-[11px] text-[rgba(255,255,255,0.3)]"
```

#### 卡片网格布局

```
// 网格容器 - 响应式
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4"
```

### 3.4 Intervention 审核卡片（特殊状态）

当 Agent 需要人工确认时，卡片变为审核模式：

```
┌─ Task 2 ── 需要确认 ─────────────────────────────────┐
│ ┌──┐                                                  │
│ │📕│ XHS Agent · 小红书笔记已生成                      │
│ └──┘                                                  │
│                                                       │
│ ┌─ 预览区 ──────────────────────────────────────────┐ │
│ │ 标题：5个 AI Agent 工具让你效率翻倍！               │ │
│ │ 正文：作为一个深度使用 AI 工具的博主...             │ │
│ │ ...                                    [展开全文]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                       │
│  [✗ 驳回]  [✎ 修改建议]  [✓ 通过并继续]               │
└───────────────────────────────────────────────────────┘
```

设计细节：
- 卡片扩展为宽版（`col-span-2` 或 `col-span-full`）
- 顶部脉冲边框：`border-top: 3px solid #fbbf24` + `animate-pulse`
- 预览区：`background: rgba(255,255,255,0.02)`, `border: 1px solid rgba(255,255,255,0.06)`, `rounded-xl`, `p-4`
- 驳回按钮：`color: #ef4444, background: rgba(239,68,68,0.10)`
- 修改建议按钮：`color: #fbbf24, background: rgba(251,191,36,0.10)`
- 通过按钮：`color: #22c55e, background: rgba(34,197,94,0.10)`

Tailwind 参考：
```
// Intervention 卡片
className="cotify-card p-5 col-span-full relative overflow-hidden"
style={{
  borderTop: '3px solid #fbbf24',
  boxShadow: '0 0 20px rgba(251,191,36,0.08), inset 0 0 30px rgba(251,191,36,0.03)',
}}

// 辉光层
className="absolute inset-0 pointer-events-none animate-pulse"
style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.08), transparent 70%)' }}

// 预览区
className="rounded-xl p-4 text-[13px] leading-relaxed max-h-[200px] overflow-y-auto"
style={{
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.7)',
}}

// 操作按钮组
className="flex items-center gap-3 mt-4"

// 通过按钮
className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-125"
style={{
  color: '#22c55e',
  background: 'rgba(34,197,94,0.10)',
  border: '1px solid rgba(34,197,94,0.20)',
}}
```

### 3.5 结果汇总区域

所有任务完成后，执行面板切换为结果汇总视图：

```
┌─ 任务完成 ────────────────────────────────────────────────────────┐
│                                                                    │
│  ✅ 全部 4 个任务已完成 · 总耗时 3m 28s · Token: 12.3K            │
│                                                                    │
│  ┌─ 播客脚本 ──────┐  ┌─ 小红书笔记 ────┐  ┌─ 数据报告 ──────┐  │
│  │ 🎤 3200字       │  │ 📕 1500字       │  │ 📊 热度分析      │  │
│  │ [预览] [下载]   │  │ [预览] [导出]   │  │ [预览] [保存]   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                    │
│  [🔄 重新执行]  [📤 推送飞书]  [💾 全部保存到 Context Vault]      │
└────────────────────────────────────────────────────────────────────┘
```

Tailwind 参考：
```
// 汇总容器
className="cotify-card p-6 space-y-4"

// 完成状态行
className="flex items-center gap-3 text-[14px]"
// 勾号
style={{ color: '#22c55e' }}
// 统计信息
style={{ color: 'rgba(255,255,255,0.5)' }}

// 产出卡片网格
className="grid grid-cols-1 md:grid-cols-3 gap-3"

// 单个产出卡片
className="rounded-xl p-4 flex flex-col gap-2"
style={{
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
}}

// 操作按钮（底部）
className="flex items-center gap-3 pt-3"
style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
```

### 3.6 终端日志流（可折叠）

沿用现有 `TerminalLogStream` 组件风格，增加折叠功能：

```
┌─ Terminal · 128 events ─────────────── [▼ 折叠] ─┐
│ 14:23:05 [CEO]     拆解任务完成，分配 3 个子任务    │
│ 14:23:06 [Analyst] ⚙ 搜索资料 — AI Agent 热度       │
│ 14:23:08 [CEO → Analyst] 请优先分析近 7 天数据      │
│ 14:23:12 [Analyst] ✓ 数据报告生成完成               │
│ 14:23:13 [CEO → XHS] 开始撰写，参考 Analyst 报告   │
│ 14:23:15 ⚠ [XHS] 需要确认：笔记标题方向            │
└──────────────────────────────────────────────────────┘
```

- 折叠时只显示标题栏 + 最新 1 条日志
- 展开时显示最近 80 条，自动滚动到底部
- 沿用现有的颜色编码和字体

Tailwind 参考：
```
// 日志容器 - 展开
className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
style={{ maxHeight: isCollapsed ? '44px' : '300px' }}

// 日志头部
className="flex items-center justify-between px-4 py-2 shrink-0 cursor-pointer"
style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}

// 折叠按钮
className="text-[12px] px-2 py-0.5 rounded-md hover:bg-[rgba(255,255,255,0.04)]"
style={{ color: 'rgba(255,255,255,0.3)' }}
```

### 3.7 指令输入栏（底部固定）

沿用现有 `CommandInputBar` 组件风格：

```
┌───────────────────────────────────────────────────────────┐
│  $  输入需求，如「帮我做一期 AI 工具播客」...    [发送]   │
└───────────────────────────────────────────────────────────┘
```

Tailwind 参考（已在现有代码中实现）：
```
className="shrink-0 flex items-center gap-3 px-4 py-3"
style={{
  background: 'rgba(10,10,15,0.9)',
  backdropFilter: 'blur(12px)',
  borderTop: '1px solid rgba(255,255,255,0.08)',
}}
```

---

## 四、Agent Monitor（实时监控）

### 4.1 与执行模式的关系

Agent Monitor 是工作台的第三个 Tab，提供全局视角的 Agent 状态监控。执行模式关注「当前任务」，Monitor 关注「所有 Agent 的实时状态」。

### 4.2 整体布局

沿用现有 `agent-monitor.tsx` 的三段式布局，但做以下升级：

```
┌────────────────────────────────────────────────────────────────────┐
│  Top Bar: 连接状态 + 任务摘要 + 执行时间 + 控制按钮               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ Agent 状态卡片（顶部横排）────────────────────────────────┐   │
│  │  CEO    │  XHS    │  Analyst │ Podcast │ (更多Agent...)    │   │
│  │  🔴工作 │  🟡等待 │  🟢空闲  │ ⚫离线  │                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ Agent 通信拓扑图 ★ 新增 ────────────────────────────────┐   │
│  │                                                           │   │
│  │    CEO ──────→ XHS Agent                                  │   │
│  │     │                                                     │   │
│  │     └──────→ Analyst ──────→ Podcast                      │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ Terminal Log Stream ──────────────────────────────────────┐   │
│  │  (沿用现有终端日志组件)                                     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─ 指令输入栏 ──────────────────────────────────────────────┐   │
│  │  $ ...                                                     │   │
│  └────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────── Right Sidebar (280px) ─────┤
│  WORKSPACE                                                        │
│  ├─ Progress（环形进度 + Agent 统计）                             │
│  ├─ Stats ★ 新增                                                 │
│  │   Token 消耗: 12.3K (input) / 4.1K (output)                  │
│  │   执行时间: 3m 28s                                            │
│  │   API 调用: 23 次                                              │
│  │   成功率: 95%                                                 │
│  ├─ Context（已加载的上下文文件）                                 │
│  ├─ Skills（Agent 技能文件）                                     │
│  └─ Connection（连接信息）                                        │
└────────────────────────────────────────────────────────────────────┘
```

### 4.3 Agent 通信拓扑图（新增组件）

可视化展示 Agent 间的实时通信关系：

**设计规格：**
- 画布区域：`min-height: 200px`，深色背景 `rgba(255,255,255,0.02)`
- 每个 Agent 节点：圆形 40x40px，内部显示像素风头像或首字母
- 节点颜色：Agent 品牌色
- 连线：从发送方到接收方的弧线，`stroke: rgba(255,255,255,0.15)`
- 活跃通信连线：`stroke: #a78bfa`，带流光动画（dash-offset animation）
- 节点状态圈：busy = 脉冲辉光，online = 静态光晕，offline = 半透明

Tailwind 参考：
```
// 拓扑图容器
className="rounded-2xl p-4 relative overflow-hidden"
style={{
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  minHeight: '200px',
}}

// Agent 节点
className="absolute flex flex-col items-center gap-1"
// 节点圆形
className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold"
style={{
  background: `${agentColor}20`,
  border: `2px solid ${agentColor}`,
  color: agentColor,
  boxShadow: isBusy ? `0 0 12px ${agentColor}40` : 'none',
}}
// 节点标签
className="text-[10px] font-medium mt-1"
style={{ color: 'rgba(255,255,255,0.5)' }}
```

通信连线使用 SVG：
```
// SVG 画布
className="absolute inset-0"
// 连线 - 静默
stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4"
// 连线 - 活跃
stroke="#a78bfa" strokeWidth="1.5"
// 流光动画
style={{ animation: 'dash-flow 1.5s linear infinite' }}

@keyframes dash-flow {
  to { stroke-dashoffset: -20; }
}
```

### 4.4 Stats 面板（右侧新增）

在现有 RightSidebar 中新增 Stats 区块：

```
┌─ Stats ──────────────────────┐
│                              │
│  Token 消耗                  │
│  ┌──────────────────────┐   │
│  │ Input   12.3K tokens │   │
│  │ Output   4.1K tokens │   │
│  │ 预估成本   $0.06     │   │
│  └──────────────────────┘   │
│                              │
│  执行统计                    │
│  ┌──────────────────────┐   │
│  │ 总耗时    3m 28s     │   │
│  │ API 调用  23 次      │   │
│  │ 成功率    95.6%      │   │
│  └──────────────────────┘   │
└──────────────────────────────┘
```

Tailwind 参考：
```
// 统计行
className="flex justify-between text-[13px] py-1.5"
style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
// 标签
style={{ color: 'rgba(255,255,255,0.3)' }}
// 值
className="tabular-nums font-medium"
style={{ fontFamily: 'var(--font-geist-mono)', color: '#a78bfa' }}
```

---

## 五、共创模式（Co-creation Mode）

### 5.1 设计理念

共创模式是轻量级的 Agent 圆桌讨论，适用于头脑风暴、策略讨论等开放式对话场景。与执行模式的区别：

| 维度 | 执行模式 | 共创模式 |
|------|----------|----------|
| 目标 | 产出具体内容/执行任务 | 讨论 idea、制定策略 |
| Agent 角色 | 各司其职，CEO 调度 | 平等参与，自由发言 |
| 输出 | 结构化产出（笔记、脚本等） | 讨论纪要 + 行动项 |
| UI 密度 | 高（卡片、进度、日志） | 低（对话流为主） |

### 5.2 圆桌讨论界面

```
┌─────────────────────────────────────────────────────────────┐
│  共创模式 · AI 营销策略讨论                                   │
│  参与者: CEO, XHS, Analyst, Strategist     [一键转执行模式]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ 参与者头像 ─────────────────────────────────────────┐   │
│  │  (CEO)  (XHS)  (Analyst)  (Strategist)  [+ 邀请]    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ 讨论区 ────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │  ┌ CEO ──────────────────────────────────────────┐  │   │
│  │  │ 我们需要讨论下一周的内容策略，AI Agent 这个    │  │   │
│  │  │ 话题最近热度很高...                            │  │   │
│  │  └───────────────────────────────────── 14:23 ──┘  │   │
│  │                                                      │   │
│  │  ┌ Analyst ──────────────────────────────────────┐  │   │
│  │  │ 根据数据分析，"AI Agent" 关键词近 7 天搜索    │  │   │
│  │  │ 量增长 340%，建议作为核心选题...               │  │   │
│  │  └───────────────────────────────────── 14:23 ──┘  │   │
│  │                                                      │   │
│  │  ┌ XHS ─────────────────────────────────────────┐  │   │
│  │  │ 小红书上这类内容的互动率在 8-12%，我建议      │  │   │
│  │  │ 从"工具推荐"角度切入...                       │  │   │
│  │  └───────────────────────────────────── 14:24 ──┘  │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ 讨论纪要（AI 自动生成）────────────────────────────┐   │
│  │ 1. AI Agent 话题热度上升，作为下周核心选题           │   │
│  │ 2. 从"工具推荐"角度切入小红书内容                   │   │
│  │ 3. 需要 Analyst 提供详细热度报告                    │   │
│  │                                                      │   │
│  │ [📋 复制纪要]  [▶ 转为执行任务]                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ 输入区 ────────────────────────────────────────────┐   │
│  │  提出议题或引导讨论...                  [发起讨论]   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 共创模式组件设计

**参与者头像栏：**
```
// 头像容器
className="flex items-center gap-2 px-4 py-3"
style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}

// 单个头像（圆形，Agent 品牌色边框）
className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold cursor-pointer transition-all hover:scale-110"
style={{
  background: `${agentColor}15`,
  border: `2px solid ${agentColor}`,
  color: agentColor,
}}

// 邀请按钮
className="w-9 h-9 rounded-full flex items-center justify-center text-[16px] cursor-pointer"
style={{
  background: 'rgba(255,255,255,0.04)',
  border: '1px dashed rgba(255,255,255,0.15)',
  color: 'rgba(255,255,255,0.3)',
}}
```

**对话气泡：**
```
// 气泡容器
className="flex gap-3 px-4 py-2"

// Agent 头像（小）
className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1"
style={{ background: `${agentColor}15`, border: `1.5px solid ${agentColor}`, color: agentColor }}

// 气泡内容
className="flex-1 min-w-0"
// Agent 名称 + 时间
className="flex items-center gap-2 mb-1"
// 名称
className="text-[12px] font-semibold"
style={{ color: agentColor }}
// 时间
className="text-[11px]"
style={{ color: 'rgba(255,255,255,0.2)' }}
// 文字内容
className="text-[13px] leading-relaxed rounded-xl px-4 py-3"
style={{
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.8)',
}}
```

**讨论纪要区：**
```
// 纪要容器
className="rounded-xl p-4 mx-4 mb-4"
style={{
  background: 'rgba(167,139,250,0.04)',
  border: '1px solid rgba(167,139,250,0.12)',
}}

// 标题
className="text-[12px] font-semibold mb-2"
style={{ color: '#a78bfa' }}

// 纪要列表项
className="text-[13px] leading-relaxed py-1"
style={{ color: 'rgba(255,255,255,0.6)' }}

// 操作按钮
className="flex items-center gap-3 mt-3 pt-3"
style={{ borderTop: '1px solid rgba(167,139,250,0.08)' }}
```

**一键转执行模式按钮：**
```
className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:brightness-125"
style={{
  color: '#22d3ee',
  background: 'rgba(34,211,238,0.10)',
  border: '1px solid rgba(34,211,238,0.20)',
}}
```

---

## 六、Agent 管理页面

### 6.1 整体布局

独立页面（`/agent-manager`），展示所有 Agent 的配置与状态：

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent Manager                                [+ 注册新 Agent]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Agent 列表 ───────────────────────────────────────────────┐│
│  │                                                             ││
│  │  ┌─ CEO Agent ────────────────────────────────────────────┐││
│  │  │ ┌──┐ CEO 营销总监                  🟢 Online          │││
│  │  │ │🎯│ Orchestrator · 任务拆解/调度/终审                │││
│  │  │ └──┘                                                   │││
│  │  │ Skills: 任务拆解 · 多Agent编排 · 质量把控              │││
│  │  │ SKILL.md: engine/skills/ceo.SKILL.md                   │││
│  │  │                                                        │││
│  │  │ [查看 SKILL.md]  [编辑配置]  [查看日志]                │││
│  │  └────────────────────────────────────────────────────────┘││
│  │                                                             ││
│  │  ┌─ XHS Agent ────────────────────────────────────────────┐││
│  │  │ ┌──┐ 小红书创作专家                🟢 Online          │││
│  │  │ │📕│ Specialist · 种草笔记/标题/标签                  │││
│  │  │ └──┘                                                   │││
│  │  │ Skills: 爆款标题 · 种草文案 · CTA设计 · 标签策略       │││
│  │  │ SKILL.md: engine/skills/xhs.SKILL.md                   │││
│  │  │                                                        │││
│  │  │ [查看 SKILL.md]  [编辑配置]  [查看日志]                │││
│  │  └────────────────────────────────────────────────────────┘││
│  │                                                             ││
│  │  ... (更多 Agent)                                          ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Agent 列表卡片

```
// 列表容器
className="space-y-3 max-w-[900px]"

// Agent 卡片
className="cotify-card p-5 flex items-start gap-4 group"

// 左侧头像
className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
style={{ background: `${agentColor}10`, border: `1px solid ${agentColor}25` }}

// 中间信息
className="flex-1 min-w-0 space-y-2"

// Agent 名称行
className="flex items-center gap-3"
// 名称
className="text-[15px] font-semibold text-white"
// 级别标签
className="text-[11px] font-medium px-2 py-0.5 rounded-full"
style={{ color: agentColor, background: `${agentColor}12` }}
// 状态指示
className="ml-auto flex items-center gap-1.5 text-[12px] font-medium"
// 状态圆点
className="w-2 h-2 rounded-full"
style={{ background: statusColor }}

// 描述文字
className="text-[13px] text-[rgba(255,255,255,0.5)]"

// Skills 标签组
className="flex flex-wrap gap-1.5"
// 单个 Skill 标签
className="text-[11px] px-2 py-0.5 rounded-md"
style={{
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.4)',
  border: '1px solid rgba(255,255,255,0.06)',
}}

// SKILL.md 路径
className="text-[11px] font-mono"
style={{ color: 'rgba(255,255,255,0.2)' }}

// 操作按钮行
className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
// 单个操作按钮
className="text-[12px] font-medium px-2.5 py-1 rounded-lg transition-all hover:brightness-125"
style={{
  color: 'rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
}}
```

### 6.3 SKILL.md 查看/编辑（Sheet 侧滑面板）

点击「查看 SKILL.md」后从右侧滑出面板：

```
// 使用现有 shadcn/ui Sheet 组件
// Sheet 内容
className="p-6 space-y-4"

// 标题
className="text-lg font-semibold text-white"

// Markdown 渲染区
className="rounded-xl p-4 text-[13px] leading-relaxed overflow-y-auto"
style={{
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.7)',
  fontFamily: 'var(--font-geist-mono)',
  maxHeight: 'calc(100vh - 200px)',
}}

// 编辑模式切换
// 查看模式: Markdown 渲染
// 编辑模式: Textarea 编辑器
className="w-full min-h-[400px] rounded-xl p-4 text-[13px] resize-none outline-none"
style={{
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.8)',
  fontFamily: 'var(--font-geist-mono)',
}}

// 保存按钮
className="px-4 py-2 rounded-xl text-[13px] font-medium"
style={{
  color: '#22c55e',
  background: 'rgba(34,197,94,0.10)',
  border: '1px solid rgba(34,197,94,0.20)',
}}
```

### 6.4 注册新 Agent（Dialog 弹窗）

点击「+ 注册新 Agent」后弹出配置表单：

```
┌─ 注册新 Agent ──────────────────────────────────────┐
│                                                      │
│  Agent ID *      [________________]                  │
│  显示名称 *      [________________]                  │
│  英文名称 *      [________________]                  │
│  角色级别        [Specialist ▼]                      │
│  品牌色          [🟣] #8b5cf6                        │
│                                                      │
│  System Prompt * [                                ]  │
│                  [                                ]  │
│                  [________________________________]  │
│                                                      │
│  SKILL.md 路径   [engine/skills/xxx.SKILL.md    ]    │
│                                                      │
│  能力标签        [标签1] [标签2] [+ 添加]            │
│                                                      │
│  [取消]                         [创建 Agent]          │
└──────────────────────────────────────────────────────┘
```

使用 shadcn/ui Dialog 组件，表单内部样式沿用 Cotify 暗色主题：

```
// 表单输入框
className="w-full rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-[rgba(255,255,255,0.2)] outline-none"
style={{
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}}

// 标签
className="text-[13px] font-medium text-[rgba(255,255,255,0.6)] mb-1.5"

// 创建按钮
className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
style={{
  color: '#a78bfa',
  background: 'rgba(167,139,250,0.15)',
  border: '1px solid rgba(167,139,250,0.25)',
}}
```

---

## 七、响应式适配

### 7.1 断点定义

| 断点 | 宽度 | 布局调整 |
|------|------|----------|
| Desktop XL | >=1440px | 三栏完整显示，任务卡片 3 列 |
| Desktop | >=1280px | 三栏显示，任务卡片 2-3 列 |
| Tablet | >=768px | 右侧面板收起为抽屉，任务卡片 2 列 |
| Mobile | <768px | 不作为主要适配目标（工作台为 desktop-first） |

### 7.2 关键响应式规则

```
// 任务卡片网格
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"

// 右侧面板 - 大屏显示，小屏隐藏
className="hidden lg:flex w-[320px] shrink-0"

// Agent Monitor 卡片
className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"

// 共创模式讨论区 - 居中限宽
className="max-w-[800px] mx-auto"
```

### 7.3 Tablet 适配（768px-1280px）

- 隐藏右侧面板，通过顶部按钮触发 Sheet 抽屉
- 任务卡片 2 列显示
- 终端日志默认折叠
- Agent Monitor 卡片 2 列

---

## 八、交互设计与动效

### 8.1 过渡动画时间规范

| 交互 | 时长 | 缓动函数 | Tailwind |
|------|------|----------|----------|
| 按钮 hover | 200ms | ease | `transition-all duration-200` |
| 卡片状态切换 | 300ms | ease-out | `transition-all duration-300` |
| 面板展开/折叠 | 300ms | ease-in-out | `transition-all duration-300` |
| Tab 切换 | 200ms | ease | `transition-colors duration-200` |
| 辉光出现 | 500ms | ease-out | 自定义 CSS |

### 8.2 Agent 状态动画

| 状态 | 动画效果 | CSS |
|------|----------|-----|
| busy | 进度条流光 + 状态点脉冲 + 辉光层 | `monitor-progress` + `animate-pulse` |
| online → busy | 卡片微微放大 + 辉光渐入 | `scale-105` + fade-in |
| busy → done | 绿色闪烁确认 + scale弹跳 | `scale-102` + `#22c55e` flash |
| error | 卡片抖动 + 红色辉光 | `shake` animation |
| intervention | 琥珀色脉冲辉光 | `breathe` animation |

### 8.3 Agent 通信动画

当 Agent A 向 Agent B 发送消息时：
1. A→B 的连线高亮为 `#a78bfa`
2. 连线上出现流光粒子（dash-offset 动画）
3. B 的节点微弱闪烁
4. 2 秒后连线回退为默认色

---

## 九、组件清单与文件结构

### 9.1 新增组件

```
web/src/
├── app/
│   ├── workbench/              ★ 新页面
│   │   └── page.tsx            工作台主页面（包含 3 个 Tab）
│   └── agent-manager/          ★ 新页面
│       └── page.tsx            Agent 管理页面
│
├── components/
│   ├── features/
│   │   ├── workbench/          ★ 新模块
│   │   │   ├── execution-mode.tsx      执行模式主组件
│   │   │   ├── task-card.tsx           Agent 任务卡片
│   │   │   ├── intervention-card.tsx   人工审核卡片
│   │   │   ├── result-summary.tsx      结果汇总
│   │   │   ├── co-creation-mode.tsx    共创模式主组件
│   │   │   ├── discussion-bubble.tsx   对话气泡
│   │   │   ├── discussion-summary.tsx  讨论纪要
│   │   │   ├── workbench-tabs.tsx      Tab 切换栏
│   │   │   └── index.ts               导出入口
│   │   │
│   │   ├── agent-monitor/      ★ 扩展
│   │   │   ├── agent-topology.tsx      Agent 通信拓扑图 ★ 新增
│   │   │   ├── stats-panel.tsx         统计面板 ★ 新增
│   │   │   ├── agent-monitor.tsx       (现有，优化)
│   │   │   └── ...
│   │   │
│   │   └── agent-manager/      ★ 新模块
│   │       ├── agent-list.tsx          Agent 列表
│   │       ├── agent-card.tsx          Agent 信息卡片
│   │       ├── skill-editor.tsx        SKILL.md 查看/编辑
│   │       ├── register-dialog.tsx     注册新 Agent 弹窗
│   │       └── index.ts
│   │
│   └── ui/                     (现有 shadcn/ui 组件)
│       └── ...
│
└── types/
    └── workbench.ts            ★ 新增类型定义
```

### 9.2 新增类型定义

```typescript
// types/workbench.ts

export type WorkbenchTab = 'execution' | 'co-creation' | 'monitor';

export type TaskStatus = 'waiting' | 'running' | 'done' | 'error' | 'intervention';

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;          // 0-100
  currentTool?: string;
  toolCallCount?: number;
  dependencies: string[];    // 依赖的其他 task id
  result?: TaskResult;
  startedAt?: number;
  completedAt?: number;
}

export interface TaskResult {
  type: 'text' | 'markdown' | 'json';
  content: string;
  wordCount?: number;
  attachments?: string[];
}

export interface AgentNode {
  id: string;
  name: string;
  color: string;
  status: 'idle' | 'working' | 'waiting' | 'offline';
  position: { x: number; y: number };
}

export interface AgentLink {
  from: string;
  to: string;
  active: boolean;
  label?: string;
  timestamp?: number;
}

export interface DiscussionMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface DiscussionSummary {
  items: string[];
  generatedAt: Date;
}

export interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  apiCalls: number;
  successRate: number;
}
```

---

## 十、设计走查清单

开发完成后，@Designer 将按以下清单逐项检查：

| # | 检查项 | 验收标准 |
|---|--------|----------|
| 1 | 暗色主题一致性 | 所有新组件使用 Cotify 暗色变量，无亮色泄漏 |
| 2 | Agent 品牌色 | 每个 Agent 卡片使用正确的品牌色 |
| 3 | 字体层级 | 标题/正文/辅助文字层级清晰，使用 Geist 字体 |
| 4 | 间距一致 | 所有间距基于 4px 网格 |
| 5 | 圆角规范 | 按钮 6px / 卡片 12px / 大容器 16px |
| 6 | 状态动画 | busy/online/offline/error/intervention 5 种状态动画正确 |
| 7 | 辉光效果 | 活跃 Agent 卡片有品牌色辉光，不过亮 |
| 8 | 响应式 | Desktop XL / Desktop / Tablet 三个断点布局正确 |
| 9 | 交互反馈 | hover/active/disabled 状态完整 |
| 10 | 终端日志风格 | 等宽字体，颜色编码与现有 Terminal 一致 |
| 11 | Intervention 卡片 | 审核模式展开为宽版，操作按钮可见 |
| 12 | 共创模式 | 对话气泡带 Agent 品牌色标识，纪要区风格统一 |
| 13 | Agent 管理 | 列表卡片 hover 态显示操作按钮 |
| 14 | Tab 切换 | 底部指示线动画流畅，无闪烁 |
| 15 | 无障碍 | 对比度达标，按钮有 focus 样式 |
