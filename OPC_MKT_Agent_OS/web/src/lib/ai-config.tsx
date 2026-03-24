'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ProviderName } from './llm/types';

export interface AIFeatures {
  strategist: boolean;
  writer: boolean;
  riskCheck: boolean;
  teamStudio: boolean;
  analytics: boolean;
  seoOptimize: boolean;
}

export type AIMode = 'off' | 'core' | 'full';

export interface AIKeys {
  [key: string]: string;
  claude: string;
  openai: string;
  gemini: string;
  deepseek: string;
  minimax: string;
  glm: string;
}

export interface AIConfig {
  keys: AIKeys;
  mode: AIMode;
  features: AIFeatures;
  defaultProvider: ProviderName;
}

interface AIConfigContextValue {
  config: AIConfig;
  setMode: (mode: AIMode) => void;
  toggleFeature: (feature: keyof AIFeatures) => void;
  setKey: (provider: ProviderName, key: string) => void;
  setDefaultProvider: (provider: ProviderName) => void;
}

const CORE_FEATURES: (keyof AIFeatures)[] = ['strategist', 'writer', 'riskCheck'];
const ALL_FEATURES: (keyof AIFeatures)[] = ['strategist', 'writer', 'riskCheck', 'teamStudio', 'analytics', 'seoOptimize'];

const defaultConfig: AIConfig = {
  keys: { claude: '', openai: '', gemini: '', deepseek: '', minimax: '', glm: '' },
  mode: 'off',
  features: {
    strategist: false,
    writer: false,
    riskCheck: false,
    teamStudio: false,
    analytics: false,
    seoOptimize: false,
  },
  defaultProvider: 'claude',
};

const STORAGE_KEY = 'opc-ai-config';

function loadConfig(): AIConfig {
  if (typeof window === 'undefined') return defaultConfig;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AIConfig>;
      return { ...defaultConfig, ...parsed, keys: { ...defaultConfig.keys, ...parsed.keys }, features: { ...defaultConfig.features, ...parsed.features } };
    }
  } catch {
    // ignore
  }
  return defaultConfig;
}

function saveConfig(config: AIConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function getFeaturesForMode(mode: AIMode, currentFeatures: AIFeatures): AIFeatures {
  if (mode === 'off') {
    return { strategist: false, writer: false, riskCheck: false, teamStudio: false, analytics: false, seoOptimize: false };
  }
  if (mode === 'core') {
    const features = { ...currentFeatures };
    for (const f of ALL_FEATURES) {
      features[f] = CORE_FEATURES.includes(f);
    }
    return features;
  }
  // full
  const features = { ...currentFeatures };
  for (const f of ALL_FEATURES) {
    features[f] = true;
  }
  return features;
}

const AIConfigContext = createContext<AIConfigContextValue | null>(null);

export function AIConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      saveConfig(config);
    }
  }, [config, mounted]);

  const setMode = useCallback((mode: AIMode) => {
    setConfig(prev => ({
      ...prev,
      mode,
      features: getFeaturesForMode(mode, prev.features),
    }));
  }, []);

  const toggleFeature = useCallback((feature: keyof AIFeatures) => {
    setConfig(prev => {
      if (prev.mode === 'off') return prev;
      return {
        ...prev,
        features: { ...prev.features, [feature]: !prev.features[feature] },
      };
    });
  }, []);

  const setKey = useCallback((provider: ProviderName, key: string) => {
    setConfig(prev => {
      const newKeys = { ...prev.keys, [provider]: key };
      const hasAnyKey = Object.values(newKeys).some(k => k.length > 0);
      // Auto-enable full mode when first key is entered
      const shouldAutoEnable = hasAnyKey && prev.mode === 'off';
      return {
        ...prev,
        keys: newKeys,
        // Auto-switch to full mode + set this as default provider
        ...(shouldAutoEnable ? {
          mode: 'full' as AIMode,
          features: getFeaturesForMode('full', prev.features),
          defaultProvider: provider,
        } : {}),
        // Auto-set default provider if entering a key and current default has no key
        ...(!shouldAutoEnable && key && !prev.keys[prev.defaultProvider] ? {
          defaultProvider: provider,
        } : {}),
      };
    });
  }, []);

  const setDefaultProvider = useCallback((provider: ProviderName) => {
    setConfig(prev => ({ ...prev, defaultProvider: provider }));
  }, []);

  return (
    <AIConfigContext.Provider value={{ config, setMode, toggleFeature, setKey, setDefaultProvider }}>
      {children}
    </AIConfigContext.Provider>
  );
}

export function useAIConfig(): AIConfigContextValue {
  const ctx = useContext(AIConfigContext);
  if (!ctx) {
    throw new Error('useAIConfig must be used within AIConfigProvider');
  }
  return ctx;
}
