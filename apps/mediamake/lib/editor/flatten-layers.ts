import type {
  RenderableComponentData,
  CalculatedBoundaries,
  CalculatedTiming,
  RenderableContext,
} from "@microfox/remotion";

/** Absolute timing for the editor (composition space). Used when passing parent timing into flattenLayers. */
export interface ParentTimingOption {
  start?: number;
  duration?: number;
  startInFrames?: number;
  durationInFrames?: number;
}

export interface FlatLayer {
  id: string;
  componentId: string;
  type: string;
  boundaries: CalculatedBoundaries;
  timing: CalculatedTiming & { startInFrames?: number; durationInFrames?: number };
  depth: number;
  parentIds: string[];
  label: string;
  /** Set during generateOutput when preset item id is passed */
  _presetItemId?: string;
  /** Text content for TextAtom (left sidebar preview + right sidebar content) */
  previewText?: string;
  /** Media URL for ImageAtom/VideoAtom (left sidebar thumbnail + right sidebar content) */
  previewSrc?: string;
}

/**
 * Parse a CSS length (e.g. "5%", "10px") relative to a parent size.
 */
function parseStyleLength(
  value: string | number | undefined,
  parentSize: number,
  compositionSize: number
): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  const s = String(value).trim();
  if (!s) return 0;
  if (s.endsWith("%")) {
    const pct = parseFloat(s) / 100;
    return parentSize * pct;
  }
  if (s.endsWith("px")) return parseFloat(s) || 0;
  return parseFloat(s) || 0;
}

/**
 * Resolve boundaries for a node (context takes precedence over data.boundaries).
 * When the node has no explicit boundaries but has data.containerProps.style with
 * position absolute and top/left/right/bottom, compute pixel bounds from parent.
 */
function getBoundaries(
  node: RenderableComponentData,
  parentBounds?: CalculatedBoundaries,
  compositionWidth: number = 1920,
  compositionHeight: number = 1080
): CalculatedBoundaries {
  const fromContext = (node.context as RenderableContext)?.boundaries;
  const fromData = node.data?.boundaries as
    | { left?: number; top?: number; width?: number; height?: number; right?: number; bottom?: number; zIndex?: number }
    | undefined;
  const bounds = fromContext || fromData;
  if (
    bounds &&
    typeof bounds.left === "number" &&
    typeof bounds.top === "number" &&
    typeof bounds.width === "number" &&
    typeof bounds.height === "number"
  ) {
    return {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      right: bounds.right as number | undefined,
      bottom: bounds.bottom as number | undefined,
      zIndex: (bounds.zIndex as number) ?? 0,
    };
  }

  const containerStyle = (node.data as { containerProps?: { style?: Record<string, unknown> } })?.containerProps?.style;
  const position = containerStyle?.position as string | undefined;
  const hasAbsolute = position === "absolute" || position === "fixed";
  const hasPositionKeys =
    containerStyle &&
    (containerStyle.top !== undefined ||
      containerStyle.left !== undefined ||
      containerStyle.right !== undefined ||
      containerStyle.bottom !== undefined);

  if (parentBounds && hasAbsolute && hasPositionKeys) {
    const pw = parentBounds.width ?? compositionWidth;
    const ph = parentBounds.height ?? compositionHeight;
    const pLeft = parentBounds.left ?? 0;
    const pTop = parentBounds.top ?? 0;

    const topRaw = containerStyle.top as string | number | undefined;
    const leftRaw = containerStyle.left as string | number | undefined;
    const rightRaw = containerStyle.right as string | number | undefined;
    const bottomRaw = containerStyle.bottom as string | number | undefined;
    const widthRaw = containerStyle.width as string | number | undefined;
    const heightRaw = containerStyle.height as string | number | undefined;

    const top = parseStyleLength(topRaw, ph, compositionHeight);
    const left = parseStyleLength(leftRaw, pw, compositionWidth);
    const right = parseStyleLength(rightRaw, pw, compositionWidth);
    const bottom = parseStyleLength(bottomRaw, ph, compositionHeight);

    const hasLeft = leftRaw !== undefined && leftRaw !== "";
    const hasRight = rightRaw !== undefined && rightRaw !== "";
    const hasTop = topRaw !== undefined && topRaw !== "";
    const hasBottom = bottomRaw !== undefined && bottomRaw !== "";
    const hasWidth = widthRaw !== undefined && widthRaw !== "";
    const hasHeight = heightRaw !== undefined && heightRaw !== "";

    let widthPx = hasLeft && hasRight ? pw - left - right : hasRight ? pw - right : hasLeft ? pw - left : pw;
    let heightPx = hasTop && hasBottom ? ph - top - bottom : hasBottom ? ph - bottom : hasTop ? ph - top : ph;
    if (hasWidth) widthPx = parseStyleLength(widthRaw, pw, compositionWidth);
    if (hasHeight) heightPx = parseStyleLength(heightRaw, ph, compositionHeight);

    const leftPx = hasLeft ? pLeft + left : pLeft + pw - widthPx - right;
    const topPx = hasTop ? pTop + top : pTop + ph - heightPx - bottom;

    return {
      left: leftPx,
      top: topPx,
      width: Math.max(0, widthPx),
      height: Math.max(0, heightPx),
      zIndex: (bounds?.zIndex as number) ?? parentBounds.zIndex ?? 0,
    };
  }

  if (parentBounds) {
    return {
      ...parentBounds,
      zIndex: (bounds?.zIndex as number) ?? parentBounds.zIndex ?? 0,
    };
  }
  return {
    left: 0,
    top: 0,
    width: compositionWidth,
    height: compositionHeight,
    zIndex: 0,
  };
}

/**
 * Resolve timing for a node. If parentTiming (absolute) is provided, treat node's
 * context.timing.start/duration as relative to parent and compute absolute start/duration.
 * Otherwise use node's timing as-is (root level).
 */
function getTiming(
  node: RenderableComponentData,
  fps: number = 30,
  parentTiming?: ParentTimingOption
): FlatLayer["timing"] {
  const ctx = node.context as RenderableContext | undefined;
  const timing = ctx?.timing || (node.data?.timing as { start?: number; duration?: number } | undefined);
  const relativeStartSec = timing?.start ?? 0;
  const relativeDurationSec = timing?.duration;

  if (parentTiming != null) {
    const parentStartSec = parentTiming.start ?? (parentTiming.startInFrames != null ? parentTiming.startInFrames / fps : 0);
    const parentDurationSec = parentTiming.duration ?? (parentTiming.durationInFrames != null ? parentTiming.durationInFrames / fps : 0);
    const absoluteStartSec = parentStartSec + relativeStartSec;
    const absoluteDurationSec = relativeDurationSec ?? parentDurationSec;
    const startInFrames = Math.round(absoluteStartSec * fps);
    const durationInFrames = Math.round(absoluteDurationSec * fps);
    return {
      start: absoluteStartSec,
      duration: absoluteDurationSec,
      startInFrames,
      durationInFrames,
    };
  }

  const startInFrames = (timing as { startInFrames?: number })?.startInFrames ?? Math.round(relativeStartSec * fps);
  const durationInFrames = (timing as { durationInFrames?: number })?.durationInFrames ?? (relativeDurationSec != null ? Math.round(relativeDurationSec * fps) : 0);
  return {
    start: relativeStartSec,
    duration: relativeDurationSec ?? durationInFrames / fps,
    startInFrames,
    durationInFrames,
  };
}

/**
 * Prefer a short readable segment of an id for layout/scene labels (e.g. "imageloop-track", "html-block-0").
 */
function readableLayerId(id: string): string {
  if (!id) return id;
  const parts = id.split("-");
  if (parts.length <= 2) return id;
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  if (/^\d+$/.test(last)) return `${secondLast}-${last}`;
  return last || id;
}

// ---------------------------------------------------------------------------
// ID deduplication
// ---------------------------------------------------------------------------

/**
 * Update effect targetIds using a local remap of old→new IDs.
 */
function remapEffectTargetIds(
  effects: RenderableComponentData["effects"],
  remap: Map<string, string>
): RenderableComponentData["effects"] {
  if (!effects?.length || remap.size === 0) return effects;
  return effects.map((effect) => {
    if (typeof effect === "string") return effect;
    const targetIds = (effect.data as Record<string, unknown> | undefined)?.targetIds;
    if (!Array.isArray(targetIds)) return effect;
    const updated = targetIds.map((id: unknown) =>
      typeof id === "string" ? (remap.get(id) ?? id) : id
    );
    if (updated.every((v, i) => v === (targetIds as unknown[])[i])) return effect;
    return { ...effect, data: { ...(effect.data as object), targetIds: updated } };
  });
}

function _deduplicateRecursive(
  nodes: RenderableComponentData[],
  parentId: string | undefined,
  seen: Set<string>
): RenderableComponentData[] {
  // First pass: assign new IDs and build a sibling-local remap.
  const localRemap = new Map<string, string>();
  const assignments: Array<{ node: RenderableComponentData; newId: string }> = [];

  for (const node of nodes) {
    let newId = node.id;
    if (seen.has(node.id)) {
      const candidate = parentId ? `${node.id}-${parentId}` : node.id;
      newId = seen.has(candidate)
        ? `${candidate}-${Math.random().toString(36).slice(2, 6)}`
        : candidate;
      localRemap.set(node.id, newId);
    }
    seen.add(newId);
    assignments.push({ node, newId });
  }

  // Second pass: apply new IDs, patch effect targetIds, recurse into children.
  return assignments.map(({ node, newId }) => {
    const result: RenderableComponentData = {
      ...node,
      id: newId,
      ...(node.effects?.length
        ? { effects: remapEffectTargetIds(node.effects, localRemap) }
        : {}),
    };
    if (node.childrenData?.length) {
      result.childrenData = _deduplicateRecursive(node.childrenData, newId, seen);
    }
    return result;
  });
}

/**
 * Walk a childrenData tree and make every node ID globally unique.
 * Any node whose ID collides with an already-seen ID is renamed to
 * `${id}-${parentId}`. Effect targetIds within the same sibling group
 * are updated to match so animations keep targeting the correct nodes.
 *
 * This is called automatically at the root of flattenLayers, so no preset
 * or consumer code needs to ensure uniqueness manually.
 */
export function deduplicateNodeIds(
  childrenData: RenderableComponentData[]
): RenderableComponentData[] {
  if (!childrenData.length) return childrenData;
  return _deduplicateRecursive(childrenData, undefined, new Set<string>());
}

// ---------------------------------------------------------------------------

/**
 * Flatten childrenData tree into a list of layers with resolved absolute boundaries and timing.
 * Order follows timeline (preset order); each layer includes depth and parent path for display.
 * When parentTiming is provided, node's context.timing.start/duration are treated as relative to parent.
 */
export function flattenLayers(
  childrenData: RenderableComponentData[] | undefined,
  options: {
    fps?: number;
    compositionWidth?: number;
    compositionHeight?: number;
    parentBounds?: CalculatedBoundaries;
    parentIds?: string[];
    depth?: number;
    /** Absolute timing of the parent (for resolving child absolute start/duration) */
    parentTiming?: ParentTimingOption;
  } = {}
): FlatLayer[] {
  const {
    fps = 30,
    compositionWidth = 1920,
    compositionHeight = 1080,
    parentBounds,
    parentIds = [],
    depth = 0,
    parentTiming,
  } = options;

  // At the root call, normalise all node IDs so duplicate IDs produced by any
  // preset are made globally unique before we build the flat list.
  const data = depth === 0
    ? deduplicateNodeIds(childrenData ?? [])
    : childrenData;

  if (!data || data.length === 0) return [];

  const result: FlatLayer[] = [];

  for (const node of data) {
    const boundaries = getBoundaries(
      node,
      parentBounds,
      compositionWidth,
      compositionHeight
    );
    const timing = getTiming(node, fps, parentTiming);
    const presetItemId = (node as RenderableComponentData & { _presetItemId?: string })._presetItemId;
    const explicitLabel = (node as RenderableComponentData & { label?: string }).label;
    const label = explicitLabel
      ? explicitLabel
      : node.type === "layout" || node.type === "scene"
        ? readableLayerId(node.id) || node.componentId || node.id
        : node.componentId || node.id;

    const previewText = node.componentId === "TextAtom" ? (node.data?.text as string | undefined) : undefined;
    const previewSrc = (node.componentId === "ImageAtom" || node.componentId === "VideoAtom") ? (node.data?.src as string | undefined) : undefined;

    result.push({
      id: node.id,
      componentId: node.componentId,
      type: node.type,
      boundaries,
      timing,
      depth,
      parentIds: [...parentIds],
      label,
      ...(presetItemId && { _presetItemId: presetItemId }),
      ...(previewText != null && { previewText }),
      ...(previewSrc != null && { previewSrc }),
    });

    const nextParentTiming: ParentTimingOption = {
      start: timing.start,
      duration: timing.duration,
      startInFrames: timing.startInFrames,
      durationInFrames: timing.durationInFrames,
    };

    if (node.childrenData && node.childrenData.length > 0) {
      result.push(
        ...flattenLayers(node.childrenData, {
          fps,
          compositionWidth,
          compositionHeight,
          parentBounds: boundaries,
          parentIds: [...parentIds, node.id],
          depth: depth + 1,
          parentTiming: nextParentTiming,
        })
      );
    }
  }

  return result;
}

/** Only these are excluded; all other nodes (layouts, scenes, Image/Video/Text atoms) are layers. */
const IGNORED_FOR_EDIT = new Set<string>([
  "BaseScene",
  "audio-track",
]);

/**
 * Whether this layer should appear on the timeline bar and be editable in preview.
 * Excludes base scene layers.
 */
export function isEditableOutputLayer(layer: FlatLayer): boolean {
  if (IGNORED_FOR_EDIT.has(layer.componentId) || IGNORED_FOR_EDIT.has(layer.id)) {
    return false;
  }
  return true;
}

/**
 * Filter layers to only editable output layers (excludes audio, base scene).
 */
export function filterEditableLayers(layers: FlatLayer[]): FlatLayer[] {
  return layers.filter(isEditableOutputLayer);
}

/**
 * Tree node structure for nested layer display.
 */
export interface LayerTreeNode extends FlatLayer {
  children: LayerTreeNode[];
}

/**
 * Build a tree structure from flattened layers, preserving parent-child relationships.
 *
 * Uses full ancestor-path keys (parentIds.join('/') + '/' + id) so nodes with
 * duplicate IDs across different subtrees (e.g. "part-0" appearing under every
 * caption) each get their own slot and the correct timing/children.
 */
export function buildLayerTree(layers: FlatLayer[]): LayerTreeNode[] {
  // Create one TreeNode per flat-list entry (preserves duplicates).
  const nodes: LayerTreeNode[] = layers.map((layer) => ({ ...layer, children: [] }));

  // Map: canonical path key → index into `nodes`.
  // Key format: "grandparentId/.../parentId/nodeId"
  const pathToIndex = new Map<string, number>();
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const key = [...layer.parentIds, layer.id].join("/");
    // In the rare case of two identically-pathed layers, first one wins.
    if (!pathToIndex.has(key)) pathToIndex.set(key, i);
  }

  const roots: LayerTreeNode[] = [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.parentIds.length === 0) {
      roots.push(nodes[i]);
    } else {
      // Parent's path key is the child's parentIds joined (without the child's own id).
      const parentKey = layer.parentIds.join("/");
      const parentIndex = pathToIndex.get(parentKey);
      if (parentIndex !== undefined) {
        nodes[parentIndex].children.push(nodes[i]);
      } else {
        // Parent was filtered out — surface this node as a root.
        roots.push(nodes[i]);
      }
    }
  }

  return roots;
}

/**
 * Filter layers to only leaf nodes (nodes without children).
 * Uses full ancestor-path keys to avoid false positives when duplicate node IDs
 * appear under different parents (e.g. "part-0" under every caption node).
 */
export function filterLeafLayers(layers: FlatLayer[]): FlatLayer[] {
  // Build the set of full paths that are known parents.
  const parentPaths = new Set<string>();
  for (const layer of layers) {
    if (layer.parentIds.length > 0) {
      // The parent's full path is layer.parentIds joined.
      parentPaths.add(layer.parentIds.join("/"));
    }
  }
  return layers.filter((layer) => {
    const layerPath = [...layer.parentIds, layer.id].join("/");
    return !parentPaths.has(layerPath);
  });
}

/**
 * Check if a layer is active at the given frame (0-based).
 */
export function isLayerActiveAtFrame(
  layer: FlatLayer,
  frame: number
): boolean {
  const start = layer.timing.startInFrames ?? 0;
  const duration = layer.timing.durationInFrames ?? 0;
  if (duration <= 0) return true;
  return frame >= start && frame < start + duration;
}
