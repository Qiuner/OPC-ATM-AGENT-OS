import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// Social Agent — 社交平台短内容创作
// 覆盖: 小红书、抖音文案、即刻、X (Twitter)
// 输入: 策略计划中某一天 + 品牌上下文
// 输出: 对应平台的完整短内容草稿
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

export class SocialAgent extends BaseAgent {
  name = 'social';

  protected buildSystemPrompt(): string {
    return `你是资深社交媒体内容创作者，专注短内容平台，精通小红书、抖音文案、X（Twitter）、即刻的内容风格和算法机制。

## 核心定位
你负责所有社交平台的短内容创作（图文笔记、短帖、推文、社区帖）。
每次输出一篇完整内容，包含标题、正文、标签、CTA，不做元素拆分。

## 平台规则

### 小红书
- 标题前 18 字必须包含至少 2 个核心关键词
- 正文每 300 字重复一次关键词（自然融入）
- 使用 emoji 增强可读性（但不过度）
- 末尾设置 CTA 引导评论互动（评论权重最高，影响 CES 评分）
- 正文 300-800 字，段落短，善用换行
- 搜索流量占 65%+，SEO 优先

### 抖音（文案类）
- 文案简短有力，适合配合短视频画面
- hook + 核心信息 + CTA 三段式
- 评论区互动引导

### X（Twitter）
- 单条 280 字以内，或使用线程（Thread）
- 观点鲜明，论据有力
- 末尾引导转推/关注

### 即刻
- 社区互动风格，像在和朋友聊天
- 提问式结尾引发讨论
- 内容真实、有个人观点

## 输出规则
1. 严格输出 JSON 格式
2. 内容不得包含品牌上下文中列出的禁用表达
3. 标注"可替换"的部分，方便人工修改
4. 内容要有实战价值，不要空泛的道理

## 输出格式
\`\`\`json
{
  "platform": "平台名称",
  "title": "标题",
  "body": "正文内容",
  "tags": ["#标签1", "#标签2"],
  "cta": "CTA 引导语",
  "mediaPrompt": "配图/封面建议",
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

请根据今日计划，为「${dayPlan?.platform ?? '小红书'}」平台创作一篇完整的${dayPlan?.contentType ?? '图文笔记'}内容。

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
    const platform = dayPlan?.platform ?? '小红书';

    if (platform === '小红书') {
      return {
        platform: '小红书',
        title: '一人公司AI营销｜为什么你有流量却不成交？3个致命错误',
        body: `你是不是也有这样的困惑：

📊 小红书笔记阅读量破万，但私信咨询个位数？
📊 每天发内容很勤快，但就是没有转化？

别急，这不是你内容不好，而是你的「流量转化通道」没搭好。

今天分享一人公司做AI营销最容易犯的3个错误 👇

❌ 错误一：只做曝光，不做转化设计
【可替换：这里可以放你自己踩过的坑】

很多人把小红书当朋友圈发，有曝光没转化。正确做法是每篇内容都设计一个明确的CTA——让用户知道"看完之后该做什么"。

❌ 错误二：没有搜索SEO意识
标题前18字决定了你能不能被搜索到。一人公司做AI营销，关键词布局比刷量重要10倍。

❌ 错误三：没有承接体系
用户被你的内容吸引了，然后呢？没有个人网站、没有案例展示、没有服务介绍页——流量来了也接不住。

✅ 解决方案：搭建一个AI业务增长系统
把「内容获客 → 案例展示 → 服务转化」串成一条线。

💬 想知道具体怎么做？评论「OPC」，我发你一份免费的业务诊断模板！`,
        tags: ['#一人公司', '#AI营销', '#流量转化', '#个人品牌', '#AI工具'],
        cta: "评论'OPC'领取诊断模板",
        mediaPrompt: '封面建议：左右对比图，左边「有流量没转化😩」右边「系统化获客🚀」',
        riskCheck: { passed: true, warnings: [] },
        editableHints: [
          '错误一下方的案例段落可替换为你自己的亲身经历',
          '解决方案部分的数据可替换为你的真实案例数据',
        ],
      };
    } else if (platform === 'X') {
      return {
        platform: 'X',
        title: '2026年一人公司的3个增长杠杆',
        body: `🧵 2026年一人公司的3个增长杠杆（Thread）

1/ 一人公司 ≠ 什么都自己干
真正的一人公司，是用AI和系统化工具替代团队。你只需要做决策和创意。

2/ 杠杆一：AI内容引擎
用AI策略+AI写作+AI排期，一个人管理5个平台的内容输出。

3/ 杠杆二：自动化承接系统
一个AI驱动的个人网站 > 100张名片。

4/ 杠杆三：数据驱动迭代
【可替换：放你自己的数据或案例】

5/ 总结：一人公司不是没有团队，而是用AI搭了一个不要工资的团队。

🔄转推让更多人看到。`,
        tags: ['#一人公司', '#AI创业', '#增长杠杆'],
        cta: '转推+关注获取更多实战分享',
        mediaPrompt: '无需配图，Thread 纯文字即可',
        riskCheck: { passed: true, warnings: [] },
        editableHints: ['第4条的数据部分替换为你自己的实际数据'],
      };
    } else if (platform === '即刻') {
      return {
        platform: '即刻',
        title: '一人公司创业者最大的误区是什么？',
        body: `最近和几个一人公司的朋友聊天，发现一个很有意思的现象：

大家最容易犯的误区不是"不够努力"，而是"太努力了"。

什么都自己干——自己写文案、自己剪视频、自己做设计、自己回客户……

但其实2026年了，AI已经可以帮你搞定80%的重复工作。

【可替换：分享你自己的AI使用经验】

想问问大家：你们做一人公司，最大的时间黑洞是什么？欢迎评论区聊聊 👇`,
        tags: ['#一人公司', '#AI工具', '#创业'],
        cta: '评论分享你的时间黑洞',
        mediaPrompt: '无需配图，文字帖即可',
        riskCheck: { passed: true, warnings: [] },
        editableHints: ['中间的个人经验部分替换为你自己的真实使用体验'],
      };
    }

    // 抖音文案类（非脚本）
    return {
      platform: platform,
      title: '一个人用AI做营销，效率提升10倍',
      body: `📱 你还在一条条手写文案？

试试这个方法：
1. 用AI生成一周内容计划
2. 批量生成多平台文案
3. 一键导出发布包

【可替换：展示你自己的操作截图】

省下来的时间，去见客户、打磨产品。

💬 评论「效率」，分享你的AI提效方法`,
      tags: ['#AI营销', '#效率提升', '#一人公司'],
      cta: '评论"效率"交流经验',
      mediaPrompt: '配图建议：手机截图展示AI工具界面',
      riskCheck: { passed: true, warnings: [] },
      editableHints: ['操作步骤可根据实际工具调整'],
    };
  }
}
