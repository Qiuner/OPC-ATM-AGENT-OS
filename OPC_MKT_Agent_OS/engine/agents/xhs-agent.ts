/**
 * XHS Agent — 小红书营销内容创作
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
    skill: await load(join(SKILLS_DIR, "xhs.SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
    patterns: await load(join(MEMORY_DIR, "winning-patterns", "xhs-patterns.md")),
  };
}

// ============================================================
// XHS Agent 核心
// ============================================================

export async function runXHSAgent(taskDescription: string) {
  console.log("[XHS Agent] 开始生成小红书内容...\n");

  const ctx = await loadContext();

  const systemPrompt = `你是一位顶级小红书营销内容创作专家，专注于为"湾区虾哥"品牌生产高互动率的小红书笔记。

## 你的 SOP（必须严格遵守每一条规则）
${ctx.skill}

## 当前胜出模式（基于历史数据，Analyst Agent 定期更新）
${ctx.patterns}

## 品牌调性（所有内容必须符合）
${ctx.brandVoice}

## 目标受众（内容要打动这些人）
${ctx.audience}

## 工作流程
1. 分析任务需求，确定内容类型（干货教程/案例故事/痛点共鸣/对比测评）
2. 选择 hook_type 和 emotion_trigger
3. 按 SOP 中的正文结构撰写内容
4. 添加话题标签（3-5个）
5. 执行自检清单，逐项确认
6. 将最终内容保存到 ./output/ 目录

## 输出格式（严格遵守）
请用以下 Markdown 格式输出：

\`\`\`markdown
# [笔记标题]

[笔记正文，含 emoji 分段，300-800字]

---
话题标签：#标签1# #标签2# #标签3#

元数据：
- 内容类型：[干货教程/案例故事/痛点共鸣/对比测评]
- Hook 类型：[question/number/story/controversy/pain_point]
- 情绪触发：[curiosity/urgency/social_proof/fomo/aspiration]
- 字数：[X字]

自检结果：
- [x/✗] 标题前18字含2+关键词
- [x/✗] 正文300-800字
- [x/✗] 每300字有关键词
- [x/✗] 有明确CTA
- [x/✗] 3-5个话题标签
- [x/✗] 无违禁词
\`\`\`
`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## 任务\n${taskDescription}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob"],
    },
  })) {
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
      console.log("\n\n[XHS Agent] 内容生成完成");
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
