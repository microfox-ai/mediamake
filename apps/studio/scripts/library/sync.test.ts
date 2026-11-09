/**
 * Channel team sync end to end: three Macs (the owner's, an editor's, a viewer's) and a stand-in
 * MediaMake server that runs the routes' own checks (apps/mediamake/lib/channel-sync and
 * lib/brand-kit). Brand kit, skill variants, productions, media and keeper Suno takes go up and
 * come down; dry runs change nothing, files wait for the user's OK and the channel's limit (the
 * server holds it too), a pull never overwrites (.theirs), and what a Mac has already is skipped.
 *
 *   mm test:library
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { applyBrandKitPatch, assetKindOf, cleanPath, isKitAsset, mimeOf, type BrandKit } from '../../../mediamake/lib/brand-kit/index.ts';
import {
  MB,
  SYNC_WHATS,
  checkPush,
  cleanDetails,
  limitOf,
  mergeDetails,
  planUploads,
  stableStringify,
  usedBytes,
  type MediaDetails,
  type PushItem,
  type SharedFile,
  type SyncWhat,
} from '../../../mediamake/lib/channel-sync/index.ts';
import { connect, type Cloud } from './cloud.ts';
import { configFile, linkChannel, loadConfig, saveConfig, type LibraryConfig } from './config.ts';
import { getItem } from './db.ts';
import { applyRequests, tag } from './edit.ts';
import { find } from './find.ts';
import { ingest } from './ingest.ts';
import { openLibrary, sourcesOf, type Lib } from './lib.ts';
import { saveProduction } from './production.ts';
import { approveShare, keyForProject, keyNamed, withdrawShare } from './share.ts';
import { pullFiles, pushShared, syncChannel, theirsCopies, type Part, type Step } from './sync.ts';
import { sha256File } from './sys.ts';
import { use } from './use.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-sync-test-'));
const fixtures = path.join(tmp, 'fixtures');
const PROJECT = '6ae852f5ed0fa78c70a3b9aa';
const ff = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'pipe' });

// ---------- a stand-in MediaMake: the routes' logic over memory ----------

type Doc = { key: string; hash: string; data: unknown; updatedAt: string; by: string };
type FileDoc = SharedFile & { url: string; fileName: string; contentType: string };
const server = {
  limitBytes: undefined as number | undefined,
  items: new Map<string, Doc>(),
  files: [] as FileDoc[],
  storage: new Map<string, Buffer>(),
  kit: null as BrandKit | null,
  generations: null as unknown[] | null,
  writes: 0,
  uploads: 0,
};
const MEMBERS: Record<string, { clientId: string; role: 'owner' | 'editor' | 'viewer' }> = {
  'key-owner': { clientId: 'owner', role: 'owner' },
  'key-editor': { clientId: 'editor', role: 'editor' },
  'key-viewer': { clientId: 'viewer', role: 'viewer' },
};
let base = '';

const handle = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const u = new URL(req.url!, base);
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks);
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (u.pathname.startsWith('/storage/')) {
    const name = u.pathname.slice('/storage/'.length);
    if (req.method === 'PUT') {
      if (req.headers['x-amz-acl'] !== 'public-read') return send(403, { error: 'signed public-read' });
      server.storage.set(name, raw);
      server.uploads++;
      return send(200, {});
    }
    const body = server.storage.get(name);
    if (!body) return send(404, { error: 'NoSuchKey' });
    res.writeHead(200, { 'Content-Length': body.length, 'Content-Type': 'application/octet-stream' });
    return res.end(req.method === 'HEAD' ? undefined : body);
  }
  const who = MEMBERS[(req.headers.authorization ?? '').replace(/^Bearer /, '')];
  if (!who) return send(401, { error: 'Unauthorized' });
  const body = raw.length ? JSON.parse(raw.toString()) : {};
  const projectId = u.searchParams.get('projectId') ?? body.projectId ?? u.searchParams.get('id');
  const project = { id: PROJECT, displayName: 'Anime Music Zone', isOwned: who.role === 'owner', sharedRole: who.role === 'owner' ? undefined : who.role };
  if (u.pathname === '/api/project' && req.method === 'GET') return projectId ? (projectId === PROJECT ? send(200, project) : send(404, { error: 'Project not found' })) : send(200, [project]);
  if (u.pathname === '/api/generations') {
    if (!server.generations) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<!DOCTYPE html><h1>404</h1>');
    }
    // as apps/mediamake/app/api/generations: { items, nextCursor }, a page at a time (one take a page here)
    const kept = server.generations.filter(g => (g as { rating?: string }).rating === u.searchParams.get('rating'));
    const at = Number(u.searchParams.get('cursor') ?? 0);
    return send(200, { items: kept.slice(at, at + 1), nextCursor: at + 1 < kept.length ? String(at + 1) : null });
  }
  if (projectId !== PROJECT) return send(404, { error: 'Project not found' });
  const write = req.method !== 'GET' && req.method !== 'HEAD';
  if (write && who.role === 'viewer' && !u.pathname.startsWith('/api/generations')) return send(403, { error: 'Only the owner or an editor can push to this channel; viewers pull' });
  if (write) server.writes++;

  if (u.pathname === '/api/channel-sync') {
    if (req.method === 'PUT') {
      if (who.role !== 'owner') return send(403, { error: "Only the project's owner can change the channel's limit" });
      server.limitBytes = Math.round(body.limitMb * MB);
      return send(200, { projectId, limitBytes: server.limitBytes });
    }
    const counts = Object.fromEntries(SYNC_WHATS.map(w => [w, [...server.items.keys()].filter(k => k.startsWith(`${w}:`)).length]));
    return send(200, {
      project: { id: PROJECT, name: project.displayName, role: who.role },
      limitBytes: limitOf({ channelSync: { limitBytes: server.limitBytes } }),
      usedBytes: usedBytes(server.files),
      counts: { ...counts, files: server.files.filter(f => f.state === 'shared').length },
    });
  }
  if (u.pathname === '/api/channel-sync/items') {
    const what = (u.searchParams.get('what') ?? body.what) as SyncWhat;
    if (req.method === 'GET') {
      const items = [...server.items.entries()]
        .filter(([k]) => k.startsWith(`${what}:`))
        .map(([, d]) => {
          const f = server.files.find(x => x.sha256 === d.key && x.state === 'shared');
          return { key: d.key, hash: d.hash, data: d.data, updatedAt: d.updatedAt, mine: d.by === who.clientId, ...(f ? { file: { url: f.url, size: f.size, fileName: f.fileName, contentType: f.contentType } } : {}) };
        });
      return send(200, { projectId, what, role: who.role, items });
    }
    const out = { saved: [] as string[], same: [] as string[], conflicts: [] as { key: string; hash: string }[] };
    for (const item of body.items as PushItem[]) {
      const existing = server.items.get(`${what}:${item.key}`);
      if (what === 'media') {
        const d = cleanDetails(item.data)!;
        const merged = mergeDetails(existing?.data as MediaDetails | undefined, d);
        if (existing && stableStringify(merged) === stableStringify(existing.data)) out.same.push(item.key);
        else {
          server.items.set(`${what}:${item.key}`, { key: item.key, hash: item.key, data: merged, updatedAt: new Date().toISOString(), by: who.clientId });
          out.saved.push(item.key);
        }
        continue;
      }
      const verdict = checkPush(existing, item);
      if (verdict === 'same') out.same.push(item.key);
      else if (verdict === 'conflict') out.conflicts.push({ key: item.key, hash: existing!.hash });
      else {
        server.items.set(`${what}:${item.key}`, { key: item.key, hash: item.hash, data: JSON.parse(JSON.stringify(item.data)), updatedAt: new Date().toISOString(), by: who.clientId });
        out.saved.push(item.key);
      }
    }
    return send(200, { projectId, what, ...out });
  }
  if (u.pathname === '/api/channel-sync/files') {
    if (req.method === 'POST') {
      const plan = planUploads(server.files, body.files, limitOf({ channelSync: { limitBytes: server.limitBytes } }));
      const uploads = plan.accept.map(f => {
        const name = `${f.sha256.slice(0, 12)}-${f.fileName}`;
        server.files = server.files.filter(x => x.sha256 !== f.sha256);
        server.files.push({ sha256: f.sha256, size: f.size, state: 'uploading', at: new Date().toISOString(), url: `${base}/storage/${name}`, fileName: f.fileName!, contentType: f.contentType! });
        return { sha256: f.sha256, uploadUrl: `${base}/storage/${name}`, url: `${base}/storage/${name}`, contentType: f.contentType };
      });
      return send(200, { projectId, uploads, already: plan.already, refused: plan.refused, usedBytes: plan.usedBytes, limitBytes: plan.limitBytes });
    }
    if (req.method === 'PUT') {
      const shared: string[] = [];
      const failed: { sha256: string; reason: string }[] = [];
      for (const sha of body.sha256 as string[]) {
        const f = server.files.find(x => x.sha256 === sha && x.state === 'uploading');
        const stored = f && server.storage.get(f.url.split('/storage/')[1]);
        if (f && stored?.length === f.size) {
          f.state = 'shared';
          shared.push(sha);
        } else failed.push({ sha256: sha, reason: 'not found in storage' });
      }
      return send(200, { projectId, shared, failed });
    }
    const gone = (u.searchParams.get('sha256') ?? '').split(',');
    for (const f of server.files) if (gone.includes(f.sha256)) f.state = 'withdrawn';
    return send(200, { projectId, withdrawn: gone });
  }
  if (u.pathname === '/api/project/brand-kit') {
    if (req.method === 'GET') return send(200, { projectId, role: who.role, brandKit: server.kit });
    const { projectId: _p, ...patch } = body;
    server.kit = applyBrandKitPatch(server.kit, patch, who.clientId);
    return send(200, { projectId, brandKit: server.kit });
  }
  if (u.pathname === '/api/project/brand-kit/upload') {
    const uploads = (body.files as { path: string; contentType?: string }[])
      .map(f => ({ ...f, path: cleanPath(f.path) }))
      .filter(f => isKitAsset(f.path))
      .map(f => ({ path: f.path, kind: assetKindOf(f.path), contentType: f.contentType || mimeOf(f.path), uploadUrl: `${base}/storage/kit-${f.path.replace(/\//g, '_')}`, url: `${base}/storage/kit-${f.path.replace(/\//g, '_')}` }));
    return send(200, { projectId, uploads });
  }
  return send(404, { error: `no route ${req.method} ${u.pathname}` });
};

/** The kit the server keeps now (a call, so an assert on an earlier value doesn't narrow it). */
const cloudKit = (): BrandKit | null => server.kit;

const http_ = http.createServer((req, res) => void handle(req, res).catch(err => (res.writeHead(500), res.end(String(err)))));

// ---------- three Macs ----------

type Mac = { lib: Lib; cloud: Cloud; dir: string };
const macs: Record<'mine' | 'theirs' | 'viewer' | 'loose', Mac> = {} as never;
const mac = (name: keyof typeof macs, key: string, links: Record<string, string> = { animemusiczone: PROJECT }): Mac => {
  const dir = path.join(tmp, name);
  const downloads = path.join(dir, 'Downloads');
  const cfg: LibraryConfig = {
    root: path.join(downloads, '_LIBRARY'),
    inbox: path.join(downloads, '_INBOX'),
    deliverRoot: downloads,
    channels: { animemusiczone: 'AMZ', inverteddevils: 'INVERTED-DEVILS' },
    links,
    exclude: [],
  };
  for (const d of ['projects', 'brands', 'skills']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const lib = openLibrary({ cfg, projects: path.join(dir, 'projects'), out: path.join(dir, 'out'), brands: path.join(dir, 'brands'), overlays: path.join(dir, 'overlays'), skills: path.join(dir, 'skills'), quiet: true });
  return { lib, cloud: connect({ url: base, key }), dir };
};

const sync = (m: Mac, mode: 'status' | 'push' | 'pull', what: Part[], yes = true) => syncChannel(m.lib, m.cloud, 'animemusiczone', mode, { what, yes });
const of = (steps: Step[], action: Step['action']) => steps.filter(s => s.action === action);
const keys = (steps: Step[], action: Step['action']) => of(steps, action).map(s => s.key).sort();
const write = (file: string, text: string | Buffer) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
};
const skill = (m: Mac, name: string, meta: Record<string, string>, body = '', link?: string) => {
  const front = `---\nname: ${name}\ndescription: ${name} for the tests.\n${Object.keys(meta).length ? `metadata:\n${Object.entries(meta).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n` : ''}---\n\n# ${name}\n${body}\n`;
  if (!link) return write(path.join(m.lib.skills, name, 'SKILL.md'), front);
  write(path.join(link, name, 'SKILL.md'), front);
  fs.symlinkSync(path.join(link, name), path.join(m.lib.skills, name));
};
/** A download in the inbox, a while ago (ingest leaves files written a moment ago). */
const inboxFile = (m: Mac, rel: string, fixture: string, source?: object) => {
  const file = path.join(m.lib.cfg.inbox, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.copyFileSync(path.join(fixtures, fixture), file);
  if (source) fs.writeFileSync(`${file}.source.json`, JSON.stringify({ schema: 'mediamake.source/v1', ...source }));
  const t = new Date(Date.now() - 3600_000);
  fs.utimesSync(file, t, t);
  return file;
};

before(async () => {
  fs.mkdirSync(fixtures, { recursive: true });
  ff(['-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'zoro.mp4')]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'luffy.mp4')]);
  ff(['-f', 'lavfi', '-i', 'color=c=blue:s=64x64', '-frames:v', '1', path.join(fixtures, 'pin.jpg')]);
  ff(['-f', 'lavfi', '-i', 'color=c=white:s=64x64:rate=30', '-t', '1', '-pix_fmt', 'yuv420p', path.join(fixtures, 'leak.mp4')]);
  ff(['-f', 'lavfi', '-i', 'color=c=red:s=96x96', '-frames:v', '1', path.join(fixtures, 'logo.png')]);
  ff(['-f', 'lavfi', '-i', 'color=c=green:s=96x96', '-frames:v', '1', path.join(fixtures, 'logo2.png')]);
  ff(['-f', 'lavfi', '-i', 'color=c=yellow:s=96x96', '-frames:v', '1', path.join(fixtures, 'logo3.png')]);
  ff(['-f', 'lavfi', '-i', 'sine=frequency=330:duration=13', path.join(fixtures, 'keeper.mp3')]);
  process.env.MEDIAMAKE_CONFIG = path.join(tmp, 'config.json');
  process.env.MEDIA_NO_WAIT = '1';
  await new Promise<void>(resolve => http_.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(http_.address() as { port: number }).port}`;
  macs.mine = mac('mine', 'key-owner');
  macs.theirs = mac('theirs', 'key-editor');
  macs.viewer = mac('viewer', 'key-viewer');
  // an editor's Mac with no channel linked at all: it shares with projects by their id
  macs.loose = mac('loose', 'key-editor', {});
});

after(() => {
  for (const m of Object.values(macs)) m.lib.db.close();
  http_.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('the config and the key', () => {
  test('a channel can be a folder or { folder, projectId }; plain strings keep working', () => {
    saveConfig({ root: path.join(tmp, 'cfg', '_LIBRARY'), channels: { animemusiczone: 'AMZ', inverteddevils: 'INVERTED-DEVILS' } });
    linkChannel('animemusiczone', PROJECT);
    const raw = JSON.parse(fs.readFileSync(configFile(), 'utf8'));
    assert.deepEqual(raw.library.channels.animemusiczone, { folder: 'AMZ', projectId: PROJECT });
    assert.equal(raw.library.channels.inverteddevils, 'INVERTED-DEVILS');
    const cfg = loadConfig();
    assert.equal(cfg.channels.animemusiczone, 'AMZ', 'every reader still gets the folder');
    assert.deepEqual(cfg.links, { animemusiczone: PROJECT });
    saveConfig({ channels: { ...cfg.channels, animemusiczone: 'AMZ-2' } });
    assert.deepEqual(JSON.parse(fs.readFileSync(configFile(), 'utf8')).library.channels.animemusiczone, { folder: 'AMZ-2', projectId: PROJECT }, 'saving keeps the link');
    linkChannel('animemusiczone', null);
    assert.equal(JSON.parse(fs.readFileSync(configFile(), 'utf8')).library.channels.animemusiczone, 'AMZ-2');
    assert.ok(!fs.readFileSync(configFile(), 'utf8').includes('key-'), 'no key in the config');
  });

  test('a hosted site needs a key; it never goes in a URL', () => {
    const had = process.env.MEDIAMAKE_API_KEY;
    delete process.env.MEDIAMAKE_API_KEY;
    try {
      assert.throws(() => connect({ url: 'https://mediamake.example.invalid' }), /Not signed in/);
    } finally {
      if (had !== undefined) process.env.MEDIAMAKE_API_KEY = had;
    }
    assert.ok(!connect({ url: base, key: 'key-owner' }).url.includes('key'));
  });
});

describe('brand kit', () => {
  test('a dry run sends nothing; push uploads the kit with hashes; pushing again uploads nothing', async () => {
    const kit = path.join(macs.mine.lib.brands, 'animemusiczone');
    fs.copyFileSync(path.join(fixtures, 'logo.png'), write(path.join(kit, 'logo', 'logo.png'), ''));
    fs.copyFileSync(path.join(fixtures, 'zoro.mp4'), write(path.join(kit, 'intros', 'intro.mp4'), ''));
    write(path.join(kit, 'brandguide.md'), '# Anime Music Zone\n\nGold on black.\n');
    write(path.join(kit, 'colors.json'), JSON.stringify({ gold: '#d4af37', black: '#000000' }));
    write(path.join(kit, 'brand.json'), JSON.stringify({ name: 'Anime Music Zone', fonts: [{ family: 'Cinzel', role: 'display' }], logo: 'logo/logo.png' }));
    write(path.join(kit, 'graphics', 'frame-0001.png'), 'source');
    const dry = await sync(macs.mine, 'push', ['brand'], false);
    assert.deepEqual(keys(dry.steps, 'push'), ['fields', 'intros/intro.mp4', 'logo/logo.png']);
    assert.equal(server.kit, null, 'a dry run changes nothing');
    const r = await sync(macs.mine, 'push', ['brand']);
    assert.deepEqual(keys(r.steps, 'done'), ['fields', 'intros/intro.mp4', 'logo/logo.png']);
    const saved = cloudKit();
    assert.equal(saved?.name, 'Anime Music Zone');
    assert.equal(saved?.logo, 'logo/logo.png', "brand.json's logo is the main logo");
    assert.deepEqual(saved?.colors.map(c => c.hex), ['#d4af37', '#000000']);
    assert.equal(saved?.assets.find(a => a.path === 'logo/logo.png')?.sha256, await sha256File(path.join(kit, 'logo', 'logo.png')));
    assert.ok(!saved?.assets.some(a => a.path.includes('graphics')));
    const uploads = server.uploads;
    const again = await sync(macs.mine, 'push', ['brand']);
    assert.equal(of(again.steps, 'push').length + of(again.steps, 'done').length, 0);
    assert.equal(server.uploads, uploads, 'content-addressed: nothing uploaded twice');
  });

  test("a teammate's pull writes the kit by path; a file they changed gets a .theirs, never overwritten", async () => {
    const kit = path.join(macs.theirs.lib.brands, 'animemusiczone');
    const r = await sync(macs.theirs, 'pull', ['brand']);
    assert.deepEqual(of(r.steps, 'failed'), []);
    assert.equal(await sha256File(path.join(kit, 'logo', 'logo.png')), await sha256File(path.join(fixtures, 'logo.png')));
    assert.equal(fs.readFileSync(path.join(kit, 'brandguide.md'), 'utf8'), '# Anime Music Zone\n\nGold on black.\n');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(kit, 'brand.json'), 'utf8')).name, 'Anime Music Zone');
    assert.equal(JSON.parse(fs.readFileSync(path.join(kit, 'brand.json'), 'utf8')).logo, 'logo/logo.png');
    assert.equal(of((await sync(macs.theirs, 'pull', ['brand'])).steps, 'done').length, 0, 'pulled once');

    // the teammate draws their own logo; the owner pushes a new one: their logo stays, the owner's waits beside it
    fs.copyFileSync(path.join(fixtures, 'logo3.png'), path.join(kit, 'logo', 'logo.png'));
    fs.copyFileSync(path.join(fixtures, 'logo2.png'), path.join(macs.mine.lib.brands, 'animemusiczone', 'logo', 'logo.png'));
    await sync(macs.mine, 'push', ['brand']);
    const pulled = await sync(macs.theirs, 'pull', ['brand']);
    assert.deepEqual(keys(pulled.steps, 'conflict'), ['logo/logo.png']);
    assert.equal(await sha256File(path.join(kit, 'logo', 'logo.png')), await sha256File(path.join(fixtures, 'logo3.png')));
    assert.equal(await sha256File(`${path.join(kit, 'logo', 'logo.png')}.theirs`), await sha256File(path.join(fixtures, 'logo2.png')));
    // and their push waits until they've merged it
    const push = await sync(macs.theirs, 'push', ['brand'], false);
    assert.match(push.steps.find(s => s.key === 'logo/logo.png')?.detail ?? '', /merge logo\/logo.png.theirs first/);
  });
});

describe('skill variants', () => {
  test("push shares the variants the channel's productions use and uncommitted ones made for them, after skills.mjs's checks", async () => {
    const m = macs.mine;
    const agents = path.join(m.dir, 'agents');
    skill(m, 'make-lyrics-video', {}, '', agents);
    skill(m, 'create-thumbnail-like-goten', { 'variant-of': 'create-thumbnail' }, 'Committed, used by goten.', agents);
    skill(m, 'make-lyrics-video-like-nakama', { 'variant-of': 'make-lyrics-video' }, 'Nakama pacing.');
    write(path.join(m.lib.skills, 'make-lyrics-video-like-nakama', 'refs', 'notes.md'), 'Beat cuts on the chorus.\n');
    write(path.join(m.lib.skills, 'make-lyrics-video-like-nakama', 'refs', 'frame.png'), 'not text');
    write(path.join(m.lib.skills, 'make-lyrics-video-like-nakama', '.env'), 'SECRET=1');
    skill(m, 'make-lyrics-video-like-cadence', { 'variant-of': 'make-lyrics-video' }, 'Another channel’s.');
    skill(m, 'make-poster-like-nakama', { 'variant-of': 'make-poster' }, 'Uses key sk-abcdefghijklmnopqrstuvwxyz0123456789.');
    skill(m, 'make-shorts-like-nothing', { 'variant-of': 'make-shorts' }, 'Tied to no production.');
    saveProduction(m.lib, 'nakama', { channel: 'animemusiczone', title: 'Nakama!', skills: ['make-lyrics-video-like-nakama'] });
    saveProduction(m.lib, 'goten', { channel: 'animemusiczone', title: 'Goten Theme', skills: ['create-thumbnail-like-goten'] });
    saveProduction(m.lib, 'cadence', { channel: 'inverteddevils', title: 'Cadence', skills: ['make-lyrics-video-like-cadence'] });
    const r = await sync(m, 'push', ['skills']);
    assert.deepEqual(keys(r.steps, 'done'), ['create-thumbnail-like-goten', 'make-lyrics-video-like-nakama']);
    assert.match(r.steps.find(s => s.key === 'make-poster-like-nakama')?.detail ?? '', /API key or token/);
    assert.ok(!r.steps.some(s => s.key === 'make-lyrics-video-like-cadence'), "another channel's variant stays out");
    assert.ok(r.notes.some(n => n.includes('make-shorts-like-nothing')));
    const shared = server.items.get('skill:make-lyrics-video-like-nakama')!.data as { files: { path: string }[] };
    assert.deepEqual(shared.files.map(f => f.path).sort(), ['SKILL.md', 'refs/notes.md'], 'text files only, no .env');
  });

  test('pull installs them into .claude/skills/<name>/; a file changed here gets a .theirs', async () => {
    const t = macs.theirs;
    write(path.join(t.lib.skills, 'make-lyrics-video-like-nakama', 'refs', 'notes.md'), 'My own notes.\n');
    const r = await sync(t, 'pull', ['skills']);
    assert.ok(fs.existsSync(path.join(t.lib.skills, 'create-thumbnail-like-goten', 'SKILL.md')));
    assert.equal(fs.readFileSync(path.join(t.lib.skills, 'make-lyrics-video-like-nakama', 'refs', 'notes.md'), 'utf8'), 'My own notes.\n');
    assert.equal(fs.readFileSync(path.join(t.lib.skills, 'make-lyrics-video-like-nakama', 'refs', 'notes.md.theirs'), 'utf8'), 'Beat cuts on the chorus.\n');
    assert.ok(fs.existsSync(path.join(t.lib.skills, 'make-lyrics-video-like-nakama', 'SKILL.md')), 'the file it lacked is written');
    assert.deepEqual(keys(r.steps, 'conflict'), ['make-lyrics-video-like-nakama']);
    assert.equal(of((await sync(t, 'pull', ['skills'])).steps, 'conflict').length, 0, 'their version is waiting already: nothing new');
  });
});

describe('productions', () => {
  test('push sends mediamake.json with its deliveries; a pull writes the same file', async () => {
    const m = macs.mine;
    m.lib.db.prepare("INSERT INTO deliveries (production, what, path, sha256, from_path, at, status) VALUES ('nakama', 'video', 'AMZ/nakama/Nakama!.mp4', ?, '/Users/me/out/nakama.mp4', '2026-11-02T10:00:00.000Z', 'final')").run('a'.repeat(64));
    const r = await sync(m, 'push', ['productions']);
    assert.deepEqual(keys(r.steps, 'done'), ['goten', 'nakama'], "cadence is another channel's");
    const doc = server.items.get('production:nakama')!.data as { title: string; deliveries: { path: string; from_path?: string }[] };
    assert.equal(doc.title, 'Nakama!');
    assert.deepEqual(doc.deliveries.map(d => d.path), ['AMZ/nakama/Nakama!.mp4']);
    assert.ok(!JSON.stringify(doc).includes('/Users/me'), 'no path on the sharer’s Mac');
    const t = macs.theirs;
    await sync(t, 'pull', ['productions']);
    const file = path.join(t.lib.projects, 'nakama', 'mediamake.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), doc);
    assert.ok(!fs.existsSync(path.join(t.lib.projects, 'nakama', 'input')), 'no media comes with it');
    assert.equal(of((await sync(t, 'push', ['productions'], false)).steps, 'push').length, 0, 'nothing of theirs to push back');
  });

  test('a teammate’s change is never overwritten: push waits, pull lands it as .theirs, merging lets the push through', async () => {
    const [m, t] = [macs.mine, macs.theirs];
    saveProduction(t.lib, 'nakama', { status: 'delivered' });
    assert.deepEqual(keys((await sync(t, 'push', ['productions'])).steps, 'done'), ['nakama']);
    saveProduction(m.lib, 'nakama', { title: 'Nakama! (Remix)' });
    const blocked = await sync(m, 'push', ['productions']);
    assert.match(blocked.steps.find(s => s.key === 'nakama')?.detail ?? '', /a teammate changed it/);
    assert.equal((server.items.get('production:nakama')!.data as { status: string }).status, 'delivered', 'theirs stays on the cloud');
    // the server holds the line too, whatever the client sends
    const stale = await m.cloud.put('/api/channel-sync/items', { projectId: PROJECT, what: 'production', items: [{ key: 'nakama', hash: 'b'.repeat(64), baseHash: 'c'.repeat(64), data: {} }] });
    assert.equal(stale.conflicts[0].key, 'nakama');

    const file = path.join(m.lib.projects, 'nakama', 'mediamake.json');
    const pulled = await sync(m, 'pull', ['productions']);
    assert.deepEqual(keys(pulled.steps, 'conflict'), ['nakama']);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).title, 'Nakama! (Remix)', 'mine is untouched');
    assert.equal(JSON.parse(fs.readFileSync(`${file}.theirs`, 'utf8')).status, 'delivered');
    assert.match((await sync(m, 'push', ['productions'], false)).steps.find(s => s.key === 'nakama')?.detail ?? '', /merge mediamake.json.theirs first/);
    // the user merges: both changes, then the .theirs goes
    saveProduction(m.lib, 'nakama', { status: 'delivered' });
    fs.rmSync(`${file}.theirs`);
    assert.deepEqual(keys((await sync(m, 'push', ['productions'])).steps, 'done'), ['nakama']);
    assert.equal((server.items.get('production:nakama')!.data as { title: string }).title, 'Nakama! (Remix)');
  });
});

describe('media', () => {
  let zoro: string;
  let pin: string;
  let luffy: string;

  test("details of the channel's items go up; files only after the user's OK", async () => {
    const m = macs.mine;
    inboxFile(m, 'youtube/Zoro Twixtor Clips 4K Quality One Piece (2160p60).mp4', 'zoro.mp4', { tool: 'youtube', ref: 'zoro123', title: 'Zoro Twixtor Clips 4K Quality One Piece', height: 2160, fps: 60 });
    inboxFile(m, 'pinterest/2026-11-02-gojo/0123456789abcdef0123456789abcdef.jpg', 'pin.jpg', { tool: 'pinterest', ref: 'pin-1', query: 'gojo domain' });
    inboxFile(m, 'youtube/Luffy Gear 5 Twixtor (1080p60).mp4', 'luffy.mp4', { tool: 'youtube', ref: 'luffy5', title: 'Luffy Gear 5 Twixtor' });
    const filed = await ingest(m.lib, [m.lib.cfg.inbox]);
    [zoro, pin, luffy] = ['zoro', 'pin', 'luffy'].map(w => filed.find(f => f.file.includes(w === 'pin' ? '0123456789' : w === 'zoro' ? 'Zoro' : 'Luffy'))!.id!);
    fs.mkdirSync(path.join(m.lib.projects, 'nakama', 'input'), { recursive: true });
    await use(m.lib, getItem(m.lib.db, zoro)!, 'nakama', { as: 'input/footage/zoro.mp4' });
    tag(m.lib, getItem(m.lib.db, pin)!, ['animemusiczone']);

    const r = await sync(m, 'push', ['media']);
    assert.deepEqual(of(r.steps, 'done').map(s => s.key).sort(), [pin, zoro].sort(), 'used in its production, or tagged with it; luffy is no one’s');
    assert.equal(server.files.length, 0, 'no file without the OK');
    const d = server.items.get(`media:${zoro}`)!.data as MediaDetails;
    assert.equal(d.subject, 'one-piece/zoro');
    assert.equal(d.path?.startsWith('footage/one-piece/zoro/'), true);
    assert.equal(d.sources?.[0].ref, 'zoro123');
    assert.equal(of((await sync(m, 'push', ['media'])).steps, 'done').length, 0, 'the same details go up once');
  });

  test("the channel's limit: what doesn't fit waits, and the server refuses it whatever the client asks", async () => {
    const m = macs.mine;
    const [z, p, l] = [zoro, pin, luffy].map(id => getItem(m.lib.db, id)!);
    // the owner sets a limit the zoro clip and the pin fit in, not the luffy clip as well
    await m.cloud.put('/api/channel-sync', { projectId: PROJECT, limitMb: (z.bytes + p.bytes + 10) / MB });
    // Share with team on the Library page for the pin, media share for the clips
    write(path.join(m.lib.catalog, 'requests', '1-share.json'), JSON.stringify({ schema: 'mediamake.library-request/v1', op: 'share', target: pin, channel: 'animemusiczone', at: new Date().toISOString(), from: 'library-page' }));
    assert.deepEqual((await applyRequests(m.lib)).failed, []);
    approveShare(m.lib, z, undefined, 'cli');
    approveShare(m.lib, l, 'animemusiczone', 'cli');
    const dry = await sync(m, 'push', ['media'], false);
    assert.equal(server.files.length, 0, 'a dry run uploads nothing');
    const files = dry.steps.filter(s => s.detail === 'file' || /limit/.test(s.detail ?? ''));
    assert.deepEqual(files.map(s => s.action), ['push', 'push', 'skip'], 'approved in that order: the pin, zoro, then luffy over the limit');
    assert.match(files[2].detail!, /over the channel's limit/);

    const r = await sync(m, 'push', ['media']);
    assert.equal(of(r.steps, 'failed').length, 0);
    assert.deepEqual(server.files.filter(f => f.state === 'shared').map(f => f.sha256).sort(), [p.id, z.id].sort());
    const refused = await m.cloud.post('/api/channel-sync/files', { projectId: PROJECT, files: [{ sha256: l.id, size: l.bytes, fileName: 'luffy.mp4', contentType: 'video/mp4' }] });
    assert.match(refused.refused[0].reason, /over the channel's limit/);
    assert.deepEqual((await m.cloud.post('/api/channel-sync/files', { projectId: PROJECT, files: [{ sha256: z.id, size: z.bytes, fileName: 'z.mp4' }] })).already, [z.id], 'shared once');
    const st = (await sync(m, 'status', ['media'])).status;
    assert.equal(st.usedBytes, z.bytes + p.bytes);
  });

  test("a teammate's pull lists them as remote items; pull --ids fetches the file and files it where they keep it", async () => {
    const t = macs.theirs;
    const dry = await sync(t, 'pull', ['media'], false);
    assert.equal(of(dry.steps, 'pull').length, 3, 'zoro and the pin, and luffy now that it is shared with the channel');
    assert.equal(find(t.lib, 'zoro').length, 0, 'nothing until --yes');
    await sync(t, 'pull', ['media']);
    const [hit] = find(t.lib, 'zoro twixtor');
    assert.equal(hit?.id, zoro);
    assert.equal(hit.status, 'remote');
    assert.deepEqual(find(t.lib, '', { channel: 'animemusiczone' }).map(i => i.id).sort(), [luffy, pin, zoro].sort());
    assert.equal(sourcesOf(t.lib, zoro)[0].ref, 'zoro123');

    const plan = await pullFiles(t.lib, t.cloud, [zoro.slice(0, 10)], false);
    assert.deepEqual(plan.steps.map(s => s.action), ['pull']);
    const r = await pullFiles(t.lib, t.cloud, [zoro.slice(0, 10)], true);
    assert.deepEqual(r.steps.map(s => s.action), ['done']);
    const it = getItem(t.lib.db, zoro)!;
    assert.equal(it.status, 'online');
    assert.equal(it.path, (server.items.get(`media:${zoro}`)!.data as MediaDetails).path, 'filed at the same place as in their library');
    assert.equal(await sha256File(path.join(t.lib.root, it.path)), zoro);
    assert.ok(!fs.existsSync(path.join(t.lib.cfg.inbox, 'mediamake-sync', 'animemusiczone')), 'the inbox is tidied');
    assert.deepEqual((await pullFiles(t.lib, t.cloud, [zoro], true)).steps.map(s => s.action), ['same'], 'content-addressed: already here');
    const again = await sync(t, 'pull', ['media']);
    assert.equal(of(again.steps, 'pull').length + of(again.steps, 'done').length, 0, 'their details are here already');
  });

  test('media share uploads at once; unsharing frees the limit', async () => {
    const m = macs.mine;
    await m.cloud.put('/api/channel-sync', { projectId: PROJECT, limitMb: 100 });
    const r = await pushShared(m.lib, m.cloud, 'animemusiczone', [luffy], true);
    assert.deepEqual(r.steps.filter(s => s.detail === 'file').map(s => s.action), ['done']);
    assert.ok(server.files.some(f => f.sha256 === luffy && f.state === 'shared'));
    await m.cloud.del('/api/channel-sync/files', { projectId: PROJECT, sha256: luffy });
    assert.equal(server.files.find(f => f.sha256 === luffy)?.state, 'withdrawn');
  });
});

const zoroId = () => (find(macs.mine.lib, 'zoro twixtor')[0]?.id ?? '');

describe('viewers and music', () => {
  test('a viewer pulls but never pushes', async () => {
    const v = macs.viewer;
    saveProduction(v.lib, 'viewer-only', { channel: 'animemusiczone' });
    const writes = server.writes;
    const push = await sync(v, 'push', ['brand', 'skills', 'productions', 'media']);
    assert.ok(push.steps.every(s => s.action === 'skip' && /viewers pull/.test(s.detail ?? '')));
    assert.equal(server.writes, writes);
    const pull = await sync(v, 'pull', ['productions', 'skills']);
    assert.equal(of(pull.steps, 'failed').length, 0);
    assert.ok(fs.existsSync(path.join(v.lib.projects, 'goten', 'mediamake.json')));
  });

  test("keeper Suno takes come down as Browse Hack would save them, once; without /api/generations it's pending", async () => {
    const m = macs.mine;
    const pending = await sync(m, 'pull', ['music']);
    assert.deepEqual(pending.steps.map(s => s.action), ['pending']);
    server.storage.set('keeper.mp3', fs.readFileSync(path.join(fixtures, 'keeper.mp3')));
    const take = (id: string, ref: string, extra: object) => ({ id, projectId: PROJECT, tool: 'suno', ref, kind: 'create', title: id, styles: '', lyrics: '', status: 'complete', audioUrl: null, url: `https://suno.com/song/${ref}`, libraryItem: null, ...extra });
    server.generations = [
      take('g1', '5e5e5e5e-1111-4222-8333-444455556666', {
        kind: 'cover',
        parentRef: '4d4d4d4d-1111-4222-8333-444455556666',
        title: 'Gojo - Honored One',
        styles: 'gregorian chant, choir',
        excludeStyles: 'metal',
        lyrics: 'Throughout heaven and earth',
        model: 'v4.5',
        credits: 10,
        settings: { weirdness: 40 },
        audioUrl: `${base}/storage/keeper.mp3`,
        rating: 'keeper',
      }),
      take('g2', '6f6f6f6f-1111-4222-8333-444455556666', { title: 'Not kept', audioUrl: `${base}/storage/nope.mp3`, rating: 'maybe' }),
      take('g3', '7a7a7a7a-1111-4222-8333-444455556666', { title: 'Still cooking', status: 'generating', rating: 'keeper' }),
      take('g4', '8b8b8b8b-1111-4222-8333-444455556666', { title: 'Filed already', audioUrl: `${base}/storage/nope.mp3`, libraryItem: zoroId(), rating: 'keeper' }),
    ];
    const r = await sync(m, 'pull', ['music']);
    assert.deepEqual(
      r.steps.map(s => [s.action, s.key]),
      [
        ['done', 'Gojo - Honored One [5e5e5e5e]'],
        ['skip', 'Still cooking [7a7a7a7a]'],
        ['same', 'Filed already [8b8b8b8b]'],
      ],
      'every page read; a take not finished waits; one the library has (its libraryItem) is skipped',
    );
    const [song] = find(m.lib, 'throughout heaven', { kind: 'music', channel: 'animemusiczone' });
    assert.ok(song, 'filed with its lyrics, under the channel');
    assert.equal(song.path, path.join('music', 'animemusiczone', 'gojo-honored-one', 'Gojo - Honored One [5e5e5e5e].mp3'));
    assert.ok(fs.existsSync(path.join(m.lib.root, `${song.path}.lyrics.txt`)));
    const [src] = sourcesOf(m.lib, song.id);
    assert.equal(src.prompt, 'gregorian chant, choir', 'its styles are the prompt, as suno_download writes it');
    assert.equal(src.relation, 'cover');
    assert.equal(src.price, 10);
    assert.deepEqual((await sync(m, 'pull', ['music'])).steps.map(s => s.action), ['same', 'skip', 'same'], 'content-addressed: pulled once');
  });

  test('status runs both ways and changes nothing', async () => {
    const before = JSON.stringify([...server.items.entries()]);
    const r = await sync(macs.theirs, 'status', ['brand', 'skills', 'productions', 'media', 'music']);
    assert.equal(r.status.project.role, 'editor');
    assert.ok(r.steps.some(s => s.dir === 'push') && r.steps.some(s => s.dir === 'pull'));
    assert.equal(JSON.stringify([...server.items.entries()]), before);
    assert.ok(theirsCopies(path.join(macs.theirs.lib.skills, 'make-lyrics-video-like-nakama', 'refs', 'notes.md')).length === 1);
  });
});

describe('shared assets by project (no channel needed)', () => {
  test('a Mac with no linked channel shares an overlay with a project by its id; the team pulls it', async () => {
    const m = macs.loose;
    server.limitBytes = 50 * MB;
    assert.equal(keyForProject(macs.mine.lib, PROJECT), 'animemusiczone', 'a project a channel here is linked to: its shares keep the channel key');
    assert.equal(keyForProject(m.lib, PROJECT), PROJECT, 'no link here: the project id itself');
    assert.throws(() => keyNamed(m.lib, { project: 'amz' }), /project id/);
    assert.equal(keyNamed(m.lib, { channel: PROJECT }), PROJECT, '--channel= takes a project id too');
    assert.throws(() => keyNamed(m.lib, { channel: 'nosuch' }), /Unknown channel/);

    inboxFile(m, 'other/light-leak.mp4', 'leak.mp4', { tool: 'other' });
    const filed = await ingest(m.lib, [m.lib.cfg.inbox], { hint: { kind: 'overlays', subject: 'light-leaks' } });
    const it = getItem(m.lib.db, filed.find(f => f.file.includes('light-leak'))!.id!)!;
    assert.equal(it.kind, 'overlays');
    assert.equal(approveShare(m.lib, it, { project: PROJECT }, 'cli'), PROJECT);
    const r = await pushShared(m.lib, m.cloud, PROJECT, [it.id], true);
    assert.equal(r.channel, PROJECT);
    assert.equal(r.status.project.id, PROJECT);
    assert.equal(of(r.steps, 'done').length, 2, `its details and its file: ${r.steps.map(s => `${s.action} ${s.key} ${s.detail ?? ''}`).join('; ')}`);
    assert.ok(server.files.find(f => f.sha256 === it.id && f.state === 'shared'), 'the file is on the cloud');
    const d = server.items.get(`media:${it.id}`)!.data as MediaDetails;
    assert.equal(d.kind, 'overlays');
    assert.equal(d.subject, 'light-leaks');

    // a teammate linked through the channel sees it as a remote overlay and pulls it into their library, where the sharer keeps it
    const v = macs.viewer;
    await sync(v, 'pull', ['media']);
    assert.equal(getItem(v.lib.db, it.id)?.status, 'remote');
    const pulled = await pullFiles(v.lib, v.cloud, [it.id], true);
    assert.equal(pulled.filed.length, 1, pulled.steps.map(s => `${s.action} ${s.key} ${s.detail ?? ''}`).join('; '));
    const got = getItem(v.lib.db, it.id)!;
    assert.equal(got.status, 'online');
    assert.equal(got.kind, 'overlays');
    assert.equal(got.subject, 'light-leaks');
    assert.equal(got.path, it.path);

    // the project's status by its id, from the Mac with no channel at all; then the share is taken back
    const st = await syncChannel(m.lib, m.cloud, PROJECT, 'status', { what: ['media'] });
    assert.equal(st.channel, PROJECT);
    assert.ok(st.status.counts.files >= 1);
    assert.deepEqual(withdrawShare(m.lib, it, PROJECT), [PROJECT]);
    assert.throws(() => withdrawShare(m.lib, it, 'nosuch'), /Unknown channel/);
  });
});
