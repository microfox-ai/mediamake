'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Loader2 } from 'lucide-react';
import { FileExplorer } from '@/components/writepad/left';
import { EditorPane } from '@/components/writepad/middle';
import { AgentEditorPane } from '@/components/writepad/middle/AgentEditorPane';
import { MenuBar } from '@/components/writepad/middle/MenuBar';
import { ChatPanel } from '@/components/writepad/right';
import { useProjectData } from './_hooks/useProjectData';
import { useVcsStore } from './_hooks/useVcsStore';
import type { VcsFileSnapshotForCommit } from './_hooks/useVcsStore';
import { useEditorPreferences } from '@/hooks/useEditorPreferences';
import type { SelectionContext, DiffViewState, VcsCommitViewData, WikiTerm, RefResult } from '@/components/writepad/middle/types';
import type { AIChange } from '@/components/writepad/right/types';
import type { CodeMirrorEditorHandle } from '@/components/writepad/middle/CodeMirrorEditor';
import { ShareProjectDialog } from '@/components/writepad/ShareProjectDialog';
import { VcsPanel } from '@/components/writepad/left/VcsPanel';
import type { ProjectComment, CommentStatus } from '@/components/writepad/commentTypes';
import {
  WorkerRunPane,
  type WorkerRunPaneMode,
} from '@/components/writepad/middle/WorkerRunPane';

// ── Wiki frontmatter parser ────────────────────────────────────────────────────
// Parses optional YAML frontmatter from wiki files.
// Supported keys: aliases (string array), tags (string array).
//
// Inline format:   aliases: [Name One, Name Two]
// Block format:    aliases:
//                    - Name One
//                    - Name Two
function parseWikiFrontmatter(content: string): {
  aliases: string[];
  tags: string[];
  bodyContent: string;
} {
  const fmMatch = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/);
  if (!fmMatch) return { aliases: [], tags: [], bodyContent: content };

  const yaml = fmMatch[1] ?? '';
  const bodyContent = fmMatch[2] ?? '';

  const parseList = (key: string): string[] => {
    // Inline: key: [val1, val2]
    const inline = yaml.match(new RegExp(`^${key}:\\s*\\[([^\\]]*?)\\]`, 'm'));
    if (inline) {
      return inline[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    }
    // Block: key:\n  - val\n  - val
    const blockHeader = yaml.match(new RegExp(`^${key}:\\s*$`, 'm'));
    if (blockHeader) {
      const afterKey = yaml.slice(yaml.indexOf(blockHeader[0]) + blockHeader[0].length);
      const items = afterKey.match(/^[ \t]+-[ \t]+(.+)$/gm);
      if (items) return items.map((l) => l.replace(/^[ \t]+-[ \t]+/, '').trim()).filter(Boolean);
    }
    return [];
  };

  return { aliases: parseList('aliases'), tags: parseList('tags'), bodyContent };
}

function ProjectEditorContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = (params?.projectId as string) ?? '';

  const project = useProjectData(projectId);
  const vcs = useVcsStore();
  const { prefs, setPrefs } = useEditorPreferences();

  // Initialize VCS store for this project, then mark pulled so fetch correctly
  // computes deltas from the initially-loaded state.
  useEffect(() => {
    if (!projectId) return;
    vcs.init(projectId);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once the panel has loaded (headSnapshot is set) for the first time, mark it
  // as pulled so subsequent fetches correctly diff against this baseline.
  const markedPulledRef = useRef(false);
  useEffect(() => {
    if (vcs.headSnapshot && !markedPulledRef.current) {
      markedPulledRef.current = true;
      vcs.markPulled();
    }
  }, [vcs.headSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client-side VCS status computation ───────────────────────────────────
  // Status is computed here (not server-side) so each user sees diffs against
  // their own in-memory working state — not the shared project_files DB that can
  // be contaminated by other users' checkouts and commits.
  const statusComputeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Use localHead (pulledHead + local commits applied) as the baseline so that:
    //   1. Files committed locally but not yet pushed show as unchanged (correct).
    //   2. A remote fetch() that advances headSnapshot doesn't make local files
    //      appear "modified" — we diff against the last-pulled baseline, not the
    //      freshly-fetched server HEAD.
    const snapshot = vcs.localHead ?? vcs.pulledHead ?? vcs.headSnapshot;
    if (snapshot === null) return; // not yet loaded

    // Debounce: re-runs on every keystroke (openTabs changes), compute 300ms after idle
    if (statusComputeTimerRef.current) clearTimeout(statusComputeTimerRef.current);
    statusComputeTimerRef.current = setTimeout(() => {
      // headSnapshot: fileId → VcsFileSnapshot | null  (null = file deleted at HEAD)
      const headMap = new Map(snapshot.map(({ fileId, snapshot: s }) => [fileId, s]));

      // getAllFiles() already returns the most-current content per file:
      //   open tab  → tab.content  (live keystrokes, possibly unsaved)
      //   closed    → draft ?? savedContent
      // This is purely client-side — no shared DB read involved.
      const currentMap = new Map<string, {
        name: string; type: 'file' | 'folder'; parentId: string | null; content: string;
      }>();
      for (const f of project.getAllFiles()) {
        if (f.type !== 'file') continue;
        currentMap.set(f.fileId, {
          name: f.fileName, type: f.type, parentId: f.parentId, content: f.content,
        });
      }

      const allIds = new Set([...headMap.keys(), ...currentMap.keys()]);
      const entries: Array<{ fileId: string; fileName: string; status: 'untracked' | 'modified' | 'deleted' }> = [];

      for (const fileId of allIds) {
        const head   = headMap.has(fileId)    ? (headMap.get(fileId)    ?? null) : null;
        const current = currentMap.has(fileId) ? (currentMap.get(fileId) ?? null) : null;
        if (!head && !current) continue;

        const same =
          head && current &&
          head.name      === current.name    &&
          head.type      === current.type    &&
          head.parentId  === current.parentId &&
          head.content   === current.content;
        if (same) continue;

        if (!head && current) {
          entries.push({ fileId, fileName: current.name, status: 'untracked' });
        } else if (head && !current) {
          entries.push({ fileId, fileName: head.name, status: 'deleted' });
        } else {
          entries.push({ fileId, fileName: current!.name, status: 'modified' });
        }
      }

      entries.sort((a, b) => a.fileName.localeCompare(b.fileName));
      vcs.setStatusEntries(entries);
    }, 300);

    return () => {
      if (statusComputeTimerRef.current) clearTimeout(statusComputeTimerRef.current);
    };
  // getAllFiles recreates whenever openTabs changes (it's in its own useCallback deps),
  // so this effect fires on every keystroke — the 300ms debounce keeps it cheap.
  }, [vcs.localHead, vcs.pulledHead, vcs.headSnapshot, project.getAllFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a VCS file snapshot for commit from the current client state.
  // getAllFiles() already returns the most-current content (tab.content ?? draft ?? saved).
  // Used by VcsPanel when the user commits staged files.
  const getFileSnapshotForCommit = useCallback((fileId: string): VcsFileSnapshotForCommit | null => {
    const allFiles = project.getAllFiles();
    const fileInfo = allFiles.find((f) => f.fileId === fileId);
    if (!fileInfo) return null;

    // Preserve the file's previously-committed order so checkout/merge restores correct ordering.
    // For brand-new files not yet in HEAD, fall back to 0.
    const headEntry = vcs.headSnapshot?.find((h) => h.fileId === fileId);
    const order = headEntry?.snapshot?.order ?? 0;

    return {
      fileId,
      name: fileInfo.fileName,
      type: fileInfo.type as 'file' | 'folder',
      parentId: fileInfo.parentId,
      content: fileInfo.content, // getAllFiles already resolves tab.content ?? draft ?? saved
      order,
    };
  }, [project.getAllFiles, vcs.headSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  const { setTheme } = useTheme();

  // Keep next-themes in sync with editor pref so ALL panels (left/right) follow theme.
  useEffect(() => {
    setTheme(prefs.theme);
  }, [prefs.theme, setTheme]);

  // F11 toggles focus mode (hides left + right panels).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        setFocusMode((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [pendingContext, setPendingContext] = useState<SelectionContext | null>(null);
  const [diffView, setDiffView] = useState<DiffViewState | null>(null);
  const [vcsCommitView, setVcsCommitView] = useState<VcsCommitViewData | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<{ offset: number } | null>(null);
  const [searchHighlight, setSearchHighlight] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [chatIsStreaming, setChatIsStreaming] = useState(false);

  // ── Inline comments ───────────────────────────────────────────────────────
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [openCommentsView, setOpenCommentsView] = useState(false);

  // ── Worker runs — middle-pane viewer (generic for any registered worker) ──
  const [workerPaneMode, setWorkerPaneMode] = useState<WorkerRunPaneMode | null>(null);
  /** Bumped whenever a new run is triggered so the WorkersPanel refetches. */
  const [workersRefetchSignal, setWorkersRefetchSignal] = useState(0);

  // ── Wiki / Find All References state ─────────────────────────────────────
  const [findRefsData, setFindRefsData] = useState<{ term: string; results: RefResult[] } | null>(null);

  // Editor ref — shared between MenuBar (goToLine, selectAll, format) and EditorPane
  const editorRef = useRef<CodeMirrorEditorHandle>(null);

  // ── URL param application (shareable links) ───────────────────────────────
  // After the project finishes loading, apply any ?file=&branch=&line(s)= params
  // once. A ref prevents re-applying on subsequent renders.
  const hasAppliedUrlParams = useRef(false);
  useEffect(() => {
    if (project.loading || hasAppliedUrlParams.current) return;
    hasAppliedUrlParams.current = true;

    const fileParam   = searchParams.get('file');
    const branchParam = searchParams.get('branch');
    const linesParam  = searchParams.get('lines');  // "10-20"
    const lineParam   = searchParams.get('line');   // "10"
    const commitParam = searchParams.get('commit'); // commitId from graph page

    const applyParams = async () => {
      // 1. Switch branch first so the right file versions are loaded
      if (branchParam && branchParam !== vcs.currentBranch) {
        await vcs.checkoutBranch(branchParam, project.applySnapshotToLocal).catch(() => {});
      }

      // 2. Open a specific file + optional line navigation
      if (fileParam) {
        const node = findFileNodeById(fileParam);
        if (node && node.type === 'file') project.openFile(node);
        const lineStr = linesParam?.split('-')[0] ?? lineParam;
        if (lineStr) {
          const line = parseInt(lineStr, 10);
          if (!isNaN(line) && line > 0) {
            setTimeout(() => editorRef.current?.goToLine(line), 350);
          }
        }
      }

      // 3. Open a commit diff view (from the Branch Graph page link)
      //    handleOpenCommitDiff is stable (only depends on projectId) — safe to call here.
      if (commitParam) {
        // Small delay so the editor panel has time to mount before the diff overlay appears
        setTimeout(() => {
          handleOpenCommitDiff(commitParam).catch(() => {});
        }, 250);
      }
    };

    applyParams().catch(() => {});
  }, [project.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Change tracking
  const [changeStatuses, setChangeStatuses] = useState<Record<string, 'applied' | 'declined'>>({});
  const changeFileMapRef = useRef<Record<string, string>>({});

  const displayName = projectName ?? project.projectName;
  const fileNameById = useMemo(() => {
    const out = new Map<string, string>();
    for (const file of project.getAllFiles()) out.set(file.fileId, file.fileName);
    return out;
  }, [project]);

  // Filter .writepad/plans/ out of the file tree when showPlanFiles is off.
  const filteredFiles = useMemo(() => {
    if (prefs.showPlanFiles) return project.files;
    return project.files.map((node) => {
      if (node.type === 'folder' && node.name.toLowerCase() === '.writepad') {
        return {
          ...node,
          children: (node.children ?? []).filter(
            (child) => !(child.type === 'folder' && child.name.toLowerCase() === 'plans'),
          ),
        };
      }
      return node;
    });
  }, [project.files, prefs.showPlanFiles]);

  // Resolve .writepad/rules.md content from the flat file list for AI context.
  const writepadRules = useMemo(() => {
    const all = project.getAllFiles();
    const writepadFolder = all.find(
      (f) => f.type === 'folder' && f.fileName.toLowerCase() === '.writepad' && !f.parentId,
    );
    const rulesFile = writepadFolder
      ? all.find(
          (f) => f.type === 'file' && f.fileName.toLowerCase() === 'rules.md' && f.parentId === writepadFolder.fileId,
        )
      : undefined;
    return rulesFile?.content ?? null;
  }, [project]);

  // ── Wiki terms — derived from .writepad/wiki/*.md files ──────────────────
  // Depends on project.getAllFiles so it updates when wiki files are opened/edited.
  const wikiTerms = useMemo<WikiTerm[]>(() => {
    const all = project.getAllFiles();
    const writepadFolder = all.find(
      (f) => f.type === 'folder' && f.fileName === '.writepad' && !f.parentId,
    );
    if (!writepadFolder) return [];
    const wikiFolder = all.find(
      (f) => f.type === 'folder' && f.fileName === 'wiki' && f.parentId === writepadFolder.fileId,
    );
    if (!wikiFolder) return [];

    return all
      .filter(
        (f) =>
          f.type === 'file' &&
          f.parentId === wikiFolder.fileId &&
          f.fileName.toLowerCase().endsWith('.md'),
      )
      .map((f) => {
        const term = f.fileName.replace(/\.md$/i, '').replace(/-/g, ' ');
        const { aliases, tags, bodyContent } = parseWikiFrontmatter(f.content);
        const allTerms = [term, ...aliases];
        // Summary: first non-empty, non-heading, non-comment line in body
        const summary = bodyContent
          .split('\n')
          .filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('<!--'))
          .join(' ')
          .slice(0, 220)
          .trim();
        return {
          fileId: f.fileId,
          term,
          aliases,
          allTerms,
          summary: summary || bodyContent.slice(0, 220).trim(),
          content: f.content,
          tags,
        } satisfies WikiTerm;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.getAllFiles]);

  // ── Diff helpers ──────────────────────────────────────────────────────────

  const handleOpenDiff = useCallback(
    (fileId: string) => {
      const tab = project.openTabs.find((t) => t.fileId === fileId);
      if (!tab) return;
      setDiffView({
        fileId: tab.fileId,
        fileName: tab.name,
        original: tab.savedContent,
        modified: tab.draftContent ?? tab.content,
      });
    },
    [project.openTabs],
  );

  const handleShowDraftDiff = useCallback(
    (fileId: string) => {
      const tab = project.openTabs.find((t) => t.fileId === fileId);
      if (!tab) return;
      setDiffView({
        fileId: tab.fileId,
        fileName: tab.name,
        original: tab.savedContent,
        modified: tab.draftContent ?? tab.content,
      });
    },
    [project.openTabs],
  );

  // ── Worker pane handlers ─────────────────────────────────────────────────

  /** Open a past or active worker run in the middle pane. */
  const handleOpenWorkerRun = useCallback((workerId: string, jobId: string) => {
    setActiveAgentId(null);
    setWorkerPaneMode({ kind: 'view', workerId, jobId });
  }, []);

  /** Open a worker's trigger form in the middle pane. */
  const handleOpenWorkerTrigger = useCallback((workerId: string) => {
    setActiveAgentId(null);
    setWorkerPaneMode({ kind: 'trigger', workerId });
  }, []);

  /** Close the worker pane and return to the editor. */
  const handleCloseWorkerPane = useCallback(() => {
    setWorkerPaneMode(null);
  }, []);

  /** Switch to view-mode after a successful trigger. */
  const handleWorkerTriggered = useCallback((jobId: string, workerId: string) => {
    setWorkerPaneMode({ kind: 'view', workerId, jobId });
    setWorkersRefetchSignal((n) => n + 1);
  }, []);

  // Full path map: fileId → "folder/subfolder/name.md"
  const filePathMap = useMemo(() => {
    const allFiles = project.getAllFiles();
    const byId = new Map(allFiles.map((f) => [f.fileId, f]));

    function getPath(fileId: string, visited = new Set<string>()): string {
      if (visited.has(fileId)) return '';
      visited.add(fileId);
      const f = byId.get(fileId);
      if (!f) return '';
      if (!f.parentId) return f.fileName;
      const parent = getPath(f.parentId, visited);
      return parent ? `${parent}/${f.fileName}` : f.fileName;
    }

    const map: Record<string, string> = {};
    for (const f of allFiles) {
      if (f.type === 'file') map[f.fileId] = getPath(f.fileId);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.files]);

  // Inverse map: full path → fileId (used by the continuity report pane to
  // resolve issue locations back to the editor's file IDs).
  const filePathToFileId = useMemo(() => {
    const inverse: Record<string, string> = {};
    for (const [fileId, path] of Object.entries(filePathMap)) {
      inverse[path] = fileId;
    }
    return inverse;
  }, [filePathMap]);

  // ── Backlinks — which project files reference the active wiki entry ──────
  // Only set when the currently-open file IS a wiki entry.
  const activeFileBacklinks = useMemo(() => {
    if (!project.activeFileId) return null;
    const activeTerm = wikiTerms.find((t) => t.fileId === project.activeFileId);
    if (!activeTerm) return null; // active file is not a wiki entry

    const all = project.getAllFiles();
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `\\b(?:${activeTerm.allTerms.map(escapeRegex).join('|')})\\b`,
      'gi',
    );

    const results: Array<{ fileId: string; filePath: string; count: number }> = [];
    for (const file of all) {
      if (file.type === 'folder' || !file.content) continue;
      if (file.fileId === project.activeFileId) continue; // skip self
      const matches = file.content.match(re);
      if (matches && matches.length > 0) {
        results.push({
          fileId: file.fileId,
          filePath: filePathMap[file.fileId] ?? file.fileName,
          count: matches.length,
        });
      }
    }
    return results.length > 0 ? results : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.activeFileId, wikiTerms, project.getAllFiles, filePathMap]);

  // Stable ref for the build-plan handler — lets planBanner memo stay stable.
  const buildPlanFromEditorRef = useRef<() => void>(() => {});

  // Compute plan file banner status when the active file is a .writepad/plans/ file.
  // Must be after filePathMap.
  const planBanner = useMemo(() => {
    if (!project.activeFileId) return undefined;
    const path = filePathMap[project.activeFileId] ?? '';
    if (!path.toLowerCase().startsWith('.writepad/plans/')) return undefined;

    const tab = project.openTabs.find((t) => t.fileId === project.activeFileId);
    const content = tab?.content ?? '';

    const hasUnchecked = /^- \[ \]/m.test(content);
    const hasAnyTask = /^- \[[ x]\]/m.test(content);
    const status = chatIsStreaming
      ? 'building' as const
      : (!hasAnyTask || !hasUnchecked)
        ? 'built' as const
        : 'start' as const;

    return { status, onBuild: () => buildPlanFromEditorRef.current() };
  }, [project.activeFileId, project.openTabs, filePathMap, chatIsStreaming]);

  const findFileNodeById = useCallback((fileId: string) => {
    const walk = (nodes: typeof project.files): (typeof project.files)[0] | undefined => {
      for (const node of nodes) {
        if (node.id === fileId) return node;
        if (node.children) {
          const found = walk(node.children);
          if (found) return found;
        }
      }
    };
    return walk(project.files);
  }, [project.files]);

  /** Jump to a file path + line from inside any worker's output viewer. */
  const handleJumpToWorkerLocation = useCallback(
    (fileId: string, lineNumber: number) => {
      // Close the worker pane so the editor takes over.
      setWorkerPaneMode(null);
      const node = findFileNodeById(fileId);
      if (node && node.type === 'file') {
        project.openFile(node);
      } else {
        const f = project.getAllFiles().find((x) => x.fileId === fileId);
        if (f) {
          const syntheticNode = {
            id: fileId,
            name: f.fileName,
            type: 'file' as const,
            content: f.content,
          };
          project.openFile(syntheticNode as Parameters<typeof project.openFile>[0]);
        }
      }
      const content =
        project.openTabs.find((t) => t.fileId === fileId)?.content ??
        project.getAllFiles().find((f) => f.fileId === fileId)?.content ?? '';
      const lines = content.split('\n');
      let offset = 0;
      for (let i = 0; i < Math.min(lineNumber - 1, lines.length - 1); i++) {
        offset += lines[i].length + 1;
      }
      setDiffView(null);
      setPendingNavigate({ offset });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, findFileNodeById],
  );

  // ── Comments — load + CRUD ────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`);
      if (!res.ok) return;
      const data = await res.json() as { comments?: ProjectComment[] };
      setComments(data.comments ?? []);
    } catch { /* non-fatal */ }
  }, [projectId]);

  // Load comments once the project is ready
  useEffect(() => {
    if (project.loading) return;
    fetchComments();
  }, [project.loading, fetchComments]);

  const handleAddComment = useCallback(
    async (fileId: string, lineNumber: number, lineContent: string, text: string) => {
      const filePath = filePathMap[fileId] ?? (project.getAllFiles().find((f) => f.fileId === fileId)?.fileName ?? fileId);
      await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, filePath, lineNumber, lineContent, text }),
      });
      await fetchComments();
      // Open the comments panel so the user immediately sees their new comment.
      // Reset after a brief moment so adding a second comment later re-triggers the switch.
      setOpenCommentsView(true);
      setTimeout(() => setOpenCommentsView(false), 200);
    },
    [projectId, filePathMap, project, fetchComments],
  );

  const handleCommentUpdateStatus = useCallback(
    async (commentId: string, status: CommentStatus) => {
      await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, status, updatedAt: new Date().toISOString() } : c)),
      );
    },
    [projectId],
  );

  const handleCommentDelete = useCallback(
    async (commentId: string) => {
      await fetch(`/api/projects/${projectId}/comments/${commentId}`, { method: 'DELETE' });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    },
    [projectId],
  );

  /** Navigate to a commented line — open the file and jump to that line. */
  const handleCommentNavigate = useCallback(
    (fileId: string, lineNumber: number) => {
      const node = findFileNodeById(fileId);
      if (node && node.type === 'file') {
        project.openFile(node);
      } else {
        const f = project.getAllFiles().find((x) => x.fileId === fileId);
        if (f) {
          const syntheticNode = { id: fileId, name: f.fileName, type: 'file' as const, content: f.content };
          project.openFile(syntheticNode as Parameters<typeof project.openFile>[0]);
        }
      }
      // Compute byte offset for the target line
      const content =
        project.openTabs.find((t) => t.fileId === fileId)?.content ??
        project.getAllFiles().find((f) => f.fileId === fileId)?.content ?? '';
      const lines = content.split('\n');
      let offset = 0;
      for (let i = 0; i < Math.min(lineNumber - 1, lines.length - 1); i++) {
        offset += lines[i].length + 1;
      }
      setDiffView(null);
      setPendingNavigate({ offset });
    },
    [findFileNodeById, project],
  );

  /** Open the comments panel when user clicks a decorated line in the editor. */
  const handleCommentLineClick = useCallback((_lineNumber: number) => {
    setOpenCommentsView(true);
    setTimeout(() => setOpenCommentsView(false), 200);
  }, []);

  const handleVcsOpenCurrentFile = useCallback((fileId: string) => {
    const node = findFileNodeById(fileId);
    if (node && node.type === 'file') {
      project.openFile(node);
    }
  }, [findFileNodeById, project]);

  const handleVcsOpenDiff = useCallback(async (fileId: string) => {
    const node = findFileNodeById(fileId);
    if (node && node.type === 'file') project.openFile(node);

    try {
      const head = await vcs.getHeadFileVersion(fileId, vcs.currentBranch);
      const openTab = project.openTabs.find((t) => t.fileId === fileId) ?? null;
      const allFileMap = new Map(project.getAllFiles().map((f) => [f.fileId, f]));
      const current = openTab
        ? openTab.content
        : (allFileMap.get(fileId)?.content ?? '');
      const fileName = fileNameById.get(fileId) ?? head.snapshot?.name ?? fileId;
      const isDeleted = head.snapshot !== null && current === '' && !allFileMap.has(fileId);
      const isUntracked = head.snapshot === null;
      setDiffView({
        fileId,
        fileName,
        original: head.snapshot?.content ?? '',
        modified: current,
        originalLabel: isDeleted ? 'Committed (HEAD)' : isUntracked ? 'Before (untracked)' : 'Committed (HEAD)',
        modifiedLabel: isDeleted ? 'Working dir (deleted)' : isUntracked ? 'Working dir (new file)' : 'Working dir',
      });
    } catch {
      // File may not be tracked yet — open without diff
    }
  }, [findFileNodeById, fileNameById, project, vcs]);

  // Open a commit's full diff in the middle panel (VS Code style).
  const handleOpenCommitDiff = useCallback(async (commitId: string) => {
    try {
      const data = await fetch(
        `/api/projects/${projectId}/vcs/commits/${commitId}`,
        { cache: 'no-store' },
      ).then((r) => r.json()) as {
        _id?: string; id?: string; parentCommitId?: string | null; message?: string;
        changes?: VcsCommitViewData['changes'];
      };
      setVcsCommitView({
        commitId,
        commitMessage: data.message ?? commitId.slice(0, 8),
        parentCommitId: data.parentCommitId ?? null,
        changes: data.changes ?? [],
      });
      setDiffView(null); // close any existing diff
    } catch { /* ignore */ }
  }, [projectId]);

  // Restore a file's content to a specific snapshot version.
  // Sets it as a draft so the user can review the restored content before committing.
  // Does NOT revert or remove any VCS commits.
  const handleRestoreFileContent = useCallback(
    async (fileId: string, content: string) => {
      // Open the file in the editor so the user sees the restored content immediately
      const node = findFileNodeById(fileId);
      if (node && node.type === 'file') project.openFile(node);
      // Set as draft — shows as "modified" in VCS status, user can commit it
      await project.setFileDraft(fileId, content);
      // Refresh VCS status to reflect the new working-directory change
      vcs.refreshStatus().catch(() => {});
    },
    [findFileNodeById, project, vcs],
  );

  // Open a file's before/after diff for a specific commit (compares to previous version, not current).
  // original = file state before this commit (at parentCommitId), modified = file state at commitId.
  const handleOpenFileHistoryDiff = useCallback(
    async (fileId: string, commitId: string, parentCommitId: string | null, fileName: string) => {
      try {
        const [atCommit, atParent] = await Promise.all([
          vcs.getFileAtCommit(fileId, commitId),
          parentCommitId
            ? vcs.getFileAtCommit(fileId, parentCommitId)
            : Promise.resolve({ snapshot: null, fileId, commitId: '', changeType: 'add' }),
        ]);
        const commitShort = commitId.slice(0, 7);
        const parentShort = parentCommitId?.slice(0, 7) ?? null;
        setDiffView({
          fileId,
          fileName,
          original: atParent.snapshot?.content ?? '',
          modified: atCommit.snapshot?.content ?? '',
          originalLabel: parentShort ? `← Before (${parentShort})` : '← Before (initial commit)',
          modifiedLabel: `→ After (${commitShort})`,
        });
        setVcsCommitView(null);
      } catch { /* ignore */ }
    },
    [vcs],
  );

  // Open a merge conflict diff in the middle panel.
  // Left pane = target branch content (current), right pane = source branch content (incoming).
  // The user reads the diff, then picks "← keep current" or "accept incoming →" in the left panel.
  const handleOpenConflictDiff = useCallback(
    (
      fileId: string,
      fileName: string,
      sourceBranch: string,
      targetBranch: string,
      sourceContent: string,
      targetContent: string,
    ) => {
      setDiffView({
        fileId,
        fileName,
        original: targetContent,
        modified: sourceContent,
        originalLabel: `← ${targetBranch} (current)`,
        modifiedLabel: `→ ${sourceBranch} (incoming)`,
      });
      setVcsCommitView(null);
    },
    [],
  );

  // Restore deleted files from the branch HEAD to the working directory.
  // Equivalent to `git restore <file>` — applies snapshot to local IndexedDB, no commit.
  const handleVcsRestoreFilesFromHead = useCallback(
    async (fileIds: string[]) => {
      await vcs.restoreFilesFromHead(fileIds, project.applySnapshotToLocal);
    },
    [vcs, project.applySnapshotToLocal],
  );

  const handleSearchSelect = useCallback(
    (fileId: string, offset: number, query: string) => {
      function findNode(nodes: typeof project.files): (typeof project.files)[0] | undefined {
        for (const n of nodes) {
          if (n.id === fileId) return n;
          if (n.children) { const f = findNode(n.children); if (f) return f; }
        }
      }
      const node = findNode(project.files);
      if (node) project.openFile(node);
      setDiffView(null);
      setPendingNavigate({ offset });
      setSearchHighlight(query || null);
    },
    [project],
  );

  const handleReplaceOne = useCallback(
    (fileId: string, newContent: string, offset: number, query: string) => {
      project.updateContent(fileId, newContent);
      setDiffView(null);
      setPendingNavigate({ offset });
      setSearchHighlight(query || null);
    },
    [project],
  );

  const handleReplaceAll = useCallback(
    (replacements: { fileId: string; newContent: string }[]) => {
      for (const { fileId, newContent } of replacements) project.updateContent(fileId, newContent);
    },
    [project],
  );

  // ── AI change handlers ────────────────────────────────────────────────────

  const handleApplyChange = useCallback(
    (change: AIChange) => {
      changeFileMapRef.current[change.changeId] = change.fileId;
      setChangeStatuses((prev) => ({ ...prev, [change.changeId]: 'applied' }));
      project.applyAIDraftEdit(change);
    },
    [project],
  );

  const handleDeclineChange = useCallback(
    (change: AIChange) => {
      const fileId = change.fileId;
      project.revertFileDraft(fileId);
      setChangeStatuses((prev) => {
        const next = { ...prev };
        Object.entries(changeFileMapRef.current).forEach(([cid, fid]) => {
          if (fid === fileId) next[cid] = 'declined';
        });
        return next;
      });
      setDiffView((prev) => (prev?.fileId === fileId ? null : prev));
    },
    [project],
  );

  const handleRevertFileDraft = useCallback(
    (fileId: string) => {
      project.revertFileDraft(fileId);
      setChangeStatuses((prev) => {
        const next = { ...prev };
        Object.entries(changeFileMapRef.current).forEach(([cid, fid]) => {
          if (fid === fileId) next[cid] = 'declined';
        });
        return next;
      });
      setDiffView((prev) => (prev?.fileId === fileId ? null : prev));
    },
    [project],
  );

  // ── Wiki / References actions ─────────────────────────────────────────────

  /** Search all project files for every occurrence of a wiki term. */
  const handleFindAllRefs = useCallback(
    (term: WikiTerm) => {
      const all = project.getAllFiles();
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escapeRegex(term.term)}\\b`, 'gi');
      const results: RefResult[] = [];

      for (const file of all) {
        if (file.type === 'folder' || !file.content) continue;
        const lines = file.content.split('\n');
        lines.forEach((line, idx) => {
          re.lastIndex = 0;
          if (re.test(line)) {
            results.push({
              fileId: file.fileId,
              filePath: filePathMap[file.fileId] ?? file.fileName,
              lineNumber: idx + 1,
              lineText: line.trim(),
            });
          }
        });
      }

      setFindRefsData({ term: term.term, results });
    },
    [project.getAllFiles, filePathMap],
  );

  /** Open the wiki file for a term (the definition file). */
  const handleGoToDefinition = useCallback(
    (fileId: string) => {
      const node = findFileNodeById(fileId);
      if (node && node.type === 'file') {
        project.openFile(node);
      }
    },
    [findFileNodeById, project],
  );

  /**
   * Create a new .writepad/wiki/{word}.md file.
   * Finds or creates the folder structure, then opens and pre-fills the file.
   */
  const handleCreateWikiEntry = useCallback(
    async (word?: string) => {
      const term = (word ?? 'new-term').trim();
      if (!term) return;
      const fileName = `${term.toLowerCase().replace(/\s+/g, '-')}.md`;
      const wikiContent = `---\naliases: []\ntags: []\n---\n\n# ${term}\n\nA brief description of "${term}". This sentence is shown as a tooltip in the editor.\n\n## Details\n\n<!-- Add more detail here. -->\n\n## See Also\n\n`;

      const all = project.getAllFiles();

      // ── 1. Find or create .writepad folder ───────────────────────────────
      let writepadId: string;
      const existingWritepad = all.find(
        (f) => f.type === 'folder' && f.fileName === '.writepad' && !f.parentId,
      );
      if (existingWritepad) {
        writepadId = existingWritepad.fileId;
      } else {
        const r = await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '.writepad', type: 'folder', parentId: null }),
        });
        const { id } = await r.json() as { id: string };
        writepadId = id;
      }

      // ── 2. Find or create .writepad/wiki folder ───────────────────────────
      const allAfterWp = project.getAllFiles();
      let wikiId: string;
      const existingWiki = allAfterWp.find(
        (f) => f.type === 'folder' && f.fileName === 'wiki' && f.parentId === writepadId,
      );
      if (existingWiki) {
        wikiId = existingWiki.fileId;
      } else {
        const r = await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'wiki', type: 'folder', parentId: writepadId }),
        });
        const { id } = await r.json() as { id: string };
        wikiId = id;
      }

      // ── 3. Find existing wiki file or create a new one ────────────────────
      const allAfterWiki = project.getAllFiles();
      const existingFile = allAfterWiki.find(
        (f) =>
          f.type === 'file' &&
          f.fileName.toLowerCase() === fileName.toLowerCase() &&
          f.parentId === wikiId,
      );

      let newFileId: string;
      if (existingFile) {
        newFileId = existingFile.fileId;
      } else {
        const r = await fetch(`/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fileName, type: 'file', parentId: wikiId }),
        });
        const { id } = await r.json() as { id: string };
        newFileId = id;
      }

      // ── 4. Refresh file tree to include new folders/file ─────────────────
      await project.refreshFiles();

      // ── 5. Open the wiki file ─────────────────────────────────────────────
      // Build a synthetic FileNode since the tree may not have re-rendered yet
      const node = { id: newFileId, name: fileName, type: 'file' as const, content: existingFile?.content ?? '' };
      project.openFile(node as Parameters<typeof project.openFile>[0]);

      // ── 6. Pre-fill with template content if newly created ────────────────
      if (!existingFile) {
        project.updateContent(newFileId, wikiContent);
      }
    },
    [project, projectId],
  );

  /** Handle click on a ref result — open the file and navigate to the line. */
  const handleRefResultClick = useCallback(
    (fileId: string, lineNumber: number) => {
      const node = findFileNodeById(fileId);
      if (node && node.type === 'file') {
        project.openFile(node);
      } else {
        // File may not be in tree (e.g. closed tab); find it from getAllFiles
        const f = project.getAllFiles().find((x) => x.fileId === fileId);
        if (f) {
          const syntheticNode = { id: fileId, name: f.fileName, type: 'file' as const, content: f.content };
          project.openFile(syntheticNode as Parameters<typeof project.openFile>[0]);
        }
      }

      // Compute byte offset for the target line
      const tab = project.openTabs.find((t) => t.fileId === fileId);
      const content = tab?.content ?? project.getAllFiles().find((f) => f.fileId === fileId)?.content ?? '';
      const lines = content.split('\n');
      let offset = 0;
      for (let i = 0; i < Math.min(lineNumber - 1, lines.length - 1); i++) {
        offset += lines[i].length + 1; // +1 for '\n'
      }
      setDiffView(null);
      setPendingNavigate({ offset });
    },
    [findFileNodeById, project],
  );

  // ── MenuBar actions ───────────────────────────────────────────────────────

  const handleMenuNewFile = useCallback(() => {
    project.addFile(null, 'untitled.md');
  }, [project]);

  const handleMenuNewFolder = useCallback(() => {
    project.addFolder(null, 'New Folder');
  }, [project]);

  const handleMenuSave = useCallback(() => {
    if (project.activeFileId) project.saveFile(project.activeFileId);
  }, [project]);

  const handleMenuSaveDraft = useCallback(() => {
    if (project.activeFileId) project.saveDraft(project.activeFileId);
  }, [project]);

  const handleMenuRevertDraft = useCallback(() => {
    if (project.activeFileId) handleRevertFileDraft(project.activeFileId);
  }, [project, handleRevertFileDraft]);

  const handleMenuShowDiff = useCallback(() => {
    // If multiple files have changes, show the "all changes" view.
    // Otherwise fall back to single-file diff for the active file.
    const totalChanged = project.unsavedIds.size + project.draftedIds.size;
    if (totalChanged > 1) {
      const activeTab = project.activeTab;
      setDiffView({
        fileId: activeTab?.fileId ?? '',
        fileName: activeTab?.name ?? '',
        original: activeTab?.savedContent ?? '',
        modified: activeTab?.draftContent ?? activeTab?.content ?? '',
        showAll: true,
      });
    } else if (project.activeFileId) {
      handleShowDraftDiff(project.activeFileId);
    }
  }, [project, handleShowDraftDiff]);

  const handleMenuCloseTab = useCallback(() => {
    if (project.activeFileId) project.closeTab(project.activeFileId);
  }, [project]);

  const handleMenuGoToLine = useCallback((line: number) => {
    editorRef.current?.goToLine(line);
  }, []);

  const handleMenuSelectAll = useCallback(() => {
    editorRef.current?.selectAll();
  }, []);

  const handleMenuSendToChat = useCallback(() => {
    const selected = editorRef.current?.getSelectedText() ?? '';
    if (!selected || !project.activeTab) return;
    const { activeTab } = project;
    const content = activeTab.content;
    const before = content.slice(0, content.indexOf(selected));
    const startLine = before.split('\n').length;
    const endLine = startLine + selected.split('\n').length - 1;
    setPendingContext({
      fileId: activeTab.fileId,
      file: activeTab.name,
      lines: `${startLine}-${endLine}`,
      startLine,
      endLine,
      text: selected,
    });
  }, [project]);

  const handleDuplicateProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: 'POST' });
    const json = await res.json() as { id?: string };
    if (json.id) router.push(`/projects/${json.id}`);
  }, [projectId, router]);

  const handleBackupProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/backup`);
    if (!res.ok) return;
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^"]+)"?/i.exec(cd);
    const filename = match?.[1] ?? `${displayName || 'project'}.wpkg`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [projectId, displayName]);

  // ── Shareable link helpers ────────────────────────────────────────────────

  const handleCopyFileLink = useCallback(() => {
    if (!project.activeFileId) return;
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('file', project.activeFileId);
    url.searchParams.set('branch', vcs.currentBranch);
    navigator.clipboard.writeText(url.toString()).catch(() => {});
  }, [project.activeFileId, vcs.currentBranch]);

  /** Copy a shareable link for a specific tab's file (used by tab right-click menu). */
  const handleCopyTabLink = useCallback((fileId: string) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('file', fileId);
    url.searchParams.set('branch', vcs.currentBranch);
    navigator.clipboard.writeText(url.toString()).catch(() => {});
  }, [vcs.currentBranch]);

  const handleCopySelectionLink = useCallback(() => {
    if (!project.activeFileId) return;
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('file', project.activeFileId);
    url.searchParams.set('branch', vcs.currentBranch);
    const lines = editorRef.current?.getSelectionLines();
    if (lines) {
      url.searchParams.set(
        'lines',
        lines.startLine === lines.endLine
          ? String(lines.startLine)
          : `${lines.startLine}-${lines.endLine}`,
      );
    }
    navigator.clipboard.writeText(url.toString()).catch(() => {});
  }, [project.activeFileId, vcs.currentBranch]);

  const handleDeleteProject = useCallback(async () => {
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    router.push('/projects');
  }, [projectId, router]);

  useEffect(() => {
    const onCreated = (evt: Event) => {
      const custom = evt as CustomEvent<{ agentId?: string }>;
      if (custom.detail?.agentId) setActiveAgentId(custom.detail.agentId);
    };
    window.addEventListener('writepad:agent-created', onCreated);
    return () => window.removeEventListener('writepad:agent-created', onCreated);
  }, []);

  /** Called from the plan file banner "Start building" button in EditorPane. */
  const handleBuildPlanFromEditor = useCallback(() => {
    // Dispatch a custom event — ChatSession listens for this to trigger handleBuildPlan
    window.dispatchEvent(new CustomEvent('writepad:build-plan'));
  }, []);

  // Keep the ref in sync with the stable callback
  buildPlanFromEditorRef.current = handleBuildPlanFromEditor;

  // ── Loading / error ───────────────────────────────────────────────────────

  if (project.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (project.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="text-sm text-red-400">Failed to load project: {project.error}</p>
        <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>← Back to Projects</Button>
      </div>
    );
  }

  // next-themes manages the .dark class on <html> — no need for a manual class here.
  const rootClass = 'flex h-screen flex-col bg-background text-foreground';

  return (
    <div className={rootClass}>
      {/* ── MenuBar (replaces old header) ─────────────────────────── */}
      <MenuBar
        projectId={projectId}
        projectName={displayName}
        unsavedCount={project.unsavedIds.size}
        draftedCount={project.draftedIds.size}
        onNewFile={handleMenuNewFile}
        onNewFolder={handleMenuNewFolder}
        onSave={handleMenuSave}
        onSaveAll={project.saveAll}
        onSaveDraft={handleMenuSaveDraft}
        onRevertDraft={handleMenuRevertDraft}
        onShowDiff={handleMenuShowDiff}
        onCloseTab={handleMenuCloseTab}
        onDuplicateProject={handleDuplicateProject}
        onBackupProject={handleBackupProject}
        onDeleteProject={handleDeleteProject}
        onProjectNameChanged={setProjectName}
        onShare={() => setShareOpen(true)}
        onCopyFileLink={project.activeFileId ? handleCopyFileLink : undefined}
        onCopySelectionLink={project.activeFileId ? handleCopySelectionLink : undefined}
        getAllFiles={project.getAllFiles}
        filePathMap={filePathMap}
        onFormat={(type) => editorRef.current?.applyFormat(type as Parameters<CodeMirrorEditorHandle['applyFormat']>[0])}
        onSelectAll={handleMenuSelectAll}
        onGoToLine={handleMenuGoToLine}
        onToggleSearch={() => {/* EditorPane owns this toggle; Ctrl+F is handled inside */}}
        onSendToChat={handleMenuSendToChat}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode((v) => !v)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        wordWrap={prefs.wordWrap}
        lineNumbers={prefs.lineNumbers}
        prefs={prefs}
        onPrefsChange={setPrefs}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left — File Explorer (hidden in focus mode) */}
          {!focusMode && (
            <>
              <ResizablePanel defaultSize={18} minSize={12} maxSize={35}>
                <FileExplorer
                  projectId={projectId}
                  activeAgentId={activeAgentId}
                  files={filteredFiles}
                  activeFileId={project.activeFileId}
                  unsavedIds={project.unsavedIds}
                  draftedIds={project.draftedIds}
                  currentBranch={vcs.currentBranch}
                  onFileOpen={(node) => {
                    setActiveAgentId(null);
                    setWorkerPaneMode(null);
                    project.openFile(node);
                  }}
                  onOpenDiff={handleOpenDiff}
                  onSearchSelect={handleSearchSelect}
                  onReplaceOne={handleReplaceOne}
                  onReplaceAll={handleReplaceAll}
                  onAddFile={project.addFile}
                  onAddFolder={project.addFolder}
                  onRename={project.renameNode}
                  onDelete={project.deleteNode}
                  onMove={project.moveNode}
                  onOpenAgent={(agentId) => {
                    setWorkerPaneMode(null);
                    setActiveAgentId(agentId);
                  }}
                  wikiTerms={wikiTerms}
                  onGoToDefinition={handleGoToDefinition}
                  onFindAllRefs={handleFindAllRefs}
                  onCreateWikiEntry={handleCreateWikiEntry}
                  comments={comments}
                  onCommentNavigate={handleCommentNavigate}
                  onCommentUpdateStatus={handleCommentUpdateStatus}
                  onCommentDelete={handleCommentDelete}
                  openCommentsView={openCommentsView}
                  activeWorkerJobId={workerPaneMode?.kind === 'view' ? workerPaneMode.jobId : null}
                  onOpenWorkerRun={handleOpenWorkerRun}
                  onOpenWorkerTrigger={handleOpenWorkerTrigger}
                  workersRefetchSignal={workersRefetchSignal}
                  vcsPanel={(
                    <VcsPanel
                      unsavedIds={project.unsavedIds}
                      draftedIds={project.draftedIds}
                      activeFileId={project.activeFileId}
                      activeFileName={project.activeTab?.name ?? null}
                      onOpenCurrentFile={handleVcsOpenCurrentFile}
                      onOpenDiffFile={handleVcsOpenDiff}
                      onOpenCommitDiff={handleOpenCommitDiff}
                      onOpenFileHistoryDiff={handleOpenFileHistoryDiff}
                      onRestoreFileContent={handleRestoreFileContent}
                      onRestoreFilesFromHead={handleVcsRestoreFilesFromHead}
                      onOpenConflictDiff={handleOpenConflictDiff}
                      onGetFileSnapshot={getFileSnapshotForCommit}
                      onApplySnapshot={project.applySnapshotToLocal}
                      onApplyPullUpdates={project.applySnapshotToLocal}
                      getLocalStatus={() => vcs.statusEntries}
                    />
                  )}
                />
              </ResizablePanel>
              <ResizableHandle className="w-px bg-border transition-colors hover:bg-violet-500/40" />
            </>
          )}

          {/* Center — Editor */}
          <ResizablePanel defaultSize={57}>
            {activeAgentId ? (
              <AgentEditorPane
                projectId={projectId}
                agentId={activeAgentId}
                onClose={() => setActiveAgentId(null)}
                onDeleted={() => setActiveAgentId(null)}
              />
            ) : workerPaneMode ? (
              <WorkerRunPane
                projectId={projectId}
                files={filteredFiles}
                filePathToFileId={filePathToFileId}
                mode={workerPaneMode}
                onClose={handleCloseWorkerPane}
                onJumpToLocation={handleJumpToWorkerLocation}
                onTriggered={handleWorkerTriggered}
                onRequestRerun={handleOpenWorkerTrigger}
              />
            ) : (
              <EditorPane
                projectId={projectId}
                tabs={project.openTabs}
                activeTab={project.activeTab}
                activeFileId={project.activeFileId}
                unsavedIds={project.unsavedIds}
                draftedIds={project.draftedIds}
                diffView={diffView}
                vcsCommitView={vcsCommitView}
                onCloseVcsCommitView={() => setVcsCommitView(null)}
                pendingNavigate={pendingNavigate}
                searchHighlight={searchHighlight}
                prefs={prefs}
                onPrefsChange={setPrefs}
                previewMode={previewMode}
                onPreviewModeChange={setPreviewMode}
                onTabSelect={project.setActiveFileId}
                onTabClose={project.closeTab}
                onContentChange={project.updateContent}
                onSave={project.saveFile}
                onSaveAll={project.saveAll}
                onSaveDraft={project.saveDraft}
                onRevertDraft={handleRevertFileDraft}
                onSetFileDraft={project.setFileDraft}
                onContextSelect={setPendingContext}
                onCloseDiff={() => setDiffView(null)}
                onNavigated={() => setPendingNavigate(null)}
                onHighlighted={() => setSearchHighlight(null)}
                onShowDraftDiff={handleShowDraftDiff}
                editorHandleRef={editorRef}
                writepadRules={writepadRules}
                onCopySelectionLink={project.activeFileId ? handleCopySelectionLink : undefined}
                onCloseTabs={project.closeTabs}
                onCopyTabLink={handleCopyTabLink}
                filePathMap={filePathMap}
                planBanner={planBanner}
                wikiTerms={wikiTerms}
                findRefsData={findRefsData}
                onFindAllRefs={handleFindAllRefs}
                onGoToDefinition={handleGoToDefinition}
                onCreateWikiEntry={handleCreateWikiEntry}
                onRefResultClick={handleRefResultClick}
                onCloseFindRefs={() => setFindRefsData(null)}
                backlinks={activeFileBacklinks}
                comments={comments}
                onAddComment={handleAddComment}
                onCommentLineClick={handleCommentLineClick}
              />
            )}
          </ResizablePanel>

          {/* Right — AI Chat (hidden in focus mode) */}
          {!focusMode && (
            <>
              <ResizableHandle className="w-px bg-border transition-colors hover:bg-violet-500/40" />
              <ResizablePanel defaultSize={25} minSize={18} maxSize={45}>
                <ChatPanel
                  projectId={projectId}
                  activeChatId={project.activeChatId}
                  onActiveChatChange={project.setActiveChatId}
                  pendingContext={pendingContext}
                  onContextConsumed={() => setPendingContext(null)}
                  getAllFiles={project.getAllFiles}
                  getFileContent={project.getFileContent}
                  setFileContent={project.setFileDraft}
                  changeStatuses={changeStatuses}
                  onApplyChange={handleApplyChange}
                  onDeclineChange={handleDeclineChange}
                  onFilesChanged={project.refreshFiles}
                  activeFileId={project.activeTab?.fileId ?? null}
                  activeFileName={project.activeTab?.name ?? null}
                  allBranches={Array.from(new Set([vcs.currentBranch, ...vcs.branches.map((b) => b.name)].filter(Boolean)))}
                  currentBranch={vcs.currentBranch}
                  unsavedIds={project.unsavedIds}
                  onApplyFileSnapshot={project.applySnapshotToLocal}
                  onChatStreamingChange={setChatIsStreaming}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      <ShareProjectDialog
        projectId={projectId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}

export default function ProjectEditorPage() {
  return (
    <ProtectedPage>
      <ProjectEditorContent />
    </ProtectedPage>
  );
}
