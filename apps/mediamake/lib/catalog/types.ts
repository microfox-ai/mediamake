export type CatalogKind = 'mcp' | 'skill' | 'app' | 'tutorial';

/**
 * public  - listed and usable by everyone.
 * network - released to the internal network; listed, but gated.
 * private - listed, but only viewers granted access can open it.
 * Anything other than public goes through the access check in lib/access.
 */
export type CatalogVisibility = 'public' | 'network' | 'private';

export type CatalogStatus = 'live' | 'beta' | 'coming-soon';

export interface CatalogItem {
  /** Stable id, `<kind>/<slug>`. Access grants reference this id. */
  id: string;
  kind: CatalogKind;
  title: string;
  summary: string;
  visibility: CatalogVisibility;
  status: CatalogStatus;
  /** Where the card links once the viewer has access. Never sent to viewers without access. */
  href?: string;
  cover?: string;
  tags?: string[];
  version?: string;
  /** ISO date, used to sort newest first. */
  releasedAt: string;
}

/**
 * open    - public item.
 * granted - gated item the viewer has access to.
 * locked  - gated item the viewer can't open; its href is stripped.
 */
export type CatalogAccess = 'open' | 'granted' | 'locked';

export type CatalogEntry = CatalogItem & { access: CatalogAccess };
