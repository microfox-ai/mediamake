export type TrackTimingMode = "lockedTo" | "sequence" | "aligned" | "autoRange";

export function hasTrackShell(
  input: unknown,
): input is Record<string, unknown> & { trackType: unknown } {
  return Boolean(
    input &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      "trackType" in input,
  );
}

export function trackModeOf(value: Record<string, unknown>): TrackTimingMode {
  if (value.trackType === "lockedTo") return "lockedTo";
  if (typeof value.lock === "string" && value.lock.trim()) return "lockedTo";
  if (value.trackType === "sequence") return "sequence";
  if (value.trackType === "autoRange") return "autoRange";
  return "aligned";
}

/** Link, sequence, and parallel. Auto range stays in the track properties form. */
export function headerTrackMode(
  value: Record<string, unknown>,
): "lockedTo" | "sequence" | "aligned" | null {
  const mode = trackModeOf(value);
  if (mode === "autoRange") return null;
  return mode;
}

/**
 * Switch track type the same way the timing form does.
 * Sequence drops an authored duration. Anything except a lock clears `lock`.
 */
export function applyTrackMode(
  value: Record<string, unknown>,
  next: TrackTimingMode,
  lock?: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { ...value, trackType: next };
  if (next !== "lockedTo") {
    delete patch.lock;
  } else if (lock !== undefined) {
    if (lock.trim()) patch.lock = lock;
    else delete patch.lock;
  }
  if (next === "sequence") delete patch.duration;
  return patch;
}
