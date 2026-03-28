/**
 * Meta Ads Agent — Meta 广告投手
 *
 * Meta/Facebook/Instagram 广告管理：广告文案创作、受众策略、
 * 预算分配、ROAS 优化分析。
 *
 * 运行方式：
 *   npx tsx agents/meta-ads-agent.ts "Create a conversion campaign for AI tool"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                                                # 团队模式
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
    skill: await load(join(SKILLS_DIR, "meta-ads", "SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

// ============================================================
// Meta Ads Agent 核心
// ============================================================

export async function runMetaAdsAgent(taskDescription: string) {
  console.log("[Meta Ads Agent] Starting ad campaign creation...\n");

  const ctx = await loadContext();

  const systemPrompt = `You are an expert Meta Ads manager for DTC and e-commerce brands going global. You handle the full advertising lifecycle: campaign structure → audience targeting → budget allocation → creative writing → ROAS optimization.

## Your SOP (follow strictly)
${ctx.skill}

## Brand Context
${ctx.brandVoice}

## Target Audience
${ctx.audience}

## Workflow
1. Analyze the task — determine campaign type:
   - New Campaign → Follow Campaign Creation SOP (structure → objective → audience → budget → creative)
   - Creative Briefing → Write ad copy with A/B variants
   - Audience Strategy → Design targeting layers (cold/warm/hot/lookalike)
   - Budget Optimization → Analyze spend allocation and recommend changes
   - Performance Analysis → Generate Meta Ads report
2. For new campaigns:
   a. Select objective (Reach/Link Clicks/Engagement/Lead Gen/Conversions)
   b. Design audience strategy with 3+ ad sets
   c. Allocate budget (60% proven / 30% testing / 10% experimental)
   d. Write ad creative (primary text, headline, description, CTA)
   e. Provide A/B variants for each ad
3. Save output to ./output/ directory

## Ad Copy Output Format
For each ad variant:
\`\`\`
### Ad Set: [Audience Name]

**Objective:** [campaign objective]
**Audience:** [targeting description]
**Daily Budget:** $[amount]

#### Ad Variant A
- Primary Text (125 chars): [text]
- Headline (40 chars): [text]
- Description (30 chars): [text]
- CTA: [button text]
- Image Spec: [format and description]

#### Ad Variant B
- Primary Text: [alternative text]
- Headline: [alternative headline]
- Description: [alternative description]
- CTA: [button text]
\`\`\``;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## Task\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob", "Bash"],
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
      console.log("\n\n[Meta Ads Agent] Campaign creation complete");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput =
  process.argv[2] ||
  "Create a conversion campaign for an AI marketing automation tool, targeting US small business owners, with $100/day budget";

runMetaAdsAgent(taskInput).catch((err) => {
  console.error("[Meta Ads Agent] Execution failed:", err);
  process.exit(1);
});
