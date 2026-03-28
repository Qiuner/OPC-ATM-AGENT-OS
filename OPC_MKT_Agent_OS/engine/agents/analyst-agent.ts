/**
 * Analyst Agent — 数据飞轮核心
 *
 * 职责：
 * 1. 分析各渠道 Top 20% 内容的共同特征
 * 2. 提炼胜出模式 → 更新 winning_patterns 表
 * 3. 重写 SKILL.md → 让创作 Agent 下轮更好
 * 4. 生成周报发给人类
 *
 * 运行方式：
 *   npx tsx agents/analyst-agent.ts          # 手动触发
 *   scheduler.ts 每周一 8:00 自动触发
 */

import "./env-fix.js";
import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MEMORY_DIR = join(import.meta.dirname, "..", "memory");
const SKILLS_DIR = join(import.meta.dirname, "..", "skills");

// ============================================================
// Analyst System Prompt
// ============================================================

const ANALYST_SYSTEM_PROMPT = `
你是 Marketing Agent OS 的 Analyst Agent，负责数据飞轮分析。

## 你的核心使命
通过分析历史内容的表现数据，提炼胜出模式，更新各创作 Agent 的 SOP（SKILL.md），
让下一轮创作质量持续提升。这是整个系统的护城河。

## 分析方法论

### 评分公式
- 小红书: (收藏×3 + 点赞 + 评论×2) / 曝光量 × 100
- 抖音: 完播率×50 + (点赞 + 分享×3) / 播放量 × 50
- X/Twitter: (likes + retweets×3 + replies×2) / impressions × 100

### 分析步骤
1. **数据收集**：读取各渠道已发布内容及其指标
2. **特征提取**：Top 20% 内容的共同特征
   - hook_type 分布（哪种开头方式效果好）
   - emotion_trigger 模式（哪种情绪有效）
   - 标题词汇特征
   - 内容长度分布
   - 发布时间规律
3. **模式对比**：与现有 winning_patterns 对比，找新信号
4. **更新 Skill**：把新发现融入 SKILL.md 的规则中
5. **生成报告**：简洁的中文周报

## 更新规则
- 只更新有数据支撑的部分（样本量 ≥ 10）
- 保留 SKILL.md 的原有格式结构
- 新增的规则标注 [NEW] 和数据来源
- 失效的规则标注 [DEPRECATED] 并说明原因
- 不要删除人工设定的基础规则

## 输出格式
\`\`\`
## 飞轮分析报告 — [日期]

### 数据概览
- 分析时间范围：[开始] ~ [结束]
- 各渠道内容数量：xhs: X, douyin: X, x: X
- 有指标数据的内容：X 条

### 新发现的胜出模式
1. [模式描述] — 平均分 X.X，样本量 X
2. ...

### 已更新的 Skill 文件
- [x] xhs.SKILL.md — 更新了 [具体部分]
- [ ] douyin.SKILL.md — 数据不足，未更新

### 建议
- [可执行的策略建议]
\`\`\`
`;

// ============================================================
// 主执行函数
// ============================================================

export async function runAnalystAgent() {
  console.log("[Analyst] 开始飞轮分析...\n");

  const xhsSkill = await readFile(join(SKILLS_DIR, "xhs", "SKILL.md"), "utf-8").catch(() => "");
  const xhsPatterns = await readFile(join(MEMORY_DIR, "winning-patterns", "xhs-patterns.md"), "utf-8").catch(() => "");

  const prompt = `
今天是 ${new Date().toLocaleDateString("zh-CN")}，请执行本周飞轮分析。

当前 xhs.SKILL.md 内容：
---
${xhsSkill}
---

当前胜出模式文件：
---
${xhsPatterns}
---

请按照分析方法论执行完整流程。
如果数据库中暂无足够数据（内容 < 10 条），请说明情况并给出基于经验的初步建议。
  `;

  for await (const message of query({
    prompt: `${ANALYST_SYSTEM_PROMPT}\n\n${prompt}`,
    options: {
      model: "claude-sonnet-4-20250514",
      permissionMode: "acceptEdits",
      cwd: join(MEMORY_DIR, ".."),
      allowedTools: ["Read", "Write", "Glob", "Grep"],
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
      console.log("\n\n[Analyst] 飞轮分析完成");
    }
  }
}

// ============================================================
// 直接运行入口
// ============================================================

runAnalystAgent().catch((err) => {
  console.error("[Analyst] 执行失败:", err);
  process.exit(1);
});
