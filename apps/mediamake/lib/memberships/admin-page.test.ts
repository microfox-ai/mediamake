import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { auditLog, auditText } from './audit';
import type { Membership } from './membership';
import { buildPeople, countByTier, daysLeft, endsSoon } from './people';
import { nextTier, requestedTier, tierRequestId } from './requests';

const NOW = Date.parse('2026-11-15T12:00:00.000Z');

function membership(over: Partial<Membership>): Membership {
  return { membershipId: 'mem_x', clientId: 'ana', tier: 'plus', source: 'admin', grantedAt: '2026-11-01T00:00:00.000Z', ...over };
}

describe('everyone on Manage Memberships', () => {
  const people = buildPeople(
    {
      accounts: [
        { clientId: 'ana', name: 'Ana', email: 'ana@example.com', linked: true },
        { clientId: 'old-key', name: 'Old Key', linked: false },
        { clientId: 'boss', name: 'Boss', linked: true },
      ],
      keyHolders: [
        { clientId: 'old-key', name: 'Old Key', activeKeys: 2 },
        { clientId: 'tester', name: 'Tester', activeKeys: 1 },
      ],
      memberships: [
        membership({ membershipId: 'mem_1', clientId: 'ana', tier: 'plus', revokedAt: '2026-11-02T00:00:00.000Z' }),
        membership({ membershipId: 'mem_2', clientId: 'ana', tier: 'pro', source: 'contribution', grantedAt: '2026-11-02T00:00:00.000Z', expiresAt: '2026-11-20T00:00:00.000Z' }),
        membership({ membershipId: 'mem_3', clientId: 'ghost', tier: 'plus', expiresAt: '2026-11-10T00:00:00.000Z' }),
      ],
      legacy: { private: ['tester'] },
      admins: ['boss'],
    },
    NOW,
  );
  const by = (clientId: string) => people.find(person => person.clientId === clientId)!;

  it('lists every account, key holder and member once, highest tier first', () => {
    assert.deepEqual(people.map(person => person.clientId), ['boss', 'tester', 'ana', 'ghost', 'old-key']);
    assert.deepEqual(countByTier(people), { public: 2, plus: 0, pro: 1, cohort: 1, admin: 1 });
  });

  it('gives each person the tier of their highest live record, with their history', () => {
    assert.equal(by('ana').tier, 'pro');
    assert.equal(by('ana').membership?.membershipId, 'mem_2');
    assert.deepEqual(by('ana').records.map(record => record.membershipId), ['mem_2', 'mem_1']);
  });

  it('is Public once a membership has run out, and keeps the record', () => {
    assert.equal(by('ghost').tier, 'public');
    assert.equal(by('ghost').membership, null);
    assert.equal(by('ghost').records.length, 1);
    assert.equal(by('ghost').linked, false);
  });

  it('reads the earlier groups as tiers with no record yet', () => {
    assert.equal(by('tester').tier, 'cohort');
    assert.equal(by('tester').legacy, true);
    assert.equal(by('tester').membership, null);
    assert.equal(by('tester').name, 'Tester');
  });

  it('names admins by their flag, whatever records they hold', () => {
    assert.equal(by('boss').tier, 'admin');
    assert.equal(by('boss').isAdmin, true);
  });

  it('knows an old account by its key only', () => {
    assert.equal(by('old-key').linked, false);
    assert.equal(by('old-key').activeKeys, 2);
  });

  it('says when a membership ends soon', () => {
    assert.equal(daysLeft(by('ana').membership, NOW), 5);
    assert.equal(endsSoon(by('ana').membership, NOW), true);
    assert.equal(endsSoon(membership({ expiresAt: '2027-02-15T00:00:00.000Z' }), NOW), false);
    assert.equal(daysLeft(membership({}), NOW), null);
    assert.equal(daysLeft(null, NOW), null);
  });
});

describe('asking an admin for a membership', () => {
  it('stores a request under the tier it asks for', () => {
    assert.equal(tierRequestId('pro'), 'tier/pro');
    assert.equal(requestedTier('tier/pro'), 'pro');
    assert.equal(requestedTier('mcp/browse-hack'), null);
    assert.equal(requestedTier('tier/admin'), null);
    assert.equal(requestedTier('tier/public'), null);
  });

  it('offers the next tier up, never a hidden one', () => {
    assert.equal(nextTier('public'), 'plus');
    assert.equal(nextTier('plus'), 'pro');
    assert.equal(nextTier('pro'), null);
    assert.equal(nextTier('cohort'), null);
    assert.equal(nextTier('admin'), null);
  });
});

describe('the audit log', () => {
  const log = auditLog(
    {
      memberships: [
        membership({ membershipId: 'mem_1', grantedBy: 'boss', note: 'Helped test', revokedAt: '2026-11-05T00:00:00.000Z', revokedBy: 'boss', revokedNote: 'Moved to pro: merged a Pro MCP' }),
        membership({
          membershipId: 'mem_2',
          tier: 'pro',
          source: 'contribution',
          ref: 'https://github.com/microfox-ai/mediamake/pull/1',
          grantedBy: 'boss',
          grantedAt: '2026-11-05T00:00:00.000Z',
          permanent: true,
          permanentBy: 'boss',
          permanentAt: '2026-11-06T00:00:00.000Z',
        }),
        membership({ membershipId: 'mem_3', clientId: 'ghost', expiresAt: '2026-11-10T00:00:00.000Z' }),
        membership({ membershipId: 'mem_4', clientId: 'later', expiresAt: '2027-01-01T00:00:00.000Z' }),
      ],
      requests: [
        { requestId: 'req_1', itemId: 'tier/plus', clientId: 'ghost', message: 'I make AMVs', status: 'approved', createdAt: '2026-11-11T00:00:00.000Z', resolvedAt: '2026-11-12T00:00:00.000Z', resolvedBy: 'boss' },
        { requestId: 'req_2', itemId: 'mcp/browse-hack', clientId: 'ana', status: 'pending', createdAt: '2026-11-13T00:00:00.000Z' },
      ],
    },
    NOW,
  );
  const kinds = (clientId: string) => log.filter(event => event.clientId === clientId).map(event => event.kind);

  it('is newest first', () => {
    const times = log.map(event => event.at);
    assert.deepEqual(times, [...times].sort().reverse());
    assert.equal(new Set(log.map(event => event.id)).size, log.length);
  });

  it('keeps who gave, changed and ended each membership, and why', () => {
    const ended = log.find(event => event.id === 'mem_1:ended')!;
    assert.equal(ended.by, 'boss');
    assert.equal(ended.reason, 'Moved to pro: merged a Pro MCP');
    assert.equal(log.find(event => event.id === 'mem_1:given')!.reason, 'Helped test');
    assert.equal(log.find(event => event.id === 'mem_2:permanent')!.by, 'boss');
  });

  it('shows a membership that ran out, and not one that still runs', () => {
    assert.deepEqual(kinds('ghost'), ['request_approved', 'requested', 'expired', 'given']);
    assert.deepEqual(kinds('later'), ['given']);
  });

  it('says each line in words', () => {
    const text = (id: string, title?: string) => auditText(log.find(event => event.id === id)!, title);
    assert.equal(text('mem_2:given'), 'Given Pro for a contribution');
    assert.equal(text('mem_3:given'), 'Given Plus, until 10 Nov 2026');
    assert.equal(text('mem_3:expired'), 'Plus ran out');
    assert.equal(text('mem_2:permanent'), 'Pro made permanent');
    assert.equal(text('req_1:resolved'), 'Request for Plus approved');
    assert.equal(text('req_2:asked', 'Browse Hack'), 'Asked for Browse Hack');
  });
});
