import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineAction } from "@/components/editor/presets/actions/types";
import { actionRangesVisible, bottomTimelineLane } from "./timeline-track-sources";

function action(
  partial: Pick<TimelineAction, "id" | "target">,
): TimelineAction {
  return {
    actionId: "shake",
    label: "Shake",
    inputData: {},
    outputs: [],
    ...partial,
  };
}

describe("actionRangesVisible", () => {
  const presetAction = action({
    id: "a1",
    target: { type: "preset", presetInstanceId: "loop" },
  });
  const referenceAction = action({
    id: "a2",
    target: { type: "reference", referenceKey: "captions" },
  });

  it("hides ranges when the timeline is selected", () => {
    assert.equal(
      actionRangesVisible(presetAction, { type: "timeline", item: { id: "tl" } }),
      false,
    );
    assert.equal(actionRangesVisible(presetAction, null), false);
  });

  it("shows ranges for the selected action only", () => {
    assert.equal(
      actionRangesVisible(presetAction, { type: "action", item: { id: "a1" } }),
      true,
    );
    assert.equal(
      actionRangesVisible(referenceAction, { type: "action", item: { id: "a1" } }),
      false,
    );
  });

  it("hides ranges when a preset or reference is selected", () => {
    assert.equal(
      actionRangesVisible(presetAction, { type: "preset", item: { id: "loop" } }),
      false,
    );
    assert.equal(
      actionRangesVisible(referenceAction, {
        type: "reference",
        item: { id: "captions" },
      }),
      false,
    );
  });

  it("shows every action when the actions group is selected", () => {
    assert.equal(actionRangesVisible(presetAction, { type: "actions" }), true);
    assert.equal(actionRangesVisible(referenceAction, { type: "actions" }), true);
  });
});

describe("bottomTimelineLane", () => {
  it("keeps the timeline and blocks on block rows", () => {
    assert.equal(bottomTimelineLane(null), "blocks");
    assert.equal(bottomTimelineLane({ type: "timeline" }), "blocks");
    assert.equal(bottomTimelineLane({ type: "preset" }), "blocks");
  });

  it("switches to references or actions only for those selections", () => {
    assert.equal(bottomTimelineLane({ type: "references" }), "references");
    assert.equal(bottomTimelineLane({ type: "reference" }), "blocks");
    assert.equal(bottomTimelineLane({ type: "actions" }), "actions");
    assert.equal(bottomTimelineLane({ type: "action" }), "actions");
  });
});
