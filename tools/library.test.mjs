import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { cachePath, entryLines, fieldsFrom, filesFrom, listOf, madeFromOf, overviewLines, parseArgs, pickSpace, privateDetails, sha256Of, sizeOf } from './library.mjs';

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
    if (url.pathname === '/api/library' && req.method === 'GET') return send({ spaces: [{ space: { id: SPACE, name: 'Get Into Zone', personal: false, role: 'owner' }, collections: [] }], templates: [] });
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
    if (url.pathname === '/api/library/files' && req.method === 'GET') {
      const files = Object.entries(state.entry.slots).flatMap(([slot, list]) => list.map(f => ({ slot, name: f.name, size: state.blobs.get(f.sha256).length, sha256: f.sha256, url: `${origin}/blob/${f.sha256}${state.damage ? '?damage' : ''}` })));
      return send({ ref: 'songs/nakama', title: 'Nakama!', files });
    }
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
