import { NextRequest, NextResponse } from 'next/server';
import { MongoBulkWriteError, type AnyBulkWriteOperation, type Collection, type Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { canWrite, getProjectRole } from '@/lib/editor/project-access';
import { generationsAccess } from '@/lib/generations/access';
import {
  MAX_TAKES,
  encodeCursor,
  listFilter,
  mergeTakes,
  parseTake,
  takeUpdate,
  toGeneration,
  type GenerationDoc,
  type TakeInput,
} from '@/lib/generations/db';
import { getGenerationsCollection } from './model';

type Skipped = { index?: number; ref?: string; error: string };

const keyOf = ({ tool, ref }: { tool: string; ref: string }) => `${tool}\u0000${ref}`;

// GET /api/generations?projectId=&tool=&q=&rating=&model=&parentRef=&kind=&cursor=&limit= - a project's takes, newest first
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const projectId = params.get('projectId');
  try {
    const db = await getDatabase();
    const access = await generationsAccess(db, projectId, getClientId(request), 'read');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const filter = listFilter(projectId!, params);
    if (!filter.ok) return NextResponse.json({ error: filter.error }, { status: 400 });
    const limit = Math.min(Math.max(parseInt(params.get('limit') || '50', 10) || 50, 1), 200);

    const collection = await getGenerationsCollection();
    const docs = await collection.find(filter.value).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).toArray();
    const page = docs.slice(0, limit);
    return NextResponse.json({
      items: page.map(toGeneration),
      nextCursor: docs.length > limit ? encodeCursor(page[page.length - 1]) : null,
      role: access.role,
    });
  } catch (error) {
    console.error('Error listing generations:', error);
    return NextResponse.json({ error: 'Failed to list generations' }, { status: 500 });
  }
}

/**
 * Writes takes into `projectId`. A take already saved in another project
 * stays there: it is updated when the caller may write that project too (a
 * late status from before the channel was switched), skipped otherwise.
 * Returns the takes written.
 */
async function saveTakes(
  db: Db,
  collection: Collection<GenerationDoc>,
  takes: TakeInput[],
  { projectId, clientId, skipped, retry }: { projectId: string; clientId: string; skipped: Skipped[]; retry: boolean },
): Promise<TakeInput[]> {
  if (!takes.length) return [];
  const existing = await collection
    .find({ $or: takes.map(({ tool, ref }) => ({ tool, ref })) }, { projection: { tool: 1, ref: 1, projectId: 1, status: 1 } })
    .toArray();
  const byKey = new Map(existing.map(doc => [keyOf(doc), doc]));
  const writable = new Map<string, boolean>([[projectId, true]]);
  const now = new Date().toISOString();

  const planned: TakeInput[] = [];
  const ops: AnyBulkWriteOperation<GenerationDoc>[] = [];
  for (const take of takes) {
    const doc = byKey.get(keyOf(take));
    const target = doc?.projectId ?? projectId;
    if (!writable.has(target)) writable.set(target, canWrite(await getProjectRole(db, target, clientId)));
    if (!writable.get(target)) {
      skipped.push({ ref: take.ref, error: 'Already saved in another project' });
      continue;
    }
    planned.push(take);
    ops.push({
      updateOne: {
        filter: { tool: take.tool, ref: take.ref, projectId: target },
        update: takeUpdate(take, { projectId: target, clientId, now, existingStatus: doc?.status }),
        upsert: !doc,
      },
    });
  }
  if (!ops.length) return [];

  const failed = new Set<number>();
  const again: TakeInput[] = [];
  try {
    await collection.bulkWrite(ops, { ordered: false });
  } catch (error) {
    if (!(error instanceof MongoBulkWriteError)) throw error;
    for (const writeError of [error.writeErrors].flat()) {
      failed.add(writeError.index);
      const take = planned[writeError.index];
      // Saved by someone else between the read and the write: look again, once.
      if (writeError.code === 11000 && retry) again.push(take);
      else skipped.push({ ref: take.ref, error: writeError.errmsg ?? 'Could not save' });
    }
  }
  const written = planned.filter((_, i) => !failed.has(i));
  return [...written, ...(await saveTakes(db, collection, again, { projectId, clientId, skipped, retry: false }))];
}

// POST /api/generations - { projectId, items: [...] }: upserts each take by (tool, ref); a take's rating, notes and usedIn are never cleared
export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request);
    const body = await request.json().catch(() => null);
    const projectId = typeof body?.projectId === 'string' ? body.projectId : null;
    const db = await getDatabase();
    const access = await generationsAccess(db, projectId, clientId, 'write');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (!Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json({ error: 'items must be a list of takes' }, { status: 400 });
    }
    if (body.items.length > MAX_TAKES) {
      return NextResponse.json({ error: `At most ${MAX_TAKES} takes per request` }, { status: 400 });
    }

    const skipped: Skipped[] = [];
    const takes: TakeInput[] = [];
    body.items.forEach((raw: unknown, index: number) => {
      const parsed = parseTake(raw);
      if (parsed.ok) takes.push(parsed.value);
      else {
        const ref = (raw as { ref?: unknown } | null)?.ref;
        skipped.push({ index, ...(typeof ref === 'string' ? { ref } : {}), error: parsed.error });
      }
    });

    const collection = await getGenerationsCollection();
    const written = await saveTakes(db, collection, mergeTakes(takes), { projectId: projectId!, clientId: clientId!, skipped, retry: true });
    const docs = written.length ? await collection.find({ $or: written.map(({ tool, ref }) => ({ tool, ref })) }).toArray() : [];
    const byKey = new Map(docs.map(doc => [keyOf(doc), doc]));
    const items = written.flatMap(take => {
      const doc = byKey.get(keyOf(take));
      return doc ? [toGeneration(doc)] : [];
    });

    return NextResponse.json({ saved: items.length, items, ...(skipped.length ? { skipped } : {}) });
  } catch (error) {
    console.error('Error saving generations:', error);
    return NextResponse.json({ error: 'Failed to save generations' }, { status: 500 });
  }
}
