import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { installFakeUpstash } from './testing/fake-upstash';
import type { User, UserStore } from './users';

/**
 * Sign-in end to end: the real routes, sessions and middleware, over an
 * in-memory Redis and user store, with Google, GitHub and Resend answered by
 * a fake fetch. Run: npx tsx --test lib/auth/accounts.test.ts
 */

// ---- Google, GitHub and Resend ----

interface Profile {
  id: string;
  email?: string;
  verified?: boolean;
  name?: string;
  login?: string;
}
/** What the provider answers for a code: `code-<key>` gives profiles[key]. */
const profiles: Record<string, Profile> = {};
const mails: { to: string; subject: string; text: string }[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const outside = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  const bearer = new Headers(init?.headers).get('authorization')?.split(' ')[1] ?? '';
  const profile = profiles[bearer.replace('token-', '')];
  if (url === 'https://oauth2.googleapis.com/token' || url === 'https://github.com/login/oauth/access_token') {
    const form = new URLSearchParams(String(init?.body));
    assert.ok(form.get('code_verifier'), 'the token exchange sends the PKCE verifier');
    assert.match(form.get('redirect_uri')!, /^https:\/\/mm\.test\/api\/auth\/(google|github)\/callback$/);
    const key = form.get('code')!.replace('code-', '');
    return profiles[key] ? json({ access_token: `token-${key}` }) : json({ error: 'bad_verification_code' });
  }
  if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
    return json({ sub: profile.id, email: profile.email, email_verified: profile.verified ?? true, name: profile.name });
  }
  if (url === 'https://api.github.com/user') {
    return json({ id: Number(profile.id), login: profile.login, name: profile.name, email: profile.email });
  }
  if (url === 'https://api.github.com/user/emails') {
    return json(profile.email ? [{ email: profile.email, primary: true, verified: profile.verified ?? true }] : []);
  }
  if (url === 'https://api.resend.com/emails') {
    const mail = JSON.parse(String(init?.body));
    assert.equal(mail.from, 'MediaMake <mediamake@reply-bots.com>');
    mails.push({ to: mail.to[0], subject: mail.subject, text: mail.text });
    return json({ id: 'mail' });
  }
  throw new Error(`unexpected fetch: ${url}`);
}) as typeof fetch;

const redis = installFakeUpstash(outside);

// ---- An in-memory user store ----

const users = new Map<string, User>();
const UNIQUE = ['email', 'googleId', 'githubId'] as const;

function conflictFor(Conflict: typeof import('./users').UserConflictError, candidate: Partial<User>, self?: string) {
  for (const field of UNIQUE) {
    const value = candidate[field];
    if (value && [...users.values()].some(u => u.clientId !== self && u[field] === value)) throw new Conflict(field);
  }
}

function memoryStore(Conflict: typeof import('./users').UserConflictError): UserStore {
  return {
    async findBy(field, value) {
      return structuredClone([...users.values()].find(u => u[field] === value) ?? null);
    },
    async list() {
      return structuredClone([...users.values()]);
    },
    async insert(user) {
      if (users.has(user.clientId)) throw new Conflict('clientId');
      conflictFor(Conflict, user);
      users.set(user.clientId, structuredClone(user));
    },
    async update(clientId, set, unset = []) {
      const user = users.get(clientId);
      if (!user) return null;
      conflictFor(Conflict, set, clientId);
      const next = { ...user, ...Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined)) } as User;
      for (const field of unset) delete next[field];
      users.set(clientId, next);
      return structuredClone(next);
    },
  };
}

// ---- App modules, loaded once the environment points at the fakes ----

process.env.MEDIAMAKE_PUBLIC_URL = 'https://mm.test';
process.env.RESEND_API_KEY = 'resend-test';
process.env.GOOGLE_CLIENT_ID = 'google-id';
process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
process.env.GITHUB_CLIENT_ID = 'github-id';
process.env.GITHUB_CLIENT_SECRET = 'github-secret';
delete process.env.DEV_API_KEY;
delete process.env.MAIL_FROM;

type Json = Record<string, unknown> & { clientId: string; redirectTo?: string; signedIn?: boolean; message?: string; account: unknown; providers: unknown };
type Handler = (req: NextRequest, ctx?: never) => Promise<Response>;
let accounts: typeof import('./accounts');
let middleware: typeof import('../../middleware').default;
const routes = {} as Record<
  'signup' | 'login' | 'verify' | 'forgot' | 'reset' | 'link' | 'account' | 'start' | 'callback' | 'accountGet' | 'adminGet' | 'adminPost' | 'oldLogin' | 'oldSignup',
  Handler
>;

before(async () => {
  const usersModule = await import('./users');
  usersModule.setUserStore(memoryStore(usersModule.UserConflictError));
  accounts = await import('./accounts');
  middleware = (await import('../../middleware')).default;
  routes.signup = (await import('../../app/api/auth/signup/route')).POST;
  routes.login = (await import('../../app/api/auth/login/route')).POST;
  routes.verify = (await import('../../app/api/auth/verify/route')).POST;
  routes.forgot = (await import('../../app/api/auth/password/forgot/route')).POST;
  routes.reset = (await import('../../app/api/auth/password/reset/route')).POST;
  routes.link = (await import('../../app/api/auth/link/route')).POST;
  const account = await import('../../app/api/auth/account/route');
  routes.account = account.POST;
  routes.accountGet = account.GET;
  routes.start = (await import('../../app/api/auth/[provider]/start/route')).GET as unknown as Handler;
  routes.callback = (await import('../../app/api/auth/[provider]/callback/route')).GET as unknown as Handler;
  const admin = await import('../../app/api/admin/users/route');
  routes.adminGet = admin.GET;
  routes.adminPost = admin.POST;
  routes.oldLogin = (await import('../../app/api/login/route')).POST as unknown as Handler;
  routes.oldSignup = (await import('../../app/api/signup/route')).POST as unknown as Handler;
});

let liveInvites: string[] = [];

beforeEach(() => {
  redis.clear();
  users.clear();
  mails.length = 0;
  for (const key of Object.keys(profiles)) delete profiles[key];
  liveInvites = [];
  accounts.authDeps.inviteIsLive = async code => liveInvites.includes(code);
  process.env.MEDIAMAKE_SIGNUP = 'open';
  // Accounts from before sign-in: a client id and a key, no user record.
  for (const [clientId, apiKey] of [['alice', 'key-alice'], ['bob', 'key-bob'], ['admin', 'key-admin']]) {
    redis.hset(`apiKeys:${apiKey}`, ['id', apiKey, 'apiKey', apiKey, 'clientId', clientId, 'clientName', clientId, 'isValid', 'true']);
  }
  redis.hset('user:admin', ['isAdmin', 'true']);
});

// ---- A browser ----

class Browser {
  cookies = new Map<string, string>();
  ip = `10.0.0.${Math.floor(Math.random() * 250) + 1}`;

  private request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    return new NextRequest(`https://mm.test${path}`, {
      method,
      headers: {
        host: 'mm.test',
        'x-forwarded-for': this.ip,
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
        ...(method === 'POST' ? { 'content-type': 'application/json', origin: 'https://mm.test' } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private keep(response: Response) {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, ...value] = pair.split('=');
      if (value.join('=') === '' || /max-age=0|expires=thu, 01 jan 1970/i.test(cookie)) this.cookies.delete(name);
      else this.cookies.set(name, value.join('='));
    }
    return response;
  }

  async post(route: Handler, path: string, body: unknown, headers?: Record<string, string>) {
    const response = this.keep(await route(this.request('POST', path, body, headers)));
    return { status: response.status, body: (await response.json().catch(() => ({}))) as Json };
  }

  async get(route: Handler, path: string, ctx?: unknown) {
    const response = this.keep(await route(this.request('GET', path), ctx as never));
    const location = response.headers.get('location') ?? undefined;
    return { status: response.status, location, body: (location ? {} : await response.json().catch(() => ({}))) as Json };
  }

  /** Who the middleware says this browser is on an API call. */
  async whoAmI(): Promise<string | null> {
    const response = await middleware(this.request('GET', '/api/me'));
    return response.status === 401 ? null : response.headers.get('x-middleware-request-x-client-id');
  }

  /** Continue with Google or GitHub, with the provider answering as `profile`. */
  async oauth(provider: 'google' | 'github', profile: Profile, query = '') {
    profiles[profile.id] = profile;
    const ctx = { params: Promise.resolve({ provider }) };
    const start = await this.get(routes.start, `/api/auth/${provider}/start${query}`, ctx);
    assert.equal(start.status, 307);
    const sent = new URL(start.location!);
    if (sent.host === 'mm.test') return { location: sent.pathname + sent.search, sent };
    assert.equal(sent.searchParams.get('code_challenge_method'), 'S256');
    const state = sent.searchParams.get('state')!;
    const back = await this.get(
      routes.callback,
      `/api/auth/${provider}/callback?code=code-${profile.id}&state=${encodeURIComponent(state)}`,
      ctx,
    );
    assert.equal(back.status, 307);
    const location = new URL(back.location!);
    return { location: location.pathname + location.search, sent };
  }
}

const linkIn = (mail: { text: string }) => {
  const url = new URL(mail.text.match(/https:\/\/mm\.test\/\S+/)![0]);
  return { path: url.pathname, token: url.searchParams.get('token')! };
};

async function signUp(browser: Browser, email: string, password = 'correct horse', name = 'Dana Doe', redirectTo?: string) {
  const asked = await browser.post(routes.signup, '/api/auth/signup', { email, password, name, redirectTo });
  assert.equal(asked.status, 200);
  const link = linkIn(mails.at(-1)!);
  assert.equal(link.path, '/login/verify');
  const confirmed = await browser.post(routes.verify, '/api/auth/verify', { token: link.token });
  assert.equal(confirmed.status, 200);
  return { clientId: (await browser.whoAmI())!, link, confirmed };
}

// ---- Tests ----

describe('email and password', () => {
  it('makes the account only once the mailed link is confirmed, with a key of its own', async () => {
    const browser = new Browser();
    const asked = await browser.post(routes.signup, '/api/auth/signup', {
      email: ' Dana@Example.com ',
      password: 'correct horse',
      name: 'Dana Doe',
    });
    assert.equal(asked.status, 200);
    assert.equal(users.size, 0);
    assert.equal(await browser.whoAmI(), null);
    assert.equal(mails.length, 1);
    assert.equal(mails[0].to, 'dana@example.com');

    const { token } = linkIn(mails[0]);
    assert.deepEqual(await accounts.describeVerification(token), { type: 'signup', email: 'dana@example.com' });
    const confirmed = await browser.post(routes.verify, '/api/auth/verify', { token });
    assert.equal(confirmed.body.signedIn, true);

    const [user] = [...users.values()];
    assert.match(user.clientId, /^dana-doe-[0-9a-f]{6}$/);
    assert.equal(user.email, 'dana@example.com');
    assert.ok(user.emailVerifiedAt);
    assert.match(user.passwordHash!, /^scrypt\$/);
    assert.equal(await browser.whoAmI(), user.clientId);
    // The MCP sign-in and the command line need a working key.
    const { apiKeyForClient } = await import('../mcp/oauth');
    assert.match((await apiKeyForClient(user.clientId))!, /^[0-9a-f]{32}$/);

    // The link works once.
    assert.equal((await new Browser().post(routes.verify, '/api/auth/verify', { token })).status, 410);
  });

  it('signs in with the password, and refuses a wrong one the same way as an unknown email', async () => {
    const { clientId } = await signUp(new Browser(), 'dana@example.com');
    const browser = new Browser();
    const wrong = await browser.post(routes.login, '/api/auth/login', { email: 'dana@example.com', password: 'nope nope' });
    const unknown = await browser.post(routes.login, '/api/auth/login', { email: 'nobody@example.com', password: 'nope nope' });
    assert.deepEqual([wrong.status, unknown.status], [401, 401]);
    assert.equal(wrong.body.message, unknown.body.message);
    assert.equal(await browser.whoAmI(), null);

    const ok = await browser.post(routes.login, '/api/auth/login', { email: 'DANA@example.com', password: 'correct horse' });
    assert.equal(ok.status, 200);
    assert.equal(await browser.whoAmI(), clientId);
  });

  it('stops password guessing after ten tries', async () => {
    await signUp(new Browser(), 'dana@example.com');
    const browser = new Browser();
    for (let i = 0; i < 10; i++) {
      assert.equal((await browser.post(routes.login, '/api/auth/login', { email: 'dana@example.com', password: `guess ${i}` })).status, 401);
    }
    const blocked = await browser.post(routes.login, '/api/auth/login', { email: 'dana@example.com', password: 'correct horse' });
    assert.equal(blocked.status, 429);
  });

  it('answers a sign-up for an address that has an account the same, and mails its owner instead', async () => {
    await signUp(new Browser(), 'dana@example.com');
    const again = await new Browser().post(routes.signup, '/api/auth/signup', {
      email: 'dana@example.com',
      password: 'another password',
      name: 'Mallory',
    });
    assert.equal(again.status, 200);
    assert.equal(users.size, 1);
    assert.equal(mails.at(-1)!.subject, 'You already have a MediaMake account');
    assert.equal(linkIn(mails.at(-1)!).path, '/login/reset');
  });

  it('rejects weak input before sending anything', async () => {
    const browser = new Browser();
    const post = (body: unknown) => browser.post(routes.signup, '/api/auth/signup', body);
    assert.equal((await post({ email: 'dana@example.com', password: 'short', name: 'Dana' })).status, 400);
    assert.equal((await post({ email: 'not-an-email', password: 'correct horse', name: 'Dana' })).status, 400);
    assert.equal((await post({ email: 'dana@example.com', password: 'correct horse', name: ' ' })).status, 400);
    assert.equal(mails.length, 0);
  });

  it('resets a password once, and signs the other browsers out', async () => {
    const old = new Browser();
    const { clientId } = await signUp(old, 'dana@example.com');
    const browser = new Browser();

    assert.equal((await browser.post(routes.forgot, '/api/auth/password/forgot', { email: 'nobody@example.com' })).status, 200);
    assert.equal(mails.length, 1, 'no mail for an address without an account');

    assert.equal((await browser.post(routes.forgot, '/api/auth/password/forgot', { email: 'dana@example.com' })).status, 200);
    const { path, token } = linkIn(mails.at(-1)!);
    assert.equal(path, '/login/reset');

    // A password that's too short doesn't use the link up.
    assert.equal((await browser.post(routes.reset, '/api/auth/password/reset', { token, password: 'short' })).status, 400);
    assert.equal((await browser.post(routes.reset, '/api/auth/password/reset', { token, password: 'a new password' })).status, 200);
    assert.equal(await browser.whoAmI(), clientId);
    assert.equal(await old.whoAmI(), null);
    assert.equal((await browser.post(routes.reset, '/api/auth/password/reset', { token, password: 'yet another one' })).status, 410);

    const fresh = new Browser();
    assert.equal((await fresh.post(routes.login, '/api/auth/login', { email: 'dana@example.com', password: 'correct horse' })).status, 401);
    assert.equal((await fresh.post(routes.login, '/api/auth/login', { email: 'dana@example.com', password: 'a new password' })).status, 200);
  });

  it('lets mailed links lapse', async () => {
    const browser = new Browser();
    await browser.post(routes.signup, '/api/auth/signup', { email: 'dana@example.com', password: 'correct horse', name: 'Dana' });
    redis.expireAll();
    assert.equal((await browser.post(routes.verify, '/api/auth/verify', { token: linkIn(mails[0]).token })).status, 410);
    assert.equal(users.size, 0);
  });
});

describe('invite-only sign-up', () => {
  beforeEach(() => {
    delete process.env.MEDIAMAKE_SIGNUP;
    liveInvites = ['INVITE1'];
  });

  it('refuses a new account without a live invite, by mail or by Google', async () => {
    const browser = new Browser();
    const body = { email: 'dana@example.com', password: 'correct horse', name: 'Dana' };
    assert.equal((await browser.post(routes.signup, '/api/auth/signup', body)).status, 403);
    assert.equal((await browser.post(routes.signup, '/api/auth/signup', { ...body, redirectTo: '/access?code=WRONG' })).status, 403);
    assert.equal(mails.length, 0);

    const { location } = await browser.oauth('google', { id: 'g-1', email: 'dana@example.com' });
    assert.equal(location, '/login/link');
    assert.equal((await accounts.describePending(browser.cookies.get('pending_identity')))!.maySignUp, false);
    assert.equal((await browser.post(routes.link, '/api/auth/link', { create: true })).status, 403);
    assert.equal(users.size, 0);
  });

  it('makes one for someone who came from an invite link, and sends them back to it', async () => {
    const invite = '/access?code=INVITE1';
    const mail = await signUp(new Browser(), 'dana@example.com', 'correct horse', 'Dana', invite);
    assert.equal(mail.confirmed.body.redirectTo, invite);

    const browser = new Browser();
    const { location } = await browser.oauth('github', { id: '77', login: 'erin', email: 'erin@example.com' }, `?redirectTo=${encodeURIComponent(invite)}`);
    assert.equal(location, `/login/link?redirectTo=${encodeURIComponent(invite)}`);
    const made = await browser.post(routes.link, '/api/auth/link', { create: true });
    assert.equal(made.status, 200);
    assert.equal(made.body.redirectTo, invite);
    assert.equal(users.get(made.body.clientId)!.githubLogin, 'erin');
  });

  it('still signs existing accounts in', async () => {
    process.env.MEDIAMAKE_SIGNUP = 'open';
    const { clientId } = await signUp(new Browser(), 'dana@example.com');
    delete process.env.MEDIAMAKE_SIGNUP;
    const browser = new Browser();
    assert.equal((await browser.post(routes.login, '/api/auth/login', { email: 'dana@example.com', password: 'correct horse' })).status, 200);
    assert.equal(await browser.whoAmI(), clientId);
  });

  it('has retired the old route that gave anyone a key', async () => {
    const response = await new Browser().post(routes.oldSignup, '/api/signup', { clientId: 'mallory', clientName: 'Mallory' });
    assert.equal(response.status, 410);
    assert.deepEqual(redis.keys('apiKeys:*').sort(), ['apiKeys:key-admin', 'apiKeys:key-alice', 'apiKeys:key-bob']);
  });
});

describe('Google and GitHub', () => {
  it('makes a new account after asking, then signs straight in the next time', async () => {
    const browser = new Browser();
    const first = await browser.oauth('google', { id: 'g-1', email: 'Dana@Example.com', name: 'Dana Doe' }, '?redirectTo=%2Fapps');
    assert.equal(first.sent.origin + first.sent.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(first.sent.searchParams.get('redirect_uri'), 'https://mm.test/api/auth/google/callback');
    assert.equal(first.location, '/login/link?redirectTo=%2Fapps');
    assert.equal(await browser.whoAmI(), null);
    assert.deepEqual(await accounts.describePending(browser.cookies.get('pending_identity')), {
      provider: 'google',
      label: 'dana@example.com',
      redirectTo: '/apps',
      maySignUp: true,
    });

    const made = await browser.post(routes.link, '/api/auth/link', { create: true });
    assert.equal(made.status, 200);
    assert.equal(made.body.redirectTo, '/apps');
    const user = users.get(made.body.clientId)!;
    assert.equal(user.googleId, 'g-1');
    assert.equal(user.email, 'dana@example.com');
    assert.equal(user.passwordHash, undefined);
    assert.equal(await browser.whoAmI(), user.clientId);
    assert.equal(browser.cookies.has('pending_identity'), false);

    const again = new Browser();
    assert.equal((await again.oauth('google', { id: 'g-1', email: 'dana@example.com' }, '?redirectTo=%2Fapps')).location, '/apps');
    assert.equal(await again.whoAmI(), user.clientId);
    assert.equal(users.size, 1);
  });

  it('links an old account to the person who proves its client id and key', async () => {
    const browser = new Browser();
    await browser.oauth('google', { id: 'g-alice', email: 'alice@example.com', name: 'Alice A' });

    const wrong = await browser.post(routes.link, '/api/auth/link', { clientId: 'alice', clientKey: 'key-bob' });
    assert.equal(wrong.status, 401);
    assert.equal(users.size, 0);

    const linked = await browser.post(routes.link, '/api/auth/link', { clientId: 'alice', clientKey: 'key-alice' });
    assert.equal(linked.status, 200);
    assert.equal(await browser.whoAmI(), 'alice');
    const user = users.get('alice')!;
    assert.deepEqual([user.googleId, user.email, user.name], ['g-alice', 'alice@example.com', 'alice']);
    // The pending identity is used up.
    assert.equal((await browser.post(routes.link, '/api/auth/link', { clientId: 'bob', clientKey: 'key-bob' })).status, 410);

    // The key still signs in on Core's form, as the same account.
    const core = new Browser();
    assert.equal((await core.post(routes.oldLogin, '/api/login', { clientId: 'alice', clientKey: 'key-alice' })).status, 200);
    assert.equal(await core.whoAmI(), 'alice');

    const next = new Browser();
    assert.equal((await next.oauth('google', { id: 'g-alice', email: 'alice@example.com' })).location, '/');
    assert.equal(await next.whoAmI(), 'alice');
  });

  it('adds a provider to the account that already has its verified email', async () => {
    const { clientId } = await signUp(new Browser(), 'dana@example.com');
    const browser = new Browser();
    assert.equal((await browser.oauth('github', { id: '42', login: 'dana', email: 'dana@example.com' })).location, '/');
    assert.equal(await browser.whoAmI(), clientId);
    const user = users.get(clientId)!;
    assert.deepEqual([user.githubId, user.githubLogin], ['42', 'dana']);
    assert.match(user.passwordHash!, /^scrypt\$/);
  });

  it('never matches an account by an email the provider has not verified', async () => {
    await signUp(new Browser(), 'dana@example.com');
    for (const provider of ['google', 'github'] as const) {
      const browser = new Browser();
      const { location } = await browser.oauth(provider, { id: '900', login: 'mallory', email: 'dana@example.com', verified: false });
      assert.equal(location, '/login/link');
      assert.equal(await browser.whoAmI(), null);
    }
  });

  it('only accepts the answer in the browser that asked, once', async () => {
    profiles['g-1'] = { id: 'g-1', email: 'dana@example.com' };
    const ctx = { params: Promise.resolve({ provider: 'google' }) };
    const asker = new Browser();
    const start = await asker.get(routes.start, '/api/auth/google/start', ctx);
    const state = new URL(start.location!).searchParams.get('state')!;
    const callback = `/api/auth/google/callback?code=code-g-1&state=${encodeURIComponent(state)}`;

    const thief = await new Browser().get(routes.callback, callback, ctx);
    assert.match(thief.location!, /^https:\/\/mm\.test\/login\?error=/);

    assert.equal(new URL((await asker.get(routes.callback, callback, ctx)).location!).pathname, '/login/link');
    asker.cookies.set('oauth_state', state);
    assert.match((await asker.get(routes.callback, callback, ctx)).location!, /\/login\?error=/);

    const wrongProvider = new Browser();
    const github = await wrongProvider.get(routes.start, '/api/auth/github/start', { params: Promise.resolve({ provider: 'github' }) });
    const githubState = new URL(github.location!).searchParams.get('state')!;
    const crossed = await wrongProvider.get(routes.callback, `/api/auth/google/callback?code=code-g-1&state=${encodeURIComponent(githubState)}`, ctx);
    assert.match(crossed.location!, /\/login\?error=/);
  });

  it('says so when a provider is not set up', async () => {
    const saved = process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_SECRET;
    try {
      const { location } = await new Browser().oauth('github', { id: '1' });
      assert.match(decodeURIComponent(location), /^\/login\?error=GitHub sign-in is not set up yet\./);
    } finally {
      process.env.GITHUB_CLIENT_SECRET = saved;
    }
    const unknown = await new Browser().get(routes.start, '/api/auth/gitlab/start', { params: Promise.resolve({ provider: 'gitlab' }) });
    assert.equal(unknown.status, 404);
  });

  it('never sends the browser to another site after signing in', async () => {
    await signUp(new Browser(), 'dana@example.com');
    for (const target of ['https://evil.example/x', '//evil.example/x', '/\\evil.example']) {
      const { location } = await new Browser().oauth('google', { id: 'g-1', email: 'dana@example.com' }, `?redirectTo=${encodeURIComponent(target)}`);
      assert.equal(location, '/');
    }
  });
});

describe('a signed-in person’s sign-in methods', () => {
  async function core(clientId: string) {
    const browser = new Browser();
    assert.equal((await browser.post(routes.oldLogin, '/api/login', { clientId, clientKey: `key-${clientId}` })).status, 200);
    return browser;
  }

  it('lets an old account add Google, an email and a password after signing in with its key', async () => {
    const browser = await core('bob');
    const before = await browser.get(routes.accountGet, '/api/auth/account');
    assert.deepEqual(before.body.account, { clientId: 'bob', methods: { password: false, google: false, github: false } });
    assert.deepEqual(before.body.providers, { google: true, github: true });

    const { location } = await browser.oauth('google', { id: 'g-bob', email: 'bob@example.com' }, '?connect=1');
    assert.equal(location, '/core/api-keys?connected=google');
    assert.deepEqual([users.get('bob')!.googleId, users.get('bob')!.email], ['g-bob', 'bob@example.com']);

    // A password needs an email, which Google gave; a second address goes through a mailed link.
    assert.equal((await browser.post(routes.account, '/api/auth/account', { action: 'password', password: 'bob password' })).status, 200);
    assert.equal((await browser.post(routes.account, '/api/auth/account', { action: 'email', email: 'robert@example.com' })).status, 200);
    assert.equal(users.get('bob')!.email, 'bob@example.com');
    const { token } = linkIn(mails.at(-1)!);
    assert.deepEqual(await accounts.describeVerification(token), { type: 'email', email: 'robert@example.com' });
    const stranger = new Browser();
    const confirmed = await stranger.post(routes.verify, '/api/auth/verify', { token });
    assert.equal(confirmed.body.signedIn, false);
    assert.equal(await stranger.whoAmI(), null, 'confirming an added address signs nobody in');
    assert.equal(users.get('bob')!.email, 'robert@example.com');

    const fresh = new Browser();
    assert.equal((await fresh.post(routes.login, '/api/auth/login', { email: 'robert@example.com', password: 'bob password' })).status, 200);
    assert.equal(await fresh.whoAmI(), 'bob');
  });

  it('needs the current password to change one, and an email to set one', async () => {
    const bob = await core('bob');
    const noEmail = await bob.post(routes.account, '/api/auth/account', { action: 'password', password: 'bob password' });
    assert.equal(noEmail.status, 400);

    const dana = new Browser();
    await signUp(dana, 'dana@example.com');
    const post = (body: object) => dana.post(routes.account, '/api/auth/account', { action: 'password', ...body });
    assert.equal((await post({ password: 'changed password' })).status, 401);
    assert.equal((await post({ password: 'changed password', currentPassword: 'wrong' })).status, 401);
    assert.equal((await post({ password: 'changed password', currentPassword: 'correct horse' })).status, 200);
  });

  it('will not link an identity that belongs to another account, nor replace a linked one', async () => {
    const alice = await core('alice');
    await alice.oauth('google', { id: 'g-alice' }, '?connect=1');
    const bob = await core('bob');
    const taken = await bob.oauth('google', { id: 'g-alice' }, '?connect=1');
    assert.match(decodeURIComponent(taken.location), /^\/core\/api-keys\?error=That Google account is already linked to another MediaMake account\./);
    assert.equal(users.get('bob')?.googleId, undefined);

    const second = await alice.oauth('google', { id: 'g-other' }, '?connect=1');
    assert.match(decodeURIComponent(second.location), /already linked to another Google account/);
    assert.equal(users.get('alice')!.googleId, 'g-alice');
  });

  it('keeps one way to sign in on /login when removing a provider', async () => {
    const browser = new Browser();
    await browser.oauth('google', { id: 'g-1', email: 'dana@example.com' });
    const { body } = await browser.post(routes.link, '/api/auth/link', { create: true });
    const unlink = () => browser.post(routes.account, '/api/auth/account', { action: 'unlink', provider: 'google' });
    assert.equal((await unlink()).status, 400);
    await browser.post(routes.account, '/api/auth/account', { action: 'password', password: 'dana password' });
    assert.equal((await unlink()).status, 200);
    assert.equal(users.get(body.clientId)!.googleId, undefined);
  });

  it('refuses signed-out and cross-site requests', async () => {
    assert.equal((await new Browser().get(routes.accountGet, '/api/auth/account')).status, 401);
    assert.equal((await new Browser().post(routes.account, '/api/auth/account', { action: 'name', name: 'X' })).status, 401);
    const bob = await core('bob');
    const forged = await bob.post(routes.account, '/api/auth/account', { action: 'name', name: 'X' }, { origin: 'https://evil.example' });
    assert.equal(forged.status, 403);
    assert.equal((await bob.oauth('google', { id: 'g-1' }, '?connect=1')).location.startsWith('/core/api-keys?connected'), true);
    const signedOut = await new Browser().get(routes.start, '/api/auth/google/start?connect=1', { params: Promise.resolve({ provider: 'google' }) });
    assert.equal(new URL(signedOut.location!).pathname, '/login');
  });
});

describe('admins', () => {
  const asClient = (clientId: string, method: 'GET' | 'POST', body?: unknown) =>
    new NextRequest('https://mm.test/api/admin/users', {
      method,
      headers: { 'x-client-id': clientId, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('link an old account to a person’s email, who then signs in with Google or a new password', async () => {
    assert.equal((await routes.adminPost(asClient('bob', 'POST', { clientId: 'alice', email: 'a@example.com' }))).status, 403);
    assert.equal((await routes.adminPost(asClient('admin', 'POST', { clientId: 'nobody', email: 'a@example.com' }))).status, 404);

    const linked = await routes.adminPost(asClient('admin', 'POST', { clientId: 'alice', email: 'Alice@Example.com' }));
    assert.equal(linked.status, 200);
    assert.equal(users.get('alice')!.email, 'alice@example.com');
    assert.equal((await routes.adminPost(asClient('admin', 'POST', { clientId: 'bob', email: 'alice@example.com' }))).status, 409);

    const google = new Browser();
    assert.equal((await google.oauth('google', { id: 'g-alice', email: 'alice@example.com' })).location, '/');
    assert.equal(await google.whoAmI(), 'alice');

    const browser = new Browser();
    await browser.post(routes.forgot, '/api/auth/password/forgot', { email: 'alice@example.com' });
    await browser.post(routes.reset, '/api/auth/password/reset', { token: linkIn(mails.at(-1)!).token, password: 'alice password' });
    assert.equal(await browser.whoAmI(), 'alice');
  });

  it('see every account, linked or not, without password hashes', async () => {
    await signUp(new Browser(), 'dana@example.com');
    assert.equal((await routes.adminGet(asClient('bob', 'GET'))).status, 403);
    const { accounts: rows } = await (await routes.adminGet(asClient('admin', 'GET'))).json();
    assert.equal(JSON.stringify(rows).includes('scrypt'), false);
    assert.deepEqual(
      (rows as { clientId: string; linked: boolean; methods: { password: boolean } }[]).map(r => [r.clientId.replace(/-[0-9a-f]{6}$/, ''), r.linked, r.methods.password]).sort(),
      [['admin', false, false], ['alice', false, false], ['bob', false, false], ['dana-doe', true, true]],
    );
  });
});

describe('redirects', () => {
  it('reads the invite code from an invite link’s address only', async () => {
    const { inviteCodeFrom, safeRedirect, withRedirect } = await import('./redirect');
    assert.equal(inviteCodeFrom('/access?code=ABC&item=skill%2Fx'), 'ABC');
    assert.equal(inviteCodeFrom('/apps?code=ABC'), undefined);
    assert.equal(inviteCodeFrom(undefined), undefined);
    assert.equal(safeRedirect('/oauth/authorize?client_id=x'), '/oauth/authorize?client_id=x');
    assert.equal(safeRedirect('https://evil.example', '/'), '/');
    assert.equal(withRedirect('/signup', '/access?code=ABC'), '/signup?redirectTo=%2Faccess%3Fcode%3DABC');
    assert.equal(withRedirect('/signup', '//evil.example'), '/signup');
  });
});
