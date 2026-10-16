/**
 * Text stroke is the outline around glyphs: width and color.
 * Stored as the WebKit longhands so TextAtom can paint them from `style`.
 * `paint-order: stroke fill` keeps the fill on top of the centered stroke.
 */

export type TextStroke = {
    width: number;
    color: string;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 100) / 100;

function readWidth(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return undefined;
    const n = Number(value.trim().replace(/px$/i, ""));
    return Number.isFinite(n) ? n : undefined;
}

/** `1px #000` or `1px rgba(...)` written as the shorthand. */
export function parseTextStrokeShorthand(value: unknown): TextStroke | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const match = value.trim().match(/^(\d*\.?\d+)px\s+(.+)$/i);
    if (!match) return undefined;
    const width = Number(match[1]);
    if (!Number.isFinite(width) || width <= 0) return undefined;
    const color = match[2].trim();
    if (!color) return undefined;
    return { width, color };
}

export function readTextStroke(style: Record<string, unknown> | undefined): TextStroke | undefined {
    const width = readWidth(style?.WebkitTextStrokeWidth);
    const color = typeof style?.WebkitTextStrokeColor === "string" ? style.WebkitTextStrokeColor.trim() : "";
    if (width !== undefined && width > 0) {
        return { width, color: color || "#000000" };
    }
    return parseTextStrokeShorthand(style?.WebkitTextStroke);
}

/** `undefined` clears the stroke. Width of 0 clears it too. */
export function textStrokePatch(stroke: TextStroke | undefined): {
    WebkitTextStrokeWidth: number | undefined;
    WebkitTextStrokeColor: string | undefined;
    WebkitTextStroke: undefined;
    paintOrder: "stroke fill" | undefined;
} {
    if (!stroke || stroke.width <= 0 || !stroke.color.trim()) {
        return {
            WebkitTextStrokeWidth: undefined,
            WebkitTextStrokeColor: undefined,
            WebkitTextStroke: undefined,
            paintOrder: undefined,
        };
    }
    return {
        WebkitTextStrokeWidth: round(clamp(stroke.width, 0, 64)),
        WebkitTextStrokeColor: stroke.color,
        WebkitTextStroke: undefined,
        paintOrder: "stroke fill",
    };
}
