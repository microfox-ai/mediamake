import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_RECORDS, entryOfId, namespaceOf, rank, recordsOf, textPieces, timedPieces, timedWords } from './meaning';
import { SONGS } from './templates';

test('long text is cut at line ends, a verse kept whole when it fits', () => {
  const verse = (n: number) => `verse ${n} line one\nverse ${n} line two`;
  const pieces = textPieces([verse(1), verse(2), verse(3)].join('\n\n'), 80);
  assert.deepEqual(pieces, [`${verse(1)}\n${verse(2)}`, verse(3)]);
  assert.deepEqual(textPieces('a'.repeat(25), 10), ['a'.repeat(10), 'a'.repeat(10), 'a'.repeat(5)]);
  assert.deepEqual(textPieces('  \n\n '), []);
});

test('a timed transcript is read in its known shapes and cut by seconds', () => {
  const words = [0, 10, 29, 31, 65].map(start => ({ start, end: start + 1, text: `w${start}` }));
  assert.equal(timedWords(JSON.stringify({ words })).length, 5);
  assert.equal(timedWords(JSON.stringify({ transcripts: [{ words: words.map(w => ({ start: w.start, word: w.text })) }] })).length, 5);
  assert.deepEqual(timedWords('not json'), []);
  assert.deepEqual(timedPieces(words, 30), [
    { from: 0, to: 30, text: 'w0 w10 w29' },
    { from: 31, to: 32, text: 'w31' },
    { from: 65, to: 66, text: 'w65' },
  ]);
});

test('an entry sends its card, its lyrics and its timed transcript, each piece named', () => {
  const entry = { slug: 'sample-song', title: 'Sample Song', card: 'Sample Song · song · Songs\nid songs/sample-song', fields: { title: 'Sample Song', lyrics: 'the sea is grey\nand I am far', artist: 'Sample Artist' } };
  const records = recordsOf({ template: SONGS }, entry, { transcript: JSON.stringify({ words: [{ start: 1, end: 2, text: 'the' }, { start: 2, end: 3, text: 'sea' }] }), 'distrokid-pack': '{"isrc":"X"}' });
  assert.deepEqual(records.map(r => r.id), ['sample-song#card', 'sample-song#f:lyrics:0', 'sample-song#t:transcript:0']);
  assert.equal(records[1].data, 'Sample Song · Lyrics\nthe sea is grey\nand I am far');
  assert.deepEqual(records[2].metadata, { entry: 'sample-song', title: 'Sample Song', kind: 'transcript', what: 'transcript', from: 1, to: 3 });
  assert.equal(entryOfId(records[2].id), 'sample-song');
  assert.equal(namespaceOf('abc123', 'songs'), 'abc123-songs');

  const long = recordsOf({ template: SONGS }, { ...entry, fields: { lyrics: Array.from({ length: 400 }, (_, n) => `line ${n} ${'x'.repeat(690)}`).join('\n') } });
  assert.equal(long.length, MAX_RECORDS);
});

test('hits are ranked as entries, each with the piece the meaning was found in', () => {
  const ranked = rank([
    { id: 'a#card', score: 0.6, metadata: { entry: 'a', title: 'A', kind: 'card' }, data: 'A · song' },
    { id: 'b#t:transcript:2', score: 0.9, metadata: { entry: 'b', title: 'B', kind: 'transcript', what: 'transcript', from: 60, to: 90 }, data: 'B · transcript\nthe sea is grey' },
    { id: 'b#card', score: 0.5, metadata: { entry: 'b', title: 'B', kind: 'card' }, data: 'B · song' },
    { id: 'a#f:lyrics:0', score: 0.4, metadata: { entry: 'a', title: 'A', kind: 'text', what: 'lyrics' }, data: 'A · Lyrics\nfar away' },
    { id: 'c#card', score: 0.1 },
  ]);
  assert.deepEqual(ranked, [
    { entry: 'b', score: 0.9, found: { what: 'transcript', text: 'the sea is grey', from: 60, to: 90 } },
    { entry: 'a', score: 0.6, found: { what: 'lyrics', text: 'far away' } },
    { entry: 'c', score: 0.1 },
  ]);
});
