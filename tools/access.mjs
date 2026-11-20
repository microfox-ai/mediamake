#!/usr/bin/env node
/**
 * access: what this computer can do, for the projects' access register (apps/mediamake/docs/cloud-device-runs.md).
 * A project knows where a step can run from what each place reports: a computer (this command) or a
 * Claude cloud environment (mm cloud reports it the same way).
 *
 *   mm access                      what this computer can do, and which projects may use it; tells MediaMake
 *   mm access --dry                the same, and the exact report, sending nothing
 *   mm access add <need>           says this computer has something that can't be detected: a browser
 *                                  sign-in (browser:youtube/<channel>), an app (app:reaper), a key (key:fal)
 *   mm access remove <need>        takes that back
 *   mm access name "<name>"        the name your projects' people see ("Studio Mac")
 *   mm access limit <key> "<text>" the spend limit beside a key, in your words ("unlimited", "$5 a day");
 *                                  mm access limit <key> --clear
 *   mm access open <project>       lets that project's runs use this computer, with nobody at it
 *   mm access close <project>      takes it back
 *   mm access busy | free          not for now | usable again
 *   mm access project <project>    that project's register: every place open to it, and what its skills need
 *   mm access forget               takes this computer out of the register
 *
 * A computer is closed to every project until you open it, and you can always use your own. What is
 * detected: renders (the checkout's dependencies), the known keys by name (set in the environment, in
 * MediaMake's sign-in or in an MCP's settings in Claude; never their values), the MCPs MediaMake
 * installed, and of the apps and MCPs your spaces' skills ask for, the ones that are here. What you add
 * is kept in ~/.mediamake/config.json (`access`).
 *
 * What MediaMake is told (when this computer is signed in and usage reports are on: mm usage): this
 * computer's random label, the name you gave it, those words and limits. mm access --dry shows it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clonedSpaces, DEFAULT_WORKSPACE, isCloud, workspaceOf } from './cloud.mjs';
import { installedHere } from './items.mjs';
import { deviceOnly, keyEnv, KEYS, NEED, needList } from './places.mjs';
import { findProject, localSpaces, remoteSpaces, spaceItems } from './space.mjs';
import { apiKey, call, configFile, deviceLabel, site, usageSetting } from './usage.mjs';

const SELF = fileURLToPath(import.meta.url);
const TOP = path.resolve(path.dirname(SELF), '..');

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

/** What the owner said about this computer: { name, has: [needs], limits: { key: text } }. */
export const declared = (env = process.env) => {
  const a = readJson(configFile(env)).access;
  const access = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
  const limits = access.limits && typeof access.limits === 'object' && !Array.isArray(access.limits) ? access.limits : {};
  return {
    ...(typeof access.name === 'string' && access.name.trim() && { name: access.name.trim().slice(0, 60) }),
    has: needList(access.has),
    limits: Object.fromEntries(Object.entries(limits).filter(([k, v]) => /^[a-z0-9][a-z0-9._-]{0,63}$/.test(k) && typeof v === 'string' && v.trim())),
  };
};
const saveDeclared = (change, env = process.env) => {
  const file = configFile(env);
  const config = readJson(file);
  const now = declared(env);
  config.access = change({ ...(now.name && { name: now.name }), has: now.has, limits: now.limits });
  writeJson(file, config);
};

/** The MCP servers Claude Code and Claude Desktop have here: { name: { env names that are set } }. Never a value. */
function claudeMcps(home) {
  const files = [path.join(home, '.claude.json'), path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), path.join(home, '.config', 'Claude', 'claude_desktop_config.json')];
  const found = new Map();
  for (const file of files) {
    for (const [name, server] of Object.entries(readJson(file).mcpServers ?? {})) {
      const set = Object.entries(server?.env ?? {}).filter(([, v]) => typeof v === 'string' && v.trim() && !v.startsWith('${')).map(([k]) => k);
      found.set(name, [...(found.get(name) ?? []), ...set]);
    }
  }
  return found;
}

/**
 * What this place can do, in the words of tools/places.mjs: detected first, then what its owner added.
 * `asked` is what the spaces' skills ask for: only those apps and Claude MCPs are looked for.
 */
export function capabilities({ env = process.env, top = TOP, home = os.homedir(), asked = [], cloud = isCloud(env) } = {}) {
  const can = [];
  if (fs.existsSync(path.join(top, 'node_modules', 'remotion'))) can.push('render');
  const mcps = cloud ? new Map() : claudeMcps(home);
  const inClaude = new Set([...mcps.values()].flat());
  const url = site(env);
  for (const name of Object.keys(KEYS)) {
    const here = env[KEYS[name].env]?.trim() || inClaude.has(KEYS[name].env) || (name === 'mediamake' && apiKey(url, env));
    if (here) can.push(`key:${name}`);
  }
  for (const id of Object.keys(installedHere(env))) if (id.startsWith('mcp/') && NEED.test(`mcp:${id.slice(4)}`)) can.push(`mcp:${id.slice(4)}`);
  for (const need of asked) {
    if (need.startsWith('mcp:') && mcps.has(need.slice(4))) can.push(need);
    if (need.startsWith('key:') && !KEYS[need.slice(4)] && env[keyEnv(need.slice(4))]?.trim()) can.push(need);
    if (need.startsWith('app:') && process.platform === 'darwin') {
      let apps = [];
      try {
        apps = fs.readdirSync('/Applications').map(a => a.replace(/\.app$/i, '').toLowerCase().replace(/\s+/g, '-'));
      } catch {}
      if (apps.includes(need.slice(4))) can.push(need);
    }
  }
  // the library's own config keeps it as { root, inbox, … } (apps/studio/scripts/library/config.ts); a plain path counts too
  const library = readJson(configFile(env)).library;
  const root = typeof library === 'string' ? library : typeof library?.root === 'string' ? library.root : '';
  if (root && fs.existsSync(root.replace(/^~(?=[\\/]|$)/, home))) can.push('media:library');
  can.push(...declared(env).has);
  // a cloud session never has what only a device has
  return [...new Set(can)].filter(need => !cloud || !deviceOnly(need));
}

/**
 * The projects whose to-dos and runs the session-start lines may name here. A computer: the ones its owner
 * opened it to (none while it is closed, busy or not in the register yet, and none when the site can't say:
 * a closed computer stays quiet). A cloud environment: null, every project it is told about, since it
 * belongs to the projects whose space it holds and is never opened or closed.
 */
export async function openProjects(at, env = process.env, { timeoutMs = 4000 } = {}) {
  if (isCloud(env)) return null;
  try {
    const res = await fetch(`${at.url}/api/space/places`, { headers: { Accept: 'application/json', Authorization: `Bearer ${at.key}` }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return new Set();
    const { places = [] } = await res.json();
    const label = deviceLabel(env);
    const here = places.find(place => place.kind === 'device' && place.label === label);
    return new Set(here && !here.busy ? (here.projects ?? []) : []);
  } catch {
    return new Set();
  }
}

/** What this computer's spaces' skills, MCPs and apps ask for. */
export const askedHere = (env = process.env) => {
  try {
    return [...new Set(localSpaces(env).flatMap(space => spaceItems(space.dir)).flatMap(item => item.needs ?? []))];
  } catch {
    return [];
  }
};

/** The report: { kind, device, name?, can, limits?, repos? }. */
export function placeReport({ env = process.env, top = TOP, home = os.homedir(), asked = askedHere(env) } = {}) {
  const cloud = isCloud(env);
  const mine = declared(env);
  const can = capabilities({ env, top, home, asked, cloud });
  // a cloud environment's limit comes with its key: <VARIABLE>_LIMIT beside the key's variable
  const limits = { ...mine.limits };
  for (const need of can) {
    if (!need.startsWith('key:')) continue;
    const fromEnv = env[`${keyEnv(need.slice(4))}_LIMIT`]?.trim();
    if (fromEnv) limits[need.slice(4)] = fromEnv.slice(0, 80);
  }
  const kept = Object.fromEntries(Object.entries(limits).filter(([k]) => can.includes(`key:${k}`)));
  const repos = cloud ? clonedSpaces(top, workspaceOf(env) ?? DEFAULT_WORKSPACE).map(s => s.repo) : [];
  return {
    kind: cloud ? 'cloud' : 'device',
    device: cloud ? env.MEDIAMAKE_PLACE?.trim() || 'cloud' : deviceLabel(env),
    ...(mine.name && !cloud && { name: mine.name }),
    can,
    ...(Object.keys(kept).length && { limits: kept }),
    ...(repos.length && { repos }),
  };
}

const signedIn = (env = process.env) => {
  const url = site(env);
  const key = apiKey(url, env);
  return key ? { url, key: key.key } : null;
};

/** Tells MediaMake what this place can do. Returns the saved place ({ place, projects }), or null when it isn't told. */
export async function sendPlace(env = process.env, { top = TOP } = {}) {
  if (!usageSetting(env).on) return null;
  const at = signedIn(env);
  if (!at) return null;
  return call('PUT', `${at.url}/api/space/places`, at.key, placeReport({ env, top }));
}

const words = need => {
  if (need === 'render') return 'renders';
  if (need.startsWith('key:')) return `key: ${KEYS[need.slice(4)]?.title ?? need.slice(4)} (${keyEnv(need.slice(4))})`;
  return need;
};

async function show(env, { dry = false } = {}) {
  const report = placeReport({ env });
  const mine = declared(env);
  console.log(report.kind === 'cloud' ? `This cloud environment (${report.device})` : `This computer (${report.name ? `${report.name}, ` : ''}${report.device})`);
  if (!report.can.length) console.log('  Nothing detected yet: mm doctor says what the machine is missing.');
  for (const need of report.can) console.log(`  ✔ ${words(need)}${need.startsWith('key:') && report.limits?.[need.slice(4)] ? ` · limit: ${report.limits[need.slice(4)]}` : ''}${mine.has.includes(need) ? '   (you said so)' : ''}`);
  const missing = askedHere(env).filter(need => !report.can.includes(need) && !(need.startsWith('browser:') && !need.includes('/') && report.can.some(c => c.startsWith(`${need}/`))));
  if (missing.length) console.log(`  Your spaces' skills also ask for: ${missing.join(', ')}. If this computer has one, say so: mm access add <need>`);
  if (dry) {
    console.log('\nWhat MediaMake would be told:');
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }
  if (!usageSetting(env).on) return console.log('\nNot told to MediaMake: usage reports are off (mm usage on).'), 0;
  const at = signedIn(env);
  if (!at) return console.log(`\nNot told to MediaMake: this computer isn't signed in to ${site(env)} (mm login).`), 0;
  const saved = await call('PUT', `${at.url}/api/space/places`, at.key, report);
  if (report.kind === 'cloud') return console.log(`\nIn the register of ${saved.projects?.length ?? 0} project(s): the ones whose space this environment holds.`), 0;
  const state = (await call('GET', `${at.url}/api/space/places`, at.key)).places?.find(p => p.id === saved.place);
  const remote = state?.projects?.length ? await remoteSpaces(env) : null;
  const names = (state?.projects ?? []).map(id => remote?.projects?.find(p => p.projectId === id)?.name ?? id);
  console.log(names.length ? `\nOpen to: ${names.join(', ')}${state.busy ? '   (busy: not used for now; mm access free)' : ''}` : "\nClosed to every project: only you use it. mm access open <project> lets a project's runs use it.");
  return 0;
}

/** Sends the report, then one ask about this computer. */
async function act(env, ask) {
  const at = signedIn(env);
  if (!at) throw new Error(`This computer isn't signed in to ${site(env)}: mm login.`);
  if (!usageSetting(env).on) throw new Error('Usage reports are off, so MediaMake is told nothing about this computer: mm usage on.');
  const saved = await call('PUT', `${at.url}/api/space/places`, at.key, placeReport({ env }));
  return call('POST', `${at.url}/api/space/places`, at.key, { ...ask, place: saved.place });
}

const projectNamed = async (wanted, env) => {
  if (!wanted) throw new Error('Which project? Its name or id.');
  const remote = await remoteSpaces(env);
  if (!remote) throw new Error(`This computer isn't signed in to ${site(env)}: mm login.`);
  return findProject(remote, wanted);
};

async function main(argv = process.argv.slice(2), env = process.env) {
  const flags = argv.filter(a => a.startsWith('--'));
  const [cmd = 'show', ...args] = argv.filter(a => !a.startsWith('--'));
  if (flags.includes('--help') || cmd === 'help') {
    console.log(fs.readFileSync(SELF, 'utf8').match(/\/\*\*\n([\s\S]*?)\*\//)[1].split('\n').map(l => l.replace(/^ \* ?/, '')).join('\n').trim());
    return 0;
  }
  if (cmd === 'show') return show(env, { dry: flags.includes('--dry') });
  if (cmd === 'add' || cmd === 'remove') {
    const need = args[0];
    if (!need || !NEED.test(need) || need === 'render') throw new Error(`mm access ${cmd} <need>: browser:<site>/<account>, app:<name>, key:<name>, mcp:<id> or media:library.`);
    saveDeclared(a => ({ ...a, has: cmd === 'add' ? [...new Set([...a.has, need])] : a.has.filter(n => n !== need) }), env);
    console.log(cmd === 'add' ? `✔ ${need}: this computer has it, on your word. Take it back with mm access remove ${need}.` : `✔ ${need} taken off.`);
    return show(env);
  }
  if (cmd === 'name') {
    const name = args.join(' ').trim();
    if (!name) throw new Error('mm access name "<name>"');
    saveDeclared(a => ({ ...a, name: name.slice(0, 60) }), env);
    return show(env);
  }
  if (cmd === 'limit') {
    const [key, ...rest] = args;
    const text = rest.join(' ').trim();
    if (!key || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(key) || (!text && !flags.includes('--clear'))) throw new Error('mm access limit <key> "<text>"   (mm access limit elevenlabs "unlimited"; --clear removes it)');
    saveDeclared(a => {
      const limits = { ...a.limits };
      if (text) limits[key] = text.slice(0, 80);
      else delete limits[key];
      return { ...a, limits };
    }, env);
    return show(env);
  }
  if (cmd === 'open' || cmd === 'close') {
    if (isCloud(env)) throw new Error("A cloud environment belongs to the projects whose space it holds: it isn't opened or closed.");
    const project = await projectNamed(args.join(' '), env);
    await act(env, { action: cmd, project: project.projectId });
    console.log(cmd === 'open' ? `✔ ${project.name}'s runs may use this computer, with nobody at it, for steps that need no person's yes. mm access close "${project.name}" takes it back; mm access busy pauses it.` : `✔ Closed to ${project.name}.`);
    return 0;
  }
  if (cmd === 'busy' || cmd === 'free') {
    await act(env, { action: cmd });
    console.log(cmd === 'busy' ? '✔ Busy: no project uses this computer until mm access free.' : '✔ Free: the projects it is open to may use it again.');
    return 0;
  }
  if (cmd === 'forget') {
    await act(env, { action: 'forget' });
    console.log('✔ This computer is out of the register. mm access puts it back, closed to every project.');
    return 0;
  }
  if (cmd === 'project') {
    const project = await projectNamed(args.join(' '), env);
    const at = signedIn(env);
    const view = await call('GET', `${at.url}/api/space/places?project=${project.projectId}`, at.key);
    console.log(`${project.name}: where its steps can run`);
    for (const p of view.places) console.log(`  ${p.status === 'open' ? '✔' : p.status === 'busy' ? '⏸' : '✖'} ${p.name}${p.kind === 'cloud' ? ' (cloud)' : ''}: ${p.status}${p.mine ? ', yours' : ''} · ${p.can.map(c => c.need).join(', ') || 'nothing reported'}`);
    if (!view.places.length) console.log('  No place yet: mm access open <project> on a computer, or mm cloud in a cloud session with its space.');
    for (const n of view.needs) console.log(`  ${n.places.length ? '✔' : '✖'} ${n.need} (${n.usedBy.join(', ')}): ${n.places.join(', ') || (n.device ? 'no open computer has it' : 'no place has it')}`);
    if (view.unknown.length) console.log(`  No run sheet yet: ${view.unknown.join(', ')}`);
    if (view.admins.length) console.log(`  Looked after by: ${view.admins.join(', ')}`);
    return 0;
  }
  throw new Error(`mm access: no command "${cmd}" (mm access help)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main().then(
    code => (process.exitCode = code),
    error => {
      console.error(`mm access: ${error instanceof Error ? error.message : error}`);
      process.exitCode = 1;
    },
  );
}
