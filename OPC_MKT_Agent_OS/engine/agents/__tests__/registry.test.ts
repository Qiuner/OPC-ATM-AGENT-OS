/**
 * Phase 1 测试 — Agent Registry 单元测试
 *
 * 覆盖: TC-001 ~ TC-009
 */

import { AgentRegistry } from "../registry.js";

// ============================================================
// TC-001: Registry 单例模式
// ============================================================
function testSingleton() {
  const a = AgentRegistry.getInstance();
  const b = AgentRegistry.getInstance();
  console.assert(a === b, "TC-001 FAIL: getInstance 应返回同一引用");
  console.log("TC-001 PASS: Registry 单例模式正确");
}

// ============================================================
// TC-002: 默认 Agent 注册
// ============================================================
function testDefaultRegistration() {
  const registry = AgentRegistry.getInstance();
  const all = registry.getAll();

  console.assert(all.length >= 6, `TC-002 FAIL: 期望至少6个Agent，实际${all.length}`);

  const requiredIds = ["ceo", "xhs-agent", "analyst-agent", "podcast-agent", "growth-agent", "brand-reviewer"];
  for (const id of requiredIds) {
    const found = all.find(a => a.id === id);
    console.assert(found, `TC-002 FAIL: 缺少必要Agent: ${id}`);
  }

  console.log(`TC-002 PASS: 默认注册 ${all.length} 个 Agent，包含所有必要角色`);
}

// ============================================================
// TC-003: 按 ID 查询 Agent
// ============================================================
function testGetById() {
  const registry = AgentRegistry.getInstance();

  const ceo = registry.get("ceo");
  console.assert(ceo !== undefined, "TC-003 FAIL: get('ceo') 不应返回 undefined");
  console.assert(ceo?.id === "ceo", "TC-003 FAIL: CEO id 不匹配");
  console.assert(ceo?.level === "orchestrator", "TC-003 FAIL: CEO level 应为 orchestrator");
  console.assert(ceo?.tools.includes("Agent"), "TC-003 FAIL: CEO tools 应包含 Agent");

  const xhs = registry.get("xhs-agent");
  console.assert(xhs !== undefined, "TC-003 FAIL: get('xhs-agent') 不应返回 undefined");
  console.assert(xhs?.level === "specialist", "TC-003 FAIL: XHS level 应为 specialist");

  const nonexistent = registry.get("nonexistent-agent");
  console.assert(nonexistent === undefined, "TC-003 FAIL: 不存在的 Agent 应返回 undefined");

  console.log("TC-003 PASS: 按 ID 查询正确");
}

// ============================================================
// TC-004: 按级别筛选 Agent
// ============================================================
function testGetByLevel() {
  const registry = AgentRegistry.getInstance();

  const orchestrators = registry.getByLevel("orchestrator");
  console.assert(orchestrators.length === 1, `TC-004 FAIL: orchestrator 应只有1个，实际${orchestrators.length}`);
  console.assert(orchestrators[0].id === "ceo", "TC-004 FAIL: orchestrator 应为 CEO");

  const specialists = registry.getByLevel("specialist");
  console.assert(specialists.length >= 4, `TC-004 FAIL: specialist 至少4个，实际${specialists.length}`);

  const reviewers = registry.getByLevel("reviewer");
  console.assert(reviewers.length >= 1, `TC-004 FAIL: reviewer 至少1个，实际${reviewers.length}`);
  console.assert(reviewers.some(r => r.id === "brand-reviewer"), "TC-004 FAIL: reviewer 应包含 brand-reviewer");

  console.log("TC-004 PASS: 按级别筛选正确");
}

// ============================================================
// TC-005: 动态注册新 Agent
// ============================================================
function testDynamicRegistration() {
  const registry = AgentRegistry.getInstance();
  const initialCount = registry.getAll().length;

  registry.register({
    id: "test-agent",
    name: "测试 Agent",
    nameEn: "Test",
    description: "用于测试的 Agent",
    skillFile: "",
    model: "claude-sonnet-4-20250514",
    tools: ["Read"],
    maxTurns: 3,
    level: "specialist",
    color: "#000000",
    avatar: "T",
  });

  const newCount = registry.getAll().length;
  console.assert(newCount === initialCount + 1, `TC-005 FAIL: 注册后总数应+1，期望${initialCount + 1}，实际${newCount}`);

  const testAgent = registry.get("test-agent");
  console.assert(testAgent !== undefined, "TC-005 FAIL: 注册后应能查询到 test-agent");
  console.assert(testAgent?.name === "测试 Agent", "TC-005 FAIL: 注册的 name 不匹配");

  console.log("TC-005 PASS: 动态注册新 Agent 正确");
}

// ============================================================
// TC-006: AgentDefinition 字段完整性
// ============================================================
function testFieldCompleteness() {
  const registry = AgentRegistry.getInstance();
  const all = registry.getAll();

  const requiredFields = ["id", "name", "nameEn", "description", "model", "tools", "maxTurns", "level", "color", "avatar"] as const;

  let allComplete = true;
  for (const agent of all) {
    if (agent.id === "test-agent") continue; // 跳过测试注册的
    for (const field of requiredFields) {
      const value = agent[field];
      if (value === undefined || value === null) {
        console.log(`TC-006 FAIL: Agent ${agent.id} 缺少字段 ${field}`);
        allComplete = false;
      }
    }

    // tools 非空数组
    if (!Array.isArray(agent.tools) || agent.tools.length === 0) {
      console.log(`TC-006 FAIL: Agent ${agent.id} 的 tools 应为非空数组`);
      allComplete = false;
    }

    // model 有效性
    if (!agent.model.includes("claude")) {
      console.log(`TC-006 FAIL: Agent ${agent.id} 的 model 不包含 'claude': ${agent.model}`);
      allComplete = false;
    }
  }

  if (allComplete) {
    console.log("TC-006 PASS: 所有 Agent 字段完整");
  }
}

// ============================================================
// TC-007: buildDirectConfig 构建 SDK 配置
// ============================================================
async function testBuildDirectConfig() {
  const registry = AgentRegistry.getInstance();

  const config = await registry.buildDirectConfig("xhs-agent", "写一篇关于AI工具的笔记");

  console.assert(typeof config.prompt === "string", "TC-007 FAIL: prompt 应为字符串");
  console.assert(config.prompt.includes("小红书创作专家"), "TC-007 FAIL: prompt 应包含 Agent 名称");
  console.assert(config.prompt.includes("AI工具"), "TC-007 FAIL: prompt 应包含用户消息");

  const options = config.options as Record<string, unknown>;
  console.assert(options.model === "claude-sonnet-4-20250514", "TC-007 FAIL: model 不匹配");
  console.assert(Array.isArray(options.allowedTools), "TC-007 FAIL: allowedTools 应为数组");
  console.assert(options.maxTurns === 5, `TC-007 FAIL: maxTurns 应为5，实际${options.maxTurns}`);

  console.log("TC-007 PASS: buildDirectConfig 构建正确");
}

// ============================================================
// TC-008: buildDirectConfig 处理不存在的 Agent
// ============================================================
async function testBuildDirectConfigNotFound() {
  const registry = AgentRegistry.getInstance();

  try {
    await registry.buildDirectConfig("nonexistent", "test");
    console.log("TC-008 FAIL: 应抛出错误但未抛出");
  } catch (err) {
    const msg = (err as Error).message;
    console.assert(msg.includes("Agent not found"), `TC-008 FAIL: 错误消息应包含 'Agent not found'，实际: ${msg}`);
    console.log("TC-008 PASS: 正确抛出 Agent not found 错误");
  }
}

// ============================================================
// TC-009: buildSupervisorConfig 构建 CEO 调度配置
// ============================================================
async function testBuildSupervisorConfig() {
  const registry = AgentRegistry.getInstance();

  const config = await registry.buildSupervisorConfig("帮我写一篇小红书笔记");

  console.assert(typeof config.prompt === "string", "TC-009 FAIL: prompt 应为字符串");
  console.assert(config.prompt.includes("CEO 营销总监"), "TC-009 FAIL: prompt 应包含 CEO 角色");
  console.assert(config.prompt.includes("小红书笔记"), "TC-009 FAIL: prompt 应包含用户消息");

  const options = config.options as Record<string, unknown>;
  const agents = options.agents as Record<string, unknown>;

  console.assert(agents !== undefined, "TC-009 FAIL: options.agents 不应为 undefined");

  // 子 Agent 应包含所有非 CEO 的 Agent
  const subAgentIds = Object.keys(agents);
  console.assert(!subAgentIds.includes("ceo"), "TC-009 FAIL: 子 Agent 不应包含 CEO 自身");
  console.assert(subAgentIds.includes("xhs-agent"), "TC-009 FAIL: 子 Agent 应包含 xhs-agent");
  console.assert(subAgentIds.includes("analyst-agent"), "TC-009 FAIL: 子 Agent 应包含 analyst-agent");
  console.assert(subAgentIds.includes("podcast-agent"), "TC-009 FAIL: 子 Agent 应包含 podcast-agent");

  // 每个子 Agent 应有 description 和 prompt
  for (const [id, def] of Object.entries(agents)) {
    const subDef = def as Record<string, unknown>;
    console.assert(typeof subDef.description === "string" && subDef.description.length > 0,
      `TC-009 FAIL: 子Agent ${id} 的 description 为空`);
    console.assert(typeof subDef.prompt === "string" && subDef.prompt.length > 0,
      `TC-009 FAIL: 子Agent ${id} 的 prompt 为空`);
  }

  // allowedTools 应包含 Agent
  const allowedTools = options.allowedTools as string[];
  console.assert(allowedTools.includes("Agent"), "TC-009 FAIL: CEO allowedTools 应包含 'Agent'");

  console.log(`TC-009 PASS: buildSupervisorConfig 构建正确，包含 ${subAgentIds.length} 个子 Agent`);
}

// ============================================================
// TC-034: Podcast Agent 注册验证
// ============================================================
function testPodcastAgentRegistration() {
  const registry = AgentRegistry.getInstance();
  const podcast = registry.get("podcast-agent");

  console.assert(podcast !== undefined, "TC-034 FAIL: podcast-agent 未注册");
  console.assert(podcast?.name === "播客制作专家", `TC-034 FAIL: name 不匹配: ${podcast?.name}`);
  console.assert(podcast?.level === "specialist", `TC-034 FAIL: level 应为 specialist: ${podcast?.level}`);
  console.assert(podcast?.tools.includes("Read"), "TC-034 FAIL: tools 应包含 Read");
  console.assert(podcast?.tools.includes("Write"), "TC-034 FAIL: tools 应包含 Write");
  console.assert(podcast?.maxTurns === 8, `TC-034 FAIL: maxTurns 应为8: ${podcast?.maxTurns}`);
  console.assert(podcast?.skillFile === "podcast/SKILL.md", `TC-034 FAIL: skillFile 不匹配: ${podcast?.skillFile}`);

  console.log("TC-034 PASS: Podcast Agent 注册验证正确");
}

// ============================================================
// 运行所有测试
// ============================================================
async function runAllTests() {
  console.log("========================================");
  console.log("Phase 1 — Agent Registry 单元测试");
  console.log("========================================\n");

  testSingleton();
  testDefaultRegistration();
  testGetById();
  testGetByLevel();
  testDynamicRegistration();
  testFieldCompleteness();
  await testBuildDirectConfig();
  await testBuildDirectConfigNotFound();
  await testBuildSupervisorConfig();
  testPodcastAgentRegistration();

  console.log("\n========================================");
  console.log("Registry 测试完成");
  console.log("========================================");
}

runAllTests().catch(err => {
  console.error("测试运行失败:", err);
  process.exit(1);
});
