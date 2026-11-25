#!/usr/bin/env node
/**
 * agents: sub-agents on an Anthropic API key (apps/mediamake/docs/sub-agents.md).
 *
 * A sub-agent is a headless Claude Code run (`claude -p`) that bills an API key instead of the
 * subscription, so API credit turns into real work: it has the same folder, CLAUDE.md, skills, hooks,
 * `mm` and local MCPs as a session on this computer. Each one keeps a record in the workspace
 * (`agents/<id>/run.json`, every message in `events.jsonl`), so it can be followed, costed and
 * continued later.
 *
 *   mm agents                               the sub-agents here: state, cost, what each is doing
 *   mm agents start "<task>"                what would start and the most it can spend (starts nothing)
 *   mm agents start "<task>" --yes          starts it and returns its id (--wait stays until its turn ends)
 *       --file=<brief.md> instead of "<task>" · --title="…" · --model=opus|fable|sonnet|haiku|<id>
 *       --effort=low|medium|high|xhigh|max · --cap=<dollars> · --cwd=<folder> · --from="<what asked for it>"
 *   mm agents show <id> [--full] [--tail=N]  its record and conversation
 *   mm agents wait <id> [--timeout=<min>]    until its turn ends, then its reply
 *   mm agents continue <id> "<message>" [--yes]   the next turn of the same conversation
 *   mm agents stop <id>                      ends the turn it is on
 *   mm agents usage                          what was spent, by day and model, against the credit
 *   mm agents credit [--total=200 --ends=2026-11-29T05:30]   the credit the ledger counts against
 *   mm agents defaults [--model= --effort= --cap= --max= --mode=]   what a run starts with
 *   mm agents watch                         takes what the Sub-agents page sends this place (an answer, a stop, a new run)
 *   mm agents report [on|off]               whether runs are reported to the page (on); mm agents sync sends what it hasn't got
 *
 * Rules it keeps:
 *   - Admins and Cohort members only (the account `mm login` signed in).
 *   - Nothing is spent without --yes: the first run of `start` and `continue` only says what would run.
 *   - The key goes to that one process and nowhere else: ANTHROPIC_API_KEY in the environment (a cloud
 *     environment's variable), else the checkout's .env. It is never printed or written to a record.
 *   - A run that Claude starts without the key is stopped at once: it would use the subscription.
 *   - A sub-agent does not start sub-agents of its own.
 *   - Two run at a time (`max`), the rest wait their turn. A run stops at its cap (`--cap`, $15), and no
 *     run starts after the credit's end or within its last dollars unless --paid says the key may bill.
 *   - Each run is reported to the account's Sub-agents page (/app/sub-agents) as it works: its record and
 *     its conversation, cut to size, with the keys taken out. For that account only. `report off` stops it.
 *   - The page's Send, Stop and New are done by the run's own runner, or by `mm agents watch` when its
 *     owner has it listening. What the signed-in owner sends from the page is their yes.
 *   - Costs are Claude Code's own count, reported when a turn ends. The Console is the bill.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { apiKey, call, configFile, deviceLabel, site } from './usage.mjs';
import { workspaceSetting } from './workspace.mjs';

const SELF = fileURLToPath(import.meta.url);
const TOP = path.resolve(path.dirname(SELF), '..');

export const DEFAULTS = { model: 'opus', effort: 'high', mode: 'auto', cap: 15, max: 2 };
export const MODELS = ['opus', 'fable', 'sonnet', 'haiku'];
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
/** bypassPermissions is taken from the command line only, never from the saved defaults. */
export const MODES = ['auto', 'acceptEdits', 'dontAsk', 'plan', 'manual'];
const ACTIVE = new Set(['queued', 'running']);
const OPEN_TIERS = new Set(['cohort', 'admin']);
/** Dollars of a credit kept back: Claude Code's count runs a little behind the bill. */
const RESERVE = 10;
const ID = /^ag-[a-z0-9]{5}$/;

const expandHome = p => (p === '~' ? os.homedir() : p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p);
const tilde = p => (p.startsWith(os.homedir()) ? `~${p.slice(os.homedir().length)}` : p);
const readJson = file => {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};
/** Written whole or not at all: the runner and a reader never meet a half-written record. */
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Dollars; a sum under a cent keeps its digits, so a small run doesn't read as free. */
const money = n => {
  const v = Number(n) || 0;
  return v > 0 && v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
};
const short = (text, n = 90) => {
  const one = String(text ?? '').replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
};
const when = iso => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ago = iso => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 60 ? `${min}m` : min < 48 * 60 ? `${Math.round(min / 60)}h` : `${Math.round(min / 1440)}d`;
};
const alive = pid => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
};

/* ---------- settings ---------- */

/** Where the records are: `agents/` in the workspace (MM_AGENTS_DIR for the tests). */
export const agentsDir = (env = process.env) => env.MM_AGENTS_DIR ?? path.join(workspaceSetting()?.root ?? path.join(os.homedir(), 'MediaMake'), 'agents');

/** What a run starts with: the defaults, then `agents` in ~/.mediamake/config.json. */
export function settings(env = process.env) {
  const saved = readJson(configFile(env)).agents ?? {};
  const num = (value, fallback) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback);
  return {
    model: typeof saved.model === 'string' && saved.model ? saved.model : DEFAULTS.model,
    effort: EFFORTS.includes(saved.effort) ? saved.effort : DEFAULTS.effort,
    mode: MODES.includes(saved.mode) ? saved.mode : DEFAULTS.mode,
    cap: num(saved.cap, DEFAULTS.cap),
    max: Math.round(num(saved.max, DEFAULTS.max)),
    credit: saved.credit && Number(saved.credit.total) > 0 ? { total: Number(saved.credit.total), ...(saved.credit.ends && { ends: saved.credit.ends }) } : null,
    keyFile: typeof saved.keyFile === 'string' && saved.keyFile ? expandHome(saved.keyFile) : null,
  };
}
const saveSettings = (patch, env = process.env) => {
  const file = configFile(env);
  const config = readJson(file);
  writeJson(file, { ...config, agents: { ...(config.agents ?? {}), ...patch } });
};

const modelOk = model => MODELS.includes(model) || /^claude-[a-z0-9.-]+$/.test(model);

/** NAME=value from a .env's text (export, quotes and a trailing comment allowed), or ''. */
export function envLine(text, name) {
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`));
    if (!m) continue;
    const raw = m[1].trim();
    const quoted = raw.match(/^(['"])(.*)\1/);
    return (quoted ? quoted[2] : raw.replace(/\s+#.*$/, '')).trim();
  }
  return '';
}

/** The checkout this file is in, and the main checkout when that is one of its worktrees (.env lives there). */
const checkouts = (top = TOP) => {
  const main = top.match(/^(.*)[\\/]\.claude[\\/]worktrees[\\/][^\\/]+$/)?.[1];
  return main ? [top, main] : [top];
};

/** The Anthropic key and where it came from, or null. Never printed. */
export function anthropicKey(env = process.env, { top = TOP, keyFile = settings(env).keyFile } = {}) {
  const fromEnv = env.ANTHROPIC_API_KEY?.trim();
  if (fromEnv && !fromEnv.startsWith('${')) return { key: fromEnv, from: 'ANTHROPIC_API_KEY' };
  for (const file of [keyFile, ...checkouts(top).map(dir => path.join(dir, '.env'))].filter(Boolean)) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const key = envLine(text, 'ANTHROPIC_API_KEY');
    if (key) return { key, from: tilde(file) };
  }
  return null;
}

/**
 * The environment a sub-agent's Claude gets: this one's, without what a Claude session puts in its own
 * shell (a run started from inside a session must not take that session's sign-in or think it is its
 * child), and with the key.
 */
export function childEnv(env, key, id) {
  const out = {};
  for (const [name, value] of Object.entries(env)) {
    if (/^(CLAUDECODE$|CLAUDE_CODE_|CLAUDE_AGENT_SDK_|CLAUDE_PID$|CLAUDE_EFFORT$|CLAUDE_PREVIEW_)/.test(name)) continue;
    if (['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'MM_AGENTS_DIR'].includes(name)) continue;
    out[name] = value;
  }
  // a cloud session's machine reaches the network through its proxy
  if (env.CLAUDE_CODE_REMOTE) out.CLAUDE_CODE_REMOTE = env.CLAUDE_CODE_REMOTE;
  out.ANTHROPIC_API_KEY = key;
  // so a sub-agent's own shell knows what it is: it does not start sub-agents of its own
  if (id) out.MM_AGENT_RUN = id;
  return out;
}

/* ---------- who may use it ---------- */

const stateFile = env => path.join(path.dirname(configFile(env)), 'agents-state.json');
const DAY = 24 * 60 * 60 * 1000;

/** Throws unless the signed-in account is an admin or a Cohort member. The answer is kept a day (a week offline). */
export async function mustBeOpen(env = process.env) {
  const url = site(env);
  const key = apiKey(url, env);
  if (!key) throw new Error(`This computer isn't signed in to ${url}: mm login. Sub-agents are for admins and Cohort members.`);
  const file = stateFile(env);
  const kept = readJson(file);
  const age = kept.at && kept.site === url ? Date.now() - new Date(kept.at).getTime() : Infinity;
  let tier = age < DAY ? kept.tier : undefined;
  if (tier === undefined) {
    try {
      const me = await call('GET', `${url}/api/me`, key.key);
      tier = me?.isAdmin ? 'admin' : (me?.tier ?? 'public');
      writeJson(file, { site: url, tier, at: new Date().toISOString() });
    } catch (error) {
      if (age < 7 * DAY) tier = kept.tier;
      else throw new Error(`Could not check this account's membership (${error.message}). Sub-agents are for admins and Cohort members.`);
    }
  }
  if (!OPEN_TIERS.has(tier)) throw new Error(`Sub-agents are for admins and Cohort members; this account is ${tier}.`);
  return tier;
}

/* ---------- records ---------- */

const runFile = (dir, id) => path.join(dir, id, 'run.json');
export const readRun = (dir, id) => {
  const run = readJson(runFile(dir, id));
  return run.id ? run : null;
};
const writeRun = (dir, run) => writeJson(runFile(dir, run.id), { ...run, updated: new Date().toISOString() });

/** Every record, newest first. */
export function allRuns(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir).filter(n => ID.test(n));
  } catch {}
  return names
    .map(id => readRun(dir, id))
    .filter(Boolean)
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
}

/** The state to show: a record left queued or running by a runner that is gone is lost. */
export function stateOf(run) {
  if (!ACTIVE.has(run.state) || alive(run.runner)) return run.state;
  // just written by start or continue: its runner has not signed the record yet
  if (run.state === 'queued' && !run.runner && Date.now() - new Date(run.updated ?? run.created).getTime() < 15000) return 'queued';
  return 'lost';
}
const isActive = run => ACTIVE.has(stateOf(run));

export const spentOn = run => (run.turns ?? []).reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
export const spentAll = runs => runs.reduce((sum, run) => sum + spentOn(run), 0);

/** The credit as it stands: what is left of it, and whether a run may still start on it. */
export function creditNow(credit, spent, now = Date.now()) {
  if (!credit) return null;
  const left = Math.max(0, credit.total - spent);
  const ended = credit.ends ? now > new Date(credit.ends).getTime() : false;
  return { total: credit.total, ends: credit.ends ?? null, spent, left, ended, usable: Math.max(0, left - RESERVE) };
}
const creditLine = c => (c ? `${money(c.left)} left of ${money(c.total)}${c.ends ? (c.ended ? `, which ended ${when(c.ends)}` : `, until ${when(c.ends)}`) : ''}` : 'no credit set (mm agents credit --total=<dollars> --ends=<date>)');

/** Why a run may not start on the credit, or null. --paid lets the key bill past it. */
export function creditStop(c, paid) {
  if (!c || paid) return null;
  if (c.ended) return `The credit ended ${when(c.ends)}: a run now bills the key's own balance. Only on their word: --paid.`;
  if (c.usable <= 0) return `Only ${money(c.left)} of the credit is left by Claude Code's count, which runs behind the bill. Only on their word: --paid.`;
  return null;
}

const newId = dir => {
  for (;;) {
    const id = `ag-${crypto.randomBytes(4).toString('hex').slice(0, 5)}`;
    if (!fs.existsSync(path.join(dir, id))) return id;
  }
};

/** What Claude is told on top of its own prompt: no one answers mid-run, so it ends where a person is needed. */
export const NOTE = id =>
  [
    `You are a MediaMake sub-agent: a headless run started with \`mm agents\` (run ${id}). No one can answer you while you work.`,
    'Decide what the task and the project files let you decide. Where the choice is the user\'s (an approval, a pick between options, a paid step, anything CLAUDE.md says needs their word), stop there and end your reply with the question, plainly, with what you would pick.',
    'A paid call (fal, ElevenLabs, Midjourney, any credit) only when the task gave their yes and a budget for it.',
    'End every reply with one last line: `STATE: done`, `STATE: needs-you` (you asked them something) or `STATE: blocked` (it cannot go on, and why is in the reply).',
  ].join('\n');

/** done, needs-you or blocked, from the reply's last STATE line; done when it has none. */
export function replyState(text) {
  const m = String(text ?? '').match(/^\s*STATE:\s*(done|needs-you|blocked)\s*$/im);
  return m ? m[1].toLowerCase() : 'done';
}
const withoutState = text => String(text ?? '').replace(/^\s*STATE:\s*(done|needs-you|blocked)\s*$/gim, '').trim();

const toolBrief = (name, input = {}) => {
  const pick = input.command ?? input.file_path ?? input.skill ?? input.pattern ?? input.url ?? input.description ?? input.prompt ?? Object.values(input).find(v => typeof v === 'string') ?? '';
  return `${name}${pick ? `: ${short(pick, 100)}` : ''}`;
};

/**
 * What one turn cost. Claude's result counts the whole conversation so far (a resumed one starts from
 * what its earlier turns cost), so a turn is the result less the turn before it. `total` and
 * `modelTotals` keep the counts as Claude gave them; a count below the last one started again from zero.
 */
export function turnCost(result, before) {
  if (!result) return { cost: 0, models: {} };
  const total = Number(result.total_cost_usd) || 0;
  const modelTotals = Object.fromEntries(Object.entries(result.modelUsage ?? {}).map(([name, m]) => [name, Number(m?.costUSD) || 0]));
  const goesOn = !!before && total >= before.total;
  const less = (now, was) => Math.max(0, Math.round((now - (goesOn ? was : 0)) * 1e6) / 1e6);
  return {
    cost: less(total, before?.total ?? 0),
    models: Object.fromEntries(Object.entries(modelTotals).map(([name, cost]) => [name, less(cost, before?.modelTotals?.[name] ?? 0)]).filter(([, cost]) => cost > 0)),
    total,
    modelTotals,
  };
}

/* ---------- reporting: the run as the Sub-agents page shows it ---------- */

/** Whether runs are reported to MediaMake (`mm agents report off` keeps them on this computer only). */
export const reporting = (env = process.env) => {
  const value = readJson(configFile(env)).agents?.report;
  return !(value === false || value === 'off');
};

const KEY_SHAPES = [/sk-ant-[A-Za-z0-9_-]{16,}/g];
/** `text` without the keys this process holds, or anything shaped like an Anthropic key. */
export function scrub(text, secrets = []) {
  let out = String(text);
  for (const secret of secrets) if (secret && secret.length >= 8) out = out.split(secret).join('[key removed]');
  for (const shape of KEY_SHAPES) out = out.replace(shape, '[key removed]');
  return out;
}

const cut = (text, n) => {
  const s = String(text ?? '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const toolInput = (input = {}) => cut(input.command ?? input.file_path ?? input.skill ?? input.pattern ?? input.url ?? input.prompt ?? input.description ?? JSON.stringify(input), 600);

/** One line Claude printed, as the lines the page shows: your message, its words, a tool and its result, how a turn ended. */
export function displayEvents(ev, turn) {
  if (ev.type === 'mm_turn') return [{ kind: 'you', turn: ev.turn, at: ev.at, text: cut(ev.message, 6000) }];
  const out = [];
  if (ev.type === 'assistant') {
    for (const block of ev.message?.content ?? []) {
      if (block.type === 'text' && withoutState(block.text)) out.push({ kind: 'agent', turn, text: cut(withoutState(block.text), 6000) });
      if (block.type === 'tool_use') out.push({ kind: 'tool', turn, name: String(block.name ?? 'tool').slice(0, 120), text: toolInput(block.input) });
    }
  } else if (ev.type === 'user') {
    for (const block of Array.isArray(ev.message?.content) ? ev.message.content : []) {
      if (block.type !== 'tool_result') continue;
      const body = typeof block.content === 'string' ? block.content : (block.content ?? []).map(c => c.text ?? `[${c.type}]`).join('\n');
      out.push({ kind: 'result', turn, text: cut(body.trim(), 1500), ...(block.is_error && { error: true }) });
    }
  } else if (ev.type === 'result') {
    out.push({ kind: 'end', turn, text: `${ev.subtype === 'success' ? 'ended' : String(ev.subtype ?? 'ended').replace(/^error_/, '').replace(/_/g, ' ')} · ${ev.num_turns ?? '?'} steps · ${Math.round((ev.duration_ms ?? 0) / 1000)} s` });
  }
  return out;
}

/** The whole lines of `file` from byte `offset`, as display events: at most `limit` of them, and where the next read starts. */
export function readNew(file, { offset = 0, turn = 0 } = {}, limit = 250) {
  let buffer;
  try {
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    buffer = Buffer.alloc(Math.max(0, Math.min(size - offset, 4 * 1024 * 1024)));
    fs.readSync(fd, buffer, 0, buffer.length, offset);
    fs.closeSync(fd);
  } catch {
    return { events: [], offset, turn, more: false };
  }
  const events = [];
  let at = 0;
  for (;;) {
    const end = buffer.indexOf(10, at);
    if (end < 0) break;
    let ev = null;
    try {
      ev = JSON.parse(buffer.subarray(at, end).toString('utf8'));
    } catch {}
    const made = ev ? displayEvents(ev, turn) : [];
    if (events.length && events.length + made.length > limit) return { events, offset: offset + at, turn, more: true };
    if (ev?.type === 'mm_turn') turn = ev.turn;
    events.push(...made.map(e => (e.kind === 'you' ? e : { ...e, turn })));
    at = end + 1;
  }
  return { events, offset: offset + at, turn, more: false };
}

const mediamake = env => {
  const url = site(env);
  const key = apiKey(url, env);
  return key ? { url, key: key.key } : null;
};

/** What this place counts with, for the page: the credit and what a run starts with. */
const placeSettings = env => {
  const set = settings(env);
  return { ...(set.credit && { credit: set.credit }), defaults: { model: set.model, effort: set.effort, cap: set.cap } };
};

/**
 * Sends a run to MediaMake as it is now, with the lines the page has not got yet, and answers what
 * the page asked this place to do. Null when reporting is off or this place isn't signed in.
 * `all` keeps going until every line is sent.
 */
export async function report(env, dir, id, { all = false } = {}) {
  if (!reporting(env)) return null;
  const at = mediamake(env);
  const run = readRun(dir, id);
  if (!at || !run) return null;
  const folder = path.join(dir, id);
  const syncFile = path.join(folder, 'sync.json');
  const secrets = [at.key, anthropicKey(env)?.key];
  let sync = { offset: 0, seq: 0, turn: 0, ...readJson(syncFile) };
  let commands = [];
  for (let round = 0; round < (all ? 400 : 2); round++) {
    const fresh = sync.full ? { events: [], offset: sync.offset, turn: sync.turn, more: false } : readNew(path.join(folder, 'events.jsonl'), sync);
    const { task: _task, runner: _runner, pid: _pid, ...rest } = run;
    const body = { action: 'report', place: run.place, run: { ...rest, state: stateOf(run) }, from: sync.seq, events: fresh.events, settings: placeSettings(env) };
    const answer = await call('POST', `${at.url}/api/sub-agents`, at.key, JSON.parse(scrub(JSON.stringify(body), secrets)), { timeoutMs: 15000 });
    commands = answer?.commands ?? [];
    const have = Number(answer?.have) || 0;
    if (have === sync.seq + fresh.events.length) sync = { offset: fresh.offset, seq: have, turn: fresh.turn };
    else if (have === sync.seq) sync = { ...sync, full: have >= 20000 }; // it took none: the page keeps no more lines of a run this long
    else sync = { offset: 0, seq: 0, turn: 0, ...seek(path.join(folder, 'events.jsonl'), have) }; // out of step: go on from what it has
    writeJson(syncFile, { ...sync, updated: run.updated, state: stateOf(run) });
    if (!fresh.more || sync.full) break;
  }
  return commands;
}

/** Where in `file` the event numbered `have` starts (the end of the file when it has fewer). */
function seek(file, have) {
  let at = { offset: 0, turn: 0 };
  let seq = 0;
  while (seq < have) {
    const next = readNew(file, at, Math.min(250, have - seq));
    if (!next.events.length) break;
    seq += next.events.length;
    at = { offset: next.offset, turn: next.turn };
  }
  return { ...at, seq: have };
}

/** Tells MediaMake a command from the page was done here, or why it could not be. */
async function settle(env, command, done, more = {}) {
  const at = mediamake(env);
  if (!at) return;
  await call('POST', `${at.url}/api/sub-agents`, at.key, { action: 'settle', command, done, ...more }).catch(() => null);
}

/* ---------- the runner: one turn of one run, in its own process ---------- */

/** Whether `run` may leave the queue: fewer than `max` are running, and no run has waited longer. */
export function mayGo(run, runs, max) {
  const others = runs.filter(r => r.id !== run.id && isActive(r));
  if (others.filter(r => r.state === 'running').length >= max) return false;
  const since = r => `${r.turns?.at(-1)?.at ?? r.created} ${r.id}`;
  return !others.some(r => r.state === 'queued' && since(r) < since(run));
}

/**
 * A run's turns, one after another, in its own process: the turn it was started for, then any
 * message the page sent while it worked. It reports as it goes, one report at a time.
 */
async function runTurn(id, env = process.env) {
  const dir = agentsDir(env);
  if (!readRun(dir, id)) throw new Error(`No sub-agent ${id} in ${tilde(dir)}.`);
  let line = Promise.resolve(null);
  const tell = more => (line = line.then(() => report(env, dir, id, more)).catch(() => null));
  for (;;) {
    await oneTurn(dir, id, env, tell);
    const commands = (await tell({ all: true })) ?? [];
    // a stop that arrived as it ended has nothing left to stop
    for (const late of commands.filter(c => c.kind === 'stop' && c.run === id)) await settle(env, late.id, true);
    const next = commands.find(c => c.kind === 'message' && c.run === id);
    if (!next) return;
    try {
      writeRun(dir, turnAfter(readRun(dir, id), next.message, { credit: creditNow(settings(env).credit, spentAll(allRuns(dir))) }));
      await settle(env, next.id, true);
    } catch (error) {
      await settle(env, next.id, false, { note: error.message });
      return;
    }
  }
}

async function oneTurn(dir, id, env, tell) {
  let run = readRun(dir, id);
  const at = path.join(dir, id);
  const stopFile = path.join(at, 'stop');
  const turn = run.turns.at(-1);
  const save = patch => {
    run = { ...run, ...patch };
    writeRun(dir, run);
  };
  const end = (state, more = {}) => {
    Object.assign(turn, { endedAt: new Date().toISOString(), ...more });
    save({ state, pid: null, runner: null, last: null, cost: spentOn(run) });
    fs.rmSync(stopFile, { force: true });
  };

  save({ runner: process.pid, state: 'queued' });
  tell();
  while (!mayGo(run, allRuns(dir), settings(env).max)) {
    if (fs.existsSync(stopFile)) return end('stopped', { outcome: 'stopped before it started' });
    await sleep(Number(env.MM_AGENTS_POLL_MS) || 3000);
  }

  const key = anthropicKey(env);
  if (!key) return end('failed', { error: 'No Anthropic API key: ANTHROPIC_API_KEY in the environment, or in the checkout\'s .env.' });
  const first = run.turns.length === 1;
  const left = Math.max(0.01, run.cap - spentOn(run));
  const dirs = [workspaceSetting()?.root, ...(run.addDirs ?? [])].filter(d => d && fs.existsSync(d) && path.resolve(d) !== path.resolve(run.cwd));
  const prompt = turn.message.startsWith('-') ? ` ${turn.message}` : turn.message;
  const args = [
    '-p', prompt,
    '--output-format', 'stream-json', '--verbose',
    '--model', run.model, '--effort', run.effort,
    '--permission-mode', run.mode,
    '--max-budget-usd', left.toFixed(4),
    ...(first ? ['--session-id', run.session] : ['--resume', run.session]),
    '--append-system-prompt', NOTE(id),
    ...(dirs.length ? ['--add-dir', ...dirs] : []),
  ];
  fs.appendFileSync(path.join(at, 'events.jsonl'), `${JSON.stringify({ type: 'mm_turn', turn: turn.n, at: new Date().toISOString(), message: turn.message })}\n`);

  let child;
  try {
    child = spawn(env.MM_AGENTS_CLAUDE || 'claude', args, { cwd: run.cwd, env: childEnv(env, key.key, id), stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return end('failed', { error: `Could not start claude: ${error.message}` });
  }
  const started = Date.now();
  turn.startedAt = new Date(started).toISOString();
  save({ state: 'running', pid: child.pid });

  const events = fs.createWriteStream(path.join(at, 'events.jsonl'), { flags: 'a' });
  const errors = fs.createWriteStream(path.join(at, 'stderr.log'), { flags: 'a' });
  let errTail = '';
  child.stderr.on('data', chunk => {
    errors.write(chunk);
    errTail = (errTail + chunk).slice(-600);
  });
  let result = null;
  let noKey = false;
  let wrote = 0;
  turn.calls = 0;
  // the page hears of it every few seconds, and a stop from the page ends the turn
  const telling = setInterval(async () => {
    const stopIt = ((await tell()) ?? []).find(c => c.kind === 'stop' && c.run === id);
    if (!stopIt || fs.existsSync(stopFile)) return;
    fs.writeFileSync(stopFile, `${new Date().toISOString()}\n`);
    child.kill('SIGTERM');
    await settle(env, stopIt.id, true);
  }, Number(env.MM_AGENTS_REPORT_MS) || 4000);
  const secrets = [key.key, mediamake(env)?.key];
  const lines = readline.createInterface({ input: child.stdout });
  lines.on('line', raw => {
    if (!raw.trim()) return;
    // a tool that printed a .env would otherwise leave the key in the record
    const line = scrub(raw, secrets);
    events.write(`${line}\n`);
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === 'system' && ev.subtype === 'init') {
      run.loaded = {
        model: ev.model,
        claude: ev.claude_code_version,
        mode: ev.permissionMode,
        key: ev.apiKeySource,
        tools: ev.tools?.length,
        mcp: (ev.mcp_servers ?? []).map(s => (s.status && s.status !== 'connected' ? `${s.name} (${s.status})` : s.name)),
      };
      // a run that did not take the key would spend the subscription: end it before it does
      if (ev.apiKeySource === 'none') {
        noKey = true;
        child.kill('SIGTERM');
      }
    } else if (ev.type === 'assistant') {
      for (const block of ev.message?.content ?? []) {
        if (block.type === 'text' && block.text?.trim()) run.last = short(block.text);
        if (block.type === 'tool_use') {
          turn.calls += 1;
          run.last = toolBrief(block.name, block.input);
        }
      }
    } else if (ev.type === 'result') {
      result = ev;
    }
    if (Date.now() - wrote > 1500 || ev.type === 'result') {
      wrote = Date.now();
      save({});
    }
  });

  const [code, signal] = await new Promise(resolve => {
    child.on('error', error => {
      errTail += ` ${error.message}`;
      resolve([1, null]);
    });
    child.on('close', (c, s) => resolve([c, s]));
  });
  clearInterval(telling);
  await new Promise(resolve => events.end(resolve));
  errors.end();

  const u = result?.usage ?? {};
  const facts = {
    ms: Date.now() - started,
    ...turnCost(result, run.turns.slice(0, -1).findLast(t => t.total !== undefined)),
    steps: result?.num_turns ?? null,
    tokens: { in: u.input_tokens ?? 0, out: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 },
    ...(result?.permission_denials?.length && { denied: result.permission_denials.map(d => toolBrief(d.tool_name ?? 'tool', d.tool_input)).slice(0, 20) }),
  };
  if (noKey) return end('failed', { ...facts, error: 'Claude did not take the API key, so this run would have used the subscription. It was stopped.' });
  if (fs.existsSync(stopFile)) return end('stopped', { ...facts, outcome: 'stopped' });
  if (result?.subtype === 'error_max_budget_usd') return end('capped', { ...facts, outcome: 'cap', reply: `It reached its cap of ${money(run.cap)} before it finished. mm agents continue ${id} "carry on" --cap=<more> goes on from where it stopped.` });
  if (!result || result.is_error || code !== 0) {
    return end('failed', { ...facts, outcome: result?.subtype ?? null, error: short(result?.result || errTail || `claude ended with ${signal ?? `code ${code}`} and no result`, 500) });
  }
  return end(replyState(result.result), { ...facts, outcome: 'success', reply: withoutState(result.result) });
}

const startRunner = (id, cwd, env) => {
  const child = spawn(process.execPath, [SELF, '_run', id], { cwd, env: { ...env, MM_AGENTS_DIR: agentsDir(env) }, detached: true, stdio: 'ignore' });
  child.unref();
  return child.pid;
};

/* ---------- commands ---------- */

const MARK = { queued: '◌', running: '●', done: '✔', 'needs-you': '◆', blocked: '■', capped: '◆', failed: '✖', stopped: '□', lost: '✖' };
const SAYS = { queued: 'waiting', running: 'running', done: 'done', 'needs-you': 'needs you', blocked: 'blocked', capped: 'at its cap', failed: 'failed', stopped: 'stopped', lost: 'lost' };

const place = env => (env.CLAUDE_CODE_REMOTE === 'true' ? env.MEDIAMAKE_PLACE?.trim() || 'cloud' : deviceLabel(env));

function parse(argv) {
  const words = [];
  const flags = new Map();
  for (const arg of argv) {
    const m = arg.match(/^--([a-z][a-z-]*)(?:=([\s\S]*))?$/);
    if (m) flags.set(m[1], m[2] ?? true);
    else words.push(arg);
  }
  return { words, has: name => flags.has(name), flag: name => (typeof flags.get(name) === 'string' ? flags.get(name) : undefined) };
}

const idOf = (dir, raw) => {
  const id = String(raw ?? '').trim().toLowerCase();
  if (!ID.test(id)) throw new Error('Which sub-agent? Its id: ag-… (mm agents lists them).');
  const run = readRun(dir, id);
  if (!run) throw new Error(`No sub-agent ${id} in ${tilde(dir)}.`);
  return run;
};

/** A sub-agent does not start or continue sub-agents: one level, so spending stays where the user can see it. */
const notInside = env => {
  if (env.MM_AGENT_RUN) throw new Error(`This is the sub-agent ${env.MM_AGENT_RUN}: a sub-agent does not start others. Say what you need in your reply instead.`);
};

/** The task's words: --file=<brief> or the first word given. */
const taskOf = (words, flag, what = 'task') => {
  const file = flag('file');
  const text = (file ? fs.readFileSync(path.resolve(process.env.INIT_CWD ?? process.cwd(), expandHome(file)), 'utf8') : (words[0] ?? '')).trim();
  if (!text) throw new Error(`What is the ${what}? In quotes, or --file=<a text file>.`);
  return text;
};

const capOf = (flag, fallback) => {
  if (flag('cap') === undefined) return fallback;
  const cap = Number(String(flag('cap')).replace(/^\$/, ''));
  if (!Number.isFinite(cap) || cap <= 0) throw new Error('--cap is dollars, e.g. --cap=15.');
  return cap;
};

function header(runs, env) {
  const set = settings(env);
  const shown = runs.map(stateOf);
  const count = s => shown.filter(x => x === s).length;
  const c = creditNow(set.credit, spentAll(runs));
  const parts = [`${count('running')} running`, count('queued') && `${count('queued')} waiting`, (count('needs-you') + count('capped')) && `${count('needs-you') + count('capped')} need you`].filter(Boolean);
  return `Sub-agents on ${place(env)} · ${parts.join(', ')} · ${money(spentAll(runs))} spent · ${creditLine(c)}`;
}

function list(env, { has }) {
  const dir = agentsDir(env);
  const runs = allRuns(dir);
  if (has('json')) return console.log(JSON.stringify(runs.map(run => ({ ...run, state: stateOf(run), cost: spentOn(run) })), null, 2));
  console.log(header(runs, env));
  if (!runs.length) return console.log(`\nNone yet: mm agents start "<task>" says what a run would cost before it starts.`);
  const shown = has('all') ? runs : runs.filter((run, i) => i < 20 || isActive(run));
  console.log('');
  for (const run of shown) {
    const state = stateOf(run);
    const doing = state === 'running' ? run.last : state === 'failed' || state === 'lost' ? run.turns.at(-1)?.error : null;
    console.log(`  ${MARK[state] ?? '·'} ${run.id}  ${(SAYS[state] ?? state).padEnd(10)} ${short(run.title, 34).padEnd(34)} ${`${run.model}·${run.effort}`.padEnd(12)} ${money(spentOn(run)).padStart(7)}  ${ago(run.updated ?? run.created).padStart(4)}${doing ? `  ${short(doing, 60)}` : ''}`);
  }
  if (shown.length < runs.length) console.log(`\n  ${runs.length - shown.length} older: mm agents --all`);
  console.log(`\nmm agents show <id> for its conversation · continue <id> "<message>" to answer or go on`);
}

/** Writes a new run's record and starts its runner. Whoever calls has checked the account, the key and the credit. */
function launch(env, dir, { task, title, model, effort, mode, cap, cwd, note }) {
  const now = new Date().toISOString();
  const run = {
    id: newId(dir),
    title,
    task,
    model,
    effort,
    mode,
    cap,
    cwd,
    place: place(env),
    session: crypto.randomUUID(),
    from: { ...(env.CLAUDE_CODE_SESSION_ID && { session: env.CLAUDE_CODE_SESSION_ID }), ...(note && { note: short(note, 120) }) },
    state: 'queued',
    created: now,
    turns: [{ n: 1, at: now, message: task }],
  };
  writeRun(dir, run);
  startRunner(run.id, cwd, env);
  return run;
}

/** `run` with its next turn waiting, or an Error saying why it can't go on: still working, never started, its cap spent, the credit over. */
export function turnAfter(run, message, { cap = run.cap, credit = null, paid = false } = {}) {
  const state = stateOf(run);
  if (ACTIVE.has(state)) throw new Error(`${run.id} is still ${SAYS[state]}: mm agents wait ${run.id}, or mm agents stop ${run.id} first.`);
  if (!run.loaded && state !== 'stopped') throw new Error(`${run.id} never started a conversation (${run.turns.at(-1)?.error ?? state}): start a new one.`);
  if (cap - spentOn(run) <= 0) throw new Error(`${run.id} has spent its cap of ${money(run.cap)}: --cap=<a higher total> lets it go on.`);
  const stop = creditStop(credit, paid);
  if (stop) throw new Error(stop);
  const now = new Date().toISOString();
  // a stopped first turn that never reached Claude starts the conversation instead of resuming one
  const turns = run.loaded ? [...run.turns, { n: run.turns.length + 1, at: now, message }] : [{ n: 1, at: now, message: `${run.task}\n\n${message}` }];
  return { ...run, cap, state: 'queued', runner: null, pid: null, turns };
}

async function start(env, { words, has, flag }) {
  const dir = agentsDir(env);
  const set = settings(env);
  const task = taskOf(words, flag);
  const model = flag('model') ?? set.model;
  const effort = flag('effort') ?? set.effort;
  const mode = flag('mode') ?? set.mode;
  if (!modelOk(model)) throw new Error(`--model is one of ${MODELS.join(', ')}, or a full model id (claude-…).`);
  if (!EFFORTS.includes(effort)) throw new Error(`--effort is one of ${EFFORTS.join(', ')}.`);
  if (![...MODES, 'bypassPermissions'].includes(mode)) throw new Error(`--mode is one of ${MODES.join(', ')}.`);
  const cwd = path.resolve(process.env.INIT_CWD ?? process.cwd(), expandHome(flag('cwd') ?? '.'));
  if (!fs.existsSync(cwd)) throw new Error(`No folder ${tilde(cwd)}.`);
  const title = short(flag('title') ?? task.split(/\r?\n/)[0], 60);
  const runs = allRuns(dir);
  const c = creditNow(set.credit, spentAll(runs));
  let cap = capOf(flag, set.cap);
  const lowered = c && !has('paid') && !c.ended && c.usable > 0 && cap > c.usable;
  if (lowered) cap = Math.floor(c.usable * 100) / 100;
  const running = runs.filter(r => stateOf(r) === 'running').length;
  const waiting = runs.filter(r => stateOf(r) === 'queued').length;
  const key = anthropicKey(env);
  const stop = creditStop(c, has('paid'));

  if (!has('yes')) {
    console.log(`Would start a sub-agent on the API key:
  task     ${short(task, 100)}
  model    ${model} · ${effort} effort · ${mode} permissions
  folder   ${tilde(cwd)}
  cap      ${money(cap)} at most for this run${lowered ? ' (lowered to what the credit has left)' : ''}
  credit   ${creditLine(c)}
  key      ${key ? `from ${key.from}` : 'NOT FOUND: ANTHROPIC_API_KEY in the environment, or in the checkout\'s .env'}
  now      ${running} of ${set.max} running${running >= set.max || waiting ? `, ${waiting} waiting: it would wait its turn` : ': it would start at once'}
  record   agents/ in the workspace${reporting(env) && mediamake(env) ? ', and your Sub-agents page' : ''}
${stop ? `\n! ${stop}\n` : ''}
Ask: Start a sub-agent on ${model} (${effort}) for "${title}", spending up to ${money(cap)} of the API ${c && !c.ended ? 'credit' : 'key\'s balance'}?
Nothing was started: add --yes after they agree.`);
    return;
  }

  notInside(env);
  await mustBeOpen(env);
  if (!key) throw new Error('No Anthropic API key: set ANTHROPIC_API_KEY in the environment, or in the checkout\'s .env.');
  if (stop) throw new Error(stop);
  const bin = env.MM_AGENTS_CLAUDE || 'claude';
  if (spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 20000 }).status !== 0) throw new Error(`Claude Code isn't installed here (${bin} --version failed): npm i -g @anthropic-ai/claude-code.`);

  const { id } = launch(env, dir, { task, title, model, effort, mode, cap, cwd, note: flag('from') });
  console.log(`✔ Started ${id} · "${title}" · ${model} ${effort} · cap ${money(cap)}${running >= set.max || waiting ? ' · waiting its turn' : ''}`);
  if (has('wait')) return wait(env, { words: [id], has, flag });
  console.log(`  mm agents show ${id} follows it · mm agents wait ${id} stays until its turn ends`);
}

async function again(env, { words, has, flag }) {
  const dir = agentsDir(env);
  const set = settings(env);
  const run = idOf(dir, words[0]);
  const message = taskOf(words.slice(1), flag, 'message');
  const state = stateOf(run);
  if (ACTIVE.has(state)) throw new Error(`${run.id} is still ${SAYS[state]}: mm agents wait ${run.id}, or mm agents stop ${run.id} first.`);
  if (!run.loaded && state !== 'stopped') throw new Error(`${run.id} never started a conversation (${run.turns.at(-1)?.error ?? state}): start a new one.`);
  const cap = capOf(flag, run.cap);
  const spent = spentOn(run);
  const c = creditNow(set.credit, spentAll(allRuns(dir)));
  const stop = cap - spent <= 0 ? `${run.id} has spent its cap of ${money(run.cap)}: --cap=<a higher total> lets it go on.` : creditStop(c, has('paid'));
  if (!has('yes')) {
    console.log(`Would continue ${run.id} · "${run.title}" (${SAYS[state]}, ${run.turns.length} turn${run.turns.length === 1 ? '' : 's'}, ${money(spent)} so far):
  message  ${short(message, 100)}
  model    ${run.model} · ${run.effort} effort
  cap      ${money(cap)} for the whole run: ${money(Math.max(0, cap - spent))} left of it
  credit   ${creditLine(c)}
${stop ? `\n! ${stop}\n` : ''}
Ask: Continue the sub-agent "${run.title}", spending up to ${money(Math.max(0, cap - spent))} more?
Nothing was sent: add --yes after they agree.`);
    return;
  }
  notInside(env);
  await mustBeOpen(env);
  writeRun(dir, turnAfter(run, message, { cap, credit: c, paid: has('paid') }));
  startRunner(run.id, run.cwd, env);
  console.log(`✔ Sent to ${run.id} · "${run.title}"`);
  if (has('wait')) return wait(env, { words: [run.id], has, flag });
  console.log(`  mm agents wait ${run.id} stays until its turn ends`);
}

/* ---------- the page's side: reports, and what the page asks this place to do ---------- */

const PAGE = env => `${site(env)}/app/sub-agents`;

/** Sends every run the page hasn't all of. */
async function sync(env, { quiet = false } = {}) {
  const dir = agentsDir(env);
  if (!reporting(env)) return quiet || console.log('Reporting is off: mm agents report on sends the runs to your Sub-agents page.');
  if (!mediamake(env)) return quiet || console.log(`This computer isn't signed in to ${site(env)}: mm login.`);
  let sent = 0;
  for (const run of allRuns(dir)) {
    const kept = readJson(path.join(dir, run.id, 'sync.json'));
    if (kept.updated === run.updated && kept.state === stateOf(run)) continue;
    await report(env, dir, run.id, { all: true });
    sent += 1;
  }
  if (!quiet) console.log(sent ? `✔ ${sent} sub-agent${sent === 1 ? '' : 's'} sent: ${PAGE(env)}` : `Nothing new to send: ${PAGE(env)}`);
}

function reportSwitch(env, { words }) {
  const to = words[0];
  if (to === 'on' || to === 'off') saveSettings({ report: to }, env);
  else if (to) throw new Error('mm agents report on | off');
  console.log(
    reporting(env)
      ? `Reporting is on: each run goes to your Sub-agents page as it works (${PAGE(env)}), for you only: its title, model, cost, your messages, its replies and each tool call with the start of its result. Never the key. mm agents report off keeps runs on this computer only.`
      : 'Reporting is off: runs stay on this computer, and the Sub-agents page shows none from here. mm agents report on sends them.',
  );
}

/** One thing the page asked this place to do. Its sender is the account's owner, signed in: that is the yes. */
async function obey(env, dir, command) {
  const set = settings(env);
  const credit = creditNow(set.credit, spentAll(allRuns(dir)));
  if (command.kind === 'stop') {
    const run = readRun(dir, command.run);
    if (run && ACTIVE.has(stateOf(run))) {
      fs.writeFileSync(path.join(dir, run.id, 'stop'), `${new Date().toISOString()}\n`);
      if (alive(run.pid)) process.kill(run.pid, 'SIGTERM');
    }
    return { done: true, said: `stopped ${command.run}` };
  }
  if (command.kind === 'message') {
    const run = readRun(dir, command.run);
    if (!run) return { done: false, note: `${command.run} isn't on this place` };
    // its own runner takes the message when the turn ends
    if (ACTIVE.has(stateOf(run))) return null;
    writeRun(dir, turnAfter(run, command.message, { credit }));
    startRunner(run.id, run.cwd, env);
    return { done: true, said: `sent your message to ${run.id} · "${run.title}"` };
  }
  if (command.kind === 'start') {
    const s = command.start ?? {};
    const model = s.model ?? set.model;
    const effort = s.effort ?? set.effort;
    if (!modelOk(model) || !EFFORTS.includes(effort)) return { done: false, note: 'That model or effort is not one this place knows' };
    if (!s.cwd || !fs.existsSync(s.cwd)) return { done: false, note: `No folder ${s.cwd} on this place` };
    if (!anthropicKey(env)) return { done: false, note: 'No Anthropic API key on this place' };
    const stop = creditStop(credit, false);
    if (stop) return { done: false, note: stop.replace(/ Only on their word: --paid\.$/, '') };
    let cap = Number(s.cap) > 0 ? Number(s.cap) : set.cap;
    if (credit && cap > credit.usable) cap = Math.floor(credit.usable * 100) / 100;
    const run = launch(env, dir, { task: s.task, title: short(s.title ?? String(s.task).split(/\r?\n/)[0], 60), model, effort, mode: set.mode, cap, cwd: s.cwd, note: 'the Sub-agents page' });
    return { done: true, run: run.id, said: `started ${run.id} · "${run.title}" · ${model} ${effort} · cap ${money(cap)}` };
  }
  return { done: false, note: `This place doesn't know "${command.kind}": mm update` };
}

/**
 * Takes what the Sub-agents page sends this place (an answer to a run, a stop, a new run), until it
 * is stopped. The owner starts it: while it runs, the page can spend the key here, within each run's
 * cap and the credit. It never passes --paid or a permission mode.
 */
async function watch(env) {
  notInside(env);
  await mustBeOpen(env);
  const at = mediamake(env);
  if (!reporting(env)) throw new Error('Reporting is off, so the page has nothing from this place: mm agents report on.');
  const dir = agentsDir(env);
  const folder = path.resolve(process.env.INIT_CWD ?? process.cwd());
  const every = Number(env.MM_AGENTS_WATCH_MS) || 5000;
  console.log(`Listening for ${PAGE(env)} as ${place(env)}.\nA message, a stop or a new run sent from the page is done here, within each run's cap and the credit. New runs can start in ${tilde(folder)}.\nCtrl+C stops listening; runs that are going carry on.\n`);
  for (;;) {
    try {
      await sync(env, { quiet: true });
      const answer = await call('POST', `${at.url}/api/sub-agents`, at.key, { action: 'poll', place: place(env), listening: true, folder, settings: placeSettings(env) }, { timeoutMs: 15000 });
      for (const command of answer?.commands ?? []) {
        let result;
        try {
          result = await obey(env, dir, command);
        } catch (error) {
          result = { done: false, note: error.message };
        }
        if (!result) continue;
        await settle(env, command.id, result.done, { ...(result.note && { note: result.note }), ...(result.run && { run: result.run }) });
        console.log(`${new Date().toLocaleTimeString('en-GB')}  ${result.done ? `✔ ${result.said}` : `✖ ${command.kind}${command.run ? ` ${command.run}` : ''}: ${result.note}`}`);
      }
    } catch (error) {
      if (/answered 40[13]/.test(error.message)) throw new Error(`MediaMake refused this place (${error.message}): mm login, and sub-agents are for admins and Cohort members.`);
      // the network dropped: try again at the next turn of the loop
    }
    if (env.MM_AGENTS_WATCH_ONCE) return;
    await sleep(every);
  }
}

async function wait(env, { words, flag }) {
  const dir = agentsDir(env);
  let run = idOf(dir, words[0]);
  const until = Date.now() + (Number(flag('timeout')) > 0 ? Number(flag('timeout')) : 120) * 60000;
  while (isActive(run) && Date.now() < until) {
    await sleep(Number(env.MM_AGENTS_POLL_MS) || 2000);
    run = readRun(dir, run.id);
  }
  const state = stateOf(run);
  const turn = run.turns.at(-1);
  if (ACTIVE.has(state)) return console.log(`${run.id} is still ${SAYS[state]}${run.last ? ` (${run.last})` : ''}. mm agents wait ${run.id} again, or mm agents show ${run.id}.`);
  console.log(`${MARK[state]} ${run.id} · "${run.title}" · ${SAYS[state]} · turn ${turn.n}: ${money(turn.cost)}, ${money(spentOn(run))} in all${turn.calls ? ` · ${turn.calls} tool calls` : ''}`);
  if (turn.denied?.length) console.log(`\nNot allowed in this run (${run.mode} permissions):\n${turn.denied.map(d => `  ${d}`).join('\n')}`);
  console.log(`\n${turn.reply ?? turn.error ?? turn.outcome ?? ''}`);
  if (state === 'needs-you' || state === 'capped') console.log(`\nAnswer it: mm agents continue ${run.id} "<your answer>"`);
  if (state === 'failed' || state === 'lost') process.exitCode = 1;
}

/** The conversation as lines, from events.jsonl. */
export function conversation(file, { full = false } = {}) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {}
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === 'mm_turn') out.push('', `── turn ${ev.turn} · ${when(ev.at)}`, `you ›  ${ev.message}`);
    else if (ev.type === 'assistant') {
      for (const block of ev.message?.content ?? []) {
        if (block.type === 'text' && block.text?.trim()) out.push(`agent › ${withoutState(block.text)}`);
        if (block.type === 'tool_use') out.push(`  ▸ ${toolBrief(block.name, block.input)}`);
      }
    } else if (ev.type === 'user' && full) {
      for (const block of Array.isArray(ev.message?.content) ? ev.message.content : []) {
        if (block.type !== 'tool_result') continue;
        const body = typeof block.content === 'string' ? block.content : (block.content ?? []).map(c => c.text ?? `[${c.type}]`).join(' ');
        out.push(`    ${block.is_error ? '✖' : '↳'} ${short(body, 400)}`);
      }
    } else if (ev.type === 'result') out.push(`── ${ev.subtype === 'success' ? 'ended' : ev.subtype} · ${money(ev.total_cost_usd)} · ${ev.num_turns ?? '?'} steps · ${Math.round((ev.duration_ms ?? 0) / 1000)} s`);
  }
  return out;
}

function show(env, { words, has, flag }) {
  const dir = agentsDir(env);
  const run = idOf(dir, words[0]);
  if (has('json')) return console.log(JSON.stringify({ ...run, state: stateOf(run), cost: spentOn(run) }, null, 2));
  const state = stateOf(run);
  console.log(`${MARK[state]} ${run.id} · "${run.title}" · ${SAYS[state]}
  model    ${run.model} · ${run.effort} effort · ${run.mode} permissions
  folder   ${tilde(run.cwd)} · on ${run.place}
  spent    ${money(spentOn(run))} of its ${money(run.cap)} cap · ${run.turns.length} turn${run.turns.length === 1 ? '' : 's'}
  started  ${when(run.created)}${run.from?.note ? ` · for ${run.from.note}` : ''}${run.from?.session ? ` · by session ${run.from.session}` : ''}
  session  ${run.session}${run.loaded ? `\n  loaded   ${run.loaded.tools ?? '?'} tools · MCPs: ${run.loaded.mcp?.join(', ') || 'none'} · key: ${run.loaded.key ?? '?'}` : ''}`);
  let lines = conversation(path.join(dir, run.id, 'events.jsonl'), { full: has('full') });
  const tail = Number(flag('tail'));
  if (tail > 0) lines = lines.slice(-tail);
  console.log(lines.join('\n'));
  const turn = run.turns.at(-1);
  if (turn.error) console.log(`\n✖ ${turn.error}`);
  if (state === 'running' && run.last) console.log(`\n● now: ${run.last}`);
  if (state === 'needs-you' || state === 'capped') console.log(`\nAnswer it: mm agents continue ${run.id} "<your answer>"`);
}

function stop(env, { words }) {
  const dir = agentsDir(env);
  const run = idOf(dir, words[0]);
  const state = stateOf(run);
  if (!ACTIVE.has(state)) return console.log(`${run.id} isn't running (${SAYS[state]}).`);
  fs.writeFileSync(path.join(dir, run.id, 'stop'), `${new Date().toISOString()}\n`);
  if (alive(run.pid)) process.kill(run.pid, 'SIGTERM');
  console.log(`✔ Stopping ${run.id} · "${run.title}". Its conversation is kept: mm agents continue ${run.id} "<message>" goes on from it.`);
}

function usage(env, { has }) {
  const runs = allRuns(agentsDir(env));
  const set = settings(env);
  const days = new Map();
  const models = new Map();
  for (const run of runs) {
    for (const turn of run.turns ?? []) {
      const day = String(turn.endedAt ?? turn.at).slice(0, 10);
      const d = days.get(day) ?? { cost: 0, turns: 0 };
      days.set(day, { cost: d.cost + (Number(turn.cost) || 0), turns: d.turns + 1 });
      for (const [name, cost] of Object.entries(turn.models ?? {})) models.set(name, (models.get(name) ?? 0) + cost);
    }
  }
  const c = creditNow(set.credit, spentAll(runs));
  if (has('json')) return console.log(JSON.stringify({ spent: spentAll(runs), credit: c, days: Object.fromEntries(days), models: Object.fromEntries(models), runs: runs.length }, null, 2));
  console.log(`${money(spentAll(runs))} spent by ${runs.length} sub-agent${runs.length === 1 ? '' : 's'} · ${creditLine(c)}`);
  console.log("These are Claude Code's own counts, added when a turn ends. The Console is the bill.");
  if (days.size) console.log(`\nBy day\n${[...days].sort().map(([day, d]) => `  ${day}  ${money(d.cost).padStart(8)}  ${d.turns} turn${d.turns === 1 ? '' : 's'}`).join('\n')}`);
  if (models.size) console.log(`\nBy model\n${[...models].sort((a, b) => b[1] - a[1]).map(([name, cost]) => `  ${name.padEnd(28)} ${money(cost).padStart(8)}`).join('\n')}`);
  const top = [...runs].sort((a, b) => spentOn(b) - spentOn(a)).slice(0, 5).filter(run => spentOn(run) > 0);
  if (top.length) console.log(`\nMost spent\n${top.map(run => `  ${run.id}  ${money(spentOn(run)).padStart(8)}  ${short(run.title, 50)}`).join('\n')}`);
}

function credit(env, { has, flag }) {
  if (has('clear')) {
    saveSettings({ credit: undefined }, env);
    return console.log('✔ No credit set: runs are counted, with nothing to count against.');
  }
  if (flag('total') !== undefined || flag('ends') !== undefined) {
    const total = Number(String(flag('total') ?? settings(env).credit?.total ?? '').replace(/^\$/, ''));
    if (!Number.isFinite(total) || total <= 0) throw new Error('--total is the credit in dollars, e.g. --total=200.');
    const ends = flag('ends') ? new Date(flag('ends')) : settings(env).credit?.ends ? new Date(settings(env).credit.ends) : null;
    if (ends && Number.isNaN(ends.getTime())) throw new Error('--ends is a date and time, e.g. --ends=2026-11-29T05:30 (this computer\'s time).');
    saveSettings({ credit: { total, ...(ends && { ends: ends.toISOString() }) } }, env);
  }
  console.log(`Credit: ${creditLine(creditNow(settings(env).credit, spentAll(allRuns(agentsDir(env)))))}`);
}

function defaults(env, { flag }) {
  const patch = {};
  if (flag('model') !== undefined) {
    if (!modelOk(flag('model'))) throw new Error(`--model is one of ${MODELS.join(', ')}, or a full model id (claude-…).`);
    patch.model = flag('model');
  }
  if (flag('effort') !== undefined) {
    if (!EFFORTS.includes(flag('effort'))) throw new Error(`--effort is one of ${EFFORTS.join(', ')}.`);
    patch.effort = flag('effort');
  }
  if (flag('mode') !== undefined) {
    if (!MODES.includes(flag('mode'))) throw new Error(`--mode is one of ${MODES.join(', ')}. bypassPermissions is never a default: it is typed for one run.`);
    patch.mode = flag('mode');
  }
  if (flag('cap') !== undefined) patch.cap = capOf(flag, DEFAULTS.cap);
  if (flag('max') !== undefined) {
    const max = Number(flag('max'));
    if (!Number.isInteger(max) || max < 1 || max > 8) throw new Error('--max is how many run at once: 1 to 8.');
    patch.max = max;
  }
  if (Object.keys(patch).length) saveSettings(patch, env);
  const set = settings(env);
  console.log(`A sub-agent starts with: ${set.model} · ${set.effort} effort · ${set.mode} permissions · cap ${money(set.cap)} · ${set.max} at a time`);
}

const HELP = `mm agents: sub-agents on the Anthropic API key (admins and Cohort)

  mm agents                                  the sub-agents here: state, cost, what each is doing
  mm agents start "<task>" [--yes]           what would start and its cap; --yes starts it
      --file=<brief> --title= --model= --effort= --cap= --cwd= --from= --wait
  mm agents show <id> [--full] [--tail=N]    its record and conversation
  mm agents wait <id> [--timeout=<min>]      until its turn ends, then its reply
  mm agents continue <id> "<message>" [--yes] the next turn of the same conversation
  mm agents stop <id>                        ends the turn it is on
  mm agents usage                            what was spent, against the credit
  mm agents credit [--total= --ends=]        the credit the ledger counts against
  mm agents defaults [--model= --effort= --cap= --max= --mode=]
  mm agents watch                            takes what your Sub-agents page sends this place, until Ctrl+C
  mm agents report [on|off] · sync           whether runs go to the page · sends what it hasn't got`;

async function main(argv = process.argv.slice(2), env = process.env) {
  const [cmd, ...rest] = argv;
  if (cmd === '_run') return runTurn(rest[0], env);
  const args = parse(cmd?.startsWith('--') ? argv : rest);
  switch (cmd?.startsWith('--') ? 'list' : (cmd ?? 'list')) {
    case 'list':
      return list(env, args);
    case 'start':
      return start(env, args);
    case 'continue':
      return again(env, args);
    case 'wait':
      return wait(env, args);
    case 'show':
      return show(env, args);
    case 'stop':
      return stop(env, args);
    case 'usage':
      return usage(env, args);
    case 'credit':
      return credit(env, args);
    case 'defaults':
      return defaults(env, args);
    case 'sync':
      return sync(env);
    case 'report':
      return reportSwitch(env, args);
    case 'watch':
      return watch(env);
    case 'help':
      return console.log(HELP);
    default:
      throw new Error(`No "mm agents ${cmd}".\n\n${HELP}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  main().catch(error => {
    console.error(`mm agents: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}
