/**
 * Shared cleanup for track presets that used to store timing as
 * trackFitDurationTo, trackRange, trackStartOffset, and trackDuration.
 * Preset execution stays inline — these helpers only run in the editor.
 */

export type TrackTimingMode = "lockedTo" | "sequence" | "aligned";

export function clockToSeconds(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (text.includes(":")) {
    const parts = text.split(":");
    if (parts.length !== 2 && parts.length !== 3) return null;
    const nums = parts.map((part) => Number(part));
    if (nums.some((num) => Number.isNaN(num))) return null;
    if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
    return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  }
  const plain = Number(text);
  return Number.isNaN(plain) ? null : plain;
}

export function clockRange(range: string): { start: number; duration: number } | null {
  const dash = range.indexOf("-", 1);
  if (dash <= 0) return null;
  const start = clockToSeconds(range.slice(0, dash));
  const end = clockToSeconds(range.slice(dash + 1));
  if (start === null || end === null || !(end > start)) return null;
  return { start, duration: end - start };
}

/** Join a legacy ranges array, or return a range string as-is. */
export function joinRangeList(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .join(",");
}

/**
 * Copy legacy track fields onto lock / start / duration / trackType.
 * Mutates `next` and reports whether anything moved.
 */
export function applyLegacyTrackTiming(
  next: Record<string, unknown>,
  defaultTrackType: TrackTimingMode,
): boolean {
  let changed = false;

  const fit = next.trackFitDurationTo;
  if (typeof fit === "string" && fit.trim() && typeof next.lock !== "string") {
    next.lock = fit.trim();
    changed = true;
  }
  if ("trackFitDurationTo" in next) {
    delete next.trackFitDurationTo;
    changed = true;
  }

  if (typeof next.trackRange === "string" && next.trackRange.trim()) {
    const parsed = clockRange(next.trackRange);
    if (parsed) {
      if (typeof next.start !== "number") next.start = parsed.start;
      if (typeof next.duration !== "number") next.duration = parsed.duration;
    }
    delete next.trackRange;
    changed = true;
  } else if ("trackRange" in next) {
    delete next.trackRange;
    changed = true;
  }

  if (typeof next.start !== "number" && typeof next.trackStartOffset === "number") {
    next.start = next.trackStartOffset;
    changed = true;
  }
  if ("trackStartOffset" in next) {
    delete next.trackStartOffset;
    changed = true;
  }

  if (
    typeof next.duration !== "number" &&
    typeof next.trackDuration === "number" &&
    next.trackDuration > 0
  ) {
    next.duration = next.trackDuration;
    changed = true;
  }
  if ("trackDuration" in next) {
    delete next.trackDuration;
    changed = true;
  }

  if (typeof next.trackType !== "string") {
    const lock = typeof next.lock === "string" ? next.lock.trim() : "";
    next.trackType = lock ? "lockedTo" : defaultTrackType;
    changed = true;
  }

  return changed;
}
