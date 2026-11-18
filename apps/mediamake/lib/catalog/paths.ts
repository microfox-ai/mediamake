/**
 * Where an item's own page is, the link to share: /skills/<slug>, /mcps/<slug>, /apps/<slug>.
 * A tutorial plays on /tutorials/<slug> and a course on /courses/<slug>. There is no other page for an item.
 */
export function itemPagePath(id: string): string {
  const [kind, slug] = id.split('/');
  if (kind === 'mcp') return `/mcps/${slug}`;
  if (kind === 'app') return `/apps/${slug}`;
  if (kind === 'skill') return `/skills/${slug}`;
  if (kind === 'tutorial') return `/tutorials/${slug}`;
  if (kind === 'course') return `/courses/${slug}`;
  return '/';
}

const OLD_ITEM = /^(skill|mcp|app|tutorial|course)\/[a-z0-9][a-z0-9-]*$/;

/**
 * Where an old /access link goes now that the page is gone: /access?item=<id> to the item's own page,
 * and /access alone (an old invite link, /access?code=…) to Subscription, where a membership is asked for.
 * An id that names no item goes to the homepage.
 */
export function oldAccessPath(item: string | null | undefined): string {
  if (!item) return '/app/subscription';
  return OLD_ITEM.test(item) ? itemPagePath(item) : '/';
}
