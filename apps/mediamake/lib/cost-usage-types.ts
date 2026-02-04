/**
 * Types for platform cost and usage (per-request and aggregates).
 * See .cursor/plans/pricing_and_usage_db_architecture for schema.
 */

import type { ObjectId } from 'mongodb';

// --- Per-request: platform_cost_usage ---

export type PlatformKind =
  | 'aws_render'
  | 'ai'
  | 'assembly_ai'
  | 'upstash'
  | 'digital_ocean_s3'
  | (string & {});

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

export interface PlatformCostUsageMetadata {
  renderId?: string;
  bucketName?: string;
  usage?: TokenUsage;
  [key: string]: unknown;
}

export interface PlatformCostUsageDocument {
  _id?: ObjectId;
  platform: PlatformKind;
  source: string;
  clientId?: string;
  isCalculated: boolean;
  createdAt: string;
  updatedAt: string;
  cost?: CostAmount;
  metadata?: PlatformCostUsageMetadata;
}

export type PlatformCostUsageInsert = Omit<
  PlatformCostUsageDocument,
  '_id' | 'createdAt' | 'updatedAt'
>;

// --- ctx.state.usage (AI router): append-only array ---

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

export interface UsageEntry {
  modelId: string;
  usage: TokenUsage;
}

// --- Aggregates: platform_cost_usage_aggregates ---

export type PeriodType = 'day' | 'week' | 'month';

export interface PlatformCostUsageAggregateDocument {
  _id?: ObjectId;
  clientId?: string;
  platform: string;
  periodType: PeriodType;
  periodValue: string;
  totalCostUSD: number;
  currency: string;
  requestCount?: number;
  breakdown?: Record<
    string,
    { totalCostUSD: number; requestCount?: number }
  >;
  createdAt: string;
  updatedAt: string;
}

export type PlatformCostUsageAggregateUpsert = Omit<
  PlatformCostUsageAggregateDocument,
  '_id'
>;
