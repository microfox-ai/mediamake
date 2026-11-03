import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { channelSyncAccess } from '@/lib/channel-sync/access';
import {
  MAX_ITEMS_PER_PUSH,
  MAX_SKILL_BYTES,
  SHA256,
  SYNC_WHATS,
  checkPush,
  cleanDetails,
  cleanLibraryPath,
  mergeDetails,
  stableStringify,
  type MediaDetails,
  type PushItem,
  type PushResult,
  type SyncItem,
  type SyncWhat,
} from '@/lib/channel-sync';
import { sharedLinks, syncItems } from '@/lib/channel-sync/store';

const KEY: Record<SyncWhat, RegExp> = {
  production: /^[a-z0-9][a-z0-9._-]{0,119}$/i,
  skill: /^[a-z0-9][a-z0-9-]{0,119}$/,
  media: SHA256,
};

/** A skill's text files, or null when they aren't that. */
function cleanSkill(data: unknown): { files: { path: string; text: string }[] } | null {
  const files = (data as { files?: unknown })?.files;
  if (!Array.isArray(files) || !files.length) return null;
  let bytes = 0;
  const out: { path: string; text: string }[] = [];
  for (const f of files as { path?: unknown; text?: unknown }[]) {
    const path = typeof f?.path === 'string' && !f.path.includes('/') ? f.path : cleanLibraryPath(f?.path);
    if (!path || typeof f.text !== 'string' || path.split('/').some(p => p.startsWith('.'))) return null;
    bytes += f.text.length;
    out.push({ path, text: f.text });
  }
  return bytes <= MAX_SKILL_BYTES && out.some(f => f.path === 'SKILL.md') ? { files: out } : null;
}

// GET /api/channel-sync/items?projectId=...&what=production|skill|media [&files=1: media with a shared file only] - what the channel's team shares
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  const what = request.nextUrl.searchParams.get('what') as SyncWhat | null;
  try {
    const clientId = getClientId(request);
    const db = await getDatabase();
    const access = await channelSyncAccess(db, projectId, clientId, 'read');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!what || !SYNC_WHATS.includes(what)) return NextResponse.json({ error: `what is one of ${SYNC_WHATS.join(', ')}` }, { status: 400 });
    const links = what === 'media' ? await sharedLinks(db, projectId!) : new Map();
    const onlyFiles = what === 'media' && request.nextUrl.searchParams.get('files') === '1';
    const docs = (await syncItems(db).find({ projectId: projectId!, what }).sort({ key: 1 }).toArray()).filter(d => !onlyFiles || links.has(d.key));
    const items: SyncItem[] = docs.map(d => ({
      key: d.key,
      hash: d.hash,
      data: d.data,
      updatedAt: d.updatedAt.toISOString(),
      mine: d.updatedBy === clientId,
      ...(links.has(d.key) ? { file: links.get(d.key) } : {}),
    }));
    return NextResponse.json({ projectId, what, role: access.role, items });
  } catch (error) {
    console.error('Error reading channel sync items:', error);
    return NextResponse.json({ error: 'Failed to read what the channel shares' }, { status: 500 });
  }
}

/**
 * PUT /api/channel-sync/items - { projectId, what, items: [{ key, hash, baseHash?, data }] } (owners and editors)
 * A production or skill is saved when the cloud has none, or still has baseHash (what the pusher last
 * saw); otherwise it is a conflict and the pusher pulls first. Media details merge.
 */
export async function PUT(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const { projectId, what, items } = (await request.json()) as { projectId?: string; what?: SyncWhat; items?: PushItem[] };
    const db = await getDatabase();
    const access = await channelSyncAccess(db, projectId ?? null, clientId, 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!what || !SYNC_WHATS.includes(what)) return NextResponse.json({ error: `what is one of ${SYNC_WHATS.join(', ')}` }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'items is required' }, { status: 400 });
    if (items.length > MAX_ITEMS_PER_PUSH) return NextResponse.json({ error: `At most ${MAX_ITEMS_PER_PUSH} items per request` }, { status: 400 });

    const collection = syncItems(db);
    const result: PushResult = { saved: [], same: [], conflicts: [] };
    const bad: string[] = [];
    for (const item of items) {
      const key = typeof item?.key === 'string' ? (what === 'media' ? item.key.toLowerCase() : item.key) : '';
      if (!KEY[what].test(key)) {
        bad.push(String(item?.key));
        continue;
      }
      const existing = await collection.findOne({ projectId: projectId!, what, key });
      let data: unknown;
      let hash: string;
      if (what === 'media') {
        const details = cleanDetails(item.data);
        if (!details || details.sha256 !== key) {
          bad.push(key);
          continue;
        }
        const merged = mergeDetails(existing?.data as MediaDetails | undefined, details);
        if (existing && stableStringify(merged) === stableStringify(existing.data)) {
          result.same.push(key);
          continue;
        }
        data = merged;
        hash = key;
      } else {
        const clean = what === 'skill' ? cleanSkill(item.data) : item.data && typeof item.data === 'object' && JSON.stringify(item.data).length <= 200_000 ? item.data : null;
        if (!clean || typeof item.hash !== 'string' || !SHA256.test(item.hash)) {
          bad.push(key);
          continue;
        }
        const verdict = checkPush(existing, item);
        if (verdict === 'same') {
          result.same.push(key);
          continue;
        }
        if (verdict === 'conflict') {
          result.conflicts.push({ key, hash: existing!.hash });
          continue;
        }
        data = clean;
        hash = item.hash;
      }
      await collection.updateOne(
        { projectId: projectId!, what, key },
        {
          $set: { hash, data, updatedAt: new Date(), updatedBy: clientId!, ...(existing ? { previous: { hash: existing.hash, data: existing.data, updatedAt: existing.updatedAt, updatedBy: existing.updatedBy } } : {}) },
        },
        { upsert: true },
      );
      result.saved.push(key);
    }
    return NextResponse.json({ projectId, what, ...result, ...(bad.length ? { refused: bad } : {}) });
  } catch (error) {
    console.error('Error saving channel sync items:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
