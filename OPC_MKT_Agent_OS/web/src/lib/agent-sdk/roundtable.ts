/**
 * 圆桌讨论引擎 — 共创模式
 *
 * 从 agent-chat/ 迁移核心逻辑，支持：
 * - explore（发散探索）/ debate（聚焦辩论）/ synthesize（综合分析）三种模式
 * - 多 LLM 提供商（Claude/OpenAI/Gemini/DeepSeek/MiniMax/GLM）
 * - 主持人智能调度 + Agent 轮次发言
 * - 讨论总结可作为 context 传入 CEO Supervisor 执行
 *
 * 输出为 async generator，用于 SSE 流式推送。
 */

import { createProvider } from "@/lib/llm/provider";
import type { ProviderName, LLMProvider } from "@/lib/llm/types";
import { eventBus } from "./event-bus";

// ============================================================
// 类型定义
// ============================================================

export type DiscussionMode = "explore" | "debate" | "synthesize";

export interface RoundtableAgent {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  systemPrompt: string;
  personalityStrength: number;
}

export interface RoundtableConfig {
  topic: string;
  agents: RoundtableAgent[];
  mode: DiscussionMode;
  maxRounds: number;
  llmConfig: {
    provider: ProviderName;
    model?: string;
    apiKey?: string;
  };
}

export type RoundtableEvent =
  | { type: "moderator"; content: string; round: number }
  | { type: "agent_response"; agentId: string; agentName: string; content: string; round: number }
  | { type: "summary"; content: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string };

// ============================================================
// 模式指令
// ============================================================

const MODE_INSTRUCTIONS: Record<DiscussionMode, { label: string; agentGuide: string; roundContinue: string }> = {
  explore: {
    label: "发散探索",
    agentGuide: `讨论模式：发散探索
- 提出新的角度、可能性和假设
- 鼓励联想和跨领域思考
- 不急于下结论，多问"如果..."、"还有没有可能..."
- 可以提出看似不相关但有启发的类比`,
    roundContinue: "请基于之前的讨论，提出新的角度或被忽略的可能性。不要重复已有观点，而是拓展思考边界。",
  },
  debate: {
    label: "聚焦辩论",
    agentGuide: `讨论模式：聚焦辩论
- 找出其他角色观点中的逻辑漏洞或隐含假设
- 用反例和证据挑战对方
- 明确表达同意或反对，并给出理由
- 追问"证据是什么？"、"这个推论成立的前提是？"`,
    roundContinue: "请针对之前讨论中最有争议的观点展开辩论。挑战你不同意的论点，强化你认为正确的立场，给出具体理由。",
  },
  synthesize: {
    label: "综合分析",
    agentGuide: `讨论模式：综合分析
- 寻找不同观点之间的共同点和互补性
- 尝试整合多个视角形成更完整的理解
- 指出哪些问题已经有了清晰答案，哪些还需要深入
- 提炼出可操作的结论或框架`,
    roundContinue: "请综合之前所有讨论，提炼核心洞察。指出哪些观点可以整合，哪些分歧背后的根本原因是什么。",
  },
};

// ============================================================
// Prompt 构建
// ============================================================

function buildModeratorOpeningPrompt(
  agents: RoundtableAgent[],
  topic: string,
  mode: DiscussionMode,
  maxRounds: number,
): string {
  const agentList = agents.map((a) => `- ${a.name}（@${a.nameEn}）: ${a.role}`).join("\n");
  const modeInfo = MODE_INSTRUCTIONS[mode];

  return `你是一位圆桌讨论的主持人。你的职责是引导高质量的多角色讨论。

当前参与者：
${agentList}

讨论模式：${modeInfo.label}
最多讨论轮次：${maxRounds}

用户提出了以下问题：
「${topic}」

请：
1. 用1-2句话简短开场，说明这个问题值得从哪些角度探讨
2. 决定谁最适合首先发言（可以选1-3位），以及为什么

在回复最后，必须输出决策JSON（用 \`\`\`json 包裹）：
\`\`\`json
{
  "action": "call_agents",
  "nextAgentIds": ["agent的nameEn"],
  "reason": "选择理由"
}
\`\`\``;
}

function buildModeratorTurnPrompt(
  agents: RoundtableAgent[],
  transcript: string,
  currentRound: number,
  maxRounds: number,
  mode: DiscussionMode,
): string {
  const agentList = agents.map((a) => `- ${a.name}（@${a.nameEn}）: ${a.role}`).join("\n");
  const modeInfo = MODE_INSTRUCTIONS[mode];

  return `你是圆桌讨论主持人。请分析当前讨论进展并决定下一步。

参与者：
${agentList}

讨论模式：${modeInfo.label}
当前进度：第 ${currentRound}/${maxRounds} 轮

讨论记录：
${transcript}

请检查：
1. 是否有观点在重复？
2. 是否偏离了原始话题？
3. 是否已达成共识？
4. 哪些角色的视角还没有被充分表达？

${currentRound >= maxRounds - 1 ? "已接近最大轮次，请倾向于总结讨论。" : ""}

在回复最后，必须输出决策JSON（用 \`\`\`json 包裹）：
\`\`\`json
{
  "action": "call_agents 或 summarize 或 end_discussion",
  "nextAgentIds": ["要发言的角色nameEn"],
  "reason": "决策理由"
}
\`\`\``;
}

function buildModeratorSummaryPrompt(transcript: string, topic: string): string {
  return `你是圆桌讨论主持人。讨论已经结束，请生成最终总结。

用户原始问题：「${topic}」

完整讨论记录：
${transcript}

请输出结构化总结：

## 核心共识
（所有或多数角色认同的观点，标注提出者）

## 关键分歧
（存在的主要争议，以及各方立场）

## 重要洞察
（讨论中最有价值的观点、类比或框架）

## 待深入探讨
（提出但未充分展开的问题，建议下一步讨论方向）

## 可执行建议
（基于讨论结果，给出 3-5 条可直接执行的行动建议）

要求：简明扼要，每个板块3-5条，标注是哪位角色提出的。`;
}

function buildAgentSystemPrompt(
  agent: RoundtableAgent,
  allAgents: RoundtableAgent[],
  mode: DiscussionMode,
  roundNumber: number,
  totalRounds: number,
): string {
  const otherAgents = allAgents
    .filter((a) => a.id !== agent.id)
    .map((a) => `- ${a.name}（@${a.nameEn}）: ${a.role}`)
    .join("\n");

  const modeInfo = MODE_INSTRUCTIONS[mode];

  let personalityInstruction: string;
  if (agent.personalityStrength <= 30) {
    personalityInstruction = "保持客观中立，以事实和数据为主";
  } else if (agent.personalityStrength <= 70) {
    personalityInstruction = "在保持专业的同时，适度展现你的个性和观点倾向";
  } else {
    personalityInstruction = "大胆展现你的个性，用你独特的视角和表达方式来回应";
  }

  let roundGuide = "";
  if (roundNumber === 1) {
    roundGuide = "这是第一轮讨论，请先给出你的核心观点和初步分析。";
  } else if (roundNumber === totalRounds) {
    roundGuide = `这是最后一轮（第${roundNumber}轮），请给出经过多轮讨论后的最终观点。`;
  } else {
    roundGuide = `这是第${roundNumber}轮讨论（共${totalRounds}轮），请基于前面的讨论深入展开。`;
  }

  return `${agent.systemPrompt}

---
你正在参与一场圆桌讨论。

当前讨论中的其他角色：
${otherAgents}

${modeInfo.agentGuide}

个性表达指引（当前强度: ${agent.personalityStrength}/100）：
${personalityInstruction}

${roundGuide}

重要规则：
1. 你是 ${agent.name}（@${agent.nameEn}），只用你的专业视角回答
2. 用中文回复，控制在 500 字以内
3. 如果前面有其他角色发言，必须回应他们的观点
4. 不同意别人观点时直接说出来并给理由
5. 每次发言要有新的贡献，不要重复之前已经说过的内容`;
}

// ============================================================
// 决策解析
// ============================================================

interface ModeratorDecision {
  action: "call_agents" | "summarize" | "end_discussion";
  nextAgentIds: string[];
  reason: string;
}

function parseModeratorDecision(text: string): { displayText: string; decision: ModeratorDecision } {
  const defaultDecision: ModeratorDecision = {
    action: "end_discussion",
    nextAgentIds: [],
    reason: "无法解析决策",
  };

  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    return { displayText: text.trim(), decision: defaultDecision };
  }

  const displayText = text.replace(/```json\s*[\s\S]*?\s*```/, "").trim();

  try {
    const parsed = JSON.parse(jsonMatch[1]) as ModeratorDecision;
    if (!parsed.action) parsed.action = "end_discussion";
    if (!parsed.nextAgentIds) parsed.nextAgentIds = [];
    return { displayText, decision: parsed };
  } catch {
    return { displayText: text.trim(), decision: defaultDecision };
  }
}

// ============================================================
// LLM 调用封装
// ============================================================

async function callLLM(
  provider: LLMProvider,
  systemPrompt: string,
  userMessage: string,
  model?: string,
): Promise<string> {
  const response = await provider.chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    { model, maxTokens: 2000 },
  );
  return response.content;
}

// ============================================================
// 圆桌讨论核心引擎
// ============================================================

export async function* runRoundtable(config: RoundtableConfig): AsyncGenerator<RoundtableEvent> {
  const { topic, agents, mode, maxRounds, llmConfig } = config;

  if (agents.length === 0) {
    yield { type: "error", message: "至少需要 1 个参与 Agent" };
    return;
  }

  let provider: LLMProvider;
  try {
    provider = createProvider(llmConfig.provider, llmConfig.apiKey);
  } catch (err) {
    yield { type: "error", message: `LLM 提供商初始化失败: ${err instanceof Error ? err.message : "unknown"}` };
    return;
  }

  const transcript: string[] = [];
  const agentMap = new Map(agents.map((a) => [a.nameEn, a]));
  let fullSummary = "";

  eventBus.emit({ type: "agent:start", agentId: "__roundtable__", data: { topic, mode, agents: agents.length } });

  try {
    // === 主持人开场 ===
    const openingPrompt = buildModeratorOpeningPrompt(agents, topic, mode, maxRounds);
    const openingResponse = await callLLM(provider, openingPrompt, topic, llmConfig.model);
    const { displayText: openingText, decision: openingDecision } = parseModeratorDecision(openingResponse);

    transcript.push(`[主持人]: ${openingText}`);
    yield { type: "moderator", content: openingText, round: 0 };

    // === 轮次讨论 ===
    for (let round = 1; round <= maxRounds; round++) {
      const agentsToCall = round === 1
        ? openingDecision.nextAgentIds
        : [];

      // 如果不是第一轮，由主持人决定下一步
      if (round > 1) {
        const turnPrompt = buildModeratorTurnPrompt(agents, transcript.join("\n\n"), round, maxRounds, mode);
        const turnResponse = await callLLM(provider, turnPrompt, "请决定下一步", llmConfig.model);
        const { displayText: turnText, decision: turnDecision } = parseModeratorDecision(turnResponse);

        transcript.push(`[主持人 第${round}轮]: ${turnText}`);
        yield { type: "moderator", content: turnText, round };

        if (turnDecision.action === "summarize" || turnDecision.action === "end_discussion") {
          break;
        }

        agentsToCall.push(...(turnDecision.nextAgentIds || []));
      }

      // 确定要发言的 Agent
      const speakingAgents = agentsToCall.length > 0
        ? agentsToCall.map((nameEn) => agentMap.get(nameEn)).filter(Boolean) as RoundtableAgent[]
        : agents; // 如果主持人没指定，全员发言

      // Agent 逐个发言
      for (const agent of speakingAgents) {
        const systemPrompt = buildAgentSystemPrompt(agent, agents, mode, round, maxRounds);
        const contextMessage = round > 1
          ? `${transcript.join("\n\n")}\n\n[第${round}轮指引] ${MODE_INSTRUCTIONS[mode].roundContinue}`
          : topic;

        try {
          const response = await callLLM(provider, systemPrompt, contextMessage, llmConfig.model);
          transcript.push(`${agent.name}（@${agent.nameEn}）: ${response}`);

          eventBus.emit({
            type: "agent:text",
            agentId: agent.id,
            data: { text: response.slice(0, 100) },
          });

          yield {
            type: "agent_response",
            agentId: agent.id,
            agentName: agent.name,
            content: response,
            round,
          };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Agent 响应失败";
          yield {
            type: "agent_response",
            agentId: agent.id,
            agentName: agent.name,
            content: `[错误] ${errMsg}`,
            round,
          };
        }
      }
    }

    // === 生成总结 ===
    const summaryPrompt = buildModeratorSummaryPrompt(transcript.join("\n\n"), topic);
    fullSummary = await callLLM(provider, summaryPrompt, "请生成讨论总结", llmConfig.model);

    yield { type: "summary", content: fullSummary };
    yield { type: "done", summary: fullSummary };

    eventBus.emit({ type: "agent:done", agentId: "__roundtable__", data: { rounds: maxRounds } });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "圆桌讨论执行失败";
    eventBus.emit({ type: "agent:done", agentId: "__roundtable__", data: { error: errMsg } });
    yield { type: "error", message: errMsg };
  }
}
