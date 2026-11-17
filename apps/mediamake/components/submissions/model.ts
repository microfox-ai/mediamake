import type { GrantableTier } from '@/lib/memberships/tiers';
import type { Submission, SubmissionStatus, SubmissionTier } from '@/lib/submissions/submission';

/** GET /api/admin/submissions */
export interface SubmissionsData {
  submissions: Submission[];
  counts: Record<SubmissionStatus, number>;
  /** Senders by account id: their name, and their GitHub login when one is linked. */
  people: Record<string, { name: string; github?: string }>;
  /** For each tier an item can be listed at: the membership it earns, and where a skill and anything else goes. */
  tiers: { tier: SubmissionTier; earns: GrantableTier; skill: 'pr' | 'store'; other: 'pr' | 'store' }[];
  setup: { github: boolean; storeRepo: string; publicRepo: string; mail: boolean };
}

export type ShownFile = { path: string; text: string; cut?: boolean } | { path: string; binary: true };

/** GET /api/admin/submissions?id=… */
export interface SubmissionDetail {
  submission: Submission;
  files: ShownFile[];
  /** The catalog item that already has this name, when there is one. */
  existing: { title: string; tier: string; version?: string; inRepo: boolean; madeBy?: string } | null;
}

export async function submissionsCall<T = Record<string, unknown>>(body?: Record<string, unknown>, query = ''): Promise<T> {
  const res = await fetch(`/api/admin/submissions${query}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export const STATUS_WORDS: Record<SubmissionStatus, string> = {
  pending: 'Waiting',
  changes: 'Changes asked',
  approved: 'Accepted',
  live: 'Live',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

export const STATUS_STYLE: Record<SubmissionStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  changes: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  approved: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  live: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  declined: 'bg-muted text-muted-foreground',
  withdrawn: 'bg-muted text-muted-foreground',
};

export const KIND_WORDS = { skill: 'Skill', mcp: 'MCP', app: 'App' } as const;

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}
