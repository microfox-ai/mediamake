/**
 * A production's run record: which steps of its skill are done, where, with what output, and which
 * step is next (docs/cloud-device-runs.md). Every step ends by saving, so a run can stop in one place
 * and go on in another, and nothing depends on a session staying alive. Pure: what a record may hold,
 * who may change it and what the page shows. ./run-store keeps the records.
 *
 * - One place has a run at a time (`hold`). Starting the same production twice is refused, with who
 *   has it and where. A hold nobody renewed ends by itself, so a session that died never blocks a run.
 * - A saved step is never redone. A step that was started and never saved is done again by whoever
 *   continues.
 * - A step this place can't do waits as a to-do (./todos); finishing the to-do saves the step.
 *
 * Everyone on the project reads a run, so its words never hold a key or a password.
 */
import type { ProjectRole } from '@/lib/editor/project-access';
import { needList } from './places';
import { accessView, placeHas, type PlaceRecord } from './register';
import { projectId } from './space';
import { looksSecret, needWords, type TodoState } from './todos';

/** A place keeps a run this long after its last sign of life (a step started or saved). */
export const HOLD_MS = 2 * 60 * 60 * 1000;
/** A step that says it takes longer keeps the run at most this long. */
export const MAX_HOLD_HOURS = 12;
export const MAX_STEPS = 40;

export type StepState = 'todo' | 'started' | 'waiting' | 'done';

/** A step as the skill's run sheet names it. */
export interface SheetStep {
  step: string;
  needs: string[];
  /** It must not run until a person agreed. */
  yes?: boolean;
  /** Running it twice does no harm. */
  repeat?: boolean;
}

export interface RunStep extends SheetStep {
  state: StepState;
  /** Who started or saved it, on which place, and when. */
  by?: string;
  place?: string;
  startedAt?: string;
  doneAt?: string;
  /** What it saved, in a line: "production v2", the video's link. */
  output?: string;
  /** The to-do it waits for. */
  todo?: string;
}

/** What the run saved to the project, by reference: enough for another place to fetch it. */
export interface RunSaved {
  /** The latest version of the production (its slug is the run's). */
  production?: number;
  /** The release kit: its slug, version and the workspace folder it came from ("out/youtube/doomcat-0412"). */
  release?: { slug: string; version: number; folder?: string };
  /** The commit of the space's code the last step ran with. */
  commit?: string;
}

export interface RunRecord {
  project: string;
  /** The production's slug: one run per production. */
  slug: string;
  /** Goes up with every change. A change is saved only over the rev it read. */
  rev: number;
  skill: string;
  title?: string;
  steps: RunStep[];
  state: 'open' | 'done' | 'cancelled';
  /** Who has the run now, on which place, and until when without another sign of life. */
  hold?: { by: string; place?: string; at: string; until: string };
  saved?: RunSaved;
  startedBy: string;
  startedFrom?: string;
  startedAt: string;
  doneAt?: string;
  /** Why it was cancelled. */
  reason?: string;
  updatedAt: string;
}

/** What the page shows: `running` on one place, `waiting` for a to-do, `ready` for any place to continue. */
export type RunState = 'running' | 'waiting' | 'ready' | 'done' | 'cancelled';

export const runSlug = (value: unknown): string | null => (typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value.trim()) ? value.trim() : null);

const line = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return value.replace(/\s+/g, ' ').trim().slice(0, max) || undefined;
};
const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) || undefined;
};
const SECRET = 'That looks like it holds a key or a password. Everyone on the project reads a run: name the thing, never the secret';

/** The steps of a run sheet as a run keeps them: known needs only, names once. */
export function sheetSteps(value: unknown): SheetStep[] {
  if (!Array.isArray(value)) return [];
  const steps: SheetStep[] = [];
  for (const raw of value.slice(0, MAX_STEPS)) {
    const s = (raw ?? {}) as Record<string, unknown>;
    const step = line(s.step, 120);
    if (!step || steps.some(have => have.step === step)) continue;
    steps.push({ step, needs: needList(s.needs ?? []), ...(s.yes === true && { yes: true }), ...(s.repeat === true && { repeat: true }) });
  }
  return steps;
}

/** The hold as it is now: null once it ran out, or its holder left the project. */
export function holdNow(run: Pick<RunRecord, 'state' | 'hold'>, now = Date.now(), onProject?: Set<string>): RunRecord['hold'] | null {
  if (run.state !== 'open' || !run.hold) return null;
  if (now > Date.parse(run.hold.until)) return null;
  if (onProject && !onProject.has(run.hold.by)) return null;
  return run.hold;
}

/** The first step that isn't saved: what comes next. */
export const nextStep = (run: Pick<RunRecord, 'steps'>): number => run.steps.findIndex(step => step.state !== 'done');

export function runNow(run: Pick<RunRecord, 'state' | 'hold' | 'steps'>, now = Date.now(), onProject?: Set<string>): RunState {
  if (run.state !== 'open') return run.state;
  if (holdNow(run, now, onProject)) return 'running';
  return run.steps[nextStep(run)]?.state === 'waiting' ? 'waiting' : 'ready';
}

/** What someone asks of a run. `step` counts from 1, as the run sheet does. */
export type RunAsk =
  | { action: 'start'; project: string; slug: string; skill: string; title?: string; steps: SheetStep[]; place?: string; again?: boolean }
  | { action: 'resume'; project: string; slug: string; place?: string }
  | { action: 'step'; project: string; slug: string; step: number; place?: string; hours?: number }
  | { action: 'save'; project: string; slug: string; step: number; place?: string; output?: string; saved?: RunSaved }
  | { action: 'wait'; project: string; slug: string; step: number; title?: string; notes?: string }
  | { action: 'stop'; project: string; slug: string }
  | { action: 'cancel'; project: string; slug: string; reason?: string };

export function parseRunAsk(body: unknown): RunAsk | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const project = projectId(b.project);
  if (!project) return { error: 'project is a project id' };
  const slug = runSlug(b.slug);
  if (!slug) return { error: 'slug is the production\'s slug: lowercase letters, digits and dashes' };
  const place = line(b.place, 80);
  const at = { project, slug };
  const stepNo = Number.isInteger(b.step) && (b.step as number) >= 1 && (b.step as number) <= MAX_STEPS ? (b.step as number) : null;
  if ([b.output, b.title, b.notes, b.reason].some(words => typeof words === 'string' && looksSecret(words))) return { error: SECRET };

  switch (b.action) {
    case 'start': {
      const skill = typeof b.skill === 'string' && /^[a-z0-9][a-z0-9._:-]{0,99}$/i.test(b.skill.trim()) ? b.skill.trim() : null;
      if (!skill) return { error: 'skill is the name of the skill the run follows' };
      const steps = sheetSteps(b.steps);
      if (!steps.length) return { error: "steps are the skill's run sheet: [{ step, needs, yes?, repeat? }]" };
      return { action: 'start', ...at, skill, ...(line(b.title, 140) && { title: line(b.title, 140) }), steps, ...(place && { place }), ...(b.again === true && { again: true }) };
    }
    case 'resume':
      return { action: 'resume', ...at, ...(place && { place }) };
    case 'step': {
      if (!stepNo) return { error: 'step is the number of the step, from 1' };
      const hours = typeof b.hours === 'number' && b.hours > 0 ? Math.min(MAX_HOLD_HOURS, b.hours) : undefined;
      return { action: 'step', ...at, step: stepNo, ...(place && { place }), ...(hours && { hours }) };
    }
    case 'save': {
      if (!stepNo) return { error: 'step is the number of the step, from 1' };
      const s = (b.saved ?? {}) as Record<string, unknown>;
      const release = (s.release ?? {}) as Record<string, unknown>;
      const folder = typeof release.folder === 'string' && /^[\w][\w./-]{0,199}$/.test(release.folder) && !release.folder.split('/').includes('..') ? release.folder : undefined;
      const saved: RunSaved = {
        ...(Number.isInteger(s.production) && (s.production as number) > 0 && { production: s.production as number }),
        ...(runSlug(release.slug) && Number.isInteger(release.version) && (release.version as number) > 0 && { release: { slug: runSlug(release.slug)!, version: release.version as number, ...(folder && { folder }) } }),
        ...(typeof s.commit === 'string' && /^[0-9a-f]{7,40}$/.test(s.commit) && { commit: s.commit }),
      };
      return { action: 'save', ...at, step: stepNo, ...(place && { place }), ...(text(b.output, 500) && { output: text(b.output, 500) }), ...(Object.keys(saved).length && { saved }) };
    }
    case 'wait':
      if (!stepNo) return { error: 'step is the number of the step, from 1' };
      return { action: 'wait', ...at, step: stepNo, ...(line(b.title, 140) && { title: line(b.title, 140) }), ...(text(b.notes, 2000) && { notes: text(b.notes, 2000) }) };
    case 'stop':
      return { action: 'stop', ...at };
    case 'cancel':
      return { action: 'cancel', ...at, ...(text(b.reason, 300) && { reason: text(b.reason, 300) }) };
    default:
      return { error: 'action is start, resume, step, save, wait, stop or cancel' };
  }
}

export interface RunActor {
  clientId: string;
  role: ProjectRole | null;
  /** Everyone on the project now: a hold by someone who left has ended. */
  onProject?: Set<string>;
}

const WORKERS = "Only the project's owners and editors run its productions";
const until = (now: Date, hours?: number) => new Date(now.getTime() + (hours ? hours * 60 * 60 * 1000 : HOLD_MS)).toISOString();
const label = (run: Pick<RunRecord, 'steps'>, index: number) => `Step ${index + 1} (${run.steps[index].step})`;

/**
 * A new run, or why not. A production runs once at a time: while one place has it, a second start is
 * refused (`held` says who and where); one that stopped is continued, not started again.
 */
export function startRun(existing: RunRecord | null, actor: RunActor, ask: Extract<RunAsk, { action: 'start' }>, now = new Date()): RunRecord | { error: string; held?: true } {
  if (actor.role !== 'owner' && actor.role !== 'editor') return { error: WORKERS };
  const at = now.toISOString();
  if (existing?.state === 'open') {
    const hold = holdNow(existing, now.getTime(), actor.onProject);
    if (!hold) return { error: `It was started before and stopped at step ${nextStep(existing) + 1}: continue it instead (mm run resume ${existing.slug})` };
    if (hold.by !== actor.clientId || (hold.place ?? '') !== (ask.place ?? '')) return { error: 'It is already running', held: true };
    return { ...existing, rev: existing.rev + 1, hold: { ...hold, until: until(now) }, updatedAt: at };
  }
  if (existing && !ask.again) return { error: existing.state === 'done' ? 'It already ran to the end. To run it again from the first step, start it with again (mm run start … --again)' : 'It was cancelled. To run it again from the first step, start it with again (mm run start … --again)' };
  return {
    project: ask.project,
    slug: ask.slug,
    rev: (existing?.rev ?? 0) + 1,
    skill: ask.skill,
    ...(ask.title && { title: ask.title }),
    steps: ask.steps.map(step => ({ ...step, state: 'todo' as const })),
    state: 'open',
    hold: { by: actor.clientId, ...(ask.place && { place: ask.place }), at, until: until(now) },
    startedBy: actor.clientId,
    ...(ask.place && { startedFrom: ask.place }),
    startedAt: at,
    updatedAt: at,
  };
}

/**
 * A run after someone's ask, or why not. `todo` is the to-do a `wait` posted for its step. Only the
 * place that has the run starts and saves its steps; a saved step is never redone.
 */
export function applyRunAsk(run: RunRecord, actor: RunActor, ask: Exclude<RunAsk, { action: 'start' }>, now = new Date(), todo?: string): RunRecord | { error: string; held?: true } {
  if (actor.role !== 'owner' && actor.role !== 'editor') return { error: WORKERS };
  const at = now.toISOString();
  const hold = holdNow(run, now.getTime(), actor.onProject);
  const place = 'place' in ask ? ask.place : undefined;
  const mine = !!hold && hold.by === actor.clientId && (place === undefined || (hold.place ?? '') === place);
  const next = (change: Partial<RunRecord>, drop: (keyof RunRecord)[] = []): RunRecord => {
    const out: Partial<RunRecord> = { ...run, ...change, rev: run.rev + 1, updatedAt: at };
    for (const key of drop) delete out[key];
    return out as RunRecord;
  };
  if (run.state !== 'open') return { error: run.state === 'done' ? 'It already ran to the end' : 'It was cancelled' };
  const keep = (hours?: number) => ({ by: actor.clientId, ...(place && { place }), at: hold && mine ? hold.at : at, until: until(now, hours) });

  if (ask.action === 'resume') {
    if (hold && !mine) return { error: 'It is already running', held: true };
    return next({ hold: keep() });
  }
  if (ask.action === 'stop') {
    if (!hold) return next({}, ['hold']);
    if (hold.by !== actor.clientId && actor.role !== 'owner') return { error: 'Only whoever has the run, or an owner of the project, lets go of it' };
    return next({}, ['hold']);
  }
  if (ask.action === 'cancel') return next({ state: 'cancelled', ...(ask.reason && { reason: ask.reason }) }, ask.reason ? ['hold'] : ['hold', 'reason']);

  // step, save and wait are about one step, by the place that has the run
  if (!mine) return hold ? { error: 'It is already running', held: true } : { error: `No place has this run now: continue it first (mm run resume ${run.slug})` };
  const index = ask.step - 1;
  const step = run.steps[index];
  if (!step) return { error: `The run has ${run.steps.length} steps` };
  if (step.state === 'done') return { error: `${label(run, index)} is already saved: a saved step is never done again` };
  const before = run.steps.findIndex(s => s.state !== 'done');
  if (before < index) return { error: `${label(run, before)} isn't saved yet: steps run in the order of the run sheet` };
  if (step.state === 'waiting' && ask.action !== 'wait') return { error: `${label(run, index)} waits for to-do ${step.todo}: pick that up here instead (mm todo pick ${step.todo})` };
  const withStep = (change: Partial<RunStep>, drop: (keyof RunStep)[] = []) =>
    run.steps.map((s, i) => {
      if (i !== index) return s;
      const out: Partial<RunStep> = { ...s, ...change };
      for (const key of drop) delete out[key];
      return out as RunStep;
    });

  if (ask.action === 'step') {
    return next({ steps: withStep({ state: 'started', by: actor.clientId, ...(place && { place }), startedAt: at }, place ? ['doneAt', 'output', 'todo'] : ['doneAt', 'output', 'todo', 'place']), hold: keep(ask.hours) });
  }
  if (ask.action === 'save') {
    const steps = withStep({ state: 'done', by: actor.clientId, ...(place && { place }), doneAt: at, ...(ask.output && { output: ask.output }) }, ['todo']);
    const saved = { ...run.saved, ...ask.saved };
    const over = steps.every(s => s.state === 'done');
    return next({ steps, ...(Object.keys(saved).length && { saved }), ...(over ? { state: 'done', doneAt: at } : { hold: keep() }) }, over ? ['hold'] : []);
  }
  // wait: the step goes to the to-do queue, and this place lets go of the run
  if (!todo) return { error: 'A step waits for a to-do' };
  return next({ steps: withStep({ state: 'waiting', todo }, ['by', 'place', 'startedAt']) }, ['hold']);
}

/**
 * A run after the to-do one of its steps waited for changed: done saves the step with the to-do's
 * result, cancelled gives the step back to the run. Null when the run has nothing to change.
 */
export function afterTodo(run: RunRecord, todo: { id: string; step?: string; state: TodoState; result?: string; doneBy?: string; place?: string }, now = new Date()): RunRecord | null {
  if (run.state !== 'open') return null;
  let index = run.steps.findIndex(step => step.todo === todo.id && step.state === 'waiting');
  // a to-do that was cancelled and opened again no longer has its step: its name finds it
  if (index < 0 && todo.state === 'done') index = run.steps.findIndex(step => step.step === todo.step && step.state !== 'done');
  if (index < 0) return null;
  const at = now.toISOString();
  let steps: RunStep[];
  if (todo.state === 'done') {
    steps = run.steps.map((step, i) => (i === index ? { step: step.step, needs: step.needs, ...(step.yes && { yes: true }), ...(step.repeat && { repeat: true }), state: 'done' as const, ...(todo.doneBy && { by: todo.doneBy }), ...(todo.place && { place: todo.place }), doneAt: at, ...(todo.result && { output: todo.result }), todo: todo.id } : step));
  } else if (todo.state === 'cancelled') {
    steps = run.steps.map((step, i) => (i === index ? { step: step.step, needs: step.needs, ...(step.yes && { yes: true }), ...(step.repeat && { repeat: true }), state: 'todo' as const } : step));
  } else return null;
  if (!steps.every(step => step.state === 'done')) return { ...run, steps, rev: run.rev + 1, updatedAt: at };
  // its last step: the run is over, whoever had it
  const over: RunRecord = { ...run, steps, rev: run.rev + 1, updatedAt: at, state: 'done', doneAt: at };
  delete over.hold;
  return over;
}

/* ---------- What the page and mm run show ---------- */

export interface RunStepView {
  n: number;
  step: string;
  needs: { need: string; label: string }[];
  needsYes: boolean;
  repeat: boolean;
  /** `unsaved`: it was started and never saved, and no place has the run: whoever continues does it again. */
  state: StepState | 'unsaved';
  by?: string;
  place?: string;
  at?: string;
  output?: string;
  todo?: string;
  todoState?: TodoState;
}

export interface RunView {
  project: string;
  projectName: string;
  slug: string;
  title: string;
  skill: string;
  state: RunState;
  /** The line to paste into Claude on a place that can continue it. */
  line: string;
  steps: RunStepView[];
  /** How many steps are saved. */
  done: number;
  /** What comes next, and the places that have what it needs. */
  next?: { n: number; step: string; needs: string[]; places: string[]; yours: string[] };
  /** Who has it, on which place, since when. */
  heldBy?: string;
  heldOn?: string;
  heldSince?: string;
  /** The viewer has it. */
  mine: boolean;
  saved?: RunSaved;
  startedBy: string;
  startedFrom?: string;
  startedAt: string;
  doneAt?: string;
  reason?: string;
  updatedAt: string;
}

export interface RunsView {
  project: string;
  name: string;
  role: ProjectRole;
  /** How many runs any place may continue now. */
  ready: number;
  runs: RunView[];
}

const ORDER: Record<RunState, number> = { ready: 0, waiting: 1, running: 2, done: 3, cancelled: 4 };

/** A project's runs for one viewer: the ones to continue first, then the waiting and running, then the finished. */
export function runsView(input: { project: string; name: string; role: ProjectRole; me: string; runs: RunRecord[]; places?: PlaceRecord[]; names?: Record<string, string>; todos?: Record<string, TodoState>; onProject?: Set<string>; now?: number }): RunsView {
  const { project, name, role, me, names = {}, todos = {}, onProject, now = Date.now() } = input;
  const who = (clientId: string) => (clientId === me ? 'You' : (names[clientId] ?? 'A member'));
  const places = accessView({ project, me, places: input.places ?? [], items: [], names }).places;
  const runs = input.runs
    .map((run): RunView => {
      const state = runNow(run, now, onProject);
      const hold = holdNow(run, now, onProject);
      const index = run.state === 'open' ? nextStep(run) : -1;
      const upcoming = index >= 0 ? run.steps[index] : undefined;
      const able = upcoming ? places.filter(place => (place.status === 'open' || (place.mine && place.kind === 'device')) && upcoming.needs.every(need => placeHas(place.can.map(c => c.need), need))) : [];
      return {
        project,
        projectName: name,
        slug: run.slug,
        title: run.title ?? run.slug,
        skill: run.skill,
        state,
        line: `Continue ${run.slug} in ${name}`,
        steps: run.steps.map((step, i) => ({
          n: i + 1,
          step: step.step,
          needs: step.needs.map(need => ({ need, label: needWords(need) })),
          needsYes: step.yes === true,
          repeat: step.repeat === true,
          state: step.state === 'started' && state !== 'running' ? 'unsaved' : step.state,
          ...(step.by && { by: who(step.by) }),
          ...(step.place && { place: step.place }),
          ...((step.doneAt ?? step.startedAt) && { at: step.doneAt ?? step.startedAt }),
          ...(step.output && { output: step.output }),
          ...(step.todo && { todo: step.todo, ...(todos[step.todo] && { todoState: todos[step.todo] }) }),
        })),
        done: run.steps.filter(step => step.state === 'done').length,
        ...(upcoming && { next: { n: index + 1, step: upcoming.step, needs: upcoming.needs, places: able.map(place => place.name), yours: able.filter(place => place.mine && place.kind === 'device').map(place => place.name) } }),
        ...(hold && { heldBy: who(hold.by), ...(hold.place && { heldOn: hold.place }), heldSince: hold.at }),
        mine: !!hold && hold.by === me,
        ...(run.saved && { saved: run.saved }),
        startedBy: who(run.startedBy),
        ...(run.startedFrom && { startedFrom: run.startedFrom }),
        startedAt: run.startedAt,
        ...(run.doneAt && { doneAt: run.doneAt }),
        ...(run.reason && { reason: run.reason }),
        updatedAt: run.updatedAt,
      };
    })
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.updatedAt.localeCompare(a.updatedAt));
  return { project, name, role, ready: runs.filter(run => run.state === 'ready').length, runs };
}

/** The to-do a run posts for a step it can't do here. */
export function todoForStep(run: RunRecord, index: number, ask: { title?: string; notes?: string }) {
  const step = run.steps[index];
  const after = run.steps[index + 1];
  const work = run.saved?.release ? { release: run.saved.release.slug, version: `v${run.saved.release.version}` } : { production: run.slug, ...(run.saved?.production && { version: `v${run.saved.production}` }) };
  return {
    project: run.project,
    title: ask.title ?? `${step.step}: ${run.title ?? run.slug}`,
    ...(ask.notes && { notes: ask.notes }),
    skill: run.skill,
    step: step.step,
    ...work,
    ...(run.saved?.commit && { commit: run.saved.commit }),
    needs: step.needs,
    ...(step.yes && { yes: true }),
    ...(step.repeat && { repeat: true }),
    then: after ? `the run goes on with step ${index + 2} (${after.step}): Continue ${run.slug}` : "that is the run's last step",
    run: run.slug,
  };
}
