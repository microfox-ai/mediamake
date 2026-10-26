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

  // Reads a folder on disk, so only the local server has it. Hosted users
  // upload kits on the Projects page, or attach hosted files with update_brand_kit.
  if (options.localFiles) registerUploadBrandKit(server, client);

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
        'Upload a brand kit folder from this computer to a project, the folder `pack-brand-kit` exports (apps/lyrics_videos/brands/<brand>/). brandguide.md, colors.json, brand.json (name, fonts), youtube/channel-description.md and brand/thumbnail.json fill the kit fields; every other file is uploaded as an asset, its kind taken from its folder (logo/, intros/, outros/, youtube/, fonts/, …). Skips hidden files, graphics/ (the source) and, unless includeMasters, .mov ProRes masters. Files with the same path replace the stored ones.',
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
      const files = await walk(folder);
      const patch: Record<string, unknown> = {};
      const upload: typeof files = [];
      const skipped: { path: string; reason: string }[] = [];
      const fontFiles: string[] = [];
      for (const f of files) {
        if (only && !only.some(prefix => f.path.startsWith(prefix))) continue;
        const name = f.path.split('/').pop()!.toLowerCase();
        const role = TEXT_FIELDS[name];
        if (role) {
          const body = await readFile(f.abs, 'utf8');
          try {
            if (role === 'guide') patch.guide = body;
            else if (role === 'channelDescription') patch.channelDescription = body;
            else {
              const parsed = JSON.parse(body);
              if (role === 'manifest') {
                if (typeof parsed.name === 'string') patch.name = parsed.name;
                if (Array.isArray(parsed.fonts)) patch.fonts = parsed.fonts;
              } else patch[role] = parsed;
            }
          } catch {
            skipped.push({ path: f.path, reason: 'not valid JSON' });
          }
          if (role === 'guide' || role === 'manifest') continue;
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
      for (let i = 0; i < upload.length; i += 100) {
        const batch = upload.slice(i, i + 100);
        const { uploads } = await client.post('/api/project/brand-kit/upload', {
          projectId,
          files: batch.map(f => ({ path: f.path, contentType: mimeOf(f.path) })),
        });
        const byPath = new Map<string, any>(uploads.map((u: any) => [u.path, u]));
        await mapLimit(batch, 4, async f => {
          const target = byPath.get(f.path);
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
      }

      const saved = await client.put('/api/project/brand-kit', { projectId, ...patch, assets });
      const kit = saved.brandKit;
      return json({
        projectId,
        uploaded: assets.length,
        failed,
        skipped,
        brandKit: {
          name: kit?.name,
          colors: kit?.colors,
          fonts: kit?.fonts,
          assetCount: kit?.assets?.length ?? 0,
          fields: Object.keys(patch),
        },
      });
    }),
  );
}
