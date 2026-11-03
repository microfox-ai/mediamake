import { getStaticRecords, withRegistryUses } from './items';
import { catalogArchiveDB, catalogHealthDB, catalogItemsDB, catalogVideosDB } from './store';
import { withVideos } from './video';
import { withArchive, withHealth, type ArchiveMark, type CatalogItemRecord, type CatalogVideo, type HealthMark } from './types';

/**
 * Every item as the admin pages and tools see it: the repo's (cards, the
 * skill registry, third-party.json), then the database's (a stored record
 * wins, as in listCatalog), with archived ones, videos and MCPs' health marked. Reads only.
 */
export async function catalogIndex(): Promise<{
  byId: Map<string, CatalogItemRecord>;
  storedIds: Set<string>;
  archive: Map<string, ArchiveMark>;
  videos: Map<string, CatalogVideo>;
  health: Map<string, HealthMark>;
}> {
  const [stored, marks, videos, health] = await Promise.all([
    catalogItemsDB.list(),
    catalogArchiveDB.list(),
    catalogVideosDB.list(),
    catalogHealthDB.list(),
  ]);
  const byId = new Map<string, CatalogItemRecord>();
  for (const record of withHealth(withVideos(withArchive([...getStaticRecords(), ...stored.map(withRegistryUses)], marks), videos), health))
    byId.set(record.id, record);
  return {
    byId,
    storedIds: new Set(stored.map(record => record.id)),
    archive: new Map(marks.map(mark => [mark.id, mark])),
    videos: new Map(videos.map(video => [video.id, video])),
    health: new Map(health.map(mark => [mark.id, mark])),
  };
}
