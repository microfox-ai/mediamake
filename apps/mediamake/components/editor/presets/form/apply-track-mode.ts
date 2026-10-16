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
 * `dropDuration` also removes duration when locking. The base scene uses that,
 * because lock and sequence have no authored length.
 */
export function applyTrackMode(
  value: Record<string, unknown>,
  next: TrackTimingMode,
  lock?: string,
  options?: { dropDuration?: boolean },
): Record<string, unknown> {
  const patch: Record<string, unknown> = { ...value, trackType: next };
  if (next !== "lockedTo") {
    delete patch.lock;
  } else if (lock !== undefined) {
    if (lock.trim()) patch.lock = lock;
    else delete patch.lock;
  }
  if (next === "sequence" || (options?.dropDuration && next === "lockedTo")) {
    delete patch.duration;
  }
  return patch;
}

/**
 * A child added under a locked scene uses that scene's lock.
 * Sequence and aligned parents leave the child's track type alone.
 */
export function inheritParentLock(
  childInput: unknown,
  parentInput: unknown,
): Record<string, unknown> {
  const child =
    childInput && typeof childInput === "object" && !Array.isArray(childInput)
      ? { ...(childInput as Record<string, unknown>) }
      : {};
  if (!parentInput || typeof parentInput !== "object" || Array.isArray(parentInput)) {
    return child;
  }
  const parent = parentInput as Record<string, unknown>;
  if (trackModeOf(parent) !== "lockedTo") return child;
  const lock = typeof parent.lock === "string" ? parent.lock.trim() : "";
  const next = applyTrackMode(child, "lockedTo", lock || undefined);
  if (!lock) delete next.lock;
  return next;
}
