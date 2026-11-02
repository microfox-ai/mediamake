import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';

/**
 * Update tokens and release notes. Redis is an in-memory fake that speaks
 * Upstash's REST API (the client calls fetch).
 * Run: npx tsx --test lib/catalog/update-token.test.ts
 */

const store = new Map<string, { value: string; until?: number }>();

function run([name, ...raw]: unknown[]): unknown {
  const args = raw.map(String);
  const live = (key: string) => {
    const entry = store.get(key);
    if (entry?.until !== undefined && entry.until <= Date.now()) store.delete(key);
    return store.get(key);
  };
  switch (String(name).toLowerCase()) {
    case 'set': {
      const ex = args.findIndex(a => a.toLowerCase() === 'ex');
      store.set(args[0], { value: args[1], until: ex > 0 ? Date.now() + Number(args[ex + 1]) * 1000 : undefined });
      return 'OK';
    }
    case 'get':
      return live(args[0])?.value ?? null;
    default:
      throw new Error(`fake upstash: ${String(name)} not implemented`);
  }
}

const encode = (v: unknown): unknown => (typeof v === 'string' && v !== 'OK' ? Buffer.from(v).toString('base64') : v);

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith('http://upstash.test')) return realFetch(input, init);
  const body = JSON.parse(String(init?.body));
  const base64 = new Headers(init?.headers).get('upstash-encoding') === 'base64';
  const reply = (result: unknown) => ({ result: base64 ? encode(result) : result });
  const out = url.endsWith('/pipeline') || url.endsWith('/multi-exec') ? (body as unknown[][]).map(c => reply(run(c))) : reply(run(body));
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

process.env.UPSTASH_REDIS_REST_URL = 'http://upstash.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test';

let tokens: typeof import('./update-token');
let releases: typeof import('./releases');

before(async () => {
  tokens = await import('./update-token');
  releases = await import('./releases');
});

beforeEach(() => store.clear());

describe('update tokens', () => {
  it('stores only a hash and reads back the person and items', async () => {
    const { token, items } = await tokens.issueUpdateToken('alice', ['mcp/browse-hack']);
    assert.match(token, /^mmu_[\w-]{32}$/);
    assert.deepEqual(items, ['mcp/browse-hack']);
    assert.ok(![...store.keys()].some(key => key.includes(token)));
    const record = await tokens.readUpdateToken(token);
    assert.equal(record?.clientId, 'alice');
    assert.deepEqual(record?.items, ['mcp/browse-hack']);
  });

  it('adds items to the token already on the machine', async () => {
    const first = await tokens.issueUpdateToken('alice', ['mcp/browse-hack']);
    const second = await tokens.issueUpdateToken('alice', ['skill/lyric-video', 'mcp/browse-hack'], first.token);
    assert.equal(second.token, first.token);
    assert.deepEqual(second.items, ['mcp/browse-hack', 'skill/lyric-video']);
    assert.equal(store.size, 1);
  });

  it("never extends another person's token", async () => {
    const alice = await tokens.issueUpdateToken('alice', ['mcp/browse-hack']);
    const bob = await tokens.issueUpdateToken('bob', ['skill/lyric-video'], alice.token);
    assert.notEqual(bob.token, alice.token);
    assert.deepEqual(bob.items, ['skill/lyric-video']);
    assert.deepEqual((await tokens.readUpdateToken(alice.token))?.items, ['mcp/browse-hack']);
  });

  it('turns down lapsed, unknown and non-token values', async () => {
    const { token } = await tokens.issueUpdateToken('alice', ['mcp/browse-hack']);
    for (const entry of store.values()) entry.until = Date.now() - 1;
    assert.equal(await tokens.readUpdateToken(token), null);
    assert.equal(await tokens.readUpdateToken('mmu_unknown'), null);
    assert.equal(await tokens.readUpdateToken('mmi_install-code'), null);
    assert.equal(tokens.isUpdateToken('mmi_x'), false);
  });

  it('renews a token used after a day', async () => {
    const { token } = await tokens.issueUpdateToken('alice', ['mcp/browse-hack']);
    const [key] = store.keys();
    const old = JSON.parse(store.get(key)!.value);
    store.set(key, { value: JSON.stringify({ ...old, usedAt: '2026-01-01T00:00:00.000Z' }), until: Date.now() + 1000 });
    const record = await tokens.readUpdateToken(token);
    assert.notEqual(record?.usedAt, '2026-01-01T00:00:00.000Z');
    assert.ok(store.get(key)!.until! > Date.now() + 300 * 86_400_000);
  });
});

describe('release notes', () => {
  const changelog = [
    '# Changelog',
    '',
    '## 0.8.0 - 2026-11-02',
    '',
    '- Updates itself and the extension',
    '',
    '### Fixes',
    '- A fix',
    '',
    '## [0.7.0]',
    '- YouTube uploads',
    '',
    '## v0.6.0',
    '',
  ].join('\n');

  it("reads a version's section, sub-headings included", () => {
    assert.equal(releases.notesFromChangelog(changelog, '0.8.0'), '- Updates itself and the extension\n\n### Fixes\n- A fix');
    assert.equal(releases.notesFromChangelog(changelog, '0.7.0'), '- YouTube uploads');
  });

  it('has nothing for a missing or empty section', () => {
    assert.equal(releases.notesFromChangelog(changelog, '0.6.0'), undefined);
    assert.equal(releases.notesFromChangelog(changelog, '0.9.0'), undefined);
    assert.equal(releases.notesFromChangelog(changelog, '0.8'), undefined);
  });

  it('lists releases newest first', () => {
    const version = (v: string, notes?: string) => ({ version: v, storageKey: v, sha256: '', bytes: 0, publishedAt: `2026-11-0${v.at(-1)}`, notes });
    const list = releases.releasesOf([version('0.0.1'), version('0.0.2', ' Fixes \n'), version('0.0.3', 'New')], 2);
    assert.deepEqual(list, [
      { version: '0.0.3', publishedAt: '2026-11-03', notes: 'New' },
      { version: '0.0.2', publishedAt: '2026-11-02', notes: 'Fixes' },
    ]);
  });
});
