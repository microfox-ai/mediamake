/** True when the string contains markup that should render as HTML, not literal text. */
export function isHtmlText(value: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(value.trim());
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function decodeBasicEntities(value: string): string {
    return value
        .replace(/\u00a0/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

/**
 * Consecutive spaces collapse in ProseMirror unless they are non-breaking.
 * Only rewrite text nodes so attribute values stay untouched.
 */
export function preserveHtmlSpaces(html: string): string {
    return html.replace(/>([^<]*)</g, (_full, text: string) => `>${text.replace(/ {2}/g, " \u00a0")}<`);
}

export function htmlToPlainText(html: string): string {
    if (!html) return "";
    const withBreaks = html
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<p[^>]*>/gi, "")
        .replace(/<[^>]+>/g, "");
    return decodeBasicEntities(withBreaks).replace(/\n$/, "");
}

export function plainTextToEditorHtml(text: string): string {
    if (!text) return "<p></p>";
    const escaped = escapeHtml(text).replace(/ {2}/g, " \u00a0");
    return `<p>${escaped.split("\n").join("<br>")}</p>`;
}

/** HTML TipTap can parse while keeping spaces and line breaks. */
export function toEditorHtml(value: string): string {
    if (!value) return "<p></p>";
    if (isHtmlText(value)) {
        const wrapped = /<p[\s>]/i.test(value) ? value : `<p>${value}</p>`;
        return preserveHtmlSpaces(wrapped);
    }
    return plainTextToEditorHtml(value);
}

/**
 * Compact HTML for TextAtom: marks + `<br/>` for line breaks.
 * Spaces are kept as regular spaces; the canvas uses `white-space: pre-wrap`.
 */
export function serializeRichTextHtml(html: string): string {
    if (!html) return "";
    let out = html
        .replace(/<\/p>\s*<p[^>]*>/gi, "<br/>")
        .replace(/<\/?p[^>]*>/gi, "")
        .replace(/<\s*strong\b[^>]*>/gi, "<b>")
        .replace(/<\/\s*strong\s*>/gi, "</b>")
        .replace(/<\s*em\b[^>]*>/gi, "<i>")
        .replace(/<\/\s*em\s*>/gi, "</i>")
        .replace(/<br\s*\/?>/gi, "<br/>")
        .replace(/\u00a0/g, " ")
        .replace(/&nbsp;/gi, " ");
    const empty = out.replace(/<br\/>/g, "").replace(/&nbsp;/gi, " ").trim();
    if (!empty) return "";
    return out;
}
