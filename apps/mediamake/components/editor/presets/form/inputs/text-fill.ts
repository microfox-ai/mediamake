/**
 * Text fill stored as plain CSS on a style object.
 *
 * Solid writes `color`. Gradient and image fills paint a background and clip it
 * to the glyphs (`background-clip: text` + transparent text fill). Image
 * adjustments and an overall fill opacity are CSS variables that TextAtom
 * turns into `filter` / `opacity` at render time.
 */
import { formatColor, parseColor } from "./color-utils";

export const TEXT_FILL_STYLE_KEYS = [
    "color",
    "backgroundImage",
    "backgroundClip",
    "WebkitBackgroundClip",
    "WebkitTextFillColor",
    "backgroundPosition",
    "backgroundSize",
    "backgroundRepeat",
    "--text-fill-opacity",
    "--text-fill-exposure",
    "--text-fill-contrast",
    "--text-fill-saturation",
    "--text-fill-temperature",
    "--text-fill-tint",
] as const;

export type GradientStop = { color: string; position: number };

export type SolidFill = { kind: "solid"; color: string };

export type LinearFill = {
    kind: "linear";
    angle: number;
    stops: GradientStop[];
    opacity: number;
};

export type RadialFill = {
    kind: "radial";
    stops: GradientStop[];
    opacity: number;
};

export type ImageFill = {
    kind: "image";
    src: string;
    position: string;
    size: string;
    opacity: number;
    exposure: number;
    contrast: number;
    saturation: number;
    temperature: number;
    tint: number;
};

export type TextFill = SolidFill | LinearFill | RadialFill | ImageFill;

export const IMAGE_POSITIONS = [
    { value: "center", label: "Center" },
    { value: "top", label: "Top" },
    { value: "bottom", label: "Bottom" },
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "left top", label: "Top left" },
    { value: "right top", label: "Top right" },
    { value: "left bottom", label: "Bottom left" },
    { value: "right bottom", label: "Bottom right" },
] as const;

export const IMAGE_SIZES = [
    { value: "auto 1lh", label: "Line" },
    { value: "cover", label: "Cover" },
    { value: "contain", label: "Contain" },
    { value: "100% 100%", label: "Stretch" },
] as const;

const DIRECTIONS: Record<string, number> = {
    "to top": 0,
    "to right": 90,
    "to bottom": 180,
    "to left": 270,
    "to top right": 45,
    "to right top": 45,
    "to bottom right": 135,
    "to right bottom": 135,
    "to bottom left": 225,
    "to left bottom": 225,
    "to top left": 315,
    "to left top": 315,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n);

function readNumber(style: Record<string, unknown> | undefined, key: string, fallback: number): number {
    if (!style || !(key in style) || style[key] == null || style[key] === "") return fallback;
    const n = Number(style[key]);
    return Number.isFinite(n) ? n : fallback;
}

function optionalNumber(value: number, neutral: number): string | undefined {
    return value === neutral ? undefined : String(value);
}

export function defaultImageFill(partial?: Partial<ImageFill>): ImageFill {
    return {
        kind: "image",
        src: "",
        position: "center",
        size: "auto 1lh",
        opacity: 1,
        exposure: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        ...partial,
    };
}

export function cssUrl(src: string): string {
    return `url("${src.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

export function parseCssUrl(input: string): string | null {
    const trimmed = input.trim();
    const quoted = trimmed.match(/^url\(\s*(["'])([\s\S]*?)\1\s*\)$/i);
    if (quoted) return quoted[2].replace(/\\(["'\\])/g, "$1");
    const bare = trimmed.match(/^url\(\s*([^)]+?)\s*\)$/i);
    return bare ? bare[1] : null;
}

function splitTopLevel(input: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const ch of input) {
        if (ch === "(") depth += 1;
        if (ch === ")") depth = Math.max(0, depth - 1);
        if (ch === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
        } else {
            current += ch;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function colorPortion(token: string): string {
    return token.replace(/\s+(-?\d*\.?\d+)(%|px|em|rem)\s*$/i, "").trim();
}

function isColorStop(token: string): boolean {
    return parseColor(colorPortion(token)) !== null;
}

function isLinearDirection(token: string): boolean {
    const text = token.trim();
    return /^-?\d*\.?\d+deg$/i.test(text) || /^to\s+/i.test(text);
}

function directionToAngle(token: string): number {
    const deg = token.trim().match(/^(-?\d*\.?\d+)deg$/i);
    if (deg) return ((Number(deg[1]) % 360) + 360) % 360;
    const key = token.trim().toLowerCase().replace(/\s+/g, " ");
    return DIRECTIONS[key] ?? 180;
}

function parseStop(token: string, index: number, count: number): GradientStop | null {
    const color = colorPortion(token);
    if (!parseColor(color)) return null;
    const pos = token.match(/\s(-?\d*\.?\d+)%\s*$/);
    const position = pos ? Number(pos[1]) : count <= 1 ? 0 : (index / (count - 1)) * 100;
    return { color, position: clamp(position, 0, 100) };
}

export function parseGradient(input: string): LinearFill | RadialFill | null {
    const match = input.trim().match(/^(linear|radial)-gradient\(([\s\S]*)\)$/i);
    if (!match) return null;
    const args = splitTopLevel(match[2]);
    if (args.length === 0) return null;
    const kind = match[1].toLowerCase();
    let rest = args;
    let angle = 180;
    if (kind === "linear" && isLinearDirection(args[0])) {
        angle = directionToAngle(args[0]);
        rest = args.slice(1);
    } else if (kind === "radial" && !isColorStop(args[0])) {
        rest = args.slice(1);
    }
    if (rest.length === 0) return null;
    const stops: GradientStop[] = [];
    for (let i = 0; i < rest.length; i += 1) {
        const stop = parseStop(rest[i], i, rest.length);
        if (!stop) return null;
        stops.push(stop);
    }
    if (kind === "radial") return { kind: "radial", stops, opacity: 1 };
    return { kind: "linear", angle, stops, opacity: 1 };
}

export function gradientCss(fill: LinearFill | RadialFill): string {
    const stops = [...fill.stops]
        .sort((a, b) => a.position - b.position)
        .map((stop) => `${stop.color} ${round(stop.position)}%`)
        .join(", ");
    if (fill.kind === "radial") return `radial-gradient(circle, ${stops})`;
    return `linear-gradient(${round(fill.angle)}deg, ${stops})`;
}

function clearPaint(): Record<string, undefined> {
    return {
        backgroundImage: undefined,
        backgroundClip: undefined,
        WebkitBackgroundClip: undefined,
        WebkitTextFillColor: undefined,
        backgroundPosition: undefined,
        backgroundSize: undefined,
        backgroundRepeat: undefined,
        "--text-fill-opacity": undefined,
        "--text-fill-exposure": undefined,
        "--text-fill-contrast": undefined,
        "--text-fill-saturation": undefined,
        "--text-fill-temperature": undefined,
        "--text-fill-tint": undefined,
    };
}

function clipPaint(opacity: number): Record<string, string | undefined> {
    return {
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        "--text-fill-opacity": optionalNumber(round(opacity * 1000) / 1000, 1),
        "--text-fill-exposure": undefined,
        "--text-fill-contrast": undefined,
        "--text-fill-saturation": undefined,
        "--text-fill-temperature": undefined,
        "--text-fill-tint": undefined,
    };
}

/** Patch for the typography style writer. `undefined` values clear that key. */
export function fillPatch(fill: TextFill): Record<string, string | number | undefined> {
    if (fill.kind === "solid") {
        return {
            ...clearPaint(),
            color: fill.color || undefined,
        };
    }
    if (fill.kind === "linear" || fill.kind === "radial") {
        return {
            ...clipPaint(fill.opacity),
            backgroundImage: gradientCss(fill),
            backgroundPosition: undefined,
            backgroundSize: undefined,
            backgroundRepeat: undefined,
        };
    }
    return {
        ...clipPaint(fill.opacity),
        backgroundImage: cssUrl(fill.src),
        backgroundPosition: fill.position || "center",
        backgroundSize: fill.size || "auto 1lh",
        backgroundRepeat: "no-repeat",
        "--text-fill-exposure": optionalNumber(round(fill.exposure), 0),
        "--text-fill-contrast": optionalNumber(round(fill.contrast), 0),
        "--text-fill-saturation": optionalNumber(round(fill.saturation), 0),
        "--text-fill-temperature": optionalNumber(round(fill.temperature), 0),
        "--text-fill-tint": optionalNumber(round(fill.tint), 0),
    };
}

export function readFill(style: Record<string, unknown> | undefined): TextFill {
    const clipsText = style?.backgroundClip === "text" || style?.WebkitBackgroundClip === "text";
    const background =
        clipsText && typeof style?.backgroundImage === "string" ? style.backgroundImage.trim() : "";
    const opacity = clamp(readNumber(style, "--text-fill-opacity", 1), 0, 1);
    const gradient = background ? parseGradient(background) : null;
    if (gradient?.kind === "linear") return { ...gradient, opacity };
    if (gradient?.kind === "radial") return { ...gradient, opacity };
    const src = background ? parseCssUrl(background) : null;
    if (src) {
        return {
            kind: "image",
            src,
            position: typeof style?.backgroundPosition === "string" ? style.backgroundPosition : "center",
            size: typeof style?.backgroundSize === "string" ? style.backgroundSize : "auto 1lh",
            opacity,
            exposure: readNumber(style, "--text-fill-exposure", 0),
            contrast: readNumber(style, "--text-fill-contrast", 0),
            saturation: readNumber(style, "--text-fill-saturation", 0),
            temperature: readNumber(style, "--text-fill-temperature", 0),
            tint: readNumber(style, "--text-fill-tint", 0),
        };
    }
    return { kind: "solid", color: typeof style?.color === "string" ? style.color : "" };
}

export function mixColors(a: string, b: string, t: number): string {
    const left = parseColor(a);
    const right = parseColor(b);
    if (!left || !right) return a;
    const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
    return formatColor(
        {
            r: mix(left.r, right.r),
            g: mix(left.g, right.g),
            b: mix(left.b, right.b),
            a: left.a + (right.a - left.a) * t,
        },
        "hex",
    );
}

export function colorAtStops(stops: GradientStop[], position: number): string {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    if (sorted.length === 0) return "#ffffff";
    if (position <= sorted[0].position) return sorted[0].color;
    const last = sorted[sorted.length - 1];
    if (position >= last.position) return last.color;
    let left = sorted[0];
    let right = last;
    for (let i = 0; i < sorted.length - 1; i += 1) {
        if (sorted[i].position <= position && sorted[i + 1].position >= position) {
            left = sorted[i];
            right = sorted[i + 1];
            break;
        }
    }
    const span = right.position - left.position || 1;
    return mixColors(left.color, right.color, (position - left.position) / span);
}

export function stopHexAndOpacity(color: string): { hex: string; opacity: number } {
    const parsed = parseColor(color);
    if (!parsed) return { hex: "FFFFFF", opacity: 100 };
    const hex = formatColor({ ...parsed, a: 1 }, "hex").replace(/^#/, "").toUpperCase();
    return { hex, opacity: Math.round(parsed.a * 100) };
}

export function colorFromHexAndOpacity(hex: string, opacity: number): string | null {
    const parsed = parseColor(`#${hex.replace(/^#/, "").trim()}`);
    if (!parsed) return null;
    return formatColor({ ...parsed, a: clamp(opacity, 0, 100) / 100 }, "hex");
}

/**
 * Filter and opacity contributed by a clipped text fill.
 * Keep in sync with `applyTextFillStyle` in the remotion TextAtom.
 */
export function textFillEffectStyle(style: Record<string, unknown> | undefined): {
    opacity?: number;
    filter?: string;
} {
    if (!style) return {};
    const read = (key: string): number | undefined => {
        if (!(key in style) || style[key] == null || style[key] === "") return undefined;
        const n = Number(style[key]);
        return Number.isFinite(n) ? n : undefined;
    };
    const out: { opacity?: number; filter?: string } = {};
    const fillOpacity = read("--text-fill-opacity");
    if (fillOpacity !== undefined) {
        const base = read("opacity") ?? 1;
        out.opacity = base * fillOpacity;
    }
    const exposure = read("--text-fill-exposure") ?? 0;
    const contrast = read("--text-fill-contrast") ?? 0;
    const saturation = read("--text-fill-saturation") ?? 0;
    const temperature = read("--text-fill-temperature") ?? 0;
    const tint = read("--text-fill-tint") ?? 0;
    const parts: string[] = [];
    if (exposure) parts.push(`brightness(${(1 + exposure / 100).toFixed(3)})`);
    if (contrast) parts.push(`contrast(${(1 + contrast / 100).toFixed(3)})`);
    if (saturation) parts.push(`saturate(${Math.max(0, 1 + saturation / 100).toFixed(3)})`);
    if (temperature > 0) {
        const t = temperature / 100;
        parts.push(`sepia(${(t * 0.45).toFixed(3)}) saturate(${(1 + t * 0.35).toFixed(3)})`);
    } else if (temperature < 0) {
        const t = -temperature / 100;
        parts.push(`hue-rotate(${(t * 18).toFixed(2)}deg) saturate(${(1 + t * 0.2).toFixed(3)})`);
    }
    if (tint) parts.push(`hue-rotate(${(tint * 1.8).toFixed(2)}deg)`);
    if (parts.length > 0) {
        const existing = typeof style.filter === "string" && style.filter !== "none" ? style.filter : "";
        out.filter = existing ? `${existing} ${parts.join(" ")}` : parts.join(" ");
    }
    return out;
}
