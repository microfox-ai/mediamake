"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useCurrentScale } from "remotion";
import type { FlatLayer } from "@/lib/editor/flatten-layers";

const HANDLE_SIZE = 8;

interface SelectionOutlineProps {
  layer: FlatLayer;
  isSelected: boolean;
  isDragging: boolean;
  isLocked?: boolean;
  onSelect: (addToSelection: boolean) => void;
  onDrag: (deltaX: number, deltaY: number) => void;
  onResize: (handle: string, deltaX: number, deltaY: number) => void;
  onDragEnd: () => void;
}

export function SelectionOutline({
  layer,
  isSelected,
  isDragging,
  isLocked = false,
  onSelect,
  onDrag,
  onResize,
  onDragEnd,
}: SelectionOutlineProps) {
  const scale = useCurrentScale();
  const [hovered, setHovered] = useState(false);
  const scaledBorder = Math.ceil(2 / scale);

  const style: React.CSSProperties = useMemo(
    () => ({
      position: "absolute" as const,
      left: layer.boundaries.left ?? 0,
      top: layer.boundaries.top ?? 0,
      width: layer.boundaries.width ?? 100,
      height: layer.boundaries.height ?? 100,
      outline:
        (hovered && !isDragging) || isSelected
          ? `${scaledBorder}px solid #0B84F3`
          : undefined,
      userSelect: "none",
      touchAction: "none",
      pointerEvents: isLocked ? "none" : "auto",
    }),
    [layer.boundaries, hovered, isDragging, isSelected, scaledBorder, isLocked]
  );

  const startDragging = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      if (e.button !== 0) return;
      const initialX = e.clientX;
      const initialY = e.clientY;
      const onPointerMove = (moveEvent: PointerEvent) => {
        const offsetX = (moveEvent.clientX - initialX) / scale;
        const offsetY = (moveEvent.clientY - initialY) / scale;
        onDrag(offsetX, offsetY);
      };
      const onPointerUp = () => {
        onDragEnd();
        window.removeEventListener("pointermove", onPointerMove);
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { once: true });
    },
    [scale, onDrag, onDragEnd]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      onSelect(e.ctrlKey || e.metaKey);
      startDragging(e);
    },
    [onSelect, startDragging]
  );

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={style}
    >
      {isSelected && (
        <>
          <ResizeHandle
            layer={layer}
            type="top-left"
            scale={scale}
            onResize={onResize}
            onDragEnd={onDragEnd}
          />
          <ResizeHandle
            layer={layer}
            type="top-right"
            scale={scale}
            onResize={onResize}
            onDragEnd={onDragEnd}
          />
          <ResizeHandle
            layer={layer}
            type="bottom-left"
            scale={scale}
            onResize={onResize}
            onDragEnd={onDragEnd}
          />
          <ResizeHandle
            layer={layer}
            type="bottom-right"
            scale={scale}
            onResize={onResize}
            onDragEnd={onDragEnd}
          />
        </>
      )}
    </div>
  );
}

interface ResizeHandleProps {
  layer: FlatLayer;
  type: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  scale: number;
  onResize: (handle: string, deltaX: number, deltaY: number) => void;
  onDragEnd: () => void;
}

function ResizeHandle({
  layer,
  type,
  scale,
  onResize,
  onDragEnd,
}: ResizeHandleProps) {
  const size = Math.round(HANDLE_SIZE / scale);
  const borderSize = 1 / scale;

  const sizeStyle: React.CSSProperties = useMemo(
    () => ({
      position: "absolute" as const,
      height: size,
      width: size,
      backgroundColor: "white",
      border: `${borderSize}px solid #0B84F3`,
    }),
    [size, borderSize]
  );

  const margin = -size / 2 - borderSize;

  const positionStyle: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = { ...sizeStyle };
    if (type === "top-left")
      return { ...base, marginLeft: margin, marginTop: margin, cursor: "nwse-resize" };
    if (type === "top-right")
      return {
        ...base,
        marginTop: margin,
        marginRight: margin,
        right: 0,
        cursor: "nesw-resize",
      };
    if (type === "bottom-left")
      return {
        ...base,
        marginBottom: margin,
        marginLeft: margin,
        bottom: 0,
        cursor: "nesw-resize",
      };
    return {
      ...base,
      marginBottom: margin,
      marginRight: margin,
      right: 0,
      bottom: 0,
      cursor: "nwse-resize",
    };
  }, [sizeStyle, margin, type]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const initialX = e.clientX;
      const initialY = e.clientY;
      const onPointerMove = (moveEvent: PointerEvent) => {
        const offsetX = (moveEvent.clientX - initialX) / scale;
        const offsetY = (moveEvent.clientY - initialY) / scale;
        onResize(type, offsetX, offsetY);
      };
      const onPointerUp = () => {
        onDragEnd();
        window.removeEventListener("pointermove", onPointerMove);
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { once: true });
    },
    [scale, type, onResize, onDragEnd]
  );

  return <div onPointerDown={onPointerDown} style={positionStyle} />;
}
