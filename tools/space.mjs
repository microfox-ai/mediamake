#!/usr/bin/env node
/**
 * space: your own skills, MCPs and apps in a private git repo of yours, the same on every computer.
 *
 *   mm space                     where the space is, what changed here and on GitHub, every item
 *   mm space connect <owner/repo>   clone your private repo into the workspace and link its skills
 *            connect --create [name]   make the private repo first (needs gh; the name is mediamake-space without one)
 *   mm space pull                bring what your other computers pushed, then link new skills
 *   mm space push [-m "<what>"]  what would go up (a dry run); --yes commits and pushes it
 *   mm space add <skill>         move one of your workspace skills into the space (a dry run; --yes)
 *   mm space new <skill|mcp|app> <name>   start an item in the space
 *   mm space report [--dry]      tell MediaMake what this computer has (Mine shows it); --dry only shows it
 *   mm space disconnect          unlink the space from this computer (a dry run; --yes). The folder stays
 *   mm space forget              delete what MediaMake holds of your space (the repo is untouched)
 *
 * Where things are:
 *   <workspace>/space/                 the clone (the workspace is usually ~/MediaMake: mm workspace)
 *     skills/<name>/SKILL.md           a skill, with anything it needs beside it
 *     mcps/<name>/  apps/<name>/       an MCP or an app: its code, and an item.json
 *     <kind>/<name>/item.json          optional: { "title", "summary", "version", "media": ["<library id>"] }
 *   <workspace>/skills/<name>          a link to space/skills/<name>, so everything that reads your own
 *                                      skills (fork, publish, media sync) sees it
 *   ~/.claude/skills/<name>            the link Claude loads it through, like a variant's
 *
 * Git does the moving, with the sign-in this computer already has (gh, SSH or a credential helper).
 * MediaMake never gets the repo's contents or a GitHub token. A space is private: connect refuses a
 * public repo.
 *
 * Large media stays out of git. push refuses a file over 10 MB, or a video, audio or layered image
 * over 2 MB: put it in the media library (mm media ingest), name it under "media" in the item's
 * item.json, and it travels with the library (mm media share, mm media sync). push also stops on
 * anything that looks like a key or a token (--force sends it anyway).
 *
 * What MediaMake is told (connect, pull, push, add and report, when this computer is signed in and
 * usage reports are on: mm usage): the repo's name, this computer's random label, the commit, and
 * each item's kind, name, version, title and one-line summary. Never a file. mm space report --dry
 * shows it exactly.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter, lineProblems, linkOwn, ownSkillsDir, TEXT_FILE, userSkillsDir, workspaceRoot } from './skills.mjs';
import { apiKey, call, configFile, deviceLabel, site, skillVersion, usageSetting } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);

/** The item kinds and the folder each lives in. */
export const KINDS = { skill: 'skills', mcp: 'mcps', app: 'apps' };
const KIND_TITLE = { skill: 'Skills', mcp: 'MCPs', app: 'Apps' };
export const ITEM_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** No file over this goes into git. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Media over this goes through the media library. */
export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
const MEDIA_FILE = /\.(mp4|mov|mkv|webm|avi|m4v|mp3|wav|flac|aiff?|m4a|ogg|psd|psb|aep|prproj|blend|exr|tiff?|zip|tgz|gz|7z|rar|dmg)$/i;
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const SUMMARY_MAX = 200;

const tilde = p => (p === os.homedir() || p.startsWith(os.homedir() + path.sep) ? `~${p.slice(os.homedir().length)}` : p);
const real = p => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const inside = (dir, p) => p === dir || p.startsWith(dir + path.sep);
const lstat = p => fs.lstatSync(p, { throwIfNoEntry: false });
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const humanize = name => name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

const readJson = file => {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

/** The clone: <workspace>/space. */
export const spaceDir = () => path.join(workspaceRoot(), 'space');

/** The space this computer is connected to (`space` in ~/.mediamake/config.json), or null. */
export function spaceSetting(env = process.env) {
  const space = readJson(configFile(env)).space;
  return space && typeof space.repo === 'string' && space.repo ? space : null;
}
const saveSpaceSetting = (space, env = process.env) => {
  const file = configFile(env);
  const config = readJson(file);
  if (space) config.space = space;
  else delete config.space;
  writeJson(file, config);
};

/* ---------- git ---------- */

const git = (cwd, args, more = {}) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...more });
  return { ok: r.status === 0, out: (r.stdout ?? '').replace(/\n+$/, ''), err: (r.stderr ?? '').trim() };
};
const must = (cwd, args, more) => {
  const r = git(cwd, args, more);
  if (!r.ok) throw new Error(`git ${args[0]} failed: ${r.err || r.out || 'no message'}`);
  return r.out;
};
/** A name for commits on a computer whose git has none set: its random label, never a real name. */
const identity = (cwd, env = process.env) => {
  if (git(cwd, ['config', 'user.email']).out && git(cwd, ['config', 'user.name']).out) return [];
  const device = deviceLabel(env);
  return ['-c', `user.name=${device}`, '-c', `user.email=${device}@space.mediamake.invalid`];
};
const hasGh = () => spawnSync('gh', ['--version'], { stdio: 'ignore' }).status === 0;

/**
 * A repo as typed: `owner/name` (GitHub), a GitHub address, or any git remote. `repo` is its name
 * for people (owner/name), never an address with a sign-in in it.
 */
export function parseRepo(arg, { ssh = false } = {}) {
  const value = String(arg ?? '').trim();
  if (!value) return null;
  const hub = value.match(/^(?:https?:\/\/(?:www\.)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
  const short = !hub && !fs.existsSync(value) ? value.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/) : null;
  const m = hub ?? short;
  if (m) {
    const repo = `${m[1]}/${m[2]}`;
    const typedSsh = /^(git@|ssh:)/.test(value);
    return { repo, github: true, url: ssh || typedSsh ? `git@github.com:${repo}.git` : `https://github.com/${repo}.git` };
  }
  const parts = value.replace(/\.git\/?$/, '').replace(/^[a-z+]+:\/\/[^/]*\//i, '').split(/[\\/:]/).filter(Boolean);
  return { repo: parts.slice(-2).join('/') || 'space', github: false, url: fs.existsSync(value) ? path.resolve(value) : value };
}

/** Whether a GitHub repo is private: true, false, or null when nothing here can tell. */
async function isPrivate(repo) {
  if (hasGh()) {
    const r = spawnSync('gh', ['repo', 'view', repo, '--json', 'isPrivate', '-q', '.isPrivate'], { encoding: 'utf8' });
    if (r.status === 0) return r.stdout.trim() === 'true';
  }
  try {
    // asked without a sign-in: only a public repo answers
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'mediamake-space' }, signal: AbortSignal.timeout(6000) });
    if (res.status === 200) return (await res.json()).private === true;
    if (res.status === 404) return true;
  } catch {
    // offline
  }
  return null;
}

/** Where the clone stands against GitHub. */
export function gitState(dir) {
  const branch = git(dir, ['symbolic-ref', '--short', '-q', 'HEAD']).out || 'main';
  const hasHead = git(dir, ['rev-parse', '--verify', '-q', 'HEAD']).ok;
  const upstream = git(dir, ['rev-parse', '--verify', '-q', `refs/remotes/origin/${branch}`]).ok;
  let ahead = 0;
  let behind = 0;
  if (hasHead && upstream) [behind, ahead] = must(dir, ['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`]).split(/\s+/).map(Number);
  else if (hasHead) ahead = Number(must(dir, ['rev-list', '--count', 'HEAD']));
  else if (upstream) behind = Number(must(dir, ['rev-list', '--count', `origin/${branch}`]));
  const dirty = !!git(dir, ['status', '--porcelain', '-uall']).out;
  return {
    branch,
    hasHead,
    upstream,
    ahead,
    behind,
    dirty,
    commit: hasHead ? must(dir, ['rev-parse', '--short=12', 'HEAD']) : undefined,
    commitAt: hasHead ? must(dir, ['log', '-1', '--format=%cI']) : undefined,
  };
}

/**
 * What a push would send: every file that differs from GitHub's branch, committed here or not,
 * as { path, change: 'new' | 'changed' | 'deleted' }. Worked out in a scratch index, so nothing here moves.
 */
export function outgoing(dir, state = gitState(dir)) {
  const gitDir = path.resolve(dir, must(dir, ['rev-parse', '--git-dir']));
  const index = path.join(gitDir, `space-index-${process.pid}`);
  try {
    if (fs.existsSync(path.join(gitDir, 'index'))) fs.copyFileSync(path.join(gitDir, 'index'), index);
    const env = { ...process.env, GIT_INDEX_FILE: index };
    must(dir, ['add', '-A'], { env });
    const base = state.upstream ? `origin/${state.branch}` : EMPTY_TREE;
    const tokens = must(dir, ['diff', '--cached', '--name-status', '--no-renames', '-z', base], { env }).split('\0').filter(Boolean);
    const files = [];
    for (let i = 0; i + 1 < tokens.length; i += 2) files.push({ path: tokens[i + 1], change: tokens[i] === 'A' ? 'new' : tokens[i] === 'D' ? 'deleted' : 'changed' });
    return files;
  } finally {
    fs.rmSync(index, { force: true });
  }
}

/** What must not go up: large files and media (always), keys and tokens (unless forced). */
export function pushProblems(dir, files) {
  const large = [];
  const secrets = [];
  for (const file of files) {
    if (file.change === 'deleted') continue;
    const abs = path.join(dir, file.path);
    const st = fs.statSync(abs, { throwIfNoEntry: false });
    if (!st?.isFile()) continue;
    const mb = `${(st.size / 1048576).toFixed(1)} MB`;
    if (st.size > MAX_FILE_BYTES) large.push(`${file.path} is ${mb}: over 10 MB`);
    else if (MEDIA_FILE.test(file.path) && st.size > MAX_MEDIA_BYTES) large.push(`${file.path} is ${mb} of media: over 2 MB`);
    if (/^\.env(\..+)?$/.test(path.basename(file.path)) && !/\.(example|sample|template)$/.test(file.path)) secrets.push(`${file.path} is an env file`);
    else if (st.size <= 2 * 1024 * 1024 && TEXT_FILE.test(file.path)) {
      fs.readFileSync(abs, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (lineProblems(line).some(p => p.includes('key or token'))) secrets.push(`${file.path}:${i + 1} looks like an API key or token`);
        });
    }
  }
  return { large, secrets };
}

/* ---------- items ---------- */

/** One item as its folder describes it. */
function itemAt(dir, kind, name) {
  const rel = `${KINDS[kind]}/${name}`;
  const at = path.join(dir, KINDS[kind], name);
  const meta = readJson(path.join(at, 'item.json'));
  const text = (value, max) => (typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim().slice(0, max) : undefined);
  const skillFile = path.join(at, 'SKILL.md');
  const front = kind === 'skill' && fs.existsSync(skillFile) ? frontmatter(skillFile) : null;
  const pkg = kind === 'skill' ? {} : { ...readJson(path.join(at, 'manifest.json')), ...readJson(path.join(at, 'package.json')) };
  const tree = git(dir, ['rev-parse', '--verify', '-q', `HEAD:${rel}`]).out;
  const stated = text(meta.version, 80) ?? text(pkg.version, 80);
  const version = (stated && /^[A-Za-z0-9][A-Za-z0-9._+:-]{0,79}$/.test(stated) ? stated : undefined) ?? (front ? skillVersion(skillFile) : tree ? `tree:${tree.slice(0, 12)}` : 'new');
  const summary = text(meta.summary, SUMMARY_MAX) ?? text(front?.description, SUMMARY_MAX) ?? text(pkg.description, SUMMARY_MAX);
  return {
    kind,
    name,
    path: rel,
    version,
    title: text(meta.title, 120) ?? text(pkg.display_name, 120) ?? humanize(name),
    ...(summary && { summary }),
    media: Array.isArray(meta.media) ? meta.media.filter(m => typeof m === 'string' && m.trim()).map(m => m.trim()) : [],
    changed: !!git(dir, ['status', '--porcelain', '-uall', '--', rel]).out,
  };
}

/** Every item in the space: a skill is a folder with a SKILL.md, an MCP or an app any folder with something in it. */
export function spaceItems(dir = spaceDir()) {
  const items = [];
  for (const [kind, folder] of Object.entries(KINDS)) {
    let names = [];
    try {
      names = fs
        .readdirSync(path.join(dir, folder), { withFileTypes: true })
        .filter(e => e.isDirectory() && ITEM_NAME.test(e.name))
        .map(e => e.name)
        .sort();
    } catch {
      continue;
    }
    for (const name of names) {
      const at = path.join(dir, folder, name);
      if (kind === 'skill' ? !fs.existsSync(path.join(at, 'SKILL.md')) : !fs.readdirSync(at).some(n => !n.startsWith('.'))) continue;
      items.push(itemAt(dir, kind, name));
    }
  }
  return items;
}

/**
 * Links the space's skills the way your variants are linked: <workspace>/skills/<name> → the space's
 * folder, and ~/.claude/skills/<name> → that. Links of skills that left the space are removed.
 * Returns the names linked and what needs a look.
 */
export function linkSkills(dir = spaceDir()) {
  const own = ownSkillsDir();
  const from = real(path.join(dir, 'skills'));
  const notes = [];
  const linked = [];
  fs.mkdirSync(own, { recursive: true });
  const dropUserLink = name => {
    const link = path.join(userSkillsDir(), name);
    if (lstat(link)?.isSymbolicLink() && path.resolve(userSkillsDir(), fs.readlinkSync(link)) === path.join(own, name)) fs.unlinkSync(link);
  };
  const intoSpace = link => inside(from, real(path.resolve(own, fs.readlinkSync(link)))) || inside(path.join(path.resolve(dir), 'skills'), path.resolve(own, fs.readlinkSync(link)));

  for (const name of fs.readdirSync(own)) {
    const link = path.join(own, name);
    if (!lstat(link)?.isSymbolicLink() || !intoSpace(link) || fs.existsSync(path.join(link, 'SKILL.md'))) continue;
    dropUserLink(name);
    fs.unlinkSync(link);
    notes.push(`${name} is no longer in the space: unlinked`);
  }
  for (const item of spaceItems(dir).filter(i => i.kind === 'skill')) {
    const link = path.join(own, item.name);
    const target = path.join(dir, 'skills', item.name);
    const st = lstat(link);
    if (st && !st.isSymbolicLink()) {
      notes.push(`${item.name}: ${tilde(link)} is a folder of its own, so Claude loads that one, not the space's. Keep one of the two.`);
      continue;
    }
    if (st && real(link) !== real(target)) {
      if (fs.existsSync(link) && !intoSpace(link)) {
        notes.push(`${item.name}: ${tilde(link)} links somewhere else, so the space's copy isn't loaded.`);
        continue;
      }
      fs.unlinkSync(link);
    }
    if (!lstat(link)) fs.symlinkSync(target, link, 'dir');
    try {
      linkOwn(item.name);
      linked.push(item.name);
    } catch (error) {
      notes.push(`${item.name}: ${error.message}`);
    }
  }
  return { linked, notes };
}

/** Removes every link into the space (for disconnect). Returns the names. */
function unlinkSkills(dir, dry) {
  const own = ownSkillsDir();
  const from = real(path.join(dir, 'skills'));
  const names = [];
  for (const name of fs.existsSync(own) ? fs.readdirSync(own) : []) {
    const link = path.join(own, name);
    if (!lstat(link)?.isSymbolicLink()) continue;
    const target = path.resolve(own, fs.readlinkSync(link));
    if (!inside(from, real(target)) && !inside(path.join(path.resolve(dir), 'skills'), target)) continue;
    names.push(name);
    if (dry) continue;
    const user = path.join(userSkillsDir(), name);
    if (lstat(user)?.isSymbolicLink() && path.resolve(userSkillsDir(), fs.readlinkSync(user)) === link) fs.unlinkSync(user);
    fs.unlinkSync(link);
  }
  return names;
}

/* ---------- what MediaMake is told ---------- */

/** The report: the repo's name, this computer's label, the commit, and each item's name, version, title and summary. */
export function spaceReport(dir = spaceDir(), env = process.env) {
  const setting = spaceSetting(env);
  const state = gitState(dir);
  return {
    device: deviceLabel(env),
    repo: setting?.repo ?? 'space',
    branch: state.branch,
    ...(state.commit && { commit: state.commit, commitAt: state.commitAt }),
    pushed: state.upstream && state.ahead === 0 && !state.dirty,
    items: spaceItems(dir).map(item => ({
      kind: item.kind,
      name: item.name,
      version: item.version,
      title: item.title,
      ...(item.summary && { summary: item.summary }),
      ...(item.changed && { changed: true }),
      ...(item.media.length && { media: item.media.length }),
    })),
  };
}

/** Sends the report when this computer is signed in and reports are on. Never fails the command it follows. */
async function sendReport(dir, env = process.env, { loud = false } = {}) {
  const url = site(env);
  if (!usageSetting(env).on) return say(loud, 'Not reported to MediaMake: usage reports are off (mm usage on), so Mine keeps what it last had.');
  const signedIn = apiKey(url, env);
  if (!signedIn) return say(loud, `Not reported to MediaMake: this computer isn't signed in to ${url} (mm media cloud login, or MEDIAMAKE_API_KEY). Mine shows the space once it is.`);
  try {
    const report = spaceReport(dir, env);
    await call('PUT', `${url}/api/space`, signedIn.key, report);
    console.log(`Mine is up to date: ${url}/app/mine#space (${plural(report.items.length, 'item')} as ${report.device}).`);
    return true;
  } catch (error) {
    return say(true, `Could not tell MediaMake (${error instanceof Error ? error.message : error}). mm space report tries again.`);
  }
}
const say = (loud, message) => {
  if (loud) console.log(message);
  return false;
};

/* ---------- commands ---------- */

const README = repo => `# ${repo.split('/').pop()}

My MediaMake space: my own skills, MCPs and apps, the same on every computer.

- \`skills/<name>/SKILL.md\`: a skill, with anything it needs beside it
- \`mcps/<name>/\`, \`apps/<name>/\`: an MCP or an app, with an \`item.json\` (\`title\`, \`summary\`, \`version\`, \`media\`)

\`mm space pull\` brings what another computer pushed, \`mm space push\` sends what changed here.
Large media stays out of git: it goes through the media library, and an item names what it needs
under \`media\` in its \`item.json\`.
`;
const GITIGNORE = `.DS_Store
node_modules/
dist/
.env
.env.*
!.env.example
*.log
`;

/** The connected clone, or an error that says how to connect. */
const connected = env => {
  const setting = spaceSetting(env);
  const dir = spaceDir();
  if (!setting || !fs.existsSync(path.join(dir, '.git'))) throw new Error('No space on this computer yet. mm space connect <owner/repo> (or connect --create to make the private repo).');
  return { setting, dir };
};

async function connect(args, flags, env) {
  const dir = spaceDir();
  const ssh = flags.includes('--ssh');
  let target = parseRepo(args[0], { ssh });
  const existing = spaceSetting(env);

  if (flags.includes('--create')) {
    if (!hasGh()) throw new Error('connect --create needs the GitHub CLI (gh), signed in. Or make a private repo on github.com and run mm space connect <owner/repo>.');
    const name = args[0] ?? 'mediamake-space';
    const made = spawnSync('gh', ['repo', 'create', name, '--private', '--description', 'My MediaMake space: my own skills, MCPs and apps'], { encoding: 'utf8' });
    if (made.status !== 0) throw new Error(`gh repo create failed: ${(made.stderr || made.stdout).trim()}`);
    const full = spawnSync('gh', ['repo', 'view', name, '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { encoding: 'utf8' }).stdout.trim();
    target = parseRepo(full || name, { ssh });
    console.log(`✔ made the private repo ${target.repo}`);
  }
  if (!target) throw new Error('Which repo? mm space connect <owner/repo>, or mm space connect --create to make a private one.');

  if (target.github) {
    const priv = await isPrivate(target.repo);
    if (priv === false) throw new Error(`${target.repo} is public. A space is private: make the repo private on GitHub (Settings, Danger Zone), or connect another.`);
    if (priv === null) console.log(`⚠ Could not check that ${target.repo} is private (offline, or no gh). Make sure it is.`);
  }

  if (fs.existsSync(path.join(dir, '.git'))) {
    const origin = git(dir, ['remote', 'get-url', 'origin']).out;
    if (parseRepo(origin)?.repo !== target.repo) {
      throw new Error(`${tilde(dir)} is already the space ${existing?.repo ?? origin}. mm space disconnect --yes, move that folder away, then connect again.`);
    }
    console.log(`${tilde(dir)} is already a clone of ${target.repo}.`);
  } else {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new Error(`${tilde(dir)} exists and isn't a clone. Move it away, then connect again.`);
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    const viaGh = target.github && !ssh && hasGh();
    const r = viaGh ? spawnSync('gh', ['repo', 'clone', target.repo, dir], { stdio: 'inherit' }) : spawnSync('git', ['clone', target.url, dir], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`Could not clone ${target.repo}. Check that it exists and that this computer is signed in to GitHub (gh auth login, or an SSH key with --ssh).`);
  }

  if (!git(dir, ['rev-parse', '--verify', '-q', 'HEAD']).ok) {
    // a new repo: give it the layout, and send that so the other computers start from the same place
    for (const folder of Object.values(KINDS)) {
      fs.mkdirSync(path.join(dir, folder), { recursive: true });
      fs.writeFileSync(path.join(dir, folder, '.gitkeep'), '');
    }
    fs.writeFileSync(path.join(dir, 'README.md'), README(target.repo));
    fs.writeFileSync(path.join(dir, '.gitignore'), GITIGNORE);
    must(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
    must(dir, ['add', '-A']);
    must(dir, [...identity(dir, env), 'commit', '-q', '-m', 'Start the space: skills, mcps, apps']);
    const pushed = git(dir, ['push', '-q', '-u', 'origin', 'main']);
    console.log(pushed.ok ? '✔ started the space: skills/, mcps/, apps/' : `⚠ the layout is made here but could not be pushed (${pushed.err}). mm space push --yes tries again.`);
  } else {
    for (const folder of Object.values(KINDS)) fs.mkdirSync(path.join(dir, folder), { recursive: true });
  }

  saveSpaceSetting({ repo: target.repo, url: git(dir, ['remote', 'get-url', 'origin']).out || target.url, connectedAt: existing?.repo === target.repo ? existing.connectedAt : new Date().toISOString() }, env);
  console.log(`✔ ${target.repo} → ${tilde(dir)}`);
  afterChange(dir);
  await sendReport(dir, env, { loud: true });
  return 0;
}

/** Links the skills and says what was linked or needs a look. */
function afterChange(dir) {
  const { linked, notes } = linkSkills(dir);
  if (linked.length) console.log(`✔ ${plural(linked.length, 'skill')} linked into Claude (${tilde(userSkillsDir())}): ${linked.join(', ')}`);
  for (const note of notes) console.log(`⚠ ${note}`);
  const mcps = spaceItems(dir).filter(i => i.kind !== 'skill');
  if (mcps.length) console.log(`  ${plural(mcps.length, 'MCP or app', 'MCPs and apps')} in ${tilde(dir)}: ${mcps.map(i => i.path).join(', ')} (each one's README says how to run it).`);
}

/** Keeps what changed here as a commit on this computer, so a pull can never lose it. */
function commitLocal(dir, env, message) {
  if (!git(dir, ['status', '--porcelain', '-uall']).out) return false;
  must(dir, ['add', '-A']);
  must(dir, [...identity(dir, env), 'commit', '-q', '-m', message]);
  return true;
}

/** Puts this computer's commits on top of GitHub's. On a conflict nothing changes here, and the error names the files. */
function rebase(dir, env, branch) {
  const r = git(dir, [...identity(dir, env), 'rebase', `origin/${branch}`]);
  if (r.ok) return;
  const files = git(dir, ['diff', '--name-only', '--diff-filter=U']).out.split('\n').filter(Boolean);
  git(dir, ['rebase', '--abort']);
  throw new Error(
    `This computer and another one changed the same ${files.length === 1 ? 'file' : 'files'}${files.length ? `: ${files.join(', ')}` : ''}.\n` +
      `Nothing was changed here. Ask Claude to merge them in ${tilde(dir)} (git pull --rebase, keep what you want of each, git rebase --continue), then mm space push --yes.`,
  );
}

const fetchOrigin = dir => {
  const r = git(dir, ['fetch', '-q', '--prune', 'origin']);
  if (!r.ok) throw new Error(`Could not reach the space's repo: ${r.err}`);
};

async function pull(_args, _flags, env) {
  const { dir } = connected(env);
  fetchOrigin(dir);
  let state = gitState(dir);
  if (!state.upstream) console.log('Nothing is on GitHub yet: mm space push --yes sends what is here.');
  else if (!state.behind) console.log('✔ already has everything on GitHub');
  else {
    const before = state.commit;
    if (commitLocal(dir, env, `Changes on ${deviceLabel(env)}`)) state = gitState(dir);
    if (state.hasHead) rebase(dir, env, state.branch);
    else must(dir, ['reset', '-q', '--hard', `origin/${state.branch}`]);
    const changed = before ? git(dir, ['diff', '--name-only', before, `origin/${state.branch}`]).out.split('\n').filter(Boolean) : [];
    const touched = [...new Set(changed.map(f => f.split('/').slice(0, 2).join('/')))];
    console.log(`✔ pulled ${plural(state.behind, 'change')} from GitHub${touched.length ? `: ${touched.join(', ')}` : ''}`);
    if (gitState(dir).ahead) console.log('  What changed here is kept on top: mm space push shows it.');
  }
  afterChange(dir);
  await sendReport(dir, env);
  return 0;
}

async function push(args, flags, env) {
  const { setting, dir } = connected(env);
  const yes = flags.includes('--yes');
  const reached = git(dir, ['fetch', '-q', '--prune', 'origin']);
  if (!reached.ok && yes) throw new Error(`Could not reach the space's repo: ${reached.err}`);
  let state = gitState(dir);
  const files = outgoing(dir, state);
  if (!files.length && !state.behind) {
    console.log('✔ nothing to push: GitHub has everything that is here');
    return 0;
  }

  const byItem = new Map();
  for (const file of files) {
    const parts = file.path.split('/');
    const key = parts.length > 2 && Object.values(KINDS).includes(parts[0]) ? parts.slice(0, 2).join('/') : '(the space itself)';
    byItem.set(key, [...(byItem.get(key) ?? []), file]);
  }
  console.log(`${yes ? 'Pushing' : 'Would push'} to ${setting.repo}:`);
  for (const [item, list] of byItem) {
    const count = change => list.filter(f => f.change === change).length;
    const parts = [count('new') && `${count('new')} new`, count('changed') && `${count('changed')} changed`, count('deleted') && `${count('deleted')} deleted`].filter(Boolean);
    console.log(`  ${item}  ${parts.join(', ')}`);
    if (flags.includes('--files')) for (const f of list) console.log(`      ${f.change.padEnd(7)} ${f.path}`);
  }
  if (state.behind) console.log(`  GitHub has ${plural(state.behind, 'change')} this computer doesn't: they are pulled first.`);

  const { large, secrets } = pushProblems(dir, files);
  for (const p of large) console.log(`✖ ${p}`);
  for (const p of secrets) console.log(`${flags.includes('--force') ? '⚠' : '✖'} ${p}`);
  if (large.length) {
    console.log('  Large media stays out of git. Put it in the media library (mm media ingest <file>), name it under "media" in the item\'s item.json,');
    console.log('  remove it from the space (or add it to .gitignore), and share it with mm media share / mm media sync.');
  }
  if (secrets.length && !flags.includes('--force')) console.log('  Take the key out (name an env var instead), or mm space push --yes --force if it is not a key.');
  const blocked = large.length > 0 || (secrets.length > 0 && !flags.includes('--force'));
  if (!yes) {
    console.log(blocked ? '\nA dry run. Fix the ✖ lines first.' : '\nA dry run, nothing left this computer. mm space push --yes sends it (--files lists every file).');
    return blocked ? 1 : 0;
  }
  if (blocked) return 1;

  const flagMessage = flags.find(f => f.startsWith('--message='))?.slice('--message='.length);
  const dashM = process.argv.indexOf('-m');
  const items = [...byItem.keys()].filter(k => !k.startsWith('('));
  const message = flagMessage || (dashM > 0 && process.argv[dashM + 1]) || `Update ${items.length ? items.slice(0, 6).join(', ') + (items.length > 6 ? ` and ${items.length - 6} more` : '') : 'the space'} (${deviceLabel(env)})`;

  commitLocal(dir, env, message);
  state = gitState(dir);
  if (state.upstream && state.behind) rebase(dir, env, state.branch);
  if (state.upstream) {
    // everything this computer has that GitHub doesn't goes up as one commit
    must(dir, ['reset', '-q', '--soft', `origin/${state.branch}`]);
    if (git(dir, ['diff', '--cached', '--quiet']).ok) {
      console.log('✔ nothing to push after pulling: GitHub already has it');
      afterChange(dir);
      await sendReport(dir, env);
      return 0;
    }
    must(dir, [...identity(dir, env), 'commit', '-q', '-m', message]);
  }
  const sent = git(dir, ['push', '-q', '-u', 'origin', state.branch]);
  if (!sent.ok) throw new Error(`The push was refused: ${sent.err}\nNothing is lost: it is committed here. mm space push --yes tries again.`);
  console.log(`✔ pushed to ${setting.repo}: ${message}`);
  console.log('  On your other computers: mm space pull');
  afterChange(dir);
  await sendReport(dir, env);
  return 0;
}

async function status(_args, flags, env) {
  const setting = spaceSetting(env);
  const dir = spaceDir();
  if (!setting || !fs.existsSync(path.join(dir, '.git'))) {
    if (flags.includes('--json')) console.log(JSON.stringify({ connected: false, dir }, null, 2));
    else {
      console.log('No space on this computer yet.');
      console.log('A space is a private GitHub repo of yours for your own skills, MCPs and apps, the same on every computer.');
      console.log('  mm space connect --create        make the private repo (needs gh) and connect it');
      console.log('  mm space connect <owner/repo>    connect one you have');
    }
    return 0;
  }
  const reached = flags.includes('--offline') ? { ok: true } : git(dir, ['fetch', '-q', '--prune', 'origin']);
  const state = gitState(dir);
  const items = spaceItems(dir);
  const files = outgoing(dir, state);
  const own = ownSkillsDir();
  const loaded = name => real(path.join(userSkillsDir(), name)) === real(path.join(dir, 'skills', name)) && real(path.join(own, name)) === real(path.join(dir, 'skills', name));
  if (flags.includes('--json')) {
    console.log(JSON.stringify({ connected: true, repo: setting.repo, dir, ...state, reached: reached.ok, toPush: files.length, items: items.map(i => ({ ...i, ...(i.kind === 'skill' && { linked: loaded(i.name) }) })) }, null, 2));
    return 0;
  }
  console.log(`Space: ${setting.repo} → ${tilde(dir)} (${state.branch}${state.commit ? ` @ ${state.commit}` : ''})`);
  if (!reached.ok) console.log('  GitHub: could not be reached, so this is as of the last pull');
  else console.log(`  GitHub: ${state.behind ? `${plural(state.behind, 'change')} this computer doesn't have (mm space pull)` : 'nothing new'}`);
  console.log(`  Here:   ${files.length ? `${plural(files.length, 'file')} not on GitHub yet (mm space push)` : 'nothing to push'}`);
  for (const kind of Object.keys(KINDS)) {
    const list = items.filter(i => i.kind === kind);
    console.log(`\n${KIND_TITLE[kind]} (${list.length})`);
    const width = Math.max(0, ...list.map(i => i.name.length));
    for (const item of list) {
      const marks = [kind === 'skill' && (loaded(item.name) ? 'linked' : 'not linked'), item.changed && 'changed here', item.media.length && `needs ${plural(item.media.length, 'media file')}`].filter(Boolean);
      console.log(`  ${item.name.padEnd(width)}  ${item.version.padEnd(16)}  ${marks.join(', ')}`);
    }
    if (!list.length) console.log(`  none (mm space new ${kind} <name>${kind === 'skill' ? ', or mm space add <one of your skills>' : ''})`);
  }
  const media = items.filter(i => i.media.length);
  if (media.length) {
    console.log('\nMedia the items need (from the media library, never git: mm media find "<name>", mm media sync pull):');
    for (const item of media) console.log(`  ${item.path}: ${item.media.join(', ')}`);
  }
  if (items.some(i => i.kind === 'skill' && !loaded(i.name))) console.log('\nSome skills are not linked into Claude: mm space pull links them.');
  return 0;
}

async function add(args, flags, env) {
  const { dir } = connected(env);
  const [name] = args;
  if (!name) throw new Error('Which skill? mm space add <name> (one of yours in the workspace: node tools/skills.mjs list).');
  const from = path.join(ownSkillsDir(), name);
  const to = path.join(dir, 'skills', name);
  const st = lstat(from);
  if (!ITEM_NAME.test(name) || !st) throw new Error(`No skill "${name}" in ${tilde(ownSkillsDir())}.`);
  if (st.isSymbolicLink()) throw new Error(real(from) === real(to) ? `${name} is already in the space.` : `${tilde(from)} is a link, not a skill folder.`);
  if (!fs.existsSync(path.join(from, 'SKILL.md'))) throw new Error(`${tilde(from)} has no SKILL.md.`);
  if (fs.existsSync(to)) throw new Error(`The space already has a skill called ${name}.`);
  if (!flags.includes('--yes')) {
    console.log(`Would move ${tilde(from)} → ${tilde(to)} and leave a link in its place, so Claude keeps loading it.`);
    console.log(`A dry run. mm space add ${name} --yes moves it; mm space push --yes then sends it to your other computers.`);
    return 0;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch {
    fs.cpSync(from, to, { recursive: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
  console.log(`✔ ${name} is in the space: ${tilde(to)}`);
  afterChange(dir);
  console.log('  mm space push shows what would go to GitHub.');
  await sendReport(dir, env);
  return 0;
}

async function create(args, _flags, env) {
  const { dir } = connected(env);
  const [kind, name] = args;
  if (!KINDS[kind] || !name) throw new Error('mm space new <skill|mcp|app> <name>');
  if (!ITEM_NAME.test(name)) throw new Error(`"${name}" isn't a name: lower-case words joined by hyphens, like make-my-intro.`);
  const at = path.join(dir, KINDS[kind], name);
  if (fs.existsSync(at)) throw new Error(`${KINDS[kind]}/${name} already exists.`);
  if (kind === 'skill' && lstat(path.join(ownSkillsDir(), name))) throw new Error(`You already have a skill called ${name} in ${tilde(ownSkillsDir())}: mm space add ${name} moves it into the space.`);
  fs.mkdirSync(at, { recursive: true });
  if (kind === 'skill') {
    fs.writeFileSync(path.join(at, 'SKILL.md'), `---\nname: ${name}\ndescription: <What it does, and when Claude should use it: "Use when the user says …">\nmetadata:\n  version: 0.1.0\n---\n\n# ${humanize(name)}\n\n<The steps.>\n`);
  } else {
    writeJson(path.join(at, 'item.json'), { title: humanize(name), summary: `<What this ${kind === 'mcp' ? 'MCP' : 'app'} does, in one line>`, version: '0.1.0', media: [] });
    fs.writeFileSync(path.join(at, 'README.md'), `# ${humanize(name)}\n\n<What it is, and how to run or install it on a new computer.>\n`);
  }
  console.log(`✔ ${tilde(at)}`);
  afterChange(dir);
  await sendReport(dir, env);
  return 0;
}

async function report(_args, flags, env) {
  const { dir } = connected(env);
  if (flags.includes('--dry')) {
    console.log(JSON.stringify(spaceReport(dir, env), null, 2));
    console.log(`\nThis is everything that would be sent to ${site(env)}. Nothing was sent.`);
    return 0;
  }
  return (await sendReport(dir, env, { loud: true })) ? 0 : 1;
}

async function disconnect(_args, flags, env) {
  const { setting, dir } = connected(env);
  const yes = flags.includes('--yes');
  const state = gitState(dir);
  const unsent = outgoing(dir, state).length;
  const names = unlinkSkills(dir, !yes);
  console.log(`${yes ? 'Disconnected' : 'Would disconnect'} ${setting.repo} from this computer:`);
  console.log(`  ${plural(names.length, 'skill')} ${yes ? 'unlinked' : 'would be unlinked'} from Claude${names.length ? `: ${names.join(', ')}` : ''}`);
  console.log(`  ${tilde(dir)} stays as it is${unsent ? `, with ${plural(unsent, 'file')} that never went to GitHub` : ''}. The repo on GitHub is untouched.`);
  if (!yes) {
    console.log('A dry run. mm space disconnect --yes does it.');
    return 0;
  }
  saveSpaceSetting(null, env);
  const url = site(env);
  const signedIn = usageSetting(env).on ? apiKey(url, env) : null;
  if (signedIn) {
    try {
      await call('DELETE', `${url}/api/space?device=${encodeURIComponent(deviceLabel(env))}`, signedIn.key);
    } catch {
      // Mine keeps this computer's last report until it is forgotten
    }
  }
  return 0;
}

async function forget(_args, _flags, env) {
  const url = site(env);
  const signedIn = apiKey(url, env);
  if (!signedIn) throw new Error(`Not signed in to ${url}: run mm media cloud login, or set MEDIAMAKE_API_KEY.`);
  const res = await call('DELETE', `${url}/api/space`, signedIn.key);
  console.log(`Deleted what ${url} held of your space (${plural(res?.forgotten?.items ?? 0, 'item')}). Your repo and this computer's folder are untouched.`);
  return 0;
}

const help = () => console.log(fs.readFileSync(SELF, 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '').trim());

async function main(argv) {
  const flags = argv.filter(a => a.startsWith('-'));
  const dashM = argv.indexOf('-m');
  const args = argv.filter((a, i) => !a.startsWith('-') && !(dashM >= 0 && i === dashM + 1));
  const [cmd = 'status', ...rest] = args;
  const commands = { status, connect, pull, push, add, new: create, report, disconnect, forget };
  if (cmd === 'help' || flags.includes('--help') || flags.includes('-h')) return help(), 0;
  if (!commands[cmd]) {
    console.error(`mm space: no command "${cmd}".\n`);
    help();
    return 1;
  }
  if (spawnSync('git', ['--version'], { stdio: 'ignore' }).status !== 0) throw new Error('git is not installed: a space needs it (mm doctor).');
  return commands[cmd](rest, flags, process.env);
}

if (process.argv[1] && real(path.resolve(process.argv[1])) === real(SELF)) {
  main(process.argv.slice(2)).then(
    code => process.exit(code ?? 0),
    error => {
      console.error(`✖ ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    },
  );
}
