'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitBranch,
  Sparkles,
  RotateCcw,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  GitMerge,
  Check,
  Plus,
  Minus,
  AlertCircle,
  Undo2,
  ChevronDown,
  Search,
  Loader2,
  ChevronsUpDown,
  Download,
  ArrowDownToLine,
  ArrowUpFromLine,
  GitPullRequest,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useVcsStore } from '@/app/projects/[projectId]/_hooks/useVcsStore';
import type {
  VcsBranch,
  VcsCommit,
  VcsCommitFile,
  VcsFileHistoryEntry,
  VcsFileSnapshotForCommit,
  VcsStatusEntry,
  FetchPreviewEntry,
  PullFileUpdate,
  HeadSnapshotArray,
  LocalCommit,
} from '@/app/projects/[projectId]/_hooks/useVcsStore';
import { RevertConfirmDialog } from './RevertConfirmDialog';
import type { RevertPreviewData } from './RevertConfirmDialog';

// ─── Props ────────────────────────────────────────────────────────────────────

interface VcsPanelProps {
  unsavedIds: Set<string>;
  draftedIds: Set<string>;
  activeFileId: string | null;
  activeFileName: string | null;
  onOpenCurrentFile: (fileId: string) => void;
  onOpenDiffFile: (fileId: string) => Promise<void>;
  /** Open a commit's full multi-file diff in the middle panel. */
  onOpenCommitDiff: (commitId: string) => Promise<void>;
  /**
   * Open a file's before/after diff for a specific commit.
   * original = file at parentCommitId, modified = file at commitId.
   */
  onOpenFileHistoryDiff: (
    fileId: string,
    commitId: string,
    parentCommitId: string | null,
    fileName: string,
  ) => Promise<void>;
  /** Restore a file's content to a specific version (sets it as a draft). */
  onRestoreFileContent: (fileId: string, content: string) => Promise<void>;
  /** Restore deleted files from branch HEAD to working directory (no commit). */
  onRestoreFilesFromHead: (fileIds: string[]) => Promise<void>;
  /**
   * Open a merge conflict diff in the middle panel.
   * Left (original) = targetBranch content (current branch).
   * Right (modified) = sourceBranch content (incoming).
   */
  onOpenConflictDiff: (
    fileId: string,
    fileName: string,
    sourceBranch: string,
    targetBranch: string,
    sourceContent: string,
    targetContent: string,
  ) => void;
  /**
   * Resolve the current in-memory snapshot for a file (for staging in a commit).
   * Returns null if the file no longer exists (e.g. it was deleted).
   */
  onGetFileSnapshot: (fileId: string) => VcsFileSnapshotForCommit | null;
  /**
   * Apply a VCS HEAD snapshot to the local working directory.
   * Called after checkout, merge, revert, or pull.
   * Passed directly to vcs.checkoutBranch / executeMerge / revertCommit.
   */
  onApplySnapshot: (snapshot: HeadSnapshotArray) => Promise<void>;
  /**
   * Apply pull updates to the local working directory.
   * Called by the pull handler after the user confirms conflict resolutions.
   */
  onApplyPullUpdates: (updates: PullFileUpdate[]) => Promise<void>;
  /** Current VCS status entries — needed by fetch to flag conflicted files. */
  getLocalStatus: () => VcsStatusEntry[];
}

// ─── Branch combobox (checkout + create inline) ───────────────────────────────

function BranchCombobox({
  branches,
  currentBranch,
  disabled,
  onCheckout,
  onCreateBranch,
}: {
  branches: VcsBranch[];
  currentBranch: string;
  disabled?: boolean;
  onCheckout: (name: string) => void;
  onCreateBranch: (name: string, fromBranch: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [fromBranch, setFromBranch] = useState(currentBranch);
  const [fromQuery, setFromQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);

  // Reset inner state when popover closes
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setFromQuery('');
      setCreateMode(false);
    }
  };

  // Auto-focus search input when popover opens or create mode toggles
  useEffect(() => {
    if (open && !createMode) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    if (open && createMode) {
      const t = setTimeout(() => fromInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, createMode]);

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = branches.some((b) => b.name === query.trim());
  const canCreate = query.trim().length > 0 && !exactMatch;

  const filteredFrom = branches.filter((b) =>
    b.name.toLowerCase().includes(fromQuery.toLowerCase()),
  );

  const handleSelectBranch = (name: string) => {
    handleOpenChange(false);
    if (name !== currentBranch) onCheckout(name);
  };

  const handleStartCreate = () => {
    setFromBranch(currentBranch);
    setFromQuery('');
    setCreateMode(true);
  };

  const handleConfirmCreate = async () => {
    const name = query.trim();
    if (!name || !fromBranch) return;
    setCreating(true);
    try {
      await onCreateBranch(name, fromBranch);
      handleOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex w-full items-center gap-1.5 rounded border border-border/50 bg-background/40 px-2 py-1.5',
            'text-xs hover:border-border/80 hover:bg-accent/20 transition-colors text-left',
            'disabled:pointer-events-none disabled:opacity-40',
          )}
        >
          <GitBranch size={11} className="flex-shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-foreground/90">{currentBranch}</span>
          <ChevronsUpDown size={11} className="flex-shrink-0 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 overflow-hidden"
        style={{ width: '240px' }}
        align="start"
        sideOffset={4}
      >
        {!createMode ? (
          <>
            {/* Search */}
            <div className="flex items-center gap-1.5 border-b border-border/50 px-2 py-1.5">
              <Search size={11} className="flex-shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
                placeholder="Search or create branch…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleOpenChange(false);
                  if (e.key === 'Enter') {
                    if (filtered.length === 1) handleSelectBranch(filtered[0].name);
                    else if (canCreate) handleStartCreate();
                  }
                }}
              />
            </div>

            {/* Branch list */}
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 && !canCreate && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No branches found</p>
              )}
              {filtered.map((b) => (
                <button
                  key={b.id}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors',
                    b.name === currentBranch && 'text-primary',
                  )}
                  onClick={() => handleSelectBranch(b.name)}
                >
                  {b.name === currentBranch ? (
                    <Check size={11} className="flex-shrink-0" />
                  ) : (
                    <GitBranch size={11} className="flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate text-left">{b.name}</span>
                  {b.isLocalOnly && (
                    <span className="flex-shrink-0 rounded bg-amber-500/20 px-1 py-px text-[9px] font-medium text-amber-400">
                      local
                    </span>
                  )}
                </button>
              ))}
              {canCreate && (
                <button
                  className="flex w-full items-center gap-2 border-t border-border/30 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors"
                  onClick={handleStartCreate}
                >
                  <Plus size={11} className="flex-shrink-0" />
                  <span className="text-left">
                    Create &ldquo;<span className="font-semibold">{query.trim()}</span>&rdquo;
                  </span>
                </button>
              )}
            </div>
          </>
        ) : (
          /* Step 2: Searchable "branch from" picker — scales to 100+ branches */
          <>
            <div className="px-3 pt-2.5 pb-1.5">
              <p className="text-xs font-medium text-foreground">
                New branch: <span className="text-primary">&ldquo;{query.trim()}&rdquo;</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Branch from which base?
              </p>
            </div>

            {/* Search for "from" branch */}
            <div className="flex items-center gap-1.5 border-y border-border/50 px-2 py-1.5">
              <Search size={11} className="flex-shrink-0 text-muted-foreground" />
              <input
                ref={fromInputRef}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
                placeholder="Search base branch…"
                value={fromQuery}
                onChange={(e) => setFromQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setCreateMode(false);
                  if (e.key === 'Enter' && filteredFrom.length === 1) {
                    setFromBranch(filteredFrom[0].name);
                  }
                }}
              />
            </div>

            {/* Branch list */}
            <div className="max-h-40 overflow-y-auto py-1">
              {filteredFrom.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">No branches found</p>
              )}
              {filteredFrom.map((b) => (
                <button
                  key={b.id}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors',
                    fromBranch === b.name && 'text-primary',
                  )}
                  onClick={() => setFromBranch(b.name)}
                >
                  {fromBranch === b.name ? (
                    <Check size={11} className="flex-shrink-0" />
                  ) : (
                    <GitBranch size={11} className="flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate text-left">{b.name}</span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-1 border-t border-border/30 p-2">
              <Button
                size="sm"
                className="h-6 flex-1 text-[11px]"
                disabled={!fromBranch || creating}
                onClick={handleConfirmCreate}
              >
                {creating ? <Loader2 size={10} className="animate-spin mr-1" /> : null}
                Create &amp; switch
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={() => setCreateMode(false)}
              >
                ← Back
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Merge source combobox (no create, just pick a branch) ───────────────────

function MergeBranchSelect({
  branches,
  excludeBranch,
  value,
  onChange,
  disabled,
}: {
  branches: VcsBranch[];
  excludeBranch: string;
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const eligible = branches.filter((b) => b.name !== excludeBranch);
  const filtered = eligible.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    } else {
      setQuery('');
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex w-full items-center gap-1.5 rounded border border-border bg-background px-2 py-1.5',
            'text-xs hover:border-border/80 transition-colors',
            'disabled:pointer-events-none disabled:opacity-40',
          )}
        >
          <GitBranch size={11} className="flex-shrink-0 text-muted-foreground" />
          <span className={cn('flex-1 truncate text-left', value ? 'text-foreground' : 'text-muted-foreground')}>
            {value || 'Select source branch…'}
          </span>
          <ChevronDown size={11} className="flex-shrink-0 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden" style={{ width: '220px' }} align="start" sideOffset={4}>
        <div className="flex items-center gap-1.5 border-b border-border/50 px-2 py-1.5">
          <Search size={11} className="flex-shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
            placeholder="Search branches…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && filtered.length === 1) {
                onChange(filtered[0].name);
                setOpen(false);
              }
            }}
          />
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No branches</p>
          )}
          {filtered.map((b) => (
            <button
              key={b.id}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors',
                b.name === value && 'text-primary',
              )}
              onClick={() => { onChange(b.name); setOpen(false); }}
            >
              {b.name === value
                ? <Check size={11} className="flex-shrink-0" />
                : <GitBranch size={11} className="flex-shrink-0 text-muted-foreground" />
              }
              <span className="flex-1 truncate text-left">{b.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  defaultOpen = true,
  actions,
  children,
}: {
  title: string;
  badge?: number | string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-accent/30"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          size={11}
          className={cn('flex-shrink-0 text-muted-foreground/70 transition-transform', open && 'rotate-90')}
        />
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        {badge !== undefined && (
          <span className="rounded bg-muted px-1.5 py-px text-[10px] tabular-nums text-muted-foreground">
            {badge}
          </span>
        )}
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ─── Status indicator ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<VcsStatusEntry['status'], string> = {
  modified: 'text-amber-500',
  untracked: 'text-emerald-500',
  deleted: 'text-rose-500',
};
const STATUS_LABEL: Record<VcsStatusEntry['status'], string> = {
  modified: 'M',
  untracked: 'U',
  deleted: 'D',
};

// ─── File row ─────────────────────────────────────────────────────────────────

function FileRow({
  entry,
  selected,
  hasUnsaved,
  hasDraft,
  onToggle,
  onOpenFile,
  onOpenDiff,
  onDiscard,
}: {
  entry: VcsStatusEntry;
  selected: boolean;
  hasUnsaved: boolean;
  hasDraft: boolean;
  onToggle: () => void;
  onOpenFile: () => void;
  onOpenDiff: () => void;
  /** Discard/revert changes: restore tracked files from HEAD, delete untracked files. */
  onDiscard?: () => void;
}) {
  const isDeleted = entry.status === 'deleted';
  const isUntracked = entry.status === 'untracked';

  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 px-2 py-[3px] text-xs',
        'hover:bg-accent/30 cursor-pointer',
        selected && 'bg-accent/20',
      )}
      title={isDeleted ? 'Click to view deleted-file diff' : 'Click to view diff'}
      onClick={() => onOpenDiff()}
    >
      {/* Checkbox */}
      <button
        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        title={selected ? 'Unstage' : 'Stage for commit'}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {selected ? (
          <div className="h-3 w-3 rounded-sm border border-primary bg-primary" />
        ) : (
          <div className="h-3 w-3 rounded-sm border border-muted-foreground/40" />
        )}
      </button>

      {/* Status letter */}
      <span className={cn('w-3 flex-shrink-0 font-mono text-[10px] font-semibold', STATUS_COLOR[entry.status])}>
        {STATUS_LABEL[entry.status]}
      </span>

      {/* Filename */}
      <span className={cn(
        'flex-1 truncate',
        isDeleted ? 'text-rose-400/80 line-through decoration-rose-400/50' : 'text-foreground/90',
      )}>
        {entry.fileName}
      </span>

      {/* Unsaved / draft dots */}
      {hasUnsaved && (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" title="Unsaved changes" />
      )}
      {hasDraft && !hasUnsaved && (
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" title="Draft" />
      )}

      {/* Discard button — always visible, adapts per status */}
      {onDiscard && (
        <button
          className={cn(
            'flex-shrink-0 rounded p-0.5 transition-colors',
            isUntracked
              ? 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400'
              : 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300',
          )}
          title={
            isDeleted ? 'Restore file from HEAD'
              : isUntracked ? 'Discard — delete this untracked file'
              : 'Discard changes — restore file to HEAD'
          }
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
        >
          <Undo2 size={11} />
        </button>
      )}

      {/* Open-in-editor button — hover only, non-deleted files */}
      {!isDeleted && (
        <button
          className="flex-shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
          title="Open file in editor"
          onClick={(e) => { e.stopPropagation(); onOpenFile(); }}
        >
          <ExternalLink size={11} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ─── Commit history row ───────────────────────────────────────────────────────

function CommitRow({
  commit,
  isSelected,
  changes,
  onSelect,
  onRevert,
  onOpenCommitDiff,
}: {
  commit: VcsCommit;
  isSelected: boolean;
  changes: VcsCommitFile[];
  onSelect: () => void;
  onRevert: () => Promise<void>;
  onOpenCommitDiff: (commitId: string) => Promise<void>;
}) {
  const vcs = useVcsStore();
  const date = new Date(commit.createdAt);
  const dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        className="flex w-full flex-col gap-0.5 px-2 py-1.5 text-left hover:bg-accent/30 transition-colors"
        title="Click to view commit diff"
        onClick={async () => {
          onSelect();
          await onOpenCommitDiff(commit.id);
        }}
      >
        <span className="truncate text-xs text-foreground/90">{commit.message}</span>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono">{commit.id.slice(0, 7)}</span>
          <span>{dateLabel} {timeLabel}</span>
          {commit.mergeParentCommitId && (
            <span className="rounded bg-violet-500/20 px-1 text-[9px] text-violet-400">merge</span>
          )}
          {changes.length > 0 && (
            <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">
              {changes.length} file{changes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {isSelected && (
        <div className="border-t border-border/30 bg-muted/10 px-2 pb-2 pt-1.5">
          {changes.length > 0 && (
            <div className="mb-1.5 space-y-px">
              {changes.map((ch) => (
                <button
                  key={ch.id}
                  className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-[10px] hover:bg-accent/40"
                  onClick={async (e) => { e.stopPropagation(); await onOpenCommitDiff(commit.id); }}
                >
                  <span className={cn(
                    'w-3 font-mono font-semibold flex-shrink-0',
                    ch.changeType === 'add' ? 'text-emerald-500'
                      : ch.changeType === 'delete' ? 'text-rose-500'
                      : ch.changeType === 'rename' ? 'text-blue-500'
                      : 'text-amber-500',
                  )}>
                    {ch.changeType[0].toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-left text-muted-foreground">
                    {ch.snapshot?.name ?? ch.fileId}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            disabled={vcs.isLoading('action') || vcs.isLoading('revertPreview')}
            onClick={async () => {
              try {
                await onRevert();
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                window.alert(`Failed to load revert preview: ${msg}`);
              }
            }}
          >
            {vcs.isLoading('revertPreview') ? (
              <Loader2 size={11} className="mr-1.5 animate-spin" />
            ) : (
              <RotateCcw size={11} className="mr-1.5" />
            )}
            Reset branch to this commit
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Fetch / Pull panel ───────────────────────────────────────────────────────

const FETCH_KIND_COLOR: Record<FetchPreviewEntry['kind'], string> = {
  added: 'text-emerald-500',
  modified: 'text-amber-500',
  deleted: 'text-rose-500',
};
const FETCH_KIND_LABEL: Record<FetchPreviewEntry['kind'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
};

function FetchPullPanel({
  onApplyPullUpdates,
  getLocalStatus,
  onOpenConflictDiff,
  currentBranch,
  isBranchLocalOnly,
}: {
  onApplyPullUpdates: (updates: PullFileUpdate[]) => Promise<void>;
  getLocalStatus: () => VcsStatusEntry[];
  onOpenConflictDiff: VcsPanelProps['onOpenConflictDiff'];
  currentBranch: string;
  isBranchLocalOnly: boolean;
}) {
  const vcs = useVcsStore();
  const { fetchPreview, lastFetchedAt, lastPulledAt, isLoading, hasPendingPull, localCommits } = vcs;

  // Conflict resolutions: fileId → 'keepLocal' | 'takeServer'
  const [resolutions, setResolutions] = useState<Record<string, 'keepLocal' | 'takeServer'>>({});

  const conflictEntries = fetchPreview?.filter((e) => e.hasLocalChanges && e.kind !== 'added') ?? [];
  const autoEntries = fetchPreview?.filter((e) => !e.hasLocalChanges || e.kind === 'added') ?? [];
  const unresolvedCount = conflictEntries.filter((e) => !resolutions[e.fileId]).length;
  const canPull = hasPendingPull() && unresolvedCount === 0;

  const handleFetch = useCallback(async () => {
    setResolutions({});
    await vcs.fetch(getLocalStatus);
  }, [vcs, getLocalStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePull = useCallback(async () => {
    if (!canPull) return;
    await vcs.pull(
      Object.entries(resolutions).map(([fileId, resolution]) => ({ fileId, resolution })),
      onApplyPullUpdates,
    );
    setResolutions({});
  }, [canPull, resolutions, vcs, onApplyPullUpdates]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePush = useCallback(async () => {
    if (localCommits.length === 0 && !isBranchLocalOnly) return;
    let confirmMsg: string;
    if (isBranchLocalOnly && localCommits.length === 0) {
      confirmMsg = `Push branch "${currentBranch}" to the server?\n\nThis will create the branch on the server.`;
    } else if (isBranchLocalOnly) {
      confirmMsg =
        `Push branch "${currentBranch}" and ${localCommits.length} local commit${localCommits.length !== 1 ? 's' : ''} to the server?\n\n` +
        localCommits.map((c) => `  • ${c.message}`).join('\n');
    } else {
      confirmMsg =
        `Push ${localCommits.length} local commit${localCommits.length !== 1 ? 's' : ''} to the server?\n\n` +
        localCommits.map((c) => `  • ${c.message}`).join('\n');
    }
    if (!window.confirm(confirmMsg)) return;
    await vcs.push();
  }, [localCommits, isBranchLocalOnly, currentBranch, vcs]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const syncBusy = isLoading('fetch') || isLoading('pull') || isLoading('push');

  return (
    <div className="border-b border-border/50">
      {/* Header row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <GitPullRequest size={11} className="flex-shrink-0 text-muted-foreground" />
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Sync
        </span>

        {/* Fetch button — hidden for local-only branches (no remote counterpart yet) */}
        {!isBranchLocalOnly && (
          <button
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5 text-[10px] border border-border/50',
              'hover:border-border hover:bg-accent/30 transition-colors disabled:opacity-40',
            )}
            disabled={syncBusy}
            onClick={handleFetch}
            title={`Fetch from remote\nLast fetched: ${formatTime(lastFetchedAt)}`}
          >
            {isLoading('fetch') ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Download size={10} />
            )}
            Fetch
          </button>
        )}

        {/* Pull button — only shows when there are pending changes */}
        {hasPendingPull() && (
          <button
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5 text-[10px]',
              'bg-primary/90 text-primary-foreground hover:bg-primary transition-colors',
              'disabled:opacity-40',
            )}
            disabled={!canPull || syncBusy}
            onClick={handlePull}
            title={unresolvedCount > 0 ? `Resolve ${unresolvedCount} conflict(s) first` : 'Pull remote changes'}
          >
            {isLoading('pull') ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <ArrowDownToLine size={10} />
            )}
            Pull
            {fetchPreview && fetchPreview.length > 0 && (
              <span className="ml-0.5 rounded bg-white/20 px-1 text-[9px] tabular-nums">
                {fetchPreview.length}
              </span>
            )}
          </button>
        )}

        {/* Push button — shows when there are local commits OR the branch is local-only */}
        {(localCommits.length > 0 || isBranchLocalOnly) && (
          <button
            className={cn(
              'flex items-center gap-1 rounded px-2 py-0.5 text-[10px]',
              isBranchLocalOnly
                ? 'bg-amber-600/90 text-white hover:bg-amber-600 transition-colors'
                : 'bg-violet-600/90 text-white hover:bg-violet-600 transition-colors',
              'disabled:opacity-40',
            )}
            disabled={syncBusy}
            onClick={handlePush}
            title={
              isBranchLocalOnly && localCommits.length === 0
                ? `Push branch "${currentBranch}" to server`
                : isBranchLocalOnly
                ? `Push branch "${currentBranch}" + ${localCommits.length} commit${localCommits.length !== 1 ? 's' : ''} to server`
                : `Push ${localCommits.length} local commit${localCommits.length !== 1 ? 's' : ''} to server`
            }
          >
            {isLoading('push') ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <ArrowUpFromLine size={10} />
            )}
            {isBranchLocalOnly ? 'Push Branch' : 'Push'}
            {localCommits.length > 0 && (
              <span className="ml-0.5 rounded bg-white/20 px-1 text-[9px] tabular-nums">
                {localCommits.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Status line */}
      {!isBranchLocalOnly && (lastFetchedAt || lastPulledAt) && !fetchPreview && (
        <p className="px-3 pb-1.5 text-[10px] text-muted-foreground">
          {lastPulledAt ? `Pulled ${formatTime(lastPulledAt)}` : `Fetched ${formatTime(lastFetchedAt)}`}
          {' · '}branch <span className="font-medium text-foreground/70">{currentBranch}</span>
        </p>
      )}
      {/* Local-only branch hint */}
      {isBranchLocalOnly && (
        <p className="px-3 pb-1.5 text-[10px] text-amber-400/80">
          Local branch — push to publish to server.
        </p>
      )}

      {/* Fetch preview — what changed on server */}
      {fetchPreview && fetchPreview.length === 0 && (
        <p className="px-3 pb-1.5 text-[10px] text-emerald-500">
          Already up to date.
        </p>
      )}

      {fetchPreview && fetchPreview.length > 0 && (
        <div className="pb-1.5">
          {/* Auto-apply entries */}
          {autoEntries.length > 0 && (
            <div className="mb-1">
              <p className="bg-muted/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Auto-apply ({autoEntries.length})
              </p>
              {autoEntries.map((e) => (
                <div key={e.fileId} className="flex items-center gap-1.5 px-3 py-[3px] text-xs">
                  <span className={cn('w-3 flex-shrink-0 font-mono text-[10px] font-semibold', FETCH_KIND_COLOR[e.kind])}>
                    {FETCH_KIND_LABEL[e.kind]}
                  </span>
                  <span className={cn(
                    'flex-1 truncate text-foreground/80',
                    e.kind === 'deleted' && 'line-through text-rose-400/70',
                  )}>
                    {e.fileName}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Conflict entries */}
          {conflictEntries.length > 0 && (
            <div>
              <p className="bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-400">
                Conflicts ({conflictEntries.length})
              </p>
              {conflictEntries.map((e) => {
                const resolution = resolutions[e.fileId];
                return (
                  <div key={e.fileId} className="rounded-sm mx-2 mt-1 border border-rose-500/30 overflow-hidden">
                    {/* File name row */}
                    <button
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs text-left hover:bg-accent/20"
                      title="View diff: your local vs server version"
                      onClick={() => {
                        if (!e.serverSnapshot && !e.pulledSnapshot) return;
                        onOpenConflictDiff(
                          e.fileId,
                          e.fileName,
                          'server',
                          'local',
                          e.serverSnapshot?.content ?? '',
                          e.pulledSnapshot?.content ?? '',
                        );
                      }}
                    >
                      <AlertCircle size={10} className="flex-shrink-0 text-rose-400" />
                      <span className="flex-1 truncate text-foreground/90">{e.fileName}</span>
                      {resolution ? (
                        <span className={cn(
                          'rounded px-1.5 py-px text-[9px] font-medium flex-shrink-0',
                          resolution === 'takeServer'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-blue-500/20 text-blue-400',
                        )}>
                          {resolution === 'takeServer' ? '✓ server' : '✓ local'}
                        </span>
                      ) : (
                        <span className="rounded bg-rose-500/20 px-1.5 py-px text-[9px] text-rose-400">
                          conflict
                        </span>
                      )}
                    </button>

                    {/* Resolution buttons */}
                    <div className="flex border-t border-border/20">
                      <button
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[10px] border-r border-border/20 transition-colors',
                          resolution === 'keepLocal'
                            ? 'bg-blue-500/20 text-blue-300 font-medium'
                            : 'text-muted-foreground hover:bg-accent/50',
                        )}
                        onClick={() => setResolutions((p) => ({ ...p, [e.fileId]: 'keepLocal' }))}
                        title="Keep your local version"
                      >
                        {resolution === 'keepLocal' && <Check size={9} className="flex-shrink-0" />}
                        ← Keep local
                      </button>
                      <button
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[10px] transition-colors',
                          resolution === 'takeServer'
                            ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                            : 'text-muted-foreground hover:bg-accent/50',
                        )}
                        onClick={() => setResolutions((p) => ({ ...p, [e.fileId]: 'takeServer' }))}
                        title="Accept server version"
                      >
                        {resolution === 'takeServer' && <Check size={9} className="flex-shrink-0" />}
                        Server →
                      </button>
                    </div>
                  </div>
                );
              })}

              {unresolvedCount > 0 && (
                <p className="mt-1 px-3 text-[10px] text-rose-400">
                  Resolve {unresolvedCount} conflict{unresolvedCount !== 1 ? 's' : ''} to pull.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function VcsPanel({
  unsavedIds,
  draftedIds,
  activeFileId,
  activeFileName,
  onOpenCurrentFile,
  onOpenDiffFile,
  onOpenCommitDiff,
  onOpenFileHistoryDiff,
  onRestoreFileContent,
  onRestoreFilesFromHead,
  onOpenConflictDiff,
  onGetFileSnapshot,
  onApplySnapshot,
  onApplyPullUpdates,
  getLocalStatus,
}: VcsPanelProps) {
  const vcs = useVcsStore();

  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [mergeSource, setMergeSource] = useState('');
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, 'useSource' | 'useTarget'>
  >({});
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
  const [revertPreview, setRevertPreview] = useState<RevertPreviewData | null>(null);
  const [pendingRevertCommitId, setPendingRevertCommitId] = useState<string | null>(null);

  // ── File history state ─────────────────────────────────────────────────────
  const [fileHistoryEntries, setFileHistoryEntries] = useState<VcsFileHistoryEntry[]>([]);
  const [fileHistoryHasMore, setFileHistoryHasMore] = useState(false);
  const [fileHistoryLoading, setFileHistoryLoading] = useState(false);

  // ── Init: refresh panel data once the store has a projectId ──────────────
  // NOTE: child effects run before parent effects. page.tsx calls vcs.init()
  // in its own effect, so vcs.projectId is null when VcsPanel first mounts.
  // We watch vcs.projectId and load data as soon as it becomes available.
  useEffect(() => {
    if (!vcs.projectId) return;
    vcs.refreshPanel().catch(() => {});
  }, [vcs.projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-load top 5 file history when active file changes ─────────────────
  useEffect(() => {
    if (!activeFileId) {
      setFileHistoryEntries([]);
      setFileHistoryHasMore(false);
      return;
    }
    let cancelled = false;
    setFileHistoryLoading(true);
    setFileHistoryEntries([]);
    setFileHistoryHasMore(false);

    vcs.fileHistory(activeFileId, 5)
      .then(({ entries, hasMore }) => {
        if (cancelled) return;
        setFileHistoryEntries(entries);
        setFileHistoryHasMore(hasMore);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFileHistoryLoading(false); });

    return () => { cancelled = true; };
  }, [activeFileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-select new files, preserve manual deselections ───────────────────
  const prevStatusIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newIds = new Set(vcs.statusEntries.map((e) => e.fileId));
    setSelectedFiles((prev) => {
      const next = new Set<string>();
      for (const id of newIds) {
        if (!prevStatusIds.current.has(id)) next.add(id);  // new → auto-select
        else if (prev.has(id)) next.add(id);               // keep existing
      }
      return next;
    });
    prevStatusIds.current = newIds;
  }, [vcs.statusEntries]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const changedCount = vcs.statusEntries.length;
  const selectedEntries = vcs.statusEntries.filter((e) => selectedFiles.has(e.fileId));
  const unselectedEntries = vcs.statusEntries.filter((e) => !selectedFiles.has(e.fileId));
  const deletedEntries = vcs.statusEntries.filter((e) => e.status === 'deleted');
  const actionLoading = vcs.isLoading('action');
  const generateLoading = vcs.isLoading('generate');
  const panelLoading = vcs.isLoading('panel');

  // Block commit only if a STAGED file has unsaved in-memory edits
  const stagedHasUnsaved = selectedEntries.some((e) => unsavedIds.has(e.fileId));

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim() || selectedEntries.length === 0 || stagedHasUnsaved) return;

    // Build file snapshots from client state. Deleted files use { deleted: true };
    // all others resolve their current in-memory content via onGetFileSnapshot.
    const files: VcsFileSnapshotForCommit[] = [];
    for (const e of selectedEntries) {
      if (e.status === 'deleted') {
        files.push({ fileId: e.fileId, deleted: true });
      } else {
        const snap = onGetFileSnapshot(e.fileId);
        if (snap) files.push(snap);
      }
    }
    if (files.length === 0) return;

    // After commit, local files are already up to date — no server re-fetch needed.
    try {
      await vcs.commit(commitMessage.trim(), files, async () => {});
      setCommitMessage('');
      setSelectedFiles(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('No material file changes to commit')) {
        // Benign race/stale-status case: treat as no-op and reset staged UI.
        setCommitMessage('');
        setSelectedFiles(new Set());
        return;
      }
      throw error;
    }
  }, [commitMessage, selectedEntries, stagedHasUnsaved, vcs, onGetFileSnapshot]);

  const handleGenerate = useCallback(async () => {
    if (selectedEntries.length === 0) return;
    const files: VcsFileSnapshotForCommit[] = [];
    for (const e of selectedEntries) {
      if (e.status === 'deleted') {
        files.push({ fileId: e.fileId, deleted: true });
      } else {
        const snap = onGetFileSnapshot(e.fileId);
        if (snap) files.push(snap);
      }
    }
    if (files.length === 0) return;
    try {
      const msg = await vcs.generateCommitMessage(files);
      if (msg.trim()) setCommitMessage(msg.trim());
    } catch { /* error in store */ }
  }, [selectedEntries, vcs, onGetFileSnapshot]);

  const handleCheckout = useCallback(async (branchName: string) => {
    if (unsavedIds.size > 0) {
      window.alert('Save or discard unsaved edits before switching branches.');
      return;
    }
    if (vcs.statusEntries.length > 0) {
      const names = vcs.statusEntries.map((e) => `  • ${e.fileName}`).join('\n');
      if (!window.confirm(
        `You have ${vcs.statusEntries.length} uncommitted change(s):\n${names}\n\n` +
        `Switching branches will apply the target branch state to your local files.\n\nContinue anyway?`,
      )) return;
    }
    if (draftedIds.size > 0) {
      if (!window.confirm('You have staged drafts. Checking out will discard them. Continue?')) return;
    }
    await vcs.checkoutBranch(branchName, onApplySnapshot);
  }, [unsavedIds.size, vcs, draftedIds.size, onApplySnapshot]);

  const handleCreateBranch = useCallback(async (name: string, fromBranch: string) => {
    await vcs.createBranch(name, fromBranch);
    // Auto-checkout to the new branch — applies snapshot locally
    await vcs.checkoutBranch(name, onApplySnapshot);
  }, [vcs, onApplySnapshot]);

  const handlePreviewMerge = useCallback(async () => {
    if (!mergeSource || mergeSource === vcs.currentBranch) return;
    await vcs.previewMerge(mergeSource, vcs.currentBranch);
  }, [mergeSource, vcs]);

  const handleExecuteMerge = useCallback(async () => {
    const preview = vcs.mergePreview;
    if (!preview) return;
    if (preview.alreadyUpToDate) { vcs.clearMergePreview(); return; }
    const unresolved = preview.conflicts.filter((c) => !conflictResolutions[c.fileId]);
    if (unresolved.length > 0) {
      window.alert(`Resolve all ${unresolved.length} conflict(s) first.`);
      return;
    }
    await vcs.executeMerge(
      preview.sourceBranch,
      preview.targetBranch,
      preview.conflicts.map((c) => ({ fileId: c.fileId, resolution: conflictResolutions[c.fileId] })),
      onApplySnapshot,
    );
    setConflictResolutions({});
    setMergeSource('');
  }, [vcs, conflictResolutions, onApplySnapshot]);

  const handleLoadMoreHistory = useCallback(async () => {
    if (!activeFileId || fileHistoryLoading) return;
    setFileHistoryLoading(true);
    try {
      const newLimit = fileHistoryEntries.length + 10;
      const { entries, hasMore } = await vcs.fileHistory(activeFileId, newLimit);
      setFileHistoryEntries(entries);
      setFileHistoryHasMore(hasMore);
    } catch { /* ignore */ } finally {
      setFileHistoryLoading(false);
    }
  }, [activeFileId, fileHistoryEntries.length, fileHistoryLoading, vcs]);

  const toggleFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const handleDiscardFile = useCallback(async (entry: VcsStatusEntry) => {
    const confirmMsg =
      entry.status === 'deleted'
        ? `Restore "${entry.fileName}" from HEAD?`
        : entry.status === 'untracked'
        ? `Delete "${entry.fileName}"? This file is not committed and will be permanently removed.`
        : `Discard changes to "${entry.fileName}"? This will revert it to the last committed version.`;
    if (!window.confirm(confirmMsg)) return;
    await onRestoreFilesFromHead([entry.fileId]);
  }, [onRestoreFilesFromHead]);

  const handleRestoreAllDeleted = useCallback(async () => {
    const ids = deletedEntries.map((e) => e.fileId);
    if (ids.length === 0) return;
    await onRestoreFilesFromHead(ids);
  }, [deletedEntries, onRestoreFilesFromHead]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-card">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <GitBranch size={13} className="text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
            Source Control
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Pending pull badge */}
          {vcs.hasPendingPull() && (
            <span className="rounded bg-primary/20 px-1.5 py-px text-[9px] font-medium text-primary">
              {vcs.pendingPullCount()} pending
            </span>
          )}
          <button
            className="rounded p-1 hover:bg-accent disabled:opacity-40 transition-colors"
            title="Refresh history"
            disabled={panelLoading}
            onClick={() => vcs.refreshPanel().catch(() => {})}
          >
            <RefreshCw
              size={12}
              className={cn('text-muted-foreground', panelLoading && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {vcs.error && (
        <div className="flex items-start gap-1.5 border-b border-rose-500/30 bg-rose-500/10 px-2 py-1.5">
          <AlertCircle size={12} className="mt-px flex-shrink-0 text-rose-400" />
          <span className="flex-1 text-xs text-rose-400">{vcs.error}</span>
          <button className="text-rose-400 hover:text-rose-300" onClick={vcs.clearError}>✕</button>
        </div>
      )}

      {/* ── Branch combobox ─────────────────────────────────────────────────── */}
      <div className="border-b border-border/50 px-2 py-1.5">
        <BranchCombobox
          branches={vcs.branches}
          currentBranch={vcs.currentBranch}
          disabled={actionLoading}
          onCheckout={handleCheckout}
          onCreateBranch={handleCreateBranch}
        />
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">

        {/* ── Fetch / Pull sync panel ─────────────────────────────────────────── */}
        <FetchPullPanel
          onApplyPullUpdates={onApplyPullUpdates}
          getLocalStatus={getLocalStatus}
          onOpenConflictDiff={onOpenConflictDiff}
          currentBranch={vcs.currentBranch}
          isBranchLocalOnly={vcs.isBranchLocalOnly(vcs.currentBranch)}
        />

        {/* ── Commit input ───────────────────────────────────────────────────── */}
        <div className="space-y-1.5 border-b border-border/50 p-2">
          <div className="relative">
            <Input
              placeholder="Commit message (Ctrl+↵ to commit)"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="h-7 pr-7 text-[11px] placeholder:text-[10px]"
              onKeyDown={async (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  await handleCommit();
                }
              }}
            />
            <button
              className={cn(
                'absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5',
                'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
                'disabled:pointer-events-none disabled:opacity-30',
              )}
              title="Generate commit message with AI"
              disabled={actionLoading || generateLoading || selectedEntries.length === 0}
              onClick={handleGenerate}
            >
              <Sparkles size={13} className={cn(generateLoading && 'animate-pulse text-primary')} />
            </button>
          </div>

          {stagedHasUnsaved && (
            <p className="flex items-center gap-1 text-[10px] text-amber-500">
              <AlertCircle size={10} />
              Save staged files before committing.
            </p>
          )}

          <Button
            size="sm"
            className="h-7 w-full text-xs"
            disabled={actionLoading || !commitMessage.trim() || selectedEntries.length === 0 || stagedHasUnsaved}
            onClick={handleCommit}
          >
            {actionLoading ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <Check size={12} className="mr-1.5" />}
            Commit{selectedEntries.length > 0 ? ` (${selectedEntries.length})` : ''}
          </Button>
        </div>

        {/* ── Changes ────────────────────────────────────────────────────────── */}
        <Section
          title="Changes"
          badge={changedCount || undefined}
          defaultOpen
          actions={
            <div className="flex gap-0.5">
              {deletedEntries.length > 0 && (
                <button
                  className="rounded p-0.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                  onClick={handleRestoreAllDeleted}
                  title={`Restore ${deletedEntries.length} deleted file${deletedEntries.length !== 1 ? 's' : ''} from HEAD`}
                  disabled={actionLoading}
                >
                  <Undo2 size={11} />
                </button>
              )}
              <button
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                onClick={() => setSelectedFiles(new Set(vcs.statusEntries.map((e) => e.fileId)))}
                title="Stage all"
              >
                <Plus size={11} />
              </button>
              <button
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                onClick={() => setSelectedFiles(new Set())}
                title="Unstage all"
              >
                <Minus size={11} />
              </button>
            </div>
          }
        >
          {changedCount === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">No changes</p>
          ) : (
            <>
              {selectedEntries.length > 0 && (
                <>
                  <p className="bg-muted/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Staged ({selectedEntries.length})
                  </p>
                  {selectedEntries.map((e) => (
                    <FileRow
                      key={e.fileId}
                      entry={e}
                      selected
                      hasUnsaved={unsavedIds.has(e.fileId)}
                      hasDraft={draftedIds.has(e.fileId)}
                      onToggle={() => toggleFile(e.fileId)}
                      onOpenFile={() => onOpenCurrentFile(e.fileId)}
                      onOpenDiff={() => { onOpenDiffFile(e.fileId).catch(() => {}); }}
                      onDiscard={() => { handleDiscardFile(e).catch(() => {}); }}
                    />
                  ))}
                </>
              )}
              {unselectedEntries.length > 0 && (
                <>
                  <p className="bg-muted/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Changes ({unselectedEntries.length})
                  </p>
                  {unselectedEntries.map((e) => (
                    <FileRow
                      key={e.fileId}
                      entry={e}
                      selected={false}
                      hasUnsaved={unsavedIds.has(e.fileId)}
                      hasDraft={draftedIds.has(e.fileId)}
                      onToggle={() => toggleFile(e.fileId)}
                      onOpenFile={() => onOpenCurrentFile(e.fileId)}
                      onOpenDiff={() => { onOpenDiffFile(e.fileId).catch(() => {}); }}
                      onDiscard={() => { handleDiscardFile(e).catch(() => {}); }}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </Section>

        {/* ── Merge ──────────────────────────────────────────────────────────── */}
        <Section
          title="Merge"
          defaultOpen={false}
          actions={
            vcs.mergePreview ? (
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => { vcs.clearMergePreview(); setConflictResolutions({}); }}
              >
                ✕
              </button>
            ) : undefined
          }
        >
          <div className="space-y-2 p-2">
            {!vcs.mergePreview ? (
              <div className="space-y-1.5">
                <MergeBranchSelect
                  branches={vcs.branches}
                  excludeBranch={vcs.currentBranch}
                  value={mergeSource}
                  onChange={setMergeSource}
                  disabled={actionLoading}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-full text-xs"
                  disabled={actionLoading || !mergeSource}
                  onClick={handlePreviewMerge}
                >
                  <GitMerge size={11} className="mr-1" />
                  Preview merge into {vcs.currentBranch}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Merging{' '}
                  <span className="font-medium text-foreground">{vcs.mergePreview.sourceBranch}</span>
                  {' → '}
                  <span className="font-medium text-foreground">{vcs.mergePreview.targetBranch}</span>
                </p>
                {vcs.mergePreview.alreadyUpToDate ? (
                  <p className="text-xs text-emerald-500">Already up to date.</p>
                ) : (
                  <>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-emerald-500">✓ Auto: {vcs.mergePreview.autoMergedFiles.length}</span>
                      <span className={vcs.mergePreview.conflicts.length > 0 ? 'text-rose-400' : 'text-muted-foreground'}>
                        ⚡ Conflicts: {vcs.mergePreview.conflicts.length}
                      </span>
                    </div>
                    {vcs.mergePreview.conflicts.map((conflict) => {
                      const fileName = conflict.source?.name ?? conflict.target?.name ?? conflict.fileId;
                      const resolution = conflictResolutions[conflict.fileId];
                      const openDiff = () => onOpenConflictDiff(
                        conflict.fileId,
                        fileName,
                        vcs.mergePreview!.sourceBranch,
                        vcs.mergePreview!.targetBranch,
                        conflict.source?.content ?? '',
                        conflict.target?.content ?? '',
                      );

                      return (
                        <div key={conflict.fileId} className="rounded border border-rose-500/30 overflow-hidden">
                          {/* File name — click to view diff */}
                          <button
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent/30 transition-colors text-left"
                            title="Click to compare source vs target in diff view"
                            onClick={openDiff}
                          >
                            <AlertCircle size={10} className="flex-shrink-0 text-rose-400" />
                            <span className="flex-1 truncate text-foreground/90">{fileName}</span>
                            {resolution ? (
                              <span className={cn(
                                'rounded px-1.5 py-px text-[9px] font-medium flex-shrink-0',
                                resolution === 'useSource'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-blue-500/20 text-blue-400',
                              )}>
                                {resolution === 'useSource' ? '✓ incoming' : '✓ current'}
                              </span>
                            ) : (
                              <span className="rounded bg-rose-500/20 px-1.5 py-px text-[9px] text-rose-400 flex-shrink-0">
                                conflict
                              </span>
                            )}
                          </button>

                          {/* Resolution buttons */}
                          <div className="flex border-t border-border/20">
                            <button
                              className={cn(
                                'flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[10px] transition-colors border-r border-border/20',
                                resolution === 'useTarget'
                                  ? 'bg-blue-500/20 text-blue-300 font-medium'
                                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                              )}
                              title={`Keep ${vcs.mergePreview!.targetBranch} version (current branch, left pane)`}
                              onClick={() => {
                                setConflictResolutions((p) => ({ ...p, [conflict.fileId]: 'useTarget' }));
                                openDiff();
                              }}
                            >
                              {resolution === 'useTarget' && <Check size={9} className="flex-shrink-0" />}
                              ← {vcs.mergePreview!.targetBranch}
                            </button>
                            <button
                              className={cn(
                                'flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[10px] transition-colors',
                                resolution === 'useSource'
                                  ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                              )}
                              title={`Accept ${vcs.mergePreview!.sourceBranch} version (incoming, right pane)`}
                              onClick={() => {
                                setConflictResolutions((p) => ({ ...p, [conflict.fileId]: 'useSource' }));
                                openDiff();
                              }}
                            >
                              {resolution === 'useSource' && <Check size={9} className="flex-shrink-0" />}
                              {vcs.mergePreview!.sourceBranch} →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                <Button
                  size="sm"
                  className="h-7 w-full text-xs"
                  disabled={
                    actionLoading ||
                    (!vcs.mergePreview.alreadyUpToDate &&
                      vcs.mergePreview.conflicts.some((c) => !conflictResolutions[c.fileId]))
                  }
                  onClick={handleExecuteMerge}
                >
                  <GitMerge size={11} className="mr-1.5" />
                  {vcs.mergePreview.alreadyUpToDate ? 'Close' : 'Complete Merge'}
                </Button>
              </div>
            )}
          </div>
        </Section>

        {/* ── History (commit log) ───────────────────────────────────────────── */}
        <Section
          title="History"
          badge={
            vcs.commits.length || vcs.localCommits.length
              ? `${vcs.localCommits.length ? `${vcs.localCommits.length}↑ · ` : ''}${vcs.commits.length}${vcs.commitsHasMore ? '+' : ''}`
              : undefined
          }
          defaultOpen={false}
        >
          {/* Local (unpushed) commits — shown at the top, newest first */}
          {vcs.localCommits.length > 0 && (
            <div className="border-b border-amber-500/20 bg-amber-500/5">
              <p className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Local · not pushed ({vcs.localCommits.length})
              </p>
              {[...vcs.localCommits].reverse().map((commit: LocalCommit) => {
                const date = new Date(commit.createdAt);
                return (
                  <div key={commit.localId} className="border-b border-amber-500/10 last:border-b-0">
                    <div className="flex flex-col gap-0.5 px-2 py-1.5">
                      <span className="truncate text-xs text-foreground/90">{commit.message}</span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono">{commit.localId.slice(0, 7)}</span>
                        <span>
                          {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          {' '}
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="rounded bg-amber-500/25 px-1 text-[9px] font-medium text-amber-400">
                          local
                        </span>
                        {commit.files.length > 0 && (
                          <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">
                            {commit.files.length} file{commit.files.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Server commits */}
          {vcs.commits.length === 0 && vcs.localCommits.length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              {panelLoading ? 'Loading…' : 'No commits yet.'}
            </p>
          ) : vcs.commits.length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              {panelLoading ? 'Loading…' : 'No server commits yet — push to publish.'}
            </p>
          ) : (
            <>
              {vcs.commits.map((commit) => (
                <CommitRow
                  key={commit.id}
                  commit={commit}
                  isSelected={selectedCommitId === commit.id}
                  changes={selectedCommitId === commit.id ? vcs.activeCommitChanges : []}
                  onSelect={async () => {
                    if (selectedCommitId === commit.id) {
                      setSelectedCommitId(null);
                      vcs.setActiveCommitChanges([]);
                    } else {
                      setSelectedCommitId(commit.id);
                      await vcs.loadCommitDetail(commit.id);
                    }
                  }}
                  onRevert={async () => {
                    const preview = await vcs.previewRevert(commit.id);
                    setPendingRevertCommitId(commit.id);
                    setRevertPreview({
                      commitId: commit.id,
                      commitMessage: preview.commitMessage,
                      toDelete: preview.toDelete,
                      toRestore: preview.toRestore,
                      toModify: preview.toModify,
                    });
                  }}
                  onOpenCommitDiff={onOpenCommitDiff}
                />
              ))}
              {vcs.commitsHasMore && (
                <button
                  className="flex w-full items-center justify-center gap-1.5 border-t border-border/30 py-2 text-xs text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors disabled:opacity-40"
                  disabled={panelLoading}
                  onClick={() => vcs.loadMoreCommits().catch(() => {})}
                >
                  {panelLoading ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <ChevronRight size={11} className="rotate-90" />
                  )}
                  Load more commits
                </button>
              )}
            </>
          )}
        </Section>

        {/* ── File History ───────────────────────────────────────────────────── */}
        <Section
          title="File History"
          defaultOpen
          badge={fileHistoryEntries.length
            ? `${fileHistoryEntries.length}${fileHistoryHasMore ? '+' : ''}`
            : undefined}
        >
          <div className="space-y-1 px-2 pb-2 pt-1">
            {/* File name label */}
            <div className="flex items-center gap-1.5 py-0.5">
              {fileHistoryLoading && <Loader2 size={10} className="flex-shrink-0 animate-spin text-muted-foreground" />}
              <span className="flex-1 truncate text-[10px] text-muted-foreground">
                {activeFileId
                  ? (activeFileName ?? activeFileId)
                  : 'Open a file to view its history'}
              </span>
            </div>

            {/* History entries */}
            {fileHistoryEntries.length > 0 && (
              <div className="space-y-1">
                {fileHistoryEntries.map((entry) => {
                  const date = entry.commit ? new Date(entry.commit.createdAt) : null;
                  const commitLabel = entry.commit?.message ?? entry.commitId.slice(0, 8);
                  const parentCommitId = entry.commit?.parentCommitId ?? null;

                  return (
                    <div key={entry.id} className="rounded border border-border/40 overflow-hidden">
                      {/* Commit info row — click opens before/after diff */}
                      <button
                        className="flex w-full flex-col gap-0.5 p-1.5 text-left hover:bg-accent/30 transition-colors"
                        title="View what changed in this commit"
                        onClick={async () => {
                          if (!activeFileId) return;
                          await onOpenFileHistoryDiff(
                            activeFileId,
                            entry.commitId,
                            parentCommitId,
                            activeFileName ?? activeFileId,
                          );
                        }}
                      >
                        <span className="truncate text-xs font-medium text-foreground/90">
                          {commitLabel}
                        </span>
                        {date && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className={cn(
                              'font-mono font-semibold w-3',
                              entry.changeType === 'add' ? 'text-emerald-500'
                                : entry.changeType === 'delete' ? 'text-rose-500'
                                : entry.changeType === 'rename' ? 'text-blue-500'
                                : 'text-amber-500',
                            )}>
                              {entry.changeType[0].toUpperCase()}
                            </span>
                            <span className="font-mono text-[9px]">{entry.commitId.slice(0, 7)}</span>
                            {entry.commit?.mergeParentCommitId && (
                              <span className="rounded bg-violet-500/20 px-1 text-[9px] text-violet-400">merge</span>
                            )}
                            <span>
                              {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              {' · '}
                              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </button>

                      {/* Action buttons */}
                      <div className="flex gap-1 border-t border-border/30 px-1.5 pb-1.5 pt-1">
                        <button
                          className="flex flex-1 items-center justify-center gap-1 rounded border border-border/50 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="View all changes in this commit"
                          onClick={async () => { await onOpenCommitDiff(entry.commitId); }}
                        >
                          <ExternalLink size={9} />
                          Full commit
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 flex-1 text-[10px]"
                          disabled={actionLoading || !activeFileId}
                          onClick={async () => {
                            if (!activeFileId) return;
                            let content = '';
                            try {
                              const result = await vcs.getFileAtCommit(activeFileId, entry.commitId);
                              content = result.snapshot?.content ?? '';
                            } catch {
                              window.alert('Failed to fetch the file version.');
                              return;
                            }
                            await onRestoreFileContent(activeFileId, content);
                          }}
                        >
                          <RotateCcw size={9} className="mr-1" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Load more */}
                {fileHistoryHasMore && (
                  <button
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-border/40 py-1.5 text-[10px] text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors disabled:opacity-40"
                    disabled={fileHistoryLoading}
                    onClick={handleLoadMoreHistory}
                  >
                    {fileHistoryLoading
                      ? <Loader2 size={10} className="animate-spin" />
                      : <ChevronRight size={10} className="rotate-90" />
                    }
                    Load more
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {!fileHistoryLoading && activeFileId && fileHistoryEntries.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No commit history for this file.</p>
            )}
          </div>
        </Section>

      </div>

      <RevertConfirmDialog
        data={revertPreview}
        onClose={() => { setRevertPreview(null); setPendingRevertCommitId(null); }}
        onConfirm={async () => {
          if (!pendingRevertCommitId) return;
          await vcs.revertCommit(pendingRevertCommitId, undefined, onApplySnapshot);
          setRevertPreview(null);
          setPendingRevertCommitId(null);
          setSelectedCommitId(null);
        }}
      />
    </div>
  );
}
