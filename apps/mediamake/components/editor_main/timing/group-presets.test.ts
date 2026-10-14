import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Preset } from "@/components/editor/presets/types";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import { findNode } from "./load-instance-tree";
import { canGroupPresets, groupSelectedPresets } from "./group-presets";

const sceneSeed = {
  presetInfo: {
    metadata: {
      id: "scene",
      title: "Scene",
      type: "predefined",
      presetType: "children",
      defaultInputParams: {
        trackName: "scene",
        trackType: "aligned",
        start: 0,
        duration: 10,
        attachedToId: "BaseScene",
      },
    },
  } as Preset,
};

function preset(
  id: string,
  presetId: string,
  input: Record<string, unknown>,
): NonNullable<Timeline["presets"]>[number] {
  return {
    id,
    label: id,
    presetId,
    presetType: presetId === "scene" || presetId === "base-scene" ? "children" : "children",
    presetInputData: input,
  };
}

function timeline(presets: NonNullable<Timeline["presets"]>): Pick<Timeline, "presets"> {
  return { presets };
}

describe("groupSelectedPresets", () => {
  const base = [
    preset("base", "base-scene", { trackType: "aligned", start: 0, duration: 20 }),
    preset("a", "text-atom", { trackName: "a", trackType: "aligned", start: 1, duration: 4 }),
    preset("d", "text-atom", { trackName: "d", trackType: "aligned", start: 0, duration: 2 }),
    preset("b", "text-atom", { trackName: "b", trackType: "aligned", start: 8, duration: 6 }),
    preset("nested", "scene", {
      trackName: "scene",
      trackType: "aligned",
      start: 0,
      duration: 8,
    }),
    preset("c", "text-atom", {
      trackName: "c",
      trackType: "aligned",
      start: 0,
      duration: 2,
      parentId: "nested",
    }),
  ];

  it("wraps same-parent presets in an aligned scene at their position", () => {
    const result = groupSelectedPresets(timeline(base), ["b", "a"], sceneSeed, "group-1");
    assert.ok(result);
    const scene = result.presets.find((item) => item.id === "group-1");
    const input = scene?.presetInputData as Record<string, unknown>;
    assert.equal(input.trackType, "aligned");
    assert.equal(input.start, 0);
    assert.equal(input.trackName, "scene-2");
    assert.equal(input.duration, 14);
    assert.equal(scene?.presetInputData.parentId, undefined);

    const childA = result.presets.find((item) => item.id === "a");
    const childB = result.presets.find((item) => item.id === "b");
    assert.equal(childA?.presetInputData.parentId, "group-1");
    assert.equal(childB?.presetInputData.parentId, "group-1");
    assert.equal(childA?.presetInputData.start, 1);
    assert.equal(childB?.presetInputData.duration, 6);

    const root = result.nodes;
    assert.deepEqual(
      root.children.map((child) => child.id),
      ["group-1", "d", "nested"],
    );
    const grouped = findNode(result.nodes, "group-1");
    assert.deepEqual(
      grouped?.children.map((child) => child.id),
      ["a", "b"],
    );
    assert.equal(grouped?.arrangement, "aligned");
  });

  it("refuses presets from different parents", () => {
    assert.equal(canGroupPresets(timeline(base), ["a", "c"]), false);
    assert.equal(groupSelectedPresets(timeline(base), ["a", "c"], sceneSeed, "nope"), null);
    assert.equal(canGroupPresets(timeline(base), ["nested", "c"]), false);
    assert.equal(canGroupPresets(timeline(base), ["a"]), false);
  });
});
