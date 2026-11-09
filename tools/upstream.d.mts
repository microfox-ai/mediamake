/** Types for tools/upstream.mjs, which apps/studio/scripts/notes.ts imports. */
export function compareUrl(remoteUrl: string, base: string, branch: string): string | undefined;
export function stamp(now?: Date): string;
export function openPr(opts: {
  repo: string;
  branch: string;
  title: string;
  body?: string;
  message?: string;
  change: (worktree: string) => string[];
  remote?: string;
  base?: string;
  push?: boolean;
  pr?: boolean;
}): { branch: string; commit: string; pushed: boolean; pr?: string; compare?: string };
