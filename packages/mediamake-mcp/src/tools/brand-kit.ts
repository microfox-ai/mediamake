import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../client.js';
import { json, mimeFromName, safe, type ToolOptions } from '../util.js';

const READ = { readOnlyHint: true, openWorldHint: true } as const;
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
} as const;

/** Text files in an exported kit that fill brand kit fields instead of being uploaded. */
const TEXT_FIELDS: Record<string, 'guide' | 'channelDescription' | 'thumbnailProfile' | 'colors' | 'manifest'> = {
  'brandguide.md': 'guide',
  'channel-description.md': 'channelDescription',
  'thumbnail.json': 'thumbnailProfile',
  'colors.json': 'colors',
  'colours.json': 'colors',
  'brand.json': 'manifest',
};

const EXTRA_MIME: Record<string, string> = {
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  ico: 'image/x-icon',
  md: 'text/markdown',
  html: 'text/html',
  webmanifest: 'application/manifest+json',
  avif: 'image/avif',
};

/** What a kit uploads: images (svg included), video, audio and fonts. Code and other files never are. */
const KIT_ASSET = /\.(png|jpe?g|webp|gif|avif|svg|ico|mp4|m4v|webm|mov|wav|mp3|m4a|aac|ogg|flac|ttf|otf|woff2?)$/i;

const mimeOf = (path: string) =>
  mimeFromName(path) ?? EXTRA_MIME[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

/** Every file under `root`, skipping hidden folders, the brand's source (`graphics/`) and dependencies. */
async function walk(root: string, dir = root, out: { path: string; abs: string; size: number }[] = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'graphics') continue;
      await walk(root, abs, out);
    } else if (entry.isFile()) {
      out.push({ path: relative(root, abs).split(sep).join('/'), abs, size: (await stat(abs)).size });
    }
    if (out.length > 2000) throw new Error(`More than 2000 files under ${root}; point at the exported kit folder (brands/<brand>/).`);
  }
  return out;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

interface KitFile {
  path: string;
  size: number;
  readText: () => Promise<string>;
}

interface KitPlan<F extends KitFile> {
  patch: Record<string, unknown>;
  upload: F[];
  skipped: { path: string; reason: string }[];
}

/**
 * Sorts an exported kit's files: brandguide.md, colors.json, brand.json and
 * friends fill kit fields; images, video, audio and fonts are uploaded as
 * assets; everything else (code, html, css, other json) is skipped. Shared by
 * the local tool (files on disk) and the hosted one (files the client lists).
 */
async function planKit<F extends KitFile>(
  files: F[],
  { only, includeMasters, maxFileMb }: { only?: string[]; includeMasters: boolean; maxFileMb: number },
): Promise<KitPlan<F>> {
  const patch: Record<string, unknown> = {};
  const upload: F[] = [];
  const skipped: { path: string; reason: string }[] = [];
  const fontFiles: string[] = [];
  for (const f of files) {
    if (only && !only.some(prefix => f.path.startsWith(prefix))) continue;
    // The brand's source: never uploaded or read, at any depth (the kit root has its own guide and colours).
    if (f.path.split('/').slice(0, -1).includes('graphics')) {
      skipped.push({ path: f.path, reason: 'source (graphics/)' });
      continue;
    }
    const name = f.path.split('/').pop()!.toLowerCase();
    const role = TEXT_FIELDS[name];
    if (role) {
      try {
        const body = await f.readText();
        if (role === 'guide') patch.guide = body;
        else if (role === 'channelDescription') patch.channelDescription = body;
        else {
          const parsed = JSON.parse(body);
          if (role === 'manifest') {
            if (typeof parsed.name === 'string') patch.name = parsed.name;
            if (Array.isArray(parsed.fonts)) patch.fonts = parsed.fonts;
          } else patch[role] = parsed;
        }
      } catch (error) {
        skipped.push({ path: f.path, reason: error instanceof SyntaxError ? 'not valid JSON' : String((error as Error).message ?? error) });
      }
      continue;
    }
    if (!KIT_ASSET.test(name)) {
      skipped.push({ path: f.path, reason: 'not an image, video, audio or font file' });
      continue;
    }
    if (name.endsWith('.mov') && !includeMasters) {
      skipped.push({ path: f.path, reason: 'ProRes master (pass includeMasters)' });
      continue;
    }
    if (f.size > maxFileMb * 1024 * 1024) {
      skipped.push({ path: f.path, reason: `larger than ${maxFileMb} MB` });
      continue;
    }
    if (/\.(woff2?|ttf|otf)$/.test(name)) fontFiles.push(name);
    upload.push(f);
  }
  if (!patch.fonts && fontFiles.length) {
    // The server keeps only the family; drop weights and styles from file names.
    const families = new Set(
      fontFiles.map(n =>
        n
          .replace(/\.[^.]+$/, '')
          .replace(/[-_ ]?(thin|extralight|light|regular|book|medium|semibold|bold|extrabold|black|heavy|italic|variable)+$/gi, '')
          .replace(/[-_]+/g, ' ')
          .trim(),
      ),
    );
    patch.fonts = [...families].filter(Boolean).map(family => ({ family }));
  }
  return { patch, upload, skipped };
}

/** Presigned PUT targets for kit files, 100 per request. */
async function presignKitFiles(client: MediamakeClient, projectId: string, paths: string[]) {
  const byPath = new Map<string, { path: string; kind: string; contentType: string; uploadUrl: string; url: string }>();
  for (let i = 0; i < paths.length; i += 100) {
    const { uploads } = await client.post('/api/project/brand-kit/upload', {
      projectId,
      files: paths.slice(i, i + 100).map(path => ({ path, contentType: mimeOf(path) })),
    });
    for (const u of uploads) byPath.set(u.path, u);
  }
  return byPath;
}

function kitSummary(projectId: string, kit: any, fields: string[]) {
  return {
    projectId,
    name: kit?.name,
    colors: kit?.colors,
    fonts: kit?.fonts,
    assetCount: kit?.assets?.length ?? 0,
    fields,
  };
}

export function registerBrandKitTools(
  server: McpServer,
  client: MediamakeClient,
  options: ToolOptions = { localFiles: true },
) {
  server.registerTool(
    'get_brand_kit',
    {
      title: 'Get brand kit',
      description:
        "Read a project's brand kit: name, colours, fonts, brand guide, channel description, thumbnail profile and every uploaded asset (logo, animated logo, intros, outros, end screens, channel art, icons, fonts, sounds) with its URL. Projects are channels or brands; use this before making anything for one so it matches the brand. Needs community access or above.",
      inputSchema: {
        projectId: z.string(),
        assets: z
          .boolean()
          .default(true)
          .describe('false: leave out the asset list (fields only)'),
      },
      annotations: READ,
    },
    safe(async ({ projectId, assets }) => {
      const data = await client.get('/api/project/brand-kit', { projectId });
      if (!assets && data.brandKit) {
        const { assets: list, ...rest } = data.brandKit;
        return json({ ...data, brandKit: { ...rest, assetCount: list?.length ?? 0 } });
      }
      return json(data);
    }),
  );

  // The local server reads the kit folder itself; the hosted one can't see the
  // user's disk, so the client sends text files inline and PUTs the rest.
  if (options.localFiles) registerUploadBrandKit(server, client);
  else registerHostedUploadBrandKit(server, client);

  server.registerTool(
    'update_brand_kit',
    {
      title: 'Update brand kit',
      description:
        "Change a project's brand kit fields. Only fields you pass change (null clears one). colors accepts [{ name, hex, role }] or a { name: '#hex' } map; fonts [{ family, role, css }]. assets [{ path, url, kind? }] are added or replaced by path; removeAssets drops paths. Use upload_brand_kit to upload files from this computer.",
      inputSchema: {
        projectId: z.string(),
        name: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
        colors: z.any().optional(),
        fonts: z
          .array(z.object({ family: z.string(), role: z.string().optional(), css: z.string().optional(), url: z.string().optional() }))
          .optional(),
        guide: z.string().nullable().optional().describe('The brand guide, as markdown'),
        channelDescription: z.string().nullable().optional(),
        thumbnailProfile: z.record(z.string(), z.any()).nullable().optional(),
        assets: z
          .array(z.object({ path: z.string(), url: z.string(), kind: z.string().optional(), label: z.string().optional() }))
          .optional(),
        removeAssets: z.array(z.string()).optional(),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async body => json(await client.put('/api/project/brand-kit', body))),
  );
}

function registerUploadBrandKit(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'upload_brand_kit',
    {
      title: 'Upload brand kit',
      description:
        'Upload a brand kit folder from this computer to a project, the folder `pack-brand-kit` exports (apps/lyrics_videos/brands/<brand>/). brandguide.md, colors.json, brand.json (name, fonts), youtube/channel-description.md and brand/thumbnail.json fill the kit fields; every other file is uploaded as an asset, its kind taken from its folder (logo/, intros/, outros/, youtube/, fonts/, …). Skips hidden files, every graphics/ folder at any depth (the source) and, unless includeMasters, .mov ProRes masters. Files with the same path replace the stored ones.',
      inputSchema: {
        projectId: z.string(),
        folder: z.string().describe('Absolute path of the exported kit folder'),
        only: z
          .array(z.string())
          .optional()
          .describe('Only paths starting with one of these, e.g. ["logo/", "intros/"]'),
        includeMasters: z.boolean().default(false).describe('Also upload .mov ProRes masters (large)'),
        maxFileMb: z.number().min(1).max(2000).default(250),
        dryRun: z.boolean().default(false).describe('List what would be uploaded and saved, without uploading'),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ projectId, folder, only, includeMasters, maxFileMb, dryRun }) => {
      const files = (await walk(folder)).map(f => ({ ...f, readText: () => readFile(f.abs, 'utf8') }));
      const { patch, upload, skipped } = await planKit(files, { only, includeMasters, maxFileMb });

      const totalBytes = upload.reduce((s, f) => s + f.size, 0);
      if (dryRun) {
        return json({
          upload: upload.map(f => ({ path: f.path, bytes: f.size })),
          totalMb: +(totalBytes / 1024 / 1024).toFixed(1),
          fields: Object.keys(patch),
          skipped,
        });
      }

      const assets: Record<string, unknown>[] = [];
      const failed: { path: string; error: string }[] = [];
      const targets = await presignKitFiles(client, projectId, upload.map(f => f.path));
      await mapLimit(upload, 4, async f => {
        const target = targets.get(f.path);
        if (!target) return;
        try {
          const put = await fetch(target.uploadUrl, {
            method: 'PUT',
            // The URL is signed with ACL public-read, so the header must match.
            headers: { 'Content-Type': target.contentType, 'x-amz-acl': 'public-read' },
            body: await readFile(f.abs),
          });
          if (!put.ok) throw new Error(`storage answered ${put.status}`);
          assets.push({ path: f.path, kind: target.kind, url: target.url, mimeType: target.contentType, size: f.size });
        } catch (error) {
          failed.push({ path: f.path, error: String(error) });
        }
      });

      const saved = await client.put('/api/project/brand-kit', { projectId, ...patch, assets });
      return json({
        projectId,
        uploaded: assets.length,
        failed,
        skipped,
        brandKit: kitSummary(projectId, saved.brandKit, Object.keys(patch)),
      });
    }),
  );
}

/** Inline bytes have to fit one request to the hosted function (Vercel caps bodies at 4.5 MB). */
const INLINE_LIMIT_BYTES = 3 * 1024 * 1024;

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const hostedAsset = z.object({
  path: z.string(),
  url: z.string().url(),
  kind: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

/**
 * Brand kit upload for the hosted connector, in two steps because the server
 * can't read the user's files: upload_brand_kit takes the folder listing (text
 * files and small files inline), saves what it can and returns a presigned PUT
 * per remaining file; once the client has PUT them, finish_brand_kit_upload
 * checks they arrived and adds them to the kit.
 */
function registerHostedUploadBrandKit(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'upload_brand_kit',
    {
      title: 'Upload brand kit',
      description:
        'Upload a brand kit folder (the one `pack-brand-kit` exports, apps/lyrics_videos/brands/<brand>/) to a project. This server cannot read your files, so list them: every file\'s path relative to the kit folder and its size, with `text` for brandguide.md, colors.json, brand.json, youtube/channel-description.md and brand/thumbnail.json (they fill the kit fields), and optionally `base64` for small files (3 MB in all per call). Leave out hidden files and every graphics/ folder (the source, at any depth; skipped if sent). Files sent inline are uploaded and saved right away. For every other file the result has a presigned `uploadUrl` and a ready `curl` command (run it from the kit folder); PUT them all, then call finish_brand_kit_upload with the `finish` arguments from the result. Files with the same path replace the stored ones.',
      inputSchema: {
        projectId: z.string(),
        files: z
          .array(
            z.object({
              path: z.string().describe('Relative to the kit folder, e.g. logo/logo.svg'),
              size: z.number().int().min(0).describe('Bytes'),
              text: z.string().optional().describe('UTF-8 contents, for the text files that fill kit fields'),
              base64: z.string().optional().describe('Contents, for small files'),
            }),
          )
          .min(1)
          .max(2000),
        only: z
          .array(z.string())
          .optional()
          .describe('Only paths starting with one of these, e.g. ["logo/", "intros/"]'),
        includeMasters: z.boolean().default(false).describe('Also upload .mov ProRes masters (large)'),
        maxFileMb: z.number().min(1).max(2000).default(250),
        dryRun: z.boolean().default(false).describe('List what would be uploaded and saved, without uploading'),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ projectId, files, only, includeMasters, maxFileMb, dryRun }) => {
      const inlineBytes = files.reduce((sum, f) => sum + (f.base64 ? Math.floor((f.base64.length * 3) / 4) : 0), 0);
      if (inlineBytes > INLINE_LIMIT_BYTES)
        throw new Error(
          `Inline files add up to ${(inlineBytes / 1024 / 1024).toFixed(1)} MB; keep base64 under 3 MB per call and leave it off bigger files, which get an upload URL instead.`,
        );

      const entries = files.map(f => ({
        ...f,
        readText: async () => {
          if (f.text !== undefined) return f.text;
          if (f.base64 !== undefined) return Buffer.from(f.base64, 'base64').toString('utf8');
          throw new Error('pass its contents as text');
        },
      }));
      const { patch, upload, skipped } = await planKit(entries, { only, includeMasters, maxFileMb });
      const inline = upload.filter(f => f.base64 !== undefined || f.text !== undefined);
      const remote = upload.filter(f => f.base64 === undefined && f.text === undefined);

      if (dryRun) {
        return json({
          uploadInline: inline.map(f => ({ path: f.path, bytes: f.size })),
          uploadByUrl: remote.map(f => ({ path: f.path, bytes: f.size })),
          totalMb: +(upload.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1),
          fields: Object.keys(patch),
          skipped,
        });
      }

      const targets = upload.length ? await presignKitFiles(client, projectId, upload.map(f => f.path)) : new Map();
      const assets: Record<string, unknown>[] = [];
      const failed: { path: string; error: string }[] = [];
      await mapLimit(inline, 4, async f => {
        const target = targets.get(f.path);
        if (!target) return;
        try {
          const body = f.base64 !== undefined ? Buffer.from(f.base64, 'base64') : Buffer.from(f.text!, 'utf8');
          const put = await fetch(target.uploadUrl, {
            method: 'PUT',
            // The URL is signed with ACL public-read, so the header must match.
            headers: { 'Content-Type': target.contentType, 'x-amz-acl': 'public-read' },
            body,
          });
          if (!put.ok) throw new Error(`storage answered ${put.status}`);
          assets.push({ path: f.path, kind: target.kind, url: target.url, mimeType: target.contentType, size: body.byteLength });
        } catch (error) {
          failed.push({ path: f.path, error: String(error) });
        }
      });

      const saved =
        assets.length || Object.keys(patch).length
          ? await client.put('/api/project/brand-kit', { projectId, ...patch, assets })
          : await client.get('/api/project/brand-kit', { projectId });

      const pending = remote.flatMap(f => {
        const target = targets.get(f.path);
        if (!target) return [];
        return [
          {
            path: f.path,
            bytes: f.size,
            contentType: target.contentType,
            uploadUrl: target.uploadUrl,
            curl: `curl -fsS -X PUT -H ${shellQuote(`Content-Type: ${target.contentType}`)} -H 'x-amz-acl: public-read' --data-binary @${shellQuote(f.path)} ${shellQuote(target.uploadUrl)}`,
          },
        ];
      });

      return json({
        projectId,
        uploaded: assets.length,
        failed,
        skipped,
        brandKit: kitSummary(projectId, saved.brandKit, Object.keys(patch)),
        ...(pending.length
          ? {
              next: `PUT these ${pending.length} files (headers Content-Type as given and x-amz-acl: public-read; the curl commands do it, run from the kit folder). The upload URLs expire, so do it now. Then call finish_brand_kit_upload with \`finish\`.`,
              pending,
              finish: {
                projectId,
                assets: pending.map(p => {
                  const target = targets.get(p.path)!;
                  return { path: p.path, url: target.url, kind: target.kind, mimeType: target.contentType, size: p.bytes };
                }),
              },
            }
          : {}),
      });
    }),
  );

  server.registerTool(
    'finish_brand_kit_upload',
    {
      title: 'Finish brand kit upload',
      description:
        'Second step of upload_brand_kit on the hosted connector: after PUTting the pending files, pass the `finish` arguments it returned. Checks each file arrived and adds the ones that did to the brand kit; missing ones are listed so you can retry them.',
      inputSchema: {
        projectId: z.string(),
        assets: z.array(hostedAsset).min(1).max(2000),
      },
      annotations: { ...WRITE, idempotentHint: true },
    },
    safe(async ({ projectId, assets }) => {
      const arrived: typeof assets = [];
      const missing: { path: string; reason: string }[] = [];
      await mapLimit(assets, 8, async asset => {
        if (new URL(asset.url).protocol !== 'https:') {
          missing.push({ path: asset.path, reason: 'not an https URL' });
          return;
        }
        try {
          const head = await fetch(asset.url, { method: 'HEAD' });
          if (!head.ok) throw new Error(`storage answered ${head.status}`);
          const size = Number(head.headers.get('content-length'));
          arrived.push({ ...asset, ...(size > 0 ? { size } : {}) });
        } catch (error) {
          missing.push({ path: asset.path, reason: String((error as Error).message ?? error) });
        }
      });
      const saved = arrived.length
        ? await client.put('/api/project/brand-kit', { projectId, assets: arrived })
        : await client.get('/api/project/brand-kit', { projectId });
      return json({
        projectId,
        added: arrived.length,
        missing,
        brandKit: kitSummary(projectId, saved.brandKit, []),
      });
    }),
  );
}
