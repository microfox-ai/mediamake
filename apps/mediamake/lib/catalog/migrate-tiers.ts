import { currentMembership, type Membership } from '../memberships/membership';
import { LEGACY_PERSON_TIER, tierOpens, type GrantableTier } from '../memberships/tiers';
import {
  NETWORK_GROUP,
  PRIVATE_GROUP,
  isAlwaysPublic,
  itemTier,
  type AccessGrant,
  type AccessGroup,
  type CatalogItemRecord,
  type ItemTier,
  type ReadinessMark,
  type ReadyProof,
} from './types';

/**
 * The move from the earlier tiers (vault, development, community, public;
 * private testers and the community) to the membership ladder, as a plan.
 * Pure: the admin API reads the records, shows this plan (a dry run) and
 * applies it when told to. Running it again plans nothing: a stored item
 * that has a `tier` and a person who has their membership are left alone.
 *
 * Decided on 2026-11-15:
 *  - people: private testers (the `private` group, or a `*` grant of their
 *    own) join the cohort; the community (`network` group) becomes Pro.
 *  - items: the vault stays the vault (Admin); items in development go to
 *    the cohort, except Browse Hack and ProjectSync, which are Pro; community
 *    items become Pro; Public stays Public.
 *  - readiness: everything is Beta, except pack-brand-kit, which is Ready.
 *  - cloud projects open at Plus: that is code (FEATURE_TIERS), not data.
 */

/** Items whose tier was decided by name. */
export const ITEM_TIER_DECISIONS: Record<string, ItemTier> = {
  'mcp/browse-hack': 'pro',
  'mcp/projectsync': 'pro',
};

/** Items that start Ready, with the production that proves each. */
export const READY_DECISIONS: Record<string, ReadyProof[]> = {
  'skill/pack-brand-kit': [
    {
      title: 'The Microfox brand kit, made on camera in Cook with Claude episode 1',
      url: 'https://www.youtube.com/watch?v=7C88BcfQJoM',
    },
  ],
};

export interface TierMigrationInput {
  /** The stored items (the repo's own are already on the ladder). */
  items: CatalogItemRecord[];
  groups: Pick<AccessGroup, 'groupId' | 'members'>[];
  /** Live grants. */
  grants: Pick<AccessGrant, 'grantId' | 'itemId' | 'subject'>[];
  /** Live memberships. */
  memberships: Membership[];
  readiness: Pick<ReadinessMark, 'id' | 'readiness'>[];
  /** Every item id the catalog knows, stored or in the repo. */
  knownIds: Iterable<string>;
}

export interface TierMigrationPlan {
  people: { clientId: string; tier: GrantableTier; from: string }[];
  /** Earlier tiers to clear once the memberships exist, so a later change of tier holds. */
  leaveGroups: { groupId: string; clientIds: string[] }[];
  revokeGrants: { grantId: string; clientId: string }[];
  items: { id: string; from: string; tier: ItemTier }[];
  ready: { id: string; proof: ReadyProof[] }[];
}

/** What a stored item's stage was called before the ladder. */
function earlierName(item: CatalogItemRecord): string {
  if (item.neverPublish) return 'vault';
  return { private: 'development', network: 'community', public: 'public' }[item.visibility];
}

export function planTierMigration(input: TierMigrationInput): TierMigrationPlan {
  const members = (groupId: string) => input.groups.find(group => group.groupId === groupId)?.members ?? [];
  const everything = input.grants.filter(grant => grant.itemId === '*' && grant.subject.kind === 'client');

  // each person once, at the highest tier their earlier place gives
  const wanted = new Map<string, { tier: GrantableTier; from: string }>();
  for (const clientId of members(NETWORK_GROUP)) wanted.set(clientId, { tier: LEGACY_PERSON_TIER.community, from: 'community' });
  for (const grant of everything) wanted.set(grant.subject.id, { tier: LEGACY_PERSON_TIER.private, from: 'a grant of everything' });
  for (const clientId of members(PRIVATE_GROUP)) wanted.set(clientId, { tier: LEGACY_PERSON_TIER.private, from: 'private tester' });

  const people = [...wanted].flatMap(([clientId, { tier, from }]) => {
    const held = currentMembership(input.memberships.filter(membership => membership.clientId === clientId));
    return held && tierOpens(held.tier, tier) ? [] : [{ clientId, tier, from }];
  });

  const known = new Set(input.knownIds);
  const ready = new Set(input.readiness.filter(mark => mark.readiness === 'ready').map(mark => mark.id));

  return {
    people: people.sort((a, b) => a.clientId.localeCompare(b.clientId)),
    leaveGroups: [PRIVATE_GROUP, NETWORK_GROUP].map(groupId => ({ groupId, clientIds: [...members(groupId)] })).filter(group => group.clientIds.length),
    revokeGrants: everything.map(grant => ({ grantId: grant.grantId, clientId: grant.subject.id })),
    items: input.items
      .filter(item => item.tier === undefined)
      .map(item => ({
        id: item.id,
        from: earlierName(item),
        // a pending gate stays: the tier is where the item is until then
        tier: isAlwaysPublic(item) ? 'public' : item.neverPublish ? 'admin' : (ITEM_TIER_DECISIONS[item.id] ?? itemTier({ ...item, publicAt: undefined })),
      })),
    ready: Object.entries(READY_DECISIONS)
      .filter(([id]) => known.has(id) && !ready.has(id))
      .map(([id, proof]) => ({ id, proof })),
  };
}

/** True when the plan changes nothing. */
export function isEmptyPlan(plan: TierMigrationPlan): boolean {
  return !plan.people.length && !plan.leaveGroups.length && !plan.revokeGrants.length && !plan.items.length && !plan.ready.length;
}
