import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { boardCards, boardCounts, boardSkills, inFilter } from './board';
import type { RunView } from './runs';
import type { TodoView } from './todos';

const run = (slug: string, state: RunView['state'], skill = 'make-episode', updatedAt = '2026-11-20T10:00:00Z') => ({ slug, state, skill, updatedAt }) as RunView;
const todo = (id: string, state: TodoView['state'], more: Partial<TodoView> = {}) => ({ id, state, updatedAt: '2026-11-20T09:00:00Z', ...more }) as TodoView;

describe('the Runs board', () => {
  const cards = boardCards(
    [run('ep-12', 'done'), run('ep-13', 'waiting'), run('ep-14', 'ready'), run('short-3', 'running', 'make-shorts')],
    [todo('td-1', 'open', { run: 'ep-13', skill: 'make-episode' }), todo('td-2', 'failed', { skill: 'make-shorts' }), todo('td-3', 'open'), todo('td-4', 'done', { run: 'ep-12' }), todo('td-5', 'claimed', { run: 'gone' })],
  );

  it("shows a run's to-do inside the run, and the others as cards", () => {
    assert.deepEqual(cards.map(card => card.key).sort(), ['run:ep-12', 'run:ep-13', 'run:ep-14', 'run:short-3', 'todo:td-2', 'todo:td-3', 'todo:td-5']);
    const waiting = cards.find(card => card.key === 'run:ep-13');
    assert.deepEqual(waiting?.kind === 'run' && waiting.todos.map(t => t.id), ['td-1']);
    const done = cards.find(card => card.key === 'run:ep-12');
    assert.deepEqual(done?.kind === 'run' && done.todos, []);
  });

  it('sorts them into waiting, paused, running and finished, what needs someone first', () => {
    assert.deepEqual(cards.map(card => `${card.key} ${card.state}`), ['run:ep-14 paused', 'todo:td-2 paused', 'run:ep-13 waiting', 'todo:td-3 waiting', 'run:short-3 running', 'todo:td-5 running', 'run:ep-12 finished']);
    assert.deepEqual(boardCounts(cards), { open: 6, waiting: 2, paused: 2, running: 2, finished: 1 });
  });

  it('counts open as everything but finished', () => {
    assert.deepEqual(cards.filter(card => inFilter(card, 'open')).length, 6);
    assert.deepEqual(cards.filter(card => inFilter(card, 'finished')).map(card => card.key), ['run:ep-12']);
  });

  it('lists the skills by name', () => {
    assert.deepEqual(boardSkills(cards), [{ skill: 'make-episode', count: 3 }, { skill: 'make-shorts', count: 2 }]);
  });
});
