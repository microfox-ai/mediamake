import { listFileNames, readJsonIn } from '@/lib/revisions/fs';
import type { ImageGroup, ImageSetIndex } from './types';

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
/** Review sheets the thumbnail engine writes next to the renders: not images to review. */
const SHEET = /^sheet(-small)?\.(jpe?g|png)$/i;

type RawGroup = { id?: unknown; name?: unknown; idea?: unknown; variants?: unknown; items?: unknown };
type RawItem = { id?: unknown; file?: unknown; note?: unknown };

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
      .map(v => ({ id: String(v.id ?? String(v.file).replace(/\.[^.]+$/, '')), file: String(v.file), note: typeof v.note === 'string' ? v.note : undefined })),
  }));
  const rest = { ...r };
  delete rest.groups;
  return { ...(rest as Partial<ImageSetIndex>), job: typeof r.job === 'string' ? r.job : folder, styles } as ImageSetIndex;
}

/** A folder without an index.json: every image in it, by file name (sheets left out). */
export async function indexFromFiles(dir: FileSystemDirectoryHandle): Promise<ImageSetIndex | null> {
  const files = (await listFileNames(dir)).filter(n => IMAGE.test(n) && !SHEET.test(n));
  if (!files.length) return null;
  return {
    job: dir.name,
    kind: 'images',
    title: dir.name,
    styles: [{ id: 'all', name: dir.name, variants: files.map(f => ({ id: f.replace(/\.[^.]+$/, ''), file: f })) }],
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
 * Every set under `root`, a few levels down (e.g. lyrics_videos/out → thumbnails/<job>,
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
