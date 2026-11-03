import { accessLevel, getEntitlements, type Entitlements, type GatedItem } from '@/lib/access';
import { getCatalogRecord } from '@/lib/catalog/records';

/** The catalog item the hosted connector is released as. */
export const HOSTED_MCP_ITEM = 'mcp/mediamake';

/**
 * Who may use the hosted connector follows its catalog item, like any other
 * release. It is in the vault (admins only: it runs the catalog), which opens
 * to admins and grants that name it; taking it out of the vault and moving it
 * along opens it further with no change here.
 */
export function mayUseHostedMcp(entitlements: Entitlements, item: GatedItem | null): boolean {
  return accessLevel(entitlements, item ?? { id: HOSTED_MCP_ITEM, visibility: 'private', neverPublish: true }) !== 'locked';
}

export async function canUseHostedMcp(clientId: string): Promise<boolean> {
  const [entitlements, item] = await Promise.all([getEntitlements({ clientId }), getCatalogRecord(HOSTED_MCP_ITEM)]);
  return mayUseHostedMcp(entitlements, item);
}

export const HOSTED_MCP_LOCKED =
  'The MediaMake MCP is for MediaMake admins: it runs the catalog releases. For your projects, brand kits, productions, releases and media, install ProjectSync (mcp/projectsync).';
