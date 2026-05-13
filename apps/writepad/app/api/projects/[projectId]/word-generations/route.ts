import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  wordGenerationsCol,
  hasAccess,
  canEditProject,
  isValidId,
  toObjectId,
  serialize,
} from '@/lib/db/collections';

async function guardProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

/**
 * GET /api/projects/[projectId]/word-generations
 * Query params: fileId?, helperType?, q?, limit?, offset?
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const url = new URL(req.url);
  const fileId = url.searchParams.get('fileId') ?? undefined;
  const helperType = url.searchParams.get('helperType') ?? undefined;
  const q = url.searchParams.get('q') ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const col = await wordGenerationsCol();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { projectId, userId: clientId };
  // Filter words that appear in a specific file
  if (fileId) filter['files.fileId'] = fileId;
  // Filter words that have a given helper type
  if (helperType) filter['entries.helperType'] = helperType;
  if (q) {
    filter.$or = [
      { word: { $regex: q, $options: 'i' } },
      { 'files.filePath': { $regex: q, $options: 'i' } },
      { 'entries.suggestions': { $elemMatch: { $regex: q, $options: 'i' } } },
    ];
  }

  const [docs, total] = await Promise.all([
    col.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  const generations = docs.map((d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = serialize(d as any) as any;
    // Back-compat: old flat docs didn't have entries[] or files[]
    if (!s.entries) {
      s.entries = [{
        helperType: s.helperType ?? '',
        suggestions: s.suggestions ?? [],
        chosenSuggestion: s.chosenSuggestion ?? null,
        createdAt: s.createdAt,
        updatedAt: s.createdAt,
      }];
    }
    if (!s.files) {
      s.files = s.fileId ? [{ fileId: s.fileId, filePath: s.filePath ?? '' }] : [];
    }
    return s;
  });

  return NextResponse.json({ generations, total });
}

/**
 * POST /api/projects/[projectId]/word-generations
 * Body: { fileId, filePath, word, helperType, suggestions }
 * Upserts: one doc per (projectId, word). Adds file to files[] and upserts entry for helperType.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as {
    fileId?: string;
    filePath?: string;
    word?: string;
    helperType?: string;
    suggestions?: string[];
  };

  if (!body.word || !body.helperType) {
    return NextResponse.json({ error: 'word and helperType are required' }, { status: 400 });
  }

  const col = await wordGenerationsCol();
  const now = new Date();
  const entry = {
    helperType: body.helperType,
    suggestions: body.suggestions ?? [],
    chosenSuggestion: null as null,
    createdAt: now,
    updatedAt: now,
  };
  const fileId = body.fileId ?? '';
  const filePath = body.filePath ?? '';

  // ── Upsert entry for this helperType ─────────────────────────────────────────

  // 1. Merge new suggestions into existing entry (deduplicates via $addToSet)
  const updated = await col.findOneAndUpdate(
    { projectId, userId: clientId, word: body.word, 'entries.helperType': body.helperType },
    {
      $addToSet: { 'entries.$.suggestions': { $each: entry.suggestions } },
      $set: {
        'entries.$.updatedAt': now,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  );

  let docId: string;

  if (updated) {
    docId = updated._id.toHexString();
  } else {
    // 2. Doc exists but no entry for this helperType — push new entry
    const pushed = await col.findOneAndUpdate(
      { projectId, userId: clientId, word: body.word },
      {
        $push: { entries: entry },
        $set: { updatedAt: now },
      },
      { returnDocument: 'after' },
    );

    if (pushed) {
      docId = pushed._id.toHexString();
    } else {
      // 3. No doc yet — create it
      const newId = new ObjectId();
      await col.insertOne({
        _id: newId,
        projectId,
        userId: clientId,
        word: body.word,
        files: fileId ? [{ fileId, filePath }] : [],
        entries: [entry],
        createdAt: now,
        updatedAt: now,
      });
      return NextResponse.json({ id: newId.toHexString() }, { status: 201 });
    }
  }

  // ── Upsert file reference (runs for steps 1 & 2 only) ────────────────────────
  if (fileId) {
    // Update filePath if this fileId is already in the array (handles renames)
    const fileUpdated = await col.updateOne(
      { projectId, userId: clientId, word: body.word, 'files.fileId': fileId },
      { $set: { 'files.$.filePath': filePath } },
    );
    if (!fileUpdated.matchedCount) {
      // New file for this word — push it
      await col.updateOne(
        { projectId, userId: clientId, word: body.word },
        { $push: { files: { fileId, filePath } } },
      );
    }
  }

  return NextResponse.json({ id: docId }, { status: 200 });
}
