"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Undo2, Redo2, Clock, Plus, Minus, ArrowUpDown, Eye, Lock, Edit2,
  ChevronDown, ChevronRight, Bookmark, Users, Monitor, RefreshCw,
  Upload, Globe, AlertTriangle, RotateCcw, Download, Eraser, Scissors, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useLayerHistoryStore,
  useHasUnpublishedChanges,
  type LayerHistoryEntry,
  type DbLayerHistoryEntry,
} from "../../../stores/layer-history-store";
import type { LayerChangeType, LayerNodeChange, MergeConflict } from "@/lib/editor/layer-types";
import { deepDiff, formatDiffValue, shortenPath } from "@/lib/editor/diff-utils";
import { DiffViewModal, type DiffSection } from "../../../dialogs/DiffViewModal";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { useProjectStore } from "../../../stores/project-store";
import { useCompileStore } from "../../../stores/compile-store";

// ─── Shared display helpers ───────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  if (ts === 0) return "pinned";
  const d = Date.now() - ts;
  if (d < 2_000) return "just now";
  if (d < 60_000) return `${Math.floor(d / 1_000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 604_800_000) return `${Math.floor(d / 86_400_000)}d ago`;
  if (d < 2_592_000_000) return `${Math.floor(d / 604_800_000)}w ago`;
  if (d < 31_536_000_000) return `${Math.floor(d / 2_592_000_000)}mo ago`;
  return `${Math.floor(d / 31_536_000_000)}y ago`;
}

function ClientBadge({ clientId, isSelf }: { clientId: string | null; isSelf?: boolean }) {
  if (!clientId) return null;
  return (
    <span
      title={`Client: ${clientId}`}
      className={cn(
        "inline-flex items-center rounded px-1 py-0 text-[9px] font-mono font-medium shrink-0",
        isSelf ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
      )}
    >
      {isSelf ? "you" : clientId.slice(-6)}
    </span>
  );
}

const CHANGE_ICON: Record<LayerChangeType, React.ReactNode> = {
  override: <Edit2 className="h-3 w-3" />,
  add_node: <Plus className="h-3 w-3" />,
  add_child: <Plus className="h-3 w-3" />,
  remove_node: <Minus className="h-3 w-3" />,
  reorder: <ArrowUpDown className="h-3 w-3" />,
  visibility: <Eye className="h-3 w-3" />,
  lock: <Lock className="h-3 w-3" />,
  reset: <RotateCcw className="h-3 w-3" />,
};

const CHANGE_COLOR: Record<LayerChangeType, string> = {
  override: "text-blue-400 bg-blue-400/15",
  add_node: "text-emerald-400 bg-emerald-400/15",
  add_child: "text-emerald-400 bg-emerald-400/15",
  remove_node: "text-red-400 bg-red-400/15",
  reorder: "text-amber-400 bg-amber-400/15",
  visibility: "text-violet-400 bg-violet-400/15",
  lock: "text-orange-400 bg-orange-400/15",
  reset: "text-muted-foreground bg-muted",
};

// ─── Per-change inline summary ────────────────────────────────────────────────

interface AnyChange {
  nodeId: string;
  changeType: LayerChangeType;
  nodeData?: { id?: string; componentId?: string; type?: string } | null;
  parentId?: string;
  prevOrder?: string[];
  nextOrder?: string[];
  prevValue?: boolean;
  nextValue?: boolean;
  prevOverride?: Record<string, unknown>;
  nextOverride?: Record<string, unknown>;
}

function ChangeDiffLine({ change }: { change: AnyChange }) {
  const short = change.nodeId.slice(-10);
  switch (change.changeType) {
    case "override": {
      const keys = [
        ...new Set([
          ...Object.keys(change.prevOverride ?? {}),
          ...Object.keys(change.nextOverride ?? {}),
        ]),
      ].slice(0, 4);
      return <span className="font-mono text-muted-foreground/70">…{short} · {keys.join(", ") || "properties"}</span>;
    }
    case "add_node": case "add_child":
      return <span className="text-emerald-400/70">+ {change.nodeData?.componentId ?? short}</span>;
    case "remove_node":
      return <span className="text-red-400/70">− {change.nodeData?.componentId ?? short}</span>;
    case "reorder":
      return (
        <span className="text-muted-foreground/70">
          {change.prevOrder?.length ?? "?"} items in{" "}
          <span className="font-mono">{change.parentId === "__root__" ? "root" : (change.parentId?.slice(-6) ?? "?")}</span>
        </span>
      );
    case "visibility":
      return <span className="text-muted-foreground/70">…{short} → <span className={change.nextValue ? "" : "text-violet-400/70"}>{change.nextValue ? "shown" : "hidden"}</span></span>;
    case "lock":
      return <span className="text-muted-foreground/70">…{short} → <span className="text-orange-400/70">{change.nextValue ? "locked" : "unlocked"}</span></span>;
    case "reset":
      return <span className="text-muted-foreground/70">all edits discarded</span>;
    default: return null;
  }
}

function EntryDetail({ changes }: { changes: AnyChange[] }) {
  return (
    <div className="mt-2 space-y-2 border-t border-border/40 pt-2">
      {changes.map((c, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className={cn("flex h-4 w-4 items-center justify-center rounded text-[9px]", CHANGE_COLOR[c.changeType])}>
              {CHANGE_ICON[c.changeType]}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{c.changeType}</span>
            <span className="font-mono text-[10px] text-muted-foreground/50 truncate">{c.nodeId}</span>
          </div>
          {c.prevOrder && c.nextOrder && (
            <div className="font-mono text-[10px] leading-relaxed pl-5">
              <div className="text-red-400/70">− [{c.prevOrder.map(id => id.slice(-4)).join(", ")}]</div>
              <div className="text-emerald-400/70">+ [{c.nextOrder.map(id => id.slice(-4)).join(", ")}]</div>
            </div>
          )}
          {c.prevValue !== undefined && (
            <div className="font-mono text-[10px] pl-5 text-muted-foreground/70">
              <span className="text-red-400/70">{String(c.prevValue)}</span>{" → "}
              <span className="text-emerald-400/70">{String(c.nextValue)}</span>
            </div>
          )}
          {c.changeType === "override" && (c.prevOverride || c.nextOverride) && (() => {
            const diffs = deepDiff(c.prevOverride ?? {}, c.nextOverride ?? {});
            if (diffs.length === 0) {
              return (
                <div className="pl-5 font-mono text-[10px] text-muted-foreground/50">
                  (no field-level changes)
                </div>
              );
            }
            return (
              <div className="pl-5 space-y-0.5">
                {diffs.map((d, di) => (
                  <div key={di} className="font-mono text-[10px] leading-relaxed text-muted-foreground/70 break-all">
                    <span className="text-foreground/80">{shortenPath(d.path)}: </span>
                    <span className="text-red-400/70">{formatDiffValue(d.before)}</span>
                    {" → "}
                    <span className="text-emerald-400/70">{formatDiffValue(d.after)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {(c.changeType === "add_node" || c.changeType === "add_child" || c.changeType === "remove_node") && c.nodeData && (
            <div className="pl-5 font-mono text-[10px] text-muted-foreground/70">
              {(c.nodeData as { componentId?: string }).componentId ?? "node"}
              {c.parentId && c.parentId !== "__root__" && (
                <span className="text-muted-foreground/50"> · in …{c.parentId.slice(-8)}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Entry row (reused by both local and team lists) ──────────────────────────

// ─── Layer diff section builder ───────────────────────────────────────────────

function buildLayerDiffSections(changes: AnyChange[]): DiffSection[] {
  return changes.map((c) => {
    const shortId = c.nodeId.slice(-10);
    switch (c.changeType) {
      case "override":
        return {
          title: `override · …${shortId}`,
          before: c.prevOverride ?? {},
          after: c.nextOverride ?? {},
        };
      case "add_node":
      case "add_child":
        return {
          title: `+ ${c.nodeData?.componentId ?? shortId}`,
          before: null,
          after: c.nodeData ?? null,
        };
      case "remove_node":
        return {
          title: `− ${c.nodeData?.componentId ?? shortId}`,
          before: c.nodeData ?? null,
          after: null,
        };
      case "reorder":
        return {
          title: `reorder · ${c.parentId === "__root__" ? "root" : `…${c.parentId?.slice(-8) ?? "?"}`}`,
          before: c.prevOrder ?? [],
          after: c.nextOrder ?? [],
        };
      case "visibility":
        return {
          title: `visibility · …${shortId}`,
          before: { hidden: !c.prevValue },
          after: { hidden: !c.nextValue },
        };
      case "lock":
        return {
          title: `lock · …${shortId}`,
          before: { locked: !!c.prevValue },
          after: { locked: !!c.nextValue },
        };
      default:
        return { title: c.changeType, before: null, after: null };
    }
  });
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({
  id, timestamp, description, changes, clientId: entryCid, selfClientId,
  isCurrent, isFuture, isPinned, isUnpublished,
  onClick, canPreviewRevert, onPreviewStart, onPreviewEnd, onRevert,
  canReset, onReset, onViewDiff,
}: {
  id: string; timestamp: number; description: string;
  changes: AnyChange[]; clientId: string | null;
  selfClientId: string | null;
  isCurrent?: boolean; isFuture?: boolean; isPinned?: boolean; isUnpublished?: boolean;
  onClick: () => void;
  canPreviewRevert?: boolean;
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
  onRevert?: () => void;
  canReset?: boolean;
  onReset?: () => void;
  onViewDiff?: () => void;
}) {
  const primary = changes[0];
  const isSelf = entryCid === selfClientId;

  return (
    <div
      className={cn(
        "w-full px-3 py-2 border-b border-border/40 hover:bg-accent/40 transition-colors group",
        isCurrent && "bg-primary/10 border-l-2 border-l-primary",
        isPinned && !isCurrent && "border-l-2 border-l-amber-400/60",
        isFuture && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        {isPinned ? (
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-amber-400 bg-amber-400/15">
            <Bookmark className="h-3 w-3" />
          </span>
        ) : primary ? (
          <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded", CHANGE_COLOR[primary.changeType])}>
            {CHANGE_ICON[primary.changeType]}
          </span>
        ) : <span className="mt-0.5 h-5 w-5 shrink-0" />}

        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Title row */}
          <div className="flex items-center gap-1 justify-between">
            <button
              type="button"
              onClick={onClick}
              className="flex items-center gap-1 min-w-0 text-left"
            >
              <span className={cn("text-xs font-medium truncate", isCurrent ? "text-foreground" : "text-foreground/70")}>
                {description}
                {changes.length > 1 && <span className="ml-1 text-[10px] text-muted-foreground font-normal">×{changes.length}</span>}
              </span>
              <ClientBadge clientId={entryCid} isSelf={isSelf} />
              {isUnpublished && (
                <span className="text-[9px] text-amber-400/80 bg-amber-400/10 rounded px-1 shrink-0">local</span>
              )}
            </button>
            <span className={cn("text-[10px] shrink-0", isPinned ? "text-amber-400/70" : "text-muted-foreground")}>
              {isPinned ? "pinned" : formatRelativeTime(timestamp)}
            </span>
          </div>
          {/* Inline one-line summary */}
          {primary && <div className="text-[10px]"><ChangeDiffLine change={primary} /></div>}

          {/* Actions */}
          {(canPreviewRevert || onViewDiff) && (
            <div className="flex items-center gap-1 pt-1 opacity-60 group-hover:opacity-100 transition-opacity flex-wrap">
              {onViewDiff && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-accent"
                  title="Open detailed diff view"
                  onClick={(e) => { e.stopPropagation(); onViewDiff(); }}
                >
                  <ChevronRight className="h-3 w-3" /> View diff
                </button>
              )}
              {canPreviewRevert && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-accent"
                    title="Press & hold to preview this state in the player"
                    onMouseDown={(e) => { e.stopPropagation(); onPreviewStart?.(); }}
                    onMouseUp={(e) => { e.stopPropagation(); onPreviewEnd?.(); }}
                    onMouseLeave={() => onPreviewEnd?.()}
                    onTouchStart={(e) => { e.stopPropagation(); onPreviewStart?.(); }}
                    onTouchEnd={(e) => { e.stopPropagation(); onPreviewEnd?.(); }}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-accent"
                    title="Revert to this state — keeps later changes (adds a new entry)"
                    onClick={(e) => { e.stopPropagation(); onRevert?.(); }}
                  >
                    <RotateCcw className="h-3 w-3" /> Revert here
                  </button>
                  {canReset && (
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded border border-red-500/40 px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
                      title="Reset to this state — removes all unpublished local changes after this point"
                      onClick={(e) => { e.stopPropagation(); onReset?.(); }}
                    >
                      <Scissors className="h-3 w-3" /> Reset to this state
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {isCurrent && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
      </div>
    </div>
  );
}

// ─── Merge conflict card ──────────────────────────────────────────────────────

function ConflictCard({ conflict }: { conflict: MergeConflict }) {
  return (
    <div className="mx-3 my-1 rounded border border-amber-400/30 bg-amber-400/5 px-2.5 py-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-0.5 min-w-0">
          <p className="text-[11px] font-medium text-amber-400/90">{conflict.description}</p>
          <p className="text-[10px] text-muted-foreground">
            Clients: {conflict.clients.map(c => c.slice(-6)).join(", ")} · later timestamp wins
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Local history tab ────────────────────────────────────────────────────────

function LocalHistoryTab() {
  const {
    entries, cursor, canUndo, canRedo, jumpTo,
    createCheckpoint, squashMs, clientId,
    publishedEntryIds, isPublishing, clearPublishedHistory,
    baselineSnapshot,
  } = useLayerHistoryStore();
  const {
    undoLayerChange, redoLayerChange, applyHistorySnapshot, publishLayerState,
    startLayerPreview, endLayerPreview, revertToHistorySnapshot,
    resetToLayerHistoryEntry, discardAllLocalLayerChanges,
  } = useLayerStateStore();
  const hasUnpublished = useHasUnpublishedChanges();
  const { currentProjectId, loadedTimeline } = useProjectStore();
  const base = useCompileStore((s) => s.calculatedMetadata?.props?.childrenData);
  const [diffModal, setDiffModal] = useState<{
    title: string;
    sections: DiffSection[];
    snapshotDiff?: { before: unknown; after: unknown };
  } | null>(null);

  const reversed = useMemo(() => [...entries].reverse(), [entries]);

  const handleJumpTo = (origIdx: number) => {
    const snap = jumpTo(origIdx);
    if (snap) applyHistorySnapshot(snap);
  };

  const handlePublish = async () => {
    if (!currentProjectId || !loadedTimeline) return;
    const result = await publishLayerState(currentProjectId, loadedTimeline.id, base);
    if (result.ok) {
      toast.success("merged" in result ? "Merged teammate's changes & published" : "Published to team");
    } else if (result.reason === "nochange") {
      toast.info("Already up to date — nothing to publish");
    } else if (result.reason === "merge") {
      toast.info(`${result.conflicts} conflict(s) to resolve before publishing.`);
    } else if (result.reason === "conflict") {
      toast.error("Publish conflict — please try again.", { duration: 6000 });
    } else {
      toast.error(result.message ?? "Failed to publish");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-1.5 flex items-center justify-between gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">
          {entries.length === 0 ? "No changes" : `${entries.length} state${entries.length !== 1 ? "s" : ""} · #${cursor + 1}`}
        </span>
        <div className="flex items-center gap-0.5">
          {/* Publish current state to team */}
          <Button
            variant={hasUnpublished ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            disabled={!hasUnpublished || isPublishing || !currentProjectId || !loadedTimeline}
            onClick={handlePublish}
            title="Publish the current local state to the team"
          >
            {isPublishing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Publish
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            disabled={entries.length === 0} onClick={() => createCheckpoint()}
            title="Pin current state as a checkpoint">
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            disabled={publishedEntryIds.size === 0}
            onClick={() => clearPublishedHistory()}
            title="Clear published entries from this list (keeps unpublished work)">
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-400 hover:bg-red-500/10"
            disabled={!hasUnpublished}
            onClick={() => discardAllLocalLayerChanges()}
            title="Discard all unpublished local layer changes and restore the last published state">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            disabled={!canUndo()} onClick={() => undoLayerChange()} title="Undo (Ctrl+Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            disabled={!canRedo()} onClick={() => redoLayerChange()} title="Redo (Ctrl+Y)">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="px-3 py-1 border-b border-border/40 bg-muted/30 shrink-0">
          <p className="text-[10px] text-muted-foreground/60">
            Changes stay local until published.{" "}
            <button type="button" className="underline hover:text-muted-foreground"
              onClick={() => createCheckpoint()}>Pin state</button>{" "}
            to mark a checkpoint.{" "}
            {hasUnpublished && (
              <span className="text-amber-400/70">Unpublished changes — click Publish to push to team.</span>
            )}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">No layer changes yet.<br />Edit a layer to start tracking.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {reversed.map((entry, revIdx) => {
              const origIdx = entries.length - 1 - revIdx;
              const hasUnpublishedAfter = entries
                .slice(origIdx + 1)
                .some((e) => !publishedEntryIds.has(e.id));
              return (
                <EntryRow
                  key={entry.id}
                  id={entry.id}
                  timestamp={entry.timestamp}
                  description={entry.description}
                  changes={entry.changes as AnyChange[]}
                  clientId={entry.clientId}
                  selfClientId={clientId}
                  isCurrent={origIdx === cursor}
                  isFuture={origIdx > cursor}
                  isPinned={entry.timestamp === 0}
                  isUnpublished={!publishedEntryIds.has(entry.id)}
                  onClick={() => {
                    if (origIdx !== cursor) handleJumpTo(origIdx);
                  }}
                  canPreviewRevert
                  onPreviewStart={() => startLayerPreview(entry.snapshot)}
                  onPreviewEnd={() => endLayerPreview()}
                  onRevert={() =>
                    revertToHistorySnapshot(entry.snapshot, `Reverted to "${entry.description}"`)
                  }
                  canReset={hasUnpublishedAfter}
                  onReset={() => resetToLayerHistoryEntry(entry.id, entry.snapshot)}
                  onViewDiff={() => setDiffModal({
                    title: entry.description,
                    sections: buildLayerDiffSections(entry.changes as AnyChange[]),
                    snapshotDiff: {
                      before: origIdx > 0 ? entries[origIdx - 1]?.snapshot : (baselineSnapshot ?? undefined),
                      after: entry.snapshot,
                    },
                  })}
                />
              );
            })}
          </div>
        )}
      </div>
      {diffModal && (
        <DiffViewModal
          open
          title={diffModal.title}
          sections={diffModal.sections}
          snapshotDiff={diffModal.snapshotDiff}
          onClose={() => setDiffModal(null)}
        />
      )}
    </div>
  );
}

// ─── Team / Global history tab ────────────────────────────────────────────────

function TeamHistoryTab() {
  const {
    dbHistory, isLoadingDbHistory, loadDbHistory,
    dbHistoryHasMore, loadMoreDbHistory,
    globalState, isComputingGlobalState, computeGlobalState,
    clientId: selfClientId,
  } = useLayerHistoryStore();
  const { revertToTeamBase, startLayerPreview, endLayerPreview, revertToHistorySnapshot } =
    useLayerStateStore();
  const { currentProjectId, loadedTimeline } = useProjectStore();
  const calculatedMetadata = useCompileStore(s => s.calculatedMetadata);
  const [isReverting, setIsReverting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [diffModal, setDiffModal] = useState<{
    title: string;
    sections: DiffSection[];
    snapshotDiff?: { before: unknown; after: unknown };
  } | null>(null);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try { await loadMoreDbHistory(); } finally { setIsLoadingMore(false); }
  };

  const base = calculatedMetadata?.props?.childrenData ?? [];

  // Pre-sort team entries (newest first) and pair each with its predecessor's snapshot
  const teamLayerDiffs = useMemo(() => {
    const sorted = [...dbHistory].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.map((entry, si) => ({
      entry,
      prevSnapshot: sorted[si + 1]?.snapshot ?? null,
    }));
  }, [dbHistory]);

  const handleComputeGlobal = () => computeGlobalState(base);

  const handleRevertToTeamBase = async () => {
    if (!currentProjectId || !loadedTimeline) return;
    setIsReverting(true);
    try {
      await revertToTeamBase(currentProjectId, loadedTimeline.id);
      toast.success("Reverted to team base");
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Global state controls */}
      <div className="border-b px-3 py-2 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            Team base
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2"
              disabled={isComputingGlobalState} onClick={handleComputeGlobal}
              title="Preview the merge of all published team operations and show conflicts, without changing local state">
              {isComputingGlobalState
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3" />}
              Preview
            </Button>
            <Button
              variant="default" size="sm" className="h-7 text-[10px] gap-1 px-2"
              disabled={isReverting || !currentProjectId || !loadedTimeline}
              onClick={handleRevertToTeamBase}
              title="Discard unpublished local edits and load the last published team state. Undoable (Ctrl+Z).">
              {isReverting
                ? <RefreshCw className="h-3 w-3 animate-spin" />
                : <Download className="h-3 w-3" />}
              Revert to team base
            </Button>
          </div>
        </div>

        {globalState && (
          <div className="space-y-1">
            {globalState.conflicts.length === 0 ? (
              <p className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                No conflicts · clean merge
              </p>
            ) : (
              <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {globalState.conflicts.length} conflict{globalState.conflicts.length !== 1 ? "s" : ""} — later timestamp wins
              </p>
            )}
          </div>
        )}
      </div>

      {/* Conflict list */}
      {globalState && globalState.conflicts.length > 0 && (
        <div className="border-b pb-2 shrink-0 max-h-40 overflow-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Conflicts</p>
          {globalState.conflicts.map((c, i) => (
            <ConflictCard key={i} conflict={c} />
          ))}
        </div>
      )}

      {/* DB history entries header */}
      <div className="px-3 py-1.5 border-b bg-muted/20 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
          DB entries ({dbHistory.length})
        </span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
          disabled={isLoadingDbHistory} onClick={loadDbHistory}>
          <RefreshCw className={cn("h-3 w-3", isLoadingDbHistory && "animate-spin")} />
        </Button>
      </div>

      {/* DB entry list */}
      <div className="flex-1 overflow-auto">
        {isLoadingDbHistory ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : dbHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">
              No team history yet.<br />
              Publish local changes to see them here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {teamLayerDiffs.map(({ entry, prevSnapshot }) => (
              <EntryRow
                key={entry.entryId}
                id={entry.entryId}
                timestamp={entry.timestamp}
                description={entry.description}
                changes={entry.changes as AnyChange[]}
                clientId={entry.clientId}
                selfClientId={selfClientId}
                onClick={() => {}}
                canPreviewRevert={!!entry.snapshot}
                onPreviewStart={() => entry.snapshot && startLayerPreview(entry.snapshot)}
                onPreviewEnd={() => endLayerPreview()}
                onRevert={() =>
                  entry.snapshot &&
                  revertToHistorySnapshot(entry.snapshot, `Reverted to team state by ${entry.clientId.slice(-6)}`)
                }
                onViewDiff={() => setDiffModal({
                  title: entry.description,
                  sections: buildLayerDiffSections(entry.changes as AnyChange[]),
                  snapshotDiff: entry.snapshot
                    ? { before: prevSnapshot, after: entry.snapshot }
                    : undefined,
                })}
              />
            ))}
            {dbHistoryHasMore && (
              <button
                type="button"
                className="w-full py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/40 flex items-center justify-center gap-1 transition-colors border-t border-border/40"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
              >
                {isLoadingMore
                  ? <><RefreshCw className="h-3 w-3 animate-spin" /> Loading…</>
                  : <><ChevronDown className="h-3 w-3" /> Load more</>}
              </button>
            )}
          </div>
        )}
      </div>
      {diffModal && (
        <DiffViewModal
          open
          title={diffModal.title}
          sections={diffModal.sections}
          snapshotDiff={diffModal.snapshotDiff}
          onClose={() => setDiffModal(null)}
        />
      )}
    </div>
  );
}

// ─── Root panel ───────────────────────────────────────────────────────────────

type Tab = "local" | "team";

export function LayerHistoryPanel() {
  const [tab, setTab] = useState<Tab>("local");
  const { entries, dbHistory } = useLayerHistoryStore();
  const hasUnpublished = useHasUnpublishedChanges();
  const isPreviewActive = useLayerStateStore((s) => s.isLayerPreviewActive);
  const endLayerPreview = useLayerStateStore((s) => s.endLayerPreview);

  // Safety: always restore the real state if the panel unmounts mid-preview.
  useEffect(() => () => endLayerPreview(), [endLayerPreview]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {isPreviewActive && (
        <div className="shrink-0 bg-violet-500/15 text-violet-300 text-[10px] px-3 py-1 flex items-center gap-1.5 border-b border-violet-500/30">
          <Eye className="h-3 w-3" /> Previewing a past state — release to return to your current state.
        </div>
      )}
      {/* Tab bar */}
      <div className="flex items-center border-b shrink-0">
        <button
          type="button" onClick={() => setTab("local")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors",
            tab === "local" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Monitor className="h-3.5 w-3.5" />
          Local
          {entries.length > 0 && (
            <span className="ml-0.5 rounded-full bg-primary/20 text-primary px-1 text-[9px] font-bold">
              {entries.length}
            </span>
          )}
          {hasUnpublished && (
            <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" title="Unpublished changes" />
          )}
        </button>

        <button
          type="button" onClick={() => setTab("team")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors",
            tab === "team" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Team
          {dbHistory.length > 0 && (
            <span className="ml-0.5 rounded-full bg-muted text-muted-foreground px-1 text-[9px] font-bold">
              {dbHistory.length}
            </span>
          )}
        </button>
      </div>

      {tab === "local" ? <LocalHistoryTab /> : <TeamHistoryTab />}
    </div>
  );
}
