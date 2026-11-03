import { basename, resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../../../mediamake-mcp/src/client.js';
import { json, mimeFromName, safe } from '../../../mediamake-mcp/src/util.js';
import { downloadFile, mapLimit, putFile, sha256File, within } from '../files.js';
import { DELETE, READ, WRITE } from './annotations.js';

const ROUTE = '/api/project/media';
const MAX_FILES = 50;
const projectId = z.string().describe('The project it belongs to (list_projects). Media always belongs to one project.');
const contentType = z.enum(['image', 'video', 'audio', 'document', 'unknown']).optional();

export function registerMediaTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'list_media',
    {
      title: 'List media',
      description: "List a project's media files (pictures, songs, clips: usually inputs), newest first, from anyone on the project.",
      inputSchema: { projectId, contentType, page: z.number().int().min(1).optional(), limit: z.number().int().min(1).max(100).optional() },
      annotations: READ,
    },
    safe(async args => json(await client.get(ROUTE, args))),
  );

  server.registerTool(
    'search_media',
    {
      title: 'Search media',
      description: "Search a project's media by file name or tag.",
      inputSchema: { projectId, query: z.string().min(1), contentType, limit: z.number().int().min(1).max(100).optional() },
      annotations: READ,
    },
    safe(async ({ query, ...args }) => json(await client.get(ROUTE, { ...args, search: query }))),
  );

  server.registerTool(
    'get_media',
    {
      title: 'Get media',
      description: 'One media file: its name, link, size and tags. With saveTo, downloads it into that folder.',
      inputSchema: { projectId, id: z.string(), saveTo: z.string().optional().describe('A folder on this computer to download it into') },
      annotations: READ,
    },
    safe(async ({ projectId, id, saveTo }) => {
      const item = await client.get(ROUTE, { projectId, id });
      if (!saveTo) return json(item);
      const dest = within(saveTo, basename(item.name));
      await downloadFile(item.url, dest);
      return json({ ...item, savedTo: dest });
    }),
  );

  server.registerTool(
    'upload_media',
    {
      title: 'Upload media',
      description:
        "Upload single files from this computer to a project's media (up to 50 at a time). They are stored as they are: no image description, no audio analysis. A file the project already has (same content) is not uploaded again. Ask the user first whether these should be media, a production or a release, and which project.",
      inputSchema: {
        projectId,
        filePaths: z.array(z.string()).min(1).max(MAX_FILES),
        tags: z.array(z.string()).optional(),
      },
      annotations: WRITE,
    },
    safe(async ({ projectId, filePaths, tags }) => {
      const files = await mapLimit(filePaths, 4, async raw => {
        const abs = resolve(raw);
        const info = await stat(abs).catch(() => null);
        if (!info?.isFile()) throw new Error(`Not a file: ${raw}`);
        const name = basename(abs);
        return { abs, name, size: info.size, contentType: mimeFromName(name) ?? 'application/octet-stream', sha256: await sha256File(abs) };
      });
      const { uploads } = await client.post(`${ROUTE}/upload`, {
        projectId,
        files: files.map(({ name, size, contentType, sha256 }) => ({ name, size, contentType, sha256 })),
      });
      const alreadyHave: unknown[] = [];
      const failed: { name: string; reason: string }[] = [];
      const items: Record<string, unknown>[] = [];
      await mapLimit(uploads as { name: string; uploadUrl?: string; headers?: Record<string, string>; url?: string; alreadyHave?: unknown; error?: string }[], 4, async (u, i) => {
        const file = files[i];
        if (u.alreadyHave) return void alreadyHave.push(u.alreadyHave);
        if (u.error || !u.uploadUrl) return void failed.push({ name: file.name, reason: u.error ?? 'no upload link' });
        try {
          await putFile(u.uploadUrl, file.abs, file.size, u.headers!);
          items.push({ name: file.name, url: u.url, size: file.size, contentType: file.contentType, sha256: file.sha256, tags });
        } catch (error) {
          failed.push({ name: file.name, reason: (error as Error).message });
        }
      });
      const saved = items.length ? await client.post(ROUTE, { projectId, items }) : { saved: [], missing: [] };
      return json({ projectId, saved: saved.saved, alreadyHave, failed: [...failed, ...(saved.missing ?? [])] });
    }),
  );

  server.registerTool(
    'delete_media',
    {
      title: 'Delete media',
      description: "Move a media file to the project's trash (the file is kept). Only the project's owner can. Confirm with the user first.",
      inputSchema: { projectId, id: z.string() },
      annotations: DELETE,
    },
    safe(async args => json(await client.request('DELETE', ROUTE, { query: args }))),
  );
}
