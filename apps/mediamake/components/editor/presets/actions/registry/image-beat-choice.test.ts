import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActionExecuteContext, TimelineAction } from "../types";
import { imageBeatChoice } from "./image-beat-choice";

const action = { id: "a1", actionId: "imageBeatChoice" } as TimelineAction;

async function applyChoice(inputData: Record<string, unknown>, currentData: Record<string, unknown>) {
  const result = await imageBeatChoice.execute({ inputData } as ActionExecuteContext);
  const output = { id: "o1", ...result.outputs[0] };
  return imageBeatChoice.applyOutput({ currentData, action, output });
}

describe("imageBeatChoice", () => {
  it("FearlessBeats at mid impact matches the eccentric punch-zoom visual", async () => {
    const styling = {
      src: "https://example.com/cover.jpg",
      audio: { src: "track.mp3", start: 0 },
      style: { objectFit: "cover", opacity: 0.9 },
    };
    const next = await applyChoice({ choice: "fearless-beats", impact: 0.5 }, styling);
    assert.equal(next.audioProperty, "bass");
    assert.equal(next.zoomIntensity, 0.32);
    assert.equal(next.baseScale, 1.08);
    assert.equal(next.originSpread, 0.7);
    assert.equal(next.punchSec, 0.18);
    assert.equal(next.settleSec, 0.5);
    assert.equal(next.sensitivity, 1.6);
    assert.equal(next.threshold, 0.18);
    assert.equal(next.src, styling.src);
    assert.deepEqual(next.audio, styling.audio);
    assert.deepEqual(next.style, styling.style);
  });

  it("higher impact punches harder, lands more hits, and keeps the image", async () => {
    const low = await applyChoice({ choice: "fearless-beats", impact: 0 }, { src: "a.jpg" });
    const high = await applyChoice({ choice: "fearless-beats", impact: 1 }, { src: "a.jpg" });
    assert.ok((high.zoomIntensity as number) > (low.zoomIntensity as number));
    assert.ok((high.originSpread as number) > (low.originSpread as number));
    assert.ok((high.sensitivity as number) > (low.sensitivity as number));
    assert.ok((high.threshold as number) < (low.threshold as number));
    assert.ok((high.punchSec as number) < (low.punchSec as number));
    assert.ok((high.settleSec as number) < (low.settleSec as number));
    assert.equal(high.src, "a.jpg");
  });

  it("exposes the fields it writes and excludes image, audio, and style", () => {
    const keys = imageBeatChoice.choice?.fieldKeys ?? [];
    for (const field of [
      "zoomIntensity",
      "baseScale",
      "originSpread",
      "punchSec",
      "settleSec",
      "sensitivity",
      "threshold",
      "audioProperty",
    ]) {
      assert.ok(keys.includes(field), `${field} should be captured`);
    }
    for (const styling of ["src", "audio", "style", "proxySrc", "className"]) {
      assert.ok(!keys.includes(styling), `${styling} should not be captured`);
    }
  });

  it("applies a saved choice's values and ignores fields the action does not own", async () => {
    const next = await applyChoice(
      {
        choice: "saved:abc",
        impact: 0.9,
        savedChoice: {
          id: "abc",
          name: "Mine",
          values: { zoomIntensity: 0.4, punchSec: 0.2, src: "ignore.jpg" },
        },
      },
      { src: "keep.jpg", zoomIntensity: 0.1 },
    );
    assert.equal(next.zoomIntensity, 0.4);
    assert.equal(next.punchSec, 0.2);
    assert.equal(next.src, "keep.jpg");
  });

  it("rejects a saved choice id without its values", async () => {
    await assert.rejects(() => applyChoice({ choice: "saved:abc", impact: 0.5 }, {}));
  });
});
