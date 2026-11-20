import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PRICES,
  LIBRARY_SCHEMA,
  addUsage,
  applySave,
  askSentence,
  cardOf,
  cleanFields,
  cleanPrices,
  costOf,
  emptySum,
  fileTypeOf,
  knownSpelling,
  learnedOptions,
  matches,
  newSlug,
  parseRef,
  parseSearch,
  readPart,
  relearn,
  slugOf,
  storageCostOf,
  sumBy,
  type CollectionRecord,
  type EntryRecord,
  type SlotFile,
  type UsageLine,
} from './index';
import { SONGS, TEMPLATES, templateList, upgradeTemplate } from './templates';

const SPACE = 'a'.repeat(24);
const T0 = new Date('2026-11-19T10:00:00.000Z');
const songs = (learned: CollectionRecord['learned'] = {}): CollectionRecord => ({ schema: LIBRARY_SCHEMA, space: SPACE, slug: 'songs', name: 'Songs', template: SONGS, prefs: '', learned, createdAt: T0.toISOString(), createdBy: 'ana', updatedAt: T0.toISOString() });
const file = (name: string, sha: string, size = 1_000_000, more: Partial<SlotFile> = {}): SlotFile => ({ sha256: sha.repeat(64).slice(0, 64), name, size, type: fileTypeOf(name), contentType: '', addedAt: T0.toISOString(), by: 'ana', ...more });
const saved = (collection: CollectionRecord, current: EntryRecord | null, ask: Parameters<typeof applySave>[2]) => {
  const result = applySave(collection, current, ask, 'ana', T0);
  assert.ok(!('error' in result), 'error' in result ? result.error : '');
  return result as Exclude<typeof result, { error: string }>;
};

test('slugs and refs', () => {
  assert.equal(slugOf('Nakama! (Remaster)'), 'nakama-remaster');
  assert.equal(slugOf('Café del Mar'), 'cafe-del-mar');
  assert.equal(slugOf('అఖిలాండ నాథ'), 'untitled');
  // a title in another script: its Latin-letters field names it, else a mark of the title, never a shared id
  assert.equal(newSlug(SONGS, 'అఖిలాండ నాథ', { titleLatin: 'Akhilanda Natha' }), 'akhilanda-natha');
  assert.match(newSlug(SONGS, 'అఖిలాండ నాథ'), /^song-[a-z0-9]+$/);
  assert.notEqual(newSlug(SONGS, 'అఖిలాండ నాథ'), newSlug(SONGS, 'చిట్టి గణపయ్య'));
  assert.equal(newSlug(SONGS, 'అఖిలాండ నాథ'), newSlug(SONGS, 'అఖిలాండ నాథ'));
  assert.deepEqual(parseRef('Songs/Nakama'), { collection: 'songs', entry: 'nakama' });
  assert.equal(parseRef('songs'), null);
  assert.equal(parseRef('songs/a/b'), null);
  assert.equal(parseRef('../x'), null);
});

test('file types by name and content type', () => {
  assert.equal(fileTypeOf('master.WAV'), 'audio');
  assert.equal(fileTypeOf('pack.json'), 'json');
  assert.equal(fileTypeOf('cover.jpeg'), 'image');
  assert.equal(fileTypeOf('lyrics.txt'), 'text');
  assert.equal(fileTypeOf('x', 'video/mp4'), 'video');
  assert.equal(fileTypeOf('x.bin'), 'other');
});

test('the templates: Songs has one master, one transcript, and nothing required', () => {
  assert.deepEqual(Object.keys(TEMPLATES), ['songs', 'anime-art', 'anime-shots', 'background-music']);
  for (const template of Object.values(TEMPLATES)) {
    assert.ok(template.fields.some(f => f.key === template.titleField), `${template.id} names its entries by one of its fields`);
    assert.equal(new Set(template.fields.map(f => f.key)).size, template.fields.length);
    assert.equal(new Set(template.slots.map(s => s.key)).size, template.slots.length);
    assert.ok(template.guide.includes(`Add the new ${template.noun} "`), `${template.id}'s guide gives the sentence to ask`);
    assert.ok(template.fields.filter(f => f.kind === 'choice').every(f => f.options?.length));
    // what a share keeps back is the same word in every template
    assert.ok(template.fields.find(f => f.key === 'use')?.options?.includes('Internal only'));
  }
  assert.equal(templateList()[0].id, 'songs');
  const slot = (key: string) => SONGS.slots.find(s => s.key === key)!;
  assert.equal(slot('master').many, false);
  assert.equal(slot('transcript').many, false);
  assert.equal(slot('stems').many, true);
  assert.ok(SONGS.fields.every(f => !('required' in f)));
  // every platform field learns the same list, so a platform added once shows up for links, playlists and numbers
  assert.deepEqual(SONGS.fields.filter(f => f.learns === 'platform').map(f => f.key), ['storeLinks', 'playlists']);
  assert.ok(SONGS.guide.includes('Add the new song'));
  // a song used only inside the channel is a title and nothing else
  const only = saved(songs(), null, { fields: { title: 'Sketch 4' } });
  assert.equal(only.created, true);
  assert.deepEqual(only.warnings, []);
});

test('a list that learns: the first spelling is the one kept', () => {
  assert.equal(knownSpelling({ 'YouTube Music': 2 }, 'youtube music'), 'YouTube Music');
  assert.equal(knownSpelling({ 'YouTube Music': 2 }, ' Youtube-Music '), 'YouTube Music');
  assert.equal(knownSpelling({ 'YouTube Music': 2 }, 'Spotify'), 'Spotify');
  assert.equal(knownSpelling(undefined, '  Apple   Music '), 'Apple Music');
  assert.deepEqual(learnedOptions({ Spotify: 3, 'Apple Music': 3, Tidal: 1, Gone: 0 }), ['Apple Music', 'Spotify', 'Tidal']);

  const first = saved(songs(), null, { fields: { title: 'One', storeLinks: [{ platform: 'YouTube Music', url: 'https://music.youtube.com/a' }], genres: ['Anime Rock'], label: 'Our Label' } });
  let learned = relearn({}, SONGS, null, first.entry.fields);
  assert.deepEqual(learned, { platform: { 'YouTube Music': 1 }, genre: { 'Anime Rock': 1 }, label: { 'Our Label': 1 } });

  const second = saved(songs(learned), null, { fields: { title: 'Two', storeLinks: { 'youtube music': 'https://music.youtube.com/b', Spotify: 'https://open.spotify.com/b' }, playlists: [{ platform: 'youtube-music', url: 'https://music.youtube.com/playlist?list=1', name: 'Anime Hits' }], genres: 'anime rock, Epic', label: 'our label' } });
  assert.deepEqual(second.entry.fields.storeLinks, [{ platform: 'YouTube Music', url: 'https://music.youtube.com/b' }, { platform: 'Spotify', url: 'https://open.spotify.com/b' }]);
  assert.deepEqual(second.entry.fields.playlists, [{ platform: 'YouTube Music', url: 'https://music.youtube.com/playlist?list=1', name: 'Anime Hits' }]);
  assert.deepEqual(second.entry.fields.genres, ['Anime Rock', 'Epic']);
  assert.equal(second.entry.fields.label, 'Our Label');
  learned = relearn(learned, SONGS, null, second.entry.fields);
  assert.deepEqual(learned.platform, { 'YouTube Music': 2, Spotify: 1 });

  // taking a song out takes its values' counts with it, and a value nobody uses leaves the list
  learned = relearn(learned, SONGS, second.entry.fields, null);
  assert.deepEqual(learned.platform, { 'YouTube Music': 1 });
  assert.deepEqual(learned.genre, { 'Anime Rock': 1 });
});

test('cleaning is guided, never strict', () => {
  const cleaned = cleanFields(SONGS, { title: ' Nakama! ', isrc: 'us-abc-26-00001', use: 'released', releaseDate: 'next week', mood: 'epic', storeLinks: [{ platform: 'Spotify', url: 'not a link' }, { url: 'https://x.test' }], parts: [{ name: 'intro', start: 0, end: 12.5, what: 'drums' }, { what: 'no name' }], distrokid: { language: 'English', songwriters: ['A', 'B'], empty: '' }, lyrics: null });
  assert.equal(cleaned.fields.title, 'Nakama!');
  assert.equal(cleaned.fields.isrc, 'USABC2600001');
  assert.equal(cleaned.fields.use, 'Released');
  assert.equal(cleaned.fields.releaseDate, 'next week'); // kept as written
  assert.deepEqual(cleaned.extra, { mood: 'epic' });
  assert.deepEqual(cleaned.cleared, ['lyrics']);
  assert.deepEqual(cleaned.fields.parts, [{ name: 'intro', start: 0, end: 12.5, what: 'drums' }]);
  assert.deepEqual(cleaned.fields.distrokid, { language: 'English', songwriters: ['A', 'B'] });
  assert.equal(cleaned.warnings.length, 3);
  assert.match(cleaned.warnings.join('\n'), /not a date/);
  assert.match(cleaned.warnings.join('\n'), /does not look like a link/);
  assert.match(cleaned.warnings.join('\n'), /needs a platform and a url/);

  const bad = cleanFields(SONGS, { isrc: '12345', use: 'someday' });
  assert.match(bad.warnings[0], /not the form of an ISRC/);
  assert.equal(bad.fields.use, 'someday');
  assert.deepEqual(cleanFields(SONGS, 'nonsense').fields, {});
});

test('a new entry needs only a title, gets a card, and an agent is marked', () => {
  const missing = applySave(songs(), null, { fields: { artist: 'X' } }, 'ana', T0);
  assert.ok('error' in missing && /needs its song title/.test(missing.error));

  const made = saved(songs(), null, { fields: { title: 'Nakama!', artist: 'Anime Music Zone', use: 'Released', lyrics: 'We sail\ninto the sun' }, files: [{ slot: 'master', file: file('nakama.wav', 'a', 64_000_000) }, { slot: 'stems', file: file('drums.wav', 'b') }, { slot: 'stems', file: file('vox.wav', 'c') }], agent: true });
  assert.equal(made.entry.slug, 'nakama');
  assert.equal(made.entry.rev, 1);
  assert.equal(made.entry.agent, true);
  assert.equal(made.entry.history.length, 1);
  assert.equal(made.entry.history[0].agent, true);
  assert.match(made.entry.card, /^Nakama! · song · Songs\n/);
  assert.match(made.entry.card, /Artist: Anime Music Zone/);
  assert.match(made.entry.card, /Lyrics: 5 words/);
  assert.match(made.entry.card, /Has: master \(wav, 64 MB\), stems \(2, 2 MB\)/);
  assert.match(made.entry.card, /Missing: transcript, release artwork, distrokid pack/);
  assert.match(made.entry.card, /id songs\/nakama · changed 2026-11-19$/);
  // the card never carries the lyrics themselves
  assert.ok(!made.entry.card.includes('We sail'));
  assert.equal(cardOf(songs(), made.entry), made.entry.card);
});

test('one master and one transcript: a new one replaces the old, which the history names', () => {
  const master1 = file('v1.wav', 'a');
  const transcript = file('words.json', 'd', 20_000, { madeFrom: { sha256: master1.sha256, tool: 'scribe' } });
  const first = saved(songs(), null, { fields: { title: 'Song' }, files: [{ slot: 'master', file: master1 }, { slot: 'transcript', file: transcript }] });

  const again = saved(songs(), first.entry, { files: [{ slot: 'master', file: master1 }] });
  assert.deepEqual(again.changes, []);
  assert.equal(again.entry.rev, 1);

  const master2 = file('v2.wav', 'e');
  const second = saved(songs(), first.entry, { files: [{ slot: 'master', file: master2 }] });
  assert.deepEqual(second.entry.slots.master.map(f => f.name), ['v2.wav']);
  assert.equal(second.entry.rev, 2);
  assert.match(String(second.changes[0].from), /^v1\.wav/);
  assert.match(String(second.changes[0].to), /^v2\.wav/);
  // the transcript was made from the old master: say so
  assert.match(second.warnings.join('\n'), /transcript was made from the earlier master/);

  const stems = saved(songs(), second.entry, { files: [{ slot: 'stems', file: file('a.wav', '1') }, { slot: 'stems', file: file('b.wav', '2') }] });
  assert.equal(stems.entry.slots.stems.length, 2);
  const fewer = saved(songs(), stems.entry, { removeFiles: [{ slot: 'stems', sha256: '1'.repeat(64) }] });
  assert.deepEqual(fewer.entry.slots.stems.map(f => f.name), ['b.wav']);

  // a file that fits no slot is kept, and a wrong type in a slot is kept with a warning
  const odd = saved(songs(), fewer.entry, { files: [{ slot: 'notes', file: file('notes.pdf', '3') }, { slot: 'artwork', file: file('cover.wav', '4') }] });
  assert.equal(odd.entry.slots.notes.length, 1);
  assert.match(odd.entry.card, /other files \(1\)/);
  assert.match(odd.warnings.join('\n'), /usually holds image/);
});

test('a change is judged against the revision it was made from', () => {
  const first = saved(songs(), null, { fields: { title: 'Song', artist: 'A' } });
  const stale = applySave(songs(), { ...first.entry, rev: 3 }, { fields: { artist: 'B' }, rev: 1 }, 'ben', T0);
  assert.ok('error' in stale && stale.status === 409 && /changed since you read it/.test(stale.error));
  const fresh = saved(songs(), first.entry, { fields: { artist: 'B', lyrics: 'la' }, rev: 1 });
  assert.deepEqual(fresh.changes.map(c => c.what).sort(), ['artist', 'lyrics']);
  assert.equal(fresh.entry.createdAt, first.entry.createdAt);
  const cleared = saved(songs(), fresh.entry, { fields: { lyrics: '' } });
  assert.equal(cleared.entry.fields.lyrics, undefined);
  assert.deepEqual(cleared.changes, [{ what: 'lyrics', from: 'la' }]);
});

test('the sentence an AI asks before it saves', () => {
  assert.equal(
    askSentence({ noun: 'song', title: 'Nakama!', collection: 'Songs', space: 'Get Into Zone', created: true, uploads: [{ slot: 'master', size: 64_000_000 }, { slot: 'artwork', size: 2_000_000 }], fields: ['artist', 'genres', 'lyrics'] }),
    'Add the new song "Nakama!" to the Songs collection of the Get Into Zone space (cloud)?\nUploads: master (64 MB), artwork (2 MB). Fields: artist, genres, lyrics.',
  );
  assert.equal(askSentence({ noun: 'song', title: 'Nakama!', collection: 'Songs', space: 'Personal', created: false, uploads: [], fields: ['use: Unreleased → Released'] }), 'Change the song "Nakama!" in the Songs collection of the Personal space (cloud)?\nFields: use: Unreleased → Released.');
});

test('search: plain words and exact filters', () => {
  const a = saved(songs(), null, { fields: { title: 'Sea Song', use: 'Released', lyrics: 'the sad sea calls' }, files: [{ slot: 'transcript', file: file('t.json', 'a') }] }).entry;
  const b = saved(songs(), null, { fields: { title: 'Sky Song', use: 'Unreleased' } }).entry;
  const ask = (query: string) => parseSearch(new URLSearchParams(query));
  assert.deepEqual([a, b].filter(e => matches(e, ask('q=song'))).map(e => e.slug), ['sea-song', 'sky-song']);
  assert.deepEqual([a, b].filter(e => matches(e, ask('q=sad+sea'))).map(e => e.slug), ['sea-song']);
  assert.deepEqual([a, b].filter(e => matches(e, ask('where=use%3Dunreleased'))).map(e => e.slug), ['sky-song']);
  assert.deepEqual([a, b].filter(e => matches(e, ask('has=transcript'))).map(e => e.slug), ['sea-song']);
  assert.deepEqual([a, b].filter(e => matches(e, ask('lacks=transcript,lyrics'))).map(e => e.slug), ['sky-song']);
  assert.equal(ask('limit=900').limit, 200);
  assert.equal(ask('collection=..%2Fx').collection, undefined);
  // a key the template doesn't know is searched where it is kept, and a name an object always has finds nothing
  const loose = saved(songs(), null, { fields: { title: 'Loose', mood: 'Calm' } }).entry;
  assert.ok(matches(loose, ask('where=mood%3Dcalm')));
  assert.ok(!matches(loose, ask('where=constructor%3Dfunction')));
  assert.ok(!matches(loose, ask('where=title.constructor%3Dx')));
});

test('a collection made from an older template reads as the latest version, its own extras kept', () => {
  const v1 = {
    ...SONGS,
    version: 1,
    guide: '# The old guide',
    fields: [...SONGS.fields.map(field => ({ ...field, keys: undefined })), { key: 'mood', label: 'Mood', kind: 'tags' as const, group: 'Words' }],
    slots: SONGS.slots.filter(slot => slot.key !== 'distrokid-pack'),
  };
  const read = upgradeTemplate(v1);
  assert.equal(read.version, SONGS.version);
  assert.equal(read.guide, SONGS.guide);
  assert.ok(read.fields.find(f => f.key === 'distrokid')?.keys?.length);
  assert.ok(read.slots.some(slot => slot.key === 'distrokid-pack'));
  assert.equal(read.fields.at(-1)?.key, 'mood');
  assert.equal(upgradeTemplate(SONGS), SONGS);
  const unknown = { ...v1, id: 'made-up' };
  assert.equal(upgradeTemplate(unknown), unknown);
});

test('a field the newer version retired leaves an older collection; the collection’s own fields stay', () => {
  const v2 = {
    ...SONGS,
    version: 2,
    fields: [
      { key: 'title', label: 'Song title', kind: 'text' as const, group: 'Identity' },
      { key: 'titleLatin', label: 'Title in Latin letters', kind: 'text' as const, group: 'Identity' },
      { key: 'mood', label: 'Mood', kind: 'tags' as const, group: 'Words' },
    ],
  };
  const read = upgradeTemplate(v2);
  assert.ok(SONGS.retired?.includes('titleLatin'));
  assert.ok(!read.fields.some(f => f.key === 'titleLatin'));
  assert.ok(read.fields.some(f => f.key === 'titleOriginal') && read.fields.some(f => f.key === 'duration') && read.fields.some(f => f.key === 'description'));
  assert.equal(read.fields.at(-1)?.key, 'mood');
});

test('reading a part: lines of a text, seconds of a timed transcript', () => {
  assert.deepEqual(readPart('a\nb\nc\nd', 'text', { lines: [2, 3] }), { text: 'b\nc', note: 'lines 2 to 3 of 4' });
  const words = JSON.stringify({ words: [{ text: 'we', start: 1, end: 1.2 }, { text: 'sail', start: 61, end: 61.5 }, { text: 'home', start: 95, end: 96 }] });
  const part = readPart(words, 'json', { time: [60, 90] });
  assert.deepEqual(JSON.parse(part.text), [{ text: 'sail', start: 61, end: 61.5 }]);
  assert.equal(part.note, '1 of 3 timed words, 1:00 to 1:30');
  assert.match(readPart('{"a":1}', 'json', { time: [0, 5] }).note ?? '', /no timed words/);
  assert.match(readPart('x'.repeat(70_000), 'text').note ?? '', /the first 60000 of 70000/);
  assert.equal(readPart('short', 'text').note, undefined);
});

test('usage: summed by person and collection, and costed with prices an admin sets', () => {
  const line = (over: Partial<UsageLine>): UsageLine => ({ at: '', day: '2026-11-19', clientId: 'ana', space: SPACE, action: 'search', ...over });
  const lines = [line({ action: 'upload', bytes: 2e9, collection: 'songs', device: 'mac-1' }), line({ action: 'fetch', bytes: 1e9, collection: 'songs', device: 'mac-1' }), line({ action: 'fetch', bytes: 3e9, clientId: 'ben', collection: 'songs', device: 'cloud-a' }), line({}), line({ action: 'fill', tokensIn: 1_000_000, tokensOut: 100_000 }), line({ action: 'save' }), line({ action: 'read', bytes: 5000 })];
  const people = sumBy(lines, 'clientId');
  assert.equal(people.ana.uploadedBytes, 2e9);
  assert.equal(people.ana.fetchedBytes, 1e9 + 5000);
  assert.equal(people.ben.fetchedBytes, 3e9);
  assert.equal(people.ana.searches, 1);
  assert.equal(people.ana.fills, 1);
  assert.deepEqual(Object.keys(sumBy(lines, 'collection')), [`${SPACE}/songs`]);
  assert.deepEqual(Object.keys(sumBy(lines, 'device')).sort(), ['cloud-a', 'mac-1']);

  const prices = cleanPrices({ downloadPerGb: 0.1, searchPer1000: 1, fillPerMillionTokensIn: 2, fillPerMillionTokensOut: 10, storagePerGbMonth: -4, nonsense: 9 });
  assert.equal(prices.storagePerGbMonth, DEFAULT_PRICES.storagePerGbMonth);
  assert.equal(costOf(people.ben, prices), 0.3);
  assert.equal(costOf(addUsage(emptySum(), { action: 'fill', tokensIn: 1_000_000, tokensOut: 100_000 }), prices), 3);
  assert.equal(storageCostOf(50e9, { ...prices, storagePerGbMonth: 0.02 }), 1);
});
