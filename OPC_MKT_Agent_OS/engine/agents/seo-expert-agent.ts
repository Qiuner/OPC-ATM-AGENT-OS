/**
 * SEO Expert Agent — SEO 专家
 *
 * 关键词分析、SEO 建议、meta 标签优化、内容策略、
 * 技术 SEO 审计、国际化 SEO。
 *
 * 运行方式：
 *   npx tsx agents/seo-expert-agent.ts "Keyword research for AI marketing tools"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                                                  # 团队模式
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
    skill: await load(join(SKILLS_DIR, "seo-expert.SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

// ============================================================
// SEO Expert Agent 核心
// ============================================================

export async function runSEOExpertAgent(taskDescription: string) {
  console.log("[SEO Expert Agent] Starting SEO analysis...\n");

  const ctx = await loadContext();

  const systemPrompt = `You are a senior SEO strategist for brands expanding into global markets. You handle keyword research, on-page optimization, content SEO strategy, technical SEO audits, and international SEO.

## Your SOP (follow strictly)
${ctx.skill}

## Brand Context
${ctx.brandVoice}

## Target Audience
${ctx.audience}

## Workflow
1. Analyze the task — determine SEO task type:
   - Keyword Research → Follow Keyword Research SOP (seed → expand → prioritize → cluster)
   - On-Page Optimization → Run On-Page SEO Checklist
   - Content Strategy → Build topic clusters + editorial calendar
   - Technical Audit → Execute Technical SEO Audit template
   - International SEO → hreflang + localized keyword research
   - Content Brief → Generate SEO Content Brief
2. Execute the relevant SOP steps
3. Produce actionable recommendations with priority levels (P0-P3)
4. Save output to ./output/ directory

## Output must include:
- Specific, actionable recommendations (not generic advice)
- Priority matrix (P0 quick wins → P3 long-tail)
- Data points where available (search volume, KD, CPC)
- Implementation instructions for the dev/content team`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## Task\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob", "Grep", "Bash"],
      maxTurns: 10,
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
      console.log("\n\n[SEO Expert Agent] Analysis complete");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput =
  process.argv[2] ||
  "Perform keyword research and create a content strategy for an AI marketing automation platform targeting US market";

runSEOExpertAgent(taskInput).catch((err) => {
  console.error("[SEO Expert Agent] Execution failed:", err);
  process.exit(1);
});
