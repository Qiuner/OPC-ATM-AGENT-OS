/**
 * XHS Agent — 小红书端到端营销（搜索研究→分析→创作→发布）
 *
 * 可以被 CEO Agent 作为子 Agent 调用，也可以独立运行。
 * 独立运行时通过 Claude Agent SDK query() 直接执行。
 *
 * 运行方式：
 *   npx tsx agents/xhs-agent.ts "写一篇关于AI工具的小红书笔记"
 */

import "./env-fix.js";
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { AgentRegistry } from "./registry.js";

// ============================================================
// XHS Agent 核心
// ============================================================

export async function runXHSAgent(taskDescription: string) {
  console.log("[XHS Agent] 开始端到端小红书内容流程...\n");

  const registry = AgentRegistry.getInstance();
  const config = await registry.buildDirectConfig("xhs-agent", taskDescription);

  let fullOutput = "";

  for await (const message of query(config)) {
    const msg = message as Record<string, unknown>;

    // assistant 消息：结构是 msg.message.content[].text
    if (msg.type === "assistant" && msg.message) {
      const assistantMsg = msg.message as Record<string, unknown>;
      const content = assistantMsg.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block?.type === "text" && block?.text) {
            process.stdout.write(block.text);
            fullOutput += block.text;
          }
        }
      }
    }

    // result 消息：最终结果
    if (msg.type === "result") {
      if (!fullOutput && typeof msg.result === "string") {
        fullOutput = msg.result;
        process.stdout.write(fullOutput);
      }
      console.log("\n\n[XHS Agent] 流程完成");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput = process.argv[2] || "写一篇关于 AI 一人公司的小红书干货教程笔记，主题：如何用 AI 工具把内容创作效率提升 10 倍";

runXHSAgent(taskInput).catch((err) => {
  console.error("[XHS Agent] 执行失败:", err);
  process.exit(1);
});
