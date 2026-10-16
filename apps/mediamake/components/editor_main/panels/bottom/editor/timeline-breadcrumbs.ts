import {
  findNode,
  parentOfNode,
  VIRTUAL_ROOT_ID,
} from "@/components/editor_main/timing/load-instance-tree";
import type { AppliedNode } from "@/components/editor_main/timing/types";

const ROOT_PRESET_IDS = new Set(["base-scene", VIRTUAL_ROOT_ID]);

export type BreadcrumbTarget =
  | { type: "timeline" }
  | { type: "preset"; presetId: string }
  | { type: "reference"; referenceIndex: number }
  | { type: "line"; referenceIndex: number; lineIdx: number };

export interface BreadcrumbStep {
  key: string;
  label: string;
  /** Set on ancestors. The current step has no target. */
  target?: BreadcrumbTarget;
}

export interface BreadcrumbPreset {
  id: string;
  name: string;
}

export interface BreadcrumbModel {
  selection:
    | "timeline"
    | "preset"
    | "reference"
    | "references"
    | "action"
    | "actions"
    | "none";
  /** Child of Base through the focused preset. The base scene is omitted. */
  presetPath: BreadcrumbPreset[];
  reference?: { index: number; label: string } | null;
  actionLabel?: string | null;
  leaf?:
    | { type: "block"; label: string }
    | { type: "line"; label: string; lineIdx: number; word: boolean }
    | null;
}

/** Track names from the child of Base down to `presetId`. */
export function presetBreadcrumbPath(
  tree: AppliedNode,
  presetId: string,
): BreadcrumbPreset[] {
  const chain: AppliedNode[] = [];
  const seen = new Set<string>();
  let current = findNode(tree, presetId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    // The root scene is the Base crumb. A second "Scene" here is that same scene.
    if (current.id === tree.id || ROOT_PRESET_IDS.has(current.presetId)) break;
    chain.unshift(current);
    const parent = parentOfNode(tree, current.id);
    current = parent ?? undefined;
  }
  return chain.map((node) => ({
    id: node.id,
    name: node.name.trim() || node.presetId || "Track",
  }));
}

/**
 * Header trail for the bottom timeline.
 * Base is the timeline. Preset crumbs follow the instance tree.
 * A range, clip, or caption line is the last step under its owner.
 */
export function buildTimelineBreadcrumbs(model: BreadcrumbModel): BreadcrumbStep[] {
  const base: BreadcrumbStep = {
    key: "base",
    label: "Base",
    target: { type: "timeline" },
  };
  const steps: BreadcrumbStep[] = [base];
  const blockLeaf = model.leaf?.type === "block" ? model.leaf : null;
  const lineLeaf = model.leaf?.type === "line" ? model.leaf : null;
  const showReference = Boolean(
    model.reference && (model.selection === "reference" || lineLeaf),
  );

  if (showReference && model.reference) {
    steps.push({
      key: `reference:${model.reference.index}`,
      label: model.reference.label.trim() || "Reference",
      target: lineLeaf
        ? { type: "reference", referenceIndex: model.reference.index }
        : undefined,
    });
    if (lineLeaf) {
      steps.push({
        key: `line:${model.reference.index}:${lineLeaf.lineIdx}`,
        label: lineLeaf.label.trim() || "Line",
        target: lineLeaf.word
          ? {
              type: "line",
              referenceIndex: model.reference.index,
              lineIdx: lineLeaf.lineIdx,
            }
          : undefined,
      });
    }
  } else if (blockLeaf || (model.selection === "preset" && model.presetPath.length > 0)) {
    model.presetPath.forEach((preset, index) => {
      const last = index === model.presetPath.length - 1;
      steps.push({
        key: `preset:${preset.id}`,
        label: preset.name.trim() || "Track",
        target:
          !last || blockLeaf ? { type: "preset", presetId: preset.id } : undefined,
      });
    });
    if (blockLeaf) {
      steps.push({
        key: "block",
        label: blockLeaf.label.trim() || "Range",
      });
    }
  } else if (model.selection === "references") {
    steps.push({ key: "references", label: "References" });
  } else if (model.selection === "actions") {
    steps.push({ key: "actions", label: "Actions" });
  } else if (model.selection === "action" && model.actionLabel?.trim()) {
    steps.push({ key: "action", label: model.actionLabel.trim() });
  }

  if (steps.length === 1) base.target = undefined;
  return steps;
}
