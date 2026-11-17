import { tierOpens, type MemberTier } from '@/lib/memberships/tiers';

/**
 * The signed-in app at /app: its sidebar, as data. Four sections (Home,
 * Features, Admin, Account); a page is one row here plus its folder under
 * app/app. Pure, so the sidebar (browser) and the layouts (server) share it.
 *
 * `needs` is the lowest membership that opens the page. A section with
 * `hiddenBelow` is left out of the sidebar for everyone under that tier, and
 * its pages redirect them (app/app/(admin)/layout.tsx). A page with `needs`
 * alone stays listed with the tier's name beside it, and says on the page
 * what the membership adds.
 */

export const APP_HOME = '/app';

export type AppNavIcon =
  | 'home'
  | 'explore'
  | 'mine'
  | 'projects'
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
      { title: 'Spaces', href: '/app/spaces', icon: 'projects' },
    ],
  },
  {
    label: 'Admin',
    hiddenBelow: 'admin',
    items: [
      { title: 'Releases', href: '/app/releases', icon: 'releases' },
      { title: 'MediaMake MCP', href: '/app/mediamake-mcp', icon: 'mcp' },
      { title: 'Billing', href: '/app/billing', icon: 'billing' },
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

/** The sections a person at `tier` sees. */
export function navFor(tier: MemberTier): AppNavSection[] {
  return APP_NAV.filter(section => !section.hiddenBelow || tierOpens(tier, section.hiddenBelow));
}

/** Whether `item` is the page at `pathname` (Home only on /app itself, the rest on their sub-pages too). */
export function isActive(item: AppNavItem, pathname: string): boolean {
  return item.href === APP_HOME ? pathname === APP_HOME : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
