/**
 * Registered productions: projects/<slug>/mediamake.json (mediamake.production/v2). Skills write it
 * at intake, so what a production is — its channel, artist and song, the skills that worked on it,
 * where its finals are delivered, whether it's uploaded — is written down instead of guessed from
 * folder names. v1 files (what the skill library's "Link skills" button wrote) are read as they are.
 *
 * Skill runs come from the Claude Code hook (tools/skill-runs.mjs → <root>/.catalog/runs.jsonl);
 * `touch` ties a skill's latest run to the production it is working on.
 */
import fs from 'node:fs';
import path from 'node:path';
import { n } from './db.ts';
import type { Lib } from './lib.ts';
import { now, readJson, writeJson } from './sys.ts';

export const PRODUCTION_SCHEMA = 'mediamake.production/v2';
export type Status = 'active' | 'delivered' | 'uploaded';
export type Production = {
  schema: string;
  slug: string;
  title?: string;
  channel?: string;
  artist?: string;
  /** the song's folder in the library, e.g. music/inverteddevils/cadence */
  song?: string;
  skills?: string[];
  status?: Status;
  /** where finals go, relative to deliverRoot (default <channel folder>/<slug>) */
  deliverFolder?: string;
  /** the library item whose picture stands for it (set from the Library page) */
  thumbnailItem?: string;
  [key: string]: unknown;
};

const fileOf = (lib: Lib, slug: string) => path.join(lib.projects, slug, 'mediamake.json');

export const readProduction = (lib: Lib, slug: string): Production => {
  const m = readJson<Production>(fileOf(lib, slug));
  const info = readJson<{ title?: string; artist?: string }>(path.join(lib.projects, slug, 'input', 'project.json'));
  return { ...m, schema: PRODUCTION_SCHEMA, slug, title: m?.title ?? info?.title ?? slug, artist: m?.artist ?? info?.artist };
};

const syncRow = (lib: Lib, p: Production) =>
  lib.db
    .prepare(
      `INSERT INTO productions (slug, title, channel, artist, song, status, path, deliver_folder, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET title = excluded.title, channel = excluded.channel, artist = excluded.artist, song = excluded.song,
         status = excluded.status, path = excluded.path, deliver_folder = excluded.deliver_folder, updated_at = excluded.updated_at`,
    )
    .run(p.slug, n(p.title), n(p.channel), n(p.artist), n(p.song), p.status ?? 'active', path.join(lib.projects, p.slug), n(p.deliverFolder), now());

/** The catalog's row for a production, from its file (after `media sync pull` wrote one). */
export const indexProduction = (lib: Lib, slug: string) => syncRow(lib, readProduction(lib, slug));

export const saveProduction = (lib: Lib, slug: string, patch: Partial<Production>) => {
  const file = fileOf(lib, slug);
  const cur = readJson<Production>(file) ?? ({} as Production);
  const skills = [...new Set([...(cur.skills ?? []), ...(patch.skills ?? [])])];
  const next: Production = { ...cur, ...patch, schema: PRODUCTION_SCHEMA, slug, skills, status: patch.status ?? cur.status ?? 'active' };
  if (patch.channel && !(patch.channel in lib.cfg.channels))
    throw new Error(`Unknown channel "${patch.channel}". Known: ${Object.keys(lib.cfg.channels).join(', ') || 'none yet'} (add it to ~/.mediamake/config.json)`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeJson(file, next);
  syncRow(lib, readProduction(lib, slug));
  return next;
};

/** Skill runs logged by the hook, into the catalog (each once). */
export const importRuns = (lib: Lib) => {
  const file = path.join(lib.catalog, 'runs.jsonl');
  if (!fs.existsSync(file)) return 0;
  const st = lib.db.prepare('INSERT OR IGNORE INTO runs (skill, session, at, cwd) VALUES (?, ?, ?, ?)');
  let count = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as { skill?: string; session?: string; at?: string; cwd?: string };
      if (r.skill && r.at) count += Number(st.run(r.skill, n(r.session), r.at, n(r.cwd)).changes);
    } catch {
      // a half-written last line; the next import reads it
    }
  }
  return count;
};

/** The newest run of a skill not yet tied to a production (in the last 12 hours) now belongs to this one. */
export const linkRun = (lib: Lib, slug: string, skill: string) => {
  importRuns(lib);
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  return Number(
    lib.db
      .prepare('UPDATE runs SET production = ? WHERE rowid = (SELECT rowid FROM runs WHERE skill = ? AND production IS NULL AND at > ? ORDER BY at DESC LIMIT 1)')
      .run(slug, skill, since).changes,
  );
};

export const touchProduction = (lib: Lib, slug: string, skill?: string) => {
  const p = saveProduction(lib, slug, skill ? { skills: [skill] } : {});
  if (skill) linkRun(lib, slug, skill);
  return p;
};

export const listProductions = (lib: Lib) =>
  fs.existsSync(lib.projects)
    ? fs
        .readdirSync(lib.projects)
        .filter(s => !s.startsWith('.') && !s.startsWith('_') && fs.statSync(path.join(lib.projects, s)).isDirectory())
        .map(s => ({ ...readProduction(lib, s), registered: fs.existsSync(fileOf(lib, s)) }))
    : [];
