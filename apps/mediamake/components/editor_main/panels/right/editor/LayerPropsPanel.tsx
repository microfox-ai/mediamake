"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { LayoutList, PanelLeft, Image as ImageIcon, X, RotateCcw } from "lucide-react";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { flattenLayers } from "@/lib/editor/flatten-layers";
import type { FlatLayer } from "@/lib/editor/flatten-layers";
import type { LayerOverride } from "../../../stores/layer-state-store";
import type { RenderableComponentData } from "@microfox/remotion";
import { getRegisteredEffects } from "@microfox/remotion";
import { MediaPicker } from "@/components/editor/media/media-picker";
import type { MediaFile } from "@/app/types/media";
import { GenericEffectEditor } from "./GenericEffectEditor";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";

const VideoPreviewThumbnail = ({ src, alt }: { src: string; alt?: string }) => {
  const { thumbnailSrc } = useVideoThumbnail(src, {
    timeInSeconds: 1,
    width: 480,
  });

  if (thumbnailSrc) {
    return (
      <img
        src={thumbnailSrc}
        alt={alt ?? "Video thumbnail"}
        className="max-w-full max-h-[200px] w-auto h-auto object-contain"
      />
    );
  }

  return (
    <div className="w-full h-[200px] bg-black flex items-center justify-center">
      <span className="text-xs text-white/80">Generating thumbnail…</span>
    </div>
  );
};

const LAYER_PROPS_VIEW_KEY = "layerPropsPanelView";
type LayerPropsViewMode = "single" | "tabs";

function useLayerPropsViewMode(): [LayerPropsViewMode, (mode: LayerPropsViewMode) => void] {
  const [mode, setModeState] = useState<LayerPropsViewMode>(() => {
    if (typeof window === "undefined") return "single";
    const stored = window.localStorage.getItem(LAYER_PROPS_VIEW_KEY);
    return stored === "tabs" ? "tabs" : "single";
  });
  const setMode = useCallback((next: LayerPropsViewMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAYER_PROPS_VIEW_KEY, next);
    }
  }, []);
  return [mode, setMode];
}

function findNodeById(
  nodes: RenderableComponentData[] | undefined,
  id: string
): RenderableComponentData | null {
  if (!nodes?.length) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.childrenData, id);
    if (found) return found;
  }
  return null;
}

function collectNodeIds(nodes: RenderableComponentData[] | undefined): string[] {
  const ids: string[] = [];
  if (!nodes?.length) return ids;
  function walk(n: RenderableComponentData[]) {
    for (const node of n) {
      ids.push(node.id);
      if (node.childrenData?.length) walk(node.childrenData);
    }
  }
  walk(nodes);
  return ids;
}

function parseCssValue(val: string | number | undefined): { value: string; important: boolean } {
  const s = val != null ? String(val).trim() : "";
  const important = s.endsWith(" !important");
  return { value: important ? s.slice(0, -11).trim() : s, important };
}

/** Parse a CSS dimension to a pixel number for layout/outline. Returns null for auto/fit-content/etc. */
function parseCssDimension(value: string, refSize: number): number | null {
  const s = String(value).trim();
  if (!s) return null;
  if (s.endsWith("%")) {
    const pct = parseFloat(s) / 100;
    if (!Number.isNaN(pct)) return Math.round(refSize * pct);
  }
  if (s.endsWith("px")) {
    const n = parseFloat(s);
    if (!Number.isNaN(n)) return Math.round(n);
  }
  const n = parseFloat(s);
  if (!Number.isNaN(n) && s === String(n)) return Math.round(n);
  return null;
}

/** Format boundaries/containerStyle for display in position/size inputs (allow %, px, fit-content, etc.) */
function getPositionSizeDisplay(
  style: Record<string, unknown> | undefined,
  boundaries: { left?: number; top?: number; width?: number; height?: number } | undefined,
  key: "left" | "top" | "width" | "height"
): string {
  const styleVal = style?.[key];
  if (styleVal !== undefined && styleVal !== null && String(styleVal).trim() !== "") return String(styleVal).trim();
  const num = boundaries?.[key];
  if (typeof num === "number") return `${num}px`;
  return "";
}
function formatCssValue(value: string, important: boolean): string {
  return important && value ? `${value} !important` : value;
}

const COMMON_CSS_PROPERTIES: { key: string; defaultValue: string; label?: string }[] = [
  { key: "gap", defaultValue: "0" },
  { key: "opacity", defaultValue: "1" },
  { key: "transform", defaultValue: "none" },
  { key: "borderRadius", defaultValue: "0" },
  { key: "boxShadow", defaultValue: "none" },
  { key: "filter", defaultValue: "none" },
  { key: "objectFit", defaultValue: "fill" },
  { key: "pointerEvents", defaultValue: "auto" },
  { key: "cursor", defaultValue: "default" },
  { key: "minWidth", defaultValue: "auto" },
  { key: "maxWidth", defaultValue: "none" },
  { key: "minHeight", defaultValue: "auto" },
  { key: "maxHeight", defaultValue: "none" },
  { key: "overflow", defaultValue: "visible" },
  { key: "overflowX", defaultValue: "visible" },
  { key: "overflowY", defaultValue: "visible" },
  { key: "transition", defaultValue: "none" },
  { key: "flex", defaultValue: "0 1 auto" },
  { key: "flexGrow", defaultValue: "0" },
  { key: "flexShrink", defaultValue: "1" },
  { key: "flexBasis", defaultValue: "auto" },
  { key: "alignSelf", defaultValue: "auto" },
  { key: "justifySelf", defaultValue: "auto" },
  { key: "order", defaultValue: "0" },
];

function AddStylePropertyButton({
  containerStyle,
  onAdd,
  disabled,
}: {
  containerStyle: Record<string, unknown>;
  onAdd: (key: string, value: string) => void;
  disabled?: boolean;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const handleAdd = () => {
    if (key.trim()) {
      onAdd(key.trim(), value.trim());
      setKey("");
      setValue("");
      setExpanded(false);
    }
  };
  const existingKeys = Object.keys(containerStyle);
  const availableCommon = COMMON_CSS_PROPERTIES.filter((p) => !existingKeys.includes(p.key));
  return (
    <div className="pt-1 space-y-1">
      {!expanded ? (
        <div className="flex gap-1 flex-wrap">
          <Select
            value=""
            onValueChange={(v) => {
              if (v === "__custom__") {
                setExpanded(true);
                return;
              }
              const prop = COMMON_CSS_PROPERTIES.find((p) => p.key === v);
              if (prop) {
                onAdd(prop.key, prop.defaultValue);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 flex-1 min-w-[120px]">
              <SelectValue placeholder="Add CSS property..." />
            </SelectTrigger>
            <SelectContent>
              {availableCommon.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label ?? p.key} ({p.defaultValue})
                </SelectItem>
              ))}
              <SelectItem value="__custom__">Custom key/value...</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => setExpanded(true)} disabled={disabled}>
            Custom
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 items-end flex-wrap">
            <Input placeholder="e.g. gap" value={key} onChange={(e) => setKey(e.target.value)} className="h-8 flex-1 min-w-0" disabled={disabled} />
            <Input placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 flex-1 min-w-0" disabled={disabled} />
            <Button type="button" size="sm" className="h-8" onClick={handleAdd} disabled={disabled || !key.trim()}>Add</Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setExpanded(false); setKey(""); setValue(""); }} disabled={disabled}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function commonValue<T>(items: T[], getter: (item: T) => unknown): unknown {
  if (items.length === 0) return undefined;
  const first = getter(items[0]);
  if (items.every((item) => getter(item) === first)) return first;
  return undefined;
}

function MultiLayerProps({
  selectedLayers,
  mergedChildren,
  setOverride,
  disabled = false,
}: {
  selectedLayers: FlatLayer[];
  mergedChildren: RenderableComponentData[] | undefined;
  setOverride: (nodeId: string, override: LayerOverride) => void;
  disabled?: boolean;
}) {
  const [deltaX, setDeltaX] = useState(0);
  const [deltaY, setDeltaY] = useState(0);

  const nodes = useMemo(
    () =>
      selectedLayers
        .map((l) => findNodeById(mergedChildren ?? undefined, l.id))
        .filter((n): n is RenderableComponentData => n != null),
    [selectedLayers, mergedChildren]
  );
  const allSameType = nodes.length > 0 && nodes.every((n) => n.componentId === nodes[0].componentId);
  const allLayout = allSameType && nodes[0].componentId === "BaseLayout";
  const allText = allSameType && nodes.every((n) => n.componentId === "TextAtom");

  const containerStyle = (n: RenderableComponentData) => (n.data?.containerProps as { style?: Record<string, unknown> })?.style ?? {};
  const commonLeft = commonValue(selectedLayers, (l) => l.boundaries.left);
  const commonTop = commonValue(selectedLayers, (l) => l.boundaries.top);
  const commonWidth = commonValue(selectedLayers, (l) => l.boundaries.width);
  const commonHeight = commonValue(selectedLayers, (l) => l.boundaries.height);
  const commonZIndex = commonValue(selectedLayers, (l) => l.boundaries.zIndex);
  const commonDisplay = allLayout ? commonValue(nodes, (n) => containerStyle(n).display) : undefined;
  const commonFlexDirection = allLayout ? commonValue(nodes, (n) => containerStyle(n).flexDirection) : undefined;
  const commonText = allText ? commonValue(nodes, (n) => (n.data as { text?: string })?.text) : undefined;

  const applyToAllBoundaries = (patch: Partial<{ left: number; top: number; width: number; height: number; zIndex: number }>) => {
    if (disabled) return;
    selectedLayers.forEach((layer) => {
      setOverride(layer.id, {
        data: {
          boundaries: { ...layer.boundaries, ...patch },
        },
      });
    });
  };
  const applyToAllContainerStyle = (key: string, value: string | undefined) => {
    if (disabled || !allLayout) return;
    nodes.forEach((n) => {
      setOverride(n.id, {
        data: {
          containerProps: { style: { [key]: value } },
        },
      });
    });
  };
  const applyToAllData = (patch: Record<string, unknown>) => {
    if (disabled) return;
    nodes.forEach((n) => {
      setOverride(n.id, { data: { ...(n.data as object), ...patch } });
    });
  };

  const applyOffset = () => {
    if (disabled) return;
    selectedLayers.forEach((layer) => {
      const left = (layer.boundaries.left ?? 0) + deltaX;
      const top = (layer.boundaries.top ?? 0) + deltaY;
      setOverride(layer.id, {
        data: {
          boundaries: { ...layer.boundaries, left, top },
        },
      });
    });
    setDeltaX(0);
    setDeltaY(0);
  };

  const mixed = (v: unknown) => (v === undefined ? "—" : String(v));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Editing common properties for {selectedLayers.length} layers. Change applies to all.
      </p>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Position & size</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Left</Label>
            <Input
              type="number"
              value={commonLeft !== undefined ? Math.round(Number(commonLeft)) : ""}
              placeholder="—"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) applyToAllBoundaries({ left: v });
              }}
              className="h-8"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Top</Label>
            <Input
              type="number"
              value={commonTop !== undefined ? Math.round(Number(commonTop)) : ""}
              placeholder="—"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) applyToAllBoundaries({ top: v });
              }}
              className="h-8"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={commonWidth !== undefined ? Math.round(Number(commonWidth)) : ""}
              placeholder="—"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 1) applyToAllBoundaries({ width: v });
              }}
              className="h-8"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={commonHeight !== undefined ? Math.round(Number(commonHeight)) : ""}
              placeholder="—"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 1) applyToAllBoundaries({ height: v });
              }}
              className="h-8"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">z-index</Label>
            <Input
              type="number"
              value={commonZIndex !== undefined ? Number(commonZIndex) : ""}
              placeholder="—"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) applyToAllBoundaries({ zIndex: v });
              }}
              className="h-8"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {allLayout && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Layout</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">display</Label>
              <Input
                type="text"
                value={mixed(commonDisplay ?? undefined)}
                onChange={(e) => applyToAllContainerStyle("display", e.target.value || undefined)}
                className="h-8"
                disabled={disabled}
                placeholder="—"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">flexDirection</Label>
              <Select
                value={commonFlexDirection != null ? String(commonFlexDirection) : "__mixed__"}
                onValueChange={(v) => applyToAllContainerStyle("flexDirection", v === "__mixed__" ? undefined : v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__mixed__">—</SelectItem>
                  <SelectItem value="row">row</SelectItem>
                  <SelectItem value="column">column</SelectItem>
                  <SelectItem value="row-reverse">row-reverse</SelectItem>
                  <SelectItem value="column-reverse">column-reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {allText && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Content (text)</h4>
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={commonText !== undefined ? String(commonText) : ""}
            placeholder="—"
            onChange={(e) => applyToAllData({ text: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}

      <div className="space-y-2 pt-2 border-t">
        <h4 className="text-xs font-medium text-muted-foreground">Offset position</h4>
        <p className="text-xs text-muted-foreground">Add delta to all {selectedLayers.length} layers</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Delta X</Label>
            <Input type="number" value={deltaX} onChange={(e) => setDeltaX(Number(e.target.value) || 0)} className="h-8" disabled={disabled} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Delta Y</Label>
            <Input type="number" value={deltaY} onChange={(e) => setDeltaY(Number(e.target.value) || 0)} className="h-8" disabled={disabled} />
          </div>
        </div>
        <Button size="sm" onClick={applyOffset} className="w-full" disabled={disabled}>
          Apply offset
        </Button>
      </div>
    </div>
  );
}

export function LayerPropsPanel() {
  const { calculatedMetadata } = useCompileStore();
  const {
    selectedLayerIds,
    setOverride,
    overrides,
    lockedLayerIds,
    addedNodes,
    childrenOrderByParentId,
    getMergedChildren,
    loadedChildrenData,
    resetLayerStateToGenerated,
  } = useLayerStateStore();
  const [viewMode, setViewMode] = useLayerPropsViewMode();
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [addEffectSelectValue, setAddEffectSelectValue] = useState("__add_effect_placeholder__");

  const mergedChildren = useMemo(
    () => getMergedChildren(calculatedMetadata?.props?.childrenData),
    [calculatedMetadata?.props?.childrenData, getMergedChildren, overrides, addedNodes, childrenOrderByParentId, loadedChildrenData]
  );

  const allCompositionNodeIds = useMemo(
    () => collectNodeIds(calculatedMetadata?.props?.childrenData),
    [calculatedMetadata?.props?.childrenData]
  );

  const layers = useMemo(() => {
    if (!mergedChildren?.length) return [];
    const props = calculatedMetadata?.props;
    const fps = props?.config?.fps ?? 30;
    const w = props?.config?.width ?? 1920;
    const h = props?.config?.height ?? 1080;
    return flattenLayers(mergedChildren, { fps, compositionWidth: w, compositionHeight: h });
  }, [mergedChildren, calculatedMetadata?.props]);

  const selectedLayers = useMemo(
    () => layers.filter((l) => selectedLayerIds.includes(l.id)),
    [layers, selectedLayerIds]
  );

  const rawNode = useMemo(() => {
    if (selectedLayers.length !== 1) return null;
    return findNodeById(mergedChildren ?? undefined, selectedLayers[0].id);
  }, [mergedChildren, selectedLayers]);

  const registeredEffects = useMemo(() => getRegisteredEffects(), []);

  const primaryForDisplay = selectedLayers[0] ?? null;
  const containerStyleForPos = useMemo(
    () => (rawNode?.data as { containerProps?: { style?: Record<string, unknown> } })?.containerProps?.style,
    [rawNode?.data]
  );
  const displayLeft = primaryForDisplay ? getPositionSizeDisplay(containerStyleForPos, primaryForDisplay.boundaries, "left") : "";
  const displayTop = primaryForDisplay ? getPositionSizeDisplay(containerStyleForPos, primaryForDisplay.boundaries, "top") : "";
  const displayWidth = primaryForDisplay ? getPositionSizeDisplay(containerStyleForPos, primaryForDisplay.boundaries, "width") : "";
  const displayHeight = primaryForDisplay ? getPositionSizeDisplay(containerStyleForPos, primaryForDisplay.boundaries, "height") : "";

  const [posSizeLocal, setPosSizeLocal] = useState({ left: "", top: "", width: "", height: "" });
  const [focusedPosSize, setFocusedPosSize] = useState<"left" | "top" | "width" | "height" | null>(null);
  useEffect(() => {
    if (focusedPosSize === null) {
      setPosSizeLocal({ left: displayLeft, top: displayTop, width: displayWidth, height: displayHeight });
    }
  }, [displayLeft, displayTop, displayWidth, displayHeight, focusedPosSize]);

  if (selectedLayerIds.length === 0 || selectedLayers.length === 0) {
    return null;
  }

  const isMulti = selectedLayers.length > 1;
  const primary = selectedLayers[0];
  const hasLockedSelected = selectedLayers.some((l) => lockedLayerIds.has(l.id));
  const isLocked = lockedLayerIds.has(primary.id);

  const compWidth = calculatedMetadata?.props?.config?.width ?? 1920;
  const compHeight = calculatedMetadata?.props?.config?.height ?? 1080;

  const updatePrimary = (updates: Partial<Record<keyof typeof primary.boundaries, number | string>>) => {
    if (isLocked) return;
    const data = rawNode?.data as { containerProps?: { style?: Record<string, unknown> } } | undefined;
    const cp = data?.containerProps ?? {};
    const existingStyle = (cp.style ?? {}) as Record<string, unknown>;

    const numericBoundaries: Partial<typeof primary.boundaries> = { ...primary.boundaries };
    const styleUpdates: Record<string, string> = {};

    const setDim = (key: "left" | "top" | "width" | "height", value: number | string | undefined) => {
      if (value === undefined) return;
      if (typeof value === "number") {
        numericBoundaries[key] = value;
        styleUpdates[key] = `${value}px`;
      } else {
        const s = String(value).trim();
        if (!s) return;
        const num = parseCssDimension(s, key === "left" || key === "width" ? compWidth : compHeight);
        if (num !== null) {
          numericBoundaries[key] = num;
          styleUpdates[key] = s.includes("px") || s.includes("%") || /^[a-z-]+$/i.test(s) ? s : `${num}px`;
        } else {
          styleUpdates[key] = s;
        }
      }
    };
    if (updates.left !== undefined) setDim("left", updates.left);
    if (updates.top !== undefined) setDim("top", updates.top);
    if (updates.width !== undefined) setDim("width", updates.width);
    if (updates.height !== undefined) setDim("height", updates.height);
    if (typeof updates.zIndex === "number") numericBoundaries.zIndex = updates.zIndex;

    const nextStyle = {
      ...existingStyle,
      position: "absolute",
      ...(styleUpdates.left !== undefined && { left: styleUpdates.left }),
      ...(styleUpdates.top !== undefined && { top: styleUpdates.top }),
      ...(styleUpdates.width !== undefined && { width: styleUpdates.width }),
      ...(styleUpdates.height !== undefined && { height: styleUpdates.height }),
    };
    setOverride(primary.id, {
      data: {
        boundaries: numericBoundaries,
        containerProps: { ...cp, style: nextStyle },
      } as LayerOverride["data"],
    });
  };

  const updateTiming = (updates: { start?: number; duration?: number; fitDurationTo?: string }) => {
    if (isLocked || !rawNode) return;
    const current = rawNode.context?.timing ?? {};
    let finalUpdates = { ...updates };
    if (updates.fitDurationTo !== undefined && mergedChildren?.length) {
      const targetId = typeof updates.fitDurationTo === "string" ? updates.fitDurationTo : undefined;
      if (targetId && targetId !== "this" && targetId !== "fill") {
        const targetNode = findNodeById(mergedChildren, targetId);
        if (targetNode?.context?.timing?.duration != null) {
          finalUpdates = { ...finalUpdates, duration: targetNode.context.timing.duration };
        }
      }
    }
    setOverride(primary.id, {
      context: { timing: { ...current, ...finalUpdates } },
    });
  };

  const updateData = (updates: Record<string, unknown>) => {
    if (isLocked) return;
    setOverride(primary.id, { data: { ...(rawNode?.data ?? {}), ...updates } as LayerOverride["data"] });
  };

  const updateContainerStyle = (key: string, value: string | number | undefined) => {
    if (isLocked || !rawNode?.data) return;
    const data = rawNode.data as { containerProps?: { style?: Record<string, unknown>; className?: string } };
    const cp = data.containerProps ?? {};
    const prev = cp.style ?? {};
    if (value === undefined) {
      setOverride(primary.id, { data: { ...rawNode.data, containerProps: { ...cp, style: { [key]: undefined } } } as LayerOverride["data"] });
      return;
    }
    setOverride(primary.id, { data: { ...rawNode.data, containerProps: { ...cp, style: { ...prev, [key]: value } } } as LayerOverride["data"] });
  };

  const updateDataStyle = (key: string, value: string | number | undefined) => {
    if (isLocked || !rawNode?.data) return;
    const dataStyle = (rawNode.data as { style?: Record<string, unknown> })?.style ?? {};
    if (value === undefined) {
      setOverride(primary.id, { data: { ...(rawNode?.data ?? {}), style: { [key]: undefined } } as LayerOverride["data"] });
      return;
    }
    setOverride(primary.id, { data: { ...(rawNode?.data ?? {}), style: { ...dataStyle, [key]: value } } as LayerOverride["data"] });
  };

  const effectsList = rawNode?.effects ?? [];
  const updateEffect = (index: number, data: Record<string, unknown>) => {
    if (isLocked || !rawNode) return;
    const next = effectsList.map((eff, i) => {
      const e = typeof eff === "object" && eff !== null ? (eff as { id?: string; componentId?: string; data?: Record<string, unknown> }) : { id: `effect-${i}`, componentId: "generic", data: {} };
      const base = { id: e.id ?? `effect-${i}`, componentId: e.componentId ?? "generic", data: e.data ?? {} };
      return i === index ? { ...base, data: { ...base.data, ...data } } : base;
    });
    setOverride(primary.id, { effects: next as RenderableComponentData["effects"] });
  };
  const updateEffectType = (index: number, componentId: string) => {
    if (isLocked || !rawNode) return;
    const next = effectsList.map((eff, i) => {
      const e = typeof eff === "object" && eff !== null ? (eff as { id?: string; componentId?: string; data?: Record<string, unknown> }) : { id: `effect-${i}`, componentId: "generic", data: {} };
      const base = { id: e.id ?? `effect-${i}`, componentId: e.componentId ?? "generic", data: e.data ?? {} };
      return i === index ? { ...base, componentId, data: {} } : base;
    });
    setOverride(primary.id, { effects: next as RenderableComponentData["effects"] });
  };
  const addEffect = (componentId: string) => {
    if (isLocked || !rawNode) return;
    const list = effectsList as { id?: string; componentId?: string; data?: Record<string, unknown> }[];
    const next = [...list, { id: `effect-${list.length}`, componentId, data: {} }];
    setOverride(primary.id, { effects: next as RenderableComponentData["effects"] });
  };
  const removeEffect = (index: number) => {
    if (isLocked || !rawNode) return;
    const next = effectsList.filter((_, i) => i !== index);
    setOverride(primary.id, { effects: next as RenderableComponentData["effects"] });
  };

  const timing = rawNode?.context?.timing;
  const dataStyle = (rawNode?.data as { style?: Record<string, unknown> } | undefined)?.style ?? {};
  const dataFont = (rawNode?.data as { font?: { family?: string; weights?: string[] } })?.font ?? {};
  const isMediaAtom = primary.componentId === "VideoAtom" || primary.componentId === "AudioAtom";

  const containerProps = (rawNode?.data as { containerProps?: { style?: Record<string, unknown>; className?: string } })?.containerProps;
  const containerStyle = containerProps?.style ?? {};
  const hasContainerStyle = primary.type === "layout" && containerProps && Object.keys(containerStyle).length > 0;

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold shrink-0">
            {isMulti
              ? `${selectedLayers.length} layers selected`
              : "Layer properties"}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => resetLayerStateToGenerated()}
              title="Reset layers to timeline output (clear all position, timing, and layer edits)"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset to timeline
            </Button>
            {!isMulti && (
              <div className="flex rounded-md border border-input bg-background p-0.5">
                <Button
                  variant={viewMode === "single" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode("single")}
                  title="Single scroll view"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === "tabs" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode("tabs")}
                  title="Tabbed view"
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {hasLockedSelected && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
            One or more selected layers are locked. Unlock them to edit.
          </div>
        )}
        {!isMulti && viewMode === "single" && (
          <div className="space-y-3">
            {(primary.componentId === "TextAtom" || primary.componentId === "ImageAtom" || primary.componentId === "VideoAtom") && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Content</h4>
                {primary.componentId === "TextAtom" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Text</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={(rawNode?.data as { text?: string })?.text ?? ""}
                      onChange={(e) => updateData({ text: e.target.value })}
                      disabled={isLocked}
                      placeholder="Enter text"
                    />
                  </div>
                )}
                {(primary.componentId === "ImageAtom" || primary.componentId === "VideoAtom") && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">URL</Label>
                      <div className="flex gap-1">
                        <Input
                          className="h-8 flex-1"
                          value={primary.previewSrc ?? ""}
                          onChange={(e) => updateData({ src: e.target.value })}
                          disabled={isLocked}
                          placeholder="Media URL"
                        />
                        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => setShowMediaPicker(true)} disabled={isLocked} title="Pick from library">
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {primary.previewSrc && (
                      <div className="rounded-md border overflow-hidden bg-muted/30">
                        {primary.componentId === "ImageAtom" ? (
                          <img
                            src={primary.previewSrc}
                            alt=""
                            className="max-w-full max-h-[280px] w-auto h-auto object-contain"
                          />
                        ) : (
                          <VideoPreviewThumbnail src={primary.previewSrc} alt={primary.id} />
                        )}
                      </div>
                    )}
                    {showMediaPicker && (
                      <MediaPicker
                        pickerMode
                        singular
                        onSelect={(fileOrFiles: MediaFile | MediaFile[]) => {
                          const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
                          if (file?.filePath) updateData({ src: file.filePath });
                          setShowMediaPicker(false);
                        }}
                        onClose={() => setShowMediaPicker(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
            {!isMulti && primary.componentId === "TextAtom" && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Text style</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Font size</Label>
                    <Input type="number" value={Number(dataStyle.fontSize) ?? 16} onChange={(e) => updateData({ style: { ...dataStyle, fontSize: Number(e.target.value) || 16 } })} className="h-8" disabled={isLocked} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <Input type="text" value={String(dataStyle.color ?? "#000000")} onChange={(e) => updateData({ style: { ...dataStyle, color: e.target.value } })} className="h-8" disabled={isLocked} placeholder="#000000" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Letter spacing</Label>
                    <Input type="text" value={String(dataStyle.letterSpacing ?? "")} onChange={(e) => updateData({ style: { ...dataStyle, letterSpacing: e.target.value } })} className="h-8" disabled={isLocked} placeholder="e.g. 5px" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Text shadow</Label>
                    <Input type="text" value={String(dataStyle.textShadow ?? "")} onChange={(e) => updateData({ style: { ...dataStyle, textShadow: e.target.value } })} className="h-8" disabled={isLocked} placeholder="e.g. 0 2px 4px rgba(0,0,0,0.5)" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Font family</Label>
                    <Input type="text" value={String(dataFont.family ?? "")} onChange={(e) => updateData({ font: { ...dataFont, family: e.target.value } })} className="h-8" disabled={isLocked} placeholder="e.g. Inter" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Font weights (comma-separated)</Label>
                    <Input type="text" value={Array.isArray(dataFont.weights) ? dataFont.weights.join(", ") : String(dataFont.weights ?? "")} onChange={(e) => updateData({ font: { ...dataFont, weights: e.target.value ? e.target.value.split(",").map((w) => w.trim()) : undefined } })} className="h-8" disabled={isLocked} placeholder="e.g. 400, 700" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Position & size</h4>
              <p className="text-[10px] text-muted-foreground">Use px, %, or e.g. fit-content. Mouse drag/resize overwrites to px.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Left</Label>
                  <Input
                    type="text"
                    value={focusedPosSize === "left" ? posSizeLocal.left : displayLeft}
                    onFocus={() => { setPosSizeLocal((p) => ({ ...p, left: displayLeft })); setFocusedPosSize("left"); }}
                    onChange={(e) => setPosSizeLocal((p) => ({ ...p, left: e.target.value }))}
                    onBlur={() => { if (posSizeLocal.left.trim()) updatePrimary({ left: posSizeLocal.left.trim() }); setFocusedPosSize(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="h-8"
                    disabled={isLocked}
                    placeholder="0px"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Top</Label>
                  <Input
                    type="text"
                    value={focusedPosSize === "top" ? posSizeLocal.top : displayTop}
                    onFocus={() => { setPosSizeLocal((p) => ({ ...p, top: displayTop })); setFocusedPosSize("top"); }}
                    onChange={(e) => setPosSizeLocal((p) => ({ ...p, top: e.target.value }))}
                    onBlur={() => { if (posSizeLocal.top.trim()) updatePrimary({ top: posSizeLocal.top.trim() }); setFocusedPosSize(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="h-8"
                    disabled={isLocked}
                    placeholder="0px"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width</Label>
                  <Input
                    type="text"
                    value={focusedPosSize === "width" ? posSizeLocal.width : displayWidth}
                    onFocus={() => { setPosSizeLocal((p) => ({ ...p, width: displayWidth })); setFocusedPosSize("width"); }}
                    onChange={(e) => setPosSizeLocal((p) => ({ ...p, width: e.target.value }))}
                    onBlur={() => { if (posSizeLocal.width.trim()) updatePrimary({ width: posSizeLocal.width.trim() }); setFocusedPosSize(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="h-8"
                    disabled={isLocked}
                    placeholder="100px"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height</Label>
                  <Input
                    type="text"
                    value={focusedPosSize === "height" ? posSizeLocal.height : displayHeight}
                    onFocus={() => { setPosSizeLocal((p) => ({ ...p, height: displayHeight })); setFocusedPosSize("height"); }}
                    onChange={(e) => setPosSizeLocal((p) => ({ ...p, height: e.target.value }))}
                    onBlur={() => { if (posSizeLocal.height.trim()) updatePrimary({ height: posSizeLocal.height.trim() }); setFocusedPosSize(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="h-8"
                    disabled={isLocked}
                    placeholder="100px"
                  />
                </div>
                <div className="space-y-1 col-span-2"><Label className="text-xs">z-index</Label><Input type="number" value={primary.boundaries.zIndex ?? 0} onChange={(e) => updatePrimary({ zIndex: Number(e.target.value) || 0 })} className="h-8" disabled={isLocked} /></div>
              </div>
            </div>

            {(primary.componentId === "TextAtom" || primary.componentId === "ImageAtom" || primary.componentId === "VideoAtom") && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Custom CSS (style)</h4>
                {Object.keys(dataStyle).length > 0 && (
                  <div className="space-y-1">
                    {Object.keys(dataStyle).map((k) => {
                      const { value, important } = parseCssValue(dataStyle[k] as string | number | undefined);
                      return (
                        <div key={k} className="flex gap-1 items-center flex-wrap">
                          <span className="text-xs text-muted-foreground w-24 shrink-0 truncate" title={k}>{k}</span>
                          <Input className="h-8 flex-1 font-mono text-xs min-w-0" value={value} onChange={(e) => updateDataStyle(k, formatCssValue(e.target.value, important))} disabled={isLocked} />
                          <label className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                            <Checkbox checked={important} onCheckedChange={(checked) => updateDataStyle(k, formatCssValue(value, !!checked))} disabled={isLocked} />
                            !important
                          </label>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateDataStyle(k, undefined)} disabled={isLocked} title="Remove property">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <AddStylePropertyButton containerStyle={dataStyle as Record<string, unknown>} onAdd={(key, value) => updateDataStyle(key, value)} disabled={isLocked} />
              </div>
            )}

            {rawNode && (
              <>
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Timing (relative to parent)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start (s)</Label>
                      <Input
                        type="number"
                        step={0.1}
                        value={timing?.start ?? 0}
                        onChange={(e) => updateTiming({ start: Number(e.target.value) || 0 })}
                        className="h-8"
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duration (s)</Label>
                      <Input
                        type="number"
                        step={0.1}
                        value={timing?.duration ?? ""}
                        onChange={(e) => updateTiming({ duration: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className="h-8"
                        disabled={isLocked}
                        placeholder="inherit"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">fitDurationTo</Label>
                      <Select
                        value={typeof timing?.fitDurationTo === "string" && timing.fitDurationTo ? timing.fitDurationTo : "__none__"}
                        onValueChange={(v) => updateTiming({ fitDurationTo: v === "__none__" ? undefined : v })}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {allCompositionNodeIds.map((id) => (
                            <SelectItem key={id} value={id}>{id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        className="h-8 mt-1"
                        placeholder="Or type node id"
                        defaultValue={typeof timing?.fitDurationTo === "string" && timing.fitDurationTo && !allCompositionNodeIds.includes(timing.fitDurationTo) ? timing.fitDurationTo : ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v) updateTiming({ fitDurationTo: v });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (v) updateTiming({ fitDurationTo: v });
                          }
                        }}
                        disabled={isLocked}
                      />
                    </div>
                    {isMediaAtom && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Trim start (s)</Label>
                          <Input
                            type="number"
                            step={0.1}
                            value={(rawNode.data as { startFrom?: number })?.startFrom ?? ""}
                            onChange={(e) => updateData({ startFrom: e.target.value === "" ? undefined : Number(e.target.value) })}
                            className="h-8"
                            disabled={isLocked}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Trim end (s)</Label>
                          <Input
                            type="number"
                            step={0.1}
                            value={(rawNode.data as { endAt?: number })?.endAt ?? ""}
                            onChange={(e) => updateData({ endAt: e.target.value === "" ? undefined : Number(e.target.value) })}
                            className="h-8"
                            disabled={isLocked}
                            placeholder="—"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Display</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Pointer events</Label>
                      <Select
                        value={(dataStyle.pointerEvents as string) ?? "auto"}
                        onValueChange={(v) => updateData({ style: { ...dataStyle, pointerEvents: v } })}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">auto</SelectItem>
                          <SelectItem value="none">none</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {dataStyle.opacity != null && (
                      <div className="space-y-1">
                        <Label className="text-xs">Opacity</Label>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.1}
                          value={Number(dataStyle.opacity) ?? 1}
                          onChange={(e) => updateData({ style: { ...dataStyle, opacity: Number(e.target.value) || 0 } })}
                          className="h-8"
                          disabled={isLocked}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {primary.type === "layout" && containerProps && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Layout</h4>
                    <div className="space-y-1">
                      <Label className="text-xs">Container className</Label>
                      <Input type="text" value={containerProps?.className ?? ""} onChange={(e) => setOverride(primary.id, { data: { ...rawNode.data, containerProps: { ...containerProps, className: e.target.value } } as LayerOverride["data"] })} className="h-8" disabled={isLocked} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs">display</Label>
                        <Input type="text" value={String(containerStyle.display ?? "flex")} onChange={(e) => updateContainerStyle("display", e.target.value)} className="h-8" disabled={isLocked} placeholder="flex" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">flexDirection</Label>
                        <Select value={String(containerStyle.flexDirection ?? "row")} onValueChange={(v) => updateContainerStyle("flexDirection", v)} disabled={isLocked}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="row">row</SelectItem><SelectItem value="column">column</SelectItem><SelectItem value="row-reverse">row-reverse</SelectItem><SelectItem value="column-reverse">column-reverse</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">alignItems</Label>
                        <Select value={containerStyle.alignItems ? String(containerStyle.alignItems) : "__none__"} onValueChange={(v) => updateContainerStyle("alignItems", v === "__none__" ? "" : v)} disabled={isLocked}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent><SelectItem value="__none__">—</SelectItem><SelectItem value="flex-start">flex-start</SelectItem><SelectItem value="flex-end">flex-end</SelectItem><SelectItem value="center">center</SelectItem><SelectItem value="stretch">stretch</SelectItem><SelectItem value="baseline">baseline</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">justifyContent</Label>
                        <Select value={containerStyle.justifyContent ? String(containerStyle.justifyContent) : "__none__"} onValueChange={(v) => updateContainerStyle("justifyContent", v === "__none__" ? "" : v)} disabled={isLocked}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent><SelectItem value="__none__">—</SelectItem><SelectItem value="flex-start">flex-start</SelectItem><SelectItem value="flex-end">flex-end</SelectItem><SelectItem value="center">center</SelectItem><SelectItem value="space-between">space-between</SelectItem><SelectItem value="space-around">space-around</SelectItem><SelectItem value="space-evenly">space-evenly</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    {Object.keys(containerStyle).filter((k) => !["display", "flexDirection", "alignItems", "justifyContent"].includes(k)).length > 0 && (
                      <div className="space-y-1 pt-1">
                        <Label className="text-xs">Custom CSS</Label>
                        {Object.keys(containerStyle).filter((k) => !["display", "flexDirection", "alignItems", "justifyContent"].includes(k)).map((k) => {
                          const { value, important } = parseCssValue(containerStyle[k] as string | number | undefined);
                          return (
                            <div key={k} className="flex gap-1 items-center flex-wrap">
                              <span className="text-xs text-muted-foreground w-24 shrink-0 truncate" title={k}>{k}</span>
                              <Input className="h-8 flex-1 font-mono text-xs min-w-0" value={value} onChange={(e) => updateContainerStyle(k, formatCssValue(e.target.value, important))} disabled={isLocked} placeholder={k} />
                              <label className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                                <Checkbox checked={important} onCheckedChange={(checked) => updateContainerStyle(k, formatCssValue(value, !!checked))} disabled={isLocked} />
                                !important
                              </label>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateContainerStyle(k, undefined)} disabled={isLocked} title="Remove property">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <AddStylePropertyButton containerStyle={containerStyle} onAdd={(key, value) => { updateContainerStyle(key, value); }} disabled={isLocked} />
                  </div>
                )}
                <div className="space-y-2 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Effects</h4>
                    <Select
                      value={addEffectSelectValue}
                      onValueChange={(v) => {
                        if (v && v !== "__add_effect_placeholder__") {
                          addEffect(v);
                          setAddEffectSelectValue("__add_effect_placeholder__");
                        }
                      }}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="Add effect..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__add_effect_placeholder__">Add effect...</SelectItem>
                        {registeredEffects.map(({ id, displayName }) => (
                          <SelectItem key={id} value={id}>{displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {effectsList.length > 0 && (
                    <div className="space-y-3 min-w-0">
                      {effectsList.map((eff, index) => {
                        const e = typeof eff === "object" && eff !== null ? eff as { id?: string; componentId?: string; data?: Record<string, unknown> } : null;
                        if (!e) return null;
                        const compId = e.componentId ?? "generic";
                        return (
                          <div key={e.id ?? index} className="rounded-md border p-2 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-xs text-muted-foreground shrink-0">Type</Label>
                              <Select value={compId} onValueChange={(v) => updateEffectType(index, v)} disabled={isLocked}>
                                <SelectTrigger className="h-8 flex-1 min-w-0 max-w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {registeredEffects.map(({ id, displayName: name }) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEffect(index)} disabled={isLocked} title="Remove effect">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {compId === "generic" && (
                              <GenericEffectEditor
                                value={(e.data ?? {}) as Parameters<typeof GenericEffectEditor>[0]["value"]}
                                onChange={(data) => updateEffect(index, data)}
                                disabled={isLocked}
                              />
                            )}
                            {compId !== "generic" && (
                              <div className="text-xs text-muted-foreground">Edit in JSON or add a dedicated editor.</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {effectsList.length === 0 && (
                    <div className="text-xs text-muted-foreground">No effects. Use &quot;Add effect...&quot; to add one.</div>
                  )}
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground">
              {primary.label || primary.id}
            </div>
          </div>
        )}
        {!isMulti && viewMode === "tabs" && (
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
              <TabsTrigger value="timing" className="text-xs">Timing</TabsTrigger>
              <TabsTrigger value="effects" className="text-xs">Effects</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-2 space-y-3">
              <ScrollArea className="h-[60vh] pr-2">
                <div className="space-y-3 pb-4">
                  {(primary.componentId === "TextAtom" || primary.componentId === "ImageAtom" || primary.componentId === "VideoAtom") && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Content</h4>
                      {primary.componentId === "TextAtom" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Text</Label>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={(rawNode?.data as { text?: string })?.text ?? ""}
                            onChange={(e) => updateData({ text: e.target.value })}
                            disabled={isLocked}
                            placeholder="Enter text"
                          />
                        </div>
                      )}
                      {(primary.componentId === "ImageAtom" || primary.componentId === "VideoAtom") && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">URL</Label>
                            <div className="flex gap-1">
                              <Input className="h-8 flex-1" value={primary.previewSrc ?? ""} onChange={(e) => updateData({ src: e.target.value })} disabled={isLocked} placeholder="Media URL" />
                              <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => setShowMediaPicker(true)} disabled={isLocked} title="Pick from library">
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {primary.previewSrc && (
                            <div className="rounded-md border overflow-hidden bg-muted/30">
                              {primary.componentId === "ImageAtom" ? (
                                <img
                                  src={primary.previewSrc}
                                  alt=""
                                  className="max-w-full max-h-[200px] w-auto h-auto object-contain"
                                />
                              ) : (
                                <VideoPreviewThumbnail src={primary.previewSrc} alt={primary.id} />
                              )}
                            </div>
                          )}
                          {showMediaPicker && (
                            <MediaPicker pickerMode singular onSelect={(fileOrFiles: MediaFile | MediaFile[]) => { const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles; if (file?.filePath) updateData({ src: file.filePath }); setShowMediaPicker(false); }} onClose={() => setShowMediaPicker(false)} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {primary.componentId === "TextAtom" && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Text style</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">Font size</Label><Input type="number" value={Number(dataStyle.fontSize) ?? 16} onChange={(e) => updateData({ style: { ...dataStyle, fontSize: Number(e.target.value) || 16 } })} className="h-8" disabled={isLocked} /></div>
                        <div className="space-y-1"><Label className="text-xs">Color</Label><Input type="text" value={String(dataStyle.color ?? "#000000")} onChange={(e) => updateData({ style: { ...dataStyle, color: e.target.value } })} className="h-8" disabled={isLocked} placeholder="#000000" /></div>
                        <div className="space-y-1 col-span-2"><Label className="text-xs">Letter spacing</Label><Input type="text" value={String(dataStyle.letterSpacing ?? "")} onChange={(e) => updateData({ style: { ...dataStyle, letterSpacing: e.target.value } })} className="h-8" disabled={isLocked} placeholder="e.g. 5px" /></div>
                        <div className="space-y-1 col-span-2"><Label className="text-xs">Text shadow</Label><Input type="text" value={String(dataStyle.textShadow ?? "")} onChange={(e) => updateData({ style: { ...dataStyle, textShadow: e.target.value } })} className="h-8" disabled={isLocked} placeholder="e.g. 0 2px 4px rgba(0,0,0,0.5)" /></div>
                        <div className="space-y-1 col-span-2"><Label className="text-xs">Font family</Label><Input type="text" value={String(dataFont.family ?? "")} onChange={(e) => updateData({ font: { ...dataFont, family: e.target.value } })} className="h-8" disabled={isLocked} placeholder="e.g. Inter" /></div>
                        <div className="space-y-1 col-span-2"><Label className="text-xs">Font weights (comma-separated)</Label><Input type="text" value={Array.isArray(dataFont.weights) ? dataFont.weights.join(", ") : String(dataFont.weights ?? "")} onChange={(e) => updateData({ font: { ...dataFont, weights: e.target.value ? e.target.value.split(",").map((w) => w.trim()) : undefined } })} className="h-8" disabled={isLocked} placeholder="e.g. 400, 700" /></div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Position & size</h4>
                    <p className="text-[10px] text-muted-foreground">Use px, %, or e.g. fit-content. Mouse drag/resize overwrites to px.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Left</Label>
                        <Input type="text" value={focusedPosSize === "left" ? posSizeLocal.left : displayLeft} onFocus={() => { setPosSizeLocal((p) => ({ ...p, left: displayLeft })); setFocusedPosSize("left"); }} onChange={(e) => setPosSizeLocal((p) => ({ ...p, left: e.target.value }))} onBlur={() => { if (posSizeLocal.left.trim()) updatePrimary({ left: posSizeLocal.left.trim() }); setFocusedPosSize(null); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-8" disabled={isLocked} placeholder="0px" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Top</Label>
                        <Input type="text" value={focusedPosSize === "top" ? posSizeLocal.top : displayTop} onFocus={() => { setPosSizeLocal((p) => ({ ...p, top: displayTop })); setFocusedPosSize("top"); }} onChange={(e) => setPosSizeLocal((p) => ({ ...p, top: e.target.value }))} onBlur={() => { if (posSizeLocal.top.trim()) updatePrimary({ top: posSizeLocal.top.trim() }); setFocusedPosSize(null); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-8" disabled={isLocked} placeholder="0px" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Width</Label>
                        <Input type="text" value={focusedPosSize === "width" ? posSizeLocal.width : displayWidth} onFocus={() => { setPosSizeLocal((p) => ({ ...p, width: displayWidth })); setFocusedPosSize("width"); }} onChange={(e) => setPosSizeLocal((p) => ({ ...p, width: e.target.value }))} onBlur={() => { if (posSizeLocal.width.trim()) updatePrimary({ width: posSizeLocal.width.trim() }); setFocusedPosSize(null); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-8" disabled={isLocked} placeholder="100px" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Height</Label>
                        <Input type="text" value={focusedPosSize === "height" ? posSizeLocal.height : displayHeight} onFocus={() => { setPosSizeLocal((p) => ({ ...p, height: displayHeight })); setFocusedPosSize("height"); }} onChange={(e) => setPosSizeLocal((p) => ({ ...p, height: e.target.value }))} onBlur={() => { if (posSizeLocal.height.trim()) updatePrimary({ height: posSizeLocal.height.trim() }); setFocusedPosSize(null); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-8" disabled={isLocked} placeholder="100px" />
                      </div>
                      <div className="space-y-1 col-span-2"><Label className="text-xs">z-index</Label><Input type="number" value={primary.boundaries.zIndex ?? 0} onChange={(e) => updatePrimary({ zIndex: Number(e.target.value) || 0 })} className="h-8" disabled={isLocked} /></div>
                    </div>
                  </div>
                  {rawNode && (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">Display</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Pointer events</Label>
                            <Select value={(dataStyle.pointerEvents as string) ?? "auto"} onValueChange={(v) => updateData({ style: { ...dataStyle, pointerEvents: v } })} disabled={isLocked}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="auto">auto</SelectItem><SelectItem value="none">none</SelectItem></SelectContent>
                            </Select>
                          </div>
                          {dataStyle.opacity != null && (
                            <div className="space-y-1">
                              <Label className="text-xs">Opacity</Label>
                              <Input type="number" min={0} max={1} step={0.1} value={Number(dataStyle.opacity) ?? 1} onChange={(e) => updateData({ style: { ...dataStyle, opacity: Number(e.target.value) || 0 } })} className="h-8" disabled={isLocked} />
                            </div>
                          )}
                        </div>
                      </div>
                      {primary.type === "layout" && containerProps && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground">Layout</h4>
                          <div className="space-y-1">
                            <Label className="text-xs">Container className</Label>
                            <Input type="text" value={containerProps?.className ?? ""} onChange={(e) => setOverride(primary.id, { data: { ...rawNode.data, containerProps: { ...containerProps, className: e.target.value } } as LayerOverride["data"] })} className="h-8" disabled={isLocked} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1"><Label className="text-xs">display</Label><Input type="text" value={String(containerStyle.display ?? "flex")} onChange={(e) => updateContainerStyle("display", e.target.value)} className="h-8" disabled={isLocked} placeholder="flex" /></div>
                            <div className="space-y-1"><Label className="text-xs">flexDirection</Label><Select value={String(containerStyle.flexDirection ?? "row")} onValueChange={(v) => updateContainerStyle("flexDirection", v)} disabled={isLocked}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="row">row</SelectItem><SelectItem value="column">column</SelectItem><SelectItem value="row-reverse">row-reverse</SelectItem><SelectItem value="column-reverse">column-reverse</SelectItem></SelectContent></Select></div>
                            <div className="space-y-1"><Label className="text-xs">alignItems</Label><Select value={containerStyle.alignItems ? String(containerStyle.alignItems) : "__none__"} onValueChange={(v) => updateContainerStyle("alignItems", v === "__none__" ? "" : v)} disabled={isLocked}><SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="__none__">—</SelectItem><SelectItem value="flex-start">flex-start</SelectItem><SelectItem value="flex-end">flex-end</SelectItem><SelectItem value="center">center</SelectItem><SelectItem value="stretch">stretch</SelectItem><SelectItem value="baseline">baseline</SelectItem></SelectContent></Select></div>
                            <div className="space-y-1"><Label className="text-xs">justifyContent</Label><Select value={containerStyle.justifyContent ? String(containerStyle.justifyContent) : "__none__"} onValueChange={(v) => updateContainerStyle("justifyContent", v === "__none__" ? "" : v)} disabled={isLocked}><SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="__none__">—</SelectItem><SelectItem value="flex-start">flex-start</SelectItem><SelectItem value="flex-end">flex-end</SelectItem><SelectItem value="center">center</SelectItem><SelectItem value="space-between">space-between</SelectItem><SelectItem value="space-around">space-around</SelectItem><SelectItem value="space-evenly">space-evenly</SelectItem></SelectContent></Select></div>
                          </div>
                          {Object.keys(containerStyle).filter((k) => !["display", "flexDirection", "alignItems", "justifyContent"].includes(k)).length > 0 && (
                            <div className="space-y-1 pt-1">
                              <Label className="text-xs">Custom CSS</Label>
                              {Object.keys(containerStyle).filter((k) => !["display", "flexDirection", "alignItems", "justifyContent"].includes(k)).map((k) => {
                                const { value, important } = parseCssValue(containerStyle[k] as string | number | undefined);
                                return (
                                  <div key={k} className="flex gap-1 items-center flex-wrap">
                                    <span className="text-xs text-muted-foreground w-24 shrink-0 truncate" title={k}>{k}</span>
                                    <Input className="h-8 flex-1 font-mono text-xs min-w-0" value={value} onChange={(e) => updateContainerStyle(k, formatCssValue(e.target.value, important))} disabled={isLocked} placeholder={k} />
                                    <label className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                                      <Checkbox checked={important} onCheckedChange={(checked) => updateContainerStyle(k, formatCssValue(value, !!checked))} disabled={isLocked} />
                                      !important
                                    </label>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateContainerStyle(k, undefined)} disabled={isLocked} title="Remove property">
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <AddStylePropertyButton containerStyle={containerStyle} onAdd={(k, v) => updateContainerStyle(k, v)} disabled={isLocked} />
                        </div>
                      )}
                    </>
                  )}
                  {(primary.componentId === "TextAtom" || primary.componentId === "ImageAtom" || primary.componentId === "VideoAtom") && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Custom CSS (style)</h4>
                      {Object.keys(dataStyle).length > 0 && (
                        <div className="space-y-1">
                          {Object.keys(dataStyle).map((k) => {
                            const { value, important } = parseCssValue(dataStyle[k] as string | number | undefined);
                            return (
                              <div key={k} className="flex gap-1 items-center flex-wrap">
                                <span className="text-xs text-muted-foreground w-24 shrink-0 truncate" title={k}>{k}</span>
                                <Input className="h-8 flex-1 font-mono text-xs min-w-0" value={value} onChange={(e) => updateDataStyle(k, formatCssValue(e.target.value, important))} disabled={isLocked} />
                                <label className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                                  <Checkbox checked={important} onCheckedChange={(checked) => updateDataStyle(k, formatCssValue(value, !!checked))} disabled={isLocked} />
                                  !important
                                </label>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateDataStyle(k, undefined)} disabled={isLocked} title="Remove property">
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <AddStylePropertyButton containerStyle={dataStyle as Record<string, unknown>} onAdd={(key, value) => updateDataStyle(key, value)} disabled={isLocked} />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="timing" className="mt-2">
              <ScrollArea className="h-[60vh] pr-2">
                <div className="space-y-3 pb-4">
                  {rawNode && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Timing (relative to parent)</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">Start (s)</Label><Input type="number" step={0.1} value={timing?.start ?? 0} onChange={(e) => updateTiming({ start: Number(e.target.value) || 0 })} className="h-8" disabled={isLocked} /></div>
                        <div className="space-y-1"><Label className="text-xs">Duration (s)</Label><Input type="number" step={0.1} value={timing?.duration ?? ""} onChange={(e) => updateTiming({ duration: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-8" disabled={isLocked} placeholder="inherit" /></div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs">fitDurationTo</Label>
                          <Select value={typeof timing?.fitDurationTo === "string" && timing.fitDurationTo ? timing.fitDurationTo : "__none__"} onValueChange={(v) => updateTiming({ fitDurationTo: v === "__none__" ? undefined : v })} disabled={isLocked}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {allCompositionNodeIds.map((id) => (
                                <SelectItem key={id} value={id}>{id}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text" className="h-8 mt-1" placeholder="Or type node id" defaultValue={typeof timing?.fitDurationTo === "string" && timing.fitDurationTo && !allCompositionNodeIds.includes(timing.fitDurationTo) ? timing.fitDurationTo : ""} onBlur={(e) => { const v = e.target.value.trim(); if (v) updateTiming({ fitDurationTo: v }); }} onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) updateTiming({ fitDurationTo: v }); } }} disabled={isLocked} />
                        </div>
                        {isMediaAtom && (
                          <>
                            <div className="space-y-1"><Label className="text-xs">Trim start (s)</Label><Input type="number" step={0.1} value={(rawNode.data as { startFrom?: number })?.startFrom ?? ""} onChange={(e) => updateData({ startFrom: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-8" disabled={isLocked} placeholder="0" /></div>
                            <div className="space-y-1"><Label className="text-xs">Trim end (s)</Label><Input type="number" step={0.1} value={(rawNode.data as { endAt?: number })?.endAt ?? ""} onChange={(e) => updateData({ endAt: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-8" disabled={isLocked} placeholder="—" /></div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="effects" className="mt-2 min-w-0 overflow-hidden">
              <ScrollArea className="h-[60vh] pr-2 min-w-0">
                <div className="space-y-3 pb-4 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium text-muted-foreground">Effects</h4>
                    <Select
                      value={addEffectSelectValue}
                      onValueChange={(v) => {
                        if (v && v !== "__add_effect_placeholder__") {
                          addEffect(v);
                          setAddEffectSelectValue("__add_effect_placeholder__");
                        }
                      }}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="Add effect..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__add_effect_placeholder__">Add effect...</SelectItem>
                        {registeredEffects.map(({ id, displayName }) => (
                          <SelectItem key={id} value={id}>{displayName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {effectsList.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No effects. Use &quot;Add effect...&quot; to add one.</div>
                  ) : (
                    <div className="space-y-3">
                      {effectsList.map((eff, index) => {
                        const e = typeof eff === "object" && eff !== null ? eff as { id?: string; componentId?: string; data?: Record<string, unknown> } : null;
                        if (!e) return null;
                        const compId = e.componentId ?? "generic";
                        return (
                          <div key={e.id ?? index} className="rounded-md border p-2 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-xs text-muted-foreground shrink-0">Type</Label>
                              <Select value={compId} onValueChange={(v) => updateEffectType(index, v)} disabled={isLocked}>
                                <SelectTrigger className="h-8 flex-1 min-w-0 max-w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {registeredEffects.map(({ id, displayName: name }) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEffect(index)} disabled={isLocked} title="Remove effect">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {compId === "generic" && (
                              <GenericEffectEditor
                                value={(e.data ?? {}) as Parameters<typeof GenericEffectEditor>[0]["value"]}
                                onChange={(data) => updateEffect(index, data)}
                                disabled={isLocked}
                              />
                            )}
                            {compId !== "generic" && (
                              <div className="text-xs text-muted-foreground">Edit in JSON or add a dedicated editor.</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
        {isMulti && (
          <MultiLayerProps
            selectedLayers={selectedLayers}
            mergedChildren={mergedChildren}
            setOverride={setOverride}
            disabled={hasLockedSelected}
          />
        )}
      </div>
    </ScrollArea>
  );
}
