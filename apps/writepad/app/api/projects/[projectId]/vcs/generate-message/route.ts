import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
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

interface FileDelta {
  fileId: string;
  fileName: string;
  status: 'untracked' | 'modified' | 'deleted';
  before: string;
  after: string;
}

function summarizeChange(delta: FileDelta): string {
  // For new files show the full content so the model understands what was added.
  // For modifications cap both sides to avoid overwhelming the context.
  const beforeCap = delta.status === 'untracked' ? 0 : 2000;
  const afterCap = delta.status === 'deleted' ? 0 : 2000;
  const before = delta.before.slice(0, beforeCap);
  const after = delta.after.slice(0, afterCap);
  return [
    `File: ${delta.fileName} [${delta.status}]`,
    delta.status !== 'deleted' ? `Content:\n${after || '(empty)'}` : `Deleted content:\n${before || '(empty)'}`,
    delta.status === 'modified' && before ? `Previous content:\n${before}` : '',
  ].filter(Boolean).join('\n');
}

/** POST /api/projects/[projectId]/vcs/generate-message */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const clientId = requireClientId(req);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureVcsIndexes();
  const project = await guardProject(projectId, clientId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  interface FileInput {
    fileId: string;
    name?: string;
    type?: 'file' | 'folder';
    parentId?: string | null;
    content?: string;
    order?: number;
    deleted?: boolean;
  }

  const body = await req.json() as { branchName?: string; fileIds?: string[]; files?: FileInput[] };
  const branchName = body.branchName?.trim() || 'main';

  // Derive requested file IDs from whichever source was provided
  const requested = body.files?.length
    ? [...new Set(body.files.map((f) => f.fileId).filter(Boolean))]
    : [...new Set((body.fileIds ?? []).filter(Boolean))];
  if (requested.length === 0) {
    return NextResponse.json({ error: 'fileIds or files are required' }, { status: 400 });
  }

  await ensureMainBranch(projectId, clientId);
  const branch = await getBranch(projectId, branchName);
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

  const headSnapshot = await getBranchSnapshot(projectId, branchName);

  // Build current snapshot: use client-provided files if present (avoids shared DB read),
  // otherwise fall back to project_files (backward compat for callers that don't send files).
  type SnapEntry = { fileId: string; name: string; type: 'file' | 'folder'; parentId: string | null; content: string; order: number };
  let currentSnapshot: Map<string, SnapEntry>;
  if (body.files?.length) {
    currentSnapshot = new Map(
      body.files
        .filter((f) => !f.deleted && f.type !== 'folder')
        .map((f) => [f.fileId, {
          fileId: f.fileId,
          name: f.name ?? '',
          type: (f.type ?? 'file') as 'file' | 'folder',
          parentId: f.parentId ?? null,
          content: f.content ?? '',
          order: f.order ?? 0,
        }]),
    );
  } else {
    const currentFiles = await (await projectFilesCol()).find({ projectId }).toArray();
    currentSnapshot = new Map(
      currentFiles
        .map((f) => snapshotFromFileEffective(f))
        .filter((s) => s.type === 'file')
        .map((s) => [s.fileId, s as SnapEntry]),
    );
  }

  const deltas: FileDelta[] = [];
  for (const fileId of requested) {
    const head = headSnapshot.get(fileId) ?? null;
    const current = currentSnapshot.get(fileId) ?? null;
    const headFile = head?.type === 'file' ? head : null;
    const currentFile = current?.type === 'file' ? current : null;
    if (!headFile && !currentFile) continue;
    if (!headFile && currentFile) {
      deltas.push({
        fileId,
        fileName: currentFile.name,
        status: 'untracked',
        before: '',
        after: currentFile.content,
      });
      continue;
    }
    if (headFile && !currentFile) {
      deltas.push({
        fileId,
        fileName: headFile.name,
        status: 'deleted',
        before: headFile.content,
        after: '',
      });
      continue;
    }
    if (headFile && currentFile) {
      deltas.push({
        fileId,
        fileName: currentFile.name,
        status: 'modified',
        before: headFile.content,
        after: currentFile.content,
      });
    }
  }

  if (deltas.length === 0) {
    return NextResponse.json({ error: 'No selected file changes found' }, { status: 400 });
  }

  const changesText = deltas.map(summarizeChange).join('\n\n---\n\n');
  const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    temperature: 0.3,
    maxOutputTokens: 200,
    prompt: `You write git commit messages for a writing/document app called Writepad.

Rules:
- Output ONE commit message line only — no quotes, no markdown, no explanation
- Start with an imperative verb (Add, Update, Fix, Remove, Refactor, etc.)
- After the verb, describe WHAT specifically changed and its PURPOSE if clear from the content
- For new files: describe what the file is FOR, not just "Add <filename>" — e.g. "Add project rules and initial notes for onboarding"
- For multiple files: summarise the overall intent across all of them
- Keep the message under 100 characters but write the COMPLETE thought — never cut off mid-sentence

Files changed (${deltas.length}):
${changesText}`,
  });

  return NextResponse.json({ message: text.trim() });
}
