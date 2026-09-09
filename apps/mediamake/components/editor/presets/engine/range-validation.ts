/**
 * Range-string validation helpers used to pause compile while ranges are
 * incomplete/invalid so the player does not error mid-edit.
 */
import { parseTimeRange, parseTimeToSeconds } from "./preset-stdlib";

const RANGE_LIKE_NAMES = new Set([
  "range",
  "rangestring",
  "trackrange",
  "timerange",
  "startend",
]);

function isRangeLikeName(name: string): boolean {
  const n = name.toLowerCase().replace(/[-_]/g, "");
  return (
    RANGE_LIKE_NAMES.has(n) ||
    n.endsWith("range") ||
    n.startsWith("rangestr")
  );
}

/**
 * Empty / whitespace = valid (means full duration).
 * Otherwise every comma-separated segment must parse as start-end with end >= start.
 */
export function isValidRangeString(range: unknown): boolean {
  if (range == null) return true;
  if (typeof range !== "string") return false;
  const trimmed = range.trim();
  if (!trimmed) return true;

  const segments = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return true;

  for (const seg of segments) {
    // Incomplete forms like "1:00-" or "-2:00" or "1:00"
    const dash = seg.indexOf("-", 1);
    if (dash <= 0) return false;
    const startRaw = seg.slice(0, dash).trim();
    const endRaw = seg.slice(dash + 1).trim();
    if (!startRaw || !endRaw) return false;
    if (parseTimeToSeconds(startRaw) === null) return false;
    if (parseTimeToSeconds(endRaw) === null) return false;
    const parsed = parseTimeRange(seg);
    if (!parsed) return false;
    if (parsed.end < parsed.start) return false;
  }
  return true;
}

function parseDataReferenceRange(value: string): string | null {
  const match = value.match(/^data:\[[^\]]+\](?:\[([^\]]*)\])?$/);
  if (!match) return null;
  return match[1] ?? "";
}

/** Walk preset/reference input data and return paths with invalid ranges. */
export function findInvalidRangePaths(
  input: unknown,
  path = "",
  fieldName = "",
): string[] {
  if (Array.isArray(input)) {
    return input.flatMap((item, i) =>
      findInvalidRangePaths(item, `${path}[${i}]`, fieldName),
    );
  }
  if (input && typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).flatMap(([k, v]) =>
      findInvalidRangePaths(v, path ? `${path}.${k}` : k, k),
    );
  }
  if (typeof input === "string" && input.length > 0) {
    const refRange = parseDataReferenceRange(input);
    if (refRange !== null) {
      return isValidRangeString(refRange) ? [] : [path || fieldName || "data-ref"];
    }
    if (isRangeLikeName(fieldName) && !isValidRangeString(input)) {
      return [path || fieldName];
    }
  }
  return [];
}

export function timelineHasInvalidRanges(timeline: {
  presets?: Array<{ presetInputData?: unknown; label?: string }> | null;
  defaultData?: { references?: Array<{ key?: string; value?: unknown }> } | null;
}): string[] {
  const invalid: string[] = [];
  for (const preset of timeline.presets || []) {
    const paths = findInvalidRangePaths(preset.presetInputData || {});
    for (const p of paths) {
      invalid.push(`${preset.label || "preset"}:${p}`);
    }
  }
  for (const ref of timeline.defaultData?.references || []) {
    const paths = findInvalidRangePaths(ref.value, ref.key || "ref", ref.key || "");
    for (const p of paths) {
      invalid.push(`ref:${p}`);
    }
  }
  return invalid;
}
