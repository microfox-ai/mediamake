import type { RunView } from './runs';
import type { TodoView } from './todos';

/**
 * The Runs tab as one board (components/projects/space-runs.tsx): a project's runs and its to-dos
 * together, a card each, sorted into four states and filtered by skill. A to-do that is a run's
 * step is not a card of its own: it shows inside its run. Pure.
 */

/** Waiting: for a place that can do it. Paused: stopped, anyone may go on. Running: someone has it. */
export type BoardState = 'waiting' | 'paused' | 'running' | 'finished';
/** What the filter offers: `open` is everything but finished. */
export const BOARD_FILTERS = ['open', 'waiting', 'paused', 'running', 'finished'] as const;
export type BoardFilter = (typeof BOARD_FILTERS)[number];
export const BOARD_LABEL: Record<BoardFilter, string> = { open: 'Open', waiting: 'Waiting', paused: 'Paused', running: 'Running', finished: 'Finished' };

export type BoardCard =
  | { kind: 'run'; key: string; state: BoardState; skill: string; at: string; run: RunView; /** The to-dos its steps wait for. */ todos: TodoView[] }
  | { kind: 'todo'; key: string; state: BoardState; skill?: string; at: string; todo: TodoView };

const RUN: Record<RunView['state'], BoardState> = { ready: 'paused', waiting: 'waiting', running: 'running', done: 'finished', cancelled: 'finished' };
/** A to-do that failed three times is stopped until a person opens it again. */
const TODO: Record<TodoView['state'], BoardState> = { open: 'waiting', claimed: 'running', failed: 'paused', done: 'finished', cancelled: 'finished' };
const ORDER: Record<BoardState, number> = { paused: 0, waiting: 1, running: 2, finished: 3 };

/** Every run, and every to-do that is not a listed run's step: what needs someone first, then the newest. */
export function boardCards(runs: RunView[], todos: TodoView[]): BoardCard[] {
  const slugs = new Set(runs.map(run => run.slug));
  const cards: BoardCard[] = [
    ...runs.map((run): BoardCard => ({ kind: 'run', key: `run:${run.slug}`, state: RUN[run.state], skill: run.skill, at: run.updatedAt, run, todos: todos.filter(todo => todo.run === run.slug && TODO[todo.state] !== 'finished') })),
    ...todos.filter(todo => !todo.run || !slugs.has(todo.run)).map((todo): BoardCard => ({ kind: 'todo', key: `todo:${todo.id}`, state: TODO[todo.state], ...(todo.skill && { skill: todo.skill }), at: todo.updatedAt, todo })),
  ];
  return cards.sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.at.localeCompare(a.at));
}

export const inFilter = (card: BoardCard, filter: BoardFilter): boolean => (filter === 'open' ? card.state !== 'finished' : card.state === filter);

/** How many cards each filter shows. */
export function boardCounts(cards: BoardCard[]): Record<BoardFilter, number> {
  const counts: Record<BoardFilter, number> = { open: 0, waiting: 0, paused: 0, running: 0, finished: 0 };
  for (const card of cards) {
    counts[card.state]++;
    if (card.state !== 'finished') counts.open++;
  }
  return counts;
}

/** The skills the cards were made with, by name, each with how many cards it has. */
export function boardSkills(cards: BoardCard[]): { skill: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const card of cards) if (card.skill) counts.set(card.skill, (counts.get(card.skill) ?? 0) + 1);
  return [...counts].map(([skill, count]) => ({ skill, count })).sort((a, b) => a.skill.localeCompare(b.skill));
}
