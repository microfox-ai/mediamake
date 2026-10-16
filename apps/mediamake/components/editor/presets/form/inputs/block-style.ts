/**
 * Block appearance written as plain CSS on the same style object.
 * Fill paints the element background (not the glyphs). Stroke is the border.
 * Blur, glow, and drop shadow share `filter`, `backdrop-filter`, and `box-shadow`.
 */
import { cssUrl, gradientCss, parseCssUrl, parseGradient, type TextFill } from "./text-fill";

export const BLOCK_FILL_MARKER = "--mm-block-fill";
export const BLOCK_FILL_IMAGE = "--mm-block-fill-image";
export const BLOCK_LAYER_BLUR = "--mm-block-layer-blur";

const FILL_ADJUST = {
    opacity: "--mm-block-fill-opacity",
    exposure: "--mm-block-fill-exposure",
    contrast: "--mm-block-fill-contrast",
    saturation: "--mm-block-fill-saturation",
    temperature: "--mm-block-fill-temperature",
    tint: "--mm-block-fill-tint",
} as const;

export const SHADOW_VARS = {
    x: "--mm-shadow-x",
    y: "--mm-shadow-y",
    blur: "--mm-shadow-blur",
    spread: "--mm-shadow-spread",
    color: "--mm-shadow-color",
} as const;

export const GLOW_VARS = {
    outerBlur: "--mm-glow-outer-blur",
    outerSpread: "--mm-glow-outer-spread",
    outerColor: "--mm-glow-outer-color",
    innerBlur: "--mm-glow-inner-blur",
    innerSpread: "--mm-glow-inner-spread",
    innerColor: "--mm-glow-inner-color",
} as const;

export const BLOCK_APPEARANCE_KEYS = new Set<string>([
    "backgroundColor",
    "backgroundImage",
    "backgroundPosition",
    "backgroundSize",
    "backgroundRepeat",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "borderRadius",
    "boxShadow",
    "backdropFilter",
    BLOCK_FILL_MARKER,
    BLOCK_FILL_IMAGE,
    BLOCK_LAYER_BLUR,
    ...Object.values(FILL_ADJUST),
    ...Object.values(SHADOW_VARS),
    ...Object.values(GLOW_VARS),
]);

export const STROKE_STYLES = ["solid", "dashed", "dotted"] as const;
export type StrokeStyle = (typeof STROKE_STYLES)[number];

export type StrokeDraft = {
    width: number;
    radius: number;
    style: StrokeStyle;
    color: string;
};

export type DropShadowDraft = {
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
};

export type GlowDraft = {
    blur: number;
    spread: number;
    color: string;
};

export type BlockBlur = {
    layer: number;
    backdrop: number;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n);

function readNumber(style: Record<string, unknown> | undefined, key: string): number | undefined {
    if (!style || !(key in style) || style[key] == null || style[key] === "") return undefined;
    const n = Number(style[key]);
    return Number.isFinite(n) ? n : undefined;
}

function optionalNumber(value: number, neutral: number): string | undefined {
    return value === neutral ? undefined : String(value);
}

function clipsText(style: Record<string, unknown> | undefined): boolean {
    return style?.backgroundClip === "text" || style?.WebkitBackgroundClip === "text";
}

function fillOpacity(style: Record<string, unknown> | undefined): number {
    const n = readNumber(style, FILL_ADJUST.opacity);
    return n === undefined ? 1 : clamp(n, 0, 1);
}

export function readBlockFill(style: Record<string, unknown> | undefined): TextFill {
    const marker = style?.[BLOCK_FILL_MARKER];
    const imageProp = clipsText(style) ? BLOCK_FILL_IMAGE : "backgroundImage";
    const rawBackground = style?.[imageProp];
    const background = typeof rawBackground === "string" ? rawBackground.trim() : "";
    const opacity = fillOpacity(style);
    if (marker === "linear" || marker === "radial" || marker === "image") {
        const gradient = background ? parseGradient(background) : null;
        if (gradient?.kind === "linear") return { ...gradient, opacity };
        if (gradient?.kind === "radial") return { ...gradient, opacity };
        const src = background ? parseCssUrl(background) : null;
        if (src || marker === "image") {
            return {
                kind: "image",
                src: src ?? "",
                position: typeof style?.backgroundPosition === "string" && !clipsText(style) ? style.backgroundPosition : "center",
                size: typeof style?.backgroundSize === "string" && !clipsText(style) ? style.backgroundSize : "cover",
                opacity,
                exposure: readNumber(style, FILL_ADJUST.exposure) ?? 0,
                contrast: readNumber(style, FILL_ADJUST.contrast) ?? 0,
                saturation: readNumber(style, FILL_ADJUST.saturation) ?? 0,
                temperature: readNumber(style, FILL_ADJUST.temperature) ?? 0,
                tint: readNumber(style, FILL_ADJUST.tint) ?? 0,
            };
        }
    }
    const color = typeof style?.backgroundColor === "string" ? style.backgroundColor : "";
    return { kind: "solid", color };
}

/** Changes for the style patcher. Does not clear a glyph fill that is clipped to the text. */
export function blockFillChange(
    style: Record<string, unknown> | undefined,
    fill: TextFill,
): Record<string, string | number | undefined> {
    const clipped = clipsText(style);
    const next: Record<string, string | number | undefined> = {
        backgroundColor: undefined,
        [BLOCK_FILL_MARKER]: undefined,
        [BLOCK_FILL_IMAGE]: undefined,
        [FILL_ADJUST.opacity]: undefined,
        [FILL_ADJUST.exposure]: undefined,
        [FILL_ADJUST.contrast]: undefined,
        [FILL_ADJUST.saturation]: undefined,
        [FILL_ADJUST.temperature]: undefined,
        [FILL_ADJUST.tint]: undefined,
    };
    if (!clipped) {
        next.backgroundImage = undefined;
        next.backgroundPosition = undefined;
        next.backgroundSize = undefined;
        next.backgroundRepeat = undefined;
    }

    if (fill.kind === "solid") {
        if (!fill.color) return next;
        next.backgroundColor = fill.color;
        next[BLOCK_FILL_MARKER] = "solid";
        return next;
    }

    const imageTarget = clipped ? BLOCK_FILL_IMAGE : "backgroundImage";
    if (fill.kind === "linear" || fill.kind === "radial") {
        next[imageTarget] = gradientCss(fill);
        next[BLOCK_FILL_MARKER] = fill.kind;
        next[FILL_ADJUST.opacity] = optionalNumber(round(fill.opacity * 1000) / 1000, 1);
        return next;
    }

    next[imageTarget] = fill.src ? cssUrl(fill.src) : undefined;
    next[BLOCK_FILL_MARKER] = fill.src ? "image" : undefined;
    if (!clipped && fill.src) {
        next.backgroundPosition = fill.position || "center";
        next.backgroundSize = fill.size || "cover";
        next.backgroundRepeat = "no-repeat";
    }
    next[FILL_ADJUST.opacity] = optionalNumber(round(fill.opacity * 1000) / 1000, 1);
    next[FILL_ADJUST.exposure] = optionalNumber(round(fill.exposure), 0);
    next[FILL_ADJUST.contrast] = optionalNumber(round(fill.contrast), 0);
    next[FILL_ADJUST.saturation] = optionalNumber(round(fill.saturation), 0);
    next[FILL_ADJUST.temperature] = optionalNumber(round(fill.temperature), 0);
    next[FILL_ADJUST.tint] = optionalNumber(round(fill.tint), 0);
    return next;
}

export function readStroke(style: Record<string, unknown> | undefined): StrokeDraft | undefined {
    const width = readNumber(style, "borderWidth") ?? readNumber(style, "borderTopWidth");
    const radius = readNumber(style, "borderRadius");
    const color = typeof style?.borderColor === "string" ? style.borderColor : "";
    if ((width === undefined || width === 0) && (radius === undefined || radius === 0) && !color) return undefined;
    const raw = typeof style?.borderStyle === "string" ? style.borderStyle : "solid";
    const strokeStyle: StrokeStyle = (STROKE_STYLES as readonly string[]).includes(raw) ? (raw as StrokeStyle) : "solid";
    return {
        width: width ?? 0,
        radius: radius ?? 0,
        style: strokeStyle,
        color: color || "#000000",
    };
}

export function strokePatch(stroke: StrokeDraft | undefined): Record<string, string | number | undefined> {
    if (!stroke || (stroke.width <= 0 && stroke.radius <= 0)) {
        return {
            borderWidth: undefined,
            borderStyle: undefined,
            borderColor: undefined,
            borderRadius: undefined,
        };
    }
    return {
        borderWidth: stroke.width > 0 ? stroke.width : undefined,
        borderStyle: stroke.width > 0 ? stroke.style : undefined,
        borderColor: stroke.width > 0 ? stroke.color : undefined,
        borderRadius: stroke.radius > 0 ? stroke.radius : undefined,
    };
}

export function readBlockBlur(style: Record<string, unknown> | undefined): BlockBlur {
    const layer = readNumber(style, BLOCK_LAYER_BLUR) ?? 0;
    const backdropRaw = typeof style?.backdropFilter === "string" ? style.backdropFilter : "";
    const match = backdropRaw.match(/blur\(\s*(-?\d*\.?\d+)px\s*\)/i);
    return {
        layer: Math.max(0, layer),
        backdrop: match ? Math.max(0, Number(match[1])) : 0,
    };
}

export function blurPatch(blur: BlockBlur): Record<string, string | number | undefined> {
    return {
        [BLOCK_LAYER_BLUR]: blur.layer > 0 ? blur.layer : undefined,
        backdropFilter: blur.backdrop > 0 ? `blur(${blur.backdrop}px)` : undefined,
    };
}

export function readDropShadow(style: Record<string, unknown> | undefined): DropShadowDraft | undefined {
    if (!style || style[SHADOW_VARS.color] == null || style[SHADOW_VARS.color] === "") return undefined;
    return {
        x: readNumber(style, SHADOW_VARS.x) ?? 0,
        y: readNumber(style, SHADOW_VARS.y) ?? 0,
        blur: readNumber(style, SHADOW_VARS.blur) ?? 0,
        spread: readNumber(style, SHADOW_VARS.spread) ?? 0,
        color: String(style[SHADOW_VARS.color]),
    };
}

export function readGlow(style: Record<string, unknown> | undefined, which: "outer" | "inner"): GlowDraft | undefined {
    const colorKey = which === "outer" ? GLOW_VARS.outerColor : GLOW_VARS.innerColor;
    const blurKey = which === "outer" ? GLOW_VARS.outerBlur : GLOW_VARS.innerBlur;
    const spreadKey = which === "outer" ? GLOW_VARS.outerSpread : GLOW_VARS.innerSpread;
    if (!style || style[colorKey] == null || style[colorKey] === "") return undefined;
    return {
        blur: readNumber(style, blurKey) ?? 0,
        spread: readNumber(style, spreadKey) ?? 0,
        color: String(style[colorKey]),
    };
}

function dropCss(shadow: DropShadowDraft): string {
    return `${shadow.x}px ${shadow.y}px ${Math.max(0, shadow.blur)}px ${shadow.spread}px ${shadow.color}`;
}

function glowCss(glow: GlowDraft, inset: boolean): string {
    return `${inset ? "inset " : ""}0 0 ${Math.max(0, glow.blur)}px ${glow.spread}px ${glow.color}`;
}

/** Drop shadow paints above the outer glow. Inner glow stays inside the box. */
export function composeBoxShadow(style: Record<string, unknown> | undefined): string | undefined {
    const parts: string[] = [];
    const drop = readDropShadow(style);
    const outer = readGlow(style, "outer");
    const inner = readGlow(style, "inner");
    if (drop) parts.push(dropCss(drop));
    if (outer) parts.push(glowCss(outer, false));
    if (inner) parts.push(glowCss(inner, true));
    return parts.length > 0 ? parts.join(", ") : undefined;
}

function withBoxShadow(style: Record<string, unknown>, patch: Record<string, string | number | undefined>) {
    const next: Record<string, unknown> = { ...style, ...patch };
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete next[key];
    }
    const shadow = composeBoxShadow(next);
    return { ...patch, boxShadow: shadow };
}

export function dropShadowPatch(
    style: Record<string, unknown> | undefined,
    shadow: DropShadowDraft | undefined,
): Record<string, string | number | undefined> {
    const patch: Record<string, string | number | undefined> = shadow
        ? {
            [SHADOW_VARS.x]: shadow.x,
            [SHADOW_VARS.y]: shadow.y,
            [SHADOW_VARS.blur]: Math.max(0, shadow.blur),
            [SHADOW_VARS.spread]: shadow.spread,
            [SHADOW_VARS.color]: shadow.color,
        }
        : {
            [SHADOW_VARS.x]: undefined,
            [SHADOW_VARS.y]: undefined,
            [SHADOW_VARS.blur]: undefined,
            [SHADOW_VARS.spread]: undefined,
            [SHADOW_VARS.color]: undefined,
        };
    return withBoxShadow(style ?? {}, patch);
}

export function glowPatch(
    style: Record<string, unknown> | undefined,
    which: "outer" | "inner",
    glow: GlowDraft | undefined,
): Record<string, string | number | undefined> {
    const keys = which === "outer"
        ? { blur: GLOW_VARS.outerBlur, spread: GLOW_VARS.outerSpread, color: GLOW_VARS.outerColor }
        : { blur: GLOW_VARS.innerBlur, spread: GLOW_VARS.innerSpread, color: GLOW_VARS.innerColor };
    const patch: Record<string, string | number | undefined> = glow
        ? {
            [keys.blur]: Math.max(0, glow.blur),
            [keys.spread]: glow.spread,
            [keys.color]: glow.color,
        }
        : {
            [keys.blur]: undefined,
            [keys.spread]: undefined,
            [keys.color]: undefined,
        };
    return withBoxShadow(style ?? {}, patch);
}
