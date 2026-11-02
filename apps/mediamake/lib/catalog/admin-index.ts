import { getStaticRecords, withRegistryUses } from './items';
import { catalogArchiveDB, catalogItemsDB, catalogVideosDB } from './store';
import { withVideos } from './video';
import { withArchive, type ArchiveMark, type CatalogItemRecord, type CatalogVideo } from './types';

/**
 * Every item as the admin pages and tools see it: the repo's (cards, the
 * skill registry, third-party.json), then the database's (a stored record
 * wins, as in listCatalog), with archived ones and videos marked. Reads only.
 */
export async function catalogIndex(): Promise<{
  byId: Map<string, CatalogItemRecord>;
  storedIds: Set<string>;
  archive: Map<string, ArchiveMark>;
  videos: Map<string, CatalogVideo>;
}> {
  const [stored, marks, videos] = await Promise.all([catalogItemsDB.list(), catalogArchiveDB.list(), catalogVideosDB.list()]);
  const byId = new Map<string, CatalogItemRecord>();
  for (const record of withVideos(withArchive([...getStaticRecords(), ...stored.map(withRegistryUses)], marks), videos)) byId.set(record.id, record);
  return {
    byId,
    storedIds: new Set(stored.map(record => record.id)),
    archive: new Map(marks.map(mark => [mark.id, mark])),
    videos: new Map(videos.map(video => [video.id, video])),
  };
}
