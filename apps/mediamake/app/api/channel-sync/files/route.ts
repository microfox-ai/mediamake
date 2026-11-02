import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { createPresignedUpload } from '@/lib/spaces-upload';
import { mimeOf } from '@/lib/brand-kit';
import { channelSyncAccess } from '@/lib/channel-sync/access';
import { CONTENT_SOURCE, MAX_ITEMS_PER_PUSH, SHA256, contentTypeOf, limitOf, planUploads, usedBytes, type FileAsk, type MediaDetails } from '@/lib/channel-sync';
import { sharedFiles, syncItems } from '@/lib/channel-sync/store';

const shaList = (v: unknown) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []).map(s => String(s).trim().toLowerCase()).filter(s => SHA256.test(s));

/**
 * POST /api/channel-sync/files - { projectId, files: [{ sha256, size, fileName, contentType? }] } (owners and editors)
 * Presigned PUT URLs for library files the user agreed to share, as long as they fit the project's
 * limit (counted here, whatever the client thinks). PUT each with its Content-Type and
 * `x-amz-acl: public-read`, then confirm with PUT. Files already shared come back in `already`.
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const { projectId, files } = (await request.json()) as { projectId?: string; files?: FileAsk[] };
    const db = await getDatabase();
    const access = await channelSyncAccess(db, projectId ?? null, clientId, 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!Array.isArray(files) || !files.length) return NextResponse.json({ error: 'files is required' }, { status: 400 });
    if (files.length > MAX_ITEMS_PER_PUSH) return NextResponse.json({ error: `At most ${MAX_ITEMS_PER_PUSH} files per request` }, { status: 400 });

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId!) }, { projection: { channelSync: 1 } });
    const asked = files.map(f => ({ ...f, sha256: String(f?.sha256 ?? '').toLowerCase(), size: Number(f?.size) }));
    const plan = planUploads(await sharedFiles(db, projectId!), asked, limitOf(project));
    const details = new Map(
      (await syncItems(db).find({ projectId: projectId!, what: 'media', key: { $in: plan.accept.map(a => a.sha256) } }).toArray()).map(d => [d.key, d.data as MediaDetails]),
    );
    const media = db.collection('mediaFiles');
    const at = new Date().toISOString();
    const uploads = [];
    for (const f of plan.accept) {
      const fileName = (f.fileName ?? `${f.sha256.slice(0, 12)}`).split(/[\\/]/).pop()!.slice(0, 200);
      const contentType = f.contentType || mimeOf(fileName);
      const presigned = await createPresignedUpload({ clientId: clientId!, filename: fileName, contentType, subPath: `channel-sync/${projectId}` });
      const d = details.get(f.sha256);
      await media.updateOne(
        { projectId: projectId!, contentSource: CONTENT_SOURCE, 'metadata.sha256': f.sha256 },
        {
          $set: {
            clientId: clientId!,
            projectId: projectId!,
            contentType: contentTypeOf(fileName),
            contentMimeType: contentType,
            contentSubType: d?.kind ?? 'library',
            contentSource: CONTENT_SOURCE,
            fileName,
            fileSize: f.size,
            filePath: presigned.publicUrl,
            tags: [CONTENT_SOURCE],
            'metadata.sha256': f.sha256,
            'metadata.title': d?.title ?? fileName,
            'metadata.kind': d?.kind,
            'metadata.subject': d?.subject,
            'metadata.sync': { state: 'uploading', at, by: clientId },
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
      uploads.push({ sha256: f.sha256, uploadUrl: presigned.uploadUrl, url: presigned.publicUrl, contentType });
    }
    return NextResponse.json({ projectId, uploads, already: plan.already, refused: plan.refused, usedBytes: plan.usedBytes, limitBytes: plan.limitBytes });
  } catch (error) {
    console.error('Error creating channel sync uploads:', error);
    return NextResponse.json({ error: 'Failed to create upload URLs' }, { status: 500 });
  }
}

/**
 * PUT /api/channel-sync/files - { projectId, sha256: [...] } (owners and editors)
 * Uploads done: each is checked in storage (it must be there, at the size it was given) before the
 * team can fetch it.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { projectId?: string; sha256?: string[] };
    const db = await getDatabase();
    const access = await channelSyncAccess(db, body.projectId ?? null, getClientId(request), 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const media = db.collection('mediaFiles');
    const shared: string[] = [];
    const failed: { sha256: string; reason: string }[] = [];
    for (const sha256 of shaList(body.sha256)) {
      const doc = await media.findOne({ projectId: body.projectId!, contentSource: CONTENT_SOURCE, 'metadata.sha256': sha256 });
      if (!doc || doc.metadata?.sync?.state !== 'uploading') {
        if (doc?.metadata?.sync?.state === 'shared') shared.push(sha256);
        else failed.push({ sha256, reason: 'no upload under way' });
        continue;
      }
      const head = await fetch(doc.filePath, { method: 'HEAD' }).catch(() => null);
      const size = Number(head?.headers.get('content-length') ?? NaN);
      const ok = !!head?.ok && size === doc.fileSize;
      await media.updateOne({ _id: doc._id }, { $set: { 'metadata.sync.state': ok ? 'shared' : 'failed', 'metadata.sync.at': new Date().toISOString(), updatedAt: new Date() } });
      if (ok) shared.push(sha256);
      else failed.push({ sha256, reason: head?.ok ? `stored ${size} bytes, expected ${doc.fileSize}` : 'not found in storage' });
    }
    const project = await db.collection('projects').findOne({ _id: new ObjectId(body.projectId!) }, { projection: { channelSync: 1 } });
    return NextResponse.json({ projectId: body.projectId, shared, failed, usedBytes: usedBytes(await sharedFiles(db, body.projectId!)), limitBytes: limitOf(project) });
  } catch (error) {
    console.error('Error confirming channel sync uploads:', error);
    return NextResponse.json({ error: 'Failed to confirm uploads' }, { status: 500 });
  }
}

/**
 * DELETE /api/channel-sync/files?projectId=...&sha256=a,b - stop sharing these files (owners and editors).
 * The team no longer gets them and they stop counting against the limit; the details stay, and so
 * does the stored copy (like a removed brand kit's files).
 */
export async function DELETE(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  try {
    const db = await getDatabase();
    const access = await channelSyncAccess(db, projectId, getClientId(request), 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const sha256 = shaList(request.nextUrl.searchParams.get('sha256'));
    if (!sha256.length) return NextResponse.json({ error: 'sha256 is required' }, { status: 400 });
    await db
      .collection('mediaFiles')
      .updateMany(
        { projectId: projectId!, contentSource: CONTENT_SOURCE, 'metadata.sha256': { $in: sha256 } },
        { $set: { 'metadata.sync.state': 'withdrawn', 'metadata.sync.at': new Date().toISOString(), updatedAt: new Date() } },
      );
    return NextResponse.json({ projectId, withdrawn: sha256 });
  } catch (error) {
    console.error('Error withdrawing channel sync files:', error);
    return NextResponse.json({ error: 'Failed to stop sharing' }, { status: 500 });
  }
}
