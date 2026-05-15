'use client';

import { create } from 'zustand';
import type { LocalCommit, LocalBranchMeta } from '@/lib/localRepo';
import {
  saveLocalCommit,
  clearLocalCommits,
  loadLocalCommits,
  loadPulledHead,
  savePulledHead,
  saveLocalBranch,
  loadLocalBranch,
  loadAllLocalBranches,
  deleteLocalBranch,
} from '@/lib/localRepo';

// Re-export so consumers can import these types from here
export type { LocalCommit, LocalBranchMeta } from '@/lib/localRepo';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface VcsBranch {
  id: string;
  projectId: string;
  name: string;
  headCommitId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Client-side flag — true for branches that exist only locally (not yet pushed). */
  isLocalOnly?: boolean;
}

export interface VcsCommit {
  id: string;
  projectId: string;
  branchName: string;
  message: string;
  authorClientId: string;
  parentCommitId: string | null;
  mergeParentCommitId: string | null;
  createdAt: string;
}

export interface VcsFileSnapshot {
  fileId: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content: string;
  order: number;
}

export interface VcsCommitFile {
  id: string;
  commitId: string;
  projectId: string;
  fileId: string;
  changeType: 'add' | 'modify' | 'delete' | 'rename';
  snapshot: VcsFileSnapshot | null;
  previousFileId: string | null;
  createdAt: string;
}

export interface VcsStatusEntry {
  fileId: string;
  fileName: string;
  status: 'untracked' | 'modified' | 'deleted';
}

export interface VcsFileHistoryEntry extends VcsCommitFile {
  commit: VcsCommit | null;
}

export interface MergePreviewData {
  sourceBranch: string;
  targetBranch: string;
  autoMergedFiles: Array<{ fileId: string; source: VcsFileSnapshot | null; target: VcsFileSnapshot | null }>;
  conflicts: Array<{ fileId: string; source: VcsFileSnapshot | null; target: VcsFileSnapshot | null }>;
  alreadyUpToDate: boolean;
}

/**
 * A snapshot of a single file sent by the client when creating a commit.
 * The server uses this content directly — it does NOT read from project_files.
 */
export interface VcsFileSnapshotForCommit {
  fileId: string;
  name?: string;
  type?: 'file' | 'folder';
  parentId?: string | null;
  content?: string;
  order?: number;
  /** true → commit this file as a deletion (no content needed). */
  deleted?: boolean;
}

// ─── Fetch / Pull types ───────────────────────────────────────────────────────

export type HeadSnapshotArray = Array<{ fileId: string; snapshot: VcsFileSnapshot | null }>;

export interface FetchPreviewEntry {
  fileId: string;
  fileName: string;
  kind: 'added' | 'modified' | 'deleted';
  serverSnapshot: VcsFileSnapshot | null;
  pulledSnapshot: VcsFileSnapshot | null;
  hasLocalChanges: boolean;
}

export interface PullFileUpdate {
  fileId: string;
  snapshot: VcsFileSnapshot | null;
}

// ─── Loading state ─────────────────────────────────────────────────────────────

type OpKey = 'panel' | 'status' | 'commits' | 'action' | 'generate' | 'fileHistory' | 'fetch' | 'pull' | 'push' | 'commitDetail' | 'revertPreview';

// ─── Store ────────────────────────────────────────────────────────────────────

interface VcsStore {
  projectId: string | null;
  ops: Set<OpKey>;
  error: string | null;

  branches: VcsBranch[];
  currentBranch: string;
  commits: VcsCommit[];
  commitsPage: number;
  commitsHasMore: boolean;
  statusEntries: VcsStatusEntry[];
  headSnapshot: HeadSnapshotArray | null;
  pulledHead: HeadSnapshotArray | null;
  localCommits: LocalCommit[];
  localHead: HeadSnapshotArray | null;
  fetchPreview: FetchPreviewEntry[] | null;
  lastFetchedAt: string | null;
  lastPulledAt: string | null;
  activeCommitChanges: VcsCommitFile[];
  mergePreview: MergePreviewData | null;

  /** Names of branches that exist only locally (not yet pushed to server). */
  localOnlyBranches: Set<string>;

  // Derived helpers
  isLoading: (key?: OpKey) => boolean;
  pendingPullCount: () => number;
  hasPendingPull: () => boolean;
  isBranchLocalOnly: (branchName: string) => boolean;

  // Lifecycle
  init: (projectId: string) => void;
  clearError: () => void;
  clearMergePreview: () => void;
  setActiveCommitChanges: (changes: VcsCommitFile[]) => void;
  setStatusEntries: (entries: VcsStatusEntry[]) => void;
  markPulled: () => void;
  loadLocalState: () => Promise<void>;
  /** Load local-only branch metadata from IDB. Call after refreshPanel. */
  loadLocalBranches: () => Promise<void>;

  // ── Batch data fetching ────────────────────────────────────────────────────
  refreshPanel: (branch?: string, page?: number) => Promise<void>;
  loadMoreCommits: () => Promise<void>;

  // ── Individual refreshes ──────────────────────────────────────────────────
  refreshStatus: (branch?: string) => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshCommits: (branch?: string) => Promise<void>;

  // ── Fetch / Pull ───────────────────────────────────────────────────────────
  fetch: (getLocalStatus: () => VcsStatusEntry[]) => Promise<void>;
  pull: (
    resolutions: Array<{ fileId: string; resolution: 'keepLocal' | 'takeServer' }>,
    onApplied: (updates: PullFileUpdate[]) => Promise<void>,
  ) => Promise<void>;

  /**
   * Push local commits (and the branch itself if local-only) to the server.
   * - If current branch is local-only: creates it on server first, then pushes commits.
   * - If current branch is a server branch: pushes accumulated local commits only.
   */
  push: (onPushed?: () => Promise<void>) => Promise<void>;

  // ── Branch operations ──────────────────────────────────────────────────────
  /**
   * Create a new branch locally (no server call).
   * The branch is stored in IDB and marked as local-only.
   * Local commits from the source branch are carried forward.
   * Call push() while on the new branch to publish it to the server.
   */
  createBranch: (name: string, sourceBranch: string) => Promise<void>;
  checkoutBranch: (
    branchName: string,
    onApplySnapshot: (snapshot: HeadSnapshotArray) => Promise<void>,
  ) => Promise<void>;

  // ── Commit ─────────────────────────────────────────────────────────────────
  commit: (
    message: string,
    files: VcsFileSnapshotForCommit[],
    onCommitted: () => Promise<void>,
  ) => Promise<void>;
  loadCommitDetail: (commitId: string) => Promise<VcsCommitFile[]>;

  // ── Merge ──────────────────────────────────────────────────────────────────
  /**
   * Preview a merge. If sourceBranch is local-only, the merge is computed
   * locally from IDB state without any server calls.
   */
  previewMerge: (sourceBranch: string, targetBranch: string) => Promise<void>;
  executeMerge: (
    sourceBranch: string,
    targetBranch: string,
    conflictResolutions: Array<{ fileId: string; resolution: 'useSource' | 'useTarget' }>,
    onApplySnapshot: (snapshot: HeadSnapshotArray) => Promise<void>,
  ) => Promise<void>;

  // ── Revert ─────────────────────────────────────────────────────────────────
  previewRevert: (
    commitId: string,
  ) => Promise<{
    toDelete: Array<{ fileId: string; name: string }>;
    toRestore: Array<{ fileId: string; name: string }>;
    toModify: Array<{ fileId: string; name: string }>;
    commitMessage: string;
  }>;
  revertCommit: (
    commitId: string,
    fileId: string | undefined,
    onApplySnapshot: (snapshot: HeadSnapshotArray) => Promise<void>,
  ) => Promise<void>;

  // ── Restore working directory ──────────────────────────────────────────────
  restoreFilesFromHead: (
    fileIds: string[],
    onApplied: (updates: PullFileUpdate[]) => Promise<void>,
  ) => Promise<void>;

  // ── Utilities ──────────────────────────────────────────────────────────────
  fileHistory: (fileId: string, limit?: number) => Promise<{ entries: VcsFileHistoryEntry[]; hasMore: boolean }>;
  generateCommitMessage: (files: VcsFileSnapshotForCommit[], branchName?: string) => Promise<string>;
  getHeadFileVersion: (fileId: string, branchName?: string) => Promise<{ fileId: string; branchName: string; snapshot: VcsFileSnapshot | null }>;
  getFileAtCommit: (fileId: string, commitId: string) => Promise<{ fileId: string; commitId: string; snapshot: VcsFileSnapshot | null; changeType: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function branchStorageKey(projectId: string) {
  return `writepad_vcs_branch_${projectId}`;
}

function readStoredBranch(projectId: string): string {
  try {
    return localStorage.getItem(branchStorageKey(projectId)) || 'main';
  } catch {
    return 'main';
  }
}

function persistBranch(projectId: string, branch: string) {
  try {
    localStorage.setItem(branchStorageKey(projectId), branch);
  } catch { /* ignore */ }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

/**
 * Apply local commits (oldest-first) on top of pulledHead to produce the
 * effective local HEAD.
 */
function computeLocalHead(
  pulledHead: HeadSnapshotArray,
  localCommits: LocalCommit[],
): HeadSnapshotArray {
  const map = new Map(pulledHead.map(({ fileId, snapshot }) => [fileId, snapshot]));

  for (const commit of localCommits) {
    for (const file of commit.files) {
      if (file.deleted) {
        map.set(file.fileId, null);
      } else {
        const existing = map.get(file.fileId) ?? null;
        map.set(file.fileId, {
          fileId: file.fileId,
          name: file.name ?? existing?.name ?? '',
          type: file.type ?? existing?.type ?? 'file',
          parentId: file.parentId !== undefined ? file.parentId : (existing?.parentId ?? null),
          content: file.content ?? existing?.content ?? '',
          order: file.order ?? existing?.order ?? 0,
        });
      }
    }
  }

  return Array.from(map.entries()).map(([fileId, snapshot]) => ({ fileId, snapshot }));
}

/** Compare two head snapshots and return entries that differ. */
function diffSnapshots(
  oldHead: HeadSnapshotArray,
  newHead: HeadSnapshotArray,
  localStatus: VcsStatusEntry[],
): FetchPreviewEntry[] {
  const oldMap = new Map(oldHead.map(({ fileId, snapshot }) => [fileId, snapshot]));
  const newMap = new Map(newHead.map(({ fileId, snapshot }) => [fileId, snapshot]));
  const locallyChanged = new Set(localStatus.map((e) => e.fileId));

  const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);
  const entries: FetchPreviewEntry[] = [];

  for (const fileId of allIds) {
    const oldSnap = oldMap.has(fileId) ? oldMap.get(fileId) ?? null : undefined;
    const newSnap = newMap.has(fileId) ? newMap.get(fileId) ?? null : undefined;

    if (oldSnap === undefined && newSnap === undefined) continue;

    if (oldSnap !== undefined && newSnap !== undefined) {
      if (oldSnap === null && newSnap === null) continue;
      if (
        oldSnap !== null && newSnap !== null &&
        oldSnap.content === newSnap.content &&
        oldSnap.name === newSnap.name &&
        oldSnap.parentId === newSnap.parentId &&
        oldSnap.type === newSnap.type
      ) continue;
    }

    const fileName = newSnap?.name ?? oldSnap?.name ?? fileId;
    const kind: FetchPreviewEntry['kind'] =
      oldSnap === undefined || oldSnap === null ? 'added'
      : newSnap === undefined || newSnap === null ? 'deleted'
      : 'modified';

    entries.push({
      fileId, fileName, kind,
      serverSnapshot: newSnap ?? null,
      pulledSnapshot: oldSnap ?? null,
      hasLocalChanges: locallyChanged.has(fileId),
    });
  }

  return entries.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

/**
 * Snapshot equality check (content + structural fields).
 */
function snapshotsEqual(
  a: VcsFileSnapshot | null | undefined,
  b: VcsFileSnapshot | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return (
    a.content === b.content &&
    a.name === b.name &&
    a.parentId === b.parentId &&
    a.type === b.type
  );
}

/**
 * Detect whether ALL files changed by local commits are already reflected in
 * serverHead with the same content. Returns true → local commits are stale
 * (already on server via a merge or push from another device) and can be
 * auto-discarded.
 */
function localCommitsAlreadyOnServer(
  pulledHead: HeadSnapshotArray,
  localHead: HeadSnapshotArray,
  serverHead: HeadSnapshotArray,
): boolean {
  const pulledMap = new Map(pulledHead.map(({ fileId, snapshot }) => [fileId, snapshot]));
  const localMap  = new Map(localHead.map(({ fileId, snapshot })  => [fileId, snapshot]));
  const serverMap = new Map(serverHead.map(({ fileId, snapshot }) => [fileId, snapshot]));

  let changedCount = 0;

  // Files added or modified by local commits
  for (const [fileId, localSnap] of localMap) {
    const pulledSnap = pulledMap.get(fileId) ?? null;
    if (snapshotsEqual(localSnap, pulledSnap)) continue; // unchanged by local commits

    changedCount++;
    const serverSnap = serverMap.has(fileId) ? (serverMap.get(fileId) ?? null) : undefined;
    if (serverSnap === undefined) return false; // file missing in server HEAD
    if (!snapshotsEqual(localSnap, serverSnap)) return false; // different content
  }

  // Files deleted by local commits
  for (const { fileId } of pulledHead) {
    const localSnap = localMap.has(fileId) ? (localMap.get(fileId) ?? null) : undefined;
    if (localSnap !== undefined) continue; // still present locally — handled above
    // locally deleted
    changedCount++;
    const serverSnap = serverMap.has(fileId) ? (serverMap.get(fileId) ?? null) : undefined;
    if (serverSnap !== undefined && serverSnap !== null) return false; // server still has it
  }

  return changedCount > 0;
}

/**
 * Three-way merge for local branches.
 * base    = common ancestor (source branch's pulledHead at creation time)
 * theirs  = source branch's localHead
 * ours    = current (target) branch's localHead
 * Returns auto-merged result + conflict list.
 */
function computeLocalMerge(
  base: HeadSnapshotArray,
  theirs: HeadSnapshotArray,
  ours: HeadSnapshotArray,
  resolutions: Array<{ fileId: string; resolution: 'useSource' | 'useTarget' }>,
): {
  result: HeadSnapshotArray;
  autoMergedFiles: MergePreviewData['autoMergedFiles'];
  conflicts: MergePreviewData['conflicts'];
  alreadyUpToDate: boolean;
} {
  const baseMap   = new Map(base.map(({ fileId, snapshot }) => [fileId, snapshot]));
  const theirMap  = new Map(theirs.map(({ fileId, snapshot }) => [fileId, snapshot]));
  const ourMap    = new Map(ours.map(({ fileId, snapshot }) => [fileId, snapshot]));
  const resMap    = new Map(resolutions.map(({ fileId, resolution }) => [fileId, resolution]));

  const result = new Map<string, VcsFileSnapshot | null>(ourMap);
  const autoMergedFiles: MergePreviewData['autoMergedFiles'] = [];
  const conflicts: MergePreviewData['conflicts'] = [];

  const allIds = new Set([...baseMap.keys(), ...theirMap.keys(), ...ourMap.keys()]);

  for (const fileId of allIds) {
    const baseSnap  = baseMap.has(fileId)  ? (baseMap.get(fileId)  ?? null) : undefined;
    const theirSnap = theirMap.has(fileId) ? (theirMap.get(fileId) ?? null) : undefined;
    const ourSnap   = ourMap.has(fileId)   ? (ourMap.get(fileId)   ?? null) : undefined;

    const theyChanged = !snapshotsEqual(theirSnap, baseSnap);
    const weChanged   = !snapshotsEqual(ourSnap,   baseSnap);

    if (!theyChanged) {
      // Source didn't change this file — keep ours
      result.set(fileId, ourSnap ?? null);
      continue;
    }

    if (!weChanged) {
      // Only source changed — auto take theirs
      result.set(fileId, theirSnap ?? null);
      autoMergedFiles.push({ fileId, source: theirSnap ?? null, target: ourSnap ?? null });
      continue;
    }

    // Both changed — conflict or resolution
    const resolution = resMap.get(fileId);
    if (resolution === 'useSource') {
      result.set(fileId, theirSnap ?? null);
    } else if (resolution === 'useTarget') {
      result.set(fileId, ourSnap ?? null);
    } else {
      // Unresolved conflict — keep ours for now, flag it
      result.set(fileId, ourSnap ?? null);
      conflicts.push({ fileId, source: theirSnap ?? null, target: ourSnap ?? null });
    }
  }

  const hasChanges = autoMergedFiles.length > 0 || conflicts.length > 0;

  return {
    result: Array.from(result.entries()).map(([fileId, snapshot]) => ({ fileId, snapshot })),
    autoMergedFiles,
    conflicts,
    alreadyUpToDate: !hasChanges,
  };
}

// ─── Store creation ───────────────────────────────────────────────────────────

export const useVcsStore = create<VcsStore>()((set, get) => {
  function addOp(key: OpKey) {
    set((s) => ({ ops: new Set([...s.ops, key]), error: null }));
  }
  function removeOp(key: OpKey) {
    set((s) => {
      const next = new Set(s.ops);
      next.delete(key);
      return { ops: next };
    });
  }
  async function run<T>(key: OpKey, fn: () => Promise<T>): Promise<T> {
    addOp(key);
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg });
      throw e;
    } finally {
      removeOp(key);
    }
  }
  function pid(): string {
    const id = get().projectId;
    if (!id) throw new Error('VCS store not initialized');
    return id;
  }
  function branch(override?: string) {
    return override ?? get().currentBranch;
  }

  return {
    projectId: null,
    ops: new Set(),
    error: null,
    branches: [],
    currentBranch: 'main',
    commits: [],
    commitsPage: 1,
    commitsHasMore: false,
    statusEntries: [],
    headSnapshot: null,
    pulledHead: null,
    localCommits: [],
    localHead: null,
    fetchPreview: null,
    lastFetchedAt: null,
    lastPulledAt: null,
    activeCommitChanges: [],
    mergePreview: null,
    localOnlyBranches: new Set(),

    isLoading: (key?: OpKey) => {
      const { ops } = get();
      return key ? ops.has(key) : ops.size > 0;
    },
    pendingPullCount: () => get().fetchPreview?.length ?? 0,
    hasPendingPull: () => (get().fetchPreview?.length ?? 0) > 0,
    isBranchLocalOnly: (branchName: string) => get().localOnlyBranches.has(branchName),

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    init: (projectId: string) => {
      if (get().projectId === projectId) return;
      set({
        projectId,
        currentBranch: readStoredBranch(projectId),
        branches: [],
        commits: [],
        commitsPage: 1,
        commitsHasMore: false,
        statusEntries: [],
        headSnapshot: null,
        pulledHead: null,
        localCommits: [],
        localHead: null,
        fetchPreview: null,
        lastFetchedAt: null,
        lastPulledAt: null,
        activeCommitChanges: [],
        mergePreview: null,
        localOnlyBranches: new Set(),
        error: null,
        ops: new Set(),
      });
    },

    clearError: () => set({ error: null }),
    clearMergePreview: () => set({ mergePreview: null }),
    setActiveCommitChanges: (changes) => set({ activeCommitChanges: changes }),
    setStatusEntries: (entries) => set({ statusEntries: entries }),

    markPulled: () => {
      const { headSnapshot, pulledHead, projectId, currentBranch, localCommits } = get();
      if (!headSnapshot || !projectId) return;
      if (pulledHead) return;
      savePulledHead(projectId, currentBranch, headSnapshot).catch(() => {});
      const localHead = computeLocalHead(headSnapshot, localCommits);
      set({ pulledHead: headSnapshot, localHead, lastPulledAt: new Date().toISOString() });
    },

    // ── Load local state from IndexedDB ────────────────────────────────────────

    loadLocalState: async () => {
      const { projectId, currentBranch } = get();
      if (!projectId) return;
      try {
        const [savedHead, savedCommits] = await Promise.all([
          loadPulledHead(projectId, currentBranch),
          loadLocalCommits(projectId, currentBranch),
        ]);
        const typedHead = savedHead as HeadSnapshotArray | null;
        if (typedHead || savedCommits.length > 0) {
          const pulledHead = typedHead ?? get().headSnapshot ?? [];
          const localHead = computeLocalHead(pulledHead, savedCommits);
          set((s) => ({
            pulledHead: typedHead ?? s.pulledHead,
            localCommits: savedCommits,
            localHead,
          }));
        }
      } catch { /* ignore IDB errors */ }
    },

    // ── Load local-only branches from IDB ──────────────────────────────────────

    loadLocalBranches: async () => {
      const { projectId } = get();
      if (!projectId) return;
      try {
        const metas = await loadAllLocalBranches(projectId);
        if (metas.length === 0) return;

        const localNames = new Set(metas.map((m) => m.branchName));

        // Merge local branches into the branch list (add any that aren't already there)
        set((s) => {
          const existing = new Set(s.branches.map((b) => b.name));
          const toAdd: VcsBranch[] = metas
            .filter((m) => !existing.has(m.branchName))
            .map((m) => ({
              id: `local::${m.branchName}`,
              projectId: m.projectId,
              name: m.branchName,
              headCommitId: null,
              createdBy: 'local',
              createdAt: m.createdAt,
              updatedAt: m.createdAt,
              isLocalOnly: true,
            }));

          const updatedBranches = [
            ...s.branches.map((b) =>
              localNames.has(b.name) ? { ...b, isLocalOnly: true } : b,
            ),
            ...toAdd,
          ];

          return {
            branches: updatedBranches,
            localOnlyBranches: new Set([...s.localOnlyBranches, ...localNames]),
          };
        });
      } catch { /* ignore IDB errors */ }
    },

    // ── Batch panel refresh ────────────────────────────────────────────────────

    refreshPanel: (branchOverride?: string, pageOverride?: number) =>
      run('panel', async () => {
        const projectId = pid();
        const branchName = branch(branchOverride);
        const page = pageOverride ?? 1;

        // Local-only branches have no server panel data — only load IDB state
        if (get().localOnlyBranches.has(branchName)) {
          const [savedHead, savedCommits] = await Promise.all([
            loadPulledHead(projectId, branchName) as Promise<HeadSnapshotArray | null>,
            loadLocalCommits(projectId, branchName),
          ]);
          const pulledHead = (savedHead ?? []) as HeadSnapshotArray;
          const localHead = computeLocalHead(pulledHead, savedCommits);
          set((s) => ({
            headSnapshot: pulledHead,
            pulledHead,
            localHead,
            localCommits: savedCommits,
            commits: [], // no server commits yet
            commitsPage: 1,
            commitsHasMore: false,
          }));
          return;
        }

        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
          branchName: string;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=${page}`,
        );
        set((s) => {
          const stillExists = data.branches.some((b) => b.name === s.currentBranch);
          const currentBranch = stillExists ? s.currentBranch : 'main';
          if (!stillExists) persistBranch(projectId, 'main');
          return {
            branches: data.branches,
            headSnapshot: data.headSnapshot ?? null,
            commits: data.commits ?? [],
            commitsPage: page,
            commitsHasMore: data.commitsHasMore ?? false,
            currentBranch,
          };
        });

        if (!get().pulledHead) {
          await get().loadLocalState();
        }

        // Overlay local-only branch markers on top of server branch list
        await get().loadLocalBranches();
      }),

    loadMoreCommits: () => {
      const { commitsHasMore, commitsPage, currentBranch, isLoading } = get();
      if (!commitsHasMore || isLoading('panel')) return Promise.resolve();
      const nextPage = commitsPage + 1;
      return run('panel', async () => {
        const projectId = pid();
        const data = await apiFetch<{
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(currentBranch)}&page=${nextPage}`,
        );
        set((s) => ({
          commits: [...s.commits, ...(data.commits ?? [])],
          commitsPage: nextPage,
          commitsHasMore: data.commitsHasMore ?? false,
        }));
      });
    },

    // ── Individual refreshes ───────────────────────────────────────────────────

    refreshBranches: () =>
      run('panel', async () => {
        const projectId = pid();
        const data = await apiFetch<VcsBranch[]>(`/api/projects/${projectId}/vcs/branches`);
        set((s) => {
          const stillExists = data.some((b) => b.name === s.currentBranch);
          const currentBranch = stillExists ? s.currentBranch : 'main';
          if (!stillExists) persistBranch(projectId, 'main');
          return { branches: data, currentBranch };
        });
        await get().loadLocalBranches();
      }),

    refreshCommits: (branchOverride?: string) =>
      run('commits', async () => {
        const projectId = pid();
        const branchName = branch(branchOverride);
        if (get().localOnlyBranches.has(branchName)) {
          set({ commits: [], commitsPage: 1, commitsHasMore: false });
          return;
        }
        const data = await apiFetch<VcsCommit[]>(
          `/api/projects/${projectId}/vcs/commits?branch=${encodeURIComponent(branchName)}`,
        );
        set({ commits: data, commitsPage: 1, commitsHasMore: false });
      }),

    refreshStatus: (branchOverride?: string) =>
      run('status', async () => {
        const projectId = pid();
        const branchName = branch(branchOverride);
        if (get().localOnlyBranches.has(branchName)) return; // status computed locally
        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=1`,
        );
        set((s) => ({
          headSnapshot: data.headSnapshot ?? null,
          branches: data.branches ?? s.branches,
        }));
      }),

    // ── Fetch ──────────────────────────────────────────────────────────────────

    fetch: (getLocalStatus) =>
      run('fetch', async () => {
        const projectId = pid();
        const branchName = branch();

        // Local-only branches have nothing to fetch from the server
        if (get().localOnlyBranches.has(branchName)) {
          set({ fetchPreview: [], lastFetchedAt: new Date().toISOString() });
          return;
        }

        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=1`,
        );

        const newHead = data.headSnapshot ?? [];
        const now = new Date().toISOString();

        // ── Stale-commit detection ─────────────────────────────────────────────
        // If all locally-changed files are already present with the same content
        // in the new server HEAD (e.g. after another device pushed/merged them),
        // discard the local commits and treat as "already up to date".
        const { pulledHead: currentPulled, localCommits } = get();
        if (localCommits.length > 0) {
          const baseline = currentPulled ?? [];
          const currentLocalHead = computeLocalHead(baseline, localCommits);
          if (localCommitsAlreadyOnServer(baseline, currentLocalHead, newHead)) {
            await clearLocalCommits(projectId, branchName);
            await savePulledHead(projectId, branchName, newHead);
            set({
              branches: data.branches,
              headSnapshot: newHead,
              commits: data.commits ?? [],
              commitsHasMore: data.commitsHasMore ?? false,
              pulledHead: newHead,
              localHead: newHead,
              localCommits: [],
              fetchPreview: [], // nothing pending — already up to date
              lastFetchedAt: now,
            });
            await get().loadLocalBranches();
            return;
          }
        }

        set((s) => {
          const pulledHead = s.pulledHead ?? s.headSnapshot ?? [];
          const preview = diffSnapshots(pulledHead, newHead, getLocalStatus());
          return {
            branches: data.branches,
            headSnapshot: newHead,
            commits: data.commits ?? s.commits,
            commitsHasMore: data.commitsHasMore ?? s.commitsHasMore,
            fetchPreview: preview,
            lastFetchedAt: now,
          };
        });
        await get().loadLocalBranches();
      }),

    // ── Pull ───────────────────────────────────────────────────────────────────

    pull: (resolutions, onApplied) =>
      run('pull', async () => {
        const { fetchPreview, headSnapshot } = get();
        if (!fetchPreview || !headSnapshot) return;

        const resolutionMap = new Map(
          resolutions.map(({ fileId, resolution }) => [fileId, resolution]),
        );

        const updates: PullFileUpdate[] = [];
        for (const entry of fetchPreview) {
          const { fileId, hasLocalChanges, serverSnapshot } = entry;
          const resolution = resolutionMap.get(fileId);
          if (hasLocalChanges && !resolution) continue;
          if (hasLocalChanges && resolution === 'keepLocal') continue;
          updates.push({ fileId, snapshot: serverSnapshot });
        }

        await onApplied(updates);

        const projectId = pid();
        const branchName = branch();
        await savePulledHead(projectId, branchName, headSnapshot);

        const { localCommits } = get();
        const localHead = computeLocalHead(headSnapshot, localCommits);

        set({
          pulledHead: headSnapshot,
          localHead,
          fetchPreview: null,
          lastPulledAt: new Date().toISOString(),
        });
      }),

    // ── Push ───────────────────────────────────────────────────────────────────

    push: (onPushed) =>
      run('push', async () => {
        const { localCommits, currentBranch, localOnlyBranches } = get();
        const projectId = pid();
        const branchName = currentBranch;

        const isLocalOnly = localOnlyBranches.has(branchName);
        if (!isLocalOnly && localCommits.length === 0) return;

        // ── Step 1: If branch is local-only, create it on the server first ──────
        if (isLocalOnly) {
          const meta = await loadLocalBranch(projectId, branchName);
          if (!meta) throw new Error(`Local branch metadata not found for "${branchName}"`);

          await apiFetch(`/api/projects/${projectId}/vcs/branches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: branchName, sourceBranch: meta.serverSourceBranch }),
          });

          // Remove from IDB + local state
          await deleteLocalBranch(projectId, branchName);
          set((s) => {
            const next = new Set(s.localOnlyBranches);
            next.delete(branchName);
            return {
              localOnlyBranches: next,
              branches: s.branches.map((b) =>
                b.name === branchName
                  ? { ...b, isLocalOnly: false, id: branchName }
                  : b,
              ),
            };
          });
        }

        // ── Step 2: Push local commits to server (oldest first) ─────────────────
        const commitsToSend = get().localCommits; // re-read after possible state change
        for (const commit of commitsToSend) {
          try {
            await apiFetch(`/api/projects/${projectId}/vcs/commit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                branchName: commit.branchName,
                message: commit.message,
                files: commit.files,
              }),
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('No material file changes to commit')) {
              // Benign stale/no-op commit: skip and continue pushing the rest.
              continue;
            }
            throw error;
          }
        }

        await clearLocalCommits(projectId, branchName);

        // ── Step 3: Refresh panel to get updated server HEAD ────────────────────
        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=1`,
        );

        const newHead = data.headSnapshot ?? [];
        await savePulledHead(projectId, branchName, newHead);

        set({
          branches: data.branches,
          headSnapshot: newHead,
          pulledHead: newHead,
          localHead: newHead,
          localCommits: [],
          commits: data.commits ?? [],
          commitsHasMore: data.commitsHasMore ?? false,
          fetchPreview: null,
          lastPulledAt: new Date().toISOString(),
        });

        await onPushed?.();
      }),

    // ── Branch operations ──────────────────────────────────────────────────────

    /**
     * Create a new branch LOCALLY — no server call.
     *
     * The new branch starts from the source branch's current localHead so all
     * uncommitted work is carried forward. Local commits from the source branch
     * are copied to the new branch under its own name (independent history).
     *
     * The branch is marked as local-only; call push() while on it to publish.
     */
    createBranch: (name: string, sourceBranch: string) =>
      run('action', async () => {
        const { localCommits, currentBranch, pulledHead, headSnapshot, localOnlyBranches } = get();
        const projectId = pid();

        // ── Resolve the server source branch ──────────────────────────────────
        // If sourceBranch is itself local-only, traverse to find the underlying
        // server branch (so we know where to fork from when we eventually push).
        let serverSourceBranch = sourceBranch;
        if (localOnlyBranches.has(sourceBranch)) {
          const srcMeta = await loadLocalBranch(projectId, sourceBranch);
          serverSourceBranch = srcMeta?.serverSourceBranch ?? sourceBranch;
        }

        // ── Get source branch's server HEAD (our fork baseline) ───────────────
        // This is what the server will fork from when we later push.
        const sourcePulledHead: HeadSnapshotArray =
          sourceBranch === currentBranch
            ? ((pulledHead ?? headSnapshot ?? []) as HeadSnapshotArray)
            : ((await loadPulledHead(projectId, sourceBranch)) as HeadSnapshotArray | null) ?? [];

        // ── Get source branch's local commits to carry forward ────────────────
        const sourceLocalCommits: LocalCommit[] =
          sourceBranch === currentBranch
            ? localCommits
            : await loadLocalCommits(projectId, sourceBranch);

        // ── Persist new branch's IDB state ────────────────────────────────────
        const meta: LocalBranchMeta = {
          projectId,
          branchName: name,
          serverSourceBranch,
          createdAt: new Date().toISOString(),
        };
        await saveLocalBranch(meta);

        // New branch's pulledHead = source's server HEAD (fork baseline)
        await savePulledHead(projectId, name, sourcePulledHead);

        // Copy source commits to new branch (independent copies, new branchName)
        for (const commit of sourceLocalCommits) {
          await saveLocalCommit({
            ...commit,
            branchName: name,
            // Append branch suffix to keep IDB keys unique
            localId: `${commit.localId}::${name}`,
          });
        }

        // ── Update store state ────────────────────────────────────────────────
        const newBranch: VcsBranch = {
          id: `local::${name}`,
          projectId,
          name,
          headCommitId: null,
          createdBy: 'local',
          createdAt: meta.createdAt,
          updatedAt: meta.createdAt,
          isLocalOnly: true,
        };

        set((s) => ({
          branches: [...s.branches, newBranch],
          localOnlyBranches: new Set([...s.localOnlyBranches, name]),
        }));
      }),

    checkoutBranch: (branchName, onApplySnapshot) =>
      run('action', async () => {
        const { localOnlyBranches } = get();
        const projectId = pid();

        persistBranch(projectId, branchName);
        set({
          currentBranch: branchName,
          mergePreview: null,
          activeCommitChanges: [],
          commits: [],
          commitsPage: 1,
          commitsHasMore: false,
          fetchPreview: null,
        });

        if (localOnlyBranches.has(branchName)) {
          // ── Local-only branch: load entirely from IDB, no server calls ─────
          const [savedHead, savedCommits] = await Promise.all([
            loadPulledHead(projectId, branchName) as Promise<HeadSnapshotArray | null>,
            loadLocalCommits(projectId, branchName),
          ]);
          const pulledHead = (savedHead ?? []) as HeadSnapshotArray;
          const localHead = computeLocalHead(pulledHead, savedCommits);

          set({
            headSnapshot: pulledHead,
            pulledHead,
            localHead,
            localCommits: savedCommits,
          });

          await onApplySnapshot(localHead);
          return;
        }

        // ── Server branch: fetch HEAD snapshot ────────────────────────────────
        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=1`,
        );

        const newHead = data.headSnapshot ?? [];
        const newBranchCommits = await loadLocalCommits(projectId, branchName);
        const localHead = computeLocalHead(newHead, newBranchCommits);

        await savePulledHead(projectId, branchName, newHead);

        set({
          branches: data.branches,
          headSnapshot: newHead,
          pulledHead: newHead,
          localHead,
          localCommits: newBranchCommits,
          commits: data.commits ?? [],
          commitsHasMore: data.commitsHasMore ?? false,
        });

        // Apply localHead (server HEAD + any existing IDB commits for this branch)
        // so switching back to a branch preserves locally-committed file states.
        await onApplySnapshot(localHead);
      }),

    // ── Commit (local-only — call push() to send to server) ────────────────────

    commit: (message, files, onCommitted) =>
      run('action', async () => {
        const projectId = pid();
        const branchName = branch();

        const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const newCommit: LocalCommit = {
          localId,
          projectId,
          branchName,
          message,
          files: files as LocalCommit['files'],
          createdAt: new Date().toISOString(),
        };

        await saveLocalCommit(newCommit);

        const committedIds = new Set(files.map((f) => f.fileId));

        set((s) => {
          const localCommits = [...s.localCommits, newCommit];
          const pulledHead = s.pulledHead ?? s.headSnapshot ?? [];
          const localHead = computeLocalHead(pulledHead, localCommits);
          return {
            localCommits,
            localHead,
            statusEntries: s.statusEntries.filter((e) => !committedIds.has(e.fileId)),
          };
        });

        await onCommitted();
      }),

    loadCommitDetail: (commitId: string) =>
      run('commitDetail', async () => {
        const projectId = pid();
        const data = await apiFetch<{ changes: VcsCommitFile[] }>(
          `/api/projects/${projectId}/vcs/commits/${commitId}`,
        );
        const changes = data.changes ?? [];
        set({ activeCommitChanges: changes });
        return changes;
      }),

    // ── Merge ──────────────────────────────────────────────────────────────────

    previewMerge: (sourceBranch, targetBranch) =>
      run('action', async () => {
        const { localOnlyBranches, localHead: targetLocalHead, pulledHead: targetPulled, localCommits: targetCommits } = get();
        const projectId = pid();

        if (localOnlyBranches.has(sourceBranch)) {
          // ── Local merge: compute entirely from IDB ───────────────────────────
          const [sourceSavedHead, sourceCommits] = await Promise.all([
            loadPulledHead(projectId, sourceBranch) as Promise<HeadSnapshotArray | null>,
            loadLocalCommits(projectId, sourceBranch),
          ]);
          const sourcePulledHead = (sourceSavedHead ?? []) as HeadSnapshotArray;
          const sourceLocalHead = computeLocalHead(sourcePulledHead, sourceCommits);

          // Merge base = source's pulledHead (the server HEAD it was forked from)
          const base = sourcePulledHead;
          const ours = targetLocalHead ?? computeLocalHead(targetPulled ?? [], targetCommits);

          const { autoMergedFiles, conflicts, alreadyUpToDate } = computeLocalMerge(
            base, sourceLocalHead, ours, [],
          );

          set({
            mergePreview: {
              sourceBranch,
              targetBranch,
              autoMergedFiles,
              conflicts,
              alreadyUpToDate,
            },
          });
          return;
        }

        // ── Server merge preview ─────────────────────────────────────────────
        const data = await apiFetch<{
          autoMergedFiles: MergePreviewData['autoMergedFiles'];
          conflicts: MergePreviewData['conflicts'];
          alreadyUpToDate: boolean;
        }>(`/api/projects/${projectId}/vcs/merge/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceBranch, targetBranch }),
        });
        set({
          mergePreview: {
            sourceBranch,
            targetBranch,
            autoMergedFiles: data.autoMergedFiles ?? [],
            conflicts: data.conflicts ?? [],
            alreadyUpToDate: data.alreadyUpToDate ?? false,
          },
        });
      }),

    executeMerge: (sourceBranch, targetBranch, conflictResolutions, onApplySnapshot) =>
      run('action', async () => {
        const { localOnlyBranches, localHead: targetLocalHead, pulledHead: targetPulled, localCommits: targetCommits } = get();
        const projectId = pid();
        const currentBranch = branch();

        if (localOnlyBranches.has(sourceBranch)) {
          // ── Local merge: apply result as a local commit ──────────────────────
          const [sourceSavedHead, sourceCommits] = await Promise.all([
            loadPulledHead(projectId, sourceBranch) as Promise<HeadSnapshotArray | null>,
            loadLocalCommits(projectId, sourceBranch),
          ]);
          const sourcePulledHead = (sourceSavedHead ?? []) as HeadSnapshotArray;
          const sourceLocalHead  = computeLocalHead(sourcePulledHead, sourceCommits);

          const base = sourcePulledHead;
          const ours = targetLocalHead ?? computeLocalHead(targetPulled ?? [], targetCommits);

          const { result, conflicts, alreadyUpToDate } = computeLocalMerge(
            base, sourceLocalHead, ours, conflictResolutions,
          );

          if (conflicts.length > 0) {
            throw new Error(`Merge has ${conflicts.length} unresolved conflict(s). Resolve them first.`);
          }

          set({ mergePreview: null });

          if (alreadyUpToDate) {
            // Nothing to do — branches are already in sync
            return;
          }

          // Create a local merge commit that encodes the merged state
          const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const mergeFiles = result
            .filter(({ fileId, snapshot }) => {
              const prev = new Map(ours.map((e) => [e.fileId, e.snapshot]));
              return !snapshotsEqual(snapshot, prev.get(fileId) ?? null);
            })
            .map(({ fileId, snapshot }) =>
              snapshot === null
                ? { fileId, deleted: true }
                : { fileId, name: snapshot.name, type: snapshot.type, parentId: snapshot.parentId, content: snapshot.content, order: snapshot.order },
            );

          const mergeCommit: LocalCommit = {
            localId,
            projectId,
            branchName: currentBranch,
            message: `Merge branch '${sourceBranch}' into '${targetBranch}'`,
            files: mergeFiles,
            createdAt: new Date().toISOString(),
          };
          await saveLocalCommit(mergeCommit);

          const pulledHead = targetPulled ?? [];
          const newLocalCommits = [...targetCommits, mergeCommit];
          const newLocalHead = computeLocalHead(pulledHead, newLocalCommits);

          set({
            localCommits: newLocalCommits,
            localHead: newLocalHead,
          });

          await onApplySnapshot(newLocalHead);
          return;
        }

        // ── Server merge ──────────────────────────────────────────────────────
        await apiFetch(`/api/projects/${projectId}/vcs/merge/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceBranch, targetBranch, conflictResolutions }),
        });
        set({ mergePreview: null });

        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(currentBranch)}&page=1`,
        );
        const newHead = data.headSnapshot ?? [];

        await savePulledHead(projectId, currentBranch, newHead);

        set({
          branches: data.branches,
          headSnapshot: newHead,
          pulledHead: newHead,
          localHead: newHead,
          localCommits: [],
          commits: data.commits ?? [],
          commitsHasMore: data.commitsHasMore ?? false,
          fetchPreview: null,
        });

        await onApplySnapshot(newHead);
      }),

    // ── Revert ─────────────────────────────────────────────────────────────────

    previewRevert: (commitId) =>
      run('revertPreview', async () => {
        const projectId = pid();
        const branchName = branch();
        return apiFetch<{
          toDelete: Array<{ fileId: string; name: string }>;
          toRestore: Array<{ fileId: string; name: string }>;
          toModify: Array<{ fileId: string; name: string }>;
          commitMessage: string;
        }>(
          `/api/projects/${projectId}/vcs/revert-preview?branch=${encodeURIComponent(branchName)}&commitId=${encodeURIComponent(commitId)}`,
        );
      }),

    revertCommit: (commitId, fileId, onApplySnapshot) =>
      run('action', async () => {
        const projectId = pid();
        const branchName = branch();
        const oldHead = get().headSnapshot ?? [];

        await apiFetch(`/api/projects/${projectId}/vcs/revert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branchName, commitId, fileId }),
        });

        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=1`,
        );
        const newHead = data.headSnapshot ?? [];

        await savePulledHead(projectId, branchName, newHead);

        set({
          branches: data.branches,
          headSnapshot: newHead,
          pulledHead: newHead,
          localHead: newHead,
          localCommits: [],
          commits: data.commits ?? [],
          commitsHasMore: data.commitsHasMore ?? false,
          fetchPreview: null,
        });

        // Files that were in the old HEAD but not in the new HEAD were deleted by the
        // revert — pass them as explicit null entries so applySnapshotToLocal removes them.
        const newHeadIds = new Set(newHead.map((e) => e.fileId));
        const deletedEntries: HeadSnapshotArray = oldHead
          .filter((e) => !newHeadIds.has(e.fileId))
          .map((e) => ({ fileId: e.fileId, snapshot: null }));

        await onApplySnapshot([...newHead, ...deletedEntries]);
      }),

    // ── Restore working directory ──────────────────────────────────────────────

    restoreFilesFromHead: (fileIds, onApplied) =>
      run('action', async () => {
        const projectId = pid();
        const branchName = branch();

        if (!get().localOnlyBranches.has(branchName)) {
          await apiFetch(`/api/projects/${projectId}/vcs/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchName, fileIds }),
          });
        }

        const { localHead, headSnapshot } = get();
        const headMap = new Map(
          (localHead ?? headSnapshot ?? []).map(({ fileId, snapshot }) => [fileId, snapshot]),
        );

        const updates: PullFileUpdate[] = fileIds.map((fileId) => ({
          fileId,
          snapshot: headMap.get(fileId) ?? null,
        }));

        set((s) => ({
          statusEntries: s.statusEntries.filter((e) => !fileIds.includes(e.fileId)),
        }));

        await onApplied(updates);
      }),

    // ── Utilities ──────────────────────────────────────────────────────────────

    fileHistory: (fileId: string, limit = 20) =>
      run('fileHistory', async () => {
        const projectId = pid();
        const branchName = branch();
        if (get().localOnlyBranches.has(branchName)) {
          return { entries: [], hasMore: false }; // no server history for local branches
        }
        const data = await apiFetch<{ entries: VcsFileHistoryEntry[]; hasMore: boolean }>(
          `/api/projects/${projectId}/vcs/files/${fileId}/history?limit=${limit}&branch=${encodeURIComponent(branchName)}`,
        );
        return { entries: data.entries ?? [], hasMore: data.hasMore ?? false };
      }),

    generateCommitMessage: (files, branchOverride) =>
      run('generate', async () => {
        const projectId = pid();
        const branchName = branch(branchOverride);
        const data = await apiFetch<{ message: string }>(
          `/api/projects/${projectId}/vcs/generate-message`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchName, files }),
          },
        );
        return data.message ?? '';
      }),

    getHeadFileVersion: (fileId, branchOverride) =>
      run('action', async () => {
        const projectId = pid();
        const branchName = branch(branchOverride);
        if (get().localOnlyBranches.has(branchName)) {
          const { localHead } = get();
          const snap = localHead?.find((e) => e.fileId === fileId)?.snapshot ?? null;
          return { fileId, branchName, snapshot: snap };
        }
        return apiFetch<{ fileId: string; branchName: string; snapshot: VcsFileSnapshot | null }>(
          `/api/projects/${projectId}/vcs/files/${fileId}/head?branch=${encodeURIComponent(branchName)}`,
        );
      }),

    getFileAtCommit: (fileId, commitId) =>
      run('action', async () => {
        const projectId = pid();
        return apiFetch<{ fileId: string; commitId: string; snapshot: VcsFileSnapshot | null; changeType: string }>(
          `/api/projects/${projectId}/vcs/files/${fileId}/at/${commitId}`,
        );
      }),
  };
});
