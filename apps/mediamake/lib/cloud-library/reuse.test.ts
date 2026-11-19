import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EntryRecord } from './index';
import { madeFrom, paramsKey, parseMadeFromAsk } from './reuse';

const MASTER = 'a'.repeat(64);
const file = (sha: string, name: string, addedAt: string, from?: { sha256: string; tool?: string; params?: string }) => ({ sha256: sha, name, size: 10, type: 'json' as const, contentType: 'application/json', addedAt, by: 'u', ...(from && { madeFrom: from }) });
const entries: Pick<EntryRecord, 'collection' | 'slug' | 'title' | 'slots'>[] = [
  {
    collection: 'songs',
    slug: 'sample-song',
    title: 'Sample Song',
    slots: {
      master: [file(MASTER, 'sample.wav', '2026-11-01')],
      transcript: [file('b'.repeat(64), 'words.json', '2026-11-02', { sha256: MASTER, tool: 'transcribe' })],
      stems: [file('c'.repeat(64), 'stems.zip', '2026-11-03', { sha256: MASTER, tool: 'demucs' })],
    },
  },
  { collection: 'songs', slug: 'sample-song-letters', title: 'Sample Song', slots: { transcript: [file('d'.repeat(64), 'letters.json', '2026-11-04', { sha256: MASTER, tool: 'Transcribe', params: 'letters lang=en' })] } },
  { collection: 'songs', slug: 'other', title: 'Other', slots: { transcript: [file('e'.repeat(64), 'other.json', '2026-11-05', { sha256: 'f'.repeat(64) })] } },
];

test('a result is found by the exact file it was made from', () => {
  assert.deepEqual(madeFrom(entries, { sha256: MASTER, params: '' }).map(hit => hit.name), ['stems.zip', 'words.json']);
  assert.deepEqual(madeFrom(entries, { sha256: MASTER, slot: 'transcript', params: '' }).map(hit => [hit.ref, hit.name, hit.tool]), [['songs/sample-song', 'words.json', 'transcribe']]);
  assert.deepEqual(madeFrom(entries, { sha256: MASTER, tool: 'DEMUCS', params: '' }).map(hit => hit.slot), ['stems']);
  assert.deepEqual(madeFrom(entries, { sha256: '9'.repeat(64), params: '' }), []);
});

test('other settings are another result', () => {
  assert.deepEqual(madeFrom(entries, { sha256: MASTER, slot: 'transcript', params: 'lang=en letters' }).map(hit => hit.name), ['letters.json']);
  assert.deepEqual(madeFrom(entries, { sha256: MASTER, slot: 'transcript', params: 'letters' }), []);
  assert.equal(paramsKey(' Letters  lang=en '), 'lang=en letters');
});

test('the ask names a file by its SHA-256', () => {
  assert.deepEqual(parseMadeFromAsk(new URLSearchParams({ madeFrom: MASTER.toUpperCase(), slot: 'Transcript', params: 'letters lang=en' })), { sha256: MASTER, slot: 'transcript', params: 'lang=en letters' });
  assert.match((parseMadeFromAsk(new URLSearchParams({ madeFrom: 'song.wav' })) as { error: string }).error, /SHA-256/);
  assert.match((parseMadeFromAsk(new URLSearchParams({ madeFrom: MASTER, slot: '../x' })) as { error: string }).error, /slot/);
});
