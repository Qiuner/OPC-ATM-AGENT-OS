/**
 * Agent Teams 会话 — 多 Agent 并行协作 + SendMessage 直连通信
 *
 * 场景：多个 Agent 并行处理关联任务，通过 SendMessage 互相通信。
 * 例如：XHS Agent + X-Twitter Agent 同时创作，共享选题上下文。
 *
 * 运行方式：
 *   由 CEO Agent 或 web/ executor 调用
 *   通过 Claude Agent SDK 的 agents 参数 + SendMessage 工具实现
 */

import "./env-fix.js";
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ENGINE_DIR = join(import.meta.dirname, "..");
const SKILLS_DIR = join(ENGINE_DIR, "skills");
const MEMORY_DIR = join(ENGINE_DIR, "memory");

// ============================================================
// 类型定义
// ============================================================

export interface TeamMember {
  id: string;
  name: string;
  description: string;
  skillFile: string;
  tools: string[];
}

export interface TeamSessionConfig {
  members: TeamMember[];
  instruction: string;
  context?: Record<string, unknown>;
  maxTurns?: number;
}

export type TeamEvent =
  | { type: "text"; agentId: string; content: string }
  | { type: "agent_message"; from: string; to: string; content: string }
  | { type: "tool_call"; agentId: string; tool: string }
  | { type: "done" }
  | { type: "error"; message: string };

// ============================================================
// 工具函数
// ============================================================

async function loadFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

// ============================================================
// Team Session 核心
// ============================================================

/**
 * 启动 Agent Teams 会话
 *
 * 将多个 Agent 注册为 CEO 的子 Agent，
 * 每个 Agent 在 prompt 中知晓其他成员的存在，
 * 并通过 SendMessage 工具进行直连通信。
 */
export async function* runTeamSession(
  config: TeamSessionConfig,
): AsyncGenerator<TeamEvent> {
  const { members, instruction, context, maxTurns = 20 } = config;

  if (members.length === 0) {
    yield { type: "error", message: "Team session requires at least 1 member" };
    return;
  }

  const brandVoice = await loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
  const audience = await loadFile(join(MEMORY_DIR, "context", "target-audience.md"));

  // 构建子 Agent 配置
  const agents: Record<string, { description: string; prompt: string; tools: string[] }> = {};

  for (const member of members) {
    const skill = member.skillFile
      ? await loadFile(join(SKILLS_DIR, member.skillFile))
      : "";

    const otherMembers = members
      .filter((m) => m.id !== member.id)
      .map((m) => `- ${m.id}: ${m.description}`)
      .join("\n");

    agents[member.id] = {
      description: member.description,
      prompt: [
        `你是${member.name}。${member.description}`,
        skill && `## SOP\n${skill}`,
        brandVoice && `## 品牌调性\n${brandVoice}`,
        audience && `## 目标受众\n${audience}`,
        `## 团队协作
你正在一个团队中并行工作。其他成员：
${otherMembers}

你可以通过 SendMessage 工具与其他成员沟通，协调工作内容。
完成后请将结果通过 SendMessage 发送给协调者。`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      tools: [...member.tools, "SendMessage"],
    };
  }

  // 协调者提示
  const memberList = members.map((m) => `- ${m.id}: ${m.description}`).join("\n");
  const coordinatorPrompt = `你是团队协调者，负责分配任务并收集结果。

## 团队成员
${memberList}

## 协作规则
1. 分析任务，将子任务分配给合适的成员
2. 各成员并行工作，通过 SendMessage 互相通信
3. 收集所有成员的结果，生成最终交付物

${context ? `## 上下文\n${JSON.stringify(context, null, 2)}\n\n` : ""}任务：${instruction}`;

  try {
    for await (const message of query({
      prompt: coordinatorPrompt,
      options: {
        model: "claude-sonnet-4-20250514",
        permissionMode: "acceptEdits",
        cwd: ENGINE_DIR,
        agents,
        allowedTools: ["Read", "Write", "Agent", "SendMessage"],
        maxTurns,
      },
    })) {
      const msg = message as Record<string, unknown>;

      if (msg.type === "assistant" && msg.message) {
        const assistantMsg = msg.message as Record<string, unknown>;
        const content = assistantMsg.content;

        if (Array.isArray(content)) {
          for (const block of content) {
            if (block?.type === "text" && block?.text) {
              yield { type: "text", agentId: "coordinator", content: block.text as string };
            }

            if (block?.type === "tool_use") {
              const toolName = (block.name || "unknown") as string;

              // 检测 SendMessage 以捕获 Agent 间通信
              if (toolName === "SendMessage" && block.input) {
                const input = block.input as Record<string, unknown>;
                yield {
                  type: "agent_message",
                  from: "coordinator",
                  to: (input.to || "*") as string,
                  content: (input.message || "") as string,
                };
              }

              yield { type: "tool_call", agentId: "coordinator", tool: toolName };
            }
          }
        }
      }

      if (msg.type === "result") {
        yield { type: "done" };
      }
    }
  } catch (err) {
    yield {
      type: "error",
      message: err instanceof Error ? err.message : "Team session failed",
    };
  }
}

// ============================================================
// 直接运行入口
// ============================================================

if (process.argv[1]?.endsWith("team-session.ts")) {
  const instruction =
    process.argv[2] ||
    "为'AI一人公司'主题同时创作小红书笔记和播客脚本";

  const members: TeamMember[] = [
    {
      id: "xhs-agent",
      name: "小红书创作专家",
      description: "按 SOP 产出高质量小红书种草笔记",
      skillFile: "xhs.SKILL.md",
      tools: ["Read", "Write", "Glob"],
    },
    {
      id: "podcast-agent",
      name: "播客制作专家",
      description: "生成播客脚本、对话式音频内容",
      skillFile: "podcast.SKILL.md",
      tools: ["Read", "Write", "Glob"],
    },
  ];

  (async () => {
    console.log("[Team Session] 启动并行协作...\n");
    for await (const event of runTeamSession({ members, instruction })) {
      if (event.type === "text") {
        process.stdout.write(event.content);
      } else if (event.type === "agent_message") {
        console.log(`\n[${event.from} → ${event.to}]: ${event.content}`);
      } else if (event.type === "done") {
        console.log("\n\n[Team Session] 协作完成");
      } else if (event.type === "error") {
        console.error(`\n[Team Session] 错误: ${event.message}`);
      }
    }
  })().catch((err) => {
    console.error("[Team Session] 执行失败:", err);
    process.exit(1);
  });
}
