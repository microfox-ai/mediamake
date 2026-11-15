import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ago, browseProjects, initials, isEmail, parseShare, sharedSummary, takeInvite, type ProjectCard } from './access';

const card = (over: Partial<ProjectCard>): ProjectCard => ({
  id: 'p',
  displayName: 'Project',
  tags: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  lastActivityAt: '2026-11-01T00:00:00.000Z',
  role: 'owner',
  owner: { clientId: 'me', name: 'Me' },
  members: [],
  invites: 0,
  bytes: 0,
  counts: { productions: 0, releases: 0, media: 0 },
  ...over,
});

describe('project access', () => {
  it('reads who a share names: an email or an account, with a role', () => {
    assert.deepEqual(parseShare({ projectId: 'p', email: ' Asha@Example.com ', role: 'editor' }), { projectId: 'p', role: 'editor', email: 'asha@example.com' });
    assert.deepEqual(parseShare({ projectId: 'p', clientId: 'asha-1', role: 'viewer' }), { projectId: 'p', role: 'viewer', clientId: 'asha-1' });
    assert.ok('error' in parseShare({ projectId: 'p', clientId: 'asha-1', role: 'owner' }));
    assert.ok('error' in parseShare({ projectId: 'p', clientId: 'asha-1' }));
    assert.ok('error' in parseShare({ projectId: 'p', email: 'not an email', role: 'viewer' }));
    assert.ok('error' in parseShare({ projectId: 'p', role: 'viewer' }));
    assert.deepEqual(parseShare({ projectId: 'p', clientId: 'asha-1' }, { needsRole: false }), { projectId: 'p', role: undefined, clientId: 'asha-1' });
    assert.ok(isEmail('a@b.co') && !isEmail('a@b') && !isEmail('asha'));
  });

  it('turns an invite into a membership once, and never for someone already on the project', () => {
    const invite = { email: 'asha@example.com', role: 'editor' as const, invitedBy: 'me', invitedAt: 'then' };
    const taken = takeInvite({ clientId: 'me', invites: [invite] }, 'asha@example.com', 'asha-1', 'now');
    assert.deepEqual(taken, { invites: [], sharedWith: [{ clientId: 'asha-1', role: 'editor', addedAt: 'now', addedBy: 'me' }] });
    assert.equal(takeInvite({ clientId: 'me', invites: [invite] }, 'other@example.com', 'x', 'now'), null);
    const existing = [{ clientId: 'asha-1', role: 'viewer' as const, addedAt: 'before' }];
    assert.deepEqual(takeInvite({ clientId: 'me', sharedWith: existing, invites: [invite] }, 'asha@example.com', 'asha-1', 'now'), { invites: [], sharedWith: existing });
    assert.deepEqual(takeInvite({ clientId: 'asha-1', invites: [invite] }, 'asha@example.com', 'asha-1', 'now'), { invites: [], sharedWith: [] });
  });

  it('says who a project is shared with in one line', () => {
    const asha = { clientId: 'a', name: 'Asha', role: 'editor' as const };
    const ravi = { clientId: 'r', name: 'Ravi', role: 'viewer' as const };
    const kim = { clientId: 'k', name: 'Kim', role: 'viewer' as const };
    assert.equal(sharedSummary(card({}), 'me'), 'Only you');
    assert.equal(sharedSummary(card({ invites: 1 }), 'me'), 'Only you, 1 invited');
    assert.equal(sharedSummary(card({ members: [asha, ravi] }), 'me'), 'You and Asha and Ravi');
    assert.equal(sharedSummary(card({ members: [asha, ravi, kim] }), 'me'), 'You and Asha and 2 others');
    assert.equal(sharedSummary(card({ role: 'viewer', owner: { clientId: 'o', name: 'Subhakar' }, members: [{ ...kim, clientId: 'me' }] }), 'me'), 'Subhakar and you');
    assert.equal(sharedSummary(card({ role: 'viewer', owner: { clientId: 'o', name: 'Subhakar' }, members: [{ ...kim, clientId: 'me' }, asha] }), 'me'), 'Subhakar, you and Asha');
  });

  it('searches, scopes and sorts the cards', () => {
    const cards = [
      card({ id: '1', displayName: 'Atomic Rap', bytes: 5, lastActivityAt: '2026-11-10T00:00:00.000Z', tags: ['channel'] }),
      card({ id: '2', displayName: 'Anime Music Zone', bytes: 50, lastActivityAt: '2026-11-14T00:00:00.000Z', members: [{ clientId: 'a', name: 'Asha', role: 'editor' }] }),
      card({ id: '3', displayName: 'Zed Films', role: 'viewer', owner: { clientId: 'o', name: 'Ravi' }, createdAt: '2026-11-12T00:00:00.000Z' }),
    ];
    const ids = (options: Parameters<typeof browseProjects>[1]) => browseProjects(cards, options).map(each => each.id);
    assert.deepEqual(ids({}), ['2', '1', '3']);
    assert.deepEqual(ids({ sort: 'name' }), ['2', '1', '3']);
    assert.deepEqual(ids({ sort: 'size' }), ['2', '1', '3']);
    assert.deepEqual(ids({ sort: 'newest' }), ['3', '2', '1']);
    assert.deepEqual(ids({ scope: 'mine' }), ['2', '1']);
    assert.deepEqual(ids({ scope: 'shared' }), ['3']);
    assert.deepEqual(ids({ query: 'asha' }), ['2']);
    assert.deepEqual(ids({ query: 'CHANNEL' }), ['1']);
    assert.deepEqual(ids({ query: 'ravi' }), ['3']);
  });

  it('writes times and initials for people', () => {
    const now = Date.parse('2026-11-15T12:00:00.000Z');
    assert.equal(ago('2026-11-15T11:59:30.000Z', now), 'just now');
    assert.equal(ago('2026-11-15T09:00:00.000Z', now), '3 hours ago');
    assert.equal(ago('2026-11-14T10:00:00.000Z', now), 'yesterday');
    assert.equal(ago('2026-11-02T10:00:00.000Z', now), '2 Nov');
    assert.equal(ago('2025-03-02T10:00:00.000Z', now), '2 Mar 2025');
    assert.equal(initials('Subhakar Tikkireddy'), 'ST');
    assert.equal(initials('asha@example.com'), 'AS');
    assert.equal(initials('test-plus'), 'TP');
  });
});
