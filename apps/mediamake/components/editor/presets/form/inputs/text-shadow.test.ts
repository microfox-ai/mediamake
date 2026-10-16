import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTextShadow, textShadowCss, textShadowPatch } from "./text-shadow";

describe("text shadow", () => {
    it("writes offset, blur, and color, and reads them back", () => {
        const css = textShadowCss({ x: 2, y: -4, blur: 6, color: "rgba(0,0,0,0.4)" });
        assert.equal(css, "2px -4px 6px rgba(0,0,0,0.4)");
        assert.deepEqual(parseTextShadow(css), { x: 2, y: -4, blur: 6, color: "rgba(0,0,0,0.4)" });
        assert.equal(textShadowPatch(undefined).textShadow, undefined);
    });
});
