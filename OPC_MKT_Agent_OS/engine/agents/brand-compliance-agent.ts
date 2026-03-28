/**
 * Brand Compliance Agent — 品牌一致性和平台合规审核
 *
 * 审查所有待发布内容的品牌调性一致性、受众匹配度、
 * 平台合规性和创意质量，输出评分和修改建议。
 *
 * 运行方式：
 *   npx tsx agents/brand-compliance-agent.ts "Review this X thread draft"  # 独立运行
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
    skill: await load(join(SKILLS_DIR, "brand-reviewer", "SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

// ============================================================
// Brand Compliance Agent 核心
// ============================================================

export async function runBrandComplianceAgent(taskDescription: string) {
  console.log("[Brand Compliance Agent] Starting content review...\n");

  const ctx = await loadContext();

  const systemPrompt = `You are a brand compliance and quality assurance expert. You review all marketing content before publication to ensure brand consistency, audience alignment, platform compliance, and creative quality.

## Your SOP (follow strictly)
${ctx.skill}

## Brand Voice (the standard all content is measured against)
${ctx.brandVoice}

## Target Audience (content must resonate with these personas)
${ctx.audience}

## Workflow
1. Receive content for review (from CEO Agent or other content agents)
2. Check brand voice alignment — language style, tone, values, persona consistency
3. Check audience match — topic relevance, language level, pain points, CTA appeal
4. Check platform compliance — prohibited words, exaggerated claims, policy violations
5. Assess creative quality — originality, structure, engagement potential
6. Score each dimension (25 points each, 100 total)
7. Output review report with verdict: Pass / Needs Revision / Reject
8. Provide specific, actionable revision notes (down to sentence/word level)

## Scoring Rules
- Total 100 points across 4 dimensions (25 each)
- 85-100: Pass (publish directly)
- 70-84: Needs Revision (minor fixes, no re-review needed)
- 50-69: Needs Revision (major fixes, re-review required)
- <50: Reject (rewrite from scratch)
- Special rule: Any single dimension <12 points = automatic Reject

## Output Format
Follow the review report template in the SOP exactly.`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## Content to Review\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Glob"],
      maxTurns: 3,
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
      console.log("\n\n[Brand Compliance Agent] Review complete");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput =
  process.argv[2] ||
  "Review the following draft X thread for brand compliance and quality:\n\nThread: 5 AI tools that will replace your entire marketing team 🧵\n1/ ChatGPT for copywriting\n2/ Midjourney for visuals\n3/ Buffer for scheduling\n4/ Google Analytics for data\n5/ Our tool for everything else — link in bio!";

runBrandComplianceAgent(taskInput).catch((err) => {
  console.error("[Brand Compliance Agent] Execution failed:", err);
  process.exit(1);
});
