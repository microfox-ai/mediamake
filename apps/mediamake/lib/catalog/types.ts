/**
 * Catalog of released products (skills, MCPs, apps, tutorials) and the
 * records that decide who may use the gated ones.
 *
 * Only metadata lives here and in MongoDB. The packaged content of a
 * private or network item sits in a private bucket path and is handed out
 * through short-lived signed links, so nothing private is ever committed to
 * this (public) repository.
 */

export type CatalogKind = 'skill' | 'mcp' | 'app' | 'tutorial';

export const CATALOG_KINDS: CatalogKind[] = ['skill', 'mcp', 'app', 'tutorial'];

/**
 * Kinds that are always public. Every skill's files are committed in the
 * repo (.agents/skills, listed in SKILLS.md), so a skill item is never gated:
 * no development, community, vault or release gate, and it opens for everyone
 * even while public releases are locked. Apps, MCPs and tutorials go through
 * the gated releases below.
 */
export const ALWAYS_PUBLIC_KINDS: CatalogKind[] = ['skill'];

/** True when the item's kind is always public (see ALWAYS_PUBLIC_KINDS). */
export function isAlwaysPublic(item: { id?: string; kind?: CatalogKind }): boolean {
  const kind = item.kind ?? (item.id?.split('/')[0] as CatalogKind | undefined);
  return !!kind && ALWAYS_PUBLIC_KINDS.includes(kind);
}

export const ALWAYS_PUBLIC_ERROR = 'Skills are always public: only apps, MCPs and tutorials go through gated releases';

/**
 * Release stage of an item, from most to least restricted.
 *  - private: only viewers with an explicit grant.
 *  - network: members of the `network` group (the internal circle) plus grants.
 *  - public:  everyone, signed in or not.
 * Anything other than public goes through the access check in lib/access.
 */
export type CatalogVisibility = 'private' | 'network' | 'public';
export type Visibility = CatalogVisibility;

export const VISIBILITIES: Visibility[] = ['private', 'network', 'public'];

/** The group whose members can use every `network` item (the community tier). */
export const NETWORK_GROUP = 'network';
export const COMMUNITY_GROUP = NETWORK_GROUP;

/**
 * The group of private testers: they can use every item, in development or
 * ready, except the ones marked never-publish. They can't release anything;
 * only admins can.
 */
export const PRIVATE_GROUP = 'private';

/** Days a release spends with the community before it goes public, unless told otherwise. */
export const DEFAULT_GATE_DAYS = 30;

/**
 * Release tiers, as the admin dashboard shows them. Stored as `visibility`
 * plus `neverPublish`:
 *  - vault:       never published. Admins only, plus explicit item grants.
 *  - development: being built (`private`). Private testers and grants.
 *  - community:   production ready, pre-release (`network`). The community group too.
 *  - public:      released. Everyone (once public releases are open).
 * A community item with `publicAt` is gated: it turns public by itself at that time.
 */
export type ReleaseTier = 'vault' | 'development' | 'community' | 'public';
export const RELEASE_TIERS: ReleaseTier[] = ['vault', 'development', 'community', 'public'];

/**
 * Who a viewer is, from most to least access:
 *  - admin:     everything, and the only one who can release.
 *  - private:   in the `private` group (or holds a `*` grant): everything but the vault.
 *  - community: in the `network` group: production-ready items before release.
 *  - public:    everyone else: released items only.
 */
export type ViewerTier = 'admin' | 'private' | 'community' | 'public';

/**
 * What a viewer can do with an item.
 *  - open:    public item.
 *  - granted: gated item the viewer has access to.
 *  - locked:  gated item the viewer can't open; its href is stripped.
 */
export type CatalogAccess = 'open' | 'granted' | 'locked';
export type AccessLevel = CatalogAccess;

export type CatalogStatus = 'live' | 'beta' | 'coming-soon';

/** One uploaded, immutable package of an item. */
export interface CatalogVersion {
  version: string;
  /** Object key in the private catalog bucket. */
  storageKey: string;
  sha256: string;
  bytes: number;
  publishedAt: string;
  publishedBy?: string;
  notes?: string;
}

/** The public-safe card data of an item. */
export interface CatalogItem {
  /** Stable id, `<kind>/<slug>`, e.g. `skill/lyric-video`. Grants reference it. */
  id: string;
  kind: CatalogKind;
  title: string;
  summary: string;
  visibility: CatalogVisibility;
  status: CatalogStatus;
  /**
   * false hides the card from viewers without access instead of showing it
   * locked. Use it for items whose name should not be seen yet.
   */
  listed?: boolean;
  /**
   * A `public` page anyone can already open (no package, nothing to gate),
   * shown to everyone even while releases are locked.
   */
  openToAll?: boolean;
  /**
   * Never published: stays in the vault (admins and explicit grants only)
   * and can't be moved to network or public.
   */
  neverPublish?: boolean;
  /**
   * When a gated release goes public by itself (ISO date). Until then the
   * item is a community item; see effectiveVisibility.
   */
  publicAt?: string;
  /** Where the card links once the viewer has access. Never sent to viewers without access. */
  href?: string;
  cover?: string;
  tags?: string[];
  /** Latest published version. */
  version?: string;
  /** ISO date, used to sort newest first. */
  releasedAt: string;
  updatedAt?: string;
}

/**
 * Something an item needs installed first. Install plans resolve these
 * recursively, dependencies first (see lib/catalog/install).
 */
export type InstallRequirement =
  /** Another catalog item, e.g. `skill/remotion-basics`. */
  | { type: 'item'; id: string }
  /** A GitHub repository to clone, e.g. `microfox-ai/mediamake`. */
  | { type: 'repo'; repo: string; why?: string }
  /** A file attached to a public GitHub release, e.g. a Chrome extension zip. */
  | {
      type: 'github-release';
      repo: string;
      asset: string;
      name: string;
      /** `latest` (default) or a tag such as `v0.1.1`. */
      tag?: string;
      kind?: 'chrome-extension' | 'binary' | 'other';
      /** Human install guide for the release, shown to the person. */
      guide?: string;
    };

/**
 * How an item is installed once its package is downloaded.
 *  - skill:  unpack into the skills folder (`~/.claude/skills/<slug>`).
 *  - mcpb:   open the `.mcpb` bundle (`entry`) in Claude Desktop.
 *  - app:    unpack and follow the package's INSTALL.md.
 *  - manual: only follow the package's INSTALL.md.
 * Any package may carry an INSTALL.md with item-specific steps; the
 * installer always follows it after the method's own step.
 */
export type InstallMethod = 'skill' | 'mcpb' | 'app' | 'manual';

export interface InstallSpec {
  method?: InstallMethod;
  /** File inside the package the method acts on, e.g. `get-into-zone.mcpb`. */
  entry?: string;
  requires?: InstallRequirement[];
  /** Short note shown to the person before installing. */
  notes?: string;
}

/** The stored record: card data plus versions and bookkeeping. */
export interface CatalogItemRecord extends CatalogItem {
  slug: string;
  install?: InstallSpec;
  versions: CatalogVersion[];
  createdAt: string;
  createdBy?: string;
  /** When the current release gate (`publicAt`) was set, for its progress bar. */
  gateStartedAt?: string;
  /** Visibility changes over time, newest last. */
  stageHistory?: { visibility: Visibility; at: string; by?: string }[];
}

export type CatalogEntry = CatalogItem & {
  access: CatalogAccess;
  /**
   * A prompt to paste into Claude that installs the item and everything it
   * needs. Only set on items the viewer can open that have a package.
   */
  installPrompt?: string;
};
export type CatalogItemWithAccess = CatalogEntry;

export const CATALOG_STATUSES: CatalogStatus[] = ['live', 'beta', 'coming-soon'];

/** Who a grant is for. */
export type GrantSubject =
  | { kind: 'client'; id: string }
  | { kind: 'group'; id: string };

/** Permission for a subject to use one item, or every item with `'*'`. */
export interface AccessGrant {
  grantId: string;
  itemId: string | '*';
  subject: GrantSubject;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  note?: string;
  /** Set when the grant came from redeeming an invite. */
  inviteCode?: string;
}

/** A named set of clients, e.g. `network` or `beta-testers`. */
export interface AccessGroup {
  groupId: string;
  name: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A shareable code. Redeeming it (signed in) grants the listed items, or
 * adds the redeemer to a group, until `maxUses` is reached or it expires.
 */
export interface AccessInvite {
  code: string;
  itemIds: (string | '*')[];
  /** Redeemers join this group instead of / as well as getting item grants. */
  groupId?: string;
  maxUses: number;
  uses: number;
  redeemedBy: { clientId: string; at: string }[];
  /** How long the resulting grants last, in days. Unset = no expiry. */
  grantDays?: number;
  createdBy?: string;
  createdAt: string;
  expiresAt?: string;
  disabledAt?: string;
  note?: string;
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AccessRequest {
  requestId: string;
  itemId: string;
  clientId: string;
  message?: string;
  status: AccessRequestStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CatalogDownload {
  itemId: string;
  version: string;
  clientId: string | null;
  at: string;
}

/**
 * Visibility right now: a skill is always public, and a gated item whose
 * `publicAt` has passed is public.
 */
export function effectiveVisibility(
  item: Pick<CatalogItem, 'visibility' | 'neverPublish' | 'publicAt'> & Partial<Pick<CatalogItem, 'id' | 'kind'>>,
  now: number = Date.now(),
): Visibility {
  if (isAlwaysPublic(item)) return 'public';
  if (item.neverPublish) return 'private';
  if (item.visibility === 'network' && item.publicAt && Date.parse(item.publicAt) <= now) return 'public';
  return item.visibility;
}

/** The dashboard tier of an item right now. */
export function releaseTier(
  item: Pick<CatalogItem, 'visibility' | 'neverPublish' | 'publicAt'> & Partial<Pick<CatalogItem, 'id' | 'kind'>>,
  now: number = Date.now(),
): ReleaseTier {
  if (isAlwaysPublic(item)) return 'public';
  if (item.neverPublish) return 'vault';
  const visibility = effectiveVisibility(item, now);
  return visibility === 'public' ? 'public' : visibility === 'network' ? 'community' : 'development';
}

export function catalogItemId(kind: CatalogKind, slug: string): string {
  return `${kind}/${slug}`;
}

export function slugOf(id: string): string {
  return id.slice(id.indexOf('/') + 1);
}

export function parseCatalogItemId(
  id: string,
): { kind: CatalogKind; slug: string } | null {
  const [kind, ...rest] = id.split('/');
  const slug = rest.join('/');
  if (!CATALOG_KINDS.includes(kind as CatalogKind) || !isValidSlug(slug)) {
    return null;
  }
  return { kind: kind as CatalogKind, slug };
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);
}
