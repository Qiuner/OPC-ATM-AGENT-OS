/**
 * Strategist Agent — 营销策略师
 *
 * 制定营销策略、内容战略、渠道规划、增长目标拆解。
 * 可被 CEO Agent 作为子 Agent 调用，也可以独立运行。
 *
 * 运行方式：
 *   npx tsx agents/strategist-agent.ts "制定下月内容战略"  # 独立运行
 *   由 CEO Agent 作为子 Agent 调用                          # 团队模式
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
    skill: await load(join(SKILLS_DIR, "strategist.SKILL.md")),
    brandVoice: await load(join(MEMORY_DIR, "context", "brand-voice.md")),
    audience: await load(join(MEMORY_DIR, "context", "target-audience.md")),
    calendar: await load(join(MEMORY_DIR, "content-calendar.json")),
  };
}

export async function runStrategistAgent(taskDescription: string) {
  console.log("[Strategist Agent] 开始制定策略...\n");

  const ctx = await loadContext();

  const systemPrompt = `你是一位资深营销策略师，擅长制定数据驱动的营销战略和内容规划。

## 你的 SOP（必须严格遵守）
${ctx.skill}

## 品牌调性
${ctx.brandVoice}

## 目标受众
${ctx.audience}

## 当前内容日历
${ctx.calendar}

## 工作流程
1. 分析任务需求，确定策略类型
2. 进行现状分析（读取可用数据）
3. 设定 SMART 目标和 KPI
4. 设计策略方案和内容矩阵
5. 制定具体执行计划（可分配给其他 Agent）
6. 设计评估机制
7. 执行自检清单

生成完成后，按照 SOP 中的输出格式输出完整策略。`;

  let fullOutput = "";

  for await (const message of query({
    prompt: `${systemPrompt}\n\n---\n\n## 任务\n${taskDescription}`,
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
      console.log("\n\n[Strategist Agent] 策略制定完成");
    }
  }

  return fullOutput;
}

const taskInput =
  process.argv[2] ||
  "制定下月 AI 一人公司品牌的多平台内容战略";

runStrategistAgent(taskInput).catch((err) => {
  console.error("[Strategist Agent] 执行失败:", err);
  process.exit(1);
});
