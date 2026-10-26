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
