import { existsSync } from 'node:fs';
import { rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../../../mediamake-mcp/src/client.js';
import { json, mimeFromName, safe } from '../../../mediamake-mcp/src/util.js';
import { downloadFile, mapLimit, putFile, sha256File, within } from '../files.js';
import { READ, WRITE } from './annotations.js';

/**
 * A project's shared assets: the library files its team shares (overlays, footage, art, pictures,
 * references), each with what the media library knows about it (kind, subject, title, tags). They
 * are the same files `media share` and `media sync` move in apps/lyrics_videos; here anyone on the
 * project lists, downloads and shares them with ProjectSync alone. The routes are /api/channel-sync
 * (apps/mediamake/lib/channel-sync): every project can hold shared assets, a channel's or one made
 * just to share files with a team, under the project's limit (100 MB in all by default).
 */
const ROUTE = '/api/channel-sync';
const MB = 1_000_000;
const MAX_FILES = 50;
/** The kinds a team shares (SHARED_KINDS in apps/mediamake/lib/channel-sync). */
const KINDS = ['footage', 'images', 'art', 'overlays', 'references'] as const;
const SHA256 = /^[0-9a-f]{64}$/;

const projectId = z.string().describe('The project (list_projects). Shared assets belong to one project; everyone on it can download them.');
const sha256List = z.array(z.string().regex(SHA256, 'a sha256 from list_shared_assets')).min(1).max(MAX_FILES);

interface Details {
  sha256: string;
  kind: string;
  subject?: string | null;
  title?: string | null;
  path?: string;
  tags?: string[];
  bytes?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  sources?: { tool: string; ref?: string }[];
  [key: string]: unknown;
}
interface SharedItem {
  key: string;
  data: Details;
  updatedAt?: string;
  mine?: boolean;
  file?: { url: string; size: number; fileName?: string; contentType?: string };
}
interface Status {
  project: { id: string; name: string; role: string };
  limitBytes: number;
  usedBytes: number;
  counts: { files: number };
}

const mb = (bytes: number) => Math.round(bytes / MB) || (bytes > 0 ? 1 : 0);
const limitOf = (s: Status) => ({ usedMb: mb(s.usedBytes), limitMb: mb(s.limitBytes), freeMb: mb(Math.max(0, s.limitBytes - s.usedBytes)) });
const kindOf = (mime: string | undefined): (typeof KINDS)[number] => (mime?.startsWith('video/') ? 'footage' : mime?.startsWith('image/') ? 'images' : 'references');
/** A shared file's name on disk: what it was called, never a path. */
const nameOf = (i: SharedItem) => basename(i.file?.fileName ?? i.data.path ?? i.key.slice(0, 12)).replace(/[/:\\]+/g, ' ');

const asset = (i: SharedItem) => ({
  sha256: i.key,
  kind: i.data.kind,
  title: i.data.title ?? nameOf(i),
  subject: i.data.subject ?? undefined,
  tags: i.data.tags,
  fileName: nameOf(i),
  bytes: i.data.bytes ?? i.file?.size,
  width: i.data.width ?? undefined,
  height: i.data.height ?? undefined,
  duration: i.data.duration ?? undefined,
  url: i.file?.url,
  sharedByMe: !!i.mine,
  updatedAt: i.updatedAt,
});

const status = (client: MediamakeClient, projectId: string) => client.request<Status>('GET', ROUTE, { query: { projectId } });
/** The project's shared assets: items whose file the team can fetch. */
const sharedItems = async (client: MediamakeClient, projectId: string): Promise<SharedItem[]> => {
  const r = await client.request<{ items?: SharedItem[] }>('GET', `${ROUTE}/items`, { query: { projectId, what: 'media', files: '1' } });
  return (r.items ?? []).filter(i => i.file);
};

export function registerSharedAssetTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'list_shared_assets',
    {
      title: 'List shared assets',
      description:
        "A project's shared assets: the library files its team shares (overlays, footage, art, pictures, references), with their kind, subject, title and tags, and how much of the project's sharing limit is used. Anyone on the project can download them (download_shared_assets).",
      inputSchema: {
        projectId,
        kind: z.enum(KINDS).optional(),
        query: z.string().optional().describe('Words in the title, subject, tags or file name'),
      },
      annotations: READ,
    },
    safe(async ({ projectId, kind, query }) => {
      const [st, items] = await Promise.all([status(client, projectId), sharedItems(client, projectId)]);
      const words = query?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
      const assets = items
        .filter(i => !kind || i.data.kind === kind)
        .map(asset)
        .filter(a => !words.length || words.every(w => [a.title, a.subject, a.fileName, ...(a.tags ?? [])].some(v => v?.toLowerCase().includes(w))));
      return json({ project: st.project, limit: limitOf(st), total: assets.length, assets });
    }),
  );

  server.registerTool(
    'download_shared_assets',
    {
      title: 'Download shared assets',
      description:
        "Download a project's shared assets into a folder on this computer, every file checked against its sha256. Each gets a <file>.source.json beside it with what the library knows about it, so the media library's `media ingest` files it with its kind, subject and tags: save into the library's inbox (<inbox>/mediamake-sync/<project>) to have them filed on the next ingest, or into any folder just to have the files.",
      inputSchema: {
        projectId,
        saveTo: z.string().describe('A folder on this computer (made if needed)'),
        sha256: sha256List.optional().describe('Which assets (from list_shared_assets); all of the project’s when left out'),
      },
      annotations: READ,
    },
    safe(async ({ projectId, saveTo, sha256 }) => {
      const items = await sharedItems(client, projectId);
      const wanted = sha256 ? new Set(sha256.map(s => s.toLowerCase())) : null;
      const pick = wanted ? items.filter(i => wanted.has(i.key)) : items;
      const missing = wanted ? [...wanted].filter(s => !items.some(i => i.key === s)) : [];
      const saved: { sha256: string; kind: string; title: string; savedTo: string }[] = [];
      const already: { sha256: string; savedTo: string }[] = [];
      const failed: { sha256: string; reason: string }[] = [];
      await mapLimit(pick, 3, async i => {
        try {
          const dest = within(saveTo, nameOf(i));
          if (existsSync(dest) && (await sha256File(dest)) === i.key) return void already.push({ sha256: i.key, savedTo: dest });
          const target = existsSync(dest) ? dest.replace(/(\.\w+)?$/, `-${i.key.slice(0, 8)}$1`) : dest;
          await downloadFile(i.file!.url, target);
          if ((await sha256File(target)) !== i.key) {
            await rm(target, { force: true });
            throw new Error("the download didn't match its sha256");
          }
          const first = i.data.sources?.[0] ?? { tool: 'mediamake-sync', ref: i.key };
          await writeFile(`${target}.source.json`, `${JSON.stringify({ ...first, schema: 'mediamake.source/v1', channel: projectId, library: i.data }, null, 2)}\n`);
          saved.push({ sha256: i.key, kind: i.data.kind, title: asset(i).title, savedTo: target });
        } catch (error) {
          failed.push({ sha256: i.key, reason: (error as Error).message });
        }
      });
      return json({ projectId, saveTo: resolve(saveTo), saved, already, failed, missing });
    }),
  );

  server.registerTool(
    'share_assets',
    {
      title: 'Share assets',
      description:
        "Share files from this computer as a project's shared assets (up to 50 at a time), so everyone on the project can download them: overlays, footage, art, pictures, references. Each goes up with its kind, subject and tags for the media library, under the project's sharing limit (100 MB in all by default; set_shared_limit raises it). A file the project already shares (same content) is not sent again. Owners and editors only. Ask the user which project and what the files are (kind, subject) first; dryRun shows what would go up.",
      inputSchema: {
        projectId,
        filePaths: z.array(z.string()).min(1).max(MAX_FILES),
        kind: z
          .enum(KINDS)
          .optional()
          .describe('What they are for the media library: overlays (effects, light leaks, frames, transitions), footage (clips), images (photos, stills), art (generated or drawn pictures), references. Without it, clips are footage, pictures are images and the rest references.'),
        subject: z.string().optional().describe('What they show or belong to, as the library sorts it: "one-piece/zoro", "light-leaks", "film-grain"'),
        tags: z.array(z.string()).optional(),
        dryRun: z.boolean().optional().describe('Only say what would go up'),
      },
      annotations: WRITE,
    },
    safe(async ({ projectId, filePaths, kind, subject, tags, dryRun }) => {
      const files = await mapLimit(filePaths, 4, async raw => {
        const abs = resolve(raw);
        const info = await stat(abs).catch(() => null);
        if (!info?.isFile()) throw new Error(`Not a file: ${raw}`);
        const name = basename(abs);
        const mime = mimeFromName(name) ?? 'application/octet-stream';
        return { abs, name, size: info.size, contentType: mime, sha256: await sha256File(abs), kind: kind ?? kindOf(mime), title: name.slice(0, name.length - extname(name).length) || name };
      });
      const [st, existing] = await Promise.all([status(client, projectId), sharedItems(client, projectId)]);
      const shared = new Set(existing.map(i => i.key));
      const already = files.filter(f => shared.has(f.sha256)).map(f => ({ name: f.name, sha256: f.sha256 }));
      const fresh = files.filter(f => !shared.has(f.sha256));
      const bytes = fresh.reduce((n, f) => n + f.size, 0);
      const summary = { project: st.project, limit: limitOf(st), upload: fresh.map(f => ({ name: f.name, kind: f.kind, mb: mb(f.size), sha256: f.sha256 })), uploadMb: mb(bytes), already };
      if (dryRun) return json({ dryRun: true, ...summary, ...(st.usedBytes + bytes > st.limitBytes ? { overLimit: `${mb(st.usedBytes + bytes)} MB would be shared, the limit is ${mb(st.limitBytes)} MB: set_shared_limit (the owner) raises it` } : {}) });
      if (!fresh.length) return json({ ...summary, shared: [], refused: [], failed: [] });

      // the details first (what each file is), then the file itself: a link to upload to, the PUT, and the confirmation
      await client.request('PUT', `${ROUTE}/items`, {
        body: {
          projectId,
          what: 'media',
          items: fresh.map(f => ({ key: f.sha256, hash: f.sha256, data: { sha256: f.sha256, kind: f.kind, subject: subject ?? null, title: f.title, tags, bytes: f.size } })),
        },
      });
      const plan = await client.request<{ uploads: { sha256: string; uploadUrl: string; contentType: string }[]; already: string[]; refused: { sha256: string; reason: string }[] }>('POST', `${ROUTE}/files`, {
        body: { projectId, files: fresh.map(f => ({ sha256: f.sha256, size: f.size, fileName: f.name, contentType: f.contentType })) },
      });
      const bySha = new Map(fresh.map(f => [f.sha256, f]));
      const failed: { name: string; sha256: string; reason: string }[] = [];
      const uploaded: string[] = [];
      await mapLimit(plan.uploads, 3, async u => {
        const f = bySha.get(u.sha256)!;
        try {
          await putFile(u.uploadUrl, f.abs, f.size, { 'Content-Type': u.contentType, 'x-amz-acl': 'public-read' });
          uploaded.push(u.sha256);
        } catch (error) {
          failed.push({ name: f.name, sha256: f.sha256, reason: (error as Error).message });
        }
      });
      const confirmed = uploaded.length
        ? await client.request<{ shared: string[]; failed: { sha256: string; reason: string }[]; usedBytes: number; limitBytes: number }>('PUT', `${ROUTE}/files`, { body: { projectId, sha256: uploaded } })
        : { shared: [], failed: [], usedBytes: st.usedBytes, limitBytes: st.limitBytes };
      for (const f of confirmed.failed) failed.push({ name: bySha.get(f.sha256)?.name ?? f.sha256, sha256: f.sha256, reason: f.reason });
      const done = [...confirmed.shared, ...plan.already].map(s => bySha.get(s)!).filter(Boolean);
      return json({
        project: st.project,
        shared: done.map(f => ({ name: f.name, kind: f.kind, mb: mb(f.size), sha256: f.sha256 })),
        already: [...already, ...plan.already.map(s => ({ name: bySha.get(s)?.name ?? s, sha256: s }))],
        refused: plan.refused.map(r => ({ name: bySha.get(r.sha256)?.name ?? r.sha256, sha256: r.sha256, reason: r.reason })),
        failed,
        limit: limitOf({ ...st, usedBytes: confirmed.usedBytes, limitBytes: confirmed.limitBytes }),
      });
    }),
  );

  server.registerTool(
    'unshare_assets',
    {
      title: 'Stop sharing assets',
      description: "Stop sharing assets with the project's team: they no longer get the files and the files stop counting against the limit. What the library knew about them stays. Owners and editors only.",
      inputSchema: { projectId, sha256: sha256List },
      annotations: WRITE,
    },
    safe(async ({ projectId, sha256 }) => json(await client.request('DELETE', `${ROUTE}/files`, { query: { projectId, sha256: sha256.join(',') } }))),
  );

  server.registerTool(
    'set_shared_limit',
    {
      title: 'Set the sharing limit',
      description: "How much a project's team may share in files, in all (100 MB by default). Only the project's owner can change it.",
      inputSchema: { projectId, limitMb: z.number().min(0).describe('MB in all') },
      annotations: WRITE,
    },
    safe(async ({ projectId, limitMb }) => {
      const r = await client.request<{ limitBytes: number }>('PUT', ROUTE, { body: { projectId, limitMb } });
      return json({ projectId, limitMb: mb(r.limitBytes) });
    }),
  );
}
