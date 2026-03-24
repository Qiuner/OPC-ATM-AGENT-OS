/**
 * Team Engine — Agent Team 模式的高级编排引擎
 *
 * 将 Claude Bridge 的低级 CLI 调用封装为面向业务的 Team API。
 * 每个任务在一次 claude -p 调用中完成完整的 Team 生命周期：
 *   创建团队 → spawn Agent → 协调执行 → 返回结果
 */

import { ClaudeBridge, type StreamJsonEvent, type BridgeResult } from "./claude-bridge";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __current_dir = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));

const ENGINE_DIR = join(__current_dir, "..");

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Agent Team 成员定义 */
export interface TeamMemberDef {
  name: string;
  role: string;
  description: string;
  skillFile?: string; // 相对于 engine/skills/ 的路径
}

/** Team 执行配置 */
export interface TeamExecutionConfig {
  /** 任务描述 */
  task: string;
  /** 团队成员（不传则使用默认营销团队） */
  members?: TeamMemberDef[];
  /** 团队名称 */
  teamName?: string;
  /** 最大预算（美元） */
  maxBudgetUsd?: number;
  /** 超时（毫秒） */
  timeoutMs?: number;
  /** 模型 */
  model?: "opus" | "sonnet" | "haiku";
}

/** Team 执行事件（对外暴露） */
export type TeamEvent =
  | { type: "team:created"; teamName: string }
  | { type: "team:member_spawned"; name: string; role: string }
  | { type: "team:member_message"; from: string; to: string; summary: string }
  | { type: "team:task_assigned"; agentName: string; task: string }
  | { type: "team:task_completed"; agentName: string; result: string }
  | { type: "team:text"; agentId: string; content: string }
  | { type: "team:tool_call"; agentId: string; tool: string; input: string }
  | { type: "team:done"; result: string; cost?: number }
  | { type: "team:error"; message: string }
  | { type: "team:raw"; event: StreamJsonEvent };

/** 默认营销团队配置 */
const DEFAULT_MARKETING_TEAM: TeamMemberDef[] = [
  {
    name: "ceo",
    role: "营销总监",
    description: "接收任务、分析需求、分配给合适的团队成员、质量把控",
    skillFile: undefined,
  },
  {
    name: "xhs-agent",
    role: "小红书营销专家",
    description: "创作高互动率的小红书笔记，遵循 SOP 标准",
    skillFile: "xhs.SKILL.md",
  },
  {
    name: "brand-reviewer",
    role: "品牌风控审查专家",
    description: "品牌一致性、敏感词、平台合规性审查",
    skillFile: "brand-reviewer.SKILL.md",
  },
  {
    name: "growth-agent",
    role: "增长策略师",
    description: "增长策略制定、渠道分析、A/B 测试方案设计",
    skillFile: "growth.SKILL.md",
  },
  {
    name: "analyst-agent",
    role: "数据分析师",
    description: "数据分析、趋势洞察、内容表现评估",
    skillFile: "analyst.SKILL.md",
  },
];

/* ------------------------------------------------------------------ */
/*  Team Engine                                                        */
/* ------------------------------------------------------------------ */

export class TeamEngine {
  private bridge: ClaudeBridge;

  constructor() {
    this.bridge = new ClaudeBridge();
  }

  /**
   * 执行团队协作任务
   *
   * 一次调用完成完整的 Team 生命周期。
   * 返回 async generator，实时产出 TeamEvent。
   */
  async *executeTask(config: TeamExecutionConfig): AsyncGenerator<TeamEvent> {
    const members = config.members ?? DEFAULT_MARKETING_TEAM;
    const teamName = config.teamName ?? "opc-marketing";

    // 加载 SKILL 文件内容
    const memberPrompts = await this.loadMemberPrompts(members);

    // 构建 CEO 系统提示词
    const systemPrompt = this.buildLeadSystemPrompt(teamName, members, memberPrompts);

    yield { type: "team:created", teamName };

    // 调用 Claude CLI
    const events = this.bridge.execute({
      prompt: config.task,
      appendSystemPrompt: systemPrompt,
      maxBudgetUsd: config.maxBudgetUsd ?? 2.0,
      model: config.model ?? "sonnet",
      permissionMode: "acceptEdits",
      cwd: ENGINE_DIR,
      timeoutMs: config.timeoutMs ?? 600_000, // 10 分钟
    });

    let finalResult = "";
    let totalCost: number | undefined;

    for await (const rawEvent of events) {
      // 转换 stream-json 事件为 TeamEvent
      const teamEvents = this.parseStreamEvent(rawEvent, members);

      for (const te of teamEvents) {
        yield te;
      }

      // 捕获最终结果
      if (rawEvent.type === "result") {
        finalResult = (rawEvent.result as string) || "";
        totalCost = rawEvent.total_cost_usd as number | undefined;
      }
    }

    yield {
      type: "team:done",
      result: finalResult,
      cost: totalCost,
    };
  }

  /** 中断当前执行 */
  abort() {
    this.bridge.abort("User cancelled");
  }

  /* ---------------------------------------------------------------- */
  /*  Private helpers                                                  */
  /* ---------------------------------------------------------------- */

  /** 加载成员 SKILL 文件 */
  private async loadMemberPrompts(
    members: TeamMemberDef[],
  ): Promise<Map<string, string>> {
    const prompts = new Map<string, string>();

    for (const member of members) {
      if (member.skillFile) {
        try {
          const content = await readFile(
            join(ENGINE_DIR, "skills", member.skillFile),
            "utf-8",
          );
          prompts.set(member.name, content);
        } catch {
          // SKILL 文件不存在，使用描述作为 fallback
          prompts.set(member.name, member.description);
        }
      }
    }

    return prompts;
  }

  /** 构建 Lead 系统提示词 */
  private buildLeadSystemPrompt(
    teamName: string,
    members: TeamMemberDef[],
    memberPrompts: Map<string, string>,
  ): string {
    const memberList = members
      .map((m) => `- **${m.name}** (${m.role}): ${m.description}`)
      .join("\n");

    const memberSkills = members
      .filter((m) => memberPrompts.has(m.name))
      .map((m) => {
        const prompt = memberPrompts.get(m.name)!;
        // 截取前 500 字作为摘要
        const summary = prompt.length > 500 ? prompt.slice(0, 500) + "..." : prompt;
        return `### ${m.name} 的专业能力\n${summary}`;
      })
      .join("\n\n");

    return `
## 你是营销团队的 Lead Agent

你需要使用 Agent Team 工具完成用户的营销任务。

### 执行步骤
1. 使用 TeamCreate 创建团队 "${teamName}"
2. 使用 Agent 工具 spawn 以下团队成员（带 team_name="${teamName}" 参数）
3. 使用 TaskCreate 创建任务列表
4. 通过 SendMessage 分配任务给适当的成员
5. 等待成员完成并收集结果
6. 汇总最终交付物

### 团队成员
${memberList}

### 成员专业知识
${memberSkills}

### 核心原则
- 你是调度者，绝不自己创作内容
- 必须使用 Agent Team 工具（TeamCreate → Agent → SendMessage）
- 成员间可以横向通信（如 xhs-agent 直接发消息给 brand-reviewer）
- 每个成员的 prompt 要包含其角色定义和工作 SOP
- 任务完成后输出结构化汇报

### 成员 Spawn 模板
每个成员的 Agent 调用需包含：
- name: 成员名
- team_name: "${teamName}"
- prompt: 角色定义 + SOP + 团队成员列表（让成员知道可以联系谁）
`;
  }

  /** 解析 stream-json 事件为 TeamEvent */
  private parseStreamEvent(
    event: StreamJsonEvent,
    members: TeamMemberDef[],
  ): TeamEvent[] {
    const results: TeamEvent[] = [];
    const memberNames = new Set(members.map((m) => m.name));

    switch (event.type) {
      case "assistant": {
        // 解析 content blocks
        const message = event.message as Record<string, unknown> | undefined;
        const content = message?.content;

        if (Array.isArray(content)) {
          for (const block of content) {
            if (block?.type === "text" && block?.text) {
              results.push({
                type: "team:text",
                agentId: "lead",
                content: block.text as string,
              });
            }

            if (block?.type === "tool_use") {
              const toolName = (block.name || "") as string;
              const input = block.input as Record<string, unknown> | undefined;

              // 检测 TeamCreate
              if (toolName === "TeamCreate") {
                // team creation is already yielded at start
              }

              // 检测 Agent spawn
              if (toolName === "Agent") {
                const agentName = (input?.name || "") as string;
                const teamMember = members.find((m) => m.name === agentName);
                if (teamMember) {
                  results.push({
                    type: "team:member_spawned",
                    name: agentName,
                    role: teamMember.role,
                  });
                }
              }

              // 检测 SendMessage
              if (toolName === "SendMessage") {
                const to = (input?.to || "") as string;
                const msg = input?.message;
                const summary = (input?.summary || "") as string;
                results.push({
                  type: "team:member_message",
                  from: "lead",
                  to,
                  summary: summary || (typeof msg === "string" ? msg.slice(0, 100) : ""),
                });
              }

              // 通用 tool_call
              results.push({
                type: "team:tool_call",
                agentId: "lead",
                tool: toolName,
                input: JSON.stringify(input || {}).slice(0, 300),
              });
            }
          }
        }
        break;
      }

      case "error": {
        results.push({
          type: "team:error",
          message: (event.result as string) || "Unknown error",
        });
        break;
      }

      default: {
        // 将未知事件类型透传
        results.push({ type: "team:raw", event });
        break;
      }
    }

    return results;
  }
}

/** 单例 */
let engineInstance: TeamEngine | null = null;

export function getTeamEngine(): TeamEngine {
  if (!engineInstance) {
    engineInstance = new TeamEngine();
  }
  return engineInstance;
}
