import { NextRequest, NextResponse } from 'next/server';
import { projectFilesCol } from '@/lib/db/collections';
import {
  ensureMainBranch,
  ensureVcsIndexes,
  getBranch,
  getBranchSnapshot,
  guardProject,
  requireClientId,
  snapshotFromFileEffective,
} from '../_lib';

type VcsStatusKind = 'untracked' | 'modified' | 'deleted';

interface VcsStatusEntry {
  fileId: string;
  fileName: string;
  status: VcsStatusKind;
}

function sameSnapshot(
  a: ReturnType<typeof snapshotFromFileEffective> | null,
  b: ReturnType<typeof snapshotFromFileEffective> | null,
) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.type === b.type &&
    a.parentId === b.parentId &&
    a.content === b.content
  );
}

/** GET /api/projects/[projectId]/vcs/status?branch=main */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const branchName = req.nextUrl.searchParams.get('branch')?.trim() || 'main';
  await ensureMainBranch(projectId, clientId);
  const branch = await getBranch(projectId, branchName);
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

  const [headSnapshot, currentFiles] = await Promise.all([
    getBranchSnapshot(projectId, branchName),
    (await projectFilesCol()).find({ projectId }).toArray(),
  ]);

  // Use snapshotFromFileEffective so files with a pending draft (AI edits or manual
  // stage) appear in the status list — the draft is the "current working state".
  const currentSnapshot = new Map(currentFiles.map((f) => [f._id.toHexString(), snapshotFromFileEffective(f)]));
  const allIds = new Set<string>([...headSnapshot.keys(), ...currentSnapshot.keys()]);
  const entries: VcsStatusEntry[] = [];

  // Note: we intentionally do NOT do a full path comparison here (e.g. resolving
  // ancestor folder names). Folders are never committed, so their names would never
  // appear in headSnapshot, causing false "modified" results for every file inside
  // an uncommitted folder. The parentId field in sameSnapshot already captures any
  // direct parent change — path-through-ancestors is not tracked by this VCS.
  for (const fileId of allIds) {
    const head = headSnapshot.has(fileId) ? (headSnapshot.get(fileId) ?? null) : null;
    const current = currentSnapshot.has(fileId) ? (currentSnapshot.get(fileId) ?? null) : null;
    const headFile = head?.type === 'file' ? head : null;
    const currentFile = current?.type === 'file' ? current : null;
    if (!headFile && !currentFile) continue;

    if (sameSnapshot(headFile, currentFile)) continue;

    if (!headFile && currentFile) {
      entries.push({ fileId, fileName: currentFile.name, status: 'untracked' });
      continue;
    }
    if (headFile && !currentFile) {
      entries.push({ fileId, fileName: headFile.name, status: 'deleted' });
      continue;
    }
    if (headFile && currentFile) {
      entries.push({ fileId, fileName: currentFile.name, status: 'modified' });
    }
  }

  entries.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return NextResponse.json({
    branchName,
    entries,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
