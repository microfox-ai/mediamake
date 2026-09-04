"use client";

import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "../../../stores/project-store";
import { useTimelineRenderer } from "./useTimelineRenderer";
import { TimelinePlayer } from "./TimelinePlayer";
import { TimelineControlBar } from "./TimelineControlBar";
import { OutputJsonDialog } from "./OutputJsonDialog";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { useLayerHistoryStore } from "../../../stores/layer-history-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { usePlayerRefStore } from "../../../stores/player-ref-store";
import type { PlayerRef } from "@remotion/player";

const LAYER_STATE_STORAGE_PREFIX = "layer-state";

export function EditPatternContent() {
  const { loadedTimeline, currentProjectId, currentProject } = useProjectStore();
  // Viewers must never read from or write to the WIP cache — they always receive
  // the canonical server state so they see editor-published changes on every load.
  const isViewer = currentProject != null && !currentProject.isOwned && currentProject.sharedRole === "viewer";
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [loop, setLoop] = useState(true);
  const playerRef = useRef<PlayerRef | null>(null);
  const savedPlayerStateRef = useRef<{ frame: number; isPlaying: boolean } | null>(null);
  const previousCalculatedMetadataRef = useRef<any>(null);
  const { setSeekToFrame, loadLayerState, setStateVersion, getLayerStateSnapshot } =
    useLayerStateStore();
  const setMergeBaseSnapshot = useLayerStateStore((s) => s.setMergeBaseSnapshot);
  const { setContext, loadDbHistory } = useLayerHistoryStore();
  const hydrateLayerHistory = useLayerHistoryStore((s) => s.hydrateHistory);
  const setTimelineContext = useTimelineEditsStore((s) => s.setTimelineContext);
  const loadTimelineDbHistory = useTimelineEditsStore((s) => s.loadTimelineDbHistory);
  const setTimelinePublishedBaseline = useTimelineEditsStore((s) => s.setTimelinePublishedBaseline);
  const setTimelineVersion = useTimelineEditsStore((s) => s.setTimelineVersion);
  const setPlayerRef = usePlayerRefStore((s) => s.setPlayerRef);
  // Latest compiled base, captured for the WIP-save effect without re-subscribing
  const baseChildrenRef = useRef<any>(undefined);

  // Load layer state when timeline or project changes.
  // Local-first: team canonical is the baseline; unpublished local WIP (this
  // browser) is restored on top so reloads don't lose unpublished work.
  useEffect(() => {
    if (!loadedTimeline || !currentProjectId) {
      loadLayerState({ trackStates: {}, hiddenLayerIds: [], lockedLayerIds: [] });
      setContext(null, null);
      setTimelineContext(null);
      return;
    }
    const projectId = currentProjectId;
    const timelineId = loadedTimeline.id;
    setContext(projectId, timelineId);
    loadDbHistory();
    // Timeline parity: set context + load team audit history + publish baseline
    setTimelineContext(timelineId);
    loadTimelineDbHistory();
    setTimelinePublishedBaseline(timelineId, loadedTimeline);
    // Track the authoritative synced version so local edits/undo never cause a
    // false publish conflict.
    setTimelineVersion(timelineId, typeof loadedTimeline.version === "number" ? loadedTimeline.version : 0);
    let cancelled = false;
    const wipKey = `wip-${LAYER_STATE_STORAGE_PREFIX}-${projectId}-${timelineId}`;

    const readWip = () => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(wipKey);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data == null || typeof data !== "object") return null;
        return {
          childrenData: Array.isArray(data.childrenData) ? data.childrenData : undefined,
          ...(Array.isArray(data.overrides) ? { overrides: data.overrides } : {}),
          trackStates: data.trackStates && typeof data.trackStates === "object" ? data.trackStates : {},
          hiddenLayerIds: Array.isArray(data.hiddenLayerIds) ? data.hiddenLayerIds : [],
          lockedLayerIds: Array.isArray(data.lockedLayerIds) ? data.lockedLayerIds : [],
        };
      } catch {
        return null;
      }
    };

    (async () => {
      let canonical: any = null;
      try {
        const res = await fetch(
          `/api/project/timeline/layer-state?projectId=${encodeURIComponent(projectId)}&timelineId=${encodeURIComponent(timelineId)}`
        );
        if (cancelled) return;
        if (res.ok) canonical = await res.json();
      } catch {
        if (cancelled) return;
      }

      const canonicalSnapshot =
        canonical != null && typeof canonical === "object"
          ? {
              childrenData: Array.isArray(canonical.childrenData) ? canonical.childrenData : undefined,
              // Only forward overrides when present, so legacy baked docs are
              // detected (and left un-rebased) by loadLayerState.
              ...(Array.isArray(canonical.overrides) ? { overrides: canonical.overrides } : {}),
              trackStates: canonical.trackStates && typeof canonical.trackStates === "object" ? canonical.trackStates : {},
              hiddenLayerIds: Array.isArray(canonical.hiddenLayerIds) ? canonical.hiddenLayerIds : [],
              lockedLayerIds: Array.isArray(canonical.lockedLayerIds) ? canonical.lockedLayerIds : [],
            }
          : { trackStates: {} as Record<string, never>, hiddenLayerIds: [], lockedLayerIds: [] };

      if (cancelled) return;

      // Viewers never get stale WIP — they always see the canonical team state.
      // Also clear any WIP they might have stored before this logic was introduced.
      if (isViewer) {
        try { localStorage.removeItem(wipKey); } catch { /* ignore */ }
      }

      const wip = isViewer ? null : readWip();
      if (wip) {
        // Load canonical first to capture its published hash, then overlay WIP
        // and restore the published hash so "unpublished" is detected correctly.
        loadLayerState(canonicalSnapshot);
        const pubHash = useLayerHistoryStore.getState().publishedHash;
        loadLayerState(wip);
        useLayerHistoryStore.getState().setPublishedHash(pubHash);
      } else {
        loadLayerState(canonicalSnapshot);
      }
      // Always sync the version to THIS timeline's canonical (0 when never
      // published) so a previous timeline's version can't leak in and cause a
      // false publish conflict.
      setStateVersion(
        canonical != null && typeof canonical.version === "number" ? canonical.version : 0
      );

      // Record the team canonical as the 3-way-merge base for this session.
      setMergeBaseSnapshot(canonicalSnapshot as any);

      // Restore persisted local history (the state loading above resets it).
      // The working state was already restored from WIP, so the history's
      // current entry stays consistent with it.
      if (!cancelled) hydrateLayerHistory();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    loadedTimeline?.id,
    currentProjectId,
    isViewer,
    loadLayerState,
    setStateVersion,
    setContext,
    loadDbHistory,
    hydrateLayerHistory,
    setMergeBaseSnapshot,
    setTimelineContext,
    loadTimelineDbHistory,
    setTimelinePublishedBaseline,
    setTimelineVersion,
  ]);

  // Persist unpublished WIP to localStorage so a reload keeps local changes.
  // Cleared automatically once the working state matches the published team state.
  // Viewers never persist WIP — they always load the canonical team state on reload.
  useEffect(() => {
    if (!loadedTimeline || !currentProjectId) return;
    if (isViewer) return;
    const projectId = currentProjectId;
    const timelineId = loadedTimeline.id;
    const wipKey = `wip-${LAYER_STATE_STORAGE_PREFIX}-${projectId}-${timelineId}`;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const persist = () => {
      if (typeof window === "undefined") return;
      try {
        const dirty = useLayerHistoryStore.getState().hasUnpublishedChanges();
        if (!dirty) {
          localStorage.removeItem(wipKey);
          return;
        }
        const snap = getLayerStateSnapshot(baseChildrenRef.current);
        localStorage.setItem(wipKey, JSON.stringify(snap));
      } catch {
        // ignore quota / serialization errors
      }
    };

    // Save on each discrete history mutation (record / undo / redo / publish).
    const unsub = useLayerHistoryStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(persist, 400);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [loadedTimeline?.id, currentProjectId, isViewer, getLayerStateSnapshot]);

  // Share player ref with bottom panel and other consumers (Zustand store)
  useEffect(() => {
    setPlayerRef(playerRef);
    return () => setPlayerRef({ current: null });
  }, [setPlayerRef]);

  const {
    generatedOutput,
    calculatedMetadata,
    isGenerating,
    generationError,
  } = useTimelineRenderer(loadedTimeline);

  // Keep the latest compiled base available to the WIP-save effect
  useEffect(() => {
    baseChildrenRef.current = calculatedMetadata?.props?.childrenData;
  }, [calculatedMetadata]);

  // Register a seek callback so other panels (e.g. LayersTree) can jump the Player.
  useEffect(() => {
    setSeekToFrame((frame: number) => {
      playerRef.current?.seekTo(frame);
    });
    return () => {
      setSeekToFrame(() => {});
    };
  }, [setSeekToFrame]);


  // Preserve player position when output regenerates
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    // Save player state before metadata changes
    if (previousCalculatedMetadataRef.current && calculatedMetadata) {
      try {
        const currentFrame = current.getCurrentFrame();
        const isPlaying = current.isPlaying() ?? false;
        savedPlayerStateRef.current = { frame: currentFrame, isPlaying };
      } catch (error) {
        // Player might not be ready yet, ignore
      }
    }

    // Restore player state after new metadata is available
    if (calculatedMetadata && savedPlayerStateRef.current && !isGenerating) {
      // Use setTimeout to ensure player is ready
      const timeoutId = setTimeout(() => {
        try {
          const { current: player } = playerRef;
          if (!player || !savedPlayerStateRef.current) return;

          const { frame, isPlaying } = savedPlayerStateRef.current;

          // Restore frame position
          player.seekTo(frame);

          // Restore play state
          if (isPlaying) {
            player.play();
          } else {
            player.pause();
          }

          // Clear saved state after restoring
          savedPlayerStateRef.current = null;
        } catch (error) {
          // Player might not be ready yet, ignore
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // Update previous metadata reference
    previousCalculatedMetadataRef.current = calculatedMetadata;
  }, [calculatedMetadata, isGenerating]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Main Player Area */}
      <div className="flex-1 flex items-center justify-center">
        <TimelinePlayer
          ref={playerRef}
          loadedTimeline={loadedTimeline}
          generatedOutput={generatedOutput}
          calculatedMetadata={calculatedMetadata}
          isGenerating={isGenerating}
          generationError={generationError}
          loop={loop}
        />
      </div>

      {/* Bottom Control Bar */}
      <TimelineControlBar
        generatedOutput={generatedOutput}
        calculatedMetadata={calculatedMetadata}
        loop={loop}
        onLoopChange={setLoop}
        onShowJson={() => setShowOutputDialog(true)}
        isGenerating={isGenerating}
      />

      {/* Output JSON Dialog */}
      <OutputJsonDialog
        open={showOutputDialog}
        onOpenChange={setShowOutputDialog}
        generatedOutput={generatedOutput}
      />
    </div>
  );
}
