'use client';

import { Search, Eye, EyeOff, Library } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export function EditorToolbar({
  onAction,
  onToggleSearch,
  searchActive,
  previewMode,
  onTogglePreview,
  onOpenMediamakeMedia,
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
    </div>
  );
}
