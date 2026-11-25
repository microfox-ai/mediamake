/**
 * Sub-agents in MongoDB, as ./agents describes them: `agent_runs` (one document a run of an
 * account), `agent_events` (its conversation, a document a line), `agent_commands` (what the page
 * asked a place to do) and `agent_places` (the places that report, and which is listening).
 * Everything is keyed by the account: one account never reads another's.
 */
import { randomBytes } from 'node:crypto';
import { getDatabase } from '@/lib/mongodb';
import {
  agentsView,
  isActive,
  MAX_EVENTS_PER_RUN,
  runView,
  spentOn,
  stateNow,
  type AgentCommand,
  type AgentEvent,
  type AgentPlace,
  type AgentRecord,
  type AgentsView,
  type CommandAsk,
  type Report,
  type RunView,
} from './agents';

const noId = { projection: { _id: 0 } } as const;
/** How many runs the page lists: the latest, and every one still going. */
const LISTED = 300;
/** How many events one read gives the page. */
const PAGE = 400;
/** A command nobody took in this long is dropped: the place it was for is gone. */
const COMMAND_MS = 24 * 60 * 60 * 1000;

let indexed: Promise<unknown> | null = null;
async function cols() {
  const db = await getDatabase();
  const runs = db.collection<AgentRecord>('agent_runs');
  const events = db.collection<AgentEvent & { clientId: string; run: string }>('agent_events');
  const commands = db.collection<AgentCommand>('agent_commands');
  const places = db.collection<AgentPlace>('agent_places');
  indexed ??= Promise.all([
    runs.createIndex({ clientId: 1, id: 1 }, { unique: true }),
    runs.createIndex({ clientId: 1, updated: -1 }),
    events.createIndex({ clientId: 1, run: 1, seq: 1 }, { unique: true }),
    commands.createIndex({ clientId: 1, place: 1, state: 1, at: 1 }),
    commands.createIndex({ clientId: 1, id: 1 }, { unique: true }),
    places.createIndex({ clientId: 1, name: 1 }, { unique: true }),
  ]).catch(() => null);
  await indexed;
  return { runs, events, commands, places };
}

const newCommandId = () => `cm-${randomBytes(6).toString('hex').slice(0, 6)}`;

export type CommandResult = { command: AgentCommand } | { error: string; status: number };

export const agentsDB = {
  /**
   * A place's report of one run: the record as it is now, and the events after the `from` kept so
   * far. Answers how many events are kept (a place that is ahead or behind sends from there next)
   * and what the page asked this place to do.
   */
  async report(clientId: string, report: Report): Promise<{ have: number; commands: AgentCommand[] }> {
    const { runs, events } = await cols();
    const now = new Date().toISOString();
    const existing = (await runs.findOne({ clientId, id: report.run.id }, { projection: { _id: 0, events: 1 } })) as Pick<AgentRecord, 'events'> | null;
    let have = existing?.events ?? 0;
    if (report.from === have && report.events.length && have < MAX_EVENTS_PER_RUN) {
      const fresh = report.events.slice(0, MAX_EVENTS_PER_RUN - have).map((event, i) => ({ ...event, seq: have + i, clientId, run: report.run.id }));
      // the same lines sent twice (a report whose answer was lost) are kept once
      await events.insertMany(fresh, { ordered: false }).catch(error => {
        if ((error as { code?: number }).code !== 11000) throw error;
      });
      have += fresh.length;
    }
    await runs.updateOne({ clientId, id: report.run.id }, { $set: { ...report.run, clientId, reportedAt: now, events: have, cost: spentOn(report.run) } }, { upsert: true });
    const commands = await this.touch(clientId, report.place, { folder: report.run.cwd, settings: report.settings });
    return { have, commands };
  },

  /** A place says it is there (`listening` when `mm agents watch` asks), and gets what waits for it. */
  async touch(clientId: string, place: string, more: { listening?: boolean; folder?: string; settings?: Report['settings'] } = {}): Promise<AgentCommand[]> {
    const { places, commands } = await cols();
    const now = new Date().toISOString();
    const known = (await places.findOne({ clientId, name: place }, noId)) as AgentPlace | null;
    const folders = more.folder ? [more.folder, ...(known?.folders ?? []).filter(f => f !== more.folder)].slice(0, 12) : (known?.folders ?? []);
    await places.updateOne(
      { clientId, name: place },
      { $set: { clientId, name: place, seenAt: now, folders, ...(more.listening && { listeningAt: now }), ...(more.settings?.credit && { credit: more.settings.credit }), ...(more.settings?.defaults && { defaults: more.settings.defaults }) } },
      { upsert: true },
    );
    return (await commands.find({ clientId, place, state: 'queued', at: { $gt: new Date(Date.now() - COMMAND_MS).toISOString() } }, noId).sort({ at: 1 }).limit(20).toArray()) as AgentCommand[];
  },

  /** A place did what a command asked, or could not: `run` names the run a start made. */
  async settle(clientId: string, id: string, done: boolean, more: { note?: string; run?: string } = {}): Promise<boolean> {
    const { commands } = await cols();
    const saved = await commands.updateOne({ clientId, id, state: 'queued' }, { $set: { state: done ? 'done' : 'failed', doneAt: new Date().toISOString(), ...(more.note && { note: more.note.slice(0, 400) }), ...(more.run && { run: more.run }) } });
    return saved.matchedCount > 0;
  },

  /** The page asks a place to answer a run, stop it or start one. */
  async ask(clientId: string, ask: CommandAsk): Promise<CommandResult> {
    const { runs, commands, places } = await cols();
    const at = new Date().toISOString();
    let place: string;
    if (ask.kind === 'start') {
      const known = (await places.findOne({ clientId, name: ask.place }, noId)) as AgentPlace | null;
      if (!known) return { error: 'No such place: a computer or cloud environment appears here once it has run a sub-agent', status: 404 };
      if (!known.folders.includes(ask.start.cwd)) return { error: 'Pick a folder a sub-agent has already worked in there', status: 400 };
      place = ask.place;
    } else {
      const run = (await runs.findOne({ clientId, id: ask.run }, noId)) as AgentRecord | null;
      if (!run) return { error: 'No such sub-agent', status: 404 };
      if (ask.kind === 'stop' && !isActive(stateNow(run))) return { error: "It isn't running", status: 409 };
      place = run.place;
      if (ask.kind === 'stop') {
        // one stop is enough
        const waiting = (await commands.findOne({ clientId, run: ask.run, kind: 'stop', state: 'queued' }, noId)) as AgentCommand | null;
        if (waiting) return { command: waiting };
      }
    }
    const command: AgentCommand = {
      id: newCommandId(),
      clientId,
      kind: ask.kind,
      place,
      ...(ask.kind !== 'start' && { run: ask.run }),
      ...(ask.kind === 'message' && { message: ask.message }),
      ...(ask.kind === 'start' && { start: ask.start }),
      state: 'queued',
      at,
    };
    await commands.insertOne({ ...command });
    return { command };
  },

  /** The page takes back a message its place has not taken. */
  async unsend(clientId: string, id: string): Promise<boolean> {
    const { commands } = await cols();
    return (await commands.deleteOne({ clientId, id, state: 'queued' })).deletedCount > 0;
  },

  /** Every run of the account, the places that report and the credit. */
  async list(clientId: string): Promise<AgentsView> {
    const { runs, commands, places } = await cols();
    const [list, queued, known] = await Promise.all([
      runs.find({ clientId }, { projection: { _id: 0, 'turns.reply': 0, 'turns.message': 0 } }).sort({ updated: -1 }).limit(LISTED).toArray(),
      commands.find({ clientId, state: 'queued' }, noId).toArray(),
      places.find({ clientId }, noId).toArray(),
    ]);
    return agentsView({ runs: list as AgentRecord[], commands: queued as AgentCommand[], places: known as AgentPlace[] });
  },

  /** One run with its events after `after` (all of them from the start when it is -1). */
  async one(clientId: string, id: string, after = -1): Promise<{ run: RunView; events: AgentEvent[]; more: boolean } | null> {
    const { runs, events, commands, places } = await cols();
    const run = (await runs.findOne({ clientId, id }, noId)) as AgentRecord | null;
    if (!run) return null;
    const [lines, mine, place] = await Promise.all([
      events.find({ clientId, run: id, seq: { $gt: after } }, { projection: { _id: 0, clientId: 0, run: 0 } }).sort({ seq: 1 }).limit(PAGE + 1).toArray(),
      commands.find({ clientId, run: id }, noId).sort({ at: -1 }).limit(30).toArray(),
      places.findOne({ clientId, name: run.place }, noId),
    ]);
    return { run: runView(run, place as AgentPlace | null, mine as AgentCommand[]), events: lines.slice(0, PAGE) as AgentEvent[], more: lines.length > PAGE };
  },

  /** A run and its conversation, gone from the page. The record on its place stays. */
  async forget(clientId: string, id: string): Promise<boolean> {
    const { runs, events, commands } = await cols();
    const gone = await runs.deleteOne({ clientId, id });
    await Promise.all([events.deleteMany({ clientId, run: id }), commands.deleteMany({ clientId, run: id })]);
    return gone.deletedCount > 0;
  },
};
