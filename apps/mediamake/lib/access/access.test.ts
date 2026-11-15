import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { CatalogItem } from '@/lib/catalog/types';
import type { Membership } from '@/lib/memberships/membership';
import type { GrantableTier } from '@/lib/memberships/tiers';
import { accessLevel, canRenderOnLambda, canUseCloudProjects, viewerTier, type Entitlements } from './rules';

function viewer(over: Partial<Entitlements> = {}): Entitlements {
  return { clientId: 'someone', isAdmin: false, groups: [], all: false, itemIds: new Set(), memberships: [], ...over };
}

function member(tier: GrantableTier, over: Partial<Membership> = {}): Entitlements {
  return viewer({ memberships: [{ membershipId: 'mem_x', clientId: 'someone', tier, source: 'admin', grantedAt: '2026-11-01T00:00:00.000Z', ...over }] });
}

function item(id: string, over: Partial<CatalogItem> = {}): CatalogItem {
  return { id, kind: id.split('/')[0] as CatalogItem['kind'], title: id, summary: '', visibility: 'private', status: 'beta', releasedAt: '2026-11-01', ...over };
}

const publicItem = item('app/out', { tier: 'public', visibility: 'public' });
const plusItem = item('app/plus', { tier: 'plus', visibility: 'network' });
const proItem = item('mcp/browse-hack', { tier: 'pro', visibility: 'network' });
const cohortItem = item('app/early', { tier: 'cohort' });
const vaultItem = item('mcp/mediamake', { tier: 'admin', neverPublish: true });
const repoSkill = item('skill/pack-brand-kit', { tier: 'public', visibility: 'public', inRepo: true });

describe('access on the ladder', () => {
  afterEach(() => {
    delete process.env.MEDIAMAKE_PUBLIC_RELEASES;
  });

  it('gives each viewer their tier: Admin by the flag, else their highest live membership, else Public', () => {
    assert.equal(viewerTier(viewer()), 'public');
    assert.equal(viewerTier(member('plus')), 'plus');
    assert.equal(viewerTier(viewer({ isAdmin: true })), 'admin');
    assert.equal(viewerTier(member('pro', { expiresAt: '2020-01-01T00:00:00.000Z' })), 'public');
    assert.equal(viewerTier(member('cohort', { revokedAt: '2026-11-02T00:00:00.000Z' })), 'public');
  });

  it('still counts the earlier tiers until the migration: private testers are the cohort, the community is Pro', () => {
    assert.equal(viewerTier(viewer({ groups: ['private'] })), 'cohort');
    assert.equal(viewerTier(viewer({ all: true })), 'cohort');
    assert.equal(viewerTier(viewer({ groups: ['network'] })), 'pro');
    assert.equal(viewerTier({ ...member('plus'), groups: ['network'] }), 'pro');
  });

  it('opens every item at the viewer\'s tier or below, and nothing above', () => {
    process.env.MEDIAMAKE_PUBLIC_RELEASES = 'open';
    const expected = {
      public: ['open', 'locked', 'locked', 'locked', 'locked'],
      plus: ['open', 'granted', 'locked', 'locked', 'locked'],
      pro: ['open', 'granted', 'granted', 'locked', 'locked'],
      cohort: ['open', 'granted', 'granted', 'granted', 'locked'],
    } as const;
    const items = [publicItem, plusItem, proItem, cohortItem, vaultItem];
    assert.deepEqual(items.map(i => accessLevel(viewer(), i)), expected.public);
    for (const tier of ['plus', 'pro', 'cohort'] as const) {
      assert.deepEqual(items.map(i => accessLevel(member(tier), i)), expected[tier], tier);
    }
    assert.deepEqual(items.map(i => accessLevel(viewer({ isAdmin: true }), i)), ['open', 'granted', 'granted', 'granted', 'granted']);
    assert.deepEqual(items.map(i => accessLevel(viewer({ clientId: null }), i)), expected.public);
  });

  it('keeps Public items for members only while public releases are locked, except repo skills and open pages', () => {
    assert.equal(accessLevel(viewer(), publicItem), 'locked');
    assert.equal(accessLevel(member('plus'), publicItem), 'granted');
    assert.equal(accessLevel(viewer({ clientId: null }), repoSkill), 'open');
    assert.equal(accessLevel(viewer(), { ...publicItem, openToAll: true }), 'open');
  });

  it('opens the vault only to admins and to a grant that names the item', () => {
    assert.equal(accessLevel(member('cohort'), vaultItem), 'locked');
    assert.equal(accessLevel(viewer({ all: true }), vaultItem), 'locked');
    assert.equal(accessLevel(viewer({ itemIds: new Set(['mcp/*']) }), vaultItem), 'locked');
    assert.equal(accessLevel(viewer({ itemIds: new Set(['mcp/mediamake']) }), vaultItem), 'granted');
  });

  it('lets a grant open one item beside the ladder', () => {
    assert.equal(accessLevel(viewer({ itemIds: new Set(['mcp/browse-hack']) }), proItem), 'granted');
    assert.equal(accessLevel(viewer({ itemIds: new Set(['mcp/*']) }), proItem), 'granted');
    assert.equal(accessLevel(viewer({ itemIds: new Set(['mcp/browse-hack']) }), cohortItem), 'locked');
  });

  it('reads an item stored before the ladder from its stage, and opens a gated item to everyone once its gate ends', () => {
    process.env.MEDIAMAKE_PUBLIC_RELEASES = 'open';
    assert.equal(accessLevel(member('pro'), item('mcp/old', { visibility: 'private' })), 'locked');
    assert.equal(accessLevel(member('cohort'), item('mcp/old', { visibility: 'private' })), 'granted');
    assert.equal(accessLevel(member('pro'), item('mcp/old', { visibility: 'network' })), 'granted');
    assert.equal(accessLevel(viewer(), { ...proItem, publicAt: '2020-01-01T00:00:00.000Z' }), 'open');
  });

  it('opens cloud projects at Plus and Lambda renders with the cohort', () => {
    assert.deepEqual((['public', 'plus', 'pro', 'cohort', 'admin'] as const).map(canUseCloudProjects), [false, true, true, true, true]);
    assert.deepEqual((['public', 'plus', 'pro', 'cohort', 'admin'] as const).map(canRenderOnLambda), [false, false, false, true, true]);
  });
});
