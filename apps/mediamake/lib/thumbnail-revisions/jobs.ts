import { readJsonIn } from '@/lib/revisions/fs';
import type { ThumbIndex } from './types';

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

/** A thumbnail job folder: it has an index.json with styles. */
export async function readIndex(dir: FileSystemDirectoryHandle): Promise<ThumbIndex | null> {
  try {
    const res = await readJsonIn<ThumbIndex>(dir, 'index.json');
    if (!res || !Array.isArray(res.data?.styles)) return null;
    return { ...res.data, size: res.data.size ?? [1280, 720] };
  } catch {
    return null;
  }
}

export interface SourceJob {
  /** Path inside the source, e.g. "thumbnails/my-job". */
  path: string;
  name: string;
  title?: string;
  handle: FileSystemDirectoryHandle;
}

const SKIP = (name: string) =>
  name.startsWith('.') || name === 'node_modules' || name.endsWith('.revisions') || name === 'final' || name === 'kept';

/** Every job folder under `root`, a few levels down (e.g. lyrics_videos/out → thumbnails/<job>). */
export async function scanJobs(root: FileSystemDirectoryHandle, maxDepth = 3): Promise<SourceJob[]> {
  const found: SourceJob[] = [];
  const walk = async (dir: FileSystemDirectoryHandle, path: string, depth: number) => {
    const index = await readIndex(dir);
    if (index) {
      found.push({ path, name: dir.name, title: index.title, handle: dir });
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
