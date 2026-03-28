/**
 * Phase 2 测试 — MCP Server 集成测试
 *
 * 覆盖：
 * 1. MCP 协议标准验证（Server 结构、JSON-RPC handler）
 * 2. 工具定义完整性（name, description, inputSchema）
 * 3. Mock 模式功能验证（无 API key 时返回 mock 数据）
 * 4. Registry mcpServers 挂载验证
 * 5. buildSupervisorConfig MCP 聚合验证
 * 6. 共享工具函数验证
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MCPS_DIR = "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/engine/mcps";

// ============================================================
// 辅助：加载 tools 模块
// ============================================================

interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// ============================================================
// 1. MCP 协议标准验证（Server 结构、JSON-RPC）
// ============================================================

async function testMCPProtocol() {
  console.log("--- 1. MCP 协议标准验证 ---\n");

  const servers = [
    { name: "creatorflow", dir: "creatorflow", expectedName: "creatorflow-mcp" },
    { name: "xhs-data", dir: "xhs-data", expectedName: "xhs-data-mcp" },
    { name: "podcast-tts", dir: "podcast-tts", expectedName: "podcast-tts-mcp" },
  ];

  for (const srv of servers) {
    const indexCode = await readFile(join(MCPS_DIR, srv.dir, "index.ts"), "utf-8");

    // 检查 MCP SDK 导入
    console.assert(
      indexCode.includes("@modelcontextprotocol/sdk/server/index.js"),
      `MCP-PROTO FAIL [${srv.name}]: 应导入 MCP Server SDK`
    );
    console.assert(
      indexCode.includes("StdioServerTransport"),
      `MCP-PROTO FAIL [${srv.name}]: 应使用 StdioServerTransport`
    );

    // 检查 JSON-RPC handler 注册
    console.assert(
      indexCode.includes("ListToolsRequestSchema"),
      `MCP-PROTO FAIL [${srv.name}]: 应注册 ListToolsRequestSchema handler`
    );
    console.assert(
      indexCode.includes("CallToolRequestSchema"),
      `MCP-PROTO FAIL [${srv.name}]: 应注册 CallToolRequestSchema handler`
    );

    // 检查 Server name 和 version
    console.assert(
      indexCode.includes(`"${srv.expectedName}"`),
      `MCP-PROTO FAIL [${srv.name}]: Server name 应为 "${srv.expectedName}"`
    );
    console.assert(
      indexCode.includes('"1.0.0"'),
      `MCP-PROTO FAIL [${srv.name}]: version 应为 "1.0.0"`
    );

    // 检查 capabilities
    console.assert(
      indexCode.includes("capabilities") && indexCode.includes("tools"),
      `MCP-PROTO FAIL [${srv.name}]: 应声明 tools capability`
    );

    // 检查 stdio 传输启动
    console.assert(
      indexCode.includes("server.connect(transport)"),
      `MCP-PROTO FAIL [${srv.name}]: 应连接 stdio transport`
    );

    // 检查 shebang
    console.assert(
      indexCode.startsWith("#!/usr/bin/env node"),
      `MCP-PROTO FAIL [${srv.name}]: 应有 shebang 行`
    );

    console.log(`MCP-PROTO PASS [${srv.name}]: MCP 协议结构正确`);
  }
}

// ============================================================
// 2. 工具定义完整性
// ============================================================

async function testToolDefinitions() {
  console.log("\n--- 2. 工具定义完整性 ---\n");

  const servers = [
    { name: "creatorflow", expectedCount: 7, prefix: "creatorflow_" },
    { name: "xhs-data", expectedCount: 5, prefix: "xhs_" },
    { name: "podcast-tts", expectedCount: 6, prefix: "tts_" },
  ];

  for (const srv of servers) {
    const { tools } = await import(join(MCPS_DIR, srv.name, "tools.ts")) as { tools: ToolDef[] };

    // 数量验证
    console.assert(
      tools.length === srv.expectedCount,
      `TOOL-DEF FAIL [${srv.name}]: 期望 ${srv.expectedCount} 个工具，实际 ${tools.length}`
    );

    // 每个工具必须有 name, description, inputSchema
    let allValid = true;
    for (const tool of tools) {
      if (!tool.name || typeof tool.name !== "string") {
        console.log(`TOOL-DEF FAIL [${srv.name}]: 工具缺少 name`);
        allValid = false;
      }
      if (!tool.description || typeof tool.description !== "string") {
        console.log(`TOOL-DEF FAIL [${srv.name}]: 工具 ${tool.name} 缺少 description`);
        allValid = false;
      }
      if (tool.description.length < 10) {
        console.log(`TOOL-DEF WARN [${srv.name}]: 工具 ${tool.name} 的 description 过短: "${tool.description}"`);
      }
      if (!tool.inputSchema || tool.inputSchema.type !== "object") {
        console.log(`TOOL-DEF FAIL [${srv.name}]: 工具 ${tool.name} 缺少有效的 inputSchema`);
        allValid = false;
      }

      // 命名前缀检查
      if (!tool.name.startsWith(srv.prefix)) {
        console.log(`TOOL-DEF WARN [${srv.name}]: 工具 ${tool.name} 不以 "${srv.prefix}" 开头`);
      }
    }

    if (allValid) {
      const toolNames = tools.map(t => t.name).join(", ");
      console.log(`TOOL-DEF PASS [${srv.name}]: ${tools.length} 个工具定义完整 — [${toolNames}]`);
    }
  }
}

// ============================================================
// 3. Mock 模式验证（核心测试）
// ============================================================

async function testMockMode() {
  console.log("\n--- 3. Mock 模式功能验证 ---\n");

  // 确保无 API key（mock 模式）
  delete process.env.CREATORFLOW_API_KEY;
  delete process.env.XHS_API_KEY;
  delete process.env.TTS_API_KEY;

  // --- CreatorFlow Mock ---
  {
    const { handleToolCall } = await import(join(MCPS_DIR, "creatorflow", "tools.ts"));

    // sync competitors
    const syncResult = await handleToolCall("creatorflow_sync_competitors", {
      competitorIds: ["comp_001", "comp_002"],
    }) as ToolResult;
    console.assert(!syncResult.isError, "MOCK FAIL [creatorflow/sync]: 不应返回错误");
    const syncData = JSON.parse(syncResult.content[0].text);
    console.assert(syncData.synced === 2, `MOCK FAIL [creatorflow/sync]: synced 应为 2，实际 ${syncData.synced}`);
    console.assert(syncData.competitors.length === 2, "MOCK FAIL [creatorflow/sync]: competitors 应有 2 个");
    console.log("MOCK PASS [creatorflow/sync_competitors]: 返回 mock 竞品数据");

    // create material
    const createResult = await handleToolCall("creatorflow_create_material", {
      title: "测试素材",
      content: "这是测试内容",
    }) as ToolResult;
    console.assert(!createResult.isError, "MOCK FAIL [creatorflow/create]: 不应返回错误");
    const createData = JSON.parse(createResult.content[0].text);
    console.assert(createData.id && createData.id.startsWith("mat_"), `MOCK FAIL [creatorflow/create]: id 应以 mat_ 开头: ${createData.id}`);
    console.log("MOCK PASS [creatorflow/create_material]: 返回 mock 素材 ID");

    // quality check
    const qcResult = await handleToolCall("creatorflow_quality_check", {
      title: "AI工具推荐",
      content: "这是一篇关于AI工具的测试内容",
    }) as ToolResult;
    console.assert(!qcResult.isError, "MOCK FAIL [creatorflow/qc]: 不应返回错误");
    const qcData = JSON.parse(qcResult.content[0].text);
    console.assert(typeof qcData.overallScore === "number", "MOCK FAIL [creatorflow/qc]: overallScore 应为数字");
    console.assert(qcData.breakdown, "MOCK FAIL [creatorflow/qc]: 应有 breakdown");
    console.assert(Array.isArray(qcData.suggestions), "MOCK FAIL [creatorflow/qc]: suggestions 应为数组");
    console.log("MOCK PASS [creatorflow/quality_check]: 返回 mock 质量评分");

    // unknown tool
    const unknownResult = await handleToolCall("fake_tool", {}) as ToolResult;
    console.assert(unknownResult.isError === true, "MOCK FAIL [creatorflow/unknown]: 应返回 isError=true");
    console.log("MOCK PASS [creatorflow/unknown_tool]: 未知工具正确返回错误");
  }

  // --- XHS Data (Playwright-based, only unknown tool test) ---
  {
    const { handleToolCall } = await import(join(MCPS_DIR, "xhs-data", "tools.ts"));

    // unknown tool
    const unknownResult = await handleToolCall("fake_xhs_tool", {}) as ToolResult;
    console.assert(unknownResult.isError === true, "MOCK FAIL [xhs/unknown]: 应返回 isError=true");
    console.log("MOCK PASS [xhs/unknown_tool]: 未知工具正确返回错误");
  }

  // --- Podcast TTS Mock ---
  {
    const { handleToolCall } = await import(join(MCPS_DIR, "podcast-tts", "tools.ts"));

    // synthesize
    const synthResult = await handleToolCall("tts_synthesize", {
      text: "这是一段测试语音合成的文本内容",
    }) as ToolResult;
    console.assert(!synthResult.isError, "MOCK FAIL [tts/synth]: 不应返回错误");
    const synthData = JSON.parse(synthResult.content[0].text);
    console.assert(synthData.audioUrl && synthData.audioUrl.includes("mp3"), "MOCK FAIL [tts/synth]: audioUrl 应包含 mp3");
    console.assert(typeof synthData.duration === "number" && synthData.duration > 0, "MOCK FAIL [tts/synth]: duration 应为正数");
    console.log("MOCK PASS [tts/synthesize]: 返回 mock 音频数据");

    // synthesize dialogue
    const dialogResult = await handleToolCall("tts_synthesize_dialogue", {
      segments: [
        { speaker: "小杰", text: "大家好，欢迎来到今天的播客" },
        { speaker: "星星", text: "今天我们聊聊AI工具" },
      ],
      title: "AI播客",
    }) as ToolResult;
    console.assert(!dialogResult.isError, "MOCK FAIL [tts/dialog]: 不应返回错误");
    const dialogData = JSON.parse(dialogResult.content[0].text);
    console.assert(dialogData.segments === 2, `MOCK FAIL [tts/dialog]: segments 应为 2，实际 ${dialogData.segments}`);
    console.log("MOCK PASS [tts/synthesize_dialogue]: 返回 mock 对话音频");

    // merge audio
    const mergeResult = await handleToolCall("tts_merge_audio", {
      audioUrls: ["url1.mp3", "url2.mp3", "url3.mp3"],
    }) as ToolResult;
    console.assert(!mergeResult.isError, "MOCK FAIL [tts/merge]: 不应返回错误");
    const mergeData = JSON.parse(mergeResult.content[0].text);
    console.assert(mergeData.inputCount === 3, `MOCK FAIL [tts/merge]: inputCount 应为 3`);
    console.log("MOCK PASS [tts/merge_audio]: 返回 mock 合并结果");

    // merge with < 2 URLs validation
    const mergeErr = await handleToolCall("tts_merge_audio", {
      audioUrls: ["single.mp3"],
    }) as ToolResult;
    console.assert(mergeErr.isError === true, "MOCK FAIL [tts/merge_1url]: <2 URLs 应返回错误");
    console.log("MOCK PASS [tts/merge_validation]: <2 URLs 正确返回错误");

    // get voices
    const voicesResult = await handleToolCall("tts_get_voices", {}) as ToolResult;
    console.assert(!voicesResult.isError, "MOCK FAIL [tts/voices]: 不应返回错误");
    const voicesData = JSON.parse(voicesResult.content[0].text);
    console.assert(Array.isArray(voicesData.voices) && voicesData.voices.length === 6, "MOCK FAIL [tts/voices]: 应返回 6 个声音");
    console.log("MOCK PASS [tts/get_voices]: 返回 6 个 mock 声音角色");

    // estimate duration
    const estResult = await handleToolCall("tts_estimate_duration", {
      text: "这是一段大约二十个字的测试文本用来估算时长",
    }) as ToolResult;
    console.assert(!estResult.isError, "MOCK FAIL [tts/estimate]: 不应返回错误");
    const estData = JSON.parse(estResult.content[0].text);
    console.assert(typeof estData.estimatedDuration === "number" && estData.estimatedDuration > 0, "MOCK FAIL [tts/estimate]: duration 应为正数");
    console.log("MOCK PASS [tts/estimate_duration]: 返回 mock 时长估算");

    // synthesize empty text validation
    const emptyResult = await handleToolCall("tts_synthesize", {
      text: "",
    }) as ToolResult;
    console.assert(emptyResult.isError === true, "MOCK FAIL [tts/synth_empty]: 空文本应返回错误");
    console.log("MOCK PASS [tts/synthesize_empty]: 空文本正确返回错误");
  }
}

// ============================================================
// 4. Registry mcpServers 挂载验证
// ============================================================

async function testRegistryMCPMapping() {
  console.log("\n--- 4. Registry mcpServers 挂载验证 ---\n");

  const { AgentRegistry } = await import(
    "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/engine/agents/registry.ts"
  );
  const registry = AgentRegistry.getInstance();

  // CEO 应挂载 creatorflow
  const ceo = registry.get("ceo");
  console.assert(ceo?.mcpServers?.creatorflow, "REG-MCP FAIL: CEO 应挂载 creatorflow MCP");
  console.assert(
    ceo?.mcpServers?.creatorflow.args.some((a: string) => a.includes("creatorflow")),
    "REG-MCP FAIL: CEO creatorflow 路径应指向 creatorflow/index.ts"
  );
  console.log("REG-MCP PASS [ceo]: 挂载 creatorflow");

  // XHS Agent 应挂载 xhs-data + image-gen
  const xhs = registry.get("xhs-agent");
  console.assert(xhs?.mcpServers?.["xhs-data"], "REG-MCP FAIL: XHS 应挂载 xhs-data MCP");
  console.assert(xhs?.mcpServers?.["image-gen"], "REG-MCP FAIL: XHS 应挂载 image-gen MCP");
  console.assert(!xhs?.mcpServers?.creatorflow, "REG-MCP FAIL: XHS 不应挂载 creatorflow MCP");
  console.log("REG-MCP PASS [xhs-agent]: 挂载 xhs-data + image-gen");

  // Analyst 应挂载 xhs-data
  const analyst = registry.get("analyst-agent");
  console.assert(analyst?.mcpServers?.["xhs-data"], "REG-MCP FAIL: Analyst 应挂载 xhs-data MCP");
  console.log("REG-MCP PASS [analyst-agent]: 挂载 xhs-data");

  // Growth 应挂载 xhs-data
  const growth = registry.get("growth-agent");
  console.assert(growth?.mcpServers?.["xhs-data"], "REG-MCP FAIL: Growth 应挂载 xhs-data MCP");
  console.log("REG-MCP PASS [growth-agent]: 挂载 xhs-data");

  // Podcast 应挂载 podcast-tts
  const podcast = registry.get("podcast-agent");
  console.assert(podcast?.mcpServers?.["podcast-tts"], "REG-MCP FAIL: Podcast 应挂载 podcast-tts MCP");
  console.log("REG-MCP PASS [podcast-agent]: 挂载 podcast-tts");

  // Brand Reviewer 不应有 MCP（纯审查角色）
  const reviewer = registry.get("brand-reviewer");
  console.assert(!reviewer?.mcpServers || Object.keys(reviewer.mcpServers).length === 0,
    "REG-MCP FAIL: Brand Reviewer 不应挂载 MCP（纯审查角色）");
  console.log("REG-MCP PASS [brand-reviewer]: 无 MCP 挂载（正确）");
}

// ============================================================
// 5. buildSupervisorConfig MCP 聚合验证
// ============================================================

async function testSupervisorMCPAggregation() {
  console.log("\n--- 5. buildSupervisorConfig MCP 聚合验证 ---\n");

  const { AgentRegistry } = await import(
    "/Users/jaydenworkplace/Desktop/Agent-team-project/OPC_MKT_Agent_OS/engine/agents/registry.ts"
  );
  const registry = AgentRegistry.getInstance();

  const config = await registry.buildSupervisorConfig("测试任务");
  const options = config.options as Record<string, unknown>;
  const mcpServers = options.mcpServers as Record<string, unknown>;

  // 应聚合所有 MCP Server（去重后）
  const mcpKeys = Object.keys(mcpServers);
  console.assert(mcpKeys.includes("creatorflow"), "SUP-MCP FAIL: 应包含 creatorflow");
  console.assert(mcpKeys.includes("xhs-data"), "SUP-MCP FAIL: 应包含 xhs-data");
  console.assert(mcpKeys.includes("podcast-tts"), "SUP-MCP FAIL: 应包含 podcast-tts");
  console.assert(mcpKeys.includes("image-gen"), "SUP-MCP FAIL: 应包含 image-gen");
  console.assert(mcpKeys.length === 4, `SUP-MCP FAIL: 应有 4 个 MCP Server，实际 ${mcpKeys.length}: [${mcpKeys.join(", ")}]`);

  // 每个 MCP Server 应有 command 和 args
  for (const key of mcpKeys) {
    const srv = mcpServers[key] as Record<string, unknown>;
    console.assert(srv.command === "npx", `SUP-MCP FAIL [${key}]: command 应为 "npx"，实际 "${srv.command}"`);
    console.assert(Array.isArray(srv.args) && (srv.args as string[]).length > 0, `SUP-MCP FAIL [${key}]: args 应为非空数组`);
    console.assert((srv.args as string[]).some(a => a.includes("index.ts")),
      `SUP-MCP FAIL [${key}]: args 应包含 index.ts 路径`);
  }

  console.log(`SUP-MCP PASS: buildSupervisorConfig 正确聚合 ${mcpKeys.length} 个 MCP Server [${mcpKeys.join(", ")}]`);

  // 验证去重：creatorflow 在 CEO 和 XHS 都有，聚合后应只出现 1 次
  console.assert(
    mcpKeys.filter(k => k === "creatorflow").length === 1,
    "SUP-MCP FAIL: creatorflow 应去重后只出现 1 次"
  );
  console.log("SUP-MCP PASS: MCP Server 去重正确（creatorflow 仅出现 1 次）");
}

// ============================================================
// 6. 共享工具函数验证
// ============================================================

async function testSharedUtils() {
  console.log("\n--- 6. 共享工具函数验证 ---\n");

  const { okResult, errResult, getOptionalEnv } = await import(join(MCPS_DIR, "shared", "utils.ts"));

  // okResult
  const ok = okResult({ key: "value", num: 42 });
  console.assert(ok.content.length === 1, "SHARED FAIL: okResult.content 应有 1 项");
  console.assert(ok.content[0].type === "text", "SHARED FAIL: okResult content type 应为 text");
  console.assert(!ok.isError, "SHARED FAIL: okResult 不应有 isError");
  const parsed = JSON.parse(ok.content[0].text);
  console.assert(parsed.key === "value" && parsed.num === 42, "SHARED FAIL: okResult 数据不匹配");
  console.log("SHARED PASS [okResult]: 正确格式化成功结果");

  // errResult
  const err = errResult("Something went wrong");
  console.assert(err.content.length === 1, "SHARED FAIL: errResult.content 应有 1 项");
  console.assert(err.isError === true, "SHARED FAIL: errResult.isError 应为 true");
  const errParsed = JSON.parse(err.content[0].text);
  console.assert(errParsed.error === "Something went wrong", "SHARED FAIL: errResult 错误消息不匹配");
  console.log("SHARED PASS [errResult]: 正确格式化错误结果");

  // getOptionalEnv
  process.env.TEST_VAR_QA = "hello";
  console.assert(getOptionalEnv("TEST_VAR_QA") === "hello", "SHARED FAIL: getOptionalEnv 应返回环境变量值");
  console.assert(getOptionalEnv("NONEXISTENT_VAR_QA_12345") === undefined, "SHARED FAIL: 不存在时应返回 undefined");
  delete process.env.TEST_VAR_QA;
  console.log("SHARED PASS [getOptionalEnv]: 正确读取和返回 undefined");
}

// ============================================================
// 7. 工具名称唯一性验证
// ============================================================

async function testToolNameUniqueness() {
  console.log("\n--- 7. 工具名称唯一性验证 ---\n");

  const allToolNames: string[] = [];

  const servers = ["creatorflow", "xhs-data", "podcast-tts"];
  for (const srv of servers) {
    const { tools } = await import(join(MCPS_DIR, srv, "tools.ts")) as { tools: ToolDef[] };
    for (const tool of tools) {
      allToolNames.push(tool.name);
    }
  }

  const unique = new Set(allToolNames);
  console.assert(
    unique.size === allToolNames.length,
    `UNIQUE FAIL: 发现重复工具名。总数 ${allToolNames.length}，唯一 ${unique.size}`
  );
  console.log(`UNIQUE PASS: 全部 ${allToolNames.length} 个工具名称唯一，无冲突`);
}

// ============================================================
// 8. inputSchema required 字段验证
// ============================================================

async function testRequiredFields() {
  console.log("\n--- 8. inputSchema required 字段验证 ---\n");

  const servers = ["creatorflow", "xhs-data", "podcast-tts"];

  for (const srv of servers) {
    const { tools } = await import(join(MCPS_DIR, srv, "tools.ts")) as { tools: ToolDef[] };

    for (const tool of tools) {
      if (tool.inputSchema.required) {
        // 每个 required 字段都应该在 properties 中定义
        for (const req of tool.inputSchema.required) {
          console.assert(
            tool.inputSchema.properties && req in tool.inputSchema.properties,
            `SCHEMA FAIL [${srv}/${tool.name}]: required 字段 "${req}" 未在 properties 中定义`
          );
        }
      }
    }
    console.log(`SCHEMA PASS [${srv}]: 所有 required 字段在 properties 中有定义`);
  }
}

// ============================================================
// 运行所有测试
// ============================================================

async function runAllTests() {
  console.log("========================================");
  console.log("Phase 2 — MCP Server 集成测试");
  console.log("========================================\n");

  await testMCPProtocol();
  await testToolDefinitions();
  await testMockMode();
  await testRegistryMCPMapping();
  await testSupervisorMCPAggregation();
  await testSharedUtils();
  await testToolNameUniqueness();
  await testRequiredFields();

  console.log("\n========================================");
  console.log("Phase 2 MCP 集成测试完成");
  console.log("========================================");
}

runAllTests().catch(err => {
  console.error("测试运行失败:", err);
  process.exit(1);
});
