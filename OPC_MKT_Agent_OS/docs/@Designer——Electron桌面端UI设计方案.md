# Electron 桌面端 UI 设计方案

**文档类型**: UI/UX 设计方案
**完成时间**: 2026-03-26 (v3 — 两栏布局 + Header Agent 状态栏)
**参与人员**: @Designer (UI 设计师)
**设计基准**: v1 两栏布局确认 + Header Agent Avatar 堆叠状态栏

---

## 版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1 | 2026-03-26 | 初版两栏 Linear 风格布局 |
| v2 | 2026-03-26 | ClawX 三栏布局（已否决） |
| v3 | 2026-03-26 | **回归两栏布局 + Header Agent Avatar 堆叠状态栏**（当前版本） |

---

## 一、设计策略

### 1.1 核心决策

**v3 方向确认：**
- 回归 v1 两栏布局（Sidebar + Content），结构简洁，符合营销 OS 定位
- 三栏布局（v2）对营销工具过于复杂，否决
- **新增 Header Agent Avatar 堆叠状态栏**：在顶部导航栏展示所有 Agent 运行状态
- 保持 Cotify Dark Theme 全套视觉不变

**从 ClawX 保留的交互（精选）：**
- 四步 Onboarding 引导流程
- 系统托盘常驻 + 关闭窗口不退出
- Command Palette (Cmd+K)

**保持我们自己的视觉：**
- Cotify Dark Theme 全套色系
- `cotify-glow` 紫色径向光晕
- `cotify-glass` 毛玻璃效果
- `cotify-card` 悬浮卡片
- 紫色 `#a78bfa` 主色 + 青色 `#22d3ee` 辅助色
- 现有字体层级和间距系统

### 1.2 整体布局

```
┌──────────────────────────────────────────────────────┐
│  Title Bar (32px) — 自定义标题栏                       │
├─────────┬────────────────────────────────────────────┤
│         │  Header (56px) — 页面标题 + Agent 状态栏     │
│         ├────────────────────────────────────────────┤
│ Sidebar │                                            │
│  64px   │              Main Content                  │
│ (收起)   │                                            │
│  240px  │              页面主体区域                     │
│ (展开)   │                                            │
│         │                                            │
│         ├────────────────────────────────────────────┤
│         │  Status Bar (28px) — 引擎状态 / LLM / RAM   │
├─────────┴────────────────────────────────────────────┤
```

**关键尺寸：**
- Sidebar 收起: 64px（仅图标）
- Sidebar 展开: 240px（图标 + 文字）
- Header: 56px（h-14）
- Title Bar: 32px（自定义，含 macOS 红绿灯 / Windows 控制按钮）
- Status Bar: 28px
- Content 区域: 剩余空间自适应

---

## 二、色彩体系（完全沿用现有 globals.css）

### 2.1 主色板

| 色值 | CSS 变量 / 硬编码 | 用途 |
|------|-------------------|------|
| `#030305` | `--background` | 主背景 |
| `#050508` | — | Sidebar 背景 |
| `#0a0a0f` | — | 卡片 / 面板背景 |
| `#a78bfa` | — | 主色紫（Active / Focus / 品牌色） |
| `#22d3ee` | — | 辅助青（LIVE 标签 / 辅助强调） |
| `rgba(255,255,255,0.06)` | — | 分隔线 / 边框 |
| `rgba(255,255,255,0.4)` | — | 次要文字 |
| `rgba(255,255,255,0.7)` | — | 悬停文字 |
| `#ffffff` | — | 主文字 |

### 2.2 Agent 专属色（用于 Avatar 背景）

| Agent | 色值 | Avatar 文字 |
|-------|------|-------------|
| CEO | `#e74c3c` | CEO |
| XHS Agent | `#ff2442` | XHS |
| Analyst | `#22d3ee` | AN |
| Growth | `#00cec9` | G |
| Brand Reviewer | `#a855f7` | BR |
| Podcast | `#f59e0b` | POD |
| X/Twitter | `#1da1f2` | X |
| Visual | `#ec4899` | VIS |
| Strategist | `#8b5cf6` | STR |

### 2.3 Agent 状态色

| 状态 | 色值 | 含义 | 视觉效果 |
|------|------|------|----------|
| Busy | `#ef4444` (red-500) | 正在执行任务 | 脉冲动画 `animate-pulse` |
| Pending | `#f59e0b` (amber-500) | 等待审批/输入 | 静态圆点 |
| Idle | `#22c55e` (green-500) | 空闲可用 | 静态圆点 |
| Offline | `#6b7280` (gray-500) | 未启动/不可用 | 静态圆点，头像半透明 |

---

## 三、Header 完整布局（v3 核心新增）

### 3.1 Header 左右分区

Header 高度 56px（`h-14`），内部分为左右两个区域：

```
Header 布局（左右分区）:
┌──────────────────────────────────────────────────────────────────────────┐
│  【1/3】当前任务：SEO内容优化        ◉◉◉◉◉◉ +2   🔔   ⚙              │
│  ← 左侧: 任务进度指示器 →           ← 右侧: Avatars + 通知 + 设置 →    │
└──────────────────────────────────────────────────────────────────────────┘
```

**左侧 — 当前任务进度指示器（左对齐）：**

显示当前整体任务的进度和正在执行的子任务名称。

- 格式: `【完成数/总数】当前任务：任务名称`
- 示例: `【1/3】当前任务：SEO内容优化`
- 无任务时: 显示 `无进行中的任务`（弱化样式）或隐藏

组件结构:
```
┌─────────────────────────────────────────┐
│  【1/3】 当前任务：SEO内容优化           │
│   ↑ 进度  ↑ 标签     ↑ 任务名称         │
└─────────────────────────────────────────┘
```

**进度标签 `【1/3】`：**
- 背景: `rgba(167,139,250,0.1)`（紫色淡底）
- 文字: `#a78bfa`，12px，`font-semibold`
- 圆角: 6px（`rounded-md`）
- 内边距: `px-2 py-0.5`
- Tailwind: `inline-flex items-center px-2 py-0.5 rounded-md bg-[#a78bfa]/10 text-[#a78bfa] text-xs font-semibold`

**"当前任务：" 标签：**
- 文字: `rgba(255,255,255,0.35)`，13px
- Tailwind: `text-[13px] text-white/35 ml-2.5`

**任务名称：**
- 文字: `#ffffff`，13px，`font-medium`
- 最大宽度: `max-w-[240px]`，超出截断 `truncate`
- Tailwind: `text-[13px] text-white font-medium max-w-[240px] truncate`

**无任务状态：**
- 文字: `rgba(255,255,255,0.2)`，13px
- 内容: "无进行中的任务"
- Tailwind: `text-[13px] text-white/20`

**右侧 — Agent 头像 + 通知 + 设置（右对齐）：**

从左到右依次排列：Agent Avatar 堆叠 → 通知铃铛 → 设置齿轮

```
右侧区域:
┌───────────────────────────────────────────────┐
│  ◉◉◉◉◉◉ +2    │    🔔 (badge)   │    ⚙      │
│  Agent Avatars  │    通知铃铛      │   设置     │
│                 │    gap-2        │   gap-2    │
└───────────────────────────────────────────────┘
```

**通知铃铛：**
- 图标: lucide `Bell`，18px（`h-[18px] w-[18px]`）
- 颜色: `rgba(255,255,255,0.4)`
- Hover: `rgba(255,255,255,0.7)`
- 容器: 32px x 32px，`rounded-lg`，`hover:bg-white/[0.04]`
- 未读 Badge: 右上角红色圆点，8px，`bg-red-500`，`absolute -top-0.5 -right-0.5`
- 点击: 展开通知下拉面板（或导航到 Approval Center）
- Tailwind 容器: `relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors`
- Tailwind 图标: `h-[18px] w-[18px] text-white/40 hover:text-white/70 transition-colors`
- Tailwind Badge: `absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500`

**设置齿轮：**
- 图标: lucide `Settings`，18px
- 颜色/交互: 与铃铛一致
- 点击: 打开设置面板（复用现有 SettingsPanel Sheet）
- Tailwind: 同铃铛容器

**右侧整体容器：**
- Tailwind: `flex items-center gap-3`
- Avatar 堆叠与铃铛之间: `gap-3`（12px 间距）
- 铃铛与齿轮之间: `gap-2`（8px 间距）
- 用分隔线隔开 Avatar 区和工具按钮: `border-l border-white/[0.06] pl-3 ml-1`

```
完整 Header Tailwind 结构参考:
<header className="h-14 px-6 flex items-center shrink-0"
  style={{ background: 'rgba(3,3,5,0.6)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

  {/* 左侧 — 任务进度 */}
  <div className="flex items-center flex-1 min-w-0">
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#a78bfa]/10 text-[#a78bfa] text-xs font-semibold">
      【1/3】
    </span>
    <span className="text-[13px] text-white/35 ml-2.5">当前任务：</span>
    <span className="text-[13px] text-white font-medium max-w-[240px] truncate">SEO内容优化</span>
  </div>

  {/* 右侧 — Avatars + 通知 + 设置 */}
  <div className="flex items-center gap-3 shrink-0">
    <AgentAvatarStack />
    <div className="border-l border-white/[0.06] pl-3 flex items-center gap-2">
      <NotificationBell />
      <SettingsButton />
    </div>
  </div>

</header>
```

### 3.2 Agent Avatar 堆叠（右侧核心组件）

Agent Avatar 堆叠展示所有活跃 Agent 的实时状态。这是 v3 的核心交互创新点，替代 v2 的三栏频道列表。

### 3.3 Avatar 组件规范

**单个 Avatar：**
- 尺寸: 36px x 36px（`h-9 w-9`）
- 圆角: 全圆 `rounded-full`
- 背景: Agent 专属色（见 2.2 表格）
- 文字: Agent 缩写，白色，11px，`font-bold`
- 边框: 2px solid `#030305`（主背景色，产生分离感）
- Tailwind: `h-9 w-9 rounded-full border-2 border-[#030305] text-[11px] font-bold text-white flex items-center justify-center`

**堆叠排列：**
- 排列方向: 从左到右
- 重叠偏移: `-8px`（每个头像向左偏移 8px，`-ml-2`）
- 第一个头像无偏移
- 最大可见数量: 6 个
- 超出部分显示 `+N` 计数器
- 排序规则: Busy > Pending > Idle > Offline
- Offline 的 Agent 默认折叠进 `+N` 计数器

```
视觉示意:
┌────┐
│CEO │──┐
└────┘  │ ┌────┐
        ├─│ AN │──┐
        │ └────┘  │ ┌────┐
        │         ├─│ G  │──┐
        │         │ └────┘  │ ┌────┐
        │         │         ├─│ BR │──┐
        │         │         │ └────┘  │ ┌────┐      ┌────┐
        │         │         │         ├─│ X  │──────│ +3 │
        │         │         │         │ └────┘      └────┘
```

实际渲染效果（扁平视角）:
```
  [CEO][AN][G][BR][X][VIS] +3
   ↑ 每个圆之间重叠 8px
```

**+N 计数器：**
- 尺寸: 36px height, auto width, min 36px（`h-9 min-w-9 px-2`）
- 背景: `rgba(255,255,255,0.08)`
- 文字: `rgba(255,255,255,0.5)`, 12px, `font-medium`
- 圆角: `rounded-full`
- Tailwind: `h-9 min-w-9 px-2 rounded-full bg-white/[0.08] text-white/50 text-xs font-medium flex items-center justify-center -ml-2`

### 3.4 状态指示器（Status Dot）

每个 Avatar 右下角有一个小圆点指示当前状态。

**圆点规范：**
- 尺寸: 10px x 10px（`h-2.5 w-2.5`）
- 位置: 右下角，绝对定位 `absolute -bottom-0.5 -right-0.5`
- 边框: 2px solid `#030305`（与背景融合）
- 圆角: `rounded-full`

**各状态样式：**

| 状态 | 背景色 | 额外效果 | Tailwind |
|------|--------|----------|----------|
| Busy | `#ef4444` | `animate-pulse` + `box-shadow: 0 0 6px rgba(239,68,68,0.6)` | `bg-red-500 animate-pulse` |
| Pending | `#f59e0b` | 无动画 | `bg-amber-500` |
| Idle | `#22c55e` | 无动画 | `bg-green-500` |
| Offline | `#6b7280` | Avatar 整体 `opacity-50` | `bg-gray-500` |

**Busy 状态脉冲动画（CSS）：**
```css
@keyframes agent-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
}
```

### 3.5 Hover Card（悬浮详情卡片）

鼠标悬停在任一 Avatar 上时，显示详情卡片。

**卡片规范：**
- 宽度: 280px
- 位置: Avatar 正下方，居中对齐，8px 间距
- 背景: `#0a0a0f`（cotify-card 色）
- 边框: `1px solid rgba(255,255,255,0.08)`
- 圆角: 12px（`rounded-xl`）
- 阴影: `0 8px 32px rgba(0,0,0,0.5)`
- 动画: `opacity 0→1, translateY -4px→0, 150ms ease-out`
- z-index: 50（`z-50`）

**卡片内容结构：**

```
┌─────────────────────────────────┐
│  [Avatar 48px]  Agent Name      │
│                 当前状态文字      │
├─────────────────────────────────┤
│  当前任务:                       │
│  "正在生成 TikTok 视频脚本..."   │
│  ████████░░░░░ 65%              │
├─────────────────────────────────┤
│  🔗 查看详情 →                   │
└─────────────────────────────────┘
```

**各状态卡片内容差异：**

**Busy 状态：**
```
┌─────────────────────────────────┐
│  [CEO 48px]  CEO                │
│              ● 执行中            │
├─────────────────────────────────┤
│  当前任务:                       │
│  "正在执行营销策略分析..."        │
│  ████████░░░░░ 65%              │
│  已运行 2m 30s                   │
├─────────────────────────────────┤
│  查看 Agent 详情 →               │
└─────────────────────────────────┘
```

**Pending 状态：**
```
┌─────────────────────────────────┐
│  [BR 48px]   Brand Reviewer     │
│              ● 等待审批          │
├─────────────────────────────────┤
│  等待:                           │
│  "品牌评审结果待确认"             │
│  等待时间 5m 12s                 │
├─────────────────────────────────┤
│  前往审批 →                      │
└─────────────────────────────────┘
```

**Idle 状态：**
```
┌─────────────────────────────────┐
│  [AN 48px]   Analyst            │
│              ● 空闲              │
├─────────────────────────────────┤
│  上次任务:                       │
│  "完成 Meta Ads 数据分析"        │
│  完成于 10 分钟前                │
├─────────────────────────────────┤
│  查看 Agent 详情 →               │
└─────────────────────────────────┘
```

**Offline 状态：**
```
┌─────────────────────────────────┐
│  [VIS 48px]  Visual (半透明)     │
│              ● 未启动            │
├─────────────────────────────────┤
│  此 Agent 当前未启动             │
├─────────────────────────────────┤
│  启动 Agent →                    │
└─────────────────────────────────┘
```

**Hover Card Tailwind 参考：**
```
容器: w-[280px] rounded-xl border border-white/[0.08] bg-[#0a0a0f] p-4
      shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50
      animate-in fade-in slide-in-from-top-1 duration-150

头部 Avatar: h-12 w-12 rounded-full text-sm font-bold
Agent 名称: text-sm font-semibold text-white
状态文字: text-xs (颜色匹配状态色)

任务区域: mt-3 pt-3 border-t border-white/[0.06]
任务标题: text-xs text-white/40 mb-1
任务描述: text-sm text-white/80 line-clamp-2
进度条背景: h-1.5 rounded-full bg-white/[0.06] mt-2
进度条填充: h-1.5 rounded-full (使用 Agent 专属色)
时间文字: text-xs text-white/30 mt-1.5

底部链接: mt-3 pt-3 border-t border-white/[0.06]
链接文字: text-xs text-[#a78bfa] hover:text-[#c4b5fd] cursor-pointer
```

### 3.6 点击行为

- 点击任意 Avatar → 导航到 `/team-studio` 并聚焦到对应 Agent
- 点击 `+N` 计数器 → 展开完整 Agent 列表下拉（所有 Offline Agent）
- 点击 Hover Card 底部链接 → 导航到对应页面（详情/审批等）
- 使用 `next/navigation` 的 `useRouter().push()` 实现导航

### 3.7 响应式处理

| 窗口宽度 | Avatar 行为 |
|----------|-------------|
| >= 1280px | 显示最多 6 个 Avatar + 计数器 |
| 960-1279px | 显示最多 4 个 Avatar + 计数器 |
| < 960px | 显示最多 2 个 Avatar + 计数器 |

---

## 四、Title Bar（自定义标题栏）

### 4.1 规范

- 高度: 32px
- 背景: `#030305`（与主背景一体化）
- 可拖拽区域: `-webkit-app-region: drag`
- 按钮区域: `-webkit-app-region: no-drag`

### 4.2 macOS 布局

```
┌──────────────────────────────────────────────────────┐
│ ● ● ●                    OPC MKT Agent OS            │
│ 红绿灯(左)               居中标题                     │
└──────────────────────────────────────────────────────┘
```

- 红绿灯位置: 左侧 `pl-4`，垂直居中
- 标题: 居中，`text-xs font-medium text-white/30`
- 无右侧按钮

### 4.3 Windows 布局

```
┌──────────────────────────────────────────────────────┐
│ OPC MKT Agent OS                      ─  □  ✕       │
│ 左对齐标题                             最小/最大/关闭  │
└──────────────────────────────────────────────────────┘
```

- 标题: 左侧 `pl-4`，`text-xs font-medium text-white/30`
- 窗口控制: 右侧，46px x 32px 每个按钮
- 关闭按钮 hover: `bg-red-500`
- 其他按钮 hover: `bg-white/[0.06]`

---

## 五、Sidebar（沿用现有 + 收起模式）

### 5.1 展开模式（240px，当前已有）

沿用 `sidebar.tsx` 现有实现，不做修改。包含：
- Logo 区域（OPC MKT 品牌标识）
- 7 个导航项（Dashboard / Team Studio / Context Vault / Approval Center / Publishing Hub / CreatorFlow / Analytics）
- 设置面板入口
- 用户信息

### 5.2 收起模式（64px，新增）

仅显示图标，无文字。

```
┌──────┐
│  O   │  ← Logo（仅图标）
├──────┤
│  ⊞   │  ← Dashboard
│  ⚡   │  ← Team Studio
│  ⊟   │  ← Context Vault
│  ✓   │  ← Approval Center
│  ➤   │  ← Publishing Hub
│  ✎   │  ← CreatorFlow
│  ⊞   │  ← Analytics
│      │
│      │
├──────┤
│  ⚙   │  ← Settings
│  J   │  ← User Avatar
└──────┘
```

**收起模式规范：**
- 宽度: 64px（`w-16`）
- 图标: 居中，20px（`h-5 w-5`）
- 图标容器: 40px x 40px，居中，`rounded-xl`
- Active 状态: 紫色背景 `bg-[#a78bfa]/10`，图标 `text-[#a78bfa]`
- Hover: Tooltip 显示页面名称（出现在图标右侧）

**切换按钮：**
- 位置: Sidebar 底部设置上方，或 Sidebar 右边缘中间
- 图标: `ChevronLeft`（展开时） / `ChevronRight`（收起时）
- 尺寸: 24px x 24px，`rounded-full`
- 背景: `rgba(255,255,255,0.06)`
- Hover: `rgba(255,255,255,0.1)`

**过渡动画：**
- 宽度变化: `transition-all duration-200 ease-out`
- 文字: 收起时 `opacity-0`，展开时 `opacity-100`，`transition-opacity duration-150`

---

## 六、Status Bar（底部状态栏）

### 6.1 规范

- 高度: 28px
- 背景: `#030305`
- 上边框: `1px solid rgba(255,255,255,0.06)`
- 文字: `text-[11px] text-white/30`
- padding: `px-4`

### 6.2 布局

```
┌──────────────────────────────────────────────────────┐
│ ● Engine Ready   │  Claude 3.5 Sonnet  │  RAM 245MB │
│ 左侧: 引擎状态    │  中间: 当前 LLM      │  右侧: 资源 │
└──────────────────────────────────────────────────────┘
```

**左侧 — 引擎状态：**
- 绿色圆点 `h-1.5 w-1.5 rounded-full bg-green-500` + "Engine Ready"
- 错误时: 红色圆点 + "Engine Error"
- 加载时: 黄色圆点 + `animate-pulse` + "Initializing..."

**中间 — 当前 LLM：**
- 显示选中的 AI Provider 和模型名
- 点击可快速切换模型

**右侧 — 系统资源：**
- RAM 占用（Electron `process.memoryUsage()`）
- 可选: CPU / 任务队列数

---

## 七、Onboarding 引导流程

### 7.1 四步流程

**Step 1 — Welcome**
```
┌─────────────────────────────────┐
│                                 │
│      [O] OPC MKT Agent OS      │
│                                 │
│      你的 AI 出海营销团队         │
│                                 │
│      自动管理 Meta / X / TikTok  │
│      每天帮你发内容、投广告、      │
│      分析数据                    │
│                                 │
│         [ 开始使用 → ]           │
│                                 │
└─────────────────────────────────┘
```

**Step 2 — API Key 配置**
```
┌─────────────────────────────────┐
│  Step 2/4  配置 AI 引擎          │
│                                 │
│  选择你的 AI Provider:           │
│                                 │
│  ┌──────────┐ ┌──────────┐     │
│  │ Claude   │ │ OpenAI   │     │
│  └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐     │
│  │ Gemini   │ │ DeepSeek │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  API Key: [________________]    │
│                                 │
│     [ ← 上一步 ]  [ 下一步 → ]   │
└─────────────────────────────────┘
```

**Step 3 — Brand Setup**
```
┌─────────────────────────────────┐
│  Step 3/4  品牌信息设置          │
│                                 │
│  品牌名称: [________________]    │
│  行业:     [▾ 选择行业 ______]   │
│  目标市场: [▾ 选择市场 ______]   │
│  品牌调性: [________________]    │
│                                 │
│     [ ← 上一步 ]  [ 下一步 → ]   │
└─────────────────────────────────┘
```

**Step 4 — Complete**
```
┌─────────────────────────────────┐
│                                 │
│         ✓ 设置完成!              │
│                                 │
│   你的 AI 营销团队已就绪          │
│   9 个 Agent 已初始化            │
│                                 │
│      [ 进入工作台 → ]            │
│                                 │
└─────────────────────────────────┘
```

### 7.2 Onboarding 视觉规范

- 容器: 居中，max-width 480px，`rounded-2xl`
- 背景: `cotify-card` 效果（`#0a0a0f` + border）
- 步骤指示器: 4 个圆点，当前步骤 `bg-[#a78bfa]`，已完成 `bg-[#a78bfa]/50`，未完成 `bg-white/10`
- 主按钮: `bg-[#a78bfa] hover:bg-[#9371f0] text-white rounded-xl px-6 py-2.5 text-sm font-medium`
- 次要按钮: `text-white/40 hover:text-white/70 text-sm`
- 输入框: `bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#a78bfa]/50 focus:ring-1 focus:ring-[#a78bfa]/20`
- 过渡: 步骤切换 `slide-in-from-right / slide-out-to-left, 200ms ease-out`

---

## 八、Command Palette (Cmd+K)

### 8.1 规范

- 触发: `Cmd+K`（macOS）/ `Ctrl+K`（Windows）
- 容器: 居中，max-width 560px，`rounded-2xl`
- 背景: `#0a0a0f`，`border border-white/[0.08]`
- 阴影: `0 16px 64px rgba(0,0,0,0.6)`
- 遮罩: `bg-black/40 backdrop-blur-sm`

### 8.2 布局

```
┌───────────────────────────────────────┐
│  🔍 输入命令或搜索...                  │
├───────────────────────────────────────┤
│  最近使用                              │
│  > Dashboard                    ⌘ 1   │
│  > Team Studio                  ⌘ 2   │
├───────────────────────────────────────┤
│  Agent 操作                            │
│  > 启动 CEO Agent                      │
│  > 查看 Analyst 报告                   │
├───────────────────────────────────────┤
│  快捷操作                              │
│  > 新建营销任务                 ⌘ N    │
│  > 打开设置                     ⌘ ,    │
└───────────────────────────────────────┘
```

**搜索框:** `h-12 px-4 text-sm text-white bg-transparent border-b border-white/[0.06] focus:outline-none`
**结果项:** `px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.04] rounded-lg cursor-pointer`
**选中项:** `bg-[#a78bfa]/10 text-white`
**分组标题:** `px-4 py-2 text-[11px] text-white/30 font-medium uppercase tracking-wider`
**快捷键提示:** `text-[11px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded`

---

## 九、系统托盘

### 9.1 四种图标状态

| 状态 | 图标描述 | 触发条件 |
|------|----------|----------|
| Idle | OPC logo 原色（紫+青渐变） | 无任务执行时 |
| Working | 带旋转动画的 logo | 有 Agent 执行任务时 |
| Attention | 带红色圆点的 logo | 需要用户审批时 |
| Error | 带黄色警告的 logo | 引擎错误时 |

### 9.2 托盘菜单

```
┌────────────────────────┐
│ OPC MKT Agent OS       │
│ v0.1.0                 │
├────────────────────────┤
│ ● 引擎运行中            │
│ 3 个 Agent 活跃         │
├────────────────────────┤
│ 显示窗口          ⌘ O  │
│ 暂停所有任务             │
├────────────────────────┤
│ 退出               ⌘ Q │
└────────────────────────┘
```

---

## 十、窗口尺寸与行为

### 10.1 尺寸定义

| 属性 | 值 |
|------|-----|
| 默认尺寸 | 1280 x 800 |
| 最小尺寸 | 960 x 640 |
| 最大尺寸 | 不限（跟随屏幕） |
| 启动位置 | 屏幕居中 |

### 10.2 窗口行为

- 关闭按钮: 最小化到托盘（不退出应用）
- 最小化: 标准系统行为
- 全屏: 支持 macOS native fullscreen
- 窗口尺寸记忆: 下次启动恢复上次的尺寸和位置
- 多窗口: 暂不支持，单实例模式

---

## 十一、键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+K` | 打开 Command Palette |
| `Cmd+,` | 打开设置 |
| `Cmd+1~7` | 切换 Sidebar 导航页面 |
| `Cmd+B` | 收起/展开 Sidebar |
| `Cmd+N` | 新建营销任务 |
| `Cmd+Q` | 退出应用 |
| `Cmd+W` | 关闭窗口（最小化到托盘） |
| `Escape` | 关闭弹窗 / Command Palette |

---

## 十二、无障碍设计

### 12.1 键盘导航

- 所有交互元素可通过 Tab 键聚焦
- Focus 样式: `ring-2 ring-[#a78bfa]/50 ring-offset-2 ring-offset-[#030305]`
- Agent Avatar: 支持 Tab 聚焦，Enter 导航，方向键在 Avatar 间切换
- Hover Card: 键盘聚焦时自动显示，Escape 关闭

### 12.2 对比度

- 主文字 `#ffffff` on `#030305` → 对比度 20.4:1 (AAA)
- 次要文字 `rgba(255,255,255,0.4)` on `#030305` → 对比度 ~5.5:1 (AA)
- 状态色圆点尺寸足够大（10px），不依赖颜色单独传达信息（配合文字标签）

### 12.3 ARIA 标签

```html
<!-- Agent Avatar 堆叠 -->
<div role="toolbar" aria-label="Agent 状态面板">
  <button role="status" aria-label="CEO — 执行中: 正在分析营销策略">
    ...
  </button>
</div>

<!-- Hover Card -->
<div role="tooltip" aria-live="polite">
  ...
</div>
```

---

## 十三、与现有代码的集成方案

### 13.1 需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| `header.tsx` | 重构为左右分区：左侧 TaskProgressIndicator + 右侧 AgentAvatarStack / NotificationBell / Settings |
| `sidebar.tsx` | 添加收起/展开逻辑 |
| `layout.tsx` | 添加 Sidebar 宽度状态管理 |

### 13.2 需要新建的组件

| 组件 | 路径（建议） | 功能 |
|------|-------------|------|
| `TaskProgressIndicator` | `components/features/task-progress-indicator.tsx` | Header 左侧任务进度指示器 |
| `AgentAvatarStack` | `components/features/agent-avatar-stack.tsx` | Header 右侧 Agent 头像堆叠 |
| `AgentAvatar` | 同上（子组件） | 单个 Agent 头像 + 状态点 |
| `AgentHoverCard` | 同上（子组件） | 悬浮详情卡片 |
| `NotificationBell` | `components/features/notification-bell.tsx` | Header 右侧通知铃铛 + 未读 Badge |
| `TitleBar` | `components/layout/title-bar.tsx` | 自定义标题栏（Electron 阶段） |
| `StatusBar` | `components/layout/status-bar.tsx` | 底部状态栏 |
| `CommandPalette` | `components/features/command-palette.tsx` | Cmd+K 命令面板 |
| `OnboardingFlow` | `components/features/onboarding/` | 四步引导流程 |

### 13.3 Agent 数据类型定义

```typescript
interface AgentStatus {
  id: string;
  name: string;
  avatar: string;        // 缩写文字
  color: string;         // Agent 专属色
  status: 'busy' | 'pending' | 'idle' | 'offline';
  currentTask?: string;  // 当前任务描述
  progress?: number;     // 0-100 进度百分比
  duration?: number;     // 已运行秒数
  lastTask?: string;     // 上次任务（idle 时显示）
  lastTaskTime?: Date;   // 上次任务完成时间
}
```

---

## 十四、设计走查检查项（v3 新增部分）

| # | 检查项 | 标准 |
|---|--------|------|
| 1 | Agent Avatar 尺寸 | 36px，`rounded-full` |
| 2 | Avatar 重叠间距 | `-ml-2` (8px) |
| 3 | Avatar 边框 | 2px solid `#030305` |
| 4 | 状态圆点尺寸 | 10px，右下角 |
| 5 | Busy 脉冲动画 | 红色 + `animate-pulse` |
| 6 | Pending 圆点 | 黄色，静态 |
| 7 | Idle 圆点 | 绿色，静态 |
| 8 | Offline 透明度 | Avatar 整体 `opacity-50` |
| 9 | +N 计数器 | 白色半透明背景，折叠 Offline |
| 10 | Hover Card 宽度 | 280px |
| 11 | Hover Card 圆角 | 12px |
| 12 | Hover Card 动画 | fade-in + slide-down 150ms |
| 13 | 点击 Avatar | 导航到 /team-studio |
| 14 | 排序规则 | Busy > Pending > Idle > Offline |
| 15 | 响应式 Avatar 数量 | 6/4/2 按窗口宽度 |
| 16 | Header 左右分区 | 左侧任务进度 + 右侧 Avatars/通知/设置 |
| 17 | 进度标签 `【n/m】` | 紫色淡底 `bg-[#a78bfa]/10`，12px `font-semibold` |
| 18 | 任务名称截断 | `max-w-[240px] truncate` |
| 19 | 无任务状态 | 文字 `text-white/20`，显示"无进行中的任务" |
| 20 | 通知铃铛尺寸 | 容器 32px，图标 18px，`rounded-lg` |
| 21 | 未读 Badge | 红色 8px 圆点，右上角绝对定位 |
| 22 | 设置齿轮 | 与铃铛样式一致，点击打开 SettingsPanel |
| 23 | 右侧分隔线 | Avatar 与工具按钮间 `border-l border-white/[0.06]` |

---

**[@Designer] 设计方案 v3.1 完成。在 v3 基础上补充了 Header 左右分区布局：左侧任务进度指示器 + 右侧 Agent Avatar 堆叠 / 通知铃铛 / 设置齿轮。所有 Tailwind CSS 类名和 JSX 结构参考已就绪，可交付 @DEV 开发。**
