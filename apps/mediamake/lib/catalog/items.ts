import type { CatalogItem, CatalogKind } from './types';

/**
 * Static catalog entries shown on the homepage tabs. Only list things whose
 * names are already public here: unreleased items belong in the catalog
 * database so they stay out of this public repo. The skill files themselves
 * are never in this repo; they're handed to people with access.
 */
export const catalogItems: CatalogItem[] = [
  // Apps. Public pages anyone can open today carry openToAll.
  {
    id: 'app/studio',
    kind: 'app',
    title: 'MediaMake Core',
    summary: 'Create, render and manage video projects with presets, workers and AI agents. Sign in to use it.',
    visibility: 'public',
    openToAll: true,
    status: 'live',
    href: '/core/projects',
    tags: ['video', 'render'],
    releasedAt: '2025-09-01',
  },
  {
    id: 'app/remotion-editor',
    kind: 'app',
    title: 'Remotion Editor',
    summary: 'Edit lyric videos right in the browser.',
    visibility: 'public',
    openToAll: true,
    status: 'beta',
    href: '/remotion-editor',
    tags: ['lyrics', 'editor'],
    releasedAt: '2026-10-20',
  },
  {
    id: 'app/remotion-revision',
    kind: 'app',
    title: 'Video Revisions',
    summary: 'Review renders from a local folder: pick finals and leave timed comments, saved beside them for Claude.',
    visibility: 'public',
    openToAll: true,
    status: 'beta',
    href: '/remotion-revision',
    tags: ['review', 'video'],
    releasedAt: '2026-10-22',
  },
  {
    id: 'app/image-revision',
    kind: 'app',
    title: 'Image Revisions',
    summary: 'Pick finals, keep, drop and comment on any set of local images, saved beside them for Claude.',
    visibility: 'public',
    openToAll: true,
    status: 'beta',
    href: '/image-revision',
    tags: ['review', 'images'],
    releasedAt: '2026-10-22',
  },

  // MCPs
  {
    id: 'mcp/mediamake',
    kind: 'mcp',
    title: 'MediaMake MCP',
    summary: 'Use mediamake projects, media and renders from Claude and other MCP clients.',
    visibility: 'private',
    status: 'coming-soon',
    tags: ['mcp', 'claude'],
    releasedAt: '2026-10-24',
  },

  // Skills
  {
    id: 'skill/lyric-video',
    kind: 'skill',
    title: 'Lyric video',
    summary: 'Turn a song and its lyrics into a timed lyric video.',
    visibility: 'private',
    status: 'beta',
    tags: ['music', 'lyrics'],
    releasedAt: '2026-10-24',
  },
  {
    id: 'skill/waveform-video',
    kind: 'skill',
    title: 'Waveform video',
    summary: 'Audio-reactive waveform visuals for tracks and podcasts.',
    visibility: 'network',
    status: 'beta',
    tags: ['music', 'audio'],
    releasedAt: '2026-10-24',
  },

  // Tutorials: none published yet.
];

export function getStaticCatalogItems(kind?: CatalogKind): CatalogItem[] {
  return catalogItems
    .filter((item) => !kind || item.kind === kind)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}
