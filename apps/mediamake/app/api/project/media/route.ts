import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Document } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { getPublicUrl } from '@/lib/spaces-upload';
import { projectSyncAccess } from '@/lib/projectsync/access';
import { mediaKindOf, mimeOf } from '@/lib/projectsync';

/**
 * /api/project/media: a project's single media files for ProjectSync (lib/projectsync). They are the
 * media library's `mediaFiles` with the project's id, from anyone on the project. Uploads are never
 * analysed (no image description, no audio analysis): files go up through /api/project/media/upload
 * and are recorded here as they are.
 */

const LIVE = { deletedAt: { $exists: false } } as const;
const MAX_ITEMS = 50;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function toItem(doc: Document) {
  return {
    id: doc._id.toString(),
    name: doc.fileName,
    url: doc.filePath,
    contentType: doc.contentType,
    mimeType: doc.contentMimeType,
    size: doc.fileSize,
    tags: doc.tags ?? [],
    source: doc.contentSource,
    ...(doc.metadata?.sha256 ? { sha256: doc.metadata.sha256 } : {}),
    uploadedBy: doc.clientId,
    createdAt: doc.createdAt,
  };
}

/** ?projectId [&id] | [&search] [&contentType] [&page] [&limit] */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const projectId = params.get('projectId');
  const db = await getDatabase();
  const access = await projectSyncAccess(db, projectId, getClientId(request), 'read');
  if (!access.ok) return fail(access.error, access.status);
  const col = db.collection('mediaFiles');

  const id = params.get('id');
  if (id) {
    if (!ObjectId.isValid(id)) return fail(`Not a media id: ${id}`);
    const doc = await col.findOne({ _id: new ObjectId(id), projectId: projectId!, ...LIVE });
    if (!doc) return fail(`No media ${id} in this project`, 404);
    return NextResponse.json({ ...toItem(doc), metadata: doc.metadata ?? {} });
  }

  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 50));
  const query: Document = { projectId: projectId!, ...LIVE };
  const contentType = params.get('contentType');
  if (contentType) query.contentType = contentType;
  const search = params.get('search')?.trim();
  if (search) {
    const words = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ fileName: words }, { tags: words }, { 'metadata.description': words }];
  }
  const [docs, total] = await Promise.all([
    col.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    col.countDocuments(query),
  ]);
  return NextResponse.json({ projectId, total, page, limit, items: docs.map(toItem) });
}

/**
 * { projectId, items: [{ name, url, size, contentType?, sha256?, tags? }] }: records files PUT to the
 * links /upload handed out. Each must be in MediaMake's storage and the right size. No analysis.
 */
export async function POST(request: NextRequest) {
  const clientId = getClientId(request);
  const body = await request.json().catch(() => ({}));
  const db = await getDatabase();
  const access = await projectSyncAccess(db, body.projectId, clientId, 'write');
  if (!access.ok) return fail(access.error, access.status);
  const items = body.items;
  if (!Array.isArray(items) || !items.length) return fail('items is required: [{ name, url, size }]');
  if (items.length > MAX_ITEMS) return fail(`At most ${MAX_ITEMS} files per request`);

  const ours = getPublicUrl('');
  const projectPrefix = `/projects/${body.projectId}/media/`;
  const col = db.collection('mediaFiles');
  const saved: ReturnType<typeof toItem>[] = [];
  const missing: { name: string; reason: string }[] = [];
  for (const item of items) {
    const name = String(item?.name ?? '').split(/[\\/]/).pop() || 'file';
    const url = String(item?.url ?? '');
    if (!url.startsWith(ours) || !url.includes(projectPrefix)) {
      missing.push({ name, reason: "not a link /api/project/media/upload gave for this project" });
      continue;
    }
    const head = await fetch(url, { method: 'HEAD' }).catch(() => null);
    const size = Number(head?.headers.get('content-length'));
    if (!head?.ok) {
      missing.push({ name, reason: `not uploaded (storage answered ${head?.status ?? 'nothing'})` });
      continue;
    }
    if (item.size !== undefined && size > 0 && size !== Number(item.size)) {
      missing.push({ name, reason: `stored ${size} bytes, listed ${item.size}` });
      continue;
    }
    const mime = String(item.contentType || mimeOf(name));
    const now = new Date();
    const doc = {
      tags: Array.isArray(item.tags) ? item.tags.filter((t: unknown) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()) : [],
      clientId: clientId!,
      projectId: body.projectId,
      contentType: mediaKindOf(mime),
      contentMimeType: mime,
      contentSubType: 'projectsync',
      contentSource: 'projectsync',
      metadata: { ...(item.sha256 ? { sha256: String(item.sha256) } : {}), analysed: false },
      fileName: name,
      fileSize: size > 0 ? size : Number(item.size) || 0,
      filePath: url,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await col.insertOne(doc);
    saved.push(toItem({ ...doc, _id: insertedId }));
  }
  return NextResponse.json({ projectId: body.projectId, saved, missing }, { status: saved.length ? 201 : 409 });
}

/** ?projectId&id: moves it to the project's trash (the file is kept). Owner only. */
export async function DELETE(request: NextRequest) {
  const clientId = getClientId(request);
  const params = request.nextUrl.searchParams;
  const projectId = params.get('projectId');
  const db = await getDatabase();
  const access = await projectSyncAccess(db, projectId, clientId, 'delete');
  if (!access.ok) return fail(access.error, access.status);
  const id = params.get('id');
  if (!id || !ObjectId.isValid(id)) return fail('id is required: the media id');
  const now = new Date();
  const result = await db
    .collection('mediaFiles')
    .updateOne({ _id: new ObjectId(id), projectId: projectId!, ...LIVE }, { $set: { deletedAt: now, deletedBy: clientId!, updatedAt: now } });
  if (!result.matchedCount) return fail(`No media ${id} in this project`, 404);
  return NextResponse.json({ deleted: true, id, trash: true });
}
