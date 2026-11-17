#!/usr/bin/env node
/**
 * cloud: MediaMake in a Claude Code cloud session (claude.ai/code, a project thread, a routine), so a
 * project that needs nothing from your computer (pure code, or files it fetches itself) is built and
 * rendered there from start to end. Renders run in the session's own machine: never on Lambda.
 *
 *   mm cloud                 set this cloud session up (safe to run again): the workspace (~/MediaMake),
 *                            the dependencies (npm ci, @microfox/remotion), the render browser, and your
 *                            spaces: every space repo the environment cloned next to this checkout is
 *                            connected and its skills linked. Then it says what is missing.
 *   mm cloud status          what is set up, changing nothing
 *   mm cloud deliver <slug> [--to=<folder>] [--no-project]
 *                            copies the project's renders (out/<slug>/*.mp4, its preview, its stills) and
 *                            its code (no analysis, derived media or file over 2 MB) to where you can get
 *                            them: --to, else the project's shared files (/mnt/project-files/renders/<slug>)
 *   --hook                   the session-start check (.claude/settings.json): quiet, quick, nothing outside
 *                            a cloud session; it does everything but the long installs
 *   --force                  run outside a cloud session too (a Linux box, a VPS)
 *
 * Your space in a cloud session: add your space's repo (<you>/mediamake-space, and a project's
 * <owner>/mediamake-<project>) to the cloud environment's repositories, so it is cloned beside this
 * checkout. mm cloud links it into the workspace (<workspace>/space, spaces/<name>, linked/<name>) and its
 * skills into Claude. Skills linked during a session load in the next one; until then read their SKILL.md
 * (mm cloud prints where). What you change there goes back with mm space sync --yes, like on a computer.
 *
 * The browser: Chrome Headless Shell from the session's Playwright (/opt/pw-browsers), through a small
 * wrapper (~/.mediamake/cloud-browser.sh) that sends Chrome through the session's proxy (Remotion starts
 * Chrome with --proxy-server=direct://, which the sandbox can't reach the web through: fonts, footage
 * URLs). `browser` in ~/.mediamake/config.json names it; mm passes it on as MM_BROWSER.
 *
 * What a cloud session can't do yet: Browse Hack, Midjourney, anything signed in on your computer, and
 * media that lives only in your library there. Shared asset storage for those is for later.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkSkills, parseRepo } from './space.mjs';
import { ownSkillsDir, userSkillsDir } from './skills.mjs';
import { configFile } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);
const TOP = path.resolve(path.dirname(SELF), '..');
const STUDIO = path.join(TOP, 'apps', 'studio');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
export const DEFAULT_WORKSPACE = path.join(os.homedir(), 'MediaMake');
export const SHARED_FILES = '/mnt/project-files';
const PW = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
/** Big or rebuildable: never delivered with a project's code. */
const HEAVY_DIRS = new Set(['analysis', 'derived', 'node_modules', 'footage', '.cache']);
const MAX_CODE_FILE = 2 * 1024 * 1024;

const tilde = p => (p.startsWith(os.homedir() + path.sep) ? `~${p.slice(os.homedir().length)}` : p);
const readJson = file => {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const lstat = p => fs.lstatSync(p, { throwIfNoEntry: false });
const git = (cwd, args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim() };
};

/** A Claude Code cloud session (or --force). */
export const isCloud = (env = process.env) => env.CLAUDE_CODE_REMOTE === 'true';

/** The workspace: the one set (env, config), else ~/MediaMake. */
export const workspaceOf = (env = process.env) => {
  if (env.MEDIAMAKE_WORKSPACE?.trim()) return path.resolve(env.MEDIAMAKE_WORKSPACE.trim().replace(/^~(?=\/|$)/, os.homedir()));
  const set = readJson(configFile(env)).workspace;
  return typeof set === 'string' && set.trim() ? path.resolve(set.trim().replace(/^~(?=\/|$)/, os.homedir())) : null;
};

/* ---------- the browser ---------- */

/** Chrome Headless Shell from the machine's Playwright, or null. */
export function headlessShell(root = PW) {
  let dirs = [];
  try {
    dirs = fs.readdirSync(root).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse();
  } catch {
    return null;
  }
  for (const d of dirs) {
    for (const sub of ['chrome-linux', 'chrome-headless-shell-linux64', 'chrome-linux64']) {
      const bin = path.join(root, d, sub, 'chrome-headless-shell');
      if (fs.existsSync(bin)) return bin;
    }
  }
  return null;
}

/** The wrapper: drops Remotion's proxy flags and sends Chrome through the session's proxy (TLS stays verified). */
export const browserWrapper = bin => `#!/usr/bin/env bash
# Written by mm cloud (tools/cloud.mjs): the render browser of a cloud session.
args=()
for a in "$@"; do
  case "$a" in --no-proxy-server|--proxy-server=*|--proxy-bypass-list=*) ;; *) args+=("$a") ;; esac
done
proxy="\${HTTPS_PROXY:-\${https_proxy:-}}"
if [ -n "$proxy" ]; then args+=("--proxy-server=$proxy"); fi
exec "${bin}" "\${args[@]}"
`;

const browserFile = (env = process.env) => path.join(path.dirname(configFile(env)), 'cloud-browser.sh');

/* ---------- spaces cloned beside the checkout ---------- */

/**
 * The space repos the environment cloned beside this checkout: <owner>/mediamake-space (yours),
 * <owner>/mediamake-<kind>-<name> (a linked item) and any other <owner>/mediamake-<name> with a
 * skills/, mcps/ or apps/ folder (a project's). Where each goes in the workspace.
 */
export function clonedSpaces(top = TOP, workspace) {
  const parent = path.dirname(top);
  const found = [];
  let names = [];
  try {
    names = fs.readdirSync(parent);
  } catch {
    return found;
  }
  for (const name of names.sort()) {
    const dir = path.join(parent, name);
    if (path.resolve(dir) === path.resolve(top) || !fs.existsSync(path.join(dir, '.git'))) continue;
    const repo = parseRepo(git(dir, ['remote', 'get-url', 'origin']).out)?.repo;
    const base = repo?.split('/')[1] ?? '';
    if (!/^mediamake-[a-z0-9-]+$/.test(base) || base === 'mediamake-store') continue;
    if (!['skills', 'mcps', 'apps'].some(k => fs.existsSync(path.join(dir, k)))) continue;
    const item = base.match(/^mediamake-(skill|mcp|app)-([a-z0-9-]+)$/);
    const kind = base === 'mediamake-space' ? 'mine' : item ? 'linked' : 'project';
    const slug = kind === 'mine' ? null : item ? item[2] : base.slice('mediamake-'.length);
    const at = kind === 'mine' ? path.join(workspace, 'space') : path.join(workspace, kind === 'linked' ? 'linked' : 'spaces', slug);
    found.push({ dir, repo, kind, at, url: git(dir, ['remote', 'get-url', 'origin']).out });
  }
  return found;
}

/** Links one cloned space into the workspace (a link to the clone) and its skills into Claude. */
function connectClone(space, env, notes) {
  const st = lstat(space.at);
  if (st?.isSymbolicLink() && fs.realpathSync(space.at) !== fs.realpathSync(space.dir)) {
    notes.push(`${tilde(space.at)} links to another folder: left as it is (${space.repo} is in ${tilde(space.dir)})`);
    return null;
  }
  if (st && !st.isSymbolicLink()) {
    notes.push(`${tilde(space.at)} is a folder of its own: left as it is (${space.repo} is in ${tilde(space.dir)})`);
    return null;
  }
  if (!st) {
    fs.mkdirSync(path.dirname(space.at), { recursive: true });
    fs.symlinkSync(space.dir, space.at, 'dir');
  }
  if (space.kind === 'mine') {
    const file = configFile(env);
    const config = readJson(file);
    if (config.space?.repo !== space.repo) {
      config.space = { repo: space.repo, url: space.url, connectedAt: new Date().toISOString() };
      writeJson(file, config);
    }
  }
  const { linked, notes: more } = linkSkills(space.at);
  notes.push(...more.map(n => `${space.repo}: ${n}`));
  return linked;
}

/* ---------- setup ---------- */

/**
 * Sets the session up. `install`: run the long installs (npm ci, the remotion build); the hook doesn't.
 * Returns { lines, missing } to print.
 */
export function setup({ env = process.env, top = TOP, install = true, log = () => {} } = {}) {
  const lines = [];
  const missing = [];

  // the workspace
  const file = configFile(env);
  let workspace = workspaceOf(env);
  if (!workspace) {
    workspace = DEFAULT_WORKSPACE;
    const config = readJson(file);
    config.workspace = '~/MediaMake';
    writeJson(file, config);
  }
  for (const d of ['projects', 'out', 'brands', 'thumbnails/jobs', 'overlays', 'notes', 'skills', 'extensions']) fs.mkdirSync(path.join(workspace, d), { recursive: true });
  lines.push(`✔ workspace: ${tilde(workspace)}`);

  // the dependencies
  const studio = path.join(top, 'apps', 'studio');
  if (!fs.existsSync(path.join(top, 'node_modules', 'remotion'))) {
    if (install) {
      log('… npm ci (a few minutes, once per session)');
      const r = spawnSync(NPM, ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: top, stdio: 'inherit' });
      if (r.status === 0) lines.push('✔ dependencies installed (npm ci)');
      else missing.push('npm ci failed: run it in the repo and read its error');
    } else missing.push('dependencies: not installed yet (mm cloud runs npm ci)');
  }
  const remotionDist = path.join(top, 'packages', 'remotion', 'dist');
  if (fs.existsSync(path.join(top, 'node_modules', 'remotion')) && !fs.existsSync(remotionDist)) {
    if (install) {
      log('… building @microfox/remotion');
      const r = spawnSync(NPM, ['run', 'build', '-w', '@microfox/remotion'], { cwd: top, stdio: ['ignore', 'ignore', 'inherit'] });
      if (r.status === 0) lines.push('✔ @microfox/remotion built');
      else missing.push('npm run build -w @microfox/remotion failed');
    } else missing.push('@microfox/remotion: not built yet (mm cloud builds it)');
  }
  if (fs.existsSync(path.join(top, 'node_modules')) && fs.existsSync(studio)) {
    // the workspace's node_modules link and tsconfig (workspace-setup.ts), as mm migrate makes them
    const r = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--no-warnings=ExperimentalWarning',
        '--input-type=module',
        '-e',
        `const m = await import(${JSON.stringify(path.join(studio, 'scripts', 'workspace-setup.ts'))}); m.setupWorkspace(${JSON.stringify(workspace)}, ${JSON.stringify(studio)}, true);`,
      ],
      { encoding: 'utf8' },
    );
    if (r.status !== 0) missing.push(`the workspace's node_modules link and tsconfig: ${(r.stderr || '').trim().split('\n')[0]}`);
  }
  if (fs.existsSync(path.join(top, 'node_modules')) && install) {
    // mm on the PATH (npm's global bin), so every command after this is `mm …`
    spawnSync(process.execPath, [path.join(studio, 'bin', 'mm.mjs'), 'link'], { cwd: top, stdio: 'ignore' });
  }

  // the browser
  const bin = headlessShell();
  if (bin) {
    const wrapper = browserFile(env);
    const body = browserWrapper(bin);
    if (!fs.existsSync(wrapper) || fs.readFileSync(wrapper, 'utf8') !== body) {
      fs.mkdirSync(path.dirname(wrapper), { recursive: true });
      fs.writeFileSync(wrapper, body, { mode: 0o755 });
    }
    const config = readJson(file);
    if (config.browser !== wrapper) {
      config.browser = wrapper;
      writeJson(file, config);
    }
    lines.push(`✔ render browser: ${path.basename(path.dirname(path.dirname(bin)))} through the session's proxy`);
  } else missing.push(`render browser: no Chrome Headless Shell in ${PW}; Remotion downloads its own on the first render (it may be blocked here)`);

  // the spaces
  const spaces = clonedSpaces(top, workspace);
  const notes = [];
  const skills = [];
  for (const s of spaces) {
    const linked = connectClone(s, env, notes);
    if (linked) {
      skills.push(...linked);
      lines.push(`✔ ${s.kind === 'mine' ? 'your space' : s.kind === 'linked' ? 'linked item' : 'project space'} ${s.repo} → ${tilde(s.at)}${linked.length ? ` (${linked.join(', ')})` : ''}`);
    }
  }
  if (!spaces.some(s => s.kind === 'mine'))
    missing.push("your space: no <you>/mediamake-space beside this checkout. Add it to this cloud environment's repositories (and a project's mediamake-<project>) so its skills are here");
  if (skills.length)
    lines.push(`  Skills linked during a session load in the next one. Until then read them where they are: ${tilde(ownSkillsDir())}/<name>/SKILL.md (also linked from ${tilde(userSkillsDir())})`);
  for (const n of notes) lines.push(`⚠ ${n}`);

  // keys a skill may need (named, never shown)
  const keys = ['ELEVENLABS_API_KEY', 'MEDIAMAKE_API_KEY'].filter(k => !env[k]);
  if (keys.length) lines.push(`ℹ not set in this environment: ${keys.join(', ')} (only skills that transcribe or talk to MediaMake need them; add them as the environment's secrets)`);
  return { lines, missing, workspace };
}

/* ---------- deliver ---------- */

const MEDIA = /\.(mp4|mov|webm|png|jpe?g|gif|wav|mp3|m4a|json|md|srt|vtt)$/i;

/** What deliver copies for <slug>: [{ from, to }] (relative `to`). */
export function deliverables(slug, { workspace, project = true }) {
  const out = path.join(workspace, 'out', slug);
  const list = [];
  const files = (dir, prefix) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) if (e.isFile() && MEDIA.test(e.name) && !e.name.startsWith('.')) list.push({ from: path.join(dir, e.name), to: path.join(prefix, e.name) });
  };
  files(out, 'renders');
  files(path.join(out, 'preview'), path.join('renders', 'preview'));
  files(path.join(out, 'stills'), path.join('renders', 'stills'));
  if (project) {
    const root = path.join(workspace, 'projects', slug);
    const walk = (dir, rel) => {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (e.name.startsWith('.') || (rel === '' && HEAVY_DIRS.has(e.name)) || e.name === 'node_modules') continue;
        const abs = path.join(dir, e.name);
        const r = rel ? path.join(rel, e.name) : e.name;
        if (e.isDirectory()) walk(abs, r);
        else if (e.isFile() && fs.statSync(abs).size <= MAX_CODE_FILE) list.push({ from: abs, to: path.join('project', r) });
      }
    };
    walk(root, '');
  }
  return list;
}

function deliver(args, flags, env) {
  const slug = args[0];
  if (!slug || !/^[A-Za-z0-9._-]+$/.test(slug)) throw new Error('Which project? mm cloud deliver <slug> [--to=<folder>]');
  const workspace = workspaceOf(env) ?? DEFAULT_WORKSPACE;
  if (!fs.existsSync(path.join(workspace, 'projects', slug)) && !fs.existsSync(path.join(workspace, 'out', slug)))
    throw new Error(`No project ${slug} in ${tilde(workspace)} (projects/ or out/).`);
  const to = flags.find(f => f.startsWith('--to='))?.slice(5);
  const dest = to ? path.resolve(to.replace(/^~(?=\/|$)/, os.homedir())) : fs.existsSync(SHARED_FILES) ? path.join(SHARED_FILES, 'renders', slug) : null;
  if (!dest) throw new Error(`Where to? This session has no shared files folder (${SHARED_FILES}): pass --to=<a folder you can open>.`);
  const list = deliverables(slug, { workspace, project: !flags.includes('--no-project') });
  if (!list.length) throw new Error(`Nothing to deliver for ${slug} yet: render it first (mm render ${slug} --preview).`);
  for (const f of list) {
    const target = path.join(dest, f.to);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(f.from, target);
  }
  const renders = list.filter(f => f.to.startsWith('renders'));
  console.log(`✔ ${list.length} files of ${slug} → ${dest}`);
  for (const f of renders) console.log(`  ${path.join(dest, f.to)}`);
  const code = list.length - renders.length;
  if (code) console.log(`  and the project's code (${code} files, no analysis or media over 2 MB) in ${path.join(dest, 'project')}: copy it into projects/${slug} on a computer to go on there`);
  return 0;
}

/* ---------- the command ---------- */

function main(argv = process.argv.slice(2), env = process.env) {
  const flags = argv.filter(a => a.startsWith('--'));
  const [cmd = 'setup', ...args] = argv.filter(a => !a.startsWith('--'));
  if (flags.includes('--help') || cmd === 'help') {
    console.log(fs.readFileSync(SELF, 'utf8').match(/\/\*\*\n([\s\S]*?)\*\//)[1].split('\n').map(l => l.replace(/^ \* ?/, '')).join('\n').trim());
    return 0;
  }
  const hook = flags.includes('--hook');
  if (!isCloud(env) && !flags.includes('--force')) {
    if (hook) return 0;
    console.log('This is not a cloud session: mm cloud sets up a Claude Code cloud session. On your computer, mm doctor checks the setup. (--force runs it anyway.)');
    return cmd === 'status' ? 0 : 1;
  }
  if (cmd === 'deliver') return deliver(args, flags, env);
  if (cmd !== 'setup' && cmd !== 'status') throw new Error(`mm cloud: no command "${cmd}" (mm cloud help)`);
  if (cmd === 'status') {
    const workspace = workspaceOf(env);
    const config = readJson(configFile(env));
    console.log(`workspace: ${workspace ? tilde(workspace) : 'not set (mm cloud sets ~/MediaMake)'}`);
    console.log(`dependencies: ${fs.existsSync(path.join(TOP, 'node_modules', 'remotion')) ? 'installed' : 'not installed'}; @microfox/remotion ${fs.existsSync(path.join(TOP, 'packages', 'remotion', 'dist')) ? 'built' : 'not built'}`);
    console.log(`render browser: ${config.browser && fs.existsSync(config.browser) ? tilde(config.browser) : 'not set'}`);
    const spaces = clonedSpaces(TOP, workspace ?? DEFAULT_WORKSPACE);
    console.log(`spaces beside the checkout: ${spaces.map(s => s.repo).join(', ') || 'none'}`);
    return 0;
  }
  const { lines, missing } = setup({ env, install: !hook, log: m => console.log(m) });
  if (hook) {
    // one line for the session's start: what is ready, and what to run
    const setupLeft = missing.filter(m => !m.startsWith('your space'));
    const space = missing.find(m => m.startsWith('your space'));
    const ready = setupLeft.length
      ? `MediaMake cloud session: run \`mm cloud\` (npm run mm -- cloud) before building or rendering. Missing: ${setupLeft.join('; ')}`
      : 'MediaMake cloud session ready: renders run in this machine (never Lambda); mm cloud deliver <slug> hands the files over.';
    console.log(space ? `${ready} Note: ${space}.` : ready);
    return 0;
  }
  for (const l of lines) console.log(l);
  for (const m of missing) console.log(`✖ ${m}`);
  console.log(
    missing.length
      ? '\nFix what is missing, then run mm cloud again.'
      : '\nReady. Build with the skill, review with mm render <slug> --preview, render the master on sign-off, and hand it over with mm cloud deliver <slug>. Everything renders in this machine, never on Lambda.',
  );
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`mm cloud: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
