import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readHook, signatureOf, signatureOk, webhookSecret } from './github-webhook';
import { applyReport, repoNow, type SpaceRecord } from './space';

describe('a delivery\'s signature', () => {
  it('is the one GitHub documents for its example', () => {
    // docs.github.com, "Validating webhook deliveries": this secret and body give this signature
    const signature = 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17';
    assert.equal(signatureOf('Hello, World!', "It's a Secret to Everybody"), signature);
    assert.equal(signatureOk('Hello, World!', signature, "It's a Secret to Everybody"), true);
  });

  it('is refused for another body, another secret, or none', () => {
    const signature = signatureOf('{"action":"deleted"}', 'secret');
    assert.equal(signatureOk('{"action":"created"}', signature, 'secret'), false);
    assert.equal(signatureOk('{"action":"deleted"}', signature, 'other'), false);
    assert.equal(signatureOk('{"action":"deleted"}', null, 'secret'), false);
    assert.equal(signatureOk('{"action":"deleted"}', 'sha256=', 'secret'), false);
    assert.equal(signatureOk('{"action":"deleted"}', signature, ''), false);
  });

  it('needs the secret set', () => {
    assert.equal(webhookSecret({} as NodeJS.ProcessEnv), null);
    assert.equal(webhookSecret({ GITHUB_APP_WEBHOOK_SECRET: ' s3 ' } as unknown as NodeJS.ProcessEnv), 's3');
  });
});

describe('what a delivery asks for', () => {
  it('forgets the connection of someone who revoked the authorization', () => {
    assert.deepEqual(readHook('github_app_authorization', { action: 'revoked', sender: { id: 42, login: 'asha' } }), { do: 'forget-grant', githubId: '42', revoke: false });
  });

  it('forgets the connection, and takes the authorization back, when the App is removed from an account', () => {
    assert.deepEqual(readHook('installation', { action: 'deleted', installation: { id: 420, account: { id: 42, login: 'asha' } }, sender: { id: 7 } }), { do: 'forget-grant', githubId: '42', revoke: true });
  });

  it('leaves installs, suspensions and anything else alone', () => {
    for (const action of ['created', 'suspend', 'unsuspend', 'new_permissions_accepted']) assert.equal(readHook('installation', { action, installation: { account: { id: 42 } } }), null);
    assert.equal(readHook('ping', { zen: 'Keep it logically awesome.' }), null);
    assert.equal(readHook('installation_repositories', { action: 'added' }), null);
    assert.equal(readHook('github_app_authorization', { action: 'revoked', sender: { id: 'x' } }), null);
    assert.equal(readHook(null, null), null);
  });

  it('follows a repo that was renamed', () => {
    const payload = { action: 'renamed', changes: { repository: { name: { from: 'mediamake-luffy' } } }, repository: { name: 'mediamake-gear5', full_name: 'asha/mediamake-gear5', owner: { login: 'asha' } } };
    assert.deepEqual(readHook('repository', payload), { do: 'rename-repo', from: 'asha/mediamake-luffy', to: 'asha/mediamake-gear5' });
  });

  it('follows a repo that moved to another account or organisation', () => {
    const repository = { name: 'mediamake-luffy', full_name: 'studio/mediamake-luffy', owner: { login: 'studio' } };
    assert.deepEqual(readHook('repository', { action: 'transferred', changes: { owner: { from: { user: { login: 'asha' } } } }, repository }), { do: 'rename-repo', from: 'asha/mediamake-luffy', to: 'studio/mediamake-luffy' });
    assert.deepEqual(readHook('repository', { action: 'transferred', changes: { owner: { from: { organization: { login: 'old-org' } } } }, repository }), { do: 'rename-repo', from: 'old-org/mediamake-luffy', to: 'studio/mediamake-luffy' });
  });

  it('forgets a repo that was deleted, and nothing for other repository events or odd names', () => {
    assert.deepEqual(readHook('repository', { action: 'deleted', repository: { name: 'x', full_name: 'asha/x', owner: { login: 'asha' } } }), { do: 'forget-repo', repo: 'asha/x' });
    assert.equal(readHook('repository', { action: 'publicized', repository: { full_name: 'asha/x' } }), null);
    assert.equal(readHook('repository', { action: 'deleted', repository: { full_name: 'https://token@github.com/asha/x' } }), null);
    assert.equal(readHook('repository', { action: 'renamed', changes: {}, repository: { name: 'x', full_name: 'asha/x', owner: { login: 'asha' } } }), null);
  });
});

describe('a space whose repo was renamed', () => {
  const space: SpaceRecord = { id: 'project:p1', repo: 'asha/mediamake-gear5', formerRepos: ['asha/mediamake-luffy'], connectedAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', devices: [] };

  it('takes a report under its old name as its own, in any case', () => {
    assert.equal(repoNow(space, 'asha/mediamake-luffy'), 'asha/mediamake-gear5');
    assert.equal(repoNow(space, 'Asha/MediaMake-Gear5'), 'asha/mediamake-gear5');
    assert.equal(repoNow(space, 'someone/else'), 'someone/else');
    assert.equal(repoNow(null, 'asha/new'), 'asha/new');
  });

  it('keeps its old names and its start through a report', () => {
    const change = applyReport({ space, items: [] }, space.id, 'c1', { device: 'mac', repo: repoNow(space, 'asha/mediamake-luffy'), pushed: true, items: [] }, '2026-11-17T00:00:00.000Z');
    assert.equal(change.space.repo, 'asha/mediamake-gear5');
    assert.deepEqual(change.space.formerRepos, ['asha/mediamake-luffy']);
    assert.equal(change.space.connectedAt, space.connectedAt);
  });
});
