# [@Designer] Context Vault「品牌设置」模块 UI 设计方案

**完成时间:** 2026-03-24
**参与人员:** @Designer (UI设计师)
**关联任务:** T1-D

---

## 1. 设计概述

在现有 Context Vault 页面中新增「品牌设置」区域，位于页面 **顶部**（Header 与 Tab Filter 之间），作为一个独立的可折叠 Section。包含三个子模块：

1. **产品 URL 抓取** — 输入 URL + 抓取按钮 + 产品卡片预览
2. **自定义 Skills** — 上传/编辑自定义技能文件
3. **邮箱配置** — 配置用于发送营销邮件的邮箱信息

---

## 2. 整体布局 (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│  Context Vault (H1)                    [导入JSON] [导出JSON] [新增资产]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ 品牌设置 Section (可折叠) ──────────────────────────────┐  │
│  │  [产品URL]  [自定义Skills]  [邮箱配置]   ← 内部 Tab 切换   │  │
│  │                                                         │  │
│  │  ┌─ Tab: 产品URL ────────────────────────────────────┐  │  │
│  │  │  ┌─────────────────────────────┐ ┌──────────┐    │  │  │
│  │  │  │  https://example.com/prod   │ │  抓取     │    │  │  │
│  │  │  └─────────────────────────────┘ └──────────┘    │  │  │
│  │  │                                                   │  │  │
│  │  │  ┌─ 产品卡片 Grid (2列) ──────────────────────┐  │  │  │
│  │  │  │  ┌─────────────┐  ┌─────────────┐          │  │  │  │
│  │  │  │  │ 🖼 缩略图    │  │ 🖼 缩略图    │          │  │  │  │
│  │  │  │  │ 产品名      │  │ 产品名      │          │  │  │  │
│  │  │  │  │ $29.99      │  │ $19.99      │          │  │  │  │
│  │  │  │  │ 描述摘要... │  │ 描述摘要... │          │  │  │  │
│  │  │  │  │ [编辑] [删除]│  │ [编辑] [删除]│          │  │  │  │
│  │  │  │  └─────────────┘  └─────────────┘          │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─ Tab: 自定义Skills ──────────────────────────────┐  │  │
│  │  │  ┌─ 拖拽上传区 ─────────────────────────────┐    │  │  │
│  │  │  │    📄 点击或拖拽上传 Skills 文件           │    │  │  │
│  │  │  │    支持 .txt / .md / .pdf                 │    │  │  │
│  │  │  └───────────────────────────────────────────┘    │  │  │
│  │  │                                                   │  │  │
│  │  │  ┌─ Skills 列表 ──────────────────────────────┐  │  │  │
│  │  │  │  📄 Brand Voice Guide                      │  │  │  │
│  │  │  │     品牌语调与写作规范    更新于 2026-03-20 [x]│  │  │  │
│  │  │  │  📄 Product Catalog                        │  │  │  │
│  │  │  │     完整产品目录         更新于 2026-03-18 [x]│  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  │                                                   │  │  │
│  │  │  ── 或手动输入 ──                                 │  │  │
│  │  │  ┌───────────────────────────────────────────┐    │  │  │
│  │  │  │  [Textarea: 输入自定义 skill 内容...]      │    │  │  │
│  │  │  └───────────────────────────────────────────┘    │  │  │
│  │  │  [+ 添加 Skill]                                  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌─ Tab: 邮箱配置 ─────────────────────────────────┐  │  │
│  │  │  邮箱地址:   [__________________________]        │  │  │
│  │  │  发件人别名:  [__________________________]        │  │  │
│  │  │  验证状态:   ● 已验证 / ○ 未验证                  │  │  │
│  │  │                                                   │  │  │
│  │  │                                   [保存配置]      │  │  │
│  │  │  ℹ️ Phase 2 将支持 SendGrid API Key 配置          │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                             │
├─ Tab Filter (全部 / 产品 / 品牌 / 受众 / 案例) ────────────┤
│                                                             │
│  ┌─ Asset List (现有资产列表，保持不变) ─────────────────┐  │
│  │  ...                                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 组件规范

### 3.1 品牌设置 Section 容器

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 背景 | #0a0a0f | `bg-[#0a0a0f]` |
| 边框 | rgba(255,255,255,0.08) | `style={{ border: '1px solid rgba(255,255,255,0.08)' }}` |
| 圆角 | 16px | `rounded-2xl` |
| 内边距 | 24px | `p-6` |
| 下边距 | 与 Tab Filter 间距 24px | (由父级 `space-y-6` 控制) |

**折叠/展开交互:**
- 标题栏始终可见：左侧图标 + "品牌设置" 文字 + 右侧 ChevronDown/Up
- 点击标题栏切换展开/折叠
- 默认状态：展开

```tsx
// 标题栏
<button className="flex items-center justify-between w-full">
  <div className="flex items-center gap-3">
    <div className="flex items-center justify-center size-9 rounded-lg bg-[#a78bfa]/20">
      <SettingsIcon className="size-4 text-[#a78bfa]" />
    </div>
    <h2 className="text-lg font-semibold text-white">品牌设置</h2>
    <Badge className="bg-[#22d3ee]/20 text-[#22d3ee] border-transparent text-xs">
      Brand Setup
    </Badge>
  </div>
  <ChevronDownIcon className="size-5" style={{ color: 'rgba(255,255,255,0.4)' }} />
</button>
```

### 3.2 内部 Tab 切换

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 容器背景 | rgba(255,255,255,0.04) | `style={{ background: 'rgba(255,255,255,0.04)' }}` |
| 圆角 | 8px | `rounded-lg` |
| 内边距 | 4px | `p-1` |
| Tab 间距 | 4px | `gap-1` |
| 激活态背景 | rgba(255,255,255,0.10) | `bg-white/10` |
| 激活态文字 | white | `text-white font-medium` |
| 非激活文字 | rgba(255,255,255,0.4) | `style={{ color: 'rgba(255,255,255,0.4)' }}` |

与现有 Context Vault 的 Tab Filter 样式完全一致。

```tsx
// 三个 Tab
const brandTabs = [
  { label: '产品 URL', value: 'product-url', icon: LinkIcon },
  { label: '自定义 Skills', value: 'skills', icon: FileTextIcon },
  { label: '邮箱配置', value: 'email', icon: MailIcon },
];
```

### 3.3 产品 URL 输入区

| 组件 | 样式 | Tailwind / Style |
|------|------|-----------------|
| Input 容器 | 横向排列，Input 占满剩余宽度 | `flex gap-3` |
| Input | shadcn Input，暗色主题 | `<Input placeholder="输入产品页面 URL..." />` |
| 抓取按钮 | 紫色渐变，与"新增资产"按钮一致 | `bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0` |
| 抓取中状态 | 按钮显示 Loader2Icon spin | `<Loader2Icon className="size-4 mr-1.5 animate-spin" />` |

```tsx
<div className="flex gap-3">
  <Input
    placeholder="输入产品页面 URL，如 https://example.com/product"
    className="flex-1"
  />
  <Button className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0 shrink-0">
    <GlobeIcon className="size-4 mr-1.5" />
    抓取
  </Button>
</div>
```

### 3.4 产品卡片

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 布局 | 2 列 Grid | `grid grid-cols-1 md:grid-cols-2 gap-4` |
| 卡片背景 | rgba(255,255,255,0.03) | `bg-white/[0.03]` |
| 卡片边框 | rgba(255,255,255,0.08) | `style={{ border: '1px solid rgba(255,255,255,0.08)' }}` |
| 卡片圆角 | 12px | `rounded-xl` |
| 卡片内边距 | 16px | `p-4` |
| Hover | border 变亮 + 上移 2px | `hover:border-white/[0.12] hover:-translate-y-0.5 transition-all` |
| 缩略图 | 圆角 8px，固定高度 160px | `rounded-lg h-40 w-full object-cover` |
| 产品名 | 14px, 白色, semibold | `text-sm font-semibold text-white` |
| 价格 | 16px, #a78bfa, bold | `text-base font-bold text-[#a78bfa]` |
| 描述 | 12px, rgba(255,255,255,0.4), 最多 2 行 | `text-xs line-clamp-2` + `style={{ color: 'rgba(255,255,255,0.4)' }}` |
| 操作按钮 | 编辑(outline) + 删除(ghost, 红色) | 见下方 |

```tsx
<div className="rounded-xl p-4 bg-white/[0.03] transition-all hover:-translate-y-0.5"
  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
>
  {/* 缩略图 */}
  {product.image && (
    <img src={product.image} alt="" className="rounded-lg h-40 w-full object-cover mb-3" />
  )}
  {/* 无图占位 */}
  {!product.image && (
    <div className="rounded-lg h-40 w-full flex items-center justify-center mb-3"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <PackageIcon className="size-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
    </div>
  )}
  <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
  {product.price && (
    <p className="text-base font-bold text-[#a78bfa] mt-1">{product.price}</p>
  )}
  <p className="text-xs line-clamp-2 mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
    {product.description}
  </p>
  <div className="flex gap-2 mt-3">
    <Button variant="outline" size="sm"
      className="border-white/[0.08] bg-transparent hover:bg-white/5 text-xs"
      style={{ color: 'rgba(255,255,255,0.6)' }}
    >
      编辑
    </Button>
    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
      删除
    </Button>
  </div>
</div>
```

**空状态:**
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <GlobeIcon className="size-10 mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
    输入产品 URL 并点击抓取，自动生成产品卡片
  </p>
</div>
```

### 3.5 自定义 Skills 区域

**上传区域:**
与现有 Context Vault 的图片上传区保持一致风格。

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 容器 | 虚线边框，可拖拽 | `border-2 border-dashed rounded-xl` |
| 高度 | 128px | `h-32` |
| 边框色 | rgba(255,255,255,0.08)，hover 变紫 | `hover:border-[#a78bfa]` |
| 图标 | FileUpIcon, 32px | `size-8` + `style={{ color: 'rgba(255,255,255,0.25)' }}` |
| 提示文字 | 14px, rgba(255,255,255,0.4) | `text-sm` |
| 支持格式 | .txt / .md / .pdf，单文件 10MB | `text-xs` |

```tsx
<label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#a78bfa] hover:bg-white/[0.02] transition-colors"
  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
>
  <FileUpIcon className="size-8 mb-2" style={{ color: 'rgba(255,255,255,0.25)' }} />
  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
    点击或拖拽上传 Skills 文件
  </span>
  <span className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
    支持 .txt / .md / .pdf，单文件 ≤ 10MB
  </span>
  <input type="file" accept=".txt,.md,.pdf" multiple className="hidden" />
</label>
```

**Skills 列表（含名称、描述、更新时间）:**

| 属性 | 值 | Tailwind / Style |
|------|-----|-----------------|
| 容器 | 圆角列表，分割线 | `rounded-xl overflow-hidden` + `style={{ border: '1px solid rgba(255,255,255,0.08)' }}` |
| 行内边距 | 16px 水平, 14px 垂直 | `py-3.5 px-4` |
| 文件图标 | FileTextIcon, 16px, 紫色 | `size-4 text-[#a78bfa]` |
| Skill 名称 | 13px, 白色, medium | `text-[13px] font-medium text-white` |
| 描述 | 12px, rgba(255,255,255,0.4) | `text-xs` + style |
| 更新时间 | 12px, rgba(255,255,255,0.25) | `text-xs` + style |
| 操作 | 编辑(PencilIcon) + 删除(XIcon), ghost | hover 变色 |

```tsx
<div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
  {skills.map((skill, idx) => (
    <div key={idx} className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02]"
      style={idx < skills.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.08)' } : undefined}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center size-8 rounded-lg bg-[#a78bfa]/20 shrink-0">
          <FileTextIcon className="size-4 text-[#a78bfa]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white truncate">{skill.name}</p>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {skill.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {skill.updatedAt}
        </span>
        <button className="text-white/25 hover:text-[#a78bfa] transition-colors" title="编辑">
          <PencilIcon className="size-3.5" />
        </button>
        <button className="text-white/25 hover:text-red-400 transition-colors" title="删除">
          <XIcon className="size-3.5" />
        </button>
      </div>
    </div>
  ))}
</div>
```

**手动输入区（分隔线 + Textarea）:**

```tsx
<div className="flex items-center gap-3 my-4">
  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
  <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>或手动输入</span>
  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
</div>

<Textarea placeholder="输入自定义 skill 内容..." className="min-h-[120px] resize-y" />

<Button variant="outline" size="sm" className="mt-3 border-white/[0.08] bg-transparent hover:bg-white/5"
  style={{ color: 'rgba(255,255,255,0.6)' }}
>
  <PlusIcon className="size-4 mr-1.5" />
  添加 Skill
</Button>
```

### 3.6 邮箱配置区域

Phase 1 邮箱配置采用简洁方案：邮箱地址 + 发件人别名 + 验证状态。Phase 2 将扩展 SendGrid API Key。

| 组件 | 说明 | Tailwind / Style |
|------|------|-----------------|
| 表单布局 | 垂直堆叠，label + input | `space-y-4` |
| Label | 13px, rgba(255,255,255,0.6), medium | `text-[13px] font-medium` + style |
| Input | shadcn Input | 默认暗色主题 |
| 验证状态 | Badge 显示已验证/未验证 | 绿色/amber Badge |
| 底部按钮 | 右对齐保存按钮 | `flex justify-end` |

```tsx
<div className="space-y-4">
  {/* 邮箱地址 */}
  <div className="space-y-1.5">
    <label className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
      邮箱地址 <span className="text-red-500">*</span>
    </label>
    <Input placeholder="your@company.com" />
  </div>

  {/* 发件人别名 */}
  <div className="space-y-1.5">
    <label className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
      发件人别名（显示名）
    </label>
    <Input placeholder="OPC Marketing Team" />
  </div>

  {/* 验证状态 */}
  <div className="space-y-1.5">
    <label className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
      验证状态
    </label>
    <div className="flex items-center gap-2">
      {/* 已验证状态 */}
      <Badge className="bg-emerald-500/20 text-emerald-400 border-transparent">
        <CheckCircleIcon className="size-3 mr-1" />
        已验证
      </Badge>
      {/* 未验证状态（替代显示） */}
      {/* <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
        <AlertCircleIcon className="size-3 mr-1" />
        未验证
      </Badge> */}
    </div>
  </div>

  {/* Phase 2 提示 */}
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
    style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}
  >
    <InfoIcon className="size-4 text-[#a78bfa] shrink-0" />
    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
      Phase 2 将支持 SendGrid API Key 配置，实现高级邮件发送功能
    </span>
  </div>

  {/* 保存按钮 */}
  <div className="flex justify-end pt-2">
    <Button className="bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-90 border-0">
      保存配置
    </Button>
  </div>
</div>
```

**保存状态反馈:**
- 保存中: Button 内 Loader2 spin
- 成功: 紫色 toast `"邮箱配置已保存"` — `style={{ background: 'rgba(167,139,250,0.9)' }}`
- 验证流程: 保存后自动触发验证，验证状态 Badge 实时更新

---

## 4. 配色方案

与现有 Context Vault 页面完全一致：

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | #030305 | 由 layout 控制 |
| 卡片/Section 背景 | #0a0a0f | `bg-[#0a0a0f]` |
| 主 accent | #a78bfa | 紫色，按钮、图标高亮 |
| 渐变按钮 | #a78bfa → #7c3aed | `from-[#a78bfa] to-[#7c3aed]` |
| 辅助 accent | #22d3ee | 青色，Badge、状态指示 |
| 边框 | rgba(255,255,255,0.08) | 统一边框色 |
| 主文字 | #ffffff | 标题、重要信息 |
| 次文字 | rgba(255,255,255,0.6) | Label、说明 |
| 辅助文字 | rgba(255,255,255,0.4) | 描述、placeholder |
| 弱文字 | rgba(255,255,255,0.25) | 时间戳、提示 |
| 成功 | #22c55e (emerald-500) | 连接成功 |
| 危险 | #ef4444 (red-500) | 删除、错误 |

---

## 5. 字体层级

| 层级 | 字号 | 字重 | Tailwind | 用途 |
|------|------|------|----------|------|
| Section 标题 | 18px | 600 | `text-lg font-semibold` | "品牌设置" |
| 卡片标题 | 14px | 600 | `text-sm font-semibold` | 产品名 |
| 价格 | 16px | 700 | `text-base font-bold` | 产品价格 |
| Label | 13px | 500 | `text-[13px] font-medium` | 表单标签 |
| 正文 | 14px | 400 | `text-sm` | 输入内容 |
| 辅助文字 | 12px | 400 | `text-xs` | 描述、提示 |

---

## 6. 交互设计

### 6.1 折叠/展开
- 点击 Section 标题栏 → 切换展开/折叠
- 动画: `transition-all duration-200`，内容区域 max-height 过渡
- 折叠时 Chevron 旋转 180deg

### 6.2 Tab 切换
- 点击 Tab → 切换子模块内容，无页面跳转
- 激活态有背景高亮 + 文字变白

### 6.3 产品 URL 抓取
- 输入 URL → 点击"抓取"按钮
- 按钮进入 loading 态 (Loader2 spin + 禁用)
- 抓取成功 → 产品卡片追加到 Grid
- 抓取失败 → 显示紫色 toast 提示错误原因

### 6.4 产品卡片
- Hover: 边框变亮 `rgba(255,255,255,0.12)` + 上移 2px
- 编辑: 打开编辑弹窗 (复用 Sheet 侧边栏)
- 删除: 二次确认 Dialog → 删除

### 6.5 文件上传
- 拖拽进入: 边框变紫 `border-[#a78bfa]`
- 上传中: 文件行显示进度条
- 完成: 文件出现在列表中

### 6.6 邮箱保存
- 保存: 按钮 loading → toast 提示成功/失败
- 测试连接: 按钮 loading → toast 提示连接结果

---

## 7. 响应式适配

| 断点 | 变化 |
|------|------|
| Desktop (≥1280px) | 产品卡片 2 列 Grid |
| Tablet (768-1279px) | 产品卡片 2 列，Section 内边距减小到 p-4 |
| Mobile (<768px) | 产品卡片 1 列，SMTP+端口堆叠为纵向，内部 Tab 可横向滚动 |

```tsx
// 产品卡片 Grid 响应式
className="grid grid-cols-1 md:grid-cols-2 gap-4"

// SMTP + 端口响应式
className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3"
```

---

## 8. 组件依赖

使用现有 shadcn/ui 组件，无需新增第三方依赖：

- `Button`, `Input`, `Textarea`, `Badge` — 已有
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` — 已有
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` — 已有 (用于删除确认)
- lucide-react 图标: `LinkIcon`, `GlobeIcon`, `FileUpIcon`, `MailIcon`, `SettingsIcon`, `ChevronDownIcon`, `ChevronUpIcon`, `PlusIcon`, `XIcon`, `Loader2Icon`, `ZapIcon`, `FileTextIcon`, `PackageIcon`

---

## 9. 与现有页面的融合说明

- **位置**: 「品牌设置」Section 插入在 Header 和 Tab Filter 之间
- **样式一致性**: 所有边框色、背景色、按钮样式、文字色阶均复用现有 Context Vault 页面的设计 token
- **Tab 风格**: 内部 Tab 与页面顶层 Tab Filter 使用相同的样式（`bg-white/10` 激活态）
- **不影响现有功能**: 资产列表、Sheet 编辑、导入导出等功能保持不变
- **可折叠设计**: 用户可以折叠品牌设置区域，专注于资产管理

---

> **待用户确认后交给 @DEV 实现。**
