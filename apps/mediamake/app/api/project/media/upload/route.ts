import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { createPresignedUpload } from '@/lib/spaces-upload';
import { projectSyncAccess } from '@/lib/projectsync/access';
import { MAX_FILE_BYTES, MB, mimeOf } from '@/lib/projectsync';

const MAX_FILES = 50;

/**
 * POST /api/project/media/upload { projectId, files: [{ name, size, contentType?, sha256? }] }
 * A presigned PUT link per file (public, like the rest of the media library), under
 * mediamake/<client>/projects/<projectId>/media/. A file whose sha256 the project already has comes
 * back as `alreadyHave` instead. PUT each one with its Content-Type and `x-amz-acl: public-read`,
 * then record them with POST /api/project/media. Nothing is analysed.
 */
export async function POST(request: NextRequest) {
  const clientId = getClientId(request);
  const body = await request.json().catch(() => ({}));
  const db = await getDatabase();
  const access = await projectSyncAccess(db, body.projectId, clientId, 'write');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const files = body.files;
  if (!Array.isArray(files) || !files.length) return NextResponse.json({ error: 'files is required: [{ name, size }]' }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `At most ${MAX_FILES} files per request` }, { status: 400 });

  const col = db.collection('mediaFiles');
  const uploads = await Promise.all(
    files.map(async (f: { name?: string; size?: number; contentType?: string; sha256?: string }) => {
      const name = String(f?.name ?? '').split(/[\\/]/).pop() || 'file';
      if (Number(f.size) > MAX_FILE_BYTES) return { name, error: `larger than ${MAX_FILE_BYTES / MB} MB` };
      if (f.sha256) {
        const have = await col.findOne({ projectId: body.projectId, 'metadata.sha256': f.sha256, deletedAt: { $exists: false } });
        if (have) return { name, alreadyHave: { id: have._id.toString(), name: have.fileName, url: have.filePath } };
      }
      const contentType = f.contentType || mimeOf(name);
      const presigned = await createPresignedUpload({ clientId: clientId!, filename: name, contentType, subPath: `projects/${body.projectId}/media` });
      // the link is signed with these headers: send them exactly
      return { name, uploadUrl: presigned.uploadUrl, headers: { 'Content-Type': contentType, 'x-amz-acl': 'public-read' }, url: presigned.publicUrl };
    }),
  );
  return NextResponse.json({ projectId: body.projectId, uploads });
}
