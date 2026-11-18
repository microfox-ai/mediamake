/**
 * A project's to-do queue: a step one place could not do, posted for a place that can
 * (docs/cloud-device-runs.md). A cloud session that reaches a step needing a computer posts it and
 * ends; someone on the project with a computer that has what the step needs picks it up. Pure: what a
 * to-do may hold, who may change it and what the page shows. ./todo-store keeps the records.
 *
 * Everyone on the project reads a to-do, so its words never hold a key, a password or anything private:
 * `looksSecret` refuses the obvious ones.
 *
 * - `open`: waiting for a place that has what it needs.
 * - `claimed`: one person took it, on one place. Only one claim succeeds, and a claim that is never
 *   finished ends by itself after CLAIM_MS, so the to-do is open again.
 * - `done`: finished, with its result (the video's link).
 * - `failed`: it failed MAX_FAILURES times and waits for a person to look.
 * - `cancelled`: no longer wanted (a newer version replaced it, or someone cancelled it).
 */
import type { ProjectRole } from '@/lib/editor/project-access';
import { needLabel } from './cloud-setup';
import { keyInfo, needList } from './places';
import { accessView, placeHas, type PlaceRecord } from './register';
import { projectId } from './space';

export type TodoState = 'open' | 'claimed' | 'done' | 'failed' | 'cancelled';

/** A claim nobody finished ends after this long: the computer slept, the session died. */
export const CLAIM_MS = 2 * 60 * 60 * 1000;
/** After this many failures a to-do stops being offered and waits for a person. */
export const MAX_FAILURES = 3;
export const MAX_OPTIONS = 6;

export interface TodoRecord {
  /** `td-` and six letters or digits: what the line to paste names. */
  id: string;
  project: string;
  /** Goes up with every change. A change is saved only over the rev it read, so two claims can't both succeed. */
  rev: number;
  /** What to do, in a line: "Upload doomcat-0412 to YouTube". */
  title: string;
  /** More, for whoever picks it up. Never a secret. */
  notes?: string;
  /** The skill whose step this is, and the step as its run sheet names it. */
  skill?: string;
  step?: string;
  /** What it works on, by reference: a production or a release of the project (its slug), which version, and the commit of the space's code. */
  production?: string;
  release?: string;
  version?: string;
  commit?: string;
  /** What the step needs, in the words of ./places: only a place that has them all is offered it. */
  needs: string[];
  /** It must not run until a person on the project agreed. */
  yes?: boolean;
  agreed?: { by: string; at: string };
  /** Running it twice does no harm. Otherwise whoever picks it up first checks it didn't already happen. */
  repeat?: boolean;
  /** A choice only a person can make: it is answered with one of these, not run. */
  options?: string[];
  /** What comes after it: "resume the run in the cloud". */
  then?: string;
  state: TodoState;
  postedBy: string;
  /** The place that posted it, by name: "cloud". */
  postedFrom?: string;
  postedAt: string;
  claim?: { by: string; place?: string; at: string };
  /** What came of it: the video's link, the option picked. */
  result?: string;
  doneBy?: string;
  doneAt?: string;
  /** Why it failed last, or why it was cancelled. */
  reason?: string;
  failures: number;
  updatedAt: string;
}

export const todoIdOf = (value: unknown): string | null => (typeof value === 'string' && /^td-[a-z0-9]{6}$/.test(value.trim().toLowerCase()) ? value.trim().toLowerCase() : null);

/** Words that look like a key, a token or a password: a to-do is read by everyone on the project. */
export const looksSecret = (text: string): boolean =>
  /\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|mm_[A-Za-z0-9]{24,})\b|-----BEGIN [A-Z ]*PRIVATE KEY|\b(password|passwd|secret|api[_ -]?key|token)\s*[:=]\s*\S{6,}/i.test(text);

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
  return clean || undefined;
};
const line = (value: unknown, max: number) => text(typeof value === 'string' ? value.replace(/\s+/g, ' ') : value, max);
const slug = (value: unknown) => (typeof value === 'string' && /^[\w][\w.-]{0,99}$/.test(value.trim()) ? value.trim() : undefined);

/** What a session or a person posts. */
export interface TodoPost {
  project: string;
  title: string;
  notes?: string;
  skill?: string;
  step?: string;
  production?: string;
  release?: string;
  version?: string;
  commit?: string;
  needs: string[];
  yes?: boolean;
  repeat?: boolean;
  options?: string[];
  then?: string;
  postedFrom?: string;
}

/**
 * A post: `{ project, title, needs: ["mcp:browse-hack", "browser:youtube/doomcat"], skill?, step?,
 * production?, release?, version?, commit?, notes?, yes?, repeat?, options?, then?, from? }`. Only these
 * are read, of `needs` only the known words, and nothing that looks like a secret is kept.
 */
export function parseTodoPost(body: unknown): TodoPost | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const project = projectId(b.project);
  if (!project) return { error: 'project is a project id' };
  const title = line(b.title, 140);
  if (!title) return { error: 'title says what to do, in a line' };
  if (b.needs !== undefined && !Array.isArray(b.needs)) return { error: 'needs is a list of what the step needs' };
  const options = Array.isArray(b.options) ? [...new Set(b.options.map(o => line(o, 80)).filter((o): o is string => !!o))].slice(0, MAX_OPTIONS) : [];
  if (Array.isArray(b.options) && options.length < 2) return { error: 'options are two or more choices' };
  const post: TodoPost = {
    project,
    title,
    ...(text(b.notes, 2000) && { notes: text(b.notes, 2000) }),
    ...(slug(b.skill) && { skill: slug(b.skill) }),
    ...(line(b.step, 120) && { step: line(b.step, 120) }),
    ...(slug(b.production) && { production: slug(b.production) }),
    ...(slug(b.release) && { release: slug(b.release) }),
    ...(line(b.version, 40) && { version: line(b.version, 40) }),
    ...(typeof b.commit === 'string' && /^[0-9a-f]{7,40}$/.test(b.commit) && { commit: b.commit }),
    needs: needList(b.needs ?? []),
    ...(b.yes === true && { yes: true }),
    ...(b.repeat === true && { repeat: true }),
    ...(options.length && { options }),
    ...(line(b.then, 200) && { then: line(b.then, 200) }),
    ...(line(b.from, 80) && { postedFrom: line(b.from, 80) }),
  };
  if ([post.title, post.notes, post.step, post.then, ...(post.options ?? [])].some(words => words && looksSecret(words))) return { error: "That looks like it holds a key or a password. A to-do is read by everyone on the project: name the thing, never the secret" };
  return post;
}

/** What makes two to-dos the same step of the same work: a newer version replaces the older one. */
export const todoKey = (todo: Pick<TodoRecord, 'production' | 'release' | 'skill' | 'step'>): string | null => {
  const work = todo.production ?? todo.release;
  return work && todo.step ? `${work}|${todo.skill ?? ''}|${todo.step}` : null;
};

export function newTodo(id: string, clientId: string, post: TodoPost, now = new Date().toISOString()): TodoRecord {
  const { postedFrom, ...rest } = post;
  return { id, rev: 1, ...rest, state: 'open', postedBy: clientId, ...(postedFrom && { postedFrom }), postedAt: now, failures: 0, updatedAt: now };
}

/** The state as it is now: a claim nobody finished in time, or by someone no longer on the project, is open again. */
export function stateNow(todo: Pick<TodoRecord, 'state' | 'claim'>, now = Date.now(), onProject?: Set<string>): TodoState {
  if (todo.state !== 'claimed') return todo.state;
  if (!todo.claim) return 'open';
  if (now - Date.parse(todo.claim.at) > CLAIM_MS) return 'open';
  if (onProject && !onProject.has(todo.claim.by)) return 'open';
  return 'claimed';
}

/** What someone asks of a to-do. */
export type TodoAsk =
  | { action: 'claim'; id: string; place?: string }
  | { action: 'done'; id: string; result?: string }
  | { action: 'fail'; id: string; reason: string }
  | { action: 'release' | 'reopen' | 'yes'; id: string }
  | { action: 'cancel'; id: string; reason?: string };

export function parseTodoAsk(body: unknown): TodoAsk | { error: string } {
  const { action, id: raw, place, result, reason } = (body ?? {}) as Record<string, unknown>;
  const id = todoIdOf(raw);
  if (!id) return { error: 'id is a to-do id (td-…)' };
  const said = [result, reason].filter((v): v is string => typeof v === 'string');
  if (said.some(looksSecret)) return { error: 'That looks like it holds a key or a password. Everyone on the project reads a to-do: leave the secret out' };
  if (action === 'claim') return { action, id, ...(line(place, 80) && { place: line(place, 80) }) };
  if (action === 'done') return { action, id, ...(text(result, 500) && { result: text(result, 500) }) };
  if (action === 'fail') return text(reason, 500) ? { action, id, reason: text(reason, 500)! } : { error: 'reason says why it failed' };
  if (action === 'release' || action === 'reopen' || action === 'yes') return { action, id };
  if (action === 'cancel') return { action, id, ...(text(reason, 300) && { reason: text(reason, 300) }) };
  return { error: 'action is post, claim, done, fail, release, yes, cancel or reopen' };
}

export interface TodoActor {
  clientId: string;
  role: ProjectRole | null;
  /** Everyone on the project now: a claim by someone who left is open again. */
  onProject?: Set<string>;
}

/**
 * A to-do after someone's ask, or why not. Owners and editors work a project's to-dos; viewers read.
 * Only whoever claimed one finishes, fails or gives it back, and a step that needs a person's yes is
 * not finished before it has one.
 */
export function applyTodoAsk(todo: TodoRecord, actor: TodoActor, ask: TodoAsk, now = new Date()): TodoRecord | { error: string } {
  if (actor.role !== 'owner' && actor.role !== 'editor') return { error: "Only the project's owners and editors work its to-dos" };
  const at = now.toISOString();
  const state = stateNow(todo, now.getTime(), actor.onProject);
  const mine = state === 'claimed' && todo.claim?.by === actor.clientId;
  const next = (change: Partial<TodoRecord>, drop: (keyof TodoRecord)[] = []): TodoRecord => {
    const out: Partial<TodoRecord> = { ...todo, ...change, rev: todo.rev + 1, updatedAt: at };
    for (const key of drop) delete out[key];
    return out as TodoRecord;
  };
  const over = state === 'done' ? 'It is already done' : state === 'cancelled' ? 'It was cancelled' : state === 'failed' ? `It failed ${MAX_FAILURES} times and waits for a person: reopen it first` : null;

  switch (ask.action) {
    case 'claim':
      if (over) return { error: over };
      if (todo.options) return { error: 'It is a choice for a person: answer it with one of its options' };
      if (state === 'claimed' && !mine) return { error: 'Someone else has it' };
      return next({ state: 'claimed', claim: { by: actor.clientId, ...(ask.place && { place: ask.place }), at } });
    case 'done': {
      if (over) return { error: over };
      if (state === 'claimed' && !mine) return { error: 'Someone else has it' };
      if (todo.yes && !todo.agreed) return { error: "It needs a person's yes first" };
      if (todo.options && !todo.options.includes(ask.result ?? '')) return { error: `Answer it with one of: ${todo.options.join(' | ')}` };
      return next({ state: 'done', doneBy: actor.clientId, doneAt: at, ...(ask.result && { result: ask.result }) }, ['claim', 'reason']);
    }
    case 'fail': {
      if (!mine) return { error: state === 'claimed' ? 'Someone else has it' : 'Only whoever picked it up says it failed' };
      const failures = todo.failures + 1;
      return next({ state: failures >= MAX_FAILURES ? 'failed' : 'open', failures, reason: ask.reason }, ['claim']);
    }
    case 'release':
      if (!mine) return { error: state === 'claimed' ? 'Someone else has it' : 'Nobody has it' };
      return next({ state: 'open' }, ['claim']);
    case 'yes':
      if (over && state !== 'failed') return { error: over };
      if (!todo.yes) return { error: "It doesn't need a person's yes" };
      return next({ agreed: { by: actor.clientId, at } });
    case 'cancel':
      if (state === 'done' || state === 'cancelled') return { error: over! };
      return next({ state: 'cancelled', ...(ask.reason && { reason: ask.reason }) }, ask.reason ? ['claim'] : ['claim', 'reason']);
    case 'reopen':
      if (state !== 'failed' && state !== 'cancelled') return { error: 'Only a failed or cancelled to-do is reopened' };
      return next({ state: 'open', failures: 0 }, ['claim', 'reason']);
  }
}

/* ---------- What the page, mm todo and the Spaces MCP show ---------- */

export interface TodoView {
  id: string;
  project: string;
  projectName: string;
  title: string;
  notes?: string;
  skill?: string;
  step?: string;
  production?: string;
  release?: string;
  version?: string;
  commit?: string;
  /** What it needs: `{ need: "browser:youtube/doomcat", label: "a browser signed in to YouTube as doomcat" }`. */
  needs: { need: string; label: string }[];
  /** It waits for a person's yes. */
  needsYes: boolean;
  agreedBy?: string;
  repeat: boolean;
  options?: string[];
  then?: string;
  state: TodoState;
  /** The line to paste into Claude on a computer that can do it. */
  line: string;
  postedBy: string;
  postedFrom?: string;
  postedAt: string;
  /** Who has it, on which place, since when. */
  claimedBy?: string;
  claimedOn?: string;
  claimedAt?: string;
  /** The viewer has it. */
  mine: boolean;
  result?: string;
  doneBy?: string;
  doneAt?: string;
  reason?: string;
  failures: number;
  /** The places open to the project that have everything it needs, by name. */
  places: string[];
  /** Of the viewer's own computers, the ones that have everything it needs. */
  yours: string[];
  updatedAt: string;
}

export interface TodosView {
  project: string;
  name: string;
  role: ProjectRole;
  /** How many wait: open, or failed and waiting for a person. */
  waiting: number;
  todos: TodoView[];
}

const label = (need: string) => (need === 'render' ? 'a place that renders' : need.startsWith('key:') ? `the ${keyInfo(need.slice(4)).title} key` : needLabel(need));
const ORDER: Record<TodoState, number> = { open: 0, failed: 1, claimed: 2, done: 3, cancelled: 4 };

/**
 * A project's to-dos for one viewer: the ones that wait first, then the claimed, then the finished,
 * each with the places that can do it (the project's open places, and the viewer's own computers).
 */
export function todosView(input: { project: string; name: string; role: ProjectRole; me: string; todos: TodoRecord[]; places?: PlaceRecord[]; names?: Record<string, string>; onProject?: Set<string>; now?: number }): TodosView {
  const { project, name, role, me, names = {}, onProject, now = Date.now() } = input;
  const who = (clientId: string) => (clientId === me ? 'You' : (names[clientId] ?? 'A member'));
  const places = accessView({ project, me, places: input.places ?? [], items: [], names }).places;
  const todos = input.todos
    .map((todo): TodoView => {
      const state = stateNow(todo, now, onProject);
      const able = places.filter(place => (place.status === 'open' || (place.mine && place.kind === 'device')) && todo.needs.every(need => placeHas(place.can.map(c => c.need), need)));
      return {
        id: todo.id,
        project,
        projectName: name,
        title: todo.title,
        ...(todo.notes && { notes: todo.notes }),
        ...(todo.skill && { skill: todo.skill }),
        ...(todo.step && { step: todo.step }),
        ...(todo.production && { production: todo.production }),
        ...(todo.release && { release: todo.release }),
        ...(todo.version && { version: todo.version }),
        ...(todo.commit && { commit: todo.commit }),
        needs: todo.needs.map(need => ({ need, label: label(need) })),
        needsYes: todo.yes === true && !todo.agreed,
        ...(todo.agreed && { agreedBy: who(todo.agreed.by) }),
        repeat: todo.repeat === true,
        ...(todo.options && { options: todo.options }),
        ...(todo.then && { then: todo.then }),
        state,
        line: `Pick up to-do ${todo.id} in ${name}`,
        postedBy: who(todo.postedBy),
        ...(todo.postedFrom && { postedFrom: todo.postedFrom }),
        postedAt: todo.postedAt,
        ...(state === 'claimed' && todo.claim && { claimedBy: who(todo.claim.by), ...(todo.claim.place && { claimedOn: todo.claim.place }), claimedAt: todo.claim.at }),
        mine: state === 'claimed' && todo.claim?.by === me,
        ...(todo.result && { result: todo.result }),
        ...(todo.doneBy && { doneBy: who(todo.doneBy) }),
        ...(todo.doneAt && { doneAt: todo.doneAt }),
        ...(todo.reason && state !== 'done' && { reason: todo.reason }),
        failures: todo.failures,
        places: able.map(place => place.name),
        yours: able.filter(place => place.mine && place.kind === 'device').map(place => place.name),
        updatedAt: todo.updatedAt,
      };
    })
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.state === 'done' || a.state === 'cancelled' ? b.updatedAt.localeCompare(a.updatedAt) : a.postedAt.localeCompare(b.postedAt)));
  return { project, name, role, waiting: todos.filter(todo => todo.state === 'open' || todo.state === 'failed').length, todos };
}
