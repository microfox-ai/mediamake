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

describe('catalog admin tools', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Records each call; `reply` answers by method and path. */
  function stubApi(reply: (method: string, path: string, body: any) => unknown) {
    const calls: { method: string; url: URL; body?: any }[] = [];
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url, body });
      return Response.json(reply(method, url.pathname, body) ?? {});
    });
    return calls;
  }
  const call = async (name: string, args: Record<string, unknown>) => {
    const result: any = await (await connect(false)).callTool({ name, arguments: args });
    return { isError: !!result.isError, out: result.isError ? result.content[0].text : JSON.parse(result.content[0].text) };
  };

  it('lists items with filters and absolute release pages', async () => {
    const calls = stubApi(() => ({ items: [{ id: 'skill/x', tier: 'public', page: '/core/releases/skill/x' }] }));
    const { out } = await call('catalog_items', { kind: 'skill', archived: false, query: 'brand' });
    expect(calls[0].url.pathname).toBe('/api/admin/catalog/items');
    expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({ kind: 'skill', archived: 'false', q: 'brand' });
    expect(out).toEqual({
      count: 1,
      items: [{ id: 'skill/x', tier: 'public', page: 'http://mm.test/core/releases/skill/x' }],
      dashboard: 'http://mm.test/core/releases',
    });
  });

  it('shows one item with its install steps in words and without the title index', async () => {
    stubApi(() => ({
      item: { id: 'skill/x' },
      names: { 'skill/x': 'X' },
      plan: {
        ok: true,
        steps: [
          { type: 'repo', repo: 'microfox-ai/mediamake' },
          { type: 'source', kind: 'skill', id: 'skill/x', source: { type: 'github-skill' } },
          { type: 'source', kind: 'mcp', id: 'mcp/fal', source: { type: 'mcp-server' }, forChoices: ['mcp/fal'] },
        ],
        choices: [{ id: 'mcp/fal', need: 'optional' }],
      },
    }));
    const { out } = await call('catalog_item', { item: 'skill/x' });
    expect(out.names).toBeUndefined();
    expect(out.page).toBe('http://mm.test/core/releases/skill/x');
    expect(out.install.steps).toEqual([
      'Clone microfox-ai/mediamake',
      'skill skill/x from its source (github-skill)',
      'mcp mcp/fal from its source (mcp-server) (only if they take mcp/fal)',
    ]);
  });

  it('archives items with a note, and answers with their pages', async () => {
    const calls = stubApi(() => ({ archived: true }));
    const { out } = await call('catalog_archive', { items: ['skill/a', 'skill/b'], note: 'unused' });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toEqual({ type: 'set_archived', itemIds: ['skill/a', 'skill/b'], archived: true, note: 'unused' });
    expect(out.items).toEqual([
      { id: 'skill/a', page: 'http://mm.test/core/releases/skill/a' },
      { id: 'skill/b', page: 'http://mm.test/core/releases/skill/b' },
    ]);
  });

  it('takes an item out of the vault before starting its community gate', async () => {
    const calls = stubApi((method, path, body) =>
      method === 'GET'
        ? { item: { id: 'mcp/x', kind: 'mcp', visibility: 'private', neverPublish: true }, definedIn: 'database' }
        : body.type === 'schedule_release'
          ? { item: { publicAt: '2026-12-02T00:00:00.000Z' } }
          : { item: {} },
    );
    const { out } = await call('catalog_set_stage', { item: 'mcp/x', stage: 'community', gateDays: 30 });
    expect(calls.map(c => c.body?.type ?? c.url.pathname)).toEqual(['/api/admin/catalog/item', 'set_never_publish', 'schedule_release']);
    expect(calls[1].body).toEqual({ itemId: 'mcp/x', type: 'set_never_publish', neverPublish: false });
    expect(calls[2].body).toEqual({ itemId: 'mcp/x', type: 'schedule_release', days: 30 });
    expect(out).toEqual({ item: 'mcp/x', stage: 'community', goesPublicAt: '2026-12-02T00:00:00.000Z', page: 'http://mm.test/core/releases/mcp/x' });
  });

  it("won't move what is always public, or what is defined in the repo, and leaves an item where it already is", async () => {
    stubApi(() => ({ item: { id: 'skill/x', kind: 'skill', visibility: 'public' }, definedIn: 'skills.json' }));
    const skill = await call('catalog_set_stage', { item: 'skill/x', stage: 'development' });
    expect(skill.isError).toBe(true);
    expect(skill.out).toContain('always public');

    vi.unstubAllGlobals();
    stubApi(() => ({ item: { id: 'app/x', kind: 'app', visibility: 'public' }, definedIn: 'items.ts' }));
    expect((await call('catalog_set_stage', { item: 'app/x', stage: 'development' })).out).toContain('lib/catalog/items.ts');

    vi.unstubAllGlobals();
    const calls = stubApi(() => ({ item: { id: 'mcp/x', kind: 'mcp', visibility: 'network' }, definedIn: 'database' }));
    const same = await call('catalog_set_stage', { item: 'mcp/x', stage: 'community' });
    expect(same.out.unchanged).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('lists an MCP made by others with where it installs from', async () => {
    const calls = stubApi(() => ({ item: {} }));
    const source = { type: 'mcp-server', name: 'suno', remote: { url: 'https://api.suno.com/mcp' } };
    const { out } = await call('catalog_add_third_party', {
      id: 'mcp/suno',
      title: 'Suno',
      summary: 'Songs from Suno.',
      madeBy: { name: 'Suno', homepage: 'https://suno.com' },
      source,
      notes: 'Needs a Suno account.',
    });
    expect(calls[0].body).toEqual({
      type: 'upsert_item',
      item: {
        kind: 'mcp',
        slug: 'suno',
        title: 'Suno',
        summary: 'Songs from Suno.',
        status: 'live',
        madeBy: { name: 'Suno', homepage: 'https://suno.com' },
        install: { source, notes: 'Needs a Suno account.' },
      },
    });
    expect(out).toEqual({
      id: 'mcp/suno',
      page: 'http://mm.test/core/releases/mcp/suno',
      installPage: 'http://mm.test/access?item=mcp%2Fsuno',
    });
  });

  it('makes an invite link on the site', async () => {
    const calls = stubApi(() => ({ invite: { code: 'abc123', maxUses: 5 } }));
    const { out } = await call('catalog_invite', { items: ['mcp/browse-hack'], uses: 5, grantDays: 30 });
    expect(calls[0].body).toEqual({ type: 'create_invite', itemIds: ['mcp/browse-hack'], maxUses: 5, grantDays: 30 });
    expect(out.link).toBe('http://mm.test/access?code=abc123');
  });

  it('makes an invite link into a tier, and needs items or a group', async () => {
    const calls = stubApi(() => ({ invite: { code: 'grp1', maxUses: 10 } }));
    const { out } = await call('catalog_invite', { group: 'community', uses: 10 });
    expect(calls[0].body).toEqual({ type: 'create_invite', itemIds: [], groupId: 'network', maxUses: 10 });
    expect(out.makesThem).toBe('community members');
    expect((await call('catalog_invite', {})).isError).toBe(true);
  });

  const PEOPLE = {
    people: [
      { clientId: 'c1', name: 'Raj', activeKeys: 1 },
      { clientId: 'c2', name: 'Mia', activeKeys: 1 },
      { clientId: 'c3', name: 'Ana', activeKeys: 1 },
      { clientId: 'c4', name: 'Ana', activeKeys: 1 },
    ],
    groups: [
      { groupId: 'private', members: ['c1'] },
      { groupId: 'network', members: ['c2'] },
    ],
    invites: [
      { code: 'live', groupId: 'private', uses: 1, maxUses: 5 },
      { code: 'off', groupId: 'network', uses: 0, maxUses: 5, disabledAt: '2026-01-01T00:00:00.000Z' },
    ],
    requests: [{ clientId: 'c3', itemId: 'mcp/x' }],
  };

  it('lists people by tier with live tier invites', async () => {
    stubApi(() => PEOPLE);
    const { out } = await call('catalog_people', {});
    expect(out.private).toEqual([{ clientId: 'c1', name: 'Raj' }]);
    expect(out.community).toEqual([{ clientId: 'c2', name: 'Mia' }]);
    expect(out.public.map((p: any) => p.clientId)).toEqual(['c3', 'c4']);
    expect(out.tierInvites).toEqual([{ tier: 'private', link: 'http://mm.test/access?code=live', used: '1/5' }]);
    expect(out.pendingRequests).toEqual([{ who: 'Ana', item: 'mcp/x' }]);
  });

  it('sets tiers by client id or name, and refuses unknown or ambiguous names', async () => {
    const calls = stubApi(() => PEOPLE);
    const { out } = await call('catalog_set_tier', { people: ['mia', 'c3'], tier: 'private' });
    expect(calls.filter(c => c.method === 'POST').map(c => c.body)).toEqual([
      { type: 'set_tier', clientId: 'c2', tier: 'private' },
      { type: 'set_tier', clientId: 'c3', tier: 'private' },
    ]);
    expect(out.people).toEqual([{ clientId: 'c2', name: 'Mia' }, { clientId: 'c3', name: 'Ana' }]);

    vi.unstubAllGlobals();
    const none = stubApi(() => PEOPLE);
    const bad = await call('catalog_set_tier', { people: ['Ana', 'Zed'], tier: 'community' });
    expect(bad.isError).toBe(true);
    expect(bad.out).toContain('c3, c4');
    expect(bad.out).toContain('catalog_invite');
    expect(none.filter(c => c.method === 'POST')).toHaveLength(0);
  });

  it('rejects an id that is not a catalog id', async () => {
    stubApi(() => ({}));
    const result: any = await (await connect(false)).callTool({ name: 'catalog_archive', arguments: { items: ['pack-brand-kit'] } });
    expect(result.isError).toBe(true);
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
