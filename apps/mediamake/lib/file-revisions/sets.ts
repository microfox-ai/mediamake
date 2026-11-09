import { listFileNames, readJsonIn } from '@/lib/revisions/fs';
import type { ImageGroup, ImageSetIndex } from './types';

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO = /\.(mp4|m4v|mov|webm)$/i;
const AUDIO = /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac)$/i;
/** Review sheets the thumbnail engine writes next to the renders: not images to review. */
const SHEET = /^sheet(-small)?\.(jpe?g|png)$/i;

export type FileKind = 'image' | 'video' | 'audio';

/** What a file is, by its name (null: nothing this page can show). */
export const fileKind = (name: string): FileKind | null =>
  IMAGE.test(name) ? 'image' : VIDEO.test(name) ? 'video' : AUDIO.test(name) ? 'audio' : null;

const stem = (name: string) => name.replace(/\.[^.]+$/, '');

type RawGroup = { id?: unknown; name?: unknown; idea?: unknown; variants?: unknown; items?: unknown };
type RawItem = { id?: unknown; file?: unknown; media?: unknown; note?: unknown };

/** An index.json in either vocabulary (styles/variants or groups/items), or null when it isn't one. */
export function normalizeIndex(raw: unknown, folder: string): ImageSetIndex | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const groups = (r.styles ?? r.groups) as RawGroup[] | undefined;
  if (!Array.isArray(groups)) return null;
  const styles: ImageGroup[] = groups.map((g, i) => ({
    id: String(g.id ?? i + 1),
    name: String(g.name ?? g.id ?? `Group ${i + 1}`),
    idea: typeof g.idea === 'string' ? g.idea : undefined,
    variants: ((g.variants ?? g.items ?? []) as RawItem[])
      .filter(v => typeof v?.file === 'string')
      .map(v => ({
        id: String(v.id ?? stem(String(v.file))),
        file: String(v.file),
        media: typeof v.media === 'string' ? v.media : undefined,
        note: typeof v.note === 'string' ? v.note : undefined,
      })),
  }));
  const rest = { ...r };
  delete rest.groups;
  return { ...(rest as Partial<ImageSetIndex>), job: typeof r.job === 'string' ? r.job : folder, styles } as ImageSetIndex;
}

/**
 * A folder without an index.json: every image, video and audio file in it, by file name (sheets
 * left out). An image named like a video or audio file (clip.jpg beside clip.mp4) is its still.
 */
export async function indexFromFiles(dir: FileSystemDirectoryHandle): Promise<ImageSetIndex | null> {
  const files = (await listFileNames(dir)).filter(n => fileKind(n) && !SHEET.test(n));
  if (!files.length) return null;
  const media = new Map(files.filter(f => fileKind(f) !== 'image').map(f => [stem(f), f]));
  const stills = new Set(files.filter(f => fileKind(f) === 'image' && media.has(stem(f))).map(stem));
  const variants = files.flatMap(f => {
    const id = stem(f);
    if (fileKind(f) === 'image') return [{ id, file: f, ...(stills.has(id) ? { media: media.get(id) } : {}) }];
    if (!stills.has(id)) return [{ id, file: f }];
    // the one beside the still plays from it; another of the same name keeps its own tile
    return media.get(id) === f ? [] : [{ id: f, file: f }];
  });
  return {
    job: dir.name,
    kind: 'images',
    title: dir.name,
    styles: [{ id: 'all', name: dir.name, variants }],
  };
}

/** The set in a folder: its index.json, or (with fromFiles) its images as they are. */
export async function readIndex(dir: FileSystemDirectoryHandle, { fromFiles = false }: { fromFiles?: boolean } = {}): Promise<ImageSetIndex | null> {
  try {
    const res = await readJsonIn(dir, 'index.json');
    const index = res && normalizeIndex(res.data, dir.name);
    if (index) return index;
  } catch {
    // unreadable index.json: fall through
  }
  return fromFiles ? indexFromFiles(dir) : null;
}

export interface SourceSet {
  /** Path inside the source, e.g. "thumbnails/my-job". */
  path: string;
  name: string;
  title?: string;
  kind?: string;
  handle: FileSystemDirectoryHandle;
}

const SKIP = (name: string) =>
  name.startsWith('.') || name === 'node_modules' || name.endsWith('.revisions') || name === 'final' || name === 'kept';

/**
 * Every set under `root`, a few levels down (e.g. studio/out → thumbnails/<job>,
 * posters/<job>). Only folders with an index.json are listed, so render and still folders don't
 * flood the list; any other folder of images opens directly.
 */
export async function scanSets(root: FileSystemDirectoryHandle, maxDepth = 3): Promise<SourceSet[]> {
  const found: SourceSet[] = [];
  const walk = async (dir: FileSystemDirectoryHandle, path: string, depth: number) => {
    const index = await readIndex(dir);
    if (index) {
      found.push({ path, name: dir.name, title: index.title, kind: index.kind, handle: dir });
      return;
    }
    if (depth >= maxDepth) return;
    for await (const entry of (dir as IterableDirectoryHandle).values()) {
      if (entry.kind !== 'directory' || SKIP(entry.name)) continue;
      await walk(entry, path ? `${path}/${entry.name}` : entry.name, depth + 1);
    }
  };
  await walk(root, '', 0);
  return found.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}
