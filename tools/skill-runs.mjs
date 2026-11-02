#!/usr/bin/env node
/**
 * skill-runs: a Claude Code PostToolUse hook (matcher "Skill") that records every skill run in the
 * media library, so the Library page can show which skill made what.
 *
 * It appends one line to <library.root>/.catalog/runs.jsonl, the root coming from the `library` key
 * of ~/.mediamake/config.json (MEDIAMAKE_CONFIG points at another file):
 *   { "schema": "mediamake.skill-run/v1", "skill", "args", "session", "at", "cwd", "skillHash" }
 * skillHash is the sha256 of the skill's folder (every file, by path), so a run says which version
 * of the skill it used; it is null for a skill with no folder here (a plugin's). The media CLI reads
 * the file into its catalog and the Library export.
 *
 * It never gets in the way: no config, no library folder or input it can't read, and it does
 * nothing. It prints nothing and always exits 0.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCHEMA = 'mediamake.skill-run/v1';
/** Long args are cut, so a line stays one small append. */
const MAX_ARGS = 2000;
/** A bigger folder is hashed by its SKILL.md alone. */
const MAX_FILES = 400;
const MAX_BYTES = 16 * 1024 * 1024;

const expandHome = p => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

/** The library root, or null when this machine has no library set up. */
const libraryRoot = () => {
  const file = process.env.MEDIAMAKE_CONFIG ?? path.join(os.homedir(), '.mediamake', 'config.json');
  if (!fs.existsSync(file)) return null;
  const library = JSON.parse(fs.readFileSync(file, 'utf8'))?.library;
  if (!library || typeof library !== 'object') return null;
  // the same default as the media CLI's config.ts
  const root = typeof library.root === 'string' && library.root.trim() ? library.root.trim() : '~/Downloads/_LIBRARY';
  return path.resolve(expandHome(root));
};

/** The skill's folder: the project's .claude/skills (links to .agents/skills), then ~/.claude/skills. */
const skillDir = (name, cwd) => {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) return null; // plugin:skill and odd names have no folder here
  const roots = [process.env.CLAUDE_PROJECT_DIR, cwd, os.homedir()].filter(Boolean);
  return roots.map(r => path.join(r, '.claude', 'skills', name)).find(d => fs.existsSync(path.join(d, 'SKILL.md'))) ?? null;
};

const SKIP = new Set(['.DS_Store', '.git', 'node_modules', '__pycache__']);

const filesIn = dir => {
  const out = [];
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name) || out.length > MAX_FILES) continue;
      const abs = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      const st = e.isSymbolicLink() ? fs.statSync(abs, { throwIfNoEntry: false }) : e;
      if (!st) continue;
      if (st.isDirectory()) walk(abs, r);
      else if (st.isFile()) out.push([r, abs]);
    }
  };
  walk(dir, '');
  return out.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
};

const hashOf = dir => {
  const h = crypto.createHash('sha256');
  let files = filesIn(dir);
  const bytes = files.reduce((n, [, abs]) => n + fs.statSync(abs).size, 0);
  if (files.length > MAX_FILES || bytes > MAX_BYTES) files = [['SKILL.md', path.join(dir, 'SKILL.md')]];
  for (const [rel, abs] of files) h.update(`${rel}\0`).update(fs.readFileSync(abs)).update('\0');
  return h.digest('hex');
};

const main = () => {
  if (process.stdin.isTTY) return; // run by hand without hook input
  const root = libraryRoot();
  if (!root || !fs.existsSync(root)) return;
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const t = input.tool_input ?? {};
  const skill = typeof t.skill === 'string' ? t.skill.trim().replace(/^\//, '') : '';
  if (!skill) return;
  const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd();
  const args = typeof t.args === 'string' ? t.args : t.args == null ? '' : JSON.stringify(t.args);
  let skillHash = null;
  try {
    const dir = skillDir(skill, cwd);
    if (dir) skillHash = hashOf(dir);
  } catch {
    // unreadable skill folder: the run is still worth recording
  }
  const run = {
    schema: SCHEMA,
    skill,
    args: args.length > MAX_ARGS ? `${args.slice(0, MAX_ARGS)}…` : args,
    session: typeof input.session_id === 'string' ? input.session_id : null,
    at: new Date().toISOString(),
    cwd,
    skillHash,
  };
  const catalog = path.join(root, '.catalog');
  fs.mkdirSync(catalog, { recursive: true });
  fs.appendFileSync(path.join(catalog, 'runs.jsonl'), `${JSON.stringify(run)}\n`);
};

try {
  main();
} catch {
  // a hook that fails must not fail the tool call
}
process.exit(0);
