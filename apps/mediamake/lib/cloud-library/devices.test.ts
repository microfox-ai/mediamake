import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanCard, cloudCopies, parseDeviceAsk, parseDeviceId, parseDeviceReport, searchTextOf, searchWords, uploadPrompt } from './devices';

const SHA = 'a'.repeat(64);

test('a card keeps what a file is and drops where it is', () => {
  assert.deepEqual(cleanCard({ sha256: SHA.toUpperCase(), name: '/Users/someone/Downloads/_LIBRARY/music/Sample Song.wav', title: ' Sample  Song ', kind: 'Music', subject: 'zone', bytes: 64_000_000.4, duration: 182.44, tags: ['final', 'final', 7, 'master'], path: '/Users/someone', cold: true, secret: 'x' }), {
    sha256: SHA,
    name: 'Sample Song.wav',
    title: 'Sample Song',
    kind: 'music',
    subject: 'zone',
    bytes: 64_000_000,
    duration: 182.4,
    tags: ['final', 'master'],
    cold: true,
  });
  assert.equal(cleanCard({ sha256: 'nope', name: 'a.wav' }), null);
  assert.equal(cleanCard({ sha256: SHA }), null);
  assert.equal(cleanCard('a.wav'), null);
});

test('a report is one run of cards from one computer', () => {
  const report = parseDeviceReport({ device: 'mac-3f9a', run: 'abcdef0123456789', cards: [{ sha256: SHA, name: 'a.wav' }, { sha256: SHA, name: 'a copy.wav' }, { name: 'no id.wav' }], done: true });
  assert.ok(!('error' in report));
  assert.deepEqual(report.cards.map(card => card.name), ['a copy.wav']);
  assert.equal(report.skipped, 2);
  assert.equal(report.done, true);
  assert.match((parseDeviceReport({ device: '../x', run: 'abcdef0123456789' }) as { error: string }).error, /label/);
  assert.match((parseDeviceReport({ device: 'mac-3f9a', run: 'x' }) as { error: string }).error, /run/);
  assert.match((parseDeviceReport({ device: 'mac-3f9a', run: 'abcdef0123456789', cards: Array.from({ length: 1001 }, () => ({})) }) as { error: string }).error, /At most 1000/);
});

test('a search has every word, whatever the punctuation', () => {
  const text = searchTextOf({ name: 'Sample-Song_final.wav', title: 'Sample Song', subject: 'Get Into Zone', kind: 'music', tags: ['master'] });
  assert.ok(searchWords('song, FINAL').every(word => text.includes(word)));
  assert.ok(!searchWords('song stems').every(word => text.includes(word)));
  assert.deepEqual(searchWords('  '), []);
  assert.deepEqual(parseDeviceAsk(new URLSearchParams('q=song&kind=Music!&where=cloud&limit=999&skip=-1')), { q: 'song', kind: 'music', where: '', limit: 200, skip: 0 });
  assert.equal(parseDeviceAsk(new URLSearchParams('where=both')).where, 'both');
});

test('a file is linked to the cloud by its SHA-256 alone', () => {
  const copies = cloudCopies([
    { collection: 'songs', slug: 'sample-song', title: 'Sample Song', slots: { master: [{ sha256: SHA }], stems: [{ sha256: 'b'.repeat(64) }] } },
    { collection: 'songs', slug: 'sample-song-2', title: 'Sample Song 2', slots: { master: [{ sha256: SHA }] } },
    { collection: 'songs', slug: 'empty', title: 'Empty' },
  ]);
  assert.deepEqual(copies.get(SHA), { ref: 'songs/sample-song', title: 'Sample Song', slot: 'master' });
  assert.equal(copies.size, 2);
});

test('the prompt saves from your own computer and asks for a to-do on someone else\'s', () => {
  const file = { sha256: SHA, name: 'sample-song.wav', title: 'Sample Song' };
  const mine = uploadPrompt({ file, device: { name: 'Studio Mac', mine: true }, space: 'Get Into Zone', personal: false });
  assert.match(mine, /Add "Sample Song" \(sample-song\.wav, media library id aaaaaaaaaaaa\) from the media library on this computer \(Studio Mac\) to the Library of the Get Into Zone space\./);
  assert.match(mine, /mm library save <collection> --item <slot>=aaaaaaaaaaaa without --yes/);
  assert.match(mine, /only after I agree/);
  const theirs = uploadPrompt({ file, device: { name: 'Edit PC', mine: false, owner: 'Sample Member' }, space: 'Personal', personal: true });
  assert.match(theirs, /only on Sample Member's computer \(Edit PC\)\. I want it in my personal Library\./);
  assert.match(theirs, /mm todo post, needing media:library/);
});

test('a computer is named by its owner and its label', () => {
  assert.deepEqual(parseDeviceId('user_1/mac-3f9a'), { owner: 'user_1', label: 'mac-3f9a' });
  assert.equal(parseDeviceId('mac-3f9a'), null);
  assert.equal(parseDeviceId('user_1/../x'), null);
});
