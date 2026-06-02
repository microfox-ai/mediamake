'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Eye, EyeOff, Library, Columns2, X, ChevronDown, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpenTab } from './types';

interface ToolbarAction {
  label: string;
  title: string;
  action: string;
  className?: string;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'B', title: 'Bold', action: 'bold', className: 'font-bold' },
  { label: 'I', title: 'Italic', action: 'italic', className: 'italic' },
  { label: 'H1', title: 'Heading 1', action: 'h1' },
  { label: 'H2', title: 'Heading 2', action: 'h2' },
  { label: 'H3', title: 'Heading 3', action: 'h3' },
  { label: '—', title: 'Horizontal rule', action: 'hr' },
  { label: '❝', title: 'Blockquote', action: 'quote' },
  { label: '•', title: 'Unordered list', action: 'ul' },
  { label: '1.', title: 'Ordered list', action: 'ol' },
  { label: '<>', title: 'Code block', action: 'code', className: 'font-mono text-[10px]' },
];

interface EditorToolbarProps {
  onAction: (type: string) => void;
  onToggleSearch: () => void;
  searchActive: boolean;
  previewMode: boolean;
  onTogglePreview: () => void;
  onOpenMediamakeMedia?: () => void;
  /** Active file id — to exclude from split picker. */
  activeFileId?: string | null;
  /** Open tabs — used to populate the split picker. */
  tabs?: OpenTab[];
  /** Currently-split file id (null when no split is active). */
  splitFileId?: string | null;
  /** Open the given file in the right-pane split. Pass null to close split. */
  onSetSplit?: (fileId: string | null) => void;
}

export function EditorToolbar({
  onAction,
  onToggleSearch,
  searchActive,
  previewMode,
  onTogglePreview,
  onOpenMediamakeMedia,
  activeFileId,
  tabs = [],
  splitFileId = null,
  onSetSplit,
}: EditorToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-b border-border bg-muted px-2 py-1">
      {TOOLBAR_ACTIONS.map((item) => (
        <button
          key={item.action}
          title={item.title}
          onClick={() => onAction(item.action)}
          disabled={previewMode}
          className={cn(
            'rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30',
            item.className,
          )}
        >
          {item.label}
        </button>
      ))}

      <div className="mx-1 h-3.5 w-px bg-border" />

      {onOpenMediamakeMedia && (
        <button
          type="button"
          title="Insert from Mediamake library"
          onClick={onOpenMediamakeMedia}
          disabled={previewMode}
          className={cn(
            'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30',
          )}
        >
          <Library size={11} />
          <span>Media</span>
        </button>
      )}

      <div className="mx-1 h-3.5 w-px bg-border" />

      <button
        title="Find & Replace (Ctrl+F)"
        onClick={onToggleSearch}
        disabled={previewMode}
        className={cn(
          'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-30',
          searchActive
            ? 'bg-violet-500/20 text-violet-500 dark:text-violet-400'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <Search size={11} />
        <span>Find</span>
      </button>

      <div className="mx-1 h-3.5 w-px bg-border" />

      <button
        title={previewMode ? 'Back to editor (Ctrl+P)' : 'Preview markdown (Ctrl+P)'}
        onClick={onTogglePreview}
        className={cn(
          'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors',
          previewMode
            ? 'bg-violet-500/20 text-violet-500 dark:text-violet-400'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        {previewMode ? <EyeOff size={11} /> : <Eye size={11} />}
        <span>Preview</span>
      </button>

      {/* ── Split editor ──────────────────────────────────────────────── */}
      {onSetSplit && (
        <>
          <div className="mx-1 h-3.5 w-px bg-border" />
          <SplitEditorButton
            tabs={tabs}
            activeFileId={activeFileId ?? null}
            splitFileId={splitFileId}
            onSetSplit={onSetSplit}
          />
        </>
      )}
    </div>
  );
}

// ── Split editor button + picker ─────────────────────────────────────────────

interface SplitEditorButtonProps {
  tabs: OpenTab[];
  activeFileId: string | null;
  splitFileId: string | null;
  onSetSplit: (fileId: string | null) => void;
}

function SplitEditorButton({ tabs, activeFileId, splitFileId, onSetSplit }: SplitEditorButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  const splitActive = !!splitFileId;
  const candidateTabs = tabs.filter((t) => t.fileId !== activeFileId);

  // No split open AND only the active tab is open — disabled
  const canQuickSplit = !splitActive && candidateTabs.length > 0;

  function handleClick() {
    if (splitActive) {
      onSetSplit(null);
      return;
    }
    if (candidateTabs.length === 1) {
      // Quick path: just split with the only other tab
      onSetSplit(candidateTabs[0].fileId);
      return;
    }
    // 2+ other tabs: show picker
    setPickerOpen((v) => !v);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        title={splitActive ? 'Close split editor' : 'Open split editor (side-by-side)'}
        onClick={handleClick}
        disabled={!splitActive && !canQuickSplit}
        className={cn(
          'flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-30',
          splitActive
            ? 'bg-violet-500/20 text-violet-500 dark:text-violet-400'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        {splitActive ? <X size={11} /> : <Columns2 size={11} />}
        <span>Split</span>
        {!splitActive && candidateTabs.length > 1 && <ChevronDown size={9} className="ml-0.5 -mr-0.5" />}
      </button>

      {pickerOpen && candidateTabs.length > 1 && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-border bg-popover shadow-lg">
          <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Split with…
          </div>
          <div className="max-h-64 overflow-y-auto pb-1">
            {candidateTabs.map((tab) => (
              <button
                key={tab.fileId}
                onClick={() => {
                  setPickerOpen(false);
                  onSetSplit(tab.fileId);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-foreground/80 hover:bg-accent/40"
              >
                <FileText size={11} className="shrink-0 text-muted-foreground/50" />
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
