import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  projectsCol,
  projectFilesCol,
  isValidId,
  toObjectId,
  hasAccess,
} from '@/lib/db/collections';

/**
 * POST /api/projects/[projectId]/duplicate
 * Creates a full copy of the project (all files/folders) under the calling user.
 * Members are NOT copied — the duplicate is owned by the caller.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isValidId(projectId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date();
  const newProjectId = new ObjectId();

  // Create the duplicate project
  await col.insertOne({
    _id: newProjectId,
    name: `${project.name} (copy)`,
    description: project.description,
    type: project.type,
    ownerId: clientId,
    members: [],
    createdAt: now,
    updatedAt: now,
  });

  const newProjIdStr = newProjectId.toHexString();

  // Copy all files/folders, remapping IDs so parentId references stay consistent
  const filesCol = await projectFilesCol();
  const sourceFiles = await filesCol
    .find({ projectId })
    .sort({ parentId: 1, order: 1 })
    .toArray();

  if (sourceFiles.length > 0) {
    // Build old→new id map for all nodes
    const idMap = new Map<string, string>();
    for (const f of sourceFiles) {
      idMap.set(f._id.toHexString(), new ObjectId().toHexString());
    }

    const copies = sourceFiles.map((f) => {
      const newId = idMap.get(f._id.toHexString())!;
      const newParentId = f.parentId ? (idMap.get(f.parentId) ?? f.parentId) : null;
      return {
        _id: new ObjectId(newId),
        projectId: newProjIdStr,
        name: f.name,
        type: f.type,
        parentId: newParentId,
        content: f.content,
        draft: null,          // copies start with no pending drafts
        order: f.order,
        createdAt: now,
        updatedAt: now,
      };
    });

    await filesCol.insertMany(copies);
  }

  return NextResponse.json({ id: newProjIdStr }, { status: 201 });
}
