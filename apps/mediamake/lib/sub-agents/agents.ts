/**
 * Sub-agents on the API key, as the app sees them (docs/sub-agents.md). A sub-agent is a headless
 * Claude Code run that `mm agents` starts on a computer or in a cloud session; that place reports
 * the run here as it goes, so one page (/app/sub-agents) shows every run of the account, whichever place
 * it ran in, with what it cost and what was said. The page can answer a run, stop it or start one:
 * that is a command, kept here until the run's place (its runner, or `mm agents watch`) takes it.
 *
 * Pure: what a report and a command may hold, and what the page shows. ./store keeps the records.
 * For admins and Cohort members (AGENTS_TIER), checked on every call.
 *
 * What a place sends is the account's own, shown only to that account. It is cut to size and
 * anything shaped like a key is taken out, here as well as where it was written.
 */
import type { MemberTier } from '@/lib/memberships/tiers';

export const AGENTS_TIER: MemberTier = 'cohort';

export const AGENT_STATES = ['queued', 'running', 'done', 'needs-you', 'blocked', 'capped', 'failed', 'stopped', 'lost'] as const;
export type AgentState = (typeof AGENT_STATES)[number];
const ACTIVE: AgentState[] = ['queued', 'running'];
export const isActive = (state: AgentState) => ACTIVE.includes(state);

/** A place that has said nothing for this long about a run it called running has lost it. */
export const QUIET_MS = 3 * 60 * 1000;
/** `mm agents watch` asks every few seconds: a place that hasn't asked for this long isn't listening. */
export const LISTENING_MS = 45 * 1000;

export const MAX_EVENTS_PER_REPORT = 300;
export const MAX_EVENTS_PER_RUN = 20000;
export const MAX_TURNS = 400;
const TEXT = 6000;

export const EVENT_KINDS = ['you', 'agent', 'tool', 'result', 'end'] as const;
export type AgentEventKind = (typeof EVENT_KINDS)[number];

/** One line of a run's conversation, as the page shows it. */
export interface AgentEvent {
  /** Its place in the run, from 0. */
  seq: number;
  kind: AgentEventKind;
  turn?: number;
  at?: string;
  /** The message, the reply, a tool's input in a line, a tool's result (cut), or how a turn ended. */
  text: string;
  /** The tool, for `tool`. */
  name?: string;
  /** A tool result that was an error. */
  error?: boolean;
  /** For `end`: what the turn cost. */
  cost?: number;
}

export interface AgentTurn {
  n: number;
  at: string;
  startedAt?: string;
  endedAt?: string;
  message: string;
  reply?: string;
  error?: string;
  outcome?: string;
  cost?: number;
  steps?: number;
  ms?: number;
  calls?: number;
  tokens?: { in: number; out: number; cacheRead: number; cacheWrite: number };
  models?: Record<string, number>;
  denied?: string[];
}

export interface AgentRun {
  /** `ag-` and five letters or digits. */
  id: string;
  title: string;
  model: string;
  effort: string;
  mode: string;
  cap: number;
  /** The folder it works in, on its place. */
  cwd: string;
  place: string;
  /** Its Claude session, which `claude --resume` continues. */
  session?: string;
  from?: { session?: string; note?: string };
  state: AgentState;
  created: string;
  updated: string;
  /** What it is doing now, in a line, while it runs. */
  last?: string;
  loaded?: { model?: string; claude?: string; mode?: string; key?: string; tools?: number; mcp?: string[] };
  turns: AgentTurn[];
}

export interface AgentRecord extends AgentRun {
  clientId: string;
  /** When its place last reported it. */
  reportedAt: string;
  /** How many events are kept. */
  events: number;
  cost: number;
}

export const COMMAND_KINDS = ['message', 'stop', 'start'] as const;
export type CommandKind = (typeof COMMAND_KINDS)[number];
export type CommandState = 'queued' | 'done' | 'failed';

export interface AgentCommand {
  /** `cm-` and six letters or digits. */
  id: string;
  clientId: string;
  kind: CommandKind;
  place: string;
  /** The run a message or a stop is for; the run a start made, once it did. */
  run?: string;
  message?: string;
  start?: { task: string; title?: string; model?: string; effort?: string; cap?: number; cwd: string };
  state: CommandState;
  at: string;
  doneAt?: string;
  /** Why it failed, in the place's words. */
  note?: string;
}

export interface AgentPlace {
  clientId: string;
  name: string;
  seenAt: string;
  /** When `mm agents watch` last asked for commands there. */
  listeningAt?: string;
  /** Folders runs were started in there, the latest first: where the page can start one. */
  folders: string[];
  credit?: { total: number; ends?: string };
  defaults?: { model: string; effort: string; cap: number };
}

/* ---------- reading what a place sends ---------- */

const RUN_ID = /^ag-[a-z0-9]{5}$/;
const COMMAND_ID = /^cm-[a-z0-9]{6}$/;
export const runId = (value: unknown): string | null => (typeof value === 'string' && RUN_ID.test(value) ? value : null);
export const commandId = (value: unknown): string | null => (typeof value === 'string' && COMMAND_ID.test(value) ? value : null);

/** Anything shaped like a key, wherever it turned up (a tool that printed a .env). */
const SECRETS = [/sk-ant-[A-Za-z0-9_-]{16,}/g, /\bsk-[A-Za-z0-9]{32,}\b/g, /\bmm_[A-Za-z0-9_-]{24,}\b/g, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, /\bAKIA[0-9A-Z]{16}\b/g, /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g];
export function withoutSecrets(text: string): string {
  let out = text;
  for (const pattern of SECRETS) out = out.replace(pattern, '[key removed]');
  return out;
}

const str = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = withoutSecrets(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
const num = (value: unknown, max = 1e9): number | undefined => (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : undefined);
const iso = (value: unknown): string | undefined => (typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : undefined);
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const placeName = (value: unknown): string | null => {
  const name = typeof value === 'string' ? value.trim() : '';
  return /^[\w .:@-]{1,60}$/.test(name) ? name : null;
};

function turnOf(raw: unknown, i: number): AgentTurn | null {
  const t = obj(raw);
  const at = iso(t.at);
  const message = str(t.message, TEXT);
  if (!at || message === undefined) return null;
  const tokens = obj(t.tokens);
  const models = Object.fromEntries(
    Object.entries(obj(t.models))
      .slice(0, 12)
      .map(([name, cost]) => [name.slice(0, 80).replace(/[.$]/g, '_'), num(cost) ?? 0]),
  );
  return {
    n: i + 1,
    at,
    message,
    ...(iso(t.startedAt) && { startedAt: iso(t.startedAt) }),
    ...(iso(t.endedAt) && { endedAt: iso(t.endedAt) }),
    ...(str(t.reply, TEXT * 2) !== undefined && { reply: str(t.reply, TEXT * 2) }),
    ...(str(t.error, 600) !== undefined && { error: str(t.error, 600) }),
    ...(str(t.outcome, 80) !== undefined && { outcome: str(t.outcome, 80) }),
    ...(num(t.cost, 1e6) !== undefined && { cost: num(t.cost, 1e6) }),
    ...(num(t.steps) !== undefined && { steps: num(t.steps) }),
    ...(num(t.ms) !== undefined && { ms: num(t.ms) }),
    ...(num(t.calls) !== undefined && { calls: num(t.calls) }),
    ...(t.tokens !== undefined && { tokens: { in: num(tokens.in) ?? 0, out: num(tokens.out) ?? 0, cacheRead: num(tokens.cacheRead) ?? 0, cacheWrite: num(tokens.cacheWrite) ?? 0 } }),
    ...(Object.keys(models).length && { models }),
    ...(Array.isArray(t.denied) && { denied: t.denied.slice(0, 20).flatMap(d => str(d, 200) ?? []) }),
  };
}

export interface Report {
  place: string;
  run: AgentRun;
  /** The events that come after the `from` kept so far. */
  from: number;
  events: Omit<AgentEvent, 'seq'>[];
  settings?: Pick<AgentPlace, 'credit' | 'defaults'>;
}

/** A place's report of one run, checked and cut to size; or what is wrong with it. */
export function parseReport(body: unknown): Report | { error: string } {
  const b = obj(body);
  const r = obj(b.run);
  const place = placeName(b.place);
  const id = runId(r.id);
  if (!place) return { error: 'place is the name of the computer or cloud environment' };
  if (!id) return { error: 'run.id is ag-…' };
  const state = AGENT_STATES.find(s => s === r.state);
  const created = iso(r.created);
  if (!state || !created) return { error: 'run.state and run.created are needed' };
  if (!Array.isArray(r.turns) || !r.turns.length || r.turns.length > MAX_TURNS) return { error: `run.turns holds 1 to ${MAX_TURNS} turns` };
  const turns = r.turns.map(turnOf);
  if (turns.some(turn => !turn)) return { error: 'every turn has a time and a message' };
  const loaded = obj(r.loaded);
  const from = obj(r.from);
  const rawEvents = Array.isArray(b.events) ? b.events : [];
  if (rawEvents.length > MAX_EVENTS_PER_REPORT) return { error: `at most ${MAX_EVENTS_PER_REPORT} events a report` };
  const events: Omit<AgentEvent, 'seq'>[] = [];
  for (const raw of rawEvents) {
    const e = obj(raw);
    const kind = EVENT_KINDS.find(k => k === e.kind);
    const text = str(e.text, TEXT);
    if (!kind || text === undefined) return { error: 'every event has a kind and its text' };
    events.push({
      kind,
      text,
      ...(num(e.turn) !== undefined && { turn: num(e.turn) }),
      ...(iso(e.at) && { at: iso(e.at) }),
      ...(str(e.name, 120) !== undefined && { name: str(e.name, 120) }),
      ...(e.error === true && { error: true }),
      ...(num(e.cost, 1e6) !== undefined && { cost: num(e.cost, 1e6) }),
    });
  }
  const settings = settingsOf(b.settings);
  return {
    place,
    from: num(b.from) ?? 0,
    events,
    run: {
      id,
      title: str(r.title, 120) ?? id,
      model: str(r.model, 80) ?? '',
      effort: str(r.effort, 20) ?? '',
      mode: str(r.mode, 40) ?? '',
      cap: num(r.cap, 1e6) ?? 0,
      cwd: str(r.cwd, 400) ?? '',
      place,
      ...(str(r.session, 80) !== undefined && { session: str(r.session, 80) }),
      ...((from.session !== undefined || from.note !== undefined) && { from: { ...(str(from.session, 80) !== undefined && { session: str(from.session, 80) }), ...(str(from.note, 200) !== undefined && { note: str(from.note, 200) }) } }),
      state,
      created,
      updated: iso(r.updated) ?? created,
      ...(str(r.last, 200) !== undefined && { last: str(r.last, 200) }),
      ...(r.loaded !== undefined && {
        loaded: {
          ...(str(loaded.model, 80) !== undefined && { model: str(loaded.model, 80) }),
          ...(str(loaded.claude, 40) !== undefined && { claude: str(loaded.claude, 40) }),
          ...(str(loaded.mode, 40) !== undefined && { mode: str(loaded.mode, 40) }),
          ...(str(loaded.key, 60) !== undefined && { key: str(loaded.key, 60) }),
          ...(num(loaded.tools) !== undefined && { tools: num(loaded.tools) }),
          ...(Array.isArray(loaded.mcp) && { mcp: loaded.mcp.slice(0, 60).flatMap(m => str(m, 80) ?? []) }),
        },
      }),
      turns: turns as AgentTurn[],
    },
    ...(settings && { settings }),
  };
}

/** The credit and the defaults a place counts with, as it sent them. */
function settingsOf(raw: unknown): Report['settings'] {
  const s = obj(raw);
  const credit = obj(s.credit);
  const defaults = obj(s.defaults);
  const total = num(credit.total, 1e7);
  const out = {
    ...(total && { credit: { total, ...(iso(credit.ends) && { ends: iso(credit.ends) }) } }),
    ...(typeof defaults.model === 'string' && { defaults: { model: str(defaults.model, 80) ?? 'opus', effort: str(defaults.effort, 20) ?? 'high', cap: num(defaults.cap, 1e6) ?? 15 } }),
  };
  return Object.keys(out).length ? out : undefined;
}

export interface Poll {
  place: string;
  /** `mm agents watch` is asking: this place takes what the page sends. */
  listening: boolean;
  /** A folder a run could be started in there. */
  folder?: string;
  settings?: Report['settings'];
}

/** A place asking what waits for it. */
export function parsePoll(body: unknown): Poll | { error: string } {
  const b = obj(body);
  const place = placeName(b.place);
  if (!place) return { error: 'place is the name of the computer or cloud environment' };
  const folder = str(b.folder, 400);
  const settings = settingsOf(b.settings);
  return { place, listening: b.listening === true, ...(folder && { folder }), ...(settings && { settings }) };
}

export const spentOn = (run: Pick<AgentRun, 'turns'>): number => Math.round(run.turns.reduce((sum, turn) => sum + (turn.cost ?? 0), 0) * 1e6) / 1e6;

/* ---------- what the page asks for ---------- */

export const MODELS = ['opus', 'fable', 'sonnet', 'haiku'] as const;
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

export type CommandAsk =
  | { kind: 'message'; run: string; message: string }
  | { kind: 'stop'; run: string }
  | { kind: 'start'; place: string; start: NonNullable<AgentCommand['start']> };

/** What the page asked for (answer a run, stop it, start one), checked; or what is wrong with it. */
export function parseCommand(body: unknown): CommandAsk | { error: string } {
  const b = obj(body);
  if (b.kind === 'message' || b.kind === 'stop') {
    const run = runId(b.run);
    if (!run) return { error: 'run is ag-…' };
    if (b.kind === 'stop') return { kind: 'stop', run };
    const message = typeof b.message === 'string' ? b.message.trim() : '';
    if (!message) return { error: 'Write a message first' };
    if (message.length > TEXT) return { error: `A message is at most ${TEXT} characters: put a long brief in a file and name it` };
    return { kind: 'message', run, message };
  }
  if (b.kind === 'start') {
    const place = placeName(b.place);
    const s = obj(b.start);
    const task = typeof s.task === 'string' ? s.task.trim() : '';
    const cwd = typeof s.cwd === 'string' ? s.cwd.trim() : '';
    if (!place) return { error: 'Pick the place it runs in' };
    if (!task) return { error: 'Say what it should do' };
    if (task.length > TEXT * 2) return { error: `A task is at most ${TEXT * 2} characters` };
    if (!cwd || cwd.length > 400) return { error: 'Pick the folder it works in' };
    const model = typeof s.model === 'string' && (MODELS.some(m => m === s.model) || /^claude-[a-z0-9.-]{3,60}$/.test(s.model)) ? s.model : undefined;
    const effort = EFFORTS.find(e => e === s.effort);
    const cap = num(s.cap, 1000);
    if (s.model !== undefined && !model) return { error: `model is one of ${MODELS.join(', ')}, or a full model id` };
    if (s.effort !== undefined && !effort) return { error: `effort is one of ${EFFORTS.join(', ')}` };
    if (s.cap !== undefined && !cap) return { error: 'cap is dollars, up to 1000' };
    const title = typeof s.title === 'string' && s.title.trim() ? s.title.trim().slice(0, 60) : undefined;
    return { kind: 'start', place, start: { task, cwd, ...(title && { title }), ...(model && { model }), ...(effort && { effort }), ...(cap && { cap }) } };
  }
  return { error: 'kind is message, stop or start' };
}

/* ---------- what the page shows ---------- */

export interface RunCard {
  id: string;
  title: string;
  state: AgentState;
  model: string;
  effort: string;
  place: string;
  cost: number;
  cap: number;
  turns: number;
  created: string;
  updated: string;
  last?: string;
  /** A message from the page that its place has not taken yet. */
  waiting?: number;
}

export interface PlaceView {
  name: string;
  listening: boolean;
  seenAt: string;
  folders: string[];
  defaults?: AgentPlace['defaults'];
}

export interface CreditView {
  total: number;
  ends?: string;
  ended: boolean;
  spent: number;
  left: number;
}

export interface AgentsView {
  runs: RunCard[];
  places: PlaceView[];
  credit: CreditView | null;
  spent: number;
  spentToday: number;
  counts: { running: number; waiting: number; needsYou: number };
}

/** The state to show: a run its place stopped reporting, while it called it running, is lost. */
export function stateNow(run: Pick<AgentRecord, 'state' | 'reportedAt'>, now: number = Date.now()): AgentState {
  return isActive(run.state) && now - Date.parse(run.reportedAt) > QUIET_MS ? 'lost' : run.state;
}

export function runCard(run: AgentRecord, queued: AgentCommand[] = [], now: number = Date.now()): RunCard {
  const waiting = queued.filter(c => c.run === run.id && c.state === 'queued' && c.kind === 'message').length;
  return {
    id: run.id,
    title: run.title,
    state: stateNow(run, now),
    model: run.model,
    effort: run.effort,
    place: run.place,
    cost: run.cost,
    cap: run.cap,
    turns: run.turns.length,
    created: run.created,
    updated: run.updated,
    ...(run.last && run.state === 'running' && { last: run.last }),
    ...(waiting && { waiting }),
  };
}

export function agentsView(input: { runs: AgentRecord[]; places: AgentPlace[]; commands: AgentCommand[]; now?: number }): AgentsView {
  const now = input.now ?? Date.now();
  const runs = [...input.runs].sort((a, b) => b.updated.localeCompare(a.updated)).map(run => runCard(run, input.commands, now));
  const spent = Math.round(input.runs.reduce((sum, run) => sum + run.cost, 0) * 1e6) / 1e6;
  const today = new Date(now).toISOString().slice(0, 10);
  const spentToday = Math.round(input.runs.flatMap(run => run.turns).reduce((sum, turn) => sum + ((turn.endedAt ?? turn.at).slice(0, 10) === today ? (turn.cost ?? 0) : 0), 0) * 1e6) / 1e6;
  // the credit is the account's: the place that reported one last says what it is
  const withCredit = [...input.places].filter(place => place.credit).sort((a, b) => b.seenAt.localeCompare(a.seenAt))[0]?.credit;
  const credit = withCredit ? { total: withCredit.total, ...(withCredit.ends && { ends: withCredit.ends }), ended: !!withCredit.ends && now > Date.parse(withCredit.ends), spent, left: Math.max(0, Math.round((withCredit.total - spent) * 100) / 100) } : null;
  return {
    runs,
    places: [...input.places]
      .sort((a, b) => b.seenAt.localeCompare(a.seenAt))
      .map(place => ({ name: place.name, listening: !!place.listeningAt && now - Date.parse(place.listeningAt) < LISTENING_MS, seenAt: place.seenAt, folders: place.folders, ...(place.defaults && { defaults: place.defaults }) })),
    credit,
    spent,
    spentToday,
    counts: {
      running: runs.filter(run => run.state === 'running').length,
      waiting: runs.filter(run => run.state === 'queued').length,
      needsYou: runs.filter(run => run.state === 'needs-you' || run.state === 'capped' || run.state === 'blocked').length,
    },
  };
}

export interface RunView extends RunCard {
  mode: string;
  cwd: string;
  session?: string;
  from?: AgentRun['from'];
  loaded?: AgentRun['loaded'];
  turnsList: AgentTurn[];
  /** Whether its place would take a message now. */
  listening: boolean;
  /** What the page sent that its place has not taken, the oldest first. */
  queued: { id: string; kind: CommandKind; message?: string; at: string }[];
  /** What the page sent that its place could not do, the latest. */
  refused?: { message?: string; note: string; at: string };
}

export function runView(run: AgentRecord, place: AgentPlace | null, commands: AgentCommand[], now: number = Date.now()): RunView {
  const mine = commands.filter(c => c.run === run.id);
  const failed = mine.filter(c => c.state === 'failed' && c.note).sort((a, b) => (b.doneAt ?? b.at).localeCompare(a.doneAt ?? a.at))[0];
  // a refusal older than the run's last word is history
  const refused = failed && (failed.doneAt ?? failed.at) > run.updated ? { ...(failed.message && { message: failed.message }), note: failed.note as string, at: failed.doneAt ?? failed.at } : undefined;
  return {
    ...runCard(run, commands, now),
    mode: run.mode,
    cwd: run.cwd,
    ...(run.session && { session: run.session }),
    ...(run.from && { from: run.from }),
    ...(run.loaded && { loaded: run.loaded }),
    turnsList: run.turns,
    listening: !!place?.listeningAt && now - Date.parse(place.listeningAt) < LISTENING_MS,
    queued: mine.filter(c => c.state === 'queued').sort((a, b) => a.at.localeCompare(b.at)).map(c => ({ id: c.id, kind: c.kind, ...(c.message && { message: c.message }), at: c.at })),
    ...(refused && { refused }),
  };
}
