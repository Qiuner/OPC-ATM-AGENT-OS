/**
 * Global Content Agent — 全球内容创作专家
 *
 * 生成英文多平台营销内容（X/Blog/LinkedIn/TikTok/Meta/Email），
 * 适配中国品牌出海场景，产出地道英文内容。
 *
 * 运行方式：
 *   npx tsx agents/global-content-agent.ts "Product launch for AI tool"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                                        # 团队模式
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
    skill: await load(join(SKILLS_DIR, "global-content.SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
    patterns: await load(join(MEMORY_DIR, "winning-patterns", "global-patterns.md")),
  };
}

// ============================================================
// Global Content Agent 核心
// ============================================================

export async function runGlobalContentAgent(taskDescription: string) {
  console.log("[Global Content Agent] Starting content generation...\n");

  const ctx = await loadContext();

  const systemPrompt = `You are an expert English marketing content creator for Chinese brands expanding globally. You produce authentic, native-sounding English content across multiple platforms.

## Your SOP (follow strictly)
${ctx.skill}

## Winning Patterns (from historical data)
${ctx.patterns}

## Brand Voice (all content must align)
${ctx.brandVoice}

## Target Audience
${ctx.audience}

## Workflow
1. Analyze the task — determine target platform(s) (Meta/X/TikTok/LinkedIn/Email/Blog)
2. Identify content type (post/ad/thread/email/script/article)
3. Write platform-optimized content following SOP format
4. Add hashtags, CTAs, and A/B variants where applicable
5. Run quality self-check (no Chinglish, platform-native formatting, measurable CTA)
6. Save final output to ./output/ directory

Output must follow the format defined in the SOP.`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## Task\n${taskDescription}`,
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
      console.log("\n\n[Global Content Agent] Content generation complete");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput =
  process.argv[2] ||
  "Create a product launch announcement for an AI marketing automation tool, adapted for Meta, X, and LinkedIn";

runGlobalContentAgent(taskInput).catch((err) => {
  console.error("[Global Content Agent] Execution failed:", err);
  process.exit(1);
});
