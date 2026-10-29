import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { parseUserAgent } from './device';

/**
 * Signed-in devices end to end: the real OAuth flow, CrudHash, middleware and
 * /api/devices, over an in-memory Redis that speaks Upstash's REST API (the
 * client calls fetch). Run: npx tsx --test lib/auth/devices.test.ts
 */

// ---- In-memory Upstash ----

const db = new Map<string, Map<string, string>>();
const ttl = new Map<string, number>();

function alive(key: string) {
  const until = ttl.get(key);
  if (until !== undefined && until <= Date.now()) {
    db.delete(key);
    ttl.delete(key);
  }
  return db.has(key);
}

const glob = (pattern: string) =>
  new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

function hset(key: string, args: string[]) {
  const hash = alive(key) ? db.get(key)! : new Map<string, string>();
  db.set(key, hash);
  for (let i = 0; i < args.length; i += 2) hash.set(args[i], args[i + 1]);
  return args.length / 2;
}

function run([name, ...raw]: unknown[]): unknown {
  const args = raw.map(String);
  switch (String(name).toLowerCase()) {
    case 'hset':
      return hset(args[0], args.slice(1));
    case 'hgetall':
      return alive(args[0]) ? [...db.get(args[0])!].flat() : [];
    case 'hget':
      return alive(args[0]) ? (db.get(args[0])!.get(args[1]) ?? null) : null;
    case 'exists':
      return args.filter(alive).length;
    case 'del':
      return args.filter(k => alive(k) && db.delete(k) && (ttl.delete(k) || true)).length;
    case 'expire':
      if (!alive(args[0])) return 0;
      ttl.set(args[0], Date.now() + Number(args[1]) * 1000);
      return 1;
    case 'scan': {
      const match = args.indexOf('match');
      const re = glob(match >= 0 ? args[match + 1] : '*');
      return ['0', [...db.keys()].filter(k => alive(k) && re.test(k))];
    }
    case 'eval': {
      // CrudHash.update: HSET only if the key exists.
      const [script, , key, ...argv] = args;
      assert.match(script, /EXISTS[\s\S]*HSET/);
      if (!alive(key)) return 0;
      hset(key, argv);
      return 1;
    }
    default:
      throw new Error(`fake upstash: ${String(name)} not implemented`);
  }
}

const encode = (v: unknown): unknown =>
  typeof v === 'string' ? (v === 'OK' ? v : Buffer.from(v).toString('base64')) : Array.isArray(v) ? v.map(encode) : v;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith('http://upstash.test')) return realFetch(input, init);
  const body = JSON.parse(String(init?.body));
  const base64 = new Headers(init?.headers).get('upstash-encoding') === 'base64';
  const reply = (result: unknown) => ({ result: base64 ? encode(result) : result });
  const out = url.endsWith('/pipeline') || url.endsWith('/multi-exec')
    ? (body as unknown[][]).map(c => reply(run(c)))
    : reply(run(body));
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

// ---- App modules, loaded once the Redis env points at the fake ----

process.env.UPSTASH_REDIS_REST_URL = 'http://upstash.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test';
delete process.env.DEV_API_KEY;

let oauth: typeof import('../mcp/oauth');
let devices: typeof import('./devices');
let middleware: typeof import('../../middleware').default;
let route: typeof import('../../app/api/devices/route');

before(async () => {
  oauth = await import('../mcp/oauth');
  devices = await import('./devices');
  middleware = (await import('../../middleware')).default;
  route = await import('../../app/api/devices/route');
});

beforeEach(() => {
  db.clear();
  ttl.clear();
  for (const [clientId, apiKey] of [['alice', 'key-alice'], ['bob', 'key-bob'], ['admin', 'key-admin']]) {
    hset(`apiKeys:${apiKey}`, ['id', apiKey, 'apiKey', apiKey, 'clientId', clientId, 'isValid', 'true']);
  }
  hset('user:admin', ['isAdmin', 'true']);
});

// ---- Helpers ----

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const device = { ...parseUserAgent(CHROME_MAC), location: 'Hyderabad, IN', userAgent: CHROME_MAC };
const VERIFIER = 'a'.repeat(43);

async function signIn(clientId: string, clientName = 'Browse Hack (Chrome extension)') {
  const { client } = await oauth.registerClient({ clientName, redirectUris: ['https://ext.example/cb'] });
  const pending = await oauth.saveAuthorizeRequest({
    oauthClientId: client.id,
    redirectUri: 'https://ext.example/cb',
    codeChallenge: oauth.pkceChallenge(VERIFIER),
    scope: oauth.SCOPE,
    clientId,
  });
  const code = await oauth.issueCode(pending, `key-${clientId}`);
  const tokens = await oauth.exchangeCode({ code, client, codeVerifier: VERIFIER, device });
  return { client, ...tokens };
}

/** What the middleware does with a call to /api/me. */
async function callApi(auth: { bearer?: string; cookie?: string }) {
  const headers = new Headers();
  if (auth.bearer) headers.set('authorization', `Bearer ${auth.bearer}`);
  if (auth.cookie) headers.set('cookie', `session_token=${auth.cookie}`);
  const res = await middleware(new NextRequest('https://mediamake.test/api/me', { headers }));
  return res.status === 200 && res.headers.get('x-middleware-next') === '1'
    ? res.headers.get('x-middleware-request-x-client-id')
    : res.status;
}

const list = async (clientId?: string) =>
  (await devices.findDevices(d => !clientId || d.clientId === clientId)).devices;

async function refreshFails(refreshToken: string, client: Awaited<ReturnType<typeof signIn>>['client']) {
  await assert.rejects(oauth.refreshTokens({ refreshToken, client, device }), { code: 'invalid_grant' });
}

function webLogin(token: string, session: Record<string, unknown>) {
  hset(
    `sessions:${token}`,
    Object.entries(session).flatMap(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
}

function apiRequest(method: string, clientId: string, body?: unknown, query = '', cookie?: string) {
  const headers = new Headers({ 'x-client-id': clientId, 'content-type': 'application/json' });
  if (cookie) headers.set('cookie', `session_token=${cookie}`);
  return new NextRequest(`https://mediamake.test/api/devices${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---- Tests ----

describe('parseUserAgent', () => {
  it('names browsers, systems and HTTP clients', () => {
    assert.deepEqual(parseUserAgent(CHROME_MAC), { browser: 'Chrome 131', os: 'macOS' });
    assert.deepEqual(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68',
      ),
      { browser: 'Edge 130', os: 'Windows' },
    );
    assert.deepEqual(
      parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      ),
      { browser: 'Safari 18', os: 'iOS' },
    );
    assert.deepEqual(parseUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0'), {
      browser: 'Firefox 132',
      os: 'Linux',
    });
    assert.deepEqual(parseUserAgent('python-httpx/0.27.2'), { browser: 'python-httpx 0.27', os: undefined });
  });
});

describe('app sign-ins', () => {
  it('lists one device per sign-in, kept across refreshes', async () => {
    const { client, refresh_token } = await signIn('alice');
    const [first] = await list();
    assert.equal(first.kind, 'app');
    assert.equal(first.name, 'Browse Hack (Chrome extension)');
    assert.equal(first.clientId, 'alice');
    assert.deepEqual(first.device, device);
    assert.ok(first.createdAt);

    await oauth.refreshTokens({ refreshToken: refresh_token, client, device });
    const after = await list();
    assert.equal(after.length, 1);
    assert.equal(after[0].id, first.id);
    assert.ok(after[0].lastUsedAt! >= first.lastUsedAt!);
  });

  it('revoke rejects every live token of the session at once', async () => {
    const { client, access_token, refresh_token } = await signIn('alice');
    const refreshed = await oauth.refreshTokens({ refreshToken: refresh_token, client, device });
    const other = await signIn('alice', 'Claude');

    // Both access tokens work: the first runs out its hour after the refresh.
    assert.equal(await callApi({ bearer: access_token }), 'alice');
    assert.equal(await callApi({ bearer: refreshed.access_token }), 'alice');

    const [extension] = (await list()).filter(d => d.name.startsWith('Browse Hack'));
    await (await devices.findDevices(d => d.id === extension.id)).revoke();

    assert.equal(await callApi({ bearer: access_token }), 401);
    assert.equal(await callApi({ bearer: refreshed.access_token }), 401);
    // The app's refresh fails, so it signs itself out; so does a retry with the rotated token.
    await refreshFails(refreshed.refresh_token, client);
    await refreshFails(refresh_token, client);
    // /mcp's lookup rejects it too.
    assert.equal(await oauth.resolveMcpCaller(refreshed.access_token), null);

    // The other app stays signed in.
    assert.equal(await callApi({ bearer: other.access_token }), 'alice');
    assert.deepEqual((await list()).map(d => d.name), ['Claude']);
  });

  it('a refresh that loses the race with a revoke gets nothing', async () => {
    const { client, refresh_token } = await signIn('alice');
    const [d] = await list();
    // Revoke lands after the refresh read its grant: the session is gone first.
    db.delete(`oauthSessions:${d.id.slice('app:'.length)}`);
    const accessBefore = [...db.keys()].filter(k => k.startsWith('oauthAccessTokens:')).length;
    await refreshFails(refresh_token, client);
    assert.equal([...db.keys()].filter(k => k.startsWith('oauthAccessTokens:')).length, accessBefore);
  });

  it('the app signing out (RFC 7009) ends its session', async () => {
    const { client, access_token, refresh_token } = await signIn('alice');
    await oauth.revokeToken(refresh_token, client);
    assert.equal(await callApi({ bearer: access_token }), 401);
    assert.deepEqual(await list(), []);
  });
});

describe('sign-ins from before sessions were tracked', () => {
  /** Tokens as the previous code stored them: no sessionId, no session. */
  async function legacySignIn(clientId: string) {
    const { client } = await oauth.registerClient({
      clientName: 'Browse Hack (Chrome extension)',
      redirectUris: ['https://ext.example/cb'],
    });
    const grant = (id: string, seconds: number) => [
      'id', id, 'oauthClientId', client.id, 'clientId', clientId, 'apiKey', `key-${clientId}`,
      'scope', oauth.SCOPE, 'expires', String(Date.now() + seconds * 1000),
    ];
    hset(`oauthAccessTokens:${oauth.sha256('old-access')}`, grant(oauth.sha256('old-access'), 3600));
    hset(`oauthRefreshTokens:${oauth.sha256('old-refresh')}`, grant(oauth.sha256('old-refresh'), 3600 * 24 * 29));
    return client;
  }

  it('lists them and revokes their tokens', async () => {
    await legacySignIn('alice');
    const [old] = await list();
    assert.equal(old.untracked, true);
    assert.equal(old.name, 'Browse Hack (Chrome extension)');
    assert.equal(await callApi({ bearer: 'old-access' }), 'alice');

    await (await devices.findDevices(d => d.id === old.id)).revoke();
    assert.equal(await callApi({ bearer: 'old-access' }), 401);
    assert.deepEqual(await list(), []);
  });

  it('their next refresh starts a session; revoking it also rejects the pre-session access token', async () => {
    const client = await legacySignIn('alice');
    const fresh = await oauth.refreshTokens({ refreshToken: 'old-refresh', client, device });
    const rows = await list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].untracked, undefined);
    assert.equal(rows[0].createdAt, undefined);

    await (await devices.findDevices(d => d.id === rows[0].id)).revoke();
    assert.equal(await callApi({ bearer: 'old-access' }), 401);
    assert.equal(await callApi({ bearer: fresh.access_token }), 401);
    await refreshFails('old-refresh', client);
  });
});

describe('website logins', () => {
  it('lists old and new logins, marks this browser, and revokes', async () => {
    webLogin('cookie-old', { clientId: 'alice', expires: Date.now() + 3600_000 });
    webLogin('cookie-new', { clientId: 'alice', expires: Date.now() + 7200_000, createdAt: Date.now(), device });
    assert.equal(await callApi({ cookie: 'cookie-old' }), 'alice');

    const { devices: rows } = await devices.findDevices(() => true, 'cookie-new');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].current, true);
    assert.deepEqual(rows[0].device, device);
    assert.equal(rows[1].untracked, true);
    // Ids never reveal the cookie.
    assert.ok(rows.every(r => !r.id.includes('cookie')));

    await (await devices.findDevices(d => d.id === rows[1].id)).revoke();
    assert.equal(await callApi({ cookie: 'cookie-old' }), 401);
    assert.equal(await callApi({ cookie: 'cookie-new' }), 'alice');
  });
});

describe('/api/devices', () => {
  it('shows people only their own devices and 404s on anyone else’s', async () => {
    await signIn('alice');
    const bob = await signIn('bob');
    const res = await route.GET(apiRequest('GET', 'alice', undefined, '?all=1'));
    const { isAdmin, devices: rows } = await res.json();
    assert.equal(isAdmin, false);
    assert.deepEqual(rows.map((d: { clientId: string }) => d.clientId), ['alice']);

    const [bobs] = await list('bob');
    assert.equal((await route.DELETE(apiRequest('DELETE', 'alice', { id: bobs.id }))).status, 404);
    assert.equal((await route.DELETE(apiRequest('DELETE', 'alice', { all: true, clientId: 'bob' }))).status, 404);
    assert.equal(await callApi({ bearer: bob.access_token }), 'bob');
  });

  it('lets admins see everyone, filter by user, and sign a user out everywhere', async () => {
    const a = await signIn('alice');
    const b1 = await signIn('bob');
    const b2 = await signIn('bob', 'Claude');
    webLogin('bob-cookie', { clientId: 'bob', expires: Date.now() + 3600_000 });

    const everyone = await (await route.GET(apiRequest('GET', 'admin', undefined, '?all=1'))).json();
    assert.equal(everyone.devices.length, 4);
    const bobs = await (await route.GET(apiRequest('GET', 'admin', undefined, '?clientId=bob'))).json();
    assert.equal(bobs.devices.length, 3);

    const res = await route.DELETE(apiRequest('DELETE', 'admin', { all: true, clientId: 'bob' }));
    assert.deepEqual(await res.json(), { revoked: 3 });
    assert.equal(await callApi({ bearer: b1.access_token }), 401);
    assert.equal(await callApi({ bearer: b2.access_token }), 401);
    assert.equal(await callApi({ cookie: 'bob-cookie' }), 401);
    assert.equal(await callApi({ bearer: a.access_token }), 'alice');
  });

  it('can sign out everywhere else, keeping this browser', async () => {
    const app = await signIn('alice');
    webLogin('here', { clientId: 'alice', expires: Date.now() + 3600_000 });
    webLogin('there', { clientId: 'alice', expires: Date.now() + 3600_000 });
    const res = await route.DELETE(apiRequest('DELETE', 'alice', { all: true, keepCurrent: true }, '', 'here'));
    assert.deepEqual(await res.json(), { revoked: 2 });
    assert.equal(await callApi({ cookie: 'here' }), 'alice');
    assert.equal(await callApi({ cookie: 'there' }), 401);
    assert.equal(await callApi({ bearer: app.access_token }), 401);
  });
});
