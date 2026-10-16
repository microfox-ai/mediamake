import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTrackMode, headerTrackMode, inheritParentLock } from "./apply-track-mode";

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

  it("drops duration when the base scene locks or sequences", () => {
    const locked = applyTrackMode(
      { backgroundColor: "black", trackType: "aligned", start: 0, duration: 12 },
      "lockedTo",
      "bed",
      { dropDuration: true },
    );
    assert.equal(locked.trackType, "lockedTo");
    assert.equal(locked.lock, "bed");
    assert.equal("duration" in locked, false);

    const sequence = applyTrackMode(
      { backgroundColor: "black", trackType: "aligned", start: 0, duration: 12 },
      "sequence",
      undefined,
      { dropDuration: true },
    );
    assert.equal(sequence.trackType, "sequence");
    assert.equal("duration" in sequence, false);
    assert.equal(sequence.start, 0);
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

  it("copies a locked scene's target onto a new child", () => {
    const next = inheritParentLock(
      { trackName: "title", trackType: "aligned", start: 0, duration: 4 },
      { trackType: "lockedTo", lock: "audio-track" },
    );
    assert.equal(next.trackType, "lockedTo");
    assert.equal(next.lock, "audio-track");
  });

  it("leaves children of sequence and aligned scenes unchanged", () => {
    const child = { trackName: "title", trackType: "aligned", duration: 4 };
    assert.equal(inheritParentLock(child, { trackType: "sequence" }).trackType, "aligned");
    assert.equal(inheritParentLock(child, { trackType: "aligned" }).trackType, "aligned");
    assert.equal("lock" in inheritParentLock(child, { trackType: "lockedTo" }), false);
    assert.equal(
      inheritParentLock(child, { trackType: "lockedTo" }).trackType,
      "lockedTo",
    );
  });

  it("leaves auto range off the header tabs", () => {
    assert.equal(headerTrackMode({ trackType: "autoRange" }), null);
    assert.equal(headerTrackMode({ trackType: "aligned" }), "aligned");
    assert.equal(headerTrackMode({ lock: "bed" }), "lockedTo");
  });
});
