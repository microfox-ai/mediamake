import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediamakeClient } from './client';
import { createServer } from './server';

async function connect(localFiles: boolean) {
  const server = createServer(
    new MediamakeClient({ baseUrl: 'http://mm.test', timeoutMs: 1000 }),
    { localFiles },
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe('createServer', () => {
  it('offers local file arguments on the local server', async () => {
    const { tools } = await (await connect(true)).listTools();
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    expect(byName.upload_brand_kit).toBeDefined();
    expect(byName.upload_media.inputSchema.properties).toHaveProperty(
      'filePath',
    );
    expect(byName.transcribe.inputSchema.properties).toHaveProperty('saveTo');
  });

  it('leaves out every local file argument when hosted', async () => {
    const client = await connect(false);
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    expect(byName.upload_brand_kit.inputSchema.properties).toHaveProperty('files');
    expect(byName.upload_brand_kit.inputSchema.properties).not.toHaveProperty('folder');
    expect(byName.finish_brand_kit_upload).toBeDefined();
    expect(byName.upload_media.inputSchema.properties).not.toHaveProperty(
      'filePath',
    );
    expect(byName.transcribe.inputSchema.properties).not.toHaveProperty(
      'filePath',
    );
    expect(byName.transcribe.inputSchema.properties).not.toHaveProperty(
      'saveTo',
    );
    expect(byName.get_transcription.inputSchema.properties).not.toHaveProperty(
      'saveTo',
    );
    expect(byName.list_projects).toBeDefined();
  });
});

describe('hosted upload_brand_kit', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves text fields and inline files, and hands back upload URLs for the rest', async () => {
    const calls: { method: string; url: string; body?: any }[] = [];
    vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
      const url = String(input);
      const method = init.method ?? 'GET';
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      calls.push({ method, url, body });
      if (url.startsWith('http://mm.test/api/project/brand-kit/upload'))
        return Response.json({
          uploads: body.files.map((f: any) => ({
            path: f.path,
            kind: f.path.split('/')[0],
            contentType: f.contentType,
            uploadUrl: `https://store.test/put/${f.path}?sig=1`,
            url: `https://cdn.test/${f.path}`,
          })),
        });
      if (url.startsWith('http://mm.test/api/project/brand-kit'))
        return Response.json({ brandKit: { name: body?.name, assets: body?.assets ?? [] } });
      if (url.startsWith('https://store.test/')) return new Response(null, { status: 200 });
      throw new Error(`unexpected ${method} ${url}`);
    });

    const client = await connect(false);
    const result: any = await client.callTool({
      name: 'upload_brand_kit',
      arguments: {
        projectId: 'p1',
        files: [
          { path: 'brandguide.md', size: 5, text: '# Hi' },
          { path: 'brand.json', size: 20, text: '{"name":"Zone"}' },
          { path: 'logo/logo.svg', size: 4, base64: Buffer.from('<svg').toString('base64') },
          { path: 'intros/intro.mp4', size: 9_000_000 },
        ],
      },
    });
    expect(result.isError).toBeFalsy();
    const out = JSON.parse(result.content[0].text);
    expect(out.uploaded).toBe(1);
    expect(out.brandKit.name).toBe('Zone');
    expect(out.pending.map((p: any) => p.path)).toEqual(['intros/intro.mp4']);
    expect(out.pending[0].curl).toContain("--data-binary @'intros/intro.mp4'");
    expect(out.finish.assets[0]).toMatchObject({ path: 'intros/intro.mp4', url: 'https://cdn.test/intros/intro.mp4' });

    const saved = calls.find(c => c.method === 'PUT' && c.url.startsWith('http://mm.test/api/project/brand-kit'))!;
    expect(saved.body).toMatchObject({ projectId: 'p1', guide: '# Hi', name: 'Zone' });
    expect(saved.body.assets.map((a: any) => a.path)).toEqual(['logo/logo.svg']);
    expect(calls.some(c => c.method === 'PUT' && c.url.startsWith('https://store.test/put/logo/logo.svg'))).toBe(true);
  });
});

describe('catalog_versions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for the live versions and release notes of the items named', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: string) => {
      urls.push(String(input));
      return Response.json({
        items: [{ id: 'mcp/browse-hack', version: '0.8.0', releases: [{ version: '0.8.0', notes: 'Updates itself' }] }],
        missing: [],
      });
    });
    const result: any = await (await connect(false)).callTool({
      name: 'catalog_versions',
      arguments: { items: ['mcp/browse-hack', 'skill/x'], notes: 3 },
    });
    expect(urls).toEqual(['http://mm.test/api/catalog/versions?items=mcp%2Fbrowse-hack%2Cskill%2Fx&notes=3']);
    expect(JSON.parse(result.content[0].text).items[0].version).toBe('0.8.0');
  });

  it('lists every item with its version when none are named', async () => {
    vi.stubGlobal('fetch', async () =>
      Response.json({
        items: [
          { id: 'mcp/browse-hack', kind: 'mcp', title: 'Browse Hack', version: '0.8.0', status: 'beta', summary: 'long' },
          { id: 'skill/x', kind: 'skill', title: 'X', status: 'live' },
        ],
      }),
    );
    const result: any = await (await connect(true)).callTool({ name: 'catalog_versions', arguments: {} });
    expect(JSON.parse(result.content[0].text).items).toEqual([
      { id: 'mcp/browse-hack', kind: 'mcp', title: 'Browse Hack', version: '0.8.0', status: 'beta' },
      { id: 'skill/x', kind: 'skill', title: 'X', version: null, status: 'live' },
    ]);
  });
});

describe('generations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const REF = '0b8f9c7e-1d2a-4c3b-9e8f-7a6b5c4d3e2f';

  it('lists takes with list filters joined, and can leave out the lyrics', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (input: string) => {
      urls.push(String(input));
      return Response.json({ items: [{ id: 'g1', ref: REF, title: 'Rain', lyrics: '[Verse]' }], nextCursor: 'next', role: 'owner' });
    });
    const result: any = await (await connect(false)).callTool({
      name: 'list_generations',
      arguments: { projectId: 'p1', rating: ['keeper', 'unrated'], kind: ['cover'], parentRef: `https://suno.com/song/${REF}`, lyrics: false },
    });
    const url = new URL(urls[0]);
    expect(url.pathname).toBe('/api/generations');
    expect(Object.fromEntries(url.searchParams)).toEqual({ projectId: 'p1', rating: 'keeper,unrated', kind: 'cover', parentRef: REF, limit: '20' });
    expect(JSON.parse(result.content[0].text)).toEqual({ items: [{ id: 'g1', ref: REF, title: 'Rain' }], nextCursor: 'next' });
  });

  it('rates a take by its suno.com link', async () => {
    const calls: { method: string; url: string; body?: any }[] = [];
    vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
      calls.push({ method: init.method ?? 'GET', url: String(input), body: JSON.parse(String(init.body)) });
      return Response.json({ id: 'g1', ref: REF, rating: 'keeper' });
    });
    const result: any = await (await connect(true)).callTool({
      name: 'rate_generation',
      arguments: { id: `https://suno.com/song/${REF}?sh=x`, rating: 'keeper', note: 'Use for the gojo edit' },
    });
    expect(result.isError).toBeFalsy();
    expect(calls).toEqual([
      { method: 'PATCH', url: `http://mm.test/api/generations/${REF}`, body: { rating: 'keeper', note: 'Use for the gojo edit' } },
    ]);
  });
});
