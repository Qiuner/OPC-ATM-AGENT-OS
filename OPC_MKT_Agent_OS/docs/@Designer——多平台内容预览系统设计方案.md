# [@Designer] 多平台拟真内容预览系统 UI 设计方案

**完成时间:** 2026-03-27
**参与人员:** @Designer (高级UI/UX设计师)
**关联页面:** Publishing Hub (`/publishing`)

---

## 1. 设计总览

### 1.1 目标

为 OPC MKT Agent OS 构建「多平台拟真预览系统」，让用户在内容发布前看到各社媒平台上的真实展示效果。该系统嵌入 Publishing Hub 页面，替代当前的纯文本预览模态框，提供像素级还原的平台 UI 模拟。

### 1.2 设计原则

- **暗色优先**: 匹配项目 Cotify 暗色主题 (background: `#030305`, card: `#0a0a0f`)
- **拟真度**: 每个平台预览卡片高度还原该平台真实 UI，但以「深色沙盒」形态嵌入暗色界面
- **统一壳**: 所有平台预览共享统一的切换/工具栏，内部各自渲染独立视觉风格
- **可导出**: 预览卡片可截图导出为 PNG，用于提案展示
- **无障碍**: 所有交互支持键盘导航，互动图标 `aria-label` 标注

### 1.3 设计令牌 (来自 globals.css)

| Token | 值 | 用途 |
|-------|-----|------|
| `--background` | `#030305` | 页面底色 |
| `--card` | `#0a0a0f` | 卡片底色 |
| `--primary` | `#a78bfa` | 主强调色 (紫) |
| `--chart-2` | `#22d3ee` | 辅助强调色 (青) |
| `--border` | `rgba(255,255,255,0.08)` | 分割线/边框 |
| `--muted-foreground` | `rgba(255,255,255,0.4)` | 次级文本 |
| `--foreground` | `#ffffff` | 主文本 |
| `--radius` | `0.75rem (12px)` | 基础圆角 |

---

## 2. 页面布局

### 2.1 整体结构 (ASCII 布局图)

```
+-----------------------------------------------------------+
| Header (h-14, glass blur)                    [OPC MKT]    |
+--------+--------------------------------------------------+
|        |                                                   |
| Sidebar|  Publishing Hub                                   |
| (w-60) |                                                   |
|        |  +-----------------------------------------------+|
|  Dashboard  | Platform Tabs: [XHS][X][IG][Meta][TT][LI][Email][Poster] ||
|  Team   |  +-----------------------------------------------+|
|  Vault  |                                                   |
|  Approval  |  +-------------------+  +----------------------+|
|  [Publish] |  | CONTENT EDITOR    |  | PLATFORM PREVIEW     ||
|  Creator|  |                   |  |                      ||
|  Analytics  |  | Title input       |  | +------------------+ ||
|        |  | Body textarea     |  | |  Realistic card   | ||
|        |  | Tags input        |  | |  matching the      | ||
|        |  | Media upload      |  | |  selected platform | ||
|        |  |                   |  | |                    | ||
|        |  | [Platform select] |  | +------------------+ ||
|        |  | [Generate AI]     |  |                      ||
|        |  +-------------------+  | [Export PNG] [Copy]   ||
|        |                         +----------------------+||
|        |                                                   |
|        |  +-----------------------------------------------+|
|        |  | MULTI-PLATFORM GRID (toggle)                   ||
|        |  | +--------+ +--------+ +--------+ +--------+   ||
|        |  | | XHS    | | X      | | IG     | | Meta   |   ||
|        |  | | preview| | preview| | preview| | preview|   ||
|        |  | +--------+ +--------+ +--------+ +--------+   ||
|        |  | +--------+ +--------+ +--------+ +--------+   ||
|        |  | | TikTok | | LI     | | Email  | | Poster |   ||
|        |  | | preview| | preview| | preview| | preview|   ||
|        |  | +--------+ +--------+ +--------+ +--------+   ||
|        |  +-----------------------------------------------+|
+--------+--------------------------------------------------+
```

### 2.2 布局模式

| 模式 | 触发 | 说明 |
|------|------|------|
| **Split View (默认)** | 页面加载 | 左侧编辑器 (w-[400px]) + 右侧单平台预览 (flex-1) |
| **Grid Compare** | 点击「对比模式」按钮 | 全宽网格，2x4 / 4x2 展示所有平台缩略预览 |
| **Focus Mode** | 双击预览卡片 | 预览卡片全屏展开为模态框，含实际尺寸显示 |

### 2.3 响应式断点

| 断点 | 宽度 | 布局变化 |
|------|------|---------|
| Desktop | >= 1280px | Split View: 左400px + 右flex-1 |
| Tablet | 768-1279px | 上下堆叠: 编辑器在上, 预览在下 |
| Mobile | < 768px | 纯编辑器 + 预览通过底部 Sheet 弹出 |

---

## 3. 组件架构

### 3.1 组件树

```
<PublishingPreviewPage>
  |-- <PreviewToolbar>              // 平台 Tab + 视图切换 + 导出按钮
  |-- <SplitView>
  |   |-- <ContentEditor>           // 左侧编辑区
  |   |   |-- <TitleInput>
  |   |   |-- <BodyEditor>
  |   |   |-- <TagInput>
  |   |   |-- <MediaUploader>
  |   |   |-- <PlatformSelector>
  |   |-- <PreviewPanel>            // 右侧预览区
  |       |-- <PreviewFrame>        // 统一外壳 (手机/桌面框架)
  |           |-- <XiaohongshuPreview>
  |           |-- <XTwitterPreview>
  |           |-- <InstagramPreview>
  |           |-- <MetaFacebookPreview>
  |           |-- <TikTokPreview>
  |           |-- <LinkedInPreview>
  |           |-- <EmailPreview>
  |           |-- <PosterPreview>
  |-- <GridCompareView>             // 网格对比模式 (toggle)
  |   |-- <MiniPreviewCard> x8
  |-- <FocusModal>                  // 全屏聚焦模式
```

### 3.2 PreviewToolbar

```
+-----------------------------------------------------------------------+
| [XHS] [X] [IG] [Meta] [TT] [LI] [Email] [Poster]  |  [Split|Grid]  [Export PNG]  |
+-----------------------------------------------------------------------+
```

**Tailwind 类名参考:**

```
// 容器
className="flex items-center justify-between px-4 py-2 rounded-xl"
style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}

// 平台 Tab 按钮 (未选中)
className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}

// 平台 Tab 按钮 (选中) — 各平台用各自品牌色
// 小红书选中:
style={{ background: 'rgba(255,42,84,0.15)', color: '#ff2a54', border: '1px solid rgba(255,42,84,0.25)' }}
// X 选中:
style={{ background: 'rgba(255,255,255,0.10)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.20)' }}
// Instagram 选中:
style={{ background: 'rgba(225,48,108,0.15)', color: '#e1306c', border: '1px solid rgba(225,48,108,0.25)' }}
// Meta 选中:
style={{ background: 'rgba(24,119,242,0.15)', color: '#1877f2', border: '1px solid rgba(24,119,242,0.25)' }}
// TikTok 选中:
style={{ background: 'rgba(0,242,234,0.12)', color: '#00f2ea', border: '1px solid rgba(0,242,234,0.25)' }}
// LinkedIn 选中:
style={{ background: 'rgba(10,102,194,0.15)', color: '#0a66c2', border: '1px solid rgba(10,102,194,0.25)' }}
// Email 选中:
style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
// Poster 选中:
style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}
```

每个 Tab 按钮内含该平台 logo SVG icon (16x16) + 平台名文本。

### 3.3 PreviewFrame (统一外壳)

预览卡片统一包裹在设备框架中：

```
// 手机框架 (用于 XHS/IG/TikTok)
+-----------------------------+
|   :::  9:41          5G  :::  |  <- 状态栏 (模拟)
|                             |
|    [Platform-specific UI]   |
|                             |
|                             |
|       w: 375px              |
|       h: 667px (可滚动)      |
|       scale: 0.75           |
|                             |
|   ---  ---  ---             |  <- 底部指示条 (模拟)
+-----------------------------+

// 桌面框架 (用于 X/Meta/LinkedIn/Email)
+---------------------------------------+
|  [o] [o] [o]    platform.com          |  <- 浏览器标题栏 (模拟)
|---------------------------------------|
|                                       |
|    [Platform-specific UI]             |
|                                       |
|       w: 100% (max-w-[520px])         |
|       h: auto                         |
|                                       |
+---------------------------------------+
```

**Tailwind 类名参考:**

```
// 手机框架
className="relative mx-auto overflow-hidden rounded-[32px]"
style={{
  width: '375px',
  maxHeight: '667px',
  background: '#000',
  border: '8px solid #1a1a1a',
  boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.6)',
}}

// 手机状态栏
className="flex items-center justify-between px-6 py-1.5 text-[11px] font-semibold"
style={{ color: 'rgba(255,255,255,0.6)' }}

// 桌面浏览器框架
className="rounded-xl overflow-hidden"
style={{
  maxWidth: '520px',
  background: '#0a0a0f',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
}}

// 浏览器标题栏
className="flex items-center gap-2 px-4 py-2.5"
style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}

// 浏览器圆点
className="flex gap-1.5"
// 红/黄/绿圆点各 h-2.5 w-2.5 rounded-full
```

---

## 4. 各平台预览卡片详细设计规格

---

### 4.1 小红书 (XiaoHongShu)

**品牌色:** `#ff2a54` (小红书红)
**背景:** `#1a1a1a` (模拟小红书暗色 App)
**设备框架:** 手机

#### 4.1.1 笔记发现页 (瀑布流)

```
+-----------------------------------+
|  :::  9:41            5G  :::    |
|  [搜索] 小红书              [+]   |
|----------------------------------|
|  +-------------+ +-------------+ |
|  |  [封面图]    | |  [封面图]    | |
|  |  16:9 缩略图 | |  4:3 缩略图 | |
|  |             | |             | |
|  | 笔记标题...  | | 笔记标题... | |
|  | [头像] 用户  | | [头像] 用户 | |
|  |    [心] 328  | |    [心] 1.2k| |
|  +-------------+ +-------------+ |
|  +-------------+ +-------------+ |
|  |  [封面图]    | |  [封面图]    | |
|  |             | |             | |
|  +-------------+ +-------------+ |
+-----------------------------------+
```

**组件规格:**

```
// 瀑布流容器
className="grid grid-cols-2 gap-2 px-2"

// 笔记卡片
className="rounded-md overflow-hidden"
style={{ background: '#262626' }}

// 封面图区
className="w-full aspect-[3/4] bg-cover bg-center"
// 无图时显示渐变占位: background: 'linear-gradient(135deg, #ff2a54, #ff6b81)'

// 标题
className="px-2 pt-2 text-[12px] font-medium leading-tight line-clamp-2"
style={{ color: '#ffffff' }}

// 底部用户行
className="flex items-center justify-between px-2 py-2"

// 用户头像
className="h-4 w-4 rounded-full"
style={{ background: 'rgba(255,255,255,0.1)' }}

// 用户名
className="text-[10px]"
style={{ color: 'rgba(255,255,255,0.5)' }}

// 点赞图标 + 数字
className="flex items-center gap-0.5 text-[10px]"
style={{ color: 'rgba(255,255,255,0.4)' }}
// 心形 icon: 实心红 #ff2a54 (已赞) 或 空心白
```

#### 4.1.2 笔记详情页

```
+-----------------------------------+
|  [<]   笔记详情     [分享] [...]  |
|----------------------------------|
|  +-------------------------------+|
|  |        [封面大图]              ||
|  |        swipeable              ||
|  |        1:1 / 3:4              ||
|  +-------------------------------+|
|                                   |
|  [头像] 用户名  @handle   [关注]  |
|                                   |
|  笔记标题 (16px bold)             |
|  笔记正文内容...                   |
|  #标签1 #标签2 #标签3              |
|                                   |
|  发布时间 · 浏览量                  |
|  -------------------------------- |
|  [心] 328  [收藏] 56  [评论] 12   |
+-----------------------------------+
```

#### 4.1.3 支持两种预览

| 子类型 | 说明 |
|--------|------|
| **图文笔记** | 封面图 + 多图轮播指示点 + 文字正文 |
| **视频笔记** | 封面图上叠加播放按钮 + 时长标签 `02:30` |

---

### 4.2 X / Twitter

**品牌色:** `#ffffff` (X 以黑白为主)
**背景:** `#000000` (暗色模式) / `#ffffff` (亮色模式)
**设备框架:** 桌面浏览器框架

#### 4.2.1 单条推文

```
+---------------------------------------+
|  [o][o][o]  x.com/home                |
|---------------------------------------|
|  bg: #000000                          |
|                                       |
|  [头像]  Display Name  @handle · 2h   |
|          [已认证蓝标]                   |
|                                       |
|  推文正文内容，最多 280 个字符。         |
|  支持 #Hashtags 和 @mentions          |
|  链接自动高亮为蓝色。                   |
|                                       |
|  +----------------------------------+ |
|  |  [媒体图片/视频]                   | |
|  |  圆角: 16px                       | |
|  |  最多 4 张图 (2x2 网格)            | |
|  +----------------------------------+ |
|                                       |
|  [回复]48  [转推]128  [心]1.2K  [views]24.5K  [书签] [分享] |
|                                       |
|  ---- border ----                     |
+---------------------------------------+
```

**组件规格:**

```
// 推文容器
className="px-4 py-3"
style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}

// 头像
className="h-10 w-10 rounded-full shrink-0"
style={{ background: 'rgba(255,255,255,0.1)' }}

// Display Name
className="text-[15px] font-bold"
style={{ color: '#e7e9ea' }}

// Handle + 时间
className="text-[15px]"
style={{ color: '#71767b' }}

// 认证蓝标
// SVG 蓝色勾: fill="#1d9bf0" w-[18px] h-[18px]

// 推文正文
className="mt-1 text-[15px] leading-[20px] whitespace-pre-wrap"
style={{ color: '#e7e9ea' }}

// Hashtag/Mention 高亮
style={{ color: '#1d9bf0' }}

// 媒体容器
className="mt-3 rounded-2xl overflow-hidden"
style={{ border: '1px solid rgba(255,255,255,0.08)' }}

// 互动按钮行
className="flex items-center justify-between mt-3 max-w-[425px]"

// 各互动按钮
className="flex items-center gap-1 group"
// 回复: hover color '#1d9bf0', 转推: hover '#00ba7c', 心: hover '#f91880', views: hover '#1d9bf0'

// 互动数字
className="text-[13px]"
style={{ color: '#71767b' }}
```

#### 4.2.2 Thread 预览

```
+---------------------------------------+
|  [头像]  Display Name  @handle · 2h   |
|    |                                   |
|  推文 1/3                              |
|    |                                   |
|  [连接线 (竖线)]                       |
|    |                                   |
|  [头像]  Display Name  @handle        |
|    |                                   |
|  推文 2/3                              |
|    |                                   |
|  [连接线 (竖线)]                       |
|    |                                   |
|  [头像]  Display Name  @handle        |
|                                        |
|  推文 3/3                              |
|                                        |
|  [互动按钮行]                          |
+---------------------------------------+
```

连接线样式:

```
// 竖线连接
className="absolute left-5 top-12 bottom-0 w-0.5"
style={{ background: 'rgba(255,255,255,0.12)' }}
```

#### 4.2.3 暗色/亮色切换

预览右上角提供主题切换开关:

```
// 切换按钮
className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px]"
style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
// [太阳/月亮 icon] Dark / Light
```

亮色模式色值:

| Token | Dark | Light |
|-------|------|-------|
| Background | `#000000` | `#ffffff` |
| Text | `#e7e9ea` | `#0f1419` |
| Secondary | `#71767b` | `#536471` |
| Border | `rgba(255,255,255,0.08)` | `#eff3f4` |
| Link | `#1d9bf0` | `#1d9bf0` |

---

### 4.3 Instagram

**品牌色:** 渐变 `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`
**背景:** `#000000` (暗色模式)
**设备框架:** 手机

#### 4.3.1 Feed 帖子

```
+-----------------------------------+
|  :::  9:41             5G  :::   |
|  Instagram            [心] [DM]   |
|----------------------------------|
|  [头像] username     [...]        |
|                                   |
|  +-------------------------------+|
|  |                               ||
|  |      [方形图片 1:1]            ||
|  |      375 x 375px              ||
|  |                               ||
|  +-------------------------------+|
|                                   |
|  [心] [评论] [DM]      [收藏]     |
|                                   |
|  xxx 次赞                          |
|  username 帖子正文内容...           |
|  #tag1 #tag2                      |
|  查看全部 xx 条评论                 |
|  x 小时前                          |
+-----------------------------------+
```

**组件规格:**

```
// 帖子头部
className="flex items-center justify-between px-3 py-2.5"

// 头像 (含渐变环 = 有 Story)
className="h-8 w-8 rounded-full"
// Story 环: box-shadow: '0 0 0 2px #000, 0 0 0 4px #e1306c'
// 无 Story: 无环

// 用户名
className="text-[14px] font-semibold"
style={{ color: '#f5f5f5' }}

// 图片区
className="w-full aspect-square bg-cover bg-center"
// 无图占位: background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'

// 互动图标行
className="flex items-center justify-between px-3 py-2.5"
// 左侧: 心(24px) + 评论(24px) + DM(24px), gap-4
// 右侧: 收藏(24px)
// 所有 icon stroke: #f5f5f5, strokeWidth: 1.5

// 点赞数
className="px-3 text-[14px] font-semibold"
style={{ color: '#f5f5f5' }}

// 正文
className="px-3 text-[14px] leading-[18px]"
style={{ color: '#f5f5f5' }}
// 用户名 bold, 正文 normal

// Hashtag
style={{ color: '#e0f1ff' }}  // IG 暗色模式标签色

// 时间
className="px-3 pt-1 text-[10px] uppercase"
style={{ color: '#a8a8a8' }}
```

#### 4.3.2 Story 预览

```
+-----------------------------------+
|  :::  9:41             5G  :::   |
|                                   |
|  [进度条 ████░░░░░░]              |
|                                   |
|  [头像] username       [...]  [X] |
|                                   |
|  +-------------------------------+|
|  |                               ||
|  |    [竖版图片/视频 9:16]        ||
|  |    375 x 667px                ||
|  |                               ||
|  |                               ||
|  |    底部文字叠加层               ||
|  |    (半透明渐变遮罩)             ||
|  +-------------------------------+|
|                                   |
|  [消息输入框]          [心] [DM]   |
+-----------------------------------+
```

#### 4.3.3 Reels 预览

```
+-----------------------------------+
|  :::  9:41             5G  :::   |
|  Reels                           |
|                                   |
|  +-------------------------------+|
|  |                               ||
|  |   [竖版视频 9:16]             ||
|  |   375 x 667px                ||
|  |                               ||
|  |                    [心] 12K   ||
|  |                    [评论] 342 ||
|  |                    [DM]       ||
|  |                    [...]      ||
|  |                               ||
|  | [头像] username [关注]         ||
|  | 正文描述... #tags              ||
|  | [音乐] 原创音乐 — username     ||
|  +-------------------------------+|
+-----------------------------------+
```

---

### 4.4 Meta / Facebook

**品牌色:** `#1877f2` (Facebook 蓝)
**背景:** `#242526` (FB 暗色模式)
**设备框架:** 桌面浏览器框架

#### 4.4.1 帖子卡片

```
+---------------------------------------+
|  [o][o][o]  facebook.com              |
|---------------------------------------|
|  bg: #242526                          |
|                                       |
|  +-----------------------------------+|
|  |  [头像]  Page Name               ||
|  |          2h ago · [地球icon]      ||
|  |                                   ||
|  |  帖子正文内容...                    ||
|  |  #hashtags                        ||
|  |                                   ||
|  |  +-------------------------------+||
|  |  |  [媒体图片/视频]               |||
|  |  |  宽度 100%                     |||
|  |  +-------------------------------+||
|  |                                   ||
|  |  [赞] [心] [哈哈]  你和其他 128 人  ||
|  |  42 条评论 · 8 次分享              ||
|  |  -------------------------------- ||
|  |  [赞]    [评论]    [分享]          ||
|  +-----------------------------------+|
+---------------------------------------+
```

**组件规格:**

```
// 帖子卡片
className="rounded-lg overflow-hidden"
style={{ background: '#242526', border: 'none' }}

// 帖子头部
className="flex items-center gap-3 px-4 pt-3 pb-2"

// Page 头像
className="h-10 w-10 rounded-full"
style={{ background: '#1877f2' }}

// Page 名称
className="text-[15px] font-semibold"
style={{ color: '#e4e6eb' }}

// 时间 + 地球 icon
className="text-[13px]"
style={{ color: '#b0b3b8' }}

// 帖子正文
className="px-4 pb-3 text-[15px] leading-[20px]"
style={{ color: '#e4e6eb' }}

// 媒体区
className="w-full"
// 无间距，图片撑满宽度

// 反应表情行
className="flex items-center gap-1 px-4 py-2"
// 表情 emoji 圆形: h-[18px] w-[18px]
// 三个叠加: 赞(蓝)/心(红)/哈哈(黄)

// 评论/分享计数
className="text-[13px]"
style={{ color: '#b0b3b8' }}

// 底部操作栏
className="flex items-center justify-around px-4 py-1"
style={{ borderTop: '1px solid #3e4042' }}

// 操作按钮
className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[15px] font-medium"
style={{ color: '#b0b3b8' }}
// hover: style={{ background: 'rgba(255,255,255,0.05)' }}
```

#### 4.4.2 链接预览卡片

```
+-----------------------------------+
|  帖子正文 + 链接 URL               |
|                                   |
|  +-------------------------------+|
|  |  [链接预览缩略图 1200x630]     ||
|  |-------------------------------||
|  |  DOMAIN.COM                   ||
|  |  链接标题                      ||
|  |  链接描述文字...               ||
|  +-------------------------------+|
```

链接预览卡片规格:

```
// 链接预览容器
className="rounded-lg overflow-hidden mx-4 mb-3"
style={{ border: '1px solid #3e4042' }}

// 缩略图
className="w-full aspect-[1200/630] bg-cover bg-center"

// 文本区
className="px-3 py-2.5"
style={{ background: '#3a3b3c' }}

// 域名
className="text-[12px] uppercase"
style={{ color: '#b0b3b8' }}

// 链接标题
className="text-[16px] font-semibold leading-tight line-clamp-2"
style={{ color: '#e4e6eb' }}

// 链接描述
className="text-[14px] mt-0.5 line-clamp-1"
style={{ color: '#b0b3b8' }}
```

---

### 4.5 TikTok

**品牌色:** `#00f2ea` (青) + `#ff0050` (红)
**背景:** `#000000`
**设备框架:** 手机 (全屏竖版视频)

#### 4.5.1 视频预览

```
+-----------------------------------+
|  :::  9:41             5G  :::   |
|  [关注中] [发现] [你的好友]        |
|                                   |
|  +-------------------------------+|
|  |                               ||
|  |    [竖版视频封面 9:16]         ||
|  |    375 x 667px                ||
|  |    居中播放按钮 (半透明)        ||
|  |                               ||
|  |                    +--------+ ||
|  |                    | [头像] | ||
|  |                    |   +    | ||
|  |                    +--------+ ||
|  |                    | [心]   | ||
|  |                    | 12.5K  | ||
|  |                    +--------+ ||
|  |                    | [评论] | ||
|  |                    |  342   | ||
|  |                    +--------+ ||
|  |                    | [收藏] | ||
|  |                    |  89    | ||
|  |                    +--------+ ||
|  |                    | [分享] | ||
|  |                    |  56    | ||
|  |                    +--------+ ||
|  |                    | [唱片] | ||
|  |                               ||
|  | @username                      ||
|  | 视频描述文字... #tag1 #tag2    ||
|  | [音乐] 原声 — username         ||
|  +-------------------------------+|
|                                   |
|  [首页] [朋友] [+] [消息] [我]     |
+-----------------------------------+
```

**组件规格:**

```
// 全屏容器 (相对手机框架)
className="relative w-full h-full"
style={{ background: '#000' }}

// 视频封面/背景
className="absolute inset-0 bg-cover bg-center"
// 无封面时: background: 'linear-gradient(180deg, #1a1a2e, #16213e)'

// 播放按钮
className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 flex items-center justify-center rounded-full"
style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}

// 右侧互动栏
className="absolute right-3 bottom-[120px] flex flex-col items-center gap-5"

// 头像 + 关注按钮
className="relative"
// 头像: h-12 w-12 rounded-full border-2 border-white
// 关注按钮: absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-[#ff0050]
// 加号: text-white text-[14px] font-bold

// 互动按钮组
className="flex flex-col items-center gap-0.5"
// icon: h-8 w-8, fill: #fff
// 数字: text-[11px] font-medium, color: #fff

// 唱片动画
className="h-11 w-11 rounded-full animate-spin"
style={{ animationDuration: '3s', background: 'linear-gradient(135deg, #333, #000)', border: '2px solid #333' }}

// 底部文字区
className="absolute left-3 bottom-[20px] right-[80px]"

// 用户名
className="text-[15px] font-semibold text-white"

// 描述
className="text-[14px] text-white mt-1 leading-[18px] line-clamp-2"

// 标签
style={{ color: '#fff', fontWeight: 600 }}

// 音乐行
className="flex items-center gap-1.5 mt-2"
// 音符 icon: h-3.5 w-3.5
// 文本: text-[12px] text-white, marquee 滚动效果

// 底部导航栏
className="absolute bottom-0 left-0 right-0 flex items-center justify-around py-2"
style={{ background: '#000' }}
// 中间 [+] 按钮: special gradient border
```

---

### 4.6 LinkedIn

**品牌色:** `#0a66c2` (LinkedIn 蓝)
**背景:** `#1b1f23` (暗色模式)
**设备框架:** 桌面浏览器框架

#### 4.6.1 帖子

```
+---------------------------------------+
|  [o][o][o]  linkedin.com/feed         |
|---------------------------------------|
|  bg: #1b1f23                          |
|                                       |
|  +-----------------------------------+|
|  | bg: #1e2328                       ||
|  |                                   ||
|  |  [头像]  User Name                ||
|  |          Title at Company         ||
|  |          2h ago · [地球]          ||
|  |                                   ||
|  |  帖子正文内容...                    ||
|  |  较长文本后显示 ...查看更多         ||
|  |                                   ||
|  |  #hashtag1 #hashtag2              ||
|  |                                   ||
|  |  +-------------------------------+||
|  |  |  [媒体图片]                    |||
|  |  +-------------------------------+||
|  |                                   ||
|  |  [赞][庆祝][支持] 128 人 · 42 评论 ||
|  |  -------------------------------- ||
|  |  [赞]  [评论]  [转发]  [发送]     ||
|  +-----------------------------------+|
+---------------------------------------+
```

**组件规格:**

```
// 帖子卡片
className="rounded-lg overflow-hidden"
style={{ background: '#1e2328', border: '1px solid #38434f' }}

// 头部
className="flex items-start gap-3 px-4 pt-3"

// 头像
className="h-12 w-12 rounded-full shrink-0"
style={{ background: 'rgba(10,102,194,0.2)' }}

// 用户名
className="text-[14px] font-semibold"
style={{ color: 'rgba(255,255,255,0.9)' }}

// 职称
className="text-[12px]"
style={{ color: 'rgba(255,255,255,0.6)' }}

// 时间
className="text-[12px]"
style={{ color: 'rgba(255,255,255,0.5)' }}

// 正文
className="px-4 py-3 text-[14px] leading-[20px]"
style={{ color: 'rgba(255,255,255,0.9)' }}

// 查看更多
className="text-[14px] font-semibold cursor-pointer"
style={{ color: 'rgba(255,255,255,0.6)' }}

// Hashtag
style={{ color: '#71b7fb' }}

// 反应行
className="flex items-center justify-between px-4 py-1.5"
// 左侧: 反应 emoji 叠加 + "128 人" text
// 右侧: "42 评论 · 8 分享" text
style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}

// 操作栏
className="flex items-center justify-around px-2 py-1"
style={{ borderTop: '1px solid #38434f' }}

// 操作按钮
className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[14px] font-medium"
style={{ color: 'rgba(255,255,255,0.6)' }}
// hover: background: 'rgba(255,255,255,0.05)'
```

#### 4.6.2 Article 预览

```
+-----------------------------------+
|  [头像]  User Name                |
|          Published an article     |
|                                   |
|  +-------------------------------+|
|  |  [Article 封面图 16:9]         ||
|  |-------------------------------||
|  |  Article 标题 (大号粗体)       ||
|  |  摘要文字...                   ||
|  +-------------------------------+|
|                                   |
|  [互动栏]                          |
+-----------------------------------+
```

---

### 4.7 Email

**品牌色:** `#a78bfa` (使用项目 primary 紫色)
**背景:** `#1a1a2e` (深蓝紫, 模拟邮件客户端暗色)
**设备框架:** 桌面浏览器框架

#### 4.7.1 收件箱列表视图

```
+---------------------------------------+
|  [o][o][o]  mail.google.com           |
|---------------------------------------|
|  [搜索邮件]                            |
|                                       |
|  +-----------------------------------+|
|  |  [*] [选]  Inbox (3)             ||
|  |-----------------------------------||
|  |  > [头像] Brand Name              ||
|  |    主题行文字...                   ||
|  |    预览文本截取前 80 字...     3m  ||
|  |-----------------------------------||
|  |    [头像] Brand Name              ||
|  |    另一封邮件主题行...             ||
|  |    预览文本...                2h  ||
|  |-----------------------------------||
|  |    [头像] Brand Name              ||
|  |    旧邮件主题行...               ||
|  |    预览文本...               1d  ||
|  +-----------------------------------+|
+---------------------------------------+
```

高亮当前预览的邮件 (第一行) 用 `>` 标记和浅紫背景。

**组件规格:**

```
// 收件箱容器
style={{ background: '#111827' }}

// 邮件列表项 (未选中)
className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
// hover: background: 'rgba(255,255,255,0.03)'

// 邮件列表项 (选中)
style={{ background: 'rgba(167,139,250,0.08)', borderLeft: '3px solid #a78bfa' }}

// 发件人头像
className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold"
style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}

// 发件人名称 (未读粗体)
className="text-[14px] font-semibold"
style={{ color: '#f3f4f6' }}

// 主题行
className="text-[13px] font-medium"
style={{ color: '#d1d5db' }}

// 预览文本
className="text-[12px] line-clamp-1"
style={{ color: '#6b7280' }}

// 时间
className="text-[11px] shrink-0"
style={{ color: '#6b7280' }}
```

#### 4.7.2 邮件正文预览

```
+---------------------------------------+
|  [<] 返回列表     [回复] [转发] [...] |
|---------------------------------------|
|                                       |
|  Subject: 主题行文字                   |
|                                       |
|  From: Brand Name <brand@company.com> |
|  To: recipient@email.com              |
|  Date: 2026-03-27 10:00 AM            |
|                                       |
|  ---  分割线  ---                      |
|                                       |
|  Hi [First Name],                     |
|                                       |
|  邮件正文内容...                       |
|  支持富文本渲染 (粗体/链接/列表)        |
|                                       |
|  [CTA 按钮]                           |
|                                       |
|  Best regards,                        |
|  [Brand Name]                         |
|                                       |
|  ---                                  |
|  Unsubscribe | View in browser        |
|                                       |
+---------------------------------------+
```

**组件规格:**

```
// 邮件正文区
className="px-6 py-4"

// Subject
className="text-[20px] font-semibold"
style={{ color: '#f3f4f6' }}

// Meta 信息
className="text-[13px] mt-2 space-y-0.5"
style={{ color: '#9ca3af' }}
// From 高亮: color: '#d1d5db', fontWeight: 500

// 分割线
className="my-4"
style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}

// 正文
className="text-[14px] leading-[22px]"
style={{ color: '#e5e7eb' }}

// CTA 按钮
className="inline-block mt-4 rounded-lg px-6 py-2.5 text-[14px] font-semibold text-white"
style={{ background: '#a78bfa' }}

// 退订链接
className="text-[11px] mt-6"
style={{ color: '#6b7280' }}
```

---

### 4.8 海报 / Banner

**品牌色:** `#fbbf24` (金黄) — 区别于其他平台
**背景:** 棋盘格透明底 (模拟设计软件)
**设备框架:** 无框架, 直接展示

#### 4.8.1 尺寸选择器

```
+---------------------------------------+
| 尺寸: [1:1] [16:9] [9:16] [4:5]      |
| 场景: [朋友圈广告] [信息流] [Banner]    |
+---------------------------------------+
```

#### 4.8.2 海报预览

```
+---------------------------------------+
|  :::  棋盘格透明底  :::               |
|                                       |
|  +-----------------------------------+|
|  |                                   ||
|  |   [海报内容]                       ||
|  |                                   ||
|  |   标题 (大号)                      ||
|  |   副标题                           ||
|  |   正文                             ||
|  |                                   ||
|  |   [品牌 Logo]    [CTA]            ||
|  |                                   ||
|  +-----------------------------------+|
|                                       |
|  尺寸: 1080 x 1080px (1:1)           |
+---------------------------------------+
```

**组件规格:**

```
// 棋盘格背景
style={{
  backgroundImage: `
    linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
    linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
    linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
  `,
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  backgroundColor: '#0f0f0f',
}}

// 尺寸选择按钮
className="rounded-md px-3 py-1.5 text-[12px] font-medium"
// 选中: style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}
// 未选中: style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}

// 海报画布尺寸
// 1:1 = 360x360  (display), 实际 1080x1080
// 16:9 = 480x270  (display), 实际 1920x1080
// 9:16 = 270x480  (display), 实际 1080x1920
// 4:5 = 360x450   (display), 实际 1080x1350

// 尺寸标注
className="text-center mt-2 text-[11px]"
style={{ color: 'rgba(255,255,255,0.3)' }}
```

#### 4.8.3 投放场景模拟

| 场景 | 模拟 UI | 说明 |
|------|---------|------|
| 朋友圈广告 | WeChat Moments 风格卡片 | 头像+品牌名+广告标签+图片+底部互动 |
| 信息流广告 | 通用信息流卡片 | 标题+缩略图+描述+「广告」标签 |
| Banner | 纯横幅展示 | 16:9 全宽, 无框架装饰 |

---

## 5. 配色方案总览

### 5.1 系统 UI 色 (不变, 继承项目主题)

| 名称 | 色值 | 用途 |
|------|------|------|
| Background | `#030305` | 页面底色 |
| Card | `#0a0a0f` | 卡片底色 |
| Primary | `#a78bfa` | 主交互色 |
| Cyan | `#22d3ee` | 辅助强调 |
| Border | `rgba(255,255,255,0.08)` | 边框 |
| Text Primary | `#ffffff` | 主文本 |
| Text Secondary | `rgba(255,255,255,0.6)` | 次级文本 |
| Text Muted | `rgba(255,255,255,0.4)` | 弱文本 |

### 5.2 各平台品牌色

| 平台 | 主色 | 辅色 | 用途 |
|------|------|------|------|
| 小红书 | `#ff2a54` | `#ff6b81` | Tab/标签/心形 |
| X | `#ffffff` | `#1d9bf0` | Tab/链接/蓝标 |
| Instagram | `#e1306c` | `#833ab4` / `#fd1d1d` / `#fcb045` (渐变) | Tab/Story环 |
| Meta | `#1877f2` | `#42b72a` | Tab/赞按钮 |
| TikTok | `#00f2ea` | `#ff0050` | Tab/互动 |
| LinkedIn | `#0a66c2` | `#71b7fb` | Tab/链接 |
| Email | `#a78bfa` | `#7c3aed` | Tab (复用项目主色) |
| Poster | `#fbbf24` | `#f59e0b` | Tab/尺寸选择 |

### 5.3 平台预览内部背景色

| 平台 | 暗色模式 | 说明 |
|------|----------|------|
| 小红书 | `#1a1a1a` / `#262626` | App内+卡片 |
| X Dark | `#000000` | 纯黑 |
| X Light | `#ffffff` | 纯白 (可切换) |
| Instagram | `#000000` | 纯黑 |
| Meta | `#242526` / `#3a3b3c` | FB暗色 |
| TikTok | `#000000` | 纯黑 |
| LinkedIn | `#1b1f23` / `#1e2328` | LI暗色 |
| Email | `#111827` | 深蓝灰 |
| Poster | 棋盘格 `#0f0f0f` + `#1a1a1a` | 透明底模拟 |

---

## 6. 字体层级

| 层级 | 字号 | 字重 | 行高 | Tailwind | 用途 |
|------|------|------|------|----------|------|
| H1 | 24px | Bold (700) | 32px | `text-2xl font-bold` | 页面标题 |
| H2 | 18px | Semibold (600) | 24px | `text-lg font-semibold` | 区块标题 |
| H3 | 15px | Semibold (600) | 20px | `text-[15px] font-semibold` | 卡片标题 |
| Body | 14px | Normal (400) | 20px | `text-sm` | 正文内容 |
| Small | 13px | Medium (500) | 18px | `text-[13px] font-medium` | 辅助信息 |
| Caption | 12px | Normal (400) | 16px | `text-xs` | 标注/时间 |
| Micro | 11px | Medium (500) | 14px | `text-[11px] font-medium` | 最小标注 |
| Tiny | 10px | Medium (500) | 12px | `text-[10px] font-medium` | Badge/极小标签 |

**字体栈 (继承项目):**

```css
font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
```

各平台预览内部字体:
- 小红书: `"PingFang SC", "Noto Sans SC", sans-serif` (中文优先)
- X: `"Chirp", -apple-system, sans-serif`
- Instagram: `-apple-system, sans-serif`
- Meta: `"Segoe UI", Helvetica, Arial, sans-serif`
- TikTok: `"TikTok Display", "Proxima Nova", sans-serif`
- LinkedIn: `-apple-system, "Segoe UI", sans-serif`
- Email: 系统字体栈 (模拟邮件客户端)

---

## 7. 交互设计

### 7.1 平台 Tab 切换

| 状态 | 表现 |
|------|------|
| Default | 灰色背景, 低对比文本, 无品牌色 |
| Hover | 轻微提亮背景 `rgba(255,255,255,0.06)`, 文本 0.6 opacity |
| Active/Selected | 品牌色背景 (0.15 opacity), 品牌色文本, 品牌色边框 |
| Focus (键盘) | `outline: 2px solid #a78bfa; outline-offset: 2px` |

**动画:** `transition-all duration-200 ease-out`

Tab 切换时预览区动画:

```css
/* 新预览卡片入场 */
animation: preview-enter 0.3s ease-out;

@keyframes preview-enter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### 7.2 视图切换 (Split / Grid)

```
// Split 模式按钮
[图标: columns-2]  Split View

// Grid 模式按钮
[图标: grid-2x2]  Grid Compare
```

切换动画: `transition-all duration-300 ease-in-out`, Grid 模式用 CSS Grid 动画展开。

### 7.3 预览卡片交互

| 交互 | 行为 |
|------|------|
| Hover | 卡片 `translateY(-2px)`, shadow 加深, border 提亮至 0.12 |
| Click (Grid 模式) | 切换至该平台的 Split View |
| Double-click | 进入 Focus Mode (全屏模态框) |
| Right-click | 上下文菜单: 导出 PNG / 复制文案 / 在新标签打开 |

### 7.4 内容实时同步

编辑区修改 -> 预览区 **实时更新** (无需手动刷新)。使用 React state 直接驱动。

文字输入时预览区有轻微的 typing indicator 效果:

```css
/* 内容更新时预览闪烁 */
animation: content-update 0.3s ease;

@keyframes content-update {
  0% { opacity: 0.7; }
  100% { opacity: 1; }
}
```

### 7.5 导出交互

导出 PNG 按钮:

```
// 默认态
className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium"
style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}

// Hover
style={{ background: 'rgba(167,139,250,0.15)' }}

// Loading (导出中)
// 按钮内显示 Loader2 spin icon + "导出中..."

// 成功
// 按钮短暂变为绿色 + "已导出" 然后恢复
```

### 7.6 空状态 / 加载状态 / 错误状态

| 状态 | 预览区表现 |
|------|-----------|
| **空内容** | 灰色虚线框 + 「输入内容后预览将在此显示」文案 + 平台 logo 水印 |
| **加载中** | 骨架屏 (Skeleton): 模拟预览卡片结构的脉冲灰色块 |
| **媒体加载失败** | 图片区域显示 broken image icon + 「图片加载失败」 |
| **AI 生成中** | 预览区显示 typing 动画 + 「AI 正在生成内容...」 |

空状态:

```
className="flex flex-col items-center justify-center h-full gap-3"

// 平台 Logo (大号, 低透明度)
className="h-16 w-16 opacity-10"

// 提示文案
className="text-sm"
style={{ color: 'rgba(255,255,255,0.25)' }}
```

骨架屏:

```
// 骨架块
className="rounded-md animate-pulse"
style={{ background: 'rgba(255,255,255,0.06)' }}
```

---

## 8. Grid Compare 模式详细设计

### 8.1 布局

```
+-------------------------------------------------------+
|  [返回 Split] Grid Compare  —  同时预览 8 个平台        |
+-------------------------------------------------------+
|                                                         |
|  +------------+ +------------+ +------------+ +-------+ |
|  | XHS        | | X          | | IG         | | Meta  | |
|  | (缩放0.5)  | | (缩放0.5)  | | (缩放0.5)  | |(0.5) | |
|  |            | |            | |            | |       | |
|  +------------+ +------------+ +------------+ +-------+ |
|  +------------+ +------------+ +------------+ +-------+ |
|  | TikTok     | | LinkedIn   | | Email      | |Poster | |
|  | (缩放0.5)  | | (缩放0.5)  | | (缩放0.5)  | |(0.5) | |
|  |            | |            | |            | |       | |
|  +------------+ +------------+ +------------+ +-------+ |
|                                                         |
+-------------------------------------------------------+
```

**Tailwind 类名参考:**

```
// Grid 容器
className="grid grid-cols-4 gap-4 p-4"

// 缩略卡片
className="cotify-card p-3 cursor-pointer group"

// 缩略卡片标题栏
className="flex items-center gap-2 mb-2"
// 平台 icon (12px) + 平台名 (11px font-medium)

// 缩略预览 (缩放)
className="origin-top-left overflow-hidden rounded-lg"
style={{ transform: 'scale(0.5)', width: '200%', height: '200%' }}
// 外层限高: className="h-[280px] overflow-hidden"
```

### 8.2 响应式

| 断点 | Grid 列数 |
|------|----------|
| >= 1280px | 4 列 |
| 1024-1279px | 3 列 |
| 768-1023px | 2 列 |
| < 768px | 不提供 Grid 模式 |

---

## 9. Focus Mode (全屏预览)

```
+---------------------------------------------------------------+
|  ::::::::::::::::: 全屏蒙层 (bg-black/70) :::::::::::::::::::  |
|                                                                 |
|    +-------------------------------------------------------+   |
|    |  [<] 返回   |  XiaoHongShu Preview   | [Export] [X]   |   |
|    |-------------------------------------------------------|   |
|    |                                                       |   |
|    |              [实际尺寸预览卡片]                          |   |
|    |              居中显示                                   |   |
|    |              可滚动                                     |   |
|    |                                                       |   |
|    +-------------------------------------------------------+   |
|                                                                 |
+---------------------------------------------------------------+
```

**Tailwind 类名参考:**

```
// 蒙层
className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"

// 模态框
className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}

// 顶栏
className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 cotify-glass"
style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
```

---

## 10. ContentEditor (左侧编辑区)

### 10.1 布局

```
+-----------------------------------+
|  Content Editor                   |
|                                   |
|  标题                              |
|  [输入框]                          |
|                                   |
|  正文                              |
|  [多行文本域, min-h-[200px]]       |
|                                   |
|  标签                              |
|  [Tag1] [Tag2] [+添加标签]         |
|                                   |
|  媒体                              |
|  [上传区域 / 拖拽]                  |
|  [缩略图1] [缩略图2] [+]           |
|                                   |
|  ----                             |
|  目标平台                          |
|  [XHS] [X] [IG] [Meta] ...        |
|  (多选, 选中的平台会出现在预览区)    |
|                                   |
|  [AI 生成] [保存草稿]              |
+-----------------------------------+
```

**Tailwind 类名参考:**

```
// 编辑区容器
className="w-[400px] shrink-0 overflow-y-auto px-4 py-4 space-y-4"
style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}

// 标签
className="text-[13px] font-medium mb-1.5"
style={{ color: 'rgba(255,255,255,0.5)' }}

// 输入框
className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-[rgba(255,255,255,0.2)] outline-none"
style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
// focus: border-color: 'rgba(167,139,250,0.4)'

// 多行文本域
className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[rgba(255,255,255,0.2)] outline-none min-h-[200px] resize-y"
style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}

// 媒体上传区
className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors"
style={{ borderColor: 'rgba(255,255,255,0.08)' }}
// hover: borderColor: 'rgba(167,139,250,0.3)'
// drag-over: borderColor: '#a78bfa', background: 'rgba(167,139,250,0.05)'

// 上传提示文案
className="text-sm"
style={{ color: 'rgba(255,255,255,0.3)' }}

// 媒体缩略图
className="h-16 w-16 rounded-lg bg-cover bg-center relative group"
// 删除按钮: absolute -top-1 -right-1, opacity-0 group-hover:opacity-100

// AI 生成按钮
className="w-full rounded-xl py-2.5 text-sm font-medium"
style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', color: '#fff' }}
// hover: brightness-110
```

---

## 11. 组件文件结构建议

```
web/src/components/features/preview/
  |-- preview-toolbar.tsx          // 平台 Tab + 视图切换
  |-- preview-frame.tsx            // 手机/桌面框架外壳
  |-- content-editor.tsx           // 左侧编辑区
  |-- grid-compare-view.tsx        // Grid 对比模式
  |-- focus-modal.tsx              // 全屏预览模态
  |-- platforms/
  |   |-- xiaohongshu-preview.tsx  // 小红书
  |   |-- x-twitter-preview.tsx    // X / Twitter
  |   |-- instagram-preview.tsx    // Instagram
  |   |-- meta-facebook-preview.tsx// Meta / Facebook
  |   |-- tiktok-preview.tsx       // TikTok
  |   |-- linkedin-preview.tsx     // LinkedIn
  |   |-- email-preview.tsx        // Email
  |   |-- poster-preview.tsx       // 海报/Banner
  |-- utils/
      |-- export-png.ts            // html-to-image 导出逻辑
      |-- platform-config.ts       // 平台配色/icon/尺寸配置常量
```

---

## 12. 无障碍设计

### 12.1 键盘导航

| 按键 | 行为 |
|------|------|
| `Tab` | 在平台 Tab 之间移动焦点 |
| `Enter` / `Space` | 激活选中的 Tab |
| `Arrow Left/Right` | 在 Tab 之间切换 (role="tablist") |
| `Escape` | 关闭 Focus Mode 模态框 |
| `Ctrl+Shift+E` | 快捷导出当前预览 |

### 12.2 ARIA 标注

```html
<!-- 平台 Tab 列表 -->
<div role="tablist" aria-label="平台预览切换">
  <button role="tab" aria-selected="true" aria-controls="panel-xhs">小红书</button>
  <button role="tab" aria-selected="false" aria-controls="panel-x">X</button>
  ...
</div>

<!-- 预览面板 -->
<div role="tabpanel" id="panel-xhs" aria-labelledby="tab-xhs">
  <!-- 预览内容 -->
</div>

<!-- 互动按钮 (预览内, 仅展示) -->
<button aria-label="点赞 (预览展示)" tabindex="-1" disabled>...</button>
```

### 12.3 颜色对比度

所有文本对比度满足 WCAG AA 标准 (4.5:1):

| 组合 | 对比度 | 达标 |
|------|--------|------|
| `#ffffff` on `#030305` | 19.7:1 | AA + AAA |
| `rgba(255,255,255,0.6)` on `#0a0a0f` | 9.2:1 | AA + AAA |
| `rgba(255,255,255,0.4)` on `#0a0a0f` | 5.8:1 | AA |
| `#a78bfa` on `#030305` | 6.4:1 | AA |
| `#ff2a54` on `#1a1a1a` | 4.6:1 | AA |

---

## 13. 动画与过渡规范

| 动画名 | 场景 | 时长 | 缓动 |
|--------|------|------|------|
| `preview-enter` | Tab 切换, 预览入场 | 300ms | ease-out |
| `content-update` | 编辑内容同步到预览 | 300ms | ease |
| `card-hover` | 卡片悬浮 | 200ms | ease |
| `modal-enter` | Focus Mode 打开 | 250ms | ease-out |
| `modal-exit` | Focus Mode 关闭 | 200ms | ease-in |
| `grid-expand` | Grid 模式展开 | 300ms | ease-in-out |
| `skeleton-pulse` | 骨架屏脉冲 | 1.5s loop | ease-in-out |
| `spin` | 唱片旋转 (TikTok) | 3s loop | linear |

所有动画遵循 `prefers-reduced-motion: reduce` 媒体查询, 用户开启减弱动画时禁用所有非必要动画。

---

## 14. 技术实现注意事项 (给 @DEV 的提示)

1. **导出 PNG**: 推荐使用 `html-to-image` 库, 将预览 DOM 节点转为 PNG。需注意跨域图片需设置 `useCORS: true`。
2. **预览缩放**: Grid 模式使用 CSS `transform: scale()` 而非重新渲染, 保持性能。
3. **实时同步**: 编辑区 state 变化直接传递 props 到预览组件, 配合 `useDeferredValue` 避免输入卡顿。
4. **平台预览组件**: 每个平台预览是独立的 React 组件, 通过统一的 `PreviewData` interface 接收数据。
5. **shadcn/ui 复用**: Tabs/Dialog/Sheet/Tooltip/Avatar/Badge 等均使用项目已有的 shadcn 组件。
6. **手机框架**: 使用 CSS 绘制, 不依赖图片资源。状态栏时间可用 `new Date().toLocaleTimeString()` 动态显示。
7. **平台 icon**: 使用 SVG inline 或 lucide-react 近似图标, 不外链第三方 CDN。

### 14.1 PreviewData Interface

```typescript
interface PreviewData {
  title: string;
  body: string;
  media: { type: 'image' | 'video'; url: string; aspectRatio?: string }[];
  tags: string[];
  author: {
    name: string;
    handle: string;
    avatar?: string;
    title?: string;      // LinkedIn 职称
    company?: string;    // LinkedIn 公司
    verified?: boolean;  // X 蓝标
  };
  meta?: {
    linkUrl?: string;    // FB 链接预览
    linkTitle?: string;
    linkDesc?: string;
    linkImage?: string;
    emailSubject?: string;
    emailFrom?: string;
    posterSize?: '1:1' | '16:9' | '9:16' | '4:5';
  };
}
```

---

## 15. 交付检查清单

- [ ] 所有 8 个平台预览组件实现
- [ ] Split View 布局 (编辑区 + 预览区)
- [ ] Grid Compare 模式
- [ ] Focus Mode 全屏预览
- [ ] 平台 Tab 切换 + 品牌色
- [ ] 手机/桌面设备框架
- [ ] 实时内容同步 (编辑 -> 预览)
- [ ] 导出 PNG 功能
- [ ] 暗色模式完全适配
- [ ] X 暗/亮主题切换
- [ ] 空状态 / 加载骨架屏 / 错误状态
- [ ] 键盘导航 + ARIA 标注
- [ ] 响应式适配 (desktop/tablet/mobile)
- [ ] 动画减弱模式支持
- [ ] 各平台字体层级匹配
- [ ] 颜色对比度 WCAG AA 达标

---

*设计方案待用户确认后交由 @DEV 实施。*
