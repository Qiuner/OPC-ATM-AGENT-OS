/**
 * 关键测试 — 验证通过 Claude Bridge 能否启动 Agent Team 协作
 *
 * 运行: npx tsx team/test-team.ts
 */

import { ClaudeBridge } from "./claude-bridge.js";

async function main() {
  console.log("=== Agent Team via Bridge Test ===\n");

  const bridge = new ClaudeBridge();

  const teamPrompt = `你需要完成一个简单的团队协作测试任务。

## 步骤
1. 使用 TeamCreate 创建一个名为 "test-team" 的团队
2. 使用 Agent 工具 spawn 一个 teammate，参数：
   - name: "writer"
   - team_name: "test-team"
   - prompt: "你是一个写手。收到任务后，写一句关于春天的诗句，然后用 SendMessage 发送给 team lead。完成后标记你的任务为完成。"
3. 等待 writer 的回复
4. 收到回复后，输出最终结果

## 约束
- 不要自己写诗，必须让 writer 写
- 总共只需要 1 个 teammate
- 这是一个测试，保持简单快速`;

  console.log("[测试] 启动 Agent Team...\n");

  let teamCreated = false;
  let agentSpawned = false;
  let messageReceived = false;
  let resultText = "";

  try {
    for await (const event of bridge.execute({
      prompt: teamPrompt,
      maxBudgetUsd: 2.0,
      model: "sonnet",
      permissionMode: "acceptEdits",
      timeoutMs: 180_000, // 3 分钟
    })) {
      const eventStr = JSON.stringify(event).slice(0, 200);

      // 检测关键事件
      if (event.type === "assistant") {
        const message = event.message as Record<string, unknown> | undefined;
        const content = message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block?.type === "tool_use") {
              const toolName = block.name as string;
              if (toolName === "TeamCreate") {
                teamCreated = true;
                console.log("  ✅ TeamCreate 调用检测到");
              }
              if (toolName === "Agent") {
                agentSpawned = true;
                const input = block.input as Record<string, unknown>;
                console.log(`  ✅ Agent spawn: name=${input?.name}, team=${input?.team_name}`);
              }
              if (toolName === "SendMessage") {
                messageReceived = true;
                const input = block.input as Record<string, unknown>;
                console.log(`  ✅ SendMessage: to=${input?.to}, summary=${input?.summary}`);
              }
            }
            if (block?.type === "text") {
              const text = (block.text as string) || "";
              if (text.length > 5) {
                console.log(`  [text] ${text.slice(0, 150)}`);
              }
            }
          }
        }
      }

      if (event.type === "result") {
        resultText = (event.result as string) || "";
        console.log(`\n  [result] ${resultText.slice(0, 300)}`);
        console.log(`  [cost] $${event.total_cost_usd}`);
      }

      if (event.type === "error") {
        console.error(`  [error] ${event.result}`);
      }
    }
  } catch (err) {
    console.error("  [fatal]", err);
  }

  // 汇总
  console.log("\n=== 测试结果 ===");
  console.log(`  TeamCreate:    ${teamCreated ? "✅" : "❌"}`);
  console.log(`  Agent spawn:   ${agentSpawned ? "✅" : "❌"}`);
  console.log(`  SendMessage:   ${messageReceived ? "✅" : "❌"}`);
  console.log(`  Final result:  ${resultText ? "✅" : "❌"}`);

  const allPassed = teamCreated && agentSpawned;
  console.log(`\n  综合: ${allPassed ? "✅ PASSED — Agent Team 通过 Bridge 可行！" : "❌ PARTIAL — 部分能力验证失败"}`);
}

main().catch(console.error);
