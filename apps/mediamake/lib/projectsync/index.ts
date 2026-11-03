/**
 * ProjectSync: what a project keeps in the cloud besides its brand kit, for the ProjectSync MCP
 * (packages/projectsync-mcp) and anyone the project is shared with.
 *
 * - Productions: a video's code files and outputs (renders), and its inputs only while they come to
 *   200 MB or less in all. Stored privately; signed links to read them.
 * - Releases: a whole release kit (a YouTube upload pack, a DistroKid release, ...), stored privately.
 * - Media: single files (pictures, songs, clips, usually inputs) in the media library (`mediaFiles`
 *   with the project's id), public like the rest of the library so renders can use them, and never
 *   analysed on the way in.
 *
 * Productions and releases are "bundles": a record per slug with versions, each version a list of
 * files. A new version uploads only the files whose sha256 the bundle doesn't have yet; earlier
 * versions are kept. Everything is tied to one project and its role decides (see ./access): anyone it
 * is shared with reads, owners and editors write, only the owner deletes. Deleting moves a record to
 * the project's trash (`deletedAt`); its files are kept.
 */
import type { ObjectId } from 'mongodb';

export const BUNDLE_KINDS = ['production', 'release'] as const;
export type BundleKind = (typeof BUNDLE_KINDS)[number];

export const BUNDLE_COLLECTION: Record<BundleKind, string> = {
  production: 'projectProductions',
  release: 'projectReleases',
};

/** What a file is to its production; a release's files are all `file`. */
export const FILE_ROLES = ['code', 'output', 'input', 'file'] as const;
export type FileRole = (typeof FILE_ROLES)[number];

export const RELEASE_PLATFORMS = ['youtube', 'distrokid', 'other'] as const;
export type ReleasePlatform = (typeof RELEASE_PLATFORMS)[number];

export const MB = 1_000_000;
/** A production carries its inputs only while they come to this much in all. */
export const INPUT_LIMIT_BYTES = 200 * MB;
/** One presigned PUT; larger files would need a multipart upload. */
export const MAX_FILE_BYTES = 5_000 * MB;
/** Per request, to stay under the hosted function's body size. */
export const MAX_FILES_PER_VERSION = 2000;
/** How long upload and download links last. */
export const LINK_TTL_SECONDS = 60 * 60;

export interface BundleFile {
  /** Relative to the bundle, with forward slashes. */
  path: string;
  role: FileRole;
  size: number;
  sha256: string;
  contentType: string;
  /** Private storage key; files with the same sha256 in one bundle share it. */
  key: string;
}

export interface BundleVersion {
  version: number;
  status: 'uploading' | 'ready';
  files: BundleFile[];
  note?: string;
  createdAt: string;
  createdBy: string;
  readyAt?: string;
}

export interface ReleaseMeta {
  platform: ReleasePlatform;
  /** The production it releases, when there is one. */
  productionId?: string;
}

export interface BundleDoc {
  _id?: ObjectId;
  projectId: string;
  kind: BundleKind;
  slug: string;
  title: string;
  notes?: string;
  release?: ReleaseMeta;
  versions: BundleVersion[];
  /** The newest version whose files all arrived; 0 until the first one does. */
  latestVersion: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

/** A file as the uploader lists it. */
export interface FileListing {
  path: string;
  role?: FileRole;
  size: number;
  sha256: string;
  contentType?: string;
}

/** `a/b.ts` from `./a\\b.ts`; null for anything that climbs out or names nothing. */
export function cleanPath(path: string): string | null {
  const parts = path.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
  if (!parts.length || parts.some(p => p === '..')) return null;
  return parts.join('/');
}

export const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** A listed file once checked: path cleaned, role settled. */
export type ListedFile = Omit<FileListing, 'role'> & { role: FileRole };

/** Checks a file list for one version; returns the cleaned files or what is wrong. */
export function checkListing(kind: BundleKind, files: unknown): { ok: true; files: ListedFile[] } | { ok: false; error: string } {
  if (!Array.isArray(files) || !files.length) return { ok: false, error: 'files is required: [{ path, size, sha256, role? }]' };
  if (files.length > MAX_FILES_PER_VERSION) return { ok: false, error: `At most ${MAX_FILES_PER_VERSION} files per version` };
  const seen = new Set<string>();
  const out: ListedFile[] = [];
  for (const raw of files as FileListing[]) {
    const path = cleanPath(String(raw?.path ?? ''));
    if (!path) return { ok: false, error: `Not a relative file path: ${raw?.path}` };
    if (seen.has(path)) return { ok: false, error: `Listed twice: ${path}` };
    seen.add(path);
    const size = Number(raw.size);
    if (!(size >= 0) || size > MAX_FILE_BYTES) return { ok: false, error: `${path}: size must be 0 to ${MAX_FILE_BYTES / MB} MB` };
    if (!/^[a-f0-9]{64}$/.test(String(raw.sha256 ?? ''))) return { ok: false, error: `${path}: sha256 must be a hex digest` };
    const role: FileRole = kind === 'release' ? 'file' : raw.role ?? 'code';
    if (!FILE_ROLES.includes(role) || (kind === 'production' && role === 'file')) {
      return { ok: false, error: `${path}: role must be code, output or input` };
    }
    out.push({ path, role, size, sha256: raw.sha256, ...(raw.contentType ? { contentType: String(raw.contentType) } : {}) });
  }
  if (kind === 'production') {
    const inputs = out.filter(f => f.role === 'input').reduce((sum, f) => sum + f.size, 0);
    if (inputs > INPUT_LIMIT_BYTES) {
      return { ok: false, error: `Inputs come to ${Math.round(inputs / MB)} MB: a production carries its inputs only up to ${INPUT_LIMIT_BYTES / MB} MB in all. Leave them out, or upload them as media.` };
    }
  }
  return { ok: true, files: out };
}

/** Content types by extension, for files listed without one. */
const MIME: Record<string, string> = {
  ts: 'text/plain', tsx: 'text/plain', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  md: 'text/markdown', txt: 'text/plain', py: 'text/x-python', css: 'text/css', html: 'text/html', csv: 'text/csv',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/mp4',
  wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', flac: 'audio/flac', ogg: 'audio/ogg', aac: 'audio/aac',
  srt: 'text/plain', vtt: 'text/vtt', zip: 'application/zip', pdf: 'application/pdf',
};

export function mimeOf(path: string): string {
  return MIME[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
}

/** The media library's contentType for a MIME type. */
export function mediaKindOf(mime: string): 'image' | 'video' | 'audio' | 'document' | 'unknown' {
  const top = mime.split('/')[0];
  if (top === 'image' || top === 'video' || top === 'audio') return top;
  if (mime.startsWith('text/') || mime === 'application/pdf' || mime === 'application/json') return 'document';
  return 'unknown';
}

/** A record as the API answers: string id, no storage keys. */
export function toResponse(doc: BundleDoc, options: { version?: number; full?: boolean } = {}) {
  const pick = options.version ?? doc.latestVersion;
  const current = doc.versions.find(v => v.version === pick);
  const files = current?.files ?? [];
  return {
    id: doc._id?.toString(),
    projectId: doc.projectId,
    kind: doc.kind,
    slug: doc.slug,
    title: doc.title,
    ...(doc.notes ? { notes: doc.notes } : {}),
    ...(doc.release ? { release: doc.release } : {}),
    latestVersion: doc.latestVersion,
    version: current?.version ?? null,
    status: current?.status ?? 'uploading',
    fileCount: files.length,
    bytes: files.reduce((sum, f) => sum + f.size, 0),
    createdAt: doc.createdAt,
    createdBy: doc.createdBy,
    updatedAt: doc.updatedAt,
    ...(options.full
      ? {
          files: files.map(({ key: _key, ...f }) => f),
          versions: doc.versions.map(v => ({
            version: v.version,
            status: v.status,
            note: v.note,
            fileCount: v.files.length,
            bytes: v.files.reduce((sum, f) => sum + f.size, 0),
            createdAt: v.createdAt,
            createdBy: v.createdBy,
          })),
        }
      : {}),
  };
}
