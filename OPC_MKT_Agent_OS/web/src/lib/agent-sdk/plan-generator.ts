/**
 * Plan Generator — CEO Agent 分析任务并生成 ExecutionPlan
 *
 * 不执行实际任务，仅让 CEO 分析需求、拆解步骤，
 * 输出结构化的 ExecutionPlan JSON。
 *
 * 使用 Claude API 直接调用（不走 Agent SDK 的 query），
 * 以获取纯 JSON 规划结果。
 */

import { eventBus } from "./event-bus";
import { createPlan } from "@/lib/store/plans";
import type { ExecutionPlan, PlanStep } from "marketing-agent-os-engine/types/plan";
import type { PlanStreamEvent } from "marketing-agent-os-engine/types/plan";

// Re-export for convenience
export type { PlanStreamEvent };

/** CEO 规划专用的系统提示词 */
function buildPlanningPrompt(agentList: string): string {
  return `你是 CEO 营销总监的「规划模块」。你的任务是分析用户需求，生成一个结构化的执行计划。

## 你的工作
1. 理解用户需求
2. 将需求拆解为具体步骤
3. 为每个步骤分配最合适的 Agent
4. 标注步骤间的依赖关系
5. 输出 JSON 格式的执行计划

## 可用团队成员
${agentList}

## 任务路由表
| 需求类型 | 目标 Agent |
|---------|-----------|
| 英文多平台内容（X/LinkedIn/Meta/Email/Blog） | global-content-agent |
| 推文/Twitter/Thread（英文） | x-twitter-agent |
| Meta/Facebook/Instagram 广告 | meta-ads-agent |
| Email 营销/序列 | email-agent |
| SEO 优化/关键词/内容策略 | seo-agent |
| GEO 优化/AI 搜索引擎优化 | geo-agent |
| 小红书笔记/种草内容 | xhs-agent |
| 播客/音频内容 | podcast-agent |
| 视觉内容/封面/海报 | visual-gen-agent |
| 营销策略/内容规划 | strategist-agent |
| 选题研究/热点分析/竞品 | growth-agent |
| 数据分析/内容复盘 | analyst-agent |
| 内容审查/品牌风控 | brand-reviewer |

## 输出格式
你必须输出一个 JSON 对象，格式如下（不要输出其他任何内容，只输出 JSON）：

\`\`\`json
{
  "taskSummary": "用一句话描述任务目标",
  "steps": [
    {
      "id": "step-1",
      "order": 1,
      "agentId": "agent-id",
      "action": "具体要做什么",
      "inputs": { "topic": "...", "requirements": "..." },
      "dependencies": []
    },
    {
      "id": "step-2",
      "order": 2,
      "agentId": "brand-reviewer",
      "action": "审查上一步产出的内容",
      "inputs": { "reviewTarget": "step-1" },
      "dependencies": ["step-1"]
    }
  ]
}
\`\`\`

## 规划原则
1. 每个步骤应该是一个原子操作，由一个 Agent 独立完成
2. 正确标注依赖关系（哪些步骤必须在其他步骤之后执行）
3. 可以并行的步骤不要标注依赖（如同时让多个平台 Agent 创作内容）
4. 所有内容创作步骤之后都应该有 brand-reviewer 审查步骤
5. 复杂任务先安排 strategist-agent 或 growth-agent 做分析
6. 步骤数量合理，不要过度拆分（通常 2-6 步）`;
}

/**
 * 生成执行计划的 async generator
 *
 * 流式返回 PlanStreamEvent，最终事件包含完整 plan 对象。
 */
export async function* generatePlan(
  userMessage: string,
  context?: Record<string, unknown>,
): AsyncGenerator<PlanStreamEvent> {
  try {
    // 动态导入避免构建时解析
    const { AgentRegistry } = await import("marketing-agent-os-engine/agents/registry");
    const registry = AgentRegistry.getInstance();
    const subAgents = registry.getSubAgentDefs();

    const agentList = subAgents
      .map((a) => `- ${a.id}: ${a.description}`)
      .join("\n");

    const systemPrompt = buildPlanningPrompt(agentList);

    const contextStr = context && Object.keys(context).length > 0
      ? `\n\n附加上下文：${JSON.stringify(context)}`
      : "";

    const fullPrompt = `${systemPrompt}\n\n用户需求：${userMessage}${contextStr}`;

    eventBus.emit({
      type: "agent:start",
      agentId: "ceo",
      data: { message: `Planning: ${userMessage.slice(0, 200)}`, mode: "plan" },
    });

    // 使用 Anthropic API 直接调用获取 JSON
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          { role: "user", content: fullPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errBody}`);
    }

    const result = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textContent = result.content.find((c) => c.type === "text");
    if (!textContent?.text) {
      throw new Error("No text content in API response");
    }

    // 从 CEO 响应中提取 JSON
    const planData = extractPlanJson(textContent.text);
    if (!planData) {
      throw new Error("Failed to parse plan JSON from CEO response");
    }

    // 创建并持久化计划
    const plan = createPlan({
      taskSummary: planData.taskSummary,
      steps: planData.steps.map((s: ParsedStep, idx: number) => ({
        id: s.id || `step-${idx + 1}`,
        order: s.order ?? idx + 1,
        agentId: s.agentId,
        action: s.action,
        inputs: s.inputs || {},
        dependencies: s.dependencies || [],
      })),
      estimatedAgents: [...new Set(planData.steps.map((s: ParsedStep) => s.agentId))],
      originalPrompt: userMessage,
    });

    eventBus.emit({
      type: "agent:done",
      agentId: "ceo",
      data: { planId: plan.id, mode: "plan" },
    });

    yield { type: "plan", plan };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Plan generation failed";
    eventBus.emit({
      type: "agent:done",
      agentId: "ceo",
      data: { error: errMsg, mode: "plan" },
    });
    yield { type: "plan_error", planId: "", message: errMsg };
  }
}

/** 从可能包含 markdown 的文本中提取 JSON 对象 */
interface ParsedStep {
  id: string;
  order?: number;
  agentId: string;
  action: string;
  inputs?: Record<string, unknown>;
  dependencies?: string[];
}

interface ParsedPlan {
  taskSummary: string;
  steps: ParsedStep[];
}

function extractPlanJson(text: string): ParsedPlan | null {
  // 尝试直接解析
  try {
    return JSON.parse(text) as ParsedPlan;
  } catch {
    // continue
  }

  // 尝试提取 ```json ... ``` 代码块
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch?.[1]) {
    try {
      return JSON.parse(jsonBlockMatch[1]) as ParsedPlan;
    } catch {
      // continue
    }
  }

  // 尝试找到第一个 { ... } 结构
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch?.[0]) {
    try {
      return JSON.parse(braceMatch[0]) as ParsedPlan;
    } catch {
      // continue
    }
  }

  return null;
}
