'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

export interface VcsCommitFile {
  id: string;
  commitId: string;
  projectId: string;
  fileId: string;
  changeType: 'add' | 'modify' | 'delete' | 'rename';
  snapshot: {
    fileId: string;
    name: string;
    type: 'file' | 'folder';
    parentId: string | null;
    content: string;
    order: number;
  } | null;
  previousFileId: string | null;
  createdAt: string;
}

export interface MergePreviewFile {
  fileId: string;
  source: VcsCommitFile['snapshot'];
  target: VcsCommitFile['snapshot'];
}

export interface VcsStatusEntry {
  fileId: string;
  fileName: string;
  status: 'untracked' | 'modified' | 'deleted';
}

export interface VcsHeadFileVersion {
  fileId: string;
  branchName: string;
  snapshot: VcsCommitFile['snapshot'];
}

interface VcsStateArgs {
  projectId: string;
}

const storageKey = (projectId: string) => `writepad_vcs_branch_${projectId}`;

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? 'Request failed');
  }
  return json as T;
}

export function useProjectVcs({ projectId }: VcsStateArgs) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<VcsBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [commits, setCommits] = useState<VcsCommit[]>([]);
  const [statusEntries, setStatusEntries] = useState<VcsStatusEntry[]>([]);
  const [activeCommitChanges, setActiveCommitChanges] = useState<VcsCommitFile[]>([]);
  const [mergePreview, setMergePreview] = useState<{
    sourceBranch: string;
    targetBranch: string;
    autoMergedFiles: MergePreviewFile[];
    conflicts: MergePreviewFile[];
  } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    try {
      const fromStorage = localStorage.getItem(storageKey(projectId));
      if (fromStorage) setCurrentBranch(fromStorage);
    } catch {
      // ignore
    }
  }, [projectId]);

  const setAndPersistBranch = useCallback((branch: string) => {
    setCurrentBranch(branch);
    try {
      localStorage.setItem(storageKey(projectId), branch);
    } catch {
      // ignore
    }
  }, [projectId]);

  const refreshBranches = useCallback(async () => {
    const data = await parseJson<VcsBranch[]>(
      await fetch(`/api/projects/${projectId}/vcs/branches`, { cache: 'no-store' }),
    );
    setBranches(data);
    if (!data.some((b) => b.name === currentBranch)) {
      setAndPersistBranch('main');
    }
    return data;
  }, [projectId, currentBranch, setAndPersistBranch]);

  const refreshCommits = useCallback(async (branch = currentBranch) => {
    const data = await parseJson<VcsCommit[]>(
      await fetch(`/api/projects/${projectId}/vcs/commits?branch=${encodeURIComponent(branch)}`, { cache: 'no-store' }),
    );
    setCommits(data);
    return data;
  }, [projectId, currentBranch]);

  const refreshStatus = useCallback(async (branch = currentBranch) => {
    const data = await parseJson<{ entries: VcsStatusEntry[] }>(
      await fetch(`/api/projects/${projectId}/vcs/status?branch=${encodeURIComponent(branch)}`, { cache: 'no-store' }),
    );
    setStatusEntries(data.entries ?? []);
    return data.entries ?? [];
  }, [projectId, currentBranch]);

  const createBranch = useCallback(async (name: string, sourceBranch: string) => {
    await parseJson(
      await fetch(`/api/projects/${projectId}/vcs/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sourceBranch }),
      }),
    );
    await refreshBranches();
    await refreshStatus(currentBranch);
  }, [projectId, refreshBranches, refreshStatus, currentBranch]);

  const checkoutBranch = useCallback(async (branchName: string) => {
    await parseJson(
      await fetch(`/api/projects/${projectId}/vcs/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName }),
      }),
    );
    setAndPersistBranch(branchName);
    setMergePreview(null);
    await refreshCommits(branchName);
    await refreshStatus(branchName);
  }, [projectId, refreshCommits, refreshStatus, setAndPersistBranch]);

  const commit = useCallback(async (message: string, fileIds: string[]) => {
    await parseJson(
      await fetch(`/api/projects/${projectId}/vcs/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName: currentBranch, message, fileIds }),
      }),
    );
    await refreshBranches();
    await refreshCommits(currentBranch);
    await refreshStatus(currentBranch);
  }, [projectId, currentBranch, refreshBranches, refreshCommits, refreshStatus]);

  const loadCommitDetail = useCallback(async (commitId: string) => {
    const data = await parseJson<{ changes: VcsCommitFile[] }>(
      await fetch(`/api/projects/${projectId}/vcs/commits/${commitId}`),
    );
    setActiveCommitChanges(data.changes ?? []);
    return data.changes ?? [];
  }, [projectId]);

  const previewMerge = useCallback(async (sourceBranch: string, targetBranch: string) => {
    const data = await parseJson<{
      autoMergedFiles: MergePreviewFile[];
      conflicts: MergePreviewFile[];
    }>(
      await fetch(`/api/projects/${projectId}/vcs/merge/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBranch, targetBranch }),
      }),
    );
    setMergePreview({
      sourceBranch,
      targetBranch,
      autoMergedFiles: data.autoMergedFiles ?? [],
      conflicts: data.conflicts ?? [],
    });
    return data;
  }, [projectId]);

  const executeMerge = useCallback(async (
    sourceBranch: string,
    targetBranch: string,
    conflictResolutions: Array<{ fileId: string; resolution: 'useSource' | 'useTarget' }>,
  ) => {
    await parseJson(
      await fetch(`/api/projects/${projectId}/vcs/merge/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBranch, targetBranch, conflictResolutions }),
      }),
    );
    setMergePreview(null);
    await refreshBranches();
    await refreshCommits(targetBranch);
    await refreshStatus(targetBranch);
  }, [projectId, refreshBranches, refreshCommits, refreshStatus]);

  const revertCommit = useCallback(async (commitId: string, fileId?: string) => {
    await parseJson(
      await fetch(`/api/projects/${projectId}/vcs/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName: currentBranch, commitId, fileId }),
      }),
    );
    await refreshBranches();
    await refreshCommits(currentBranch);
    await refreshStatus(currentBranch);
  }, [projectId, currentBranch, refreshBranches, refreshCommits, refreshStatus]);

  const fileHistory = useCallback(async (fileId: string) => {
    return parseJson<Array<VcsCommitFile & { commit: VcsCommit | null }>>(
      await fetch(`/api/projects/${projectId}/vcs/files/${fileId}/history`),
    );
  }, [projectId]);

  const generateCommitMessage = useCallback(async (fileIds: string[], branchName = currentBranch) => {
    const data = await parseJson<{ message: string }>(
      await fetch(`/api/projects/${projectId}/vcs/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName, fileIds }),
      }),
    );
    return data.message ?? '';
  }, [projectId, currentBranch]);

  const getHeadFileVersion = useCallback(async (fileId: string, branchName = currentBranch) => {
    return parseJson<VcsHeadFileVersion>(
      await fetch(
        `/api/projects/${projectId}/vcs/files/${fileId}/head?branch=${encodeURIComponent(branchName)}`,
        { cache: 'no-store' },
      ),
    );
  }, [projectId, currentBranch]);

  const wrapped = useCallback(async <T,>(run: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await run();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const api = useMemo(() => ({
    refreshBranches: () => wrapped(refreshBranches),
    refreshCommits: (branch?: string) => wrapped(() => refreshCommits(branch)),
    refreshStatus: (branch?: string) => wrapped(() => refreshStatus(branch)),
    createBranch: (name: string, sourceBranch: string) => wrapped(() => createBranch(name, sourceBranch)),
    checkoutBranch: (branchName: string) => wrapped(() => checkoutBranch(branchName)),
    commit: (message: string, fileIds: string[]) => wrapped(() => commit(message, fileIds)),
    loadCommitDetail: (commitId: string) => wrapped(() => loadCommitDetail(commitId)),
    previewMerge: (sourceBranch: string, targetBranch: string) => wrapped(() => previewMerge(sourceBranch, targetBranch)),
    executeMerge: (
      sourceBranch: string,
      targetBranch: string,
      conflictResolutions: Array<{ fileId: string; resolution: 'useSource' | 'useTarget' }>,
    ) => wrapped(() => executeMerge(sourceBranch, targetBranch, conflictResolutions)),
    revertCommit: (commitId: string, fileId?: string) => wrapped(() => revertCommit(commitId, fileId)),
    fileHistory: (fileId: string) => wrapped(() => fileHistory(fileId)),
    generateCommitMessage: (fileIds: string[], branchName?: string) =>
      wrapped(() => generateCommitMessage(fileIds, branchName)),
    getHeadFileVersion: (fileId: string, branchName?: string) =>
      wrapped(() => getHeadFileVersion(fileId, branchName)),
  }), [
    wrapped,
    refreshBranches,
    refreshCommits,
    refreshStatus,
    createBranch,
    checkoutBranch,
    commit,
    loadCommitDetail,
    previewMerge,
    executeMerge,
    revertCommit,
    fileHistory,
    generateCommitMessage,
    getHeadFileVersion,
  ]);

  return {
    loading,
    error,
    branches,
    currentBranch,
    commits,
    statusEntries,
    activeCommitChanges,
    mergePreview,
    setCurrentBranch: setAndPersistBranch,
    setActiveCommitChanges,
    clearError: () => setError(null),
    ...api,
  };
}
