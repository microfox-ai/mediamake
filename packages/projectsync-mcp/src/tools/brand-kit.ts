import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MediamakeClient } from '../../../mediamake-mcp/src/client.js';
import { json, mimeFromName, safe } from '../../../mediamake-mcp/src/util.js';

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
const KIT_IMAGE = /\.(png|jpe?g|webp|gif|avif|svg|ico)$/i;

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
 * assets; everything else (code, html, css, other json) is skipped.
 */
async function planKit<F extends KitFile>(
  files: F[],
  { only, includeMasters, maxFileMb }: { only?: string[]; includeMasters: boolean; maxFileMb: number },
): Promise<KitPlan<F>> {
  const patch: Record<string, unknown> = {};
  const upload: F[] = [];
  const skipped: { path: string; reason: string }[] = [];
  const fontFiles: string[] = [];
  let logo: string | undefined;
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
            if (typeof parsed.logo === 'string' && parsed.logo.trim()) logo = parsed.logo.trim().replace(/^\.?\//, '');
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
  if (logo) {
    // brand.json's main logo goes up only with its image (the server refuses a logo that isn't in the kit)
    if (upload.some(f => f.path === logo && KIT_IMAGE.test(logo!))) patch.logo = logo;
    else skipped.push({ path: logo, reason: "brand.json's logo, but not an image in this upload" });
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
    logo: kit?.logo,
    colors: kit?.colors,
    fonts: kit?.fonts,
    assetCount: kit?.assets?.length ?? 0,
    fields,
  };
}

/**
 * The brand kit tools (they moved here from the MediaMake MCP): get_brand_kit, upload_brand_kit (reads
 * a pack-brand-kit folder on this computer), update_brand_kit and finish_brand_kit_upload.
 */
export function registerBrandKitTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'get_brand_kit',
    {
      title: 'Get brand kit',
      description:
        "Read a project's brand kit: name, main logo (`logo`, the path of the image that stands for the brand), colours, fonts, brand guide, channel description, thumbnail profile and every uploaded asset (logo, animated logo, intros, outros, end screens, channel art, icons, fonts, sounds) with its URL. Projects are channels or brands; use this before making anything for one so it matches the brand. Needs community access or above.",
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

  registerUploadBrandKit(server, client);
  registerFinishBrandKitUpload(server, client);

  server.registerTool(
    'update_brand_kit',
    {
      title: 'Update brand kit',
      description:
        "Change a project's brand kit fields. Only fields you pass change (null clears one). logo sets the main logo, the picture shown for the brand on its project: the path (or URL) of an image already in the kit. colors accepts [{ name, hex, role }] or a { name: '#hex' } map; fonts [{ family, role, css }]. assets [{ path, url, kind? }] are added or replaced by path; removeAssets drops paths. Use upload_brand_kit to upload files from this computer.",
      inputSchema: {
        projectId: z.string(),
        name: z.string().nullable().optional(),
        logo: z
          .string()
          .nullable()
          .optional()
          .describe('The main logo: path (e.g. logo/<brand>-logo.svg) or URL of an image in the kit; null goes back to the automatic pick'),
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
        'Upload a brand kit folder from this computer to a project, the folder `pack-brand-kit` exports (brands/<brand>/ in the MediaMake workspace, ~/MediaMake/brands/<brand>/). brandguide.md, colors.json, brand.json (name, fonts, logo: the main logo\'s path), youtube/channel-description.md and brand/thumbnail.json fill the kit fields; every other file is uploaded as an asset, its kind taken from its folder (logo/, intros/, outros/, youtube/, fonts/, …). Skips hidden files, every graphics/ folder at any depth (the source) and, unless includeMasters, .mov ProRes masters. Files with the same path replace the stored ones.',
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

      // a main logo whose file didn't arrive would get the whole save refused
      if (patch.logo && !assets.some(a => a.path === patch.logo)) delete patch.logo;
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

/** A kit file already PUT to its upload link. */
const uploadedAsset = z.object({
  path: z.string(),
  url: z.string().url(),
  kind: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

/**
 * finish_brand_kit_upload: adds files already PUT to a kit's upload links to the kit, after checking
 * they arrived (an upload that stopped part way).
 */
function registerFinishBrandKitUpload(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'finish_brand_kit_upload',
    {
      title: 'Finish brand kit upload',
      description:
        'Finish a brand kit upload whose files were already PUT to their upload links (one that stopped part way): pass each file\'s path and the url it was uploaded to. Checks each file arrived and adds the ones that did to the brand kit; missing ones are listed so you can retry them.',
      inputSchema: {
        projectId: z.string(),
        assets: z.array(uploadedAsset).min(1).max(2000),
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
