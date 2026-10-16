import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTextStrokeShorthand, readTextStroke, textStrokePatch } from "./text-stroke";

describe("text stroke", () => {
    it("writes width and color, and reads them back", () => {
        const patch = textStrokePatch({ width: 2.2, color: "#111111" });
        assert.equal(patch.WebkitTextStrokeWidth, 2.2);
        assert.equal(patch.WebkitTextStrokeColor, "#111111");
        assert.equal(patch.paintOrder, "stroke fill");
        assert.deepEqual(readTextStroke(patch), { width: 2.2, color: "#111111" });
    });

    it("clears a zero width and reads a shorthand outline", () => {
        const cleared = textStrokePatch({ width: 0, color: "#000000" });
        assert.equal(cleared.WebkitTextStrokeWidth, undefined);
        assert.equal(cleared.WebkitTextStrokeColor, undefined);
        assert.deepEqual(parseTextStrokeShorthand("1px rgba(0,0,0,0.3)"), {
            width: 1,
            color: "rgba(0,0,0,0.3)",
        });
        assert.deepEqual(readTextStroke({ WebkitTextStroke: "3px #ffffff" }), {
            width: 3,
            color: "#ffffff",
        });
    });
});
