import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// Writer Agent — 内容创作
// 输入：策略计划中某一天 + 品牌上下文
// 输出：对应平台的完整内容草稿
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

export class WriterAgent extends BaseAgent {
  name = 'writer';

  protected buildSystemPrompt(): string {
    return `你是资深内容创作者，精通小红书、抖音、视频号、X（Twitter）、即刻等各平台的内容风格。

## 平台内容规则

### 小红书
- 标题前 18 字必须包含至少 2 个核心关键词
- 正文每 300 字重复一次关键词（自然融入）
- 使用 emoji 增强可读性（但不过度）
- 末尾设置 CTA 引导评论互动（评论权重最高，影响 CES 评分）
- 正文 300-800 字，段落短，善用换行

### 抖音
- 前 3 秒必须有强 hook（冲突/提问/数据）
- 输出口播脚本 + 字幕文案
- 控制在 30-60 秒
- 结尾引导关注/评论

### X（Twitter）
- 单条 280 字以内，或使用线程（Thread）
- 观点鲜明，论据有力
- 末尾引导转推/关注

### 即刻
- 社区互动风格，像在和朋友聊天
- 提问式结尾引发讨论
- 内容真实、有个人观点

### 视频号
- 口播脚本 + 字幕
- 开场 hook + 干货 + CTA
- 适合教程、分享类内容

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

    return `## 品牌信息
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
  }

  protected getMockResponse(input: AgentInput): Record<string, unknown> {
    const dayPlan = input.context.dayPlan as DayPlan | undefined;
    const platform = dayPlan?.platform ?? '小红书';

    if (platform === '小红书') {
      return this.getMockXiaohongshu(dayPlan);
    } else if (platform === '抖音' || platform === '视频号') {
      return this.getMockVideo(dayPlan, platform);
    } else if (platform === 'X') {
      return this.getMockTwitter(dayPlan);
    } else {
      return this.getMockJike(dayPlan);
    }
  }

  private getMockXiaohongshu(plan: DayPlan | undefined): Record<string, unknown> {
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

我用14天帮一人公司老板搭建了完整的AI业务系统，从0到第一个付费客户。

💬 想知道具体怎么做？评论「OPC」，我发你一份免费的业务诊断模板！`,
      tags: ['#一人公司', '#AI营销', '#流量转化', '#个人品牌', '#AI工具'],
      cta: "评论'OPC'领取诊断模板",
      mediaPrompt: '封面建议：左右对比图，左边「有流量没转化😩」右边「系统化获客🚀」，背景用浅灰色，文字清晰醒目',
      riskCheck: { passed: true, warnings: [] },
      editableHints: [
        '错误一下方的案例段落可替换为你自己的亲身经历',
        '解决方案部分的数据可替换为你的真实案例数据',
      ],
    };
  }

  private getMockVideo(plan: DayPlan | undefined, platform: string): Record<string, unknown> {
    return {
      platform,
      title: '一个人如何用AI顶替一个营销团队？',
      body: `【Hook - 前3秒】
"你还在手动发内容、手动回私信？2026年了，一个人用AI完全可以顶一个5人团队。"

【正文 - 干货部分】
很多一人公司老板跟我说："我知道要做内容，但一个人根本忙不过来。"

其实你不需要忙过来，你需要的是一套AI业务系统：

第一步：用AI生成内容策略——不用每天想发什么
第二步：用AI批量写内容——一次产出一周的量
第三步：搭一个自动化承接网站——24小时自动展示案例和服务

【可替换：这里可以展示你自己的系统截图或操作演示】

我帮一个做设计的老板搭了这套系统，14天上线，第一周就来了3个咨询。

【CTA - 结尾】
如果你也是一人公司，想搭建自己的AI增长系统——关注我，主页有详细介绍。
评论区扣"系统"，我发你搭建指南。`,
      tags: ['#一人公司', '#AI自动化', '#业务系统'],
      cta: '评论"系统"获取搭建指南',
      mediaPrompt: '视频建议：真人口播 + 屏幕录制展示系统操作，字幕用黑底白字，关键词高亮',
      riskCheck: { passed: true, warnings: [] },
      editableHints: [
        '干货部分的三个步骤可根据实际服务内容调整',
        '案例数据替换为你自己的客户案例',
      ],
    };
  }

  private getMockTwitter(plan: DayPlan | undefined): Record<string, unknown> {
    return {
      platform: 'X',
      title: '2026年一人公司的3个增长杠杆',
      body: `🧵 2026年一人公司的3个增长杠杆（Thread）

1/ 一人公司 ≠ 什么都自己干
真正的一人公司，是用AI和系统化工具替代团队。你只需要做决策和创意。

2/ 杠杆一：AI内容引擎
用AI策略+AI写作+AI排期，一个人管理5个平台的内容输出。
不是发更多内容，而是发更精准的内容。

3/ 杠杆二：自动化承接系统
一个AI驱动的个人网站 > 100张名片。
24小时展示案例、服务、报价。客户自己看完自己下单。

4/ 杠杆三：数据驱动迭代
【可替换：放你自己的数据或案例】
追踪每条内容的转化路径，把预算花在ROI最高的地方。

5/ 总结：
一人公司不是没有团队，而是用AI搭了一个不要工资的团队。

如果你也在做一人公司，🔄转推让更多人看到。
关注 @你的账号 获取更多实战分享。`,
      tags: ['#一人公司', '#AI创业', '#增长杠杆'],
      cta: '转推+关注获取更多实战分享',
      mediaPrompt: '无需配图，Thread 纯文字即可，首条可配一张数据图',
      riskCheck: { passed: true, warnings: [] },
      editableHints: [
        '第4条的数据部分替换为你自己的实际数据',
        '第5条的账号替换为你的真实X账号',
      ],
    };
  }

  private getMockJike(plan: DayPlan | undefined): Record<string, unknown> {
    return {
      platform: '即刻',
      title: '一人公司创业者最大的误区是什么？',
      body: `最近和几个一人公司的朋友聊天，发现一个很有意思的现象：

大家最容易犯的误区不是"不够努力"，而是"太努力了"。

什么都自己干——自己写文案、自己剪视频、自己做设计、自己回客户……

但其实2026年了，AI已经可以帮你搞定80%的重复工作。

我自己的经验是：
1. 内容生产交给AI策略+AI写作
2. 网站搭建用AI建站工具
3. 客户承接用自动化流程

【可替换：分享你自己的AI使用经验】

省出来的时间干嘛？做真正需要人来做的事——客户沟通、产品打磨、战略思考。

想问问大家：你们做一人公司，最大的时间黑洞是什么？欢迎评论区聊聊 👇`,
      tags: ['#一人公司', '#AI工具', '#创业'],
      cta: '评论分享你的时间黑洞',
      mediaPrompt: '无需配图，文字帖即可',
      riskCheck: { passed: true, warnings: [] },
      editableHints: ['中间的个人经验部分替换为你自己的真实使用体验'],
    };
  }
}
