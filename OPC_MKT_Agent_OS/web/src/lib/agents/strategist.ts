import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// Strategist Agent — 营销策略规划
// 输入：品牌上下文 + 目标
// 输出：7 天营销计划
// ==========================================

export class StrategistAgent extends BaseAgent {
  name = 'strategist';

  protected buildSystemPrompt(): string {
    return `你是一个专业的营销策略师，精通小红书、抖音、视频号、X（Twitter）、即刻等平台的内容运营。

你的任务是基于品牌定位和目标受众，制定一个 7 天的内容营销计划。

## 核心能力
- 深谙小红书 CES 评分机制（评论权重 > 收藏 > 点赞）
- 熟悉搜索 SEO 策略：标题前 18 字必须包含核心关键词
- 了解各平台算法偏好和内容推荐机制
- 能根据不同平台特性调整内容策略

## 输出规则
1. 严格输出 JSON 格式（不要添加任何 JSON 以外的文本）
2. 7 天计划需要覆盖多个平台，不要只集中在一个平台
3. 内容类型要多样化（图文、短视频、推文等）
4. 每天的 CTA 策略要具体、可执行
5. 关键词要和品牌定位强相关

## 输出格式
\`\`\`json
{
  "weeklyPlan": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "主题描述",
      "platform": "平台名称",
      "contentType": "图文笔记|短视频|推文|社区帖",
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "ctaStrategy": "具体的 CTA 引导策略",
      "notes": "补充说明"
    }
  ],
  "overallGoal": "本周总体目标描述",
  "targetMetrics": {
    "impressions": 10000,
    "engagement": 500,
    "leads": 20
  }
}
\`\`\``;
  }

  protected buildUserPrompt(input: AgentInput): string {
    const ctx = input.context;
    const goal = (ctx.goal as string) ?? '提升品牌曝光和获客';
    const platforms = (ctx.platforms as string[]) ?? ['小红书', '抖音', '视频号', 'X', '即刻'];
    const startDate = (ctx.startDate as string) ?? new Date().toISOString().split('T')[0];

    return `## 品牌信息
${JSON.stringify(ctx.brand ?? ctx, null, 2)}

## 产品/服务
${JSON.stringify(ctx.offers ?? [], null, 2)}

## 目标受众
${JSON.stringify(ctx.audience ?? [], null, 2)}

## 过往素材/案例
${JSON.stringify(ctx.proof ?? [], null, 2)}

## 禁用表达
${JSON.stringify(ctx.forbidden_claims ?? [], null, 2)}

## 本周目标
${goal}

## 目标平台
${platforms.join('、')}

## 起始日期
${startDate}

请基于以上信息，输出 7 天的内容营销计划（JSON 格式）。`;
  }

  protected getMockResponse(input: AgentInput): Record<string, unknown> {
    const startDate = (input.context.startDate as string) ?? '2026-03-11';
    const baseDateMs = new Date(startDate).getTime();

    const formatDate = (dayOffset: number): string => {
      const d = new Date(baseDateMs + dayOffset * 86400000);
      return d.toISOString().split('T')[0];
    };

    return {
      weeklyPlan: [
        {
          day: 1,
          date: formatDate(0),
          theme: '痛点引入 — 为什么有流量却不成交',
          platform: '小红书',
          contentType: '图文笔记',
          keywords: ['一人公司', 'AI营销', '流量转化'],
          ctaStrategy: "评论区引导：评论'OPC'领取诊断模板",
          notes: '标题前18字包含核心关键词，封面用数据对比图',
        },
        {
          day: 2,
          date: formatDate(1),
          theme: '案例拆解 — 从0到1搭建AI业务系统',
          platform: '抖音',
          contentType: '短视频',
          keywords: ['AI业务系统', '一人公司', '自动化'],
          ctaStrategy: '主页链接引流，评论区置顶引导私信',
          notes: '3秒hook：你还在手动发内容？用AI，一个人顶一个团队',
        },
        {
          day: 3,
          date: formatDate(2),
          theme: '工具推荐 — 一人公司必备AI工具栈',
          platform: '小红书',
          contentType: '图文笔记',
          keywords: ['AI工具', '效率提升', '一人公司工具'],
          ctaStrategy: "收藏+评论'工具'获取完整工具清单",
          notes: '列表式内容，配截图展示工具界面',
        },
        {
          day: 4,
          date: formatDate(3),
          theme: '干货分享 — 小红书SEO排名前3的秘密',
          platform: '视频号',
          contentType: '短视频',
          keywords: ['小红书SEO', '关键词优化', '搜索排名'],
          ctaStrategy: '关注+转发抽3人送SEO检查表',
          notes: '口播+字幕，控制在60秒内',
        },
        {
          day: 5,
          date: formatDate(4),
          theme: '观点输出 — 2026年一人公司的3个增长杠杆',
          platform: 'X',
          contentType: '推文线程',
          keywords: ['增长杠杆', '一人公司', 'AI创业'],
          ctaStrategy: 'Thread末尾引导关注+转推',
          notes: '5条线程，每条核心观点+论据',
        },
        {
          day: 6,
          date: formatDate(5),
          theme: '社区互动 — 一人公司创业者最大的误区',
          platform: '即刻',
          contentType: '社区帖',
          keywords: ['创业误区', '一人公司', '经验分享'],
          ctaStrategy: '提问式结尾引导讨论，回复每条评论',
          notes: '互动式内容，引发讨论和共鸣',
        },
        {
          day: 7,
          date: formatDate(6),
          theme: '成果展示 — 客户14天建站全过程复盘',
          platform: '小红书',
          contentType: '图文笔记',
          keywords: ['建站案例', 'AI网站', '客户案例'],
          ctaStrategy: "评论'方案'获取定制咨询",
          notes: 'Before/After对比，配客户反馈截图',
        },
      ],
      overallGoal: '通过多平台内容矩阵，建立「AI业务增长系统」专家心智，引导目标用户（一人公司创业者/企业老板）进入咨询转化通道',
      targetMetrics: {
        impressions: 15000,
        engagement: 800,
        leads: 30,
      },
    };
  }
}
