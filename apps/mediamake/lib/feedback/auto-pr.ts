import type { CatalogItemRecord } from '../catalog/types';
import type { Feedback } from './feedback';

/**
 * Automatic draft pull requests. MediaMake does not write the fix itself: it
 * starts the `feedback-fix` workflow on the item's repository
 * (.github/workflows/feedback-fix.yml), where Claude Code reads the feedback,
 * changes the files and opens a draft PR. An admin still reviews and merges
 * it. The workflow tells MediaMake how it went (app/api/feedback-hook).
 *
 * FEEDBACK_GITHUB_TOKEN starts the workflow (a token that may run Actions on
 * the repository) and FEEDBACK_HOOK_SECRET is what the workflow shows when it
 * reads the feedback and reports back. This file is the rules and the
 * request, with no database.
 */

export const FIX_WORKFLOW = 'feedback-fix.yml';
export const DEFAULT_PR_REPO = 'microfox-ai/mediamake';
/** How many pull requests triage may raise on its own in a day (FEEDBACK_AUTO_PRS_PER_DAY). The button is not counted. */
export const DEFAULT_AUTO_PRS_PER_DAY = 3;

export const prRepo = () => process.env.FEEDBACK_PR_REPO?.trim() || DEFAULT_PR_REPO;

export function autoPrsPerDay(): number {
  const parsed = Number(process.env.FEEDBACK_AUTO_PRS_PER_DAY);
  return process.env.FEEDBACK_AUTO_PRS_PER_DAY?.trim() && Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_AUTO_PRS_PER_DAY;
}

export const prConfigured = () => !!process.env.FEEDBACK_GITHUB_TOKEN?.trim() && !!process.env.FEEDBACK_HOOK_SECRET?.trim();

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/**
 * The repository a fix for an item goes to, or why there is none. An item
 * made by someone else is theirs to fix. One of ours whose package is built
 * in another repository goes there (that repository needs the workflow too);
 * the rest, and feedback about MediaMake as a whole, go to this one.
 */
export function fixRepoOf(record: Pick<CatalogItemRecord, 'madeBy' | 'install' | 'title'> | null): { repo: string } | { why: string } {
  if (record?.madeBy) return { why: `${record.title} is made by ${record.madeBy.name}, so a fix is theirs to make. Add a known issue instead.` };
  const source = record?.install?.source;
  const built = source?.type === 'mcp-server' ? source.mcpb?.repo : undefined;
  const repo = built && REPO.test(built) ? built : prRepo();
  return REPO.test(repo) ? { repo } : { why: `FEEDBACK_PR_REPO is not a repository (owner/name): ${repo}` };
}

/** The branch a feedback's fix is pushed to. The merged workflow knows a fix by this prefix. */
export const fixBranch = (feedbackId: string) => `feedback/${feedbackId.replace(/[^A-Za-z0-9_-]/g, '')}`;

/** The GitHub API call that starts the fix workflow for one feedback. */
export function dispatchRequest(repo: string, feedback: Pick<Feedback, 'feedbackId' | 'itemId'>, token: string): { url: string; init: RequestInit } {
  return {
    url: `https://api.github.com/repos/${repo}/actions/workflows/${FIX_WORKFLOW}/dispatches`,
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
        'user-agent': 'mediamake-feedback',
      },
      // only ids travel: the workflow reads the words from MediaMake with its secret
      body: JSON.stringify({ ref: 'main', inputs: { feedback_id: feedback.feedbackId, item: feedback.itemId ?? '' } }),
    },
  };
}

/** What GitHub's refusal means, in words an admin can act on. */
export function dispatchProblem(status: number, repo: string): string {
  if (status === 404) return `${repo} has no ${FIX_WORKFLOW} workflow on main, or the token cannot see the repository`;
  if (status === 401 || status === 403) return `GitHub refused FEEDBACK_GITHUB_TOKEN for ${repo} (${status}): it needs to be allowed to run Actions there`;
  if (status === 422) return `GitHub would not start ${FIX_WORKFLOW} on ${repo} (422): the workflow's inputs changed or it cannot be started by hand`;
  return `GitHub answered ${status} when starting the fix on ${repo}`;
}

const PR_URL = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/(\d+)\/?(?:[?#].*)?$/;

/** A pull request an admin names: its link, `owner/name#12`, or a bare number on the default repository. */
export function parsePrRef(value: unknown, fallbackRepo: string = prRepo()): { repo: string; number: number; url: string } | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const link = text.match(PR_URL);
  const short = text.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#(\d+)$/);
  const bare = text.match(/^#?(\d+)$/);
  const repo = link?.[1] ?? short?.[1] ?? (bare ? fallbackRepo : null);
  const number = Number(link?.[2] ?? short?.[2] ?? bare?.[1]);
  if (!repo || !Number.isInteger(number) || number < 1) return null;
  return { repo, number, url: `https://github.com/${repo}/pull/${number}` };
}

/** What the workflow sends to /api/feedback-hook. */
export type HookEvent =
  | { event: 'fix'; feedbackId: string; state: 'open' | 'failed'; repo: string; prNumber?: number; prUrl?: string; runUrl?: string; costUSD?: number; note?: string }
  | { event: 'merged'; repo: string; prNumber: number; prUrl?: string };

const httpsUrl = (value: unknown) => (typeof value === 'string' && /^https:\/\/github\.com\/\S{1,300}$/.test(value) ? value : undefined);

export function parseHookEvent(body: unknown): HookEvent | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const repo = typeof b.repo === 'string' && REPO.test(b.repo) ? b.repo : null;
  if (!repo) return { error: 'repo must be owner/name' };
  const prNumber = Number.isInteger(Number(b.prNumber)) && Number(b.prNumber) > 0 ? Number(b.prNumber) : undefined;
  if (b.event === 'merged') {
    if (!prNumber) return { error: 'prNumber is required' };
    return { event: 'merged', repo, prNumber, ...(httpsUrl(b.prUrl) && { prUrl: httpsUrl(b.prUrl) }) };
  }
  if (b.event === 'fix') {
    if (typeof b.feedbackId !== 'string' || !/^fb_[A-Za-z0-9_-]{6,40}$/.test(b.feedbackId)) return { error: 'feedbackId is required' };
    if (b.state !== 'open' && b.state !== 'failed') return { error: 'state must be open or failed' };
    if (b.state === 'open' && !prNumber) return { error: 'An open fix needs its prNumber' };
    const cost = Number(b.costUSD);
    return {
      event: 'fix',
      feedbackId: b.feedbackId,
      state: b.state,
      repo,
      ...(prNumber && { prNumber }),
      ...(httpsUrl(b.prUrl) && { prUrl: httpsUrl(b.prUrl) }),
      ...(httpsUrl(b.runUrl) && { runUrl: httpsUrl(b.runUrl) }),
      ...(Number.isFinite(cost) && cost > 0 && { costUSD: Math.min(cost, 1000) }),
      ...(typeof b.note === 'string' && b.note.trim() && { note: b.note.trim().slice(0, 500) }),
    };
  }
  return { error: 'event must be fix or merged' };
}
