'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GitBranch, RotateCcw, Save, GitMerge } from 'lucide-react';
import { TabBar } from './TabBar';
import { EditorToolbar } from './EditorToolbar';
import { SearchReplaceBar } from './SearchReplaceBar';
import { EditorContextMenu } from './EditorContextMenu';
import { MarkdownPreview } from './MarkdownPreview';
import { DiffPane } from './DiffPane';
import { AllChangesPane } from './AllChangesPane';
import { InlineDiffView } from './InlineDiffView';
import type { OpenTab, SelectionContext, DiffViewState } from './types';
import type { CodeMirrorEditorHandle } from './CodeMirrorEditor';
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
  /** Exposed ref so page can call editor methods (goToLine, selectAll, etc.) */
  editorHandleRef?: React.RefObject<CodeMirrorEditorHandle | null>;
  /** Expose search toggle to parent (MenuBar calls it) */
  onToggleSearch?: () => void;
}

export function EditorPane({
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
  editorHandleRef,
  onToggleSearch: externalToggleSearch,
}: EditorPaneProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [reviewingDiff, setReviewingDiff] = useState(false);
  const internalEditorRef = useRef<CodeMirrorEditorHandle>(null);
  // Use external ref if provided (so MenuBar can call editor methods), else internal
  const editorRef = (editorHandleRef ?? internalEditorRef) as React.RefObject<CodeMirrorEditorHandle | null>;

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

  return (
    <div className="flex h-full flex-col bg-background">
      <TabBar
        tabs={tabs}
        activeFileId={activeFileId}
        unsavedIds={unsavedIds}
        draftedIds={draftedIds}
        onSelect={onTabSelect}
        onClose={onTabClose}
      />

      {!diffView && !reviewingDiff && (
        <EditorToolbar
          onAction={(type) => editorRef.current?.applyFormat(type as Parameters<CodeMirrorEditorHandle['applyFormat']>[0])}
          onToggleSearch={handleToggleSearch}
          searchActive={searchOpen}
          previewMode={previewMode}
          onTogglePreview={handleTogglePreview}
        />
      )}

      {/* "Review AI Changes" banner — shown when file has draft diffs */}
      {!diffView && !reviewingDiff && hasDraftChanges && (
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

      {searchOpen && !diffView && !reviewingDiff && activeTab && (
        <SearchReplaceBar
          content={activeTab.content}
          onChange={(next) => onContentChange(activeTab.fileId, next)}
          onClose={() => setSearchOpen(false)}
          editorRef={editorRef}
        />
      )}

      {/* Body */}
      {diffView?.showAll ? (
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
        >
          <div className="relative flex-1 overflow-hidden">
            {activeTab ? (
              <CodeMirrorEditor
                ref={editorRef}
                key={activeTab.fileId}
                content={activeTab.content}
                fileName={activeTab.name}
                fileId={activeTab.fileId}
                prefs={prefs}
                onChange={(value) => onContentChange(activeTab.fileId, value)}
                onSave={handleSave}
                onToggleSearch={handleToggleSearch}
                onContextSelect={onContextSelect}
                onPrefsChange={onPrefsChange}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground/50">
                <p className="text-sm">No file open</p>
                <p className="mt-1 text-xs">Select a file from the explorer</p>
              </div>
            )}
          </div>
        </EditorContextMenu>
      )}

      {/* Status bar — violet in both themes */}
      <div className="flex shrink-0 items-center justify-between bg-violet-700 px-3 py-0.5 text-[11px] text-white/90">
        <div className="flex items-center gap-3">
          {activeTab && (
            <>
              <span>{activeTab.name}</span>
              {previewMode && <span className="rounded bg-white/15 px-1 text-[10px]">Preview</span>}
              {diffView && <span className="rounded bg-amber-500/30 px-1 text-[10px] text-amber-300">Diff</span>}
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
          <span className="text-white/50">Ctrl+L: chat · Ctrl+P: preview</span>
        </div>
      </div>
    </div>
  );
}
