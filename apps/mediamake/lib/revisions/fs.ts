import { detectLocalContentType, isNotFoundError } from '@/lib/local-media/file-access';

/*
 * Folder access for the revisions screen. Unlike the media library (read-only
 * file handles), revisions are written next to the video, so this asks for a
 * read-write directory handle. Chromium only.
 */

type PermissionMode = { mode: 'read' | 'readwrite' };
type PermissionedHandle = FileSystemHandle & {
  queryPermission?: (d: PermissionMode) => Promise<PermissionState>;
  requestPermission?: (d: PermissionMode) => Promise<PermissionState>;
};
type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  values: () => AsyncIterable<FileSystemDirectoryHandle | FileSystemFileHandle>;
};
type PickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    id?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle[]>;
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: FileSystemHandle;
  }) => Promise<FileSystemDirectoryHandle>;
};

/** Chrome reopens the last folder used with this id. */
const PICKER_ID = 'mediamake-revisions';

export const REVISIONS_DIR_SUFFIX = '.revisions';

export type FolderSupport = { supported: true } | { supported: false; reason: 'insecure' | 'browser' };

export function getFolderSupport(): FolderSupport {
  if (!window.isSecureContext) return { supported: false, reason: 'insecure' };
  const w = window as PickerWindow;
  if (typeof w.showDirectoryPicker !== 'function' || typeof w.showOpenFilePicker !== 'function') {
    return { supported: false, reason: 'browser' };
  }
  return { supported: true };
}

/** Throws AbortError if the user closes the picker. */
export function pickFolder(startIn?: FileSystemHandle): Promise<FileSystemDirectoryHandle> {
  const w = window as PickerWindow;
  return w.showDirectoryPicker!({ id: PICKER_ID, mode: 'readwrite', ...(startIn ? { startIn } : {}) });
}

export async function pickVideoFile(): Promise<FileSystemFileHandle> {
  const w = window as PickerWindow;
  const [handle] = await w.showOpenFilePicker!({
    multiple: false,
    id: PICKER_ID,
    types: [
      {
        description: 'Videos',
        accept: { 'video/*': ['.mp4', '.mov', '.m4v', '.webm', '.mkv'] },
      },
    ],
  });
  return handle;
}

export async function queryReadWrite(handle: FileSystemHandle): Promise<PermissionState> {
  const h = handle as PermissionedHandle;
  if (typeof h.queryPermission !== 'function') return 'granted';
  try {
    return await h.queryPermission({ mode: 'readwrite' });
  } catch {
    return 'prompt';
  }
}

/** Needs a user gesture unless already granted. */
export async function requestReadWrite(handle: FileSystemHandle): Promise<PermissionState> {
  const h = handle as PermissionedHandle;
  if ((await queryReadWrite(handle)) === 'granted') return 'granted';
  if (typeof h.requestPermission !== 'function') return 'granted';
  try {
    return await h.requestPermission({ mode: 'readwrite' });
  } catch {
    return 'prompt';
  }
}

/** Whether `file` lives directly in `dir` (not a subfolder). */
export async function isDirectChild(
  dir: FileSystemDirectoryHandle,
  file: FileSystemFileHandle,
): Promise<boolean> {
  try {
    const path = await dir.resolve(file);
    return Array.isArray(path) && path.length === 1;
  } catch {
    return false;
  }
}

export interface FolderVideo {
  name: string;
  handle: FileSystemFileHandle;
  size: number;
  lastModified: number;
}

export interface FolderListing {
  videos: FolderVideo[];
  /** Every .json file name, to find maps. */
  jsonFiles: string[];
  /** `<video>.revisions` folders. */
  revisionDirs: string[];
}

export async function listFolder(dir: FileSystemDirectoryHandle): Promise<FolderListing> {
  const videos: FolderVideo[] = [];
  const jsonFiles: string[] = [];
  const revisionDirs: string[] = [];
  for await (const entry of (dir as IterableDirectoryHandle).values()) {
    if (entry.name.startsWith('.')) continue;
    if (entry.kind === 'directory') {
      if (entry.name.endsWith(REVISIONS_DIR_SUFFIX)) revisionDirs.push(entry.name);
      continue;
    }
    if (entry.name.toLowerCase().endsWith('.json')) {
      jsonFiles.push(entry.name);
      continue;
    }
    if (detectLocalContentType(entry.name) !== 'video') continue;
    try {
      const file = await (entry as FileSystemFileHandle).getFile();
      videos.push({
        name: entry.name,
        handle: entry as FileSystemFileHandle,
        size: file.size,
        lastModified: file.lastModified,
      });
    } catch {
      // Locked or vanished mid-scan — skip it.
    }
  }
  const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  videos.sort((a, b) => byName(a.name, b.name));
  jsonFiles.sort(byName);
  revisionDirs.sort(byName);
  return { videos, jsonFiles, revisionDirs };
}

export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/** Map files to try for a video, best first. */
export function mapCandidates(videoName: string): string[] {
  const base = baseName(videoName);
  return [`${base}.map.json`, `${videoName}.map.json`, 'map.json'];
}

export function revisionsDirName(videoName: string): string {
  return `${baseName(videoName)}${REVISIONS_DIR_SUFFIX}`;
}

export async function getSubdir(
  dir: FileSystemDirectoryHandle,
  name: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await dir.getDirectoryHandle(name, { create });
  } catch (err) {
    if (isNotFoundError(err) || (err instanceof DOMException && err.name === 'TypeMismatchError')) return null;
    throw err;
  }
}

export async function readFileIn(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<File | null> {
  try {
    return await (await dir.getFileHandle(name)).getFile();
  } catch (err) {
    if (isNotFoundError(err) || (err instanceof DOMException && err.name === 'TypeMismatchError')) return null;
    throw err;
  }
}

export async function readJsonIn<T = unknown>(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<{ data: T; lastModified: number } | null> {
  const file = await readFileIn(dir, name);
  if (!file) return null;
  return { data: JSON.parse(await file.text()) as T, lastModified: file.lastModified };
}

/**
 * Writes a file, creating it if needed. createWritable writes to a swap file
 * and swaps it in on close, so readers never see half a file.
 */
export async function writeFileIn(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Blob | string,
): Promise<number> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
  } finally {
    await writable.close();
  }
  return (await handle.getFile()).lastModified;
}

export async function removeFileIn(dir: FileSystemDirectoryHandle, name: string): Promise<void> {
  try {
    await dir.removeEntry(name);
  } catch (err) {
    if (!isNotFoundError(err)) throw err;
  }
}

export async function listFileNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of (dir as IterableDirectoryHandle).values()) {
    if (entry.kind === 'file' && !entry.name.startsWith('.')) names.push(entry.name);
  }
  return names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
