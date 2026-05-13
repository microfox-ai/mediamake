import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
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
  type DbProjectFile,
  type DbChatSession,
  type DbProjectAgent,
  type DbVcsBranch,
  type DbVcsCommit,
  type DbVcsCommitFile,
  type DbVcsFileHead,
  type DbProjectComment,
  type DbWordGeneration,
} from '@/lib/db/collections';

/** Maximum decoded backup size — 50 MB. Protects against runaway uploads. */
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

interface BackupShape {
  kind: string;
  version: number;
  project: {
    name?: string;
    description?: string;
    type?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  files: Array<{
    id: string;
    name: string;
    type: 'file' | 'folder';
    parentId: string | null;
    content: string;
    draft?: string | null;
    order: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
  chats: Array<{
    id: string;
    title: string;
    messages: unknown[];
    messageMeta: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    prompt: string;
    baseAgentId?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  vcs?: {
    branches: Array<{
      id: string;
      name: string;
      headCommitId: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
    commits: Array<{
      id: string;
      branchName: string;
      message: string;
      authorClientId: string;
      parentCommitId: string | null;
      mergeParentCommitId: string | null;
      createdAt?: string;
    }>;
    commitFiles: Array<{
      id: string;
      commitId: string;
      fileId: string;
      changeType: 'add' | 'modify' | 'delete' | 'rename';
      snapshot: DbVcsCommitFile['snapshot'];
      previousFileId: string | null;
      createdAt?: string;
    }>;
    fileHeads: Array<{
      id: string;
      branchName: string;
      fileId: string;
      lastCommitId: string;
      deleted: boolean;
      updatedAt?: string;
    }>;
  };
  comments?: Array<{
    id: string;
    fileId: string;
    authorId: string;
    text: string;
    lineNumber: number;
    lineContent: string;
    status: 'open' | 'resolved' | 'dismissed';
    createdAt?: string;
    updatedAt?: string;
  }>;
  words?: Array<{
    id: string;
    userId: string;
    word: string;
    files: Array<{ fileId: string; filePath: string }>;
    entries: Array<{
      helperType: string;
      suggestions: string[];
      chosenSuggestion: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

function toDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

/**
 * POST /api/projects/import
 *
 * Body: a `.wpkg` JSON document produced by GET /api/projects/[projectId]/backup.
 * Creates a brand-new project owned by the caller; all internal IDs are
 * remapped so the new project is fully decoupled from the source.
 *
 * Returns: { id: string } — the new projectId.
 */
export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BACKUP_BYTES) {
    return NextResponse.json({ error: 'Backup too large' }, { status: 413 });
  }

  let backup: BackupShape;
  try {
    backup = (await req.json()) as BackupShape;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (backup?.kind !== 'writepad-project-backup' || typeof backup.version !== 'number') {
    return NextResponse.json({ error: 'Not a Writepad backup file' }, { status: 400 });
  }
  if (backup.version !== 1) {
    return NextResponse.json(
      { error: `Unsupported backup version: ${backup.version}` },
      { status: 400 },
    );
  }
  if (!backup.project || typeof backup.project !== 'object') {
    return NextResponse.json({ error: 'Backup missing project metadata' }, { status: 400 });
  }

  const now = new Date();
  const newProjectId = new ObjectId();
  const newProjectIdStr = newProjectId.toHexString();

  // ── Project ────────────────────────────────────────────────────────────────
  const projects = await projectsCol();
  await projects.insertOne({
    _id: newProjectId,
    name: backup.project.name?.trim() ? `${backup.project.name} (imported)` : 'Imported project',
    description: backup.project.description ?? '',
    type: backup.project.type ?? 'other',
    ownerId: clientId,
    members: [],
    createdAt: now,
    updatedAt: now,
  });

  // ── Files (remap fileId + parentId) ────────────────────────────────────────
  const fileIdMap = new Map<string, string>();
  for (const f of backup.files ?? []) fileIdMap.set(f.id, new ObjectId().toHexString());

  if (backup.files?.length) {
    const docs: DbProjectFile[] = backup.files.map((f) => ({
      _id: new ObjectId(fileIdMap.get(f.id)!),
      projectId: newProjectIdStr,
      name: f.name,
      type: f.type,
      parentId: f.parentId ? (fileIdMap.get(f.parentId) ?? null) : null,
      content: f.content ?? '',
      draft: f.draft ?? null,
      order: f.order ?? 0,
      createdAt: toDate(f.createdAt, now),
      updatedAt: toDate(f.updatedAt, now),
    }));
    await (await projectFilesCol()).insertMany(docs);
  }

  // ── Agents ─────────────────────────────────────────────────────────────────
  if (backup.agents?.length) {
    const docs: DbProjectAgent[] = backup.agents.map((a) => ({
      _id: new ObjectId(),
      projectId: newProjectIdStr,
      name: a.name,
      prompt: a.prompt,
      baseAgentId: a.baseAgentId,
      createdBy: clientId,
      createdAt: toDate(a.createdAt, now),
      updatedAt: toDate(a.updatedAt, now),
    }));
    await (await projectAgentsCol()).insertMany(docs);
  }

  // ── Chats ──────────────────────────────────────────────────────────────────
  if (backup.chats?.length) {
    const docs: DbChatSession[] = backup.chats.map((c) => ({
      _id: new ObjectId(),
      projectId: newProjectIdStr,
      userId: clientId,
      title: c.title,
      messages: c.messages ?? [],
      messageMeta: c.messageMeta ?? {},
      createdAt: toDate(c.createdAt, now),
      updatedAt: toDate(c.updatedAt, now),
    }));
    await (await chatSessionsCol()).insertMany(docs);
  }

  // ── VCS: branches → commits → commitFiles → fileHeads ──────────────────────
  const commitIdMap = new Map<string, string>();
  if (backup.vcs) {
    for (const c of backup.vcs.commits ?? []) commitIdMap.set(c.id, new ObjectId().toHexString());

    if (backup.vcs.branches?.length) {
      const docs: DbVcsBranch[] = backup.vcs.branches.map((b) => ({
        _id: new ObjectId(),
        projectId: newProjectIdStr,
        name: b.name,
        headCommitId: b.headCommitId ? (commitIdMap.get(b.headCommitId) ?? null) : null,
        createdBy: clientId,
        createdAt: toDate(b.createdAt, now),
        updatedAt: toDate(b.updatedAt, now),
      }));
      await (await vcsBranchesCol()).insertMany(docs);
    }

    if (backup.vcs.commits?.length) {
      const docs: DbVcsCommit[] = backup.vcs.commits.map((c) => ({
        _id: new ObjectId(commitIdMap.get(c.id)!),
        projectId: newProjectIdStr,
        branchName: c.branchName,
        message: c.message,
        authorClientId: clientId,
        parentCommitId: c.parentCommitId ? (commitIdMap.get(c.parentCommitId) ?? null) : null,
        mergeParentCommitId: c.mergeParentCommitId
          ? (commitIdMap.get(c.mergeParentCommitId) ?? null)
          : null,
        createdAt: toDate(c.createdAt, now),
      }));
      await (await vcsCommitsCol()).insertMany(docs);
    }

    if (backup.vcs.commitFiles?.length) {
      const docs: DbVcsCommitFile[] = backup.vcs.commitFiles
        .filter((cf) => commitIdMap.has(cf.commitId))
        .map((cf) => {
          const remappedFileId = fileIdMap.get(cf.fileId) ?? cf.fileId;
          const remappedPrevId = cf.previousFileId
            ? (fileIdMap.get(cf.previousFileId) ?? cf.previousFileId)
            : null;
          const snapshot = cf.snapshot
            ? {
                ...cf.snapshot,
                fileId: fileIdMap.get(cf.snapshot.fileId) ?? cf.snapshot.fileId,
                parentId: cf.snapshot.parentId
                  ? (fileIdMap.get(cf.snapshot.parentId) ?? cf.snapshot.parentId)
                  : null,
              }
            : null;
          return {
            _id: new ObjectId(),
            commitId: commitIdMap.get(cf.commitId)!,
            projectId: newProjectIdStr,
            fileId: remappedFileId,
            changeType: cf.changeType,
            snapshot,
            previousFileId: remappedPrevId,
            createdAt: toDate(cf.createdAt, now),
          };
        });
      if (docs.length > 0) await (await vcsCommitFilesCol()).insertMany(docs);
    }

    if (backup.vcs.fileHeads?.length) {
      const docs: DbVcsFileHead[] = backup.vcs.fileHeads
        .filter((h) => commitIdMap.has(h.lastCommitId))
        .map((h) => ({
          _id: new ObjectId(),
          projectId: newProjectIdStr,
          branchName: h.branchName,
          fileId: fileIdMap.get(h.fileId) ?? h.fileId,
          lastCommitId: commitIdMap.get(h.lastCommitId)!,
          deleted: !!h.deleted,
          updatedAt: toDate(h.updatedAt, now),
        }));
      if (docs.length > 0) await (await vcsFileHeadsCol()).insertMany(docs);
    }
  }

  // ── Comments ───────────────────────────────────────────────────────────────
  if (backup.comments?.length) {
    const docs: DbProjectComment[] = backup.comments
      .filter((c) => fileIdMap.has(c.fileId))
      .map((c) => ({
        _id: new ObjectId(),
        projectId: newProjectIdStr,
        fileId: fileIdMap.get(c.fileId)!,
        authorId: clientId,
        text: c.text,
        lineNumber: c.lineNumber,
        lineContent: c.lineContent,
        status: c.status,
        createdAt: toDate(c.createdAt, now),
        updatedAt: toDate(c.updatedAt, now),
      }));
    if (docs.length > 0) await (await projectCommentsCol()).insertMany(docs);
  }

  // ── Word generations ───────────────────────────────────────────────────────
  if (backup.words?.length) {
    const docs: DbWordGeneration[] = backup.words.map((w) => ({
      _id: new ObjectId(),
      projectId: newProjectIdStr,
      userId: clientId,
      word: w.word,
      files: (w.files ?? []).map((wf) => ({
        fileId: fileIdMap.get(wf.fileId) ?? wf.fileId,
        filePath: wf.filePath,
      })),
      entries: (w.entries ?? []).map((e) => ({
        helperType: e.helperType,
        suggestions: e.suggestions ?? [],
        chosenSuggestion: e.chosenSuggestion ?? null,
        createdAt: toDate(e.createdAt, now),
        updatedAt: toDate(e.updatedAt, now),
      })),
      createdAt: toDate(w.createdAt, now),
      updatedAt: toDate(w.updatedAt, now),
    }));
    await (await wordGenerationsCol()).insertMany(docs);
  }

  return NextResponse.json({ id: newProjectIdStr }, { status: 201 });
}
