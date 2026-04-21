import { NextRequest } from 'next/server';
import { ObjectId, type ClientSession, type WithId } from 'mongodb';
import { clientPromise } from '@/lib/db/mongodb';
import {
  canEditProject,
  hasAccess,
  isValidId,
  projectFilesCol,
  projectsCol,
  serialize,
  toObjectId,
  type DbProject,
  type DbProjectFile,
  type DbVcsBranch,
  type DbVcsCommitFile,
  type DbVcsFileHead,
  type VcsFileSnapshot,
  vcsBranchesCol,
  vcsCommitFilesCol,
  vcsCommitsCol,
  vcsFileHeadsCol,
} from '@/lib/db/collections';

let indexesEnsured = false;

export class VcsTransactionUnavailableError extends Error {
  constructor() {
    super('Mongo transactions are unavailable in this environment.');
  }
}

export async function withVcsTransaction<T>(
  run: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const client = await clientPromise;
  const session = client.startSession();
  try {
    return await session.withTransaction(() => run(session));
  } catch (error) {
    const message = String(error);
    if (
      message.includes('Transaction numbers are only allowed') ||
      message.includes('replica set') ||
      message.includes('not supported')
    ) {
      throw new VcsTransactionUnavailableError();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function ensureVcsIndexes() {
  if (indexesEnsured) return;
  const [branches, commits, commitFiles, heads] = await Promise.all([
    vcsBranchesCol(),
    vcsCommitsCol(),
    vcsCommitFilesCol(),
    vcsFileHeadsCol(),
  ]);
  await Promise.all([
    branches.createIndex({ projectId: 1, name: 1 }, { unique: true }),
    commits.createIndex({ projectId: 1, branchName: 1, createdAt: -1 }),
    commitFiles.createIndex({ commitId: 1 }),
    commitFiles.createIndex({ projectId: 1, fileId: 1, commitId: 1 }),
    heads.createIndex({ projectId: 1, branchName: 1, fileId: 1 }, { unique: true }),
  ]);
  indexesEnsured = true;
}

export async function guardProject(projectId: string, clientId: string): Promise<DbProject | null> {
  if (!isValidId(projectId)) return null;
  const col = await projectsCol();
  const project = await col.findOne({ _id: toObjectId(projectId) });
  if (!project || !hasAccess(project, clientId)) return null;
  return project;
}

export function assertCanEdit(project: DbProject, clientId: string): boolean {
  return canEditProject(project, clientId);
}

export async function ensureMainBranch(projectId: string, clientId: string, session?: ClientSession) {
  const col = await vcsBranchesCol();
  const existing = await col.findOne({ projectId, name: 'main' });
  if (existing) return existing;
  const now = new Date();
  const created: DbVcsBranch = {
    _id: new ObjectId(),
    projectId,
    name: 'main',
    headCommitId: null,
    createdBy: clientId,
    createdAt: now,
    updatedAt: now,
  };
  await col.updateOne(
    { projectId, name: 'main' },
    { $setOnInsert: created },
    { upsert: true, ...(session ? { session } : {}) },
  );
  return (await col.findOne({ projectId, name: 'main' }))!;
}

export async function getBranch(projectId: string, branchName: string) {
  const col = await vcsBranchesCol();
  return col.findOne({ projectId, name: branchName });
}

export async function getBranchHeads(projectId: string, branchName: string): Promise<DbVcsFileHead[]> {
  const col = await vcsFileHeadsCol();
  return col.find({ projectId, branchName }).toArray();
}

function pairKey(commitId: string, fileId: string) {
  return `${commitId}:${fileId}`;
}

export async function loadHeadSnapshots(heads: DbVcsFileHead[]): Promise<Map<string, VcsFileSnapshot | null>> {
  const out = new Map<string, VcsFileSnapshot | null>();
  if (heads.length === 0) return out;
  const commitIds = [...new Set(heads.map((h) => h.lastCommitId))];
  const fileIds = [...new Set(heads.map((h) => h.fileId))];
  const commitFiles = await (await vcsCommitFilesCol())
    .find({
      commitId: { $in: commitIds },
      fileId: { $in: fileIds },
    })
    .toArray();
  const byPair = new Map<string, DbVcsCommitFile>();
  for (const cf of commitFiles) byPair.set(pairKey(cf.commitId, cf.fileId), cf);
  for (const head of heads) {
    const cf = byPair.get(pairKey(head.lastCommitId, head.fileId));
    out.set(head.fileId, head.deleted ? null : (cf?.snapshot ?? null));
  }
  return out;
}

export async function getBranchSnapshot(projectId: string, branchName: string) {
  const heads = await getBranchHeads(projectId, branchName);
  return loadHeadSnapshots(heads);
}

export function snapshotFromFile(file: DbProjectFile): VcsFileSnapshot {
  return {
    fileId: file._id.toHexString(),
    name: file.name,
    type: file.type,
    parentId: file.parentId,
    content: file.content,
    order: file.order,
  };
}

/**
 * Like snapshotFromFile but uses the draft content when present.
 * This is what the VCS should use for status checks and commits so that
 * draft (AI-edited / manually staged) changes appear as pending modifications
 * and can be committed directly — flushing draft → content in the process.
 */
export function snapshotFromFileEffective(file: DbProjectFile): VcsFileSnapshot {
  return {
    fileId: file._id.toHexString(),
    name: file.name,
    type: file.type,
    parentId: file.parentId,
    // Use draft when it's non-null AND non-empty. An empty-string draft is treated
    // as "no draft" to avoid accidentally committing blank content caused by AI
    // edits that produced empty output.
    content: file.draft || file.content,
    order: file.order,
  };
}

export async function applySnapshotToProjectFiles(
  projectId: string,
  snapshotsByFile: Map<string, VcsFileSnapshot | null>,
  session?: ClientSession,
) {
  const col = await projectFilesCol();
  const existing = await col.find({ projectId }, { ...(session ? { session } : {}) }).toArray();
  const existingIds = new Set(existing.map((f) => f._id.toHexString()));
  const now = new Date();

  // Only delete files explicitly marked as null (deleted) in the snapshot.
  // Files not present in the snapshot at all are preserved (untracked files survive checkout/merge/revert).
  const toDelete = [...existingIds].filter(
    (id) => snapshotsByFile.has(id) && snapshotsByFile.get(id) === null,
  );
  if (toDelete.length > 0) {
    await col.deleteMany(
      { projectId, _id: { $in: toDelete.map((id) => toObjectId(id)) } },
      { ...(session ? { session } : {}) },
    );
  }

  for (const [fileId, snapshot] of snapshotsByFile.entries()) {
    if (!snapshot) continue;
    await col.updateOne(
      { _id: toObjectId(fileId), projectId },
      {
        $set: {
          name: snapshot.name,
          type: snapshot.type,
          parentId: snapshot.parentId,
          content: snapshot.content,
          draft: null,
          order: snapshot.order,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: toObjectId(fileId),
          projectId,
          createdAt: now,
        },
      },
      { upsert: true, ...(session ? { session } : {}) },
    );
  }
}

export async function listProjectFilesByIds(projectId: string, fileIds: string[]) {
  const validIds = fileIds.filter(isValidId).map(toObjectId);
  if (validIds.length === 0) return [];
  const col = await projectFilesCol();
  return col.find({ projectId, _id: { $in: validIds } }).toArray();
}

export function serializeBranch(branch: WithId<DbVcsBranch>) {
  return serialize(branch);
}

/**
 * Build a memoised path resolver that returns the full slash-separated path for a node.
 * Cycles in the parent chain are detected and return null.
 */
export function buildPathResolver(
  getNode: (id: string) => VcsFileSnapshot | null,
) {
  const memo = new Map<string, string | null>();
  const walk = (id: string, seen = new Set<string>()): string | null => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return null; // cycle guard
    seen.add(id);
    const node = getNode(id);
    if (!node) { memo.set(id, null); return null; }
    if (!node.parentId) { memo.set(id, node.name); return node.name; }
    const parentPath = walk(node.parentId, seen);
    const resolved = parentPath ? `${parentPath}/${node.name}` : node.name;
    memo.set(id, resolved);
    return resolved;
  };
  return walk;
}

export function requireClientId(req: NextRequest) {
  return req.headers.get('x-client-id');
}

/**
 * Find the lowest common ancestor (LCA) commit of two branch heads using BFS.
 * Follows both parentCommitId and mergeParentCommitId chains.
 * Returns null if the branches have no common ancestor (unrelated histories).
 */
export async function findCommonAncestor(
  projectId: string,
  sourceHeadId: string | null,
  targetHeadId: string | null,
): Promise<string | null> {
  if (!sourceHeadId || !targetHeadId) return null;
  if (sourceHeadId === targetHeadId) return sourceHeadId;

  const col = await vcsCommitsCol();

  // BFS: collect all commits reachable from source
  const sourceAncestors = new Set<string>();
  let sourceFrontier: string[] = [sourceHeadId];
  while (sourceFrontier.length > 0) {
    const batch = sourceFrontier.filter((id) => !sourceAncestors.has(id));
    if (batch.length === 0) break;
    for (const id of batch) sourceAncestors.add(id);
    const commits = await col
      .find({ projectId, _id: { $in: batch.map(toObjectId) } })
      .toArray();
    sourceFrontier = [];
    for (const c of commits) {
      if (c.parentCommitId && !sourceAncestors.has(c.parentCommitId))
        sourceFrontier.push(c.parentCommitId);
      if (c.mergeParentCommitId && !sourceAncestors.has(c.mergeParentCommitId))
        sourceFrontier.push(c.mergeParentCommitId);
    }
  }

  // BFS from target: find the first commit that's also in source ancestors
  const targetVisited = new Set<string>();
  let targetFrontier: string[] = [targetHeadId];
  while (targetFrontier.length > 0) {
    const batch = targetFrontier.filter((id) => !targetVisited.has(id));
    if (batch.length === 0) break;
    // Check if any in this batch is a common ancestor (process closest first)
    for (const id of batch) {
      if (sourceAncestors.has(id)) return id;
    }
    for (const id of batch) targetVisited.add(id);
    const commits = await col
      .find({ projectId, _id: { $in: batch.map(toObjectId) } })
      .toArray();
    targetFrontier = [];
    for (const c of commits) {
      if (c.parentCommitId && !targetVisited.has(c.parentCommitId))
        targetFrontier.push(c.parentCommitId);
      if (c.mergeParentCommitId && !targetVisited.has(c.mergeParentCommitId))
        targetFrontier.push(c.mergeParentCommitId);
    }
  }

  return null;
}

/**
 * Find the state of a single file at a given commit by walking the commit graph
 * backward. More efficient than getSnapshotAtCommit for single-file lookups.
 *
 * Returns:
 *   { found: true,  snapshot: VcsFileSnapshot } — file existed at this point
 *   { found: true,  snapshot: null }            — file was deleted at this point
 *   { found: false, snapshot: null }            — file was never tracked here
 */
export async function getFileSnapshotAtCommit(
  projectId: string,
  fileId: string,
  commitId: string,
): Promise<{ found: boolean; snapshot: VcsFileSnapshot | null }> {
  const commitsCol = await vcsCommitsCol();
  const cfCol = await vcsCommitFilesCol();

  const visited = new Set<string>();
  let frontier: string[] = [commitId];

  while (frontier.length > 0) {
    const batch = frontier.filter((id) => !visited.has(id));
    if (batch.length === 0) break;
    for (const id of batch) visited.add(id);

    // Look for this specific file in any commit within the batch
    const hit = await cfCol.findOne({ projectId, fileId, commitId: { $in: batch } });
    if (hit) return { found: true, snapshot: hit.snapshot };

    // Follow parent + merge-parent chains
    const commits = await commitsCol
      .find({ projectId, _id: { $in: batch.map(toObjectId) } })
      .toArray();
    frontier = [];
    for (const c of commits) {
      if (c.parentCommitId && !visited.has(c.parentCommitId))
        frontier.push(c.parentCommitId);
      if (c.mergeParentCommitId && !visited.has(c.mergeParentCommitId))
        frontier.push(c.mergeParentCommitId);
    }
  }

  return { found: false, snapshot: null };
}

/**
 * Reconstruct the full file snapshot at a specific commit by walking backward
 * through the commit graph. Returns a map of fileId → snapshot (null = deleted).
 * Files not present were never tracked up to that point.
 */
export async function getSnapshotAtCommit(
  projectId: string,
  commitId: string,
): Promise<Map<string, VcsFileSnapshot | null>> {
  const result = new Map<string, VcsFileSnapshot | null>();
  const visited = new Set<string>();
  let frontier: string[] = [commitId];
  const col = await vcsCommitsCol();
  const cfCol = await vcsCommitFilesCol();

  while (frontier.length > 0) {
    const batch = frontier.filter((id) => !visited.has(id));
    if (batch.length === 0) break;
    for (const id of batch) visited.add(id);

    // Load all commit files for this batch in one query
    const files = await cfCol.find({ projectId, commitId: { $in: batch } }).toArray();
    for (const file of files) {
      // Walking backward: first appearance = most recent state at or before this commit
      if (!result.has(file.fileId)) {
        result.set(file.fileId, file.snapshot);
      }
    }

    // Load commits to find parents (for next iteration)
    const commits = await col
      .find({ projectId, _id: { $in: batch.map(toObjectId) } })
      .toArray();
    frontier = [];
    for (const c of commits) {
      if (c.parentCommitId && !visited.has(c.parentCommitId))
        frontier.push(c.parentCommitId);
      if (c.mergeParentCommitId && !visited.has(c.mergeParentCommitId))
        frontier.push(c.mergeParentCommitId);
    }
  }

  return result;
}
