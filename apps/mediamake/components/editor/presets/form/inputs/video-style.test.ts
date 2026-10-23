import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    adjustmentsToCss,
    audioMutedValue,
    clampTrim,
    commitVideoLook,
    presetAdjust,
    readAudioPlayback,
    readPresetLookStyle,
    readVideoLook,
} from "./video-style";

describe("commitVideoLook", () => {
    it("stores a preset without a raw filter string and keeps other style keys", () => {
        const next = commitVideoLook(
            { backgroundColor: "#111", fontSize: 12 },
            {
                fit: "contain",
                blendMode: "multiply",
                opacity: 0.8,
                colorTint: "#ff6600",
                filter: "vintage",
                adjust: presetAdjust("vintage"),
            },
        );
        assert.equal(next.backgroundColor, "#111");
        assert.equal(next.fontSize, 12);
        assert.equal(next.objectFit, "contain");
        assert.equal(next["--mm-image-filter"], "vintage");
        assert.equal(next["--mm-adj-sepia"], 0.5);
        assert.equal(next.filter, undefined);
        assert.equal(next.mixBlendMode, "multiply");
        assert.equal(next.opacity, 0.8);

        const read = readVideoLook(next);
        assert.equal(read.filter, "vintage");
        assert.equal(read.adjust.sepia, 0.5);
        assert.equal(read.fit, "contain");
    });

    it("marks a hand-tuned range as custom and writes the filter css once", () => {
        const preset = commitVideoLook(undefined, {
            fit: "cover",
            blendMode: "normal",
            opacity: 1,
            filter: "dramatic",
            adjust: presetAdjust("dramatic"),
        });
        const tuned = {
            ...presetAdjust("dramatic"),
            contrast: 1.8,
        };
        const next = commitVideoLook(preset, {
            fit: "cover",
            blendMode: "normal",
            opacity: 1,
            filter: "custom",
            adjust: tuned,
        });
        assert.equal(next["--mm-image-filter"], "custom");
        assert.equal(next.filter, adjustmentsToCss(tuned));
        assert.equal(readVideoLook(next).filter, "custom");
        assert.equal(readVideoLook(next).adjust.contrast, 1.8);
        assert.equal(String(next.filter).split("contrast(1.8)").length - 1, 1);
    });
});

describe("readPresetLookStyle", () => {
    it("shows a legacy flat filter until the style object is saved", () => {
        const view = readPresetLookStyle(undefined, {
            fit: "contain",
            filter: "vintage",
            blendMode: "multiply",
            opacity: 0.4,
            colorTint: "#112233",
        });
        const look = readVideoLook(view);
        assert.equal(look.fit, "contain");
        assert.equal(look.filter, "vintage");
        assert.equal(look.blendMode, "multiply");
        assert.equal(look.opacity, 0.4);
        assert.equal(look.colorTint, "#112233");
    });
});

describe("readAudioPlayback", () => {
    it("treats a full mute as pressed and leaves a range mute alone", () => {
        const full = readAudioPlayback({ muted: { type: "full", value: true }, volume: 0.4 });
        assert.equal(full.muted, true);
        assert.equal(full.volume, 0.4);
        assert.equal(full.loop, false);
        assert.deepEqual(audioMutedValue(false), null);
        assert.deepEqual(audioMutedValue(true), { type: "full", value: true });

        const range = readAudioPlayback({
            muted: { type: "range", values: [{ start: 0, end: 1 }] },
        });
        assert.equal(range.muted, false);
    });
});

describe("clampTrim", () => {
    it("clears a full-length range and keeps an inset", () => {
        assert.deepEqual(clampTrim(0, 10, 10), { startFrom: null, endAt: null });
        assert.deepEqual(clampTrim(1.25, 8, 10), { startFrom: 1.25, endAt: 8 });
    });
});
