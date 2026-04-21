'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GitBranch, RotateCcw, Save, GitMerge } from 'lucide-react';
import { TabBar } from './TabBar';
import type { DiffTabInfo } from './TabBar';
import { EditorToolbar } from './EditorToolbar';
import { SearchReplaceBar } from './SearchReplaceBar';
import { EditorContextMenu } from './EditorContextMenu';
import { WordHelperPopup, type WordHelperState } from './WordHelperPopup';
import { ShortcutsDialog } from './ShortcutsDialog';
import { MediamakeMediaDialog } from './MediamakeMediaDialog';
import { MarkdownPreview } from './MarkdownPreview';
import { DiffPane } from './DiffPane';
import { AllChangesPane } from './AllChangesPane';
import { InlineDiffView } from './InlineDiffView';
import { VcsCommitDiffPane } from './VcsCommitDiffPane';
import type { OpenTab, SelectionContext, DiffViewState, VcsCommitViewData } from './types';
import type { CodeMirrorEditorHandle } from './CodeMirrorEditor';
import type { WordHelperRequest } from './wordHelperExtension';
import type { EditorPreferences } from '@/hooks/useEditorPreferences';

const CodeMirrorEditor = dynamic(
  () => import('./CodeMirrorEditor').then((m) => m.CodeMirrorEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background">
        <span className="text-xs text-muted-foreground">Loading editor…</span>
      </div>
    ),
  },
);

interface EditorPaneProps {
  projectId: string;
  tabs: OpenTab[];
  activeTab: OpenTab | null;
  activeFileId: string | null;
  unsavedIds: Set<string>;
  draftedIds: Set<string>;
  diffView: DiffViewState | null;
  pendingNavigate: { offset: number } | null;
  searchHighlight: string | null;
  prefs: EditorPreferences;
  onPrefsChange: (update: Partial<EditorPreferences>) => void;
  // Controlled preview mode — driven by MenuBar
  previewMode: boolean;
  onPreviewModeChange: (v: boolean) => void;
  onTabSelect: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  onContentChange: (fileId: string, content: string) => void;
  onSave: (fileId: string) => void;
  onSaveAll: () => void;
  onSaveDraft: (fileId: string) => void;
  onRevertDraft: (fileId: string) => void;
  onSetFileDraft: (fileId: string, newDraft: string) => Promise<void>;
  onContextSelect: (ctx: SelectionContext) => void;
  onCloseDiff: () => void;
  onNavigated: () => void;
  onHighlighted: () => void;
  onShowDraftDiff?: (fileId: string) => void;
  /** VCS commit diff view — takes over the middle panel (overrides diffView). */
  vcsCommitView?: VcsCommitViewData | null;
  onCloseVcsCommitView?: () => void;
  /** Exposed ref so page can call editor methods (goToLine, selectAll, etc.) */
  editorHandleRef?: React.RefObject<CodeMirrorEditorHandle | null>;
  /** Expose search toggle to parent (MenuBar calls it) */
  onToggleSearch?: () => void;
  /** Content of .writepad/rules.md — injected into all AI prompts. */
  writepadRules?: string | null;
  /** Callback to copy a shareable link to the current editor selection. */
  onCopySelectionLink?: () => void;
  /** Batch-close multiple tabs from the tab context menu. */
  onCloseTabs?: (fileIds: string[]) => void;
  /** Copy a shareable link for a specific tab's file (used by tab context menu). */
  onCopyTabLink?: (fileId: string) => void;
}

export function EditorPane({
  projectId,
  tabs,
  activeTab,
  activeFileId,
  unsavedIds,
  draftedIds,
  diffView,
  pendingNavigate,
  searchHighlight,
  prefs,
  onPrefsChange,
  previewMode,
  onPreviewModeChange,
  onTabSelect,
  onTabClose,
  onContentChange,
  onSave,
  onSaveAll,
  onSaveDraft,
  onRevertDraft,
  onSetFileDraft,
  onContextSelect,
  onCloseDiff,
  onNavigated,
  onHighlighted,
  onShowDraftDiff,
  vcsCommitView,
  onCloseVcsCommitView,
  editorHandleRef,
  onToggleSearch: externalToggleSearch,
  writepadRules,
  onCopySelectionLink,
  onCloseTabs,
  onCopyTabLink,
}: EditorPaneProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [reviewingDiff, setReviewingDiff] = useState(false);
  const [wordHelperState, setWordHelperState] = useState<WordHelperState | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mediamakeOpen, setMediamakeOpen] = useState(false);
  const internalEditorRef = useRef<CodeMirrorEditorHandle>(null);
  // Use external ref if provided (so MenuBar can call editor methods), else internal
  const editorRef = (editorHandleRef ?? internalEditorRef) as React.RefObject<CodeMirrorEditorHandle | null>;

  // ── Word helper flow ───────────────────────────────────────────────────────

  const handleWordHelper = useCallback(async (req: WordHelperRequest) => {
    // Show popup immediately with loading state
    setWordHelperState({
      agentId: req.agentId,
      word: req.word,
      from: req.from,
      to: req.to,
      coords: req.coords,
      suggestions: [],
      loading: true,
    });

    try {
      const res = await fetch('/api/studio/chat/agent/editor/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: req.word,
          context: req.context,
          agent: req.agentId,
          projectId,
          writepadRules: writepadRules ?? undefined,
        }),
      });
      const data = await res.json() as { suggestions?: string[] };
      setWordHelperState((prev) =>
        prev ? { ...prev, loading: false, suggestions: data.suggestions ?? [] } : null,
      );
    } catch {
      setWordHelperState((prev) =>
        prev ? { ...prev, loading: false, error: 'Failed to fetch suggestions' } : null,
      );
    }
  }, []);

  // Called from context menu — reads selection state directly from the handle
  const handleWordHelperFromMenu = useCallback((agentId: string) => {
    const handle = editorRef.current;
    if (!handle) return;
    const word = handle.getSelectedText().trim();
    if (!word) return;
    const range = handle.getSelectionRange();
    if (!range) return;
    const coords = handle.getSelectionCoords();
    if (!coords) return;
    handleWordHelper({ agentId, word, from: range.from, to: range.to, context: '', coords });
  }, [editorRef, handleWordHelper]);

  // Resolve from/to for context-menu-triggered requests (word was not captured via CM)
  const handleWordHelperSelect = useCallback((suggestion: string, from: number, to: number) => {
    editorRef.current?.replaceRange(from, to, suggestion);
    setWordHelperState(null);
  }, [editorRef]);


  // Ctrl+S: first press drafts the file; second press (when drafted & not unsaved) commits it.
  const handleSave = useCallback(() => {
    if (!activeTab) return;
    const isUnsaved = unsavedIds.has(activeTab.fileId);
    const isDrafted = draftedIds.has(activeTab.fileId);
    if (isUnsaved) {
      onSaveDraft(activeTab.fileId);
    } else if (isDrafted) {
      onSave(activeTab.fileId);
    }
  }, [activeTab, unsavedIds, draftedIds, onSaveDraft, onSave]);

  const handleToggleSearch = useCallback(() => {
    setSearchOpen((x) => !x);
    onPreviewModeChange(false);
    externalToggleSearch?.();
  }, [onPreviewModeChange, externalToggleSearch]);

  const handleTogglePreview = useCallback(() => {
    onPreviewModeChange(!previewMode);
    if (!previewMode) setSearchOpen(false);
  }, [previewMode, onPreviewModeChange]);

  // Sync Ctrl+P shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handleTogglePreview();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleTogglePreview]);

  useEffect(() => {
    if (!pendingNavigate) return;
    onPreviewModeChange(false);
    let attempts = 0;
    const tryNavigate = () => {
      if (editorRef.current) {
        editorRef.current.goToOffset(pendingNavigate.offset);
        onNavigated();
      } else if (attempts < 10) {
        attempts++;
        t = setTimeout(tryNavigate, 60);
      }
    };
    let t = setTimeout(tryNavigate, 60);
    return () => clearTimeout(t);
  }, [pendingNavigate, onNavigated, editorRef, onPreviewModeChange]);

  useEffect(() => {
    if (!searchHighlight) { editorRef.current?.clearSearch(); return; }
    const t = setTimeout(() => {
      editorRef.current?.setSearch(searchHighlight, false, false);
      onHighlighted();
    }, 150);
    return () => clearTimeout(t);
  }, [searchHighlight, onHighlighted, editorRef]);

  const wordCount = activeTab
    ? activeTab.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const isUnsaved = activeTab ? unsavedIds.has(activeTab.fileId) : false;
  const isDrafted = activeTab ? draftedIds.has(activeTab.fileId) : false;
  const hasDraftChanges = isDrafted && activeTab?.draftContent !== null && activeTab?.draftContent !== activeTab?.savedContent;

  // Auto-exit inline diff review when switching to a file without changes
  if (reviewingDiff && !hasDraftChanges) setReviewingDiff(false);

  // ── Diff tab ────────────────────────────────────────────────────────────────
  // Builds a virtual "diff tab" shown in the TabBar when any diff view is active.
  const closeAnyDiff = useCallback(() => {
    if (vcsCommitView) onCloseVcsCommitView?.();
    else onCloseDiff();
  }, [vcsCommitView, onCloseVcsCommitView, onCloseDiff]);

  const diffTab: DiffTabInfo | null = vcsCommitView
    ? {
        label: vcsCommitView.commitMessage.length > 32
          ? vcsCommitView.commitMessage.slice(0, 32) + '…'
          : vcsCommitView.commitMessage,
        kind: 'commit',
        onClose: closeAnyDiff,
      }
    : diffView?.showAll
    ? { label: 'All Changes', kind: 'all-changes', onClose: onCloseDiff }
    : diffView
    ? { label: `Diff: ${diffView.fileName}`, kind: 'diff', onClose: onCloseDiff }
    : null;

  // Clicking a file tab while a diff is open closes the diff first.
  const handleTabSelectWithDiffClose = useCallback((fileId: string) => {
    closeAnyDiff();
    onTabSelect(fileId);
  }, [closeAnyDiff, onTabSelect]);

  return (
    <div className="flex h-full flex-col bg-background">
      <TabBar
        tabs={tabs}
        activeFileId={activeFileId}
        unsavedIds={unsavedIds}
        draftedIds={draftedIds}
        onSelect={handleTabSelectWithDiffClose}
        onClose={onTabClose}
        diffTab={diffTab}
        onCloseTabs={onCloseTabs}
        onSaveTab={onSave}
        onRevertTab={onRevertDraft}
        onOpenDiff={onShowDraftDiff}
        onCopyLink={onCopyTabLink}
      />

      {!vcsCommitView && !diffView && !reviewingDiff && !!activeTab && (
        <EditorToolbar
          onAction={(type) => editorRef.current?.applyFormat(type as Parameters<CodeMirrorEditorHandle['applyFormat']>[0])}
          onToggleSearch={handleToggleSearch}
          searchActive={searchOpen}
          previewMode={previewMode}
          onTogglePreview={handleTogglePreview}
          onOpenMediamakeMedia={() => setMediamakeOpen(true)}
        />
      )}

      {/* "Review AI Changes" banner — shown when file has draft diffs */}
      {!vcsCommitView && !diffView && !reviewingDiff && hasDraftChanges && (
        <div className="flex shrink-0 items-center gap-2 border-b border-violet-500/20 bg-violet-500/5 px-3 py-1">
          <GitMerge size={11} className="text-violet-400 shrink-0" />
          <span className="text-[11px] text-violet-400/80">AI changes applied to draft</span>
          <button
            onClick={() => setReviewingDiff(true)}
            className="ml-auto flex items-center gap-1 rounded border border-violet-500/30 px-2 py-0.5 text-[10px] text-violet-400 hover:bg-violet-500/10 transition-colors"
          >
            Review Changes
          </button>
        </div>
      )}

      {searchOpen && !vcsCommitView && !diffView && !reviewingDiff && activeTab && (
        <SearchReplaceBar
          content={activeTab.content}
          onChange={(next) => onContentChange(activeTab.fileId, next)}
          onClose={() => setSearchOpen(false)}
          editorRef={editorRef}
        />
      )}

      {/* Body — flex-1 min-h-0 ensures this fills remaining height without overflowing */}
      <div className="flex-1 min-h-0 overflow-hidden">
      {vcsCommitView ? (
        <VcsCommitDiffPane
          projectId={projectId}
          data={vcsCommitView}
          onClose={closeAnyDiff}
        />
      ) : diffView?.showAll ? (
        <AllChangesPane
          tabs={tabs}
          unsavedIds={unsavedIds}
          draftedIds={draftedIds}
          onClose={onCloseDiff}
          onSaveDraft={onSaveDraft}
          onRevertDraft={onRevertDraft}
        />
      ) : diffView ? (
        <DiffPane
          fileName={diffView.fileName}
          original={diffView.original}
          modified={diffView.modified}
          onClose={onCloseDiff}
          originalLabel={diffView.originalLabel}
          modifiedLabel={diffView.modifiedLabel}
        />
      ) : reviewingDiff && activeTab && activeTab.draftContent !== null ? (
        <InlineDiffView
          savedContent={activeTab.savedContent}
          draftContent={activeTab.draftContent}
          fileId={activeTab.fileId}
          fileName={activeTab.name}
          onDeclineHunk={onSetFileDraft}
          onClose={() => setReviewingDiff(false)}
        />
      ) : previewMode && activeTab ? (
        <MarkdownPreview content={activeTab.content} />
      ) : (
        <EditorContextMenu
          editorRef={editorRef}
          activeFileName={activeTab?.name ?? null}
          onToggleSearch={handleToggleSearch}
          onFormat={(type) => editorRef.current?.applyFormat(type as Parameters<CodeMirrorEditorHandle['applyFormat']>[0])}
          onSave={handleSave}
          onContextSelect={onContextSelect}
          onWordHelper={handleWordHelperFromMenu}
          onShowShortcuts={() => setShowShortcuts(true)}
          onCopySelectionLink={onCopySelectionLink}
        >
          {/* h-full fills the parent body div; onClick focuses editor when clicking below content */}
          <div
            className="relative h-full overflow-hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) editorRef.current?.focus();
            }}
          >
            {activeTab ? (
              <CodeMirrorEditor
                ref={editorRef}
                key={activeTab.fileId}
                content={activeTab.content}
                fileName={activeTab.name}
                fileId={activeTab.fileId}
                projectId={projectId}
                prefs={prefs}
                onChange={(value) => onContentChange(activeTab.fileId, value)}
                onSave={handleSave}
                onToggleSearch={handleToggleSearch}
                onContextSelect={onContextSelect}
                onPrefsChange={onPrefsChange}
                onWordHelper={handleWordHelper}
                writepadRules={writepadRules}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground/40">
                <p className="text-sm font-medium">No file open</p>
                <p className="text-xs">Select a file from the explorer</p>
              </div>
            )}
            {wordHelperState && (
              <WordHelperPopup
                state={wordHelperState}
                onSelect={handleWordHelperSelect}
                onClose={() => setWordHelperState(null)}
              />
            )}
          </div>
        </EditorContextMenu>
      )}
      </div>{/* end body flex-1 */}

      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}

      <MediamakeMediaDialog
        open={mediamakeOpen}
        onOpenChange={setMediamakeOpen}
        onInsert={(markdown) => editorRef.current?.insertText(markdown)}
      />

      {/* Status bar — violet in both themes */}
      <div className="flex shrink-0 items-center justify-between bg-violet-700 px-3 py-0.5 text-[11px] text-white/90">
        <div className="flex items-center gap-3">
          {activeTab && (
            <>
              <span>{activeTab.name}</span>
              {previewMode && <span className="rounded bg-white/15 px-1 text-[10px]">Preview</span>}
              {vcsCommitView && <span className="rounded bg-violet-500/30 px-1 text-[10px] text-violet-200">Commit Diff</span>}
              {!vcsCommitView && diffView && <span className="rounded bg-amber-500/30 px-1 text-[10px] text-amber-300">Diff</span>}
              {isDrafted && !diffView && (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5 rounded bg-violet-500/30 px-1.5 py-0.5 text-[10px] text-violet-200">
                    <GitBranch size={9} /> Draft
                  </span>
                  <button
                    onClick={() => activeTab && onSaveDraft(activeTab.fileId)}
                    className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/20 transition-colors"
                    title="Save draft as final"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => activeTab && onRevertDraft(activeTab.fileId)}
                    className="flex items-center gap-0.5 rounded bg-red-900/30 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-900/50 transition-colors"
                    title="Revert draft"
                  >
                    <RotateCcw size={9} /> Revert
                  </button>
                  <button
                    onClick={() => activeTab && onShowDraftDiff?.(activeTab.fileId)}
                    className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/20 transition-colors"
                    title="Show diff: saved vs draft"
                  >
                    Diff
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeTab && !diffView && (
            <>
              <span>{wordCount} words</span>
              {isUnsaved && <span className="text-amber-300">● Unsaved</span>}
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 hover:bg-white/20 transition-colors"
                title="Save (Ctrl+S)"
              >
                <Save size={10} /> Save
              </button>
            </>
          )}
          <button
            onClick={() => onPrefsChange({ autoComplete: !prefs.autoComplete })}
            title={`AI auto-complete: ${prefs.autoComplete ? 'On' : 'Off'} — click or press Alt+A to toggle`}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
              prefs.autoComplete
                ? 'bg-white/15 text-white/80 hover:bg-white/25'
                : 'bg-white/5 text-white/30 hover:bg-white/10'
            }`}
          >
            AI{prefs.autoComplete ? ' ●' : ' ○'}
          </button>
          <span className="text-white/50">Ctrl+L: chat · Ctrl+P: preview</span>
        </div>
      </div>
    </div>
  );
}
