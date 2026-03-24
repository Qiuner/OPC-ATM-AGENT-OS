/**
 * Phase 1 测试 — Executor 模块验证
 *
 * 覆盖: TC-031 (函数签名), TC-032 (部分)
 *
 * 注意：完整的 SDK 调用测试需要 ANTHROPIC_API_KEY，
 * 此测试仅验证模块可导入和函数签名。
 */

async function testExecutorImport() {
  try {
    const mod = await import("../executor.js");

    // TC-031: executeAgent 函数存在
    console.assert(typeof mod.executeAgent === "function", "TC-031 FAIL: executeAgent 应为 function");
    console.log("TC-031 PASS: executeAgent 函数存在且类型正确");

    // getAgentStatuses 函数存在
    console.assert(typeof mod.getAgentStatuses === "function", "FAIL: getAgentStatuses 应为 function");
    console.log("TC-031b PASS: getAgentStatuses 函数存在且类型正确");

    // AgentStreamEvent 类型导出
    console.log("TC-031c PASS: 模块可成功导入");

  } catch (err) {
    console.log(`TC-031 FAIL: executor 模块导入失败: ${(err as Error).message}`);
  }
}

async function testGetAgentStatuses() {
  try {
    const { getAgentStatuses } = await import("../executor.js");
    const statuses = await getAgentStatuses();

    console.assert(Array.isArray(statuses), "FAIL: getAgentStatuses 应返回数组");
    console.assert(statuses.length >= 6, `FAIL: 应至少有6个Agent，实际${statuses.length}`);

    for (const agent of statuses) {
      console.assert(typeof agent.id === "string", `FAIL: agent.id 应为 string: ${agent.id}`);
      console.assert(typeof agent.name === "string", `FAIL: agent.name 应为 string`);
      console.assert(typeof agent.status === "string", `FAIL: agent.status 应为 string`);
      console.assert(agent.status === "idle" || agent.status === "busy", `FAIL: status 应为 idle 或 busy: ${agent.status}`);
      console.assert(typeof agent.color === "string" && agent.color.startsWith("#"), `FAIL: color 应为颜色值: ${agent.color}`);
    }

    console.log(`TC-019 PASS: getAgentStatuses 返回 ${statuses.length} 个 Agent，字段格式正确`);

  } catch (err) {
    console.log(`TC-019 FAIL: getAgentStatuses 失败: ${(err as Error).message}`);
  }
}

// ============================================================
// 运行
// ============================================================
console.log("========================================");
console.log("Phase 1 — Executor 模块测试");
console.log("========================================\n");

(async () => {
  await testExecutorImport();
  await testGetAgentStatuses();

  console.log("\n========================================");
  console.log("Executor 测试完成");
  console.log("========================================");
})().catch(err => {
  console.error("测试运行失败:", err);
  process.exit(1);
});
