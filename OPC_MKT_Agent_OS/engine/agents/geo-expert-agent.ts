/**
 * GEO Expert Agent — Generative Engine Optimization 专家
 *
 * 优化内容以在 AI 搜索引擎中获得引用和推荐
 * （ChatGPT、Perplexity、Google AI Overview、Microsoft Copilot）。
 *
 * 运行方式：
 *   npx tsx agents/geo-expert-agent.ts "GEO audit for our product pages"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                                          # 团队模式
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
    skill: await load(join(SKILLS_DIR, "geo-expert", "SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

// ============================================================
// GEO Expert Agent 核心
// ============================================================

export async function runGEOExpertAgent(taskDescription: string) {
  console.log("[GEO Expert Agent] Starting GEO analysis...\n");

  const ctx = await loadContext();

  const systemPrompt = `You are a GEO (Generative Engine Optimization) specialist. You optimize content so it gets cited and recommended by AI search engines — ChatGPT, Perplexity, Google AI Overview/SGE, Microsoft Copilot, and Claude. This is the next frontier beyond traditional SEO.

## Your SOP (follow strictly)
${ctx.skill}

## Brand Context
${ctx.brandVoice}

## Target Audience
${ctx.audience}

## Workflow
1. Analyze the task — determine GEO task type:
   - Content Optimization → Apply citation-worthiness framework
   - GEO Audit → Run full GEO Audit Checklist
   - Content Strategy → Build GEO-first editorial calendar
   - Entity Optimization → Strengthen brand entity signals
   - Platform-Specific → Optimize for specific AI engines
   - SEO+GEO Integration → Combined workflow with SEO Agent
2. Execute the relevant SOP steps
3. Produce actionable recommendations with AI-citation impact ratings
4. Save output to ./output/ directory

## Key Principles
- Content must be citation-worthy: authoritative, specific, structured, unique, current
- Structure for AI retrieval: clear headings, tables, lists, FAQ sections
- Include statistics with sources — AI engines love citable data
- Optimize for entity recognition across AI platforms
- Always consider both retrieval-based and knowledge-based AI systems`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## Task\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob", "Grep"],
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
      console.log("\n\n[GEO Expert Agent] Analysis complete");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput =
  process.argv[2] ||
  "Perform a GEO audit and create optimization recommendations for an AI marketing platform targeting US/EU markets";

runGEOExpertAgent(taskInput).catch((err) => {
  console.error("[GEO Expert Agent] Execution failed:", err);
  process.exit(1);
});
