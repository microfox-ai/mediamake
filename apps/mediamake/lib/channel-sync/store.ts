import type { Db } from 'mongodb';
import { CONTENT_SOURCE, type FileState, type SharedFile, type SharedFileLink, type SyncWhat } from './index';

/**
 * Where channel sync is kept: `channelSyncItems` (productions, skill variants and media details,
 * one per project + what + key, with the version it replaced in `previous`) and the project's
 * `mediaFiles` with contentSource "library-sync" (the shared files).
 */
export interface SyncItemDoc {
  projectId: string;
  what: SyncWhat;
  key: string;
  hash: string;
  data: unknown;
  updatedAt: Date;
  updatedBy: string;
  previous?: { hash: string; data: unknown; updatedAt: Date; updatedBy: string };
}

let indexed: Promise<unknown> | null = null;

export function syncItems(db: Db) {
  const items = db.collection<SyncItemDoc>('channelSyncItems');
  indexed ??= items.createIndex({ projectId: 1, what: 1, key: 1 }, { unique: true }).catch(err => {
    indexed = null;
    console.error('channelSyncItems index:', err);
  });
  return items;
}

/** The project's shared files as its limit counts them. */
export async function sharedFiles(db: Db, projectId: string): Promise<SharedFile[]> {
  const docs = await db
    .collection('mediaFiles')
    .find({ projectId, contentSource: CONTENT_SOURCE }, { projection: { fileSize: 1, metadata: 1 } })
    .toArray();
  return docs
    .filter(d => typeof d.metadata?.sha256 === 'string')
    .map(d => ({
      sha256: d.metadata.sha256 as string,
      size: typeof d.fileSize === 'number' ? d.fileSize : 0,
      state: (d.metadata?.sync?.state as FileState | undefined) ?? 'shared',
      at: (d.metadata?.sync?.at as string | undefined) ?? new Date(0).toISOString(),
    }));
}

/** sha256 → the shared file teammates can fetch. */
export async function sharedLinks(db: Db, projectId: string): Promise<Map<string, SharedFileLink>> {
  const docs = await db
    .collection('mediaFiles')
    .find({ projectId, contentSource: CONTENT_SOURCE, 'metadata.sync.state': 'shared' }, { projection: { filePath: 1, fileSize: 1, fileName: 1, contentMimeType: 1, metadata: 1 } })
    .toArray();
  return new Map(docs.filter(d => d.filePath && d.metadata?.sha256).map(d => [d.metadata.sha256 as string, { url: d.filePath as string, size: d.fileSize ?? 0, contentType: d.contentMimeType, fileName: d.fileName }]));
}
