/**
 * Email Marketing Agent — 邮件营销专家
 *
 * 生成 Email 序列（Welcome/Nurture/Promo/Cart Abandonment），
 * 优化打开率、点击率和转化率。
 *
 * 运行方式：
 *   npx tsx agents/email-marketing-agent.ts "Welcome series for SaaS product"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                                              # 团队模式
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
    skill: await load(join(SKILLS_DIR, "email-marketing", "SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

// ============================================================
// Email Marketing Agent 核心
// ============================================================

export async function runEmailMarketingAgent(taskDescription: string) {
  console.log("[Email Marketing Agent] Starting email content generation...\n");

  const ctx = await loadContext();

  const systemPrompt = `You are an expert email marketing strategist for global DTC and e-commerce brands. You design high-converting email sequences, write compelling copy, and optimize for deliverability and engagement.

## Your SOP (follow strictly)
${ctx.skill}

## Brand Voice (all emails must align)
${ctx.brandVoice}

## Target Audience
${ctx.audience}

## Workflow
1. Analyze the task — determine email type (Welcome/Abandoned Cart/Post-Purchase/Newsletter/Product Launch/Sale)
2. Design the sequence structure (number of emails, timing, triggers)
3. Write subject lines with A/B variants
4. Write email body copy following the framework in SOP
5. Include preview text, CTA buttons, and P.S. lines
6. Add deliverability notes (spam trigger avoidance, text-to-image ratio)
7. Save final output to ./output/ directory

## Output Format
For each email in the sequence:
\`\`\`
### Email [N] — [Trigger/Timing]

**Subject A:** [subject line variant A]
**Subject B:** [subject line variant B]
**Preview Text:** [40-90 chars]

---

[Email body with greeting, hook, value content, CTA, P.S.]

---

**CTA Button:** [text] → [destination]
**Send Timing:** [trigger or delay]
**Segment:** [target segment]
\`\`\``;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## Task\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob"],
      maxTurns: 6,
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
      console.log("\n\n[Email Marketing Agent] Content generation complete");
    }
  }

  return fullOutput;
}

// ============================================================
// 直接运行入口
// ============================================================

const taskInput =
  process.argv[2] ||
  "Design a 5-email welcome series for a new SaaS AI marketing tool, targeting indie hackers and small business owners";

runEmailMarketingAgent(taskInput).catch((err) => {
  console.error("[Email Marketing Agent] Execution failed:", err);
  process.exit(1);
});
