import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Collection } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { projectSyncAccess } from './access';
import { createReadUrl, createUploadUrl, fileKey, storedSize } from './storage';
import {
  BUNDLE_COLLECTION,
  RELEASE_PLATFORMS,
  SLUG,
  checkListing,
  mimeOf,
  toResponse,
  type BundleDoc,
  type BundleFile,
  type BundleKind,
  type ListedFile,
  type ReleaseMeta,
  type ReleasePlatform,
} from '.';

const LABEL: Record<BundleKind, string> = { production: 'production', release: 'release' };
const LIVE = { deletedAt: { $exists: false } } as const;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function collection(kind: BundleKind): Promise<Collection<BundleDoc>> {
  return (await getDatabase()).collection<BundleDoc>(BUNDLE_COLLECTION[kind]);
}

function idFilter(id: unknown) {
  return typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : null;
}

/**
 * The files of a new version, sharing storage with the bundle's earlier versions by sha256, and
 * a signed PUT link for each file whose content the bundle doesn't have yet.
 */
async function prepareVersion(kind: BundleKind, doc: BundleDoc & { _id: ObjectId }, listing: ListedFile[]) {
  const stored = new Map<string, string>();
  for (const version of doc.versions) for (const f of version.files) if (version.status === 'ready') stored.set(f.sha256, f.key);
  const pending = new Map<string, { key: string; path: string; contentType: string; size: number }>();
  const files: BundleFile[] = listing.map(f => {
    const contentType = f.contentType || mimeOf(f.path);
    let key = stored.get(f.sha256) ?? pending.get(f.sha256)?.key;
    if (!key) {
      key = fileKey(doc.projectId, kind, doc._id.toString(), f.sha256, f.path);
      pending.set(f.sha256, { key, path: f.path, contentType, size: f.size });
    }
    return { path: f.path, role: f.role, size: f.size, sha256: f.sha256, contentType, key };
  });
  const uploads = await Promise.all(
    [...pending.values()].map(async p => ({
      path: p.path,
      size: p.size,
      uploadUrl: await createUploadUrl(p.key, p.contentType),
      // the link is signed with these: send them exactly
      headers: { 'Content-Type': p.contentType, 'x-amz-acl': 'private' },
    })),
  );
  const uploading = new Set(uploads.map(u => u.path));
  const reused = files.filter(f => !uploading.has(f.path)).map(f => f.path);
  return { files, uploads, reused };
}

function releaseMeta(body: { platform?: unknown; productionId?: unknown }, current?: BundleDoc['release']): { error: string } | { release: ReleaseMeta } {
  const platform = (body.platform ?? current?.platform ?? 'other') as ReleasePlatform;
  if (!RELEASE_PLATFORMS.includes(platform)) return { error: `platform must be one of ${RELEASE_PLATFORMS.join(', ')}` };
  const productionId = body.productionId === undefined ? current?.productionId : body.productionId === null ? undefined : String(body.productionId);
  return { release: { platform, ...(productionId ? { productionId } : {}) } };
}

/**
 * GET, POST, PUT and DELETE for /api/project/productions and /api/project/releases, and POST for
 * their /finish. Uploading is three steps: POST (or PUT with files) lists the files and gets a signed
 * PUT link for each one the bundle doesn't have, the client PUTs them with their Content-Type, then
 * POST /finish checks they all arrived and makes that version the latest.
 */
export function bundleRoutes(kind: BundleKind) {
  const label = LABEL[kind];

  /** ?projectId [&id | &slug [&version] [&links=1]] | [&search] [&platform] [&page] [&limit] */
  async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const projectId = params.get('projectId');
    const db = await getDatabase();
    const access = await projectSyncAccess(db, projectId, getClientId(request), 'read');
    if (!access.ok) return fail(access.error, access.status);
    const col = await collection(kind);

    const id = params.get('id');
    const slug = params.get('slug');
    if (id || slug) {
      const _id = id ? idFilter(id) : null;
      if (id && !_id) return fail(`Not a ${label} id: ${id}`);
      const doc = await col.findOne({ projectId: projectId!, ...LIVE, ...(_id ? { _id } : { slug: slug! }) });
      if (!doc) return fail(`No ${label} ${id ?? slug} in this project`, 404);
      const version = params.get('version') ? Number(params.get('version')) : undefined;
      if (version !== undefined && !doc.versions.some(v => v.version === version)) return fail(`${doc.slug} has no version ${version}`, 404);
      const body = toResponse(doc, { version, full: true });
      if (params.get('links') === '1' || params.get('links') === 'true') {
        const files = doc.versions.find(v => v.version === (version ?? doc.latestVersion))?.files ?? [];
        const urls = await Promise.all(files.map(f => createReadUrl(f.key, f.path.split('/').pop()!)));
        return NextResponse.json({ ...body, files: files.map(({ key: _key, ...f }, i) => ({ ...f, url: urls[i] })), linksExpireIn: 3600 });
      }
      return NextResponse.json(body);
    }

    const page = Math.max(1, Number(params.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 20));
    const query: Record<string, unknown> = { projectId: projectId!, ...LIVE };
    const search = params.get('search')?.trim();
    if (search) {
      const words = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: words }, { slug: words }, { notes: words }];
    }
    if (kind === 'release' && params.get('platform')) query['release.platform'] = params.get('platform');
    const [docs, total] = await Promise.all([
      col.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(query),
    ]);
    return NextResponse.json({ projectId, total, page, limit, items: docs.map(d => toResponse(d)) });
  }

  /** { projectId, slug, title?, notes?, files, note?, platform?, productionId? } */
  async function POST(request: NextRequest) {
    const clientId = getClientId(request);
    const body = await request.json().catch(() => ({}));
    const db = await getDatabase();
    const access = await projectSyncAccess(db, body.projectId, clientId, 'write');
    if (!access.ok) return fail(access.error, access.status);
    const slug = String(body.slug ?? '').trim();
    if (!SLUG.test(slug)) return fail('slug must be lowercase letters, digits and dashes (up to 80), e.g. "honored-one"');
    const listing = checkListing(kind, body.files);
    if (!listing.ok) return fail(listing.error);
    let release: ReleaseMeta | undefined;
    if (kind === 'release') {
      const meta = releaseMeta(body);
      if ('error' in meta) return fail(meta.error);
      release = meta.release;
    }

    const col = await collection(kind);
    const existing = await col.findOne({ projectId: body.projectId, slug, ...LIVE });
    if (existing) return NextResponse.json({ error: `This project already has a ${label} "${slug}": add a version with update_${label}`, id: existing._id.toString() }, { status: 409 });

    const now = new Date().toISOString();
    const doc: BundleDoc = {
      projectId: body.projectId,
      kind,
      slug,
      title: String(body.title ?? '').trim() || slug,
      ...(body.notes ? { notes: String(body.notes) } : {}),
      ...(release ? { release } : {}),
      versions: [],
      latestVersion: 0,
      createdAt: now,
      createdBy: clientId!,
      updatedAt: now,
    };
    const { insertedId } = await col.insertOne(doc);
    const saved = { ...doc, _id: insertedId };
    const { files, uploads, reused } = await prepareVersion(kind, saved, listing.files);
    await col.updateOne(
      { _id: insertedId },
      { $push: { versions: { version: 1, status: 'uploading', files, ...(body.note ? { note: String(body.note) } : {}), createdAt: now, createdBy: clientId! } } },
    );
    return NextResponse.json({ id: insertedId.toString(), slug, version: 1, uploads, reused, finish: { projectId: body.projectId, id: insertedId.toString(), version: 1 } }, { status: 201 });
  }

  /** { projectId, id, title?, notes?, platform?, productionId?, files?, note? }: with files, a new version. */
  async function PUT(request: NextRequest) {
    const clientId = getClientId(request);
    const body = await request.json().catch(() => ({}));
    const db = await getDatabase();
    const access = await projectSyncAccess(db, body.projectId, clientId, 'write');
    if (!access.ok) return fail(access.error, access.status);
    const _id = idFilter(body.id);
    if (!_id) return fail(`id is required: the ${label}'s id`);
    const col = await collection(kind);
    const doc = await col.findOne({ _id, projectId: body.projectId, ...LIVE });
    if (!doc) return fail(`No ${label} ${body.id} in this project`, 404);

    const now = new Date().toISOString();
    const set: Partial<BundleDoc> = { updatedAt: now };
    const unset: Record<string, ''> = {};
    if (typeof body.title === 'string' && body.title.trim()) set.title = body.title.trim();
    if (body.notes === null) unset.notes = '';
    else if (body.notes !== undefined) set.notes = String(body.notes);
    if (kind === 'release' && (body.platform !== undefined || body.productionId !== undefined)) {
      const meta = releaseMeta(body, doc.release);
      if ('error' in meta) return fail(meta.error);
      set.release = meta.release;
    }

    if (body.files === undefined) {
      await col.updateOne({ _id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
      return NextResponse.json(toResponse({ ...doc, ...set, ...(unset.notes === '' ? { notes: undefined } : {}) }, { full: true }));
    }
    const listing = checkListing(kind, body.files);
    if (!listing.ok) return fail(listing.error);
    const version = Math.max(0, ...doc.versions.map(v => v.version)) + 1;
    const { files, uploads, reused } = await prepareVersion(kind, { ...doc, _id }, listing.files);
    await col.updateOne(
      { _id },
      {
        $set: set,
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
        $push: { versions: { version, status: 'uploading', files, ...(body.note ? { note: String(body.note) } : {}), createdAt: now, createdBy: clientId! } },
      },
    );
    return NextResponse.json({ id: body.id, slug: doc.slug, version, uploads, reused, finish: { projectId: body.projectId, id: body.id, version } });
  }

  /** ?projectId&id: moves it to the project's trash (its files are kept). Owner only. */
  async function DELETE(request: NextRequest) {
    const clientId = getClientId(request);
    const params = request.nextUrl.searchParams;
    const projectId = params.get('projectId');
    const db = await getDatabase();
    const access = await projectSyncAccess(db, projectId, clientId, 'delete');
    if (!access.ok) return fail(access.error, access.status);
    const _id = idFilter(params.get('id'));
    if (!_id) return fail(`id is required: the ${label}'s id`);
    const now = new Date().toISOString();
    const result = await (await collection(kind)).updateOne({ _id, projectId: projectId!, ...LIVE }, { $set: { deletedAt: now, deletedBy: clientId!, updatedAt: now } });
    if (!result.matchedCount) return fail(`No ${label} ${params.get('id')} in this project`, 404);
    return NextResponse.json({ deleted: true, id: params.get('id'), trash: true });
  }

  /** POST /finish { projectId, id, version }: checks every file arrived, then makes it the latest. */
  async function FINISH(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const db = await getDatabase();
    const access = await projectSyncAccess(db, body.projectId, getClientId(request), 'write');
    if (!access.ok) return fail(access.error, access.status);
    const _id = idFilter(body.id);
    if (!_id) return fail(`id is required: the ${label}'s id`);
    const col = await collection(kind);
    const doc = await col.findOne({ _id, projectId: body.projectId, ...LIVE });
    if (!doc) return fail(`No ${label} ${body.id} in this project`, 404);
    const version = doc.versions.find(v => v.version === Number(body.version));
    if (!version) return fail(`${doc.slug} has no version ${body.version}`, 404);

    const byKey = new Map(version.files.map(f => [f.key, f]));
    const missing: { path: string; reason: string }[] = [];
    await Promise.all(
      [...byKey.values()].map(async f => {
        const size = await storedSize(f.key);
        if (size === null) missing.push({ path: f.path, reason: 'not uploaded' });
        else if (size !== f.size) missing.push({ path: f.path, reason: `stored ${size} bytes, listed ${f.size}` });
      }),
    );
    if (missing.length) return NextResponse.json({ id: body.id, version: version.version, ready: false, missing }, { status: 409 });

    const now = new Date().toISOString();
    const latestVersion = Math.max(doc.latestVersion, version.version);
    await col.updateOne(
      { _id, 'versions.version': version.version },
      { $set: { 'versions.$.status': 'ready', 'versions.$.readyAt': now, latestVersion, updatedAt: now } },
    );
    const updated = await col.findOne({ _id });
    return NextResponse.json({ ready: true, ...toResponse(updated!, { version: version.version, full: true }) });
  }

  return { GET, POST, PUT, DELETE, FINISH };
}
