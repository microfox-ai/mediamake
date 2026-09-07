/**
 * 3-way merge for layer state (override / node level).
 *
 * base   = the layer state the local user synced from (last published / loaded)
 * local  = the local user's current layer state
 * remote = the latest team layer state (advanced by someone else's publish)
 *
 * Auto-merges layer edits made to DIFFERENT nodes, and surfaces conflicts only
 * when the same node was changed differently on both sides.
 */
import type { LayerStateSnapshot } from "@/components/editor_main/stores/layer-state-store";

export type MergeSide = "mine" | "theirs";

export interface LayerConflict {
  id: string;
  kind: "override" | "structure";
  label: string;
  mineSummary: string;
  theirsSummary: string;
}

export interface LayerMergeResult {
  conflicts: LayerConflict[];
  autoMerged: string[];
  build: (choices: Record<string, MergeSide>) => LayerStateSnapshot;
}

const STRUCTURE_ID = "__structure__";

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toMap(entries: [string, unknown][] | undefined): Map<string, unknown> {
  return new Map(entries ?? []);
}

export function mergeLayerSnapshots(
  base: LayerStateSnapshot | null | undefined,
  local: LayerStateSnapshot,
  remote: LayerStateSnapshot
): LayerMergeResult {
  const bO = toMap(base?.overrides);
  const lO = toMap(local.overrides);
  const rO = toMap(remote.overrides);

  const ids = new Set<string>([...bO.keys(), ...lO.keys(), ...rO.keys()]);

  const conflicts: LayerConflict[] = [];
  const autoMerged: string[] = [];
  const resolvedOverrides = new Map<string, unknown>();
  const conflictIds = new Set<string>();

  for (const id of ids) {
    const b = bO.get(id);
    const l = lO.get(id);
    const r = rO.get(id);
    const localChanged = !eq(b, l);
    const remoteChanged = !eq(b, r);

    if (!localChanged && !remoteChanged) {
      if (r !== undefined) resolvedOverrides.set(id, r);
    } else if (localChanged && !remoteChanged) {
      if (l !== undefined) resolvedOverrides.set(id, l);
      autoMerged.push(`You edited layer …${id.slice(-6)}`);
    } else if (!localChanged && remoteChanged) {
      if (r !== undefined) resolvedOverrides.set(id, r);
      autoMerged.push(`Teammate edited layer …${id.slice(-6)}`);
    } else if (eq(l, r)) {
      if (l !== undefined) resolvedOverrides.set(id, l);
    } else {
      conflictIds.add(id);
      conflicts.push({
        id,
        kind: "override",
        label: `Layer …${id.slice(-6)}`,
        mineSummary: l !== undefined ? "your changes" : "cleared by you",
        theirsSummary: r !== undefined ? "teammate's changes" : "cleared by teammate",
      });
    }
  }

  // Structure (added / removed / reordered nodes)
  const localStructChanged = !eq(base?.childrenData, local.childrenData);
  const remoteStructChanged = !eq(base?.childrenData, remote.childrenData);
  const structConflict =
    localStructChanged && remoteStructChanged && !eq(local.childrenData, remote.childrenData);
  if (structConflict) {
    conflicts.push({
      id: STRUCTURE_ID,
      kind: "structure",
      label: "Layer structure (added / removed / reordered)",
      mineSummary: "your structure",
      theirsSummary: "teammate's structure",
    });
  } else if (localStructChanged && !remoteStructChanged) {
    autoMerged.push("You changed the layer structure");
  } else if (!localStructChanged && remoteStructChanged) {
    autoMerged.push("Teammate changed the layer structure");
  }

  const build = (choices: Record<string, MergeSide>): LayerStateSnapshot => {
    const mergedOverrides: [string, unknown][] = Array.from(resolvedOverrides.entries());
    for (const id of conflictIds) {
      const side = choices[id] ?? "mine";
      const v = side === "theirs" ? rO.get(id) : lO.get(id);
      if (v !== undefined) mergedOverrides.push([id, v]);
    }

    let childrenData: LayerStateSnapshot["childrenData"];
    if (structConflict) {
      childrenData =
        (choices[STRUCTURE_ID] ?? "mine") === "theirs"
          ? remote.childrenData
          : local.childrenData;
    } else {
      childrenData = localStructChanged ? local.childrenData : remote.childrenData;
    }

    const hidden = Array.from(
      new Set([...(local.hiddenLayerIds ?? []), ...(remote.hiddenLayerIds ?? [])])
    );
    const locked = Array.from(
      new Set([...(local.lockedLayerIds ?? []), ...(remote.lockedLayerIds ?? [])])
    );

    return {
      ...(childrenData && childrenData.length ? { childrenData } : {}),
      overrides: mergedOverrides,
      trackStates: local.trackStates ?? remote.trackStates ?? {},
      hiddenLayerIds: hidden,
      lockedLayerIds: locked,
    };
  };

  return { conflicts, autoMerged, build };
}
