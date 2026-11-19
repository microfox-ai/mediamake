import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanListing, parseRequest, stateOf } from './listing';

test('a listing needs its rights in the owner\'s words, and a request names one collection', () => {
  assert.deepEqual(cleanListing({ about: '  Seventy   songs ', rights: 'Use on your own channels' }), { about: 'Seventy songs', rights: 'Use on your own channels' });
  assert.match((cleanListing({ about: 'x' }) as { error: string }).error, /rights/);
  const id = 'a'.repeat(24);
  assert.deepEqual(parseRequest({ from: id.toUpperCase(), collection: 'Songs', note: ' for a short ' }), { from: id, collection: 'songs', note: 'for a short' });
  assert.ok('error' in parseRequest({ from: 'x', collection: 'songs' }));
  assert.ok('error' in parseRequest({ from: id, collection: 'songs', to: 'nope' }));
  assert.equal(stateOf({ mine: true, share: 'accepted' }), 'yours');
  assert.equal(stateOf({ mine: false, share: 'invited', request: 'asked' }), 'invited');
  assert.equal(stateOf({ mine: false, request: 'declined' }), 'declined');
  assert.equal(stateOf({ mine: false }), 'none');
});
