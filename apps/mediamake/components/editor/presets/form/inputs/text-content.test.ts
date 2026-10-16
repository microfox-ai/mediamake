import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    htmlToPlainText,
    isHtmlText,
    preserveHtmlSpaces,
    serializeRichTextHtml,
    toEditorHtml,
} from "./text-content";

describe("text content", () => {
    it("treats markup as HTML and leaves plain comparisons alone", () => {
        assert.equal(isHtmlText("Hello"), false);
        assert.equal(isHtmlText("a < b"), false);
        assert.equal(isHtmlText("<b>Hello</b>"), true);
        assert.equal(isHtmlText('Hi <span style="color:red">there</span>'), true);
    });

    it("keeps multiple spaces and newlines when converting plain text for the editor", () => {
        const html = toEditorHtml("hello  world\n\nnext");
        assert.match(html, /hello \u00a0world/);
        assert.match(html, /<br>/);
        assert.equal(htmlToPlainText(html), "hello  world\n\nnext");
    });

    it("serializes TipTap paragraphs to br tags without collapsing spaces", () => {
        const out = serializeRichTextHtml("<p>hello  world</p><p>next</p>");
        assert.equal(out, "hello  world<br/>next");
    });

    it("round-trips bold/italic/span HTML and preserves spaces in text nodes", () => {
        const src = '<b>A  B</b> <span style="color: red">C</span>';
        assert.equal(preserveHtmlSpaces(`<p>${src}</p>`), `<p><b>A \u00a0B</b> <span style="color: red">C</span></p>`);
        assert.equal(htmlToPlainText(`<p>${src}</p>`), "A  B C");
        assert.equal(serializeRichTextHtml(`<p>${src}</p>`), src);
    });
});
