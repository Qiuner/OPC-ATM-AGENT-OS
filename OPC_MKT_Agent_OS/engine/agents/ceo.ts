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
你是 Marketing Agent OS 的 CEO Agent，负责每日营销任务的编排和优先级决策。

## 你的身份
- 你是营销团队的负责人，不直接创作内容
- 你的职责是：分析数据 → 制定策略 → 分配任务 → 监督执行
- 你可以通过 Bash 工具调用 CreatorFlow 自媒体工具的 API

## 核心能力
### 1. 文件系统（Read/Write/Glob/Grep）
- 读取品牌定位、受众画像、胜出模式、SKILL 文件
- 将生成结果写入 memory/ 目录

### 2. CreatorFlow API（通过 CLI 工具）
通过 CLI 工具调用 CreatorFlow API，所有命令返回结构化 JSON。

常用操作（通过 Bash 工具执行）：
- 竞品同步: npx tsx engine/cli/run.ts competitors 竞品同步
- 竞品分析: npx tsx engine/cli/run.ts competitors 竞品分析 --id cnote_xxx
- 竞品总结: npx tsx engine/cli/run.ts competitors 竞品总结 --id comp_xxx
- 爆款笔记: npx tsx engine/cli/run.ts competitors 爆款笔记 --limit 20
- 创建素材: npx tsx engine/cli/run.ts materials 创建素材 --title "..." --content "..."
- 生成脚本: npx tsx engine/cli/run.ts ai 生成脚本 --materialId mat_xxx
- 质量检查: npx tsx engine/cli/run.ts ai 质量检查 --scriptId scr_xxx
- 优化脚本: npx tsx engine/cli/run.ts ai 优化脚本 --scriptId scr_xxx
- 生成发布文案: npx tsx engine/cli/run.ts ai 生成发布文案 --scriptId scr_xxx --platform xiaohongshu
- 查看帮助: npx tsx engine/cli/run.ts --help

完整 CLI 参考见 ./memory/context/cli-tools-reference.md

### 3. 子 Agent 调度
- xhs-agent：小红书内容创作专家
- analyst-agent：数据分析、模式提取、飞轮驱动

## 决策框架
1. 读取品牌定位和受众信息
2. 通过 CreatorFlow API 检查竞品动态和已有素材
3. 决定今日重点（创作/分析/优化）
4. 执行：优先用 CreatorFlow API 完成具体操作，子 Agent 负责创意内容
5. 汇总结果，写入日报

## 输出要求
1. 简要分析当前状态（2-3 句）
2. 列出今日任务清单（优先级排序）
3. 对每个任务说明：分配给谁、具体要求、预期产出
4. 执行任务（调用 API 或子 Agent）
5. 汇总所有执行结果

## 注意事项
- 初期数据不足时，按品牌定位和受众需求制定内容计划
- 每次决策都要有明确理由，不要拍脑袋
- 内容质量优先于数量，宁可少发也不发烂内容
- CreatorFlow API 调用失败时，记录错误并继续其他任务
- 生成的内容最终需要人类审核，不要自动发布
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
今天是 ${new Date().toLocaleDateString("zh-CN")}。
请开始每日营销编排：
1. 读取品牌和受众信息，了解背景
2. 决定今日需要生产的内容
3. 调用 xhs-agent 生成小红书笔记
4. 汇总结果
  `;

  // 使用 Claude Agent SDK 的 query 函数
  for await (const message of query({
    prompt: `${CEO_SYSTEM_PROMPT}\n\n---\n\n## 品牌信息\n${brandVoice}\n\n## 目标受众\n${audience}\n\n---\n\n${prompt}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      // 定义子 Agent
      agents: {
        "xhs-agent": {
          description: "小红书营销内容创作专家，生成高互动率的小红书笔记",
          prompt: `你是小红书营销内容创作专家。

## 你的 SOP（严格遵守）
${xhsSkill}

## 当前胜出模式（Analyst 最新提炼）
${xhsPatterns}

## 品牌调性
${brandVoice}

## 目标受众
${audience}

## 输出格式
请按以下格式输出每篇笔记：
---
### 标题
[笔记标题]

### 正文
[笔记正文，含 emoji 分段]

### 话题标签
[#标签1# #标签2# ...]

### 元数据
- hook_type: [question/number/story/controversy/pain_point]
- emotion_trigger: [curiosity/urgency/social_proof/fomo/aspiration]
- 预计字数: [X字]
---

生成完成后，进行自检清单验证，列出每项是否通过。`,
          tools: ["Read", "Write", "Glob"],
        },
      },
      // Agent 工作目录
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
