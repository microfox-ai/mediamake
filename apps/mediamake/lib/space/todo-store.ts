/**
 * A project's to-do queue in MongoDB (`todos`): one document per to-do, as ./todos describes it.
 * Every change is saved over the `rev` it read, so of two people who pick one up at once, one is told
 * the other has it.
 */
import { randomBytes } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import type { ProjectRole } from '@/lib/editor/project-access';
import { getDatabase } from '@/lib/mongodb';
import { registerDB } from './register-store';
import type { PlaceRecord } from './register';
import { peopleOf, projectsOf } from './store';
import { applyTodoAsk, newTodo, todoKey, todosView, type TodoAsk, type TodoPost, type TodoRecord, type TodosView, type TodoView } from './todos';

const COL = 'todos';
const noId = { projection: { _id: 0 } } as const;
/** How many finished to-dos a project's page keeps showing. */
const FINISHED_SHOWN = 30;
const REPLACED = 'A newer version replaced it';

let indexed: Promise<unknown> | null = null;
async function todos() {
  const db = await getDatabase();
  indexed ??= Promise.all([db.collection(COL).createIndex({ id: 1 }, { unique: true }), db.collection(COL).createIndex({ project: 1, state: 1, updatedAt: -1 })]).catch(() => null);
  await indexed;
  return { db, col: db.collection<TodoRecord>(COL) };
}

/** A project as its to-dos need it, for one account: null when the account isn't on it. A personal space is its owner's alone. */
export interface Context {
  id: string;
  name: string;
  role: ProjectRole;
  people: string[];
}
export async function contextOf(db: Db, project: string, clientId: string): Promise<Context | null> {
  type Doc = { clientId?: string; displayName?: string; personal?: boolean; sharedWith?: { clientId?: string; role?: ProjectRole }[] };
  let doc: Doc | null = null;
  try {
    doc = await db.collection<Doc>('projects').findOne({ _id: new ObjectId(project), deletedAt: { $exists: false } }, { projection: { clientId: 1, displayName: 1, personal: 1, sharedWith: 1 } });
  } catch {
    return null;
  }
  if (!doc) return null;
  const role = doc.clientId === clientId ? 'owner' : ((doc.sharedWith ?? []).find(member => member.clientId === clientId)?.role ?? null);
  if (!role) return null;
  const people = [doc.clientId, ...(doc.sharedWith ?? []).map(member => member.clientId)].filter((id): id is string => !!id);
  return { id: project, name: doc.personal ? 'your space' : (doc.displayName ?? 'Project'), role, people: [...new Set(people)] };
}

const newId = () => {
  const letters = 'abcdefghijkmnpqrstuvwxyz23456789';
  return `td-${[...randomBytes(6)].map(byte => letters[byte % letters.length]).join('')}`;
};

async function viewOf(db: Db, ctx: Context, clientId: string, list: TodoRecord[], places?: PlaceRecord[]): Promise<TodosView> {
  const onProject = new Set(ctx.people);
  const shown = places ?? (await registerDB.placesFor([ctx.id], clientId, onProject));
  const ids = [...ctx.people, ...shown.map(place => place.clientId), ...list.flatMap(todo => [todo.postedBy, todo.claim?.by, todo.doneBy, todo.agreed?.by].filter((id): id is string => !!id))];
  const names = Object.fromEntries([...(await peopleOf(db, ids))].map(([id, person]) => [id, person.name]));
  return todosView({ project: ctx.id, name: ctx.name, role: ctx.role, me: clientId, todos: list, places: shown, names, onProject });
}

export type TodoResult = { todo: TodoView; existing?: true } | { error: string; status: number; todo?: TodoView };

export const todoDB = {
  /**
   * Posts a to-do. The same step of the same work at the same version is posted once: the one that
   * waits is given back. A newer version cancels the older one that still waits.
   */
  async post(clientId: string, post: TodoPost): Promise<TodoResult> {
    const { db, col } = await todos();
    const ctx = await contextOf(db, post.project, clientId);
    if (!ctx) return { error: 'You are not on that project', status: 403 };
    if (ctx.role === 'viewer') return { error: "Only the project's owners and editors post to-dos", status: 403 };
    const key = todoKey(post);
    if (key) {
      const waiting = ((await col.find({ project: post.project, state: { $in: ['open', 'claimed'] } }, noId).toArray()) as TodoRecord[]).filter(todo => todoKey(todo) === key);
      const same = waiting.find(todo => (todo.version ?? '') === (post.version ?? ''));
      if (same) return { todo: (await viewOf(db, ctx, clientId, [same])).todos[0], existing: true };
      const now = new Date().toISOString();
      for (const old of waiting) await col.updateOne({ id: old.id, rev: old.rev }, { $set: { state: 'cancelled', reason: REPLACED, rev: old.rev + 1, updatedAt: now }, $unset: { claim: '' } });
    }
    for (let tries = 0; tries < 5; tries++) {
      const todo = newTodo(newId(), clientId, post);
      try {
        await col.insertOne({ ...todo });
        return { todo: (await viewOf(db, ctx, clientId, [todo])).todos[0] };
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
      }
    }
    throw new Error('Could not make a to-do id');
  },

  /** One ask about one to-do: claim, done, fail, release, yes, cancel, reopen. */
  async act(clientId: string, ask: TodoAsk): Promise<TodoResult> {
    const { db, col } = await todos();
    for (let tries = 0; tries < 4; tries++) {
      const todo = (await col.findOne({ id: ask.id }, noId)) as TodoRecord | null;
      const ctx = todo && (await contextOf(db, todo.project, clientId));
      if (!todo || !ctx) return { error: 'No such to-do in your projects', status: 404 };
      const next = applyTodoAsk(todo, { clientId, role: ctx.role, onProject: new Set(ctx.people) }, ask);
      if ('error' in next) return { error: next.error, status: 409, todo: (await viewOf(db, ctx, clientId, [todo])).todos[0] };
      const saved = await col.replaceOne({ id: todo.id, rev: todo.rev }, next);
      if (saved.matchedCount) {
        // a step of a run: finishing the to-do saves the step, cancelling it gives the step back to the run
        if (next.run && (next.state === 'done' || next.state === 'cancelled')) {
          const { runDB } = await import('./run-store');
          await runDB.todoChanged(next, todo.claim?.place).catch(error => console.error(`[todos] Could not tell run ${next.run} about ${next.id}:`, error));
        }
        return { todo: (await viewOf(db, ctx, clientId, [next])).todos[0] };
      }
      // someone changed it in between: read it again, and the ask is judged against what it is now
    }
    return { error: 'It keeps changing: try again', status: 409 };
  },

  /** One to-do, for someone on its project. */
  async one(clientId: string, id: string): Promise<TodoView | null> {
    const { db, col } = await todos();
    const todo = (await col.findOne({ id }, noId)) as TodoRecord | null;
    const ctx = todo && (await contextOf(db, todo.project, clientId));
    return todo && ctx ? (await viewOf(db, ctx, clientId, [todo])).todos[0] : null;
  },

  /** A project's to-dos for one of its people: everything that waits or is held, and the latest finished ones. Null when they aren't on it. */
  async forProject(project: string, clientId: string): Promise<TodosView | null> {
    const { db, col } = await todos();
    const ctx = await contextOf(db, project, clientId);
    if (!ctx) return null;
    const [live, finished] = await Promise.all([
      col.find({ project, state: { $in: ['open', 'claimed', 'failed'] } }, noId).sort({ postedAt: 1 }).limit(200).toArray(),
      col.find({ project, state: { $in: ['done', 'cancelled'] } }, noId).sort({ updatedAt: -1 }).limit(FINISHED_SHOWN).toArray(),
    ]);
    return viewOf(db, ctx, clientId, [...live, ...finished] as TodoRecord[]);
  },

  /** What waits or is held in every project the account works on (its own space too): what `mm todo` and a session's first line read. */
  async mine(clientId: string): Promise<{ todos: TodoView[] }> {
    const { db, col } = await todos();
    const [projects, personal] = await Promise.all([projectsOf(db, clientId), db.collection('projects').findOne({ clientId, personal: true }, { projection: { _id: 1 } })]);
    const ids = [...projects.filter(project => project.role !== 'viewer').map(project => project.id), ...(personal ? [String(personal._id)] : [])];
    if (!ids.length) return { todos: [] };
    const list = (await col.find({ project: { $in: ids }, state: { $in: ['open', 'claimed', 'failed'] } }, noId).sort({ postedAt: 1 }).limit(500).toArray()) as TodoRecord[];
    const out: TodoView[] = [];
    for (const project of [...new Set(list.map(todo => todo.project))]) {
      const ctx = await contextOf(db, project, clientId);
      if (!ctx) continue;
      out.push(...(await viewOf(db, ctx, clientId, list.filter(todo => todo.project === project))).todos);
    }
    return { todos: out };
  },
};
