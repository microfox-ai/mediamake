/**
 * Types for platform cost and usage tracking in Writepad.
 * Schema mirrors mediamake's platform_cost_usage so cross-project
 * analytics work uniformly regardless of which platform generated the cost.
 *
 * Supported platforms: 'ai', and any future external service (storage, render, etc.)
 */

import type { ObjectId } from 'mongodb';

// ─── Platform kinds ───────────────────────────────────────────────────────────

export type PlatformKind =
  | 'ai'
  | 'storage'
  | 'render'
  | (string & {});

// ─── Cost amount ──────────────────────────────────────────────────────────────

export interface CostAmount {
  amount: number;
  currency: string;
  amountUSD?: number;
  breakdown?: {
    inputUSD?: number;
    outputUSD?: number;
    reasoningUSD?: number;
    cacheReadUSD?: number;
    cacheWriteUSD?: number;
  };
}

// ─── Token usage (AI-specific metadata) ──────────────────────────────────────

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  cachedOutputTokens?: number;
}

// ─── Per-request usage document ───────────────────────────────────────────────

export interface PlatformUsageMetadata {
  usage?: TokenUsage;
  [key: string]: unknown;
}

export interface PlatformCostUsageDocument {
  _id?: ObjectId;
  /** e.g. 'ai' | 'storage' | 'render' */
  platform: PlatformKind;
  /** e.g. 'google/gemini-2.5-flash', 'anthropic/claude-sonnet-4-6', 'openai/gpt-4o' */
  source: string;
  /** Writepad project this usage belongs to */
  projectId?: string;
  /** Stable client identifier from auth/session layer for per-user usage analysis */
  clientId?: string;
  /** Whether cost has been calculated (always true in Writepad — inline calculation) */
  isCalculated: boolean;
  cost?: CostAmount;
  metadata?: PlatformUsageMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type PlatformCostUsageInsert = Omit<PlatformCostUsageDocument, '_id' | 'createdAt' | 'updatedAt'>;
