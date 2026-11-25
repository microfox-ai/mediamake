import type { LineEdit, LineMove, Place, TLine, TWord } from './types';

/*
 * The song's lines edited like text: Enter splits a line at the caret (the words after it become a new line just
 * below), Backspace at a line's start joins it to the line above. The transcript is never written: a split or a join
 * gives every word whose stanza or line changes a line move in the revision (the stanza's later lines are renumbered
 * too), and a line edit that says what happened in words. The rule for the numbers is on LineEdit (types.ts).
 *
 * The caret sits between two words of a line, at its start or at its end. It's kept by the word it touches, so it
 * stays put while lines are split and joined around it.
 */

export type MoveReason = NonNullable<LineMove['by']>;

/** What a split or a join changes: the words whose place changes, with their new place and why, and the edit in words. */
export interface Relining {
  places: Map<number, Place & { by: MoveReason }>;
  edit: LineEdit;
}

/** Why a split or a join can't be done there. */
export type ReliningError = 'line-start' | 'first-line' | 'unnumbered' | 'no-word';

export type ReliningResult = Relining | { error: ReliningError };

type NumberedLine = TLine & { line: number };

const numbered = (l: TLine | undefined): l is NumberedLine => typeof l?.line === 'number';
const placeOf = (l: TLine): Place => ({ stanza: l.stanza, line: l.line });
const textOf = (ws: TWord[]) => ws.map(w => w.text).join(' ');

/** The lines right after line k in the same stanza, up to the next stanza. */
function laterInStanza(lines: TLine[], k: number, stanza: number | undefined): NumberedLine[] {
  const out: NumberedLine[] = [];
  for (let m = k + 1; m < lines.length; m++) {
    const l = lines[m];
    if (l.stanza !== stanza || !numbered(l)) break;
    out.push(l);
  }
  return out;
}

/** Split the line holding word `i` before it: `i` and the words after it become a new line just below. */
export function splitLine(lines: TLine[], i: number): ReliningResult {
  const k = lines.findIndex(l => l.words.some(w => w.i === i));
  if (k < 0) return { error: 'no-word' };
  const l = lines[k];
  const at = l.words.findIndex(w => w.i === i);
  if (at === 0) return { error: 'line-start' };
  if (!numbered(l)) return { error: 'unnumbered' };
  const to: Place = { stanza: l.stanza, line: l.line + 1 };
  const moving = l.words.slice(at);
  const places: Relining['places'] = new Map();
  for (const w of moving) places.set(w.i, { ...to, by: 'split' });
  const later = laterInStanza(lines, k, l.stanza);
  for (const x of later) for (const w of x.words) places.set(w.i, { stanza: x.stanza, line: x.line + 1, by: 'renumber' });
  return { places, edit: { kind: 'split', i, text: l.words[at].text, line: l.text, at: placeOf(l), to, toLine: textOf(moving), renumbered: later.length } };
}

/** Join line k to the line above it: its words go on the end of that line. */
export function joinLine(lines: TLine[], k: number): ReliningResult {
  const l = lines[k];
  if (!l?.words.length) return { error: 'no-word' };
  const above = lines[k - 1];
  if (!above) return { error: 'first-line' };
  if (!numbered(l) || !numbered(above)) return { error: 'unnumbered' };
  const to = placeOf(above);
  const places: Relining['places'] = new Map();
  for (const w of l.words) places.set(w.i, { ...to, by: 'join' });
  const later = laterInStanza(lines, k, l.stanza);
  for (const x of later) for (const w of x.words) places.set(w.i, { stanza: x.stanza, line: x.line - 1, by: 'renumber' });
  const first = l.words[0];
  return { places, edit: { kind: 'join', i: first.i, text: first.text, line: l.text, at: placeOf(l), to, toLine: above.text, renumbered: later.length } };
}

/**
 * The revision's line moves after a split or a join: every word whose place now differs from the transcript's
 * (`base`), the others dropped. A renumbered word keeps why it moved first when it was split off or joined; a word
 * pushed on its own becomes renumbered (putting it back on its line alone would no longer fit the numbers).
 */
export function relinedMoves(base: TWord[], moves: LineMove[], r: Relining): LineMove[] {
  const out = new Map(moves.map(m => [m.i, m]));
  for (const [i, p] of r.places) {
    const o = base[i];
    if (!o) continue;
    if (o.stanza === p.stanza && o.line === p.line) {
      out.delete(i);
      continue;
    }
    const prev = out.get(i);
    const by: MoveReason = p.by === 'renumber' && (prev?.by === 'split' || prev?.by === 'join') ? prev.by : p.by;
    out.set(i, { i, text: o.text, from: { stanza: o.stanza, line: o.line }, to: { stanza: p.stanza, line: p.line }, toLine: prev?.toLine ?? '', by });
  }
  return [...out.values()].sort((a, b) => a.i - b.i);
}

/** Each move's toLine as the line reads now. */
export function withLineTexts(moves: LineMove[], lines: TLine[]): LineMove[] {
  const text = new Map<number, string>();
  for (const l of lines) for (const w of l.words) text.set(w.i, l.text);
  return moves.map(m => {
    const t = text.get(m.i);
    return t === undefined || t === m.toLine ? m : { ...m, toLine: t };
  });
}

/** Whether a move came from a split or a join (undone with ⌘Z, not on its own). */
export const isRelining = (m: LineMove) => !!m.by;

const samePlace = (a: Place, b: Place) => a.stanza === b.stanza && a.line === b.line;

/** Moves in runs: words in a row going from one place to another for one reason (a push, a split, a renumbered line). */
export function moveRuns(moves: LineMove[]): LineMove[][] {
  const runs: LineMove[][] = [];
  for (const m of [...moves].sort((a, b) => a.i - b.i)) {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (run && last && last.i === m.i - 1 && last.by === m.by && samePlace(last.from, m.from) && samePlace(last.to, m.to)) run.push(m);
    else runs.push([m]);
  }
  return runs;
}

// ── the caret ─────────────────────────────────────────────────────────────────

/** Before word `i`, or after it when `end` (the end of its line). */
export interface Caret {
  i: number;
  end: boolean;
}

/** A caret as a line (k, an index in `lines`) and a slot in it (p: 0 is the line's start, its word count its end). */
export interface Slot {
  k: number;
  p: number;
}

export function slotOf(lines: TLine[], caret: Caret | null): Slot | null {
  if (!caret) return null;
  for (let k = 0; k < lines.length; k++) {
    const p = lines[k].words.findIndex(w => w.i === caret.i);
    if (p >= 0) return { k, p: caret.end ? lines[k].words.length : p };
  }
  return null;
}

/** The caret at slot p of line k (clamped to the song). */
export function caretAt(lines: TLine[], k: number, p: number): Caret | null {
  const l = lines[Math.max(0, Math.min(lines.length - 1, k))];
  if (!l?.words.length) return null;
  const at = Math.max(0, Math.min(l.words.length, p));
  return at < l.words.length ? { i: l.words[at].i, end: false } : { i: l.words[at - 1].i, end: true };
}

/** One word left or right, across lines at their ends, as a text caret moves. */
export function stepCaret(lines: TLine[], caret: Caret, d: -1 | 1): Caret {
  const s = slotOf(lines, caret);
  if (!s) return caret;
  const len = lines[s.k].words.length;
  if (d < 0) return s.p > 0 ? caretAt(lines, s.k, s.p - 1)! : s.k > 0 ? caretAt(lines, s.k - 1, lines[s.k - 1].words.length)! : caret;
  return s.p < len ? caretAt(lines, s.k, s.p + 1)! : s.k < lines.length - 1 ? caretAt(lines, s.k + 1, 0)! : caret;
}
