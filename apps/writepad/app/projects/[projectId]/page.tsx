'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { MenuBar } from '@/components/writepad/middle/MenuBar';
import { ChatPanel } from '@/components/writepad/right';
import { useProjectData } from './_hooks/useProjectData';
import { useEditorPreferences } from '@/hooks/useEditorPreferences';
import type { SelectionContext, DiffViewState } from '@/components/writepad/middle/types';
import type { AIChange } from '@/components/writepad/right/types';
import type { CodeMirrorEditorHandle } from '@/components/writepad/middle/CodeMirrorEditor';

function ProjectEditorContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = (params?.projectId as string) ?? '';

  const project = useProjectData(projectId);
  const { prefs, setPrefs } = useEditorPreferences();
  const { setTheme } = useTheme();

  // Keep next-themes in sync with editor pref so ALL panels (left/right) follow theme.
  useEffect(() => {
    setTheme(prefs.theme);
  }, [prefs.theme, setTheme]);

  const [pendingContext, setPendingContext] = useState<SelectionContext | null>(null);
  const [diffView, setDiffView] = useState<DiffViewState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<{ offset: number } | null>(null);
  const [searchHighlight, setSearchHighlight] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);

  // Editor ref — shared between MenuBar (goToLine, selectAll, format) and EditorPane
  const editorRef = useRef<CodeMirrorEditorHandle>(null);

  // Change tracking
  const [changeStatuses, setChangeStatuses] = useState<Record<string, 'applied' | 'declined'>>({});
  const changeFileMapRef = useRef<Record<string, string>>({});

  const displayName = projectName ?? project.projectName;

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

  const handleDeleteProject = useCallback(async () => {
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    router.push('/projects');
  }, [projectId, router]);

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
        onDeleteProject={handleDeleteProject}
        onProjectNameChanged={setProjectName}
        onFormat={(type) => editorRef.current?.applyFormat(type as Parameters<CodeMirrorEditorHandle['applyFormat']>[0])}
        onSelectAll={handleMenuSelectAll}
        onGoToLine={handleMenuGoToLine}
        onToggleSearch={() => {/* EditorPane owns this toggle; Ctrl+F is handled inside */}}
        onSendToChat={handleMenuSendToChat}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode((v) => !v)}
        wordWrap={prefs.wordWrap}
        lineNumbers={prefs.lineNumbers}
        prefs={prefs}
        onPrefsChange={setPrefs}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left — File Explorer */}
          <ResizablePanel defaultSize={18} minSize={12} maxSize={35}>
            <FileExplorer
              files={project.files}
              activeFileId={project.activeFileId}
              unsavedIds={project.unsavedIds}
              draftedIds={project.draftedIds}
              openTabs={project.openTabs}
              onFileOpen={project.openFile}
              onOpenDiff={handleOpenDiff}
              onSearchSelect={handleSearchSelect}
              onReplaceOne={handleReplaceOne}
              onReplaceAll={handleReplaceAll}
              onAddFile={project.addFile}
              onAddFolder={project.addFolder}
              onRename={project.renameNode}
              onDelete={project.deleteNode}
              onMove={project.moveNode}
            />
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border transition-colors hover:bg-violet-500/40" />

          {/* Center — Editor */}
          <ResizablePanel defaultSize={57}>
            <EditorPane
              tabs={project.openTabs}
              activeTab={project.activeTab}
              activeFileId={project.activeFileId}
              unsavedIds={project.unsavedIds}
              draftedIds={project.draftedIds}
              diffView={diffView}
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
            />
          </ResizablePanel>

          <ResizableHandle className="w-px bg-border transition-colors hover:bg-violet-500/40" />

          {/* Right — AI Chat */}
          <ResizablePanel defaultSize={25} minSize={18} maxSize={45}>
            <ChatPanel
              projectId={projectId}
              activeChatId={project.activeChatId}
              onActiveChatChange={project.setActiveChatId}
              pendingContext={pendingContext}
              onContextConsumed={() => setPendingContext(null)}
              getAllFiles={project.getAllFiles}
              getFileContent={project.getFileContent}
              changeStatuses={changeStatuses}
              onApplyChange={handleApplyChange}
              onDeclineChange={handleDeclineChange}
              onFilesChanged={project.refreshFiles}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
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
