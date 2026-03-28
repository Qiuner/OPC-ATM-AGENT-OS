---
name: visual-gen
description: AI 视觉内容生成专家 — 10 种风格预设 + 8 种版式 + 两步确认流程 + 5 层结构化 Prompt 组装。当需要生成小红书封面图、系列配图、信息图、社交媒体视觉内容、或任何 AI 图片生成任务时触发。支持 OpenAI/Google/DashScope/Replicate 四大服务商，通过 referenceImages 保持系列图风格一致性。
version: 3.0.0
last_updated: 2026-03-28
updated_by: human
---

# 视觉内容生成 Agent SOP v3

> 基于 XHS-Images 方法论：风格预设系统 + 版式系统 + 两步确认流程 + 5 层结构化 Prompt 组装。

## MCP 工具

| 工具 | 说明 | 必填参数 | 可选参数 |
|------|------|----------|----------|
| `generate_image` | AI 生成图片 | `prompt`, `outputPath` | `provider`, `model`, `quality`, `aspectRatio`, `referenceImages` |

### Provider 说明
| 服务商 | 模型 | 特点 | API Key 环境变量 |
|--------|------|------|------------------|
| Google | gemini-3-pro-image-preview | 高质量，支持参考图 | `GOOGLE_API_KEY` |
| OpenAI | gpt-image-1.5 | 稳定质量 | `OPENAI_API_KEY` |
| DashScope | z-image-turbo | 中文内容优化 | `DASHSCOPE_API_KEY` |
| Replicate | google/nano-banana-pro | 社区模型 | `REPLICATE_API_TOKEN` |

不指定 provider 时自动检测可用 API key。

## 10 种风格预设

| 风格 ID | 名称 | 一句话描述 | 参考文件 |
|---------|------|-----------|----------|
| cute | 甜美可爱 | 粉色系、贴纸、圆角 | `./skills/visual-gen/references/xhs-styles/cute.md` |
| fresh | 清新自然 | 绿蓝白、植物、留白 | `./skills/visual-gen/references/xhs-styles/fresh.md` |
| warm | 温暖亲切 | 琥珀/赭石、柔光纹理 | `./skills/visual-gen/references/xhs-styles/warm.md` |
| bold | 粗犷有力 | 高饱和、大字号、强对比 | `./skills/visual-gen/references/xhs-styles/bold.md` |
| minimal | 极简高级 | 黑白+单色、最大留白 | `./skills/visual-gen/references/xhs-styles/minimal.md` |
| retro | 复古怀旧 | 网点/胶片、暗调暖色 | `./skills/visual-gen/references/xhs-styles/retro.md` |
| pop | 波普活力 | 饱和原色、粗描边、动感 | `./skills/visual-gen/references/xhs-styles/pop.md` |
| notion | 知性手绘 | 线条涂鸦、图标、结构化 | `./skills/visual-gen/references/xhs-styles/notion.md` |
| chalkboard | 黑板粉笔 | 深底+彩色粉笔、手绘 | `./skills/visual-gen/references/xhs-styles/chalkboard.md` |
| study-notes | 学习笔记 | 纸张底+手写+荧光笔 | `./skills/visual-gen/references/xhs-styles/study-notes.md` |

## 8 种版式

| 版式 ID | 名称 | 信息密度 | 适用 |
|---------|------|----------|------|
| sparse | 留白型 | 20-30% | 封面、品牌感、情绪 |
| balanced | 均衡型 | 40-50% | 通用、图文混排 |
| dense | 密集型 | 60-75% | 干货、教程、知识卡 |
| list | 列表型 | 50-60% | Top N、步骤、清单 |
| comparison | 对比型 | 55-65% | VS、before/after |
| flow | 流程型 | 45-55% | 流程、时间线 |
| mindmap | 脑图型 | 50-65% | 知识体系、概念图 |
| quadrant | 四象限型 | 55-65% | 矩阵、分类 |

详细定义: `./skills/visual-gen/references/xhs-layouts/layouts.md`
画布规范: `./skills/visual-gen/references/xhs-layouts/canvas.md`

---

## 完整工作流（6 步 + 2 确认点）

### Step 0: 加载偏好（启动前必读）

1. 读取 `./memory/context/brand-voice.md`（品牌调性）
2. 读取 `./memory/context/target-audience.md`（目标受众）
3. 读取 `./skills/visual-gen/references/xhs-layouts/canvas.md`（画布规范 + 安全区域）
4. 读取 `./skills/visual-gen/references/xhs-layouts/layouts.md`（8 种版式定义）
5. 风格列表已在上方"10 种风格预设"中列出，按需读取具体风格文件

---

### Step 1: 分析内容

收到用户任务后，进行深度分析：

1. **提取信息**:
   - 核心主题和关键词
   - 内容类型（教程/案例/对比/情绪/产品/知识）
   - 目标平台（小红书/X/公众号/通用）
   - 目标受众（参考 target-audience.md）

2. **自动推荐风格和版式**（参考下方"自动检测矩阵"）

3. **确定图片计划**:
   - 单图 or 系列图？
   - 系列图张数（1-10 张）
   - 每张图的角色（封面/内容/CTA）

4. **输出分析摘要**:
```
## 📊 内容分析

### 基本信息
- 主题: [主题]
- 关键词: [关键词1, 关键词2, ...]
- 内容类型: [教程/案例/对比/情绪/产品/知识]
- 目标平台: [平台]
- 目标受众: [受众描述]

### 图片计划
- 图片数量: [N] 张
- 画布尺寸: [WxH] (aspectRatio: [ratio])

### 推荐方案
- 推荐风格: **[style-id]**（[风格名]）— [推荐理由]
- 推荐版式: **[layout-id]**（[版式名]）— [推荐理由]
- 备选风格: [style-id-2], [style-id-3]
```

---

### Step 2: ⚠️ CONFIRMATION 1 — 确认内容理解

**⛔ 必须在此暂停，等待用户确认后才能继续。不可跳过。**

向用户展示 Step 1 的分析摘要，明确询问：
1. 内容理解是否正确？
2. 图片数量和尺寸是否合适？
3. 推荐的风格/版式方向是否认可？

等待用户回复。用户可以：
- ✅ 确认 → 进入 Step 3
- 🔄 调整 → 根据反馈修改分析，重新展示
- ❌ 取消 → 结束流程

---

### Step 3: 生成 3 种大纲策略

基于确认后的内容方向，生成 3 种差异化策略：

#### 策略 A — 故事驱动（Story-driven）
- **特点**: 以个人经历为主线，情感共鸣优先
- **适用**: 测评、蜕变分享、个人品牌
- **页数**: 4-6 张
- **节奏**: Hook → 故事起点 → 转折/发现 → 成果/方法 → CTA
- 每张图概述 + 建议风格/版式组合

#### 策略 B — 信息密集（Info-dense）
- **特点**: 结构清晰、要点明确、专业可信
- **适用**: 教程、产品对比、知识传播
- **页数**: 3-5 张
- **节奏**: 封面 Hook → 核心知识点 → 详细步骤/数据 → 总结/CTA
- 每张图概述 + 建议风格/版式组合

#### 策略 C — 视觉优先（Visual-first）
- **特点**: 大图、氛围感、即时吸引力，文字最少
- **适用**: 高颜值产品、生活方式、品牌感内容
- **页数**: 3-4 张
- **节奏**: 震撼封面 → 视觉展示 → 简洁 CTA
- 每张图概述 + 建议风格/版式组合

每种策略的输出格式：
```
### 策略 [A/B/C]: [策略名称]

| 序号 | 角色 | 版式 | 内容概述 | Hook/滑动钩子 |
|------|------|------|----------|---------------|
| 1 | 封面 | sparse | [概述] | [标题 Hook] |
| 2 | 内容 | balanced | [概述] | [滑动钩子] |
| ... | ... | ... | ... | ... |
```

---

### Step 4: ⚠️ CONFIRMATION 2 — 用户选择方案

**⛔ 必须在此暂停，等待用户选择后才能继续。不可跳过。**

展示 3 种策略供用户选择，同时提供选项：

1. **选择策略**: A / B / C（或混搭）
2. **确认风格**: 展示推荐 + 所有 10 种风格列表
3. **确认版式**: 展示推荐 + 可按图调整

用户可以：
- 选策略 A + 默认推荐风格/版式
- 选策略 B + 自选风格 bold + 版式 comparison
- 混搭：策略 A 的叙事 + 策略 B 的版式密度
- 修改任何一张图的风格/版式

等待用户回复后进入 Step 5。

---

### Step 5: 生成图片

#### 5.1 读取风格预设

根据用户选择的风格 ID，读取对应的预设文件：
```
Read ./skills/visual-gen/references/xhs-styles/[style-id].md
```
提取：配色方案、视觉元素、排版风格、Prompt 关键词。

#### 5.2 结构化 Prompt 组装（5 层）

**每张图的 Prompt 必须按以下 5 层结构组装**（英文）：

**Layer 1 — Image Spec（图片规格）**
```
A [aspect-ratio] social media infographic image, [quality] quality.
```

**Layer 2 — Style Section（风格层）**
从预设文件加载，直接使用 Prompt 关键词：
```
[Style Prompt Keywords from preset file].
Color palette: [primary], [secondary], [background], [accent].
```

**Layer 3 — Layout Section（版式层）**
从版式定义加载 Prompt 指导语：
```
[Layout Prompt Guidance from layouts.md].
Information density: [X]%.
```

**Layer 4 — Content Section（内容层）**
从确认的大纲提取具体内容：
```
Content: "[title/heading text]" as main heading.
"[body text or key points]" as supporting content.
Visual concept: [describe the visual representation of the content].
```

**Layer 5 — Safe Zone（安全区）**
每个 Prompt 末尾必加：
```
IMPORTANT: Leave bottom 10% of image completely empty — no text, no key visual elements.
Avoid placing any text in the top-right corner area.
```

#### 5.3 组装示例

```
A 3:4 social media infographic image, high quality.

Notion style hand-drawn illustration, clean line doodles with slight wobble effect,
simple stick figures and icons, structured block layout, black ink on white background,
soft blue yellow pink accent highlights, generous white space, intellectual minimalist aesthetic.
Color palette: #1A1A1A primary, #4A4A4A secondary, #FFFFFF background, #A8D4F0 accent.

Numbered list layout, vertical arrangement of items, each item with number or icon on left
and text on right, consistent spacing between items, clear sequential reading flow.
Information density: 55%.

Content: "5 AI Tools Every Solo Entrepreneur Needs" as main heading.
"1. ChatGPT — Writing assistant  2. Midjourney — Visual content  3. Notion — Project management
4. Canva — Quick design  5. Zapier — Automation" as supporting content.
Visual concept: Each tool represented by a simple hand-drawn icon with a brief description.

IMPORTANT: Leave bottom 10% of image completely empty — no text, no key visual elements.
Avoid placing any text in the top-right corner area.
```

#### 5.4 逐张生成

对每张图依次调用 `generate_image`：

**第 1 张（封面）**:
```
generate_image(
  prompt="[5 层组装的完整 Prompt]",
  outputPath="./output/[topic]-01-cover.png",
  quality="2k",
  aspectRatio="3:4"
)
```

**第 2 张及以后（使用 referenceImages 保持一致性）**:
```
generate_image(
  prompt="[5 层组装的完整 Prompt]",
  outputPath="./output/[topic]-02.png",
  quality="2k",
  aspectRatio="3:4",
  referenceImages=["./output/[topic]-01-cover.png"]
)
```

#### 5.5 质量检查（每张生成后）
- [ ] 风格预设对齐？
- [ ] 版式符合定义？
- [ ] 内容准确反映？
- [ ] 安全区域留空？
- [ ] 与前一张风格一致？（系列图）

---

### Step 6: 输出与交付

输出完整结果：
```markdown
# 🎨 视觉内容: [主题]

## 元数据
- 策略: [A/B/C] [策略名称]
- 风格: [style-id] ([风格名])
- 版式: [layout-id] ([版式名])
- 平台: [目标平台]
- 尺寸: [WxH] ([aspectRatio])
- 图片数量: [N] 张

## 生成结果
| 序号 | 文件路径 | 角色 | 版式 | 内容概要 |
|------|----------|------|------|----------|
| 1 | ./output/xxx-01-cover.png | 封面 | sparse | [概要] |
| 2 | ./output/xxx-02.png | 内容 | list | [概要] |
| ... | ... | ... | ... | ... |

## Prompt 记录
### 图片 1
[完整 5 层 Prompt]

### 图片 2
[完整 5 层 Prompt]
```

---

## 风格 × 版式推荐矩阵

| 风格＼版式 | sparse | balanced | dense | list | comparison | flow | mindmap | quadrant |
|-----------|--------|----------|-------|------|------------|------|---------|----------|
| cute | ★★★ | ★★★ | ★ | ★★ | ★ | ★★ | ★★ | ★ |
| fresh | ★★★ | ★★★ | ★★ | ★★★ | ★★ | ★★ | ★★ | ★★ |
| warm | ★★ | ★★★ | ★ | ★★ | ★★ | ★★★ | ★ | ★ |
| bold | ★★ | ★★ | ★★★ | ★★ | ★★★ | ★★ | ★★ | ★★★ |
| minimal | ★★★ | ★★ | ★ | ★★ | ★★ | ★★ | ★ | ★★★ |
| retro | ★★ | ★★★ | ★★ | ★★ | ★★ | ★★★ | ★ | ★ |
| pop | ★★ | ★★ | ★★★ | ★★★ | ★★★ | ★★ | ★★ | ★★ |
| notion | ★ | ★★ | ★★★ | ★★★ | ★★ | ★★ | ★★★ | ★★★ |
| chalkboard | ★ | ★★ | ★★ | ★★ | ★ | ★★★ | ★★★ | ★★ |
| study-notes | ★ | ★★ | ★★★ | ★★★ | ★★ | ★★ | ★★★ | ★★ |

★★★ = 最佳搭配 | ★★ = 可用 | ★ = 不推荐

---

## 自动检测矩阵（内容信号 → 风格/版式推荐）

| 内容信号词 | 推荐风格 | 推荐版式 |
|-----------|----------|----------|
| 教程/步骤/方法/how-to | notion, study-notes | list, dense |
| 对比/VS/区别/测评 | bold, pop | comparison |
| 故事/经历/分享/心得 | warm, fresh | balanced, flow |
| 清单/推荐/Top/盘点 | fresh, notion | list |
| 知识/概念/体系/框架 | chalkboard, study-notes | mindmap, quadrant |
| 情绪/感悟/心情/日常 | cute, warm | sparse |
| 品牌/产品/发布/上线 | minimal, bold | sparse, balanced |
| 数据/分析/报告/复盘 | notion, bold | quadrant, dense |
| 美食/旅行/生活方式 | fresh, warm | balanced, sparse |
| 时尚/穿搭/美妆 | retro, pop | balanced, comparison |

**检测规则**: 扫描用户输入中的关键词，匹配信号词 → 取第一个匹配的风格/版式作为推荐。用户可在 Confirmation 2 中覆盖。

---

## 滑动钩子策略（系列图翻页引导）

| 钩子类型 | 示例 | 适用位置 |
|----------|------|----------|
| 预告 | "下一张揭晓第3个方法→" | 每张图底部（安全区上方） |
| 编号 | "3/5" | 角落编号 |
| 最高级 | "最关键的一步↓" | 内容转折处 |
| 悬念 | "但你绝对想不到…" | 故事转折 |
| CTA | "收藏这套方法📌" | 最后一张 |

---

## 自检清单

- [ ] 已加载品牌调性和目标受众（Step 0）
- [ ] 内容分析已获用户确认（⚠️ Confirmation 1）
- [ ] 用户已选择策略/风格/版式（⚠️ Confirmation 2）
- [ ] Prompt 包含完整 5 层结构（spec → style → layout → content → safe zone）
- [ ] 安全区域已在每个 Prompt 中声明（底部 10% + 右上角）
- [ ] 系列图第 2 张起使用 referenceImages 保持一致性
- [ ] 视觉风格与品牌调性一致
- [ ] 尺寸符合目标平台要求
