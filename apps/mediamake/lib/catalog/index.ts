import { canAccess, type Viewer } from '@/lib/access';
import { getStaticCatalogItems } from './items';
import type { CatalogEntry, CatalogKind } from './types';

/**
 * Catalog as seen by one viewer. Gated items the viewer can't open come back
 * with access 'locked' and no href.
 *
 * Stub: reads the static list only. The private-releases work replaces this
 * to also merge items from the catalog database.
 */
export async function listCatalog(viewer: Viewer, kind?: CatalogKind): Promise<CatalogEntry[]> {
  return Promise.all(
    getStaticCatalogItems(kind).map(async (item): Promise<CatalogEntry> => {
      if (item.visibility === 'public') return { ...item, access: 'open' };
      if (await canAccess(viewer, item)) return { ...item, access: 'granted' };
      const { href: _href, ...rest } = item;
      return { ...rest, access: 'locked' };
    }),
  );
}
