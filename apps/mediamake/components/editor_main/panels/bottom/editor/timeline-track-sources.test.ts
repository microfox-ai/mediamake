import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TimelineAction } from "@/components/editor/presets/actions/types";
import { actionRangesVisible } from "./timeline-track-sources";

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

  it("shows ranges when the linked preset or block is selected", () => {
    assert.equal(
      actionRangesVisible(presetAction, { type: "preset", item: { id: "loop" } }),
      true,
    );
    assert.equal(
      actionRangesVisible(presetAction, { type: "preset", item: { id: "other" } }),
      false,
    );
    assert.equal(
      actionRangesVisible(referenceAction, { type: "preset", item: { id: "loop" } }),
      false,
    );
  });

  it("shows ranges when the linked reference is selected", () => {
    assert.equal(
      actionRangesVisible(referenceAction, {
        type: "reference",
        item: { key: "captions" },
      }),
      true,
    );
    assert.equal(
      actionRangesVisible(referenceAction, {
        type: "reference",
        item: { key: "other" },
      }),
      false,
    );
    assert.equal(
      actionRangesVisible(presetAction, {
        type: "reference",
        item: { key: "captions" },
      }),
      false,
    );
  });
});
