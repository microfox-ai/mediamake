import { accessLevel, getEntitlements, type Entitlements, type Viewer } from '@/lib/access';
import { getStaticCatalogItems } from './items';
import { catalogItemsDB } from './store';
import type { CatalogEntry, CatalogItem, CatalogItemRecord, CatalogKind } from './types';

export * from './types';

/** Strips stored-only fields (slug, versions, history) off a record. */
export function toCard(record: CatalogItemRecord | CatalogItem): CatalogItem {
  const { slug, versions, createdAt, createdBy, stageHistory, ...card } = record as CatalogItemRecord;
  return card;
}

/** Marks an item for one viewer; locked items lose their href. */
export function toEntry(entitlements: Entitlements, item: CatalogItem): CatalogEntry {
  const access = accessLevel(entitlements, item);
  if (access !== 'locked') return { ...item, access };
  const { href: _href, ...rest } = item;
  return { ...rest, access };
}

/**
 * Catalog as seen by one viewer, newest first. Gated items the viewer can't
 * open come back with access 'locked' and no href; unlisted ones are left out.
 *
 * Merges the static list in ./items (public-safe cards defined in code) with
 * the catalog database, where released and unreleased items are managed
 * (see docs/catalog-releases.md). A database item with the same id wins, so
 * an item can be promoted or edited without a deploy.
 */
export async function listCatalog(
  viewer: Viewer,
  kind?: CatalogKind,
  options: { entitlements?: Entitlements } = {},
): Promise<CatalogEntry[]> {
  const entitlements = options.entitlements ?? (await getEntitlements(viewer));

  let stored: CatalogItemRecord[] = [];
  try {
    stored = await catalogItemsDB.list({ kind });
  } catch (error) {
    console.error('[catalog] Could not load items from the database:', error);
  }

  const byId = new Map<string, CatalogItem>();
  for (const item of getStaticCatalogItems(kind)) byId.set(item.id, item);
  for (const record of stored) byId.set(record.id, toCard(record));

  return [...byId.values()]
    .map(item => toEntry(entitlements, item))
    .filter(entry => entry.access !== 'locked' || entry.listed !== false)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}
