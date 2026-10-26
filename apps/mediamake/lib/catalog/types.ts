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
 * Release stage of an item, from most to least restricted.
 *  - private: only viewers with an explicit grant.
 *  - network: members of the `network` group (the internal circle) plus grants.
 *  - public:  everyone, signed in or not.
 * Anything other than public goes through the access check in lib/access.
 */
export type CatalogVisibility = 'private' | 'network' | 'public';
export type Visibility = CatalogVisibility;

export const VISIBILITIES: Visibility[] = ['private', 'network', 'public'];

/** The group whose members can use every `network` item. */
export const NETWORK_GROUP = 'network';

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
