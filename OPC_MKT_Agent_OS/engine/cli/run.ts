#!/usr/bin/env npx tsx
/**
 * CLI Tool Layer — Unified Entry Point
 * Usage: npx tsx engine/cli/run.ts <module> <action> [--param value ...]
 */

import { getCommand, listCommands, listModules } from './registry.js';
import { cfApi } from './http-client.js';
import type { CLICommand } from './types.js';

// ---- Register all commands ----
import './commands/competitors/list.js';
import './commands/competitors/add.js';
import './commands/competitors/sync.js';
import './commands/competitors/analyze.js';
import './commands/competitors/top-notes.js';
import './commands/competitors/summarize.js';
import './commands/materials/list.js';
import './commands/materials/create.js';
import './commands/materials/import-url.js';
import './commands/materials/search-trending.js';
import './commands/ai/generate.js';
import './commands/ai/publish.js';
import './commands/ai/check-script.js';
import './commands/ai/optimize-script.js';
import './commands/ai/match-framework.js';
import './commands/scripts/list.js';
import './commands/scripts/create.js';
import './commands/scripts/breakdown.js';
import './commands/publish/list.js';
import './commands/publish/create.js';
import './commands/publish/auto-draft.js';

// ---- Arg parsing ----
function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = 'true';
        i += 1;
      }
    } else {
      positional.push(arg);
      i += 1;
    }
  }
  return { positional, flags };
}

function printHelp(cmd?: CLICommand): void {
  if (cmd) {
    console.log(`\n  ${cmd.module} ${cmd.action}${cmd.actionAlias ? ` (${cmd.actionAlias})` : ''}`);
    console.log(`  ${cmd.description}\n`);
    if (cmd.params.length > 0) {
      console.log('  参数:');
      for (const p of cmd.params) {
        const req = p.required ? '(必填)' : `(可选, 默认: ${p.default ?? 'none'})`;
        console.log(`    --${p.name}${p.alias ? ` / --${p.alias}` : ''}  ${p.description} ${req}`);
      }
    }
    console.log('');
    return;
  }

  console.log('\n  OPC MKT Agent OS — CLI Tool Layer\n');
  console.log('  用法: npx tsx engine/cli/run.ts <module> <action> [--param value ...]\n');
  const modules = listModules();
  for (const mod of modules) {
    console.log(`  [${mod}]`);
    for (const c of listCommands(mod)) {
      console.log(`    ${c.action.padEnd(12)} ${c.description}`);
    }
    console.log('');
  }
}

// ---- Main ----
async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);

  // Global help
  if (flags.help !== undefined && positional.length === 0) {
    printHelp();
    return;
  }

  const moduleName = positional[0];
  const actionName = positional[1];

  if (!moduleName) {
    printHelp();
    return;
  }

  // Module-level help
  if (!actionName || flags.help !== undefined) {
    const cmds = listCommands(moduleName);
    if (cmds.length === 0) {
      console.log(JSON.stringify({ success: false, error: `未知模块: ${moduleName}`, meta: { endpoint: '', method: '', duration_ms: 0 } }));
      process.exit(1);
    }
    if (flags.help !== undefined && actionName) {
      const cmd = getCommand(moduleName, actionName);
      if (cmd) { printHelp(cmd); return; }
    }
    console.log(`\n  [${moduleName}] 可用命令:\n`);
    for (const c of cmds) {
      console.log(`    ${c.action.padEnd(12)}${c.actionAlias ? ` (${c.actionAlias})`.padEnd(12) : '            '} ${c.description}`);
    }
    console.log('');
    return;
  }

  const cmd = getCommand(moduleName, actionName);
  if (!cmd) {
    console.log(JSON.stringify({ success: false, error: `未知命令: ${moduleName} ${actionName}`, meta: { endpoint: '', method: '', duration_ms: 0 } }));
    process.exit(1);
  }

  // Validate required params
  for (const p of cmd.params) {
    if (p.required && flags[p.name] === undefined && (p.alias === undefined || flags[p.alias] === undefined)) {
      console.log(JSON.stringify({ success: false, error: `缺少必填参数: --${p.name} (${p.description})`, meta: { endpoint: cmd.endpoint, method: cmd.method, duration_ms: 0 } }));
      process.exit(1);
    }
  }

  // Resolve aliases
  const resolvedFlags: Record<string, string> = { ...flags };
  for (const p of cmd.params) {
    if (p.alias && flags[p.alias] !== undefined && flags[p.name] === undefined) {
      resolvedFlags[p.name] = flags[p.alias];
    }
    if (resolvedFlags[p.name] === undefined && p.default !== undefined) {
      resolvedFlags[p.name] = String(p.default);
    }
  }

  const { query, body } = cmd.mapArgs(resolvedFlags);
  const result = await cfApi(cmd.method, cmd.endpoint, body, query);
  console.log(JSON.stringify(result));

  if (!result.success) process.exit(1);
}

main().catch((err) => {
  console.log(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err), meta: { endpoint: '', method: '', duration_ms: 0 } }));
  process.exit(1);
});
