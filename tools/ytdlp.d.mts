/** Types for tools/ytdlp.mjs, which apps/studio/scripts/thumbs.ts and youtube-grab.ts import. */
export type Found = { bin: string; onPath: boolean };
export type Plan = { what: string; cmd: string; args: string[] };
export const STALE_DAYS: number;
export function knownPlaces(o?: { platform?: string; home?: string; env?: Record<string, string | undefined> }): string[];
export function findYtdlp(o?: {
  platform?: string;
  home?: string;
  env?: Record<string, string | undefined>;
  exists?: (file: string) => boolean;
}): Found | null;
export function envWith(found: Found | null, env?: NodeJS.ProcessEnv, platform?: string): NodeJS.ProcessEnv;
export function ageDays(version: string | null | undefined, now?: number): number | null;
export function managerOf(bin: string, o?: { real?: string; uvTool?: () => boolean }): string;
export function updatePlan(manager: string, bin?: string): Plan | null;
export function installPlan(o: { platform?: string; has: (cmd: string) => boolean; ffmpeg?: boolean }): Plan | null;
export function installHint(platform?: string): string;
export function inspectYtdlp(o?: { has?: (cmd: string) => boolean; ffmpeg?: boolean }): {
  found: Found | null;
  version?: string | null;
  age?: number | null;
  manager?: string;
  update?: Plan | null;
  install: Plan | null;
};
