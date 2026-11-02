import { registry } from '@/lib/skills/registry';
import type { CatalogItem, CatalogItemRecord, CatalogKind } from './types';

/**
 * Static catalog entries shown on the homepage tabs. Only list things whose
 * names are already public here: unreleased apps and MCPs belong in the
 * catalog database so they stay out of this public repo. Skills are always
 * public: their files are committed in .agents/skills, and every one in the
 * repo's registry (skills.json) is a card, see skillCatalogItems.
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
    // the id stays: it keys the stored item and its grants
    id: 'app/image-revision',
    kind: 'app',
    title: 'File Revisions',
    summary: 'Pick finals, keep, drop and comment on any set of local files (images and videos), saved beside them for Claude.',
    visibility: 'public',
    openToAll: true,
    status: 'beta',
    href: '/file-revision',
    tags: ['review', 'images'],
    releasedAt: '2026-10-22',
  },
  {
    // the id stays: it keys the stored item and its grants
    id: 'app/skill-library',
    kind: 'app',
    title: 'Library',
    summary: 'Your channels, productions, skills and media library in one place: what each skill made and what each production used.',
    visibility: 'public',
    openToAll: true,
    status: 'beta',
    href: '/library',
    tags: ['skills', 'media', 'productions'],
    releasedAt: '2026-10-26',
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

  // Skills: not listed here, they come from the registry (skillCatalogItems below).

  // Tutorials: none published yet.
];

/**
 * Skills have no release date of their own (they are never gated), so they
 * share the day skills were first listed in the catalog and sort by name.
 */
const SKILLS_LISTED_AT = '2026-10-24';

/** Every skill in the registry as a card: always public, opening on /skills. */
export function skillCatalogItems(): CatalogItem[] {
  return (registry?.skills ?? []).map((skill) => ({
    id: `skill/${skill.name}`,
    kind: 'skill',
    title: skill.name,
    summary: skill.summary,
    visibility: 'public',
    status: 'live',
    href: `/skills#${skill.name}`,
    tags: [skill.category, ...(skill.variantOf ? ['variant'] : [])],
    releasedAt: SKILLS_LISTED_AT,
  }));
}

/**
 * The registry's skills as release records for the admin dashboard, leaving
 * out any the catalog database stores itself (a stored record wins, as in
 * listCatalog).
 */
export function skillRecords(stored: { id: string }[]): CatalogItemRecord[] {
  const have = new Set(stored.map((item) => item.id));
  return skillCatalogItems()
    .filter((item) => !have.has(item.id))
    .map((item) => ({ ...item, slug: item.id.slice('skill/'.length), versions: [], createdAt: item.releasedAt }));
}

export function getStaticCatalogItems(kind?: CatalogKind): CatalogItem[] {
  return [...catalogItems, ...skillCatalogItems()]
    .filter((item) => !kind || item.kind === kind)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}
