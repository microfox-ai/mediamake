import type { ItemDetails } from './details';

/**
 * An item's page in the app (/app/item): one page for every skill, MCP and
 * app, private or public, laid out as a space's Code tab is. Every place that
 * lists items links here with the page it was opened from (`from`), so the
 * page's breadcrumb says where it came from and goes back there. Pure, so
 * the links, the page and the tests share it.
 */

export interface Crumb {
  label: string;
  /** Where it goes; none for the item itself. */
  href?: string;
}

/** The address of an item's page: its details key, and the page (path and query) it was opened from. */
export function itemPageHref(key: string, from?: string): string {
  return `/app/item?key=${encodeURIComponent(key)}${from ? `&from=${encodeURIComponent(from)}` : ''}`;
}

/** A page of this site to go back to, or undefined: a path, never another site's address. */
export function backPath(from: string | undefined | null): string | undefined {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\') && from.length <= 500 ? from : undefined;
}

const PLACES: [RegExp, string][] = [
  [/^\/app\/?$/, 'Home'],
  [/^\/app\/explore\/?$/, 'Explore'],
  [/^\/app\/mine\/?$/, 'My Items'],
  [/^\/app\/my-items\/?$/, 'My store items'],
  [/^\/app\/spaces\/?$/, 'Spaces'],
];

/**
 * The breadcrumb over an item's page: where it was opened (Home, Explore, My Items, a space, a store page),
 * then the item. Opened from nowhere known (a shared link), it starts at the space the item belongs to, or My Items.
 */
export function itemCrumbs(from: string | undefined | null, item: Pick<ItemDetails, 'title' | 'belongs'>): Crumb[] {
  const back = backPath(from);
  const path = back?.split(/[?#]/)[0];
  const spaceOf = (href: string) => item.belongs.find(entry => entry.href && entry.href.split(/[?#]/)[0] === href);
  let trail: Crumb[];
  if (path && /^\/app\/spaces\/[^/]+\/?$/.test(path)) {
    trail = [{ label: 'Spaces', href: '/app/spaces' }, { label: spaceOf(path)?.label ?? 'Space', href: back }];
  } else if (path && PLACES.some(([re]) => re.test(path))) {
    trail = [{ label: PLACES.find(([re]) => re.test(path))![1], href: back }];
  } else if (path && /^\/(skills|mcps|apps)\/[^/]+\/?$/.test(path)) {
    trail = [{ label: 'Explore', href: '/app/explore' }, { label: decodeURIComponent(path.split('/')[2]), href: back }];
  } else if (back) {
    trail = [{ label: 'Back', href: back }];
  } else {
    const home = item.belongs.find(entry => entry.href?.startsWith('/app/spaces/'));
    trail = home ? [{ label: 'Spaces', href: '/app/spaces' }, { label: home.label, href: home.href }] : [{ label: 'My Items', href: '/app/mine' }];
  }
  return [...trail, { label: item.title }];
}
