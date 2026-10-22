import type { LocalMediaCandidate, LocalMediaContentType } from './types';

/*
 * File System Access API helpers. Chromium-only (Chrome, Edge, Arc, Brave…),
 * the same browsers the web renderer needs. These APIs are not all in the
 * TypeScript DOM lib yet, hence the narrow local types below.
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
    excludeAcceptAllOption?: boolean;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle[]>;
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandle>;
};
type HandleDataTransferItem = DataTransferItem & {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
};

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.ogv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.oga', '.opus', '.flac', '.weba'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp', '.svg'];

const MIME_BY_EXTENSION: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.flac': 'audio/flac',
  '.weba': 'audio/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

const PICKER_TYPES = [
  {
    description: 'Video, audio and images',
    accept: {
      'video/*': VIDEO_EXTENSIONS,
      'audio/*': AUDIO_EXTENSIONS,
      'image/*': IMAGE_EXTENSIONS,
    },
  },
];

/** Shared picker id: Chrome reopens the last folder the user used. */
const PICKER_ID = 'mediamake-local-media';

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export function detectLocalContentType(name: string, mimeType?: string): LocalMediaContentType {
  const mime = mimeType ?? '';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  const ext = extensionOf(name);
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  return 'unknown';
}

export function mimeTypeFor(name: string, reported?: string): string {
  if (reported) return reported;
  return MIME_BY_EXTENSION[extensionOf(name)] ?? 'application/octet-stream';
}

export function isSupportedMediaName(name: string): boolean {
  return detectLocalContentType(name) !== 'unknown';
}

export type LocalMediaSupport =
  | { supported: true }
  | { supported: false; reason: 'server' | 'insecure' | 'browser' };

/** Whether this browser can reference local files in place. */
export function getLocalMediaSupport(): LocalMediaSupport {
  if (typeof window === 'undefined') return { supported: false, reason: 'server' };
  if (!window.isSecureContext) return { supported: false, reason: 'insecure' };
  const w = window as PickerWindow;
  if (
    typeof w.showOpenFilePicker !== 'function' ||
    typeof w.showDirectoryPicker !== 'function' ||
    !('serviceWorker' in navigator)
  ) {
    return { supported: false, reason: 'browser' };
  }
  return { supported: true };
}

/** Throws AbortError if the user closes the picker. */
export async function pickLocalFiles(): Promise<FileSystemFileHandle[]> {
  const w = window as PickerWindow;
  return w.showOpenFilePicker!({ multiple: true, id: PICKER_ID, types: PICKER_TYPES });
}

/** Single-file picker for relinking a moved file. */
export async function pickSingleLocalFile(): Promise<FileSystemFileHandle> {
  const w = window as PickerWindow;
  const [handle] = await w.showOpenFilePicker!({ multiple: false, id: PICKER_ID, types: PICKER_TYPES });
  return handle;
}

/** Throws AbortError if the user closes the picker. */
export async function pickLocalFolder(): Promise<FileSystemDirectoryHandle> {
  const w = window as PickerWindow;
  return w.showDirectoryPicker!({ id: PICKER_ID, mode: 'read' });
}

export async function queryReadPermission(handle: FileSystemHandle): Promise<PermissionState> {
  const h = handle as PermissionedHandle;
  if (typeof h.queryPermission !== 'function') return 'granted';
  try {
    return await h.queryPermission({ mode: 'read' });
  } catch {
    return 'prompt';
  }
}

/** Needs a user gesture when the state is 'prompt'. */
export async function requestReadPermission(handle: FileSystemHandle): Promise<PermissionState> {
  const h = handle as PermissionedHandle;
  if (typeof h.requestPermission !== 'function') return 'granted';
  try {
    return await h.requestPermission({ mode: 'read' });
  } catch {
    // Usually "user activation is required" — still askable on the next click.
    return 'prompt';
  }
}

export function isNotFoundError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'NotFoundError' || err.name === 'NotReadableError');
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** A media file found on disk, before it is tied to a root. */
export type ScannedFile = Omit<LocalMediaCandidate, 'alreadyImported' | 'rootId'>;

export interface ScanOptions {
  recursive?: boolean;
  /** Folders deeper than this are skipped. */
  maxDepth?: number;
  /** Stop after this many media files. */
  limit?: number;
  signal?: AbortSignal;
  onProgress?: (found: number) => void;
}

/** Lists media files in a folder (optionally its subfolders). */
export async function scanLocalFolder(
  dir: FileSystemDirectoryHandle,
  { recursive = true, maxDepth = 8, limit = 5000, signal, onProgress }: ScanOptions = {},
): Promise<ScannedFile[]> {
  const found: ScannedFile[] = [];

  const walk = async (folder: FileSystemDirectoryHandle, prefix: string, depth: number) => {
    for await (const entry of (folder as IterableDirectoryHandle).values()) {
      if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError');
      if (found.length >= limit) return;
      if (entry.name.startsWith('.')) continue; // .DS_Store, .git, hidden folders
      if (entry.kind === 'directory') {
        if (recursive && depth < maxDepth) {
          await walk(entry as FileSystemDirectoryHandle, `${prefix}${entry.name}/`, depth + 1);
        }
        continue;
      }
      if (!isSupportedMediaName(entry.name)) continue;
      const fileHandle = entry as FileSystemFileHandle;
      try {
        const file = await fileHandle.getFile();
        found.push({
          handle: fileHandle,
          name: file.name,
          relativePath: `${prefix}${file.name}`,
          contentType: detectLocalContentType(file.name, file.type),
          size: file.size,
          lastModified: file.lastModified,
          mimeType: mimeTypeFor(file.name, file.type),
        });
        onProgress?.(found.length);
      } catch {
        // Unreadable entry (locked, permission) — skip it.
      }
    }
  };

  await walk(dir, '', 0);
  found.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }));
  return found;
}

/**
 * File/folder handles from a drop. Must be called synchronously inside the
 * drop handler — the DataTransfer is emptied once the event returns.
 */
export function handlesFromDrop(dataTransfer: DataTransfer): Promise<FileSystemHandle[]> {
  const pending: Promise<FileSystemHandle | null>[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    const handleItem = item as HandleDataTransferItem;
    if (item.kind === 'file' && typeof handleItem.getAsFileSystemHandle === 'function') {
      pending.push(handleItem.getAsFileSystemHandle().catch(() => null));
    }
  }
  return Promise.all(pending).then((handles) =>
    handles.filter((h): h is FileSystemHandle => h !== null),
  );
}

/** Same file on disk? (Cheap metadata check first, then the real one.) */
export async function isSameLocalFile(
  a: FileSystemFileHandle,
  b: FileSystemFileHandle,
): Promise<boolean> {
  try {
    return await a.isSameEntry(b);
  } catch {
    return false;
  }
}
