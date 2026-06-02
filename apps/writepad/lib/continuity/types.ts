/**
 * Continuity check — shared types + Zod schemas.
 *
 * Lives outside `app/ai/workers/` so the UI bundle can import the schemas
 * without pulling in worker-only dependencies.
 */

import { z } from 'zod';

// ─── Issue ────────────────────────────────────────────────────────────────────

export const ISSUE_CATEGORIES = [
  'contradiction',
  'age',
  'timeline',
  'location',
  'character',
  'other',
] as const;

export const ISSUE_SEVERITIES = ['low', 'medium', 'high'] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

/**
 * One file location involved in an issue. The model is instructed to use
 * file paths verbatim from the input and 1-indexed line numbers.
 */
export const FileLocationSchema = z.object({
  filePath: z.string(),
  lineStart: z.number().int().min(1),
  lineEnd: z.number().int().min(1),
  quote: z.string().describe('A short literal quote from the file at this range.'),
});

export type FileLocation = z.infer<typeof FileLocationSchema>;

export const IssueSchema = z.object({
  category: z.enum(ISSUE_CATEGORIES),
  severity: z.enum(ISSUE_SEVERITIES),
  title: z.string().describe('Short title (under 80 chars).'),
  description: z.string().describe('Detailed description of the inconsistency.'),
  locations: z.array(FileLocationSchema).min(1).max(8),
  suggestedResolution: z
    .string()
    .describe('Concrete suggestion the author could apply to resolve this.'),
  /** Model confidence 0–1 for downstream filtering. */
  confidence: z.number().min(0).max(1).default(0.7),
});

export type Issue = z.infer<typeof IssueSchema>;

// ─── Per-shard output ─────────────────────────────────────────────────────────

export const ShardOutputSchema = z.object({
  issues: z.array(IssueSchema).max(30),
  /** Optional notes the model wants to surface (for debugging / audit). */
  notes: z.string().optional(),
});

export type ShardOutput = z.infer<typeof ShardOutputSchema>;

// ─── Final merged report ──────────────────────────────────────────────────────

export const ContinuityReportSchema = z.object({
  issues: z.array(IssueSchema),
});

export type ContinuityReportPayload = z.infer<typeof ContinuityReportSchema>;

// ─── Persisted document shape ─────────────────────────────────────────────────

export interface ContinuityReportStats {
  totalFiles: number;
  totalShards: number;
  durationMs: number;
  /** Approx token count fed into the model (chars/4). */
  tokenEstimate: number;
}

export type ContinuityScope =
  | { type: 'all' }
  | { type: 'folders'; folderIds: string[] };

export interface ContinuityShardError {
  shardIndex: number;
  message: string;
}

export interface ContinuityReportDoc {
  id: string;
  projectId: string;
  jobId: string;
  triggeredBy: string;
  scope: ContinuityScope;
  modelId: string;
  status: 'completed' | 'failed';
  issues: Issue[];
  stats: ContinuityReportStats;
  errorMessage?: string;
  shardErrors?: ContinuityShardError[];
  createdAt: string;
  completedAt: string;
}

// ─── Job-store metadata used during a run ─────────────────────────────────────

export interface ContinuityJobMetadata {
  projectId: string;
  totalFiles?: number;
  totalShards?: number;
  shardsCompleted?: number;
  partialIssueCount?: number;
  reportId?: string;
  cancelRequested?: boolean;
  phase?: 'loading' | 'sharding' | 'analyzing' | 'merging' | 'persisting' | 'done';
}
