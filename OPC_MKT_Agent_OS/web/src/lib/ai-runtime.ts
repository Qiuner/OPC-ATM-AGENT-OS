import type { ProviderName } from '@/lib/llm/types';

// ==========================================
// 服务端运行时配置（内存存储）
// ==========================================

interface RuntimeConfig {
  keys: Record<string, string>;
  defaultProvider: string;
  mode: string;
}

let runtimeConfig: RuntimeConfig | null = null;

export function setRuntimeConfig(config: RuntimeConfig): void {
  runtimeConfig = config;
}

export function getRuntimeConfig(): RuntimeConfig | null {
  return runtimeConfig;
}

export function getActiveProvider(): ProviderName {
  // 优先用运行时配置
  if (runtimeConfig?.keys) {
    if (runtimeConfig.keys['anthropic']) return 'claude';
    if (runtimeConfig.keys['openai']) return 'openai';
    if (runtimeConfig.keys['google']) return 'gemini';
    if (runtimeConfig.keys['deepseek']) return 'deepseek';
  }

  // Fallback 到环境变量
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_AI_API_KEY) return 'gemini';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';

  return 'claude';
}
