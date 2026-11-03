import { createHash } from 'node:crypto';
import { createServer as createHttpServer, type Server } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, truncate, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediamakeClient } from '../../mediamake-mcp/src/client';
import { INPUT_LIMIT_BYTES, productionFiles, releaseFiles, within } from './files';
import { createServer } from './server';

const TOOLS = [
  'get_brand_kit', 'upload_brand_kit', 'finish_brand_kit_upload', 'update_brand_kit',
  'list_projects', 'get_project', 'create_project', 'update_project',
  'list_productions', 'get_production', 'create_production', 'update_production', 'delete_production',
  'list_releases', 'get_release', 'create_release', 'update_release', 'delete_release',
  'list_media', 'search_media', 'get_media', 'upload_media', 'delete_media',
  'list_shared_assets', 'download_shared_assets', 'share_assets', 'unshare_assets', 'set_shared_limit',
];

async function connect(baseUrl = 'http://ps.test') {
  const server = createServer(new MediamakeClient({ baseUrl, apiKey: 'test-key', timeoutMs: 5000 }));
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const text = (result: unknown) => JSON.parse((result as { content: { text: string }[] }).content[0].text);
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'projectsync-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function project(files: Record<string, string>) {
  for (const [path, body] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true });
    await writeFile(join(dir, path), body);
  }
}

describe('createServer', () => {
  it('offers exactly the ProjectSync tools, deletes marked destructive', async () => {
    const { tools } = await (await connect()).listTools();
    expect(tools.map(t => t.name).sort()).toEqual([...TOOLS].sort());
    for (const t of tools) expect(t.annotations?.destructiveHint ?? false).toBe(t.name.startsWith('delete_'));
  });
});

describe('brand kit upload', () => {
  const dryRun = async (only?: string[]) =>
    text(await (await connect()).callTool({ name: 'upload_brand_kit', arguments: { projectId: 'p1', folder: dir, dryRun: true, only } }));

  it("sets brand.json's logo as the main logo when its image goes up, and says so when it doesn't", async () => {
    await project({
      'brand.json': JSON.stringify({ name: 'Get into Zone', logo: 'logo/fist.png' }),
      'logo/fist.png': 'png',
      'logo/wordmark.svg': '<svg/>',
      'graphics/source.png': 'no',
    });
    const all = await dryRun();
    expect(all.fields).toEqual(expect.arrayContaining(['name', 'logo']));
    expect(all.upload.map((f: { path: string }) => f.path)).toEqual(['logo/fist.png', 'logo/wordmark.svg']);

    const without = await dryRun(['brand.json', 'logo/wordmark.svg']);
    expect(without.fields).not.toContain('logo');
    expect(without.skipped).toContainEqual({ path: 'logo/fist.png', reason: "brand.json's logo, but not an image in this upload" });
  });
});

describe('production files', () => {
  it('lays out code, outputs and inputs, and skips hidden files and node_modules', async () => {
    await project({
      'projects/song/video/edl.ts': 'export {}',
      'projects/song/input/song.wav': 'riff',
      'projects/song/node_modules/x/index.js': 'no',
      'projects/song/.cache/y': 'no',
      'out/song/song.mp4': 'mp4',
    });
    const { files, inputs } = await productionFiles({ code: [join(dir, 'projects/song')], outputs: [join(dir, 'out/song')] });
    expect(files.map(f => [f.path, f.role]).sort()).toEqual([
      ['code/video/edl.ts', 'code'],
      ['input/song.wav', 'input'],
      ['output/song.mp4', 'output'],
    ]);
    expect(inputs).toMatchObject({ files: 1, included: true });
  });

  it('leaves inputs out when they come to more than 200 MB', async () => {
    await project({ 'p/video/edl.ts': 'x', 'p/input/footage.mov': '' });
    await truncate(join(dir, 'p/input/footage.mov'), INPUT_LIMIT_BYTES + 1); // sparse: no real disk
    const { files, inputs } = await productionFiles({ code: [join(dir, 'p')] });
    expect(files.map(f => f.path)).toEqual(['code/video/edl.ts']);
    expect(inputs.included).toBe(false);
    expect(inputs.why).toMatch(/200 MB/);
  });

  it('keeps a release folder as it is and refuses paths that climb out', async () => {
    await project({ 'kit/thumbs/A1.png': 'png', 'kit/title.txt': 't', 'master.wav': 'w' });
    const files = await releaseFiles({ folder: join(dir, 'kit'), files: [join(dir, 'master.wav')] });
    expect(files.map(f => f.path).sort()).toEqual(['master.wav', 'thumbs/A1.png', 'title.txt']);
    expect(() => within(dir, '../escape.txt')).toThrow(/outside/);
  });
});

describe('create_production against a stand-in MediaMake', () => {
  let http: Server;
  let base: string;
  const stored = new Map<string, Buffer>();
  const seen: { method: string; path: string; body?: any; headers?: Record<string, unknown> }[] = [];
  let listing: { path: string; size: number; sha256: string; role: string }[] = [];

  beforeEach(async () => {
    stored.clear();
    seen.length = 0;
    http = createHttpServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const raw = Buffer.concat(chunks);
      const url = new URL(req.url!, base);
      const reply = (status: number, data: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (url.pathname.startsWith('/storage/')) {
        seen.push({ method: req.method!, path: url.pathname, headers: req.headers });
        if (req.method === 'PUT') stored.set(url.pathname, raw);
        if (req.method === 'GET') return void res.end(stored.get(url.pathname.replace('/get', '')));
        return void res.end();
      }
      const body = raw.length ? JSON.parse(raw.toString()) : undefined;
      seen.push({ method: req.method!, path: url.pathname, body, headers: req.headers });
      if (url.pathname === '/api/project/productions' && req.method === 'POST') {
        listing = body.files;
        return reply(201, {
          id: 'p1',
          version: 1,
          uploads: body.files.map((f: { path: string }) => ({ path: f.path, uploadUrl: `${base}/storage/${f.path}`, headers: { 'Content-Type': 'application/octet-stream', 'x-amz-acl': 'private' } })),
          reused: [],
          finish: { projectId: body.projectId, id: 'p1', version: 1 },
        });
      }
      if (url.pathname === '/api/project/productions/finish') {
        const missing = listing.filter(f => !stored.has(`/storage/${f.path}`)).map(f => ({ path: f.path, reason: 'not uploaded' }));
        return missing.length ? reply(409, { ready: false, missing }) : reply(200, { ready: true, id: 'p1', version: 1, fileCount: listing.length });
      }
      if (url.pathname === '/api/project/productions' && req.method === 'GET') {
        return reply(200, { id: 'p1', files: listing.map(f => ({ ...f, url: `${base}/storage/get/${f.path}` })) });
      }
      reply(404, { error: `no route ${req.method} ${url.pathname}` });
    });
    await new Promise<void>(done => http.listen(0, '127.0.0.1', done));
    base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise(done => http.close(done));
  });

  it('dry run lists without uploading; a real run hashes, PUTs with the signed headers and finishes', async () => {
    await project({ 'p/video/edl.ts': 'export const edl = []', 'out/p.mp4': 'rendered' });
    const client = await connect(base);
    const args = { projectId: 'proj', slug: 'song', code: [join(dir, 'p')], outputs: [join(dir, 'out')] };

    const dry = text(await client.callTool({ name: 'create_production', arguments: { ...args, dryRun: true } }));
    expect(dry).toMatchObject({ dryRun: true, files: 2 });
    expect(seen).toHaveLength(0);

    const done = text(await client.callTool({ name: 'create_production', arguments: args }));
    expect(done).toMatchObject({ ready: true, uploaded: 2, alreadyStored: 0 });
    const create = seen.find(s => s.path === '/api/project/productions')!;
    expect(create.headers?.authorization).toBe('Bearer test-key');
    expect(create.body.files.find((f: { path: string }) => f.path === 'code/video/edl.ts')).toMatchObject({ role: 'code', sha256: sha('export const edl = []') });
    const put = seen.find(s => s.method === 'PUT')!;
    expect(put.headers?.['x-amz-acl']).toBe('private');
    expect(stored.get('/storage/output/p.mp4')?.toString()).toBe('rendered');

    // and back down again
    const saveTo = join(dir, 'pulled');
    const pulled = text(await client.callTool({ name: 'get_production', arguments: { projectId: 'proj', id: 'p1', saveTo } }));
    expect(pulled.download).toMatchObject({ saved: 2, unchanged: 0 });
    expect(await readFile(join(saveTo, 'code/video/edl.ts'), 'utf8')).toBe('export const edl = []');
  });
});

describe('list_projects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('takes the plain list the API answers without a search, and the paged one with', async () => {
    const project = { id: 'p1', displayName: 'MediaMake', tags: [], isOwned: true, updatedAt: '' };
    const shared = { id: 'p2', displayName: 'Portal', tags: [], isOwned: false, sharedRole: 'editor', updatedAt: '' };
    vi.stubGlobal('fetch', async (url: string) => {
      const paged = new URL(url).searchParams.has('search');
      const body = paged ? { projects: [shared], pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } } : [project, shared];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const client = await connect();
    const all = text(await client.callTool({ name: 'list_projects', arguments: {} }));
    expect(all).toMatchObject({ total: 2, projects: [{ id: 'p1', role: 'owner' }, { id: 'p2', role: 'editor' }] });
    const found = text(await client.callTool({ name: 'list_projects', arguments: { search: 'Portal' } }));
    expect(found).toMatchObject({ pagination: { total: 1 }, projects: [{ name: 'Portal', role: 'editor' }] });
  });
});

describe('shared assets against a stand-in MediaMake', () => {
  const MB = 1_000_000;
  let http: Server;
  let base: string;
  const stored = new Map<string, Buffer>();
  const details = new Map<string, Record<string, unknown>>();
  let files: { sha256: string; size: number; state: 'uploading' | 'shared' | 'withdrawn'; url: string; fileName: string; contentType: string }[] = [];
  const seen: { method: string; path: string; body?: any; headers?: Record<string, unknown>; query?: Record<string, string> }[] = [];
  let limitBytes = 100 * MB;
  const used = () => files.filter(f => f.state === 'shared').reduce((n, f) => n + f.size, 0);

  beforeEach(async () => {
    stored.clear();
    details.clear();
    files = [];
    seen.length = 0;
    limitBytes = 100 * MB;
    http = createHttpServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const raw = Buffer.concat(chunks);
      const url = new URL(req.url!, base);
      const reply = (status: number, data: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (url.pathname.startsWith('/storage/')) {
        seen.push({ method: req.method!, path: url.pathname, headers: req.headers });
        if (req.method === 'PUT') {
          if (req.headers['x-amz-acl'] !== 'public-read') return reply(403, { error: 'signed public-read' });
          stored.set(url.pathname, raw);
          return void res.end();
        }
        const body = stored.get(url.pathname);
        if (!body) return reply(404, { error: 'NoSuchKey' });
        res.writeHead(200, { 'Content-Length': body.length });
        return void res.end(body);
      }
      const body = raw.length ? JSON.parse(raw.toString()) : undefined;
      const query = Object.fromEntries(url.searchParams);
      seen.push({ method: req.method!, path: url.pathname, body, headers: req.headers, query });
      const projectId = query.projectId ?? body?.projectId;
      if (projectId !== 'proj') return reply(404, { error: 'Project not found' });
      if (url.pathname === '/api/channel-sync') {
        if (req.method === 'PUT') {
          limitBytes = Math.round(body.limitMb * MB);
          return reply(200, { projectId, limitBytes });
        }
        return reply(200, { project: { id: projectId, name: 'Overlays', role: 'editor' }, limitBytes, usedBytes: used(), counts: { production: 0, skill: 0, media: details.size, files: files.filter(f => f.state === 'shared').length } });
      }
      if (url.pathname === '/api/channel-sync/items') {
        if (req.method === 'PUT') {
          for (const it of body.items) details.set(it.key, it.data);
          return reply(200, { projectId, what: 'media', saved: body.items.map((i: { key: string }) => i.key), same: [], conflicts: [] });
        }
        const items = [...details.entries()]
          .map(([key, data]) => {
            const f = files.find(x => x.sha256 === key && x.state === 'shared');
            return { key, hash: key, data, mine: true, ...(f ? { file: { url: f.url, size: f.size, fileName: f.fileName, contentType: f.contentType } } : {}) };
          })
          .filter(i => query.files !== '1' || i.file);
        return reply(200, { projectId, what: 'media', role: 'editor', items });
      }
      if (url.pathname === '/api/channel-sync/files') {
        if (req.method === 'POST') {
          const uploads = [];
          const already = [];
          const refused = [];
          let use = used();
          for (const f of body.files as { sha256: string; size: number; fileName: string; contentType: string }[]) {
            if (files.some(x => x.sha256 === f.sha256 && x.state === 'shared')) {
              already.push(f.sha256);
              continue;
            }
            if (use + f.size > limitBytes) {
              refused.push({ sha256: f.sha256, reason: `over the channel's limit (${Math.round(use / MB)} of ${Math.round(limitBytes / MB)} MB used, this is 1 MB)` });
              continue;
            }
            use += f.size;
            const u = `${base}/storage/${f.sha256.slice(0, 12)}-${f.fileName}`;
            files = files.filter(x => x.sha256 !== f.sha256);
            files.push({ sha256: f.sha256, size: f.size, state: 'uploading', url: u, fileName: f.fileName, contentType: f.contentType });
            uploads.push({ sha256: f.sha256, uploadUrl: u, url: u, contentType: f.contentType });
          }
          return reply(200, { projectId, uploads, already, refused, usedBytes: use, limitBytes });
        }
        if (req.method === 'PUT') {
          const shared = [];
          const failed = [];
          for (const sha of body.sha256 as string[]) {
            const f = files.find(x => x.sha256 === sha && x.state === 'uploading');
            if (f && stored.get(new URL(f.url).pathname)?.length === f.size) {
              f.state = 'shared';
              shared.push(sha);
            } else failed.push({ sha256: sha, reason: 'not found in storage' });
          }
          return reply(200, { projectId, shared, failed, usedBytes: used(), limitBytes });
        }
        const gone = query.sha256.split(',');
        for (const f of files) if (gone.includes(f.sha256)) f.state = 'withdrawn';
        return reply(200, { projectId, withdrawn: gone });
      }
      reply(404, { error: `no route ${req.method} ${url.pathname}` });
    });
    await new Promise<void>(done => http.listen(0, '127.0.0.1', done));
    base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise(done => http.close(done));
  });

  it('shares files with their details (a dry run first), lists them, downloads them checked with a source sidecar, and stops sharing', async () => {
    await project({ 'overlays/light-leak.mp4': 'leak-bytes', 'overlays/grain.mp4': 'grain' });
    const client = await connect(base);
    const paths = [join(dir, 'overlays/light-leak.mp4'), join(dir, 'overlays/grain.mp4')];
    const args = { projectId: 'proj', filePaths: paths, kind: 'overlays', subject: 'light-leaks', tags: ['warm'] };

    const dry = text(await client.callTool({ name: 'share_assets', arguments: { ...args, dryRun: true } }));
    expect(dry.dryRun).toBe(true);
    expect(dry.upload.map((u: { name: string }) => u.name).sort()).toEqual(['grain.mp4', 'light-leak.mp4']);
    expect(dry.limit).toEqual({ usedMb: 0, limitMb: 100, freeMb: 100 });
    expect(seen.filter(s => s.method !== 'GET')).toHaveLength(0);

    const done = text(await client.callTool({ name: 'share_assets', arguments: args }));
    expect(done.shared.map((s: { name: string }) => s.name).sort()).toEqual(['grain.mp4', 'light-leak.mp4']);
    expect(done.failed).toEqual([]);
    const det = seen.find(s => s.path === '/api/channel-sync/items' && s.method === 'PUT')!;
    expect(det.body.items.find((i: { key: string }) => i.key === sha('grain')).data).toMatchObject({ sha256: sha('grain'), kind: 'overlays', subject: 'light-leaks', title: 'grain', tags: ['warm'], bytes: 5 });
    const put = seen.find(s => s.path.startsWith('/storage/') && s.method === 'PUT')!;
    expect(put.headers?.['x-amz-acl']).toBe('public-read');
    expect(stored.get(`/storage/${sha('grain').slice(0, 12)}-grain.mp4`)?.toString()).toBe('grain');
    // the details and the file went up in that order, then the confirmation
    const order = seen.filter(s => s.method !== 'GET').map(s => `${s.method} ${s.path.replace(/\/storage\/.*/, '/storage')}`);
    expect(order).toEqual(['PUT /api/channel-sync/items', 'POST /api/channel-sync/files', 'PUT /storage', 'PUT /storage', 'PUT /api/channel-sync/files']);

    const again = text(await client.callTool({ name: 'share_assets', arguments: args }));
    expect(again.shared).toEqual([]);
    expect(again.already).toHaveLength(2);

    const list = text(await client.callTool({ name: 'list_shared_assets', arguments: { projectId: 'proj' } }));
    expect(list.total).toBe(2);
    expect(list.assets.find((a: { sha256: string }) => a.sha256 === sha('grain'))).toMatchObject({ kind: 'overlays', title: 'grain', subject: 'light-leaks', fileName: 'grain.mp4', bytes: 5 });
    const found = text(await client.callTool({ name: 'list_shared_assets', arguments: { projectId: 'proj', query: 'grain' } }));
    expect(found.assets.map((a: { fileName: string }) => a.fileName)).toEqual(['grain.mp4']);
    expect(text(await client.callTool({ name: 'list_shared_assets', arguments: { projectId: 'proj', kind: 'footage' } })).total).toBe(0);

    const saveTo = join(dir, 'pulled');
    const dl = text(await client.callTool({ name: 'download_shared_assets', arguments: { projectId: 'proj', saveTo, sha256: [sha('grain')] } }));
    expect(dl.saved).toHaveLength(1);
    expect(await readFile(join(saveTo, 'grain.mp4'), 'utf8')).toBe('grain');
    expect(JSON.parse(await readFile(join(saveTo, 'grain.mp4.source.json'), 'utf8'))).toMatchObject({ schema: 'mediamake.source/v1', tool: 'mediamake-sync', ref: sha('grain'), channel: 'proj', library: { kind: 'overlays', subject: 'light-leaks', tags: ['warm'] } });
    const twice = text(await client.callTool({ name: 'download_shared_assets', arguments: { projectId: 'proj', saveTo } }));
    expect(twice.already).toHaveLength(1);
    expect(twice.saved.map((s: { savedTo: string }) => s.savedTo)).toEqual([join(saveTo, 'light-leak.mp4')]);
    // a stored copy that doesn't match its sha256 is refused and not kept
    stored.set(`/storage/${sha('leak-bytes').slice(0, 12)}-light-leak.mp4`, Buffer.from('tampered'));
    await rm(join(saveTo, 'light-leak.mp4'));
    const bad = text(await client.callTool({ name: 'download_shared_assets', arguments: { projectId: 'proj', saveTo, sha256: [sha('leak-bytes')] } }));
    expect(bad.failed[0].reason).toMatch(/sha256/);
    expect(await readFile(join(saveTo, 'light-leak.mp4'), 'utf8').catch(() => 'gone')).toBe('gone');
    expect(text(await client.callTool({ name: 'download_shared_assets', arguments: { projectId: 'proj', saveTo, sha256: [sha('nothing')] } })).missing).toEqual([sha('nothing')]);

    expect(text(await client.callTool({ name: 'unshare_assets', arguments: { projectId: 'proj', sha256: [sha('grain')] } })).withdrawn).toEqual([sha('grain')]);
    expect(text(await client.callTool({ name: 'list_shared_assets', arguments: { projectId: 'proj' } })).total).toBe(1);
  });

  it("refuses what doesn't fit the limit, which the owner raises", async () => {
    await project({ 'big.mp4': 'twelve bytes', 'small.mp4': 'ok' });
    const client = await connect(base);
    limitBytes = 10;
    const dry = text(await client.callTool({ name: 'share_assets', arguments: { projectId: 'proj', filePaths: [join(dir, 'big.mp4')], dryRun: true } }));
    expect(dry.overLimit).toMatch(/set_shared_limit/);
    expect(dry.upload[0].kind).toBe('footage');
    const r = text(await client.callTool({ name: 'share_assets', arguments: { projectId: 'proj', filePaths: [join(dir, 'big.mp4'), join(dir, 'small.mp4')] } }));
    expect(r.refused).toEqual([{ name: 'big.mp4', sha256: sha('twelve bytes'), reason: expect.stringMatching(/limit/) }]);
    expect(r.shared.map((s: { name: string }) => s.name)).toEqual(['small.mp4']);
    expect(text(await client.callTool({ name: 'set_shared_limit', arguments: { projectId: 'proj', limitMb: 250 } })).limitMb).toBe(250);
    expect(seen.find(s => s.path === '/api/channel-sync' && s.method === 'PUT')?.body).toEqual({ projectId: 'proj', limitMb: 250 });
  });
});
