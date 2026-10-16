import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { editorAtomCatalog } from "@microfox/remotion/editor-atom-catalog";
import { atomPresetId } from "../../define-atom-preset";
import type { ActionExecuteContext, TimelineAction } from "../types";
import {
  fieldsPresentForChoice,
  savedStylesActionId,
  SAVED_STYLES_TITLE,
} from "./choice-action";
import { getActionDefinition, getSupportedActionsForPreset } from "./index";

const action = { id: "a1", actionId: "saved-styles" } as TimelineAction;

function choiceActions(presetId: string) {
  return getSupportedActionsForPreset(presetId).filter((entry) => entry.choice);
}

describe("saved styles choice", () => {
  it("gives every generated atom preset a Saved Styles action with no built-in looks", () => {
    assert.ok(editorAtomCatalog.length > 0);
    for (const atom of editorAtomCatalog) {
      const presetId = atomPresetId(atom.componentId);
      const saved = choiceActions(presetId).filter(
        (entry) => entry.metadata.title === SAVED_STYLES_TITLE,
      );
      assert.equal(saved.length, 1, presetId);
      assert.equal(saved[0].metadata.id, savedStylesActionId(presetId));
      assert.equal(saved[0].choice?.openFields, true);
      assert.deepEqual(saved[0].choice?.builtInChoices, []);
      assert.deepEqual(saved[0].metadata.supportedPresetIds, [presetId]);
    }
  });

  it("covers every waveform atom, and keeps a coded choice beside Saved Styles", () => {
    const waveforms = editorAtomCatalog.filter((atom) => atom.folder === "waveforms");
    assert.ok(waveforms.length >= 4);
    for (const atom of waveforms) {
      const titles = choiceActions(atomPresetId(atom.componentId)).map(
        (entry) => entry.metadata.title,
      );
      assert.ok(titles.includes(SAVED_STYLES_TITLE), atom.componentId);
    }

    assert.deepEqual(choiceActions(atomPresetId("WaveformSpectrumFill")).map((entry) => entry.metadata.id), [
      "waveformSpectrumFillChoice",
      savedStylesActionId(atomPresetId("WaveformSpectrumFill")),
    ]);
    assert.deepEqual(choiceActions(atomPresetId("WaveformSpectrumLine")).map((entry) => entry.metadata.title), [
      SAVED_STYLES_TITLE,
    ]);
    assert.deepEqual(choiceActions(atomPresetId("ImageBeat")).map((entry) => entry.metadata.id), [
      "imageBeatChoice",
      savedStylesActionId(atomPresetId("ImageBeat")),
    ]);
  });

  it("does not attach Saved Styles to a hand-written preset", () => {
    const attached = getSupportedActionsForPreset("text-atom").filter((entry) =>
      entry.metadata.id.startsWith("saved-styles:"),
    );
    assert.equal(attached.length, 0);
  });

  it("starts from fields set now and drops track timing", () => {
    const present = fieldsPresentForChoice(
      {
        barColor: "#ff0000",
        opacity: undefined,
        audio: { src: "track.mp3" },
        containerProps: { style: { left: 0 } },
        start: 2,
        duration: 8,
        trackName: "wave",
        lock: "other",
      },
      { fieldKeys: [], openFields: true },
    );
    assert.deepEqual(present, {
      barColor: "#ff0000",
      audio: { src: "track.mp3" },
      containerProps: { style: { left: 0 } },
    });
  });

  it("coded choices still start from only the fields they write", () => {
    const present = fieldsPresentForChoice(
      { gain: 12, fillColor: "#fff", start: 1 },
      { fieldKeys: ["gain", "peakHeight"] },
    );
    assert.deepEqual(present, { gain: 12 });
  });

  it("applies the kept fields and leaves timing and omitted fields alone", async () => {
    const definition = getActionDefinition(savedStylesActionId(atomPresetId("WaveformHistogram")));
    assert.ok(definition);
    const result = await definition.execute({
      inputData: {
        choice: "saved:abc",
        savedChoice: {
          id: "abc",
          name: "Red bars",
          values: { barColor: "#ff0000", amplitude: 1.4, start: 9, duration: 3 },
        },
      },
    } as unknown as ActionExecuteContext);
    const output = { id: "o1", ...result.outputs[0] };
    const next = definition.applyOutput({
      currentData: { barColor: "#000000", opacity: 0.5, start: 1, duration: 4 },
      action,
      output,
    });
    assert.equal(next.barColor, "#ff0000");
    assert.equal(next.amplitude, 1.4);
    assert.equal(next.opacity, 0.5);
    assert.equal(next.start, 1);
    assert.equal(next.duration, 4);
  });

  it("rejects a run with no saved style selected", async () => {
    const definition = getActionDefinition(savedStylesActionId(atomPresetId("TextAtom")));
    assert.ok(definition);
    await assert.rejects(() =>
      definition.execute({ inputData: { choice: "" } } as unknown as ActionExecuteContext),
    );
  });
});
