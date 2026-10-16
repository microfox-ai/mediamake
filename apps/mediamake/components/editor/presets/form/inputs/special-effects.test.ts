import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitSpecialEffects, FX, readSpecialEffects } from "./special-effects";

describe("commitSpecialEffects", () => {
    it("writes effect variables and keeps typography and placement", () => {
        const next = commitSpecialEffects(
            { color: "#fff", fontSize: 64, left: 12 },
            {
                opacity: 0.5,
                blur: 4,
                shadow: { x: 1, y: 2, blur: 3, color: "#000" },
                blend: "multiply",
            },
        );
        assert.equal(next?.color, "#fff");
        assert.equal(next?.fontSize, 64);
        assert.equal(next?.left, 12);
        assert.equal(next?.[FX.opacity], 0.5);
        assert.equal(next?.[FX.blur], 4);
        assert.equal(next?.[FX.shadowX], 1);
        assert.equal(next?.[FX.blend], "multiply");

        const read = readSpecialEffects(next);
        assert.equal(read.opacity, 0.5);
        assert.equal(read.blur, 4);
        assert.deepEqual(read.shadow, { x: 1, y: 2, blur: 3, color: "#000" });
        assert.equal(read.blend, "multiply");
        assert.equal(read.brightness, undefined);
    });

    it("drops removed effects and leaves an empty style undefined", () => {
        const cleared = commitSpecialEffects(
            { [FX.blur]: 8, [FX.opacity]: 0.4 },
            {},
        );
        assert.equal(cleared, undefined);
    });
});
