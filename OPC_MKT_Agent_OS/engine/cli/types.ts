/**
 * CLI Tool Layer — Type Definitions
 */

export interface CLIParam {
  name: string;
  alias?: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  default?: string | number | boolean;
}

export interface CLICommand {
  module: string;
  action: string;         // Chinese action name (e.g. "竞品列表")
  actionAlias?: string;   // English alias (e.g. "list")
  description: string;
  params: CLIParam[];
  endpoint: string;       // API path
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  mapArgs: (args: Record<string, string>) => { query?: Record<string, string>; body?: Record<string, unknown> };
}

export interface CLIResultMeta {
  endpoint: string;
  method: string;
  duration_ms: number;
}

export interface CLIResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta: CLIResultMeta;
}
