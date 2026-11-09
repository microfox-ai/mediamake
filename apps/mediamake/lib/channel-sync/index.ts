/**
 * Channel team sync: what a channel's team shares through its MediaMake cloud project, so everyone
 * working on one channel has the same brand kit (lib/brand-kit), skill variants, productions and
 * footage. The media CLI pushes and pulls (`media sync`, apps/studio/scripts/library/sync.ts);
 * the routes under /api/channel-sync keep it. Everything here is pure, for those routes and for the
 * CLI, whose tests run these same checks against a stand-in server.
 *
 * - Items (`channelSyncItems`), one per project, `what` and key: a production's mediamake.json by
 *   slug, a skill variant's text files by name, a library item's details by sha256. A production or
 *   skill push names the hash it last saw (`baseHash`), so nobody replaces a teammate's change
 *   without having pulled it; media details merge (tags, sources and notes add up).
 * - Files (`mediaFiles` with the project's id, contentSource "library-sync" and metadata.sha256): the
 *   library files the user agreed to share, uploaded with a presigned URL, under the project's limit
 *   (100 MB in all by default; the owner can change it).
 */

export const SYNC_WHATS = ['production', 'skill', 'media'] as const;
export type SyncWhat = (typeof SYNC_WHATS)[number];

/** `contentSource` of the mediaFiles a channel's team shares. */
export const CONTENT_SOURCE = 'library-sync';
/** MB as the media CLI prints them. */
export const MB = 1_000_000;
export const DEFAULT_LIMIT_BYTES = 100 * MB;
export const MAX_LIMIT_BYTES = 100_000 * MB;
/** An upload that never finished stops counting once its presigned URL has expired. */
export const UPLOAD_TTL_MS = 60 * 60 * 1000;
/** Per request, to stay under the hosted function's body size. */
export const MAX_ITEMS_PER_PUSH = 200;
export const MAX_SKILL_BYTES = 1_000_000;

/** One shared thing as the cloud keeps it. */
export interface SyncItem<T = unknown> {
  key: string;
  hash: string;
  data: T;
  updatedAt?: string;
  updatedBy?: string;
  /** Pushed by the one asking. */
  mine?: boolean;
  /** Media only: the file, when it is shared. */
  file?: SharedFileLink;
}

export interface PushItem<T = unknown> {
  key: string;
  hash: string;
  /** The cloud's hash when this machine last pulled or pushed it. */
  baseHash?: string;
  data: T;
}

export interface PushResult {
  saved: string[];
  same: string[];
  /** Changed on the cloud since baseHash: pull first. */
  conflicts: { key: string; hash: string }[];
}

/** Whether a production or skill push may replace what the cloud has. */
export function checkPush(existing: { hash: string } | null | undefined, item: Pick<PushItem, 'hash' | 'baseHash'>): 'save' | 'same' | 'conflict' {
  if (!existing) return 'save';
  if (existing.hash === item.hash) return 'same';
  return item.baseHash === existing.hash ? 'save' : 'conflict';
}

/* ---------- canonical JSON (hashes are taken over this) ---------- */

/** JSON with keys sorted at every level and undefined left out, so equal data reads the same. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(x => (x === undefined ? 'null' : stableStringify(x))).join(',')}]`;
  const entries = Object.entries(v as Record<string, unknown>)
    .filter(([, x]) => x !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${stableStringify(x)}`).join(',')}}`;
}

/* ---------- media details ---------- */

export interface MediaSourceDetails {
  tool: string;
  ref?: string;
  [key: string]: unknown;
}

export interface MediaNoteDetails {
  at: string;
  text: string;
  production?: string;
}

/** A library item as the team shares it: what it is, never where it is on someone's computer. */
export interface MediaDetails {
  sha256: string;
  kind: string;
  subject?: string | null;
  title?: string | null;
  /** Where it sits in the sharer's library, relative to its root (a pull files it there too). */
  path?: string;
  tags?: string[];
  sources?: MediaSourceDetails[];
  rating?: string | null;
  notes?: MediaNoteDetails[];
  bytes?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fps?: number | null;
  hasAudio?: boolean | null;
  lyrics?: string | null;
}

export const SHA256 = /^[0-9a-f]{64}$/;
export const SHARED_KINDS = ['footage', 'images', 'art', 'overlays', 'references'] as const;

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** A path inside a library: relative, no `..`, no hidden folders. */
export function cleanLibraryPath(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v || v.startsWith('/') || /^[a-z]:/i.test(v) || v.includes('\0')) return undefined;
  const parts = v.split(/[\\/]+/).filter(Boolean);
  if (parts.length < 2 || parts.some(p => p === '..' || p === '.' || p.startsWith('.'))) return undefined;
  return parts.join('/').slice(0, 500);
}

/** Details as sent, kept to their shape and sizes; null when they don't name an item. */
export function cleanDetails(raw: unknown): MediaDetails | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sha256 = typeof o.sha256 === 'string' ? o.sha256.toLowerCase() : '';
  const kind = str(o.kind, 40);
  if (!SHA256.test(sha256) || !kind) return null;
  const sources = Array.isArray(o.sources)
    ? o.sources
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && typeof (s as { tool?: unknown }).tool === 'string')
        .slice(0, 20)
        .map(s => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null && v !== undefined && (typeof v !== 'string' || v.length <= 20_000))) as MediaSourceDetails)
    : undefined;
  const notes = Array.isArray(o.notes)
    ? o.notes
        .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object' && typeof (n as { text?: unknown }).text === 'string')
        .slice(0, 200)
        .map(n => ({ at: str(n.at, 40) ?? new Date(0).toISOString(), text: String(n.text).slice(0, 4000), ...(str(n.production, 120) ? { production: str(n.production, 120) } : {}) }))
    : undefined;
  const tags = Array.isArray(o.tags) ? [...new Set(o.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()).map(t => t.slice(0, 80)))].slice(0, 100) : [];
  // empty lists are left out, as a merge leaves them, so the same details always read the same
  const details: MediaDetails = {
    sha256,
    kind,
    subject: str(o.subject, 300) ?? null,
    title: str(o.title, 300) ?? null,
    path: cleanLibraryPath(o.path),
    tags: tags.length ? tags : undefined,
    sources: sources?.length ? sources : undefined,
    rating: str(typeof o.rating === 'number' ? String(o.rating) : o.rating, 20) ?? null,
    notes: notes?.length ? notes : undefined,
    bytes: num(o.bytes),
    width: num(o.width) ?? null,
    height: num(o.height) ?? null,
    duration: num(o.duration) ?? null,
    fps: num(o.fps) ?? null,
    hasAudio: typeof o.hasAudio === 'boolean' ? o.hasAudio : null,
    lyrics: str(o.lyrics, 20_000) ?? null,
  };
  return JSON.parse(JSON.stringify(details)) as MediaDetails;
}

const unionBy = <T>(a: T[] | undefined, b: T[] | undefined, key: (x: T) => string) => {
  const out = new Map<string, T>();
  for (const x of [...(a ?? []), ...(b ?? [])]) out.set(key(x), { ...out.get(key(x)), ...x });
  return out.size ? [...out.values()] : undefined;
};

/** A teammate's details over what the cloud had: tags, sources and notes add up, the rest is theirs. */
export function mergeDetails(old: MediaDetails | null | undefined, next: MediaDetails): MediaDetails {
  if (!old) return next;
  const defined = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== null)) as Partial<MediaDetails>;
  const tags = [...new Set([...(old.tags ?? []), ...(next.tags ?? [])])];
  return {
    ...old,
    ...defined,
    tags: tags.length ? tags : undefined,
    sources: unionBy(old.sources, next.sources, s => `${s.tool}:${s.ref ?? ''}`),
    notes: unionBy(old.notes, next.notes, n => `${n.at}|${n.text}`)?.sort((x, y) => x.at.localeCompare(y.at)),
  };
}

/** Whether pushing these details would change what the cloud has. */
export function changesDetails(old: MediaDetails | null | undefined, next: MediaDetails): boolean {
  return !old || stableStringify(mergeDetails(old, next)) !== stableStringify(old);
}

/* ---------- shared files and the limit ---------- */

export type FileState = 'uploading' | 'shared' | 'failed' | 'withdrawn';

/** A shared file as the project's limit counts it. */
export interface SharedFile {
  sha256: string;
  size: number;
  state: FileState;
  /** When its state last changed (an upload's reservation runs from here). */
  at: string;
}

export interface SharedFileLink {
  url: string;
  size: number;
  contentType?: string;
  fileName?: string;
}

export interface FileAsk {
  sha256: string;
  size: number;
  fileName?: string;
  contentType?: string;
}

/** Bytes counted against the limit: shared files, and uploads still under way. */
export function usedBytes(files: SharedFile[], now = Date.now(), except = new Set<string>()): number {
  return files
    .filter(f => !except.has(f.sha256) && (f.state === 'shared' || (f.state === 'uploading' && now - Date.parse(f.at) < UPLOAD_TTL_MS)))
    .reduce((n, f) => n + f.size, 0);
}

export interface UploadPlan {
  accept: FileAsk[];
  /** Already shared: nothing to upload. */
  already: string[];
  refused: { sha256: string; reason: string }[];
  usedBytes: number;
  limitBytes: number;
}

/** Which asked-for uploads fit the project's limit, in the order asked. */
export function planUploads(existing: SharedFile[], asked: FileAsk[], limitBytes: number, now = Date.now()): UploadPlan {
  const shared = new Set(existing.filter(f => f.state === 'shared').map(f => f.sha256));
  // asking again for an upload under way replaces its reservation
  let used = usedBytes(existing, now, new Set(asked.map(a => a.sha256)));
  const plan: UploadPlan = { accept: [], already: [], refused: [], usedBytes: 0, limitBytes };
  const seen = new Set<string>();
  for (const a of asked) {
    if (!SHA256.test(a.sha256) || seen.has(a.sha256)) continue;
    seen.add(a.sha256);
    if (shared.has(a.sha256)) {
      plan.already.push(a.sha256);
      continue;
    }
    if (!(Number.isInteger(a.size) && a.size > 0)) {
      plan.refused.push({ sha256: a.sha256, reason: 'no size' });
      continue;
    }
    if (used + a.size > limitBytes) {
      plan.refused.push({ sha256: a.sha256, reason: `over the channel's limit (${Math.round(used / MB)} of ${Math.round(limitBytes / MB)} MB used, this is ${Math.max(1, Math.round(a.size / MB))} MB)` });
      continue;
    }
    used += a.size;
    plan.accept.push(a);
  }
  plan.usedBytes = used;
  return plan;
}

/** The limit a project keeps (`channelSync.limitBytes`), or the default. */
export function limitOf(project: unknown): number {
  const v = (project as { channelSync?: { limitBytes?: unknown } } | null | undefined)?.channelSync?.limitBytes;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, MAX_LIMIT_BYTES) : DEFAULT_LIMIT_BYTES;
}

/** What `GET /api/channel-sync` answers. */
export interface ChannelSyncStatus {
  project: { id: string; name: string; role: 'owner' | 'editor' | 'viewer' };
  limitBytes: number;
  usedBytes: number;
  counts: Record<SyncWhat, number> & { files: number };
}

/** video, image or audio, as mediaFiles has them. */
export function contentTypeOf(fileName: string): 'video' | 'image' | 'audio' | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi'].includes(ext)) return 'video';
  if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'tif', 'tiff', 'heic', 'bmp'].includes(ext)) return 'image';
  if (['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'aif', 'aiff', 'opus'].includes(ext)) return 'audio';
  return 'unknown';
}
