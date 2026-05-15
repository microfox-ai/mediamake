import { NextRequest, NextResponse } from 'next/server';
import {
  projectsCol,
  projectFilesCol,
  chatSessionsCol,
  projectAgentsCol,
  vcsBranchesCol,
  vcsCommitsCol,
  vcsCommitFilesCol,
  vcsFileHeadsCol,
  wordGenerationsCol,
  projectCommentsCol,
  isValidId,
  toObjectId,
  hasAccess,
  serialize,
} from '@/lib/db/collections';

/**
 * GET /api/projects/[projectId]/backup
 *
 * Streams a single JSON file (`.wpkg`) containing everything needed to
 * reconstruct this project on import: project metadata, all files (with
 * drafts), chat sessions, agents, VCS branches/commits/commit-files/file-heads,
 * comments, and word generations.
 *
 * Ephemeral artifacts (project_exports, continuity_reports) are intentionally
 * excluded — they regenerate naturally and would bloat the archive.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isValidId(projectId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const projects = await projectsCol();
  const project = await projects.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [
    files,
    chats,
    agents,
    branches,
    commits,
    commitFiles,
    fileHeads,
    comments,
    words,
  ] = await Promise.all([
    (await projectFilesCol()).find({ projectId }).toArray(),
    (await chatSessionsCol()).find({ projectId }).toArray(),
    (await projectAgentsCol()).find({ projectId }).toArray(),
    (await vcsBranchesCol()).find({ projectId }).toArray(),
    (await vcsCommitsCol()).find({ projectId }).toArray(),
    (await vcsCommitFilesCol()).find({ projectId }).toArray(),
    (await vcsFileHeadsCol()).find({ projectId }).toArray(),
    (await projectCommentsCol()).find({ projectId }).toArray(),
    (await wordGenerationsCol()).find({ projectId }).toArray(),
  ]);

  const backup = {
    kind: 'writepad-project-backup' as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    exportedBy: clientId,
    project: serialize(project),
    files: files.map(serialize),
    chats: chats.map(serialize),
    agents: agents.map(serialize),
    vcs: {
      branches: branches.map(serialize),
      commits: commits.map(serialize),
      commitFiles: commitFiles.map(serialize),
      fileHeads: fileHeads.map(serialize),
    },
    comments: comments.map(serialize),
    words: words.map(serialize),
  };

  const safeName = (project.name || 'project').replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60);
  const filename = `${safeName}.wpkg`;
  const json = JSON.stringify(backup);

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
