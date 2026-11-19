import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { applySave, type CollectionRecord, type EntryRecord } from './index';
import { meaningIndex, meaningReady } from './meaning-store';
import { SONGS } from './templates';

const collection = { space: 's1', slug: 'songs', name: 'Songs', template: SONGS, learned: {}, prefs: '' } as unknown as CollectionRecord;
const saved = applySave(collection, null, { fields: { title: 'Sample Song', lyrics: 'the sea is grey' } }, 'someone');
const entry = ('entry' in saved ? saved.entry : null) as EntryRecord;
type Sent = { prefix?: string; data?: string; topK?: number }[] & { prefix?: string; data?: string; topK?: number; map: <T>(fn: (r: { id: string }) => T) => T[] };
const calls: { method: string; path: string; body: Sent; auth: string }[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls.length = 0;
  process.env.LIBRARY_VECTOR_REST_URL = 'https://index.test/';
  process.env.LIBRARY_VECTOR_REST_TOKEN = 'sample-token';
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname.slice(1);
    calls.push({ method: init.method!, path, body: init.body ? JSON.parse(String(init.body)) : undefined, auth: (init.headers as Record<string, string>).Authorization });
    if (path.startsWith('delete-namespace/')) return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
    if (path.startsWith('query-data/broken')) return new Response('{}', { status: 500 });
    if (path.startsWith('query-data/')) return new Response(JSON.stringify({ result: [{ id: 'sample-song#f:lyrics:0', score: 0.8, metadata: { entry: 'sample-song', title: 'Sample Song', kind: 'text', what: 'lyrics' }, data: 'Sample Song · Lyrics\nthe sea is grey' }] }), { status: 200 });
    return new Response(JSON.stringify({ result: 'Success' }), { status: 200 });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.LIBRARY_VECTOR_REST_URL;
  delete process.env.LIBRARY_VECTOR_REST_TOKEN;
});

test('an entry replaces its own records in its collection\'s namespace', async () => {
  assert.equal(await meaningIndex.put('s1', collection, entry), 2);
  assert.deepEqual(calls.map(c => `${c.method} ${c.path}`), ['DELETE delete/s1-songs', 'POST upsert-data/s1-songs']);
  assert.deepEqual(calls[0].body, { prefix: 'sample-song#' });
  assert.deepEqual(calls[1].body.map((r: { id: string }) => r.id), ['sample-song#card', 'sample-song#f:lyrics:0']);
  assert.equal(calls[1].auth, 'Bearer sample-token');
  await meaningIndex.forget('s1', 'songs', 'sample-song');
  assert.deepEqual(calls.at(-1), { method: 'DELETE', path: 'delete/s1-songs', body: { prefix: 'sample-song#' }, auth: 'Bearer sample-token' });
});

test('a search answers with entries, and with none when the index fails or has no such collection', async () => {
  assert.deepEqual(await meaningIndex.ask('s1', 'songs', 'the sad sea song', 20), [{ entry: 'sample-song', score: 0.8, found: { what: 'lyrics', text: 'the sea is grey' } }]);
  assert.deepEqual(calls[0].body, { data: 'the sad sea song', topK: 20, includeMetadata: true, includeData: true });
  assert.deepEqual(await meaningIndex.ask('broken', 'songs', 'x', 5), []);
  await meaningIndex.clear('s1', 'songs'); // a namespace that isn't there is fine
});

test('without its two variables nothing is sent', async () => {
  delete process.env.LIBRARY_VECTOR_REST_TOKEN;
  assert.equal(meaningReady(), false);
  assert.equal(await meaningIndex.put('s1', collection, entry), 0);
  await meaningIndex.forget('s1', 'songs', 'sample-song');
  assert.equal(calls.length, 0);
});
