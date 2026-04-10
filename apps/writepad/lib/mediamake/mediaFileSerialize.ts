import type { MediamakeMediaListItem } from '@/lib/types/mediamake-media';
import type { WithId, Document } from 'mongodb';

export function mediaFileDocToListItem(doc: WithId<Document>): MediamakeMediaListItem {
  const pid = doc.projectId;
  return {
    id: doc._id.toString(),
    filePath: typeof doc.filePath === 'string' ? doc.filePath : '',
    fileName: doc.fileName ?? null,
    contentType: doc.contentType ?? null,
    contentMimeType: doc.contentMimeType ?? null,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt
          ? String(doc.createdAt)
          : null,
    tags: Array.isArray(doc.tags) ? doc.tags : null,
    projectId: pid == null ? null : String(pid),
    contentSource: doc.contentSource ?? null,
  };
}
