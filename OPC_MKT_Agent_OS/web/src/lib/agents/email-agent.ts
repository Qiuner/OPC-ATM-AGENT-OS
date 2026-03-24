import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// Email Agent — 邮件营销 / Newsletter 创作
// 覆盖: 营销邮件、Newsletter、客户跟进邮件
// 输入: 策略计划 + 品牌上下文
// 输出: 完整邮件（主题行+正文+CTA）
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

export class EmailAgent extends BaseAgent {
  name = 'email';

  protected buildSystemPrompt(): string {
    return `你是资深邮件营销专家，擅长撰写高打开率、高点击率的营销邮件和 Newsletter。

## 核心定位
你负责所有邮件类内容的创作，包括营销邮件、周报 Newsletter、客户培育序列。
每次输出完整邮件，包含主题行、预览文本、正文、CTA。

## 邮件类型规则

### 营销邮件
- 主题行：≤50 字符，制造紧迫感或好奇心
- 预览文本：≤90 字符，补充主题行未说完的内容
- 正文：300-600 字，1 个核心信息 + 1 个明确 CTA
- CTA 按钮文案：动词开头，≤5 个字

### Newsletter
- 主题行包含期数或日期标识
- 正文：3-5 个内容板块，每个板块 50-100 字
- 排版：清晰的标题分隔，适合快速浏览
- 末尾引导回复/转发/分享

### 客户培育邮件
- 个性化称呼
- 以提供价值为主，不硬推销
- 内容与客户阶段匹配（认知→兴趣→决策）

## 打开率优化技巧
- 主题行包含数字或具体结果
- 避免垃圾邮件触发词（免费、限时、紧急）
- 发送时间：工作日 9-11am 或 2-4pm
- A/B 测试主题行变体

## 输出格式
\`\`\`json
{
  "platform": "邮件",
  "emailType": "营销邮件/Newsletter/培育邮件",
  "subject": "主题行",
  "previewText": "预览文本",
  "body": "正文内容（HTML 或 Markdown）",
  "cta": {
    "text": "CTA 按钮文案",
    "url": "链接占位符"
  },
  "tags": ["#标签1"],
  "sendTimeSuggestion": "建议发送时间",
  "subjectVariants": ["变体A", "变体B"],
  "riskCheck": { "passed": true, "warnings": [] },
  "editableHints": ["可替换的部分说明"]
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

请撰写一封完整的${dayPlan?.contentType ?? '营销邮件'}。

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
    return {
      platform: '邮件',
      emailType: '营销邮件',
      subject: '用AI搭建营销系统：14天从0到第一个付费客户',
      previewText: '一人公司老板的实战复盘，附完整操作步骤',
      body: `Hi，

最近帮一个做设计咨询的一人公司老板搭建了AI营销系统。

**14天的结果：**
- 5个平台的内容从0开始持续输出
- 第一周获得3个有效咨询
- 内容生产效率提升5倍

核心方法其实不复杂，就三步：

**1. 建立上下文资产库**
把你的产品卖点、客户案例、品牌调性结构化存储。AI每次生成内容时都能参考，不跑偏。

**2. AI批量内容生成**
一键生成7天5平台的内容计划和草稿，人工审核修改后发布。

**3. 数据驱动迭代**
【可替换：放你自己的数据案例】
每周复盘内容效果，AI自动给出下一周的优化建议。

如果你也想搭建这样的系统，我整理了一份详细的操作指南。

点击下方按钮免费领取 👇`,
      cta: {
        text: '领取操作指南',
        url: '{{CTA_URL}}',
      },
      tags: ['#一人公司', '#AI营销', '#邮件营销'],
      sendTimeSuggestion: '工作日 10:00 AM',
      subjectVariants: [
        '一人公司如何用AI做出5人团队的营销效果？',
        '14天实测：AI营销系统帮我拿到第一个客户',
      ],
      riskCheck: { passed: true, warnings: [] },
      editableHints: [
        '案例数据替换为你自己的真实数据',
        'CTA链接替换为你的实际落地页',
      ],
    };
  }
}
