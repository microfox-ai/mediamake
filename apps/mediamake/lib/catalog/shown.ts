import { isFailed, isHiddenFromBelow, type CatalogAccess, type ItemHealth, type ItemTier, type Readiness } from './types';

/**
 * Where an item shows, from its access, readiness and health: the one table
 * the public site, the app and the admin pages all follow.
 *
 * | Surface          | Production, healthy   | Beta                  | Alpha                  | Failed                           |
 * |------------------|-----------------------|-----------------------|------------------------|----------------------------------|
 * | site             | yes, if it is Public  | no                    | no                     | no                               |
 * | explore          | yes                   | yes, with a Beta badge| behind a filter, badged| only behind a filter, with why   |
 * | mine (installed) | yes                   | yes                   | yes                    | yes, with a warning and why      |
 * | admin            | yes                   | yes                   | yes                    | yes                              |
 *
 * Explore also keeps deprecated items (their listing's advice) and the vault's (admin only) behind
 * filters of their own (lib/app-shell/member `explore`).
 *
 * Pure: callers hand in the item as one viewer sees it.
 */
export type Surface = 'site' | 'explore' | 'mine' | 'admin';

export interface ShownItem {
  /** The lowest membership that opens it right now (see itemTier). */
  tier: ItemTier;
  readiness?: Readiness;
  health?: ItemHealth;
  archivedAt?: string;
  /** What this viewer can do with it. */
  access: CatalogAccess;
}

export interface Shown {
  show: boolean;
  /** Shown only when the viewer asks for it (Explore's failed filter). */
  behindFilter?: boolean;
  /** Badges and notes the surface puts on it: its level when it is not Production. */
  badge?: 'beta' | 'alpha';
  warning?: 'failed';
  /** Shown locked, saying which membership opens it. */
  locked?: boolean;
}

const HIDDEN: Shown = { show: false };

export function shownOn(surface: Surface, item: ShownItem): Shown {
  const failed = isFailed(item);
  const level = item.readiness ?? 'beta';
  const badge = level === 'ready' ? undefined : level;
  const locked = item.access === 'locked';

  if (surface === 'admin') return { show: true, ...(badge && { badge }), ...(failed && { warning: 'failed' as const }) };

  // what a viewer installed stays with them, whatever happened to it since
  if (surface === 'mine') return { show: true, ...(badge && { badge }), ...(failed && { warning: 'failed' as const }) };

  if (surface === 'site') {
    // the public site: only what is proven, working, in use and open to everyone
    return item.tier === 'public' && !badge && !failed && !item.archivedAt ? { show: true } : HIDDEN;
  }

  // explore: everything the viewer's tier opens, and what a higher tier would open, shown locked.
  // The cohort's and the vault's items stay out of sight of everyone below.
  if (locked && isHiddenFromBelow(item.tier)) return HIDDEN;
  return {
    show: true,
    ...(failed && { behindFilter: true }),
    ...(failed && { warning: 'failed' as const }),
    ...(badge && { badge }),
    ...(locked && { locked: true }),
  };
}
