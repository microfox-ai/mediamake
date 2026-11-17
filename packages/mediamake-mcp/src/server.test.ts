import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediamakeClient } from './client';
import { createServer, type ServerKind } from './server';

async function connect(localFiles: boolean, kind: ServerKind = 'release') {
  const server = createServer(
    kind,
    new MediamakeClient({ baseUrl: 'http://mm.test', timeoutMs: 1000 }),
    { localFiles },
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const MOVED_TO_PROJECTSYNC = [
  'list_projects', 'get_project', 'create_project',
  'get_brand_kit', 'upload_brand_kit', 'finish_brand_kit_upload', 'update_brand_kit',
  'list_media', 'search_media', 'get_media', 'upload_media',
];

describe('the three servers', () => {
  const names = async (kind: ServerKind, localFiles = false) => (await (await connect(localFiles, kind)).listTools()).tools.map(t => t.name);

  it('offers local file arguments on the local legacy server', async () => {
    const { tools } = await (await connect(true, 'legacy')).listTools();
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    expect(byName.transcribe.inputSchema.properties).toHaveProperty('filePath');
    expect(byName.transcribe.inputSchema.properties).toHaveProperty('saveTo');
  });

  it('leaves out every local file argument when hosted', async () => {
    const { tools } = await (await connect(false, 'legacy')).listTools();
    const byName = Object.fromEntries(tools.map(t => [t.name, t]));
    expect(byName.transcribe.inputSchema.properties).not.toHaveProperty('filePath');
    expect(byName.transcribe.inputSchema.properties).not.toHaveProperty('saveTo');
    expect(byName.get_transcription.inputSchema.properties).not.toHaveProperty('saveTo');
    expect(byName.list_timelines).toBeDefined();
  });

  it("leaves projects, brand kits and media to ProjectSync", async () => {
    for (const kind of ['release', 'use', 'legacy'] as const) {
      const all = await names(kind);
      for (const moved of MOVED_TO_PROJECTSYNC) expect(all).not.toContain(moved);
    }
  });

  it('gives mm-release the catalog and nothing else', async () => {
    const all = await names('release');
    expect(all).toContain('catalog_items');
    expect(all).toContain('catalog_set_tier');
    expect(all.filter(name => !name.startsWith('catalog_'))).toEqual([]);
  });

  it('gives mm-use what a member does, with no admin or video tool', async () => {
    expect((await names('use')).sort()).toEqual(
      ['explore', 'get_item', 'install_item', 'item_versions', 'known_issues', 'my_feedback', 'my_usage', 'report_local_skills', 'report_skill_run', 'send_feedback'].sort(),
    );
  });

  it('keeps the old video tools in the deprecated server, without the catalog', async () => {
    const all = await names('legacy');
    for (const kept of ['list_timelines', 'list_presets', 'transcribe', 'render', 'run_worker', 'list_generations']) expect(all).toContain(kept);
    expect(all.filter(name => name.startsWith('catalog_'))).toEqual([]);
    const client = await connect(false, 'legacy');
    expect(client.getInstructions()).toContain('Deprecated');
    expect(client.getServerVersion()?.name).toBe('mediamake');
    expect((await connect(false, 'release')).getServerVersion()?.name).toBe('mm-release');
    expect((await connect(false, 'use')).getServerVersion()?.name).toBe('mm-use');
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

  it('takes an item out of the vault and starts its Pro gate', async () => {
    const calls = stubApi((method, path, body) =>
      method === 'GET'
        ? { item: { id: 'mcp/x', kind: 'mcp', visibility: 'private', neverPublish: true }, definedIn: 'database' }
        : body.type === 'schedule_release'
          ? { item: { publicAt: '2026-12-02T00:00:00.000Z' } }
          : { item: {} },
    );
    const { out } = await call('catalog_set_stage', { item: 'mcp/x', stage: 'pro', gateDays: 30 });
    expect(calls.map(c => c.body?.type ?? c.url.pathname)).toEqual(['/api/admin/catalog/item', 'set_item_tier', 'schedule_release']);
    expect(calls[1].body).toEqual({ itemId: 'mcp/x', type: 'set_item_tier', tier: 'pro' });
    expect(calls[2].body).toEqual({ itemId: 'mcp/x', type: 'schedule_release', days: 30 });
    expect(out).toEqual({ item: 'mcp/x', stage: 'pro', goesPublicAt: '2026-12-02T00:00:00.000Z', page: 'http://mm.test/core/releases/mcp/x' });
  });

  it("won't move what is always public, or what is defined in the repo, and leaves an item where it already is", async () => {
    stubApi(() => ({ item: { id: 'skill/x', kind: 'skill', tier: 'public', inRepo: true }, definedIn: 'skills.json' }));
    const skill = await call('catalog_set_stage', { item: 'skill/x', stage: 'cohort' });
    expect(skill.isError).toBe(true);
    expect(skill.out).toContain('always public');

    vi.unstubAllGlobals();
    stubApi(() => ({ item: { id: 'app/x', kind: 'app', visibility: 'public' }, definedIn: 'items.ts' }));
    expect((await call('catalog_set_stage', { item: 'app/x', stage: 'cohort' })).out).toContain('lib/catalog/items.ts');

    vi.unstubAllGlobals();
    const calls = stubApi(() => ({ item: { id: 'mcp/x', kind: 'mcp', visibility: 'network' }, definedIn: 'database' }));
    // stored before the ladder: the community was Pro
    const same = await call('catalog_set_stage', { item: 'mcp/x', stage: 'pro' });
    expect(same.out.unchanged).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('moves a packaged skill to the vault, stored as the admin tier, and shows the vault by that name', async () => {
    const calls = stubApi(method =>
      method === 'GET' ? { item: { id: 'skill/p', kind: 'skill', tier: 'cohort', visibility: 'private' }, definedIn: 'database' } : { item: {} },
    );
    await call('catalog_set_stage', { item: 'skill/p', stage: 'vault' });
    expect(calls[1].body).toEqual({ itemId: 'skill/p', type: 'set_item_tier', tier: 'admin' });
    expect((await call('catalog_set_stage', { item: 'skill/p', stage: 'public', gateDays: 3 })).isError).toBe(true);

    vi.unstubAllGlobals();
    const listed = stubApi(() => ({ items: [{ id: 'mcp/m', tier: 'admin', page: '/core/releases/mcp/m' }] }));
    const { out } = await call('catalog_items', { tier: 'vault', readiness: 'beta' });
    expect(Object.fromEntries(listed[0].url.searchParams)).toEqual({ tier: 'admin', readiness: 'beta' });
    expect(out.items[0].tier).toBe('vault');
  });

  it('marks health for any kind, and a failed item needs its reason', async () => {
    const calls = stubApi(() => ({}));
    expect((await call('catalog_set_health', { items: ['skill/x'], health: 'failed' })).out).toContain('reason');
    expect(calls).toHaveLength(0);
    await call('catalog_set_health', { items: ['skill/x'], health: 'failed', note: 'the render step crashes' });
    expect(calls[0].body).toEqual({ type: 'set_health', itemIds: ['skill/x'], health: 'failed', note: 'the render step crashes' });
    await call('catalog_set_health', { items: ['skill/x'], health: 'default' });
    expect(calls[1].body).toEqual({ type: 'set_health', itemIds: ['skill/x'], health: null });
  });

  it('marks items Ready only with proof, and Beta without', async () => {
    const calls = stubApi(() => ({}));
    expect((await call('catalog_set_readiness', { items: ['skill/x'], readiness: 'ready' })).out).toContain('proof');
    expect(calls).toHaveLength(0);
    const proof = [{ title: 'The Microfox brand kit', url: 'https://youtu.be/x' }];
    const { out } = await call('catalog_set_readiness', { items: ['skill/x'], readiness: 'ready', proof });
    expect(calls[0].body).toEqual({ type: 'set_readiness', itemIds: ['skill/x'], readiness: 'ready', proof });
    expect(out.items).toEqual([{ id: 'skill/x', page: 'http://mm.test/core/releases/skill/x' }]);
    await call('catalog_set_readiness', { items: ['skill/x'], readiness: 'beta' });
    expect(calls[1].body).toEqual({ type: 'set_readiness', itemIds: ['skill/x'], readiness: 'beta' });
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
      itemPage: 'http://mm.test/mcps/suno',
    });
  });

  it('makes an invite link on the site', async () => {
    const calls = stubApi(() => ({ invite: { code: 'abc123', maxUses: 5 } }));
    const { out } = await call('catalog_invite', { items: ['mcp/browse-hack'], uses: 5, grantDays: 30 });
    expect(calls[0].body).toEqual({ type: 'create_invite', itemIds: ['mcp/browse-hack'], maxUses: 5, grantDays: 30 });
    expect(out.link).toBe('http://mm.test/access?code=abc123');
  });

  it('makes an invite link into a tier, and needs items or a tier', async () => {
    const calls = stubApi(() => ({ invite: { code: 'grp1', maxUses: 10 } }));
    const { out } = await call('catalog_invite', { tier: 'pro', uses: 10 });
    expect(calls[0].body).toEqual({ type: 'create_invite', itemIds: [], tier: 'pro', maxUses: 10 });
    expect(out.makesThem).toBe('pro members');
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
    memberships: [
      { membershipId: 'mem_1', clientId: 'c3', tier: 'plus', source: 'contribution', ref: 'skill/y', grantedAt: '2026-11-01T00:00:00.000Z', expiresAt: '2999-02-01T00:00:00.000Z' },
      { membershipId: 'mem_2', clientId: 'c3', tier: 'pro', source: 'admin', grantedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-02-01T00:00:00.000Z' },
      { membershipId: 'mem_3', clientId: 'c2', tier: 'cohort', source: 'admin', grantedAt: '2026-01-01T00:00:00.000Z', revokedAt: '2026-03-01T00:00:00.000Z' },
    ],
    invites: [
      { code: 'live', tier: 'cohort', uses: 1, maxUses: 5 },
      { code: 'off', groupId: 'network', uses: 0, maxUses: 5, disabledAt: '2026-01-01T00:00:00.000Z' },
    ],
    requests: [{ clientId: 'c3', itemId: 'mcp/x' }],
  };

  it('lists people by tier with live tier invites', async () => {
    stubApi(() => PEOPLE);
    const { out } = await call('catalog_people', {});
    // the earlier groups still count (private testers are the cohort, the community is Pro); ended memberships don't
    expect(out.cohort).toMatchObject([{ clientId: 'c1', name: 'Raj' }]);
    expect(out.cohort[0].how).toContain('migrate-tiers');
    expect(out.pro).toMatchObject([{ clientId: 'c2', name: 'Mia' }]);
    expect(out.plus).toEqual([{ clientId: 'c3', name: 'Ana', how: 'contribution (skill/y)', lasts: 'until 2999-02-01', membership: 'mem_1' }]);
    expect(out.public.map((p: any) => p.clientId)).toEqual(['c4']);
    expect(out.tierInvites).toEqual([{ tier: 'cohort', link: 'http://mm.test/access?code=live', used: '1/5' }]);
    expect(out.pendingRequests).toEqual([{ who: 'Ana', item: 'mcp/x' }]);
  });

  it('sets tiers by client id or name, and refuses unknown or ambiguous names', async () => {
    const calls = stubApi(method =>
      method === 'GET' ? PEOPLE : { membership: { membershipId: 'mem_9', clientId: 'c2', tier: 'plus', source: 'contribution', expiresAt: '2027-02-15T00:00:00.000Z' } },
    );
    const { out } = await call('catalog_set_tier', { people: ['mia', 'c3'], tier: 'plus', source: 'contribution', ref: 'https://github.com/x/y/pull/1' });
    expect(calls.filter(c => c.method === 'POST').map(c => c.body)).toEqual([
      { type: 'set_tier', clientId: 'c2', tier: 'plus', source: 'contribution', ref: 'https://github.com/x/y/pull/1' },
      { type: 'set_tier', clientId: 'c3', tier: 'plus', source: 'contribution', ref: 'https://github.com/x/y/pull/1' },
    ]);
    expect(out.people).toEqual([
      { clientId: 'c2', name: 'Mia', lasts: 'until 2027-02-15', membership: 'mem_9' },
      { clientId: 'c3', name: 'Ana', lasts: 'until 2027-02-15', membership: 'mem_9' },
    ]);

    vi.unstubAllGlobals();
    const none = stubApi(() => PEOPLE);
    const bad = await call('catalog_set_tier', { people: ['Ana', 'Zed'], tier: 'pro' });
    expect(bad.isError).toBe(true);
    expect(bad.out).toContain('c3, c4');
    expect(bad.out).toContain('catalog_invite');
    expect(none.filter(c => c.method === 'POST')).toHaveLength(0);
  });

  it('makes a membership permanent, renews one for a new contribution, and ends one', async () => {
    const calls = stubApi(() => ({ membership: { membershipId: 'mem_1', clientId: 'c3', tier: 'plus', source: 'contribution', permanent: true } }));
    const made = await call('catalog_membership', { action: 'make-permanent', membership: 'mem_1' });
    expect(calls[0].body).toEqual({ type: 'membership_permanent', membershipId: 'mem_1' });
    expect(made.out).toMatchObject({ person: 'c3', tier: 'plus', lasts: 'permanent' });
    await call('catalog_membership', { action: 'renew', person: 'c3', tier: 'plus', ref: 'skill/z' });
    expect(calls[1].body).toEqual({ type: 'add_membership', clientId: 'c3', tier: 'plus', source: 'contribution', ref: 'skill/z' });
    await call('catalog_membership', { action: 'end', membership: 'mem_1', note: 'left' });
    expect(calls[2].body).toEqual({ type: 'revoke_membership', membershipId: 'mem_1', note: 'left' });
    expect((await call('catalog_membership', { action: 'end' })).isError).toBe(true);
    expect((await call('catalog_membership', { action: 'renew', person: 'c3' })).isError).toBe(true);
  });

  /** set_video answers with what it stored: the YouTube id from the link, like the app. */
  const storedVideo = (video: any) => ({
    video: {
      ...(video.url && { youtubeId: new URL(video.url).searchParams.get('v') }),
      title: video.title,
      description: video.description ?? '',
      ...(video.thumbnail && { thumbnail: video.thumbnail }),
      ...(video.lessons && { lessons: video.lessons }),
    },
  });
  const INTRO = { youtubeId: 'aqz-KE-bpKQ', title: 'Pack a brand kit', description: 'Episode 1.', thumbnail: 'https://cdn.test/t.jpg' };

  it('changes one field of a video and keeps the rest', async () => {
    const calls = stubApi((method, _path, body) => (method === 'GET' ? { item: {}, video: INTRO } : storedVideo(body.video)));
    const { out } = await call('catalog_set_video', { item: 'skill/pack-brand-kit', title: 'Brand kit in one prompt' });
    expect(calls[0].url.searchParams.get('id')).toBe('skill/pack-brand-kit');
    expect(calls[1].body).toEqual({
      type: 'set_video',
      itemId: 'skill/pack-brand-kit',
      video: { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: 'Brand kit in one prompt', description: 'Episode 1.', thumbnail: 'https://cdn.test/t.jpg' },
    });
    expect(out).toEqual({
      item: 'skill/pack-brand-kit',
      video: { title: 'Brand kit in one prompt', description: 'Episode 1.', thumbnail: 'https://cdn.test/t.jpg', youtube: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
      page: 'http://mm.test/core/releases/skill/pack-brand-kit',
      plays: 'http://mm.test/skills/pack-brand-kit',
    });
  });

  it("goes back to YouTube's thumbnail with null, and needs a title for a new video", async () => {
    const calls = stubApi((method, _path, body) => (method === 'GET' ? { item: {}, video: INTRO } : storedVideo(body.video)));
    const { out } = await call('catalog_set_video', { item: 'skill/pack-brand-kit', thumbnail: null });
    expect(calls[1].body.video.thumbnail).toBeUndefined();
    expect(out.video.thumbnail).toBe('https://img.youtube.com/vi/aqz-KE-bpKQ/maxresdefault.jpg');

    vi.unstubAllGlobals();
    const none = stubApi(() => ({ item: {}, video: null }));
    const bad = await call('catalog_set_video', { item: 'course/cwc', description: 'Lessons' });
    expect(bad.isError).toBe(true);
    expect(bad.out).toContain('give its title and lessons');
    expect(none.filter(c => c.method === 'POST')).toHaveLength(0);
  });

  it('removes a video, and only with nothing else given', async () => {
    const calls = stubApi(() => ({ video: null }));
    const { out } = await call('catalog_set_video', { item: 'skill/x', remove: true });
    expect(calls.map(c => c.body)).toEqual([{ type: 'set_video', itemId: 'skill/x', video: null }]);
    expect(out).toEqual({ item: 'skill/x', video: null, page: 'http://mm.test/core/releases/skill/x' });
    expect((await call('catalog_set_video', { item: 'skill/x', remove: true, title: 'X' })).isError).toBe(true);
  });

  it('adds a tutorial with its id made from the title, and a course that plays on its own page', async () => {
    const calls = stubApi((_method, _path, body) => ({ item: {}, ...storedVideo(body.video) }));
    const { out } = await call('catalog_add_video_item', {
      kind: 'tutorial',
      title: 'Brand kit in one prompt!',
      url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    });
    expect(calls[0].body).toEqual({
      type: 'create_video_item',
      kind: 'tutorial',
      slug: 'brand-kit-in-one-prompt',
      video: { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: 'Brand kit in one prompt!' },
    });
    expect(out).toMatchObject({
      item: 'tutorial/brand-kit-in-one-prompt',
      stage: 'cohort',
      page: 'http://mm.test/core/releases/tutorial/brand-kit-in-one-prompt',
      plays: 'http://mm.test/access?item=tutorial%2Fbrand-kit-in-one-prompt',
    });

    const course = await call('catalog_add_video_item', { kind: 'course', slug: 'cwc', title: 'Cook with Claude' });
    expect(calls[1].body.video).toEqual({ title: 'Cook with Claude', lessons: [] });
    expect(course.out.plays).toBe('http://mm.test/courses/cwc');
  });

  it('takes a thumbnail file only on the local server', async () => {
    for (const [localFiles, offered] of [[true, true], [false, false]] as const) {
      const { tools } = await (await connect(localFiles)).listTools();
      for (const name of ['catalog_set_video', 'catalog_add_video_item']) {
        expect(Object.keys(tools.find(t => t.name === name)!.inputSchema.properties ?? {}).includes('thumbnailFile')).toBe(offered);
      }
    }
  });

  describe('thumbnail files', () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'catalog-thumb-'));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    /** The admin API and the storage PUT, recorded with their headers. */
    function stubWithStorage(storageStatus = 200) {
      const calls: { method: string; url: string; headers: Record<string, string>; body?: any }[] = [];
      vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
        const url = String(input);
        const method = init.method ?? 'GET';
        const headers = (init.headers ?? {}) as Record<string, string>;
        if (url.startsWith('https://store.test/')) {
          calls.push({ method, url, headers, body: init.body });
          return new Response(storageStatus === 200 ? null : 'denied', { status: storageStatus });
        }
        const body = init.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method, url, headers, body });
        if (method === 'GET') return Response.json({ item: {}, video: INTRO });
        if (body.type === 'create_thumbnail_upload')
          return Response.json({ uploadUrl: 'https://store.test/put?sig=1', publicUrl: 'https://cdn.test/catalog-thumbnails/new.png' });
        return Response.json({ item: {}, ...storedVideo(body.video) });
      });
      return calls;
    }
    const callLocal = async (name: string, args: Record<string, unknown>) => {
      const result: any = await (await connect(true)).callTool({ name, arguments: args });
      return { isError: !!result.isError, text: result.content[0].text as string };
    };

    it('saves the video, uploads the image public-read, then points the video at it', async () => {
      const file = join(dir, 'thumb.png');
      await writeFile(file, Buffer.from([137, 80, 78, 71]));
      const calls = stubWithStorage();
      const { isError, text } = await callLocal('catalog_set_video', { item: 'skill/pack-brand-kit', thumbnailFile: file });
      expect(isError).toBe(false);
      expect(calls.map(c => c.body?.type ?? `${c.method} ${new URL(c.url).pathname}`)).toEqual([
        'GET /api/admin/catalog/item',
        'set_video',
        'create_thumbnail_upload',
        'PUT /put',
        'set_video',
      ]);
      expect(calls[2].body).toEqual({ type: 'create_thumbnail_upload', itemId: 'skill/pack-brand-kit', filename: 'thumb.png', contentType: 'image/png' });
      expect(calls[3].headers).toEqual({ 'Content-Type': 'image/png', 'x-amz-acl': 'public-read' });
      expect(calls[4].body.video.thumbnail).toBe('https://cdn.test/catalog-thumbnails/new.png');
      expect(JSON.parse(text).video.thumbnail).toBe('https://cdn.test/catalog-thumbnails/new.png');
    });

    it('refuses a file that is not an image before saving anything', async () => {
      const file = join(dir, 'notes.txt');
      await writeFile(file, 'hi');
      const calls = stubWithStorage();
      const { isError, text } = await callLocal('catalog_set_video', { item: 'skill/x', thumbnailFile: file });
      expect(isError).toBe(true);
      expect(text).toContain('not a PNG, JPEG, WebP, GIF or AVIF image');
      expect(calls).toHaveLength(0);
    });

    it('says a new tutorial was added when only its thumbnail failed', async () => {
      const file = join(dir, 'thumb.jpg');
      await writeFile(file, Buffer.from([255, 216, 255]));
      stubWithStorage(403);
      const { isError, text } = await callLocal('catalog_add_video_item', {
        kind: 'tutorial',
        title: 'Ep 1',
        url: 'https://youtu.be/aqz-KE-bpKQ',
        thumbnailFile: file,
      });
      expect(isError).toBe(true);
      expect(text).toContain('Added tutorial/ep-1');
      expect(text).toContain('catalog_set_video');
    });
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
    const result: any = await (await connect(false, 'legacy')).callTool({
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
    const result: any = await (await connect(true, 'legacy')).callTool({
      name: 'rate_generation',
      arguments: { id: `https://suno.com/song/${REF}?sh=x`, rating: 'keeper', note: 'Use for the gojo edit' },
    });
    expect(result.isError).toBeFalsy();
    expect(calls).toEqual([
      { method: 'PATCH', url: `http://mm.test/api/generations/${REF}`, body: { rating: 'keeper', note: 'Use for the gojo edit' } },
    ]);
  });
});

describe('mm-use', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    const result: any = await (await connect(false, 'use')).callTool({ name, arguments: args });
    return { isError: !!result.isError, out: result.isError ? result.content[0].text : JSON.parse(result.content[0].text) };
  };

  const ITEMS = [
    { id: 'skill/pack-brand-kit', kind: 'skill', title: 'pack-brand-kit', summary: 'A brand kit', tier: 'public', access: 'open', readiness: 'ready', tags: ['brand'], installPrompt: 'Set up…' },
    { id: 'mcp/browse-hack', kind: 'mcp', title: 'Browse Hack', summary: 'Drive Chrome', tier: 'pro', access: 'locked', version: '0.15.1' },
    { id: 'mcp/broken', kind: 'mcp', title: 'Broken', tier: 'public', access: 'open', health: 'failed', healthNote: 'its API changed' },
  ];

  it('explores with the locked items shown, and leaves failed ones out unless asked', async () => {
    const calls = stubApi(() => ({ signedIn: true, items: ITEMS }));
    const { out } = await call('explore', {});
    expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({ locked: 'show' });
    expect(out.items.map((i: any) => [i.id, i.open, i.readiness])).toEqual([
      ['skill/pack-brand-kit', true, 'ready'],
      ['mcp/browse-hack', false, 'beta'],
    ]);
    expect(out.items[0]).not.toHaveProperty('installPrompt');
    expect((await call('explore', { query: 'brand kit', open: true })).out.items.map((i: any) => i.id)).toEqual(['skill/pack-brand-kit']);
    const failed = (await call('explore', { includeFailed: true, kind: 'mcp' })).out.items.find((i: any) => i.id === 'mcp/broken');
    expect([failed.health, failed.healthNote]).toEqual(['failed', 'its API changed']);
  });

  it('shows one item, and says which membership opens a locked one', async () => {
    stubApi((_m, path) => (path === '/api/catalog' ? { items: ITEMS } : { items: [{ id: 'skill/pack-brand-kit', version: '1.0.0' }] }));
    const open = (await call('get_item', { item: 'skill/pack-brand-kit' })).out;
    expect(open.open).toBe(true);
    expect(open.page).toBe('http://mm.test/skills/pack-brand-kit');
    expect(open.releases).toEqual({ id: 'skill/pack-brand-kit', version: '1.0.0' });
    const locked = (await call('get_item', { item: 'mcp/browse-hack' })).out;
    expect(locked.open).toBe(false);
    expect(locked.locked).toContain('pro membership');
    expect(locked).not.toHaveProperty('releases');
    expect((await call('get_item', { item: 'skill/none' })).isError).toBe(true);
  });

  it("gets an item's install plan with the caller's key", async () => {
    const calls = stubApi(() => ({ ok: true, steps: [{ type: 'repo', repo: 'microfox-ai/mediamake' }] }));
    const { out } = await call('install_item', { item: 'skill/pack-brand-kit' });
    expect(calls[0].url.pathname + calls[0].url.search).toBe('/api/catalog/install?item=skill%2Fpack-brand-kit');
    expect(out.plan.steps).toHaveLength(1);
    expect(out.guide).toContain('install.md');
  });

  it("reports a skill run as its name and time, and nothing else", async () => {
    const calls = stubApi(() => ({ saved: 1 }));
    await call('report_skill_run', { skill: 'make-lyrics-video', at: '2026-11-15T10:00:00Z' });
    expect(calls[0].url.pathname).toBe('/api/usage/skill-runs');
    expect(calls[0].body).toEqual({ runs: [{ skill: 'make-lyrics-video', at: '2026-11-15T10:00:00Z' }] });
    // no argument for anything more exists
    const result: any = await (await connect(false, 'use')).listTools();
    const tool = result.tools.find((t: any) => t.name === 'report_skill_run');
    expect(Object.keys(tool.inputSchema.properties).sort()).toEqual(['at', 'skill']);
    expect((await call('report_skill_run', { skill: '/Users/me/secret path' })).isError).toBe(true);
  });

  it("reports local skills as names and versions", async () => {
    const calls = stubApi(() => ({ saved: 2 }));
    await call('report_local_skills', { skills: [{ name: 'pack-brand-kit', version: '1.2.0' }, { name: 'my-own' }], device: 'MacBook' });
    expect([calls[0].method, calls[0].url.pathname]).toEqual(['PUT', '/api/usage/local-skills']);
    expect(calls[0].body).toEqual({ device: 'MacBook', skills: [{ name: 'pack-brand-kit', version: '1.2.0' }, { name: 'my-own' }] });
  });

  it('reads usage back, and sends feedback about an item', async () => {
    const calls = stubApi((method, path) => (path === '/api/feedback' ? { feedbackId: 'fb_1' } : path === '/api/usage/local-skills' ? { devices: [] } : { skills: [{ skill: 'x', runs: 3 }] }));
    expect((await call('my_usage', {})).out).toEqual({ skills: [{ skill: 'x', runs: 3 }], local: { devices: [] } });
    const { out } = await call('send_feedback', { text: 'The render step crashes', item: 'skill/make-lyrics-video', version: '2.0.0' });
    const sent = calls.find(c => c.url.pathname === '/api/feedback')!;
    expect(sent.body).toEqual({ text: 'The render step crashes', itemId: 'skill/make-lyrics-video', version: '2.0.0', source: 'mm-use' });
    expect(out.feedbackId).toBe('fb_1');
  });

  it('reads back what the account sent, and an item\'s known issues', async () => {
    const calls = stubApi((method, path) =>
      path === '/api/feedback/known-issues' ? { item: 'skill/make-lyrics-video', issues: [{ issueId: 'ki_1', title: 'Render stops at 99%', status: 'open' }] } : { feedback: [{ feedbackId: 'fb_1', status: 'shipped' }] },
    );
    expect((await call('my_feedback', { item: 'skill/make-lyrics-video' })).out).toEqual({ feedback: [{ feedbackId: 'fb_1', status: 'shipped' }] });
    expect(calls.find(c => c.url.pathname === '/api/feedback')!.url.searchParams.get('item')).toBe('skill/make-lyrics-video');
    const { out } = await call('known_issues', { item: 'skill/make-lyrics-video' });
    expect(out.issues).toHaveLength(1);
    expect(out.page).toBe('http://mm.test/skills/make-lyrics-video');
  });
});
