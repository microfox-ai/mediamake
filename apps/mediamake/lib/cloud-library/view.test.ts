import assert from 'node:assert/strict';
import { test } from 'node:test';
import { factsOf } from './index';
import { SONGS } from './templates';
import { changedFields, clock, dollars, formatBytes, libraryHref, listQuery, placeFiles, slotFor, tidyValue, valueLine, type FieldView, type SlotView } from './view';

const slots: SlotView[] = SONGS.slots;
const fields: FieldView[] = SONGS.fields;

test('a dropped file goes to the slot its type and name say', () => {
  assert.equal(slotFor('Nakama.wav', 'audio/wav', slots), 'master');
  assert.equal(slotFor('cover.png', 'image/png', slots), 'artwork');
  assert.equal(slotFor('nakama transcript.json', 'application/json', slots), 'transcript');
  assert.equal(slotFor('distrokid-pack.json', '', slots), 'distrokid-pack');
  assert.equal(slotFor('Nakama (Stems) drums.wav', '', slots), 'stems');
  assert.equal(slotFor('notes.pdf', '', slots), 'other');
});

test('one drop fills a single slot once, the rest go where several fit', () => {
  assert.deepEqual(placeFiles([{ name: 'a.wav' }, { name: 'b.wav' }, { name: 'c.png' }, { name: 'd.png' }], slots), ['master', 'stems', 'artwork', 'other']);
  // the song already has its master: more audio is stems
  assert.deepEqual(placeFiles([{ name: 'a.wav' }], slots, new Set(['master'])), ['stems']);
  // a name that says master still replaces it, on the person's word
  assert.deepEqual(placeFiles([{ name: 'final master.wav' }], slots), ['master']);
});

test('a form sends only what changed, and an emptied field as cleared', () => {
  const before = { title: 'Nakama!', artist: 'Anime Music Zone', genres: ['Anime', 'Rock'], isrc: 'QZ1234567890' };
  assert.deepEqual(changedFields(fields, before, { ...before }), {});
  assert.deepEqual(changedFields(fields, before, { ...before, artist: ' Anime Music Zone ' }), {});
  assert.deepEqual(changedFields(fields, before, { ...before, isrc: '', genres: ['Anime'] }), { isrc: '', genres: ['Anime'] });
  assert.deepEqual(changedFields(fields, before, { ...before, storeLinks: [{ platform: 'Spotify', url: '' }] }), {});
  assert.deepEqual(changedFields(fields, before, { ...before, storeLinks: [{ platform: 'Spotify', url: 'https://open.spotify.com/track/1' }] }), { storeLinks: [{ platform: 'Spotify', url: 'https://open.spotify.com/track/1' }] });
});

test('half filled rows are dropped', () => {
  assert.deepEqual(tidyValue('tags', ['Rock', ' rock ', '', 'Rock']), ['Rock', 'rock']);
  assert.deepEqual(tidyValue('parts', [{ name: 'intro', start: 0 }, { name: ' ' }]), [{ name: 'intro', start: 0 }]);
  assert.deepEqual(tidyValue('group', { language: 'English', '': 'x', explicit: '' }), { language: 'English' });
});

test('values read as one line', () => {
  assert.equal(valueLine('tags', ['Anime', 'Rock']), 'Anime, Rock');
  assert.equal(valueLine('links', [{ platform: 'Spotify', url: 'x' }, { platform: 'YouTube Music', url: 'y' }]), 'Spotify, YouTube Music');
  assert.equal(valueLine('group', { language: 'English', songwriters: ['A', 'B'] }), 'language: English · songwriters: A, B');
  assert.equal(valueLine('text', undefined), '');
  assert.equal(clock(65.4), '1:05');
  assert.equal(clock(undefined), '');
});

test('addresses, queries and sizes', () => {
  assert.equal(libraryHref({}), '/app/library');
  assert.equal(libraryHref({ space: 'abc', collection: 'songs', entry: 'nakama' }), '/app/library?space=abc&c=songs&e=nakama');
  assert.equal(libraryHref({ space: 'abc', entry: 'nakama' }), '/app/library?space=abc');
  assert.equal(listQuery({ space: 'abc', collection: 'songs', q: ' rain ', where: { use: 'Released', artist: '' }, files: 'lacks:transcript' }), 'space=abc&limit=200&collection=songs&q=rain&where=use%3DReleased&lacks=transcript');
  assert.equal(formatBytes(64_000_000), '64.0 MB');
  assert.equal(formatBytes(2_400_000_000), '2.4 GB');
  assert.equal(dollars(0.004), '< $0.01');
  assert.equal(dollars(1.5), '$1.50');
});

test('a list row carries the short facts and the filled slots', () => {
  const row = factsOf({
    fields: { title: 'Nakama!', use: 'Released', genres: ['Anime', 'Rock'], lyrics: 'line one\nline two', storeLinks: [{ platform: 'Spotify', url: 'x' }] },
    slots: { master: [{ sha256: 'a'.repeat(64), name: 'n.wav', size: 1, type: 'audio', contentType: 'audio/wav', addedAt: '', by: '' }], stems: [] },
  });
  assert.deepEqual(row.facts, { title: 'Nakama!', use: 'Released', genres: ['Anime', 'Rock'] });
  assert.deepEqual(row.has, { master: 1 });
});
