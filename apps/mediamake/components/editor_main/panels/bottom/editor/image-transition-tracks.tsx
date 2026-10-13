"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { MIN_SEG_PX } from "./timeline-layout";
import { parseArrayItemFieldPath } from "./preset-range-utils";

export const TRANSITION_ROW_HEIGHT = 18;
const DEFAULT_RANGE_SEC = 0.5;
const MIN_RANGE_SEC = 0.05;

export type TransitionEdge = "in" | "out";

export type ImageTransitionEffect = {
  id?: string;
  timing?: string;
  animation?: string;
  inRange?: number;
  outRange?: number;
};

export function imageItemPathFromRangePath(path: string | undefined): string | null {
  if (!path) return null;
  const field = parseArrayItemFieldPath(path);
  if (!field || field.fieldPath !== "rangeString") return null;
  return `${field.arrayPath}[${field.index}]`;
}

export function readTransitionEffects(item: unknown): ImageTransitionEffect[] {
  if (!item || typeof item !== "object") return [];
  const list = (item as { transitionEffects?: unknown }).transitionEffects;
  return Array.isArray(list) ? (list as ImageTransitionEffect[]) : [];
}

export function transitionEdgeFlags(effects: ImageTransitionEffect[]): {
  hasIn: boolean;
  hasOut: boolean;
} {
  let hasIn = false;
  let hasOut = false;
  for (const effect of effects) {
    const timing = effect.timing || "in&out";
    if (timing === "in" || timing === "in&out") hasIn = true;
    if (timing === "out" || timing === "in&out") hasOut = true;
  }
  return { hasIn, hasOut };
}

function secondsOf(effect: ImageTransitionEffect, edge: TransitionEdge): number {
  const raw = edge === "in" ? effect.inRange : effect.outRange;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0
    ? raw
    : DEFAULT_RANGE_SEC;
}

export function TransitionEdgeIcons({
  hasIn,
  hasOut,
  onToggle,
}: {
  hasIn: boolean;
  hasOut: boolean;
  onToggle: () => void;
}) {
  if (!hasIn && !hasOut) return null;
  const stop = (event: SyntheticEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  const button = (edge: TransitionEdge) => (
    <button
      type="button"
      title={edge === "in" ? "Edit in transition" : "Edit out transition"}
      className="absolute top-1/2 z-30 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-sm bg-background/85 text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
      style={edge === "in" ? { left: 2 } : { right: 2 }}
      onPointerDown={stop}
      onClick={(event) => {
        stop(event);
        if (event.detail > 1) return;
        onToggle();
      }}
      onDoubleClick={stop}
    >
      {edge === "in" ? (
        <LogIn className="h-2.5 w-2.5" />
      ) : (
        <LogOut className="h-2.5 w-2.5" />
      )}
    </button>
  );
  return (
    <>
      {hasIn ? button("in") : null}
      {hasOut ? button("out") : null}
    </>
  );
}

/**
 * One narrow lane under a selected image range.
 * In blocks are pinned to the image start; out blocks are pinned to the image end.
 */
export function TransitionRangeTrack({
  effect,
  imageStart,
  imageEnd,
  secToPx,
  pixelsPerSecond,
  onCommit,
}: {
  effect: ImageTransitionEffect;
  imageStart: number;
  imageEnd: number;
  secToPx: (sec: number) => number;
  pixelsPerSecond: number;
  onCommit: (edge: TransitionEdge, seconds: number) => void;
}) {
  const imageDur = Math.max(0, imageEnd - imageStart);
  const timing = effect.timing || "in&out";
  const showIn = timing === "in" || timing === "in&out";
  const showOut = (timing === "out" || timing === "in&out") && imageDur > 0;
  const [preview, setPreview] = useState<{
    edge: TransitionEdge;
    seconds: number;
  } | null>(null);
  const dragRef = useRef<{
    edge: TransitionEdge;
    startClientX: number;
    origSeconds: number;
    seconds: number;
  } | null>(null);

  const secondsFor = (edge: TransitionEdge) => {
    if (preview?.edge === edge) return preview.seconds;
    return Math.min(secondsOf(effect, edge), Math.max(imageDur, MIN_RANGE_SEC));
  };

  const startDrag = (
    event: React.PointerEvent,
    edge: TransitionEdge,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origSeconds = secondsFor(edge);
    dragRef.current = {
      edge,
      startClientX: event.clientX,
      origSeconds,
      seconds: origSeconds,
    };
  };

  const moveDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.startClientX) / Math.max(pixelsPerSecond, 1);
    const signed = drag.edge === "in" ? delta : -delta;
    const next = Math.min(
      Math.max(imageDur, MIN_RANGE_SEC),
      Math.max(MIN_RANGE_SEC, drag.origSeconds + signed),
    );
    drag.seconds = next;
    setPreview({ edge: drag.edge, seconds: next });
  };

  const endDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPreview(null);
    if (Math.abs(drag.seconds - drag.origSeconds) < 0.01) return;
    onCommit(drag.edge, Math.round(drag.seconds * 100) / 100);
  };

  const block = (edge: TransitionEdge) => {
    const seconds = secondsFor(edge);
    const start = edge === "in" ? imageStart : imageEnd - seconds;
    const left = secToPx(start);
    const width = Math.max(MIN_SEG_PX, secToPx(seconds));
    return (
      <div
        key={edge}
        className={cn(
          "absolute top-0.5 bottom-0.5 rounded-sm border cursor-ew-resize flex items-center",
          edge === "in"
            ? "border-amber-300/70 bg-amber-400/35 text-amber-100"
            : "border-sky-300/70 bg-sky-400/35 text-sky-100",
        )}
        style={{ left, width }}
        onPointerDown={(event) => startDrag(event, edge)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        title={`${edge} ${seconds.toFixed(2)}s`}
      >
        {width > 36 && (
          <span className="px-1 text-[8px] font-medium truncate pointer-events-none select-none">
            {edge} {seconds.toFixed(2)}s
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative border-b border-border/30 bg-muted/10"
      style={{ height: TRANSITION_ROW_HEIGHT }}
    >
      {showIn ? block("in") : null}
      {showOut ? block("out") : null}
    </div>
  );
}

export function TransitionLaneLabel({
  effect,
}: {
  effect: ImageTransitionEffect;
}) {
  const animation = effect.animation || "fade";
  const timing = effect.timing || "in&out";
  return (
    <div
      className="flex items-center gap-1 border-b border-border/30 bg-muted/20 pl-3 pr-1"
      style={{ height: TRANSITION_ROW_HEIGHT }}
    >
      <span className="text-[8px] text-muted-foreground/70 shrink-0">↳</span>
      <p className="text-[8px] truncate text-muted-foreground" title={`${animation} · ${timing}`}>
        {animation}
        <span className="text-muted-foreground/60"> · {timing}</span>
      </p>
    </div>
  );
}
