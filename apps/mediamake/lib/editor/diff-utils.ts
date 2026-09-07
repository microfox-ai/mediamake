/**
 * Shared diff helpers for the history panels — produces detailed, leaf-level
 * field changes for both layer overrides and timeline preset edits.
 */
import type { Timeline } from "@/components/editor_main/stores/project-store";

export interface LeafDiff {
  /** Dotted path to the changed leaf, e.g. "data.style.color" or "boundaries.left". */
  path: string;
  before: unknown;
  after: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Recursively compare two values and collect every changed leaf with its full
 * before/after value (no truncation here — formatting happens at render time).
 */
export function deepDiff(
  before: unknown,
  after: unknown,
  path = "",
  out: LeafDiff[] = []
): LeafDiff[] {
  if (before === after) return out;

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const k of keys) {
      deepDiff(before[k], after[k], path ? `${path}.${k}` : k, out);
    }
    return out;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    if (JSON.stringify(before) === JSON.stringify(after)) return out;
    const len = Math.max(before.length, after.length);
    if (len <= 16) {
      for (let i = 0; i < len; i++) {
        deepDiff(before[i], after[i], `${path}[${i}]`, out);
      }
    } else {
      out.push({ path: path || "(root)", before, after });
    }
    return out;
  }

  // Mixed types or primitives
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    out.push({ path: path || "(root)", before, after });
  }
  return out;
}

/** Human-readable value for a diff cell. Longer cap than the old 24-char clip. */
export function formatDiffValue(v: unknown, max = 140): string {
  if (v === undefined) return "∅";
  if (v === null) return "null";
  if (typeof v === "string") {
    const s = v.length > max ? v.slice(0, max) + "…" : v;
    return `"${s}"`;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = JSON.stringify(v);
  if (s == null) return String(v);
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/** Strip the noisy leading segments so paths read cleanly (e.g. data.style.color → style.color). */
export function shortenPath(path: string): string {
  return path.replace(/^data\./, "").replace(/^context\./, "");
}

// ─── Timeline diffs ───────────────────────────────────────────────────────────

export type TimelineChangeType =
  | "preset-added"
  | "preset-removed"
  | "preset-modified"
  | "preset-renamed"
  | "preset-enabled"
  | "preset-disabled"
  | "preset-reordered"
  | "config"
  | "defaultData"
  | "meta";

export interface TimelineChangeDetail {
  type: TimelineChangeType;
  /** Preset label, or "Configuration" / "Default data" / "Timeline". */
  label: string;
  /** Leaf-level field changes (for modified presets / config). */
  fieldDiffs: LeafDiff[];
  /** One-line human summary including the field changes. */
  summary: string;
}

type AnyPreset = NonNullable<Timeline["presets"]>[number];

function presetLabel(p: AnyPreset): string {
  return p.label || p.presetId || p.id;
}

function joinFieldDiffs(diffs: LeafDiff[], maxFields = 6): string {
  const shown = diffs.slice(0, maxFields).map((d) => {
    return `${shortenPath(d.path)}: ${formatDiffValue(d.before, 40)} → ${formatDiffValue(d.after, 40)}`;
  });
  const extra = diffs.length - shown.length;
  return shown.join(", ") + (extra > 0 ? `, +${extra} more` : "");
}

/**
 * Produce a detailed, preset-aware diff between two timeline snapshots:
 * which presets were added / removed / reordered / toggled / renamed, and for
 * modified presets, exactly which input fields changed (old → new). Also diffs
 * configuration and default data.
 */
export function summarizeTimelineDiff(
  before: Timeline | null | undefined,
  after: Timeline | null | undefined
): TimelineChangeDetail[] {
  const details: TimelineChangeDetail[] = [];
  if (!after) return details;

  const beforePresets = before?.presets ?? [];
  const afterPresets = after.presets ?? [];
  const beforeById = new Map(beforePresets.map((p) => [p.id, p]));
  const afterById = new Map(afterPresets.map((p) => [p.id, p]));

  // Added / modified / renamed / toggled
  for (const ap of afterPresets) {
    const bp = beforeById.get(ap.id);
    if (!bp) {
      details.push({
        type: "preset-added",
        label: presetLabel(ap),
        fieldDiffs: [],
        summary: `Added "${presetLabel(ap)}"`,
      });
      continue;
    }
    if ((bp.label || "") !== (ap.label || "")) {
      details.push({
        type: "preset-renamed",
        label: presetLabel(ap),
        fieldDiffs: [],
        summary: `Renamed "${bp.label || bp.presetId}" → "${ap.label || ap.presetId}"`,
      });
    }
    if (!!bp.disabled !== !!ap.disabled) {
      details.push({
        type: ap.disabled ? "preset-disabled" : "preset-enabled",
        label: presetLabel(ap),
        fieldDiffs: [],
        summary: `${ap.disabled ? "Disabled" : "Enabled"} "${presetLabel(ap)}"`,
      });
    }
    const fieldDiffs = deepDiff(bp.presetInputData ?? {}, ap.presetInputData ?? {});
    if (fieldDiffs.length > 0) {
      details.push({
        type: "preset-modified",
        label: presetLabel(ap),
        fieldDiffs,
        summary: `${presetLabel(ap)} · ${joinFieldDiffs(fieldDiffs)}`,
      });
    }
  }

  // Removed
  for (const bp of beforePresets) {
    if (!afterById.has(bp.id)) {
      details.push({
        type: "preset-removed",
        label: presetLabel(bp),
        fieldDiffs: [],
        summary: `Removed "${presetLabel(bp)}"`,
      });
    }
  }

  // Reorder (only among presets present in both, ignore add/remove churn)
  const commonBefore = beforePresets.filter((p) => afterById.has(p.id)).map((p) => p.id);
  const commonAfter = afterPresets.filter((p) => beforeById.has(p.id)).map((p) => p.id);
  if (
    commonBefore.length === commonAfter.length &&
    commonBefore.length > 1 &&
    commonBefore.join("|") !== commonAfter.join("|")
  ) {
    details.push({
      type: "preset-reordered",
      label: "Presets",
      fieldDiffs: [],
      summary: `Reordered presets`,
    });
  }

  // Configuration
  const configDiffs = deepDiff(before?.configuration ?? {}, after.configuration ?? {});
  if (configDiffs.length > 0) {
    details.push({
      type: "config",
      label: "Configuration",
      fieldDiffs: configDiffs,
      summary: `Configuration · ${joinFieldDiffs(configDiffs)}`,
    });
  }

  // Default data
  const defaultDiffs = deepDiff(before?.defaultData ?? {}, after.defaultData ?? {});
  if (defaultDiffs.length > 0) {
    details.push({
      type: "defaultData",
      label: "Default data",
      fieldDiffs: defaultDiffs,
      summary: `Default data · ${joinFieldDiffs(defaultDiffs)}`,
    });
  }

  // Timeline meta (name / description)
  if ((before?.displayName ?? "") !== (after.displayName ?? "")) {
    details.push({
      type: "meta",
      label: "Timeline",
      fieldDiffs: [],
      summary: `Renamed timeline → "${after.displayName}"`,
    });
  }

  return details;
}
