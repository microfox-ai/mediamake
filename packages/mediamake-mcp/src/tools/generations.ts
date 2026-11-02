import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, safe } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const;

const RATING = z.enum(['keeper', 'maybe', 'reject']);
const KIND = z.enum(['create', 'cover', 'extend', 'remaster', 'reuse', 'upload']);

/** A take's id, its Suno song id, or a suno.com/song/<id> link → what the API takes in the path. */
const takeRef = (id: string) => id.trim().match(/suno\.com\/song\/([A-Za-z0-9-]+)/i)?.[1] ?? id.trim();

export function registerGenerationTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'list_generations',
    {
      title: 'List generations',
      description:
        "List a project's music takes (songs, covers, extends, remasters made with Suno), newest first: title, styles, exclude styles, lyrics, model and settings, status, audio and cover URLs, the suno.com link and its parent's, rating (keeper, maybe, reject), notes and the productions each was used in. A project is a channel; Browse Hack saves every Suno take made for it. Use rating keeper for the songs the channel kept. Needs community access or above.",
      inputSchema: {
        projectId: z.string(),
        rating: z
          .array(z.enum(['keeper', 'maybe', 'reject', 'unrated']))
          .optional()
          .describe('Only takes with these ratings; unrated is the ones nobody rated yet'),
        q: z
          .string()
          .optional()
          .describe('Whole words in the title, styles or lyrics, or a suno.com/song link or song id (that take and the takes made from it)'),
        model: z.string().optional().describe('e.g. v5'),
        kind: z.array(KIND).optional(),
        parentRef: z.string().optional().describe('Only takes made from this Suno song id (covers, extends…)'),
        tool: z.string().optional().describe('Only takes from this tool (suno is the only one so far)'),
        limit: z.number().int().min(1).max(200).default(20),
        cursor: z.string().optional().describe('nextCursor from the previous page'),
        lyrics: z.boolean().default(true).describe('false: leave out the lyrics (a shorter list)'),
      },
      annotations: READ,
    },
    safe(async ({ projectId, rating, q, model, kind, parentRef, tool, limit, cursor, lyrics }) => {
      const data = await client.get<{ items: Record<string, unknown>[]; nextCursor: string | null }>('/api/generations', {
        projectId,
        rating: rating?.join(','),
        q,
        model,
        kind: kind?.join(','),
        parentRef: parentRef && takeRef(parentRef),
        tool,
        limit,
        cursor,
      });
      const items = lyrics ? data.items : data.items.map(({ lyrics: _lyrics, ...rest }) => rest);
      return json({ items, nextCursor: data.nextCursor });
    }),
  );

  server.registerTool(
    'rate_generation',
    {
      title: 'Rate generation',
      description:
        "Rate a music take keeper, maybe or reject (null clears it), add a note to it, record the productions it was used in, or the media library item it was filed as. Owners and editors of the take's project only.",
      inputSchema: {
        id: z.string().describe("The take's id from list_generations, its Suno song id, or its suno.com/song link"),
        rating: RATING.nullable().optional(),
        note: z.string().optional().describe("Appended to the take's notes"),
        usedIn: z.array(z.string()).optional().describe('Production slugs it was used in (added to the list)'),
        libraryItem: z
          .string()
          .nullable()
          .optional()
          .describe('SHA-256 of the media library item it was filed as (null clears it)'),
      },
      annotations: WRITE,
    },
    safe(async ({ id, ...change }) => json(await client.patch(`/api/generations/${encodeURIComponent(takeRef(id))}`, change))),
  );
}
