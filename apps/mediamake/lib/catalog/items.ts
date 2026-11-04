import { registry } from '@/lib/skills/registry';
import type { RegistrySkill } from '@/lib/library/types';
import { CANONICAL_SITE, siteUrl } from './install-prompt';
import thirdPartyJson from './third-party.json';
import {
  parseCatalogItemId,
  slugOf,
  type CatalogItem,
  type CatalogItemRecord,
  type CatalogKind,
  type InstallRequirement,
  type InstallSpec,
  type ItemUse,
  type MadeBy,
} from './types';

/** This site, for the install specs that point back at it (the hosted MediaMake MCP). */
const MEDIAMAKE_SITE = siteUrl() ?? CANONICAL_SITE;

/**
 * Static catalog entries shown on the homepage tabs. Only list things whose
 * names are already public here: unreleased apps and MCPs belong in the
 * catalog database so they stay out of this public repo. Skills are always
 * public: their files are committed in .agents/skills, and every one in the
 * repo's registry (skills.json) is a card, see skillCatalogItems. MCPs and
 * skills made by others are in third-party.json (see getStaticRecords). A
 * card with an `install` spec installs like any item (the MediaMake MCP:
 * its hosted connector).
 */
export const catalogItems: (CatalogItem & { install?: InstallSpec })[] = [
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
    // the id stays: it keys the stored item and its grants
    id: 'app/remotion-revision',
    kind: 'app',
    title: 'Video Revisions',
    summary: 'Review renders from a local folder: pick finals and leave timed comments, saved beside them for Claude.',
    visibility: 'public',
    openToAll: true,
    status: 'beta',
    href: '/video-revision',
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
    id: 'app/remaster-revision',
    kind: 'app',
    title: 'Remaster Revisions',
    summary: 'Compare the versions of a remaster by ear from one shared playhead, loop a part, pick the final and leave notes, saved beside the files for Claude.',
    visibility: 'public',
    openToAll: true,
    status: 'beta',
    href: '/remaster-revision',
    tags: ['review', 'audio'],
    releasedAt: '2026-11-04',
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
    summary:
      "For MediaMake admins: run the catalog (skill, MCP, app and tutorial releases) from Claude, and work with timelines, presets, transcriptions, Suno takes, workers and renders. The hosted connector: sign in with your MediaMake account. Projects, brand kits and media are ProjectSync's.",
    // Admins only: it runs the releases. In the vault, so private testers don't get it; a grant naming it does
    visibility: 'private',
    neverPublish: true,
    status: 'beta',
    // the card opens the step-by-step page for connecting it
    href: '/core/mediamake-mcp',
    tags: ['mcp', 'claude'],
    releasedAt: '2026-10-24',
    install: {
      source: {
        type: 'mcp-server',
        name: 'mediamake',
        remote: { url: `${MEDIAMAKE_SITE}/mcp` },
        setup: [
          'Claude Code: run /mcp, pick mediamake and sign in to MediaMake in the browser window that opens, then click Allow.',
          'The Claude apps: the connector asks them to sign in to MediaMake and click Allow when they first use it.',
        ],
        guide: `${MEDIAMAKE_SITE}/core/mediamake-mcp`,
      },
      notes:
        "Hosted on MediaMake: nothing runs on their computer, and it can't read or write their files (bring media in by https link). It signs in with their MediaMake account, no API key.",
    },
  },

  // Skills: not listed here, they come from the registry (skillCatalogItems below).

  // Tutorials: none published yet.
];

/**
 * Skills have no release date of their own (they are never gated), so they
 * share the day skills were first listed in the catalog and sort by name.
 */
const SKILLS_LISTED_AT = '2026-10-24';

/** The repository the registry's skills are committed in. */
export const SKILLS_REPO = 'microfox-ai/mediamake';

/** A registry skill's MCPs, as the catalog's `uses` (see ItemUse). */
export function registryUses(name: string): ItemUse[] | undefined {
  return registry?.skills.find((skill) => skill.name === name)?.mcps;
}

/** One registry skill as a card: always public, opening on its own page, /skills/<name>. */
function skillCard(skill: RegistrySkill): CatalogItem {
  const [owner] = skill.upstream?.split('/') ?? [];
  return {
    id: `skill/${skill.name}`,
    kind: 'skill',
    title: skill.name,
    summary: skill.summary,
    visibility: 'public',
    status: 'live',
    // a skill vendored from another repo (skills-lock.json) is someone else's
    ...(skill.upstream && { madeBy: { name: owner, repo: skill.upstream } }),
    href: `/skills/${skill.name}`,
    tags: [skill.category, ...(skill.variantOf ? ['variant'] : []), ...(skill.internal ? ['internal'] : [])],
    releasedAt: SKILLS_LISTED_AT,
  };
}

/**
 * How a registry skill installs: its folder from this public repo, the repo
 * itself for our own skills (they work on its apps and scripts; a skill
 * vendored from elsewhere stands alone), the skills it depends on first, and
 * its MCPs as choices.
 */
function skillInstall(skill: RegistrySkill): InstallSpec {
  const requires: InstallRequirement[] = [
    ...(skill.upstream ? [] : [{ type: 'repo' as const, repo: SKILLS_REPO, why: 'The skill works in the MediaMake repo: its apps, scripts and brand kits' }]),
    ...(skill.dependsOn ?? []).map((name) => ({ type: 'item' as const, id: `skill/${name}` })),
  ];
  return {
    method: 'skill',
    source: { type: 'github-skill', repo: SKILLS_REPO, path: skill.path },
    requires,
    ...(skill.mcps?.length && { uses: skill.mcps }),
  };
}

function skillRecord(skill: RegistrySkill): CatalogItemRecord {
  const card = skillCard(skill);
  return { ...card, slug: skill.name, install: skillInstall(skill), versions: [], createdAt: card.releasedAt };
}

/** Every skill in the registry as a card: always public, opening on its own page. */
export function skillCatalogItems(): CatalogItem[] {
  return (registry?.skills ?? []).map(skillCard);
}

/**
 * The registry's skills as release records for the admin dashboard, leaving
 * out any the catalog database stores itself (a stored record wins, as in
 * listCatalog).
 */
export function skillRecords(stored: { id: string }[]): CatalogItemRecord[] {
  const have = new Set(stored.map((item) => item.id));
  return (registry?.skills ?? []).map(skillRecord).filter((record) => !have.has(record.id));
}

/** third-party.json: MCPs and skills made by others that admins listed (see MadeBy). */
interface ThirdPartyFile {
  schema: string;
  items: (Omit<CatalogItem, 'kind' | 'visibility'> & { madeBy: MadeBy; install: InstallSpec })[];
}

export const THIRD_PARTY_SCHEMA = 'mediamake.third-party/v1';

const thirdParty: ThirdPartyFile['items'] =
  (thirdPartyJson as { schema?: string }).schema === THIRD_PARTY_SCHEMA ? (thirdPartyJson as unknown as ThirdPartyFile).items : [];

function thirdPartyRecord({ install, ...item }: ThirdPartyFile['items'][number]): CatalogItemRecord {
  const parsed = parseCatalogItemId(item.id);
  return {
    ...item,
    kind: parsed?.kind ?? 'mcp',
    slug: parsed?.slug ?? slugOf(item.id),
    visibility: 'public',
    install,
    versions: [],
    createdAt: item.releasedAt,
  };
}

/** The third-party items as release records for the admin dashboard, leaving out stored ones. */
export function thirdPartyRecords(stored: { id: string }[]): CatalogItemRecord[] {
  const have = new Set(stored.map((item) => item.id));
  return thirdParty.map(thirdPartyRecord).filter((record) => !have.has(record.id));
}

/** The cards above (apps, the MediaMake MCP) as records for the admin dashboard, leaving out stored ones. */
export function cardRecords(stored: { id: string }[]): CatalogItemRecord[] {
  const have = new Set(stored.map((item) => item.id));
  return catalogItems
    .filter((card) => !have.has(card.id))
    .map((card) => ({ ...card, slug: slugOf(card.id), versions: [], createdAt: card.releasedAt }));
}

/** A record without its stored-only fields. */
function toCardFields(record: CatalogItemRecord): CatalogItem {
  const { slug: _slug, install: _install, versions: _versions, createdAt: _createdAt, ...card } = record;
  return card;
}

/**
 * Every item the repo defines, as records: the cards above (nothing to
 * install), the third-party items and the registry's skills. The catalog
 * database may store any of them itself; the stored record wins.
 */
export function getStaticRecords(kind?: CatalogKind): CatalogItemRecord[] {
  return [...cardRecords([]), ...thirdParty.map(thirdPartyRecord), ...(registry?.skills ?? []).map(skillRecord)].filter(
    (record) => !kind || record.kind === kind,
  );
}

/** The record of an item the repo defines (see getStaticRecords), for install plans and install pages. */
export function staticRecord(id: string): CatalogItemRecord | null {
  const kind = parseCatalogItemId(id)?.kind;
  return kind ? (getStaticRecords(kind).find((record) => record.id === id) ?? null) : null;
}

/** Which file in the repo defines an item, for the release pages; null when only the database has it. */
export function staticOrigin(id: string): 'third-party.json' | 'skills.json' | 'items.ts' | null {
  if (thirdParty.some((item) => item.id === id)) return 'third-party.json';
  if (id.startsWith('skill/') && registry?.skills.some((skill) => skill.name === slugOf(id))) return 'skills.json';
  if (catalogItems.some((item) => item.id === id)) return 'items.ts';
  return null;
}

/** Where an item's code is on GitHub, when the catalog knows. */
export function codeUrlOf(record: CatalogItemRecord): string | undefined {
  const source = record.install?.source;
  if (source?.type === 'github-skill') return `https://github.com/${source.repo}/tree/${source.ref ?? 'HEAD'}/${source.path}`;
  return record.madeBy?.repo ? `https://github.com/${record.madeBy.repo}` : undefined;
}

/** A stored skill without `uses` of its own takes its registry entry's MCPs. */
export function withRegistryUses(record: CatalogItemRecord): CatalogItemRecord {
  if (record.kind !== 'skill' || record.install?.uses) return record;
  const uses = registryUses(record.slug);
  return uses?.length ? { ...record, install: { ...record.install, uses } } : record;
}

export function getStaticCatalogItems(kind?: CatalogKind): CatalogItem[] {
  return getStaticRecords(kind)
    .map(toCardFields)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}
