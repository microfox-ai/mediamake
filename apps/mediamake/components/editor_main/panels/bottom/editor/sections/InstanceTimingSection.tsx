"use client";

import { useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import {
  findNode,
  loadInstanceTree,
  visibleRows,
} from "@/components/editor_main/timing/load-instance-tree";
import { resolveTiming } from "@/components/editor_main/timing/resolve-timing";
import type { AppliedNode, NodeTiming } from "@/components/editor_main/timing/types";
import { TRACK_COLORS } from "../timeline-layout";
import {
  useRegisterTimelineSection,
  type TimelineTrackRow,
} from "../TimelineShell";
import { useTimelineViewport } from "../timeline-viewport";

interface InstanceTimingSectionProps {
  timeline: Timeline;
  order: number;
}

type DragKind = "move" | "left" | "right";

function parentById(root: AppliedNode): Map<string, AppliedNode | null> {
  const map = new Map<string, AppliedNode | null>();
  const walk = (node: AppliedNode, parent: AppliedNode | null) => {
    map.set(node.id, parent);
    for (const child of node.children) walk(child, node);
  };
  walk(root, null);
  return map;
}

function scenesOf(root: AppliedNode): AppliedNode[] {
  const scenes: AppliedNode[] = [];
  const walk = (node: AppliedNode) => {
    if (node.role === "scene") scenes.push(node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return scenes;
}

/**
 * One row per scene and track. Locked spans cannot be dragged.
 * A drag writes parent-relative start and duration onto the instance.
 */
export function InstanceTimingSection({ timeline, order }: InstanceTimingSectionProps) {
  const { secToPx, pixelsPerSecond, totalWidth } = useTimelineViewport();
  const updateNodeTiming = useTimelineEditsStore((s) => s.updateNodeTiming);
  const reparentInstanceNode = useTimelineEditsStore((s) => s.reparentInstanceNode);
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const generateOutput = useCompileStore((s) => s.generateOutput);
  const fps = useCompileStore((s) => s.calculatedMetadata?.fps ?? 30);

  const tree = useMemo(() => loadInstanceTree(timeline), [timeline]);
  const resolved = useMemo(() => resolveTiming(tree), [tree]);
  const rows = useMemo(() => visibleRows(tree), [tree]);
  const parents = useMemo(() => parentById(tree), [tree]);
  const scenes = useMemo(() => scenesOf(tree), [tree]);

  const [preview, setPreview] = useState<
    Record<string, { start: number; duration: number }>
  >({});
  const dragRef = useRef<{
    id: string;
    kind: DragKind;
    originX: number;
    start: number;
    duration: number;
    parentAbsolute: number;
    next: { start: number; duration: number } | null;
  } | null>(null);

  const minDuration = 1 / Math.max(fps, 1);

  const commit = (id: string, timing: NodeTiming) => {
    updateNodeTiming(timeline.id, id, timing);
    const latest = getEditedTimeline(timeline.id) || timeline;
    generateOutput(latest);
  };

  const onPointerDown = (
    event: React.PointerEvent,
    id: string,
    kind: DragKind,
    start: number,
    duration: number,
    parentAbsolute: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      kind,
      originX: event.clientX,
      start,
      duration,
      parentAbsolute,
      next: null,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientX - drag.originX) / pixelsPerSecond;
    let start = drag.start;
    let duration = drag.duration;
    if (drag.kind === "move") {
      start = Math.max(0, drag.start + delta);
    } else if (drag.kind === "left") {
      const next = Math.max(0, Math.min(drag.start + drag.duration - minDuration, drag.start + delta));
      duration = drag.start + drag.duration - next;
      start = next;
    } else {
      duration = Math.max(minDuration, drag.duration + delta);
    }
    drag.next = { start, duration };
    setPreview((prev) => ({ ...prev, [drag.id]: { start, duration } }));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const next = drag.next;
    setPreview((prev) => {
      const copy = { ...prev };
      delete copy[drag.id];
      return copy;
    });
    if (!next) return;
    const node = findNode(tree, drag.id);
    if (!node) return;
    const parent = parents.get(drag.id);
    const relativeStart = Math.max(0, next.start - drag.parentAbsolute);
    if (node.timing.kind === "hug") {
      commit(drag.id, { kind: "hug", start: relativeStart });
      return;
    }
    if (parent?.arrangement === "sequence") {
      commit(drag.id, {
        kind: "explicit",
        start: 0,
        duration: next.duration,
      });
      return;
    }
    commit(drag.id, {
      kind: "explicit",
      start: relativeStart,
      duration: next.duration,
    });
  };

  const trackRows: TimelineTrackRow[] = rows.map(({ node, depth }, index) => {
    const span = resolved.nodes.get(node.id);
    const parent = parents.get(node.id) ?? null;
    const parentAbsolute =
      span?.parentAbsoluteStart ??
      (parent ? resolved.nodes.get(parent.id)?.absoluteStart : 0) ??
      0;
    const locked =
      node.timing.kind === "lock" || node.timing.kind === "durationLock";
    const hug = node.timing.kind === "hug";
    const sequenced = parent?.arrangement === "sequence";
    const shown =
      preview[node.id] ??
      (span
        ? { start: span.absoluteStart, duration: span.duration }
        : locked
          ? null
          : { start: parentAbsolute, duration: 2 });
    const color = TRACK_COLORS[index % TRACK_COLORS.length];
    const note = resolved.diagnostics.find((item) => item.nodeId === node.id);
    const canMove = !locked && !sequenced;
    const canTrimStart = !locked && !hug && !sequenced;
    const canTrimEnd = !locked && !hug;

    return {
      id: `instance:${node.id}`,
      label: (
        <div
          className="flex min-w-0 flex-col gap-1 pr-2"
          style={{ paddingLeft: depth * 10 }}
        >
          <div className="flex min-w-0 items-center gap-1">
            {locked ? <Lock className="size-3 shrink-0 text-muted-foreground" /> : null}
            <span className="truncate text-xs" title={note?.message}>
              {node.name}
            </span>
          </div>
          {node.id !== tree.id && scenes.length > 1 ? (
            <Select
              value={parent?.id ?? tree.id}
              onValueChange={(parentId) => {
                reparentInstanceNode(timeline.id, node.id, parentId);
                const latest = getEditedTimeline(timeline.id) || timeline;
                generateOutput(latest);
              }}
            >
              <SelectTrigger className="h-6 px-1.5 text-[10px]">
                <SelectValue placeholder="Scene" />
              </SelectTrigger>
              <SelectContent>
                {scenes
                  .filter(
                    (scene) =>
                      scene.id !== node.id && !findNode(node, scene.id),
                  )
                  .map((scene) => (
                    <SelectItem key={scene.id} value={scene.id}>
                      {scene.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      ),
      track: (
        <div
          className="relative h-full"
          style={{ width: totalWidth }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {shown ? (
            <div
              className={cn(
                "absolute top-1.5 bottom-1.5 flex items-center overflow-hidden rounded-md border px-1 text-[10px]",
                color,
                locked ? "cursor-default opacity-80" : "cursor-grab",
              )}
              style={{
                left: secToPx(shown.start),
                width: Math.max(4, secToPx(shown.duration)),
              }}
              title={
                locked
                  ? `Locked${node.timing.kind === "lock" || node.timing.kind === "durationLock" ? ` to ${node.timing.refId}` : ""}`
                  : note?.message
              }
              onPointerDown={
                canMove
                  ? (event) =>
                      onPointerDown(
                        event,
                        node.id,
                        "move",
                        shown.start,
                        shown.duration,
                        parentAbsolute,
                      )
                  : undefined
              }
            >
              {canTrimStart ? (
                <span
                  className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize"
                  onPointerDown={(event) =>
                    onPointerDown(
                      event,
                      node.id,
                      "left",
                      shown.start,
                      shown.duration,
                      parentAbsolute,
                    )
                  }
                />
              ) : null}
              <span className="truncate px-2">
                {locked ? "Locked" : hug ? "Hug" : node.role === "scene" ? "Scene" : "Track"}
              </span>
              {canTrimEnd ? (
                <span
                  className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize"
                  onPointerDown={(event) =>
                    onPointerDown(
                      event,
                      node.id,
                      "right",
                      shown.start,
                      shown.duration,
                      parentAbsolute,
                    )
                  }
                />
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-center px-2 text-[10px] text-muted-foreground">
              {note?.message ?? "No duration"}
            </div>
          )}
        </div>
      ),
    };
  });

  useRegisterTimelineSection({
    id: `instance-timing:${timeline.id}`,
    order,
    header: {
      label: <span className="text-xs font-medium">Scenes</span>,
    },
    rows: trackRows,
  });

  return null;
}
