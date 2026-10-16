/** CSS lengths the Typography controls edit: a unitless number, or %, ch, em. */

export const DEFAULT_FONT_SIZE = 64;

export type LengthMode = "font" | "line" | "tracking";

/** `int` is a unitless number (font size and letter spacing render as pixels). `px` is only kept for an existing line-height. */
export type LengthUnit = "int" | "%" | "ch" | "em" | "px";

const UNIT_CHOICES = ["int", "%", "ch", "em"] as const;
const LENGTH_RE = /^(-?\d*\.?\d+)\s*(%|ch|em|px)?$/i;

const round = (n: number) => Math.round(n * 10000) / 10000;

export function unitLabel(unit: LengthUnit): string {
    if (unit === "int") return "#";
    return unit;
}

export function splitCssLength(formatted: string): { amount: string; unit: LengthUnit } {
    if (!formatted) return { amount: "", unit: "int" };
    const match = formatted.match(LENGTH_RE);
    if (!match || !match[1] || match[1] === "-" || match[1] === "." || match[1] === "-.") {
        return { amount: formatted, unit: "int" };
    }
    const unit = (match[2]?.toLowerCase() ?? "int") as LengthUnit;
    return { amount: match[1], unit };
}

/** What the number box shows. An empty font size uses the placeholder default of 64. */
export function formatCssLength(value: unknown, mode: LengthMode): string {
    if (value === undefined || value === null || value === "" || value === "normal" || value === "auto") {
        return "";
    }
    if (typeof value === "number" && Number.isFinite(value)) return String(round(value));
    const text = String(value).trim();
    const match = text.match(LENGTH_RE);
    if (!match || !match[1]) return text;
    const n = Number(match[1]);
    if (!Number.isFinite(n)) return text;
    const unit = (match[2] ?? "").toLowerCase();
    const amount = String(round(n));
    if (!unit || (unit === "px" && mode !== "line")) return amount;
    return `${amount}${unit}`;
}

function numericPart(amount: string): string {
    return amount.trim().replace(/(%|ch|em|px)\s*$/i, "").trim();
}

export function joinCssLength(amount: string, unit: LengthUnit): string {
    const text = numericPart(amount);
    if (!text) return "";
    if (unit === "px") return `${text}px`;
    if (unit === "int") return text;
    return `${text}${unit}`;
}

/**
 * Parse a length the user typed or chose a unit for.
 * `null` means the text was not understood and the style should stay as it is.
 * `undefined` clears the property. Font size falls back to 64 instead of clearing.
 */
export function applyLength(
    amount: string,
    unit: LengthUnit,
    mode: LengthMode,
    honorTypedUnit = true,
): number | string | undefined | null {
    const typed = amount.trim();
    if (!typed) {
        if (honorTypedUnit) return mode === "font" ? DEFAULT_FONT_SIZE : undefined;
        if (mode === "font") return parseCssLength(joinCssLength(String(DEFAULT_FONT_SIZE), unit), mode);
        if (unit === "int" || unit === "px") return undefined;
        return parseCssLength(joinCssLength(mode === "tracking" ? "0" : "1", unit), mode);
    }
    const raw = honorTypedUnit && /(%|ch|em|px)\s*$/i.test(typed) ? typed : joinCssLength(typed, unit);
    return parseCssLength(raw, mode);
}

export function parseCssLength(raw: string, mode: LengthMode): number | string | undefined | null {
    const text = raw.trim().toLowerCase();
    if (!text || text === "auto" || text === "normal") {
        return mode === "font" ? DEFAULT_FONT_SIZE : undefined;
    }
    const match = text.match(LENGTH_RE);
    if (!match || !match[1] || match[1] === "-" || match[1] === "." || match[1] === "-.") return null;
    const n = Number(match[1]);
    if (!Number.isFinite(n)) return null;
    if (mode !== "tracking" && n < 0) return null;
    if (mode === "font" && n === 0) return null;
    const unit = (match[2] ?? "").toLowerCase();
    if (mode === "tracking" && n === 0 && (!unit || unit === "px")) return undefined;
    if (!unit || (unit === "px" && mode !== "line")) return round(n);
    if (unit === "px") return `${round(n)}px`;
    return `${round(n)}${unit}`;
}

export const LENGTH_UNIT_OPTIONS = UNIT_CHOICES;
