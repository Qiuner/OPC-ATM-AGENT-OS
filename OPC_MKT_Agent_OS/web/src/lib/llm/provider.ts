import type { LLMProvider, ProviderName } from './types';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai-provider';
import { GeminiProvider } from './providers/gemini';
import { DeepSeekProvider } from './providers/deepseek';
import { MiniMaxProvider } from './providers/minimax';
import { GLMProvider } from './providers/glm';

const providerMap: Record<ProviderName, (apiKey?: string) => LLMProvider> = {
  claude: (apiKey) => new ClaudeProvider(apiKey),
  openai: (apiKey) => new OpenAIProvider(apiKey),
  gemini: (apiKey) => new GeminiProvider(apiKey),
  deepseek: (apiKey) => new DeepSeekProvider(apiKey),
  minimax: (apiKey) => new MiniMaxProvider(apiKey),
  glm: (apiKey) => new GLMProvider(apiKey),
};

export function createProvider(name: ProviderName, apiKey?: string): LLMProvider {
  const factory = providerMap[name];
  if (!factory) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  return factory(apiKey);
}
