/**
 * Image Generation MCP Server
 *
 * 封装 baoyu-image-gen 脚本为 MCP 工具，支持 OpenAI / Google / DashScope / Replicate。
 * 通过子进程调用原始脚本，保留完整的 provider 选择、重试、batch 等能力。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";

// ── Script Path ──

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "../../tools/image-gen/scripts");
const MAIN_SCRIPT = join(SCRIPT_DIR, "main.ts");

// ── Detect Runtime ──

async function detectRuntime(): Promise<string[]> {
  // Prefer bun for speed; fall back to npx tsx
  try {
    const { execFileSync } = await import("node:child_process");
    execFileSync("bun", ["--version"], { stdio: "pipe" });
    return ["bun"];
  } catch {
    return ["npx", "-y", "tsx"];
  }
}

let runtimeArgs: string[] | null = null;
async function getRuntime(): Promise<string[]> {
  if (!runtimeArgs) runtimeArgs = await detectRuntime();
  return runtimeArgs;
}

// ── MCP Server ──

const server = new Server(
  { name: "image-gen", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// ── Tools List ──

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_image",
      description:
        "使用 AI 生成图片（支持 OpenAI GPT-Image / Google Gemini / DashScope 通义万象 / Replicate）。返回输出文件路径。",
      inputSchema: {
        type: "object" as const,
        properties: {
          prompt: {
            type: "string",
            description: "图片生成 prompt（英文效果更好）",
          },
          outputPath: {
            type: "string",
            description: "输出文件路径（如 ./output/cover.png）",
          },
          provider: {
            type: "string",
            enum: ["google", "openai", "dashscope", "replicate"],
            description:
              "图片生成服务商（默认自动检测可用 API key）",
          },
          model: {
            type: "string",
            description:
              "模型 ID（如 gemini-3-pro-image-preview, gpt-image-1.5, z-image-turbo）",
          },
          quality: {
            type: "string",
            enum: ["normal", "2k"],
            description: "质量预设（默认 2k = 2048px）",
          },
          aspectRatio: {
            type: "string",
            description: "宽高比（如 1:1, 16:9, 4:3, 9:16）",
          },
          referenceImages: {
            type: "array",
            items: { type: "string" },
            description: "参考图片路径（Google/OpenAI/Replicate 支持）",
          },
        },
        required: ["prompt", "outputPath"],
      },
    },
  ],
}));

// ── Tool Handler ──

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "generate_image") {
    return {
      content: [
        { type: "text", text: `Unknown tool: ${request.params.name}` },
      ],
      isError: true,
    };
  }

  const args = request.params.arguments as Record<string, unknown>;

  try {
    // Verify script exists
    await access(MAIN_SCRIPT);
  } catch {
    return {
      content: [
        {
          type: "text",
          text: `Image generation script not found at ${MAIN_SCRIPT}. Run setup first.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await runImageGen(args);
    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `生成失败: ${msg}` }], isError: true };
  }
});

// ── Run Image Generation ──

async function runImageGen(
  args: Record<string, unknown>,
): Promise<string> {
  const runtime = await getRuntime();

  const cliArgs: string[] = [
    ...runtime,
    MAIN_SCRIPT,
    "--prompt",
    args.prompt as string,
    "--image",
    args.outputPath as string,
  ];

  if (args.provider) cliArgs.push("--provider", args.provider as string);
  if (args.model) cliArgs.push("--model", args.model as string);
  if (args.quality) cliArgs.push("--quality", args.quality as string);
  if (args.aspectRatio) cliArgs.push("--ar", args.aspectRatio as string);
  if (args.referenceImages && Array.isArray(args.referenceImages)) {
    cliArgs.push("--ref", ...(args.referenceImages as string[]));
  }
  cliArgs.push("--json");

  const cmd = cliArgs[0]!;
  const cmdArgs = cliArgs.slice(1);

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, cmdArgs, {
      cwd: join(SCRIPT_DIR, ".."),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        // Try to parse JSON output
        try {
          const json = JSON.parse(stdout.trim());
          resolve(
            `✅ 图片已生成\n路径: ${json.savedImage || args.outputPath}\n服务商: ${json.provider || "unknown"}\n模型: ${json.model || "unknown"}`,
          );
        } catch {
          resolve(stdout.trim() || `✅ 图片已保存到 ${args.outputPath}`);
        }
      } else {
        // Extract meaningful error from stderr
        const errLines = stderr
          .trim()
          .split("\n")
          .filter((l) => !l.startsWith("Using ") && !l.startsWith("Switch "));
        const errMsg =
          errLines.join("\n").slice(0, 500) ||
          `Image generation failed (exit code ${code})`;
        reject(new Error(errMsg));
      }
    });

    proc.on("error", (err) => reject(err));

    // Timeout: 5 minutes
    setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Image generation timed out (5 min)"));
    }, 300_000);
  });
}

// ── Start Server ──

const transport = new StdioServerTransport();
await server.connect(transport);
