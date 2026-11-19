import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aliasFor, cardThrough, cleanNotes, emptyNotes, fetchedThrough, hiddenFromShare, parseShareAsk, roleThrough, visibleThrough } from './shares';
import { spaceFor } from './view';

test('a shared collection keeps its id where that is free, else takes the sharer\'s name', () => {
  assert.equal(aliasFor('songs', 'Sample Channel', new Set()), 'songs');
  assert.equal(aliasFor('songs', 'Sample Channel', new Set(['songs'])), 'songs-sample-channel');
  assert.equal(aliasFor('songs', 'Sample Channel', new Set(['songs', 'songs-sample-channel'])), 'songs-sample-channel-2');
  assert.match(aliasFor('songs', '!!!', new Set(['songs'])), /^songs-shared$/);
});

test('a share is with one project or one person', () => {
  assert.deepEqual(parseShareAsk({ collection: 'Songs', project: 'A'.repeat(24) }), { collection: 'songs', project: 'a'.repeat(24), role: 'viewer', internal: false });
  assert.deepEqual(parseShareAsk({ collection: 'songs', email: ' Sample@Example.com ', role: 'editor', internal: true }), { collection: 'songs', email: 'sample@example.com', role: 'editor', internal: true });
  assert.match((parseShareAsk({ collection: 'songs' }) as { error: string }).error, /one project .* or one person/);
  assert.match((parseShareAsk({ collection: 'songs', project: 'a'.repeat(24), email: 'a@b.co' }) as { error: string }).error, /one project/);
  assert.match((parseShareAsk({ collection: 'songs', email: 'a@b.co', role: 'owner' }) as { error: string }).error, /role is/);
  assert.match((parseShareAsk({ email: 'a@b.co' }) as { error: string }).error, /collection/);
});

test('an editor share makes editors of the receiving space\'s owner and editors only', () => {
  assert.equal(roleThrough({ role: 'editor' }, 'owner'), 'editor');
  assert.equal(roleThrough({ role: 'editor' }, 'editor'), 'editor');
  assert.equal(roleThrough({ role: 'editor' }, 'viewer'), 'viewer');
  assert.equal(roleThrough({ role: 'viewer' }, 'owner'), 'viewer');
  const space = { id: 'a', name: 'Sample Team', personal: false, role: 'owner' as const };
  assert.equal(spaceFor(space, { shared: { by: 'Sample Channel', from: 'b', collection: 'songs', role: 'viewer' } }).role, 'viewer');
  assert.equal(spaceFor(space, { shared: { by: 'Sample Channel', from: 'b', collection: 'songs', role: 'editor' } }).role, 'editor');
  assert.equal(spaceFor({ ...space, role: 'viewer' }, { shared: { by: 'Sample Channel', from: 'b', collection: 'songs', role: 'editor' } }).role, 'viewer');
  assert.equal(spaceFor(space, {}).role, 'owner');
});

test('entries marked Internal only stay with their owner unless the share says otherwise', () => {
  assert.equal(hiddenFromShare({ fields: { use: 'Internal only' } }, {}), true);
  assert.equal(hiddenFromShare({ fields: { use: ' internal ONLY ' } }, { internal: false }), true);
  assert.equal(hiddenFromShare({ fields: { use: 'Internal only' } }, { internal: true }), false);
  assert.equal(hiddenFromShare({ fields: { use: 'Released' } }, {}), false);
  assert.equal(hiddenFromShare({ fields: {} }, {}), false);
  assert.deepEqual(visibleThrough({ internal: true }), {});
  assert.ok((visibleThrough({}) as { 'fields.use': { $not: RegExp } })['fields.use'].$not.test('Internal only'));
});

test('a card names the collection as the receiving space knows it', () => {
  const card = 'Sample Song · song · Songs\nid songs/sample-song · changed 2026-11-19';
  assert.equal(cardThrough(card, 'songs', 'sample-song', 'songs-sample-channel', 'Sample Channel'), 'Sample Song · song · Songs\nid songs-sample-channel/sample-song · shared by Sample Channel · changed 2026-11-19');
});

test('a space\'s notes are a rating, tags and where it was used', () => {
  assert.deepEqual(cleanNotes({ rating: 4, tags: [' drums ', 'drums', '', 7], usedIn: ['Sample Video'], other: 'x' }), { rating: 4, tags: ['drums'], usedIn: ['Sample Video'] });
  assert.deepEqual(cleanNotes({ rating: 9 }), { tags: [], usedIn: [] });
  assert.deepEqual(cleanNotes(null), { tags: [], usedIn: [] });
  assert.equal(emptyNotes(cleanNotes({})), true);
  assert.equal(emptyNotes(cleanNotes({ rating: 1 })), false);
});

test('what was fetched through a share is summed by the space it was reached through', () => {
  const sums = fetchedThrough([
    { via: 'p1', clientId: 'a', action: 'fetch', bytes: 100 },
    { via: 'p1', clientId: 'b', action: 'fetch', bytes: 50 },
    { via: 'p1', clientId: 'a', action: 'read', bytes: 999 },
    { via: 'p2', clientId: 'a', action: 'fetch' },
    { clientId: 'owner', action: 'fetch', bytes: 500 },
  ]);
  assert.deepEqual(sums, { p1: { fetchedBytes: 150, fetches: 2, people: 2 }, p2: { fetchedBytes: 0, fetches: 1, people: 1 } });
});
