import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agentsView, parseCommand, parsePoll, parseReport, runView, stateNow, withoutSecrets, QUIET_MS, type AgentCommand, type AgentPlace, type AgentRecord } from './agents';

const T0 = Date.parse('2026-11-26T10:00:00.000Z');
const at = (min: number) => new Date(T0 + min * 60000).toISOString();

const sent = (more: Record<string, unknown> = {}) => ({
  action: 'report',
  place: 'mac-7241',
  from: 0,
  run: {
    id: 'ag-24990',
    title: 'Sukuna shorts',
    task: 'the whole brief, which the page does not keep twice',
    model: 'opus',
    effort: 'high',
    mode: 'auto',
    cap: 15,
    cwd: '/Users/me/mediamake',
    session: '0b0d6f0e-1111-4222-8333-444455556666',
    from: { session: 'parent', note: 'the sukuna edit' },
    state: 'running',
    created: at(0),
    updated: at(2),
    last: 'Bash: mm render sukuna --preview',
    loaded: { model: 'claude-opus-5-5', key: 'ANTHROPIC_API_KEY', tools: 312, mcp: ['browse-hack', 'kling (needs-auth)'] },
    turns: [{ n: 1, at: at(0), startedAt: at(0), message: 'Make five shorts', calls: 3 }],
    ...more,
  },
  events: [
    { kind: 'you', turn: 1, at: at(0), text: 'Make five shorts' },
    { kind: 'tool', name: 'Bash', text: 'mm render sukuna --preview' },
    { kind: 'result', text: 'rendered out/sukuna/preview.mp4' },
  ],
  settings: { credit: { total: 200, ends: '2026-11-29T00:00:00.000Z' }, defaults: { model: 'opus', effort: 'high', cap: 15 } },
});

test('a report is read, cut to size and kept free of keys', () => {
  const report = parseReport(sent());
  assert.ok(!('error' in report));
  assert.equal(report.run.id, 'ag-24990');
  assert.equal(report.run.place, 'mac-7241');
  assert.equal(report.events.length, 3);
  assert.deepEqual(report.settings?.credit, { total: 200, ends: '2026-11-29T00:00:00.000Z' });
  assert.ok(!('task' in report.run), 'only the fields the page shows are kept');

  const leaky = parseReport({ ...sent(), events: [{ kind: 'result', text: `ANTHROPIC_API_KEY=sk-ant-api03-${'a'.repeat(40)} done` }, { kind: 'agent', text: 'x'.repeat(9000) }] });
  assert.ok(!('error' in leaky));
  assert.equal(leaky.events[0].text, 'ANTHROPIC_API_KEY=[key removed] done');
  assert.equal(leaky.events[1].text.length, 6000);
  assert.equal(withoutSecrets('token ghp_' + 'A'.repeat(36)), 'token [key removed]');

  assert.match((parseReport({ ...sent(), place: '' }) as { error: string }).error, /place/);
  assert.match((parseReport(sent({ id: 'nope' })) as { error: string }).error, /ag-/);
  assert.match((parseReport(sent({ state: 'dancing' })) as { error: string }).error, /state/);
  assert.match((parseReport(sent({ turns: [] })) as { error: string }).error, /turns/);
  assert.match((parseReport({ ...sent(), events: [{ kind: 'shout', text: 'x' }] }) as { error: string }).error, /kind/);
  assert.match((parseReport({ ...sent(), events: Array.from({ length: 301 }, () => ({ kind: 'agent', text: 'x' })) }) as { error: string }).error, /at most 300/);
});

test('a place asking what waits for it', () => {
  assert.deepEqual(parsePoll({ place: 'mac-7241', listening: true, folder: '/Users/me/mediamake' }), { place: 'mac-7241', listening: true, folder: '/Users/me/mediamake' });
  assert.deepEqual(parsePoll({ place: 'cloud' }), { place: 'cloud', listening: false });
  assert.ok('error' in parsePoll({ place: 'a/b' }));
});

test('what the page may ask a place to do', () => {
  assert.deepEqual(parseCommand({ kind: 'message', run: 'ag-24990', message: '  the second look  ' }), { kind: 'message', run: 'ag-24990', message: 'the second look' });
  assert.deepEqual(parseCommand({ kind: 'stop', run: 'ag-24990' }), { kind: 'stop', run: 'ag-24990' });
  assert.match((parseCommand({ kind: 'message', run: 'ag-24990', message: ' ' }) as { error: string }).error, /Write a message/);
  assert.deepEqual(parseCommand({ kind: 'start', place: 'mac-7241', start: { task: 'Make a poster', cwd: '/Users/me/mediamake', model: 'sonnet', effort: 'medium', cap: 5 } }), {
    kind: 'start',
    place: 'mac-7241',
    start: { task: 'Make a poster', cwd: '/Users/me/mediamake', model: 'sonnet', effort: 'medium', cap: 5 },
  });
  assert.match((parseCommand({ kind: 'start', place: 'mac-7241', start: { task: 'x', cwd: '/a', model: 'gpt' } }) as { error: string }).error, /model/);
  assert.match((parseCommand({ kind: 'start', place: 'mac-7241', start: { task: 'x', cwd: '/a', cap: 5000 } }) as { error: string }).error, /cap/);
  assert.match((parseCommand({ kind: 'start', place: 'mac-7241', start: { task: '', cwd: '/a' } }) as { error: string }).error, /what it should do/);
  // a permission mode is never the page's to set
  assert.ok(!('mode' in (parseCommand({ kind: 'start', place: 'mac-7241', start: { task: 'x', cwd: '/a', mode: 'bypassPermissions' } }) as { start: object }).start));
  assert.ok('error' in parseCommand({ kind: 'dance' }));
});

const record = (id: string, more: Partial<AgentRecord> = {}): AgentRecord => ({
  clientId: 'ana',
  id,
  title: id,
  model: 'opus',
  effort: 'high',
  mode: 'auto',
  cap: 15,
  cwd: '/Users/me/mediamake',
  place: 'mac-7241',
  state: 'done',
  created: at(0),
  updated: at(5),
  reportedAt: at(5),
  events: 3,
  cost: 1.5,
  turns: [{ n: 1, at: at(0), endedAt: at(5), message: 'm', cost: 1.5 }],
  ...more,
});

test('the page: runs latest first, what needs you, the credit and who is listening', () => {
  const now = T0 + 6 * 60000;
  const places: AgentPlace[] = [
    { clientId: 'ana', name: 'mac-7241', seenAt: at(5), listeningAt: new Date(now - 10000).toISOString(), folders: ['/Users/me/mediamake'], credit: { total: 200, ends: '2026-11-29T00:00:00.000Z' } },
    { clientId: 'ana', name: 'cloud', seenAt: at(1), folders: [] },
  ];
  const queued: AgentCommand[] = [{ id: 'cm-aaaaaa', clientId: 'ana', kind: 'message', place: 'mac-7241', run: 'ag-bbbbb', message: 'the second', state: 'queued', at: at(5) }];
  const view = agentsView({
    now,
    places,
    commands: queued,
    runs: [
      record('ag-aaaaa'),
      record('ag-bbbbb', { state: 'needs-you', updated: at(5.5), cost: 2.25, turns: [{ n: 1, at: at(0), endedAt: at(5), message: 'm', cost: 2.25 }] }),
      record('ag-ccccc', { state: 'running', updated: at(5.8), reportedAt: at(5.8), last: 'Bash: mm render', cost: 0, turns: [{ n: 1, at: at(4), message: 'm' }] }),
      record('ag-ddddd', { state: 'running', updated: at(1), reportedAt: at(1), cost: 0, turns: [{ n: 1, at: at(0), message: 'm' }] }),
    ],
  });
  assert.deepEqual(view.runs.map(run => [run.id, run.state]), [['ag-ccccc', 'running'], ['ag-bbbbb', 'needs-you'], ['ag-aaaaa', 'done'], ['ag-ddddd', 'lost']]);
  assert.equal(view.runs[0].last, 'Bash: mm render');
  assert.equal(view.runs[1].waiting, 1);
  assert.deepEqual(view.counts, { running: 1, waiting: 0, needsYou: 1 });
  assert.equal(view.spent, 3.75);
  assert.equal(view.spentToday, 3.75);
  assert.deepEqual(view.credit, { total: 200, ends: '2026-11-29T00:00:00.000Z', ended: false, spent: 3.75, left: 196.25 });
  assert.deepEqual(view.places.map(place => [place.name, place.listening]), [['mac-7241', true], ['cloud', false]]);
  assert.equal(stateNow({ state: 'running', reportedAt: new Date(now - QUIET_MS - 1).toISOString() }, now), 'lost');
  assert.equal(stateNow({ state: 'done', reportedAt: at(-600) }, now), 'done');

  const one = runView(record('ag-bbbbb', { state: 'needs-you', updated: at(5.5) }), places[0], [...queued, { id: 'cm-bbbbbb', clientId: 'ana', kind: 'message', place: 'mac-7241', run: 'ag-bbbbb', message: 'more', state: 'failed', note: 'ag-bbbbb has spent its cap', at: at(5.6), doneAt: at(5.7) }], now);
  assert.equal(one.listening, true);
  assert.deepEqual(one.queued, [{ id: 'cm-aaaaaa', kind: 'message', message: 'the second', at: at(5) }]);
  assert.deepEqual(one.refused, { message: 'more', note: 'ag-bbbbb has spent its cap', at: at(5.7) });
});
