/**
 * Mediamake has stored timelines in three shapes over time. Skills that learn
 * from saved work need to tell them apart, so every timeline this server
 * returns carries a `format` field:
 *
 * - `legacy-preset-data`: the oldest shape, a document in the `presetData`
 *   collection (`/api/preset-data`) with `presetData.presets` and
 *   `presetData.defaultData`. Deprecated. The editor can import one into a
 *   project (`create_timeline` with `legacyId`).
 * - `flat`: a document in `timelines` with a flat `presets` array and no
 *   `nodes`. The editor derives one root scene from `presets` on load.
 * - `tree`: the current shape. `nodes` holds the preset instance tree
 *   (scenes, tracks, modifiers, with explicit timing), and `presets` holds the
 *   input data for each instance.
 */

export type TimelineFormat = 'legacy-preset-data' | 'flat' | 'tree';

/** Presets that still render but have a replacement (see deprecated-presets.ts in the app). */
export const DEPRECATED_PRESET_IDS: Record<string, string> = {
  'text-overlay': 'text-atom',
};

const SCENE_PRESET_IDS = new Set(['base-scene', 'scene']);
const MODIFIER_TYPES = new Set(['data', 'context', 'effects']);

type AnyRecord = Record<string, any>;

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function detectTimelineFormat(doc: unknown): TimelineFormat {
  if (
    isRecord(doc) &&
    isRecord(doc.presetData) &&
    !Array.isArray(doc.presets)
  ) {
    return 'legacy-preset-data';
  }
  if (
    isRecord(doc) &&
    isRecord(doc.nodes) &&
    typeof doc.nodes.id === 'string'
  ) {
    return 'tree';
  }
  return 'flat';
}

/** Normalises any of the three shapes to { presets, defaultData, configuration, nodes }. */
export function timelineParts(doc: AnyRecord) {
  const format = detectTimelineFormat(doc);
  if (format === 'legacy-preset-data') {
    return {
      format,
      presets: (doc.presetData?.presets ?? []) as AnyRecord[],
      defaultData: doc.presetData?.defaultData as AnyRecord | undefined,
      configuration: undefined as AnyRecord | undefined,
      nodes: undefined as AnyRecord | undefined,
    };
  }
  return {
    format,
    presets: (Array.isArray(doc.presets) ? doc.presets : []) as AnyRecord[],
    defaultData: doc.defaultData as AnyRecord | undefined,
    configuration: doc.configuration as AnyRecord | undefined,
    nodes: (format === 'tree' ? doc.nodes : undefined) as AnyRecord | undefined,
  };
}

function trackName(preset: AnyRecord): string | undefined {
  const input = preset.presetInputData;
  if (isRecord(input) && typeof input.trackName === 'string' && input.trackName)
    return input.trackName;
  return typeof preset.label === 'string' ? preset.label : undefined;
}

function role(
  presetId: string,
  presetType?: string,
): 'scene' | 'track' | 'modifier' {
  if (SCENE_PRESET_IDS.has(presetId)) return 'scene';
  if (presetType && MODIFIER_TYPES.has(presetType)) return 'modifier';
  return 'track';
}

function describeValue(value: unknown): string {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return 'null';
  return typeof value;
}

function outlineNode(
  node: AnyRecord,
  depth: number,
  maxDepth: number,
): AnyRecord {
  const out: AnyRecord = {
    id: node.id,
    presetId: node.presetId,
    name: node.name,
    role: node.role,
    timing: node.timing,
  };
  if (node.arrangement) out.arrangement = node.arrangement;
  if (node.disabled) out.disabled = true;
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length > 0) {
    out.children =
      depth >= maxDepth
        ? `${children.length} children (raise maxDepth to see them)`
        : children.map((c: AnyRecord) => outlineNode(c, depth + 1, maxDepth));
  }
  return out;
}

/**
 * A compact description of a timeline: what it is built from, without the
 * (often multi-megabyte) caption arrays and embedded preset code.
 */
export function summarizeTimeline(
  doc: AnyRecord,
  options: { maxDepth?: number } = {},
) {
  const { format, presets, defaultData, configuration, nodes } =
    timelineParts(doc);

  const references = Array.isArray(defaultData?.references)
    ? defaultData!.references.map((ref: AnyRecord) => ({
        key: ref.key,
        type: ref.type,
        value: describeValue(ref.value),
      }))
    : [];

  const presetCounts: Record<string, number> = {};
  const deprecatedPresets = new Set<string>();
  const presetSummaries = presets.map((preset, index) => {
    const presetId = String(preset.presetId ?? '');
    presetCounts[presetId] = (presetCounts[presetId] ?? 0) + 1;
    if (DEPRECATED_PRESET_IDS[presetId]) deprecatedPresets.add(presetId);
    const input = isRecord(preset.presetInputData)
      ? preset.presetInputData
      : {};
    return {
      id: preset.id ?? `${presetId}-${index}`,
      presetId,
      presetType: preset.presetType,
      role: role(presetId, preset.presetType),
      trackName: trackName(preset),
      disabled: !!preset.disabled,
      title: preset.presetInfo?.metadata?.title,
      inputKeys: Object.fromEntries(
        Object.entries(input).map(([k, v]) => [k, describeValue(v)]),
      ),
    };
  });

  const warnings: string[] = [];
  if (format === 'legacy-preset-data') {
    warnings.push(
      'Legacy presetData timeline (oldest format, deprecated). Learn from it with care.',
    );
  }
  if (format === 'flat') {
    warnings.push(
      'Flat timeline (no nodes tree). The editor derives one root scene from presets on load.',
    );
  }
  for (const id of deprecatedPresets) {
    warnings.push(
      `Uses deprecated preset "${id}"; its replacement is "${DEPRECATED_PRESET_IDS[id]}".`,
    );
  }
  if (
    presets.some(
      p =>
        typeof p.label === 'string' &&
        !(isRecord(p.presetInputData) && p.presetInputData.trackName),
    )
  ) {
    warnings.push(
      'Some presets use the legacy `label` field instead of presetInputData.trackName.',
    );
  }

  return {
    id: doc.id ?? doc._id?.toString?.() ?? doc._id,
    projectId: doc.projectId,
    displayName: doc.displayName ?? doc.name,
    description: doc.description,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    version: doc.version,
    format,
    warnings,
    configuration: configuration?.config ?? configuration,
    references,
    presetCounts,
    presets: presetSummaries,
    actions: Array.isArray(doc.actions) ? doc.actions.length : 0,
    tree: nodes ? outlineNode(nodes, 0, options.maxDepth ?? 6) : undefined,
  };
}

/**
 * The full timeline with the heavy, rarely-useful parts removed:
 * `presetInfo.presetFunction` (stringified preset code, often 50KB+ per
 * instance) unless asked for, and long arrays truncated when `maxArrayItems`
 * is set.
 */
export function stripTimeline(
  doc: AnyRecord,
  options: { includePresetCode?: boolean; maxArrayItems?: number } = {},
): AnyRecord {
  const { includePresetCode = false, maxArrayItems } = options;

  const walk = (value: unknown, key?: string): unknown => {
    if (Array.isArray(value)) {
      const items =
        maxArrayItems && value.length > maxArrayItems
          ? value.slice(0, maxArrayItems)
          : value;
      const mapped = items.map(v => walk(v));
      if (items.length < value.length) {
        mapped.push(
          `… ${value.length - items.length} more items (raise maxArrayItems to see them)`,
        );
      }
      return mapped;
    }
    if (isRecord(value)) {
      const out: AnyRecord = {};
      for (const [k, v] of Object.entries(value)) {
        if (
          !includePresetCode &&
          key === 'presetInfo' &&
          (k === 'presetFunction' || k === 'presetParams')
        ) {
          out[k] = '[omitted: pass includePresetCode=true]';
          continue;
        }
        out[k] = walk(v, k);
      }
      return out;
    }
    return value;
  };

  return { format: detectTimelineFormat(doc), ...(walk(doc) as AnyRecord) };
}
