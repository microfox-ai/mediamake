import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActionExecuteContext, TimelineAction } from "../types";
import { waveformSpectrumFillChoice } from "./waveform-spectrum-fill-choice";

const action = { id: "a1", actionId: "waveformSpectrumFillChoice" } as TimelineAction;

async function applyChoice(inputData: Record<string, unknown>, currentData: Record<string, unknown>) {
  const result = await waveformSpectrumFillChoice.execute({ inputData } as ActionExecuteContext);
  const output = { id: "o1", ...result.outputs[0] };
  return waveformSpectrumFillChoice.applyOutput({ currentData, action, output });
}

describe("waveformSpectrumFillChoice", () => {
  it("double-hit-wave gives two mirrored layers moving together and keeps styling", async () => {
    const styling = { fillColor: "#00FF00", layer2Color: "#0000FF", opacity: 0.8, strokeWidth: 2 };
    const next = await applyChoice({ choice: "double-hit-wave", impact: 0.5 }, { ...styling, audio: { src: "x" } });
    assert.equal(next.layerCount, 2);
    assert.equal(next.layerMirror, true);
    assert.equal(next.layerFrameOffset, 0);
    assert.deepEqual(next.audio, { src: "x" });
    for (const [key, value] of Object.entries(styling)) assert.equal(next[key], value);
  });

  it("maps each choice to its layer count", async () => {
    const counts = { "single-wave": 1, "triple-wave": 3, "quadruple-wave": 4, "fearless-beats": 2 };
    for (const [choice, count] of Object.entries(counts)) {
      assert.equal((await applyChoice({ choice, impact: 0.5 }, {})).layerCount, count);
    }
  });

  it("FearlessBeats at mid impact matches the delayed two-layer visual", async () => {
    const styling = { fillColor: "#dd0000", layer2Color: "#ffe2e2", opacity: 1, strokeWidth: 0 };
    const next = await applyChoice({ choice: "fearless-beats", impact: 0.5 }, { ...styling, height: 300 });
    assert.equal(next.layerCount, 2);
    assert.equal(next.layerMirror, true);
    assert.equal(next.layerFrameOffset, 13);
    assert.equal(next.pointCount, 37);
    assert.equal(next.restHeight, 10);
    assert.equal(next.peakHeight, 0.42);
    assert.equal(next.gain, 15);
    assert.equal(next.noiseFloor, 0.05);
    assert.equal(next.temporalSmoothing, 0.6);
    assert.equal(next.sharpness, 0.85);
    assert.equal(next.spread, 8);
    assert.equal(next.fillColor, "#dd0000");
    assert.equal(next.layer2Color, "#ffe2e2");
  });

  it("FearlessBeats impact raises gain, peaks, and the echo delay", async () => {
    const low = await applyChoice({ choice: "fearless-beats", impact: 0 }, {});
    const high = await applyChoice({ choice: "fearless-beats", impact: 1 }, {});
    assert.ok((high.gain as number) > (low.gain as number));
    assert.ok((high.peakHeight as number) > (low.peakHeight as number));
    assert.ok((high.layerFrameOffset as number) > (low.layerFrameOffset as number));
  });

  it("higher impact raises gain and peaks", async () => {
    const low = await applyChoice({ choice: "double-hit-wave", impact: 0 }, {});
    const high = await applyChoice({ choice: "double-hit-wave", impact: 1 }, {});
    assert.ok((high.gain as number) > (low.gain as number));
    assert.ok((high.peakHeight as number) > (low.peakHeight as number));
  });

  it("exposes the fields it writes and excludes styling", () => {
    const keys = waveformSpectrumFillChoice.choice?.fieldKeys ?? [];
    assert.ok(keys.includes("layerCount"));
    assert.ok(keys.includes("gain"));
    for (const styling of ["fillColor", "layer2Color", "opacity", "strokeWidth", "audio"]) {
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
          values: { layerCount: 3, gain: 7, fillColor: "#123456" },
        },
      },
      { fillColor: "#FFFFFF", gain: 1 },
    );
    assert.equal(next.layerCount, 3);
    assert.equal(next.gain, 7);
    assert.equal(next.fillColor, "#FFFFFF");
  });

  it("rejects a saved choice id without its values", async () => {
    await assert.rejects(() => applyChoice({ choice: "saved:abc", impact: 0.5 }, {}));
  });

  it("uses taller peaks when the block has its own strip height", async () => {
    const full = await applyChoice({ choice: "double-hit-wave", impact: 0.5 }, {});
    const strip = await applyChoice({ choice: "double-hit-wave", impact: 0.5 }, { height: 200 });
    assert.ok((strip.peakHeight as number) > (full.peakHeight as number));
  });
});
