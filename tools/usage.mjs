#!/usr/bin/env node
/**
 * usage: what this computer tells MediaMake about the skills you use, and the switch that stops it.
 *
 *   mm usage            what is sent, to where, and whether it is on
 *   mm usage off        stop sending (kept in ~/.mediamake/config.json as "usage": "off")
 *   mm usage on         send again
 *   mm usage skills     send the names and versions of the skills on this computer now (--dry: only show them)
 *   mm usage forget     delete everything MediaMake holds of your usage (runs and skill lists)
 *
 * Two things are sent, and only when you are signed in to MediaMake on this computer (MEDIAMAKE_API_KEY,
 * or the key `mm login` keeps in the macOS Keychain, or in the config elsewhere):
 *
 * 1. Each skill run, as the skill's name and the time. Never its arguments, the folder, the session or
 *    any file: those stay in the media library on this computer (tools/skill-runs.mjs). It fills "what
 *    you use most" on your Home.          POST <site>/api/usage/skill-runs  { runs: [{ skill, at }] }
 * 2. Once a day, the names and versions of the skills on this computer (a version is the SKILL.md's
 *    `version`, else a short hash of the SKILL.md). No paths, no contents. It fills "skills on your
 *    computer" under Mine.                PUT  <site>/api/usage/local-skills { device, skills: [{ name, version }] }
 *    `device` is a random label made once on this computer (mac-3f9a), not its name.
 *
 * Off: `mm usage off`, or MEDIAMAKE_USAGE=off in the environment (for one shell or one session).
 * The site is MEDIAMAKE_API_URL, else `url` in ~/.mediamake/config.json, else mediamake.microfox.app.
 *
 * The hook (tools/skill-runs.mjs) starts this file detached with --send-run, so a skill never waits
 * on the network; that mode prints nothing and always exits 0.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspaceSetting } from './workspace.mjs';

export const DEFAULT_SITE = 'https://mediamake.microfox.app';
/** The same rule as the server's (apps/mediamake/lib/usage/usage.ts): a name, never a path. */
export const SKILL_NAME = /^[a-z0-9][a-z0-9._:-]{0,99}$/i;
const KEYCHAIN_SERVICE = 'mediamake-api-key';
const SKILLS_EVERY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

const SELF = fileURLToPath(import.meta.url);
const expandHome = p => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);

export const configFile = (env = process.env) => env.MEDIAMAKE_CONFIG ?? path.join(os.homedir(), '.mediamake', 'config.json');
/** Beside the config: when the skill list last went out, and this computer's random label. */
const stateFile = (env = process.env) => path.join(path.dirname(configFile(env)), 'usage-state.json');

const readJson = file => {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const OFF = new Set(['off', '0', 'false', 'no']);

/** Whether usage is sent, and what decided it. The environment wins over the config. */
export function usageSetting(env = process.env, config = readJson(configFile(env))) {
  const fromEnv = env.MEDIAMAKE_USAGE?.trim().toLowerCase();
  if (fromEnv) return { on: !OFF.has(fromEnv), from: 'MEDIAMAKE_USAGE' };
  const value = config.usage;
  if (value === false || (typeof value === 'string' && OFF.has(value.trim().toLowerCase()))) return { on: false, from: 'config' };
  return { on: true, from: value === undefined ? 'default' : 'config' };
}

/** Turns sending on or off in the config, keeping everything else in it. */
export function saveUsageSetting(on, env = process.env) {
  const file = configFile(env);
  writeJson(file, { ...readJson(file), usage: on ? 'on' : 'off' });
}

export function site(env = process.env, config = readJson(configFile(env))) {
  const url = env.MEDIAMAKE_API_URL?.trim() || (typeof config.url === 'string' && config.url.trim()) || DEFAULT_SITE;
  return url.replace(/\/+$/, '');
}

/** The key this computer is signed in with, or null: MEDIAMAKE_API_KEY, else the Keychain's (macOS), else `apiKey` in the config. Never printed. */
export function apiKey(url, env = process.env) {
  const fromEnv = env.MEDIAMAKE_API_KEY?.trim();
  if (fromEnv && !fromEnv.startsWith('${')) return { key: fromEnv, from: 'MEDIAMAKE_API_KEY' };
  if (process.platform === 'darwin') {
    const r = spawnSync('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', new URL(url).origin, '-w'], { encoding: 'utf8', timeout: 5000 });
    const key = r.status === 0 ? r.stdout.trim() : '';
    if (key) return { key, from: 'Keychain' };
  }
  // where there is no Keychain (Windows, Linux), mm login keeps it in the config, readable by you only
  const saved = readJson(configFile(env)).apiKey;
  return typeof saved === 'string' && saved.trim() ? { key: saved.trim(), from: 'config' } : null;
}

/** A run as it is sent: the skill's name and the time, or null for a name that isn't one. */
export function runReport(skill, at = new Date().toISOString()) {
  const name = typeof skill === 'string' ? skill.trim().replace(/^\//, '') : '';
  if (!SKILL_NAME.test(name) || !Number.isFinite(Date.parse(at))) return null;
  return { runs: [{ skill: name, at: new Date(Date.parse(at)).toISOString() }] };
}

/** `version` (or metadata.version) from a SKILL.md's frontmatter, else a short hash of the file. */
export function skillVersion(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const front = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const stated = front.match(/^\s*version:\s*(.+)$/m)?.[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  if (stated && /^[A-Za-z0-9][A-Za-z0-9._+:-]{0,79}$/.test(stated)) return stated;
  return `sha:${crypto.createHash('sha256').update(text).digest('hex').slice(0, 12)}`;
}

/** Where skills live on this computer: the project's, yours, and your workspace's. */
export function skillRoots(env = process.env) {
  return [
    env.CLAUDE_PROJECT_DIR && path.join(env.CLAUDE_PROJECT_DIR, '.claude', 'skills'),
    path.join(os.homedir(), '.claude', 'skills'),
    workspaceSetting()?.root && path.join(workspaceSetting().root, 'skills'),
  ].filter(Boolean);
}

/** The skills in those folders, as names and versions; the first folder that has a name wins. */
export function localSkills(roots = skillRoots()) {
  const byName = new Map();
  for (const root of roots) {
    let names = [];
    try {
      names = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const name of names) {
      if (byName.has(name) || !SKILL_NAME.test(name)) continue;
      const file = path.join(root, name, 'SKILL.md');
      try {
        if (fs.statSync(file).isFile()) byName.set(name, { name, version: skillVersion(file) });
      } catch {
        // not a skill folder
      }
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** This computer's label: random, made once. Not its hostname. */
export function deviceLabel(env = process.env) {
  const file = stateFile(env);
  const state = readJson(file);
  if (typeof state.device === 'string' && state.device) return state.device;
  const kind = { darwin: 'mac', win32: 'windows' }[process.platform] ?? process.platform;
  const device = `${kind}-${crypto.randomBytes(2).toString('hex')}`;
  writeJson(file, { ...state, device });
  return device;
}

export async function call(method, url, key, body) {
  const res = await fetch(url, {
    method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}`, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) throw new Error(`${new URL(url).pathname} answered ${res.status}${data?.error ? `: ${data.error}` : ''}`);
  return data;
}

/** Sends this computer's skill names and versions. */
export async function sendLocalSkills(url, key, env = process.env) {
  const skills = localSkills(skillRoots(env));
  const saved = await call('PUT', `${url}/api/usage/local-skills`, key, { device: deviceLabel(env), skills });
  const file = stateFile(env);
  writeJson(file, { ...readJson(file), skillsSentAt: new Date().toISOString() });
  return { skills, saved };
}

/**
 * What the hook asks for after a skill ran: starts this file detached and returns at once.
 * Nothing starts when usage is off or the name isn't a skill's. Returns whether it started.
 */
export function sendRunDetached(skill, at, env = process.env) {
  const report = runReport(skill, at);
  if (!report || !usageSetting(env).on) return false;
  const { skill: name, at: when } = report.runs[0];
  const child = spawn(process.execPath, [SELF, '--send-run', name, when], { detached: true, stdio: 'ignore', env });
  child.unref();
  return true;
}

/** --send-run: one run, and the skill list when a day has passed. Quiet: the hook's child has nobody to tell. */
async function sendRun(skill, at) {
  const env = process.env;
  const report = runReport(skill, at);
  if (!report || !usageSetting(env).on) return;
  const url = site(env);
  const signedIn = apiKey(url, env);
  if (!signedIn) return;
  await call('POST', `${url}/api/usage/skill-runs`, signedIn.key, report);
  const last = Date.parse(readJson(stateFile(env)).skillsSentAt ?? '');
  if (!Number.isFinite(last) || Date.now() - last > SKILLS_EVERY_MS) await sendLocalSkills(url, signedIn.key, env);
}

async function main(args) {
  if (args[0] === '--send-run') {
    try {
      await sendRun(args[1], args[2]);
    } catch {
      // offline, signed out, a server without the route: the run is still in the library here
    }
    return 0;
  }

  const [cmd = 'status'] = args.filter(a => !a.startsWith('--'));
  const env = process.env;
  const url = site(env);
  const setting = usageSetting(env);

  if (cmd === 'on' || cmd === 'off') {
    saveUsageSetting(cmd === 'on', env);
    const now = usageSetting(env);
    console.log(`Usage reports are ${cmd} (${configFile(env)}).`);
    if (now.from === 'MEDIAMAKE_USAGE' && now.on !== (cmd === 'on')) console.log(`MEDIAMAKE_USAGE in this shell still says ${now.on ? 'on' : 'off'}, and it wins.`);
    if (cmd === 'off') console.log('What was already sent stays until you run: mm usage forget');
    return 0;
  }

  if (cmd === 'status') {
    const signedIn = apiKey(url, env);
    console.log(`Usage reports: ${setting.on ? 'on' : 'off'} (${setting.from === 'default' ? 'the default' : setting.from})`);
    console.log(`Site:          ${url}`);
    console.log(`Signed in:     ${signedIn ? `yes (${signedIn.from})` : 'no, so nothing is sent'}`);
    console.log('\nWhat is sent: each skill run as its name and the time, and once a day the names and versions of');
    console.log('the skills on this computer. Never arguments, folders, files or what a skill made.');
    console.log(`\n  mm usage ${setting.on ? 'off' : 'on '}      ${setting.on ? 'stop sending' : 'send again'}`);
    console.log('  mm usage skills   send the skill list now (--dry: only show it)');
    console.log('  mm usage forget   delete what MediaMake holds of your usage');
    return 0;
  }

  if (cmd === 'skills') {
    const skills = localSkills(skillRoots(env));
    if (args.includes('--dry')) {
      for (const s of skills) console.log(`${s.name}  ${s.version}`);
      console.log(`\n${skills.length} skills. Nothing was sent.`);
      return 0;
    }
    if (!setting.on) return fail('Usage reports are off (mm usage on turns them on; --dry shows the list without sending).');
    const signedIn = apiKey(url, env);
    if (!signedIn) return fail(`Not signed in to ${url}: run mm login, or set MEDIAMAKE_API_KEY.`);
    const { saved } = await sendLocalSkills(url, signedIn.key, env);
    console.log(`Sent ${saved?.saved ?? skills.length} skill names and versions to ${url} as ${saved?.device ?? deviceLabel(env)}.`);
    return 0;
  }

  if (cmd === 'forget') {
    const signedIn = apiKey(url, env);
    if (!signedIn) return fail(`Not signed in to ${url}: run mm login, or set MEDIAMAKE_API_KEY.`);
    const { forgotten } = await call('DELETE', `${url}/api/usage/skill-runs`, signedIn.key);
    console.log(`Deleted ${forgotten?.runs ?? 0} runs, ${forgotten?.devices ?? 0} skill lists and ${forgotten?.opens ?? 0} app opens from ${url}.`);
    if (setting.on) console.log('Usage reports are still on: mm usage off stops new ones.');
    return 0;
  }

  return fail(`Unknown command "${cmd}". mm usage [status | on | off | skills [--dry] | forget]`);
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
