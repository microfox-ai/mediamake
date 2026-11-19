import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MediamakeApiError, type MediamakeClient } from '../client.js';
import { json, safe } from '../util.js';

/**
 * Reading the Cloud Library (apps/mediamake/lib/cloud-library, docs/library.md): what a space
 * reuses, kept as collections of entries. These tools only read, so they are the same in the hosted
 * mm-use connector and in the local MediaMake Spaces MCP, which adds the ones that touch files on
 * the computer (fetch and save). The routes are /api/library, /api/library/entries and
 * /api/library/files.
 */
export const LIBRARY_ROUTE = '/api/library';
export const LIBRARY_SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const REF = /^[a-z0-9][a-z0-9-]{0,79}\/[a-z0-9][a-z0-9-]{0,79}$/;
const READ = { readOnlyHint: true, openWorldHint: true } as const;

export const libraryProjectId = z.string().describe('The space whose Library it is (list_library names them). Your personal space has one too.');
export const librarySlug = (what: string) => z.string().regex(LIBRARY_SLUG, `${what}: lowercase letters, digits and dashes`);
export const libraryRef = z
  .string()
  .regex(REF, 'an entry: <collection>/<entry>, e.g. songs/nakama')
  .describe('The entry, as its card names it after "id": <collection>/<entry>, e.g. songs/nakama. A collection another space shares goes by its id here (songs, or songs-<who shares it>)');
const projectId = libraryProjectId;
const slug = librarySlug;
const ref = libraryRef;

/** The route with its query. A list is sent once per value (where, has, lacks). */
export function libraryAt(route: string, params: Record<string, unknown> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) for (const v of [value].flat()) if (v !== undefined && v !== null && v !== '' && v !== false) query.append(key, String(v));
  const text = query.toString();
  return `${LIBRARY_ROUTE}${route}${text ? `?${text}` : ''}`;
}
const at = libraryAt;

/** The Library's own words for a refusal, without the request line in front. */
export async function libraryAsk<T = any>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const said = error instanceof MediamakeApiError ? (error.body as { error?: string } | undefined)?.error : undefined;
    if (said) throw new Error(said);
    throw error;
  }
}
const ask = libraryAsk;

/** A file's SHA-256, or null when nothing is there. */
export async function librarySha(abs: string): Promise<string | null> {
  if (!(await stat(abs).catch(() => null))?.isFile()) return null;
  const hash = createHash('sha256');
  await pipeline(createReadStream(abs), hash);
  return hash.digest('hex');
}
const shaAt = librarySha;

/** `localFiles`: the server runs on the person's computer and may read a file to name it by its SHA-256. */
export function registerLibraryReadTools(server: McpServer, client: MediamakeClient, options: { localFiles: boolean }) {
  server.registerTool(
    'list_library',
    {
      title: 'List the Library',
      description:
        "The Cloud Library: what a space reuses, kept as collections of entries (a channel's songs with their masters, lyrics, transcripts, release details and links). Without projectId: every space whose Library you can open, with its collections and how many entries each holds. With projectId: that space's collections in full, and with `collection` only that one: its fields (which are never guessed), its file slots, the spellings its lists already use, its guide and the owner's preferences. Read a collection this way before saving to it. A collection marked `shared` is another space's live collection, not a copy.",
      inputSchema: { projectId: projectId.optional(), collection: slug("A collection's id").optional().describe('Only this collection, in full (needs projectId)') },
      annotations: READ,
    },
    safe(async ({ projectId, collection }) => {
      if (!projectId) {
        if (collection) throw new Error('Which space is that collection in? Give projectId too.');
        return json(await ask(() => client.get(at(''))));
      }
      const view = await ask(() => client.get(at('', { space: projectId })));
      if (!collection) return json(view);
      const found = (view.collections as { slug: string }[]).find(c => c.slug === collection);
      if (!found) throw new Error(`No collection ${collection} in the ${view.space?.name ?? ''} space. It has: ${(view.collections as { slug: string }[]).map(c => c.slug).join(', ') || 'none yet'}.`);
      return json({ space: view.space, collection: found });
    }),
  );

  server.registerTool(
    'search_library',
    {
      title: 'Search the Library',
      description:
        'Search the Library by words and by what an entry has. Answers with cards (a few lines each: title, id, the short fields, which files it holds): nothing is downloaded. Without projectId it looks through every space you can open. Then get_library_entry for one entry and read_library_entry for a text. Every search is counted.',
      inputSchema: {
        query: z.string().max(200).optional().describe('Words from the title, the fields or the lyrics'),
        projectId: projectId.optional(),
        collection: slug("A collection's id").optional(),
        where: z.record(z.string(), z.string()).optional().describe('Fields that must be exactly this: { "use": "released", "language": "english" }'),
        has: z.array(slug('A file slot')).optional().describe('File slots that must hold a file: ["transcript"]'),
        lacks: z.array(slug('A file slot')).optional().describe('File slots that must be empty: ["stems"]'),
        limit: z.number().int().min(1).max(200).optional(),
        byMeaning: z.boolean().optional().describe('Match the words by what an entry is about ("the sad sea song"), best first, each hit with the piece of its lyrics or transcript that fits. Needs query. For an exact question (every unreleased song) leave it off'),
        place: z.string().max(60).optional().describe('This computer, by the name its owner gave it (for the usage lines)'),
      },
      annotations: READ,
    },
    safe(async ({ query, projectId, collection, where, has, lacks, limit, byMeaning, place }) =>
      json(await ask(() => client.get(at('/entries', { q: query ?? '', space: projectId, collection, where: Object.entries(where ?? {}).map(([key, value]) => `${key}=${value}`), has, lacks, limit, meaning: byMeaning ? 1 : undefined, device: place })))),
    ),
  );

  server.registerTool(
    'get_library_entry',
    {
      title: 'Get a Library entry',
      description: "One entry in full: every field, its files by slot (name, size, SHA-256, what each was made from), its history and its latest numbers. No file is downloaded and no link is made.",
      inputSchema: { projectId, ref },
      annotations: READ,
    },
    safe(async ({ projectId, ref }) => json(await ask(() => client.get(at('/entries', { space: projectId, ref }))))),
  );

  server.registerTool(
    'read_library_entry',
    {
      title: 'Read a text of a Library entry',
      description:
        "Read a field's text (lyrics) or a text or JSON file in a slot (transcript), whole or a part of it: lines, or the seconds of a timed transcript. Nothing is downloaded to this computer. Use this instead of fetching a file only to read it.",
      inputSchema: {
        projectId,
        ref,
        what: slug('A field or a file slot').describe('The field (lyrics) or the file slot (transcript) to read'),
        lines: z.string().regex(/^\d+-\d+$/, 'lines as first-last: 1-40').optional().describe('Only these lines: "1-40"'),
        fromSeconds: z.number().min(0).optional().describe('Of a timed transcript: from this second'),
        toSeconds: z.number().min(0).optional().describe('Of a timed transcript: to this second'),
        place: z.string().max(60).optional(),
      },
      annotations: READ,
    },
    safe(async ({ projectId, ref, what, lines, fromSeconds, toSeconds, place }) => json(await ask(() => client.get(at('/files', { space: projectId, ref, read: what, lines, from: fromSeconds, to: toSeconds, device: place }))))),
  );

  server.registerTool(
    'library_made_from',
    {
      title: 'What was made from a file',
      description:
        "Ask the Library what was already made from an exact file, before paying to make it again: the transcript of this master, the stems of this mix. Give the file (its SHA-256); the answer lists the entries that hold such a result, with the tool and settings it was made with. Without `settings` only results made with the tool's default settings fit. Cards only, no download.",
      inputSchema: {
        ...(options.localFiles && { filePath: z.string().optional().describe('The source file on this computer') }),
        sha256: z.string().regex(/^[0-9a-f]{64}$/i).optional().describe("The source file's SHA-256"),
        slot: slug('A file slot').optional().describe('Only results in this slot: "transcript"'),
        tool: z.string().max(80).optional().describe('Only results made with this tool'),
        settings: z.string().max(200).optional().describe('The settings the result must have been made with'),
        projectId: projectId.optional().describe('Only this space. Left out: every space you can open'),
        place: z.string().max(60).optional(),
      },
      annotations: READ,
    },
    safe(async ({ filePath, sha256, slot, tool, settings, projectId, place }: { filePath?: string; sha256?: string; slot?: string; tool?: string; settings?: string; projectId?: string; place?: string }) => {
      if (!options.localFiles && filePath) throw new Error('This connector cannot read files on your computer: give the sha256.');
      if (!filePath === !sha256) throw new Error(options.localFiles ? 'Made from which file? Give filePath or sha256, one of the two.' : 'Made from which file? Give its sha256.');
      const source = sha256?.toLowerCase() ?? (await shaAt(resolve(filePath!)));
      if (!source) throw new Error(`Not a file: ${filePath}`);
      return json({ sha256: source, ...(await ask(() => client.get(at('/files', { madeFrom: source, space: projectId, slot, tool, params: settings, device: place })))) });
    }),
  );

}
