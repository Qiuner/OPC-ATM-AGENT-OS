import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// Video Agent — 短视频脚本创作
// 覆盖: 抖音/视频号 短视频脚本、口播稿、分镜
// 输入: 策略计划 + 品牌上下文
// 输出: 完整视频脚本（hook+正文+CTA+分镜建议）
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

export class VideoAgent extends BaseAgent {
  name = 'video';

  protected buildSystemPrompt(): string {
    return `你是资深短视频编导和脚本作家，精通抖音、视频号、小红书视频的内容创作。

## 核心定位
你负责所有短视频类内容：口播脚本、情景脚本、教程视频、分镜稿。
每次输出完整脚本，包含标题、hook、正文、CTA、分镜建议。

## 视频脚本规则

### 通用结构
- **Hook (前3秒)**: 必须有强吸引力——冲突/提问/数据/痛点
- **正文 (15-50秒)**: 干货密集，节奏紧凑，每10秒一个信息点
- **CTA (结尾3-5秒)**: 明确行动引导（关注/评论/私信）

### 抖音
- 时长控制在 30-60 秒（完播率优先）
- hook 决定 70% 的完播率
- 字幕文案简洁有力
- 评论区引导互动

### 视频号
- 时长可稍长，60-120 秒
- 微信生态友好，适合教程/分享类
- 口播为主，适当加 B-roll
- 引导关注/转发到朋友圈

### 小红书视频
- 时长 15-60 秒
- 封面要有文字标题
- 配合图文笔记发布效果更好

## 完播率优化技巧
- 开头不废话，直接切入
- 中间设置"钩子"防止滑走（"接下来这个更重要"）
- 视觉变化频率：每 3-5 秒有画面切换
- 结尾留悬念或引导下一条

## 输出格式
\`\`\`json
{
  "platform": "抖音/视频号/小红书",
  "title": "视频标题",
  "duration": "预计时长(秒)",
  "script": {
    "hook": "前3秒台词",
    "body": "正文台词（分段标注时间点）",
    "cta": "结尾台词"
  },
  "subtitleText": "完整字幕文本",
  "storyboard": [
    { "time": "0-3s", "visual": "画面描述", "audio": "台词/音效" }
  ],
  "tags": ["#标签1", "#标签2"],
  "coverSuggestion": "封面建议",
  "mediaPrompt": "素材需求描述",
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

请为「${dayPlan?.platform ?? '抖音'}」创作一条${dayPlan?.contentType ?? '短视频'}脚本。

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
    const platform = dayPlan?.platform ?? '抖音';

    return {
      platform,
      title: '一个人如何用AI顶替一个营销团队？',
      duration: '45秒',
      script: {
        hook: '"你还在手动发内容、手动回私信？2026年了，一个人用AI完全可以顶一个5人团队。"',
        body: `很多一人公司老板跟我说："我知道要做内容，但一个人根本忙不过来。"

其实你不需要忙过来，你需要的是一套AI业务系统：

第一步：用AI生成内容策略——不用每天想发什么
第二步：用AI批量写内容——一次产出一周的量
第三步：搭一个自动化承接网站——24小时自动展示案例和服务

【可替换：这里可以展示你自己的系统截图或操作演示】

我帮一个做设计的老板搭了这套系统，14天上线，第一周就来了3个咨询。`,
        cta: '如果你也是一人公司，想搭建自己的AI增长系统——关注我，主页有详细介绍。评论区扣"系统"，我发你搭建指南。',
      },
      subtitleText: '你还在手动发内容、手动回私信？2026年了，一个人用AI完全可以顶一个5人团队……',
      storyboard: [
        { time: '0-3s', visual: '真人出镜，直视镜头', audio: 'Hook台词' },
        { time: '3-8s', visual: '痛点画面：手忙脚乱的工作场景', audio: '引出问题' },
        { time: '8-15s', visual: '屏幕录制：AI生成内容策略', audio: '第一步讲解' },
        { time: '15-25s', visual: '屏幕录制：批量内容生成', audio: '第二步讲解' },
        { time: '25-35s', visual: '网站展示画面', audio: '第三步讲解 + 案例数据' },
        { time: '35-45s', visual: '真人出镜 + 字幕CTA', audio: 'CTA引导' },
      ],
      tags: ['#一人公司', '#AI自动化', '#业务系统'],
      coverSuggestion: '文字标题："一个人 = 一个团队？"，背景用AI工具界面截图',
      mediaPrompt: '视频建议：真人口播 + 屏幕录制展示系统操作，字幕用黑底白字，关键词高亮',
      riskCheck: { passed: true, warnings: [] },
      editableHints: [
        '干货部分的三个步骤可根据实际服务内容调整',
        '案例数据替换为你自己的客户案例',
      ],
    };
  }
}
