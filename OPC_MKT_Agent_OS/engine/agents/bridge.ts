/**
 * Bridge — 连接 agent-chat 聊天界面与 engine 引擎
 *
 * agent-chat 的 /api/chat 路由调用此模块，
 * 将用户在聊天室的消息转发给对应的 Agent，
 * 并将 Agent 的流式输出回传给聊天 UI。
 *
 * 这是 Phase 2 的核心：让聊天室成为 Agent OS 的人机入口。
 */

import "./env-fix.js";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ENGINE_ROOT = join(import.meta.dirname, "..");
const MEMORY_DIR = join(ENGINE_ROOT, "memory");
const SKILLS_DIR = join(ENGINE_ROOT, "skills");

/** Agent 类型映射 */
const AGENT_MAP: Record<string, {
  description: string;
  skillFile: string;
  model: string;
}> = {
  "ceo": {
    description: "营销团队 CEO，负责任务编排和决策",
    skillFile: "",
    model: "claude-sonnet-4-20250514",
  },
  "xhs-agent": {
    description: "小红书营销专家，生成高互动率笔记",
    skillFile: "xhs/SKILL.md",
    model: "claude-sonnet-4-20250514",
  },
  "analyst-agent": {
    description: "数据分析师，驱动飞轮优化",
    skillFile: "analyst/SKILL.md",
    model: "claude-sonnet-4-20250514",
  },
};

/**
 * 通过 Agent SDK 执行任务，返回 async generator 用于流式传输
 */
export async function* runAgentStream(
  agentName: string,
  userMessage: string,
  conversationHistory?: string,
): AsyncGenerator<{ type: "text" | "error" | "done"; content: string }> {
  const agentConfig = AGENT_MAP[agentName];
  if (!agentConfig) {
    yield { type: "error", content: `未知的 Agent: ${agentName}` };
    yield { type: "done", content: "" };
    return;
  }

  // 加载上下文
  const loadFile = async (path: string) => {
    try { return await readFile(path, "utf-8"); } catch { return ""; }
  };

  const brandVoice = await loadFile(join(MEMORY_DIR, "context", "brand-voice.md"));
  const audience = await loadFile(join(MEMORY_DIR, "context", "target-audience.md"));
  const skill = agentConfig.skillFile
    ? await loadFile(join(SKILLS_DIR, agentConfig.skillFile))
    : "";

  const systemContext = [
    skill && `## 你的 SOP\n${skill}`,
    brandVoice && `## 品牌调性\n${brandVoice}`,
    audience && `## 目标受众\n${audience}`,
    conversationHistory && `## 对话历史\n${conversationHistory}`,
  ].filter(Boolean).join("\n\n---\n\n");

  try {
    for await (const message of query({
      prompt: `${systemContext}\n\n---\n\nUser: ${userMessage}`,
      options: {
        model: agentConfig.model,
        permissionMode: "acceptEdits",
        cwd: ENGINE_ROOT,
        allowedTools: ["Read", "Write", "Glob", "Grep"],
      },
    })) {
      if (message.type === "assistant" && "content" in message) {
        for (const block of message.content as Array<{ type: string; text?: string }>) {
          if (block.type === "text" && block.text) {
            yield { type: "text", content: block.text };
          }
        }
      }

      if ("result" in message && message.result) {
        yield { type: "text", content: String(message.result) };
      }
    }
  } catch (err) {
    yield {
      type: "error",
      content: err instanceof Error ? err.message : "Agent 执行失败",
    };
  }

  yield { type: "done", content: "" };
}
