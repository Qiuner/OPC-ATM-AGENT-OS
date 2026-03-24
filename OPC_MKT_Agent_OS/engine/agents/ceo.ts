/**
 * CEO Agent — 营销编排调度器
 *
 * 使用 Claude Agent SDK（query 函数）作为 Supervisor：
 * - 读取各渠道近期数据 → 决策今日优先级
 * - 派发任务给子 Agent（XHS / X / Douyin 等）
 * - 汇总执行结果 → 更新任务队列
 *
 * 运行方式：
 *   npx tsx agents/ceo.ts                    # 手动触发
 *   scheduler.ts 每日 9:00 自动触发
 */

import "./env-fix.js";
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MEMORY_DIR = join(import.meta.dirname, "..", "memory");
const SKILLS_DIR = join(import.meta.dirname, "..", "skills");

// ============================================================
// CEO System Prompt
// ============================================================

const CEO_SYSTEM_PROMPT = `
You are the CEO Agent of Marketing Agent OS — the Global Marketing Director for Chinese brands expanding overseas.

## Your Identity
- You lead a multi-agent marketing team focused on global markets (US, EU, UK, SEA, LATAM)
- You do NOT create content yourself — you orchestrate, review, and optimize
- Your workflow: Analyze data → Set strategy → Assign tasks → Monitor execution → Report results

## Your Team (Sub-Agents)
| Agent | Role | Use When |
|-------|------|----------|
| global-content-agent | Multi-platform content creation (Meta/X/TikTok/LinkedIn/Blog) | Content creation tasks |
| x-twitter-agent | X/Twitter specialist (tweets, threads) | Twitter-specific campaigns |
| email-agent | Email marketing (sequences, campaigns, newsletters) | Email campaigns |
| meta-ads-agent | Meta advertising (campaigns, budgets, ROAS) | Paid acquisition |
| seo-agent | SEO (keywords, on-page, technical, international) | Organic search growth |
| geo-agent | GEO (AI search engine optimization) | AI visibility |
| brand-compliance-agent | Brand compliance & quality review | Pre-publish review |
| analyst-agent | Data analysis, winning patterns, flywheel | Performance analysis |
| strategist-agent | Marketing strategy & channel planning | Strategic planning |
| visual-gen-agent | Visual content (covers, banners, video scripts) | Visual assets |

## Core Capabilities
### 1. File System (Read/Write/Glob/Grep)
- Read brand positioning, audience personas, winning patterns, SKILL files
- Write results to memory/ directory

### 2. Sub-Agent Orchestration
Dispatch tasks to the right agent based on content type and channel.

## Daily Orchestration Framework
1. Read brand context + audience personas + latest analyst report
2. Check content calendar and pending tasks
3. Determine today's priorities (content creation / SEO / ads / analysis)
4. Assign tasks to relevant agents with clear instructions
5. Review outputs through brand-compliance-agent
6. Compile daily summary report

## Decision Rules
- Quality over quantity — never publish subpar content
- All content must pass brand compliance review before publishing
- SEO + GEO optimization on every blog/article piece
- A/B test subject lines on every email
- Budget decisions require data backing (ROAS, CPA targets)
- Content should be in English unless market requires localization
- Initial phase: focus on building content library and establishing brand voice

## Output Format
1. Brief status analysis (2-3 sentences)
2. Prioritized task list for today
3. For each task: assignee, specific requirements, expected deliverable
4. Execute tasks (dispatch to sub-agents)
5. Compile execution summary with results and next steps
`;

// ============================================================
// 子 Agent 定义
// ============================================================

async function loadSkill(name: string): Promise<string> {
  try {
    return await readFile(join(SKILLS_DIR, `${name}.SKILL.md`), "utf-8");
  } catch {
    return `（${name} 的 SKILL.md 尚未创建）`;
  }
}

async function loadMemoryFile(relativePath: string): Promise<string> {
  try {
    return await readFile(join(MEMORY_DIR, relativePath), "utf-8");
  } catch {
    return "（文件不存在）";
  }
}

// ============================================================
// 主执行函数
// ============================================================

export async function runCEOAgent(userInstruction?: string) {
  console.log("[CEO] 开始每日营销编排...\n");

  // 加载子 Agent 的 Skill 文件
  const xhsSkill = await loadSkill("xhs");
  const brandVoice = await loadMemoryFile("context/brand-voice.md");
  const audience = await loadMemoryFile("context/target-audience.md");
  const xhsPatterns = await loadMemoryFile("winning-patterns/xhs-patterns.md");

  const prompt = userInstruction || `
Today is ${new Date().toLocaleDateString("en-US")}.
Begin daily global marketing orchestration:
1. Read brand context and audience personas
2. Review latest analyst insights and content calendar
3. Determine today's content creation priorities across platforms
4. Dispatch tasks to relevant agents (content, SEO, GEO, email, ads)
5. Queue brand compliance review for all outputs
6. Compile daily summary
  `;

  // 使用 Claude Agent SDK 的 query 函数
  for await (const message of query({
    prompt: `${CEO_SYSTEM_PROMPT}\n\n---\n\n## Brand Context\n${brandVoice}\n\n## Target Audience\n${audience}\n\n---\n\n${prompt}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      agents: {
        "global-content-agent": {
          description: "Multi-platform English content creator for Meta, X, TikTok, LinkedIn, Email, Blog",
          prompt: `You are the Global Content Creator. Generate native English marketing content.\n\n## Brand Voice\n${brandVoice}\n\n## Target Audience\n${audience}`,
          tools: ["Read", "Write", "Glob"],
        },
        "x-twitter-agent": {
          description: "X/Twitter content specialist — tweets, threads, engagement optimization",
          prompt: `You are the X/Twitter specialist.\n\n## SOP\n${xhsSkill}\n\n## Brand Voice\n${brandVoice}\n\n## Audience\n${audience}`,
          tools: ["Read", "Write", "Glob"],
        },
        "email-agent": {
          description: "Email marketing — sequences, campaigns, A/B testing, deliverability",
          prompt: `You are the Email Marketing specialist.\n\n## Brand Voice\n${brandVoice}\n\n## Audience\n${audience}`,
          tools: ["Read", "Write", "Glob"],
        },
        "meta-ads-agent": {
          description: "Meta Ads manager — campaigns, targeting, budget, ROAS optimization",
          prompt: `You are the Meta Ads specialist.\n\n## Brand Voice\n${brandVoice}\n\n## Audience\n${audience}`,
          tools: ["Read", "Write", "Glob", "Bash"],
        },
        "seo-agent": {
          description: "SEO expert — keyword research, on-page optimization, technical SEO, international SEO",
          prompt: `You are the SEO specialist.\n\n## Brand Voice\n${brandVoice}\n\n## Audience\n${audience}`,
          tools: ["Read", "Write", "Glob", "Grep", "Bash"],
        },
        "geo-agent": {
          description: "GEO expert — optimize content for AI search engines (ChatGPT, Perplexity, Google AI Overview)",
          prompt: `You are the GEO specialist.\n\n## Brand Voice\n${brandVoice}\n\n## Audience\n${audience}`,
          tools: ["Read", "Write", "Glob", "Grep"],
        },
        "brand-compliance-agent": {
          description: "Brand compliance reviewer — consistency, audience fit, platform policy, quality scoring",
          prompt: `You are the Brand Compliance reviewer.\n\n## Brand Voice\n${brandVoice}\n\n## Audience\n${audience}`,
          tools: ["Read", "Glob"],
        },
        "analyst-agent": {
          description: "Data analyst — performance analysis, winning patterns, flywheel optimization",
          prompt: `You are the Data Analyst.\n\n## Winning Patterns\n${xhsPatterns}\n\n## Brand Voice\n${brandVoice}`,
          tools: ["Read", "Write", "Glob", "Grep"],
        },
      },
      cwd: MEMORY_DIR,
      allowedTools: ["Read", "Write", "Glob", "Grep", "Bash", "Agent"],
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
          }
        }
      }
    }

    if (msg.type === "result") {
      console.log("\n\n[CEO] 编排完成");
      if (typeof msg.result === "string") {
        console.log(msg.result);
      }
    }
  }

  console.log("\n[CEO] 今日编排结束");
}

// ============================================================
// 直接运行入口
// ============================================================

// 支持命令行传入指令：npx tsx agents/ceo.ts "帮我写一篇关于OPC的小红书"
const userInput = process.argv[2];
runCEOAgent(userInput).catch((err) => {
  console.error("[CEO] 执行失败:", err);
  process.exit(1);
});
