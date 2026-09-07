"use client";

import { useState, useMemo } from "react";
import {
  Undo2, Redo2, Clock, Upload, RefreshCw, Users, Monitor, Download, Film,
  ChevronRight, ChevronDown, Plus, Minus, Edit2, ArrowUpDown, Eye, Settings,
  RotateCcw, X, Eraser, Scissors, Trash2,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useProjectStore } from "../../../stores/project-store";
import type { Timeline } from "../../../stores/project-store";
import {
  summarizeTimelineDiff,
  formatDiffValue,
  shortenPath,
  type TimelineChangeDetail,
  type TimelineChangeType,
} from "@/lib/editor/diff-utils";
import { DiffViewModal, type DiffSection } from "../../../dialogs/DiffViewModal";

function buildTimelineDiffSections(details: TimelineChangeDetail[]): DiffSection[] {
  return details.map((d) => {
    const title = `${d.label} · ${d.type}`;
    if (d.fieldDiffs.length === 0) return { title, before: null, after: null };
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const fd of d.fieldDiffs) { before[fd.path] = fd.before; after[fd.path] = fd.after; }
    return { title, before, after };
  });
}

const TCHANGE_ICON: Record<TimelineChangeType, React.ReactNode> = {
  "preset-added": <Plus className="h-3 w-3" />,
  "preset-removed": <Minus className="h-3 w-3" />,
  "preset-modified": <Edit2 className="h-3 w-3" />,
  "preset-renamed": <Edit2 className="h-3 w-3" />,
  "preset-enabled": <Eye className="h-3 w-3" />,
  "preset-disabled": <Eye className="h-3 w-3" />,
  "preset-reordered": <ArrowUpDown className="h-3 w-3" />,
  config: <Settings className="h-3 w-3" />,
  defaultData: <Settings className="h-3 w-3" />,
  meta: <Film className="h-3 w-3" />,
};

const TCHANGE_COLOR: Record<TimelineChangeType, string> = {
  "preset-added": "text-emerald-400 bg-emerald-400/15",
  "preset-removed": "text-red-400 bg-red-400/15",
  "preset-modified": "text-blue-400 bg-blue-400/15",
  "preset-renamed": "text-blue-400 bg-blue-400/15",
  "preset-enabled": "text-violet-400 bg-violet-400/15",
  "preset-disabled": "text-violet-400 bg-violet-400/15",
  "preset-reordered": "text-amber-400 bg-amber-400/15",
  config: "text-orange-400 bg-orange-400/15",
  defaultData: "text-orange-400 bg-orange-400/15",
  meta: "text-muted-foreground bg-muted",
};

/** Renders one detailed timeline change (preset/config) with its field diffs. */
function TimelineChangeRow({ detail }: { detail: TimelineChangeDetail }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className={cn("flex h-4 w-4 items-center justify-center rounded text-[9px]", TCHANGE_COLOR[detail.type])}>
          {TCHANGE_ICON[detail.type]}
        </span>
        <span className="text-[11px] font-medium text-foreground/80 truncate">{detail.label}</span>
        <span className="font-mono text-[9px] text-muted-foreground/50">{detail.type}</span>
      </div>
      {detail.fieldDiffs.length > 0 && (
        <div className="pl-5 space-y-0.5">
          {detail.fieldDiffs.map((d, i) => (
            <div key={i} className="font-mono text-[10px] leading-relaxed text-muted-foreground/70 break-all">
              <span className="text-foreground/80">{shortenPath(d.path)}: </span>
              <span className="text-red-400/70">{formatDiffValue(d.before)}</span>
              {" → "}
              <span className="text-emerald-400/70">{formatDiffValue(d.after)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** One local-history entry, showing the detailed diff vs the previous snapshot. */
function TimelineActions({
  onPreview, onRevert, onReset, onViewDiff,
}: {
  onPreview: () => void;
  onRevert: () => void;
  onReset?: () => void;
  onViewDiff?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 pt-1 flex-wrap opacity-60 group-hover:opacity-100 transition-opacity">
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
      <button
        type="button"
        className="flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-accent"
        title="Preview this timeline in the player (re-renders). Click 'Exit preview' to return."
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
      >
        <Eye className="h-3 w-3" /> Preview
      </button>
      <button
        type="button"
        className="flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-accent"
        title="Revert to this timeline — keeps later changes (adds a new entry)"
        onClick={(e) => { e.stopPropagation(); onRevert(); }}
      >
        <RotateCcw className="h-3 w-3" /> Revert here
      </button>
      {onReset && (
        <button
          type="button"
          className="flex items-center gap-1 rounded border border-red-500/40 px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
          title="Reset to this state — removes all unpublished local changes after this point"
          onClick={(e) => { e.stopPropagation(); onReset(); }}
        >
          <Scissors className="h-3 w-3" /> Reset to this state
        </button>
      )}
    </div>
  );
}

function TimelineLocalEntry({
  entry, prevTimeline, isCurrent, isFuture, onPreview, onRevert, onReset, onViewDiff,
}: {
  entry: { index: number; timestamp: number; timeline: Timeline };
  prevTimeline: Timeline | null;
  isCurrent: boolean;
  isFuture: boolean;
  onPreview: () => void;
  onRevert: () => void;
  onReset?: () => void;
  onViewDiff?: (sections: DiffSection[]) => void;
}) {
  const details = useMemo(
    () => summarizeTimelineDiff(prevTimeline, entry.timeline),
    [prevTimeline, entry.timeline]
  );
  const headline =
    details.length > 0
      ? `${details.length} change${details.length !== 1 ? "s" : ""}`
      : entry.timeline.displayName || "Timeline edit";

  return (
    <div
      className={cn(
        "border-b border-border/40 px-3 py-2 group hover:bg-accent/40 transition-colors",
        isCurrent && "bg-primary/10 border-l-2 border-l-primary",
        isFuture && "opacity-50"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-400/15 text-blue-400">
          <Film className="h-3 w-3" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 justify-between">
            <span className={cn("text-xs font-medium truncate", isCurrent ? "text-foreground" : "text-foreground/70")}>
              {headline}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(entry.timestamp)}</span>
          </div>
          {details.length > 0 && (
            <div className="text-[10px] text-muted-foreground/70 truncate">{details[0].summary}</div>
          )}
          <TimelineActions
            onPreview={onPreview}
            onRevert={onRevert}
            onReset={onReset}
            onViewDiff={details.length > 0 ? () => onViewDiff?.(buildTimelineDiffSections(details)) : undefined}
          />
        </div>
        {isCurrent && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
      </div>
    </div>
  );
}

function formatRelativeTime(ts: number): string {
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

type Tab = "local" | "team";

export function TimelineHistoryPanel() {
  const {
    history, historyIndex, canUndo, canRedo, undo, redo,
    isDirty: storeIsDirty, isPublishing, dbHistory, isLoadingDbHistory, loadTimelineDbHistory,
    dbHistoryHasMore, loadMoreTimelineDbHistory,
    publishTimeline, revertTimelineToTeamBase, clientId, loadBaselineById,
    startTimelinePreview, endTimelinePreview, revertToTimelineState, isTimelinePreviewActive,
    clearPublishedHistory, resetToTimelineEntry, discardAllLocalTimelineChanges,
  } = useTimelineEditsStore();
  const isDirty =
    storeIsDirty ||
    (historyIndex >= 0 &&
      history.some((entry, index) => index <= historyIndex && !entry.published));
  const hasPublishedEntries = history.some((e) => e.published);
  const { loadedTimeline } = useProjectStore();
  const [tab, setTab] = useState<Tab>("local");
  const [isReverting, setIsReverting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [diffModal, setDiffModal] = useState<{
    title: string;
    sections: DiffSection[];
    snapshotDiff?: { before: unknown; after: unknown };
  } | null>(null);

  // Pre-compute diffs between consecutive team snapshots so the render is cheap.
  // DB history arrives newest-first; sortedDb[i+1] is the entry that preceded sortedDb[i].
  const teamEntryDiffs = useMemo(() => {
    const sorted = [...dbHistory].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.map((entry, si) => {
      const prevSnapshot = sorted[si + 1]?.snapshot ?? null;
      const details = summarizeTimelineDiff(prevSnapshot, entry.snapshot ?? null);
      const sections = buildTimelineDiffSections(details);
      return { entry, prevSnapshot, sections };
    });
  }, [dbHistory]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try { await loadMoreTimelineDbHistory(); } finally { setIsLoadingMore(false); }
  };

  // Always exit preview when the panel unmounts (e.g. switch back to the tree).
  useEffect(() => () => endTimelinePreview(), [endTimelinePreview]);

  const handlePublish = async () => {
    if (!loadedTimeline) return;
    const result = await publishTimeline(loadedTimeline.id);
    if (result.ok) {
      toast.success("merged" in result ? "Merged teammate's changes & published" : "Timeline published to team");
    } else if (result.reason === "nochange") {
      toast.info("Already up to date — nothing to publish");
    } else if (result.reason === "merge") {
      toast.info(`${result.conflicts} conflict(s) to resolve before publishing.`);
    } else if (result.reason === "conflict") {
      toast.error("Publish conflict — please try again.", { duration: 6000 });
    } else {
      toast.error(result.message ?? "Failed to publish timeline");
    }
  };

  const handleRevert = async () => {
    if (!loadedTimeline) return;
    setIsReverting(true);
    try {
      await revertTimelineToTeamBase(loadedTimeline.id);
      toast.success("Reverted to team base");
    } finally {
      setIsReverting(false);
    }
  };

  // History entries for the loaded timeline, newest first
  const localEntries = history
    .map((e, i) => ({ ...e, index: i }))
    .filter((e) => !loadedTimeline || e.timelineId === loadedTimeline.id);
  const reversed = [...localEntries].reverse();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {isTimelinePreviewActive && (
        <div className="shrink-0 bg-violet-500/15 text-violet-300 text-[10px] px-3 py-1 flex items-center justify-between gap-2 border-b border-violet-500/30">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3 w-3" /> Previewing a past timeline (re-rendered).
          </span>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-violet-400/40 px-1.5 py-0.5 hover:bg-violet-500/20"
            onClick={() => endTimelinePreview()}
          >
            <X className="h-3 w-3" /> Exit preview
          </button>
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
          {localEntries.length > 0 && (
            <span className="ml-0.5 rounded-full bg-primary/20 text-primary px-1 text-[9px] font-bold">
              {localEntries.length}
            </span>
          )}
          {isDirty && (
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

      {tab === "local" ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-background border-b px-3 py-1.5 flex items-center justify-between gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">
              {localEntries.length === 0 ? "No changes" : `${localEntries.length} state${localEntries.length !== 1 ? "s" : ""}`}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                variant={isDirty ? "default" : "ghost"} size="sm"
                className="h-7 gap-1 px-2 text-[10px]"
                disabled={!isDirty || isPublishing || !loadedTimeline}
                onClick={handlePublish}
                title="Publish the current timeline to the team"
              >
                {isPublishing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Publish
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                disabled={!hasPublishedEntries}
                onClick={() => clearPublishedHistory()}
                title="Clear published entries from this list (keeps unpublished work)">
                <Eraser className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-400 hover:bg-red-500/10"
                disabled={!isDirty || !loadedTimeline}
                onClick={() => loadedTimeline && discardAllLocalTimelineChanges(loadedTimeline.id)}
                title="Discard all unpublished local timeline changes and restore the last published state">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                disabled={!canUndo()} onClick={() => { undo(); }} title="Undo (Ctrl+Z)">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                disabled={!canRedo()} onClick={() => { redo(); }} title="Redo (Ctrl+Shift+Z)">
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {localEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">No timeline changes yet.<br />Edit a preset to start tracking.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {reversed.map((entry) => {
                  const idx = entry.index;
                  const prevEntry = idx > 0 ? history[idx - 1] : null;
                  const prevTimeline =
                    prevEntry && prevEntry.timelineId === entry.timelineId
                      ? prevEntry.timeline
                      : loadBaselineById.get(entry.timelineId) ?? null;
                  const hasUnpublishedAfter = history
                    .slice(idx + 1)
                    .some((e) => e.timelineId === entry.timelineId && !e.published);
                  return (
                    <TimelineLocalEntry
                      key={`${idx}-${entry.timestamp}`}
                      entry={entry}
                      prevTimeline={prevTimeline}
                      isCurrent={idx === historyIndex}
                      isFuture={idx > historyIndex}
                      onPreview={() => startTimelinePreview(entry.timeline)}
                      onRevert={() =>
                        revertToTimelineState(entry.timeline, `Reverted to earlier timeline`)
                      }
                      onReset={hasUnpublishedAfter && entry.id ? () =>
                        resetToTimelineEntry(entry.id!, entry.timeline)
                      : undefined}
                      onViewDiff={(sections) => setDiffModal({
                        title: `Timeline · ${formatRelativeTime(entry.timestamp)}`,
                        sections,
                        snapshotDiff: { before: prevTimeline, after: entry.timeline },
                      })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Team controls */}
          <div className="border-b px-3 py-2 flex items-center justify-between shrink-0">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Team base
            </span>
            <div className="flex items-center gap-1">
              <Button variant="default" size="sm" className="h-7 text-[10px] gap-1 px-2"
                disabled={isReverting || !loadedTimeline} onClick={handleRevert}
                title="Discard local timeline edits and load the last published team timeline. Undoable (Ctrl+Z).">
                {isReverting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Revert to team base
              </Button>
            </div>
          </div>

          <div className="px-3 py-1.5 border-b bg-muted/20 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              Publishes ({dbHistory.length})
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
              disabled={isLoadingDbHistory} onClick={loadTimelineDbHistory}>
              <RefreshCw className={cn("h-3 w-3", isLoadingDbHistory && "animate-spin")} />
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoadingDbHistory ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground/40" />
              </div>
            ) : dbHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">No team publishes yet.<br />Publish to see them here.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {teamEntryDiffs.map(({ entry, prevSnapshot, sections: entrySections }) => {
                  const isSelf = entry.clientId === clientId;
                  return (
                    <div key={entry.entryId} className="w-full text-left px-3 py-2 border-b border-border/40 group hover:bg-accent/40 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-400/15 text-blue-400">
                          <Upload className="h-3 w-3" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 justify-between">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-xs font-medium truncate text-foreground/70">
                                {entry.description || "Published timeline"}
                              </span>
                              <ClientBadge clientId={entry.clientId} isSelf={isSelf} />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatRelativeTime(entry.timestamp)}
                            </span>
                          </div>
                          {Array.isArray(entry.changes) && entry.changes.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {entry.changes.map((ch, ci) => (
                                <div key={ci} className="text-[10px] text-muted-foreground/70 break-all leading-relaxed">
                                  <span className="text-foreground/60">•</span> {ch.summary}
                                </div>
                              ))}
                            </div>
                          )}
                          {entry.snapshot && (
                            <TimelineActions
                              onPreview={() => startTimelinePreview(entry.snapshot!)}
                              onRevert={() =>
                                revertToTimelineState(
                                  entry.snapshot!,
                                  `Reverted to team state by ${entry.clientId.slice(-6)}`
                                )
                              }
                              onViewDiff={() => setDiffModal({
                                title: entry.description || "Published timeline",
                                sections: entrySections,
                                snapshotDiff: { before: prevSnapshot, after: entry.snapshot },
                              })}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        </div>
      )}
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
