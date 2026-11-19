#!/usr/bin/env node
/**
 * items: what your MediaMake account opens, and installing it without an install prompt or code.
 *
 *   mm items                        who is signed in, their membership, and each MCP and app it opens:
 *                                   installed (with its version), behind, or not installed; and
 *                                   MediaMake's hosted connectors it opens (mm-use, mm-release for
 *                                   admins): in Claude Code or not
 *   mm items install                what `--yes` would install: every MCP and app your membership opens
 *                                   that isn't on this computer yet, and the ones that are behind
 *   mm items install --yes          installs them
 *   mm items install <id…> --yes    only these (mcp/browse-hack, skill/…), installed or not
 *   mm items plan <id>              one item's install plan as JSON (what install.md's step 3 fetches)
 *   --json                          the same as JSON, for Claude
 *
 * It uses the sign-in already on this computer (MEDIAMAKE_API_KEY, else the key `mm login` keeps in
 * the macOS Keychain, else `apiKey` in ~/.mediamake/config.json) and the site every other tool uses
 * (MEDIAMAKE_API_URL, else `url` in the config, else mediamake.microfox.app): nobody is asked for a
 * site address or an install prompt. The key is never printed.
 *
 * What install does itself, in the plan's order (install.md has the rules it follows):
 *   - a Chrome extension from a GitHub release: unzipped into ~/Extensions/<name>
 *   - an .mcpb package: checked against its SHA-256, unpacked into ~/.mediamake/mcp/<slug>, and added to
 *     Claude Code for every project (`claude mcp add --scope user`), with the site and, where the
 *     server needs it, the signed-in key
 *   - a skill package: copied to ~/.claude/skills/<slug>
 *   - one of MediaMake's hosted connectors (mm-use for every member, mm-release for admins): added to
 *     Claude Code for every project by its address (`claude mcp add --transport http --scope user`);
 *     signing in to it (/mcp, then Allow in the browser) is the person's one step
 *   - an MCP server someone else makes that runs on the computer (Blender, Figcraft, ElevenLabs): added
 *     to Claude Code for every project with its command as this computer finds it (localCommand), and
 *     its keys from this computer's environment when they are set there; its own setup is left to do
 * Claude Code is MEDIAMAKE_CLAUDE_BIN when it is set, else `claude` on the PATH, else the copy the
 * Claude desktop app keeps for its Code tab (desktopClaude).
 *   - the record in ~/.mediamake/installed.json and the update token in the config, so updates need
 *     nothing either
 * What it can't do is listed under "Left to do" (`left` in the JSON) for Claude or the person: loading
 * a new Chrome extension (Chrome has no command for it), an item's own INSTALL.md, an app, a key the
 * person gives, an MCP's own setup. A working setup that didn't come from MediaMake is never replaced.
 *
 * MCPs are never registered in a file of the repo (no .mcp.json): a command there is one computer's
 * (a Mac's /opt/homebrew/bin/uvx isn't on Windows, where npx needs `cmd /c`), and the file is
 * everyone's. Each computer adds its own, here or as install.md says.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { apiKey, configFile, site } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);
const WIN = process.platform === 'win32';
const INSTALL_GUIDE = 'https://github.com/microfox-ai/mediamake/blob/main/install.md';
/** The kinds that put something on the computer by themselves; skills of ours come with the repo. */
const AUTO_KINDS = new Set(['mcp', 'app']);
/**
 * MediaMake's own hosted connectors and the name each has in Claude: no package, added by their
 * address. mm-use opens to every signed-in account, mm-release to admins (the vault), so `mm items`
 * lists only the ones the account opens.
 */
export const HOSTED_CONNECTORS = { 'mcp/mm-use': 'mm-use', 'mcp/mm-release': 'mm-release' };
const TIMEOUT_MS = 30_000;

const readJson = file => {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};
const writeJson = (file, value, mode) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, mode ? { mode } : undefined);
  if (mode && !WIN) fs.chmodSync(file, mode);
};
const tilde = p => (p.startsWith(os.homedir()) ? `~${p.slice(os.homedir().length)}` : p);

/** Where installs live on this computer (install.md's folders). */
export function folders(env = process.env) {
  const home = path.dirname(configFile(env));
  return {
    home,
    installed: path.join(home, 'installed.json'),
    mcp: path.join(home, 'mcp'),
    work: path.join(home, 'installs'),
    extensions: env.MEDIAMAKE_EXTENSIONS ?? path.join(os.homedir(), 'Extensions'),
    skills: path.join(os.homedir(), '.claude', 'skills'),
  };
}

/** The sign-in on this computer, or null. Never printed: `from` says where it came from. */
export function signIn(url, env = process.env) {
  const found = apiKey(url, env);
  if (found) return found;
  const saved = readJson(configFile(env)).apiKey;
  return typeof saved === 'string' && saved.trim() ? { key: saved.trim(), from: 'config' } : null;
}

export class SiteError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function call(url, key, method, route, { query, body } = {}) {
  const u = new URL(route, `${url}/`);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== '') u.searchParams.set(k, v);
  let res;
  try {
    res = await fetch(u, {
      method,
      headers: { Accept: 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...(body !== undefined && { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new SiteError(`${url} didn't answer (${error instanceof Error ? error.message : error})`, 0);
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) throw new SiteError(data?.error ?? data?.message ?? `${u.pathname} answered ${res.status}`, res.status);
  return data;
}

/** 1.10.0 against 1.9.2: negative when a is older. Anything that isn't numbers compares as text. */
export function compareVersions(a, b) {
  const parts = v => String(v ?? '').replace(/^v/, '').split(/[.+-]/);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const [p, q] = [x[i] ?? '0', y[i] ?? '0'];
    const d = /^\d+$/.test(p) && /^\d+$/.test(q) ? Number(p) - Number(q) : p.localeCompare(q);
    if (d) return d;
  }
  return 0;
}

/** What is installed here: installed.json, and MCPs unpacked before that file existed. */
export function installedHere(env = process.env) {
  const dirs = folders(env);
  const items = { ...(readJson(dirs.installed).items ?? {}) };
  let slugs = [];
  try {
    slugs = fs.readdirSync(dirs.mcp);
  } catch {}
  for (const slug of slugs) {
    const id = `mcp/${slug}`;
    if (items[id]) continue;
    const version = readJson(path.join(dirs.mcp, slug, 'manifest.json')).version;
    if (version) items[id] = { version, method: 'mcpb', path: tilde(path.join(dirs.mcp, slug)) };
  }
  return items;
}

/**
 * The account and what it opens. `items` are the ones `install` handles by itself: MediaMake's own
 * MCPs and apps that have a package (hosted connectors and items made by others have none), each with
 * its live version and its state here. `locked` are the ones a higher membership opens.
 */
export async function mine(url, key, env = process.env) {
  const [me, catalog] = await Promise.all([
    call(url, key, 'GET', '/api/me').catch(() => null),
    call(url, key, 'GET', '/api/catalog', { query: { locked: 'show' } }),
  ]);
  if (!catalog?.signedIn) throw new SiteError(`${url} doesn't know this sign-in (the key was removed or is for another site): mm login`, 401);
  const all = (catalog.items ?? []).filter(item => AUTO_KINDS.has(item.kind) && !item.madeBy && !item.archivedAt && !['failed', 'archived'].includes(item.health));
  const open = all.filter(item => item.access !== 'locked');
  const live = new Map();
  for (let i = 0; i < open.length; i += 50) {
    const batch = await call(url, key, 'GET', '/api/catalog/versions', { query: { items: open.slice(i, i + 50).map(item => item.id).join(','), notes: '1' } });
    for (const item of batch?.items ?? []) live.set(item.id, item.version);
  }
  const here = installedHere(env);
  const items = open
    .filter(item => live.has(item.id))
    .map(item => {
      const installed = here[item.id]?.version ?? null;
      const version = live.get(item.id);
      return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        summary: item.summary,
        tier: item.tier ?? 'public',
        version,
        installed,
        state: !here[item.id] ? 'missing' : installed && compareVersions(installed, version) >= 0 ? 'installed' : 'behind',
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    site: url,
    account: me ? { name: me.name, email: me.email, tier: me.tier ?? (me.isAdmin ? 'admin' : undefined), isAdmin: !!me.isAdmin } : null,
    items,
    connectors: connectorsHere(open, env),
    locked: all.filter(item => item.access === 'locked').map(item => ({ id: item.id, title: item.title, tier: item.tier })),
  };
}

/**
 * MediaMake's hosted connectors the account opens (HOSTED_CONNECTORS), each `added` when Claude Code
 * has it by its name for every project, else `missing`; `unknown` when Claude Code isn't on this
 * computer.
 */
export function connectorsHere(open, env = process.env) {
  const claude = claudeBin(env);
  return open
    .filter(item => HOSTED_CONNECTORS[item.id])
    .map(item => {
      const name = HOSTED_CONNECTORS[item.id];
      const state = !claude ? 'unknown' : !mcpGet(claude, name, os.homedir()) ? 'missing' : 'added';
      return { id: item.id, title: item.title, name, tier: item.tier ?? 'public', state };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * What Claude Code has under `name` for a session opened in `cwd`, or null: its scope (`user`, `local`,
 * `project`) and, for a server it reaches by address, its URL. From the home folder it is what every
 * project gets.
 */
function mcpGet(claude, name, cwd) {
  const r = run(claude, ['mcp', 'get', name], { cwd });
  if (r.status !== 0) return null;
  const text = r.stdout ?? '';
  return { scope: text.match(/^\s*Scope:\s*(\w+)/m)?.[1]?.toLowerCase() ?? null, url: text.match(/^\s*URL:\s*(\S+)/m)?.[1] ?? null };
}

// ── installing ──────────────────────────────────────────────────────────────

/** An argument as the Windows shell reads it: quoted when it has a space or one of its own characters. */
const quoteForCmd = arg => (/[\s&|<>^()]/.test(arg) ? `"${String(arg).replace(/"/g, '""')}"` : arg);
// a bare name goes through the Windows shell (it finds claude.cmd and the like), its arguments quoted so
// a folder with a space in it stays one; an .exe by its path doesn't need the shell
const run = (cmd, args, opts = {}) => {
  const shell = WIN && !/\.exe$/i.test(cmd);
  return spawnSync(cmd, shell ? args.map(quoteForCmd) : args, { encoding: 'utf8', shell, ...opts });
};
/** Every place the PATH has `cmd`, first one first (where.exe lists npx and npx.cmd both). */
const whereIs = cmd => {
  const r = run(WIN ? 'where.exe' : 'which', [cmd]);
  return r.status === 0 ? (r.stdout ?? '').split(/\r?\n/).map(line => line.trim()).filter(Boolean) : [];
};
const has = cmd => whereIs(cmd).length > 0;

/**
 * The command and arguments Claude Code starts a local MCP server with, as this computer finds
 * `command`, or null when it isn't on this computer. By its full path, since the Claude app may start
 * servers without the terminal's PATH (a Mac's /opt/homebrew/bin); on Windows an .exe by its path, and
 * an npm shim (npx.cmd) through `cmd /c`, the only way Claude Code starts one there. Off the PATH, it
 * looks in ~/.local/bin (uv's and many installers' folder) and the folders its maker's installer uses
 * (`places`, a catalog item's `local.find`).
 */
export function localCommand(command, args = [], { platform = process.platform, find = whereIs, exists = fs.existsSync, places = [], env = process.env } = {}) {
  if (path.isAbsolute(command) || path.win32.isAbsolute(command)) return exists(command) ? { command, args } : null;
  const found = find(command);
  const win = platform === 'win32';
  if (win) {
    const exe = found.find(p => /\.exe$/i.test(p));
    if (exe) return { command: exe, args };
    if (found.some(p => /\.(cmd|bat)$/i.test(p))) return { command: 'cmd', args: ['/c', command, ...args] };
  } else if (found[0]) return { command: found[0], args };
  const file = win && !/\.exe$/i.test(command) ? `${command}.exe` : command;
  for (const place of ['~/.local/bin', ...places]) {
    const dir = fillPlace(place, env);
    const full = dir && (win ? path.win32 : path.posix).join(dir, file);
    if (full && exists(full)) return { command: full, args };
  }
  return null;
}

/** A folder named with `~` and `%VAR%`, filled in for this computer; null when it names a variable this one hasn't. */
function fillPlace(place, env) {
  let missing = false;
  const dir = place.replace(/^~(?=$|[\\/])/, () => os.homedir()).replace(/%([^%]+)%/g, (_, name) => env[name] ?? ((missing = true), ''));
  return missing ? null : dir;
}

/** What to install when a server's command isn't on the computer. */
const PROVIDES = { uvx: 'uv (https://docs.astral.sh/uv/getting-started/installation/)', uv: 'uv (https://docs.astral.sh/uv/getting-started/installation/)', npx: 'Node.js (https://nodejs.org)', node: 'Node.js (https://nodejs.org)' };

/**
 * The tar that unpacks here. On Windows, Windows' own (System32\tar.exe, bsdtar: .tar.gz and .zip,
 * C:\ paths): in Git Bash the PATH finds Git's GNU tar first, which reads `C:\…` as a remote host
 * named C and stops ("Error is not recoverable").
 */
const TAR = (() => {
  if (!WIN) return 'tar';
  const own = path.join(process.env.SystemRoot || process.env.windir || 'C:\\Windows', 'System32', 'tar.exe');
  return fs.existsSync(own) ? own : 'tar';
})();

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10 * 60_000) });
  if (!res.ok || !res.body) throw new SiteError(`${new URL(url).host} answered ${res.status} for ${path.basename(dest)}`, res.status);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
}

const sha256Of = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Unpacks a zip (an .mcpb is one) into dir: unzip, else the tar every Mac and Windows 10+ has (on Windows always that one). */
function unzip(file, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const r = !WIN && has('unzip') ? run('unzip', ['-o', '-q', file, '-d', dir]) : run(TAR, ['-xf', file, '-C', dir]);
  if (r.status !== 0) throw new Error(`Couldn't unpack ${path.basename(file)}: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`);
}

/** Empties a folder we own and makes it again (an update replaces the files, never merges them). */
function fresh(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

/** The first file under dir that `match` accepts. */
function findFile(dir, match) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && match(entry.name)) return full;
    if (entry.isDirectory()) {
      const inside = findFile(full, match);
      if (inside) return inside;
    }
  }
  return null;
}

/**
 * An .mcpb manifest's `server.mcp_config` with its placeholders filled in: the bundle's folder, each
 * setting's default, the site for a MediaMake URL and the signed-in key where the server asks for
 * one. `missing` lists required settings nothing here can answer.
 */
export function mcpConfig(manifest, dir, { url, key }) {
  const config = manifest.server?.mcp_config ?? {};
  const settings = manifest.user_config ?? {};
  const missing = [];
  const fill = (text, envName) =>
    String(text).replace(/\$\{([^}]+)\}/g, (_, name) => {
      if (name === '__dirname') return dir;
      if (!name.startsWith('user_config.')) return '';
      const id = name.slice('user_config.'.length);
      const setting = settings[id] ?? {};
      if (envName === 'MEDIAMAKE_API_URL' || envName === 'MEDIAMAKE_URL') return url;
      if (envName === 'MEDIAMAKE_API_KEY') {
        if (!key) missing.push(setting.title ?? id);
        return key ?? '';
      }
      if (setting.default !== undefined && setting.default !== '') return String(setting.default);
      if (setting.required) missing.push(setting.title ?? id);
      return '';
    });
  const env = {};
  for (const [name, value] of Object.entries(config.env ?? {})) {
    const filled = fill(value, name);
    if (filled !== '') env[name] = filled;
  }
  return { command: config.command, args: (config.args ?? []).map(arg => fill(arg)), env, missing };
}

/** Claude Code's command, or null where it isn't installed (Claude Desktop only, a bare terminal). */
const claudeBin = env => ('MEDIAMAKE_CLAUDE_BIN' in env ? env.MEDIAMAKE_CLAUDE_BIN || null : has('claude') ? 'claude' : desktopClaude(env));

const subfolders = dir => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
  } catch {
    return [];
  }
};

/**
 * The Claude Code the Claude desktop app keeps for its Code tab, for a computer where `claude` isn't on
 * the PATH: on Windows %LOCALAPPDATA%\Claude-Data\<app>\claude-code\<version>\<build>\claude.exe, the
 * newest version. Null elsewhere, or when there is none.
 */
export function desktopClaude(env = process.env, platform = process.platform) {
  if (platform !== 'win32') return null;
  const root = path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Claude-Data');
  const found = [];
  for (const app of subfolders(root)) {
    const base = path.join(root, app, 'claude-code');
    for (const version of subfolders(base))
      for (const build of subfolders(path.join(base, version))) {
        const exe = path.join(base, version, build, 'claude.exe');
        if (fs.existsSync(exe)) found.push({ version, exe });
      }
  }
  return found.sort((a, b) => compareVersions(b.version, a.version))[0]?.exe ?? null;
}

/** A local server's settings (`source.local.env`): a list of { name, required, secret, default, getAt }, or a plain map. */
const settingsOf = env => (Array.isArray(env) ? env : Object.entries(env ?? {}).map(([name, value]) => ({ name, default: value })));

/**
 * Adds an MCP server that runs on this computer (a plan's `source.local`) to Claude Code for every
 * project: its command as localCommand finds it here, each setting from this computer's environment,
 * else its default. A required one with neither (an API key) is the person's to give, so the server
 * is left to do with the line that adds it. One already registered under its name is kept (--force
 * replaces it). Its own `setup` steps are left to do, in order.
 */
function addLocalServer(step, { claude, env, force }) {
  const { name = step.slug, local, setup = [], guide } = step.source;
  const title = step.title ?? name;
  const done = [];
  const left = [];
  const how = { step: step.id, ...(guide && { guide }) };
  if (!claude) {
    left.push({ ...how, what: `Add ${title} to Claude: Claude Code isn't on this computer's PATH. For Claude Desktop, follow install.md's \`type: "source"\` with \`mm items plan ${step.id}\`` });
    return { done, left };
  }
  const home = os.homedir();
  const registered = !!mcpGet(claude, name, home);
  if (registered && !force) {
    done.push(`${title}: Claude Code already has a server named ${name}; kept as it is (mm items install ${step.id} --yes --force replaces it)`);
    return { done, left };
  }
  const found = localCommand(local.command, local.args ?? [], { places: local.find ?? [], env });
  if (!found) {
    // how to get the command: the item's own steps (a download per system), else what provides it
    const steps = local.install ?? [];
    const install = steps.length ? 'Get it as the next steps say' : PROVIDES[local.command] ? `Install ${PROVIDES[local.command]}` : `Install it (${guide ?? 'as its maker says'})`;
    left.push({ ...how, what: `Add ${title} to Claude Code: ${local.command} isn't on this computer. ${install}, then mm items install ${step.id} --yes` });
    for (const line of steps) left.push({ ...how, what: `${title}: ${line}` });
    return { done, left };
  }
  const values = {};
  const fromEnv = [];
  const needed = [];
  for (const setting of settingsOf(local.env)) {
    if (env[setting.name]) {
      values[setting.name] = env[setting.name];
      fromEnv.push(setting.name);
    } else if (setting.default !== undefined && setting.default !== '') values[setting.name] = String(setting.default);
    else if (setting.required) needed.push(setting);
  }
  const shown = [found.command, ...found.args].map(arg => (/\s/.test(arg) ? `"${arg}"` : arg)).join(' ');
  if (needed.length) {
    const line = ['claude mcp add --scope user', name, ...needed.map(s => `-e ${s.name}=<${s.secret ? 'your key' : 'value'}>`), '--', shown].join(' ');
    const where = needed.map(s => s.getAt).filter(Boolean);
    left.push({
      ...how,
      what: `Add ${title} to Claude Code: it needs ${needed.map(s => s.name).join(', ')}${where.length ? ` (from ${where.join(', ')})` : ''}, which this computer's environment doesn't have. Ask the person for it as install.md's \`type: "source"\` says, then: ${line}`,
    });
    return { done, left };
  }
  if (registered) run(claude, ['mcp', 'remove', name, '--scope', 'user'], { cwd: home });
  const add = run(claude, ['mcp', 'add', '--scope', 'user', name, ...Object.entries(values).flatMap(([k, v]) => ['-e', `${k}=${v}`]), '--', found.command, ...found.args], { cwd: home });
  if (add.status !== 0) throw new Error(`claude mcp add ${name} failed: ${(add.stderr || add.stdout || '').trim().split('\n').pop()}`);
  const by = step.madeBy?.name ? ` (made by ${step.madeBy.name})` : '';
  const keys = fromEnv.length ? `, with ${fromEnv.join(', ')} from this computer's environment` : '';
  done.push(`${title}${by} added to Claude Code as ${name} (for every project): ${shown}${keys}`);
  if (step.notes) done.push(`  note: ${step.notes}`);
  for (const what of setup) left.push({ ...how, what: `${title}'s setup: ${what}` });
  return { done, left, record: { source: 'mcp-server', title, path: name, installedAt: new Date().toISOString() } };
}

/**
 * Installs the steps of one plan. Returns what it did (`done`), what is left for Claude or the person
 * (`left`) and the entries for installed.json. `seen` keeps a step shared by two items from running twice.
 */
async function carryOut(plan, ctx) {
  const { url, key, env, dirs, seen, here } = ctx;
  const done = [];
  const left = [];
  const records = {};
  const claude = claudeBin(env);

  for (const step of plan.steps ?? []) {
    const id = step.type === 'repo' ? `repo:${step.repo}` : step.type === 'github-release' ? `release:${step.repo}/${step.asset}` : step.id;
    if (seen.has(id)) continue;
    seen.add(id);
    // a step that is only there for something the item works with (a skill's MCPs) is the person's choice
    if (step.forChoices?.length) continue;

    if (step.type === 'repo') {
      if (step.repo === 'microfox-ai/mediamake') continue; // this checkout
      const dest = path.join(os.homedir(), step.repo.split('/').pop());
      if (fs.existsSync(dest)) continue;
      left.push({ step: id, what: `Clone ${step.repo} to ${tilde(dest)}: gh repo clone ${step.repo} ${tilde(dest)}`, ...(step.why && { why: step.why }) });
      continue;
    }

    if (step.type === 'github-release') {
      if (step.kind !== 'chrome-extension') {
        left.push({ step: id, what: `Download ${step.name} (${step.downloadUrl}) and follow its guide`, guide: step.guide });
        continue;
      }
      const dest = path.join(dirs.extensions, step.asset.replace(/\.zip$/, ''));
      if (fs.existsSync(path.join(dest, 'manifest.json'))) {
        done.push(`${step.name} is already in ${tilde(dest)} (version ${readJson(path.join(dest, 'manifest.json')).version ?? 'unknown'}); left as it is`);
        continue;
      }
      const zip = path.join(dirs.work, 'downloads', step.asset);
      try {
        await download(step.downloadUrl, zip);
      } catch (error) {
        // a private repository's release: the GitHub CLI is signed in where a plain download isn't
        const tag = step.downloadUrl.match(/\/releases\/download\/([^/]+)\//)?.[1];
        fs.mkdirSync(path.dirname(zip), { recursive: true });
        const r = has('gh') ? run('gh', ['release', 'download', ...(tag ? [tag] : []), '--repo', step.repo, '--pattern', step.asset, '--dir', path.dirname(zip), '--clobber']) : null;
        if (!r || r.status !== 0) throw error;
      }
      unzip(zip, dest);
      fs.rmSync(zip, { force: true });
      done.push(`${step.name} unpacked into ${tilde(dest)}`);
      left.push({
        step: id,
        needsPerson: true,
        what: `Load the extension in Chrome: open chrome://extensions, turn on Developer mode (top right), click "Load unpacked" and pick ${dest}`,
        ...(step.guide && { guide: step.guide }),
      });
      continue;
    }

    // one of MediaMake's hosted connectors: added to Claude Code by its address; signing in is the person's
    if (step.type === 'source' && !step.madeBy && step.source?.type === 'mcp-server' && step.source.remote?.url && !step.source.remote.headers?.some(h => h.required)) {
      const name = step.source.name || step.slug;
      const address = step.source.remote.url;
      const signIn = { step: id, needsPerson: true, what: `Sign in to ${step.title}: in Claude Code, run /mcp, pick ${name}, sign in to MediaMake in the browser window that opens and click Allow` };
      if (!claude) {
        left.push({ step: id, what: `Add ${step.title} to Claude: Claude Code isn't on this computer's PATH. In Claude Desktop, add a custom connector with ${address}, then sign in and click Allow` });
        continue;
      }
      // what every project gets, seen from the home folder: a project's own .mcp.json can't answer for it
      const home = os.homedir();
      const registered = !!mcpGet(claude, name, home);
      if (registered && !ctx.force) {
        done.push(`${step.title} is already in Claude Code`);
        continue;
      }
      if (registered) run(claude, ['mcp', 'remove', name, '--scope', 'user'], { cwd: home });
      const add = run(claude, ['mcp', 'add', '--transport', 'http', '--scope', 'user', name, address], { cwd: home });
      if (add.status !== 0) throw new Error(`claude mcp add ${name} failed: ${(add.stderr || add.stdout || '').trim().split('\n').pop()}`);
      done.push(`${step.title} added to Claude Code (${address})`);
      left.push(signIn);
      continue;
    }

    // an MCP server that runs on this computer (one someone else makes: Blender, Figcraft, ElevenLabs):
    // added for every project with its command as this computer finds it, never from a file in the repo
    if (step.type === 'source' && step.source?.type === 'mcp-server' && step.source.local?.command) {
      const out = addLocalServer(step, { claude, env, force: ctx.force });
      done.push(...out.done);
      left.push(...out.left);
      if (out.record) records[step.id] = out.record;
      continue;
    }

    if (step.type === 'source') {
      left.push({ step: id, what: `${step.title} is installed from where it lives${step.madeBy ? ` (made by ${step.madeBy.name})` : ''}: follow install.md's \`type: "source"\` with \`mm items plan ${plan.itemId}\``, guide: INSTALL_GUIDE });
      continue;
    }

    // type: item, a package of ours
    const was = here[step.id];
    if (was?.version && compareVersions(was.version, step.version) >= 0 && !ctx.force) {
      done.push(`${step.title} ${was.version} is already installed`);
      continue;
    }
    const work = path.join(dirs.work, step.slug);
    fresh(work);
    const archive = path.join(dirs.work, 'downloads', `${step.slug}-${step.version}.tar.gz`);
    await download(step.downloadUrl, archive);
    if (step.sha256 && sha256Of(archive) !== step.sha256) {
      fs.rmSync(archive, { force: true });
      fs.rmSync(work, { recursive: true, force: true });
      throw new Error(`${step.title} ${step.version}: the download doesn't match its SHA-256, so nothing was installed`);
    }
    const untar = run(TAR, ['-xzf', archive, '-C', work], { shell: false });
    fs.rmSync(archive, { force: true });
    if (untar.status !== 0) throw new Error(`Couldn't unpack ${step.title}: ${(untar.stderr || '').trim().split('\n').pop()}`);
    const guide = findFile(work, name => name === 'INSTALL.md');
    const record = { version: step.version, title: step.title, method: step.method, installedAt: new Date().toISOString() };
    let keepWork = false;

    if (step.method === 'mcpb') {
      const bundle = findFile(work, name => (step.entry ? name === path.basename(step.entry) : name.endsWith('.mcpb')));
      if (!bundle) throw new Error(`${step.title} ${step.version} has no .mcpb in its package`);
      const dest = path.join(dirs.mcp, step.slug);
      const ours = !!was || fs.existsSync(path.join(dest, 'manifest.json'));
      const probe = path.join(work, 'bundle');
      unzip(bundle, probe);
      const manifest = readJson(path.join(probe, 'manifest.json'));
      const name = manifest.name ?? step.slug;
      const registered = claude ? run(claude, ['mcp', 'get', name]).status === 0 : false;
      if (registered && !ours && !ctx.force) {
        // a working copy from somewhere else (their own build, an older download): theirs to keep
        fs.rmSync(work, { recursive: true, force: true });
        done.push(`${step.title}: Claude Code already has a server named ${name} that didn't come from MediaMake; kept as it is (mm items install ${step.id} --yes --force replaces it)`);
        continue;
      }
      const before = readJson(path.join(dest, 'manifest.json')).server?.mcp_config;
      fresh(dest);
      fs.cpSync(probe, dest, { recursive: true });
      if (guide) fs.copyFileSync(guide, path.join(dest, 'INSTALL.md'));
      // kept beside the unpacked server for Claude Desktop, which installs from the bundle itself
      fs.copyFileSync(bundle, path.join(dirs.mcp, `${step.slug}.mcpb`));
      record.path = tilde(dest);
      const config = mcpConfig(manifest, dest, { url, key });
      const changed = JSON.stringify(before) !== JSON.stringify(manifest.server?.mcp_config);
      if (!claude) {
        left.push({ step: step.id, what: `Add ${step.title} to Claude: Claude Code isn't on this computer's PATH. In Claude Desktop, open ${path.join(dirs.mcp, `${step.slug}.mcpb`)} and click Install` });
      } else if (config.missing.length) {
        left.push({ step: step.id, what: `Add ${step.title} to Claude Code: it needs ${config.missing.join(', ')}, which this computer's sign-in can't answer. Then: claude mcp add --scope user ${name} -e … -- ${config.command} ${config.args.join(' ')}` });
      } else if (!registered || changed || ctx.force) {
        if (registered) {
          for (const scope of ['user', 'local', 'project']) if (run(claude, ['mcp', 'remove', name, '--scope', scope]).status === 0) break;
        }
        const add = run(claude, ['mcp', 'add', '--scope', 'user', name, ...Object.entries(config.env).flatMap(([k, v]) => ['-e', `${k}=${v}`]), '--', config.command, ...config.args]);
        if (add.status !== 0) throw new Error(`claude mcp add ${name} failed: ${(add.stderr || add.stdout || '').trim().split('\n').pop()}`);
        done.push(`${step.title} ${step.version} added to Claude Code as ${name} (for every project)`);
      } else {
        done.push(`${step.title} updated to ${step.version} in ${tilde(dest)}`);
      }
      if (guide) left.push({ step: step.id, what: `Finish ${step.title}'s own setup and check: follow ${path.join(dest, 'INSTALL.md')}` });
    } else if (step.method === 'skill') {
      const dest = path.join(dirs.skills, step.slug);
      const stat = fs.lstatSync(dest, { throwIfNoEntry: false });
      if (stat?.isSymbolicLink() || (stat && fs.existsSync(path.join(dest, '.git')))) {
        left.push({ step: step.id, what: `${tilde(dest)} is a working copy (a link or a git checkout): replace it with ${work} only if the person agrees` });
        keepWork = true;
      } else {
        fresh(dest);
        fs.cpSync(work, dest, { recursive: true });
        record.path = tilde(dest);
        done.push(`${step.title} ${step.version} copied to ${tilde(dest)}`);
        if (guide) left.push({ step: step.id, what: `Finish ${step.title}'s own setup: follow ${path.join(dest, 'INSTALL.md')}` });
      }
    } else {
      // an app, or a package that is only a guide
      keepWork = true;
      record.path = tilde(work);
      left.push({ step: step.id, what: `${step.title} ${step.version} is unpacked in ${work}: follow ${guide ?? "its package's INSTALL.md"}` });
    }
    if (step.notes) done.push(`  note: ${step.notes}`);
    if (!keepWork) fs.rmSync(work, { recursive: true, force: true });
    if (record.path) records[step.id] = record;
  }

  // what the item works with and they may add later
  const choices = (plan.choices ?? []).filter(choice => choice.need !== 'optional').map(choice => ({ id: choice.id, title: choice.title, need: choice.need, available: choice.available }));
  return { done, left, records, choices };
}

/**
 * Installs `ids` for the signed-in account: each item's plan from the site, carried out, recorded in
 * installed.json, and the update token (made or extended) saved in the config.
 */
export async function install(ids, { url, key, env = process.env, force = false } = {}) {
  const dirs = folders(env);
  const seen = new Set();
  const here = installedHere(env);
  const result = { site: url, installed: [], done: [], left: [], failed: [], worksWith: [] };
  const records = {};

  for (const id of ids) {
    try {
      const plan = await call(url, key, 'GET', '/api/catalog/install', { query: { item: id } });
      const out = await carryOut(plan, { url, key, env, dirs, seen, here, force });
      Object.assign(records, out.records);
      result.done.push(...out.done);
      result.left.push(...out.left.map(entry => ({ item: id, ...entry })));
      for (const choice of out.choices) if (!result.worksWith.some(c => c.id === choice.id)) result.worksWith.push({ ...choice, by: id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push({
        item: id,
        error: error instanceof SiteError && error.status === 404 ? `${id} isn't in the catalog, or this account's membership doesn't open it` : message,
      });
    }
  }

  const recorded = Object.keys(records);
  if (recorded.length) {
    const file = readJson(dirs.installed);
    writeJson(dirs.installed, { ...file, items: { ...(file.items ?? {}), ...records } });
    result.installed = recorded.map(id => ({ id, ...(records[id].version && { version: records[id].version }), path: records[id].path }));
  }
  // packages of ours update themselves (Browse Hack checks every few hours) with no code or key; a
  // server someone else makes has no version on MediaMake (uvx and npx start its latest release)
  const ours = recorded.filter(id => records[id].version);
  if (ours.length) {
    try {
      const config = readJson(configFile(env));
      const issued = await call(url, key, 'POST', '/api/catalog/update-token', { body: { items: ours, ...(typeof config.updateToken === 'string' && { token: config.updateToken }) } });
      if (issued?.token) writeJson(configFile(env), { ...readJson(configFile(env)), url, updateToken: issued.token }, 0o600);
    } catch (error) {
      result.left.push({ what: `Updates: the update token couldn't be saved (${error instanceof Error ? error.message : error}). \`mm items install --yes\` again later saves it.` });
    }
  }
  if (!fs.existsSync(path.join(dirs.work, 'downloads')) || !fs.readdirSync(path.join(dirs.work, 'downloads')).length) fs.rmSync(path.join(dirs.work, 'downloads'), { recursive: true, force: true });
  return result;
}

// ── the command ─────────────────────────────────────────────────────────────

const TIER = { public: 'Public', plus: 'Plus', pro: 'Pro', cohort: 'Cohort', admin: 'Admin' };
/** The connector states `mm items install --yes` acts on. */
const TO_ADD = new Set(['missing']);
const who = account => (account ? `${account.name || account.email || 'your account'}${account.tier ? ` · ${TIER[account.tier] ?? account.tier}` : ''}` : 'your account');

function printMine(state) {
  console.log(`MediaMake: ${state.site}\nSigned in: ${who(state.account)}\n`);
  if (!state.items.length) console.log('Your membership opens no MCP or app with a package yet.');
  const width = Math.max(0, ...state.items.map(item => item.id.length));
  for (const item of state.items) {
    const mark = item.state === 'installed' ? '✔' : item.state === 'behind' ? '↑' : '○';
    const what = item.state === 'installed' ? `installed ${item.installed}` : item.state === 'behind' ? `installed ${item.installed ?? '(version unknown)'}, ${item.version} is live` : `not installed (${item.version})`;
    console.log(`  ${mark} ${item.id.padEnd(width)}  ${what}  [${TIER[item.tier] ?? item.tier}]`);
  }
  const connectors = state.connectors ?? [];
  if (connectors.length) {
    console.log('\nMediaMake connectors:');
    const says = {
      added: 'in Claude Code',
      missing: 'not in Claude Code',
      unknown: "Claude Code isn't on this computer",
    };
    for (const connector of connectors)
      console.log(`  ${connector.state === 'added' ? '✔' : '○'} ${connector.id.padEnd(width)}  ${says[connector.state] ?? connector.state}  [${TIER[connector.tier] ?? connector.tier}]`);
  }
  const todo = [...state.items.filter(item => item.state !== 'installed'), ...connectors.filter(connector => TO_ADD.has(connector.state))];
  if (todo.length) console.log(`\n${todo.length} to install or update: mm items install --yes`);
  else if (state.items.length) console.log('\nEverything your membership opens is installed and up to date.');
  const byTier = new Map();
  for (const item of state.locked) byTier.set(item.tier, [...(byTier.get(item.tier) ?? []), item.title]);
  for (const [tier, titles] of byTier) console.log(`A ${TIER[tier] ?? tier} membership also opens: ${titles.join(', ')}`);
}

function printResult(result) {
  for (const line of result.done) console.log(line.startsWith('  ') ? line : `✔ ${line}`);
  for (const fail of result.failed) console.log(`✗ ${fail.item}: ${fail.error}`);
  if (result.left.length) {
    console.log('\nLeft to do:');
    for (const entry of result.left) console.log(`  ${entry.needsPerson ? '☞' : '·'} ${entry.what}`);
  }
  if (result.worksWith.length) {
    console.log('\nWorks with (not installed here; "Set up <id> from MediaMake" adds one):');
    for (const choice of result.worksWith) console.log(`  · ${choice.id} (${choice.need})`);
  }
  if (result.installed.length) console.log('\nA new MCP or skill shows up in the next Claude Code session, not this one.');
}

async function main(args) {
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const [cmd = 'status', ...ids] = args.filter(a => !a.startsWith('--'));
  const env = process.env;
  const json = flags.has('--json');
  const url = site(env);
  const signedIn = signIn(url, env);
  if (!signedIn) {
    const message = `Not signed in to ${url} on this computer. Sign in once: mm login (it opens your browser; click Allow), or set MEDIAMAKE_API_KEY.`;
    if (json) console.log(JSON.stringify({ site: url, signedIn: false, error: message }, null, 2));
    else console.error(message);
    return 2;
  }
  const { key } = signedIn;

  if (cmd === 'status' || cmd === 'list' || cmd === 'mine') {
    const state = await mine(url, key, env);
    if (json) console.log(JSON.stringify({ signedIn: true, ...state }, null, 2));
    else printMine(state);
    return 0;
  }

  if (cmd === 'plan') {
    if (ids.length !== 1) return fail('mm items plan <id>, e.g. mm items plan mcp/browse-hack');
    console.log(JSON.stringify(await call(url, key, 'GET', '/api/catalog/install', { query: { item: ids[0] } }), null, 2));
    return 0;
  }

  if (cmd === 'install') {
    const bad = ids.find(id => !/^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]{0,63}$/.test(id));
    if (bad) return fail(`"${bad}" isn't an item id. Ids look like mcp/browse-hack: mm items lists yours.`);
    let wanted = ids;
    let state = null;
    if (!wanted.length) {
      state = await mine(url, key, env);
      wanted = [...state.items.filter(item => item.state !== 'installed'), ...(state.connectors ?? []).filter(connector => TO_ADD.has(connector.state))].map(item => item.id);
    }
    if (!flags.has('--yes')) {
      if (json) console.log(JSON.stringify({ signedIn: true, site: url, account: state?.account, wouldInstall: wanted }, null, 2));
      else if (!wanted.length) console.log(`Everything ${who(state?.account)} opens is installed and up to date.`);
      else console.log(`Would install for ${who(state?.account)}:\n${wanted.map(id => `  ${id}`).join('\n')}\n\nNothing was installed: mm items install${ids.length ? ` ${ids.join(' ')}` : ''} --yes does it.`);
      return 0;
    }
    if (!wanted.length) {
      if (json) console.log(JSON.stringify({ signedIn: true, site: url, account: state?.account, installed: [], done: [], left: [], failed: [], worksWith: [] }, null, 2));
      else console.log(`Everything ${who(state?.account)} opens is installed and up to date.`);
      return 0;
    }
    const result = await install(wanted, { url, key, env, force: flags.has('--force') });
    if (json) console.log(JSON.stringify({ signedIn: true, ...(state && { account: state.account }), ...result }, null, 2));
    else printResult(result);
    return result.failed.length ? 1 : 0;
  }

  return fail(`Unknown command "${cmd}". mm items [status] | install [<id>…] [--yes] [--force] | plan <id>   (--json)`);
}

function fail(message) {
  console.error(message);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main(process.argv.slice(2)).then(
    code => process.exit(code),
    error => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    },
  );
}
