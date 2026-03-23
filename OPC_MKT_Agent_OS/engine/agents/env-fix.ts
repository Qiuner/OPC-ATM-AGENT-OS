/**
 * 环境变量修复
 *
 * Claude Agent SDK 底层运行 Claude Code 子进程。
 * 当从 Claude Code session 内部调用时，继承的环境变量会导致冲突。
 * 必须在 import SDK 之前清理这些变量。
 */

// 在任何 SDK import 之前执行
delete process.env.CLAUDECODE;
delete process.env.CLAUDE_CODE_ENTRYPOINT;
delete process.env.CLAUDE_CODE_IS_AGENT;

export {};
