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
