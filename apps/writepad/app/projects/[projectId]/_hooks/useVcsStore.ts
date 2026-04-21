'use client';

import { create } from 'zustand';
import type { LocalCommit } from '@/lib/localRepo';
import {
  saveLocalCommit,
  clearLocalCommits,
  loadLocalCommits,
  loadPulledHead,
  savePulledHead,
} from '@/lib/localRepo';

// Re-export so VcsPanel and other consumers can import LocalCommit from here
export type { LocalCommit } from '@/lib/localRepo';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface VcsBranch {
  id: string;
  projectId: string;
  name: string;
  headCommitId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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

/**
 * A single file entry in a fetch preview.
 * kind:
 *   'added'    — file exists on server HEAD but NOT in our pulledHead (new remote file)
 *   'modified' — file changed on server HEAD vs our pulledHead
 *   'deleted'  — file removed from server HEAD vs our pulledHead
 */
export interface FetchPreviewEntry {
  fileId: string;
  fileName: string;
  kind: 'added' | 'modified' | 'deleted';
  /** Server snapshot (null for remote deletions). */
  serverSnapshot: VcsFileSnapshot | null;
  /** Our pulled-head snapshot at last pull (null for remote additions). */
  pulledSnapshot: VcsFileSnapshot | null;
  /**
   * Whether this file has local uncommitted edits.
   * If true AND kind !== 'added', the pull would be a conflict.
   */
  hasLocalChanges: boolean;
}

/**
 * A single file update produced by pull() or restoreFilesFromHead().
 * The caller (useProjectData) applies these to its local state.
 */
export interface PullFileUpdate {
  fileId: string;
  /** null → delete this file from local working directory */
  snapshot: VcsFileSnapshot | null;
}

// ─── Loading state ─────────────────────────────────────────────────────────────

type OpKey = 'panel' | 'status' | 'commits' | 'action' | 'generate' | 'fileHistory' | 'fetch' | 'pull' | 'push';

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

  /**
   * VCS status entries — computed client-side in page.tsx using localHead.
   * Call setStatusEntries() to update.
   */
  statusEntries: VcsStatusEntry[];

  /**
   * The branch HEAD snapshot most recently fetched from the server.
   * Updated by refreshPanel() and fetch().
   */
  headSnapshot: HeadSnapshotArray | null;

  /**
   * The branch HEAD snapshot at the time of the last pull (or initial load).
   * Acts as the "remote-tracking branch HEAD" (like origin/main in git).
   * Comparing headSnapshot vs pulledHead reveals what changed since last pull.
   * Persisted to IndexedDB via savePulledHead().
   */
  pulledHead: HeadSnapshotArray | null;

  /**
   * Locally-created commits not yet pushed to the server, sorted oldest-first.
   * Stored in IndexedDB. Cleared after a successful push().
   */
  localCommits: LocalCommit[];

  /**
   * The effective local HEAD = pulledHead with localCommits applied on top.
   * Used for VCS status computation (what changed since last commit).
   * null if not yet computed.
   */
  localHead: HeadSnapshotArray | null;

  /** Preview computed after fetch() — entries that differ between headSnapshot and pulledHead. */
  fetchPreview: FetchPreviewEntry[] | null;

  /** ISO timestamp of last fetch() call. */
  lastFetchedAt: string | null;

  /** ISO timestamp of last successful pull or push. */
  lastPulledAt: string | null;

  activeCommitChanges: VcsCommitFile[];
  mergePreview: MergePreviewData | null;

  // Derived helpers
  isLoading: (key?: OpKey) => boolean;
  /** Number of remote changes detected but not yet pulled. */
  pendingPullCount: () => number;
  /** Whether there are un-pulled remote changes (fetch detected new commits). */
  hasPendingPull: () => boolean;

  // Lifecycle
  init: (projectId: string) => void;
  clearError: () => void;
  clearMergePreview: () => void;
  setActiveCommitChanges: (changes: VcsCommitFile[]) => void;
  setStatusEntries: (entries: VcsStatusEntry[]) => void;

  /**
   * Mark the current headSnapshot as "pulled" — call this after the initial
   * server load (so the first fetch correctly shows what's NEW since load).
   * Skips if pulledHead was already loaded from IndexedDB.
   */
  markPulled: () => void;

  /**
   * Load pulledHead and localCommits from IndexedDB for the current
   * project + branch. Called internally by refreshPanel().
   */
  loadLocalState: () => Promise<void>;

  // ── Batch data fetching ────────────────────────────────────────────────────
  refreshPanel: (branch?: string, page?: number) => Promise<void>;
  loadMoreCommits: () => Promise<void>;

  // ── Individual refreshes ──────────────────────────────────────────────────
  refreshStatus: (branch?: string) => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshCommits: (branch?: string) => Promise<void>;

  // ── Fetch / Pull (git-style) ───────────────────────────────────────────────

  /**
   * `git fetch` — download the latest server HEAD without applying changes.
   * Sets headSnapshot and computes fetchPreview by comparing vs pulledHead.
   */
  fetch: (getLocalStatus: () => VcsStatusEntry[]) => Promise<void>;

  /**
   * `git pull` — apply fetched remote changes to local files.
   *
   * For each entry in fetchPreview:
   *   - No local changes → auto-apply (fast-forward)
   *   - Local changes + conflict resolution provided → use resolution
   *   - Local changes + no resolution → skip (leave as conflict)
   */
  pull: (
    resolutions: Array<{ fileId: string; resolution: 'keepLocal' | 'takeServer' }>,
    onApplied: (updates: PullFileUpdate[]) => Promise<void>,
  ) => Promise<void>;

  /**
   * `git push` — send all local (unpushed) commits to the server in order,
   * then clear the local commit queue and advance pulledHead.
   */
  push: (onPushed?: () => Promise<void>) => Promise<void>;

  // ── Branch operations ──────────────────────────────────────────────────────
  createBranch: (name: string, sourceBranch: string) => Promise<void>;
  checkoutBranch: (
    branchName: string,
    onApplySnapshot: (snapshot: HeadSnapshotArray) => Promise<void>,
  ) => Promise<void>;

  // ── Commit ─────────────────────────────────────────────────────────────────
  /**
   * Create a local commit (stored in IndexedDB only — NOT sent to server).
   * Call push() to send accumulated local commits to the server.
   */
  commit: (
    message: string,
    files: VcsFileSnapshotForCommit[],
    onCommitted: () => Promise<void>,
  ) => Promise<void>;
  loadCommitDetail: (commitId: string) => Promise<VcsCommitFile[]>;

  // ── Merge ──────────────────────────────────────────────────────────────────
  previewMerge: (sourceBranch: string, targetBranch: string) => Promise<void>;
  executeMerge: (
    sourceBranch: string,
    targetBranch: string,
    conflictResolutions: Array<{ fileId: string; resolution: 'useSource' | 'useTarget' }>,
    onApplySnapshot: (snapshot: HeadSnapshotArray) => Promise<void>,
  ) => Promise<void>;

  // ── Revert ─────────────────────────────────────────────────────────────────
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
 * effective local HEAD. This is analogous to `git log` showing unpushed commits.
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

    // Both sides absent — shouldn't happen but guard anyway
    if (oldSnap === undefined && newSnap === undefined) continue;

    // No change
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
      oldSnap === undefined || oldSnap === null
        ? 'added'
        : newSnap === undefined || newSnap === null
        ? 'deleted'
        : 'modified';

    entries.push({
      fileId,
      fileName,
      kind,
      serverSnapshot: newSnap ?? null,
      pulledSnapshot: oldSnap ?? null,
      hasLocalChanges: locallyChanged.has(fileId),
    });
  }

  return entries.sort((a, b) => a.fileName.localeCompare(b.fileName));
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

    isLoading: (key?: OpKey) => {
      const { ops } = get();
      return key ? ops.has(key) : ops.size > 0;
    },

    pendingPullCount: () => get().fetchPreview?.length ?? 0,
    hasPendingPull: () => (get().fetchPreview?.length ?? 0) > 0,

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
      // If pulledHead was already loaded from IndexedDB by loadLocalState, don't overwrite it.
      if (pulledHead) return;
      // First visit — set pulledHead to current server HEAD and persist it.
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

    // ── Batch panel refresh ────────────────────────────────────────────────────

    refreshPanel: (branchOverride?: string, pageOverride?: number) =>
      run('panel', async () => {
        const projectId = pid();
        const branchName = branch(branchOverride);
        const page = pageOverride ?? 1;
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

        // Restore pulledHead + localCommits from IndexedDB if not yet in memory.
        // This handles page reloads where the Zustand store is fresh.
        if (!get().pulledHead) {
          await get().loadLocalState();
        }
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
      }),

    refreshCommits: (branchOverride?: string) =>
      run('commits', async () => {
        const projectId = pid();
        const branchName = branch(branchOverride);
        const data = await apiFetch<VcsCommit[]>(
          `/api/projects/${projectId}/vcs/commits?branch=${encodeURIComponent(branchName)}`,
        );
        set({ commits: data, commitsPage: 1, commitsHasMore: false });
      }),

    refreshStatus: (branchOverride?: string) =>
      run('status', async () => {
        // Status is computed client-side from localHead.
        // Refresh panel to get latest headSnapshot; status recomputes in page.tsx.
        const projectId = pid();
        const branchName = branch(branchOverride);
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

    // ── Fetch / Pull ───────────────────────────────────────────────────────────

    fetch: (getLocalStatus) =>
      run('fetch', async () => {
        const projectId = pid();
        const branchName = branch();

        // Download latest server HEAD — do NOT apply to local files.
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

        set((s) => {
          // Compare against pulledHead (the last-actually-pulled baseline), not headSnapshot.
          // This prevents unfetched remote changes from making local files appear modified.
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
      }),

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

          if (hasLocalChanges && !resolution) continue; // unresolved conflict — skip
          if (hasLocalChanges && resolution === 'keepLocal') continue; // user keeps local

          // Fast-forward (no local changes) or user chose 'takeServer'
          updates.push({ fileId, snapshot: serverSnapshot });
        }

        // Apply to local working directory
        await onApplied(updates);

        const projectId = pid();
        const branchName = branch();

        // Persist new pulledHead so it survives page reloads
        await savePulledHead(projectId, branchName, headSnapshot);

        // Recompute localHead = new pulledHead + any local commits on top
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
        const { localCommits } = get();
        if (localCommits.length === 0) return;

        const projectId = pid();
        const branchName = branch();

        // Send commits to server in chronological order (oldest first)
        for (const commit of localCommits) {
          await apiFetch(`/api/projects/${projectId}/vcs/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              branchName: commit.branchName,
              message: commit.message,
              files: commit.files,
            }),
          });
        }

        // Clear local commits from IndexedDB
        await clearLocalCommits(projectId, branchName);

        // Refresh panel to get the updated server HEAD (now reflects pushed commits)
        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=1`,
        );

        const newHead = data.headSnapshot ?? [];

        // Persist the new pulledHead
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

    createBranch: (name: string, sourceBranch: string) =>
      run('action', async () => {
        const projectId = pid();
        await apiFetch(`/api/projects/${projectId}/vcs/branches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, sourceBranch }),
        });
        await get().refreshPanel();
      }),

    checkoutBranch: (branchName, onApplySnapshot) =>
      run('action', async () => {
        const projectId = pid();
        await apiFetch(`/api/projects/${projectId}/vcs/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branchName }),
        });
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

        // Get the new branch's HEAD snapshot
        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(branchName)}&page=1`,
        );

        const newHead = data.headSnapshot ?? [];

        // Load any local commits already saved for this branch in IDB
        const newBranchCommits = await loadLocalCommits(projectId, branchName);
        const localHead = computeLocalHead(newHead, newBranchCommits);

        // Persist pulledHead for the new branch
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

        // Apply server HEAD to local working directory
        await onApplySnapshot(newHead);
      }),

    // ── Commit (local-only — call push() to send to server) ────────────────────

    commit: (message, files, onCommitted) =>
      run('action', async () => {
        const projectId = pid();
        const branchName = branch();

        // Generate a stable local ID (timestamp + random suffix)
        const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const newCommit: LocalCommit = {
          localId,
          projectId,
          branchName,
          message,
          // VcsFileSnapshotForCommit is structurally identical to LocalCommitFile
          files: files as LocalCommit['files'],
          createdAt: new Date().toISOString(),
        };

        // Persist to IndexedDB — NOT sent to server yet
        await saveLocalCommit(newCommit);

        const committedIds = new Set(files.map((f) => f.fileId));

        set((s) => {
          const localCommits = [...s.localCommits, newCommit];
          const pulledHead = s.pulledHead ?? s.headSnapshot ?? [];
          const localHead = computeLocalHead(pulledHead, localCommits);
          return {
            localCommits,
            localHead,
            // Optimistically clear committed files from status so the panel
            // feels responsive before the status effect re-runs.
            statusEntries: s.statusEntries.filter((e) => !committedIds.has(e.fileId)),
          };
        });

        await onCommitted();
      }),

    loadCommitDetail: (commitId: string) =>
      run('action', async () => {
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
        const projectId = pid();
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
        const projectId = pid();
        const currentBranch = branch();
        await apiFetch(`/api/projects/${projectId}/vcs/merge/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceBranch, targetBranch, conflictResolutions }),
        });
        set({ mergePreview: null });

        // Refresh panel to get post-merge headSnapshot
        const data = await apiFetch<{
          branches: VcsBranch[];
          headSnapshot: HeadSnapshotArray;
          commits: VcsCommit[];
          commitsHasMore: boolean;
        }>(
          `/api/projects/${projectId}/vcs/panel?branch=${encodeURIComponent(currentBranch)}&page=1`,
        );
        const newHead = data.headSnapshot ?? [];

        // Persist new pulledHead; merge = implicit pull, clear local commits
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

    revertCommit: (commitId, fileId, onApplySnapshot) =>
      run('action', async () => {
        const projectId = pid();
        const branchName = branch();
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

        // Persist new pulledHead; revert = implicit pull, clear local commits
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

        await onApplySnapshot(newHead);
      }),

    // ── Restore working directory ──────────────────────────────────────────────

    restoreFilesFromHead: (fileIds, onApplied) =>
      run('action', async () => {
        const projectId = pid();
        const branchName = branch();

        await apiFetch(`/api/projects/${projectId}/vcs/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branchName, fileIds }),
        });

        // Build updates from current localHead (includes local commits)
        const { localHead, headSnapshot } = get();
        const headMap = new Map(
          (localHead ?? headSnapshot ?? []).map(({ fileId, snapshot }) => [fileId, snapshot]),
        );

        const updates: PullFileUpdate[] = fileIds.map((fileId) => ({
          fileId,
          snapshot: headMap.get(fileId) ?? null,
        }));

        // Optimistic: remove restored files from status
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
