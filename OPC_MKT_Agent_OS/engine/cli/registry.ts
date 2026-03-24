import type { CLICommand } from './types.js';

const commands: CLICommand[] = [];

export function register(cmd: CLICommand): void {
  commands.push(cmd);
}

export function getCommand(module: string, action: string): CLICommand | undefined {
  return commands.find(
    (c) => c.module === module && (c.action === action || c.actionAlias === action),
  );
}

export function listCommands(module?: string): CLICommand[] {
  if (module) return commands.filter((c) => c.module === module);
  return [...commands];
}

export function listModules(): string[] {
  return [...new Set(commands.map((c) => c.module))];
}
