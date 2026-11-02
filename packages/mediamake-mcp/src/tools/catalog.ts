import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, safe } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;

export function registerCatalogTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'catalog_versions',
    {
      title: 'Catalog versions',
      description:
        "Live version numbers and release notes of MediaMake catalog items: skills, MCPs (e.g. mcp/browse-hack), apps. With items: each one's live version and its recent releases with notes, newest first. Without: every item this account can open, with its live version. Compare with what is installed (~/.mediamake/installed.json, or an MCP's own status tool) to tell the user whether something is behind and what changed; updating follows the Update section of https://github.com/microfox-ai/mediamake/blob/main/install.md.",
      inputSchema: {
        items: z
          .array(z.string())
          .max(50)
          .optional()
          .describe('Item ids, e.g. ["mcp/browse-hack", "skill/make-lyrics-video"]'),
        notes: z.number().int().min(1).max(50).default(5).describe('Releases (with notes) per item'),
      },
      annotations: READ,
    },
    safe(async ({ items, notes }) => {
      if (items?.length) {
        return json(await client.get('/api/catalog/versions', { items: items.join(','), notes }));
      }
      const { items: catalog } = await client.get<{ items: any[] }>('/api/catalog');
      return json({
        items: catalog.map(({ id, kind, title, version, status }) => ({ id, kind, title, version: version ?? null, status })),
      });
    }),
  );
}
