import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { shareLine, cachePath, cardOfItem, inputFolder, takenNote, entryLines, fieldsFrom, filesFrom, itemsFrom, listOf, madeFromOf, overviewLines, parseArgs, pickSpace, privateDetails, reportLines, sha256Of, sizeOf } from './library.mjs';

test('arguments: positionals, repeated flags and switches', () => {
  const { args, flags } = parseArgs(['save', 'songs', 'nakama', '--set', 'title=Nakama! = fun', '--set', 'use=Released', '--file', 'master=a b.wav', '--project=Get Into Zone', '--yes', '--has=transcript', '--has=stems']);
  assert.deepEqual(args, ['save', 'songs', 'nakama']);
  assert.deepEqual(flags.set, ['title=Nakama! = fun', 'use=Released']);
  assert.equal(flags.file, 'master=a b.wav');
  assert.equal(flags.project, 'Get Into Zone');
  assert.equal(flags.yes, true);
  assert.deepEqual(listOf(flags.has), ['transcript', 'stems']);
  assert.deepEqual(listOf(undefined), []);
  assert.deepEqual(listOf(true), []);
  assert.deepEqual(parseArgs(['--set=a=b']).flags.set, 'a=b');
});

test('--set: text, JSON, and an empty value clears', () => {
  assert.deepEqual(fieldsFrom(['title=Nakama!', 'lyrics=', 'storeLinks=[{"platform":"Spotify","url":"https://x.test"}]', 'distrokid={"language":"English"}']), { title: 'Nakama!', lyrics: null, storeLinks: [{ platform: 'Spotify', url: 'https://x.test' }], distrokid: { language: 'English' } });
  assert.throws(() => fieldsFrom(['title']), /<field>=<value>/);
  assert.throws(() => fieldsFrom(['x=[oops']), /isn't valid JSON/);
});

test('--file and --made-from', () => {
  assert.deepEqual(filesFrom(['Master=/tmp/a.wav']), [{ slot: 'master', path: '/tmp/a.wav' }]);
  assert.throws(() => filesFrom(['/tmp/a.wav']), /<slot>=<path>/);
  assert.deepEqual(madeFromOf('transcript=master:scribe'), [{ slot: 'transcript', source: 'master', tool: 'scribe' }]);
  assert.deepEqual(madeFromOf('transcript=master:transcribe:lang=en letters'), [{ slot: 'transcript', source: 'master', tool: 'transcribe', params: 'lang=en letters' }]);
  assert.deepEqual(madeFromOf(undefined), []);
  assert.throws(() => madeFromOf('transcript'), /<slot>=<source slot>/);
});

test('private details are counted, never quoted', () => {
  const found = privateDetails(JSON.stringify({ email: 'someone@example.com', apiKey: 'abcd1234', file: '/Users/someone/Music/a.wav', phone: '+91 98765 43210', token: 'sk-abcdefghijklmnopqrstuv' }));
  assert.deepEqual(found, ['1 email address', '1 thing that looks like a key or a token', '1 password or key field', '1 path on a computer', '1 phone number']);
  assert.ok(!found.join(' ').includes('someone'));
  assert.deepEqual(privateDetails('{"title":"Nakama!","isrc":"USABC2600001","duration":222.5}'), []);
});

test('the space a command means', () => {
  const spaces = [{ space: { id: 'a'.repeat(24), name: 'Personal', personal: true } }, { space: { id: 'b'.repeat(24), name: 'Get Into Zone', personal: false } }];
  assert.equal(pickSpace(spaces, undefined).name, 'Personal');
  assert.equal(pickSpace(spaces, 'mine').name, 'Personal');
  assert.equal(pickSpace(spaces, 'get into zone').id, 'b'.repeat(24));
  assert.equal(pickSpace(spaces, 'GetIntoZone').id, 'b'.repeat(24));
  assert.equal(pickSpace(spaces, 'b'.repeat(24)).name, 'Get Into Zone');
  assert.throws(() => pickSpace(spaces, 'nope'), /No space "nope" of yours/);
  assert.throws(() => pickSpace(spaces.slice(1), undefined), /personal space has no files side/);
});

test('what is printed', () => {
  assert.equal(sizeOf(64_000_000), '64 MB');
  assert.equal(sizeOf(1_500_000_000), '1.5 GB');
  assert.equal(sizeOf(300), '1 KB');
  const lines = overviewLines({ space: { name: 'Get Into Zone', role: 'viewer' }, collections: [{ slug: 'songs', name: 'Songs', noun: 'song', entries: 2, fields: [{ key: 'title' }], slots: [{ key: 'master' }, { key: 'stems', many: true }], learned: { platform: ['Spotify'], genre: [] } }] });
  assert.deepEqual(lines, ['Get Into Zone Library (you can read it)', '  Songs (songs) · 2 songs', '      fields: title', '      files:  master, stems (many)', '      known platforms: Spotify']);
  assert.match(overviewLines({ space: { name: 'Personal', role: 'owner' }, collections: [] })[1], /No collections yet/);
  const entry = { card: 'Song · song · Songs', collection: 'songs', slug: 'song', rev: 2, agent: true, fields: { title: 'Song', lyrics: 'la '.repeat(100) }, extra: {}, slots: { master: [{ name: 'a.wav', size: 64_000_000, type: 'audio', sha256: 'f'.repeat(64) }] } };
  const text = entryLines(entry, [{ platform: 'Spotify', day: '2026-11-19', numbers: { streams: 1200 } }]).join('\n');
  assert.match(text, /lyrics: .*… \(mm library read songs\/song lyrics\)/);
  assert.match(text, /file master: a\.wav · 64 MB · audio · ffffffffffff/);
  assert.match(text, /numbers Spotify \(2026-11-19\): streams 1200/);
  assert.match(text, /revision 2 · first saved by an AI session/);
});

test('files are named by content', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-library-'));
  const file = path.join(dir, 'a.txt');
  fs.writeFileSync(file, 'abc');
  const sha = await sha256Of(file);
  assert.equal(sha, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(cachePath(sha, { MEDIAMAKE_LIBRARY_CACHE: '/c' }), path.join('/c', 'ba', sha));
  fs.rmSync(dir, { recursive: true });
});

/* ---------- the commands, against a stand-in for the site and its storage ---------- */

import http from 'node:http';
import { main } from './library.mjs';

const SPACE = 'b'.repeat(24);
const TEAM = 'c'.repeat(24);

/** A small stand-in: it keeps what was asked, stores PUT bodies by sha256 and serves them back. */
async function standIn() {
  const state = { calls: [], blobs: new Map(), stored: new Set(), entry: null, fetched: 0 };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const send = (body, status = 200) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (url.pathname.startsWith('/blob/')) {
      const sha = url.pathname.slice(6);
      if (req.method === 'PUT') return state.blobs.set(sha, raw), res.writeHead(200).end();
      state.fetched++;
      return res.writeHead(200).end(url.searchParams.has('damage') ? Buffer.from('damaged') : state.blobs.get(sha));
    }
    const body = raw.length ? JSON.parse(raw.toString()) : null;
    state.calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, auth: req.headers.authorization });
    if (url.pathname === '/api/library' && req.method === 'GET' && url.searchParams.has('space') && state.view) return send(state.view);
    if (url.pathname === '/api/library' && req.method === 'GET') return send({ spaces: [{ space: { id: SPACE, name: 'Get Into Zone', personal: false, role: 'owner' }, collections: [] }, ...(state.team ? [{ space: { id: TEAM, name: 'Sample Team', personal: false, role: 'editor' }, collections: [] }] : [])], templates: [] });
    if (url.pathname === '/api/library/shares' && req.method === 'GET') return send(url.searchParams.has('notes') ? { notes: state.notes ?? { tags: [], usedIn: [] } } : { since: '2026-10-21', shares: state.shares ?? [] });
    if (url.pathname === '/api/library/shares' && req.method === 'POST') {
      if (body.action === 'share') return send({ invited: true, shared: { to: body.project ?? 'p', kind: body.project ? 'project' : 'person', name: body.project ? 'Sample Team' : 'Sample Person', role: body.role, state: 'invited' } });
      if (body.action === 'accept') return send({ as: 'songs-get-into-zone', name: 'Songs' });
      if (body.action === 'notes') return send({ notes: (state.notes = { ...(body.rating && { rating: body.rating }), tags: body.tags ?? [], usedIn: body.usedIn ?? [] }) });
      return send({ ok: true });
    }
    if (url.pathname === '/api/library/files' && req.method === 'POST') {
      if (body.action === 'start') return send({ uploads: body.files.filter(f => !state.stored.has(f.sha256)).map(f => ({ sha256: f.sha256, name: f.name, size: f.size, uploadUrl: `${origin}/blob/${f.sha256}`, headers: { 'Content-Type': 'application/octet-stream' } })), alreadyStored: body.files.filter(f => state.stored.has(f.sha256)).map(f => f.sha256) });
      for (const sha of body.sha256s) if (state.blobs.has(sha)) state.stored.add(sha);
      return send({ stored: body.sha256s });
    }
    if (url.pathname === '/api/library/entries' && req.method === 'POST') {
      if (body.dry) return send({ dry: true, created: true, ref: 'songs/nakama', changes: [{ what: 'title', to: 'Nakama!' }], warnings: [], ask: 'Add the new song "Nakama!" to the Songs collection of the Get Into Zone space (cloud)?' });
      state.entry = { title: 'Nakama!', collection: 'songs', slug: 'nakama', rev: 1, slots: Object.fromEntries(body.files.map(f => [f.slot, [f]])) };
      return send({ ref: 'songs/nakama', created: true, changed: true, warnings: [], entry: state.entry });
    }
    if (url.pathname === '/api/library/entries' && req.method === 'GET') return send({ entry: state.entry, statistics: [] });
    if (url.pathname === '/api/library/files' && req.method === 'GET' && url.searchParams.has('madeFrom')) {
      const hits = Object.entries(state.entry?.slots ?? {}).flatMap(([slot, list]) => list.filter(f => f.madeFrom?.sha256 === url.searchParams.get('madeFrom') && (!url.searchParams.get('slot') || slot === url.searchParams.get('slot')) && (f.madeFrom.params ?? '') === (url.searchParams.get('params') ?? '')).map(f => ({ ref: 'songs/nakama', title: 'Nakama!', slot, name: f.name, size: state.blobs.get(f.sha256).length, sha256: f.sha256, tool: f.madeFrom.tool, addedAt: '2026-11-19T10:00:00Z', space: 'Get Into Zone', spaceId: SPACE })));
      return send({ results: hits });
    }
    if (url.pathname === '/api/library/files' && req.method === 'GET') {
      const wanted = (url.searchParams.get('slots') ?? '').split(',').filter(Boolean);
      const files = Object.entries(state.entry.slots).filter(([slot]) => !wanted.length || wanted.includes(slot)).flatMap(([slot, list]) => list.map(f => ({ slot, name: f.name, size: state.blobs.get(f.sha256).length, sha256: f.sha256, url: `${origin}/blob/${f.sha256}${state.damage ? '?damage' : ''}` })));
      return send({ ref: 'songs/nakama', title: 'Nakama!', files });
    }
    if (url.pathname === '/api/library/devices' && req.method === 'POST') return send({ saved: body.cards.length, ...(body.done && { files: state.calls.filter(c => c.path === '/api/library/devices' && c.method === 'POST' && c.body.run === body.run).reduce((n, c) => n + c.body.cards.length, 0) }) });
    if (url.pathname === '/api/library/devices' && req.method === 'DELETE') return send({ forgotten: 2 });
    send({ error: 'not in the stand-in' }, 404);
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return { state, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => server.close(done)) };
}

/** Runs a command and gives back what it printed. */
async function run(argv, env) {
  const printed = [];
  const log = console.log;
  const error = console.error;
  console.log = (...args) => printed.push(args.join(' '));
  console.error = () => {};
  try {
    const code = await main(argv, env);
    return { code, out: printed.join('\n') };
  } finally {
    console.log = log;
    console.error = error;
  }
}

test('save asks first, uploads only on --yes, and fetch checks what arrives', async () => {
  const site = await standIn();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-library-'));
  const env = { MEDIAMAKE_API_URL: site.url, MEDIAMAKE_API_KEY: 'test-key', MEDIAMAKE_CONFIG: path.join(dir, 'config.json'), MEDIAMAKE_LIBRARY_CACHE: path.join(dir, 'cache'), MEDIAMAKE_PLACE: 'test-place' };
  const master = path.join(dir, 'nakama.wav');
  const pack = path.join(dir, 'pack.json');
  fs.writeFileSync(master, Buffer.alloc(5000, 7));
  fs.writeFileSync(pack, JSON.stringify({ title: 'Nakama!', contact: 'someone@example.com' }));
  const save = ['save', 'songs', '--project=Get Into Zone', '--set', 'title=Nakama!', '--file', `master=${master}`];
  try {
    // without --yes: the sentence, and nothing leaves the computer
    const asked = await run(save, env);
    assert.equal(asked.code, 0);
    assert.match(asked.out, /^Add the new song "Nakama!" to the Songs collection of the Get Into Zone space \(cloud\)\?/);
    assert.match(asked.out, /Nothing was saved\. Show the person the lines above, and after they agree: add --yes\./);
    assert.equal(site.state.blobs.size, 0);
    assert.ok(site.state.calls.every(call => call.method === 'GET' || call.body.dry === true));
    assert.ok(site.state.calls.every(call => call.auth === 'Bearer test-key'));

    // private details stop a save even with --yes, until the person says they may go up
    const stopped = await run([...save, '--file', `distrokid-pack=${pack}`, '--yes'], env);
    assert.equal(stopped.code, 1);
    assert.match(stopped.out, /private details in pack\.json: 1 email address/);
    assert.ok(!stopped.out.includes('someone@example.com'));
    assert.equal(site.state.blobs.size, 0);

    // with --yes: uploaded by content, then saved into its slot, counted for this place
    const saved = await run([...save, '--yes'], env);
    assert.equal(saved.code, 0);
    assert.match(saved.out, /✔ Added Nakama! \(songs\/nakama\) in the Get Into Zone space, revision 1\./);
    const sha = await sha256Of(master);
    assert.deepEqual([...site.state.blobs.keys()], [sha]);
    const last = site.state.calls.at(-1);
    assert.deepEqual(last.body.files, [{ slot: 'master', sha256: sha, name: 'nakama.wav' }]);
    assert.equal(last.body.device, 'test-place');
    assert.equal(last.body.dry, undefined);

    // fetch: from the cloud once, checked, then from this computer's cache
    const to = path.join(dir, 'project');
    const first = await run(['fetch', 'songs/nakama', '--project=Get Into Zone', `--to=${to}`], env);
    assert.match(first.out, /nakama\.wav \(master, 5 KB, from the cloud\)/);
    assert.deepEqual(fs.readFileSync(path.join(to, 'nakama.wav')), fs.readFileSync(master));
    const again = await run(['fetch', 'songs/nakama', '--project=Get Into Zone', `--to=${to}`], env);
    assert.match(again.out, /already there/);
    const elsewhere = await run(['fetch', 'songs/nakama', 'master', '--project=Get Into Zone', `--to=${path.join(dir, 'other')}`], env);
    assert.match(elsewhere.out, /from this computer/);
    assert.equal(site.state.fetched, 1);

    // a file here that differs is never replaced without the word
    fs.writeFileSync(path.join(to, 'nakama.wav'), 'my own edit');
    await assert.rejects(run(['fetch', 'songs/nakama', '--project=Get Into Zone', `--to=${to}`], env), /differs from the Library's nakama\.wav\. Nothing was replaced/);
    assert.equal(fs.readFileSync(path.join(to, 'nakama.wav'), 'utf8'), 'my own edit');

    // a download that arrives damaged is refused and leaves nothing in the cache
    site.state.damage = true;
    fs.rmSync(path.join(dir, 'cache'), { recursive: true });
    await assert.rejects(run(['fetch', 'songs/nakama', '--project=Get Into Zone', `--to=${path.join(dir, 'third')}`], env), /arrived damaged/);
    assert.equal(fs.existsSync(cachePath(sha, env)), false);
    assert.equal(fs.existsSync(path.join(dir, 'third', 'nakama.wav')), false);
  } finally {
    await site.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/* ---------- this computer's library ---------- */

test('a card says what a file is, never where it is', () => {
  const sha = 'a'.repeat(64);
  assert.deepEqual(cardOfItem({ id: sha, path: '/Users/someone/Downloads/_LIBRARY/music/zone/Sample Song.wav', kind: 'music', subject: 'zone', title: 'Sample Song', ext: 'wav', bytes: 64_000_000, duration: 182.4, width: null, height: null, status: 'online' }, ['final', 'master']), {
    sha256: sha,
    name: 'Sample Song.wav',
    title: 'Sample Song',
    kind: 'music',
    subject: 'zone',
    bytes: 64_000_000,
    duration: 182.4,
    tags: ['final', 'master'],
  });
  assert.equal(cardOfItem({ id: sha, path: 'a.mp4', kind: '_unsorted', bytes: 1, status: 'cold' }).cold, true);
  assert.equal(cardOfItem({ id: sha, path: 'a.mp4', kind: '_unsorted', bytes: 1, status: 'cold' }).kind, 'unsorted');
  // a teammate's item with no copy here, a file that is gone, and an id that is not a content's
  assert.equal(cardOfItem({ id: sha, path: 'a.mp4', kind: 'footage', bytes: 1, status: 'remote' }), null);
  assert.equal(cardOfItem({ id: sha, path: 'a.mp4', kind: 'footage', bytes: 1, status: 'missing' }), null);
  assert.equal(cardOfItem({ id: 'not-a-sha', path: 'a.mp4', kind: 'footage', bytes: 1, status: 'online' }), null);
  assert.match(reportLines([{ kind: 'music', bytes: 2e6 }, { kind: 'music', bytes: 1e6 }, { kind: 'footage', bytes: 5e6 }]).join('\n'), /^3 files, 8 MB on this computer\.\n {2}music: 2\n {2}footage: 1\n/);
});

test('--item names a slot and the start of a media library id', () => {
  assert.deepEqual(itemsFrom(['master=ABCDEF012345']), [{ slot: 'master', id: 'abcdef012345' }]);
  assert.throws(() => itemsFrom(['master=abc']), /at least its first 8 characters/);
  assert.throws(() => itemsFrom(['master=/Users/someone/a.wav']), /--item takes/);
});

test('a computer reports only after its owner turns it on, and --item takes a file from its library', async t => {
  let sqlite;
  try {
    sqlite = await import('node:sqlite');
  } catch {
    return t.skip('this Node has no node:sqlite');
  }
  const site = await standIn();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-library-'));
  const root = path.join(dir, 'lib');
  fs.mkdirSync(path.join(root, '.catalog'), { recursive: true });
  fs.mkdirSync(path.join(root, 'music'), { recursive: true });
  const song = path.join(root, 'music', 'sample-song.wav');
  fs.writeFileSync(song, Buffer.alloc(3000, 3));
  const sha = await sha256Of(song);
  const db = new sqlite.DatabaseSync(path.join(root, '.catalog', 'library.db'));
  db.exec('CREATE TABLE items (id TEXT PRIMARY KEY, path TEXT, kind TEXT, subject TEXT, title TEXT, ext TEXT, bytes INTEGER, width INTEGER, height INTEGER, duration REAL, status TEXT); CREATE TABLE tags (item_id TEXT, tag TEXT);');
  db.prepare('INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(sha, 'music/sample-song.wav', 'music', 'zone', 'Sample Song', 'wav', 3000, null, null, 12.5, 'online');
  db.prepare('INSERT INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('c'.repeat(64), '/elsewhere/gone.mp4', 'footage', null, null, 'mp4', 10, null, null, null, 'missing');
  db.prepare('INSERT INTO tags VALUES (?, ?)').run(sha, 'final');
  db.close();
  const config = path.join(dir, 'config.json');
  fs.writeFileSync(config, JSON.stringify({ library: { root } }));
  const env = { MEDIAMAKE_API_URL: site.url, MEDIAMAKE_API_KEY: 'test-key', MEDIAMAKE_CONFIG: config, MEDIAMAKE_LIBRARY_CACHE: path.join(dir, 'cache') };
  const reports = () => site.state.calls.filter(call => call.path === '/api/library/devices');
  try {
    // off: it says what would go, and sends nothing, even with --yes
    const dry = await run(['report'], env);
    assert.match(dry.out, /Reporting is off for this computer/);
    assert.match(dry.out, /1 file, 3 KB on this computer\./);
    assert.match(dry.out, /Nothing was sent\. Turning it on is the computer's owner's word: mm library report on\./);
    await run(['report', '--yes'], env);
    assert.equal(reports().length, 0);

    // on: the cards go, with no folder in them
    const on = await run(['report', 'on'], env);
    assert.match(on.out, /✔ 1 card\(s\) sent as /);
    assert.equal(JSON.parse(fs.readFileSync(config, 'utf8')).libraryReport, 'on');
    const [sent] = reports();
    assert.equal(sent.body.done, true);
    assert.deepEqual(sent.body.cards, [{ sha256: sha, name: 'sample-song.wav', title: 'Sample Song', kind: 'music', subject: 'zone', bytes: 3000, duration: 12.5, tags: ['final'] }]);
    assert.ok(!JSON.stringify(sent.body).includes(root));

    // a file is added from the media library by the start of its id
    const asked = await run(['save', 'songs', '--project=Get Into Zone', '--set', 'title=Nakama!', '--item', `master=${sha.slice(0, 12)}`, '--yes'], env);
    assert.equal(asked.code, 0);
    assert.deepEqual(site.state.calls.at(-1).body.files, [{ slot: 'master', sha256: sha, name: 'sample-song.wav' }]);
    await assert.rejects(run(['save', 'songs', '--project=Get Into Zone', '--item', 'master=0000000000'], env), /No file in this computer's media library has an id that starts 0000000000/);

    // forget takes the cards out and turns reporting off
    const gone = await run(['report', 'forget'], env);
    assert.match(gone.out, /✔ Forgotten: 2 card\(s\)/);
    assert.equal(JSON.parse(fs.readFileSync(config, 'utf8')).libraryReport, 'off');
  } finally {
    await site.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/* ---------- reuse ---------- */

test('a production notes what it took, the newest take of a file replacing the older', () => {
  const first = takenNote(null, { ref: 'songs/a', space: 'Zone', at: 't1', files: [{ slot: 'master', name: 'a.wav', sha256: 'a'.repeat(64), size: 1 }] });
  const second = takenNote(first, { ref: 'songs/a', space: 'Zone', at: 't2', files: [{ slot: 'master', name: 'a.wav', sha256: 'b'.repeat(64), size: 2 }, { slot: 'transcript', name: 'a.json', sha256: 'c'.repeat(64), size: 3 }] });
  assert.equal(second.schema, 'mediamake.library-use/v1');
  assert.deepEqual(second.files.map(f => [f.name, f.sha256[0], f.at]), [['a.wav', 'b', 't2'], ['a.json', 'c', 't2']]);
  assert.equal(inputFolder('./somewhere/input'), path.resolve('somewhere/input'));
  assert.throws(() => inputFolder(undefined), /Into which production/);
  assert.throws(() => inputFolder('no-such-project', { MEDIAMAKE_WORKSPACE: os.tmpdir() }), /No project no-such-project/);
});

test('a result is found by the file it was made from, and an entry goes into a project in one call', async () => {
  const site = await standIn();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-library-'));
  const env = { MEDIAMAKE_API_URL: site.url, MEDIAMAKE_API_KEY: 'test-key', MEDIAMAKE_CONFIG: path.join(dir, 'config.json'), MEDIAMAKE_LIBRARY_CACHE: path.join(dir, 'cache'), MEDIAMAKE_PLACE: 'test-place', MEDIAMAKE_WORKSPACE: path.join(dir, 'ws') };
  const master = path.join(dir, 'nakama.wav');
  const words = path.join(dir, 'nakama.words.json');
  fs.writeFileSync(master, Buffer.alloc(4000, 9));
  fs.writeFileSync(words, JSON.stringify({ words: [{ text: 'hey', start: 0, end: 1 }] }));
  fs.mkdirSync(path.join(dir, 'ws', 'projects', 'nakama-video'), { recursive: true });
  try {
    const saved = await run(['save', 'songs', '--project=Get Into Zone', '--set', 'title=Nakama!', '--file', `master=${master}`, '--file', `transcript=${words}`, '--made-from=transcript=master:transcribe', '--yes'], env);
    assert.equal(saved.code, 0);
    const masterSha = await sha256Of(master);
    assert.deepEqual(site.state.calls.at(-1).body.files[1].madeFrom, { sha256: masterSha, tool: 'transcribe' });

    // another computer asks by the master's content, and takes the words without paying again
    const out = path.join(dir, 'elsewhere', 'lyrics.raw.json');
    const found = await run(['made-from', master, '--slot=transcript', `--to=${out}`, '--json'], env);
    const answer = JSON.parse(found.out);
    assert.equal(answer.sha256, masterSha);
    assert.equal(answer.taken.ref, 'songs/nakama');
    assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), JSON.parse(fs.readFileSync(words, 'utf8')));
    // other settings are another result
    const other = await run(['made-from', masterSha, '--slot=transcript', '--params=letters'], env);
    assert.match(other.out, /Nothing in the Library was made from this file with these settings/);

    // the entry's files into the project's input folder, with a note of what was taken
    const used = await run(['use', 'songs/nakama', '--project=Get Into Zone', '--into=nakama-video'], env);
    assert.equal(used.code, 0);
    const input = path.join(dir, 'ws', 'projects', 'nakama-video', 'input');
    assert.deepEqual(fs.readdirSync(input).sort(), ['library.json', 'nakama.wav', 'nakama.words.json']);
    const note = JSON.parse(fs.readFileSync(path.join(input, 'library.json'), 'utf8'));
    assert.deepEqual(note.files.map(f => [f.slot, f.name, f.sha256 === masterSha, f.ref]), [['master', 'nakama.wav', true, 'songs/nakama'], ['transcript', 'nakama.words.json', false, 'songs/nakama']]);
    // a second time moves nothing
    const again = await run(['use', 'songs/nakama', 'master', '--project=Get Into Zone', '--into=nakama-video'], env);
    assert.match(again.out, /= nakama\.wav \(master, already there\)/);
  } finally {
    await site.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a collection is shared, accepted and left only on a yes, and a space keeps its own notes', async () => {
  const site = await standIn();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-library-'));
  const env = { MEDIAMAKE_API_URL: site.url, MEDIAMAKE_API_KEY: 'test-key', MEDIAMAKE_CONFIG: path.join(dir, 'config.json'), MEDIAMAKE_PLACE: 'test-place' };
  site.state.team = true;
  const posts = () => site.state.calls.filter(c => c.path === '/api/library/shares' && c.method === 'POST');
  try {
    // without --yes the owner is asked, and nothing is sent
    const asked = await run(['share', 'songs', '--project=Get Into Zone', '--with=Sample Team'], env);
    assert.match(asked.out, /Share the songs collection of the Get Into Zone space \(cloud\) with everyone on the Sample Team project\? They use the collection itself, live: they read and fetch\./);
    assert.match(asked.out, /Nothing was shared/);
    assert.equal(posts().length, 0);
    const shared = await run(['share', 'songs', '--project=Get Into Zone', '--with=Sample Team', '--editor', '--yes'], env);
    assert.match(shared.out, /Sample Team is invited to songs/);
    assert.deepEqual(posts().at(-1).body, { action: 'share', space: SPACE, collection: 'songs', project: TEAM, role: 'editor', internal: false });
    await run(['share', 'songs', '--project=Get Into Zone', '--to=sample@example.com', '--internal', '--yes'], env);
    assert.deepEqual(posts().at(-1).body, { action: 'share', space: SPACE, collection: 'songs', email: 'sample@example.com', role: 'viewer', internal: true });
    await assert.rejects(run(['share', 'songs', '--project=Get Into Zone'], env), /one project you are on .* or one person/);

    // who has it, and taking it back by the name the list shows
    site.state.shares = [{ to: TEAM, kind: 'project', name: 'Sample Team', role: 'editor', state: 'accepted', internal: false, fetchedBytes: 12_000_000, fetches: 3, people: 2 }, { to: 'p', kind: 'person', name: 'Sample Person', role: 'viewer', state: 'invited', internal: true, fetchedBytes: 0, fetches: 0, people: 0 }];
    const list = await run(['shares', 'songs', '--project=Get Into Zone'], env);
    assert.match(list.out, /Sample Team \(a project\) · can add and change · fetched 12 MB in 3 fetches by 2 people/);
    assert.match(list.out, /Sample Person \(a person\) · invited, not accepted yet · sees Internal only/);
    assert.match((await run(['unshare', 'songs', '--project=Get Into Zone', '--with=sample team'], env)).out, /Stop sharing .* with Sample Team\? It leaves their Library at once/);
    await run(['unshare', 'songs', '--project=Get Into Zone', '--with=sample team', '--yes'], env);
    assert.deepEqual(posts().at(-1).body, { action: 'unshare', space: SPACE, collection: 'songs', to: TEAM });

    // the other side: the invitation says what accepting means, and waits for a yes
    site.state.view = { space: { id: TEAM, name: 'Sample Team', personal: false, role: 'editor' }, collections: [], invitations: [{ from: SPACE, collection: 'songs', name: 'Songs', by: 'Get Into Zone', noun: 'song', entries: 70, role: 'viewer', says: "This is the owner's live collection. It changes when they change it." }] };
    assert.match(overviewLines(site.state.view).join('\n'), /Invitation: Get Into Zone shares Songs \(70 songs\)\. This is the owner's live collection/);
    const before = posts().length;
    const invited = await run(['accept', 'songs', '--project=Sample Team'], env);
    assert.match(invited.out, /Accept Songs \(70 songs\), shared by Get Into Zone, into the Sample Team space \(cloud\)\? This is the owner's live collection\. It changes when they change it\./);
    assert.equal(posts().length, before);
    const accepted = await run(['accept', 'songs', '--project=Sample Team', '--yes'], env);
    assert.match(accepted.out, /Songs is in the Sample Team space as songs-get-into-zone/);
    assert.deepEqual(posts().at(-1).body, { action: 'accept', space: TEAM, from: SPACE, collection: 'songs' });

    // a shared collection reads as one in the overview, and leaving it names where it really is
    site.state.view = { space: site.state.view.space, collections: [{ slug: 'songs-get-into-zone', name: 'Songs', noun: 'song', entries: 70, fields: [], slots: [], learned: {}, shared: { by: 'Get Into Zone', from: SPACE, collection: 'songs', role: 'viewer' } }] };
    assert.match(overviewLines(site.state.view)[1], /Songs \(songs-get-into-zone\) · 70 songs · shared by Get Into Zone \(read and fetch\)/);
    await run(['notes', 'songs-get-into-zone/nakama', '--project=Sample Team', '--rating=4', '--tags=drums, hook'], env);
    assert.equal(posts().at(-1).body.action, 'accept', 'notes wait for a yes too');
    const noted = await run(['notes', 'songs-get-into-zone/nakama', '--project=Sample Team', '--rating=4', '--tags=drums, hook', '--yes'], env);
    assert.match(noted.out, /Notes on songs-get-into-zone\/nakama: rating 4 · tags: drums, hook · used in: none/);
    await run(['leave', 'songs-get-into-zone', '--project=Sample Team', '--yes'], env);
    assert.deepEqual(posts().at(-1).body, { action: 'leave', space: TEAM, from: SPACE, collection: 'songs' });
    assert.equal(shareLine({ name: 'Sample Team', kind: 'project', state: 'accepted', role: 'viewer', fetches: 0 }), '  Sample Team (a project) · reads and fetches');
  } finally {
    await site.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
