import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appAuthorizeUrl, appGrantFromCode, appInstallUrl, deleteRepo, ensurePrivateRepo, githubConfigured, inviteCollaborator, needsRefresh, permissionOf, projectRepoName, refreshTokens, removeCollaborator, seal, shareOnGithub, stateMatches, unseal } from './github';

const env = { GITHUB_APP_SLUG: 'mediamake-spaces', GITHUB_APP_CLIENT_ID: 'Iv1.id', GITHUB_APP_CLIENT_SECRET: 'secret' } as unknown as NodeJS.ProcessEnv;
const NOW = Date.parse('2026-11-17T06:00:00.000Z');

/** A stand-in GitHub: private repos, their collaborators and pending invitations. */
function hub(start: Record<string, { private: boolean; collaborators?: string[]; invitations?: string[] }> = {}, installedOn: number[] = [42]) {
  const repos = new Map(Object.entries(start).map(([name, r]) => [name, { private: r.private, collaborators: r.collaborators ?? [], invitations: r.invitations ?? [] }]));
  const calls: string[] = [];
  const answer = (status: number, body?: unknown) => new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status });
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const path = url.pathname;
    calls.push(`${method} ${path}`);
    const auth = new Headers(init?.headers).get('authorization');
    if (url.host === 'github.com') {
      const form = new URLSearchParams(String(init?.body));
      if (form.get('grant_type') === 'refresh_token') return form.get('refresh_token') === 'ghr_ok' ? answer(200, { access_token: 'ghu_fresh', expires_in: 28800, refresh_token: 'ghr_next', refresh_token_expires_in: 15897600 }) : answer(200, { error: 'bad_refresh_token' });
      return form.get('code_verifier') ? answer(200, { access_token: 'ghu_new', expires_in: 28800, refresh_token: 'ghr_ok', refresh_token_expires_in: 15897600, scope: '' }) : answer(200, { error: 'bad_verification_code' });
    }
    if (auth !== 'Bearer gho_ok' && auth !== 'Bearer ghu_new') return answer(401, { message: 'Bad credentials' });
    if (path === '/user/installations') return answer(200, { total_count: installedOn.length, installations: installedOn.map(id => ({ id: id * 10, account: { id, login: id === 42 ? 'asha' : 'some-org' } })) });
    if (path === '/user' && method === 'GET') return answer(200, { id: 42, login: 'asha' });
    if (path === '/user/repos' && method === 'POST') {
      const { name, private: isPrivate } = JSON.parse(String(init?.body));
      repos.set(`asha/${name}`, { private: isPrivate, collaborators: [], invitations: [] });
      return answer(201, { full_name: `asha/${name}` });
    }
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/repos\/([^/]+\/[^/]+)$/)) && method === 'DELETE') return m[1].endsWith('/locked') ? answer(403, {}) : repos.delete(m[1]) ? answer(204) : answer(404);
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
    assert.equal(unseal(sealed, { ...env, GITHUB_APP_CLIENT_SECRET: 'rotated' }), null);
    assert.equal(unseal(sealed.slice(0, -2) + 'xx', env), null);
    assert.equal(unseal('nonsense', env), null);
    assert.equal(unseal(seal('t', { ...env, MEDIAMAKE_SECRETS_KEY: 'own' }), { ...env, MEDIAMAKE_SECRETS_KEY: 'own', GITHUB_APP_CLIENT_SECRET: 'rotated' }), 't');
  });
});

describe('connecting', () => {
  it('is off until the site has its GitHub App', () => {
    assert.equal(githubConfigured(env), true);
    assert.equal(githubConfigured({ ...env, GITHUB_APP_SLUG: '' }), false);
    assert.equal(githubConfigured({ GITHUB_CLIENT_ID: 'sign-in', GITHUB_CLIENT_SECRET: 'x' } as unknown as NodeJS.ProcessEnv), false, 'the sign-in app is not it');
  });

  it('authorizes the App with a state and a PKCE challenge, and asks for no scope', () => {
    const url = new URL(appAuthorizeUrl({ origin: 'https://mm.test', state: 's', verifier: 'v', login: 'asha' }, env));
    assert.equal(url.searchParams.get('client_id'), 'Iv1.id');
    assert.equal(url.searchParams.get('redirect_uri'), 'https://mm.test/api/space/github/callback');
    assert.equal(url.searchParams.get('scope'), null);
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(url.searchParams.get('code_challenge') && url.searchParams.get('code_challenge') !== 'v');
    assert.equal(appInstallUrl(env), 'https://github.com/apps/mediamake-spaces/installations/new');
    assert.ok(stateMatches('s', 's') && !stateMatches('s', 't') && !stateMatches(undefined, undefined));
  });

  it('says whose tokens it got, when they end, and whether the App is on that account', async () => {
    const grant = await appGrantFromCode({ origin: 'https://mm.test', code: 'c', verifier: 'v' }, hub().fetcher, env, NOW);
    assert.deepEqual(grant, { token: 'ghu_new', expiresAt: '2026-11-17T14:00:00.000Z', refreshToken: 'ghr_ok', refreshExpiresAt: '2027-05-20T06:00:00.000Z', id: '42', login: 'asha', installed: true });
    assert.equal((await appGrantFromCode({ origin: 'https://mm.test', code: 'c', verifier: 'v' }, hub({}, []).fetcher, env, NOW)).installed, false);
    assert.equal((await appGrantFromCode({ origin: 'https://mm.test', code: 'c', verifier: 'v' }, hub({}, [7]).fetcher, env, NOW)).installed, false, 'on an organization only');
  });

  it('refreshes a token that is about to end, and gives up when GitHub no longer takes the refresh token', async () => {
    assert.equal(needsRefresh({ expiresAt: '2026-11-17T06:04:00.000Z' }, NOW), true);
    assert.equal(needsRefresh({ expiresAt: '2026-11-17T08:00:00.000Z' }, NOW), false);
    assert.equal(needsRefresh({}, NOW), false, 'a token with no end');
    assert.deepEqual(await refreshTokens('ghr_ok', hub().fetcher, env, NOW), { token: 'ghu_fresh', expiresAt: '2026-11-17T14:00:00.000Z', refreshToken: 'ghr_next', refreshExpiresAt: '2027-05-20T06:00:00.000Z' });
    assert.equal(await refreshTokens('ghr_used', hub().fetcher, env, NOW), null);
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

  it('deletes a repo of the connected account only, and takes one already gone as done', async () => {
    const h = hub({ 'asha/zone': { private: true }, 'ravi/zone': { private: true }, 'asha/locked': { private: true } });
    const grant = { login: 'Asha', token: 'gho_ok' };
    assert.deepEqual(await deleteRepo(grant, 'asha/zone', h.fetcher), { state: 'deleted', repo: 'asha/zone' });
    assert.equal(h.repos.has('asha/zone'), false);
    assert.deepEqual(await deleteRepo(grant, 'asha/zone', h.fetcher), { state: 'gone', repo: 'asha/zone' });
    assert.deepEqual(await deleteRepo(grant, 'ravi/zone', h.fetcher), { state: 'other-owner', repo: 'ravi/zone', owner: 'ravi' });
    assert.equal(h.repos.has('ravi/zone'), true);
    assert.equal((await deleteRepo(grant, 'asha/locked', h.fetcher)).state, 'failed');
    assert.equal((await deleteRepo({ login: 'asha', token: 'gho_bad' }, 'asha/locked', h.fetcher)).state, 'failed');
    assert.equal((await deleteRepo(grant, 'asha/../x', h.fetcher)).state, 'failed');
    assert.ok(!h.calls.some(call => call.includes('..')));
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
