import { TIER_LADDER, isGrantableTier, tierRank, type GrantableTier, type MemberTier } from './tiers';

/**
 * Asking an admin for a membership. A request is an access request (the
 * `access_requests` collection, as for one item) whose item id names a tier,
 * `tier/pro`, so it lands in the same queue on Manage Memberships. Approving
 * one gives the membership instead of a grant.
 *
 * Pure: safe for the browser.
 */

const PREFIX = 'tier/';

/** The item id a request for `tier` is stored under. */
export function tierRequestId(tier: GrantableTier): string {
  return `${PREFIX}${tier}`;
}

/** The tier a request asks for, or null when it asks for an item. */
export function requestedTier(itemId: string): GrantableTier | null {
  const tier = itemId.startsWith(PREFIX) ? itemId.slice(PREFIX.length) : null;
  return isGrantableTier(tier) ? tier : null;
}

/**
 * The next membership a person at `tier` can reach: the next one up that an
 * admin can give and that isn't hidden. Pro has none (Cohort is invisible
 * and given by an admin only), and neither do Cohort and Admin.
 */
export function nextTier(tier: MemberTier): GrantableTier | null {
  const next = TIER_LADDER[tierRank(tier) + 1];
  return next && next.grantable && !next.hidden ? (next.id as GrantableTier) : null;
}
