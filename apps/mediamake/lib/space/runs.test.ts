import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PlaceRecord } from './register';
import { afterTodo, applyRunAsk, HOLD_MS, parseRunAsk, runNow, runsView, sheetSteps, startRun, todoForStep, type RunActor, type RunAsk, type RunRecord } from './runs';

const P1 = 'a'.repeat(24);
const T0 = new Date('2026-11-18T10:00:00.000Z');
const later = (ms: number) => new Date(T0.getTime() + ms);
const ana: RunActor = { clientId: 'ana', role: 'owner' };
const ben: RunActor = { clientId: 'ben', role: 'editor' };
const viv: RunActor = { clientId: 'viv', role: 'viewer' };
const at = { project: P1, slug: 'doomcat-0412' };
type Start = Extract<RunAsk, { action: 'start' }>;
type Other = Exclude<RunAsk, { action: 'start' }>;
const ask = (body: Record<string, unknown>) => parseRunAsk({ ...at, ...body }) as Other;
const ok = (value: RunRecord | { error: string }) => {
  assert.ok(!('error' in value), 'error' in value ? value.error : '');
  return value as RunRecord;
};

const SHEET = [
  { step: 'Write the short', needs: [], repeat: true },
  { step: 'Voice it', needs: ['key:elevenlabs'], repeat: true },
  { step: 'Build and render', needs: ['render'], repeat: true },
  { step: 'Upload to YouTube', needs: ['mcp:browse-hack', 'browser:youtube/doomcat'] },
];
const start = (more: Record<string, unknown> = {}) => parseRunAsk({ action: 'start', ...at, skill: 'doomcat', title: 'Doomcat 0412', steps: SHEET, place: 'cloud', ...more }) as Start;
const begun = () => ok(startRun(null, ana, start(), T0));
/** Steps 1 to `upTo` saved by ana in the cloud. */
const savedTo = (upTo: number) => {
  let run = begun();
  for (let n = 1; n <= upTo; n++) run = ok(applyRunAsk(run, ana, ask({ action: 'save', step: n, place: 'cloud', output: `step ${n} saved` }), later(n * 1000)));
  return run;
};

test('an ask keeps the known fields, and refuses a secret', () => {
  assert.deepEqual(sheetSteps([{ step: ' Voice  it ', needs: ['key:elevenlabs', 'nonsense'], yes: 'yes', repeat: true }, { step: 'Voice it', needs: [] }, { needs: [] }]), [{ step: 'Voice it', needs: ['key:elevenlabs'], repeat: true }]);
  assert.ok('error' in parseRunAsk({ action: 'start', ...at, slug: 'Doomcat 0412', skill: 'doomcat', steps: SHEET }));
  assert.ok('error' in parseRunAsk({ action: 'start', ...at, skill: 'doomcat', steps: [] }));
  assert.ok('error' in parseRunAsk({ action: 'save', ...at, step: 0 }));
  assert.ok('error' in parseRunAsk({ action: 'save', ...at, step: 1, output: 'token=ghp_abcdefghijklmnopqrstuvwxyz0123' }));
  assert.deepEqual(ask({ action: 'save', step: 3, place: 'cloud', saved: { production: 2, release: { slug: 'doomcat-0412', version: 1, folder: 'out/youtube/doomcat-0412' }, commit: 'abc1234', path: '/Users/ana' } }), {
    action: 'save',
    ...at,
    step: 3,
    place: 'cloud',
    saved: { production: 2, release: { slug: 'doomcat-0412', version: 1, folder: 'out/youtube/doomcat-0412' }, commit: 'abc1234' },
  });
  // a folder is a workspace folder, never a path on someone's computer
  assert.deepEqual((ask({ action: 'save', step: 3, saved: { release: { slug: 'doomcat-0412', version: 1, folder: '/Users/ana/out' } } }) as { saved?: unknown }).saved, { release: { slug: 'doomcat-0412', version: 1 } });
  assert.equal((ask({ action: 'step', step: 3, hours: 99 }) as { hours?: number }).hours, 12);
});

test('a production runs once at a time: the second start is told it is already running', () => {
  assert.deepEqual(startRun(null, viv, start(), T0), { error: "Only the project's owners and editors run its productions" });
  const run = begun();
  assert.deepEqual([run.state, run.rev, run.steps.map(s => s.state).join()], ['open', 1, 'todo,todo,todo,todo']);
  assert.deepEqual(run.hold, { by: 'ana', place: 'cloud', at: T0.toISOString(), until: later(HOLD_MS).toISOString() });
  assert.deepEqual(startRun(run, ben, start({ place: 'Studio Mac' }), later(1000)), { error: 'It is already running', held: true });
  // the same account from another place is another place
  assert.deepEqual(startRun(run, ana, start({ place: 'Mac 2' }), later(1000)), { error: 'It is already running', held: true });
  assert.deepEqual(applyRunAsk(run, ben, ask({ action: 'resume', place: 'Studio Mac' }), later(1000)), { error: 'It is already running', held: true });
  // the session that has it, starting again, keeps it
  assert.equal(ok(startRun(run, ana, start(), later(1000))).rev, 2);
  // once it stopped, it is continued, never started over
  const stopped = ok(applyRunAsk(run, ana, ask({ action: 'stop' }), later(2000)));
  assert.match((startRun(stopped, ben, start({ place: 'Studio Mac' }), later(3000)) as { error: string }).error, /stopped at step 1: continue it instead \(mm run resume doomcat-0412\)/);
});

test('every step ends by saving, in the order of the run sheet, and a saved step is never done again', () => {
  let run = begun();
  assert.match((applyRunAsk(run, ana, ask({ action: 'step', step: 2, place: 'cloud' }), T0) as { error: string }).error, /Step 1 \(Write the short\) isn't saved yet/);
  assert.match((applyRunAsk(run, ben, ask({ action: 'save', step: 1, place: 'Studio Mac' }), T0) as { error: string }).error, /already running/);
  run = ok(applyRunAsk(run, ana, ask({ action: 'step', step: 1, place: 'cloud', hours: 3 }), later(1000)));
  assert.deepEqual([run.steps[0].state, run.steps[0].by, run.steps[0].place, run.hold?.until], ['started', 'ana', 'cloud', later(1000 + 3 * 60 * 60 * 1000).toISOString()]);
  run = ok(applyRunAsk(run, ana, ask({ action: 'save', step: 1, place: 'cloud', output: 'production v1', saved: { production: 1 } }), later(2000)));
  assert.deepEqual([run.steps[0].state, run.steps[0].output, run.saved], ['done', 'production v1', { production: 1 }]);
  assert.match((applyRunAsk(run, ana, ask({ action: 'step', step: 1, place: 'cloud' }), later(3000)) as { error: string }).error, /already saved: a saved step is never done again/);
  // a step can be saved without saying it started, and what was saved before is kept
  run = ok(applyRunAsk(run, ana, ask({ action: 'save', step: 2, place: 'cloud', saved: { commit: 'abc1234' } }), later(4000)));
  assert.deepEqual(run.saved, { production: 1, commit: 'abc1234' });
  run = ok(applyRunAsk(run, ana, ask({ action: 'save', step: 3, place: 'cloud', saved: { production: 2 } }), later(5000)));
  run = ok(applyRunAsk(run, ana, ask({ action: 'save', step: 4, place: 'cloud', output: 'https://youtu.be/x' }), later(6000)));
  assert.deepEqual([run.state, run.hold, run.doneAt, run.saved?.production], ['done', undefined, later(6000).toISOString(), 2]);
  assert.deepEqual(applyRunAsk(run, ana, ask({ action: 'resume', place: 'cloud' }), later(7000)), { error: 'It already ran to the end' });
  // run again only when asked to
  assert.match((startRun(run, ana, start(), later(8000)) as { error: string }).error, /already ran to the end/);
  const again = ok(startRun(run, ana, start({ again: true }), later(8000)));
  assert.deepEqual([again.state, again.rev, again.saved, again.steps[0].state], ['open', run.rev + 1, undefined, 'todo']);
});

test('a run stopped in one place continues in another, and a step that was never saved is done again', () => {
  let run = savedTo(1);
  run = ok(applyRunAsk(run, ana, ask({ action: 'step', step: 2, place: 'cloud' }), later(5000)));
  // the session dies: nothing more is heard
  assert.equal(runNow(run, T0.getTime() + 5000 + HOLD_MS - 1), 'running');
  assert.equal(runNow(run, T0.getTime() + 5000 + HOLD_MS + 1), 'ready');
  // and so does the hold of someone who left the project
  assert.equal(runNow(run, T0.getTime() + 6000, new Set(['ben'])), 'ready');
  const after = later(5000 + HOLD_MS + 1000);
  assert.match((applyRunAsk(run, ben, ask({ action: 'save', step: 2, place: 'Studio Mac' }), after) as { error: string }).error, /No place has this run now: continue it first/);
  run = ok(applyRunAsk(run, ben, ask({ action: 'resume', place: 'Studio Mac' }), after));
  assert.deepEqual([run.hold?.by, run.hold?.place, run.steps[0].state, run.steps[1].state, run.steps[1].place], ['ben', 'Studio Mac', 'done', 'started', 'cloud']);
  // ana's session, back from the dead, can no longer save over it
  assert.deepEqual(applyRunAsk(run, ana, ask({ action: 'save', step: 2, place: 'cloud' }), later(HOLD_MS + 9000)), { error: 'It is already running', held: true });
  run = ok(applyRunAsk(run, ben, ask({ action: 'step', step: 2, place: 'Studio Mac' }), later(HOLD_MS + 10000)));
  assert.deepEqual([run.steps[1].by, run.steps[1].place], ['ben', 'Studio Mac']);
  // an owner frees a run that someone else has; an editor can't
  assert.match((applyRunAsk(run, { clientId: 'cy', role: 'editor' }, ask({ action: 'stop' }), later(HOLD_MS + 11000)) as { error: string }).error, /Only whoever has the run/);
  assert.equal(ok(applyRunAsk(run, ana, ask({ action: 'stop' }), later(HOLD_MS + 11000))).hold, undefined);
});

test('a step this place cannot do waits as a to-do, and finishing the to-do saves the step', () => {
  let run = savedTo(3);
  const post = todoForStep({ ...run, saved: { production: 2, commit: 'abc1234' } }, 3, {});
  assert.deepEqual(post, {
    project: P1,
    title: 'Upload to YouTube: Doomcat 0412',
    skill: 'doomcat',
    step: 'Upload to YouTube',
    production: 'doomcat-0412',
    version: 'v2',
    commit: 'abc1234',
    needs: ['mcp:browse-hack', 'browser:youtube/doomcat'],
    then: "that is the run's last step",
    run: 'doomcat-0412',
  });
  assert.deepEqual([todoForStep({ ...run, saved: { release: { slug: 'doomcat-0412-yt', version: 3 } } }, 3, { title: 'Upload it' }).release, todoForStep(run, 2, {}).then], ['doomcat-0412-yt', 'the run goes on with step 4 (Upload to YouTube): Continue doomcat-0412']);
  assert.deepEqual(applyRunAsk(run, ana, ask({ action: 'wait', step: 4 }), later(10000)), { error: 'A step waits for a to-do' });
  run = ok(applyRunAsk(run, ana, ask({ action: 'wait', step: 4 }), later(10000), 'td-abc234'));
  assert.deepEqual([run.hold, run.steps[3].state, run.steps[3].todo, runNow(run, T0.getTime() + 11000)], [undefined, 'waiting', 'td-abc234', 'waiting']);
  // while it waits, the step isn't done by hand
  const held = ok(applyRunAsk(run, ben, ask({ action: 'resume', place: 'Studio Mac' }), later(12000)));
  assert.match((applyRunAsk(held, ben, ask({ action: 'save', step: 4, place: 'Studio Mac' }), later(13000)) as { error: string }).error, /waits for to-do td-abc234: pick that up here instead/);
  // cancelled by a person: the step is the run's again
  const back = afterTodo(run, { id: 'td-abc234', state: 'cancelled' }, later(14000));
  assert.deepEqual([back?.steps[3].state, back?.steps[3].todo, back && runNow(back, T0.getTime() + 15000)], ['todo', undefined, 'ready']);
  // done: the step is saved with the to-do's result, and the last step ends the run
  const done = afterTodo(run, { id: 'td-abc234', state: 'done', result: 'https://youtu.be/x', doneBy: 'ben', place: 'Studio Mac' }, later(14000));
  assert.deepEqual([done?.state, done?.steps[3].state, done?.steps[3].output, done?.steps[3].by, done?.steps[3].place], ['done', 'done', 'https://youtu.be/x', 'ben', 'Studio Mac']);
  // the place that has the run finished its last step through the to-do: the run is over, and nobody has it
  assert.deepEqual([afterTodo(held, { id: 'td-abc234', state: 'done' }, later(14000))?.state, afterTodo(held, { id: 'td-abc234', state: 'done' }, later(14000))?.hold], ['done', undefined]);
  // a device step in the middle: the run is ready to continue
  let middle = savedTo(1);
  middle = ok(applyRunAsk(middle, ana, ask({ action: 'wait', step: 2 }), later(20000), 'td-voice2'));
  const ready = afterTodo(middle, { id: 'td-voice2', state: 'done', doneBy: 'ben' }, later(21000));
  assert.deepEqual([ready?.state, ready && runNow(ready, T0.getTime() + 22000), ready?.steps[1].state], ['open', 'ready', 'done']);
  assert.equal(afterTodo(middle, { id: 'td-other1', state: 'cancelled' }, later(21000)), null);
  // a to-do opened again after it was cancelled still finds its step, by name
  assert.equal(afterTodo(back!, { id: 'td-abc234', step: 'Upload to YouTube', state: 'done', result: 'https://youtu.be/y' }, later(22000))?.steps[3].output, 'https://youtu.be/y');
  const cancelled = ok(applyRunAsk(run, ben, ask({ action: 'cancel', reason: 'A better take exists' }), later(23000)));
  assert.deepEqual([cancelled.state, cancelled.reason, afterTodo(cancelled, { id: 'td-abc234', state: 'done' }, later(24000))], ['cancelled', 'A better take exists', null]);
});

test('the view says what comes next and which place can do it', () => {
  const place = (over: Partial<PlaceRecord>): PlaceRecord => ({ id: 'x', kind: 'device', clientId: 'ben', label: 'mac-1', can: [], projects: [], reportedAt: T0.toISOString(), ...over });
  const places = [
    place({ id: 'cloud:ana/cloud', kind: 'cloud', clientId: 'ana', label: 'cloud', can: ['render', 'key:elevenlabs'], projects: [P1] }),
    place({ id: 'device:ben/mac-1', name: 'Studio Mac', can: ['render', 'mcp:browse-hack', 'browser:youtube/doomcat'], projects: [P1] }),
  ];
  const waiting = ok(applyRunAsk(savedTo(3), ana, ask({ action: 'wait', step: 4 }), later(10000), 'td-abc234'));
  let unsaved = ok(startRun(null, ben, start({ slug: 'doomcat-0413', title: undefined }), T0));
  unsaved = ok(applyRunAsk(unsaved, ben, { ...ask({ action: 'step', step: 1, place: 'cloud' }), slug: 'doomcat-0413' }, later(1000)));
  const running = ok(startRun(null, ana, start({ slug: 'doomcat-0414' }), later(HOLD_MS)));
  const view = runsView({ project: P1, name: 'Doomcat', role: 'owner', me: 'ana', runs: [waiting, unsaved, running], places, names: { ben: 'Ben' }, todos: { 'td-abc234': 'claimed' }, now: T0.getTime() + HOLD_MS + 5000 });
  assert.deepEqual(view.runs.map(run => [run.slug, run.state]), [['doomcat-0413', 'ready'], ['doomcat-0412', 'waiting'], ['doomcat-0414', 'running']]);
  assert.equal(view.ready, 1);
  const [ready, waits, runs] = view.runs;
  assert.deepEqual([ready.title, ready.line, ready.steps[0].state, ready.steps[0].by, ready.steps[0].place, ready.mine], ['doomcat-0413', 'Continue doomcat-0413 in Doomcat', 'unsaved', 'Ben', 'cloud', false]);
  assert.deepEqual(ready.next, { n: 1, step: 'Write the short', needs: [], places: ['Cloud environment', 'Studio Mac'], yours: [] });
  assert.deepEqual([waits.done, waits.steps[3].state, waits.steps[3].todo, waits.steps[3].todoState, waits.next?.places], [3, 'waiting', 'td-abc234', 'claimed', ['Studio Mac']]);
  assert.deepEqual(waits.steps[3].needs[1], { need: 'browser:youtube/doomcat', label: 'a browser signed in to youtube as doomcat' });
  assert.deepEqual([runs.heldBy, runs.heldOn, runs.mine, runs.steps[0].state], ['You', 'cloud', true, 'todo']);
});
