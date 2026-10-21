import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearLinkedActionOutputs } from "./linked-action-outputs";

describe("clearLinkedActionOutputs", () => {
  it("clears outputs only on actions linked to the recreated captions reference", () => {
    const actions = [
      {
        id: "linked",
        target: { type: "reference" as const, referenceKey: "lyrics" },
        outputs: [{ id: "out-1", payload: { captions: [] } }],
        selectedOutputId: "out-1",
        status: "done" as const,
        lastRunAt: "2026-10-21T00:00:00.000Z",
        inputData: { lineLength: "medium" },
      },
      {
        id: "other-ref",
        target: { type: "reference" as const, referenceKey: "hook" },
        outputs: [{ id: "out-2" }],
        selectedOutputId: "out-2",
        status: "done" as const,
      },
      {
        id: "preset",
        target: { type: "preset" as const, presetInstanceId: "p1" },
        outputs: [{ id: "out-3" }],
        selectedOutputId: "out-3",
        status: "done" as const,
      },
    ];

    const next = clearLinkedActionOutputs(actions, "lyrics");

    assert.deepEqual(next[0].outputs, []);
    assert.equal(next[0].selectedOutputId, undefined);
    assert.equal(next[0].status, "idle");
    assert.equal(next[0].lastRunAt, undefined);
    assert.deepEqual(next[0].inputData, { lineLength: "medium" });
    assert.equal(next[1].selectedOutputId, "out-2");
    assert.equal(next[2].selectedOutputId, "out-3");
  });

  it("returns the same list when nothing was generated", () => {
    const actions = [
      {
        target: { type: "reference" as const, referenceKey: "lyrics" },
        outputs: [],
        status: "idle" as const,
      },
    ];
    assert.equal(clearLinkedActionOutputs(actions, "lyrics"), actions);
  });
});
