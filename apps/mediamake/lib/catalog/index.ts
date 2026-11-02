import { accessLevel, getEntitlements, type Entitlements, type Viewer } from '@/lib/access';
import { installPromptFor } from './install-prompt';
import { getStaticRecords, withRegistryUses } from './items';
import { catalogArchiveDB, catalogItemsDB } from './store';
import {
  effectiveVisibility,
  isInstallable,
  withArchive,
  type ArchiveMark,
  type CatalogEntry,
  type CatalogItem,
  type CatalogItemRecord,
  type CatalogKind,
  type ItemUse,
} from './types';

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
 * reach people without access. Installable items carry an `installPrompt`,
 * items that work with others (a skill's MCPs) their `uses`, and archived
 * ones `archivedAt` (the homepage leaves those out).
 *
 * Merges the items defined in ./items (public-safe cards, third-party.json
 * and the skill registry) with the catalog database, where released and
 * unreleased items are managed (see docs/catalog-releases.md). A database
 * item with the same id wins, so an item can be promoted or edited without
 * a deploy.
 */
export async function listCatalog(
  viewer: Viewer,
  kind?: CatalogKind,
  options: { entitlements?: Entitlements } = {},
): Promise<CatalogEntry[]> {
  const entitlements = options.entitlements ?? (await getEntitlements(viewer));

  let stored: CatalogItemRecord[] = [];
  let archived: ArchiveMark[] = [];
  try {
    [stored, archived] = await Promise.all([catalogItemsDB.list({ kind }), catalogArchiveDB.list()]);
  } catch (error) {
    console.error('[catalog] Could not load items from the database:', error);
  }

  const byId = new Map<string, { card: CatalogItem; installable: boolean; uses?: ItemUse[] }>();
  for (const record of withArchive([...getStaticRecords(kind), ...stored.map(withRegistryUses)], archived)) {
    byId.set(record.id, { card: toCard(record), installable: isInstallable(record), uses: record.install?.uses });
  }

  return [...byId.values()]
    .map(({ card, installable, uses }) => {
      const entry = toEntry(entitlements, card);
      if (entry.access === 'locked') return entry;
      return {
        ...entry,
        ...(installable && { installPrompt: installPromptFor(entry.id) }),
        ...(uses?.length && { uses }),
      };
    })
    .filter(entry => entry.access !== 'locked')
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}
