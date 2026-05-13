import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  wordGenerationsCol,
  hasAccess,
  canEditProject,
  isValidId,
  toObjectId,
} from '@/lib/db/collections';

async function guardProject(projectId: string, clientId: string) {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

/**
 * PATCH /api/projects/[projectId]/word-generations/[genId]
 * Body: { helperType: string, chosenSuggestion: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; genId: string }> },
) {
  const { projectId, genId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!isValidId(genId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json() as { helperType?: string; chosenSuggestion?: string };
  if (!body.helperType || typeof body.chosenSuggestion !== 'string') {
    return NextResponse.json({ error: 'helperType and chosenSuggestion required' }, { status: 400 });
  }

  const col = await wordGenerationsCol();
  const result = await col.updateOne(
    { _id: toObjectId(genId), projectId, userId: clientId },
    {
      $set: {
        'entries.$[entry].chosenSuggestion': body.chosenSuggestion,
        'entries.$[entry].updatedAt': new Date(),
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ 'entry.helperType': body.helperType }] },
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/projects/[projectId]/word-generations/[genId]
 * Removes all generations for this word.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; genId: string }> },
) {
  const { projectId, genId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canEditProject(project, clientId))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!isValidId(genId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const col = await wordGenerationsCol();
  const result = await col.deleteOne({ _id: toObjectId(genId), projectId, userId: clientId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
