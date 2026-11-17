#!/usr/bin/env node
/**
 * items: what your MediaMake account opens, and installing it without an install prompt or code.
 *
 *   mm items                        who is signed in, their membership, and each MCP and app it opens:
 *                                   installed (with its version), behind, or not installed
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
 * site address, an install prompt or an install code. The key is never printed.
 *
 * What install does itself, in the plan's order (install.md has the rules it follows):
 *   - a Chrome extension from a GitHub release: unzipped into ~/Extensions/<name>
 *   - an .mcpb package: checked against its SHA-256, unpacked into ~/.mediamake/mcp/<slug>, and added to
 *     Claude Code for every project (`claude mcp add --scope user`), with the site and, where the
 *     server needs it, the signed-in key
 *   - a skill package: copied to ~/.claude/skills/<slug>
 *   - the record in ~/.mediamake/installed.json and the update token in the config, so updates need
 *     nothing either
 * What it can't do is listed under "Left to do" (`left` in the JSON) for Claude or the person: loading
 * a new Chrome extension (Chrome has no command for it), an item's own INSTALL.md, an app, something
 * made by someone else. A working setup that didn't come from MediaMake is never replaced.
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
    locked: all.filter(item => item.access === 'locked').map(item => ({ id: item.id, title: item.title, tier: item.tier })),
  };
}

// ── installing ──────────────────────────────────────────────────────────────

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', shell: WIN, ...opts });
const has = cmd => run(WIN ? 'where' : 'which', [cmd]).status === 0;

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10 * 60_000) });
  if (!res.ok || !res.body) throw new SiteError(`${new URL(url).host} answered ${res.status} for ${path.basename(dest)}`, res.status);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
}

const sha256Of = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Unpacks a zip (an .mcpb is one) into dir: unzip, else the tar every Mac and Windows 10+ has. */
function unzip(file, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const r = has('unzip') ? run('unzip', ['-o', '-q', file, '-d', dir]) : run('tar', ['-xf', file, '-C', dir]);
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
const claudeBin = env => ('MEDIAMAKE_CLAUDE_BIN' in env ? env.MEDIAMAKE_CLAUDE_BIN || null : has('claude') ? 'claude' : null);

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
    const untar = run('tar', ['-xzf', archive, '-C', work], { shell: false });
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

  const ours = Object.keys(records);
  if (ours.length) {
    const file = readJson(dirs.installed);
    writeJson(dirs.installed, { ...file, items: { ...(file.items ?? {}), ...records } });
    result.installed = ours.map(id => ({ id, version: records[id].version, path: records[id].path }));
    // so the items update themselves (Browse Hack checks every few hours) with no code or key
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
  const todo = state.items.filter(item => item.state !== 'installed');
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
      wanted = state.items.filter(item => item.state !== 'installed').map(item => item.id);
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
