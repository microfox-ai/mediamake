import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActionExecuteContext, TimelineAction } from "../types";
import { beatMontageChoice } from "./beat-montage-choice";

const action = { id: "a1", actionId: "beatMontageChoice" } as TimelineAction;

async function applyChoice(inputData: Record<string, unknown>, currentData: Record<string, unknown>) {
  const result = await beatMontageChoice.execute({ inputData } as ActionExecuteContext);
  const output = { id: "o1", ...result.outputs[0] };
  return beatMontageChoice.applyOutput({ currentData, action, output });
}

describe("beatMontageChoice", () => {
  const current = {
    media: [{ src: "a.jpg" }, { src: "b.mp4", type: "video" }],
    audio: { src: "ref:music" },
    beatmap: { beats: [0.5, 1] },
    style: { objectFit: "cover" },
  };

  it("Sideways Cuts is the reference edit: turned stills, black intro, early hard cuts", async () => {
    const next = await applyChoice({ choice: "sideways-cuts", impact: 0.5 }, current);
    assert.equal(next.rotate, "auto");
    assert.equal(next.startOnFirstCue, true);
    assert.equal(next.transition, "cut");
    assert.equal(next.cueOn, "accent");
    assert.equal(next.leadSec, 0.085);
    assert.deepEqual(next.media, current.media);
    assert.deepEqual(next.beatmap, current.beatmap);
    assert.deepEqual(next.style, current.style);
  });

  it("higher impact cuts on more hits", async () => {
    const low = await applyChoice({ choice: "sideways-cuts", impact: 0 }, current);
    const high = await applyChoice({ choice: "sideways-cuts", impact: 1 }, current);
    assert.ok((high.threshold as number) < (low.threshold as number));
    assert.ok((high.minShotSec as number) < (low.minShotSec as number));
  });

  it("every look writes the same fields", async () => {
    const keys = (data: Record<string, unknown>) =>
      Object.keys(data).filter((k) => !(k in current)).sort();
    const reference = keys(await applyChoice({ choice: "sideways-cuts", impact: 0.5 }, current));
    for (const choice of beatMontageChoice.choice!.builtInChoices) {
      assert.deepEqual(keys(await applyChoice({ choice: choice.id, impact: 0.3 }, current)), reference, choice.id);
    }
  });
});
