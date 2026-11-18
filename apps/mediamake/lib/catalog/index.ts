import { accessLevel, getEntitlements, type Entitlements, type Viewer } from '@/lib/access';
import { installPromptFor, updatePromptFor } from './install-prompt';
import { getStaticRecords, withRegistryUses } from './items';
import { withListing, type ItemListing } from './listing';
import { withRatings, type RatingSummary } from '../ratings/ratings';
import { ratingsDB } from '../ratings/store';
import { catalogArchiveDB, catalogHealthDB, catalogItemsDB, catalogListingDB, catalogReadinessDB, catalogVideosDB } from './store';
import { withVideos } from './video';
import {
  isHiddenFromBelow,
  isInstallable,
  itemTier,
  visibilityOfTier,
  withArchive,
  type ArchiveMark,
  type HealthMark,
  type ReadinessMark,
  withHealth,
  withReadiness,
  type CatalogEntry,
  type CatalogItem,
  type CatalogItemRecord,
  type CatalogKind,
  type CatalogVideo,
  type ItemUse,
  type McpRuns,
  mcpRunsOf,
} from './types';

export * from './types';
export { installPromptFor, updatePromptFor } from './install-prompt';

/** Strips stored-only fields (slug, versions, install spec, history) off a record. */
export function toCard(record: CatalogItemRecord | CatalogItem): CatalogItem {
  const { slug, install, versions, createdAt, createdBy, stageHistory, gateStartedAt, ...card } = record as CatalogItemRecord;
  // the badges on its listing: how big its latest package is, and how many items it works with
  const latest = versions?.length ? [...versions].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0] : undefined;
  return {
    ...card,
    ...(card.size === undefined && latest?.bytes && { size: { bytes: latest.bytes } }),
    ...(card.deps === undefined && install?.uses?.length && { deps: install.uses.length }),
  };
}

/**
 * Marks an item for one viewer, with the tier that opens it right now;
 * locked items lose their href. A gated item past its `publicAt` is shown as
 * Public, dated from that moment.
 */
export function toEntry(entitlements: Entitlements, stored: CatalogItem): CatalogEntry {
  const tier = itemTier(stored);
  const visibility = visibilityOfTier(tier);
  const item = {
    ...stored,
    tier,
    visibility,
    releasedAt: tier === 'public' && stored.publicAt && stored.tier !== 'public' && stored.visibility !== 'public' ? stored.publicAt : stored.releasedAt,
  };
  const access = accessLevel(entitlements, item);
  if (access !== 'locked') return { ...item, access };
  const { href: _href, ...rest } = item;
  return { ...rest, access };
}

/**
 * Catalog as seen by one viewer, newest first. Only items the viewer can
 * open are returned, unless `locked: 'show'` asks for the locked ones too
 * (Explore shows which membership opens them): those come without their
 * href, and never include the cohort's or the vault's, whose names must not
 * reach people below. Installable items carry an `installPrompt`,
 * items that work with others (a skill's MCPs) their `uses`, items with a
 * video (a skill's intro, a tutorial, a course) their `video`, and archived
 * ones `archivedAt` (the homepage leaves those out). Every item carries its
 * `tier`, its `readiness` (Beta, or Ready with `readyProof`), the tags an
 * admin added to its listing and, when it has one, its `health`: lib/catalog/shown says where each shows.
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
  options: { entitlements?: Entitlements; locked?: 'hide' | 'show' } = {},
): Promise<CatalogEntry[]> {
  const entitlements = options.entitlements ?? (await getEntitlements(viewer));

  let stored: CatalogItemRecord[] = [];
  let archived: ArchiveMark[] = [];
  let videos: CatalogVideo[] = [];
  let health: HealthMark[] = [];
  let readiness: ReadinessMark[] = [];
  let listings: ItemListing[] = [];
  let ratings = new Map<string, RatingSummary>();
  try {
    [stored, archived, videos, health, readiness, listings, ratings] = await Promise.all([
      catalogItemsDB.list({ kind }),
      catalogArchiveDB.list(),
      catalogVideosDB.list(),
      catalogHealthDB.list(),
      catalogReadinessDB.list(),
      catalogListingDB.list().catch((): ItemListing[] => []),
      ratingsDB.summaries().catch(() => new Map<string, RatingSummary>()),
    ]);
  } catch (error) {
    console.error('[catalog] Could not load items from the database:', error);
  }

  const byId = new Map<string, { card: CatalogItem; installable: boolean; uses?: ItemUse[]; runs: McpRuns[] }>();
  for (const record of withRatings(withListing(withReadiness(withHealth(withVideos(withArchive([...getStaticRecords(kind), ...stored.map(withRegistryUses)], archived), videos), health), readiness), listings), ratings)) {
    byId.set(record.id, { card: toCard(record), installable: isInstallable(record), uses: record.install?.uses, runs: mcpRunsOf(record) });
  }

  return [...byId.values()]
    .map(({ card, installable, uses, runs }) => {
      const entry = toEntry(entitlements, card);
      if (entry.access === 'locked') return entry;
      return {
        ...entry,
        ...(installable && { installPrompt: installPromptFor(entry.id) }),
        ...(installable && entry.kind === 'mcp' && { updatePrompt: updatePromptFor(entry.id) }),
        // each MCP it works with shows where it runs, its health and whether it is an old alternative (this list's kind may leave it out)
        ...(uses?.length && {
          uses: uses.map(use => {
            const used = byId.get(use.id);
            return used ? { ...use, runs: used.runs, alternativeTo: used.card.alternativeTo, health: used.card.health } : use;
          }),
        }),
        ...(runs.length && { runs }),
      };
    })
    .filter(entry => entry.access !== 'locked' || (options.locked === 'show' && entry.listed !== false && !isHiddenFromBelow(entry.tier ?? 'admin')))
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}
