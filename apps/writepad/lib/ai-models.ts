/**
 * AI model registry for Writepad chat.
 *
 * supportsWebSearch: true  → the browser/globe icon is shown when this model is selected.
 *   - Google 2.5+: uses google.tools.googleSearch({})
 *   - Anthropic:   uses anthropic.tools.webSearch_20250305({})
 *   - OpenAI GPT:  uses openai.tools.webSearch() via Responses API
 */

export interface ModelDef {
  /** Canonical ID used as `source` in usage docs: "provider/model-name" */
  id: string;
  /** Short display label shown in the selector */
  label: string;
  /** Provider package to use */
  provider: 'google' | 'anthropic' | 'openai';
  /** Exact model string passed to the provider constructor */
  modelName: string;
  /** Whether this model supports a built-in web search tool */
  supportsWebSearch: boolean;
}

export const CHAT_MODELS: ModelDef[] = [
  // ── Google Gemini ────────────────────────────────────────────────────────
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    modelName: 'gemini-2.5-flash',
    supportsWebSearch: true,
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'google',
    modelName: 'gemini-2.5-pro',
    supportsWebSearch: true,
  },
  {
    id: 'google/gemini-pro-latest',
    label: 'Gemini Pro Latest',
    provider: 'google',
    modelName: 'gemini-pro-latest',
    supportsWebSearch: true,
  },
  {
    id: 'google/gemini-flash-latest',
    label: 'Gemini Flash Latest',
    provider: 'google',
    modelName: 'gemini-flash-latest',
    supportsWebSearch: true,
  },
  // ── Anthropic Claude ─────────────────────────────────────────────────────
  {
    id: 'anthropic/claude-opus-4-6',
    label: 'Claude Opus 4.6',
    provider: 'anthropic',
    modelName: 'claude-opus-4-6',
    supportsWebSearch: true,
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    modelName: 'claude-sonnet-4-6',
    supportsWebSearch: true,
  },
  {
    id: 'anthropic/claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    modelName: 'claude-haiku-4-5-20251001',
    supportsWebSearch: true,
  },
  // ── OpenAI ───────────────────────────────────────────────────────────────
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    modelName: 'gpt-4o',
    supportsWebSearch: true,
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    supportsWebSearch: true,
  },
  {
    id: 'openai/o3',
    label: 'o3',
    provider: 'openai',
    modelName: 'o3',
    supportsWebSearch: false,
  },
];

export const DEFAULT_MODEL_ID = 'google/gemini-pro-latest';

export function getModelDef(id: string): ModelDef {
  return CHAT_MODELS.find((m) => m.id === id) ?? CHAT_MODELS[0];
}
