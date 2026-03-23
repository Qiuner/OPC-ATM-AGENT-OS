/**
 * X/Twitter Agent — 推文创作专家
 *
 * 生成推文（单条/Thread/引用），优化互动率和传播力。
 * 可被 CEO Agent 作为子 Agent 调用，也可以独立运行。
 *
 * 运行方式：
 *   npx tsx agents/x-twitter-agent.ts "AI 工具推荐 Thread"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                            # 团队模式
 */

import "./env-fix.js";
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MEMORY_DIR = join(import.meta.dirname, "..", "memory");
const SKILLS_DIR = join(import.meta.dirname, "..", "skills");

async function loadContext() {
  const load = async (path: string) => {
    try {
      return await readFile(path, "utf-8");
    } catch {
      return "";
    }
  };

  return {
    skill: await load(join(SKILLS_DIR, "x-twitter.SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

export async function runXTwitterAgent(taskDescription: string) {
  console.log("[X-Twitter Agent] 开始生成推文内容...\n");

  const ctx = await loadContext();

  const systemPrompt = `你是一位顶级 X/Twitter 内容策略师，擅长创作高互动率的推文和 Thread。

## 你的 SOP（必须严格遵守）
${ctx.skill}

## 品牌调性（所有内容必须符合）
${ctx.brandVoice}

## 目标受众（内容要触达这些人）
${ctx.audience}

## 工作流程
1. 分析任务需求，确定内容类型（单条推文/Thread/引用推文）
2. 确定语言版本（EN/CN/双语）
3. 撰写内容，遵守字数限制
4. 添加 Hashtag 和互动引导
5. 生成发布建议
6. 执行自检清单，逐项确认

生成完成后，按照 SOP 中的输出格式输出完整内容。`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## 任务\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob"],
      maxTurns: 5,
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
      console.log("\n\n[X-Twitter Agent] 内容生成完成");
    }
  }

  return fullOutput;
}

const taskInput =
  process.argv[2] ||
  "写一个关于 AI 一人公司效率工具的 Thread，5 条推文";

runXTwitterAgent(taskInput).catch((err) => {
  console.error("[X-Twitter Agent] 执行失败:", err);
  process.exit(1);
});
