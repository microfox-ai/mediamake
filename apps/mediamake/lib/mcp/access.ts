import { accessLevel, getEntitlements, type Entitlements, type GatedItem } from '@/lib/access';
import { getCatalogRecord } from '@/lib/catalog/records';

/** The catalog item the hosted connector is released as. */
export const HOSTED_MCP_ITEM = 'mcp/mediamake';

/**
 * Who may use the hosted connector follows its catalog item, like any other
 * release: while it is in development that is admins, private testers (the
 * `private` group) and anyone granted it; moving the item to community or
 * public opens it further with no change here.
 */
export function mayUseHostedMcp(entitlements: Entitlements, item: GatedItem | null): boolean {
  return accessLevel(entitlements, item ?? { id: HOSTED_MCP_ITEM, visibility: 'private' }) !== 'locked';
}

export async function canUseHostedMcp(clientId: string): Promise<boolean> {
  const [entitlements, item] = await Promise.all([getEntitlements({ clientId }), getCatalogRecord(HOSTED_MCP_ITEM)]);
  return mayUseHostedMcp(entitlements, item);
}

export const HOSTED_MCP_LOCKED =
  'The MediaMake MCP is in testing: admins and private testers can use it. Ask a MediaMake admin to add you as a private tester.';
