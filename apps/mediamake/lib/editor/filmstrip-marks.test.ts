import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filmstripMarks } from "./filmstrip-marks";

describe("filmstripMarks", () => {
  it("adds stills as zoom increases and keeps each one about a thumbnail wide", () => {
    const far = filmstripMarks({ durationSec: 30, pixelsPerSecond: 10, thumbPx: 48 });
    const near = filmstripMarks({ durationSec: 30, pixelsPerSecond: 40, thumbPx: 48 });
    assert.ok(near.marks.length > far.marks.length);
    assert.ok(Math.abs(far.cellPx - 48) < 8);
    assert.ok(Math.abs(near.cellPx - 48) < 8);
  });

  it("samples from the source offset", () => {
    const { marks } = filmstripMarks({
      durationSec: 10,
      pixelsPerSecond: 48,
      sourceOffsetSec: 4,
      thumbPx: 48,
    });
    assert.equal(marks[0]?.time, 4);
    assert.ok((marks[1]?.time ?? 0) > 4);
    assert.ok(marks.length > 2);
  });

  it("does not grow stills without bound on a very long clip", () => {
    const { marks, cellPx } = filmstripMarks({
      durationSec: 3600,
      pixelsPerSecond: 200,
      thumbPx: 48,
      maxCells: 80,
    });
    assert.equal(marks.length, 80);
    assert.ok(cellPx > 48);
  });
});
