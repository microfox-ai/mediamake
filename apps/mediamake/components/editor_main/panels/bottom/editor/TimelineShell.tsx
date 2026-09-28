"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ZoomIn, ZoomOut, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  AudioWaveformTracks,
  AudioWaveformTrackLabels,
} from "./AudioWaveformTracks";
import type { TimelineAudioClip } from "@/components/editor/presets/actions/engine/find-audio-media";
import {
  LABEL_WIDTH,
  ROW_HEIGHT,
  RULER_HEIGHT,
  formatTimeLabel,
} from "./timeline-layout";
import {
  TimelineViewportProvider,
  useTimelineViewport,
} from "./timeline-viewport";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { usePlayerRefStore } from "../../../stores/player-ref-store";
import { useCompileStore } from "../../../stores/compile-store";
import { isEditableKeyboardTarget } from "../../../stores/block-clipboard-store";
import { isEditorFocusScope } from "../../../stores/editor-focus-scope";

// ─── Row registry (external store — avoids render loops) ──────────────────────

export interface TimelineTrackRow {
  id: string;
  label: ReactNode;
  track: ReactNode;
}

export interface TimelineTrackSectionData {
  id: string;
  order: number;
  header?: { label: ReactNode; track?: ReactNode };
  rows: TimelineTrackRow[];
  /** Optional chrome tools (snap/delete/etc.) when this section has an active selection. */
  tools?: ReactNode;
}

type Listener = () => void;

function createSectionStore() {
  let sections = new Map<string, TimelineTrackSectionData>();
  let snapshot: TimelineTrackSectionData[] = [];
  const listeners = new Set<Listener>();

  const rebuildSnapshot = () => {
    snapshot = Array.from(sections.values()).sort((a, b) => a.order - b.order);
  };

  return {
    setSection(section: TimelineTrackSectionData) {
      sections.set(section.id, section);
      rebuildSnapshot();
      listeners.forEach((l) => l());
    },
    removeSection(id: string) {
      if (!sections.has(id)) return;
      sections.delete(id);
      rebuildSnapshot();
      listeners.forEach((l) => l());
    },
    getSnapshot(): TimelineTrackSectionData[] {
      return snapshot;
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

type SectionStore = ReturnType<typeof createSectionStore>;

const SectionStoreContext = createContext<SectionStore | null>(null);

/** Sections call this to publish their label/track rows into the shared shell. */
export function useRegisterTimelineSection(section: TimelineTrackSectionData) {
  const store = useContext(SectionStoreContext);
  const sectionRef = useRef(section);
  sectionRef.current = section;

  useLayoutEffect(() => {
    if (!store) return;
    store.setSection(sectionRef.current);
  });

  useLayoutEffect(() => {
    if (!store) return;
    const id = section.id;
    return () => store.removeSection(id);
  }, [store, section.id]);
}

function useRegisteredSections(): TimelineTrackSectionData[] {
  const store = useContext(SectionStoreContext);
  const emptySubscribe = useCallback((onStoreChange: () => void) => {
    void onStoreChange;
    return () => {};
  }, []);
  const getEmpty = useCallback((): TimelineTrackSectionData[] => [], []);

  return useSyncExternalStore(
    store ? store.subscribe : emptySubscribe,
    store ? store.getSnapshot : getEmpty,
    store ? store.getSnapshot : getEmpty,
  );
}

// ─── Shell chrome ─────────────────────────────────────────────────────────────

function TimelineShellChrome({
  title,
  subtitle,
  tools,
  audioClips,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  tools?: ReactNode;
  audioClips: TimelineAudioClip[];
  emptyMessage?: string;
}) {
  const {
    totalDuration,
    totalWidth,
    secToPx,
    pixelsPerSecond,
    setPixelsPerSecond,
    ppsToSlider,
    sliderToPps,
    fitToView,
    zoomByFactor,
    handleWheel,
    trackRightRef,
    scrollRef,
    labelScrollRef,
    rulerInnerRef,
    onScroll,
    rulerTicks,
  } = useTimelineViewport();

  const orderedSections = useRegisteredSections();
  const sectionTools = orderedSections
    .map((s) => s.tools)
    .filter(Boolean) as ReactNode[];

  const fps = useCompileStore((s) => s.calculatedMetadata?.fps ?? 30);
  const currentFrame = useLayerStateStore((s) => s.currentFrame);
  const setCurrentFrame = useLayerStateStore((s) => s.setCurrentFrame);
  const playerRef = usePlayerRefStore((s) => s.playerRef);
  const currentTimeSec = currentFrame / fps;
  const playheadPx = secToPx(currentTimeSec);

  const hasRows =
    orderedSections.some((s) => s.rows.length > 0) || audioClips.length > 0;

  const pixelsPerSecondRef = useRef(pixelsPerSecond);
  const currentTimeSecRef = useRef(currentTimeSec);
  useEffect(() => {
    pixelsPerSecondRef.current = pixelsPerSecond;
  }, [pixelsPerSecond]);
  useEffect(() => {
    currentTimeSecRef.current = currentTimeSec;
  }, [currentTimeSec]);

  /** Scroll so playhead sits at `anchor` fraction of the viewport (0.5 = center). */
  const scrollPlayheadTo = useCallback(
    (anchor: number) => {
      requestAnimationFrame(() => {
        const s = scrollRef.current;
        if (!s) return;
        const px = currentTimeSecRef.current * pixelsPerSecondRef.current;
        const target = Math.max(0, px - s.clientWidth * anchor);
        s.scrollLeft = target;
        onScroll();
      });
    },
    [scrollRef, onScroll],
  );

  const centerOnPlayhead = useCallback(() => {
    scrollPlayheadTo(0.5);
  }, [scrollPlayheadTo]);

  // Mount + zoom: keep playhead anchored in view
  useEffect(() => {
    scrollPlayheadTo(0.35);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    scrollPlayheadTo(0.35);
  }, [pixelsPerSecond, scrollPlayheadTo]);

  // While playing: lazily keep the playhead inside the visible viewport.
  // Only scrolls when it nears an edge — then shifts so it has room ahead
  // (no continuous centering).
  const prevFrameRef = useRef(currentFrame);
  useEffect(() => {
    if (currentFrame === prevFrameRef.current) return;
    prevFrameRef.current = currentFrame;

    const playing = playerRef.current?.isPlaying?.() ?? false;
    if (!playing) return;

    const s = scrollRef.current;
    if (!s) return;

    const px = secToPx(currentTimeSec);
    const viewW = s.clientWidth;
    const margin = Math.max(48, viewW * 0.08);
    const leftEdge = s.scrollLeft + margin;
    const rightEdge = s.scrollLeft + viewW - margin;

    if (px > rightEdge) {
      // Page forward: land playhead ~15% from the left so it has runway
      s.scrollLeft = Math.max(0, px - viewW * 0.15);
      onScroll();
    } else if (px < leftEdge) {
      // Scrubbed/rewound past left edge
      s.scrollLeft = Math.max(0, px - margin);
      onScroll();
    }
  }, [currentFrame, currentTimeSec, secToPx, scrollRef, onScroll, playerRef]);

  // Space = play/pause when bottom timeline panel is focused
  // ⌘/Ctrl + / − zoom the timeline (not the browser page)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isEditorFocusScope("bottom")) return;
      if (
        isEditableKeyboardTarget(e.target) ||
        isEditableKeyboardTarget(document.activeElement)
      ) {
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        // Ignore when a modifier is held (other shortcuts)
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        const player = playerRef.current;
        if (!player) return;
        if (player.isPlaying()) player.pause();
        else player.play();
        return;
      }

      if (!(e.metaKey || e.ctrlKey)) return;

      if (
        e.key === "+" ||
        e.key === "=" ||
        e.code === "Equal" ||
        e.code === "NumpadAdd"
      ) {
        e.preventDefault();
        zoomByFactor(1.3);
        return;
      }
      if (
        e.key === "-" ||
        e.key === "_" ||
        e.code === "Minus" ||
        e.code === "NumpadSubtract"
      ) {
        e.preventDefault();
        zoomByFactor(1 / 1.3);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomByFactor, playerRef]);

  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const sl = scrollRef.current?.scrollLeft ?? 0;
      const px = e.clientX - rect.left + sl;
      const sec = Math.max(0, Math.min(totalDuration, px / pixelsPerSecond));
      const frame = Math.round(sec * fps);
      setCurrentFrame(frame);
      playerRef.current?.seekTo(frame);
    },
    [scrollRef, totalDuration, pixelsPerSecond, fps, setCurrentFrame, playerRef],
  );

  return (
    <div
      className="flex flex-col h-full min-h-0 bg-background select-none"
      onWheel={handleWheel}
    >
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/10">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => playerRef.current?.play()}
          title="Play (Space)"
        >
          <Play className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => playerRef.current?.pause()}
          title="Pause (Space)"
        >
          <Pause className="h-3 w-3" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground min-w-[52px]">
          {formatTimeLabel(currentTimeSec)}
        </span>
        <span className="text-xs text-muted-foreground/40">/</span>
        <span className="text-xs font-mono text-muted-foreground/40">
          {formatTimeLabel(totalDuration)}
        </span>
        <div className="h-4 w-px bg-border mx-1" />
        <span
          className="text-xs text-muted-foreground truncate max-w-[220px]"
          title={title}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="text-[10px] text-muted-foreground/50 truncate">
            {subtitle}
          </span>
        ) : null}
        <div className="flex-1" />
        {tools}
        {sectionTools.length > 0 ? (
          <div className="flex items-center gap-0.5">{sectionTools}</div>
        ) : null}
        <div className="h-4 w-px bg-border mx-1" />
        <span className="text-[10px] text-muted-foreground/40 hidden sm:block">
          Ctrl+scroll to zoom
        </span>
        <div className="h-4 w-px bg-border mx-1" />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={fitToView}
          title="Fit full timeline in view (min zoom)"
        >
          Fit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={centerOnPlayhead}
          title="Scroll so the playhead is centered"
        >
          Center
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => zoomByFactor(1 / 1.3)}
          title="Zoom out (⌘−)"
        >
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[ppsToSlider(pixelsPerSecond)]}
          onValueChange={(v) => setPixelsPerSecond(sliderToPps(v[0] ?? 0))}
          className="w-24"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => zoomByFactor(1.3)}
          title="Zoom in (⌘+)"
        >
          <ZoomIn className="h-3 w-3" />
        </Button>
      </div>

      {!hasRows ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? "No tracks on this timeline yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div
            className="shrink-0 border-r border-border/60 flex flex-col bg-background"
            style={{ width: LABEL_WIDTH }}
          >
            <div
              className="shrink-0 border-b border-border/40 bg-muted/20"
              style={{ height: RULER_HEIGHT }}
            />
            <div className="flex-1 overflow-y-hidden" ref={labelScrollRef}>
              {orderedSections.map((section) => (
                <div key={section.id}>
                  {section.header ? (
                    <div
                      className="flex items-center px-2 border-b border-border/40 bg-muted/30"
                      style={{ height: 22 }}
                    >
                      <div className="flex-1 min-w-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                        {section.header.label}
                      </div>
                    </div>
                  ) : null}
                  {section.rows.map((row) => (
                    <div key={row.id}>{row.label}</div>
                  ))}
                </div>
              ))}
              <AudioWaveformTrackLabels
                clips={audioClips}
                rowHeight={ROW_HEIGHT}
              />
            </div>
          </div>

          <div className="flex flex-col flex-1 min-w-0" ref={trackRightRef}>
            <div
              className="shrink-0 overflow-hidden border-b border-border/40 bg-muted/20 cursor-pointer relative"
              style={{ height: RULER_HEIGHT }}
              onClick={handleRulerClick}
            >
              <div
                ref={rulerInnerRef}
                className="absolute top-0 left-0 bottom-0 will-change-transform"
                style={{ width: totalWidth, minWidth: "100%" }}
              >
                {rulerTicks.map(({ sec, major }) => (
                  <div
                    key={sec}
                    className="absolute top-0 bottom-0"
                    style={{ left: secToPx(sec) }}
                  >
                    <div
                      className={cn(
                        "w-px",
                        major
                          ? "h-3 bg-muted-foreground/50"
                          : "h-1.5 bg-muted-foreground/20",
                      )}
                    />
                    {major && (
                      <span className="absolute top-3 left-0.5 text-[9px] text-muted-foreground/60 whitespace-nowrap pointer-events-none">
                        {formatTimeLabel(sec)}
                      </span>
                    )}
                  </div>
                ))}
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10"
                  style={{ left: playheadPx }}
                >
                  <div
                    className="absolute -translate-x-1/2 top-0"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "8px solid hsl(var(--primary))",
                    }}
                  />
                  <div className="absolute top-2 -translate-x-px w-px h-4 bg-primary/70" />
                </div>
              </div>
            </div>

            <div
              className="flex-1 overflow-auto"
              ref={scrollRef}
              onScroll={onScroll}
            >
              <div
                className="relative"
                style={{ width: totalWidth, minWidth: "100%" }}
              >
                {orderedSections.map((section) => (
                  <div key={section.id}>
                    {section.header ? (
                      <div
                        className="border-b border-border/40 bg-muted/10"
                        style={{ height: 22 }}
                      >
                        {section.header.track}
                      </div>
                    ) : null}
                    {section.rows.map((row) => (
                      <div key={row.id}>{row.track}</div>
                    ))}
                  </div>
                ))}

                <AudioWaveformTracks
                  clips={audioClips}
                  secToPx={secToPx}
                  totalWidth={totalWidth}
                  rowHeight={ROW_HEIGHT}
                  renderLabels={false}
                />

                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/70 pointer-events-none z-20"
                  style={{ left: playheadPx }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelineShell({
  totalDuration,
  title,
  subtitle,
  tools,
  audioClips = [],
  emptyMessage,
  children,
}: {
  totalDuration: number;
  title: string;
  subtitle?: string;
  tools?: ReactNode;
  audioClips?: TimelineAudioClip[];
  emptyMessage?: string;
  /** Track source sections that register rows into the shell. */
  children: ReactNode;
}) {
  const storeRef = useRef<SectionStore | null>(null);
  if (!storeRef.current) storeRef.current = createSectionStore();

  return (
    <TimelineViewportProvider totalDuration={totalDuration}>
      <SectionStoreContext.Provider value={storeRef.current}>
        {/* Registrars — siblings of chrome so store updates don't remount them */}
        <div className="hidden" aria-hidden>
          {children}
        </div>
        <TimelineShellChrome
          title={title}
          subtitle={subtitle}
          tools={tools}
          audioClips={audioClips}
          emptyMessage={emptyMessage}
        />
      </SectionStoreContext.Provider>
    </TimelineViewportProvider>
  );
}
