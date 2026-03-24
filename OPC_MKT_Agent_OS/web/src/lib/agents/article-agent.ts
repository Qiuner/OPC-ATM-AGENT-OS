import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// Article Agent — 长文内容创作
// 覆盖: 公众号文章、博客、SEO 文章
// 输入: 策略计划 + 品牌上下文
// 输出: 完整长文草稿（标题+正文+标签+CTA 一体化）
// ==========================================

interface DayPlan {
  day: number;
  date: string;
  theme: string;
  platform: string;
  contentType: string;
  keywords: string[];
  ctaStrategy: string;
  notes: string;
}

export class ArticleAgent extends BaseAgent {
  name = 'article';

  protected buildSystemPrompt(): string {
    return `你是资深内容编辑和 SEO 专家，擅长撰写公众号文章、博客和 SEO 优化长文。

## 核心定位
你负责所有长文内容的创作。每次输出完整文章，包含标题、正文、标签、CTA。

## 文章类型规则

### 公众号文章
- 标题：20字以内，制造好奇心或痛点共鸣
- 正文：1500-3000字，段落短（2-4句/段）
- 结构：hook → 痛点 → 方法论 → 案例 → CTA
- 排版：善用加粗、引用块、分隔线
- 结尾引导关注/分享/评论

### 博客/SEO 文章
- 标题包含主要关键词，H1 唯一
- 正文 1000-2500 字
- 自然使用 H2/H3 子标题，每个子标题包含长尾关键词
- 首段 100 字内出现主关键词
- 内链和 CTA 自然植入

### 通用写作原则
- 第一人称叙事，真实坦诚
- 短句快节奏，金句突出
- 有数据支撑，有案例验证
- 不写空话套话，每句话都有信息量

## 输出格式
\`\`\`json
{
  "platform": "公众号/博客",
  "title": "文章标题",
  "subtitle": "副标题（可选）",
  "body": "正文内容（Markdown 格式）",
  "tags": ["#标签1", "#标签2"],
  "cta": "CTA 引导语",
  "seoMeta": {
    "metaTitle": "SEO 标题（≤60字符）",
    "metaDescription": "SEO 描述（≤160字符）",
    "focusKeyword": "主关键词"
  },
  "wordCount": 1500,
  "readingTime": "5分钟",
  "riskCheck": { "passed": true, "warnings": [] },
  "editableHints": ["第X段可替换为你自己的案例"]
}
\`\`\``;
  }

  protected buildUserPrompt(input: AgentInput): string {
    const ctx = input.context;
    const dayPlan = ctx.dayPlan as DayPlan | undefined;
    const learnings = ctx.learnings as string | undefined;

    let prompt = `## 品牌信息
${JSON.stringify(ctx.brand ?? {}, null, 2)}

## 产品/服务
${JSON.stringify(ctx.offers ?? [], null, 2)}

## 禁用表达（绝对不能出现）
${JSON.stringify(ctx.forbidden_claims ?? [], null, 2)}

## 今日内容计划
${JSON.stringify(dayPlan ?? {}, null, 2)}

请撰写一篇完整的${dayPlan?.contentType ?? '公众号文章'}。

主题：${dayPlan?.theme ?? ''}
关键词：${(dayPlan?.keywords ?? []).join('、')}
CTA策略：${dayPlan?.ctaStrategy ?? ''}
补充说明：${dayPlan?.notes ?? ''}`;

    if (learnings) {
      prompt += `\n\n## 历史学习数据（请参考以下经验优化内容）\n${learnings}`;
    }

    return prompt;
  }

  protected getMockResponse(input: AgentInput): Record<string, unknown> {
    const dayPlan = input.context.dayPlan as DayPlan | undefined;

    return {
      platform: dayPlan?.platform ?? '公众号',
      title: '一人公司如何用AI搭建自动化营销系统？从0到1完整指南',
      subtitle: '14天实战复盘：一个非技术老板的AI营销之路',
      body: `你有没有过这样的感觉：

**每天忙得脚不沾地，但业务增长却在原地踏步。**

写文案、剪视频、发小红书、回私信、做报价……一人公司的日常，就是把自己活成了一整个团队。

但问题是：你一个人的时间是有上限的。

今天这篇文章，我想分享一个我自己踩了无数坑之后总结出来的方法——**用AI搭建一套自动化营销系统**，让一个人也能跑出一个团队的效率。

---

## 一、为什么一人公司需要"系统"而不是"更努力"

【可替换：这里放你自己的亲身经历】

很多一人公司老板的直觉是：业务不好 = 我不够努力。

但真正的问题往往是**没有系统**。

没有系统意味着：
- 每次发内容都从零开始
- 好的内容无法复用
- 不知道哪个渠道在带来客户
- 今天很勤快，明天就断更

> **努力是线性的，系统是指数的。**

---

## 二、AI营销系统的三个核心模块

### 模块一：上下文资产库

把你的产品卖点、客户案例、品牌调性、禁用词……全部结构化存储。

这样做的好处是：AI 每次生成内容时都能参考完整的品牌信息，不会跑偏。

### 模块二：AI内容引擎

一键生成 7 天的内容计划，覆盖小红书、抖音、视频号、X、即刻。

不是写更多内容，而是写更精准的内容。每篇都有明确的关键词策略和 CTA 设计。

### 模块三：数据复盘闭环

【可替换：放你自己的数据截图或案例】

发布后回收数据，AI 自动分析哪些内容有效、哪些无效，下一轮生成时自动参考。

**每个循环，系统都在变聪明。**

---

## 三、14天实战时间线

- **Day 1-3**：整理品牌资产，建立上下文库
- **Day 4-7**：用AI生成第一周内容，人工审核修改
- **Day 8-10**：发布、回收数据、复盘
- **Day 11-14**：优化迭代，第二轮内容质量明显提升

---

## 四、给一人公司老板的建议

1. 不要追求完美，先跑通闭环
2. AI 生成的内容一定要人工审核，加入你自己的经历和观点
3. 坚持数据驱动，不凭感觉判断内容好坏
4. 选择 2-3 个核心平台深耕，不要贪多

---

**如果你也是一人公司，想搭建自己的AI营销系统——欢迎留言交流。**

我会持续分享实战经验和踩过的坑。`,
      tags: ['#一人公司', '#AI营销', '#自动化系统', '#内容营销'],
      cta: '留言交流，关注获取更多实战分享',
      seoMeta: {
        metaTitle: '一人公司AI营销系统搭建指南 - 14天实战复盘',
        metaDescription: '分享一人公司如何用AI搭建自动化营销系统，从上下文资产库到内容引擎到数据复盘，14天跑通完整闭环。',
        focusKeyword: '一人公司AI营销系统',
      },
      wordCount: 1500,
      readingTime: '5分钟',
      riskCheck: { passed: true, warnings: [] },
      editableHints: [
        '第一部分的亲身经历替换为你自己的故事',
        '模块三的数据截图替换为你的真实数据',
        '时间线可根据实际情况调整',
      ],
    };
  }
}
