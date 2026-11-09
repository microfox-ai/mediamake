import { stat } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MediamakeApiError, type MediamakeClient } from '../../../mediamake-mcp/src/client.js';
import { json, safe } from '../../../mediamake-mcp/src/util.js';
import { MB, downloadFile, mapLimit, productionFiles, putFile, releaseFiles, sha256File, within, type LocalFile } from '../files.js';
import { DELETE, READ, WRITE } from './annotations.js';

type Kind = 'production' | 'release';

const ROUTE: Record<Kind, string> = { production: '/api/project/productions', release: '/api/project/releases' };
const UPLOADS_AT_ONCE = 4;

/** Counts and sizes by role, and the largest files: what a dry run shows the user. */
function summarize(files: LocalFile[]) {
  const byRole: Record<string, { files: number; mb: number }> = {};
  for (const f of files) {
    byRole[f.role] ??= { files: 0, mb: 0 };
    byRole[f.role].files += 1;
    byRole[f.role].mb += f.size / MB;
  }
  for (const r of Object.values(byRole)) r.mb = Math.round(r.mb * 10) / 10;
  return {
    files: files.length,
    mb: Math.round(files.reduce((s, f) => s + f.size, 0) / MB * 10) / 10,
    byRole,
    largest: [...files].sort((a, b) => b.size - a.size).slice(0, 8).map(f => ({ path: f.path, mb: Math.round(f.size / MB * 10) / 10 })),
  };
}

/** The API's answer to a refused request (409 missing files, 403 role) instead of a thrown error. */
async function orBody<T>(call: Promise<T>): Promise<T | { error: string; status: number; body: unknown }> {
  try {
    return await call;
  } catch (error) {
    if (error instanceof MediamakeApiError && error.status < 500) return { error: error.message, status: error.status, body: error.body };
    throw error;
  }
}

/**
 * Lists the files (with their sha256) to the API, PUTs the ones the bundle doesn't have yet to their
 * signed links, then finishes the version. Unchanged files from earlier versions aren't sent again.
 */
async function upload(client: MediamakeClient, kind: Kind, files: LocalFile[], body: Record<string, unknown>, update: boolean) {
  if (!files.length) throw new Error('Nothing to upload: the folders given hold no files (hidden files, node_modules and .git are skipped)');
  const listed = await mapLimit(files, UPLOADS_AT_ONCE, async f => ({ ...f, sha256: await sha256File(f.abs) }));
  const payload = { ...body, files: listed.map(f => ({ path: f.path, role: f.role, size: f.size, sha256: f.sha256 })) };
  const started = update ? await client.put(ROUTE[kind], payload) : await client.post(ROUTE[kind], payload);
  const byPath = new Map(listed.map(f => [f.path, f]));
  const failed: { path: string; reason: string }[] = [];
  await mapLimit(started.uploads as { path: string; uploadUrl: string; headers: Record<string, string> }[], UPLOADS_AT_ONCE, async u => {
    const file = byPath.get(u.path)!;
    try {
      await putFile(u.uploadUrl, file.abs, file.size, u.headers);
    } catch (error) {
      failed.push({ path: u.path, reason: (error as Error).message });
    }
  });
  const finished = await orBody(client.post(`${ROUTE[kind]}/finish`, started.finish));
  return {
    ...finished,
    uploaded: started.uploads.length - failed.length,
    alreadyStored: started.reused.length,
    ...(failed.length ? { failed, retry: `Run update_${kind} with the same files to try the failed ones again; the rest are kept.` } : {}),
  };
}

/** Downloads one version's files into a folder, skipping files already there with the same content. */
async function download(record: { files: { path: string; size: number; sha256: string; url: string }[] }, saveTo: string) {
  let saved = 0;
  let unchanged = 0;
  await mapLimit(record.files, UPLOADS_AT_ONCE, async f => {
    const dest = within(saveTo, f.path);
    const there = await stat(dest).catch(() => null);
    if (there?.size === f.size && (await sha256File(dest)) === f.sha256) {
      unchanged += 1;
      return;
    }
    await downloadFile(f.url, dest);
    saved += 1;
  });
  return { saveTo, saved, unchanged };
}

const projectId = z.string().describe('The project it belongs to (list_projects). Productions, releases and media always belong to one project.');
const pick = {
  id: z.string().optional().describe('Its id (from the list)'),
  slug: z.string().optional().describe('Or its slug'),
  version: z.number().int().min(1).optional().describe('A version (default: the latest)'),
  saveTo: z.string().optional().describe('Download that version into this folder on this computer (files already there unchanged are skipped)'),
  links: z.boolean().default(false).describe('Signed download links for each file (they last an hour)'),
};

async function getOne(client: MediamakeClient, kind: Kind, args: { projectId: string; id?: string; slug?: string; version?: number; saveTo?: string; links: boolean }) {
  if (!args.id === !args.slug) throw new Error('Give id or slug');
  const record = await client.get(ROUTE[kind], {
    projectId: args.projectId,
    id: args.id,
    slug: args.slug,
    version: args.version,
    links: args.saveTo || args.links ? 1 : undefined,
  });
  if (!args.saveTo) return json(record);
  const saved = await download(record, args.saveTo);
  return json({ ...record, files: record.files.map(({ url: _url, ...f }: { url: string }) => f), download: saved });
}

export function registerProductionTools(server: McpServer, client: MediamakeClient) {
  const fileArgs = {
    code: z.array(z.string()).optional().describe('Folders or files with the video\'s code (e.g. projects/<slug> in the MediaMake workspace, ~/MediaMake/projects/<slug>, or apps/studio/projects/<slug> before mm migrate); an input/ folder inside counts as inputs'),
    outputs: z.array(z.string()).optional().describe('Folders or files with its outputs (renders, stills), e.g. out/<slug> in the workspace (~/MediaMake/out/<slug>)'),
    inputs: z.array(z.string()).optional().describe('More input folders or files (songs, footage)'),
    includeInputs: z.boolean().default(true).describe('false: never send inputs. Otherwise they go up only when they come to 200 MB or less in all'),
    dryRun: z.boolean().default(false).describe('Only list what would go up (do this first and show the user)'),
    note: z.string().optional().describe('What this version is, e.g. "v6: three notes fixed"'),
  };

  server.registerTool(
    'list_productions',
    {
      title: 'List productions',
      description: "List a project's productions (videos: their code and outputs), most recently changed first, with their latest version, file count and size.",
      inputSchema: { projectId, search: z.string().optional(), page: z.number().int().min(1).optional(), limit: z.number().int().min(1).max(100).optional() },
      annotations: READ,
    },
    safe(async args => json(await client.get(ROUTE.production, args))),
  );

  server.registerTool(
    'get_production',
    {
      title: 'Get production',
      description: "One production: its files (path, role code/output/input, size, sha256) and versions. With saveTo, downloads that version into a folder, keeping its layout (code/, output/, input/).",
      inputSchema: { projectId, ...pick },
      annotations: READ,
    },
    safe(async args => getOne(client, 'production', args)),
  );

  server.registerTool(
    'create_production',
    {
      title: 'Create production',
      description:
        "Upload a video to a project as a production: its code files and outputs, laid out as code/, output/ and input/. Its inputs go up only when they come to 200 MB or less in all; otherwise they are left out (upload the ones that matter with upload_media). Ask the user first whether this should be a production, a release or media, and which project; run with dryRun: true and show them what would go up. A slug that already exists is updated with update_production instead.",
      inputSchema: {
        projectId,
        slug: z.string().describe('Short name, lowercase letters, digits and dashes, e.g. "honored-one-amv"'),
        title: z.string().optional(),
        notes: z.string().optional(),
        ...fileArgs,
      },
      annotations: WRITE,
    },
    safe(async ({ projectId, slug, title, notes, code, outputs, inputs, includeInputs, dryRun, note }) => {
      if (!code?.length && !outputs?.length) throw new Error('Give code and/or outputs folders');
      const { files, inputs: inputInfo } = await productionFiles({ code, outputs, inputs, includeInputs });
      if (dryRun) return json({ dryRun: true, kind: 'production', projectId, slug, ...summarize(files), inputs: inputInfo });
      return json({ ...(await upload(client, 'production', files, { projectId, slug, title, notes, note }, false)), inputs: inputInfo });
    }),
  );

  server.registerTool(
    'update_production',
    {
      title: 'Update production',
      description:
        "Change a production's title or notes, or upload a new version: pass code/outputs/inputs and every file is listed again; only the changed ones are uploaded, and earlier versions are kept. Run with dryRun first.",
      inputSchema: { projectId, id: z.string(), title: z.string().optional(), notes: z.string().nullable().optional(), ...fileArgs },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ projectId, id, title, notes, code, outputs, inputs, includeInputs, dryRun, note }) => {
      if (!code?.length && !outputs?.length && !inputs?.length) {
        if (dryRun) return json({ dryRun: true, changes: { title, notes } });
        return json(await client.put(ROUTE.production, { projectId, id, title, notes }));
      }
      const { files, inputs: inputInfo } = await productionFiles({ code, outputs, inputs, includeInputs });
      if (dryRun) return json({ dryRun: true, kind: 'production', projectId, id, ...summarize(files), inputs: inputInfo });
      return json({ ...(await upload(client, 'production', files, { projectId, id, title, notes, note }, true)), inputs: inputInfo });
    }),
  );

  server.registerTool(
    'delete_production',
    {
      title: 'Delete production',
      description: "Move a production to the project's trash (its files are kept). Only the project's owner can. Confirm with the user first.",
      inputSchema: { projectId, id: z.string() },
      annotations: DELETE,
    },
    safe(async args => json(await client.request('DELETE', ROUTE.production, { query: args }))),
  );
}

export function registerReleaseTools(server: McpServer, client: MediamakeClient) {
  const platform = z.enum(['youtube', 'distrokid', 'other']).describe('Where it is released: a YouTube upload pack, a DistroKid release, or other');
  const fileArgs = {
    folder: z.string().optional().describe('The release kit folder, e.g. out/youtube/<slug> in the workspace (~/MediaMake/out/youtube/<slug>) or a DistroKid release folder; uploaded as it is'),
    files: z.array(z.string()).optional().describe('Single files to add at its top (a master, a cover)'),
    dryRun: z.boolean().default(false).describe('Only list what would go up (do this first and show the user)'),
    note: z.string().optional().describe('What this version is'),
  };

  server.registerTool(
    'list_releases',
    {
      title: 'List releases',
      description: "List a project's release kits (YouTube upload packs, DistroKid releases), most recently changed first.",
      inputSchema: { projectId, search: z.string().optional(), platform: platform.optional(), page: z.number().int().min(1).optional(), limit: z.number().int().min(1).max(100).optional() },
      annotations: READ,
    },
    safe(async args => json(await client.get(ROUTE.release, args))),
  );

  server.registerTool(
    'get_release',
    {
      title: 'Get release',
      description: 'One release kit: its files and versions, and the production it releases. With saveTo, downloads that version into a folder.',
      inputSchema: { projectId, ...pick },
      annotations: READ,
    },
    safe(async args => getOne(client, 'release', args)),
  );

  server.registerTool(
    'create_release',
    {
      title: 'Create release',
      description:
        "Upload a complete release kit to a project (everything in the folder: thumbnails, title, description, info.json, master, cover, lyrics). Ask the user first whether this should be a release, a production or media, and which project; run with dryRun: true and show them what would go up. A slug that already exists is updated with update_release instead.",
      inputSchema: {
        projectId,
        slug: z.string().describe('Short name, lowercase letters, digits and dashes, e.g. "cadence-youtube"'),
        title: z.string().optional(),
        notes: z.string().optional(),
        platform,
        productionId: z.string().optional().describe('The production it releases, when there is one'),
        ...fileArgs,
      },
      annotations: WRITE,
    },
    safe(async ({ projectId, slug, title, notes, platform, productionId, folder, files: extra, dryRun, note }) => {
      const files = await releaseFiles({ folder, files: extra });
      if (dryRun) return json({ dryRun: true, kind: 'release', projectId, slug, platform, ...summarize(files) });
      return json(await upload(client, 'release', files, { projectId, slug, title, notes, platform, productionId, note }, false));
    }),
  );

  server.registerTool(
    'update_release',
    {
      title: 'Update release',
      description: "Change a release kit's title, notes, platform or production, or upload a new version from its folder (only changed files go up; earlier versions are kept). Run with dryRun first.",
      inputSchema: {
        projectId,
        id: z.string(),
        title: z.string().optional(),
        notes: z.string().nullable().optional(),
        platform: platform.optional(),
        productionId: z.string().nullable().optional(),
        ...fileArgs,
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ projectId, id, title, notes, platform, productionId, folder, files: extra, dryRun, note }) => {
      const meta = { projectId, id, title, notes, platform, productionId };
      if (!folder && !extra?.length) {
        if (dryRun) return json({ dryRun: true, changes: meta });
        return json(await client.put(ROUTE.release, meta));
      }
      const files = await releaseFiles({ folder, files: extra });
      if (dryRun) return json({ dryRun: true, kind: 'release', projectId, id, ...summarize(files) });
      return json(await upload(client, 'release', files, { ...meta, note }, true));
    }),
  );

  server.registerTool(
    'delete_release',
    {
      title: 'Delete release',
      description: "Move a release kit to the project's trash (its files are kept). Only the project's owner can. Confirm with the user first.",
      inputSchema: { projectId, id: z.string() },
      annotations: DELETE,
    },
    safe(async args => json(await client.request('DELETE', ROUTE.release, { query: args }))),
  );
}
