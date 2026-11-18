/**
 * The run records in MongoDB (`runs`): one document per production of a project, as ./runs describes
 * it. Every change is saved over the `rev` it read, so of two places that start or continue a run at
 * once, one is told the other has it.
 */
import type { Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { registerDB } from './register-store';
import { afterTodo, applyRunAsk, runsView, startRun, todoForStep, type RunAsk, type RunRecord, type RunsView, type RunView } from './runs';
import { peopleOf, projectsOf } from './store';
import { contextOf, todoDB, type Context } from './todo-store';
import { stateNow, type TodoRecord, type TodoState, type TodoView } from './todos';

const COL = 'runs';
const noId = { projection: { _id: 0 } } as const;
/** How many finished runs a project's page keeps showing. */
const FINISHED_SHOWN = 30;
const RUN_CANCELLED = 'Its run was cancelled';

let indexed: Promise<unknown> | null = null;
async function runs() {
  const db = await getDatabase();
  indexed ??= Promise.all([db.collection(COL).createIndex({ project: 1, slug: 1 }, { unique: true }), db.collection(COL).createIndex({ project: 1, state: 1, updatedAt: -1 })]).catch(() => null);
  await indexed;
  return { db, col: db.collection<RunRecord>(COL) };
}

async function viewOf(db: Db, ctx: Context, clientId: string, list: RunRecord[]): Promise<RunsView> {
  const onProject = new Set(ctx.people);
  const places = await registerDB.placesFor([ctx.id], clientId, onProject);
  const ids = [...ctx.people, ...places.map(place => place.clientId), ...list.flatMap(run => [run.startedBy, run.hold?.by, ...run.steps.map(step => step.by)].filter((id): id is string => !!id))];
  const names = Object.fromEntries([...(await peopleOf(db, ids))].map(([id, person]) => [id, person.name]));
  const waiting = list.flatMap(run => run.steps.map(step => step.todo).filter((id): id is string => !!id));
  const todos: Record<string, TodoState> = {};
  if (waiting.length) {
    for (const todo of (await db.collection<TodoRecord>('todos').find({ id: { $in: waiting } }, { projection: { _id: 0, id: 1, state: 1, claim: 1 } }).toArray()) as TodoRecord[]) todos[todo.id] = stateNow(todo, Date.now(), onProject);
  }
  return runsView({ project: ctx.id, name: ctx.name, role: ctx.role, me: clientId, runs: list, places, names, todos, onProject });
}

export type RunResult = { run: RunView; todo?: TodoView } | { error: string; status: number; run?: RunView };

export const runDB = {
  /** One ask about one production's run: start, resume, step, save, wait, stop, cancel. */
  async act(clientId: string, ask: RunAsk): Promise<RunResult> {
    const { db, col } = await runs();
    const ctx = await contextOf(db, ask.project, clientId);
    if (!ctx) return { error: 'You are not on that project', status: 403 };
    const actor = { clientId, role: ctx.role, onProject: new Set(ctx.people) };
    const one = async (run: RunRecord) => (await viewOf(db, ctx, clientId, [run])).runs[0];
    for (let tries = 0; tries < 4; tries++) {
      const existing = (await col.findOne({ project: ask.project, slug: ask.slug }, noId)) as RunRecord | null;
      let next: RunRecord | { error: string; held?: true };
      let todo: TodoView | undefined;
      if (ask.action === 'start') next = startRun(existing, actor, ask);
      else if (!existing) return { error: `This project has no run of ${ask.slug}: start one (mm run start)`, status: 404 };
      else if (ask.action === 'wait') {
        // judged first, so a refused ask posts nothing; the same step is posted once, so asking again is safe
        next = applyRunAsk(existing, actor, ask, new Date(), 'td-000000');
        if (!('error' in next)) {
          const posted = await todoDB.post(clientId, { ...todoForStep(existing, ask.step - 1, ask), ...(existing.hold?.place && { postedFrom: existing.hold.place }) });
          if ('error' in posted) return { error: posted.error, status: posted.status, run: await one(existing) };
          todo = posted.todo;
          next = applyRunAsk(existing, actor, ask, new Date(), posted.todo.id);
        }
      } else next = applyRunAsk(existing, actor, ask);
      if ('error' in next) return { error: next.error, status: 409, ...(existing && { run: await one(existing) }) };

      if (existing) {
        const saved = await col.replaceOne({ project: ask.project, slug: ask.slug, rev: existing.rev }, next);
        if (!saved.matchedCount) continue; // someone changed it in between: the ask is judged against what it is now
      } else {
        try {
          await col.insertOne({ ...next });
        } catch (error) {
          if ((error as { code?: number }).code !== 11000) throw error;
          continue; // another place started it at the same moment
        }
      }
      if (ask.action === 'cancel') {
        // its to-dos are no longer wanted; whoever has one is told when they try to finish it
        const now = new Date().toISOString();
        await db.collection<TodoRecord>('todos').updateMany({ project: ask.project, run: ask.slug, state: { $in: ['open', 'claimed', 'failed'] } }, { $set: { state: 'cancelled', reason: RUN_CANCELLED, updatedAt: now }, $unset: { claim: '' }, $inc: { rev: 1 } });
      }
      return { run: await one(next), ...(todo && { todo }) };
    }
    return { error: 'It keeps changing: try again', status: 409 };
  },

  /** The to-do one of a run's steps waited for was finished or cancelled: the run follows. */
  async todoChanged(todo: TodoRecord, place?: string): Promise<void> {
    if (!todo.run) return;
    const { col } = await runs();
    for (let tries = 0; tries < 4; tries++) {
      const run = (await col.findOne({ project: todo.project, slug: todo.run }, noId)) as RunRecord | null;
      const next = run && afterTodo(run, { id: todo.id, step: todo.step, state: todo.state, result: todo.result, doneBy: todo.doneBy, place });
      if (!run || !next) return;
      if ((await col.replaceOne({ project: run.project, slug: run.slug, rev: run.rev }, next)).matchedCount) return;
    }
  },

  /** One run, for someone on its project. */
  async one(clientId: string, project: string, slug: string): Promise<RunView | null> {
    const { db, col } = await runs();
    const ctx = await contextOf(db, project, clientId);
    const run = ctx && ((await col.findOne({ project, slug }, noId)) as RunRecord | null);
    return ctx && run ? (await viewOf(db, ctx, clientId, [run])).runs[0] : null;
  },

  /** A project's runs for one of its people: every one that isn't over, and the latest finished ones. Null when they aren't on it. */
  async forProject(project: string, clientId: string): Promise<RunsView | null> {
    const { db, col } = await runs();
    const ctx = await contextOf(db, project, clientId);
    if (!ctx) return null;
    const [live, finished] = await Promise.all([
      col.find({ project, state: 'open' }, noId).sort({ updatedAt: -1 }).limit(200).toArray(),
      col.find({ project, state: { $in: ['done', 'cancelled'] } }, noId).sort({ updatedAt: -1 }).limit(FINISHED_SHOWN).toArray(),
    ]);
    return viewOf(db, ctx, clientId, [...live, ...finished] as RunRecord[]);
  },

  /** The runs that aren't over in every project the account works on (its own space too): what `mm run status` and a session's first line read. */
  async mine(clientId: string): Promise<{ runs: RunView[] }> {
    const { db, col } = await runs();
    const [projects, personal] = await Promise.all([projectsOf(db, clientId), db.collection('projects').findOne({ clientId, personal: true }, { projection: { _id: 1 } })]);
    const ids = [...projects.filter(project => project.role !== 'viewer').map(project => project.id), ...(personal ? [String(personal._id)] : [])];
    if (!ids.length) return { runs: [] };
    const list = (await col.find({ project: { $in: ids }, state: 'open' }, noId).sort({ updatedAt: -1 }).limit(300).toArray()) as RunRecord[];
    const out: RunView[] = [];
    for (const project of [...new Set(list.map(run => run.project))]) {
      const ctx = await contextOf(db, project, clientId);
      if (!ctx) continue;
      out.push(...(await viewOf(db, ctx, clientId, list.filter(run => run.project === project))).runs);
    }
    return { runs: out };
  },
};
