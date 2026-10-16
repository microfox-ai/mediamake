import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillPatch, gradientCss, parseGradient, readFill, textFillEffectStyle } from "./text-fill";

describe("text fill", () => {
    it("round-trips a linear gradient clipped to text", () => {
        const css = gradientCss({
            kind: "linear",
            angle: 90,
            opacity: 1,
            stops: [
                { color: "#ffffff", position: 0 },
                { color: "#999999", position: 100 },
            ],
        });
        assert.equal(css, "linear-gradient(90deg, #ffffff 0%, #999999 100%)");
        const parsed = parseGradient(css);
        assert.equal(parsed?.kind, "linear");
        if (parsed?.kind !== "linear") return;
        assert.equal(parsed.angle, 90);
        assert.equal(parsed.stops.length, 2);

        const patch = fillPatch({ ...parsed, opacity: 1 });
        assert.equal(patch.backgroundClip, "text");
        assert.equal(patch.WebkitBackgroundClip, "text");
        assert.equal(patch.WebkitTextFillColor, "transparent");
        assert.equal(patch.color, "transparent");
        const style = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
        const fill = readFill(style);
        assert.equal(fill.kind, "linear");
    });

    it("parses directions, radial gradients, and image urls", () => {
        const linear = parseGradient("linear-gradient(to right, rgb(255, 0, 0), blue)");
        assert.equal(linear?.kind, "linear");
        if (linear?.kind === "linear") assert.equal(linear.angle, 90);

        const radial = parseGradient("radial-gradient(circle, #ff7e5f, #feb47b)");
        assert.equal(radial?.kind, "radial");
        if (radial?.kind === "radial") {
            assert.equal(radial.stops[0].position, 0);
            assert.equal(radial.stops[1].position, 100);
        }

        const image = readFill({
            backgroundImage: 'url("https://example.com/reef.jpg")',
            backgroundPosition: "center",
            backgroundSize: "auto 1lh",
            backgroundClip: "text",
        });
        assert.equal(image.kind, "image");
        if (image.kind === "image") {
            assert.equal(image.src, "https://example.com/reef.jpg");
            assert.equal(image.size, "auto 1lh");
        }
    });

    it("clears clip styles when switching back to a solid color", () => {
        const patch = fillPatch({ kind: "solid", color: "#ffffff" });
        assert.equal(patch.color, "#ffffff");
        assert.equal(patch.backgroundImage, undefined);
        assert.equal(patch.backgroundClip, undefined);
        assert.equal(patch.WebkitTextFillColor, undefined);
    });

    it("ignores a block background that is not clipped to the glyphs", () => {
        const fill = readFill({
            color: "#ffffff",
            backgroundColor: "#ff0000",
            backgroundImage: "linear-gradient(90deg, #000000 0%, #ffffff 100%)",
            "--mm-block-fill": "linear",
        });
        assert.equal(fill.kind, "solid");
        if (fill.kind === "solid") assert.equal(fill.color, "#ffffff");
    });

    it("turns image adjustment variables into a css filter", () => {
        const effect = textFillEffectStyle({
            "--text-fill-exposure": "20",
            "--text-fill-contrast": "-10",
            "--text-fill-opacity": "0.5",
            opacity: "0.8",
        });
        assert.equal(effect.opacity, 0.4);
        assert.match(effect.filter ?? "", /brightness\(1\.200\)/);
        assert.match(effect.filter ?? "", /contrast\(0\.900\)/);
    });
});
