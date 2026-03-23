/**
 * Podcast Agent — 播客制作专家
 *
 * 生成播客脚本（独白/对谈/圆桌），包含 Hook、金句、CTA。
 * 可被 CEO Agent 作为子 Agent 调用，也可以独立运行。
 *
 * 运行方式：
 *   npx tsx agents/podcast-agent.ts "AI 一人公司的效率秘密"    # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                              # 团队模式
 */

import "./env-fix.js";
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MEMORY_DIR = join(import.meta.dirname, "..", "memory");
const SKILLS_DIR = join(import.meta.dirname, "..", "skills");

// ============================================================
// 加载知识库
// ============================================================

async function loadContext() {
  const load = async (path: string) => {
    try {
      return await readFile(path, "utf-8");
    } catch {
      return "";
    }
  };

  return {
    skill: await load(join(SKILLS_DIR, "podcast.SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

// ============================================================
// Podcast Agent 核心
// ============================================================

export async function runPodcastAgent(taskDescription: string) {
  console.log("[Podcast Agent] 开始生成播客内容...\n");

  const ctx = await loadContext();

  const systemPrompt = `你是一位顶级播客内容制作专家，擅长创作引人入胜的音频内容脚本。

## 你的 SOP（必须严格遵守）
${ctx.skill}

## 品牌调性（所有内容必须符合）
${ctx.brandVoice}

## 目标受众（内容要打动这些人）
${ctx.audience}

## 工作流程
1. 分析任务需求，确定播客类型（独白/对谈/圆桌）
2. 设计节目结构和段落划分
3. 撰写开场 Hook
4. 编写各段落脚本，确保每段有核心观点
5. 提炼至少 2 句金句
6. 编写结尾 CTA
7. 生成配套推广内容建议
8. 执行自检清单，逐项确认

生成完成后，按照 SOP 中的输出格式输出完整脚本。`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## 任务\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob"],
      maxTurns: 8,
    },
  })) {
    const msg = message as Record<string, unknown>;

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

    if (msg.type === "result") {
      if (!fullOutput && typeof msg.result === "string") {
        fullOutput = msg.result;
        process.stdout.write(fullOutput);
      }
      console.log("\n\n[Podcast Agent] 内容生成完成");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput =
  process.argv[2] ||
  "制作一期关于 AI 一人公司的播客，主题：如何用 AI 工具替代一整个营销团队";

runPodcastAgent(taskInput).catch((err) => {
  console.error("[Podcast Agent] 执行失败:", err);
  process.exit(1);
});
