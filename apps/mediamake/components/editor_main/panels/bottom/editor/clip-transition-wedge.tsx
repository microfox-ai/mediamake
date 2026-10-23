"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  catalogForTarget,
  createClipTransition,
  createClipTransitionPair,
  longestOnEdge,
  MIN_TRANSITION_SEC,
  transitionsOnEdge,
  type ClipTransition,
  type TransitionEdge,
  type TransitionTarget,
} from "@microfox/remotion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function stop(event: { stopPropagation: () => void; preventDefault?: () => void }) {
  event.stopPropagation();
  event.preventDefault?.();
}

function EdgeWedge({
  edge,
  transitions,
  durationSec,
  pixelsPerSecond,
  selectedId,
  disabled,
  onSelect,
  onDuration,
}: {
  edge: TransitionEdge;
  transitions: ClipTransition[];
  durationSec: number;
  pixelsPerSecond: number;
  selectedId?: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onDuration: (id: string, seconds: number) => void;
}) {
  const onEdge = transitionsOnEdge(transitions, edge);
  const lead = longestOnEdge(transitions, edge);
  const dragRef = useRef<{
    id: string;
    startClientX: number;
    orig: number;
    seconds: number;
  } | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  if (!lead || !(lead.duration > 0)) return null;

  const seconds = Math.min(
    durationSec > 0 ? durationSec : lead.duration,
    preview ?? lead.duration,
  );
  const width = Math.max(8, seconds * pixelsPerSecond);
  const selected = onEdge.some((transition) => transition.id === selectedId);

  const startDrag = (event: React.PointerEvent) => {
    if (disabled) return;
    stop(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: lead.id,
      startClientX: event.clientX,
      orig: seconds,
      seconds,
    };
  };

  const moveDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.startClientX) / Math.max(pixelsPerSecond, 1);
    const signed = edge === "in" ? delta : -delta;
    const cap = durationSec > 0 ? durationSec : drag.orig + 30;
    const next = Math.min(cap, Math.max(MIN_TRANSITION_SEC, drag.orig + signed));
    drag.seconds = next;
    setPreview(next);
  };

  const endDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPreview(null);
    if (Math.abs(drag.seconds - drag.orig) < 0.01) return;
    onDuration(drag.id, Math.round(drag.seconds * 100) / 100);
  };

  return (
    <div
      className="absolute inset-y-0 z-10 pointer-events-auto"
      style={edge === "in" ? { left: 0, width } : { right: 0, width }}
    >
      <button
        type="button"
        title={`${edge === "in" ? "In" : "Out"} ${seconds.toFixed(2)}s`}
        className={cn(
          "absolute inset-0",
          selected ? "opacity-100" : "opacity-80 hover:opacity-100",
        )}
        style={{
          background:
            edge === "in"
              ? "linear-gradient(to right, rgba(255,255,255,0.72), rgba(255,255,255,0.08))"
              : "linear-gradient(to left, rgba(255,255,255,0.72), rgba(255,255,255,0.08))",
          clipPath:
            edge === "in"
              ? "polygon(0 0, 100% 0, 0 100%)"
              : "polygon(100% 0, 100% 100%, 0 0)",
        }}
        onPointerDown={(event) => stop(event)}
        onClick={(event) => {
          stop(event);
          onSelect(lead.id);
        }}
      />
      {onEdge
        .filter((transition) => transition.id !== lead.id && transition.duration > 0)
        .map((transition) => (
          <span
            key={transition.id}
            className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
            style={
              edge === "in"
                ? { left: Math.max(0, transition.duration * pixelsPerSecond) }
                : { right: Math.max(0, transition.duration * pixelsPerSecond) }
            }
          />
        ))}
      {onEdge.length > 1 ? (
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 z-[1] rounded-sm bg-black/70 px-1 text-[8px] leading-3 text-white",
            edge === "in" ? "left-0.5" : "right-0.5",
          )}
        >
          {onEdge.length}
        </span>
      ) : null}
      {!disabled ? (
        <div
          className={cn(
            "absolute inset-y-0 z-20 w-1.5 cursor-ew-resize bg-white/0 hover:bg-white/50",
            edge === "in" ? "right-0" : "left-0",
          )}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
        />
      ) : null}
    </div>
  );
}

function AddTransitionButton({
  edge,
  target,
  disabled,
  onAdd,
}: {
  edge: TransitionEdge;
  target: TransitionTarget;
  disabled?: boolean;
  onAdd: (created: ClipTransition[]) => void;
}) {
  const entries = catalogForTarget(target);
  if (entries.length === 0 || disabled) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={edge === "in" ? "Add transition in" : "Add transition out"}
          className={cn(
            "absolute top-1/2 z-30 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-sm bg-background/90 text-foreground opacity-0 shadow-sm pointer-events-none hover:bg-primary hover:text-primary-foreground group-hover/clip:pointer-events-auto group-hover/clip:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:opacity-100",
            edge === "in" ? "left-1" : "right-1",
          )}
          onPointerDown={(event) => stop(event)}
          onClick={(event) => stop(event)}
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={edge === "in" ? "start" : "end"} className="min-w-36">
        {entries.map((entry) => (
          <DropdownMenuItem
            key={`${entry.channel}-${entry.id}`}
            onSelect={() => onAdd([createClipTransition(entry.id, edge, target)])}
          >
            {entry.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {entries.map((entry) => (
          <DropdownMenuItem
            key={`both-${entry.channel}-${entry.id}`}
            onSelect={() => onAdd(createClipTransitionPair(entry.id, target))}
          >
            {entry.label} · both ends
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ClipTransitionWedges({
  transitions,
  durationSec,
  pixelsPerSecond,
  selectedId,
  target,
  disabled,
  onSelect,
  onDuration,
  onAdd,
}: {
  transitions: ClipTransition[];
  durationSec: number;
  pixelsPerSecond: number;
  selectedId?: string | null;
  target: TransitionTarget | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onDuration: (id: string, seconds: number) => void;
  onAdd: (created: ClipTransition[]) => void;
}) {
  if (!target && transitions.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <EdgeWedge
        edge="in"
        transitions={transitions}
        durationSec={durationSec}
        pixelsPerSecond={pixelsPerSecond}
        selectedId={selectedId}
        disabled={disabled}
        onSelect={onSelect}
        onDuration={onDuration}
      />
      <EdgeWedge
        edge="out"
        transitions={transitions}
        durationSec={durationSec}
        pixelsPerSecond={pixelsPerSecond}
        selectedId={selectedId}
        disabled={disabled}
        onSelect={onSelect}
        onDuration={onDuration}
      />
      {target ? (
        <>
          <AddTransitionButton edge="in" target={target} disabled={disabled} onAdd={onAdd} />
          <AddTransitionButton edge="out" target={target} disabled={disabled} onAdd={onAdd} />
        </>
      ) : null}
    </div>
  );
}
