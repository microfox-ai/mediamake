#!/usr/bin/env node
/**
 * space: MediaMake Spaces on this computer. A space is your personal one or a project's. What was made
 * for it (skills, MCPs, apps) is in a private git repo, the same on every computer and shared with the
 * people on a project when you say so; its files (brand kit, productions, media) are in MediaMake's
 * storage, moved by the media library (mm media sync) and the MediaMake Spaces MCP.
 *
 *   mm space                       every space on this computer: what changed here and on GitHub, every item
 *   mm space sync                  bring everything down, show what would go up (--yes sends it too), then
 *                                  show each space's files waiting to come down or go up (--no-files skips)
 *   mm space new <skill|mcp|app> <name> [--project=<project>]   start an item (makes your space when you have none)
 *   mm space add <skill>           move one of your workspace skills into your space (a dry run; --yes)
 *   mm space share <item> --project=<project>   move an item into a project's space, so everyone on the
 *                                  project gets it (a dry run; --yes). --copy keeps yours too
 *   mm space link <item> --project=<project> [--project=…] [--to=<email>] [--editor=<email>]
 *                                  keep an item yours and give it to more people (a dry run; --yes): everyone
 *                                  on each linked project, and the members you name. Only you and the editors
 *                                  you name can change it. With only the item, it says where it is linked
 *   mm space unlink <item> --project=<project> | --from=<email>
 *                                  take it away from that project's people, or from one person (a dry run; --yes)
 *   mm space join <project>        set a project up on this computer in one go: signs in when needed, accepts
 *                                  the GitHub invitation, clones the project's space, links its skills, and
 *                                  shows the project's shared media (the project's page has this line to copy)
 *   mm space invite <project>      after you add someone to a project in the app: invites everyone on it to
 *                                  the project's repo on GitHub (and makes the repo when there is none)
 *   mm space ensure                make and connect your own space when this computer has none
 *   mm space connect <owner/repo>  connect a repo you already have as your own space (--create makes one)
 *   mm space pull | push           the two halves of sync (push is a dry run until --yes; -m "<what>")
 *   mm space report [--dry]        tell MediaMake what this computer has (Mine shows it); --dry only shows it
 *   mm space disconnect [--project=<project>]   unlink a space from this computer (a dry run; --yes)
 *   mm space forget                delete what MediaMake holds of your spaces (the repos are untouched)
 *
 * Two kinds of space, each a private GitHub repo laid out as skills/, mcps/, apps/:
 *   yours            <workspace>/space            only you. Made by itself the first time one is needed
 *                                                 (<you>/mediamake-space), with the GitHub CLI (gh).
 *   a project's      <workspace>/spaces/<project> everyone on that MediaMake project. The first share makes
 *                                                 the repo (<you>/mediamake-<project>) and invites the
 *                                                 project's members on GitHub; their next sync accepts the
 *                                                 invitation and clones it. Editors can push, viewers pull.
 *   a linked item    <workspace>/linked/<name>    one item that stays its owner's and is used by the people of
 *                                                 every project it is linked to, and by the members the owner
 *                                                 named. mm space link gives it a small private repo of its own
 *                                                 (<you>/mediamake-<kind>-<name>) and moves it there from your
 *                                                 space: one copy, one history. Those people pull it with their
 *                                                 next sync or join; the owner and named editors can push.
 * <project> is a project's name or id (mm space lists them). The workspace is usually ~/MediaMake.
 *
 *   <kind>/<name>/item.json        optional: { "title", "summary", "version", "media": ["<library id>"] }
 *   <workspace>/skills/<name>      a link to the space's skill, so fork, publish and media sync see it
 *   ~/.claude/skills/<name>        the link Claude loads it through, like a variant's
 *
 * Git does the moving, with the sign-in this computer already has (gh, SSH or a credential helper).
 * MediaMake never gets a repo's contents. It holds a GitHub token only for an owner who clicked Connect GitHub
 * in the app, to make a project's repo and invite its members from there. A space is private: a public repo is refused.
 *
 * Large media stays out of git. push refuses a file over 10 MB, or a video, audio or layered image
 * over 2 MB: put it in the media library (mm media ingest), name it under "media" in the item's
 * item.json, and it travels with the library (mm media share, mm media sync). push also stops on
 * anything that looks like a key or a token (--force sends it anyway).
 *
 * What MediaMake is told (when this computer is signed in and usage reports are on: mm usage): each
 * repo's name, this computer's random label, the commit, and each item's kind, name, version, title
 * and one-line summary; for the app's Code tab, the last 30 commits (short id, time, author's name,
 * subject), the paths of the repo's files and its README.md. Never another file's contents.
 * mm space report --dry shows it exactly. Which repo is a
 * project's space is told whenever you share into it, so its members can find it.
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

/* ---------- a skill's own code ---------- */

/** This checkout (the framework), for telling apart code on GitHub from code only on this computer. */
const TOP = path.resolve(path.dirname(SELF), '..');
const CODE_EXT = '(?:tsx?|jsx?|mjs|cjs|py|json|css|glsl|frag|vert)';
/** A framework file a skill names: apps/<app>/…, packages/<pkg>/…, tools/…, or the studio's own folders. */
const REPO_FILE = new RegExp(`(?<![\\w./@-])((?:apps/[\\w-]+|packages/[\\w-]+|tools)/[\\w.@/-]+?\\.${CODE_EXT}|(?:src|scripts|catalog|logoGraphics|thumbnails|analysis)/[\\w.@/-]+?\\.${CODE_EXT})(?![\\w])`, 'g');
/** A studio code folder a skill names: (apps/studio/)src/<name>, scripts/<name> */
const REPO_DIR = /(?<![\w./@-])((?:apps\/studio\/)?(?:src|scripts)\/[\w-]+)\/?(?![\w./-])/g;
const WS_CODE = /(?<![\w./@-])(extensions\/[\w.@/-]+)/g;

const onGithub = (top, rel) => {
  for (const ref of ['origin/main', 'HEAD']) {
    const r = git(top, ['cat-file', '-e', `${ref}:${rel}`]);
    if (r.ok) return true;
    if (git(top, ['rev-parse', '--verify', '-q', ref]).ok) return false;
  }
  return false;
};

/**
 * Code a skill needs that a space doesn't carry: files and folders of the framework it names that are only
 * on this computer (not on GitHub's main), and your workspace's extensions/. A space carries the skill's
 * whole folder, so the fix is to move that code into the skill (skills/<name>/…) and import it as
 * @mediamake/skills/<name>/… . Returns [{ file, line, ref, why }]; placeholders and files that exist
 * nowhere are left alone.
 */
export function codeOutside(skillDir, { top = TOP, workspace = workspaceRoot() } = {}) {
  const found = new Map();
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (e.isFile() && TEXT_FILE.test(e.name) && fs.statSync(abs).size <= 2 * 1024 * 1024) scan(abs);
    }
  };
  const note = (abs, i, ref, why) => {
    if (!found.has(ref)) found.set(ref, { file: path.relative(skillDir, abs), line: i + 1, ref, why });
  };
  const scan = abs => {
    fs.readFileSync(abs, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(REPO_FILE)) {
        const rel = /^(apps|packages|tools)\//.test(m[1]) ? m[1] : `apps/studio/${m[1]}`;
        if (fs.existsSync(path.join(top, rel)) && !onGithub(top, rel)) note(abs, i, rel, 'only on this computer (not on GitHub)');
      }
      for (const m of line.matchAll(REPO_DIR)) {
        const rel = m[1].startsWith('apps/') ? m[1] : `apps/studio/${m[1]}`;
        const at = path.join(top, rel);
        if (fs.statSync(at, { throwIfNoEntry: false })?.isDirectory() && !onGithub(top, rel)) note(abs, i, `${rel}/`, 'only on this computer (not on GitHub)');
      }
      for (const m of line.matchAll(WS_CODE)) {
        const rel = m[1].replace(/[.,;:)]+$/, '');
        if (fs.existsSync(path.join(workspace, rel))) note(abs, i, rel, "in your workspace's extensions/, which no space carries");
      }
    });
  };
  if (fs.existsSync(skillDir)) walk(skillDir);
  return [...found.values()];
}

/** Says what code a skill needs that won't travel with it, and how to bring it along. */
export function showCodeOutside(name, list) {
  if (!list.length) return;
  console.log(`⚠ ${name} uses code that won't travel with it (other computers and cloud sessions won't have it):`);
  for (const c of list) console.log(`    ${c.ref}  ${c.why} (${c.file}:${c.line})`);
  console.log(`  Move it into the skill (skills/${name}/, e.g. skills/${name}/engine/), import it as @mediamake/skills/${name}/… ,`);
  console.log('  and point the SKILL.md at the new place. A framework change everyone needs goes in a pull request instead.');
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

/* ---------- the spaces on this computer ---------- */

const slugify = name => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'project';

/**
 * Every space connected here: yours first (`id: 'mine'`), then the projects' (`id` is the project's).
 * A project's space is in <workspace>/spaces/<slug>.
 */
export function localSpaces(env = process.env) {
  const config = readJson(configFile(env));
  const list = [];
  const mine = spaceSetting(env);
  if (mine && fs.existsSync(path.join(spaceDir(), '.git'))) list.push({ id: 'mine', label: 'Your space', repo: mine.repo, dir: spaceDir() });
  for (const [id, entry] of Object.entries(config.projectSpaces ?? {})) {
    const dir = path.join(workspaceRoot(), 'spaces', entry.slug);
    if (entry?.repo && fs.existsSync(path.join(dir, '.git'))) list.push({ id, project: { id, name: entry.name }, label: `Project ${entry.name}`, repo: entry.repo, dir });
  }
  for (const [id, entry] of Object.entries(config.linkedItems ?? {})) {
    const dir = linkedDir(entry.slug);
    if (entry?.repo && fs.existsSync(path.join(dir, '.git'))) list.push({ id: `item:${id}`, item: { id, ...entry }, label: linkedLabel(entry), repo: entry.repo, dir });
  }
  return list;
}
/** A linked item's clone: <workspace>/linked/<slug>. */
const linkedDir = slug => path.join(workspaceRoot(), 'linked', slug);
const KIND_WORD = { skill: 'skill', mcp: 'MCP', app: 'app' };
const linkedLabel = entry => `${entry.role === 'owner' ? 'Your' : `${entry.owner ?? 'A member'}'s`} ${KIND_WORD[entry.kind] ?? 'item'} ${entry.name}`;
const saveLinked = (id, entry, env = process.env) => {
  const file = configFile(env);
  const config = readJson(file);
  const all = { ...(config.linkedItems ?? {}) };
  if (entry) all[id] = entry;
  else delete all[id];
  if (Object.keys(all).length) config.linkedItems = all;
  else delete config.linkedItems;
  writeJson(file, config);
};
/** The folder name for a linked item: its name, made unique with a bit of its id when another item took it. */
const linkedSlug = (id, name, env = process.env) => {
  const taken = readJson(configFile(env)).linkedItems ?? {};
  if (taken[id]?.slug) return taken[id].slug;
  return Object.entries(taken).some(([other, entry]) => other !== id && entry.slug === name) || (fs.existsSync(linkedDir(name)) && !Object.values(taken).some(entry => entry.slug === name)) ? `${name}-${id.slice(-6)}` : name;
};
const saveProjectSpace = (id, entry, env = process.env) => {
  const file = configFile(env);
  const config = readJson(file);
  const all = { ...(config.projectSpaces ?? {}) };
  if (entry) all[id] = entry;
  else delete all[id];
  if (Object.keys(all).length) config.projectSpaces = all;
  else delete config.projectSpaces;
  writeJson(file, config);
};
/** The folder name for a project's space: its name, made unique with a bit of its id when another project took it. */
const projectSlug = (project, env = process.env) => {
  const taken = readJson(configFile(env)).projectSpaces ?? {};
  if (taken[project.id]?.slug) return taken[project.id].slug;
  const slug = slugify(project.name);
  return Object.entries(taken).some(([id, entry]) => id !== project.id && entry.slug === slug) ? `${slug}-${project.id.slice(-6)}` : slug;
};

/* ---------- MediaMake and GitHub ---------- */

const signedIn = (env = process.env) => {
  const url = site(env);
  const key = apiKey(url, env);
  return key ? { url, key: key.key } : null;
};

/** The account's spaces as MediaMake has them (its own, and one per project it is on), or null when it can't be asked. */
async function remoteSpaces(env = process.env) {
  const at = signedIn(env);
  if (!at) return null;
  try {
    return await call('GET', `${at.url}/api/space`, at.key);
  } catch {
    return null;
  }
}

const gh = (args, more = {}) => {
  const r = spawnSync('gh', args, { encoding: 'utf8', ...more });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
};
const ghLogin = () => gh(['api', 'user', '-q', '.login']).out || null;
const needGh = what => {
  if (!hasGh()) throw new Error(`${what} needs the GitHub CLI (gh), signed in: https://cli.github.com, then gh auth login. Or make a private repo on github.com and run mm space connect <owner/repo>.`);
  const login = ghLogin();
  if (!login) throw new Error(`${what} needs gh signed in: gh auth login.`);
  return login;
};
/** Makes a private repo unless GitHub already has it. Returns its owner/name and whether it was made now. */
function ghEnsureRepo(repo, description) {
  if (gh(['repo', 'view', repo, '--json', 'name']).ok) return { repo, made: false };
  const made = gh(['repo', 'create', repo, '--private', '--description', description]);
  if (!made.ok) throw new Error(`gh repo create ${repo} failed: ${made.err || made.out}`);
  return { repo, made: true };
}
/** Invites the members who aren't on the repo yet. Returns who was invited and who has no GitHub login linked. */
function inviteMembers(repo, members) {
  const have = new Set(
    [gh(['api', `repos/${repo}/collaborators`, '--paginate', '-q', '.[].login']).out, gh(['api', `repos/${repo}/invitations`, '--paginate', '-q', '.[].invitee.login']).out]
      .join('\n')
      .split('\n')
      .map(l => l.trim().toLowerCase())
      .filter(Boolean),
  );
  have.add(repo.split('/')[0].toLowerCase()); // whoever the repo is under has it already
  const invited = [];
  const failed = [];
  const noGithub = [];
  for (const member of members.filter(m => !m.you)) {
    if (!member.githubLogin) noGithub.push(member.name);
    else if (!have.has(member.githubLogin.toLowerCase())) {
      const r = gh(['api', '-X', 'PUT', `repos/${repo}/collaborators/${member.githubLogin}`, '-f', `permission=${member.role === 'viewer' ? 'pull' : 'push'}`]);
      (r.ok ? invited : failed).push(member.name);
    }
  }
  return { invited, failed, noGithub };
}
/** Accepts the invitations GitHub holds for these repos. Returns the repos accepted. */
function acceptInvites(repos) {
  if (!repos.length || !hasGh()) return [];
  const want = new Set(repos.map(r => r.toLowerCase()));
  const accepted = [];
  for (const line of gh(['api', 'user/repository_invitations', '--paginate', '-q', '.[] | "\\(.id) \\(.repository.full_name)"']).out.split('\n')) {
    const [id, name] = line.trim().split(/\s+/);
    if (id && name && want.has(name.toLowerCase()) && gh(['api', '-X', 'PATCH', `user/repository_invitations/${id}`]).ok) accepted.push(name);
  }
  return accepted;
}

/* ---------- what MediaMake is told ---------- */

/**
 * The report: the repo's name, this computer's label, the commit and its last commits, each item's name,
 * version, title and summary, and for a space (not a linked item) what the app's Code tab shows.
 */
export function spaceReport(space, env = process.env) {
  const state = gitState(space.dir);
  return {
    device: deviceLabel(env),
    repo: space.repo,
    ...(space.project && { project: space.project.id }),
    ...(space.item && { item: space.item.id }),
    branch: state.branch,
    ...(state.commit && { commit: state.commit, commitAt: state.commitAt }),
    pushed: state.upstream && state.ahead === 0 && !state.dirty,
    ...(state.hasHead && { ahead: state.ahead, history: commitsOf(space.dir) }),
    items: spaceItems(space.dir).map(item => ({
      kind: item.kind,
      name: item.name,
      version: item.version,
      title: item.title,
      ...(item.summary && { summary: item.summary }),
      ...(item.changed && { changed: true }),
      ...(item.media.length && { media: item.media.length }),
    })),
    ...(!space.item && { code: spaceCode(space.dir) }),
  };
}

/** How many commits a report names: enough to say how far behind a computer is. */
export const HISTORY = 30;
/** How many file paths a report names at most. */
export const MAX_REPORT_FILES = 2000;
const README_MAX = 32 * 1024;

/** The last commits here, newest first: { sha (12), at, author, subject }. */
export function commitsOf(dir, count = HISTORY) {
  const r = git(dir, ['log', `-${count}`, '--format=%H%x1f%cI%x1f%an%x1f%s']);
  if (!r.ok) return [];
  return r.out
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [sha, at, author, subject] = line.split('\x1f');
      return { sha: sha.slice(0, 12), at, author: author.slice(0, 80), subject: subject.slice(0, 120) };
    });
}

/** Every file of the space as git has it (committed or new; ignored files aren't the space's), sorted. */
export function spaceFiles(dir) {
  const r = git(dir, ['ls-files', '-co', '--exclude-standard', '-z']);
  if (!r.ok) return [];
  return [...new Set(r.out.split('\0').filter(Boolean))].filter(file => fs.existsSync(path.join(dir, file))).sort();
}

/** The space's README.md (any case), or null. */
function readmeFile(dir) {
  try {
    const name = fs.readdirSync(dir).find(n => /^readme\.md$/i.test(n));
    return name ? path.join(dir, name) : null;
  } catch {
    return null;
  }
}

/**
 * What the app's Code tab shows of a space, like GitHub's front page of it: every file's path (never its
 * contents) and the README.md, which says what the code is.
 */
export function spaceCode(dir) {
  const files = spaceFiles(dir);
  const readme = readmeFile(dir);
  const text = readme ? fs.readFileSync(readme, 'utf8') : '';
  return {
    files: files.slice(0, MAX_REPORT_FILES),
    ...(files.length > MAX_REPORT_FILES && { truncated: true }),
    ...(text.trim() && { readme: text.slice(0, README_MAX) }),
  };
}

/* ---------- the README's list of what's here ---------- */

export const CONTENTS_START = '<!-- mm:contents: mm space push keeps this list up to date. Write about the space above or below it. -->';
export const CONTENTS_END = '<!-- /mm:contents -->';
const CONTENTS_BLOCK = /<!-- mm:contents[^>]*-->[\s\S]*?<!-- \/mm:contents -->\n?/;

/** Words a person would say for what is at the top of a space, when its own file doesn't say. */
const KNOWN = {
  'CLAUDE.md': 'what Claude follows in every session of this space',
  'AGENTS.md': 'what Claude follows in every session of this space',
  'prefs.md': 'the taste every production of this space follows',
  '.gitignore': null,
};

/** The first thing a Markdown file says about itself: its first paragraph, else its first heading. */
export function firstWords(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8').slice(0, 64 * 1024);
  } catch {
    return undefined;
  }
  const lines = text.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '').replace(CONTENTS_BLOCK, '').split('\n');
  let heading;
  const paragraph = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (paragraph.length && !line) break;
    if (!line || line.startsWith('<!--') || line.startsWith('```')) continue;
    if (/^#{1,6}\s/.test(line)) {
      if (paragraph.length) break;
      heading ??= line.replace(/^#+\s*/, '');
      continue;
    }
    if (/^([-*+]|\d+\.)\s|^[|>]/.test(line) && !paragraph.length) {
      if (heading) break;
      continue;
    }
    paragraph.push(line);
  }
  const plain = s =>
    s
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*`]/g, '')
      .replace(/(^|[\s(])_+(?=\S)|(?<=\S)_+(?=[\s.,;:!?)]|$)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  const said = plain(paragraph.join(' ')) || plain(heading ?? '');
  if (!said) return undefined;
  const sentence = said.match(/^.{20,160}?[.!?](\s|$)/)?.[0].trim();
  return sentence ?? (said.length > 160 ? `${said.slice(0, 157).trimEnd()}…` : said);
}

const md = s => s.replace(/([\\`*[\]<>])/g, '\\$1');
const mdLink = (label, target) => `[\`${label}\`](${target.split('/').map(encodeURIComponent).join('/')})`;

/**
 * The README's "What's here": every file and folder at the top of the space with what it is (a Markdown
 * file's first words, a folder's own README.md, a package.json's description, or its file count), then
 * each skill, MCP and app with its summary. Built from the files, so it is never out of date.
 */
export function contentsBlock(dir, files = spaceFiles(dir)) {
  const top = new Map();
  for (const file of files) {
    const [first, ...rest] = file.split('/');
    if (Object.values(KINDS).includes(first) || /^readme\.md$/i.test(first) || first.startsWith('.')) continue;
    const entry = top.get(first) ?? { name: first, folder: rest.length > 0, files: 0 };
    entry.files += rest.length > 0 ? 1 : 0;
    top.set(first, entry);
  }
  const lines = [CONTENTS_START, "## What's here", ''];
  const entries = [...top.values()].sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name));
  for (const entry of entries) {
    const at = path.join(dir, entry.name);
    let about;
    if (entry.folder) {
      const own = readmeFile(at);
      const pkg = readJson(path.join(at, 'package.json'));
      about = (own && firstWords(own)) ?? (typeof pkg.description === 'string' && pkg.description.trim() ? pkg.description.trim() : undefined);
      about = `${about ? `${about.replace(/\.$/, '')} ` : ''}(${plural(entry.files, 'file')})`;
    } else if (entry.name in KNOWN && KNOWN[entry.name] === null) continue;
    else if (entry.name === 'package.json') about = readJson(at).description;
    else if (/\.md$/i.test(entry.name)) about = firstWords(at) ?? KNOWN[entry.name];
    else about = KNOWN[entry.name];
    lines.push(`- ${mdLink(entry.folder ? `${entry.name}/` : entry.name, entry.name)}${about ? `: ${md(String(about))}` : ''}`);
  }
  if (!entries.length) lines.push('Nothing at the top yet. Guidance every production follows (a CLAUDE.md, prefs.md) and shared code go here, beside the folders below.');
  const items = spaceItems(dir);
  for (const [kind, folder] of Object.entries(KINDS)) {
    const list = items.filter(item => item.kind === kind);
    if (!list.length) continue;
    lines.push('', `### ${KIND_TITLE[kind]}`, '');
    for (const item of list) {
      const about = item.summary && item.summary !== item.title ? `${item.title}. ${item.summary}` : item.title;
      lines.push(`- ${mdLink(item.name, `${folder}/${item.name}`)}: ${md(about)}`);
    }
  }
  if (!items.length) lines.push('', 'No skills, MCPs or apps yet: they go in `skills/<name>/`, `mcps/<name>/` and `apps/<name>/`.');
  lines.push('', CONTENTS_END);
  return `${lines.join('\n')}\n`;
}

/** A README with its "What's here" brought up to date: the list replaced, or put after the opening paragraph. */
export function withContents(readme, block) {
  if (CONTENTS_BLOCK.test(readme)) return readme.replace(CONTENTS_BLOCK, block);
  const lines = readme.replace(/\r\n/g, '\n').split('\n');
  let at = lines.findIndex(line => /^#\s/.test(line));
  if (at < 0) return `${block}\n${readme}`;
  at++;
  while (at < lines.length && !lines[at].trim()) at++;
  if (at < lines.length && !/^#{1,6}\s|^([-*+]|\d+\.)\s/.test(lines[at])) while (at < lines.length && lines[at].trim()) at++;
  const before = lines.slice(0, at).join('\n').replace(/\n+$/, '');
  const after = lines.slice(at).join('\n').replace(/^\n+/, '');
  return `${before}\n\n${block}${after ? `\n${after}` : ''}`;
}

/** The README as it should be, or null when it already is. A space with none gets one. */
export function readmeUpdate(space) {
  if (space.item) return null;
  const file = readmeFile(space.dir) ?? path.join(space.dir, 'README.md');
  const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : README(space.repo, space.project);
  const next = withContents(now, contentsBlock(space.dir));
  return next === now && fs.existsSync(file) ? null : { file, text: next };
}

/** Sends the reports when this computer is signed in and reports are on. Never fails the command it follows. */
async function sendReports(list, env = process.env, { loud = false } = {}) {
  if (!list.length) return false;
  const url = site(env);
  if (!usageSetting(env).on) return say(loud, 'Not reported to MediaMake: usage reports are off (mm usage on), so Mine keeps what it last had.');
  const at = signedIn(env);
  if (!at) return say(loud, `Not reported to MediaMake: this computer isn't signed in to ${url} (mm media cloud login, or MEDIAMAKE_API_KEY). Mine shows your spaces once it is.`);
  let items = 0;
  try {
    for (const space of list) {
      const report = spaceReport(space, env);
      await call('PUT', `${at.url}/api/space`, at.key, report);
      items += report.items.length;
    }
    console.log(`Mine is up to date: ${url}/app/mine (${plural(items, 'item')} as ${deviceLabel(env)}).`);
    return true;
  } catch (error) {
    return say(true, `Could not tell MediaMake (${error instanceof Error ? error.message : error}). mm space report tries again.`);
  }
}
const say = (loud, message) => {
  if (loud) console.log(message);
  return false;
};

/* ---------- making and connecting a space ---------- */

const README = (repo, project) => `# ${repo.split('/').pop()}

${project ? `The MediaMake space of the project ${project.name}: the skills, MCPs and apps made for it, and what guides every production of it, the same for everyone on it.` : 'My MediaMake space: my own skills, MCPs and apps, the same on every computer.'}

## How this space works

- \`skills/<name>/SKILL.md\`: a skill, with everything it needs beside it (its own code in \`skills/<name>/engine/\`, imported as \`@mediamake/skills/<name>/…\`)
- \`mcps/<name>/\`, \`apps/<name>/\`: an MCP or an app, with an \`item.json\` (\`title\`, \`summary\`, \`version\`, \`media\`)
- At the top, beside them: what guides and runs every production (a \`CLAUDE.md\`, \`prefs.md\`, shared code). A folder here gets a README.md whose first line says what it is.

\`mm space sync\` brings what others pushed and shows what would go up; \`mm space sync --yes\` sends it, and brings
the list above up to date. Large media stays out of git: it goes through the media library, and an item names
what it needs under \`media\` in its \`item.json\`.
`;
const GITIGNORE = `.DS_Store
node_modules/
dist/
.env
.env.*
!.env.example
*.log
`;

/**
 * Clones `target` into `dir` (or takes the clone that is there), and gives a new repo its layout.
 * Returns the origin's address.
 */
async function cloneSpace(target, dir, env, { ssh = false, project, item = false } = {}) {
  if (target.github) {
    const priv = await isPrivate(target.repo);
    if (priv === false) throw new Error(`${target.repo} is public. A space is private: make the repo private on GitHub (Settings, Danger Zone), or use another.`);
    if (priv === null) console.log(`⚠ Could not check that ${target.repo} is private (offline, or no gh). Make sure it is.`);
  }
  if (fs.existsSync(path.join(dir, '.git'))) {
    const origin = git(dir, ['remote', 'get-url', 'origin']).out;
    if (parseRepo(origin)?.repo !== target.repo) throw new Error(`${tilde(dir)} is already a clone of ${parseRepo(origin)?.repo ?? origin}. Move that folder away, then try again.`);
  } else {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new Error(`${tilde(dir)} exists and isn't a clone. Move it away, then try again.`);
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    const viaGh = target.github && !ssh && hasGh();
    const r = viaGh ? spawnSync('gh', ['repo', 'clone', target.repo, dir], { stdio: ['ignore', 'ignore', 'inherit'] }) : spawnSync('git', ['clone', '-q', target.url, dir], { stdio: ['ignore', 'ignore', 'inherit'] });
    if (r.status !== 0) throw new Error(`Could not clone ${target.repo}. Check that it exists and that this computer is signed in to GitHub (gh auth login, or an SSH key with --ssh).`);
  }
  if (item) return git(dir, ['remote', 'get-url', 'origin']).out || target.url;
  if (!git(dir, ['rev-parse', '--verify', '-q', 'HEAD']).ok) {
    // a new repo: give it the layout, and send that so every computer starts from the same place
    for (const folder of Object.values(KINDS)) {
      fs.mkdirSync(path.join(dir, folder), { recursive: true });
      fs.writeFileSync(path.join(dir, folder, '.gitkeep'), '');
    }
    fs.writeFileSync(path.join(dir, '.gitignore'), GITIGNORE);
    fs.writeFileSync(path.join(dir, 'README.md'), withContents(README(target.repo, project), contentsBlock(dir)));
    must(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
    must(dir, ['add', '-A']);
    must(dir, [...identity(dir, env), 'commit', '-q', '-m', 'Start the space: skills, mcps, apps']);
    const pushed = git(dir, ['push', '-q', '-u', 'origin', 'main']);
    if (!pushed.ok) console.log(`⚠ the layout is made here but could not be pushed (${pushed.err}). mm space sync --yes tries again.`);
  } else {
    for (const folder of Object.values(KINDS)) fs.mkdirSync(path.join(dir, folder), { recursive: true });
  }
  return git(dir, ['remote', 'get-url', 'origin']).out || target.url;
}

/** Connects `target` as your own space. */
async function connectMine(target, env, { ssh = false } = {}) {
  const existing = spaceSetting(env);
  const dir = spaceDir();
  if (existing && existing.repo !== target.repo && fs.existsSync(path.join(dir, '.git'))) {
    throw new Error(`${tilde(dir)} is already your space ${existing.repo}. mm space disconnect --yes, move that folder away, then connect again.`);
  }
  const url = await cloneSpace(target, dir, env, { ssh });
  saveSpaceSetting({ repo: target.repo, url, connectedAt: existing?.repo === target.repo ? existing.connectedAt : new Date().toISOString() }, env);
  console.log(`✔ your space: ${target.repo} → ${tilde(dir)}`);
  return { id: 'mine', label: 'Your space', repo: target.repo, dir };
}

/** Your own space: the one connected here, else <you>/mediamake-space on GitHub, made when it isn't there. */
async function ensureMine(env) {
  const have = localSpaces(env).find(s => s.id === 'mine');
  if (have) return have;
  const login = needGh('Making your space');
  const { repo, made } = ghEnsureRepo(`${login}/mediamake-space`, 'My MediaMake space: my own skills, MCPs and apps');
  if (made) console.log(`✔ made the private repo ${repo}`);
  const space = await connectMine(parseRepo(repo), env);
  afterChange(space);
  return space;
}

/** Connects a project's space that MediaMake knows the repo of. */
async function connectProject(project, repo, env) {
  const slug = projectSlug(project, env);
  const dir = path.join(workspaceRoot(), 'spaces', slug);
  await cloneSpace(parseRepo(repo), dir, env, { project });
  const before = readJson(configFile(env)).projectSpaces?.[project.id];
  saveProjectSpace(project.id, { repo, name: project.name, slug, connectedAt: before?.repo === repo ? before.connectedAt : new Date().toISOString() }, env);
  return { id: project.id, project: { id: project.id, name: project.name }, label: `Project ${project.name}`, repo, dir };
}

/** One of the account's projects by id or name, from what MediaMake lists. */
function findProject(remote, wanted) {
  const projects = remote?.projects ?? [];
  const q = String(wanted ?? '').trim().toLowerCase();
  const hits = projects.filter(p => p.projectId === wanted || p.name.toLowerCase() === q || slugify(p.name) === slugify(q));
  if (hits.length === 1) return hits[0];
  const names = projects.map(p => `${p.name} (${p.projectId})`).join(', ') || 'none';
  throw new Error(hits.length ? `Several projects are called "${wanted}": use the id. ${names}` : `No project "${wanted}" of yours. Yours: ${names}`);
}

/**
 * A project's space, connected here: the one MediaMake knows, else a new private repo
 * (<you>/mediamake-<project>) that MediaMake is told about. Then the project's members are invited.
 */
async function ensureProjectSpace(entry, env, { loud = false } = {}) {
  const project = { id: entry.projectId, name: entry.name };
  const have = localSpaces(env).find(s => s.id === project.id);
  let space = have;
  if (!space) {
    let repo = entry.space?.repo;
    if (!repo) {
      if (entry.role === 'viewer') throw new Error(`${entry.name} has no space yet, and you are a viewer on it: its owner or an editor makes the space with their first share.`);
      const login = needGh(`Making the space of ${entry.name}`);
      const ensured = ghEnsureRepo(`${login}/mediamake-${slugify(entry.name)}`, `MediaMake space of the project ${entry.name}`);
      repo = ensured.repo;
      if (ensured.made) console.log(`✔ made the private repo ${repo}`);
      const at = signedIn(env);
      await call('POST', `${at.url}/api/space`, at.key, { project: project.id, repo });
    } else {
      acceptInvites([repo]);
    }
    space = await connectProject(project, repo, env);
    console.log(`✔ ${entry.name}'s space: ${repo} → ${tilde(space.dir)}`);
  }
  if (entry.role !== 'viewer' && entry.members && hasGh() && parseRepo(space.repo)?.github) announceInvites(entry, inviteMembers(space.repo, entry.members), loud);
  return space;
}
const announceInvites = (entry, { invited, failed, noGithub }, loud = false) => {
  if (loud && !invited.length && !failed.length && !noGithub.length) console.log(`✔ everyone on ${entry.name} is already invited to its repo on GitHub.`);
  if (invited.length) console.log(`✔ invited to ${entry.name}'s repo on GitHub: ${invited.join(', ')}. Their next mm space sync connects it.`);
  if (failed.length) console.log(`⚠ could not invite ${failed.join(', ')}: only the repo's owner can invite.`);
  if (noGithub.length) console.log(`⚠ ${noGithub.join(', ')} ${noGithub.length === 1 ? 'has' : 'have'} no GitHub account linked to MediaMake, so ${noGithub.length === 1 ? "isn't" : "aren't"} invited yet: they link it under Account in the app.`);
};

/** Links a space's skills and says what was linked or needs a look. */
function afterChange(space) {
  const { linked, notes } = linkSkills(space.dir);
  if (linked.length) console.log(`✔ ${plural(linked.length, 'skill')} linked into Claude: ${linked.join(', ')}`);
  for (const note of notes) console.log(`⚠ ${note}`);
}

/** The spaces a command is about: every one here, or the one --project (or --mine) names. */
function chosen(flags, env, { needOne = false } = {}) {
  const all = localSpaces(env);
  const wanted = flags.find(f => f.startsWith('--project='))?.slice('--project='.length);
  if (wanted) {
    const q = wanted.toLowerCase();
    const hit = all.filter(s => s.project && (s.id === wanted || s.project.name.toLowerCase() === q || slugify(s.project.name) === slugify(q)));
    if (hit.length !== 1) throw new Error(`No space of a project "${wanted}" on this computer. mm space lists them; mm space sync connects the ones you were invited to.`);
    return hit;
  }
  if (flags.includes('--mine') || needOne) {
    const mine = all.filter(s => s.id === 'mine');
    if (!mine.length) throw new Error('No space of your own on this computer yet: mm space ensure makes it.');
    return mine;
  }
  return all;
}
const noSpaces = () => new Error('No space on this computer yet. mm space ensure makes your own; mm space sync connects the ones of your projects.');

/* ---------- commands ---------- */

async function connect(args, flags, env) {
  const ssh = flags.includes('--ssh');
  let target = parseRepo(args[0], { ssh });
  if (flags.includes('--create')) {
    const login = needGh('connect --create');
    const name = args[0] ?? 'mediamake-space';
    const { repo, made } = ghEnsureRepo(name.includes('/') ? name : `${login}/${name}`, 'My MediaMake space: my own skills, MCPs and apps');
    if (made) console.log(`✔ made the private repo ${repo}`);
    target = parseRepo(repo, { ssh });
  }
  if (!target) throw new Error('Which repo? mm space connect <owner/repo>, or mm space ensure to make your own by itself.');
  const space = await connectMine(target, env, { ssh });
  afterChange(space);
  await sendReports([space], env, { loud: true });
  return 0;
}

async function ensure(_args, _flags, env) {
  const had = localSpaces(env).some(s => s.id === 'mine');
  const space = await ensureMine(env);
  if (had) console.log(`✔ your space is ${space.repo} → ${tilde(space.dir)}`);
  else await sendReports([space], env, { loud: true });
  return 0;
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
      `Nothing was changed here. Ask Claude to merge them in ${tilde(dir)} (git pull --rebase, keep what you want of each, git rebase --continue), then mm space sync --yes.`,
  );
}

/** Brings one space up to GitHub. */
function pullOne(space, env) {
  const { dir } = space;
  const reached = git(dir, ['fetch', '-q', '--prune', 'origin']);
  if (!reached.ok) throw new Error(`Could not reach ${space.repo}: ${reached.err}`);
  let state = gitState(dir);
  if (!state.upstream) console.log(`${space.label}: nothing is on GitHub yet.`);
  else if (!state.behind) console.log(`✔ ${space.label}: has everything on GitHub`);
  else {
    const before = state.commit;
    if (commitLocal(dir, env, `Changes on ${deviceLabel(env)}`)) state = gitState(dir);
    if (state.hasHead) rebase(dir, env, state.branch);
    else must(dir, ['reset', '-q', '--hard', `origin/${state.branch}`]);
    const changed = before ? git(dir, ['diff', '--name-only', before, `origin/${state.branch}`]).out.split('\n').filter(Boolean) : [];
    const touched = [...new Set(changed.map(f => f.split('/').slice(0, 2).join('/')))];
    console.log(`✔ ${space.label}: pulled ${plural(state.behind, 'change')} from GitHub${touched.length ? `: ${touched.join(', ')}` : ''}`);
  }
  afterChange(space);
}

/** Connects the spaces of the account's projects that aren't here yet, and invites new members to the ones it may change. */
async function discover(env) {
  const remote = await remoteSpaces(env);
  if (!remote) return;
  const here = new Set(localSpaces(env).map(s => s.id));
  for (const entry of remote.projects ?? []) {
    if (!entry.space?.repo) continue;
    try {
      const isNew = !here.has(entry.projectId);
      const space = await ensureProjectSpace(entry, env);
      if (isNew) afterChange(space);
    } catch (error) {
      console.log(`⚠ ${entry.name}: ${error instanceof Error ? error.message.split('\n')[0] : error}${hasGh() ? '' : ` Accept the invitation at https://github.com/${entry.space.repo}/invitations first.`}`);
    }
  }
  await discoverLinked(remote, env);
}

/* ---------- linked items ---------- */

/** How a linked item reached this account, in a few words. */
const linkedVia = view => {
  if (view.role === 'owner') {
    const people = (view.people?.length ?? 0) + (view.invites?.length ?? 0);
    const where = [view.projects.length && view.projects.map(p => p.name).join(', '), people && plural(people, 'person', 'people')].filter(Boolean).join(' and ');
    return where ? `yours, linked to ${where}` : 'yours, linked to nobody yet';
  }
  const through = [view.projects.length && `through ${view.projects.map(p => p.name).join(', ')}`, view.direct && 'shared with you'].filter(Boolean).join(', ');
  return `from ${view.owner}${through ? `, ${through}` : ''}; ${view.role === 'editor' ? 'you can change it' : 'you can use it, not change it'}`;
};

/** A linked item MediaMake lists, by `name` or `kind/name`. `mine`: only the ones this account owns. Null when there is none. */
function findLinked(remote, wanted, { mine = false } = {}) {
  const [a, b] = String(wanted ?? '').split('/');
  const kind = b ? { skill: 'skill', skills: 'skill', mcp: 'mcp', mcps: 'mcp', app: 'app', apps: 'app' }[a] : undefined;
  const name = b ?? a;
  const hits = (remote?.linked ?? []).filter(v => v.name === name && (!kind || v.kind === kind) && (!mine || v.role === 'owner'));
  if (hits.length > 1) throw new Error(`Several linked items are called "${name}": ${hits.map(h => `${h.kind}/${h.name} (${h.role === 'owner' ? 'yours' : `from ${h.owner}`})`).join(', ')}. Say which, like ${hits[0].kind}/${name}.`);
  return hits[0] ?? null;
}

/** A linked item's clone on this computer: the one that is here, else a new clone (after accepting its invitation). */
async function connectLinked(view, env) {
  const before = readJson(configFile(env)).linkedItems?.[view.id];
  const slug = linkedSlug(view.id, view.name, env);
  const dir = linkedDir(slug);
  if (fs.existsSync(path.join(dir, '.git'))) {
    // the same repo under a new name on GitHub
    if (parseRepo(git(dir, ['remote', 'get-url', 'origin']).out)?.repo !== view.repo) must(dir, ['remote', 'set-url', 'origin', parseRepo(view.repo).url]);
  } else {
    if (view.role !== 'owner') acceptInvites([view.repo]);
    await cloneSpace(parseRepo(view.repo), dir, env, { item: true });
  }
  const entry = { repo: view.repo, slug, kind: view.kind, name: view.name, role: view.role, owner: view.owner, connectedAt: before?.repo === view.repo ? before.connectedAt : new Date().toISOString() };
  saveLinked(view.id, entry, env);
  return { id: `item:${view.id}`, item: { id: view.id, ...entry }, label: linkedLabel(entry), repo: view.repo, dir };
}

/** An item that is no longer shared with this account leaves this computer, unless something was changed in it here. */
function dropLinked(id, entry, env) {
  const dir = linkedDir(entry.slug);
  const what = `${KIND_WORD[entry.kind] ?? 'item'} ${entry.name}${entry.owner ? ` (${entry.owner}'s)` : ''}`;
  const here = fs.existsSync(path.join(dir, '.git'));
  if (here) unlinkSkills(dir, false);
  saveLinked(id, null, env);
  if (!here) return;
  const state = gitState(dir);
  if (state.dirty || (state.upstream && state.ahead)) return console.log(`○ The ${what} is no longer shared with you: unlinked from Claude. ${tilde(dir)} stays, because you changed it here.`);
  if (ITEM_NAME.test(entry.slug) && inside(path.join(workspaceRoot(), 'linked'), dir)) fs.rmSync(dir, { recursive: true, force: true });
  console.log(`○ The ${what} is no longer shared with you: removed from this computer.`);
}

/**
 * Makes the people on a linked item's repo exactly the ones who have it (the owner's computer does this):
 * invites who is missing, changes who may push, takes off who no longer has it. Null when GitHub can't be asked.
 */
function syncRepoPeople(repo, wanted) {
  const rows = out => out.split('\n').map(line => line.trim().split(/\s+/)).filter(parts => parts[0]);
  const on = gh(['api', `repos/${repo}/collaborators?affiliation=direct`, '--paginate', '-q', '.[] | "\\(.login) \\(.permissions.push)"']);
  const pending = gh(['api', `repos/${repo}/invitations`, '--paginate', '-q', '.[] | "\\(.id) \\(.invitee.login) \\(.permissions)"']);
  if (!on.ok || !pending.ok) return null;
  const owner = repo.split('/')[0].toLowerCase();
  const have = new Map();
  for (const [id, login, permission] of rows(pending.out)) if (login) have.set(login.toLowerCase(), { login, permission: permission === 'read' ? 'pull' : 'push', invitation: id });
  for (const [login, push] of rows(on.out)) have.set(login.toLowerCase(), { login, permission: push === 'true' ? 'push' : 'pull' });
  have.delete(owner);
  const result = { invited: [], removed: [], failed: [], noGithub: [] };
  const keep = new Set();
  for (const person of wanted) {
    if (!person.githubLogin) {
      result.noGithub.push(person.name);
      continue;
    }
    const key = person.githubLogin.toLowerCase();
    keep.add(key);
    if (key === owner || have.get(key)?.permission === person.permission) continue;
    const r = gh(['api', '-X', 'PUT', `repos/${repo}/collaborators/${person.githubLogin}`, '-f', `permission=${person.permission}`]);
    (r.ok ? result.invited : result.failed).push(person.name);
  }
  for (const [key, entry] of have) {
    if (keep.has(key)) continue;
    const r = entry.invitation ? gh(['api', '-X', 'DELETE', `repos/${repo}/invitations/${entry.invitation}`]) : gh(['api', '-X', 'DELETE', `repos/${repo}/collaborators/${entry.login}`]);
    (r.ok ? result.removed : result.failed).push(entry.login);
  }
  return result;
}
const announceLinkPeople = (view, result, loud = false) => {
  const what = `${view.kind}/${view.name}`;
  if (!result) return console.log(`⚠ ${what}: GitHub could not be asked who is on ${view.repo}. mm space sync tries again.`);
  if (loud && !result.invited.length && !result.removed.length && !result.failed.length && !result.noGithub.length) console.log(`✔ ${what}: everyone who has it is on its repo on GitHub.`);
  if (result.invited.length) console.log(`✔ ${what}: invited on GitHub: ${result.invited.join(', ')}. Their next mm space sync gets it.`);
  if (result.removed.length) console.log(`✔ ${what}: taken off its repo on GitHub: ${result.removed.join(', ')}.`);
  if (result.failed.length) console.log(`⚠ ${what}: GitHub refused for ${result.failed.join(', ')}.`);
  if (result.noGithub.length) console.log(`⚠ ${what}: ${result.noGithub.join(', ')} ${result.noGithub.length === 1 ? 'has' : 'have'} no GitHub account linked to MediaMake, so can't get it yet: they link it under Account in the app.`);
};

/**
 * The linked items of this account: clones the ones that aren't here (all of them, or the ones linked to
 * one project), removes the ones no longer shared with it, and, for the ones it owns, keeps the people on
 * each repo the ones who have it.
 */
async function discoverLinked(remote, env, onlyProject) {
  if (!Array.isArray(remote?.linked)) return;
  const wanted = new Map(remote.linked.map(view => [view.id, view]));
  const known = readJson(configFile(env)).linkedItems ?? {};
  if (!onlyProject) for (const [id, entry] of Object.entries(known)) if (!wanted.has(id) && entry.role !== 'owner') dropLinked(id, entry, env);
  for (const view of remote.linked) {
    if (onlyProject && !view.projects.some(p => p.id === onlyProject)) continue;
    try {
      const isNew = !known[view.id] || !fs.existsSync(path.join(linkedDir(known[view.id].slug), '.git'));
      const space = await connectLinked(view, env);
      if (isNew) {
        console.log(`✔ ${space.label}: ${view.repo} → ${tilde(space.dir)}  (${linkedVia(view)})`);
        afterChange(space);
      }
      if (view.role === 'owner' && view.collaborators && hasGh() && ghLogin()?.toLowerCase() === view.repo.split('/')[0].toLowerCase()) announceLinkPeople(view, syncRepoPeople(view.repo, view.collaborators));
    } catch (error) {
      const first = error instanceof Error ? error.message.split('\n')[0] : error;
      console.log(`⚠ ${view.kind}/${view.name} (${linkedVia(view)}): ${first}${view.role === 'owner' ? '' : ` ${view.owner}'s computer invites you on GitHub at its next mm space sync; check that the GitHub account linked to your MediaMake account is the one this computer uses.`}`);
    }
  }
}

async function pull(_args, flags, env) {
  if (!flags.some(f => f.startsWith('--project=')) && !flags.includes('--mine')) await discover(env);
  const list = chosen(flags, env);
  if (!list.length) throw noSpaces();
  let failed = 0;
  for (const space of list) {
    try {
      pullOne(space, env);
    } catch (error) {
      failed++;
      console.error(`✖ ${space.label}: ${error instanceof Error ? error.message : error}`);
    }
  }
  await sendReports(list, env);
  return failed ? 1 : 0;
}

/** What one space would send, checked. */
function pushPlan(space, flags) {
  const state = gitState(space.dir);
  const files = outgoing(space.dir, state);
  const byItem = new Map();
  for (const file of files) {
    const parts = file.path.split('/');
    const key = parts.length > 2 && Object.values(KINDS).includes(parts[0]) ? parts.slice(0, 2).join('/') : '(the space itself)';
    byItem.set(key, [...(byItem.get(key) ?? []), file]);
  }
  const { large, secrets } = pushProblems(space.dir, files);
  const blocked = large.length > 0 || (secrets.length > 0 && !flags.includes('--force'));
  // a skill going up should carry its code: name what it uses that only this computer has
  const code = [...byItem.keys()]
    .filter(k => k.startsWith(`${KINDS.skill}/`))
    .map(k => ({ name: k.split('/')[1], list: codeOutside(path.join(space.dir, k)) }))
    .filter(c => c.list.length);
  return { state, files, byItem, large, secrets, blocked, code, readme: !!readmeUpdate(space) };
}

function showPlan(space, plan, flags, yes) {
  console.log(`${yes ? 'Pushing' : 'Would push'} to ${space.repo} (${space.label.toLowerCase()}):`);
  for (const [item, list] of plan.byItem) {
    const count = change => list.filter(f => f.change === change).length;
    const parts = [count('new') && `${count('new')} new`, count('changed') && `${count('changed')} changed`, count('deleted') && `${count('deleted')} deleted`].filter(Boolean);
    console.log(`  ${item}  ${parts.join(', ')}`);
    if (flags.includes('--files')) for (const f of list) console.log(`      ${f.change.padEnd(7)} ${f.path}`);
  }
  if (plan.readme) console.log("  README.md  its list of what's here is brought up to date");
  if (plan.state.behind) console.log(`  GitHub has ${plural(plan.state.behind, 'change')} this computer doesn't: they are pulled first.`);
  for (const p of plan.large) console.log(`✖ ${p}`);
  for (const p of plan.secrets) console.log(`${flags.includes('--force') ? '⚠' : '✖'} ${p}`);
  if (plan.large.length) {
    console.log('  Large media stays out of git. Put it in the media library (mm media ingest <file>), name it under "media" in the item\'s item.json,');
    console.log('  remove it from the space (or add it to .gitignore), and share it with mm media share / mm media sync.');
  }
  if (plan.secrets.length && !flags.includes('--force')) console.log('  Take the key out (name an env var instead), or add --force if it is not a key.');
  for (const c of plan.code ?? []) showCodeOutside(c.name, c.list);
}

/** Sends one space: everything this computer has that GitHub doesn't, as one commit. */
function pushOne(space, plan, env, message) {
  const { dir } = space;
  const items = [...plan.byItem.keys()].filter(k => !k.startsWith('('));
  const what = message || `Update ${items.length ? items.slice(0, 6).join(', ') + (items.length > 6 ? ` and ${items.length - 6} more` : '') : 'the space'} (${deviceLabel(env)})`;
  commitLocal(dir, env, what);
  const state = gitState(dir);
  if (state.upstream && state.behind) rebase(dir, env, state.branch);
  // the README's list of what's here, written once GitHub's changes are in: two computers never conflict over it
  const readme = readmeUpdate(space);
  if (readme) {
    fs.writeFileSync(readme.file, readme.text);
    must(dir, ['add', '--', path.relative(dir, readme.file)]);
    if (!state.upstream) must(dir, [...identity(dir, env), 'commit', '-q', '-m', what]);
  }
  if (state.upstream) {
    must(dir, ['reset', '-q', '--soft', `origin/${state.branch}`]);
    if (git(dir, ['diff', '--cached', '--quiet']).ok) return console.log(`✔ ${space.label}: GitHub already has it`);
    must(dir, [...identity(dir, env), 'commit', '-q', '-m', what]);
  }
  const sent = git(dir, ['push', '-q', '-u', 'origin', state.branch]);
  if (!sent.ok) {
    const denied = /permission|denied|403|protected/i.test(sent.err);
    const why = space.item ? `only ${space.item.owner ?? 'its owner'} and the editors they named can change this item` : 'you can read this space but not change it (a viewer on the project)';
    throw new Error(denied ? `GitHub refused the push to ${space.repo}: ${why}. Nothing is lost: it is committed here.` : `The push to ${space.repo} was refused: ${sent.err}\nNothing is lost: it is committed here. mm space sync --yes tries again.`);
  }
  console.log(`✔ pushed to ${space.repo}: ${what}`);
}

async function push(_args, flags, env) {
  const list = chosen(flags, env);
  if (!list.length) throw noSpaces();
  const yes = flags.includes('--yes');
  const dashM = process.argv.indexOf('-m');
  const message = flags.find(f => f.startsWith('--message='))?.slice('--message='.length) || (dashM > 0 ? process.argv[dashM + 1] : undefined);
  let code = 0;
  let any = false;
  const done = [];
  for (const space of list) {
    const reached = git(space.dir, ['fetch', '-q', '--prune', 'origin']);
    if (!reached.ok && yes) {
      console.error(`✖ ${space.label}: could not reach ${space.repo}: ${reached.err}`);
      code = 1;
      continue;
    }
    const plan = pushPlan(space, flags);
    if (!plan.files.length) continue;
    if (space.item && space.item.role === 'user') {
      // theirs to use, not to change: what was edited here stays here
      console.log(`⚠ ${space.label}: changed on this computer (${plural(plan.files.length, 'file')}), and it stays here. Only ${space.item.owner ?? 'its owner'} and the editors they name can change it: ask them to make you an editor.`);
      continue;
    }
    any = true;
    showPlan(space, plan, flags, yes);
    if (plan.blocked) code = 1;
    if (!yes || plan.blocked) continue;
    try {
      pushOne(space, plan, env, message);
      afterChange(space);
      done.push(space);
    } catch (error) {
      code = 1;
      console.error(`✖ ${error instanceof Error ? error.message : error}`);
    }
  }
  if (!any) console.log('✔ nothing to push: GitHub has everything that is here');
  else if (!yes) console.log(code ? '\nA dry run. Fix the ✖ lines first.' : '\nA dry run, nothing left this computer. Add --yes to send it (--files lists every file).');
  else if (done.length) console.log('  On the other computers: mm space sync');
  await sendReports(yes ? done : [], env);
  return code;
}

/** pull, then push: one command for "make this computer and GitHub the same". */
/**
 * Invites everyone on a project to its repo on GitHub: the line the app shows its owner after they
 * add someone. Makes the project's space when there is none, so the new member has something to join.
 */
async function invite(args, flags, env) {
  const wanted = args.join(' ').trim() || flags.find(f => f.startsWith('--project='))?.slice('--project='.length);
  if (!wanted) throw new Error('Which project? mm space invite <project id or name>.');
  const remote = await remoteSpaces(env);
  if (!remote) throw new Error(`This computer isn't signed in to MediaMake, or ${site(env)} can't be reached: mm login.`);
  const entry = findProject(remote, wanted);
  if (entry.role === 'viewer') throw new Error(`You are a viewer on ${entry.name}: its owner or an editor invites.`);
  needGh(`Inviting to ${entry.name}'s repo`);
  const isNew = !localSpaces(env).some(s => s.id === entry.projectId);
  const space = await ensureProjectSpace(entry, env, { loud: true });
  if (isNew) {
    afterChange(space);
    await sendReports([space], env);
  }
  console.log(`\nThe line for them to run on their computer:\n  mm space join ${entry.projectId}`);
  return 0;
}

/**
 * Sets one project up on this computer: the line a new member copies from the project's page.
 * Signs in to MediaMake when needed, accepts the GitHub invitation, clones the project's space and
 * links its skills, then shows the project's shared media (mm media sync status; nothing is downloaded).
 */
async function join(args, flags, env) {
  const wanted = args.join(' ').trim() || flags.find(f => f.startsWith('--project='))?.slice('--project='.length);
  if (!wanted) throw new Error('Which project? mm space join <project id or name> (the project\'s page in the app has the line to copy).');
  if (!signedIn(env)) {
    console.log('This computer isn\'t signed in to MediaMake yet: signing in through your browser (click Allow in the tab that opens).');
    const r = spawnSync(process.execPath, [path.join(path.dirname(SELF), 'login.mjs')], { stdio: 'inherit', env });
    if (r.status !== 0 || !signedIn(env)) throw new Error('Not signed in. Run mm login, then this line again.');
  }
  const remote = await remoteSpaces(env);
  if (!remote) throw new Error(`MediaMake (${site(env)}) can't be reached, or doesn't accept this sign-in: mm login status.`);
  const entry = findProject(remote, wanted);
  console.log(`${entry.name}: you are ${entry.role === 'owner' ? 'its owner' : entry.role === 'editor' ? 'an editor' : 'a viewer'}.`);
  let failed = 0;
  if (!entry.space?.repo) {
    console.log(`○ Nobody has shared a skill, MCP or app into ${entry.name} yet, so there is nothing to clone. Run this line again once someone has (or mm space sync).`);
  } else if (localSpaces(env).some(s => s.id === entry.projectId)) {
    const space = localSpaces(env).find(s => s.id === entry.projectId);
    pullOne(space, env);
    await sendReports([space], env);
  } else {
    const login = needGh(`Getting ${entry.name}'s space`);
    try {
      const space = await ensureProjectSpace(entry, env);
      afterChange(space);
      await sendReports([space], env);
    } catch (error) {
      failed = 1;
      const invited = gh(['api', 'user/repository_invitations', '--paginate', '-q', '.[].repository.full_name']).out.toLowerCase().split('\n').includes(entry.space.repo.toLowerCase());
      console.error(
        invited
          ? `✖ ${error instanceof Error ? error.message.split('\n')[0] : error}`
          : `✖ ${login} on GitHub isn't invited to ${entry.space.repo} yet. ${entry.owner ? `${entry.owner}, who made the repo,` : 'Whoever made the repo'} invites new members the next time they run mm space sync. ` +
              `Check that the GitHub account linked to your MediaMake account (Account in the app) is ${login}, then run this line again.`,
      );
    }
  }
  // the items linked to this project from their owners' spaces
  const before = new Set(localSpaces(env).map(s => s.id));
  await discoverLinked(remote, env, entry.projectId);
  const linked = localSpaces(env).filter(s => s.item && (remote.linked ?? []).some(view => view.id === s.item.id && view.projects.some(p => p.id === entry.projectId)));
  for (const space of linked.filter(s => before.has(s.id))) pullOne(space, env);
  await sendReports(linked, env);
  if (filesWanted(flags, env)) showFiles(entry.name, entry.projectId, env);
  return failed;
}

/** Whether to show a space's files after its skills: --no-files (or --no-media, or MEDIAMAKE_SPACE_FILES=off) skips it. */
const filesWanted = (flags, env) => !flags.includes('--no-files') && !flags.includes('--no-media') && env.MEDIAMAKE_SPACE_FILES !== 'off';

/**
 * A space's files (brand kit, productions, media: kept in MediaMake's storage, not in git): what would
 * come down and go up, from the media library's own sync. It only shows: nothing is moved here.
 */
function showFiles(name, projectId, env) {
  const mm = path.join(path.dirname(SELF), '..', 'apps', 'studio', 'bin', 'mm.mjs');
  console.log(`\nFiles of ${name} (to move them: mm media sync pull --project=${projectId}, or push; each a dry run until --yes):`);
  const r = spawnSync(process.execPath, [mm, 'media', 'sync', 'status', `--project=${projectId}`], { stdio: 'inherit', env });
  if (r.status !== 0) console.log('⚠ The files check did not finish (mm doctor says what this computer is missing; files in a space need a Plus membership). The skills above are in step either way.');
}

/**
 * One sync for every space on this computer: its skills, MCPs and apps through git (down, then what
 * would go up), then its files, shown as the media library's sync sees them.
 */
async function sync(args, flags, env) {
  const pulled = await pull(args, flags, env);
  if (pulled) return pulled;
  const pushed = await push(args, flags, env);
  if (pushed || !filesWanted(flags, env) || !signedIn(env)) return pushed;
  const remote = await remoteSpaces(env);
  if (!remote) return pushed;
  const here = localSpaces(env);
  const spaces = [
    ...(remote.personalProjectId && here.some(s => s.id === 'mine') ? [{ name: 'your personal space', id: remote.personalProjectId }] : []),
    ...here.filter(s => s.project).map(s => ({ name: s.project.name, id: s.id })),
  ];
  for (const space of spaces) showFiles(space.name, space.id, env);
  return pushed;
}

async function status(_args, flags, env) {
  const list = localSpaces(env);
  const remote = flags.includes('--offline') ? null : await remoteSpaces(env);
  const here = new Set(list.map(s => s.id));
  const waiting = (remote?.projects ?? []).filter(p => p.space?.repo && !here.has(p.projectId));
  const linkedWaiting = (remote?.linked ?? []).filter(v => !here.has(`item:${v.id}`));
  const json = flags.includes('--json');
  const out = [];
  if (!list.length && !json) {
    console.log('No space on this computer yet.');
    console.log('A space is a private GitHub repo for what you made yourself (skills, MCPs, apps), the same on every computer.');
    console.log('  mm space ensure                  make your own and connect it (needs gh)');
    console.log('  mm space connect <owner/repo>    connect one you have');
  }
  for (const space of list) {
    const { dir } = space;
    const reached = flags.includes('--offline') ? { ok: true } : git(dir, ['fetch', '-q', '--prune', 'origin']);
    const state = gitState(dir);
    const items = spaceItems(dir);
    const files = outgoing(dir, state);
    const target = name => real(path.join(dir, 'skills', name));
    const loaded = name => real(path.join(userSkillsDir(), name)) === target(name) && real(path.join(ownSkillsDir(), name)) === target(name);
    if (json) {
      out.push({ id: space.id, ...(space.project && { project: space.project.name }), ...(space.item && { item: `${space.item.kind}/${space.item.name}`, role: space.item.role, owner: space.item.owner }), repo: space.repo, dir, ...state, reached: reached.ok, toPush: files.length, items: items.map(i => ({ ...i, ...(i.kind === 'skill' && { linked: loaded(i.name) }) })) });
      continue;
    }
    const view = space.item && (remote?.linked ?? []).find(v => v.id === space.item.id);
    const who = space.item ? (view ? linkedVia(view) : space.item.role === 'owner' ? 'yours, linked' : `from ${space.item.owner ?? 'a member'}`) : space.project ? 'shared with everyone on the project' : 'only you';
    console.log(`${space.label}: ${space.repo} → ${tilde(dir)}  (${who})`);
    const gets = !reached.ok ? 'GitHub could not be reached' : state.behind ? `${plural(state.behind, 'change')} to bring down` : 'nothing to bring down';
    console.log(`  ${gets}, ${files.length ? `${plural(files.length, 'file')} to send up` : 'nothing to send up'}`);
    const width = Math.max(0, ...items.map(i => i.path.length));
    for (const item of items) {
      const marks = [item.kind === 'skill' && !loaded(item.name) && 'not linked into Claude', item.changed && 'changed here', item.media.length && `needs ${plural(item.media.length, 'media file')}: ${item.media.join(', ')}`].filter(Boolean);
      console.log(`  ${item.path.padEnd(width)}  ${/^(sha|tree):|^new$/.test(item.version) ? '' : item.version}`.trimEnd() + (marks.length ? `  (${marks.join('; ')})` : ''));
    }
    if (!items.length) console.log(space.item ? '  nothing in it yet: its owner has not sent it' : space.project ? `  nothing yet: mm space share <item> --project="${space.project.name}"` : '  nothing yet: mm space new skill <name>, or mm space add <one of your skills>');
    console.log('');
  }
  if (json) {
    console.log(JSON.stringify({ spaces: out, waiting: waiting.map(p => ({ project: p.name, id: p.projectId, repo: p.space.repo })), linkedWaiting: linkedWaiting.map(v => ({ item: `${v.kind}/${v.name}`, id: v.id, repo: v.repo, owner: v.owner })) }, null, 2));
    return 0;
  }
  for (const p of waiting) console.log(`${p.name} has a space you don't have here yet (${p.space.repo}): mm space sync connects it.`);
  for (const v of linkedWaiting) console.log(`The ${KIND_WORD[v.kind]} ${v.name} (${linkedVia(v)}) isn't on this computer yet: mm space sync gets it.`);
  if (list.some(s => s.id === 'mine') && (remote?.projects ?? []).some(p => p.role !== 'viewer')) console.log('To keep an item yours and give it to a project\'s people: mm space link <item> --project="<name>".');
  const empty = (remote?.projects ?? []).filter(p => !p.space?.repo && p.role !== 'viewer');
  if (list.length && empty.length) console.log(`Projects you can share into: ${empty.map(p => p.name).join(', ')} (mm space share <item> --project="<name>").`);
  if (list.length) console.log('mm space sync brings everything down and shows what would go up; mm space sync --yes sends it too.');
  return 0;
}

/** An item of a space by `name` or `kind/name`. */
function findItem(dir, wanted) {
  const [a, b] = String(wanted ?? '').split('/');
  const kind = b ? { skill: 'skill', skills: 'skill', mcp: 'mcp', mcps: 'mcp', app: 'app', apps: 'app' }[a] : undefined;
  const name = b ?? a;
  const hits = spaceItems(dir).filter(i => i.name === name && (!kind || i.kind === kind));
  if (hits.length === 1) return hits[0];
  throw new Error(hits.length ? `"${name}" is both ${hits.map(h => `a ${h.kind}`).join(' and ')}: say which, like skill/${name}.` : `No item "${wanted}" in your space. mm space lists them.`);
}

async function share(args, flags, env) {
  const wanted = flags.find(f => f.startsWith('--project='))?.slice('--project='.length);
  if (!args[0] || !wanted) throw new Error('mm space share <item> --project=<project name or id> [--copy] [--yes]');
  if (!signedIn(env)) throw new Error(`Sharing needs this computer signed in to ${site(env)} (mm media cloud login, or MEDIAMAKE_API_KEY): the project and its people are there.`);
  const remote = await remoteSpaces(env);
  if (!remote) throw new Error(`Could not reach ${site(env)} to read your projects.`);
  const entry = findProject(remote, wanted);
  if (entry.role === 'viewer') throw new Error(`You are a viewer on ${entry.name}: its owner and editors share into it.`);
  const mine = chosen(['--mine'], env)[0];
  const item = findItem(mine.dir, args[0]);
  const copy = flags.includes('--copy');
  const yes = flags.includes('--yes');
  const have = localSpaces(env).find(s => s.id === entry.projectId);
  const others = (entry.members ?? []).filter(m => !m.you);

  if (!yes) {
    console.log(`Would ${copy ? 'copy' : 'move'} ${item.path} from your space into ${entry.name}'s, so everyone on the project gets it:`);
    if (!have && !entry.space?.repo) console.log(`  make the private repo mediamake-${slugify(entry.name)} on your GitHub and tell MediaMake it is ${entry.name}'s space`);
    else if (!have) console.log(`  connect ${entry.space.repo} here`);
    const invitable = others.filter(m => m.githubLogin);
    if (invitable.length) console.log(`  make sure these people are on the repo: ${invitable.map(m => `${m.name} (${m.role === 'viewer' ? 'can pull' : 'can push'})`).join(', ')}`);
    const without = others.filter(m => !m.githubLogin);
    if (without.length) console.log(`  ${without.map(m => m.name).join(', ')} can't be invited yet: no GitHub account linked to MediaMake`);
    console.log(`  push both spaces${copy ? '' : `; ${item.path} leaves your own space`}`);
    console.log(`A dry run. mm space share ${args[0]} --project="${entry.name}" --yes does it.`);
    return 0;
  }

  const space = await ensureProjectSpace(entry, env);
  pullOne(space, env);
  const from = path.join(mine.dir, item.path);
  const to = path.join(space.dir, item.path);
  if (fs.existsSync(to)) throw new Error(`${entry.name}'s space already has ${item.path}. Change it there (${tilde(to)}), or share yours under another name.`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  if (!copy) fs.rmSync(from, { recursive: true, force: true });
  console.log(`✔ ${item.path} is in ${entry.name}'s space: ${tilde(to)}`);
  // the links of the space it left go first, so the name is free for the space it joined
  if (!copy) linkSkills(mine.dir);
  afterChange(space);
  return push([], ['--yes', ...flags.filter(f => f === '--force' || f.startsWith('--message='))], env);
}

const values = (flags, name) => flags.filter(f => f.startsWith(name)).flatMap(f => f.slice(name.length).split(',')).map(v => v.trim()).filter(Boolean);
const linkUsage = 'mm space link <item> --project=<project name or id> [--project=…] [--to=<email>] [--editor=<email>] [--yes]';

/** Changes one linked item on MediaMake. Answers the account's linked items again, and how it went on GitHub. */
async function linkCall(env, body) {
  const at = signedIn(env);
  return call('PATCH', `${at.url}/api/space/links`, at.key, body);
}

/** After a change: the repo's people follow, from the site when the owner connected GitHub there, else from this computer. */
function settleRepoPeople(view, answer) {
  if (!view || view.role !== 'owner') return;
  const github = answer?.github;
  if (github?.state === 'done') return announceLinkPeople(view, { invited: github.invited, removed: github.removed, failed: github.failed, noGithub: github.noGithub ?? [] }, true);
  if (hasGh() && ghLogin()?.toLowerCase() === view.repo.split('/')[0].toLowerCase()) return announceLinkPeople(view, syncRepoPeople(view.repo, view.collaborators ?? []), true);
  console.log(`⚠ ${view.kind}/${view.name}: the people on ${view.repo} follow at your next mm space sync on the computer whose GitHub account owns it.`);
}

/**
 * Gives an item of your space a private repo of its own and moves it there, so it can be linked: it
 * stays yours, one copy with one history. MediaMake is told which repo it is. Returns its id and its clone.
 */
async function makeLinked(item, mine, flags, env) {
  const login = needGh(`Linking ${item.name}`);
  const from = path.join(mine.dir, item.path);
  const files = must(mine.dir, ['ls-files', '-co', '--exclude-standard', '--', item.path]).split('\n').filter(Boolean).map(file => ({ path: file, change: 'new' }));
  const { large, secrets } = pushProblems(mine.dir, files);
  if (large.length || (secrets.length && !flags.includes('--force'))) {
    throw new Error(`${item.path} can't go to a repo of its own as it is:\n${[...large, ...secrets].map(p => `  ✖ ${p}`).join('\n')}\nLarge media goes through the media library (mm media ingest); a key goes in an env var (--force if it is not a key).`);
  }
  const { repo, made } = ghEnsureRepo(`${login}/mediamake-${item.kind}-${item.name}`, `MediaMake ${KIND_WORD[item.kind]} ${item.name}, linked to project spaces`);
  if (made) console.log(`✔ made the private repo ${repo}`);
  const at = signedIn(env);
  const { item: id } = await call('POST', `${at.url}/api/space/links`, at.key, { kind: item.kind, name: item.name, repo });
  const slug = linkedSlug(id, item.name, env);
  const dir = linkedDir(slug);
  await cloneSpace(parseRepo(repo), dir, env, { item: true });
  if (!git(dir, ['rev-parse', '--verify', '-q', 'HEAD']).ok) {
    fs.mkdirSync(path.dirname(path.join(dir, item.path)), { recursive: true });
    fs.cpSync(from, path.join(dir, item.path), { recursive: true });
    fs.writeFileSync(path.join(dir, 'README.md'), `# ${item.title}\n\nA MediaMake ${KIND_WORD[item.kind]} that stays its owner's and is linked to project spaces: everyone on a linked project, and the members its owner names, get it with \`mm space sync\`. Only its owner and the editors they name change it.\n\nIt is in \`${item.path}/\`.\n`);
    fs.writeFileSync(path.join(dir, '.gitignore'), GITIGNORE);
    must(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
    must(dir, ['add', '-A']);
    must(dir, [...identity(dir, env), 'commit', '-q', '-m', `${item.path}, from my space`]);
    const pushed = git(dir, ['push', '-q', '-u', 'origin', 'main']);
    if (!pushed.ok) throw new Error(`Could not push ${item.path} to ${repo}: ${pushed.err}\nNothing left your space. Run the same line again.`);
  } else if (!fs.existsSync(path.join(dir, item.path))) {
    throw new Error(`${repo} exists already and holds something else. Rename it on GitHub, or link the item under another name.`);
  } else if (!git(dir, ['diff', '--no-index', '--quiet', '--', from, path.join(dir, item.path)]).ok) {
    throw new Error(`${repo} already holds ${item.path}, and the copy in your space differs from it. Keep one: ${tilde(from)} or ${tilde(path.join(dir, item.path))}. Nothing was changed.`);
  }
  const entry = { repo, slug, kind: item.kind, name: item.name, role: 'owner', connectedAt: new Date().toISOString() };
  saveLinked(id, entry, env);
  // it leaves the space it was in: the links of that space go first, so the name is free for its new home
  fs.rmSync(from, { recursive: true, force: true });
  linkSkills(mine.dir);
  const space = { id: `item:${id}`, item: { id, ...entry }, label: linkedLabel(entry), repo, dir };
  console.log(`✔ ${item.path} has its own repo, ${repo} → ${tilde(dir)}. It is still only yours until it is linked.`);
  afterChange(space);
  return { id, space };
}

async function link(args, flags, env) {
  if (!args[0]) throw new Error(linkUsage);
  if (!signedIn(env)) throw new Error(`Linking needs this computer signed in to ${site(env)} (mm login): the projects and their people are there.`);
  const remote = await remoteSpaces(env);
  if (!remote) throw new Error(`Could not reach ${site(env)} to read your projects.`);
  if (!Array.isArray(remote.linked)) throw new Error(`${site(env)} doesn't link items yet: it needs a newer MediaMake.`);
  const projects = values(flags, '--project=').map(wanted => findProject(remote, wanted));
  const viewer = projects.find(p => p.role === 'viewer');
  if (viewer) throw new Error(`You are a viewer on ${viewer.name}: its owner and editors link items to it.`);
  const users = values(flags, '--to=').map(email => ({ email, editor: false }));
  const editors = values(flags, '--editor=').map(email => ({ email, editor: true }));
  const people = [...editors, ...users.filter(u => !editors.some(e => e.email === u.email))];
  const bad = people.find(p => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email));
  if (bad) throw new Error(`"${bad.email}" isn't an email address. Name people by the email of their MediaMake account.`);

  let view = findLinked(remote, args[0], { mine: true });
  // still in your space (never linked, or a link that stopped halfway): it gets its own repo first
  let mine = localSpaces(env).find(s => s.id === 'mine') ?? null;
  let item = null;
  try {
    if (mine) item = findItem(mine.dir, args[0]);
  } catch (error) {
    if (!view) throw error;
  }
  if (!view && !item) item = findItem(chosen(['--mine'], env)[0].dir, args[0]);
  if (!item) mine = null;
  const what = view ? `${view.kind}/${view.name}` : `${item.kind}/${item.name}`;
  if (!projects.length && !people.length) {
    if (!view) throw new Error(`Say who gets ${what}: ${linkUsage}`);
    console.log(`${what}: ${linkedVia(view)}.`);
    for (const p of view.people ?? []) console.log(`  ${p.name}${p.email ? ` <${p.email}>` : ''}: ${p.editor ? 'can change it' : 'can use it'}`);
    for (const p of view.invites ?? []) console.log(`  ${p.email}: invited, ${p.editor ? 'will be able to change it' : 'will be able to use it'}`);
    return 0;
  }

  if (!flags.includes('--yes')) {
    console.log(`Would link ${what}. It stays yours, one copy with one history, and only you and the editors you name can change it:`);
    if (item) {
      console.log(`  give it a private repo of its own on your GitHub, mediamake-${item.kind}-${item.name}, and move it there from your space`);
      console.log('  push your space, which it leaves');
    }
    for (const p of projects) console.log(`  link it to ${p.name}: ${p.people > 1 ? `the ${p.people} people on it get it` : 'everyone added to it gets it'} at their next mm space sync`);
    for (const p of people) console.log(`  share it with ${p.email}: ${p.editor ? 'can use it and change it' : 'can use it'}`);
    console.log(`A dry run. Add --yes to do it.`);
    return 0;
  }

  let space;
  if (item) {
    const made = await makeLinked(item, mine, flags, env);
    space = made.space;
    view = { id: made.id, kind: item.kind, name: item.name, repo: space.repo, role: 'owner', projects: [] };
  } else space = await connectLinked(view, env);
  let answer;
  let failed = 0;
  const step = async (body, done) => {
    try {
      answer = await linkCall(env, { item: view.id, ...body });
      console.log(`✔ ${done(answer)}`);
    } catch (error) {
      failed++;
      console.error(`✖ ${error instanceof Error ? error.message : error}`);
    }
  };
  for (const p of projects) await step({ action: 'link', project: p.projectId }, () => `${what} is linked to ${p.name}: its people get it at their next mm space sync (or mm space join ${p.projectId})`);
  for (const p of people) await step({ action: 'add', email: p.email, editor: p.editor }, a => `${what} is shared with ${p.email} (${p.editor ? 'can change it' : 'can use it'})${a?.mailed ? ': they were told by mail' : ''}`);
  settleRepoPeople(answer?.item ?? view, answer);
  // the space it left goes up without it; the item's own repo is already there
  const pushed = mine ? await push([], ['--yes', '--mine', ...flags.filter(f => f === '--force')], env) : 0;
  await sendReports([space], env);
  return failed || pushed ? 1 : 0;
}

async function unlink(args, flags, env) {
  const usage = 'mm space unlink <item> --project=<project name or id> | --from=<email> [--yes]';
  if (!args[0]) throw new Error(usage);
  if (!signedIn(env)) throw new Error(`Unlinking needs this computer signed in to ${site(env)} (mm login).`);
  const remote = await remoteSpaces(env);
  if (!remote) throw new Error(`Could not reach ${site(env)}.`);
  const view = findLinked(remote, args[0], { mine: true }) ?? findLinked(remote, args[0]);
  if (!view) throw new Error(`No linked item "${args[0]}". mm space lists them.`);
  const what = `${view.kind}/${view.name}`;
  const projects = values(flags, '--project=').map(wanted => {
    const p = findProject(remote, wanted);
    if (!view.projects.some(linked => linked.id === p.projectId)) throw new Error(`${what} isn't linked to ${p.name}.`);
    return p;
  });
  const people = values(flags, '--from=');
  if (!projects.length && !people.length) {
    console.log(`${what}: ${linkedVia(view)}.\n${usage}`);
    return 0;
  }
  if (!flags.includes('--yes')) {
    console.log(`Would unlink ${what}:`);
    for (const p of projects) console.log(`  from ${p.name}: the people who have it only through that project lose it at their next mm space sync`);
    for (const email of people) console.log(`  from ${email}: they lose it at their next mm space sync, unless a linked project still gives it to them`);
    console.log(`  It stays ${view.role === 'owner' ? 'yours' : `${view.owner}'s`}, with its history. A dry run. Add --yes to do it.`);
    return 0;
  }
  let answer;
  let failed = 0;
  for (const body of [...projects.map(p => ({ action: 'unlink', project: p.projectId, said: `unlinked from ${p.name}` })), ...people.map(email => ({ action: 'remove', email, said: `no longer shared with ${email}` }))]) {
    const { said, ...change } = body;
    try {
      answer = await linkCall(env, { item: view.id, ...change });
      console.log(`✔ ${what} is ${said}`);
    } catch (error) {
      failed++;
      console.error(`✖ ${error instanceof Error ? error.message : error}`);
    }
  }
  settleRepoPeople(answer?.item ?? view, answer);
  return failed ? 1 : 0;
}

async function add(args, flags, env) {
  const [name] = args;
  if (!name) throw new Error('Which skill? mm space add <name> (one of yours in the workspace: node tools/skills.mjs list).');
  const from = path.join(ownSkillsDir(), name);
  const st = lstat(from);
  if (!ITEM_NAME.test(name) || !st) throw new Error(`No skill "${name}" in ${tilde(ownSkillsDir())}.`);
  if (st.isSymbolicLink()) throw new Error(localSpaces(env).some(s => inside(real(path.join(s.dir, 'skills')), real(from))) ? `${name} is already in a space.` : `${tilde(from)} is a link, not a skill folder.`);
  if (!fs.existsSync(path.join(from, 'SKILL.md'))) throw new Error(`${tilde(from)} has no SKILL.md.`);
  showCodeOutside(name, codeOutside(from));
  if (!flags.includes('--yes')) {
    console.log(`Would move ${tilde(from)} into your space and leave a link in its place, so Claude keeps loading it.`);
    if (!localSpaces(env).some(s => s.id === 'mine')) console.log('Your space would be made first: a private repo on your GitHub, mediamake-space.');
    console.log(`A dry run. mm space add ${name} --yes moves it; mm space sync --yes then sends it to your other computers.`);
    return 0;
  }
  const space = await ensureMine(env);
  const to = path.join(space.dir, 'skills', name);
  if (fs.existsSync(to)) throw new Error(`Your space already has a skill called ${name}.`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch {
    fs.cpSync(from, to, { recursive: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
  console.log(`✔ ${name} is in your space: ${tilde(to)}`);
  afterChange(space);
  console.log('  mm space sync shows what would go to GitHub.');
  await sendReports([space], env);
  return 0;
}

async function create(args, flags, env) {
  const [kind, name] = args;
  if (!KINDS[kind] || !name) throw new Error('mm space new <skill|mcp|app> <name> [--project=<project>]');
  if (!ITEM_NAME.test(name)) throw new Error(`"${name}" isn't a name: lower-case words joined by hyphens, like make-my-intro.`);
  if (kind === 'skill' && lstat(path.join(ownSkillsDir(), name))) throw new Error(`You already have a skill called ${name} in ${tilde(ownSkillsDir())}: mm space add ${name} moves it into your space.`);
  const wanted = flags.find(f => f.startsWith('--project='))?.slice('--project='.length);
  let space;
  if (wanted) {
    const remote = await remoteSpaces(env);
    if (!remote) throw new Error(`A project's space needs this computer signed in to ${site(env)}.`);
    space = await ensureProjectSpace(findProject(remote, wanted), env);
  } else space = await ensureMine(env);
  const at = path.join(space.dir, KINDS[kind], name);
  if (fs.existsSync(at)) throw new Error(`${KINDS[kind]}/${name} already exists.`);
  fs.mkdirSync(at, { recursive: true });
  if (kind === 'skill') {
    fs.writeFileSync(path.join(at, 'SKILL.md'), `---\nname: ${name}\ndescription: <What it does, and when Claude should use it: "Use when the user says …">\nmetadata:\n  version: 0.1.0\n---\n\n# ${humanize(name)}\n\n<The steps.>\n`);
  } else {
    writeJson(path.join(at, 'item.json'), { title: humanize(name), summary: `<What this ${kind === 'mcp' ? 'MCP' : 'app'} does, in one line>`, version: '0.1.0', media: [] });
    fs.writeFileSync(path.join(at, 'README.md'), `# ${humanize(name)}\n\n<What it is, and how to run or install it on a new computer.>\n`);
  }
  console.log(`✔ ${tilde(at)}${space.project ? ` (${space.project.name}'s space: everyone on the project gets it)` : ' (your space: only you)'}`);
  afterChange(space);
  await sendReports([space], env);
  return 0;
}

async function report(_args, flags, env) {
  const list = chosen(flags, env);
  if (!list.length) throw noSpaces();
  if (flags.includes('--dry')) {
    console.log(JSON.stringify(list.map(space => spaceReport(space, env)), null, 2));
    console.log(`\nThis is everything that would be sent to ${site(env)}. Nothing was sent.`);
    return 0;
  }
  return (await sendReports(list, env, { loud: true })) ? 0 : 1;
}

async function disconnect(_args, flags, env) {
  const [space] = chosen(flags, env, { needOne: true });
  const yes = flags.includes('--yes');
  const unsent = outgoing(space.dir, gitState(space.dir)).length;
  const names = unlinkSkills(space.dir, !yes);
  console.log(`${yes ? 'Disconnected' : 'Would disconnect'} ${space.repo} (${space.label.toLowerCase()}) from this computer:`);
  console.log(`  ${plural(names.length, 'skill')} ${yes ? 'unlinked' : 'would be unlinked'} from Claude${names.length ? `: ${names.join(', ')}` : ''}`);
  console.log(`  ${tilde(space.dir)} stays as it is${unsent ? `, with ${plural(unsent, 'file')} that never went to GitHub` : ''}. The repo on GitHub is untouched.`);
  if (!yes) {
    console.log('A dry run. Add --yes to do it.');
    return 0;
  }
  if (space.project) saveProjectSpace(space.id, null, env);
  else saveSpaceSetting(null, env);
  const at = usageSetting(env).on ? signedIn(env) : null;
  if (at) {
    try {
      await call('DELETE', `${at.url}/api/space?device=${encodeURIComponent(deviceLabel(env))}${space.project ? `&project=${space.id}` : ''}`, at.key);
    } catch {
      // Mine keeps this computer's last report until it is forgotten
    }
  }
  return 0;
}

async function forget(_args, _flags, env) {
  const at = signedIn(env);
  if (!at) throw new Error(`Not signed in to ${site(env)}: run mm media cloud login, or set MEDIAMAKE_API_KEY.`);
  const res = await call('DELETE', `${at.url}/api/space`, at.key);
  console.log(`Deleted what ${at.url} held of your space (${plural(res?.forgotten?.items ?? 0, 'item')}) and took your computers off your projects' spaces. The repos and this computer's folders are untouched.`);
  return 0;
}

const help = () => console.log(fs.readFileSync(SELF, 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '').trim());

async function main(argv) {
  const flags = argv.filter(a => a.startsWith('-'));
  const dashM = argv.indexOf('-m');
  const args = argv.filter((a, i) => !a.startsWith('-') && !(dashM >= 0 && i === dashM + 1));
  const [cmd = 'status', ...rest] = args;
  const commands = { status, sync, join, invite, connect, ensure, pull, push, share, link, unlink, add, new: create, report, disconnect, forget };
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
