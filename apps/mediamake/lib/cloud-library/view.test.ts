import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cellLine, cellsOf, cleanColumns, factsOf, parseSearch, pictureOf, type EntryRecord } from './index';
import { SONGS } from './templates';
import { NOT_SET, allCollections, cellEditor, columnChoices, addPrompt, applyFill, listOf, readsAsText, cellText, foldersOf, folderFields, sheetColumns, sortRows, viewOf, changedFields, clock, dollars, formatBytes, libraryHref, listQuery, placeFiles, slotFor, tidyValue, valueLine, type CollectionView, type FieldView, type SpaceOverview, type SlotView } from './view';

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
  assert.deepEqual(columns.slice(0, 4).map(c => c.key), ['title', 'titleOriginal', 'duration', 'artist']);
  assert.ok(!columns.some(c => c.key === 'lyrics' || c.key === 'storeLinks' || c.key === 'description'));
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
  assert.equal(viewOf('nope'), 'sheet');
  assert.equal(viewOf('grid'), 'grid');
});

test('the prompt to add names the place, the guide and the ask before saving', () => {
  const prompt = addPrompt({ id: 'abc123', name: 'Sample Channel', personal: false }, view, 'Sea Song');
  assert.match(prompt, /the song "Sea Song" .* the Songs collection of the Sample Channel space/);
  assert.match(prompt, /mm library guide songs --project=abc123/);
  assert.match(prompt, /mm library save songs --project=abc123 --set title="Sea Song"/);
  assert.match(prompt, /stems \(stems, several\)/);
  assert.match(prompt, /Add --yes only after I agree/);
  assert.match(prompt, /Never guess: isrc, release date, distrokid details, store links, playlists\./);
  const mine = addPrompt({ id: 'p1', name: 'Personal', personal: true }, view);
  assert.ok(!mine.includes('--project'));
  assert.match(mine, /Add a song to .* the Personal space/);
});

test('a suggestion fills only what the form left empty', () => {
  const { values, filled } = applyFill(fields, { title: 'Sea Song', artist: ' ', genres: ['Rock'] }, { title: 'Other', artist: 'Sample Artist', genres: ['Pop'], lyrics: 'la' });
  assert.deepEqual(filled, ['artist', 'lyrics']);
  assert.deepEqual(values, { title: 'Sea Song', artist: 'Sample Artist', genres: ['Rock'], lyrics: 'la' });
  assert.equal(listOf(['Artist', 'Genres', 'Lyrics']), 'Artist, Genres and Lyrics');
  assert.equal(listOf(['Artist']), 'Artist');
  assert.ok(readsAsText({ name: 'words.lrc' }) && readsAsText({ name: 'pack', type: 'application/json' }) && !readsAsText({ name: 'master.wav', type: 'audio/wav' }));
});

test('the grid shows the columns a space chose, the title always first; a key the template no longer has is dropped', () => {
  const chosen = sheetColumns({ ...view, columns: ['lyrics', 'has:master', 'gone', 'title', 'updatedAt'] });
  assert.deepEqual(chosen.map(c => c.key), ['title', 'lyrics', 'has:master', 'updatedAt']);
  // no choice: the title, the short fields, the slots, the day, as before
  const plain = sheetColumns(view);
  assert.equal(plain[0].key, 'title');
  assert.ok(!plain.some(c => c.key === 'lyrics' || c.key === 'distrokid'));
  // every field can be picked, long and nested ones too
  const choices = columnChoices(view).map(c => c.key);
  assert.ok(choices.includes('lyrics') && choices.includes('distrokid') && choices.includes('has:master') && choices.includes('updatedAt'));
});

test('a cell edits in place for short text, a number or a date, picks for a choice, and opens a dialog for the rest', () => {
  const by = (key: string) => columnChoices(view).find(c => c.key === key)!;
  assert.equal(cellEditor(by('artist')), 'inline');
  assert.equal(cellEditor(by('releaseDate')), 'inline');
  assert.equal(cellEditor(by('use')), 'choice');
  assert.equal(cellEditor(by('lyrics')), 'dialog');
  assert.equal(cellEditor(by('distrokid')), 'dialog');
  assert.equal(cellEditor(by('has:master')), null);
  assert.equal(cellEditor(by('updatedAt')), null);
});

test('a long or nested field reaches the grid as one line, and a list asks for its cells and pictures', () => {
  assert.equal(cellLine('line one\nline two'), 'line one line two');
  assert.equal(cellLine([{ platform: 'Spotify', url: 'x' }, { platform: 'Amazon', url: 'y' }]), 'Spotify, Amazon');
  assert.equal(cellLine([{ name: 'intro', start: 0 }, { name: 'verse 1', start: 29.3 }]), 'intro 0:00, verse 1 0:29');
  assert.equal(cellLine({ upc: '700', language: 'Telugu' }), 'upc: 700 · language: Telugu');
  assert.equal(cellLine('x'.repeat(300)).length, 160);
  assert.deepEqual(cellsOf({ fields: { lyrics: 'a\nb', title: 'T' }, extra: { duration: '3:00' } }, ['lyrics', 'duration', 'has:master', 'nothing']), { lyrics: 'a b', duration: '3:00' });
  assert.deepEqual(cleanColumns(['lyrics', 'lyrics', 'has:master', 'bad key!', 7, 'updatedAt']), ['lyrics', 'has:master', 'updatedAt']);
  const query = new URLSearchParams(listQuery({ space: 's1', collection: 'songs', cells: ['title', 'lyrics', 'has:master', 'updatedAt'], pictures: true }));
  assert.equal(query.get('cells'), 'title,lyrics');
  assert.equal(query.get('pictures'), '1');
  const ask = parseSearch(query);
  assert.deepEqual(ask.cells, ['title', 'lyrics']);
  assert.equal(ask.pictures, true);
  assert.equal(cellText({ title: 'Sea Song', facts: {}, has: {}, updatedAt: '', cells: { lyrics: 'a b' } }, { key: 'lyrics', label: 'Lyrics', kind: 'field', field: 'longtext' }), 'a b');
});

test('an entry shows one of its own pictures, the same one every time', () => {
  const file = (sha: string, type: 'image' | 'audio') => ({ sha256: sha.repeat(64).slice(0, 64), name: `${sha}.x`, size: 1, type, contentType: '', addedAt: '', by: '' });
  const entry = { collection: 'songs', slug: 'sea-song', slots: { master: [file('a', 'audio')], artwork: [file('b', 'image')], stills: [file('c', 'image'), file('d', 'image')] } } as unknown as EntryRecord;
  const first = pictureOf(entry);
  assert.ok(first && first.type === 'image');
  assert.equal(pictureOf(entry)?.sha256, first.sha256);
  assert.equal(pictureOf({ ...entry, slots: { master: [file('a', 'audio')] } } as unknown as EntryRecord), undefined);
});

test('a field\'s parts can be columns: a group\'s keys and a list of links\' platforms', () => {
  const withParts = {
    titleField: 'title',
    slots: [],
    fields: [
      { key: 'title', label: 'Song title', kind: 'text', group: 'Identity' },
      { key: 'distrokid', label: 'DistroKid details', kind: 'group', group: 'Release', keys: [{ key: 'upc', label: 'UPC' }, { key: 'uploadDate', label: 'Uploaded', kind: 'date' }] },
      { key: 'storeLinks', label: 'Store links', kind: 'links', group: 'Release', learns: 'platform' },
    ] as FieldView[],
    learned: { platform: ['Spotify', 'Apple Music', 'apple-music'] },
  };
  const keys = columnChoices(withParts).map(c => c.key);
  // each part sits after its field; two spellings of one platform are one column
  assert.deepEqual(keys, ['title', 'distrokid', 'distrokid.upc', 'distrokid.uploadDate', 'storeLinks', 'storeLinks.spotify', 'storeLinks.applemusic', 'updatedAt']);
  const upc = columnChoices(withParts).find(c => c.key === 'distrokid.upc')!;
  assert.deepEqual(upc.parent, { key: 'distrokid', label: 'DistroKid details' });
  // never a column until it is chosen
  assert.deepEqual(sheetColumns(withParts).map(c => c.key), ['title', 'updatedAt']);
  assert.deepEqual(sheetColumns({ ...withParts, columns: ['distrokid.upc', 'storeLinks.spotify', 'distrokid.gone'] }).map(c => c.key), ['title', 'distrokid.upc', 'storeLinks.spotify']);
  // its cell arrives as a line, and it is changed in its field's editor
  assert.equal(cellText({ facts: {}, has: {}, updatedAt: '', title: 'A', cells: { 'distrokid.upc': '1234' } }, upc), '1234');
  assert.equal(cellEditor(upc), 'dialog');
});

test('the All view lists every space’s collections once, the personal space first', () => {
  const col = (slug: string, extra: Partial<CollectionView> = {}): CollectionView => ({ slug, name: slug, template: 'songs', noun: 'song', titleField: 'title', about: '', entries: 0, updatedAt: '', fields: [], slots: [], learned: {}, ...extra });
  const spaces: SpaceOverview[] = [
    { space: { id: 'p1', name: 'Get Into Zone', personal: false, role: 'owner' }, collections: [col('songs'), col('art')] },
    { space: { id: 'me', name: 'Personal', personal: true, role: 'owner' }, collections: [col('notes'), col('songs-gz', { shared: { by: 'Get Into Zone', from: 'p1', collection: 'songs', role: 'viewer' } }), col('beats', { shared: { by: 'Someone', from: 'x9', collection: 'beats', role: 'viewer' } })] },
  ];
  assert.deepEqual(allCollections(spaces).map(({ space, collection }) => `${space.id}/${collection.slug}`), ['me/notes', 'me/beats', 'p1/songs', 'p1/art']);
  assert.deepEqual(allCollections(spaces, 'zone art').map(({ collection }) => collection.slug), ['art']);
});
