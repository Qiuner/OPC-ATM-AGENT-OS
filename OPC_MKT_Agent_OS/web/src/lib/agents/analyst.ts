import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// Analyst Agent — 数据分析与优化建议
// ==========================================

export class AnalystAgent extends BaseAgent {
  name = 'analyst';

  protected buildSystemPrompt(): string {
    return `你是 OPC 营销操作系统的数据分析师。你的职责是：
1. 分析营销活动的效果数据
2. 识别表现最佳和最差的内容/平台
3. 给出具体的优化建议
4. 提供 ROI 评估和预测

## 分析维度
- **平台效果对比**：各平台的曝光量、互动率、转化率
- **内容类型分析**：哪种内容类型效果最好
- **时间维度分析**：发布时间对效果的影响
- **关键词效果**：哪些关键词带来了更多流量
- **转化漏斗**：从曝光到转化的各环节数据

## 输出规则
严格输出 JSON 格式：
\`\`\`json
{
  "analysis": {
    "overview": "整体分析概述",
    "platformBreakdown": [
      {
        "platform": "平台名",
        "performance": "表现评估",
        "highlights": "亮点",
        "issues": "问题"
      }
    ],
    "topContent": "表现最佳的内容描述",
    "bottomContent": "表现最差的内容描述"
  },
  "recommendations": [
    {
      "priority": "high/medium/low",
      "area": "优化方向",
      "action": "具体行动建议",
      "expectedImpact": "预期效果"
    }
  ],
  "nextSteps": ["下一步行动1", "下一步行动2"]
}
\`\`\``;
  }

  protected buildUserPrompt(input: AgentInput): string {
    const ctx = input.context;
    const goal = (ctx.goal as string) ?? '提升品牌曝光和获客';

    return `## 分析目标
${goal}

## 品牌信息
${JSON.stringify(ctx.brand ?? {}, null, 2)}

## 现有数据
${JSON.stringify(ctx.data ?? ctx.metrics ?? {}, null, 2)}

## 营销计划
${JSON.stringify(input.previousOutput ?? {}, null, 2)}

请基于以上信息，输出完整的数据分析报告和优化建议。`;
  }

  protected getMockResponse(input: AgentInput): Record<string, unknown> {
    return {
      analysis: {
        overview: '基于当前品牌定位和目标受众分析，一人公司 AI 营销策略具有较高的市场潜力。建议重点投入小红书和抖音两个平台，这两个平台的目标用户重合度最高。',
        platformBreakdown: [
          {
            platform: '小红书',
            performance: '核心阵地，搜索流量价值高',
            highlights: 'SEO 长尾效应好，笔记生命周期长',
            issues: '竞争激烈，需要持续产出高质量内容',
          },
          {
            platform: '抖音',
            performance: '曝光量大，适合破圈',
            highlights: '短视频传播速度快，算法推荐精准',
            issues: '内容制作成本较高，需要真人出镜效果更好',
          },
          {
            platform: 'X',
            performance: '国际化品牌建设',
            highlights: 'Thread 形式适合输出深度观点',
            issues: '国内用户触达有限',
          },
          {
            platform: '即刻',
            performance: '精准社区，转化率高',
            highlights: '用户质量高，互动真实',
            issues: '流量天花板较低',
          },
        ],
        topContent: '痛点引入类内容（如"为什么有流量却不成交"）互动率最高，建议增加此类内容比例',
        bottomContent: '纯工具推荐类内容互动率偏低，建议结合个人经验和案例',
      },
      recommendations: [
        {
          priority: 'high',
          area: '内容策略优化',
          action: '增加痛点引入+解决方案类内容比例至60%，减少纯工具推荐',
          expectedImpact: '预计互动率提升30-50%',
        },
        {
          priority: 'high',
          area: '搜索SEO优化',
          action: '每篇小红书笔记标题前18字必须包含2个以上核心关键词',
          expectedImpact: '搜索流量预计提升2-3倍',
        },
        {
          priority: 'medium',
          area: '转化通道建设',
          action: '搭建个人网站/案例展示页，统一所有平台的CTA指向',
          expectedImpact: '转化率预计提升20-40%',
        },
        {
          priority: 'medium',
          area: '发布时间优化',
          action: '小红书最佳发布时间：周二/四 18:00-20:00；抖音：周末 10:00-12:00',
          expectedImpact: '初始曝光量预计提升15-25%',
        },
      ],
      nextSteps: [
        '按优化建议调整下周内容计划',
        '搭建转化承接页面（案例展示+服务介绍）',
        '建立数据追踪体系，每周复盘关键指标',
      ],
    };
  }
}
