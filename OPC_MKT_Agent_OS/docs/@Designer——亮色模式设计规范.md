# 亮色模式（Light Mode）设计规范

**文档类型**: UI/UX 设计规范
**完成时间**: 2026-03-26
**参与人员**: @Designer (UI 设计师)
**设计参考**: ClawX 亮色模式风格 + OPC MKT 品牌紫色 Accent

---

## 一、设计策略

### 1.1 核心原则

- **暗色模式不动** — 现有 Cotify Dark Theme 完全保留
- **亮色模式新增** — 参考 ClawX 的亮色设计细节（不是布局）
- **三种切换模式** — 暗色 / 亮色 / 跟随系统
- **品牌一致性** — 亮色模式仍以 `#a78bfa` 紫色作为 Accent，不改蓝色

### 1.2 从 ClawX 亮色模式借鉴的设计语言

| 借鉴要素 | ClawX 做法 | 我们的适配 |
|----------|-----------|-----------|
| 背景色 | 浅灰白 `#f5f5f5` | 采用 `#fafafa` 主背景 + `#f5f5f5` 侧边栏 |
| 卡片 | 白底 + 浅灰边框 + 微弱阴影 | `#ffffff` + `#e5e5e5` border + `shadow-sm` |
| 侧边栏 | 浅色底，选中项轻微高亮 | `#f5f5f5` 底，选中 `#a78bfa/8` 紫色淡底 |
| 标题字体 | 衬线体大标题，质感强 | 大标题使用 `font-serif`（Georgia / 思源宋体），正文保持无衬线 |
| 主色按钮 | 蓝色 | 保持紫色 `#7c3aed`（比暗色稍深，保证对比度） |
| 输入框 | 白底 + 灰色边框 | `#ffffff` + `#d4d4d8` border |
| 状态标签 | 柔和彩色背景 | 降低饱和度 + 提高亮度的 pastel 色 |

### 1.3 亮色模式整体视觉氛围

```
暗色模式:                           亮色模式:
┌─────────┬────────────────────┐   ┌─────────┬────────────────────┐
│ #050508 │     #030305        │   │ #f5f5f5 │     #fafafa        │
│ 深黑    │     纯黑背景        │   │ 浅灰    │     近白背景        │
│ sidebar │     cotify-glow    │   │ sidebar │     subtle-glow    │
│         │                    │   │         │                    │
│ 紫色    │     白色文字        │   │ 紫色    │     深灰文字        │
│ accent  │     高对比度        │   │ accent  │     柔和对比度      │
└─────────┴────────────────────┘   └─────────┴────────────────────┘
```

---

## 二、CSS 变量映射表

### 2.1 完整变量对照（Dark vs Light）

以下为 globals.css 中需要定义的亮色模式变量，与暗色模式一一对应：

| CSS 变量 | 暗色模式值 | 亮色模式值 | 说明 |
|----------|-----------|-----------|------|
| `--background` | `#030305` | `#fafafa` | 主背景 |
| `--foreground` | `#ffffff` | `#18181b` | 主文字 |
| `--card` | `#0a0a0f` | `#ffffff` | 卡片背景 |
| `--card-foreground` | `#ffffff` | `#18181b` | 卡片文字 |
| `--popover` | `#0a0a0f` | `#ffffff` | 弹出层背景 |
| `--popover-foreground` | `#ffffff` | `#18181b` | 弹出层文字 |
| `--primary` | `#a78bfa` | `#7c3aed` | 主色（亮色下加深保证对比度） |
| `--primary-foreground` | `#ffffff` | `#ffffff` | 主色上的文字 |
| `--secondary` | `#0f0f18` | `#f4f4f5` | 次要背景 |
| `--secondary-foreground` | `rgba(255,255,255,0.7)` | `#3f3f46` | 次要文字 |
| `--muted` | `#0f0f18` | `#f4f4f5` | 静音区域背景 |
| `--muted-foreground` | `rgba(255,255,255,0.4)` | `#71717a` | 静音文字 |
| `--accent` | `#a78bfa` | `#7c3aed` | 强调色 |
| `--accent-foreground` | `#ffffff` | `#ffffff` | 强调色文字 |
| `--destructive` | `#ef4444` | `#dc2626` | 危险色（亮色下稍深） |
| `--border` | `rgba(255,255,255,0.08)` | `#e4e4e7` | 边框 |
| `--input` | `rgba(255,255,255,0.08)` | `#e4e4e7` | 输入框边框 |
| `--ring` | `#a78bfa` | `#7c3aed` | 聚焦环 |
| `--chart-1` | `#a78bfa` | `#7c3aed` | 图表色1 |
| `--chart-2` | `#22d3ee` | `#0891b2` | 图表色2（亮色下加深） |
| `--chart-3` | `#818cf8` | `#6366f1` | 图表色3 |
| `--chart-4` | `#67e8f9` | `#06b6d4` | 图表色4 |
| `--chart-5` | `#c084fc` | `#9333ea` | 图表色5 |
| `--sidebar` | `#050508` | `#f5f5f5` | 侧边栏背景 |
| `--sidebar-foreground` | `rgba(255,255,255,0.85)` | `#3f3f46` | 侧边栏文字 |
| `--sidebar-primary` | `#a78bfa` | `#7c3aed` | 侧边栏主色 |
| `--sidebar-primary-foreground` | `#ffffff` | `#ffffff` | 侧边栏主色文字 |
| `--sidebar-accent` | `rgba(167,139,250,0.08)` | `rgba(124,58,237,0.06)` | 侧边栏选中背景 |
| `--sidebar-accent-foreground` | `#ffffff` | `#18181b` | 侧边栏选中文字 |
| `--sidebar-border` | `rgba(255,255,255,0.06)` | `#e4e4e7` | 侧边栏边框 |
| `--sidebar-ring` | `#a78bfa` | `#7c3aed` | 侧边栏聚焦环 |

### 2.2 亮色模式专属变量（新增）

除了与暗色对应的变量外，亮色模式还需要以下额外语义化变量：

| CSS 变量 | 值 | 说明 |
|----------|-----|------|
| `--light-elevated` | `#ffffff` | 浮起的卡片/面板（白色） |
| `--light-sunken` | `#f0f0f2` | 凹陷的区域（略深于背景） |
| `--light-divider` | `#e4e4e7` | 分隔线 |
| `--light-shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | 微弱阴影 |
| `--light-shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | 中等阴影 |
| `--light-shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | 大阴影（Hover Card 等） |

### 2.3 globals.css 实现方案

```css
/* ═══ Light Mode (ClawX-inspired) ═══ */
:root {
  /* 亮色模式变量已经在 :root 中定义（shadcn 默认亮色） */
  /* 以下覆盖为 ClawX 风格的亮色值 */
  --background: #fafafa;
  --foreground: #18181b;
  --card: #ffffff;
  --card-foreground: #18181b;
  --popover: #ffffff;
  --popover-foreground: #18181b;
  --primary: #7c3aed;
  --primary-foreground: #ffffff;
  --secondary: #f4f4f5;
  --secondary-foreground: #3f3f46;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --accent: #7c3aed;
  --accent-foreground: #ffffff;
  --destructive: #dc2626;
  --border: #e4e4e7;
  --input: #e4e4e7;
  --ring: #7c3aed;
  --chart-1: #7c3aed;
  --chart-2: #0891b2;
  --chart-3: #6366f1;
  --chart-4: #06b6d4;
  --chart-5: #9333ea;
  --sidebar: #f5f5f5;
  --sidebar-foreground: #3f3f46;
  --sidebar-primary: #7c3aed;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(124,58,237,0.06);
  --sidebar-accent-foreground: #18181b;
  --sidebar-border: #e4e4e7;
  --sidebar-ring: #7c3aed;
}

/* 暗色模式覆盖（保持现有不变） */
.dark {
  /* ... 现有 Cotify 暗色变量全部保留 ... */
}
```

**ThemeProvider 配置更新：**
```tsx
// layout.tsx — 启用系统跟随
<ThemeProvider
  attribute="class"
  defaultTheme="dark"        // 默认暗色
  enableSystem={true}         // 改为 true，支持跟随系统
  disableTransitionOnChange
>
```

---

## 三、字体层级（亮色模式特殊处理）

### 3.1 ClawX 风格大标题

ClawX 亮色模式的一个显著特征是大标题使用衬线体，产生"杂志感"质感。我们在亮色模式下引入衬线体标题，暗色模式保持无衬线。

**衬线字体栈：**
```css
--font-serif: Georgia, "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif;
```

| 层级 | 暗色模式 | 亮色模式 | Tailwind |
|------|---------|---------|----------|
| H1 (页面标题) | 24px, 700, sans-serif | 28px, 700, **serif** | `text-2xl font-bold` / `light:text-[28px] light:font-serif` |
| H2 (区块标题) | 18px, 600, sans-serif | 20px, 600, **serif** | `text-lg font-semibold` / `light:text-xl light:font-serif` |
| H3 (卡片标题) | 15px, 600, sans-serif | 15px, 600, sans-serif | `text-[15px] font-semibold` (两模式相同) |
| Body | 14px, 400, sans-serif | 14px, 400, sans-serif | `text-sm` (两模式相同) |
| Caption | 12px, 500, sans-serif | 12px, 500, sans-serif | `text-xs font-medium` (两模式相同) |
| Overline | 11px, 600, sans-serif | 11px, 600, sans-serif | `text-[11px] font-semibold` (两模式相同) |

### 3.2 文字颜色层级

| 层级 | 暗色模式 | 亮色模式 |
|------|---------|---------|
| 主文字 | `#ffffff` | `#18181b` (zinc-900) |
| 次要文字 | `rgba(255,255,255,0.7)` | `#52525b` (zinc-600) |
| 辅助文字 | `rgba(255,255,255,0.4)` | `#71717a` (zinc-500) |
| 禁用文字 | `rgba(255,255,255,0.2)` | `#a1a1aa` (zinc-400) |
| 链接 | `#a78bfa` | `#7c3aed` |
| 链接悬停 | `#c4b5fd` | `#6d28d9` |

---

## 四、关键组件亮色模式样式

### 4.1 Sidebar

**暗色模式（现有）：**
```
背景: #050508
文字: rgba(255,255,255,0.4)
选中: bg rgba(167,139,250,0.1) + border rgba(167,139,250,0.15)
Hover: rgba(255,255,255,0.03)
分隔线: rgba(255,255,255,0.06)
Logo: 紫→青渐变
```

**亮色模式：**
```
背景: #f5f5f5
文字: #71717a (zinc-500)
选中: bg rgba(124,58,237,0.06) + text #7c3aed + 左侧 3px 紫色竖条
Hover: rgba(0,0,0,0.03)
分隔线: #e4e4e7
Logo: 紫→青渐变（保持不变）
```

**Tailwind 参考（亮色）：**
```
侧边栏容器: bg-[#f5f5f5] border-r border-[#e4e4e7]
导航项默认: text-zinc-500 hover:text-zinc-700 hover:bg-black/[0.03]
导航项选中: text-[#7c3aed] bg-[#7c3aed]/[0.06] border-l-[3px] border-[#7c3aed]
Logo 文字: text-zinc-900 font-semibold
用户名: text-zinc-900
用户角色: text-zinc-400
```

### 4.2 Header

**暗色模式（现有）：**
```
背景: rgba(3,3,5,0.6) + backdrop-blur
边框: rgba(255,255,255,0.06)
标题: text-white
辅助文字: rgba(255,255,255,0.3)
```

**亮色模式：**
```
背景: rgba(255,255,255,0.8) + backdrop-blur
边框: #e4e4e7
标题: #18181b
辅助文字: #a1a1aa
```

**Tailwind 参考（亮色）：**
```
Header 容器: bg-white/80 backdrop-blur-xl border-b border-[#e4e4e7]
页面标题: text-zinc-900 font-semibold
任务进度标签【n/m】: bg-[#7c3aed]/[0.08] text-[#7c3aed]
"当前任务：" 标签: text-zinc-400
任务名称: text-zinc-900 font-medium
通知/设置图标: text-zinc-400 hover:text-zinc-600
分隔线: border-[#e4e4e7]
```

### 4.3 卡片（cotify-card 亮色版）

**暗色模式（现有）：**
```css
.cotify-card {
  background: #0a0a0f;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
}
.cotify-card:hover {
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
```

**亮色模式：**
```css
:root .cotify-card,
:not(.dark) .cotify-card {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
:root .cotify-card:hover,
:not(.dark) .cotify-card:hover {
  border-color: #d4d4d8;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}
```

**Tailwind 参考（亮色卡片）：**
```
bg-white border border-zinc-200 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]
hover:border-zinc-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]
transition-all duration-200
```

### 4.4 毛玻璃效果（cotify-glass 亮色版）

**暗色模式（现有）：**
```css
.cotify-glass {
  background: rgba(5,5,8,0.7);
  backdrop-filter: blur(24px) saturate(1.3);
  border: 1px solid rgba(255,255,255,0.06);
}
```

**亮色模式：**
```css
:root .cotify-glass,
:not(.dark) .cotify-glass {
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid rgba(0,0,0,0.06);
}
```

### 4.5 辉光效果（cotify-glow 亮色版）

**暗色模式（现有）：**
```css
.cotify-glow {
  background: radial-gradient(600px circle at 50% 30%, rgba(167,139,250,0.06), transparent 70%);
}
```

**亮色模式：**
```css
:root .cotify-glow,
:not(.dark) .cotify-glow {
  background: radial-gradient(600px circle at 50% 30%, rgba(124,58,237,0.03), transparent 70%);
}
```

暗色下辉光明显（0.06 opacity），亮色下极淡（0.03 opacity），保持微妙氛围而不喧宾夺主。

### 4.6 输入框 / 下拉框

**暗色模式：**
```
bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20
focus:border-[#a78bfa]/50 focus:ring-1 focus:ring-[#a78bfa]/20
```

**亮色模式：**
```
bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400
focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/20
shadow-sm
```

### 4.7 按钮

**主按钮：**

| 状态 | 暗色模式 | 亮色模式 |
|------|---------|---------|
| Default | `bg-[#a78bfa] text-white` | `bg-[#7c3aed] text-white shadow-sm` |
| Hover | `bg-[#9371f0]` | `bg-[#6d28d9]` |
| Active | `bg-[#8b5cf6]` | `bg-[#5b21b6]` |
| Disabled | `bg-[#a78bfa]/30 text-white/50` | `bg-[#7c3aed]/30 text-white/70` |

**次要按钮 / Ghost 按钮：**

| 状态 | 暗色模式 | 亮色模式 |
|------|---------|---------|
| Default | `text-white/40 bg-transparent` | `text-zinc-600 bg-transparent` |
| Hover | `text-white/70 bg-white/[0.04]` | `text-zinc-900 bg-zinc-100` |
| Active | `text-white bg-white/[0.06]` | `text-zinc-900 bg-zinc-200` |

**边框按钮 / Outline：**

| 状态 | 暗色模式 | 亮色模式 |
|------|---------|---------|
| Default | `border-white/[0.08] text-white/60` | `border-zinc-300 text-zinc-700` |
| Hover | `border-white/[0.15] text-white` | `border-zinc-400 text-zinc-900 bg-zinc-50` |

### 4.8 状态标签 / Badge

亮色模式下使用 pastel 色背景（降饱和 + 高亮度），暗色模式保持现有。

| 状态 | 暗色背景 | 暗色文字 | 亮色背景 | 亮色文字 |
|------|---------|---------|---------|---------|
| Busy / 执行中 | `rgba(239,68,68,0.12)` | `#ef4444` | `#fef2f2` | `#dc2626` |
| Pending / 等待 | `rgba(245,158,11,0.12)` | `#f59e0b` | `#fffbeb` | `#d97706` |
| Idle / 空闲 | `rgba(34,197,94,0.12)` | `#22c55e` | `#f0fdf4` | `#16a34a` |
| Offline / 离线 | `rgba(107,114,128,0.12)` | `#6b7280` | `#f4f4f5` | `#52525b` |
| LIVE 标签 | `rgba(34,211,238,0.1)` | `#22d3ee` | `#ecfeff` | `#0891b2` |
| 数字 Badge | `rgba(251,191,36,0.12)` | `#fbbf24` | `#fefce8` | `#ca8a04` |

### 4.9 Agent Avatar（Header 堆叠）

**亮色模式变化：**
- Avatar 边框: `2px solid #fafafa`（匹配亮色背景，而非 `#030305`）
- Avatar 背景色: Agent 专属色保持不变（色彩鲜艳，在浅色背景上更突出）
- 状态圆点边框: `2px solid #fafafa`
- Offline 半透明: `opacity-40`（亮色下 0.4 比暗色下 0.5 更合适）
- +N 计数器: `bg-zinc-200 text-zinc-500`
- Hover Card: `bg-white border-zinc-200 shadow-lg`

**Tailwind 参考（亮色 Avatar）：**
```
Avatar: border-2 border-[#fafafa]
+N 计数器: bg-zinc-200 text-zinc-500
Hover Card: bg-white border border-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.12)] rounded-xl
```

### 4.10 Agent Hover Card（亮色版）

**暗色模式：**
```
背景: #0a0a0f
边框: rgba(255,255,255,0.08)
阴影: 0 8px 32px rgba(0,0,0,0.5)
分隔线: rgba(255,255,255,0.06)
```

**亮色模式：**
```
背景: #ffffff
边框: #e4e4e7
阴影: 0 8px 24px rgba(0,0,0,0.12)
分隔线: #f4f4f5
Agent 名称: text-zinc-900
状态文字: 对应状态色（亮色版）
任务描述: text-zinc-600
时间文字: text-zinc-400
链接: text-[#7c3aed] hover:text-[#6d28d9]
进度条背景: bg-zinc-100
```

### 4.11 Status Bar（底部状态栏）

**暗色模式：**
```
背景: #030305
边框: rgba(255,255,255,0.06)
文字: rgba(255,255,255,0.3)
```

**亮色模式：**
```
背景: #f5f5f5
边框: #e4e4e7
文字: #a1a1aa (zinc-400)
```

### 4.12 Command Palette

**暗色模式：**
```
背景: #0a0a0f
边框: rgba(255,255,255,0.08)
遮罩: bg-black/40
```

**亮色模式：**
```
背景: #ffffff
边框: #e4e4e7
阴影: 0 16px 48px rgba(0,0,0,0.15)
遮罩: bg-black/20
搜索框: bg-white border-b border-zinc-200
结果项: hover:bg-zinc-50
选中项: bg-[#7c3aed]/[0.06] text-zinc-900
分组标题: text-zinc-400
快捷键: bg-zinc-100 text-zinc-500
```

---

## 五、Cotify 工具类亮色适配

### 5.1 CSS 实现方案

在 globals.css 中，通过 `:not(.dark)` 选择器为所有 cotify 工具类添加亮色变体：

```css
/* ═══ Cotify utility classes — Light Mode variants ═══ */

:not(.dark) .cotify-glow {
  background: radial-gradient(600px circle at 50% 30%, rgba(124,58,237,0.03), transparent 70%);
}

:not(.dark) .cotify-glow-cyan {
  background: radial-gradient(400px circle at 70% 50%, rgba(8,145,178,0.03), transparent 60%);
}

:not(.dark) .cotify-gradient-text {
  background: linear-gradient(135deg, #7c3aed, #0891b2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:not(.dark) .cotify-card {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
}

:not(.dark) .cotify-card:hover {
  border-color: #d4d4d8;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

:not(.dark) .cotify-glass {
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid rgba(0,0,0,0.06);
}
```

### 5.2 Layout 背景色适配

现有 `layout.tsx` 中硬编码了 `style={{ background: '#030305' }}`，需改为 CSS 变量：

```tsx
// Before (硬编码暗色)
<div className="flex h-screen overflow-hidden" style={{ background: '#030305' }}>

// After (跟随主题)
<div className="flex h-screen overflow-hidden bg-background">
```

同理，`sidebar.tsx` 和 `header.tsx` 中的硬编码颜色值需要替换为 CSS 变量或 Tailwind 主题类。

---

## 六、主题切换 UI

### 6.1 切换入口位置

在 Settings Panel 中新增"外观"（Appearance）区块，放在最顶部：

```
┌─────────────────────────────────────┐
│  设置                                │
├─────────────────────────────────────┤
│  外观                                │
│                                     │
│  ○ 亮色    ● 暗色    ○ 跟随系统      │
│                                     │
├─────────────────────────────────────┤
│  AI Provider                        │
│  ...                                │
└─────────────────────────────────────┘
```

### 6.2 切换控件规范

**三选一 Segmented Control：**
- 容器: `h-9 rounded-lg bg-zinc-100 dark:bg-white/[0.06] p-1 flex gap-0.5`
- 选项: `px-3 py-1 rounded-md text-xs font-medium transition-all`
- 选中（亮色下）: `bg-white text-zinc-900 shadow-sm`
- 选中（暗色下）: `bg-white/[0.1] text-white`
- 未选中: `text-zinc-500 dark:text-white/40 hover:text-zinc-700 dark:hover:text-white/60`

**图标辅助（可选）：**
- 亮色: `Sun` (lucide)
- 暗色: `Moon` (lucide)
- 系统: `Monitor` (lucide)

### 6.3 切换实现

```tsx
import { useTheme } from 'next-themes';

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: '亮色', icon: Sun },
    { value: 'dark', label: '暗色', icon: Moon },
    { value: 'system', label: '系统', icon: Monitor },
  ];

  return (
    <div className="flex gap-0.5 p-1 rounded-lg bg-zinc-100 dark:bg-white/[0.06]">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition-all',
            theme === opt.value
              ? 'bg-white dark:bg-white/[0.1] text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 dark:text-white/40 hover:text-zinc-700 dark:hover:text-white/60'
          )}
        >
          <opt.icon className="h-3.5 w-3.5 inline mr-1" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

---

## 七、过渡动画

### 7.1 主题切换过渡

当前 ThemeProvider 设置了 `disableTransitionOnChange`（避免切换闪烁）。建议保留此设置，因为全局过渡在 Electron 桌面端可能造成性能抖动。

如果将来需要平滑过渡，可以改为：
```css
html:not(.disable-transitions) * {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

---

## 八、硬编码颜色迁移清单

以下文件中存在硬编码的暗色模式颜色值，需要迁移到 CSS 变量或 `dark:` / 默认 Tailwind 类以支持双主题：

| 文件 | 硬编码示例 | 迁移方案 |
|------|-----------|----------|
| `layout.tsx` L49 | `style={{ background: '#030305' }}` | 改为 `className="bg-background"` |
| `sidebar.tsx` L43 | `background: '#050508'` | 改为 `className="bg-sidebar"` |
| `sidebar.tsx` L45 | `borderRight: '1px solid rgba(255,255,255,0.06)'` | 改为 `border-r border-sidebar-border` |
| `header.tsx` L23 | `background: 'rgba(3,3,5,0.6)'` | 改为 `.cotify-glass` 类（已有亮色适配） |
| `header.tsx` L38 | `color: 'rgba(255,255,255,0.3)'` | 改为 `text-muted-foreground` |
| 各组件 inline style | `rgba(255,255,255,0.x)` | 改为对应 Tailwind `text-white/x dark:text-white/x` + 亮色对应值 |

**注意**: 这不是要求立即全部迁移。迁移应在 @DEV 实现亮色模式时逐步完成。此清单作为 @DEV 的迁移参考。

---

## 九、设计走查检查项（亮色模式）

| # | 检查项 | 标准 |
|---|--------|------|
| 1 | 主背景色 | `#fafafa`（不是纯白 `#fff`） |
| 2 | 侧边栏背景 | `#f5f5f5`（与主背景有层次差） |
| 3 | 卡片背景 | `#ffffff` + `border-zinc-200` + `shadow-sm` |
| 4 | 主色 Primary | `#7c3aed`（比暗色深，WCAG AA 对比度 >= 4.5:1） |
| 5 | 主文字 | `#18181b` on `#fafafa` = 对比度 17.4:1 (AAA) |
| 6 | 次要文字 | `#71717a` on `#fafafa` = 对比度 4.7:1 (AA) |
| 7 | 大标题衬线体 | H1/H2 使用 `font-serif`（Georgia / Noto Serif SC） |
| 8 | H3 及以下 | 保持 sans-serif，两模式一致 |
| 9 | 输入框 | 白底 + `border-zinc-300` + `shadow-sm` |
| 10 | 主按钮 | `bg-[#7c3aed] text-white shadow-sm` |
| 11 | Ghost 按钮 hover | `bg-zinc-100`（不是透明白） |
| 12 | 状态标签 | Pastel 色背景（如 `#fef2f2` 红色系） |
| 13 | Agent Avatar 边框 | `border-[#fafafa]`（匹配背景） |
| 14 | Hover Card 阴影 | `shadow-lg` 而非暗色下的 `rgba(0,0,0,0.5)` 重阴影 |
| 15 | cotify-glow | 极淡紫辉光 opacity 0.03（不是 0.06） |
| 16 | cotify-glass | 白色半透明 `rgba(255,255,255,0.75)` |
| 17 | cotify-card hover | 浅灰边框 + 中等阴影（不是黑色重阴影） |
| 18 | 分隔线 | `#e4e4e7` 统一（不是 `rgba(0,0,0,x)`） |
| 19 | 主题切换控件 | Segmented Control 在 Settings 顶部 |
| 20 | 无硬编码暗色值残留 | 所有 `#030305` / `#050508` / `rgba(255,255,255,x)` 已迁移 |

---

**[@Designer] 亮色模式设计规范完成。参考 ClawX 亮色风格，覆盖完整 CSS 变量映射、9 大组件类型的暗/亮对照、衬线体标题、主题切换 UI、Cotify 工具类适配方案、硬编码迁移清单，以及 20 项设计走查检查项。等待确认后可交付 @DEV 实现。**
