import { releaseTier, type CatalogItemRecord, type ReleaseTier, type UseNeed } from './types';

/**
 * Items in a few words, for the release pages, the admin API and the
 * MediaMake MCP's catalog tools. Pure: callers hand in the records.
 */

/** An item that needs another installed first (`requires`), or offers it as a choice (`uses`). */
export interface UsedBy {
  id: string;
  title: string;
  how: 'requires' | 'uses';
  need?: UseNeed;
  for?: string;
}

/** One item in a line: what the Releases Items list and `catalog_items` show. */
export interface ItemSummary {
  id: string;
  title: string;
  kind: CatalogItemRecord['kind'];
  tier: ReleaseTier;
  status: CatalogItemRecord['status'];
  version?: string;
  archivedAt?: string;
  /** Where it comes from, e.g. "Our package · v0.8.0", "Open source · ElevenLabs". */
  origin: string;
  /** What it works with, e.g. "mcp/elevenlabs (required)". */
  uses: string[];
  /** Ids of the items that need or use it. */
  usedBy: string[];
  /** Its release page, e.g. /core/releases/mcp/browse-hack. */
  page: string;
}

/** An item's release page: /core/releases/mcp/browse-hack. Release commands print it too. */
export function itemPath(id: string) {
  return `/core/releases/${id}`;
}

/**
 * Where an item comes from, in a few words: our package, a skill in the repo,
 * an open-source or hosted item made by others, or a page of the app.
 */
export function originOf(item: CatalogItemRecord): string {
  if (item.madeBy) return `${item.madeBy.repo ? 'Open source' : 'Hosted'} · ${item.madeBy.name}`;
  if (item.versions.length) return `Our package · v${item.versions[item.versions.length - 1].version}`;
  if (item.install?.source?.type === 'github-skill') return 'Skill in the repo';
  if (item.install?.source?.type === 'mcp-server') return item.install.source.remote ? 'Our hosted connector' : 'Our MCP server';
  if (item.href) return 'Page in the app';
  return 'Nothing released yet';
}

/** What needs `id` installed first, or offers it as a choice. */
export function usedByOf(records: Iterable<CatalogItemRecord>, id: string): UsedBy[] {
  return [...records].flatMap((other): UsedBy[] => {
    if (other.id === id) return [];
    if (other.install?.requires?.some(req => req.type === 'item' && req.id === id)) {
      return [{ id: other.id, title: other.title, how: 'requires' }];
    }
    const use = other.install?.uses?.find(u => u.id === id);
    return use ? [{ id: other.id, title: other.title, how: 'uses', need: use.need, for: use.for }] : [];
  });
}

/** Every item in a line each, in the order given. */
export function summarize(records: CatalogItemRecord[], now = Date.now()): ItemSummary[] {
  const users = new Map<string, string[]>();
  for (const record of records) {
    const ids = [
      ...(record.install?.requires ?? []).flatMap(req => (req.type === 'item' ? [req.id] : [])),
      ...(record.install?.uses ?? []).map(use => use.id),
    ];
    for (const id of new Set(ids)) users.set(id, [...(users.get(id) ?? []), record.id]);
  }
  return records.map(record => ({
    id: record.id,
    title: record.title,
    kind: record.kind,
    tier: releaseTier(record, now),
    status: record.status,
    ...((record.versions.at(-1)?.version ?? record.version) && { version: record.versions.at(-1)?.version ?? record.version }),
    ...(record.archivedAt && { archivedAt: record.archivedAt }),
    origin: originOf(record),
    uses: (record.install?.uses ?? []).map(use => `${use.id} (${use.need})`),
    usedBy: users.get(record.id) ?? [],
    page: itemPath(record.id),
  }));
}
