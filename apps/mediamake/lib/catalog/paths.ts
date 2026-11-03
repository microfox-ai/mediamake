/**
 * Where an item's own page is, the link to share: /skills/<slug>, /mcps/<slug>, /apps/<slug>.
 * Tutorials and courses play on their install page or course page (see watchPath in ./video).
 */
export function itemPagePath(id: string): string {
  const [kind, slug] = id.split('/');
  if (kind === 'mcp') return `/mcps/${slug}`;
  if (kind === 'app') return `/apps/${slug}`;
  if (kind === 'skill') return `/skills/${slug}`;
  return `/access?item=${id}`;
}
