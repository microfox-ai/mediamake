import { accessLevel, getEntitlements, type Entitlements, type Viewer } from '@/lib/access';
import { installPromptFor } from './install-prompt';
import { getStaticCatalogItems } from './items';
import { catalogItemsDB } from './store';
import { effectiveVisibility, type CatalogEntry, type CatalogItem, type CatalogItemRecord, type CatalogKind } from './types';

export * from './types';
export { installPromptFor } from './install-prompt';

/** Strips stored-only fields (slug, versions, install spec, history) off a record. */
export function toCard(record: CatalogItemRecord | CatalogItem): CatalogItem {
  const { slug, install, versions, createdAt, createdBy, stageHistory, gateStartedAt, ...card } = record as CatalogItemRecord;
  return card;
}

/**
 * Marks an item for one viewer; locked items lose their href. A gated item
 * past its `publicAt` is shown as public, dated from that moment.
 */
export function toEntry(entitlements: Entitlements, stored: CatalogItem): CatalogEntry {
  const visibility = effectiveVisibility(stored);
  const item =
    visibility === stored.visibility
      ? stored
      : { ...stored, visibility, releasedAt: visibility === 'public' && stored.publicAt ? stored.publicAt : stored.releasedAt };
  const access = accessLevel(entitlements, item);
  if (access !== 'locked') return { ...item, access };
  const { href: _href, ...rest } = item;
  return { ...rest, access };
}

/**
 * Catalog as seen by one viewer, newest first. Only items the viewer can
 * open are returned: locked items are hidden entirely, so their names never
 * reach people without access. Installable items carry an `installPrompt`.
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
  const installable = new Set<string>();
  for (const item of getStaticCatalogItems(kind)) byId.set(item.id, item);
  for (const record of stored) {
    byId.set(record.id, toCard(record));
    if (record.versions.length || record.install?.requires?.length) installable.add(record.id);
  }

  return [...byId.values()]
    .map(item => toEntry(entitlements, item))
    .filter(entry => entry.access !== 'locked')
    .map(entry => (installable.has(entry.id) ? { ...entry, installPrompt: installPromptFor(entry.id) } : entry))
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}
