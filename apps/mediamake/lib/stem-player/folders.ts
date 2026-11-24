import { normalizeIndex } from '@/lib/file-revisions/sets';
import type { ImageSetIndex } from '@/lib/file-revisions/types';
import { readJsonIn } from '@/lib/revisions/fs';
import { commonPrefix, isAudio, isVersionsFolder, linkTries, normalizeRemaster, skipFolder, tracksOf, type TrackFile } from './tracks';
import type { RemasterIndex } from './types';

/*
 * Reading one folder for the sidebar's tree: its tracks and its subfolders, nothing below. A folder
 * is read when it is expanded, so a channel folder with a hundred songs opens as fast as a stems
 * folder. Also: walking a review link's path under a root, and the set a versions folder's
 * revision files describe.
 */

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};

export interface FolderListing {
  tracks: TrackFile[];
  folders: { name: string; handle: FileSystemDirectoryHandle }[];
  /** The folder holds the versions of one song (see isVersionsFolder). */
  versions: boolean;
  remaster: RemasterIndex | null;
  /** The folder's own index.json, when it has one (the file revisions' contract). */
  index: ImageSetIndex | null;
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export async function readFolder(dir: FileSystemDirectoryHandle, parentName?: string): Promise<FolderListing> {
  const files: string[] = [];
  const folders: FolderListing['folders'] = [];
  for await (const entry of (dir as IterableDirectoryHandle).values()) {
    if (entry.kind === 'file') files.push(entry.name);
    else if (!skipFolder(entry.name)) folders.push({ name: entry.name, handle: entry as FileSystemDirectoryHandle });
  }
  folders.sort((a, b) => byName(a.name, b.name));
  const audio = files.some(isAudio);
  const json = async <T>(name: string, read: (raw: unknown) => T | null): Promise<T | null> => {
    if (!audio || !files.includes(name)) return null;
    try {
      const res = await readJsonIn(dir, name);
      return res ? read(res.data) : null;
    } catch {
      return null;
    }
  };
  const remaster = await json('remaster.json', normalizeRemaster);
  const index = await json('index.json', raw => normalizeIndex(raw, dir.name));
  const order = index?.styles.flatMap(s => s.variants.flatMap(v => [v.file, v.id]));
  return { tracks: tracksOf(files, { remaster, order }), folders, versions: audio && isVersionsFolder(dir.name, parentName, files), remaster, index };
}

async function hasAudio(dir: FileSystemDirectoryHandle): Promise<boolean> {
  for await (const entry of (dir as IterableDirectoryHandle).values()) if (entry.kind === 'file' && isAudio(entry.name)) return true;
  return false;
}

/**
 * The folder a review link names (`?job=AMZ/fma-edwardeleric/remaster/v1`), walked under a root:
 * the folders from the root down to it ([] when it is the root itself), or null when the root
 * doesn't hold it. Only a folder with audio counts.
 */
export async function findFolder(root: FileSystemDirectoryHandle, linkPath: string): Promise<string[] | null> {
  for (const attempt of linkTries(linkPath, root.name)) {
    try {
      let dir = root;
      for (const part of attempt) dir = await dir.getDirectoryHandle(part);
      if (await hasAudio(dir)) return attempt;
    } catch {
      // not under this root this way
    }
  }
  return null;
}

/**
 * Where a link's folder is nearest: among several folders the user gave, the one that reaches it in the
 * fewest steps (none when it is the folder itself). So a song's own folder is used before a folder of
 * every song that also holds it. `index` is the place in `places`; null when none of them holds it.
 */
export async function findNearest(places: FileSystemDirectoryHandle[], linkPath: string): Promise<{ handle: FileSystemDirectoryHandle; parts: string[]; index: number } | null> {
  let best: { handle: FileSystemDirectoryHandle; parts: string[]; index: number } | null = null;
  for (const [index, handle] of places.entries()) {
    const parts = await findFolder(handle, linkPath).catch(() => null);
    if (parts && (!best || parts.length < best.parts.length)) best = { handle, parts, index };
    if (best && !best.parts.length) break;
  }
  return best;
}

/**
 * A folder's tracks as the revision files describe a set (lib/file-revisions): what the Markdown
 * for Claude is written from. `path` is the folder's absolute path when the screen knows it.
 */
export function reviewIndex(name: string, listing: Pick<FolderListing, 'tracks' | 'remaster' | 'index'>, opts: { ladder: boolean; versions?: boolean; path?: string }): ImageSetIndex {
  // versions of one song to choose between (a final, drops), or just tracks someone left notes on
  const versions = opts.versions ?? opts.ladder;
  const { tracks, remaster, index } = listing;
  const fromNames = commonPrefix(tracks.map(t => t.id)).replace(/[\s\-_]+$/, '');
  const title = remaster?.title ?? (index?.title && index.title !== name ? index.title : undefined) ?? (fromNames || name);
  const path = index?.path ?? remaster?.path ?? opts.path;
  return {
    ...(index ?? { job: name }),
    kind: versions ? 'remaster' : 'audio',
    title,
    workflow: index?.workflow ?? remaster?.workflow ?? (opts.ladder ? 'make-loudness-remaster' : undefined),
    path,
    // the folder may be just "v1": the Markdown names the full path so Claude finds the right song
    location: index?.location ?? path,
    ...(versions ? { pick: index?.pick ?? { max: 1, label: 'Final' } } : {}),
    styles: [{ id: versions ? 'ladder' : 'tracks', name: versions ? 'Versions' : 'Tracks', variants: tracks.map(t => ({ id: t.id, file: t.file, note: t.info?.note ?? t.info?.label })) }],
  };
}
