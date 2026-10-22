import type { MediaFile } from '@/app/types/media';
import { buildLocalMediaUrl, isLocalMediaUrl, LOCAL_MEDIA_ID_PREFIX } from './urls';
import type { LocalMediaRecord, LocalMediaStatus } from './types';

/**
 * A local item in the MediaFile shape every gallery and picker already
 * understands — `filePath` is the /__local-media/ URL, so picking one writes
 * a normal URL into timeline props.
 */
export type LocalMediaFile = Omit<MediaFile, '_id'> & {
  _id: string;
  storage: 'local';
  localStatus: LocalMediaStatus;
  /** Where in the imported folder it lives, for tooltips. */
  localRelativePath?: string;
  /** Cloud copy, if it has been uploaded. */
  cloudUrl?: string;
};

export function localRecordToMediaFile(
  record: LocalMediaRecord,
  origin: string,
  status: LocalMediaStatus,
): LocalMediaFile {
  const filePath = buildLocalMediaUrl(origin, record.id, record.name);
  return {
    _id: `${LOCAL_MEDIA_ID_PREFIX}${record.id}`,
    storage: 'local',
    localStatus: status,
    localRelativePath: record.relativePath,
    cloudUrl: record.cloud?.url,
    tags: record.tags,
    clientId: '',
    projectId: record.projectId,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
    contentType: record.contentType,
    contentMimeType: record.mimeType,
    contentSubType: 'local',
    contentSource: 'local',
    fileName: record.name,
    fileSize: record.size,
    filePath,
    metadata: {
      ...record.metadata,
      src: filePath,
    },
  };
}

/** True for local items, whichever form they arrive in. */
export function isLocalMediaFile(file: unknown): boolean {
  if (!file || typeof file !== 'object') return false;
  const f = file as { storage?: unknown; _id?: unknown; filePath?: unknown; src?: unknown };
  return (
    f.storage === 'local' ||
    (typeof f._id === 'string' && f._id.startsWith(LOCAL_MEDIA_ID_PREFIX)) ||
    isLocalMediaUrl(f.filePath) ||
    isLocalMediaUrl(f.src)
  );
}

export function localIdFromMediaFileId(id: unknown): string | null {
  return typeof id === 'string' && id.startsWith(LOCAL_MEDIA_ID_PREFIX)
    ? id.slice(LOCAL_MEDIA_ID_PREFIX.length)
    : null;
}
