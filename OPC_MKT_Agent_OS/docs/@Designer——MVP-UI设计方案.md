> 完成时间: 2026-03-10 | 参与人员: @Designer

# OPC_MKT_Agent_OS — MVP UI 设计方案

## 一、全局设计规范

### 1.1 设计理念

参考 linear.app 和 vercel.com/dashboard 的设计语言：
- **克制留白**：信息密度适中，不拥挤不空旷
- **层级清晰**：通过字重、字号、色彩建立视觉层级
- **功能优先**：每个像素为效率服务，无装饰性元素
- **状态反馈**：每次操作都有即时视觉反馈

### 1.2 配色方案

#### 亮色模式（Light）

| 用途 | 色值 | Tailwind 变量 | 说明 |
|------|------|---------------|------|
| 背景-主 | `#FFFFFF` | `bg-white` | 页面主背景 |
| 背景-次 | `#F9FAFB` | `bg-gray-50` | 卡片、侧边栏背景 |
| 背景-三级 | `#F3F4F6` | `bg-gray-100` | hover 状态、输入框背景 |
| 边框 | `#E5E7EB` | `border-gray-200` | 卡片、分割线 |
| 文字-主 | `#111827` | `text-gray-900` | 标题、重要文字 |
| 文字-次 | `#6B7280` | `text-gray-500` | 描述、辅助文字 |
| 文字-弱 | `#9CA3AF` | `text-gray-400` | 占位符、时间戳 |
| Accent 主色 | `#2563EB` | `text-blue-600` | 主按钮、链接、选中态 |
| Accent Hover | `#1D4ED8` | `hover:bg-blue-700` | 主按钮 hover |
| 成功 | `#059669` | `text-emerald-600` | 成功状态、正增长 |
| 警告 | `#D97706` | `text-amber-600` | 待审核、注意 |
| 危险 | `#DC2626` | `text-red-600` | 错误、风险提示 |

#### 暗色模式（Dark）

| 用途 | 色值 | Tailwind 变量 |
|------|------|---------------|
| 背景-主 | `#09090B` | `dark:bg-zinc-950` |
| 背景-次 | `#18181B` | `dark:bg-zinc-900` |
| 背景-三级 | `#27272A` | `dark:bg-zinc-800` |
| 边框 | `#3F3F46` | `dark:border-zinc-700` |
| 文字-主 | `#FAFAFA` | `dark:text-zinc-50` |
| 文字-次 | `#A1A1AA` | `dark:text-zinc-400` |
| 文字-弱 | `#71717A` | `dark:text-zinc-500` |
| Accent 主色 | `#3B82F6` | `dark:text-blue-500` |

### 1.3 字体层级

| 层级 | 字号 | 字重 | 行高 | Tailwind 类 | 用途 |
|------|------|------|------|-------------|------|
| H1 | 30px | 700 | 36px | `text-3xl font-bold` | 页面主标题 |
| H2 | 24px | 600 | 32px | `text-2xl font-semibold` | 区块标题 |
| H3 | 20px | 600 | 28px | `text-xl font-semibold` | 卡片标题 |
| H4 | 16px | 600 | 24px | `text-base font-semibold` | 小节标题 |
| Body | 14px | 400 | 20px | `text-sm` | 正文内容 |
| Caption | 12px | 400 | 16px | `text-xs` | 辅助说明、时间 |
| Label | 12px | 500 | 16px | `text-xs font-medium` | 标签、badge |

**字体栈**：`font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif`

### 1.4 间距系统

基于 4px 网格：

| Token | 值 | Tailwind | 用途 |
|-------|-----|----------|------|
| xs | 4px | `p-1` / `gap-1` | 图标与文字间距 |
| sm | 8px | `p-2` / `gap-2` | 紧凑元素间距 |
| md | 12px | `p-3` / `gap-3` | 列表项内间距 |
| lg | 16px | `p-4` / `gap-4` | 卡片内间距 |
| xl | 24px | `p-6` / `gap-6` | 区块间距 |
| 2xl | 32px | `p-8` / `gap-8` | 大区块间距 |
| 3xl | 48px | `p-12` / `gap-12` | 页面级间距 |

### 1.5 圆角规范

| 元素 | 圆角 | Tailwind |
|------|------|----------|
| 按钮、输入框、Badge | 6px | `rounded-md` |
| 卡片、下拉菜单 | 12px | `rounded-xl` |
| 大容器、模态框 | 16px | `rounded-2xl` |
| 头像 | 50% | `rounded-full` |

### 1.6 阴影规范

| 层级 | 值 | Tailwind | 用途 |
|------|-----|----------|------|
| 无 | — | — | 默认状态，用边框区分 |
| sm | `0 1px 2px rgba(0,0,0,0.05)` | `shadow-sm` | hover 悬浮 |
| md | `0 4px 6px -1px rgba(0,0,0,0.1)` | `shadow-md` | 下拉菜单、浮层 |

暗色模式下阴影基本不可见，改用边框 + 微弱亮度差区分层级。

---

## 二、全局布局结构

### 2.1 整体框架

```
┌─────────────────────────────────────────────────┐
│ [侧边栏 240px]  │  [主内容区 flex-1]            │
│                  │                               │
│  Logo            │  ┌─ 页面头部 ──────────────┐  │
│  ─────           │  │ 标题 + 操作按钮         │  │
│  Dashboard       │  └────────────────────────┘  │
│  Context Vault   │                               │
│  Campaigns       │  ┌─ 内容区域 ──────────────┐  │
│  Task Board      │  │                         │  │
│  Approval Center │  │  （各页面内容）           │  │
│  Publishing Hub  │  │                         │  │
│  ─────           │  │                         │  │
│  Settings        │  └────────────────────────┘  │
│  [用户头像]       │                               │
└─────────────────────────────────────────────────┘
```

**Desktop (≥1280px)**：侧边栏固定 240px + 主内容区自适应
**Tablet (768-1279px)**：侧边栏收缩为 64px 图标模式，hover 展开
**Mobile (<768px)**：侧边栏隐藏，顶部 hamburger 菜单触发 drawer

### 2.2 侧边栏导航

```tsx
// 导航结构
const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Context Vault", icon: Database, href: "/context" },
  { name: "Campaigns", icon: Megaphone, href: "/campaigns" },
  { name: "Task Board", icon: KanbanSquare, href: "/tasks" },
  { name: "Approval Center", icon: CheckCircle, href: "/approval", badge: 3 },
  { name: "Publishing Hub", icon: Send, href: "/publishing" },
];
```

**侧边栏样式：**

```
容器: w-60 h-screen bg-gray-50 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800
      flex flex-col justify-between p-4

Logo区: h-12 flex items-center gap-2 px-2 mb-6
       Logo文字: text-lg font-bold text-gray-900 dark:text-zinc-50

导航项（默认）:
  flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 dark:text-zinc-400
  hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-50
  transition-colors duration-150

导航项（选中）:
  bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-50 font-medium

Badge（待审核数）:
  ml-auto bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400
  text-xs font-medium px-2 py-0.5 rounded-full

底部用户区:
  flex items-center gap-3 px-3 py-2 border-t border-gray-200 dark:border-zinc-800 mt-auto pt-4
  头像: w-8 h-8 rounded-full
  用户名: text-sm font-medium
  角色: text-xs text-gray-400
```

---

## 三、各页面设计方案

### 3.1 Dashboard（老板首页）

**页面目标**：一屏掌握全局进度，快速识别需要关注的事项。

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│  Dashboard                          [本周 ▾]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │目标   │  │内容   │  │待审核 │  │已发布 │       │
│  │达成率 │  │产出量 │  │数量   │  │本周   │       │
│  │72%   │  │24篇  │  │3件   │  │18篇  │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
│                                                 │
│  ┌─────────────────────┐ ┌────────────────────┐ │
│  │ 内容产出趋势（折线图）│ │ 平台表现排行       │ │
│  │                     │ │  小红书  ████ 42%  │ │
│  │                     │ │  抖音    ███  31%  │ │
│  │                     │ │  视频号  ██   18%  │ │
│  │                     │ │  X      █    9%   │ │
│  └─────────────────────┘ └────────────────────┘ │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │ 最近活动                                     ││
│  │  ● 「春季新品推广」已完成 3/8 任务    2h ago  ││
│  │  ● 小红书笔记 #12 已通过审核         3h ago  ││
│  │  ● 新增品牌资料「产品FAQ」            5h ago  ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**核心组件：**

**Stat Card（指标卡片）：**
```
容器: bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
      rounded-xl p-6 flex flex-col gap-2

标签: text-sm text-gray-500 dark:text-zinc-400
数值: text-3xl font-bold text-gray-900 dark:text-zinc-50
趋势: text-xs font-medium
  上升: text-emerald-600 (+ ▲ 12%)
  下降: text-red-600 (- ▼ 5%)
  持平: text-gray-400 (— 0%)
```

**Desktop**：4 列指标卡 + 下方 2 列（图表 60% + 排行 40%）+ 活动流全宽
**Tablet**：2 列指标卡 + 图表和排行各全宽堆叠
**Mobile**：1 列指标卡 + 全部堆叠

---

### 3.2 Context Vault（上下文资产库）

**页面目标**：管理品牌的核心知识资产，为 AI 内容生成提供上下文。

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│  Context Vault                    [+ 新增资产]   │
├─────────────────────────────────────────────────┤
│  [全部] [产品] [品牌] [受众] [案例]    🔍 搜索    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │ 📦 产品：OpenClaw 抓娃娃机          已完善   ││
│  │    核心卖点、定价、目标用户...     更新于 2d  ││
│  ├─────────────────────────────────────────────┤│
│  │ 🎨 品牌：OpenClaw Brand Guide       已完善   ││
│  │    品牌故事、语气、视觉风格...     更新于 3d  ││
│  ├─────────────────────────────────────────────┤│
│  │ 👥 受众：Z世代娱乐消费者           待补充    ││
│  │    画像、痛点、决策因素...         更新于 1w  ││
│  ├─────────────────────────────────────────────┤│
│  │ 📝 案例：春节限定活动复盘           已完善    ││
│  │    数据、亮点、可复用策略...       更新于 5d  ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Tab 筛选栏：**
```
容器: flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1

Tab默认: px-3 py-1.5 text-sm text-gray-500 dark:text-zinc-400 rounded-md
         hover:text-gray-700 dark:hover:text-zinc-300 transition-colors

Tab选中: bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-50
         shadow-sm font-medium
```

**资产列表项：**
```
容器: flex items-center justify-between p-4
      border-b border-gray-100 dark:border-zinc-800
      hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer
      transition-colors duration-150

左侧:
  图标: w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center
  标题: text-sm font-medium text-gray-900 dark:text-zinc-50
  描述: text-xs text-gray-500 dark:text-zinc-400 mt-0.5

右侧:
  状态Badge:
    已完善: bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400
    待补充: bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400
  时间: text-xs text-gray-400 dark:text-zinc-500
```

**新增/编辑资产：使用 Sheet（右侧滑出面板）**
```
Sheet容器: w-[560px] max-w-full bg-white dark:bg-zinc-900
           border-l border-gray-200 dark:border-zinc-800

表单字段:
  Label: text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5
  Input: w-full h-10 px-3 rounded-md border border-gray-200 dark:border-zinc-700
         bg-white dark:bg-zinc-800 text-sm
         focus:ring-2 focus:ring-blue-500 focus:border-transparent
  Textarea: 同 Input，高度 h-32，resize-none
```

---

### 3.3 Campaign（活动管理）

**页面目标**：创建和管理营销活动，设定目标、时间、关联上下文。

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│  Campaigns                        [+ 创建活动]   │
├─────────────────────────────────────────────────┤
│  [进行中 3] [计划中 2] [已完成 8] [全部 13]       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │ 🚀 春季新品推广                          │   │
│  │ 目标: 小红书涨粉500 + 抖音播放10w        │   │
│  │ 时间: 3/1 - 3/31                        │   │
│  │ 进度: ████████░░ 72%    任务: 12/18      │   │
│  │ 平台: [小红书] [抖音] [视频号]            │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │ 📣 品牌日常种草                          │   │
│  │ 目标: 每周产出5篇优质内容                 │   │
│  │ 时间: 长期运营                           │   │
│  │ 进度: ██████░░░░ 58%    任务: 7/12       │   │
│  │ 平台: [小红书] [即刻]                     │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Campaign 卡片：**
```
容器: bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
      rounded-xl p-6 hover:border-gray-300 dark:hover:border-zinc-600
      transition-colors cursor-pointer

标题行: flex items-center justify-between
  活动名: text-lg font-semibold text-gray-900 dark:text-zinc-50
  状态Badge:
    进行中: bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full
    计划中: bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400
    已完成: bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400

目标: text-sm text-gray-600 dark:text-zinc-400 mt-2
时间: text-xs text-gray-400 dark:text-zinc-500 mt-1

进度条容器: mt-4 flex items-center gap-3
  进度条背景: flex-1 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full
  进度条填充: h-2 bg-blue-600 dark:bg-blue-500 rounded-full transition-all
  百分比: text-sm font-medium text-gray-700 dark:text-zinc-300

平台标签容器: flex gap-2 mt-3
  平台标签: text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800
           text-gray-600 dark:text-zinc-400
```

---

### 3.4 Task Board（执行看板）

**页面目标**：看板式管理所有内容任务的生命周期。

**看板列**：`Backlog` → `Draft` → `Review` → `Approved` → `Scheduled` → `Published`

**布局结构**：

```
┌─────────────────────────────────────────────────────────────┐
│  Task Board          [活动筛选 ▾] [平台筛选 ▾]  [+ 新任务]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Backlog(4) │ Draft(3)  │ Review(2) │ Approved │ Scheduled │ Published │
│  ──────────│──────────│──────────│─────────│──────────│──────────│
│  ┌────────┐│┌────────┐│┌────────┐│         │          │          │
│  │小红书   ││抖音脚本 ││品牌故事 │         │          │          │
│  │种草笔记 ││#春季   ││视频号  ││         │          │          │
│  │@小红书  ││@抖音   ││@视频号 ││         │          │          │
│  │P0 3/12 ││P1 3/14 ││P0 3/11 ││         │          │          │
│  └────────┘│└────────┘│└────────┘│         │          │          │
│  ┌────────┐│┌────────┐│┌────────┐│         │          │          │
│  │...      ││...      ││...      ││         │          │          │
│  └────────┘│└────────┘│└────────┘│         │          │          │
│            │          │          │         │          │          │
└─────────────────────────────────────────────────────────────┘
```

**看板列标题：**
```
容器: flex items-center justify-between px-2 py-3

列名 + 计数:
  flex items-center gap-2
  列名: text-sm font-semibold text-gray-700 dark:text-zinc-300
  计数: text-xs bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400
        w-5 h-5 rounded-full flex items-center justify-center

列容器: w-72 min-w-[288px] bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-2
        flex flex-col gap-2
```

**任务卡片（可拖拽）：**
```
容器: bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
      rounded-lg p-3 cursor-grab active:cursor-grabbing
      hover:border-gray-300 dark:hover:border-zinc-600
      shadow-sm hover:shadow-md transition-all duration-150

标题: text-sm font-medium text-gray-900 dark:text-zinc-50 line-clamp-2
描述: text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-1

底部: flex items-center justify-between mt-3
  平台图标: w-5 h-5 rounded
  优先级:
    P0: w-2 h-2 rounded-full bg-red-500
    P1: w-2 h-2 rounded-full bg-amber-500
    P2: w-2 h-2 rounded-full bg-gray-300
  截止日期: text-xs text-gray-400
    过期: text-red-500 font-medium
```

**水平滚动**：看板区域 `overflow-x-auto flex gap-4 pb-4`，允许横向滚动查看所有列。

**Mobile 适配**：切换为列表视图，按状态分组折叠展示。

---

### 3.5 Approval Center（审核中心）

**页面目标**：老板快速审核 AI 生成的内容，查看版本差异，识别风险。

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│  Approval Center                 [全部] [待审核] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─ 审核列表 (左 40%) ──┐ ┌─ 内容预览 (右 60%) ┐│
│  │                      │ │                     ││
│  │ ● 小红书种草 #12     │ │  [小红书] 预览模式    ││
│  │   春季新品 · P0      │ │                     ││
│  │   AI生成 · 2h ago    │ │  标题：春日必入！...  ││
│  │ ─────────────────    │ │                     ││
│  │ ○ 抖音脚本 #8       │ │  正文内容预览...      ││
│  │   品牌日常 · P1      │ │                     ││
│  │   AI生成 · 3h ago    │ │  [图片占位]          ││
│  │ ─────────────────    │ │                     ││
│  │ ○ X推文 #5          │ │  ⚠️ 风险提示:         ││
│  │   品牌日常 · P2      │ │  "价格敏感词检测到"   ││
│  │                      │ │                     ││
│  │                      │ │  [退回修改] [通过✓]   ││
│  └──────────────────────┘ └─────────────────────┘│
└─────────────────────────────────────────────────┘
```

**审核列表项：**
```
容器: flex items-start gap-3 p-4 cursor-pointer
      border-l-2 border-transparent
      hover:bg-gray-50 dark:hover:bg-zinc-800/50

选中态: border-l-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10

状态指示器:
  待审核: w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0
  已通过: w-2 h-2 rounded-full bg-emerald-500
  已退回: w-2 h-2 rounded-full bg-red-500

标题: text-sm font-medium text-gray-900 dark:text-zinc-50
元信息: text-xs text-gray-400 dark:text-zinc-500 mt-0.5
```

**内容预览区：**
```
容器: flex-1 p-6 overflow-y-auto

预览卡: bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
        rounded-xl p-6

风险提示:
  容器: mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200
        dark:border-amber-800/30 rounded-lg
  图标 + 文字: flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400

操作按钮区: flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800
  退回: variant="outline" — border border-gray-200 text-gray-700 hover:bg-gray-50
  通过: variant="default" — bg-blue-600 text-white hover:bg-blue-700
```

**版本对比**：点击「查看修改」时，用 diff 高亮展示变更（新增文字绿色背景，删除文字红色背景）。

**Mobile 适配**：列表和预览切换为全屏，列表页点击进入详情页，顶部返回按钮。

---

### 3.6 Publishing Hub（发布中心）

**页面目标**：将审核通过的内容按平台格式化，导出发布包。

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│  Publishing Hub                  [导出全部 ↓]    │
├─────────────────────────────────────────────────┤
│  [待发布 5] [已导出 12] [已发布 28]               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  小红书种草笔记 #12                       │   │
│  │  「春季新品推广」活动                      │   │
│  │                                          │   │
│  │  格式状态:                                │   │
│  │  ✅ 小红书  [文字1200字 + 9图]  [预览] [导出]│   │
│  │  ✅ 抖音    [脚本 + 字幕文件]   [预览] [导出]│   │
│  │  ⬜ 视频号  [待适配]           [生成]      │   │
│  │  ✅ X      [280字 + 4图]      [预览] [导出]│   │
│  │                                          │   │
│  │  计划发布: 2026-03-12 10:00              │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  品牌故事短视频 #5                        │   │
│  │  ...                                     │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**发布卡片：**
```
容器: bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
      rounded-xl p-6

标题: text-base font-semibold text-gray-900 dark:text-zinc-50
副标题: text-sm text-gray-500 dark:text-zinc-400 mt-1

平台行: flex items-center justify-between py-3
        border-b border-gray-50 dark:border-zinc-800 last:border-0

  平台名 + 状态图标:
    ✅ 已就绪: text-emerald-600
    ⬜ 待适配: text-gray-300
    ❌ 失败: text-red-500

  格式描述: text-sm text-gray-600 dark:text-zinc-400

  操作按钮组: flex gap-2
    预览: ghost variant, text-sm text-gray-500 hover:text-gray-700
    导出: outline variant, text-sm
    生成: default variant (仅待适配时显示)
```

**导出格式**：
- 小红书：标题 + 正文 + 标签 + 图片打包（ZIP）
- 抖音：脚本文案 + 字幕 SRT + 封面图
- 视频号：同抖音格式
- X：推文文本 + 图片
- 即刻：正文 + 话题标签

---

## 四、通用组件规范

### 4.1 按钮

| 变体 | 样式 | 用途 |
|------|------|------|
| Primary | `bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 rounded-md text-sm font-medium` | 主操作 |
| Secondary | `bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700` | 次要操作 |
| Ghost | `text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800` | 辅助操作 |
| Destructive | `bg-red-600 text-white hover:bg-red-700` | 危险操作 |
| Disabled | `opacity-50 cursor-not-allowed pointer-events-none` | 不可用状态 |

按钮统一高度 `h-9`（36px），图标按钮 `w-9 h-9`。

### 4.2 输入框

```
默认: h-10 w-full rounded-md border border-gray-200 dark:border-zinc-700
      bg-white dark:bg-zinc-800 px-3 text-sm
      placeholder:text-gray-400 dark:placeholder:text-zinc-500

Focus: ring-2 ring-blue-500 ring-offset-0 border-transparent

错误: border-red-500 ring-2 ring-red-500/20
      + 错误提示文字: text-xs text-red-500 mt-1
```

### 4.3 Badge / Tag

```
默认: inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium

颜色变体:
  蓝色(信息): bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400
  绿色(成功): bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400
  黄色(警告): bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400
  红色(危险): bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400
  灰色(中性): bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400
```

### 4.4 卡片

```
基础: bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
      rounded-xl overflow-hidden

可点击: hover:border-gray-300 dark:hover:border-zinc-600
       cursor-pointer transition-colors duration-150

内间距: p-6 (标准) / p-4 (紧凑)
```

### 4.5 空状态

```
容器: flex flex-col items-center justify-center py-16 text-center

图标: w-12 h-12 text-gray-300 dark:text-zinc-600 mb-4
标题: text-base font-medium text-gray-500 dark:text-zinc-400
描述: text-sm text-gray-400 dark:text-zinc-500 mt-1 max-w-sm
操作: mt-4 (放置主操作按钮)
```

### 4.6 加载状态

```
骨架屏: animate-pulse bg-gray-200 dark:bg-zinc-800 rounded-md
  标题行: h-5 w-48
  描述行: h-4 w-full mt-2
  卡片: h-32 w-full

Spinner: w-5 h-5 border-2 border-gray-200 border-t-blue-600
         rounded-full animate-spin
```

### 4.7 Toast / 通知

```
容器: fixed bottom-4 right-4 z-50
      bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800
      rounded-lg shadow-md p-4 max-w-sm
      animate-in slide-in-from-bottom-2

类型:
  成功: 左侧 border-l-4 border-emerald-500
  错误: 左侧 border-l-4 border-red-500
  信息: 左侧 border-l-4 border-blue-500
```

---

## 五、交互设计规范

### 5.1 过渡动画

| 场景 | 时长 | 缓动 | Tailwind |
|------|------|------|----------|
| 颜色变化（hover） | 150ms | ease | `transition-colors duration-150` |
| 尺寸/位移 | 200ms | ease-out | `transition-all duration-200 ease-out` |
| 页面切换 | 200ms | ease-in-out | `transition-opacity duration-200` |
| 模态框弹出 | 200ms | ease-out | `animate-in fade-in zoom-in-95` |
| 侧边面板滑入 | 300ms | ease-out | `animate-in slide-in-from-right` |

### 5.2 键盘导航

- 所有可交互元素支持 Tab 焦点导航
- `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- 看板支持方向键移动任务
- `Esc` 关闭模态框和侧边面板
- `⌘+K` 全局搜索（可后续迭代）

### 5.3 拖拽交互（Task Board）

- 拖拽中：卡片轻微旋转（2deg） + 提升阴影 + 半透明
- 放置目标：列高亮边框 `border-2 border-dashed border-blue-400`
- 放置完成：短暂脉冲动画反馈

---

## 六、响应式适配方案

### 6.1 断点定义

| 断点 | 宽度 | 布局策略 |
|------|------|----------|
| Mobile | < 768px | 单列布局，侧边栏隐藏为 drawer |
| Tablet | 768px - 1279px | 侧边栏收缩为图标模式，内容 1-2 列 |
| Desktop | ≥ 1280px | 侧边栏展开 240px，内容多列布局 |

### 6.2 各页面适配规则

| 页面 | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| Dashboard | 指标卡 1 列，图表全宽堆叠 | 指标卡 2 列，图表 + 排行 2 列 | 指标卡 4 列，图表 + 排行 2 列 |
| Context Vault | 全宽列表，Sheet 改为全屏 | 同 Mobile | 列表 + 右侧 Sheet |
| Campaigns | 卡片 1 列 | 卡片 2 列 | 卡片 2-3 列 |
| Task Board | 列表视图（按状态分组） | 水平滚动看板（3列可见） | 全看板（6列可见） |
| Approval Center | 列表 → 详情（切换） | 左列表 35% + 右预览 65% | 同 Tablet |
| Publishing Hub | 卡片 1 列 | 卡片 1 列 | 卡片 1-2 列 |

### 6.3 移动端专属交互

- 底部固定操作栏：审核页的「退回/通过」按钮固定在底部
- 下拉刷新手势
- 滑动卡片快捷操作（左滑删除/退回，右滑通过）

---

## 七、图标方案

使用 **Lucide Icons**（shadcn/ui 默认图标库），保持一致性。

关键图标映射：

| 功能 | 图标 | lucide-react 组件 |
|------|------|-------------------|
| Dashboard | 布局仪表盘 | `LayoutDashboard` |
| Context Vault | 数据库 | `Database` |
| Campaigns | 扩音器 | `Megaphone` |
| Task Board | 看板 | `KanbanSquare` |
| Approval | 勾选圈 | `CheckCircle` |
| Publishing | 发送 | `Send` |
| 搜索 | 放大镜 | `Search` |
| 新增 | 加号 | `Plus` |
| 设置 | 齿轮 | `Settings` |
| 用户 | 圆形用户 | `CircleUser` |
| 小红书 | 自定义 SVG | — |
| 抖音 | 自定义 SVG | — |
| 视频号 | 自定义 SVG | — |

图标尺寸规范：
- 导航图标: `w-5 h-5`（20px）
- 按钮内图标: `w-4 h-4`（16px）
- 装饰性大图标: `w-6 h-6`（24px）

---

## 八、设计 Token 总结（供开发参考）

```css
/* 建议在 globals.css 中定义 CSS 变量 */
:root {
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --sidebar-width: 240px;
  --sidebar-width-collapsed: 64px;
  --header-height: 64px;
  --content-max-width: 1200px;
}
```

---

*[@Designer] 以上为 OPC_MKT_Agent_OS MVP 阶段的完整 UI 设计方案。所有配色、间距、组件均提供了 Tailwind CSS 类名参考，@DEV 可直接使用。设计遵循 linear.app / vercel.com 的克制简洁风格，支持亮色/暗色双模式，移动端优先适配。*
