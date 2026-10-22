export type LocalMediaContentType = 'video' | 'audio' | 'image' | 'document' | 'unknown';

/**
 * A file on this computer, referenced in place (never copied or uploaded).
 * Stored in IndexedDB — the handle is a structured-cloneable
 * FileSystemFileHandle, which localStorage cannot hold.
 */
export interface LocalMediaRecord {
  /** Stable id used in `/__local-media/<id>/…` URLs. Survives relinks. */
  id: string;
  name: string;
  /** Path inside the imported folder, e.g. "b-roll/clip.mp4". */
  relativePath?: string;
  /** The folder or file the user granted access to (see LocalMediaRoot). */
  rootId: string;
  handle: FileSystemFileHandle;
  mimeType: string;
  contentType: LocalMediaContentType;
  size: number;
  lastModified: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  projectId?: string;
  metadata: {
    duration?: number;
    width?: number;
    height?: number;
    /** Small JPEG data URL captured at import. */
    thumbnail?: string;
  };
  /** Set once the file has been uploaded, so it is never uploaded twice. */
  cloud?: {
    url: string;
    mediaId?: string;
    uploadedAt: number;
  };
}

/**
 * What the user actually granted access to. Chrome asks again for these
 * (not for each file) after a reload, so reconnecting a folder restores
 * every file imported from it in one prompt.
 */
export interface LocalMediaRoot {
  id: string;
  kind: 'directory' | 'file';
  name: string;
  handle: FileSystemDirectoryHandle | FileSystemFileHandle;
  createdAt: number;
}

export type LocalMediaStatus =
  /** Not checked yet. */
  | 'checking'
  | 'ready'
  /** Chrome needs the user to re-allow access to the folder/file. */
  | 'needs-permission'
  /** The file was moved, renamed or deleted on disk. */
  | 'missing';

/** A file found while scanning a folder, before it is imported. */
export interface LocalMediaCandidate {
  handle: FileSystemFileHandle;
  name: string;
  relativePath: string;
  contentType: LocalMediaContentType;
  size: number;
  lastModified: number;
  mimeType: string;
  /** The picked folder/file this candidate was found under. */
  rootId: string;
  /** Already in the library (same file on disk). */
  alreadyImported: boolean;
}
