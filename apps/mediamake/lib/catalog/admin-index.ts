import { getStaticRecords, withRegistryUses } from './items';
import { catalogArchiveDB, catalogItemsDB } from './store';
import { withArchive, type ArchiveMark, type CatalogItemRecord } from './types';

/**
 * Every item as the admin pages and tools see it: the repo's (cards, the
 * skill registry, third-party.json), then the database's (a stored record
 * wins, as in listCatalog), with archived ones marked. Reads only.
 */
export async function catalogIndex(): Promise<{
  byId: Map<string, CatalogItemRecord>;
  storedIds: Set<string>;
  archive: Map<string, ArchiveMark>;
}> {
  const [stored, marks] = await Promise.all([catalogItemsDB.list(), catalogArchiveDB.list()]);
  const byId = new Map<string, CatalogItemRecord>();
  for (const record of withArchive([...getStaticRecords(), ...stored.map(withRegistryUses)], marks)) byId.set(record.id, record);
  return { byId, storedIds: new Set(stored.map(record => record.id)), archive: new Map(marks.map(mark => [mark.id, mark])) };
}
