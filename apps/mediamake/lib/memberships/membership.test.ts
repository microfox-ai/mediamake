import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CONTRIBUTION_MONTHS, currentMembership, describeMembership, expiryFor, isLive, memberTierFrom, monthsAfter, type Membership } from './membership';
import {
  FEATURE_TIERS,
  GRANTABLE_TIERS,
  MEMBER_TIERS,
  TIER_LADDER,
  higherTier,
  isHiddenTier,
  tierHasFeature,
  tierOpens,
  tierRank,
} from './tiers';

const NOW = Date.parse('2026-11-15T12:00:00.000Z');

function membership(over: Partial<Membership>): Membership {
  return { membershipId: 'mem_x', clientId: 'someone', tier: 'plus', source: 'admin', grantedAt: '2026-11-01T00:00:00.000Z', ...over };
}

describe('the tier ladder', () => {
  it('is Public, Plus, Pro, Cohort, Admin, lowest first', () => {
    assert.deepEqual(MEMBER_TIERS, ['public', 'plus', 'pro', 'cohort', 'admin']);
    assert.deepEqual(TIER_LADDER.map(tier => tier.label), ['Public', 'Plus', 'Pro', 'Cohort', 'Admin']);
    assert.deepEqual(MEMBER_TIERS.map(tierRank), [0, 1, 2, 3, 4]);
  });

  it('is strict: each tier opens its own level and everything below, nothing above', () => {
    for (const held of MEMBER_TIERS) {
      for (const needed of MEMBER_TIERS) {
        assert.equal(tierOpens(held, needed), tierRank(held) >= tierRank(needed), `${held} opens ${needed}`);
      }
    }
    assert.ok(tierOpens('pro', 'plus'));
    assert.ok(tierOpens('cohort', 'pro'));
    assert.ok(!tierOpens('plus', 'pro'));
    assert.ok(!tierOpens('cohort', 'admin'));
    assert.equal(higherTier('plus', 'cohort'), 'cohort');
  });

  it('lets an admin give Plus, Pro and Cohort: Public is no membership and Admin is the account flag', () => {
    assert.deepEqual(GRANTABLE_TIERS, ['plus', 'pro', 'cohort']);
  });

  it('hides the cohort and the vault from everyone below', () => {
    assert.deepEqual(MEMBER_TIERS.filter(isHiddenTier), ['cohort', 'admin']);
  });

  it('opens cloud projects at Plus and Lambda renders with the cohort', () => {
    assert.equal(FEATURE_TIERS.cloudProjects, 'plus');
    assert.deepEqual(MEMBER_TIERS.filter(tier => tierHasFeature(tier, 'cloudProjects')), ['plus', 'pro', 'cohort', 'admin']);
    assert.deepEqual(MEMBER_TIERS.filter(tier => tierHasFeature(tier, 'lambdaRender')), ['cohort', 'admin']);
  });
});

describe('memberships', () => {
  it('gives a person the highest of their live records, else Public', () => {
    assert.equal(memberTierFrom([], NOW), 'public');
    assert.equal(memberTierFrom([membership({ tier: 'plus' }), membership({ tier: 'pro' })], NOW), 'pro');
    // a removed or expired record no longer counts
    assert.equal(memberTierFrom([membership({ tier: 'cohort', revokedAt: '2026-11-10T00:00:00.000Z' }), membership({ tier: 'plus' })], NOW), 'plus');
    assert.equal(memberTierFrom([membership({ tier: 'pro', expiresAt: '2026-11-15T11:59:59.000Z' })], NOW), 'public');
    assert.ok(isLive(membership({ expiresAt: '2026-11-15T12:00:01.000Z' }), NOW));
  });

  it('names the record that gives the tier: the highest, then the one that lasts longest', () => {
    const short = membership({ membershipId: 'short', tier: 'pro', expiresAt: '2026-12-01T00:00:00.000Z' });
    const long = membership({ membershipId: 'long', tier: 'pro', expiresAt: '2027-02-01T00:00:00.000Z' });
    const forever = membership({ membershipId: 'forever', tier: 'pro' });
    assert.equal(currentMembership([short, long], NOW)?.membershipId, 'long');
    assert.equal(currentMembership([short, forever, long], NOW)?.membershipId, 'forever');
    assert.equal(currentMembership([membership({ tier: 'plus' }), short], NOW)?.membershipId, 'short');
    assert.equal(currentMembership([], NOW), null);
  });

  it('ends a contribution after 3 months, and renews it by contributing again', () => {
    assert.equal(CONTRIBUTION_MONTHS, 3);
    assert.equal(expiryFor({ source: 'contribution' }, '2026-11-15T12:00:00.000Z'), '2027-02-15T12:00:00.000Z');
    // the end of a month that has no such day is that month's last day
    assert.equal(monthsAfter('2026-11-30T00:00:00.000Z', 3), '2027-02-28T00:00:00.000Z');
    const first = membership({ source: 'contribution', expiresAt: expiryFor({ source: 'contribution' }, '2026-08-01T00:00:00.000Z') });
    assert.equal(memberTierFrom([first], NOW), 'public');
    const again = membership({ source: 'contribution', expiresAt: expiryFor({ source: 'contribution' }, '2026-11-10T00:00:00.000Z') });
    assert.equal(memberTierFrom([first, again], NOW), 'plus');
  });

  it('keeps a membership an admin made permanent until an admin removes it', () => {
    assert.equal(expiryFor({ source: 'contribution', permanent: true }, NOW), undefined);
    const permanent = membership({ source: 'contribution', permanent: true });
    assert.equal(memberTierFrom([permanent], Date.parse('2036-01-01')), 'plus');
    assert.equal(memberTierFrom([{ ...permanent, revokedAt: '2027-01-01T00:00:00.000Z' }], Date.parse('2027-06-01')), 'public');
  });

  it("gives an admin's grant no expiry unless it says how long", () => {
    assert.equal(expiryFor({ source: 'admin' }, NOW), undefined);
    assert.equal(expiryFor({ source: 'invite', days: 30 }, '2026-11-15T12:00:00.000Z'), '2026-12-15T12:00:00.000Z');
    assert.equal(expiryFor({ source: 'admin', expiresAt: '2027-01-01T00:00:00.000Z' }, NOW), '2027-01-01T00:00:00.000Z');
  });

  it('says how a membership was got and how long it lasts', () => {
    assert.equal(
      describeMembership(membership({ source: 'contribution', ref: 'microfox-ai/mediamake#570', expiresAt: '2027-02-15T12:00:00.000Z' })),
      'Earned by contributing (microfox-ai/mediamake#570): until 2027-02-15, renewed by contributing again',
    );
    assert.equal(describeMembership(membership({ source: 'contribution', permanent: true })), 'Earned by contributing: permanent, until an admin removes it');
    assert.equal(describeMembership(membership({ source: 'admin' })), 'Given by an admin: until an admin removes it');
  });
});
