/**
 * Claude Bridge — Claude Code CLI 编程接口
 *
 * 通过 child_process 调用 `claude -p --output-format stream-json`，
 * 将 Claude Code 的 Agent Team 能力暴露为可编程的 async generator。
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** stream-json 输出的单行事件 */
export interface StreamJsonEvent {
  type: string;
  subtype?: string;
  /** assistant message content blocks */
  content_block?: {
    type: string;
    text?: string;
    name?: string;
    id?: string;
    input?: unknown;
  };
  /** tool result */
  tool_result?: {
    tool_use_id: string;
    content: unknown;
    is_error?: boolean;
  };
  /** final result */
  result?: string;
  is_error?: boolean;
  session_id?: string;
  total_cost_usd?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  duration_ms?: number;
  /** raw JSON for unknown event types */
  [key: string]: unknown;
}

/** Claude Bridge 配置 */
export interface ClaudeBridgeOptions {
  /** 用户 prompt */
  prompt: string;
  /** 系统提示词（可选） */
  systemPrompt?: string;
  /** 追加到默认系统提示词（可选） */
  appendSystemPrompt?: string;
  /** 最大预算（美元） */
  maxBudgetUsd?: number;
  /** 模型选择 */
  model?: "opus" | "sonnet" | "haiku";
  /** 会话 ID（新建会话） */
  sessionId?: string;
  /** 恢复已有会话 */
  resumeSessionId?: string;
  /** 权限模式 */
  permissionMode?: "auto" | "default" | "bypassPermissions" | "acceptEdits";
  /** 工作目录 */
  cwd?: string;
  /** 超时（毫秒，默认 300000 = 5分钟） */
  timeoutMs?: number;
  /** 额外 CLI 参数 */
  extraArgs?: string[];
  /** 环境变量覆盖 */
  env?: Record<string, string>;
}

/** Bridge 执行结果 */
export interface BridgeResult {
  sessionId?: string;
  totalCostUsd?: number;
  durationMs?: number;
  usage?: StreamJsonEvent["usage"];
  isError: boolean;
  result?: string;
}

/* ------------------------------------------------------------------ */
/*  Claude Bridge                                                      */
/* ------------------------------------------------------------------ */

export class ClaudeBridge extends EventEmitter {
  private proc: ChildProcess | null = null;
  private abortController: AbortController | null = null;

  /**
   * 执行一次 Claude CLI 调用，返回 stream-json 事件的 async generator
   */
  async *execute(options: ClaudeBridgeOptions): AsyncGenerator<StreamJsonEvent> {
    const args = this.buildArgs(options);
    const env = {
      ...process.env,
      ...options.env,
      // 确保 Agent Team 功能开启
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
    };

    this.abortController = new AbortController();
    const timeout = options.timeoutMs ?? 300_000;

    this.proc = spawn("claude", args, {
      cwd: options.cwd || process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
      signal: this.abortController.signal,
    });

    // 超时控制
    const timer = setTimeout(() => {
      this.abort("Timeout exceeded");
    }, timeout);

    const stdout = createInterface({ input: this.proc.stdout! });
    const stderr: string[] = [];

    this.proc.stderr?.on("data", (chunk: Buffer) => {
      stderr.push(chunk.toString());
    });

    // 用 Promise + callback 模式转换为 async generator
    const eventQueue: Array<StreamJsonEvent | null> = [];
    let resolveWait: (() => void) | null = null;
    let done = false;

    const pushEvent = (event: StreamJsonEvent | null) => {
      eventQueue.push(event);
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };

    stdout.on("line", (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const parsed = JSON.parse(trimmed) as StreamJsonEvent;
        pushEvent(parsed);
      } catch {
        // 非 JSON 行（如 debug output），忽略
        this.emit("debug", trimmed);
      }
    });

    this.proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      done = true;

      if (code !== 0 && stderr.length > 0) {
        pushEvent({
          type: "error",
          result: stderr.join(""),
          is_error: true,
        });
      }

      pushEvent(null); // signal end
    });

    this.proc.on("error", (err: Error) => {
      clearTimeout(timer);
      done = true;
      pushEvent({
        type: "error",
        result: err.message,
        is_error: true,
      });
      pushEvent(null);
    });

    // yield events as they arrive
    while (!done || eventQueue.length > 0) {
      if (eventQueue.length === 0) {
        await new Promise<void>((resolve) => {
          resolveWait = resolve;
        });
      }

      while (eventQueue.length > 0) {
        const event = eventQueue.shift()!;
        if (event === null) return; // end of stream
        yield event;
      }
    }
  }

  /** 中断当前执行 */
  abort(reason?: string) {
    if (this.proc && !this.proc.killed) {
      this.proc.kill("SIGTERM");
    }
    this.abortController?.abort(reason);
    this.emit("abort", reason);
  }

  /** 构建 CLI 参数 */
  private buildArgs(options: ClaudeBridgeOptions): string[] {
    const args: string[] = [
      "-p",                               // print mode (non-interactive)
      "--output-format", "stream-json",   // NDJSON streaming output
      "--verbose",                         // required for stream-json
    ];

    // 权限模式 — 默认 acceptEdits，满足大多数场景
    if (options.permissionMode) {
      args.push("--permission-mode", options.permissionMode);
    } else {
      args.push("--permission-mode", "acceptEdits");
    }

    // 模型
    if (options.model) {
      args.push("--model", options.model);
    }

    // 会话管理
    if (options.resumeSessionId) {
      args.push("--resume", options.resumeSessionId);
    } else if (options.sessionId) {
      args.push("--session-id", options.sessionId);
    }

    // 系统提示词
    if (options.systemPrompt) {
      args.push("--system-prompt", options.systemPrompt);
    }
    if (options.appendSystemPrompt) {
      args.push("--append-system-prompt", options.appendSystemPrompt);
    }

    // 预算
    if (options.maxBudgetUsd) {
      args.push("--max-budget-usd", String(options.maxBudgetUsd));
    }

    // 额外参数
    if (options.extraArgs) {
      args.push(...options.extraArgs);
    }

    // prompt 作为最后一个参数
    args.push(options.prompt);

    return args;
  }
}

/** 单例 */
let bridgeInstance: ClaudeBridge | null = null;

export function getClaudeBridge(): ClaudeBridge {
  if (!bridgeInstance) {
    bridgeInstance = new ClaudeBridge();
  }
  return bridgeInstance;
}
