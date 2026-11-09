#!/usr/bin/env node
/**
 * mm: MediaMake's command. Runs the studio's scripts (apps/studio/package.json) from any folder:
 * `mm render <slug>` is `npm run render-project -w studio -- <slug>`.
 *
 *   mm help                 every command
 *   mm <command> [args…]    a studio script; paths you type are relative to the folder you are in
 *   mm where                the studio folder (apps/studio in this checkout)
 *   mm workspace            where your work is: projects, renders, brand kits, notes… (scripts/workspace.ts)
 *   mm link [--dir=<bin>]   puts `mm` on your PATH (in npm's global bin folder), once per machine
 *
 * Without the link, run it from the repo as `npm run mm -- <command> [args…]`.
 * Your work out of the checkout, into ~/MediaMake (and, after the rename, out of apps/lyrics_videos):
 * `mm migrate` (a dry run), then `mm migrate --yes`.
 *
 * Before a command it builds the studio's generated files when they are missing or their sources
 * changed (the mediamake presets, scripts/generated.mjs): git ignores them, so a pull never conflicts.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOT_WORK, STUDIO_FOLDERS, withWork, workspaceSetting } from '../../../tools/workspace.mjs';
import { ensurePresets } from '../scripts/generated.mjs';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(APP, '..', '..');
const SELF = path.join(APP, 'bin', 'mm.mjs');
const WIN = process.platform === 'win32';
const NPM = WIN ? 'npm.cmd' : 'npm';
const pkg = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};

/** Short names for the scripts whose npm names are long; every other script is its own name. */
const ALIASES = { render: 'render-project', prepare: 'prepare-project' };
const toScript = cmd => ALIASES[cmd] ?? cmd;
const toCommand = script => Object.entries(ALIASES).find(([, s]) => s === script)?.[0] ?? script;

/** One line each for the commands people use most; `mm help` lists the rest by name. */
const ABOUT = {
  analyze: 'stems, beat grid and aligned words of a project → analysis/',
  transcribe: "a song's timed words with ElevenLabs Scribe (free first run: the price)",
  prepare: 'input/ (+ analysis/) → manifest.json',
  preview: 'Remotion Studio (mm preview <slug> opens one project, fastest)',
  stills: 'one frame per section, or the seconds you list',
  render: 'a render into out/<slug>/ (--preview: 10 s for review; --look=A,B; --frames=a-b)',
  benchmark: 'finds the fastest render concurrency for this machine (or one project)',
  'render-queue': 'renders waiting for the one render slot, across sessions',
  bundle: "a project's kept bundle, made or reused (mm render does it itself)",
  preflight: 'machine checks of a render before the user reviews it',
  media: 'the shared media library (mm media help)',
  golden: 'fixed frames of the fixtures compared with another commit',
  migrate: 'moves your projects, renders and brand kits into your workspace, ~/MediaMake (dry run; --yes to move)',
  workspace: 'where your work is on this machine: projects, renders, brand kits, notes…',
  engine: 'the engine by name (@mediamake/engine): its version, your pins; codemod gives old imports its names',
  notes: "your lessons for each skill, outside the repo (mm notes help)",
};

const help = () => {
  // npm's own hooks (postinstall, pre<script>) aren't commands
  const hook = n => /^(pre|post)/.test(n) && (n.replace(/^(pre|post)/, '') in scripts || ['install', 'uninstall', 'pack', 'publish'].includes(n.replace(/^(pre|post)/, '')));
  const names = Object.keys(scripts).filter(n => !hook(n)).map(toCommand).sort();
  const width = Math.max(...names.map(n => n.length));
  console.log('mm: MediaMake studio commands (apps/studio). mm <command> [args…]\n');
  for (const n of names) console.log(`  ${n.padEnd(width)}  ${ABOUT[n] ?? ''}`.trimEnd());
  console.log(`\n  ${'where'.padEnd(width)}  the studio folder`);
  console.log(`  ${'link'.padEnd(width)}  put mm on your PATH (once per machine)`);
};

/** Writes a small launcher for this checkout's mm into npm's global bin folder (or --dir). */
const link = args => {
  const dirFlag = args.find(a => a.startsWith('--dir='))?.slice('--dir='.length);
  let dir = dirFlag;
  if (!dir) {
    const r = spawnSync(NPM, ['prefix', '-g'], { encoding: 'utf8', shell: WIN });
    if (r.status !== 0) throw new Error(`npm prefix -g failed: ${r.stderr}`);
    const prefix = r.stdout.trim();
    dir = WIN ? prefix : path.join(prefix, 'bin');
  }
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, WIN ? 'mm.cmd' : 'mm');
  const MARK = "MediaMake's mm";
  if (fs.existsSync(target) && !fs.readFileSync(target, 'utf8').includes(MARK)) {
    throw new Error(`${target} is another program called mm. Pass --dir=<a folder on your PATH> to put MediaMake's there.`);
  }
  const body = WIN
    ? `@echo off\r\nrem ${MARK} (written by mm link)\r\nnode "${SELF}" %*\r\n`
    : `#!/bin/sh\n# ${MARK} (written by mm link): ${REPO}\nexec node "${SELF}" "$@"\n`;
  fs.writeFileSync(target, body, { mode: 0o755 });
  const onPath = (process.env.PATH ?? '').split(path.delimiter).some(p => path.resolve(p) === path.resolve(dir));
  console.log(`✔ ${target} → ${SELF}`);
  if (!onPath) console.log(`  ${dir} is not on your PATH yet: add it, or run mm as \`npm run mm -- <command>\` from the repo.`);
};

/** A day: how often the hint to move your work out of the checkout comes back. */
const HINT_EVERY = 24 * 3600 * 1000;
const HINT_FILE = path.join(os.homedir(), '.mediamake', '.migrate-hint');

/**
 * Work in a folder the workspace replaced: say how to move it. Every time while nothing sees it (it is
 * in apps/lyrics_videos, or in apps/studio while the workspace is elsewhere); once a day while it is
 * in apps/studio with no workspace set yet.
 */
const remindMigrate = cmd => {
  if (cmd === 'migrate' || cmd === 'workspace') return;
  if (withWork(path.join(REPO, 'apps', 'lyrics_videos'), ['projects', 'out', 'brands']).length) {
    console.error('⚠ Your projects, renders or brand kits are still in apps/lyrics_videos, which is now apps/studio.');
    console.error('  Move them: mm migrate (shows what moves), then mm migrate --yes.\n');
    return;
  }
  const found = withWork(APP, STUDIO_FOLDERS, NOT_WORK);
  if (!found.length) return;
  const set = workspaceSetting();
  const list = found.map(d => `${d}/`).join(', ');
  if (set && path.resolve(set.root) !== APP) {
    console.error(`⚠ apps/studio still has ${list}, but your workspace is ${set.root}, so nothing sees them there.`);
    console.error('  Move them: mm migrate (shows what moves), then mm migrate --yes.\n');
    return;
  }
  if (set) return;
  try {
    if (Date.now() - fs.statSync(HINT_FILE).mtimeMs < HINT_EVERY) return;
  } catch {}
  console.error(`ℹ Your work (${list}) is inside the checkout, in apps/studio. mm migrate moves it to ~/MediaMake, out of git's way (it lists what would move first).\n`);
  try {
    fs.mkdirSync(path.dirname(HINT_FILE), { recursive: true });
    fs.writeFileSync(HINT_FILE, `${new Date().toISOString()}\n`);
  } catch {}
};

const main = () => {
  const [cmd, ...rest] = process.argv.slice(2);
  if (process.env.npm_package_name === 'lyrics_videos') {
    console.error(`ℹ lyrics_videos is now studio. Next time: mm ${toCommand(toScript(cmd ?? ''))} …`);
  }
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
  if (cmd === 'where') return console.log(APP);
  if (cmd === 'link') return link(rest);
  const script = toScript(cmd);
  if (!scripts[script]) {
    console.error(`mm: no command "${cmd}". mm help lists them.`);
    process.exit(1);
  }
  remindMigrate(cmd);
  // built, not committed: a pull or an edit in apps/mediamake leaves them stale (a no-op when current)
  if (script !== 'sync-presets') ensurePresets(APP, { soft: true });
  // --prefix finds the repo from any folder. npm sets INIT_CWD to the folder it starts in, and the
  // scripts resolve the paths you type against it: start npm where you are (INIT_CWD when mm itself
  // was run by npm: `npm run mm`, or an old `-w lyrics_videos` command)
  const r = spawnSync(NPM, ['--prefix', REPO, 'run', '--silent', script, '-w', pkg.name, '--', ...rest], {
    cwd: process.env.INIT_CWD ?? process.cwd(),
    stdio: 'inherit',
    shell: WIN,
  });
  if (r.error) throw r.error;
  process.exit(r.status ?? 1);
};

try {
  main();
} catch (err) {
  console.error(`mm: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
