import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppliedNode } from "@/components/editor_main/timing/types";
import { VIRTUAL_ROOT_ID, collectSubtreeIds } from "@/components/editor_main/timing/load-instance-tree";
import {
  resolveTimelineScope,
  scopeInstanceRows,
  scopeRangePresetIds,
} from "./timeline-scope";

function node(
  partial: Pick<AppliedNode, "id"> & Partial<Omit<AppliedNode, "id">>,
): AppliedNode {
  return {
    presetId: partial.presetId ?? "media-track",
    name: partial.name ?? partial.id,
    role: partial.role ?? "track",
    input: partial.input ?? {},
    children: partial.children ?? [],
    disabled: partial.disabled,
    id: partial.id,
    timing: partial.timing ?? { kind: "explicit", start: 0, duration: 1 },
  };
}

function tree(): AppliedNode {
  return node({
    id: "base",
    presetId: "base-scene",
    role: "scene",
    children: [
      node({
        id: "intro",
        presetId: "scene",
        role: "scene",
        children: [
          node({ id: "title", presetId: "text-atom", role: "track" }),
          node({ id: "glow", presetId: "fx", role: "modifier" }),
          node({
            id: "hidden-title",
            presetId: "text-overlay",
            role: "track",
            disabled: true,
          }),
        ],
      }),
      node({ id: "media", presetId: "media-track", role: "track" }),
      node({ id: "loop", presetId: "imageloop", role: "track" }),
      node({ id: "atom", presetId: "text-atom", role: "track" }),
      node({ id: "fx", presetId: "fx", role: "modifier" }),
      node({
        id: "off",
        presetId: "waveform-audio",
        role: "track",
        disabled: true,
      }),
    ],
  });
}

function ids(root: AppliedNode, selected: { type: string; item?: { id: string } } | null) {
  const scope = resolveTimelineScope(root, selected);
  return {
    scope,
    rows: scopeInstanceRows(root, scope).map((row) => row.node.id),
    ranges: scopeRangePresetIds(scope),
  };
}

describe("resolveTimelineScope", () => {
  it("shows only presets attached to the base scene", () => {
    const result = ids(tree(), null);
    assert.equal(result.scope.kind, "scene-children");
    assert.deepEqual(result.rows, ["base", "intro", "media", "loop", "atom"]);
    assert.deepEqual(result.ranges, []);
    if (result.scope.kind === "scene-children") {
      assert.equal(result.scope.includeTimelineSources, true);
    }
  });

  it("shows only presets attached to the selected scene", () => {
    const result = ids(tree(), { type: "preset", item: { id: "intro" } });
    assert.equal(result.scope.kind, "scene-children");
    assert.deepEqual(result.rows, ["title"]);
    assert.deepEqual(result.ranges, []);
    if (result.scope.kind === "scene-children") {
      assert.equal(result.scope.includeTimelineSources, false);
    }
  });

  it("shows a media container with clips and its own ranges", () => {
    const result = ids(tree(), { type: "preset", item: { id: "media" } });
    assert.deepEqual(result.scope, {
      kind: "preset",
      nodeId: "media",
      expandClips: true,
    });
    assert.deepEqual(result.rows, ["media"]);
    assert.deepEqual(result.ranges, ["media"]);
  });

  it("shows an image loop container with clips", () => {
    const result = ids(tree(), { type: "preset", item: { id: "loop" } });
    assert.equal(result.scope.kind, "preset");
    if (result.scope.kind === "preset") assert.equal(result.scope.expandClips, true);
    assert.deepEqual(result.rows, ["loop"]);
  });

  it("shows an atom without clip rows", () => {
    const result = ids(tree(), { type: "preset", item: { id: "atom" } });
    assert.deepEqual(result.scope, {
      kind: "preset",
      nodeId: "atom",
      expandClips: false,
    });
    assert.deepEqual(result.rows, ["atom"]);
    assert.deepEqual(result.ranges, ["atom"]);
  });

  it("keeps a selected disabled preset visible", () => {
    const result = ids(tree(), { type: "preset", item: { id: "off" } });
    assert.deepEqual(result.rows, ["off"]);
    if (result.scope.kind === "preset") assert.equal(result.scope.expandClips, false);
  });

  it("falls back to the base scene for a modifier or a missing id", () => {
    assert.deepEqual(ids(tree(), { type: "preset", item: { id: "fx" } }).rows, [
      "base",
      "intro",
      "media",
      "loop",
      "atom",
    ]);
    assert.deepEqual(ids(tree(), { type: "timeline" }).rows, [
      "base",
      "intro",
      "media",
      "loop",
      "atom",
    ]);
  });

  it("treats a virtual root as the base scene", () => {
    const root = node({
      id: VIRTUAL_ROOT_ID,
      presetId: VIRTUAL_ROOT_ID,
      role: "scene",
      children: [
        node({ id: "clip", presetId: "media-track", role: "track" }),
        node({
          id: "nested",
          presetId: "scene",
          role: "scene",
          children: [node({ id: "inside", presetId: "text-atom", role: "track" })],
        }),
      ],
    });
    assert.deepEqual(ids(root, null).rows, ["clip", "nested"]);
  });

  it("collects every nested preset under a scene", () => {
    const root = node({
      id: "base",
      presetId: "base-scene",
      role: "scene",
      children: [
        node({
          id: "group",
          presetId: "scene",
          role: "scene",
          children: [
            node({ id: "title", presetId: "text-atom", role: "track" }),
            node({
              id: "inner",
              presetId: "scene",
              role: "scene",
              children: [node({ id: "caption", presetId: "subtitles-plain", role: "track" })],
            }),
          ],
        }),
        node({ id: "other", presetId: "media-track", role: "track" }),
      ],
    });
    assert.deepEqual(collectSubtreeIds(root, "group"), ["group", "title", "inner", "caption"]);
  });
});
