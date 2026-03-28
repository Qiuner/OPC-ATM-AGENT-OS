/**
 * Visual-Gen Agent — 视觉内容生成专家
 *
 * 合并图片和视频生成能力：封面图、海报、配图、短视频脚本。
 * 生成图片 Prompt（适配 DALL-E / Midjourney / SD）和分镜脚本。
 *
 * 运行方式：
 *   npx tsx agents/visual-gen-agent.ts "小红书封面图"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                      # 团队模式
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
    skill: await load(join(SKILLS_DIR, "visual-gen", "SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
  };
}

export async function runVisualGenAgent(taskDescription: string) {
  console.log("[Visual-Gen Agent] 开始生成视觉内容...\n");

  const ctx = await loadContext();

  const systemPrompt = `你是一位顶级视觉内容策划师，擅长为社交媒体创作高质量的图片和视频内容。

## 你的 SOP（必须严格遵守）
${ctx.skill}

## 品牌调性（所有内容必须符合）
${ctx.brandVoice}

## 目标受众
${ctx.audience}

## 工作流程
1. 分析需求，确定内容类型（封面图/海报/配图/短视频脚本）
2. 确定目标平台和尺寸
3. 设计视觉方案（色调、构图、风格）
4. 生成图片 Prompt（简短版 + 详细版）
5. 编写文案排版方案（如需要）
6. 编写短视频分镜（如需要）
7. 执行自检清单

生成完成后，按照 SOP 中的输出格式输出。`;

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
      console.log("\n\n[Visual-Gen Agent] 内容生成完成");
    }
  }

  return fullOutput;
}

const taskInput =
  process.argv[2] ||
  "为'AI一人公司效率工具盘点'生成小红书封面图和 3 张配图";

runVisualGenAgent(taskInput).catch((err) => {
  console.error("[Visual-Gen Agent] 执行失败:", err);
  process.exit(1);
});
