# 设计方案：Agent Monitor — 像素风办公室 UI（v2 终稿）

**完成时间：** 2026-03-11
**参与人员：** @Designer
**原型文件 v1：** `docs/agent-monitor-prototype.html`
**原型文件 v2（推荐）：** `docs/agent-monitor-prototype-v2.html`（含指令栏、提醒弹窗、精化角色）

## v2 新增内容

| 新增模块 | 说明 |
|----------|------|
| **精化像素小人** | 5 个角色 SVG 大幅升级：PM 持剪贴板+西装、RES 白大褂+眼镜+放大镜+笔记本、DES 紫发+调色盘+笔刷、DEV 连帽衫+耳机+小笔记本错误屏、QA 橙色安全背心+安全帽+清单 |
| **中间指令横栏** | 三区域：左=日期时间、中=指令输入框+发送、右=Token消耗+状态摘要 |
| **提醒弹窗** | 像素风 Alert Dialog，含 agent 头像/角色标识、错误上下文、确认/取消按钮，DEV 卡片点击触发示例 |
| **精化办公室** | 桌面屏幕显示代码/图表内容+屏幕光晕、书架+白板+植物+地毯+咖啡机细化 |
| **实时时钟** | 指令栏左侧显示当前时间，右下角运行计时器自动累加 |
| **Agent Profile Sheet** | 点击右侧卡片弹出右滑 Sheet，含像素头像/描述编辑/系统Prompt编辑/Skills开关/保存 |
| **字体大小控件** | 顶栏右侧 A-/A+ 按钮，6档可调（10-15px），当前值实时显示 |
| **移除 Bug Zone** | error 状态改为在工作区桌旁原地抖动+红色脉冲，不再有独立区域 |
| **新增公寓区域** | 办公室右侧独立像素房子（屋顶+墙+窗+门），offline 角色在此灰色显示 |

### 最终区域布局（v2 final）

```
┌──────────────────────────────────┬──────────┐
│  WORK AREA (left:18 right:110)   │  公寓     │
│  5 张桌子，working/error 在此     │  (right:  │
├──────────────────────────────────┤   18,     │
│  REST AREA (left:18 right:110)   │   86px宽, │
│  沙发+咖啡机，idle 在此            │   全高)   │
└──────────────────────────────────┴──────────┘
```

- **error** → 停留在工作区桌旁，抖动 + 红色脉冲光圈（不另设区域）
- **offline** → 公寓区，灰色半透明，SIM 时从公寓滑动到工作区

## v2 追加：Agent Profile Sheet 详细规范

### 触发方式
点击右侧 Agent Status 卡片 → 从右侧滑入 Sheet（`translateX` 动画，`cubic-bezier(.34,1.3,.64,1)`）

### Sheet 结构（宽 420px，右侧全高）

```
┌─────────────────────────────────────────────┐
│  ▸ AGENT PROFILE                        [✕] │  ← sheet-header
├─────────────────────────────────────────────┤
│  ┌──────┐                                   │  ← sheet-hero
│  │像素  │  PM（72×72，像素 SVG，agent 专属色边框）│
│  │头像  │  产品负责人 & 项目经理               │
│  └──────┘  🟢 Working                       │
├─────────────────────────────────────────────┤
│  📝 人物描述                     [编辑/完成]  │  ← 可切换查看/编辑
│  负责需求理解、任务拆解分配...                 │
│  （编辑态：textarea，高亮蓝色边框）            │
├─────────────────────────────────────────────┤
│  ⚙️ 系统 Prompt                  [编辑/完成]  │  ← JetBrains Mono
│  ┌─────────────────────────────────────────┐│
│  │ 你是 @PM（产品负责人 & 项目经理）...      ││  ← readonly → 点编辑变可输入
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  🔧 可用 Skills  (2×2 网格)                  │
│  ┌──────────────┐ ┌──────────────┐          │
│  │ perplexity   │ │ firecrawl    │  ← 每格含名称+描述+右侧 Toggle
│  │ 🟢 on        │ │ 🟢 on        │
│  └──────────────┘ └──────────────┘          │
├─────────────────────────────────────────────┤
│          [取消]          [保存修改]           │  ← sheet-footer
└─────────────────────────────────────────────┘
```

### 编辑模式
- **人物描述**：点击「编辑」→ `<div>` 变为 `<textarea>`（蓝色 focus ring），点「完成」保存并切回文本展示
- **系统 Prompt**：`<textarea readonly>` → 点击「编辑」移除 readonly，可直接打字编辑
- 两者均支持「保存修改」全量保存

### Skills Toggle
- 2×2 网格，每个 skill 卡片：名称（9px bold）+ 描述（8px muted）+ 右侧 CSS Toggle
- Toggle on：绿色 `#22c55e`；off：灰色 `#3d4560`
- 点击 toggle 即时切换状态（无需保存按钮）

### Tailwind 类参考（给 @DEV）
```tsx
// Sheet 容器（固定右侧）
<div className="fixed top-0 right-0 bottom-0 w-[420px] bg-zinc-950
                border-l border-zinc-800 flex flex-col
                shadow-[-16px_0_40px_rgba(0,0,0,0.5)]
                animate-in slide-in-from-right duration-300">

// 头像
<div className="w-[72px] h-[72px] rounded-xl bg-zinc-950
                border-2 flex items-center justify-center
                image-rendering-pixelated overflow-hidden">

// 系统 Prompt textarea
<textarea className="w-full h-28 bg-zinc-950 border border-zinc-800
                     rounded-md p-3 text-[9px] font-mono text-zinc-400
                     resize-none outline-none focus:border-blue-500
                     focus:ring-2 focus:ring-blue-500/20 read-only:cursor-default">

// Skill card
<div className="rounded-md border border-zinc-800 bg-zinc-950
                p-2.5 flex items-center justify-between
                hover:border-zinc-700 transition-colors">
```

---

## 一、需求概述

在 Team Studio 页面新增 **Agent Monitor** Tab，采用像素风办公室（Pixel Office）视觉设计。5 个 agent 角色（PM、Researcher、Designer、DEV、QA）以像素小人形式在办公室场景中展示，根据实时状态在不同区域出现并播放对应动画。

---

## 二、整体结构

### Tab 层级

```
Team Studio Page
├── Tab [团队对话]     ← 现有 chat 界面保持不变
└── Tab [Agent Monitor] ← 新增（本方案）
```

shadcn `<Tabs>` 插入 Team Studio 页面顶部，Tab 切换时内容区域完整替换（不共用布局）。

### 页面三栏结构

```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR: 标题 + 状态摘要胶囊 + Simulate / Refresh 按钮         │
├────────────────────────────────────┬─────────────────────────┤
│                                    │                         │
│  像素办公室画布  (flex:1)            │  右侧面板 (w-80)         │
│  ┌──────────────────────────────┐  │  ┌─────────────────┐   │
│  │  WORK AREA (上区)             │  │  │ Agent 状态卡片  │   │
│  │  5 张桌子 + 工作中小人          │  │  │ (5 张卡片)      │   │
│  ├────────────────┬─────────────┤  │  └─────────────────┘   │
│  │ REST AREA(左下)│ BUG ZONE(右)│  │  ┌─────────────────┐   │
│  │  沙发+咖啡机    │  虫子图标    │  │  │ 系统日志流       │   │
│  └────────────────┴─────────────┘  │  │ (滚动列表)       │   │
│                                    │  └─────────────────┘   │
│  底部终端日志条 (h-180px, 横向滚动)   │                         │
└────────────────────────────────────┴─────────────────────────┘
```

---

## 三、办公室区域设计

### 3.1 区域划分（CSS absolute 定位）

| 区域 | CSS 定位 | 背景色 | 边框色 | 进入条件 |
|------|---------|--------|--------|----------|
| WORK AREA | `top:24px left:24px right:24px h:210px` | `#1a2240` | `#2a3a6e` | status = `working` |
| REST AREA | `bottom:24px left:24px w:48% h:160px` | `#1a2a1a` | `#2a4a2a` | status = `idle` |
| BUG ZONE | `bottom:24px right:24px w:48% h:160px` | `#2a1a1a` | `#6a2a2a` | status = `error` |
| ENTRANCE | 画布中央 `72×80px` | `#16161e` | `var(--border2)` | status = `offline` |

### 3.2 家具（像素风格）

| 家具 | 位置 | 实现方式 |
|------|------|----------|
| 5 张桌子 | WORK AREA 内，两行排列 (3+2) | CSS `div` + `::after` 伪元素做显示器 |
| 沙发 | REST AREA 中央 | CSS `div` + `::before` 做坐垫 |
| 咖啡机 | REST AREA 右侧 | CSS `div` + emoji `☕` |
| 虫子图标 | BUG ZONE 中央 | emoji `🐛` + 脉冲动画 |
| 大门 | ENTRANCE 中央 | CSS `div` + 门把手圆点 |

---

## 四、像素角色设计

### 4.1 技术方案：内联 SVG 矩形块

每个角色为 `16×20` 视口的 SVG，用 `<rect>` 绘制像素块，CSS `image-rendering: pixelated` 保证放大后不模糊，渲染尺寸 `32×40px`。

### 4.2 角色配色与特征

| Agent | 颜色 | 专属特征 | 头顶表情 |
|-------|------|----------|----------|
| PM | `#f43f5e` 玫瑰红 | 西装领带 + 剪贴板 | 👔 |
| Researcher | `#3b82f6` 蓝色 | 白大褂 + 眼镜 + 笔记本 | 🔬 |
| Designer | `#22c55e` 绿色 | 紫发 + 调色板 | 🎨 |
| DEV | `#eab308` 黄色 | 连帽衫 + 耳机 + 键盘 | 💻 |
| QA | `#a855f7` 紫色 | 橙色安全背心 + 安全帽 + 清单 | 🛡 |

> **注意**：Designer 角色在此版本使用**绿色**（与 team lead 指令一致），与我原方案中的紫色不同，以 team lead 最新指令为准。

---

## 五、状态系统

### 5.1 状态颜色

| 状态 | 颜色 | Tailwind | 效果 |
|------|------|----------|------|
| `working` | `#22c55e` | `text-green-400` | 状态点闪烁，角色跳动 |
| `idle` | `#f59e0b` | `text-amber-400` | 状态点常亮，角色呼吸 |
| `error` | `#ef4444` | `text-red-400` | 状态点高频闪，角色抖动 + 红晕 |
| `offline` | `#4a5568` | `text-zinc-500` | 全灰 + 35% 透明度 |

### 5.2 状态动画 CSS

```css
/* working: 打字跳动 */
@keyframes pixel-typing {
  from { transform: translateY(0); }
  to   { transform: translateY(-3px); }
}

/* idle: 呼吸 */
@keyframes pixel-breathe {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.06); }
}

/* error: 抖动 + 红色光晕 */
@keyframes pixel-shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-3px); }
  40%     { transform: translateX(3px); }
  60%     { transform: translateX(-2px); }
  80%     { transform: translateX(2px); }
}
@keyframes error-ring {
  0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
}

/* offline */
.agent-offline { opacity: 0.35; filter: grayscale(1); }
```

### 5.3 状态转移 → 位置变化

角色位置通过 CSS `transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)` 实现平滑移动（弹性缓动）。状态变化时 JS 更新 `left/top/bottom` 值，角色自动滑行到新位置。

---

## 六、组件规范

### 6.1 Top Bar

```tsx
<div className="flex items-center gap-3 px-5 py-3 bg-[#13161f] border-b border-zinc-800/60 flex-wrap">
  <span className="font-['Press_Start_2P'] text-[10px] text-blue-400
                   tracking-wider drop-shadow-[0_0_8px_#3b82f680] mr-2">
    ⬛ AGENT MONITOR
  </span>

  {/* 状态胶囊 */}
  <StatusPill status="working" count={2} />
  <StatusPill status="idle"    count={1} />
  <StatusPill status="error"   count={1} />
  <StatusPill status="offline" count={1} />

  <div className="ml-auto flex gap-2">
    <Button size="sm" variant="outline">↺ REFRESH</Button>
  </div>
</div>
```

### 6.2 Agent 卡片（右侧列表）

```tsx
<div className={cn(
  "flex items-center gap-3 p-3 rounded-lg border-l-[3px] bg-zinc-950",
  "cursor-pointer hover:bg-zinc-900 transition-colors",
  statusToCardClass[agent.status],  // border-l-color
)}>
  <div className="w-7 h-7 rounded flex items-center justify-center text-sm"
       style={{ background: agent.color + '20', color: agent.color }}>
    {agent.emoji}
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-['Press_Start_2P'] text-[7px] mb-1">{agent.name}</p>
    <p className="text-[9px] text-zinc-400 truncate">{agent.task}</p>
  </div>
  <StatusBadge status={agent.status} />
</div>
```

左边框颜色映射：
- working → `border-l-green-500`
- idle → `border-l-amber-500`
- error → `border-l-red-500`
- offline → `border-l-zinc-600`

### 6.3 终端日志面板（底部横向展开）

- 高度：`180px`，横向滚动 `overflow-x: auto`
- 每个 agent 一个独立日志面板，可折叠
- 日志字体：`JetBrains Mono`，9px
- 日志级别颜色：info=`#60a5fa` / success=`#4ade80` / warn=`#fbbf24` / error=`#f87171` / muted=`#475569`
- 光标：`<span class="log-cursor">` CSS animation step-end blink

---

## 七、配色方案

### 主背景色系（暗色，与现有项目 globals.css 对齐）

| 用途 | 色值 | Tailwind 参考 |
|------|------|---------------|
| 最深背景 | `#0a0c14` | `bg-[#0a0c14]` |
| 次级背景 | `#0f1117` | `bg-[#0f1117]` |
| 面板背景 | `#13161f` | `bg-zinc-950` |
| 边框 | `#1e2435` | `border-zinc-800/60` |
| 次级边框 | `#2a2f3e` | `border-zinc-700/40` |
| 普通文字 | `#e2e8f0` | `text-slate-200` |
| 弱化文字 | `#4a5568` | `text-zinc-500` |

### 特殊装饰色

| 元素 | 色值 |
|------|------|
| 标题蓝光 | `#60a5fa` + `text-shadow: 0 0 8px #3b82f680` |
| 办公区地板格线 | `linear-gradient(#1e2435 1px, transparent 1px)` 32px |
| 工作区背景 | `#1a2240` |
| 休息区背景 | `#1a2a1a` |
| Bug 区背景 | `#2a1a1a` |

---

## 八、字体层级

| 层级 | 字体 | 大小 | 用途 |
|------|------|------|------|
| 标题/区域标签 | `Press Start 2P` | 8–10px | 像素风标题、区域标签 |
| 角色名 | `Press Start 2P` | 6–7px | 小人头顶 + 卡片名称 |
| 状态气泡 | `JetBrains Mono` | 8px | 任务描述气泡 |
| 日志文字 | `JetBrains Mono` | 9px | 终端日志流 |
| 状态徽章 | `Press Start 2P` | 7px | WORK / IDLE / ERR / OFF |

---

## 九、交互行为

| 交互 | 触发 | 效果 |
|------|------|------|
| 点击角色小人 | click | 蓝色高亮描边 1.5s，弹出 AgentProfileSheet |
| hover 小人 | hover | 头顶显示气泡（隐藏 → 显示） |
| 点击右侧卡片 | click | 对应小人高亮，底部日志滚动到该 agent |
| 折叠/展开日志 | click header | 底部日志 panel 收起/展开 |
| Refresh 按钮 | click | 所有小人跳弹动画 + 重新 fetch 状态 |
| 状态变更 | API 轮询 | 小人平滑移动到新区域（0.8s 弹性缓动） |

---

## 十、响应式适配

| 断点 | 布局 |
|------|------|
| `≥1280px` (desktop) | 左侧办公室 + 右侧面板并排 |
| `768–1279px` (tablet) | 办公室缩为 `320px` 高，面板移到下方 |
| `<768px` (mobile) | 隐藏办公室，只显示卡片列表 + 日志 |

响应式关键 class：
```
主容器:   flex flex-col lg:flex-row
办公室:   hidden lg:block lg:flex-1
右面板:   w-full lg:w-80 shrink-0
```

---

## 十一、文件结构（给 @DEV）

```
src/components/features/agent-monitor/
├── index.tsx              ← 对外导出入口
├── agent-monitor.tsx      ← 主容器 + Tab 集成
├── pixel-office.tsx       ← 像素办公室 Canvas（区域 + 家具）
├── pixel-agent.tsx        ← 单个像素小人组件
├── pixel-characters.tsx   ← 5 个角色 SVG 常量
├── agent-log-panel.tsx    ← 底部终端日志面板
├── agent-status-card.tsx  ← 右侧 Agent 状态卡片
├── status-overview.tsx    ← 顶部状态胶囊汇总
└── types.ts               ← AgentStatus / AgentInfo 类型定义
```

关键类型：
```ts
type AgentStatus = 'offline' | 'idle' | 'working' | 'error';

interface AgentInfo {
  id: 'pm' | 'researcher' | 'designer' | 'dev' | 'qa';
  name: string;
  status: AgentStatus;
  task?: string;
  logs: LogLine[];
  color: string;
  emoji: string;
}

interface LogLine {
  time: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'muted';
  message: string;
}
```

---

## 十二、验收标准

- [ ] Team Studio 顶部有两个 Tab：「团队对话」「Agent Monitor」
- [ ] Agent Monitor 展示暗色像素办公室（`#0f1117` + 32px 网格地板）
- [ ] 3 个区域（WORK / REST / BUG）有明确背景色和区域标签
- [ ] 5 个像素小人各有专属颜色，外形可区分
- [ ] `working` → 小人在桌旁 + 打字弹跳动画 + 绿色状态点
- [ ] `idle` → 小人在 REST AREA + 呼吸动画 + 琥珀色状态点
- [ ] `error` → 小人在 BUG ZONE + 抖动 + 红色脉冲光圈 + 红色日志
- [ ] `offline` → 小人在门口 + 灰色半透明 + 无动画
- [ ] 状态变更时小人平滑滑动到新区域（弹性缓动 0.8s）
- [ ] 右侧卡片列表显示状态 + 左边框颜色 + 当前任务
- [ ] 底部终端日志面板可折叠，显示各 agent 日志流
- [ ] 响应式：mobile 下隐藏办公室，只显示卡片
- [ ] `Press Start 2P` 字体正确加载，所有标签呈像素风格
- [ ] 与现有暗色主题无缝衔接，构建无 TS 错误

---

## 附：原型预览

**文件：** `docs/agent-monitor-prototype.html`
直接用浏览器打开即可预览完整交互效果，包含：
- 像素办公室三区域场景
- 5 个角色的像素小人（SVG 像素块实现）
- 工作/待机/出错/离线四种状态动画
- 底部横向终端日志面板
- 右侧 Agent 卡片列表
- Simulate 按钮可演示状态切换

*设计文档终稿，等待用户确认后交 @DEV 实现。*
