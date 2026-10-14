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
    const counts = { "single-wave": 1, "triple-wave": 3, "quadruple-wave": 4 };
    for (const [choice, count] of Object.entries(counts)) {
      assert.equal((await applyChoice({ choice, impact: 0.5 }, {})).layerCount, count);
    }
  });

  it("higher impact raises gain and peaks", async () => {
    const low = await applyChoice({ choice: "double-hit-wave", impact: 0 }, {});
    const high = await applyChoice({ choice: "double-hit-wave", impact: 1 }, {});
    assert.ok((high.gain as number) > (low.gain as number));
    assert.ok((high.peakHeight as number) > (low.peakHeight as number));
  });

  it("uses taller peaks when the block has its own strip height", async () => {
    const full = await applyChoice({ choice: "double-hit-wave", impact: 0.5 }, {});
    const strip = await applyChoice({ choice: "double-hit-wave", impact: 0.5 }, { height: 200 });
    assert.ok((strip.peakHeight as number) > (full.peakHeight as number));
  });
});
