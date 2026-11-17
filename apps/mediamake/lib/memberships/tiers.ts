/**
 * The membership ladder, as data. Each tier opens everything the tiers below
 * it open (the ladder is strict), so access is one comparison of ranks: an
 * item names the lowest tier that opens it, and a person holds one tier.
 *
 * To add a tier, add a row here in its place on the ladder: nothing else
 * compares tier names. Pure: no database, safe for the browser.
 */

export const TIER_LADDER = [
  {
    id: 'public',
    label: 'Public',
    who: 'Everyone',
    how: 'Signing up, or not signing in at all',
    /** Whether an admin can give it to a person (Public is having no membership, Admin is the account's admin flag). */
    grantable: false,
    /** Hidden from everyone below it: no card, no name, a 404. */
    hidden: false,
  },
  {
    id: 'plus',
    label: 'Plus',
    who: 'Plus members and above',
    how: 'Contributing, or an admin grant',
    grantable: true,
    hidden: false,
  },
  {
    id: 'pro',
    label: 'Pro',
    who: 'Pro members and above',
    how: 'Contributing a Pro item, or an admin grant',
    grantable: true,
    hidden: false,
  },
  {
    id: 'cohort',
    label: 'Cohort',
    who: 'The cohort and admins',
    how: 'An admin grant only',
    grantable: true,
    hidden: true,
  },
  {
    id: 'admin',
    label: 'Admin',
    who: 'Admins only',
    how: 'The admin flag on the account',
    grantable: false,
    hidden: true,
  },
] as const;

export type MemberTier = (typeof TIER_LADDER)[number]['id'];

/** Every tier, lowest first. */
export const MEMBER_TIERS: MemberTier[] = TIER_LADDER.map(tier => tier.id);

/** The tiers an admin can give a person: Plus, Pro, Cohort. */
export type GrantableTier = Exclude<MemberTier, 'public' | 'admin'>;
export const GRANTABLE_TIERS = TIER_LADDER.filter(tier => tier.grantable).map(tier => tier.id) as GrantableTier[];

export function isMemberTier(value: unknown): value is MemberTier {
  return typeof value === 'string' && (MEMBER_TIERS as string[]).includes(value);
}

export function isGrantableTier(value: unknown): value is GrantableTier {
  return typeof value === 'string' && (GRANTABLE_TIERS as string[]).includes(value);
}

/** Where a tier is on the ladder: 0 for Public, rising. */
export function tierRank(tier: MemberTier): number {
  return MEMBER_TIERS.indexOf(tier);
}

/** True when a person at `held` opens what needs `needed`: the same tier or any above it. */
export function tierOpens(held: MemberTier, needed: MemberTier): boolean {
  return tierRank(held) >= tierRank(needed);
}

/** The higher of two tiers. */
export function higherTier(a: MemberTier, b: MemberTier): MemberTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

export function tierInfo(tier: MemberTier) {
  return TIER_LADDER[tierRank(tier)];
}

export function tierLabel(tier: MemberTier): string {
  return tierInfo(tier).label;
}

/** True when the tier's items stay out of sight of everyone below it (Cohort, Admin). */
export function isHiddenTier(tier: MemberTier): boolean {
  return tierInfo(tier).hidden;
}

/**
 * The lowest tier that opens each feature that isn't a catalog item. Cloud
 * projects (project spaces and a space's files, brand kits, channel sync, song takes) open at
 * Plus; the MediaMake Spaces MCP (mcp/projectsync) that syncs them from a computer is a catalog
 * item, at Plus too. Lambda renders cost money per render, so they stay with the
 * cohort.
 */
export const FEATURE_TIERS = {
  cloudProjects: 'plus',
  lambdaRender: 'cohort',
} as const satisfies Record<string, MemberTier>;

export type TierFeature = keyof typeof FEATURE_TIERS;

export function tierHasFeature(tier: MemberTier, feature: TierFeature): boolean {
  return tierOpens(tier, FEATURE_TIERS[feature]);
}

/**
 * The tiers before the ladder, read as tiers on it, so nothing locks anyone
 * out before the migration runs: private testers (the `private` group, or a
 * `*` grant) are the cohort, the community (`network` group) is Pro.
 */
export const LEGACY_PERSON_TIER: Record<'private' | 'community', GrantableTier> = { private: 'cohort', community: 'pro' };
