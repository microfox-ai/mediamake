/**
 * A project's brand kit: what a channel or brand looks and sounds like, kept on
 * the cloud project so every production under it (and anyone it is shared
 * with) uses the same logo, colours, fonts, intros and end screens.
 *
 * The shape follows what the `pack-brand-kit` skill exports into
 * `brands/<brand>/` (logo/, intros/, outros/, youtube/, guide/, fonts/,
 * colors.*, brandguide.md, brand/thumbnail.json), so uploading that folder is
 * one step. Everything here is pure, for the API routes and the upload UI.
 */

export const BRAND_KIT_SCHEMA = 'mediamake.brand-kit/v1';

export const ASSET_KINDS = [
  'logo',
  'logo-animated',
  'intro',
  'outro',
  'end-screen',
  'channel',
  'favicon',
  'font',
  'guide',
  'sound',
  'other',
] as const;
export type BrandAssetKind = (typeof ASSET_KINDS)[number];

export interface BrandColor {
  name: string;
  hex: string;
  /** e.g. primary, background, accent, text. */
  role?: string;
}

export interface BrandFont {
  family: string;
  /** e.g. display, body, wordmark. */
  role?: string;
  /** Google Fonts css2 family spec, when the font comes from there. */
  css?: string;
  /** An uploaded font file. */
  url?: string;
}

export interface BrandAsset {
  /** Path inside the kit, e.g. `intros/intro-6.mp4`. Unique within a kit. */
  path: string;
  kind: BrandAssetKind;
  url: string;
  mimeType?: string;
  size?: number;
  label?: string;
}

export interface BrandKit {
  schema: typeof BRAND_KIT_SCHEMA;
  name?: string;
  summary?: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  assets: BrandAsset[];
  /** brandguide.md, as markdown. */
  guide?: string;
  /** youtube/channel-description.md. */
  channelDescription?: string;
  /** brand/thumbnail.json: how thumbnails for this brand are made. */
  thumbnailProfile?: Record<string, unknown>;
  updatedAt: string;
  updatedBy?: string;
}

/** What a project list shows about its kit. */
export interface BrandKitSummary {
  name?: string;
  logo?: string;
  colors: string[];
  assetCount: number;
  updatedAt: string;
}

export function emptyBrandKit(): BrandKit {
  return { schema: BRAND_KIT_SCHEMA, colors: [], fonts: [], assets: [], updatedAt: new Date().toISOString() };
}

const ext = (path: string) => path.toLowerCase().split('.').pop() ?? '';
const VIDEO = new Set(['mp4', 'webm', 'mov', 'm4v']);
const IMAGE = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg', 'ico']);
const AUDIO = new Set(['wav', 'mp3', 'm4a', 'aac', 'ogg', 'flac']);
const FONT = new Set(['ttf', 'otf', 'woff', 'woff2']);

/** Normalises a kit path: forward slashes, no leading `./` or `/`, no `..`. */
export function cleanPath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/');
}

/** The kind of a kit file, from where `pack-brand-kit` puts it. */
export function assetKindOf(path: string): BrandAssetKind {
  const p = cleanPath(path).toLowerCase();
  const e = ext(p);
  const top = p.split('/')[0];
  if (FONT.has(e) || top === 'fonts') return 'font';
  if (AUDIO.has(e) || top === 'sfx' || top === 'sound') return 'sound';
  if (/favicon|apple-touch-icon|^icon-\d+|\/icon-/.test(p) || e === 'ico' || e === 'webmanifest') return 'favicon';
  if (/end[-_ ]?(screen|card)/.test(p)) return 'end-screen';
  if (top === 'intros' || /(^|\/)intro/.test(p)) return 'intro';
  if (top === 'outros' || /(^|\/)outro/.test(p)) return 'outro';
  if (top === 'youtube' || /banner|watermark|profile|avatar/.test(p)) return 'channel';
  if (top === 'guide' || e === 'md' || e === 'pdf') return 'guide';
  if (top === 'logo' || /logo|wordmark|lockup/.test(p)) return VIDEO.has(e) ? 'logo-animated' : 'logo';
  return 'other';
}

export function mimeOf(path: string): string {
  const e = ext(path);
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
    md: 'text/markdown',
    json: 'application/json',
    html: 'text/html',
    webmanifest: 'application/manifest+json',
    pdf: 'application/pdf',
    css: 'text/css',
  };
  return map[e] ?? 'application/octet-stream';
}

export const isImage = (path: string) => IMAGE.has(ext(path));
export const isVideo = (path: string) => VIDEO.has(ext(path));
/**
 * What a kit uploads as assets: images (svg included), video, audio and the
 * brand's font files. Code and other files (js, tsx, html, css, json, …) are
 * never uploaded; the few text files in textRoleOf only fill kit fields.
 */
export const isKitAsset = (path: string) => {
  const e = ext(path);
  return IMAGE.has(e) || VIDEO.has(e) || AUDIO.has(e) || FONT.has(e);
};

/**
 * Folders of an exported kit that are never read: hidden ones, the brand's
 * source (`graphics/`, which can hold thousands of reference frames) and
 * dependencies. The app's folder picker doesn't even open them.
 */
export function skippedFolder(name: string): string | null {
  if (name.startsWith('.')) return 'hidden';
  if (name === 'graphics') return 'source';
  if (name === 'node_modules') return 'dependency';
  return null;
}

/**
 * True for anything under a `graphics/` folder at any depth (the brand's
 * source). Never uploaded and never read for kit fields: the exported kit at
 * the brand root has its own brandguide.md, colors.json and so on.
 */
export const inGraphicsFolder = (path: string) => cleanPath(path).split('/').slice(0, -1).includes('graphics');

/** The first skippedFolder a path sits in (e.g. `graphics/`), with its reason. */
export function skippedFolderOf(path: string): { dir: string; reason: string } | null {
  const parts = cleanPath(path).split('/').slice(0, -1);
  for (let i = 0; i < parts.length; i++) {
    const reason = skippedFolder(parts[i]);
    if (reason) return { dir: `${parts.slice(0, i + 1).join('/')}/`, reason };
  }
  return null;
}

/**
 * Files in an exported kit that are not uploaded by default: anything in a
 * skippedFolder, hidden files, and ProRes masters (`.mov`), which are large
 * and have a `.webm` with alpha next to them.
 */
export function skippedByDefault(path: string): string | null {
  const p = cleanPath(path);
  const folder = skippedFolderOf(p);
  if (folder) return folder.reason;
  if (p.split('/').some(part => part.startsWith('.'))) return 'hidden';
  if (ext(p) === 'mov') return 'ProRes master (the .webm keeps the alpha)';
  return null;
}

/** The text files a kit's fields are read from, by role. */
export function textRoleOf(path: string): 'guide' | 'channelDescription' | 'thumbnailProfile' | 'colors' | 'manifest' | null {
  const p = cleanPath(path).toLowerCase();
  const name = p.split('/').pop() ?? '';
  if (name === 'brandguide.md') return 'guide';
  if (name === 'channel-description.md') return 'channelDescription';
  if (name === 'thumbnail.json') return 'thumbnailProfile';
  if (/^colou?rs\.json$/.test(name)) return 'colors';
  if (name === 'brand.json') return 'manifest';
  return null;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const toHex = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(HEX);
  return m ? `#${m[1].toLowerCase()}` : null;
};

/**
 * Colours from whatever a kit has: an array of `{ name, hex|value|color, role }`,
 * a `{ name: '#hex' }` map, or the same nested one level (`{ brand: { gold: '#…' } }`).
 */
export function normalizeColors(input: unknown): BrandColor[] {
  const out: BrandColor[] = [];
  const push = (name: string, value: unknown, role?: string) => {
    const hex = toHex(value);
    if (hex && !out.some(c => c.name === name)) out.push({ name, hex, ...(role ? { role } : {}) });
  };
  const walk = (v: unknown, prefix = '', depth = 0) => {
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') push(`${prefix}${i + 1}`, item);
        else if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          const name = String(o.name ?? o.label ?? o.id ?? `${prefix}${i + 1}`);
          push(name, o.hex ?? o.value ?? o.color ?? o.colour, typeof o.role === 'string' ? o.role : undefined);
        }
      });
    } else if (v && typeof v === 'object' && depth < 2) {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === 'string') push(prefix ? `${prefix}-${k}` : k, val);
        else if (val && typeof val === 'object' && 'hex' in (val as object)) {
          const o = val as Record<string, unknown>;
          push(k, o.hex, typeof o.role === 'string' ? o.role : undefined);
        } else walk(val, prefix ? `${prefix}-${k}` : k, depth + 1);
      }
    }
  };
  walk(input && typeof input === 'object' && 'colors' in (input as object) ? (input as { colors: unknown }).colors : input);
  return out.slice(0, 64);
}

export function normalizeFonts(input: unknown): BrandFont[] {
  if (!Array.isArray(input)) return [];
  const out: BrandFont[] = [];
  for (const item of input) {
    const o = typeof item === 'string' ? { family: item } : (item as Record<string, unknown>);
    const family = typeof o?.family === 'string' ? o.family.trim() : '';
    if (!family || out.some(f => f.family === family)) continue;
    out.push({
      family,
      ...(typeof o.role === 'string' && o.role ? { role: o.role } : {}),
      ...(typeof o.css === 'string' && o.css ? { css: o.css } : {}),
      ...(typeof o.url === 'string' && o.url ? { url: o.url } : {}),
    });
  }
  return out.slice(0, 32);
}

export function normalizeAssets(input: unknown): BrandAsset[] {
  if (!Array.isArray(input)) return [];
  const out = new Map<string, BrandAsset>();
  for (const item of input) {
    const o = item as Record<string, unknown>;
    const path = typeof o?.path === 'string' ? cleanPath(o.path) : '';
    const url = typeof o?.url === 'string' ? o.url : '';
    if (!path || !/^https?:\/\//.test(url)) continue;
    const kind = ASSET_KINDS.includes(o.kind as BrandAssetKind) ? (o.kind as BrandAssetKind) : assetKindOf(path);
    out.set(path, {
      path,
      kind,
      url,
      mimeType: typeof o.mimeType === 'string' ? o.mimeType : mimeOf(path),
      ...(typeof o.size === 'number' ? { size: o.size } : {}),
      ...(typeof o.label === 'string' && o.label ? { label: o.label } : {}),
    });
  }
  return [...out.values()];
}

/** The picture that stands for the kit: a still logo first, then a favicon or channel image. */
export function primaryLogo(kit: Pick<BrandKit, 'assets'>): string | undefined {
  const images = kit.assets.filter(a => isImage(a.path));
  const rank = (a: BrandAsset) =>
    (a.kind === 'logo' ? 0 : a.kind === 'favicon' ? 2 : a.kind === 'channel' ? 3 : 4) +
    (a.path.endsWith('.svg') ? 0 : 0.5) +
    (/profile|avatar|icon-512/.test(a.path) ? -0.2 : 0);
  return images.sort((a, b) => rank(a) - rank(b))[0]?.url;
}

export function summarizeBrandKit(kit: BrandKit | undefined | null): BrandKitSummary | undefined {
  if (!kit) return undefined;
  return {
    name: kit.name,
    logo: primaryLogo(kit),
    colors: kit.colors.slice(0, 6).map(c => c.hex),
    assetCount: kit.assets.length,
    updatedAt: kit.updatedAt,
  };
}

export interface BrandKitPatch {
  name?: string | null;
  summary?: string | null;
  colors?: unknown;
  fonts?: unknown;
  /** Added or replaced by path. */
  assets?: unknown;
  /** Paths to remove. */
  removeAssets?: string[];
  /** true: `assets` replaces the whole list instead of merging. */
  replaceAssets?: boolean;
  guide?: string | null;
  channelDescription?: string | null;
  thumbnailProfile?: Record<string, unknown> | null;
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);

/**
 * Applies a patch: fields that are passed replace the stored ones (null
 * clears), assets merge by path unless `replaceAssets`.
 */
export function applyBrandKitPatch(current: BrandKit | undefined | null, patch: BrandKitPatch, clientId?: string): BrandKit {
  const kit: BrandKit = { ...emptyBrandKit(), ...(current ?? {}) };
  const set = <K extends 'name' | 'summary' | 'guide' | 'channelDescription'>(key: K, max: number) => {
    if (patch[key] === undefined) return;
    const v = text(patch[key], max);
    if (v === undefined) delete kit[key];
    else kit[key] = v;
  };
  set('name', 120);
  set('summary', 600);
  set('guide', 100_000);
  set('channelDescription', 10_000);
  if (patch.thumbnailProfile !== undefined) {
    if (patch.thumbnailProfile && typeof patch.thumbnailProfile === 'object') kit.thumbnailProfile = patch.thumbnailProfile;
    else delete kit.thumbnailProfile;
  }
  if (patch.colors !== undefined) kit.colors = normalizeColors(patch.colors);
  if (patch.fonts !== undefined) kit.fonts = normalizeFonts(patch.fonts);

  let assets = patch.replaceAssets ? [] : [...kit.assets];
  if (patch.assets !== undefined) {
    const incoming = normalizeAssets(patch.assets);
    const paths = new Set(incoming.map(a => a.path));
    assets = [...assets.filter(a => !paths.has(a.path)), ...incoming];
  }
  if (patch.removeAssets?.length) {
    const drop = new Set(patch.removeAssets.map(cleanPath));
    assets = assets.filter(a => !drop.has(a.path));
  }
  kit.assets = assets.slice(0, 1000).sort((a, b) => a.path.localeCompare(b.path));

  kit.schema = BRAND_KIT_SCHEMA;
  kit.updatedAt = new Date().toISOString();
  if (clientId) kit.updatedBy = clientId;
  return kit;
}

/** `fonts/Tamara-BoldItalic.woff2` → `Tamara`. */
export function fontFamilyFromFile(path: string): string {
  const name = (cleanPath(path).split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  return name
    .replace(/[-_ ]?(thin|extralight|light|regular|book|medium|semibold|bold|extrabold|black|heavy|italic|variable|vf|\[.*\])+$/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

export interface KitFile {
  /** Path relative to the kit folder. */
  path: string;
  size: number;
  readText: () => Promise<string>;
}

export interface KitPlan {
  upload: KitFile[];
  skipped: { path: string; reason: string }[];
  patch: BrandKitPatch;
}

/**
 * Reads an exported kit folder (the output of `pack-brand-kit`) into what to
 * upload and the fields to save. Text files fill fields; only images, video,
 * audio and fonts are uploaded (isKitAsset). `maxBytes` skips anything larger.
 */
export async function planKitUpload(files: KitFile[], options: { includeMasters?: boolean; maxBytes?: number } = {}): Promise<KitPlan> {
  const maxBytes = options.maxBytes ?? 250 * 1024 * 1024;
  const plan: KitPlan = { upload: [], skipped: [], patch: {} };
  const fontFiles: string[] = [];
  let manifest: Record<string, unknown> | null = null;
  // A skipped folder (graphics/ can hold thousands of frames) is one skipped line with its file count.
  const folders = new Map<string, { reason: string; count: number }>();
  for (const f of files) {
    const path = cleanPath(f.path);
    const folder = skippedFolderOf(path);
    if (folder) {
      const seen = folders.get(folder.dir);
      if (seen) seen.count++;
      else folders.set(folder.dir, { reason: folder.reason, count: 1 });
      continue;
    }
    const reason = skippedByDefault(path);
    if (reason && !(options.includeMasters && reason.startsWith('ProRes'))) {
      plan.skipped.push({ path, reason });
      continue;
    }
    const role = textRoleOf(path);
    if (role) {
      try {
        const body = await f.readText();
        if (role === 'guide') plan.patch.guide = body;
        else if (role === 'channelDescription') plan.patch.channelDescription = body;
        else {
          const parsed = JSON.parse(body);
          if (role === 'thumbnailProfile') plan.patch.thumbnailProfile = parsed;
          else if (role === 'colors') plan.patch.colors = parsed;
          else manifest = parsed;
        }
      } catch {
        plan.skipped.push({ path, reason: 'could not be read' });
      }
      continue;
    }
    if (!isKitAsset(path)) {
      plan.skipped.push({ path, reason: 'not an image, video, audio or font file' });
      continue;
    }
    if (f.size > maxBytes) {
      plan.skipped.push({ path, reason: `larger than ${Math.round(maxBytes / 1024 / 1024)} MB` });
      continue;
    }
    if (assetKindOf(path) === 'font') fontFiles.push(path);
    plan.upload.push({ ...f, path });
  }
  for (const [dir, { reason, count }] of folders) {
    plan.skipped.unshift({ path: dir, reason: `${reason}, ${count} file${count === 1 ? '' : 's'}` });
  }
  if (manifest) {
    if (typeof manifest.name === 'string') plan.patch.name = manifest.name;
    if (Array.isArray(manifest.fonts)) plan.patch.fonts = manifest.fonts;
  }
  if (!plan.patch.fonts && fontFiles.length) {
    plan.patch.fonts = [...new Set(fontFiles.map(fontFamilyFromFile).filter(Boolean))].map(family => ({ family }));
  }
  return plan;
}
