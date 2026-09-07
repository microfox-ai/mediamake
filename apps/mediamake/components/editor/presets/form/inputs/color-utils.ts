/**
 * Color parsing / conversion helpers for the color input widgets.
 *
 * Everything is dependency-free and works on plain CSS color strings, which is
 * what presets and layer styles store. The canonical internal shape is RGBA
 * with 0-255 channels and 0-1 alpha.
 */

export interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface Hsva {
    h: number; // 0-360
    s: number; // 0-100
    v: number; // 0-100
    a: number; // 0-1
}

export type ColorFormat = "hex" | "rgb" | "hsl";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number, places = 0) => {
    const f = 10 ** places;
    return Math.round(n * f) / f;
};

/** CSS named colors we resolve without touching the DOM (render-safe). */
const NAMED_COLORS: Record<string, string> = {
    transparent: "#00000000",
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    green: "#008000",
    lime: "#00ff00",
    blue: "#0000ff",
    yellow: "#ffff00",
    cyan: "#00ffff",
    aqua: "#00ffff",
    magenta: "#ff00ff",
    fuchsia: "#ff00ff",
    silver: "#c0c0c0",
    gray: "#808080",
    grey: "#808080",
    maroon: "#800000",
    olive: "#808000",
    purple: "#800080",
    teal: "#008080",
    navy: "#000080",
    orange: "#ffa500",
    pink: "#ffc0cb",
    gold: "#ffd700",
    indigo: "#4b0082",
    violet: "#ee82ee",
    brown: "#a52a2a",
    beige: "#f5f5dc",
    coral: "#ff7f50",
    crimson: "#dc143c",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    salmon: "#fa8072",
    tan: "#d2b48c",
    turquoise: "#40e0d0",
    tomato: "#ff6347",
    orchid: "#da70d6",
    plum: "#dda0dd",
    ivory: "#fffff0",
    mint: "#98ff98",
    skyblue: "#87ceeb",
    steelblue: "#4682b4",
    slategray: "#708090",
    darkgray: "#a9a9a9",
    lightgray: "#d3d3d3",
    darkred: "#8b0000",
    darkgreen: "#006400",
    darkblue: "#00008b",
    lightblue: "#add8e6",
    lightgreen: "#90ee90",
    hotpink: "#ff69b4",
    deeppink: "#ff1493",
    chocolate: "#d2691e",
};

export const isTransparentKeyword = (value: string) =>
    value.trim().toLowerCase() === "transparent";

/**
 * Parse any common CSS color string into RGBA.
 * Returns null when the string is not a color we understand (a CSS variable,
 * a gradient, an expression, …) so callers can fall back to a text input.
 */
export function parseColor(input: string | null | undefined): Rgba | null {
    if (typeof input !== "string") return null;
    let value = input.trim().toLowerCase();
    if (!value) return null;

    if (NAMED_COLORS[value]) value = NAMED_COLORS[value];

    // #rgb / #rgba / #rrggbb / #rrggbbaa
    if (value.startsWith("#")) {
        const hex = value.slice(1);
        if (!/^[0-9a-f]+$/.test(hex)) return null;
        if (hex.length === 3 || hex.length === 4) {
            const [r, g, b, a] = hex.split("");
            return {
                r: parseInt(r + r, 16),
                g: parseInt(g + g, 16),
                b: parseInt(b + b, 16),
                a: a === undefined ? 1 : round(parseInt(a + a, 16) / 255, 3),
            };
        }
        if (hex.length === 6 || hex.length === 8) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: hex.length === 8 ? round(parseInt(hex.slice(6, 8), 16) / 255, 3) : 1,
            };
        }
        return null;
    }

    // rgb()/rgba() — supports both comma and slash-alpha syntax.
    const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(/[,/\s]+/).filter(Boolean);
        if (parts.length < 3) return null;
        const channel = (raw: string) =>
            raw.endsWith("%") ? (parseFloat(raw) / 100) * 255 : parseFloat(raw);
        const r = channel(parts[0]);
        const g = channel(parts[1]);
        const b = channel(parts[2]);
        if ([r, g, b].some((n) => Number.isNaN(n))) return null;
        let a = 1;
        if (parts[3] !== undefined) {
            a = parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
            if (Number.isNaN(a)) a = 1;
        }
        return {
            r: clamp(Math.round(r), 0, 255),
            g: clamp(Math.round(g), 0, 255),
            b: clamp(Math.round(b), 0, 255),
            a: clamp(round(a, 3), 0, 1),
        };
    }

    // hsl()/hsla()
    const hslMatch = value.match(/^hsla?\(([^)]+)\)$/);
    if (hslMatch) {
        const parts = hslMatch[1].split(/[,/\s]+/).filter(Boolean);
        if (parts.length < 3) return null;
        const h = parseFloat(parts[0]);
        const s = parseFloat(parts[1]) / 100;
        const l = parseFloat(parts[2]) / 100;
        if ([h, s, l].some((n) => Number.isNaN(n))) return null;
        let a = 1;
        if (parts[3] !== undefined) {
            a = parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
            if (Number.isNaN(a)) a = 1;
        }
        return { ...hslToRgb(h, s * 100, l * 100), a: clamp(round(a, 3), 0, 1) };
    }

    return null;
}

function hslToRgb(h: number, s: number, l: number): Omit<Rgba, "a"> {
    const sN = s / 100;
    const lN = l / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = sN * Math.min(lN, 1 - lN);
    const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
        r: clamp(Math.round(f(0) * 255), 0, 255),
        g: clamp(Math.round(f(8) * 255), 0, 255),
        b: clamp(Math.round(f(4) * 255), 0, 255),
    };
}

export function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
    const rN = r / 255;
    const gN = g / 255;
    const bN = b / 255;
    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
        if (max === rN) h = ((gN - bN) / d) % 6;
        else if (max === gN) h = (bN - rN) / d + 2;
        else h = (rN - gN) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return {
        h: round(h, 1),
        s: round(max === 0 ? 0 : (d / max) * 100, 1),
        v: round(max * 100, 1),
        a,
    };
}

export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
    const sN = s / 100;
    const vN = v / 100;
    const c = vN * sN;
    const hh = ((h % 360) + 360) % 360 / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let rgb: [number, number, number];
    if (hh < 1) rgb = [c, x, 0];
    else if (hh < 2) rgb = [x, c, 0];
    else if (hh < 3) rgb = [0, c, x];
    else if (hh < 4) rgb = [0, x, c];
    else if (hh < 5) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    const m = vN - c;
    return {
        r: clamp(Math.round((rgb[0] + m) * 255), 0, 255),
        g: clamp(Math.round((rgb[1] + m) * 255), 0, 255),
        b: clamp(Math.round((rgb[2] + m) * 255), 0, 255),
        a: clamp(a, 0, 1),
    };
}

export function rgbaToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
    const rN = r / 255;
    const gN = g / 255;
    const bN = b / 255;
    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        if (max === rN) h = ((gN - bN) / d) % 6;
        else if (max === gN) h = (bN - rN) / d + 2;
        else h = (rN - gN) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h: round(h), s: round(s * 100), l: round(l * 100) };
}

const toHexPair = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

export function rgbaToHex(rgba: Rgba, includeAlpha = true): string {
    const base = `#${toHexPair(rgba.r)}${toHexPair(rgba.g)}${toHexPair(rgba.b)}`;
    if (!includeAlpha || rgba.a >= 1) return base;
    return `${base}${toHexPair(rgba.a * 255)}`;
}

/** Serialize RGBA back to a CSS string in the requested notation. */
export function formatColor(rgba: Rgba, format: ColorFormat): string {
    switch (format) {
        case "rgb":
            return rgba.a >= 1
                ? `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`
                : `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${round(rgba.a, 3)})`;
        case "hsl": {
            const { h, s, l } = rgbaToHsl(rgba);
            return rgba.a >= 1
                ? `hsl(${h}, ${s}%, ${l}%)`
                : `hsla(${h}, ${s}%, ${l}%, ${round(rgba.a, 3)})`;
        }
        case "hex":
        default:
            return rgbaToHex(rgba);
    }
}

/** Guess which notation a stored value already uses, so we round-trip it. */
export function detectFormat(value: string | null | undefined): ColorFormat {
    if (typeof value !== "string") return "hex";
    const v = value.trim().toLowerCase();
    if (v.startsWith("rgb")) return "rgb";
    if (v.startsWith("hsl")) return "hsl";
    return "hex";
}

/** Relative luminance (WCAG) — used to pick a readable overlay/handle color. */
export function luminance({ r, g, b }: Rgba): number {
    const channel = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two opaque colors (1–21). */
export function contrastRatio(a: Rgba, b: Rgba): number {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return round((hi + 0.05) / (lo + 0.05), 2);
}

export const isDarkColor = (rgba: Rgba) => luminance(rgba) < 0.4;

/** CSS background showing a color over a checkerboard, so alpha is visible. */
export const CHECKERBOARD_STYLE = {
    backgroundImage:
        "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
} as const;

/** Harmony helpers — offsets applied to the hue wheel. */
export const HARMONY_OFFSETS: Record<string, number[]> = {
    Complementary: [180],
    Triadic: [120, 240],
    Analogous: [-30, 30],
    "Split comp.": [150, 210],
    Tetradic: [90, 180, 270],
};

export function harmonyColors(base: Hsva, offsets: number[]): Hsva[] {
    return offsets.map((offset) => ({ ...base, h: (((base.h + offset) % 360) + 360) % 360 }));
}

/** Tints/shades ramp for the current hue — handy for building palettes. */
export function shadeRamp(base: Hsva, steps = 9): Hsva[] {
    return Array.from({ length: steps }, (_, i) => ({
        ...base,
        v: clamp(round(((i + 1) / (steps + 1)) * 100, 1), 0, 100),
    }));
}

export const DEFAULT_SWATCHES = [
    "#000000", "#ffffff", "#f43f5e", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#78716c", "transparent",
];
