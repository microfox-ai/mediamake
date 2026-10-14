import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTrackMode, headerTrackMode } from "./apply-track-mode";

describe("applyTrackMode", () => {
  it("stores a lock target and lockedTo", () => {
    const next = applyTrackMode(
      { trackName: "titles", trackType: "aligned", start: 1, duration: 4, lock: "old" },
      "lockedTo",
      "bed",
    );
    assert.equal(next.trackType, "lockedTo");
    assert.equal(next.lock, "bed");
    assert.equal(next.duration, 4);
    assert.equal(next.start, 1);
  });

  it("clears lock when switching to sequence or aligned", () => {
    const sequence = applyTrackMode(
      { trackType: "lockedTo", lock: "bed", duration: 8, start: 2 },
      "sequence",
    );
    assert.equal(sequence.trackType, "sequence");
    assert.equal("lock" in sequence, false);
    assert.equal("duration" in sequence, false);
    assert.equal(sequence.start, 2);

    const aligned = applyTrackMode(
      { trackType: "lockedTo", lock: "bed", start: 0 },
      "aligned",
    );
    assert.equal(aligned.trackType, "aligned");
    assert.equal("lock" in aligned, false);
  });

  it("leaves auto range off the header tabs", () => {
    assert.equal(headerTrackMode({ trackType: "autoRange" }), null);
    assert.equal(headerTrackMode({ trackType: "aligned" }), "aligned");
    assert.equal(headerTrackMode({ lock: "bed" }), "lockedTo");
  });
});
