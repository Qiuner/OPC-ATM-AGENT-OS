# [@Designer] Dashboard / Publishing Hub 出海适配 UI 设计方案

**完成时间:** 2026-03-24
**参与人员:** @Designer (UI设计师)
**关联任务:** T1-13

---

## 1. 适配概述

将 Dashboard 和 Publishing Hub 的平台体系从国内平台替换为出海平台。UI 文案保持中文，平台名称使用英文。

### 平台映射

| 原国内平台 | 替换为出海平台 | 内容格式 |
|-----------|--------------|---------|
| 小红书 | X (Twitter) | 推文 Thread / 单条推文 (280字符) |
| 抖音 | TikTok | 短视频脚本 (15-60s) |
| 视频号 | LinkedIn | 专业长文 / 图文帖子 |
| 即刻 | Meta (FB/IG) | Facebook 帖子 / Instagram Caption |
| X | Email | 邮件营销内容 (Subject + Body) |
| — (新增) | Blog | SEO 博客文章 (Title + Body + Meta) |

### 完整出海平台列表
`X` / `LinkedIn` / `TikTok` / `Meta` / `Email` / `Blog`

---

## 2. Publishing Hub 适配设计

### 2.1 PlatformKey 类型更新

```typescript
// 旧
type PlatformKey = "小红书" | "抖音" | "X" | "即刻" | "视频号";

// 新
type PlatformKey = "X" | "LinkedIn" | "TikTok" | "Meta" | "Email" | "Blog";
```

### 2.2 PLATFORM_LABELS 更新

```typescript
const PLATFORM_LABELS: Record<PlatformKey, string> = {
  X: "X · 推文 (280 chars)",
  LinkedIn: "LinkedIn · 专业文章",
  TikTok: "TikTok · 短视频脚本",
  Meta: "Meta · FB/IG 帖子",
  Email: "Email · 营销邮件",
  Blog: "Blog · SEO 长文",
};
```

### 2.3 PLATFORM_FORMATTERS 更新

每个平台的格式化函数需要适配海外内容格式：

```typescript
// X (Twitter) — 280字符推文或 Thread
function formatX(item: PublishItem): string {
  const full = `${item.title}\n\n${item.body ?? ""}`;
  const tags = (item.tags ?? []).map((t) => `#${t}`).join(" ");
  const tweet = full.slice(0, 260) + (tags ? `\n\n${tags}` : "");
  return tweet.slice(0, 280);
}

// LinkedIn — 专业长文格式
function formatLinkedIn(item: PublishItem): string {
  const title = item.title;
  const body = item.body ?? "";
  const tags = (item.tags ?? []).map((t) => `#${t}`).join(" ");
  return `${title}\n\n${body}\n\n${tags}\n\n---\nWhat are your thoughts? Drop a comment below.`;
}

// TikTok — 短视频脚本格式
function formatTikTok(item: PublishItem): string {
  const body = item.body ?? "";
  const hook = body.slice(0, 50) + (body.length > 50 ? "..." : "");
  return `[Hook - 3s] ${hook}\n\n[Main Content - 15-45s]\n${body}\n\n[CTA - 3s] Follow for more! Like & Share!`;
}

// Meta (Facebook/Instagram) — 社交帖子格式
function formatMeta(item: PublishItem): string {
  const body = item.body ?? "";
  const tags = (item.tags ?? []).map((t) => `#${t}`).join(" ");
  return `${item.title}\n\n${body}\n\n${tags}\n\n💬 Tag a friend who needs to see this!`;
}

// Email — 邮件营销格式
function formatEmail(item: PublishItem): string {
  const subject = item.title;
  const body = item.body ?? "";
  return `Subject: ${subject}\nPreheader: ${body.slice(0, 80)}\n\n---\n\nHi [First Name],\n\n${body}\n\nBest regards,\n[Brand Name]\n\n---\nUnsubscribe | View in browser`;
}

// Blog — SEO 文章格式
function formatBlog(item: PublishItem): string {
  const title = item.title;
  const body = item.body ?? "";
  const tags = (item.tags ?? []).map((t) => t).join(", ");
  return `# ${title}\n\nMeta Description: ${body.slice(0, 155)}\nKeywords: ${tags}\n\n---\n\n${body}\n\n---\n\n## Key Takeaways\n\n- [Takeaway 1]\n- [Takeaway 2]\n- [Takeaway 3]`;
}
```

### 2.4 Mock 数据替换

将现有中文 Mock 数据替换为英文出海内容：

```typescript
const MOCK_ITEMS: PublishItem[] = [
  {
    id: "PUB-012",
    title: "5 AI Tools That Will 10x Your Productivity in 2026",
    campaign: "Content Marketing",
    scheduledAt: "2026-03-12 10:00",
    tab: "pending",
    platforms: [
      { platform: "X", ready: true, format: "Tweet Thread · 5 tweets" },
      { platform: "LinkedIn", ready: true, format: "Professional Post · Long-form" },
      { platform: "Blog", ready: true, format: "SEO Article · 1500 words" },
      { platform: "Email", ready: false, format: "Newsletter · Pending" },
    ],
    body: "Discover the top 5 AI tools that are revolutionizing how teams work. From content creation to data analysis, these tools will transform your workflow.",
    tags: ["AI", "Productivity", "Tools", "2026"],
    fromApi: false,
  },
  {
    id: "PUB-005",
    title: "Behind the Scenes: How We Built Our Product",
    campaign: "Brand Awareness",
    scheduledAt: "2026-03-13 14:00",
    tab: "pending",
    platforms: [
      { platform: "TikTok", ready: true, format: "Short Video · 60s" },
      { platform: "Meta", ready: true, format: "IG Reels + FB Post" },
      { platform: "LinkedIn", ready: false, format: "Article · Pending" },
    ],
    body: "From a simple idea to a shipped product — our journey of building, failing, and iterating. Today we take you behind the scenes.",
    tags: ["Startup", "BehindTheScenes", "BuildInPublic"],
    fromApi: false,
  },
  {
    id: "PUB-003",
    title: "The Complete Guide to DTC Marketing in 2026",
    campaign: "Lead Generation",
    scheduledAt: "2026-03-14 09:00",
    tab: "pending",
    platforms: [
      { platform: "Blog", ready: true, format: "SEO Article · 2000 words" },
      { platform: "Email", ready: true, format: "Newsletter · Weekly Digest" },
      { platform: "X", ready: true, format: "Tweet Thread · 8 tweets" },
    ],
    body: "Everything you need to know about direct-to-consumer marketing in 2026. Strategy, channels, tools, and real case studies.",
    tags: ["DTC", "Marketing", "Guide", "Ecommerce"],
    fromApi: false,
  },
  {
    id: "PUB-011",
    title: "Founder Story — From Zero to Launch",
    campaign: "Brand Awareness",
    scheduledAt: "2026-03-11 12:00",
    tab: "exported",
    platforms: [
      { platform: "LinkedIn", ready: true, format: "Article · 800 words" },
      { platform: "TikTok", ready: true, format: "Short Video · 45s" },
    ],
    body: "3 years of building, countless pivots. Today I'm sharing my journey from zero to launch — hoping it inspires those still on the path.",
    tags: ["Founder", "Startup", "Journey"],
    fromApi: false,
  },
  {
    id: "PUB-010",
    title: "Product Unboxing & First Impressions",
    campaign: "Spring Launch",
    scheduledAt: "2026-03-08 18:00",
    tab: "published",
    platforms: [
      { platform: "TikTok", ready: true, format: "Short Video · 45s" },
      { platform: "Meta", ready: true, format: "IG Post · Carousel" },
      { platform: "X", ready: true, format: "Tweet · Single" },
    ],
    body: "The new product just arrived! First impressions: premium quality all around. Let's take a closer look at the details.",
    tags: ["Unboxing", "NewProduct", "Review"],
    fromApi: false,
  },
  {
    id: "PUB-009",
    title: "FAQ Collection — Top 10 Questions Answered",
    campaign: "Customer Education",
    scheduledAt: "2026-03-07 10:00",
    tab: "published",
    platforms: [
      { platform: "Blog", ready: true, format: "SEO Article · FAQ Schema" },
      { platform: "Email", ready: true, format: "Drip Email · 3-part series" },
    ],
    body: "We collected the most frequently asked questions and answered them all in one place. Bookmark this for future reference!",
    tags: ["FAQ", "CustomerSupport", "Tutorial"],
    fromApi: false,
  },
];
```

### 2.5 平台预览弹窗 Tab 更新

```typescript
// 旧
const allPlatforms: PlatformKey[] = ["小红书", "抖音", "X", "即刻", "视频号"];

// 新
const allPlatforms: PlatformKey[] = ["X", "LinkedIn", "TikTok", "Meta", "Email", "Blog"];

// 默认激活 Tab
const [activePlatform, setActivePlatform] = useState<PlatformKey>("X");
```

Tab 按钮样式不变，仍使用现有的 `bg-[#a78bfa] text-white` 激活态。

### 2.6 平台状态图标

平台名称直接用文字展示（与现有设计一致），`ready` 状态仍用 check/empty 表示：
- `✅` → 内容已就绪
- `⬜` → 待生成

无需为每个平台添加独立图标，保持简洁。

---

## 3. Dashboard 适配设计

### 3.1 OpenClaw Panel 平台选择器

```typescript
// 旧
const platforms = ['小红书', '抖音', '视频号', 'X', '即刻'];

// 新
const platforms = ['X', 'LinkedIn', 'TikTok', 'Meta', 'Email', 'Blog'];
```

平台选择器按钮样式保持不变：
- 激活态: `background: rgba(167,139,250,0.15)`, `color: #a78bfa`, `border: 1px solid rgba(167,139,250,0.25)`
- 非激活态: `background: rgba(255,255,255,0.04)`, `color: rgba(255,255,255,0.3)`, `border: 1px solid rgba(255,255,255,0.06)`

### 3.2 命令流可视化

```typescript
// 旧
飞书指令 → Agent OS 处理 → 生成内容 → 推送飞书 → 数据闭环

// 新 — 适配出海工作流
Campaign Brief → Agent OS → Content Gen → Multi-Platform → Analytics
```

流程节点更新：

```tsx
<div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
  <Megaphone className="h-3.5 w-3.5" style={{ color: '#22d3ee' }} />
  <span>Campaign</span>
</div>
<ArrowRight />
<div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
  <Zap className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
  <span>Agent OS</span>
</div>
<ArrowRight />
<div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
  <PenTool className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
  <span>Content</span>
</div>
<ArrowRight />
<div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
  <Send className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
  <span>Publish</span>
</div>
<ArrowRight />
<div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
  <BarChart3 className="h-3.5 w-3.5" style={{ color: '#f472b6' }} />
  <span>Analytics</span>
</div>
```

### 3.3 Quick Commands 更新

```typescript
// 旧
const quickCommands = [
  { label: '生成脚本', icon: PenTool, cmd: 'generate_script' },
  { label: '系统状态', icon: BarChart3, cmd: 'get_status' },
  { label: '搜集素材', icon: MessageSquare, cmd: 'collect_materials' },
];

// 新 — 出海场景快捷指令
const quickCommands = [
  { label: '生成内容', icon: PenTool, cmd: 'generate_content' },
  { label: '系统状态', icon: BarChart3, cmd: 'get_status' },
  { label: '竞品分析', icon: MessageSquare, cmd: 'competitor_analysis' },
];
```

### 3.4 输入框 Placeholder

```typescript
// 旧
placeholder="输入主题，如「AI Agent 工具推荐」..."

// 新
placeholder="输入主题，如「AI tools for productivity」..."
```

### 3.5 OpenClaw Panel 标题/描述

```tsx
// 标题保持不变
<h3 className="text-sm font-semibold text-white">OpenClaw Gateway</h3>

// 描述更新
<p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
  {connected ? `Bot: ${botName} — 通过指令驱动 Agent OS 生成出海内容` : '正在连接...'}
</p>
```

---

## 4. Analytics 页面

Analytics 页面的 `platform` 字段是从 API 数据中动态读取的，无需修改 UI 代码。当后端返回的数据包含出海平台名称（X / LinkedIn / TikTok 等）时，会自动正确展示。

**无需 UI 层面改动。**

---

## 5. 样式一致性确认

所有改动仅涉及**数据层和文本内容**，不改变任何视觉样式：

- 卡片样式: `background: #0a0a0f; border: 1px solid rgba(255,255,255,0.08)` — 不变
- 按钮样式: 紫色渐变 `from-[#a78bfa] to-[#7c3aed]` — 不变
- Tab 样式: `border-[#a78bfa] text-white` 激活态 — 不变
- 文字色阶: 白色 → 0.6 → 0.4 → 0.25 — 不变
- 平台选择器: 紫色高亮激活态 — 不变
- Toast: `rgba(167,139,250,0.9)` 背景 — 不变

---

## 6. 改动文件清单

| 文件 | 改动内容 |
|------|---------|
| `web/src/app/publishing/page.tsx` | PlatformKey 类型、PLATFORM_LABELS、PLATFORM_FORMATTERS、MOCK_ITEMS、默认 activePlatform |
| `web/src/app/page.tsx` | OpenClaw Panel: platforms 数组、command flow 文案、quickCommands、placeholder、描述文案 |

**共 2 个文件需要改动，无新增文件，无新增依赖。**

---

> **设计方案完成，可直接交付 @DEV 开发。**
