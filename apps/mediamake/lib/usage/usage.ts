/**
 * Usage, as MediaMake keeps it: which skills an account runs and when, and
 * which skills are on its computers. Pure: what a report may hold, and how
 * runs add up. ./store keeps them; docs/usage.md says what is sent and how
 * to turn it off.
 *
 * A run is a skill's name and a time. Nothing else is ever stored: a report
 * that carries more (arguments, a folder, a session) has the rest dropped
 * here, before it reaches the database.
 */

/** A skill's name as Claude Code has it: its folder's name, or plugin:skill. Never a path. */
export const SKILL_NAME = /^[a-z0-9][a-z0-9._:-]{0,99}$/i;

export const MAX_RUNS_PER_REPORT = 200;
export const MAX_LOCAL_SKILLS = 500;
/** A run dated further ahead than this is a wrong clock, not a run. */
const FUTURE_SLACK_MS = 10 * 60 * 1000;
/** Older runs don't count toward "most used" and aren't taken. */
export const RUN_MAX_AGE_DAYS = 400;

export interface SkillRun {
  skill: string;
  /** ISO 8601, UTC. */
  at: string;
}

export interface LocalSkill {
  name: string;
  version?: string;
}

export interface SkillUsage {
  skill: string;
  runs: number;
  lastAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The runs in a report body: `{ runs: [{ skill, at }] }`, or one `{ skill, at }`.
 * Only the name and the time are read. Runs with a name that isn't a skill's
 * (a path, spaces) or a time that makes no sense are dropped and counted.
 */
export function parseRuns(body: unknown, now = Date.now()): { runs: SkillRun[]; dropped: number } | { error: string } {
  const list = Array.isArray((body as { runs?: unknown })?.runs) ? (body as { runs: unknown[] }).runs : body && typeof body === 'object' && 'skill' in body ? [body] : null;
  if (!list) return { error: 'Send { runs: [{ skill, at }] }: each run is a skill name and an ISO time' };
  if (list.length > MAX_RUNS_PER_REPORT) return { error: `Send ${MAX_RUNS_PER_REPORT} runs at most in one report` };
  const seen = new Set<string>();
  const runs: SkillRun[] = [];
  let dropped = 0;
  for (const entry of list) {
    const { skill, at } = (entry ?? {}) as { skill?: unknown; at?: unknown };
    const name = typeof skill === 'string' ? skill.trim().replace(/^\//, '') : '';
    const time = typeof at === 'string' ? Date.parse(at) : at === undefined ? now : NaN;
    if (!SKILL_NAME.test(name) || !Number.isFinite(time) || time > now + FUTURE_SLACK_MS || time < now - RUN_MAX_AGE_DAYS * DAY_MS) {
      dropped++;
      continue;
    }
    const run = { skill: name, at: new Date(time).toISOString() };
    const key = `${run.skill}\0${run.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    runs.push(run);
  }
  return { runs, dropped };
}

/** A version as a SKILL.md says it, or a short content hash: one short token, never a path. */
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._+:-]{0,79}$/;

/**
 * The skills in a local-skills report: `{ device?, skills: [{ name, version? }] }`.
 * Only names and versions are read; a version that isn't one is left out.
 */
export function parseLocalSkills(body: unknown): { device: string; skills: LocalSkill[] } | { error: string } {
  const { device, skills } = (body ?? {}) as { device?: unknown; skills?: unknown };
  if (!Array.isArray(skills)) return { error: 'Send { device, skills: [{ name, version }] }' };
  if (skills.length > MAX_LOCAL_SKILLS) return { error: `Send ${MAX_LOCAL_SKILLS} skills at most` };
  const byName = new Map<string, LocalSkill>();
  for (const entry of skills) {
    const { name, version } = (entry ?? {}) as { name?: unknown; version?: unknown };
    if (typeof name !== 'string' || !SKILL_NAME.test(name.trim())) continue;
    const v = typeof version === 'string' && VERSION.test(version.trim()) ? version.trim() : undefined;
    byName.set(name.trim(), { name: name.trim(), ...(v && { version: v }) });
  }
  const label = typeof device === 'string' ? device.replace(/[^\w .()'-]/g, '').trim().slice(0, 80) : '';
  return { device: label || 'computer', skills: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

/** Runs added up per skill, most used first, then most recent. */
export function summarizeRuns(runs: SkillRun[]): SkillUsage[] {
  const bySkill = new Map<string, SkillUsage>();
  for (const run of runs) {
    const usage = bySkill.get(run.skill);
    if (!usage) bySkill.set(run.skill, { skill: run.skill, runs: 1, lastAt: run.at });
    else {
      usage.runs++;
      if (run.at > usage.lastAt) usage.lastAt = run.at;
    }
  }
  return [...bySkill.values()].sort((a, b) => b.runs - a.runs || b.lastAt.localeCompare(a.lastAt) || a.skill.localeCompare(b.skill));
}

export interface AppOpen {
  /** The app's catalog id, e.g. `app/skill-library`. */
  app: string;
  /** ISO 8601, UTC. */
  at: string;
}

export interface AppUsage {
  app: string;
  opens: number;
  lastAt: string;
}

/** An app's catalog id: `app/<slug>`. Never an address or a path. */
const APP_ID = /^app\/[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * An app opened from the app (Home, Explore or Mine): `{ app }`. Only the
 * app's id is read; the time is the server's. Home's Apps column counts them.
 */
export function parseAppOpen(body: unknown, now = Date.now()): AppOpen | { error: string } {
  const app = (body as { app?: unknown })?.app;
  if (typeof app !== 'string' || !APP_ID.test(app)) return { error: 'Send { app }: an app\'s catalog id, e.g. app/skill-library' };
  return { app, at: new Date(now).toISOString() };
}

/** `days` from a query string: 1 to RUN_MAX_AGE_DAYS, 90 without one. */
export function daysParam(value: string | null): number {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.min(RUN_MAX_AGE_DAYS, Math.floor(days)) : 90;
}

export const sinceDays = (days: number, now = Date.now()) => new Date(now - days * DAY_MS).toISOString();
