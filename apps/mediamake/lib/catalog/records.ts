import { staticRecord, withRegistryUses } from './items';
import { catalogItemsDB } from './store';
import type { CatalogItemRecord } from './types';

/**
 * An item's record: the catalog database's, else the one the repo defines (a
 * registry skill, a third-party item, a card in lib/catalog/items). A stored
 * skill without `uses` of its own takes its registry entry's MCPs.
 */
export async function getCatalogRecord(id: string): Promise<CatalogItemRecord | null> {
  let stored: CatalogItemRecord | null = null;
  try {
    stored = await catalogItemsDB.get(id);
  } catch (error) {
    console.error(`[catalog] Could not read ${id} from the database:`, error);
  }
  return stored ? withRegistryUses(stored) : staticRecord(id);
}
