import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    blockFillChange,
    composeBoxShadow,
    dropShadowPatch,
    glowPatch,
    readBlockFill,
} from "./block-style";

describe("block appearance", () => {
    it("paints the block background without clearing the text color", () => {
        const change = blockFillChange({ color: "#ffffff" }, { kind: "solid", color: "#112233" });
        assert.equal(change.backgroundColor, "#112233");
        assert.equal("color" in change, false);
        const style = { color: "#ffffff", ...change };
        const fill = readBlockFill(style);
        assert.equal(fill.kind, "solid");
        if (fill.kind === "solid") assert.equal(fill.color, "#112233");
    });

    it("keeps a clipped text fill when the block fill is cleared", () => {
        const change = blockFillChange(
            {
                backgroundClip: "text",
                backgroundImage: "linear-gradient(90deg, #fff 0%, #000 100%)",
                color: "transparent",
            },
            { kind: "solid", color: "" },
        );
        assert.equal("backgroundImage" in change, false);
        assert.equal(change.backgroundColor, undefined);
    });

    it("stacks drop shadow above glow on one box-shadow", () => {
        const withDrop = dropShadowPatch(undefined, {
            x: 0,
            y: 8,
            blur: 16,
            spread: 0,
            color: "rgba(0,0,0,0.4)",
        });
        const style = Object.fromEntries(Object.entries(withDrop).filter(([, value]) => value !== undefined));
        const withGlow = glowPatch(style, "outer", { blur: 12, spread: 2, color: "#ffffff" });
        const shadow = withGlow.boxShadow;
        assert.equal(
            shadow,
            "0px 8px 16px 0px rgba(0,0,0,0.4), 0 0 12px 2px #ffffff",
        );
        assert.equal(composeBoxShadow({ ...style, ...withGlow }), shadow);
    });
});
