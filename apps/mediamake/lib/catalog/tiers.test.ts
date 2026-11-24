import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registry } from '@/lib/skills/registry';
import { catalogItems, getStaticRecords, isRepoSkill, staticRecord, withRegistryUses } from './items';
import { ITEM_TIER_DECISIONS, READY_DECISIONS, isEmptyPlan, planTierMigration } from './migrate-tiers';
import { shownOn, type ShownItem } from './shown';
import {
  ITEM_HEALTH,
  effectiveVisibility,
  isAlwaysPublic,
  itemTier,
  parseHealth,
  readyProblems,
  visibilityOfTier,
  withReadiness,
  type CatalogItemRecord,
} from './types';
import type { Membership } from '../memberships/membership';

const NOW = Date.parse('2026-11-15T12:00:00.000Z');

function record(id: string, over: Partial<CatalogItemRecord> = {}): CatalogItemRecord {
  const [kind, slug] = id.split('/');
  return {
    id,
    kind: kind as CatalogItemRecord['kind'],
    slug,
    title: slug,
    summary: '',
    visibility: 'private',
    status: 'beta',
    releasedAt: '2026-11-01',
    versions: [],
    createdAt: '2026-11-01',
    ...over,
  };
}

describe('an item\'s tier', () => {
  it('is the lowest membership that opens it, as stored', () => {
    for (const tier of ['public', 'plus', 'pro', 'cohort', 'admin'] as const) {
      assert.equal(itemTier(record('mcp/x', { tier, visibility: visibilityOfTier(tier) }), NOW), tier);
    }
  });

  it('reads a record stored before the ladder from its stage: development is the cohort, community is Pro, the vault is Admin', () => {
    assert.equal(itemTier(record('mcp/x', { visibility: 'private' }), NOW), 'cohort');
    assert.equal(itemTier(record('mcp/x', { visibility: 'network' }), NOW), 'pro');
    assert.equal(itemTier(record('mcp/x', { visibility: 'public' }), NOW), 'public');
    assert.equal(itemTier(record('mcp/x', { visibility: 'private', neverPublish: true }), NOW), 'admin');
  });

  it('turns Public by itself when its gate ends, but never out of the vault', () => {
    const gated = record('mcp/x', { tier: 'pro', visibility: 'network', publicAt: '2026-11-20T00:00:00.000Z' });
    assert.equal(itemTier(gated, NOW), 'pro');
    assert.equal(itemTier(gated, Date.parse('2026-11-21')), 'public');
    assert.equal(effectiveVisibility(gated, Date.parse('2026-11-21')), 'public');
    assert.equal(itemTier({ ...gated, tier: 'admin', neverPublish: true }, Date.parse('2026-11-21')), 'admin');
  });

  it('keeps a skill in the public repo and an item made by others Public, whatever tier they were given', () => {
    assert.ok(isAlwaysPublic(staticRecord('skill/pack-brand-kit')!));
    assert.equal(itemTier({ ...staticRecord('skill/pack-brand-kit')!, tier: 'pro' }, NOW), 'public');
    assert.equal(itemTier(record('mcp/theirs', { tier: 'cohort', madeBy: { name: 'Someone' } }), NOW), 'public');
  });

  it('lets a skill that is not in the repo be gated: a package in private storage, like an MCP', () => {
    const packaged = withRegistryUses(record('skill/not-in-the-repo', { tier: 'pro', visibility: 'network' }));
    assert.equal(isRepoSkill(packaged.id), false);
    assert.equal(isAlwaysPublic(packaged), false);
    assert.equal(itemTier(packaged, NOW), 'pro');
    // a stored record of a repo skill is marked when it loads, and a stale mark on one that left the repo goes
    const name = registry!.skills[0].name;
    assert.equal(withRegistryUses(record(`skill/${name}`, { tier: 'pro' })).inRepo, true);
    assert.equal('inRepo' in withRegistryUses(record('skill/not-in-the-repo', { inRepo: true })), false);
  });

  it('puts every item the repo defines on the ladder: skills, mm-use and items made by others Public, mm-release and the old MediaMake MCP in the vault', () => {
    for (const item of getStaticRecords()) {
      const expected = item.id === 'mcp/mediamake' || item.id === 'mcp/mm-release' ? 'admin' : 'public';
      assert.equal(itemTier(item, NOW), expected, item.id);
    }
    assert.equal(catalogItems.find(item => item.id === 'mcp/mediamake')?.tier, 'admin');
    assert.equal(catalogItems.find(item => item.id === 'mcp/mm-release')?.tier, 'admin');
    assert.equal(catalogItems.find(item => item.id === 'mcp/mm-use')?.tier, 'public');
  });
});

describe('readiness', () => {
  it('starts everything as Beta, and is Ready with a Ready mark, with its proof or without', () => {
    const items = [record('skill/a'), record('skill/b'), record('skill/c')];
    const [a, b, c] = withReadiness(items, [
      { id: 'skill/a', readiness: 'ready', proof: [{ title: 'A real video', url: 'https://youtu.be/x' }], at: '2026-11-15' },
      { id: 'skill/b', readiness: 'ready', proof: [], at: '2026-11-15' },
    ]);
    assert.equal(a.readiness, 'ready');
    assert.deepEqual(a.readyProof, [{ title: 'A real video', url: 'https://youtu.be/x' }]);
    // an admin may take an item to Production with no production on record
    assert.equal(b.readiness, 'ready');
    assert.equal('readyProof' in b, false);
    assert.equal(c.readiness, 'beta');
    assert.equal('readyProof' in c, false);
  });

  it('is stopped only by being failed: a production, a using skill or a video are not required', () => {
    assert.deepEqual(readyProblems(record('skill/a')), []);
    assert.deepEqual(readyProblems(record('mcp/gemini')), []);
    assert.equal(readyProblems(record('skill/a', { health: 'failed' })).length, 1);
  });
});

describe('health', () => {
  it('is healthy, inactive, archived or failed, and reads the earlier name', () => {
    assert.deepEqual(ITEM_HEALTH, ['healthy', 'inactive', 'archived', 'failed']);
    assert.equal(parseHealth('not-working'), 'failed');
    assert.equal(parseHealth('failed'), 'failed');
    assert.equal(parseHealth('broken'), null);
  });
});

describe('where an item shows', () => {
  const item = (over: Partial<ShownItem> = {}): ShownItem => ({ tier: 'public', readiness: 'ready', health: 'healthy', access: 'open', ...over });

  it('puts only Ready, healthy, Public items on the public site', () => {
    assert.equal(shownOn('site', item()).show, true);
    assert.equal(shownOn('site', item({ readiness: 'beta' })).show, false);
    assert.equal(shownOn('site', item({ health: 'failed' })).show, false);
    assert.equal(shownOn('site', item({ tier: 'plus', access: 'locked' })).show, false);
    assert.equal(shownOn('site', item({ archivedAt: '2026-11-01' })).show, false);
  });

  it('shows Beta in Explore with its badge, and failed items only behind a filter with a warning', () => {
    assert.deepEqual(shownOn('explore', item({ readiness: 'beta' })), { show: true, badge: 'beta' });
    assert.deepEqual(shownOn('explore', item({ health: 'failed' })), { show: true, behindFilter: true, warning: 'failed' });
  });

  it('shows a locked item in Explore, saying which membership opens it, except the cohort\'s and the vault\'s', () => {
    assert.deepEqual(shownOn('explore', item({ tier: 'pro', access: 'locked' })), { show: true, locked: true });
    assert.equal(shownOn('explore', item({ tier: 'cohort', access: 'locked' })).show, false);
    assert.equal(shownOn('explore', item({ tier: 'admin', access: 'locked' })).show, false);
    assert.equal(shownOn('explore', item({ tier: 'cohort', access: 'granted' })).show, true);
  });

  it('keeps what you installed in My Items, failed ones with a warning, and shows admins everything', () => {
    assert.deepEqual(shownOn('mine', item({ health: 'failed', readiness: 'beta' })), { show: true, badge: 'beta', warning: 'failed' });
    assert.equal(shownOn('admin', item({ tier: 'admin', access: 'granted', health: 'failed' })).show, true);
  });
});

describe('the migration to the ladder', () => {
  const stored = [
    record('mcp/browse-hack', { visibility: 'private' }),
    record('mcp/projectsync', { visibility: 'private' }),
    record('app/secret', { visibility: 'private' }),
    record('app/vaulted', { visibility: 'private', neverPublish: true }),
    record('tutorial/early', { visibility: 'network', publicAt: '2026-12-01T00:00:00.000Z' }),
    record('tutorial/out', { visibility: 'public' }),
    record('mcp/already', { visibility: 'network', tier: 'plus' }),
  ];
  const input = {
    items: stored,
    groups: [
      { groupId: 'private', members: ['srilekha98'] },
      { groupId: 'network', members: ['friend', 'srilekha98'] },
    ],
    grants: [
      { grantId: 'grant_all', itemId: '*', subject: { kind: 'client' as const, id: 'tester' } },
      { grantId: 'grant_one', itemId: 'mcp/browse-hack', subject: { kind: 'client' as const, id: 'pramod123' } },
    ],
    memberships: [] as Membership[],
    readiness: [],
    knownIds: [...stored.map(item => item.id), 'skill/pack-brand-kit'],
  };
  const plan = planTierMigration(input);

  it('moves private testers into the cohort and the community to Pro, each person once at their highest', () => {
    assert.deepEqual(plan.people, [
      { clientId: 'friend', tier: 'pro', from: 'community' },
      { clientId: 'srilekha98', tier: 'cohort', from: 'private tester' },
      { clientId: 'tester', tier: 'cohort', from: 'a grant of everything' },
    ]);
    // the earlier tiers go, so a later change of tier holds; a grant of one item stays
    assert.deepEqual(plan.leaveGroups, [
      { groupId: 'private', clientIds: ['srilekha98'] },
      { groupId: 'network', clientIds: ['friend', 'srilekha98'] },
    ]);
    assert.deepEqual(plan.revokeGrants, [{ grantId: 'grant_all', clientId: 'tester' }]);
  });

  it('puts Browse Hack and ProjectSync at Pro, the rest of development with the cohort, community at Pro, and leaves the vault and Public', () => {
    assert.deepEqual(ITEM_TIER_DECISIONS, { 'mcp/browse-hack': 'pro', 'mcp/projectsync': 'pro' });
    assert.deepEqual(
      plan.items.map(item => [item.id, item.from, item.tier]),
      [
        ['mcp/browse-hack', 'development', 'pro'],
        ['mcp/projectsync', 'development', 'pro'],
        ['app/secret', 'development', 'cohort'],
        ['app/vaulted', 'vault', 'admin'],
        // a pending gate stays: it is Pro until its date
        ['tutorial/early', 'community', 'pro'],
        ['tutorial/out', 'public', 'public'],
      ],
    );
  });

  it('marks pack-brand-kit Ready with its proof, and nothing else', () => {
    assert.deepEqual(Object.keys(READY_DECISIONS), ['skill/pack-brand-kit']);
    assert.deepEqual(plan.ready.map(item => item.id), ['skill/pack-brand-kit']);
    assert.ok(plan.ready[0].proof[0].url?.startsWith('https://'));
    assert.deepEqual(readyProblems(staticRecord('skill/pack-brand-kit')!), []);
  });

  it('plans nothing the second time', () => {
    const after = planTierMigration({
      ...input,
      items: stored.map(item => ({ ...item, tier: plan.items.find(moved => moved.id === item.id)?.tier ?? item.tier })),
      groups: [],
      grants: input.grants.filter(grant => grant.itemId !== '*'),
      memberships: plan.people.map(person => ({ membershipId: `mem_${person.clientId}`, clientId: person.clientId, tier: person.tier, source: 'migration', grantedAt: '2026-11-15T00:00:00.000Z' })),
      readiness: [{ id: 'skill/pack-brand-kit', readiness: 'ready' }],
    });
    assert.ok(isEmptyPlan(after), JSON.stringify(after));
  });

  it('leaves a person alone who already holds that tier or a higher one', () => {
    const held: Membership = { membershipId: 'mem_1', clientId: 'friend', tier: 'cohort', source: 'admin', grantedAt: '2026-11-10T00:00:00.000Z' };
    assert.deepEqual(planTierMigration({ ...input, memberships: [held] }).people.map(person => person.clientId), ['srilekha98', 'tester']);
  });
});
