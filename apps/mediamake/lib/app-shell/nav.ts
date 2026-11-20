import { FEATURE_TIERS, tierOpens, type MemberTier } from '@/lib/memberships/tiers';

/**
 * The signed-in app at /app: its sidebar, as data. Four sections (Home,
 * Features, Admin, Account); a page is one row here plus its folder under
 * app/app. Pure, so the sidebar (browser) and the layouts (server) share it.
 *
 * `needs` is the lowest membership that opens the page. A section with
 * `hiddenBelow` is left out of the sidebar for everyone under that tier, and
 * its pages redirect them (app/app/(admin)/layout.tsx). A page with
 * `hiddenBelow` is left out the same way, and its own layout redirects
 * (Spaces and Library: the cohort and admins, for now). A page with `needs`
 * alone stays listed with the tier's name beside it, and says on the page
 * what the membership adds.
 */

export const APP_HOME = '/app';

export const SPACES_HREF = '/app/spaces';
export const LIBRARY_HREF = '/app/library';

export type AppNavIcon =
  | 'home'
  | 'explore'
  | 'mine'
  | 'projects'
  | 'library'
  | 'libraryUsage'
  | 'releases'
  | 'mcp'
  | 'billing'
  | 'memberships'
  | 'feedback'
  | 'submissions'
  | 'keys'
  | 'devices'
  | 'subscription';

export interface AppNavItem {
  title: string;
  href: string;
  icon: AppNavIcon;
  needs?: MemberTier;
  /** Left out of the sidebar, and closed, for everyone under this tier. */
  hiddenBelow?: MemberTier;
}

export interface AppNavSection {
  /** No label: the row stands on its own (Home). */
  label?: string;
  hiddenBelow?: MemberTier;
  items: AppNavItem[];
}

export const APP_NAV: AppNavSection[] = [
  { items: [{ title: 'Home', href: APP_HOME, icon: 'home' }] },
  {
    label: 'Features',
    items: [
      { title: 'Explore', href: '/app/explore', icon: 'explore' },
      { title: 'Mine', href: '/app/mine', icon: 'mine' },
      { title: 'Spaces', href: SPACES_HREF, icon: 'projects', hiddenBelow: 'cohort' },
      { title: 'Library', href: LIBRARY_HREF, icon: 'library', hiddenBelow: FEATURE_TIERS.cloudLibrary },
    ],
  },
  {
    label: 'Admin',
    hiddenBelow: 'admin',
    items: [
      { title: 'Releases', href: '/app/releases', icon: 'releases' },
      { title: 'MediaMake MCP', href: '/app/mediamake-mcp', icon: 'mcp' },
      { title: 'Billing', href: '/app/billing', icon: 'billing' },
      { title: 'Library Usage', href: '/app/library-usage', icon: 'libraryUsage' },
      { title: 'Manage Memberships', href: '/app/memberships', icon: 'memberships' },
      { title: 'Submissions', href: '/app/submissions', icon: 'submissions' },
      { title: 'Feedback', href: '/app/feedback', icon: 'feedback' },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'API Keys', href: '/app/api-keys', icon: 'keys' },
      { title: 'Signed In Devices', href: '/app/devices', icon: 'devices' },
      { title: 'Subscription', href: '/app/subscription', icon: 'subscription' },
    ],
  },
];

/** The sections a person at `tier` sees, each with the pages that tier sees. */
export function navFor(tier: MemberTier): AppNavSection[] {
  return APP_NAV.filter(section => !section.hiddenBelow || tierOpens(tier, section.hiddenBelow))
    .map(section => ({ ...section, items: section.items.filter(item => !item.hiddenBelow || tierOpens(tier, item.hiddenBelow)) }))
    .filter(section => section.items.length);
}

/**
 * Whether the page at `href` (or one under it) is there for a person at `tier`: false only for a
 * page, or a section, that is hidden below a tier they don't hold.
 */
export function pageOpens(tier: MemberTier, href: string): boolean {
  for (const section of APP_NAV)
    for (const item of section.items) {
      if (href !== item.href && !href.startsWith(`${item.href}/`)) continue;
      if (item.href === APP_HOME && href !== APP_HOME) continue;
      return [section.hiddenBelow, item.hiddenBelow].every(needed => !needed || tierOpens(tier, needed));
    }
  return true;
}

/** Whether `item` is the page at `pathname` (Home only on /app itself, the rest on their sub-pages too). */
export function isActive(item: AppNavItem, pathname: string): boolean {
  return item.href === APP_HOME ? pathname === APP_HOME : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
