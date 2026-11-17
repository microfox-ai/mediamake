import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'crypto';

/**
 * GitHub for project spaces, from the site: with a project owner's say-so
 * ("Connect GitHub", the `repo` scope of the sign-in app), MediaMake makes
 * the project's private repo and invites or removes its members, so adding
 * someone to a project is one step. Nothing here reads a repo's files.
 *
 * The owner's token is kept encrypted (./github-store) and used only by the
 * calls below: make a private repo, add, change or remove a collaborator.
 * Sign-in itself keeps asking for the profile and email only.
 */

/** What the grant asks GitHub for: private repos (to make one and manage who is on it). */
export const REPO_SCOPE = 'repo';
export const STATE_COOKIE = 'github_repo_state';

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
 * derived from the sign-in app's client secret, so a copy of the database
 * alone opens nothing. Changing either means owners connect again.
 */
function sealKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const secret = env.MEDIAMAKE_SECRETS_KEY?.trim() || env.GITHUB_CLIENT_SECRET?.trim();
  if (!secret) throw new Error('No secret to seal GitHub tokens with (GITHUB_CLIENT_SECRET or MEDIAMAKE_SECRETS_KEY).');
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

/** A state value for the round trip that also carries where to go back to. */
export const newState = () => randomBytes(24).toString('base64url');
export const stateMatches = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && createHash('sha256').update(a).digest('hex') === createHash('sha256').update(b).digest('hex');

/* ---------- the round trip ---------- */

const credentials = (env: NodeJS.ProcessEnv = process.env) => {
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
};
export const githubConfigured = (env: NodeJS.ProcessEnv = process.env) => credentials(env) !== null;

/** Under the sign-in callback, so the same GitHub app accepts it with nothing to set up. */
export const repoCallbackUrl = (origin: string) => `${origin}/api/auth/github/callback/repos`;

export function repoAuthorizeUrl({ origin, state, login }: { origin: string; state: string; login?: string }, env: NodeJS.ProcessEnv = process.env): string {
  const creds = credentials(env);
  if (!creds) throw new Error('GitHub sign-in is not set up');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', creds.clientId);
  url.searchParams.set('redirect_uri', repoCallbackUrl(origin));
  url.searchParams.set('scope', `read:user ${REPO_SCOPE}`);
  url.searchParams.set('state', state);
  if (login) url.searchParams.set('login', login);
  return url.toString();
}

type Fetch = typeof fetch;

/** Trades the callback's code for a token, and says whose it is and what it may do. */
export async function repoGrantFromCode({ origin, code }: { origin: string; code: string }, fetcher: Fetch = fetch, env: NodeJS.ProcessEnv = process.env): Promise<{ token: string; scopes: string[]; id: string; login: string }> {
  const creds = credentials(env);
  if (!creds) throw new Error('GitHub sign-in is not set up');
  const response = await fetcher('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ client_id: creds.clientId, client_secret: creds.clientSecret, code, redirect_uri: repoCallbackUrl(origin) }),
  });
  const body = (await response.json().catch(() => null)) as { access_token?: string; scope?: string } | null;
  if (!response.ok || !body?.access_token) throw new Error('GitHub did not give a token');
  const scopes = (body.scope ?? '').split(/[ ,]+/).filter(Boolean);
  const me = await github(body.access_token, fetcher)('GET', '/user');
  if (!me.ok || me.body?.id === undefined || typeof me.body?.login !== 'string') throw new Error('GitHub did not say whose token this is');
  return { token: body.access_token, scopes, id: String(me.body.id), login: me.body.login };
}

/** Takes the grant back at GitHub, so the token stops working. */
export async function revokeGrant(token: string, fetcher: Fetch = fetch, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const creds = credentials(env);
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
    if ('error' in ensured) return { state: 'failed', reason: ensured.status === 401 ? 'GitHub no longer accepts the connection: connect GitHub again.' : ensured.error };
    repo = ensured.repo;
    madeRepo = ensured.made;
    await repoMade(repo);
  }
  if (!member.githubLogin) return { state: 'no-github', repo };
  const result = await inviteCollaborator(grant.token, repo, member.githubLogin, permissionOf(member.role), fetcher);
  if (result === 'failed') return { state: 'failed', repo, reason: `GitHub did not accept the invitation for ${member.githubLogin}.` };
  return { state: result, repo, login: member.githubLogin, ...(madeRepo && { madeRepo }) };
}
