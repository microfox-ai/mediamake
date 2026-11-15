import {
  NETWORK_GROUP,
  PRIVATE_GROUP,
  isAlwaysPublic,
  itemTier,
  type AccessLevel,
  type CatalogItem,
  type ViewerTier,
} from '@/lib/catalog/types';
import { memberTierFrom, type Membership } from '@/lib/memberships/membership';
import { LEGACY_PERSON_TIER, higherTier, tierHasFeature, tierOpens, type MemberTier } from '@/lib/memberships/tiers';

/**
 * The access rules, pure: what a viewer with these entitlements can do with
 * an item. ./index says how the ladder works and loads the entitlements.
 */

/**
 * Who is looking. `clientId` is null for signed-out visitors.
 */
export interface Viewer {
  clientId: string | null;
}

/** The fields access depends on; any other catalog fields may ride along. */
export type GatedItem = Pick<CatalogItem, 'id' | 'visibility'> & Partial<CatalogItem>;

/** Everything that decides what one viewer may open, resolved once. */
export interface Entitlements {
  clientId: string | null;
  isAdmin: boolean;
  groups: string[];
  /** Every item is granted (a `'*'` grant). */
  all: boolean;
  itemIds: Set<string>;
  /** Their live membership records (see lib/memberships): how they got their tier. */
  memberships: Membership[];
}

/**
 * Whether `public` items are open to everyone. Releases are locked until
 * MEDIAMAKE_PUBLIC_RELEASES=open: until then a public item needs a grant
 * like a private one, and nothing is shown to signed-out visitors.
 */
export function publicReleasesOpen(): boolean {
  return process.env.MEDIAMAKE_PUBLIC_RELEASES === 'open';
}

/** True when the item is open to everyone, signed in or not. */
export function openToEveryone(item: GatedItem): boolean {
  return itemTier(item) === 'public' && (publicReleasesOpen() || !!item.openToAll || isAlwaysPublic(item));
}

/** What `entitlements` can do with `item`. */
export function accessLevel(
  entitlements: Entitlements,
  item: GatedItem,
): AccessLevel {
  if (openToEveryone(item)) return 'open';
  if (entitlements.isAdmin || entitlements.itemIds.has(item.id)) return 'granted';
  const needed = itemTier(item);
  // The vault only opens to admins and grants that name the item.
  if (needed === 'admin') return 'locked';
  const kindWildcard = `${item.id.split('/')[0]}/*`;
  if (entitlements.all || entitlements.itemIds.has(kindWildcard)) return 'granted';
  // The ladder: a member opens everything at their tier or below. That
  // includes Public items while public releases are still locked.
  const held = viewerTier(entitlements);
  if (held !== 'public' && tierOpens(held, needed)) return 'granted';
  return 'locked';
}

/**
 * The tier a viewer holds on the ladder: Admin by their flag, else the
 * highest of their live membership records, else Public. Until the
 * migration turns them into membership records, the earlier tiers still
 * count: a private tester (the `private` group, or a `*` grant) is in the
 * cohort and a community member (the `network` group) is Pro.
 */
export function viewerTier(entitlements: Entitlements): ViewerTier {
  if (entitlements.isAdmin) return 'admin';
  let tier: MemberTier = memberTierFrom(entitlements.memberships ?? []);
  if (entitlements.all || entitlements.groups.includes(PRIVATE_GROUP)) tier = higherTier(tier, LEGACY_PERSON_TIER.private);
  if (entitlements.groups.includes(NETWORK_GROUP)) tier = higherTier(tier, LEGACY_PERSON_TIER.community);
  return tier;
}

/**
 * Whether a tier may keep projects in the cloud (the Projects page, brand
 * kits, channel sync, song takes): Plus and above. Public accounts keep
 * their work on their own computer. The ProjectSync MCP, which syncs cloud
 * projects from a computer, is a catalog item of its own, at Pro.
 */
export function canUseCloudProjects(tier: ViewerTier): boolean {
  return tierHasFeature(tier, 'cloudProjects');
}

/** Whether a tier may render on Remotion Lambda, which costs money per render: the cohort and admins. */
export function canRenderOnLambda(tier: ViewerTier): boolean {
  return tierHasFeature(tier, 'lambdaRender');
}
