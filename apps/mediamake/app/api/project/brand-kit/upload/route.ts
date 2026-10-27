import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { createPresignedUpload } from '@/lib/spaces-upload';
import { assetKindOf, cleanPath, inGraphicsFolder, isKitAsset, mimeOf } from '@/lib/brand-kit';
import { brandKitAccess } from '@/lib/brand-kit/access';

const MAX_FILES = 200;

/**
 * POST /api/project/brand-kit/upload - { projectId, files: [{ path, contentType? }] }
 * Presigned PUT URLs for a batch of kit files, stored under
 * mediamake/<client>/brand-kits/<projectId>/<folder>/. PUT each file with its
 * Content-Type and `x-amz-acl: public-read`, then save the returned assets with
 * PUT /api/project/brand-kit. Only images, video, audio and fonts get a URL
 * (isKitAsset); code, other files and anything under a graphics/ folder are
 * left out.
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const { projectId, files } = (await request.json()) as { projectId?: string; files?: { path?: string; contentType?: string }[] };
    const db = await getDatabase();
    const access = await brandKitAccess(db, projectId ?? null, clientId, 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!Array.isArray(files) || !files.length) return NextResponse.json({ error: 'files is required' }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ error: `At most ${MAX_FILES} files per request` }, { status: 400 });

    const uploads = await Promise.all(
      files.map(async f => {
        const path = cleanPath(f.path ?? '');
        if (!path || !isKitAsset(path) || inGraphicsFolder(path)) return null;
        const contentType = f.contentType || mimeOf(path);
        const dir = path.split('/').slice(0, -1).join('/').replace(/[^a-zA-Z0-9/_-]/g, '_');
        const presigned = await createPresignedUpload({
          clientId: clientId!,
          filename: path.split('/').pop()!,
          contentType,
          subPath: ['brand-kits', projectId, dir].filter(Boolean).join('/'),
        });
        return { path, kind: assetKindOf(path), contentType, uploadUrl: presigned.uploadUrl, url: presigned.publicUrl };
      }),
    );
    return NextResponse.json({ projectId, uploads: uploads.filter(Boolean) });
  } catch (error) {
    console.error('Error creating brand kit uploads:', error);
    return NextResponse.json({ error: 'Failed to create upload URLs' }, { status: 500 });
  }
}
