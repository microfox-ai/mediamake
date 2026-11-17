import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'crypto';

/**
 * GitHub for project spaces, from the site: with a project owner's say-so
 * ("Connect GitHub"), MediaMake makes the project's private repo and invites
 * or removes its members, so adding someone to a project is one step.
 *
 * It goes through MediaMake's own GitHub App, not the sign-in app. The App
 * has two repository permissions, Administration (write) and Metadata
 * (read), and none for contents: it can make a repo and say who is on it,
 * and cannot read or change a file. The owner installs it on their GitHub
 * account and authorizes it; the user token that gives is kept sealed
 * (./github-store), refreshed when it runs out, and used only by the calls
 * below. Set-up: docs/private-spaces.md, "The GitHub App".
 *
 *   GITHUB_APP_SLUG            the App's name in its URL (github.com/apps/<slug>)
 *   GITHUB_APP_CLIENT_ID       its client id
 *   GITHUB_APP_CLIENT_SECRET   a client secret of it
 */

export const STATE_COOKIE = 'github_app_state';

/** The repo name a project's space gets, the same as `mm space` gives it. */
export const projectRepoName = (projectName: string) =>
  `mediamake-${
    projectName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'project'
  }`;

/** GitHub's permission for a project role: the owner and editors push, viewers pull. */
export const permissionOf = (role: string): 'push' | 'pull' => (role === 'viewer' ? 'pull' : 'push');

/* ---------- the token at rest ---------- */

/**
 * The key tokens are sealed with: MEDIAMAKE_SECRETS_KEY when set, else one
 * derived from the App's client secret, so a copy of the database alone
 * opens nothing. Changing either means owners connect again.
 */
function sealKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const secret = env.MEDIAMAKE_SECRETS_KEY?.trim() || env.GITHUB_APP_CLIENT_SECRET?.trim();
  if (!secret) throw new Error('No secret to seal GitHub tokens with (GITHUB_APP_CLIENT_SECRET or MEDIAMAKE_SECRETS_KEY).');
  return Buffer.from(hkdfSync('sha256', secret, 'mediamake', 'github-grant-v1', 32));
}

/** AES-256-GCM: `v1.<iv>.<tag>.<data>`, base64url. */
export function seal(token: string, env: NodeJS.ProcessEnv = process.env): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKey(env), iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

/** The token back, or null when it was sealed with another key or changed. */
export function unseal(sealed: string, env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== 'v1' || !iv || !tag || !data) return null;
    const decipher = createDecipheriv('aes-256-gcm', sealKey(env), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** The round trip's state and PKCE verifier. */
export const newState = () => randomBytes(24).toString('base64url');
export const stateMatches = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && createHash('sha256').update(a).digest('hex') === createHash('sha256').update(b).digest('hex');
const challengeOf = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

/* ---------- the round trip ---------- */

const app = (env: NodeJS.ProcessEnv = process.env) => {
  const slug = env.GITHUB_APP_SLUG?.trim();
  const clientId = env.GITHUB_APP_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET?.trim();
  return slug && clientId && clientSecret && /^[A-Za-z0-9-]+$/.test(slug) ? { slug, clientId, clientSecret } : null;
};
/** Whether this site has its GitHub App. Without it the page offers only the line for the owner's computer. */
export const githubConfigured = (env: NodeJS.ProcessEnv = process.env) => app(env) !== null;

/** The App's callback URL and its setup URL: both are this one address. */
export const appCallbackUrl = (origin: string) => `${origin}/api/space/github/callback`;

/** Where the owner authorizes the App. */
export function appAuthorizeUrl({ origin, state, verifier, login }: { origin: string; state: string; verifier: string; login?: string }, env: NodeJS.ProcessEnv = process.env): string {
  const creds = app(env);
  if (!creds) throw new Error('The GitHub App is not set up');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', creds.clientId);
  url.searchParams.set('redirect_uri', appCallbackUrl(origin));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challengeOf(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  if (login) url.searchParams.set('login', login);
  return url.toString();
}

/** Where the owner installs the App on their GitHub account. */
export function appInstallUrl(env: NodeJS.ProcessEnv = process.env): string {
  const creds = app(env);
  if (!creds) throw new Error('The GitHub App is not set up');
  return `https://github.com/apps/${creds.slug}/installations/new`;
}

type Fetch = typeof fetch;

/** A user token of the App, with what refreshes it. GitHub gives no end and no refresh token when the App's tokens don't expire. */
export interface AppTokens {
  token: string;
  /** ISO time the token stops working. */
  expiresAt?: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
}

const inSeconds = (seconds: unknown, now: number) => (typeof seconds === 'number' && seconds > 0 ? new Date(now + seconds * 1000).toISOString() : undefined);

async function tokenRequest(params: Record<string, string>, fetcher: Fetch, env: NodeJS.ProcessEnv, now: number): Promise<AppTokens | null> {
  const creds = app(env);
  if (!creds) throw new Error('The GitHub App is not set up');
  const response = await fetcher('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ client_id: creds.clientId, client_secret: creds.clientSecret, ...params }),
  }).catch(() => null);
  const body = (await response?.json().catch(() => null)) as { access_token?: string; expires_in?: number; refresh_token?: string; refresh_token_expires_in?: number } | null;
  if (!response?.ok || !body?.access_token) return null;
  const expiresAt = inSeconds(body.expires_in, now);
  const refreshExpiresAt = inSeconds(body.refresh_token_expires_in, now);
  return { token: body.access_token, ...(expiresAt && { expiresAt }), ...(body.refresh_token && { refreshToken: body.refresh_token }), ...(refreshExpiresAt && { refreshExpiresAt }) };
}

/** Trades the callback's code for the owner's tokens, and says whose they are and whether the App is on that account. */
export async function appGrantFromCode(
  { origin, code, verifier }: { origin: string; code: string; verifier: string },
  fetcher: Fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): Promise<AppTokens & { id: string; login: string; installed: boolean }> {
  const tokens = await tokenRequest({ code, redirect_uri: appCallbackUrl(origin), code_verifier: verifier }, fetcher, env, now);
  if (!tokens) throw new Error('GitHub did not give a token');
  const call = github(tokens.token, fetcher);
  const me = await call('GET', '/user');
  if (!me.ok || me.body?.id === undefined || typeof me.body?.login !== 'string') throw new Error('GitHub did not say whose token this is');
  const installations = await call('GET', '/user/installations?per_page=100');
  const list = (Array.isArray(installations.body?.installations) ? installations.body.installations : []) as { account?: { id?: number } }[];
  // on the owner's own account: that is where a project's repo is made
  const installed = list.some(installation => String(installation.account?.id) === String(me.body!.id));
  return { ...tokens, id: String(me.body.id), login: me.body.login, installed };
}

/** A new token for one about to run out. Null when GitHub no longer takes the refresh token: the owner connects again. */
export const refreshTokens = (refreshToken: string, fetcher: Fetch = fetch, env: NodeJS.ProcessEnv = process.env, now = Date.now()): Promise<AppTokens | null> =>
  tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken }, fetcher, env, now);

/** Whether a token has to be refreshed before it is used: it ends within five minutes. */
export const needsRefresh = (tokens: Pick<AppTokens, 'expiresAt'>, now = Date.now()) => !!tokens.expiresAt && Date.parse(tokens.expiresAt) - now < 5 * 60 * 1000;

/** Takes the authorization back at GitHub, so its tokens stop working. The App stays installed until the owner removes it on GitHub. */
export async function revokeGrant(token: string, fetcher: Fetch = fetch, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const creds = app(env);
  if (!creds) return false;
  const response = await fetcher(`https://api.github.com/applications/${creds.clientId}/grant`, {
    method: 'DELETE',
    headers: {
      authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'mediamake-spaces',
    },
    body: JSON.stringify({ access_token: token }),
  }).catch(() => null);
  return !!response && (response.status === 204 || response.status === 404);
}

/* ---------- the calls ---------- */

interface Answer {
  ok: boolean;
  status: number;
  body: Record<string, unknown> | null;
}

/** One GitHub REST call with the owner's token. Never throws: the answer says how it went. */
export const github =
  (token: string, fetcher: Fetch = fetch) =>
  async (method: string, path: string, body?: unknown): Promise<Answer> => {
    try {
      const response = await fetcher(`https://api.github.com${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          'user-agent': 'mediamake-spaces',
          ...(body !== undefined && { 'content-type': 'application/json' }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
      const parsed = response.status === 204 ? null : ((await response.json().catch(() => null)) as Record<string, unknown> | null);
      return { ok: response.ok, status: response.status, body: parsed };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  };

const REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;

export type RepoResult = { repo: string; made: boolean } | { error: string; status: number };

/** The owner's private repo of that name: the one that exists, else a new one. A public one is refused. */
export async function ensurePrivateRepo(token: string, owner: string, name: string, description: string, fetcher: Fetch = fetch): Promise<RepoResult> {
  const call = github(token, fetcher);
  const repo = `${owner}/${name}`;
  if (!REPO.test(repo)) return { error: 'That is not a repo name', status: 400 };
  const have = await call('GET', `/repos/${repo}`);
  if (have.ok) return have.body?.private === true ? { repo, made: false } : { error: `${repo} is public: a space is private`, status: 409 };
  if (have.status !== 404) return { error: `GitHub could not be asked about ${repo}`, status: have.status };
  const made = await call('POST', '/user/repos', { name, private: true, description, has_issues: false, has_wiki: false });
  if (!made.ok) return { error: `GitHub could not make ${repo}`, status: made.status };
  return { repo, made: true };
}

export type InviteResult = 'invited' | 'already' | 'failed';

/** Invites a GitHub account to a repo, or changes what it may do there. */
export async function inviteCollaborator(token: string, repo: string, login: string, permission: 'push' | 'pull', fetcher: Fetch = fetch): Promise<InviteResult> {
  if (!REPO.test(repo) || !LOGIN.test(login)) return 'failed';
  const answer = await github(token, fetcher)('PUT', `/repos/${repo}/collaborators/${login}`, { permission });
  if (answer.status === 201) return 'invited';
  if (answer.status === 204) return 'already';
  return 'failed';
}

/** Takes a GitHub account off a repo, and takes back an invitation it has not accepted. */
export async function removeCollaborator(token: string, repo: string, login: string, fetcher: Fetch = fetch): Promise<boolean> {
  if (!REPO.test(repo) || !LOGIN.test(login)) return false;
  const call = github(token, fetcher);
  const removed = await call('DELETE', `/repos/${repo}/collaborators/${login}`);
  const pending = await call('GET', `/repos/${repo}/invitations?per_page=100`);
  const list = (Array.isArray(pending.body) ? pending.body : []) as { id?: number; invitee?: { login?: string } }[];
  const theirs = list.find(invitation => invitation.invitee?.login?.toLowerCase() === login.toLowerCase());
  const withdrawn = theirs?.id !== undefined ? (await call('DELETE', `/repos/${repo}/invitations/${theirs.id}`)).ok : false;
  return removed.ok || withdrawn;
}

/* ---------- what an add or a removal does on GitHub ---------- */

const APP_SETTINGS = 'github.com/settings/installations';

/** How it went on GitHub when someone was added to a project, for the page to say. */
export type GithubShare =
  | { state: 'invited' | 'already'; repo: string; login: string; madeRepo?: boolean }
  /** The owner has not connected GitHub: the page offers it, and the line for their computer. */
  | { state: 'not-connected' }
  /** The person has no GitHub account linked to MediaMake yet. */
  | { state: 'no-github'; repo?: string }
  /** The project's repo is under someone else's GitHub account: only they can invite. */
  | { state: 'other-owner'; repo: string; owner: string }
  | { state: 'failed'; repo?: string; reason: string };

export interface ShareInput {
  projectName: string;
  /** The repo the project's space has, when it has one. */
  repo?: string;
  /** The owner's grant, when they connected GitHub. */
  grant?: { login: string; token: string } | null;
  member: { githubLogin?: string; role: string };
}

/**
 * Invites a new member to the project's repo with the owner's grant, making
 * the repo when the project has none. `repoMade` is told the new repo's name
 * so the project's space can point at it.
 */
export async function shareOnGithub(input: ShareInput, repoMade: (repo: string) => Promise<void>, fetcher: Fetch = fetch): Promise<GithubShare> {
  const { grant, member } = input;
  if (!grant) return { state: 'not-connected' };
  let repo = input.repo;
  let madeRepo = false;
  if (repo && repo.split('/')[0].toLowerCase() !== grant.login.toLowerCase()) return { state: 'other-owner', repo, owner: repo.split('/')[0] };
  if (!repo) {
    const ensured = await ensurePrivateRepo(grant.token, grant.login, projectRepoName(input.projectName), `MediaMake space of the project ${input.projectName}`, fetcher);
    if ('error' in ensured) {
      const reason =
        ensured.status === 401
          ? 'GitHub no longer accepts the connection: connect GitHub again.'
          : ensured.status === 403 || ensured.status === 404
            ? `The MediaMake app on GitHub could not make the project's repo: check that it is installed on your account (${APP_SETTINGS}).`
            : ensured.error;
      return { state: 'failed', reason };
    }
    repo = ensured.repo;
    madeRepo = ensured.made;
    await repoMade(repo);
  }
  if (!member.githubLogin) return { state: 'no-github', repo };
  const result = await inviteCollaborator(grant.token, repo, member.githubLogin, permissionOf(member.role), fetcher);
  if (result === 'failed') return { state: 'failed', repo, reason: `GitHub did not accept the invitation for ${member.githubLogin}. If the MediaMake app on GitHub is limited to some repos, add ${repo} to them (${APP_SETTINGS}).` };
  return { state: result, repo, login: member.githubLogin, ...(madeRepo && { madeRepo }) };
}
