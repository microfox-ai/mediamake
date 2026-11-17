import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ensurePrivateRepo, inviteCollaborator, permissionOf, projectRepoName, removeCollaborator, repoAuthorizeUrl, repoGrantFromCode, seal, shareOnGithub, stateMatches, unseal } from './github';

const env = { GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' } as unknown as NodeJS.ProcessEnv;

/** A stand-in GitHub: private repos, their collaborators and pending invitations. */
function hub(start: Record<string, { private: boolean; collaborators?: string[]; invitations?: string[] }> = {}) {
  const repos = new Map(Object.entries(start).map(([name, r]) => [name, { private: r.private, collaborators: r.collaborators ?? [], invitations: r.invitations ?? [] }]));
  const calls: string[] = [];
  const answer = (status: number, body?: unknown) => new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status });
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const path = url.pathname;
    calls.push(`${method} ${path}`);
    const auth = new Headers(init?.headers).get('authorization');
    if (url.host === 'github.com') return answer(200, { access_token: 'gho_new', scope: 'read:user,repo' });
    if (auth !== 'Bearer gho_ok' && auth !== 'Bearer gho_new') return answer(401, { message: 'Bad credentials' });
    if (path === '/user' && method === 'GET') return answer(200, { id: 42, login: 'asha' });
    if (path === '/user/repos' && method === 'POST') {
      const { name, private: isPrivate } = JSON.parse(String(init?.body));
      repos.set(`asha/${name}`, { private: isPrivate, collaborators: [], invitations: [] });
      return answer(201, { full_name: `asha/${name}` });
    }
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/repos\/([^/]+\/[^/]+)$/))) return repos.has(m[1]) ? answer(200, { private: repos.get(m[1])!.private }) : answer(404);
    if ((m = path.match(/^\/repos\/([^/]+\/[^/]+)\/collaborators\/([^/]+)$/))) {
      const repo = repos.get(m[1]);
      if (!repo) return answer(404);
      if (method === 'PUT') {
        if (repo.collaborators.includes(m[2])) return answer(204);
        if (!repo.invitations.includes(m[2])) repo.invitations.push(m[2]);
        return answer(201, {});
      }
      if (method === 'DELETE') {
        const had = repo.collaborators.includes(m[2]);
        repo.collaborators = repo.collaborators.filter(login => login !== m![2]);
        return answer(had ? 204 : 404);
      }
    }
    if ((m = path.match(/^\/repos\/([^/]+\/[^/]+)\/invitations$/))) return answer(200, (repos.get(m[1])?.invitations ?? []).map((login, id) => ({ id, invitee: { login } })));
    if ((m = path.match(/^\/repos\/([^/]+\/[^/]+)\/invitations\/(\d+)$/)) && method === 'DELETE') {
      repos.get(m[1])!.invitations.splice(Number(m[2]), 1);
      return answer(204);
    }
    return answer(404);
  }) as typeof fetch;
  return { repos, calls, fetcher };
}

describe('the token at rest', () => {
  it('comes back only with the key it was sealed with, and never sits in the clear', () => {
    const sealed = seal('gho_secret', env);
    assert.ok(!sealed.includes('gho_secret'));
    assert.notEqual(seal('gho_secret', env), sealed, 'a new iv each time');
    assert.equal(unseal(sealed, env), 'gho_secret');
    assert.equal(unseal(sealed, { ...env, GITHUB_CLIENT_SECRET: 'rotated' }), null);
    assert.equal(unseal(sealed.slice(0, -2) + 'xx', env), null);
    assert.equal(unseal('nonsense', env), null);
    assert.equal(unseal(seal('t', { ...env, MEDIAMAKE_SECRETS_KEY: 'own' }), { ...env, MEDIAMAKE_SECRETS_KEY: 'own', GITHUB_CLIENT_SECRET: 'rotated' }), 't');
  });
});

describe('connecting', () => {
  it('asks for private repos, under the sign-in callback', () => {
    const url = new URL(repoAuthorizeUrl({ origin: 'https://mm.test', state: 's', login: 'asha' }, env));
    assert.equal(url.searchParams.get('scope'), 'read:user repo');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://mm.test/api/auth/github/callback/repos');
    assert.equal(url.searchParams.get('login'), 'asha');
    assert.ok(stateMatches('s', 's') && !stateMatches('s', 't') && !stateMatches(undefined, undefined));
  });

  it('says whose token it got and what it may do', async () => {
    const grant = await repoGrantFromCode({ origin: 'https://mm.test', code: 'c' }, hub().fetcher, env);
    assert.deepEqual(grant, { token: 'gho_new', scopes: ['read:user', 'repo'], id: '42', login: 'asha' });
  });
});

describe('repos and collaborators', () => {
  it('names a project\'s repo as mm space does, and maps roles', () => {
    assert.equal(projectRepoName('Anime Music Zone!'), 'mediamake-anime-music-zone');
    assert.equal(projectRepoName('🎬'), 'mediamake-project');
    assert.deepEqual([permissionOf('owner'), permissionOf('editor'), permissionOf('viewer')], ['push', 'push', 'pull']);
  });

  it('makes a private repo once, takes the one that exists, and refuses a public one', async () => {
    const h = hub({ 'asha/open': { private: false } });
    assert.deepEqual(await ensurePrivateRepo('gho_ok', 'asha', 'mediamake-zone', 'd', h.fetcher), { repo: 'asha/mediamake-zone', made: true });
    assert.equal(h.repos.get('asha/mediamake-zone')!.private, true);
    assert.deepEqual(await ensurePrivateRepo('gho_ok', 'asha', 'mediamake-zone', 'd', h.fetcher), { repo: 'asha/mediamake-zone', made: false });
    assert.ok('error' in (await ensurePrivateRepo('gho_ok', 'asha', 'open', 'd', h.fetcher)));
    assert.ok('error' in (await ensurePrivateRepo('gho_ok', 'asha', '../x', 'd', h.fetcher)));
  });

  it('invites, says when someone is on it already, and removes a member or a pending invitation', async () => {
    const h = hub({ 'asha/zone': { private: true, collaborators: ['ravi'] } });
    assert.equal(await inviteCollaborator('gho_ok', 'asha/zone', 'meera', 'push', h.fetcher), 'invited');
    assert.equal(await inviteCollaborator('gho_ok', 'asha/zone', 'ravi', 'pull', h.fetcher), 'already');
    assert.equal(await inviteCollaborator('gho_bad', 'asha/zone', 'meera', 'push', h.fetcher), 'failed');
    assert.equal(await inviteCollaborator('gho_ok', 'asha/zone', 'me/../x', 'push', h.fetcher), 'failed');
    assert.equal(await removeCollaborator('gho_ok', 'asha/zone', 'ravi', h.fetcher), true);
    assert.equal(await removeCollaborator('gho_ok', 'asha/zone', 'meera', h.fetcher), true);
    assert.deepEqual(h.repos.get('asha/zone'), { private: true, collaborators: [], invitations: [] });
    assert.equal(await removeCollaborator('gho_ok', 'asha/zone', 'nobody', h.fetcher), false);
  });
});

describe('adding someone to a project', () => {
  const grant = { login: 'asha', token: 'gho_ok' };

  it('does nothing on GitHub until the owner connected it', async () => {
    const h = hub();
    assert.deepEqual(await shareOnGithub({ projectName: 'Zone', grant: null, member: { githubLogin: 'meera', role: 'editor' } }, async () => assert.fail(), h.fetcher), { state: 'not-connected' });
    assert.deepEqual(h.calls, []);
  });

  it('makes the project\'s repo when there is none, records it, and invites the member', async () => {
    const h = hub();
    const made: string[] = [];
    const result = await shareOnGithub({ projectName: 'Anime Music Zone', grant, member: { githubLogin: 'meera', role: 'viewer' } }, async repo => void made.push(repo), h.fetcher);
    assert.deepEqual(result, { state: 'invited', repo: 'asha/mediamake-anime-music-zone', login: 'meera', madeRepo: true });
    assert.deepEqual(made, ['asha/mediamake-anime-music-zone']);
    assert.deepEqual(h.repos.get('asha/mediamake-anime-music-zone')!.invitations, ['meera']);
  });

  it('invites to the repo the project has, and makes none', async () => {
    const h = hub({ 'asha/mediamake-zone': { private: true } });
    const result = await shareOnGithub({ projectName: 'Zone', repo: 'asha/mediamake-zone', grant, member: { githubLogin: 'meera', role: 'editor' } }, async () => assert.fail(), h.fetcher);
    assert.deepEqual(result, { state: 'invited', repo: 'asha/mediamake-zone', login: 'meera' });
    assert.ok(!h.calls.includes('POST /user/repos'));
  });

  it('says so when the member has no GitHub account, the repo is someone else\'s, or the connection was taken back', async () => {
    const h = hub({ 'asha/mediamake-zone': { private: true }, 'ravi/mediamake-zone': { private: true } });
    assert.deepEqual(await shareOnGithub({ projectName: 'Zone', repo: 'asha/mediamake-zone', grant, member: { role: 'editor' } }, async () => {}, h.fetcher), { state: 'no-github', repo: 'asha/mediamake-zone' });
    assert.deepEqual(await shareOnGithub({ projectName: 'Zone', repo: 'ravi/mediamake-zone', grant, member: { githubLogin: 'meera', role: 'editor' } }, async () => {}, h.fetcher), { state: 'other-owner', repo: 'ravi/mediamake-zone', owner: 'ravi' });
    const revoked = await shareOnGithub({ projectName: 'New', grant: { login: 'asha', token: 'gho_revoked' }, member: { githubLogin: 'meera', role: 'editor' } }, async () => assert.fail(), h.fetcher);
    assert.equal(revoked.state, 'failed');
    assert.match((revoked as { reason: string }).reason, /connect GitHub again/);
  });
});
