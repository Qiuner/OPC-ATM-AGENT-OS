# 桌面端页面适配规范与设计走查清单

**文档类型**: 页面级设计规范 + Phase 4 设计走查清单
**完成时间**: 2026-03-26
**参与人员**: @Designer (UI 设计师)
**前置文档**: `@Designer——Electron桌面端UI设计方案.md` (三栏布局总纲)

---

## Part A: 各页面桌面端适配规范

> 以下规范基于三栏布局 (Activity Rail 52px + Context Panel 240px + Main Content)。
> 所有页面在 Main Content 区域内渲染，max-width 1200px 居中，padding 24px。

---

### 1. Dashboard (总览)

**当前状态**: 已有指标卡 + OpenClaw Panel + 活动列表。
**桌面端改动**: 小幅调整，主要是 Context Panel 联动。

#### Context Panel 内容 (Dashboard 选中时)

```
OVERVIEW

┌──────────────────────────┐
│  关键指标快览              │
│  任务: 12   待审: 3       │
│  发布: 8    活动: 2       │
├──────────────────────────┤
│  快捷操作                 │
│  ▶ 运行每日管线            │
│  📝 新建内容草稿           │
│  📊 查看今日报告           │
│  ⚙️ AI 配置              │
├──────────────────────────┤
│  Agent 状态               │
│  ● CEO         运行中     │
│  ○ XHS         空闲       │
│  ○ Growth      空闲       │
│  ● Writer      运行中     │
└──────────────────────────┘
```

- 快捷操作项: `h-9 px-3 rounded-lg text-[13px] text-white/50 hover:text-white/70 hover:bg-white/[0.03] cursor-pointer transition-all`
- 指标快览: `text-[24px] font-bold text-white` 标签 `text-[11px] text-white/30`
- Agent 状态圆点: 运行中 `#22c55e` 6px | 空闲 `rgba(255,255,255,0.2)` 6px

#### Main Content 调整

| 改动项 | 说明 |
|--------|------|
| 指标卡列数 | 窗口 >= 1200px 时 4 列，< 1200px 时 2 列 (已有的 `lg:grid-cols-4` 逻辑沿用) |
| OpenClaw Panel | 无改动，直接渲染 |
| 活动列表 | 无改动 |
| 页面标题 | 由 Header Bar 的页面标题区域统一显示，页面内的 `<h2>Overview</h2>` **保留不动**（双标题不冲突，页面内标题提供上下文） |

**无需改动的组件**: `GeneratePlanButton`, metric cards, activity list — 完全复用。

---

### 2. Team Studio (Agent 对话 / 执行模式)

**当前状态**: 页面内含三个 Tab (Execute / Chat / Monitor)，自带频道切换和聊天 UI。
**桌面端改动**: **最大改动** — 频道切换逻辑迁移到 Context Panel，聊天 UI 适配三栏布局。

#### Context Panel 内容 (Agents 选中时)

将现有页面内的 Agent 侧边栏/频道切换功能提取到 Context Panel：

```
AGENTS                         [+]

┌──────────────────────────────┐
│ 🔍 搜索 Agent...              │
└──────────────────────────────┘

── 执行 ──
┌──────────────────────────────┐
│ [CEO] CEO 营销总监            │
│ Orchestrator  ● 运行中       │  ← 绿色圆点
│ 正在分析竞品数据...            │  ← text-[11px] text-white/25 truncate
└──────────────────────────────┘

── 内容创作 ──
┌──────────────────────────────┐
│ [XHS] 小红书创作专家           │
│ Specialist  ○ 空闲            │
└──────────────────────────────┘
┌──────────────────────────────┐
│ [X] X/Twitter Agent          │
│ Specialist  ○ 空闲            │
└──────────────────────────────┘
┌──────────────────────────────┐
│ [VIS] Visual Agent           │
│ Specialist  ○ 空闲            │
└──────────────────────────────┘

── 策略分析 ──
┌──────────────────────────────┐
│ [G] 增长营销专家              │
│ Specialist  ○ 空闲            │
└──────────────────────────────┘
┌──────────────────────────────┐
│ [AN] 数据分析师              │
│ Specialist  ○ 空闲            │
└──────────────────────────────┘

── 审核 ──
┌──────────────────────────────┐
│ [BR] 品牌风控审查             │
│ Reviewer  ○ 空闲              │
└──────────────────────────────┘

── 监控 ──
┌──────────────────────────────┐
│ [📊] Team Monitor            │  ← 点击进入像素风 Monitor 视图
│ 全局运行状态监控              │
└──────────────────────────────┘
```

Agent 列表项样式：
```
// 容器
"px-3 py-2.5 rounded-xl transition-all cursor-pointer"

// 选中态
"bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)]"

// Agent 头像方块
"h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
// 背景色使用各 Agent 自定义色 (AGENTS[].color)

// Agent 名称
"text-[13px] font-medium text-white"

// 角色标签
"text-[10px] font-medium text-white/25"

// 状态描述
"text-[11px] text-white/25 truncate mt-0.5"
```

分组标题：`text-[10px] font-semibold uppercase tracking-wider text-white/20 px-3 pt-4 pb-1`

#### Main Content — 三种模式

**模式 1: Agent 聊天 (点击某个 Agent)**

```
┌────────────────────────────────────────────────────────┐
│  CEO 营销总监                    Model: Claude   [⋯]   │
│  Orchestrator · 管理 3 个子 Agent                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─ CEO ──────────────────────────────────────┐        │
│  │ 我已完成竞品分析，主要发现：                   │        │
│  │ 1. Jasper 新增 AI Pipeline 功能...           │        │
│  └────────────────────────────────────────────┘        │
│                                                        │
│  ┌─ You ──────────────────────────────────────┐        │
│  │ 基于分析结果，安排 XHS Agent 产出内容          │        │
│  └────────────────────────────────────────────┘        │
│                                                        │
│  ┌─ CEO ──────────────────────────────────────┐        │
│  │ ● 正在调度 XHS Agent...                     │        │
│  └────────────────────────────────────────────┘        │
│                                                        │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐     │
│  │ @CEO 下达本周 Meta 广告投放指令...       [发送] │     │
│  └──────────────────────────────────────────────┘     │
│  [@route]  [📎]  [📷]                 Model: Claude   │
└────────────────────────────────────────────────────────┘
```

聊天顶部 Agent 信息栏:
- 容器: `h-14 px-6 flex items-center gap-3 shrink-0` border-bottom `rgba(255,255,255,0.06)`
- Agent 头像: 与列表一致的色块
- 名称: `text-[15px] font-semibold text-white`
- 角色描述: `text-[12px] text-white/30`
- 右侧模型选择: `text-[12px] text-white/30 bg-white/[0.04] rounded-md px-2 py-1`

消息气泡样式 (沿用总纲定义):
- Agent: `bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-3`
- User: `bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.12)] rounded-2xl px-4 py-3`
- 流式输出: 光标 `|` 用 `animate-pulse text-[#a78bfa]`

**模式 2: 执行模式 (选中"全部"或进入执行面板)**

保留现有 Execute 模式的 UI — 输入框、任务进度条、Agent 并行执行卡片。无需大改动，直接嵌入 Main Content。

**模式 3: Team Monitor (选中 Monitor 项)**

保留现有像素风 Monitor 视图 (v3/page.tsx)。无需改动，直接嵌入。

#### 关键迁移说明

| 现有组件 | 迁移方式 |
|----------|----------|
| 页面内 Tab 切换 (Execute/Chat/Monitor) | **移除 Tab UI**，改由 Context Panel Agent 列表 + Monitor 项控制 |
| 页面内 Agent 频道列表 | **迁移到 Context Panel** |
| 聊天 UI | **保留在 Main Content**，样式微调适配新布局 |
| Execute 模式 | **保留在 Main Content**，当 Context Panel 选择"执行任务"时显示 |
| Team Monitor (v3) | **保留在 Main Content**，当 Context Panel 选择"Team Monitor"时显示 |

---

### 3. Approval Center (审批中心)

**当前状态**: Tab 过滤 (All/Pending/Approved/Rejected) + 管线进度条 + 内容卡片列表。
**桌面端改动**: Tab 过滤迁移到 Context Panel，Main Content 专注内容展示。

#### Context Panel 内容 (Approvals 选中时)

```
APPROVALS                       (3)

── 待审批 (3) ──
┌──────────────────────────────┐
│ ⚠ Meta 广告 - Q2 促销         │
│ 品牌合规: 72/100              │  ← 分数 < 80 琥珀色, >= 80 绿色
│ 2h ago · AI Review           │
└──────────────────────────────┘
┌──────────────────────────────┐
│ ⚠ X Thread - AI Tools        │
│ 品牌合规: 91/100              │
│ 4h ago · 自动通过             │
└──────────────────────────────┘
┌──────────────────────────────┐
│ ⚠ TikTok 脚本 - 开箱         │
│ 品牌合规: 65/100              │
│ 1d ago · 等待人工             │
└──────────────────────────────┘

── 已通过 (5) ──
┌──────────────────────────────┐
│ ✓ LinkedIn 文章 - B2B SaaS   │
│ 品牌合规: 95/100              │
│ 3d ago                       │
└──────────────────────────────┘
...

── 已拒绝 (1) ──
┌──────────────────────────────┐
│ ✗ Blog Post - 竞品对比        │
│ 品牌合规: 42/100              │
│ 5d ago · 风险: 竞品负面措辞    │
└──────────────────────────────┘
```

列表项样式：
- 容器: `px-3 py-2.5 rounded-xl cursor-pointer transition-all`
- 选中: `bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)]`
- 待审批图标: `text-[#fbbf24]`
- 已通过图标: `text-[#22c55e]`
- 已拒绝图标: `text-[#ef4444]`
- 分数颜色: >= 80 `text-[#22c55e]` | 60-79 `text-[#fbbf24]` | < 60 `text-[#ef4444]`

#### Main Content 调整

| 改动项 | 说明 |
|--------|------|
| Tab 过滤器 | **移除**，改由 Context Panel 按分组分类 |
| 管线进度条 (Pipeline stages) | **保留**在 Main Content 顶部 |
| 内容详情 | 点击 Context Panel 列表项 → Main Content 显示完整内容详情 + 审批操作按钮 |
| 审批按钮 (通过/拒绝) | **保留**在 Main Content 详情底部 |

---

### 4. Context Vault (品牌资产)

**当前状态**: Tab 过滤 (全部/产品/品牌/受众/案例) + 列表 + Sheet 编辑面板。
**桌面端改动**: Tab 过滤 → Context Panel，Sheet 编辑 → Main Content 内嵌。

#### Context Panel 内容 (Context Vault 选中时)

```
BRAND CONTEXT                  [+]

┌──────────────────────────────┐
│ 🔍 搜索资产...                │
└──────────────────────────────┘

── 产品 (3) ──
  📦 OPC MKT Agent OS
  📦 OpenClaw Gateway
  📦 CreatorFlow

── 品牌 (2) ──
  🎨 品牌语气指南
  🎨 品牌视觉规范

── 受众 (2) ──
  👥 出海 DTC 品牌主
  👥 跨境电商运营

── 案例 (4) ──
  📝 Q1 爆款标题分析
  📝 Meta Ads 转化案例
  📝 XHS 种草最佳实践
  📝 Email 打开率优化

── 竞品 (2) ──
  🏢 Jasper 功能对比
  🏢 Copy.ai 定价分析
```

列表项: `px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white/80 hover:bg-white/[0.03] cursor-pointer transition-all`
选中: `text-white bg-[rgba(167,139,250,0.08)]`
分组图标: 使用各类型对应的 emoji 前缀

#### Main Content 调整

| 改动项 | 说明 |
|--------|------|
| Tab 过滤器 | **移除** |
| 资产列表 | **迁移到 Context Panel** |
| Sheet 编辑面板 | **改为 Main Content 内嵌编辑**，不再用 Sheet 浮层 |
| 版本历史 (Dialog) | 保留为模态弹窗 |
| 导入/导出按钮 | 移到 Main Content 顶部操作栏 |

Main Content 内嵌编辑布局：
```
┌──────────────────────────────────────────────┐
│  品牌语气指南              [编辑] [历史] [删除] │
│  brand · 更新于 2d ago                        │
├──────────────────────────────────────────────┤
│                                              │
│  (Markdown 渲染的资产内容)                     │
│  或                                          │
│  (编辑模式: Textarea 编辑器)                   │
│                                              │
│  [图片附件区域]                                │
│                                              │
├──────────────────────────────────────────────┤
│  [取消]                        [保存修改]      │
└──────────────────────────────────────────────┘
```

---

### 5. Analytics (数据分析)

**当前状态**: 两个 Tab (Metrics / Learnings) + 数据表格 + AI 分析功能。
**桌面端改动**: 最小改动，主要是 Context Panel 提供快捷导航。

#### Context Panel 内容 (Analytics 选中时)

```
ANALYTICS

── 数据报告 ──
  📊 指标总览 (Metrics)
  🧠 闭环学习 (Learnings)

── AI 分析 ──
  🔬 运行 AI 数据分析
  📈 趋势检测
  💡 优化建议

── 快速筛选 ──
  平台:
  [全部] [XHS] [X] [Meta] [TikTok]

  时间:
  [7天] [30天] [90天] [全部]
```

#### Main Content 调整

| 改动项 | 说明 |
|--------|------|
| Tab 切换 (Metrics/Learnings) | **移到 Context Panel 导航**，点击切换 |
| 数据表格 | 无改动，直接渲染 |
| AI 分析按钮 | 保留在 Main Content，同时 Context Panel 提供快捷入口 |
| 筛选器 | Context Panel 的平台/时间筛选联动 Main Content 数据 |

---

### 6. Publishing Hub (发布中心)

**当前状态**: 三个 Tab (待发布/已导出/已发布) + 内容卡片 + 导出/发布操作。
**桌面端改动**: Tab → Context Panel 分组。

#### Context Panel 内容 (Publishing 选中时)

```
PUBLISHING

── 待发布 (4) ──
  📤 Meta Q2 Campaign      明天 09:00
  📤 X Thread - AI Tools   明天 11:30
  📤 TikTok 开箱视频        03-28 14:00
  📤 Email Newsletter      03-29 08:00

── 已导出 (2) ──
  📋 LinkedIn Article       已导出 JSON
  📋 Blog SEO Post         已导出 Markdown

── 已发布 (8) ──
  ✓ XHS 种草笔记 #12       03-24
  ✓ Meta Ads - Spring      03-23
  ✓ X Thread - Product     03-22
  ...
```

列表项含发布时间: `text-[11px] text-white/20` 右对齐

#### Main Content 调整

| 改动项 | 说明 |
|--------|------|
| Tab 过滤器 | **移除**，由 Context Panel 分组替代 |
| 内容卡片详情 | 点击 Context Panel 项 → Main Content 显示完整内容 + 操作按钮 |
| 导出/发布按钮 | 保留在 Main Content 详情页 |
| 批量操作 | Main Content 顶部操作栏: [全部导出] [批量发布] |

---

### 7. Settings (设置)

**当前状态**: 侧边栏 Sheet 弹出面板，包含 AI 模式、功能开关、API Keys。
**桌面端改动**: **最大改动** — 从 Sheet 改为全页面，增加 Agent 级模型配置和新设置项。

#### Context Panel 内容 (Settings 选中时)

```
SETTINGS

  🤖 AI Provider & Keys        ← 选中态高亮
  ⚡ AI 功能开关
  🧑‍💼 Agent 配置               ← 新增: per-Agent model
  🎨 外观与主题
  🌐 网络代理 (Proxy)
  📁 数据存储
  ⏱ 定时任务
  🔔 通知设置
  ℹ️ 关于
```

#### Main Content — AI Provider & Keys

```
┌──────────────────────────────────────────────────────┐
│  AI PROVIDER & KEYS                                   │
│                                                       │
│  ┌── 默认模型 ──────────────────────────────────┐    │
│  │  [Claude (Anthropic)          ▾]              │    │
│  │  当前模型将用于所有未单独配置的 Agent            │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  ┌── API Keys ───────────────────────────────────┐   │
│  │                                               │   │
│  │  Claude (Anthropic)          ★ 推荐           │   │
│  │  ┌────────────────────────────────────┐       │   │
│  │  │ sk-ant-api03-***            [眼] │       │   │
│  │  └────────────────────────────────────┘       │   │
│  │  ✅ 已配置                  获取 Key →        │   │
│  │                                               │   │
│  │  OpenAI                                       │   │
│  │  ┌────────────────────────────────────┐       │   │
│  │  │ sk-***                       [眼] │       │   │
│  │  └────────────────────────────────────┘       │   │
│  │  ✅ 已配置                  获取 Key →        │   │
│  │                                               │   │
│  │  Gemini         ⚠ 未配置   [配置]             │   │
│  │  DeepSeek       ✅ 已配置   [编辑]             │   │
│  │  MiniMax        ⚠ 未配置   [配置]             │   │
│  │  GLM (智谱)     ⚠ 未配置   [配置]             │   │
│  │                                               │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  🔒 API Key 通过系统钥匙链 (Keychain) 加密存储         │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### Main Content — Agent 配置 (新增，对标 ClawX per-Agent model)

```
┌──────────────────────────────────────────────────────┐
│  AGENT 配置                                           │
│                                                       │
│  每个 Agent 可独立设置 LLM 模型，未设置则使用全局默认     │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  Agent              模型              策略     │  │
│  ├────────────────────────────────────────────────┤  │
│  │  [CEO] CEO 营销总监  [Claude Opus   ▾] 自定义  │  │
│  │  [XHS] 小红书专家    [全局默认       ▾] 继承    │  │
│  │  [G]   增长专家      [DeepSeek V3   ▾] 自定义  │  │
│  │  [BR]  品牌审查      [Claude Sonnet ▾] 自定义  │  │
│  │  [X]   X/Twitter    [全局默认       ▾] 继承    │  │
│  │  [AN]  数据分析      [Gemini Pro    ▾] 自定义  │  │
│  │  [STR] 策略师        [全局默认       ▾] 继承    │  │
│  │  [VIS] 视觉生成      [全局默认       ▾] 继承    │  │
│  │  [POD] 播客生成      [全局默认       ▾] 继承    │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  "自定义" — Agent 使用指定模型                          │
│  "继承"   — Agent 使用全局默认模型                      │
│                                                       │
└──────────────────────────────────────────────────────┘
```

Agent 配置表样式：
- 表头: `text-[11px] font-semibold uppercase tracking-wider text-white/25`
- 行: `h-12 px-4` border-bottom `rgba(255,255,255,0.04)` hover `bg-white/[0.02]`
- Agent 色块: 与 Agent 列表一致
- Select: `h-8 rounded-lg text-[13px]` bg `rgba(255,255,255,0.04)` border `rgba(255,255,255,0.08)`
- 策略标签: 自定义 `text-[#a78bfa]` | 继承 `text-white/30`

#### Main Content — 关于

```
┌──────────────────────────────────────────────────────┐
│  关于                                                 │
│                                                       │
│  [O] OPC MKT Agent OS                                │
│  版本: 1.0.0-beta                                     │
│  Electron: 40.x                                      │
│  Chromium: 130.x                                     │
│  Node.js: 22.x                                       │
│                                                       │
│  [检查更新]  [查看日志目录]  [重置所有设置]              │
│                                                       │
│  开源协议: MIT                                        │
│  GitHub: github.com/opc/mkt-agent-os                 │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

### 8. Onboarding (首次启动引导)

**Onboarding 隐藏三栏布局，全屏显示。** 详见总纲文档 Section 七。

此处补充交互细节：

#### Step 2 API Key 输入验证流程

```
用户输入 Key
  │
  ├── 前缀格式校验 (即时)
  │   ├── Claude: "sk-ant-" → 格式正确 (绿色边框)
  │   ├── OpenAI: "sk-" → 格式正确
  │   ├── 不匹配任何前缀 → 格式警告 (琥珀色边框 + 提示)
  │   └── 空值 → 恢复默认边框
  │
  ├── 点击"下一步"时异步验证
  │   ├── 调用 Provider API 验证 Key 有效性
  │   ├── 成功 → 绿色对勾 + "已验证" + 保存到 Keychain
  │   ├── 失败 → 红色 X + "Key 无效，请检查" + 不阻止前进
  │   └── 超时 → 琥珀色 + "无法验证，已保存" + 允许前进
  │
  └── 无任何 Key 填写
      └── 允许"跳过" (底部链接) + "下一步"变灰提示但可点击
```

输入框状态样式：
| 状态 | border | 提示文字 |
|------|--------|----------|
| 默认 | `rgba(255,255,255,0.08)` | — |
| 输入中 (focus) | `rgba(167,139,250,0.3)` | — |
| 格式正确 | `rgba(34,197,94,0.3)` | "格式正确" `text-[#22c55e]` |
| 格式警告 | `rgba(251,191,36,0.3)` | "格式似乎不正确" `text-[#fbbf24]` |
| 验证成功 | `rgba(34,197,94,0.3)` | "已验证" `text-[#22c55e]` |
| 验证失败 | `rgba(239,68,68,0.3)` | "Key 无效" `text-[#ef4444]` |

#### Onboarding → 主界面过渡

完成 Step 4 点击"进入工作台"后：
1. Onboarding 容器: `opacity: 1→0` + `scale: 1→0.95`，300ms ease
2. 等待 200ms
3. 三栏主界面: `opacity: 0→1` + `scale: 1.02→1`，400ms ease-out
4. Activity Rail 各图标依次 fade in (每个间隔 50ms，总 ~500ms)
5. Context Panel 从左侧 `translateX(-20px)→0` 滑入，300ms ease

---

### 9. Skills Market (技能市场) — 新增页面

#### Context Panel 内容 (Skills 选中时)

```
SKILLS                         [浏览市场]

┌──────────────────────────────┐
│ 🔍 搜索技能...                │
└──────────────────────────────┘

── 已安装 (14) ──
  ✅ CEO Strategist
  ✅ XHS Content Writer
  ✅ Growth Analyst
  ✅ Brand Compliance
  ✅ SEO Optimizer
  ✅ X/Twitter Publisher
  ✅ Meta Ads Creator
  ✅ Email Marketer
  ...

── 推荐安装 ──
  ☆ TikTok Hashtag Research
  ☆ Competitor Price Monitor
  ☆ Email A/B Test
```

#### Main Content — 技能详情/市场

```
┌──────────────────────────────────────────────────────┐
│  CEO Strategist                         [✅ 已安装]   │
│  v1.2.0 · 核心技能 · 不可卸载                         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  营销团队总指挥 Agent 的核心策略制定技能。               │
│  负责需求拆解、子 Agent 调度编排与质量终审。             │
│                                                       │
│  能力:                                                │
│  [任务拆解] [多Agent编排] [质量把控] [流程调度]         │
│                                                       │
│  依赖:                                                │
│  - Claude API (推荐 Opus 模型)                        │
│  - Brand Context 数据                                 │
│                                                       │
│  配置:                                                │
│  ┌── Model Override ─────────────────────────┐       │
│  │  [Claude Opus           ▾]                 │       │
│  └────────────────────────────────────────────┘       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

### 10. Scheduler (定时任务) — 新增页面

#### Context Panel 内容 (Scheduler 选中时)

```
SCHEDULER                      [+]

── 活跃 (3) ──
  ⏱ 每日管线
    08:00-11:00 · 每日
    ● 运行中

  ⏱ 竞品监控
    */6h · 每天
    ● 下次: 14:00

  ⏱ 周报生成
    17:00 · 每周五
    ○ 等待

── 已暂停 (1) ──
  ⏸ Email Digest
    08:00 · 每周一
```

#### Main Content — 任务详情/编辑

对标 ClawX Cron 页面，可视化配置定时任务的 cron 表达式、Agent 绑定、通知方式等。

---

## Part B: 设计走查清单

> 以下清单用于 Phase 4，@Designer 与 @QA 协作逐项检查实现与设计方案的一致性。
> 评分: Pass / Fail / Minor (微调即可)

### B.1 全局布局走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| G-01 | 三栏布局结构 | Activity Rail 52px + Context Panel 240px + Main Content | 实际宽度与规格一致，视觉无错位 | |
| G-02 | 自定义标题栏 | 32px 高度，macOS 红绿灯/Windows 控件正确显示 | 双平台验证，可拖拽移动窗口 | |
| G-03 | Header Bar | 48px，cotify-glass 毛玻璃效果 | 背景模糊可见，页面标题正确显示 | |
| G-04 | Status Bar | 28px，跨三栏底部 | 引擎状态/LLM/RAM/版本信息正确 | |
| G-05 | 窗口默认尺寸 | 1360 x 820 | 首次启动尺寸正确 | |
| G-06 | 窗口最小尺寸 | 1024 x 640 | 缩放到最小不截断不溢出 | |
| G-07 | 窗口位置记忆 | 关闭后重开恢复上次位置和尺寸 | 关闭重开验证 | |

### B.2 Activity Rail 走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| R-01 | Rail 宽度 | 52px | 实测宽度正确 | |
| R-02 | 背景色 | `#050508` | 色值匹配 | |
| R-03 | Logo | 28x28, 紫→青渐变, rounded-lg | 视觉正确 | |
| R-04 | 图标尺寸 | 20x20px, 点击区域 36x36 | 可点击，不会误触相邻项 | |
| R-05 | 默认态图标色 | `rgba(255,255,255,0.35)` | 色值匹配 | |
| R-06 | 悬停态 | 图标亮度提高 + 背景 `rgba(255,255,255,0.04)` | hover 效果可见 | |
| R-07 | 选中态 | 图标紫色 `#a78bfa` + 背景 + 左侧 2px 指示条 | 三要素齐全 | |
| R-08 | Badge (数字) | Approval 右上角琥珀色数字 | badge 可见且数字正确 | |
| R-09 | Badge (LIVE) | 青色 4px 圆点 + pulse 动画 | 动画流畅 | |
| R-10 | 分隔线 | `rgba(255,255,255,0.06)` | Logo 下方和 Settings 上方各有分隔线 | |

### B.3 Context Panel 走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| P-01 | 面板宽度 | 240px | 实测正确 | |
| P-02 | 背景色 | `#050508` | 色值匹配 | |
| P-03 | 内容联动 | 点击不同 Rail 项 → Panel 内容切换 | 全部 10 个 Rail 项验证 | |
| P-04 | Agent 列表 | 列出所有 14 个 Agent 并显示状态 | 名称/状态/分组正确 | |
| P-05 | Agent 列表选中 | 紫色半透明背景 + 边框 | 视觉明显 | |
| P-06 | 搜索框 | 可过滤列表项 | 输入关键词后列表过滤正确 | |
| P-07 | 紧凑模式 | 窗口 < 1200px 时 Panel 隐藏，Cmd+B 打开浮层 | 浮层正确弹出和收回 | |
| P-08 | 滚动 | 内容超出时可滚动，自定义暗色滚动条 | 滚动流畅 | |

### B.4 Onboarding 走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| O-01 | 首次检测 | 首次启动进入 Onboarding，非首次直接进主界面 | 清空 store 后验证 | |
| O-02 | Step 1 欢迎页 | Logo + 标题 + 4 个特性卡片 + 主按钮 | 布局居中，间距正确 | |
| O-03 | Step 2 API Key | Claude 推荐标签 + 6 个 Provider 手风琴 | 展开/收起流畅 | |
| O-04 | Step 2 Key 输入 | 密码遮罩 + 眼睛切换 + 格式校验 | 三种状态 (正确/警告/错误) | |
| O-05 | Step 2 Keychain | Key 存入系统钥匙链 | Keychain Access 可查到 | |
| O-06 | Step 3 品牌设置 | 文本输入 + Tag 多选 | 选中态紫色高亮 | |
| O-07 | Step 4 完成动画 | 对勾弹性 + 文字 fade-in | 动画流畅无闪烁 | |
| O-08 | 过渡到主界面 | Onboarding 淡出 + 三栏淡入 | 无白屏/闪烁 | |
| O-09 | 跳过按钮 | 每步可跳过 | 跳过后正确进入下一步/主界面 | |
| O-10 | 返回按钮 | Step 2/3 可返回上一步 | 数据保留 | |
| O-11 | 进度指示器 | 三圆点，当前紫色，其余灰色 | 步骤切换时圆点正确更新 | |

### B.5 Settings 页面走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| S-01 | 全页面渲染 | 不是 Sheet 弹出，是 Main Content 内嵌 | Settings 在主内容区渲染 | |
| S-02 | Context Panel 导航 | 9 个设置分类列表 | 点击切换正确 | |
| S-03 | API Key 管理 | 6 个 Provider 展示 + 状态标记 | 已配置绿色/未配置琥珀色 | |
| S-04 | 默认模型选择 | 下拉选择 + 未配置 Key 警告 | 选择正确保存 | |
| S-05 | Agent 级模型 | per-Agent 模型选择表格 | 自定义/继承策略正确 | |
| S-06 | AI 功能开关 | 6 个 Toggle | 开关状态正确保存和读取 | |
| S-07 | 安全提示 | "API Key 通过 Keychain 加密存储" | 文案正确显示 | |

### B.6 Agent 聊天走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| C-01 | 聊天顶部信息栏 | Agent 名称 + 角色 + 模型 | 信息正确 | |
| C-02 | Agent 消息气泡 | 暗色背景 + 浅色边框 + 圆角 16px | 样式匹配 | |
| C-03 | User 消息气泡 | 紫色半透明背景 | 样式匹配 | |
| C-04 | 输入框 | 底部固定 + focus 紫色边框 | 聚焦效果可见 | |
| C-05 | @Agent 路由 | 输入 @ 弹出浮窗 + 选择 Agent | 浮窗正确弹出和选择 | |
| C-06 | 流式输出 | 打字机效果 + 紫色光标 | 逐字显示无卡顿 | |
| C-07 | 消息历史 | 滚动查看历史消息 | 自动滚动到底部 | |

### B.7 系统集成走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| I-01 | 系统托盘图标 | 4 种状态变体 | macOS/Windows 图标正确 | |
| I-02 | 托盘右键菜单 | 8 个菜单项 | 菜单弹出正确 | |
| I-03 | 关闭到托盘 | X 按钮隐藏不退出 | 首次弹确认 + 后续直接隐藏 | |
| I-04 | Cmd+Q 退出 | 真正退出应用 | 进程完全终止 | |
| I-05 | 系统通知 | Agent 完成时推送 | 通知可见 + 点击跳转 | |
| I-06 | Command Palette | Cmd+K 打开 | 遮罩 + 面板 + 搜索可用 | |
| I-07 | 快捷键 Cmd+1~9 | 切换页面 | 全部 9 个快捷键验证 | |
| I-08 | Cmd+B | 切换 Context Panel | Panel 显示/隐藏 | |
| I-09 | macOS 菜单栏 | 7 个菜单 | 菜单内容和快捷键正确 | |

### B.8 色彩一致性走查

| # | 检查项 | 设计规格 | 通过标准 | 结果 |
|---|--------|----------|----------|------|
| V-01 | 主背景 | `#030305` | DevTools 取色验证 | |
| V-02 | 面板背景 | `#050508` | Activity Rail + Context Panel | |
| V-03 | 卡片背景 | `#0a0a0f` | cotify-card 组件 | |
| V-04 | 主色 | `#a78bfa` | 选中态/按钮/指示条 | |
| V-05 | 辅助色 | `#22d3ee` | LIVE badge / 图表 | |
| V-06 | cotify-glow | 紫色环境光晕 | Main Content 背景可见 | |
| V-07 | cotify-glass | 毛玻璃效果 | Header Bar 背景模糊 | |
| V-08 | 边框一致性 | `rgba(255,255,255,0.06)` | 各面板分隔线 | |
| V-09 | 文字层级 | 四档白色透明度 | 主文字/辅助/三级/四级色 | |

---

**走查流程：**
1. @DEV 完成页面实现后通知 @Designer
2. @Designer 使用此清单逐项检查 (共 ~60 项)
3. 每项标记 Pass / Fail / Minor
4. Fail 项回给 @DEV 修复
5. Minor 项记录但不阻塞发布
6. 全部 Pass 后签署设计走查通过

---

*文档结束*
