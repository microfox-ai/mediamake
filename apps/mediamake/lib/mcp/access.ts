import { getEntitlements, type Entitlements, type GatedItem } from '@/lib/access';
import { getCatalogRecord } from '@/lib/catalog/records';
import { MCP_CONNECTORS, mayUseConnector, type McpConnector } from './connectors';

export * from './connectors';

/** Whether an account may use one of the hosted connectors (./connectors has the rules). */
export async function canUseConnector(kind: McpConnector, clientId: string): Promise<boolean> {
  const [entitlements, item] = await Promise.all([getEntitlements({ clientId }), getCatalogRecord(MCP_CONNECTORS[kind].item)]);
  return mayUseConnector(kind, entitlements, item);
}

/** The old MediaMake MCP's item: what /app/mediamake-mcp reads. */
export const HOSTED_MCP_ITEM = MCP_CONNECTORS.legacy.item;

export function mayUseHostedMcp(entitlements: Entitlements, item: GatedItem | null): boolean {
  return mayUseConnector('legacy', entitlements, item);
}

export const canUseHostedMcp = (clientId: string) => canUseConnector('legacy', clientId);

export const HOSTED_MCP_LOCKED: string = MCP_CONNECTORS.legacy.locked;
