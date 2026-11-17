import { accessLevel, type Entitlements, type GatedItem } from '@/lib/access/rules';

/**
 * The hosted MCP connectors (packages/mediamake-mcp builds all three):
 *
 * - `release`, mm-release at /mcp/release: admins run the catalog and releases.
 * - `use`, mm-use at /mcp/use: every member explores and installs items,
 *   reports usage and sends feedback.
 * - `legacy`, the old MediaMake MCP at /mcp: the video tools (timelines,
 *   presets, transcription, workers, renders), deprecated with Core, admins only.
 *
 * Who may use each follows its catalog item, like any other release. The two
 * admin ones are in the vault, which opens to admins and to grants that name
 * the item; mm-use is open to every signed-in account. `fallback` is the item
 * as the repo defines it, for when the catalog can't be read.
 *
 * Pure: ./access loads the entitlements and the item.
 */
export const MCP_CONNECTORS = {
  release: {
    item: 'mcp/mm-release',
    path: '/mcp/release',
    name: 'mm-release',
    fallback: { id: 'mcp/mm-release', visibility: 'private', tier: 'admin', neverPublish: true },
    locked:
      'mm-release is for MediaMake admins: it runs the catalog and releases. To explore and install skills, MCPs and apps, add mm-use (mcp/mm-use), the connector every member has.',
    does: 'run the catalog as you: read every item and who can open it, change releases, memberships and invites',
  },
  use: {
    item: 'mcp/mm-use',
    path: '/mcp/use',
    name: 'mm-use',
    fallback: { id: 'mcp/mm-use', visibility: 'public', tier: 'public', openToAll: true },
    locked: 'mm-use is not open to this account. Ask a MediaMake admin.',
    does: "explore and install MediaMake's skills, MCPs and apps as you, report which skills you run (their names and times only) and which are on your computer (names and versions), and send your feedback",
  },
  legacy: {
    item: 'mcp/mediamake',
    path: '/mcp',
    name: 'mediamake',
    fallback: { id: 'mcp/mediamake', visibility: 'private', tier: 'admin', neverPublish: true },
    locked:
      'The old MediaMake MCP is deprecated and for MediaMake admins only. Use mm-use (mcp/mm-use) to explore and install skills, MCPs and apps; for your projects, brand kits, productions and media, install MediaMake Spaces (mcp/projectsync, which was ProjectSync).',
    does: 'read and create timelines, transcribe, run workers and agents, and start renders as you (workers and renders can cost credits)',
  },
} as const satisfies Record<string, { item: string; path: string; name: string; fallback: GatedItem; locked: string; does: string }>;

export type McpConnector = keyof typeof MCP_CONNECTORS;

/** May these entitlements use a connector, given its catalog item (null: the repo's definition)? */
export function mayUseConnector(kind: McpConnector, entitlements: Entitlements, item: GatedItem | null): boolean {
  if (!entitlements.clientId) return false;
  return accessLevel(entitlements, item ?? MCP_CONNECTORS[kind].fallback) !== 'locked';
}

/**
 * The connector an OAuth sign-in is for, from the `resource` the client sent
 * (RFC 8707: the address it connects to). Null when it sent none or another
 * address: an app that isn't one of the connectors (the Browse Hack
 * extension), or an older MCP client.
 */
export function connectorOfResource(resource: string | undefined): McpConnector | null {
  let path = '';
  try {
    path = resource ? new URL(resource).pathname.replace(/\/+$/, '') : '';
  } catch {
    return null;
  }
  return (Object.keys(MCP_CONNECTORS) as McpConnector[]).find(kind => MCP_CONNECTORS[kind].path === path) ?? null;
}
