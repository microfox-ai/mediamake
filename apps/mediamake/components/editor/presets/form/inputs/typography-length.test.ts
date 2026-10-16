import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyLength, formatCssLength, splitCssLength } from "./typography-length";

describe("typography lengths", () => {
    it("keeps font size as an integer, percent, ch, or em", () => {
        assert.equal(applyLength("64", "int", "font"), 64);
        assert.equal(applyLength("120%", "int", "font"), "120%");
        assert.equal(applyLength("2", "ch", "font", false), "2ch");
        assert.equal(applyLength("1.5", "em", "font", false), "1.5em");
        assert.equal(applyLength("48px", "int", "font"), 48);
    });

    it("uses 64 when font size is empty", () => {
        assert.equal(formatCssLength(undefined, "font"), "");
        assert.equal(applyLength("", "int", "font"), 64);
        assert.equal(applyLength("", "%", "font", false), "64%");
        assert.equal(applyLength("0", "int", "font"), null);
    });

    it("keeps line height units instead of rewriting a number as a percent", () => {
        assert.equal(formatCssLength(1.2, "line"), "1.2");
        assert.equal(applyLength("1.2", "int", "line"), 1.2);
        assert.equal(applyLength("120", "%", "line", false), "120%");
        assert.equal(applyLength("1.2em", "int", "line"), "1.2em");
        assert.equal(applyLength("1", "ch", "line", false), "1ch");
        assert.equal(applyLength("24px", "int", "line"), "24px");
        assert.equal(applyLength("", "int", "line"), undefined);
        assert.equal(splitCssLength(formatCssLength("24px", "line")).unit, "px");
    });

    it("keeps letter spacing units instead of converting em to a percent", () => {
        assert.equal(formatCssLength("0.04em", "tracking"), "0.04em");
        assert.equal(applyLength("2", "int", "tracking"), 2);
        assert.equal(applyLength("2", "%", "tracking", false), "2%");
        assert.equal(applyLength("0.05", "em", "tracking", false), "0.05em");
        assert.equal(applyLength("0.1", "ch", "tracking", false), "0.1ch");
        assert.equal(applyLength("-0.02", "em", "tracking", false), "-0.02em");
        assert.equal(applyLength("0", "int", "tracking"), undefined);
        assert.equal(applyLength("", "int", "tracking"), undefined);
    });
});
