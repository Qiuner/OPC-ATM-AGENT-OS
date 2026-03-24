import { BaseAgent } from './base';
import type { AgentInput } from './base';

// ==========================================
// PM Agent — 项目经理，任务拆解与分配
// ==========================================

export type AgentRole = 'strategist' | 'writer' | 'publisher' | 'analyst';

export interface TaskItem {
  agent: AgentRole;
  action: string;
  priority: number;
}

export interface TaskBreakdown {
  summary: string;
  tasks: TaskItem[];
}

export class PMAgent extends BaseAgent {
  name = 'pm';

  protected buildSystemPrompt(): string {
    return `你是 OPC 营销操作系统的项目经理（PM）。你的职责是：
1. 理解老板的指令意图
2. 将指令拆解为具体的 Agent 任务
3. 决定需要调用哪些 Agent（strategist/writer/publisher/analyst）
4. 给出任务分配方案

可用的 Agent：
- strategist: 制定营销策略和计划（7天内容日历、平台策略、关键词规划）
- writer: 生成各平台内容草稿（小红书笔记、抖音脚本、X推文等）
- publisher: 格式化和导出发布包（风险检测、平台适配、Markdown导出）
- analyst: 数据分析和复盘（效果评估、优化建议、ROI分析）

## 任务拆解规则
- 如果是"制定计划/策略"类指令 → 必须包含 strategist
- 如果是"生成内容/写文案"类指令 → 必须包含 strategist + writer
- 如果是"发布/导出"类指令 → 必须包含 writer + publisher
- 如果是"分析/复盘/优化"类指令 → 必须包含 analyst
- 如果是综合性指令（如"做一个完整营销方案"）→ 按顺序: strategist → writer → publisher
- priority 数字越小优先级越高，从 1 开始

## 输出规则
严格输出 JSON 格式，不要添加任何 JSON 以外的文本：
\`\`\`json
{
  "summary": "对用户指令的简短理解",
  "tasks": [
    { "agent": "strategist", "action": "制定7天营销计划", "priority": 1 },
    { "agent": "writer", "action": "生成内容草稿", "priority": 2 }
  ]
}
\`\`\``;
  }

  protected buildUserPrompt(input: AgentInput): string {
    const message = (input.context.message as string) ?? '';
    return `老板的指令：「${message}」\n\n请分析这个指令，拆解为具体的 Agent 任务。`;
  }

  protected getMockResponse(input: AgentInput): Record<string, unknown> {
    const message = ((input.context.message as string) ?? '').toLowerCase();

    // 根据关键词判断任务类型
    const hasStrategy = /计划|策略|规划|推广|营销|方案/.test(message);
    const hasContent = /内容|文案|写|生成|创作|脚本/.test(message);
    const hasPublish = /发布|导出|上线|排期/.test(message);
    const hasAnalysis = /分析|复盘|数据|优化|效果/.test(message);

    const tasks: TaskItem[] = [];
    let priority = 1;

    if (hasStrategy || (!hasContent && !hasPublish && !hasAnalysis)) {
      tasks.push({ agent: 'strategist', action: '制定7天营销计划', priority: priority++ });
    }
    if (hasContent || hasStrategy) {
      tasks.push({ agent: 'writer', action: '生成各平台内容草稿', priority: priority++ });
    }
    if (hasPublish || (hasContent && !hasAnalysis)) {
      tasks.push({ agent: 'publisher', action: '格式化发布包', priority: priority++ });
    }
    if (hasAnalysis) {
      tasks.push({ agent: 'analyst', action: '数据分析与优化建议', priority: priority++ });
    }

    // 默认至少包含 strategist + writer
    if (tasks.length === 0) {
      tasks.push(
        { agent: 'strategist', action: '制定7天营销计划', priority: 1 },
        { agent: 'writer', action: '生成各平台内容草稿', priority: 2 },
        { agent: 'publisher', action: '格式化发布包', priority: 3 },
      );
    }

    return {
      summary: `理解指令：「${(input.context.message as string) ?? ''}」，将分配给 ${tasks.length} 个 Agent 协作完成。`,
      tasks,
    };
  }

  /**
   * 分析用户指令，返回任务拆解
   */
  async analyzeTask(userMessage: string, context: Record<string, unknown>): Promise<TaskBreakdown> {
    const result = await this.run({
      context: { ...context, message: userMessage },
    });

    if (result.status === 'failed') {
      // 降级到默认任务拆解
      return {
        summary: `收到指令：「${userMessage}」`,
        tasks: [
          { agent: 'strategist', action: '制定营销策略', priority: 1 },
          { agent: 'writer', action: '生成内容草稿', priority: 2 },
        ],
      };
    }

    const data = result.data as Record<string, unknown>;
    return {
      summary: (data.summary as string) ?? `任务已拆解`,
      tasks: (data.tasks as TaskItem[]) ?? [],
    };
  }
}
