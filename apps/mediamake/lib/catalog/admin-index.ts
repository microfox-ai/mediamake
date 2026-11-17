import { getStaticRecords, withRegistryUses } from './items';
import { withListingTags, type ItemListing } from './listing';
import { catalogArchiveDB, catalogHealthDB, catalogItemsDB, catalogListingDB, catalogReadinessDB, catalogVideosDB } from './store';
import { withVideos } from './video';
import { withArchive, withHealth, withReadiness, type ArchiveMark, type CatalogItemRecord, type CatalogVideo, type HealthMark, type ReadinessMark } from './types';

/**
 * Every item as the admin pages and tools see it: the repo's (cards, the
 * skill registry, third-party.json), then the database's (a stored record
 * wins, as in listCatalog), with archived ones, videos, health, readiness and the tags of their listings marked. Reads only.
 */
export async function catalogIndex(): Promise<{
  byId: Map<string, CatalogItemRecord>;
  storedIds: Set<string>;
  archive: Map<string, ArchiveMark>;
  videos: Map<string, CatalogVideo>;
  health: Map<string, HealthMark>;
  readiness: Map<string, ReadinessMark>;
  listings: Map<string, ItemListing>;
}> {
  const [stored, marks, videos, health, readiness, listings] = await Promise.all([
    catalogItemsDB.list(),
    catalogArchiveDB.list(),
    catalogVideosDB.list(),
    catalogHealthDB.list(),
    catalogReadinessDB.list(),
    // a listing is an extra: the pages still load when its collection can't be read
    catalogListingDB.list().catch((): ItemListing[] => []),
  ]);
  const byId = new Map<string, CatalogItemRecord>();
  for (const record of withListingTags(withReadiness(withHealth(withVideos(withArchive([...getStaticRecords(), ...stored.map(withRegistryUses)], marks), videos), health), readiness), listings))
    byId.set(record.id, record);
  return {
    byId,
    storedIds: new Set(stored.map(record => record.id)),
    archive: new Map(marks.map(mark => [mark.id, mark])),
    videos: new Map(videos.map(video => [video.id, video])),
    health: new Map(health.map(mark => [mark.id, mark])),
    readiness: new Map(readiness.map(mark => [mark.id, mark])),
    listings: new Map(listings.map(listing => [listing.id, listing])),
  };
}
