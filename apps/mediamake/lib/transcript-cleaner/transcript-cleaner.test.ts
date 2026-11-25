import assert from 'node:assert/strict';
import { test } from 'node:test';
import { caretAt, joinLine, relinedMoves, slotOf, splitLine, stepCaret, withLineTexts, type Relining } from './lines';
import { changeCount, instructionsOf, linesOf, revisedWords, wordsOf } from './transcript';
import type { TranscriptFile, TranscriptRevision } from './types';

// stanza 1: "a b c" / "d e" / "f" · stanza 2: "g h" / "i"
const LAYOUT: [string, number, number][] = [
  ['a', 1, 1],
  ['b', 1, 1],
  ['c', 1, 1],
  ['d', 1, 2],
  ['e', 1, 2],
  ['f', 1, 3],
  ['g', 2, 1],
  ['h', 2, 1],
  ['i', 2, 2],
];

const DOC: TranscriptFile = {
  words: LAYOUT.flatMap(([text, stanza, line], n) => [
    { text, start: n, end: n + 0.5, type: 'word', stanza, line },
    { text: ' ', start: n + 0.5, end: n + 1, type: 'spacing' },
  ]),
  check: [{ stanza: 1, line: 2, at: 3, why: ['check d e'] }],
};

const base = wordsOf(DOC);

const emptyRev = (): TranscriptRevision => ({
  schema: 'mediamake.transcript-revision/v1',
  id: 'rev-001',
  song: 'song',
  folder: 'song',
  transcript: 'song.transcript.json',
  audio: 'song.wav',
  status: 'open',
  lead: 0.3,
  createdAt: '',
  updatedAt: '',
  marks: [],
  timings: [],
  deleted: [],
  rewrites: [],
  lineMoves: [],
  lineEdits: [],
});

/** What the store does with a split or a join: the moves, the words and lines as they read after it. */
function apply(rev: TranscriptRevision, r: Relining | { error: string }) {
  if ('error' in r) throw new Error(r.error);
  const moved = relinedMoves(base, rev.lineMoves ?? [], r);
  const next: TranscriptRevision = { ...rev, lineMoves: moved, lineEdits: moved.some(m => m.by) ? [...(rev.lineEdits ?? []), r.edit] : [] };
  const words = revisedWords(base, base, next);
  const lines = linesOf(words, DOC);
  return { rev: { ...next, lineMoves: withLineTexts(moved, lines) }, words, lines };
}

const texts = (lines: ReturnType<typeof linesOf>) => lines.map(l => `${l.stanza}.${l.line} ${l.text}`);

test('a transcript reads as its stanzas and lines', () => {
  assert.equal(base.length, 9);
  assert.deepEqual(texts(linesOf(base, DOC)), ['1.1 a b c', '1.2 d e', '1.3 f', '2.1 g h', '2.2 i']);
});

test('a split makes the words after the caret a new line and moves the stanza’s later lines down one', () => {
  const lines = linesOf(base, DOC);
  const { rev, lines: after } = apply(emptyRev(), splitLine(lines, 1)); // before "b"
  assert.deepEqual(texts(after), ['1.1 a', '1.2 b c', '1.3 d e', '1.4 f', '2.1 g h', '2.2 i']);
  // every word whose place changes is a move, the later lines too; the next stanza is untouched
  assert.deepEqual(
    rev.lineMoves!.map(m => `#${m.i} ${m.from.line}→${m.to.line} ${m.by}`),
    ['#1 1→2 split', '#2 1→2 split', '#3 2→3 renumber', '#4 2→3 renumber', '#5 3→4 renumber'],
  );
  assert.equal(rev.lineMoves![0].toLine, 'b c');
  assert.equal(rev.lineEdits!.length, 1);
  assert.deepEqual(rev.lineEdits![0], { kind: 'split', i: 1, text: 'b', line: 'a b c', at: { stanza: 1, line: 1 }, to: { stanza: 1, line: 2 }, toLine: 'b c', renumbered: 2 });
  assert.equal(changeCount(rev), 1);
});

test('the transcript’s check stays with its line when the line is renumbered', () => {
  const { lines } = apply(emptyRev(), splitLine(linesOf(base, DOC), 1));
  assert.deepEqual(
    lines.filter(l => l.check).map(l => l.text),
    ['d e'],
  );
});

test('a split at a line’s start does nothing', () => {
  assert.deepEqual(splitLine(linesOf(base, DOC), 3), { error: 'line-start' });
});

test('a join puts the line on the end of the one above and moves its stanza’s later lines up one', () => {
  const { rev, lines } = apply(emptyRev(), joinLine(linesOf(base, DOC), 1)); // "d e" onto "a b c"
  assert.deepEqual(texts(lines), ['1.1 a b c d e', '1.2 f', '2.1 g h', '2.2 i']);
  assert.deepEqual(
    rev.lineMoves!.map(m => `#${m.i} ${m.from.line}→${m.to.line} ${m.by}`),
    ['#3 2→1 join', '#4 2→1 join', '#5 3→2 renumber'],
  );
  assert.equal(rev.lineEdits![0].kind, 'join');
  assert.equal(rev.lineEdits![0].toLine, 'a b c');
});

test('joining a stanza’s first line to the stanza above renumbers the rest of its stanza', () => {
  const { lines } = apply(emptyRev(), joinLine(linesOf(base, DOC), 3)); // "g h" onto "f"
  assert.deepEqual(texts(lines), ['1.1 a b c', '1.2 d e', '1.3 f g h', '2.1 i']);
});

test('the first line has nothing to join to', () => {
  assert.deepEqual(joinLine(linesOf(base, DOC), 0), { error: 'first-line' });
});

test('a split and the join back leave the transcript as it was', () => {
  const one = apply(emptyRev(), splitLine(linesOf(base, DOC), 1));
  const k = one.lines.findIndex(l => l.text === 'b c');
  const two = apply(one.rev, joinLine(one.lines, k));
  assert.deepEqual(texts(two.lines), texts(linesOf(base, DOC)));
  assert.deepEqual(two.rev.lineMoves, []);
  assert.deepEqual(two.rev.lineEdits, []);
  assert.equal(changeCount(two.rev), 0);
});

test('splits add up: a second split renumbers the first one’s new line again, which stays split off', () => {
  const one = apply(emptyRev(), splitLine(linesOf(base, DOC), 4)); // "d" / "e"
  const two = apply(one.rev, splitLine(one.lines, 1)); // "a" / "b c"
  assert.deepEqual(texts(two.lines), ['1.1 a', '1.2 b c', '1.3 d', '1.4 e', '1.5 f', '2.1 g h', '2.2 i']);
  const e = two.rev.lineMoves!.find(m => m.i === 4)!;
  assert.deepEqual([e.from.line, e.to.line, e.by, e.toLine], [2, 4, 'split', 'e']);
  assert.equal(two.rev.lineEdits!.length, 2);
});

test('the text for Claude lists the split, the numbering rule and every moved word, in runs', () => {
  const { rev } = apply(emptyRev(), splitLine(linesOf(base, DOC), 1));
  const text = instructionsOf(rev);
  assert.match(text, /Lines split and joined \(1\), in the order done:/);
  assert.match(text, /1\. Split stanza 1 line 1 "a b c" before word #1 "b": "b c" became stanza 1 line 2; the 2 later lines of stanza 1 moved down one\./);
  assert.match(text, /Line numbers: a split numbers the new line one after the line it leaves/);
  assert.match(text, /- words #1–#2 "b c": stanza 1 line 1 → stanza 1 line 2 \(split off; the line "b c"\)/);
  assert.match(text, /- words #3–#4 "d e": stanza 1 line 2 → stanza 1 line 3 \(renumbered; the line "d e"\)/);
  assert.match(text, /- word #5 "f": stanza 1 line 3 → stanza 1 line 4 \(renumbered; the line "f"\)/);
});

test('the caret steps word by word and across lines, like a text caret', () => {
  const lines = linesOf(base, DOC);
  assert.deepEqual(slotOf(lines, { i: 2, end: true }), { k: 0, p: 3 });
  assert.deepEqual(caretAt(lines, 0, 3), { i: 2, end: true });
  assert.deepEqual(stepCaret(lines, { i: 2, end: false }, 1), { i: 2, end: true });
  // the end of a line, then the start of the next
  assert.deepEqual(stepCaret(lines, { i: 2, end: true }, 1), { i: 3, end: false });
  assert.deepEqual(stepCaret(lines, { i: 3, end: false }, -1), { i: 2, end: true });
  // the song's ends hold
  assert.deepEqual(stepCaret(lines, { i: 0, end: false }, -1), { i: 0, end: false });
  assert.deepEqual(stepCaret(lines, { i: 8, end: true }, 1), { i: 8, end: true });
});
