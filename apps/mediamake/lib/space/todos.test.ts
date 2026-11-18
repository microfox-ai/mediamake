import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PlaceRecord } from './register';
import { applyTodoAsk, CLAIM_MS, looksSecret, newTodo, parseTodoAsk, parseTodoPost, stateNow, todoIdOf, todoKey, todosView, type TodoActor, type TodoAsk, type TodoPost, type TodoRecord } from './todos';

const P1 = 'a'.repeat(24);
const T0 = new Date('2026-11-18T10:00:00.000Z');
const later = (ms: number) => new Date(T0.getTime() + ms);
const ana: TodoActor = { clientId: 'ana', role: 'owner' };
const ben: TodoActor = { clientId: 'ben', role: 'editor' };
const viv: TodoActor = { clientId: 'viv', role: 'viewer' };
const ask = (body: unknown) => parseTodoAsk(body) as TodoAsk;
const ok = (value: TodoRecord | { error: string }) => {
  assert.ok(!('error' in value), 'error' in value ? value.error : '');
  return value as TodoRecord;
};

const upload = () =>
  newTodo(
    'td-abc123',
    'ana',
    parseTodoPost({
      project: P1,
      title: '  Upload doomcat-0412   to YouTube ',
      needs: ['mcp:browse-hack', 'browser:youtube/doomcat', 'nonsense', 7],
      skill: 'doomcat',
      step: '5. Upload to YouTube',
      release: 'doomcat-0412',
      version: 'v2',
      commit: 'abc1234',
      then: 'nothing',
      from: 'cloud',
      extra: 'dropped',
    }) as TodoPost,
    T0.toISOString(),
  );

test('a post keeps the known fields and words, and refuses a secret', () => {
  assert.deepEqual(upload(), {
    id: 'td-abc123',
    rev: 1,
    project: P1,
    title: 'Upload doomcat-0412 to YouTube',
    skill: 'doomcat',
    step: '5. Upload to YouTube',
    release: 'doomcat-0412',
    version: 'v2',
    commit: 'abc1234',
    needs: ['mcp:browse-hack', 'browser:youtube/doomcat'],
    then: 'nothing',
    state: 'open',
    postedBy: 'ana',
    postedFrom: 'cloud',
    postedAt: T0.toISOString(),
    failures: 0,
    updatedAt: T0.toISOString(),
  });
  assert.ok('error' in parseTodoPost({ project: 'nope', title: 'x' }));
  assert.ok('error' in parseTodoPost({ project: P1, title: '   ' }));
  assert.ok('error' in parseTodoPost({ project: P1, title: 'Pick one', options: ['only one'] }));
  assert.ok('error' in parseTodoPost({ project: P1, title: 'Voice it', notes: 'use ELEVENLABS_API_KEY=sk-abcdefghijklmnopqrstuvwx' }));
  assert.ok(looksSecret('password: hunter22'));
  assert.ok(!looksSecret('needs the ElevenLabs key (key:elevenlabs) and the YouTube password manager'));
  assert.ok('error' in parseTodoAsk({ action: 'done', id: 'td-abc123', result: 'token=ghp_abcdefghijklmnopqrstuvwxyz0123' }));
  assert.equal(todoIdOf(' TD-ABC123 '), 'td-abc123');
  assert.equal(todoIdOf('abc123'), null);
  assert.equal(todoKey(upload()), 'doomcat-0412|doomcat|5. Upload to YouTube');
  assert.equal(todoKey({ step: 'x' }), null);
});

test('only one claim succeeds, and only whoever has it finishes it', () => {
  const todo = upload();
  assert.deepEqual(applyTodoAsk(todo, viv, ask({ action: 'claim', id: todo.id }), T0), { error: "Only the project's owners and editors work its to-dos" });
  const claimed = ok(applyTodoAsk(todo, ben, ask({ action: 'claim', id: todo.id, place: 'Studio Mac' }), later(1000)));
  assert.equal(claimed.state, 'claimed');
  assert.equal(claimed.rev, 2);
  assert.deepEqual(claimed.claim, { by: 'ben', place: 'Studio Mac', at: later(1000).toISOString() });
  assert.deepEqual(applyTodoAsk(claimed, ana, ask({ action: 'claim', id: todo.id }), later(2000)), { error: 'Someone else has it' });
  assert.deepEqual(applyTodoAsk(claimed, ana, ask({ action: 'done', id: todo.id, result: 'https://youtu.be/x' }), later(2000)), { error: 'Someone else has it' });
  // claiming what you already have keeps it
  assert.equal(ok(applyTodoAsk(claimed, ben, ask({ action: 'claim', id: todo.id }), later(3000))).state, 'claimed');
  const done = ok(applyTodoAsk(claimed, ben, ask({ action: 'done', id: todo.id, result: 'https://youtu.be/x' }), later(4000)));
  assert.equal(done.state, 'done');
  assert.equal(done.result, 'https://youtu.be/x');
  assert.equal(done.doneBy, 'ben');
  assert.equal(done.claim, undefined);
  assert.deepEqual(applyTodoAsk(done, ana, ask({ action: 'claim', id: todo.id }), later(5000)), { error: 'It is already done' });
  assert.deepEqual(applyTodoAsk(done, ana, ask({ action: 'cancel', id: todo.id }), later(5000)), { error: 'It is already done' });
});

test('a claim nobody finished, or by someone who left, is open again', () => {
  const claimed = ok(applyTodoAsk(upload(), ben, ask({ action: 'claim', id: 'td-abc123' }), T0));
  assert.equal(stateNow(claimed, T0.getTime() + CLAIM_MS - 1), 'claimed');
  assert.equal(stateNow(claimed, T0.getTime() + CLAIM_MS + 1), 'open');
  assert.equal(stateNow(claimed, T0.getTime(), new Set(['ana'])), 'open');
  const taken = ok(applyTodoAsk(claimed, ana, ask({ action: 'claim', id: claimed.id }), later(CLAIM_MS + 1000)));
  assert.equal(taken.claim?.by, 'ana');
  // and ben, whose claim ended, can no longer finish or fail it
  assert.deepEqual(applyTodoAsk(taken, ben, ask({ action: 'fail', id: claimed.id, reason: 'late' }), later(CLAIM_MS + 2000)), { error: 'Someone else has it' });
});

test('a failure opens it again with the reason, and the third stops it for a person', () => {
  let todo = upload();
  for (let round = 1; round <= 3; round++) {
    todo = ok(applyTodoAsk(todo, ben, ask({ action: 'claim', id: todo.id }), later(round * 1000)));
    todo = ok(applyTodoAsk(todo, ben, ask({ action: 'fail', id: todo.id, reason: `signed out of YouTube (${round})` }), later(round * 1000 + 1)));
    assert.equal(todo.state, round < 3 ? 'open' : 'failed');
    assert.equal(todo.failures, round);
    assert.equal(todo.claim, undefined);
  }
  assert.equal(todo.reason, 'signed out of YouTube (3)');
  assert.ok('error' in applyTodoAsk(todo, ben, ask({ action: 'claim', id: todo.id }), later(9000)));
  const again = ok(applyTodoAsk(todo, ana, ask({ action: 'reopen', id: todo.id }), later(9000)));
  assert.deepEqual([again.state, again.failures, again.reason], ['open', 0, undefined]);
  // giving it back is not a failure
  const held = ok(applyTodoAsk(again, ben, ask({ action: 'claim', id: todo.id }), later(9500)));
  const back = ok(applyTodoAsk(held, ben, ask({ action: 'release', id: todo.id }), later(9600)));
  assert.deepEqual([back.state, back.failures], ['open', 0]);
  const cancelled = ok(applyTodoAsk(back, ana, ask({ action: 'cancel', id: todo.id, reason: 'A newer version replaced it' }), later(9700)));
  assert.deepEqual([cancelled.state, cancelled.reason], ['cancelled', 'A newer version replaced it']);
});

test("a step that needs a person's yes is not finished before it has one, and a choice is answered with an option", () => {
  const publish = newTodo('td-yes001', 'ana', parseTodoPost({ project: P1, title: 'Publish the release', needs: [], yes: true }) as TodoPost, T0.toISOString());
  assert.deepEqual(applyTodoAsk(publish, ben, ask({ action: 'done', id: publish.id }), T0), { error: "It needs a person's yes first" });
  const agreed = ok(applyTodoAsk(publish, ana, ask({ action: 'yes', id: publish.id }), later(1000)));
  assert.deepEqual(agreed.agreed, { by: 'ana', at: later(1000).toISOString() });
  assert.equal(ok(applyTodoAsk(agreed, ben, ask({ action: 'done', id: publish.id }), later(2000))).state, 'done');
  assert.ok('error' in applyTodoAsk(upload(), ana, ask({ action: 'yes', id: 'td-abc123' }), T0));

  const choice = newTodo('td-pick01', 'ana', parseTodoPost({ project: P1, title: 'Pick the thumbnail', options: ['A', 'B', 'B', 'C'] }) as TodoPost, T0.toISOString());
  assert.deepEqual(choice.options, ['A', 'B', 'C']);
  assert.ok('error' in applyTodoAsk(choice, ben, ask({ action: 'claim', id: choice.id }), T0));
  assert.ok('error' in applyTodoAsk(choice, ben, ask({ action: 'done', id: choice.id, result: 'D' }), T0));
  assert.equal(ok(applyTodoAsk(choice, ben, ask({ action: 'done', id: choice.id, result: 'B' }), T0)).result, 'B');
});

test('the view offers a to-do to the places that have everything it needs', () => {
  const place = (over: Partial<PlaceRecord>): PlaceRecord => ({ id: 'x', kind: 'device', clientId: 'ben', label: 'mac-1', can: [], projects: [], reportedAt: T0.toISOString(), ...over });
  const places = [
    place({ id: 'cloud:ana/cloud', kind: 'cloud', clientId: 'ana', label: 'cloud', can: ['render', 'key:elevenlabs'], projects: [P1] }),
    place({ id: 'device:ben/mac-1', name: 'Studio Mac', can: ['render', 'mcp:browse-hack', 'browser:youtube/doomcat'], projects: [P1] }),
    // ana's own computer, closed to the project: hers to use all the same
    place({ id: 'device:ana/mac-2', clientId: 'ana', label: 'mac-2', can: ['mcp:browse-hack', 'browser:youtube/doomcat'] }),
    place({ id: 'device:ben/mac-3', label: 'mac-3', can: ['mcp:browse-hack'], projects: [P1] }),
  ];
  const claimed = ok(applyTodoAsk({ ...upload(), id: 'td-held01', title: 'Make the pictures', needs: ['browser:midjourney'] }, ben, ask({ action: 'claim', id: 'td-held01', place: 'Studio Mac' }), T0));
  const done = ok(applyTodoAsk({ ...upload(), id: 'td-done01' }, ana, ask({ action: 'done', id: 'td-done01', result: 'https://youtu.be/x' }), T0));
  const view = todosView({ project: P1, name: 'Doomcat', role: 'owner', me: 'ana', todos: [done, claimed, upload()], places, names: { ben: 'Ben' }, now: T0.getTime() + 1000 });
  assert.deepEqual(view.todos.map(t => [t.id, t.state]), [['td-abc123', 'open'], ['td-held01', 'claimed'], ['td-done01', 'done']]);
  assert.equal(view.waiting, 1);
  const [open, held, finished] = view.todos;
  assert.equal(open.line, 'Pick up to-do td-abc123 in Doomcat');
  assert.deepEqual(open.places, ['Studio Mac', 'Mac 2']);
  assert.deepEqual(open.yours, ['Mac 2']);
  assert.deepEqual(open.needs[1], { need: 'browser:youtube/doomcat', label: 'a browser signed in to youtube as doomcat' });
  assert.deepEqual([held.claimedBy, held.claimedOn, held.mine, held.places], ['Ben', 'Studio Mac', false, []]);
  assert.deepEqual([finished.result, finished.doneBy], ['https://youtu.be/x', 'You']);
});
