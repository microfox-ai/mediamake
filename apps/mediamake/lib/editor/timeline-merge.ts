/**
 * 3-way merge for timelines (preset + action level).
 *
 * Given the common base (the last state the local user synced with the server),
 * the local edited timeline, and the remote/team timeline (which advanced via
 * someone else's publish), this auto-merges non-conflicting preset/action changes
 * and surfaces conflicts (the same item changed differently on both sides) for the
 * user to resolve — so no one's work is silently lost.
 */
import type { Timeline } from "@/components/editor_main/stores/project-store";

type AnyPreset = NonNullable<Timeline["presets"]>[number];
type AnyAction = NonNullable<Timeline["actions"]>[number];

export type MergeSide = "mine" | "theirs";

export interface TimelineConflict {
  /** Preset/action id, or "config" / "defaultData". */
  id: string;
  kind: "preset" | "action" | "config" | "defaultData";
  label: string;
  mineSummary: string;
  theirsSummary: string;
}

export interface TimelineMergeResult {
  /** Conflicts requiring a user choice. */
  conflicts: TimelineConflict[];
  /** Human summaries of changes auto-merged with no conflict. */
  autoMerged: string[];
  /** Build the final merged timeline from the user's per-conflict choices. */
  build: (choices: Record<string, MergeSide>) => Timeline;
}

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function presetLabel(p: AnyPreset | undefined, id: string): string {
  return p?.label || p?.presetId || id;
}

function actionLabel(a: AnyAction | undefined, id: string): string {
  return a?.label || a?.actionId || id;
}

/**
 * @param base   the timeline the local user's edits diverged from (last synced)
 * @param local  the local user's current edited timeline
 * @param remote the latest team/published timeline
 */
export function mergeTimelines(
  base: Timeline | null | undefined,
  local: Timeline,
  remote: Timeline
): TimelineMergeResult {
  const basePresets = base?.presets ?? [];
  const localPresets = local.presets ?? [];
  const remotePresets = remote.presets ?? [];

  const baseById = new Map(basePresets.map((p) => [p.id, p]));
  const localById = new Map(localPresets.map((p) => [p.id, p]));
  const remoteById = new Map(remotePresets.map((p) => [p.id, p]));

  const allIds = new Set<string>([
    ...basePresets.map((p) => p.id),
    ...localPresets.map((p) => p.id),
    ...remotePresets.map((p) => p.id),
  ]);

  const conflicts: TimelineConflict[] = [];
  const autoMerged: string[] = [];
  /** id → resolution kind for the build step. */
  type Resolution =
    | { type: "value"; preset: AnyPreset }
    | { type: "remove" }
    | { type: "conflict" };
  const resolutions = new Map<string, Resolution>();

  for (const id of allIds) {
    const b = baseById.get(id);
    const l = localById.get(id);
    const r = remoteById.get(id);

    const localChanged = !eq(b, l); // includes add (b undefined) / remove (l undefined)
    const remoteChanged = !eq(b, r);

    if (!localChanged && !remoteChanged) {
      // Untouched by both → keep as-is (use remote, == base).
      if (r) resolutions.set(id, { type: "value", preset: r });
      else resolutions.set(id, { type: "remove" });
      continue;
    }
    if (localChanged && !remoteChanged) {
      if (l) {
        resolutions.set(id, { type: "value", preset: l });
        autoMerged.push(`You: ${b ? "edited" : "added"} "${presetLabel(l, id)}"`);
      } else {
        resolutions.set(id, { type: "remove" });
        autoMerged.push(`You: removed "${presetLabel(b, id)}"`);
      }
      continue;
    }
    if (!localChanged && remoteChanged) {
      if (r) {
        resolutions.set(id, { type: "value", preset: r });
        autoMerged.push(`Teammate: ${b ? "edited" : "added"} "${presetLabel(r, id)}"`);
      } else {
        resolutions.set(id, { type: "remove" });
        autoMerged.push(`Teammate: removed "${presetLabel(b, id)}"`);
      }
      continue;
    }
    // Both changed
    if (eq(l, r)) {
      // Same resulting value → no conflict.
      if (l) resolutions.set(id, { type: "value", preset: l });
      else resolutions.set(id, { type: "remove" });
      continue;
    }
    // Genuine conflict.
    resolutions.set(id, { type: "conflict" });
    const fieldCount = (p: AnyPreset | undefined) =>
      p?.presetInputData ? Object.keys(p.presetInputData).length : 0;
    conflicts.push({
      id,
      kind: "preset",
      label: presetLabel(l ?? r, id),
      mineSummary: l ? `${b ? "edited" : "added"} · ${fieldCount(l)} field(s)` : "removed by you",
      theirsSummary: r ? `${b ? "edited" : "added"} · ${fieldCount(r)} field(s)` : "removed by teammate",
    });
  }

  // Actions (same 3-way pattern, keyed by action id)
  const baseActions = base?.actions ?? [];
  const localActions = local.actions ?? [];
  const remoteActions = remote.actions ?? [];
  const baseActionsById = new Map(baseActions.map((a) => [a.id, a]));
  const localActionsById = new Map(localActions.map((a) => [a.id, a]));
  const remoteActionsById = new Map(remoteActions.map((a) => [a.id, a]));
  const allActionIds = new Set<string>([
    ...baseActions.map((a) => a.id),
    ...localActions.map((a) => a.id),
    ...remoteActions.map((a) => a.id),
  ]);

  type ActionResolution =
    | { type: "value"; action: AnyAction }
    | { type: "remove" }
    | { type: "conflict" };
  const actionResolutions = new Map<string, ActionResolution>();

  for (const id of allActionIds) {
    const b = baseActionsById.get(id);
    const l = localActionsById.get(id);
    const r = remoteActionsById.get(id);
    const localChanged = !eq(b, l);
    const remoteChanged = !eq(b, r);

    if (!localChanged && !remoteChanged) {
      if (r) actionResolutions.set(id, { type: "value", action: r });
      else actionResolutions.set(id, { type: "remove" });
      continue;
    }
    if (localChanged && !remoteChanged) {
      if (l) {
        actionResolutions.set(id, { type: "value", action: l });
        autoMerged.push(`You: ${b ? "edited" : "added"} action "${actionLabel(l, id)}"`);
      } else {
        actionResolutions.set(id, { type: "remove" });
        autoMerged.push(`You: removed action "${actionLabel(b, id)}"`);
      }
      continue;
    }
    if (!localChanged && remoteChanged) {
      if (r) {
        actionResolutions.set(id, { type: "value", action: r });
        autoMerged.push(`Teammate: ${b ? "edited" : "added"} action "${actionLabel(r, id)}"`);
      } else {
        actionResolutions.set(id, { type: "remove" });
        autoMerged.push(`Teammate: removed action "${actionLabel(b, id)}"`);
      }
      continue;
    }
    if (eq(l, r)) {
      if (l) actionResolutions.set(id, { type: "value", action: l });
      else actionResolutions.set(id, { type: "remove" });
      continue;
    }
    actionResolutions.set(id, { type: "conflict" });
    conflicts.push({
      id: `action:${id}`,
      kind: "action",
      label: actionLabel(l ?? r, id),
      mineSummary: l ? (b ? "edited by you" : "added by you") : "removed by you",
      theirsSummary: r ? (b ? "edited by teammate" : "added by teammate") : "removed by teammate",
    });
  }

  // Config / defaultData merges
  const configConflict = mergeScalar(
    base?.configuration, local.configuration, remote.configuration
  );
  if (configConflict.conflict) {
    conflicts.push({
      id: "config", kind: "config", label: "Configuration",
      mineSummary: "your settings", theirsSummary: "teammate's settings",
    });
  } else if (configConflict.changedSummary) {
    autoMerged.push(configConflict.changedSummary);
  }

  const defaultConflict = mergeScalar(
    base?.defaultData, local.defaultData, remote.defaultData
  );
  if (defaultConflict.conflict) {
    conflicts.push({
      id: "defaultData", kind: "defaultData", label: "Default data",
      mineSummary: "your data", theirsSummary: "teammate's data",
    });
  } else if (defaultConflict.changedSummary) {
    autoMerged.push(defaultConflict.changedSummary);
  }

  const build = (choices: Record<string, MergeSide>): Timeline => {
    // Resolve presets in a stable order: local order first, then remote-only.
    const orderedIds: string[] = [];
    for (const p of localPresets) if (allIds.has(p.id)) orderedIds.push(p.id);
    for (const p of remotePresets) if (!orderedIds.includes(p.id)) orderedIds.push(p.id);
    for (const p of basePresets) if (!orderedIds.includes(p.id)) orderedIds.push(p.id);

    const mergedPresets: AnyPreset[] = [];
    for (const id of orderedIds) {
      const res = resolutions.get(id);
      if (!res) continue;
      if (res.type === "remove") continue;
      if (res.type === "value") {
        mergedPresets.push(res.preset);
        continue;
      }
      // conflict → pick side
      const side = choices[id] ?? "mine";
      const chosen = side === "theirs" ? remoteById.get(id) : localById.get(id);
      if (chosen) mergedPresets.push(chosen);
      // if chosen is undefined (that side removed it) → drop
    }

    const orderedActionIds: string[] = [];
    for (const a of localActions) if (allActionIds.has(a.id)) orderedActionIds.push(a.id);
    for (const a of remoteActions) if (!orderedActionIds.includes(a.id)) orderedActionIds.push(a.id);
    for (const a of baseActions) if (!orderedActionIds.includes(a.id)) orderedActionIds.push(a.id);

    const mergedActions: AnyAction[] = [];
    for (const id of orderedActionIds) {
      const res = actionResolutions.get(id);
      if (!res) continue;
      if (res.type === "remove") continue;
      if (res.type === "value") {
        mergedActions.push(res.action);
        continue;
      }
      const side = choices[`action:${id}`] ?? "mine";
      const chosen = side === "theirs" ? remoteActionsById.get(id) : localActionsById.get(id);
      if (chosen) mergedActions.push(chosen);
    }

    const pickConfig = () => {
      if (configConflict.conflict) {
        return (choices["config"] ?? "mine") === "theirs"
          ? remote.configuration
          : local.configuration;
      }
      return configConflict.value;
    };
    const pickDefault = () => {
      if (defaultConflict.conflict) {
        return (choices["defaultData"] ?? "mine") === "theirs"
          ? remote.defaultData
          : local.defaultData;
      }
      return defaultConflict.value;
    };

    // Start from remote (latest server doc) to inherit its version/lastClientId,
    // then overlay the merged content. The caller publishes with remote.version.
    return {
      ...remote,
      displayName: local.displayName ?? remote.displayName,
      description: local.description ?? remote.description,
      presets: mergedPresets,
      actions: mergedActions,
      configuration: pickConfig(),
      defaultData: pickDefault(),
    };
  };

  return { conflicts, autoMerged, build };
}

function mergeScalar(
  base: unknown,
  local: unknown,
  remote: unknown
): { conflict: boolean; value: unknown; changedSummary?: string } {
  const localChanged = !eq(base, local);
  const remoteChanged = !eq(base, remote);
  if (!localChanged && !remoteChanged) return { conflict: false, value: remote };
  if (localChanged && !remoteChanged) return { conflict: false, value: local, changedSummary: "You: configuration/data" };
  if (!localChanged && remoteChanged) return { conflict: false, value: remote, changedSummary: "Teammate: configuration/data" };
  if (eq(local, remote)) return { conflict: false, value: local };
  return { conflict: true, value: local };
}
