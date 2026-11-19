import assert from 'node:assert/strict';
import { test } from 'node:test';
import { factsOf } from './index';
import { SONGS } from './templates';
import { NOT_SET, addPrompt, cellText, foldersOf, folderFields, sheetColumns, sortRows, viewOf, changedFields, clock, dollars, formatBytes, libraryHref, listQuery, placeFiles, slotFor, tidyValue, valueLine, type FieldView, type SlotView } from './view';

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

const view = { slug: 'songs', name: 'Songs', noun: 'song', titleField: 'title', fields, slots };
const rowOf = (title: string, facts: Record<string, string | string[]>, has: Record<string, number> = {}, updatedAt = '2026-11-19T00:00:00Z') => ({ title, facts: { title, ...facts }, has, updatedAt });

test('a sheet has the title first, the short fields, a column a slot, then the day', () => {
  const columns = sheetColumns(view);
  assert.deepEqual(columns.slice(0, 3).map(c => c.key), ['title', 'titleLatin', 'artist']);
  assert.ok(!columns.some(c => c.key === 'lyrics' || c.key === 'storeLinks'));
  assert.deepEqual(columns.slice(-3).map(c => c.key), ['has:artwork', 'has:distrokid-pack', 'updatedAt']);
  const row = rowOf('Sea Song', { genres: ['Rock', 'Pop'] }, { stems: 3 });
  assert.equal(cellText(row, columns.find(c => c.key === 'genres')!), 'Rock, Pop');
  assert.equal(cellText(row, columns.find(c => c.key === 'has:stems')!), '3');
  assert.equal(cellText(row, columns.find(c => c.key === 'has:master')!), '');
});

test('a sheet sorts by a column, empty cells last', () => {
  const rows = [rowOf('b', { artist: 'Zed' }), rowOf('a', {}), rowOf('c', { artist: 'amy' }, { stems: 10 }), rowOf('d', { artist: 'Bob' }, { stems: 9 })];
  const artist = sheetColumns(view).find(c => c.key === 'artist')!;
  assert.deepEqual(sortRows(rows, artist, 'asc').map(r => r.title), ['c', 'd', 'b', 'a']);
  assert.deepEqual(sortRows(rows, artist, 'desc').map(r => r.title), ['b', 'd', 'c', 'a']);
  const stems = sheetColumns(view).find(c => c.key === 'has:stems')!;
  assert.deepEqual(sortRows(rows, stems, 'desc').map(r => r.title).slice(0, 2), ['c', 'd']);
});

test('folders group by a choice or a learned list, an entry in each of its values', () => {
  assert.deepEqual(folderFields(view).map(f => f.key), ['artist', 'label', 'use', 'genres']);
  const rows = [rowOf('a', { use: 'Released', genres: ['Rock', 'Anime'] }), rowOf('b', { use: 'Released', genres: ['Anime'] }), rowOf('c', {})];
  assert.deepEqual(foldersOf(rows, 'use').map(f => [f.name, f.rows.length]), [['Released', 2], [NOT_SET, 1]]);
  assert.deepEqual(foldersOf(rows, 'genres').map(f => [f.name, f.rows.length]), [['Anime', 2], ['Rock', 1], [NOT_SET, 1]]);
  assert.equal(viewOf('sheet'), 'sheet');
  assert.equal(viewOf('nope'), 'grid');
});

test('the prompt to add names the place, the guide and the ask before saving', () => {
  const prompt = addPrompt({ id: 'abc123', name: 'Sample Channel', personal: false }, view, 'Sea Song');
  assert.match(prompt, /the song "Sea Song" .* the Songs collection of the Sample Channel space/);
  assert.match(prompt, /mm library guide songs --project=abc123/);
  assert.match(prompt, /mm library save songs --project=abc123 --set title="Sea Song"/);
  assert.match(prompt, /stems \(stems, several\)/);
  assert.match(prompt, /Add --yes only after I agree/);
  assert.match(prompt, /Never guess: isrc, release date, store links, playlists\./);
  const mine = addPrompt({ id: 'p1', name: 'Personal', personal: true }, view);
  assert.ok(!mine.includes('--project'));
  assert.match(mine, /Add a song to .* the Personal space/);
});
