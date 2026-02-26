"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CompositionLayout } from "@microfox/remotion";
import type { InputCompositionProps } from "@microfox/remotion";
import type { CalculatedBoundaries } from "@microfox/remotion";
import type { RenderableComponentData } from "@microfox/remotion";
import {
  flattenLayers,
  filterEditableLayers,
  isLayerActiveAtFrame,
  type FlatLayer,
} from "@/lib/editor/flatten-layers";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { SelectionOutline } from "./SelectionOutline";

function findNodeById(nodes: RenderableComponentData[] | undefined, id: string): RenderableComponentData | null {
  if (!nodes?.length) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.childrenData, id);
    if (found) return found;
  }
  return null;
}

export type EditableCompositionLayoutProps = InputCompositionProps & {
  selectedLayerIds: string[];
  /** Current playback frame (0-based) – only layers active at this frame are editable */
  currentFrame?: number;
  onSelectLayer?: (id: string, addToSelection: boolean) => void;
  onChangeLayerBounds?: (id: string, bounds: Partial<CalculatedBoundaries>) => void;
  /** When false, render a non-interactive composition (no selection / drag / resize). */
  editModeEnabled?: boolean;
};

/**
 * Wraps the composition with selection outlines and resize handles.
 * Renders inside the Remotion Player; uses useCurrentScale() in child components.
 */
export function EditableCompositionLayout(
  props: EditableCompositionLayoutProps
) {
  const {
    childrenData,
    style,
    config,
    selectedLayerIds = [],
    currentFrame = 0,
    onSelectLayer,
    onChangeLayerBounds,
    editModeEnabled = true,
  } = props;

  const { setOverride, hiddenLayerIds, lockedLayerIds } = useLayerStateStore();
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const dragStartBoundsRef = useRef<Record<string, { left: number; top: number }>>(
    {}
  );

  const fps = config?.fps ?? 30;
  const compWidth = config?.width ?? 1920;
  const compHeight = config?.height ?? 1080;

  const layers = useMemo(
    () =>
      filterEditableLayers(
        flattenLayers(childrenData, {
          fps,
          compositionWidth: compWidth,
          compositionHeight: compHeight,
        })
      ),
    [childrenData, fps, compWidth, compHeight]
  );

  // Only show outlines for layers active at current frame (like video editors / Figma)
  const activeLayers = useMemo(
    () =>
      layers.filter(
        (l) => isLayerActiveAtFrame(l, currentFrame) && !hiddenLayerIds.has(l.id)
      ),
    [layers, currentFrame, hiddenLayerIds]
  );

  // Sort by depth ascending so deepest layers are rendered last (on top) and receive clicks first
  const sortedLayers = useMemo(() => {
    const byDepth = [...activeLayers].sort((a, b) => a.depth - b.depth);
    const unselected = byDepth.filter(
      (l) => !selectedLayerIds.includes(l.id)
    );
    const selected = byDepth.filter((l) =>
      selectedLayerIds.includes(l.id)
    );
    return [...unselected, ...selected];
  }, [activeLayers, selectedLayerIds]);

  const handleSelect = useCallback(
    (id: string, addToSelection: boolean) => {
      onSelectLayer?.(id, addToSelection);
    },
    [onSelectLayer]
  );

  const handleDrag = useCallback(
    (id: string, deltaX: number, deltaY: number) => {
      if (lockedLayerIds.has(id)) return;
      setDraggingLayerId(id);
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;

      const multiSelect = selectedLayerIds.length > 1 && selectedLayerIds.includes(id);
      const idsToMove = multiSelect
        ? selectedLayerIds.filter((sid) => !lockedLayerIds.has(sid))
        : [id];

      for (const sid of idsToMove) {
        const l = layers.find((x) => x.id === sid);
        if (!l) continue;
        const start =
          dragStartBoundsRef.current[sid] ??
          (dragStartBoundsRef.current[sid] = {
            left: l.boundaries.left ?? 0,
            top: l.boundaries.top ?? 0,
          });
        const left = start.left + deltaX;
        const top = start.top + deltaY;
        setOverride(sid, {
          data: {
            boundaries: {
              ...l.boundaries,
              left,
              top,
            },
          },
        });
      }

      const movedIds = new Set(idsToMove);
      const descendantsToMove = layers.filter(
        (l) =>
          !movedIds.has(l.id) &&
          !lockedLayerIds.has(l.id) &&
          l.parentIds.some((pid) => movedIds.has(pid))
      );
      for (const desc of descendantsToMove) {
        setOverride(desc.id, {
          data: {
            boundaries: {
              ...desc.boundaries,
              left: (desc.boundaries.left ?? 0) + deltaX,
              top: (desc.boundaries.top ?? 0) + deltaY,
            },
          },
        });
      }
    },
    [layers, setOverride, lockedLayerIds, selectedLayerIds]
  );

  const handleResize = useCallback(
    (
      id: string,
      handle: string,
      deltaX: number,
      deltaY: number
    ) => {
      if (lockedLayerIds.has(id)) return;
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;

      const isLeft = handle === "top-left" || handle === "bottom-left";
      const isTop = handle === "top-left" || handle === "top-right";
      const dLeft = isLeft ? deltaX : 0;
      const dTop = isTop ? deltaY : 0;
      const dWidth = isLeft ? -deltaX : deltaX;
      const dHeight = isTop ? -deltaY : deltaY;

      const multiSelect = selectedLayerIds.length > 1 && selectedLayerIds.includes(id);
      const idsToResize = multiSelect
        ? selectedLayerIds.filter((sid) => !lockedLayerIds.has(sid))
        : [id];

      for (const sid of idsToResize) {
        const l = layers.find((x) => x.id === sid);
        if (!l) continue;
        let left = (l.boundaries.left ?? 0) + dLeft;
        let top = (l.boundaries.top ?? 0) + dTop;
        let width = Math.max(1, (l.boundaries.width ?? 100) + dWidth);
        let height = Math.max(1, (l.boundaries.height ?? 100) + dHeight);
        const boundaries = {
          ...l.boundaries,
          left,
          top,
          width,
          height,
        };
        const isTextAtom = l.componentId === "TextAtom";
        let dataUpdate: { boundaries: typeof boundaries; style?: Record<string, unknown> } = { boundaries };
        if (isTextAtom) {
          const node = findNodeById(childrenData, sid);
          const dataStyle = (node?.data as { style?: Record<string, unknown> })?.style ?? {};
          const currentFontSize = Number(dataStyle.fontSize) || 16;
          const prevHeight = l.boundaries.height ?? 100;
          const newFontSize = Math.max(8, Math.round(currentFontSize * (height / Math.max(1, prevHeight))));
          dataUpdate.style = { ...dataStyle, fontSize: newFontSize };
        }
        setOverride(sid, { data: dataUpdate });
      }
    },
    [layers, childrenData, setOverride, lockedLayerIds, selectedLayerIds]
  );

  const handleDragEnd = useCallback(() => {
    dragStartBoundsRef.current = {};
    setDraggingLayerId(null);
  }, []);

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (e.ctrlKey || e.metaKey) return;
      onSelectLayer?.("", false);
    },
    [onSelectLayer]
  );

  if (!childrenData?.length) {
    return (
      <AbsoluteFill style={style}>
        <CompositionLayout
          childrenData={childrenData}
          style={style}
          config={config ?? { fps: 30, width: 1920, height: 1080, duration: 20 }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={style}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <CompositionLayout
          childrenData={childrenData}
          style={style}
          config={config ?? { fps: 30, width: 1920, height: 1080, duration: 20 }}
        />
      </div>
      {editModeEnabled && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "visible",
            pointerEvents: "auto",
          }}
          onPointerDown={onCanvasPointerDown}
        >
          {sortedLayers.map((layer) => (
            <LayerOutlineWithSequence
              key={layer.id}
              layer={layer}
              isSelected={selectedLayerIds.includes(layer.id)}
              isDragging={draggingLayerId === layer.id}
              isLocked={lockedLayerIds.has(layer.id)}
              fps={fps}
              onSelect={(add) => handleSelect(layer.id, add)}
              onDrag={(dx, dy) => handleDrag(layer.id, dx, dy)}
              onResize={(handle, dx, dy) =>
                handleResize(layer.id, handle, dx, dy)
              }
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
}

function LayerOutlineWithSequence({
  layer,
  isSelected,
  isDragging,
  isLocked,
  fps,
  onSelect,
  onDrag,
  onResize,
  onDragEnd,
}: {
  layer: FlatLayer;
  isSelected: boolean;
  isDragging: boolean;
  isLocked: boolean;
  fps: number;
  onSelect: (addToSelection: boolean) => void;
  onDrag: (deltaX: number, deltaY: number) => void;
  onResize: (handle: string, deltaX: number, deltaY: number) => void;
  onDragEnd: () => void;
}) {
  const from = layer.timing.startInFrames ?? 0;
  const durationInFrames = layer.timing.durationInFrames ?? 1;
  if (durationInFrames <= 0) return null;

  return (
    <Sequence from={from} durationInFrames={durationInFrames} layout="none">
      <SelectionOutline
        layer={layer}
        isSelected={isSelected}
        isDragging={isDragging}
        isLocked={isLocked}
        onSelect={onSelect}
        onDrag={onDrag}
        onResize={onResize}
        onDragEnd={onDragEnd}
      />
    </Sequence>
  );
}
