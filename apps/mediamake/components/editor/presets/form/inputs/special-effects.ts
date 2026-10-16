/**
 * Special Effects written onto a CSS style object.
 * Variable names match `special-effects-style.ts` in the remotion package.
 * The section is shown for any style marked textStyle or blockStyle.
 */

export const FX = {
    opacity: "--mm-fx-opacity",
    blur: "--mm-fx-blur",
    brightness: "--mm-fx-brightness",
    contrast: "--mm-fx-contrast",
    saturate: "--mm-fx-saturate",
    hue: "--mm-fx-hue",
    grayscale: "--mm-fx-grayscale",
    sepia: "--mm-fx-sepia",
    invert: "--mm-fx-invert",
    blend: "--mm-fx-blend",
    shadowX: "--mm-fx-shadow-x",
    shadowY: "--mm-fx-shadow-y",
    shadowBlur: "--mm-fx-shadow-blur",
    shadowColor: "--mm-fx-shadow-color",
    glowBlur: "--mm-fx-glow-blur",
    glowColor: "--mm-fx-glow-color",
    backdropBlur: "--mm-fx-backdrop-blur",
} as const;

/** CSS keys the Special Effects section owns. Schema children with these keys are not rendered twice. */
export const SPECIAL_EFFECTS_STYLE_KEYS = new Set<string>(Object.values(FX));

export const BLEND_MODES = [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity",
] as const;

export type SpecialEffectId =
    | "opacity"
    | "blur"
    | "brightness"
    | "contrast"
    | "saturate"
    | "hue"
    | "grayscale"
    | "sepia"
    | "invert"
    | "shadow"
    | "glow"
    | "blend"
    | "backdrop";

export type ShadowDraft = { x: number; y: number; blur: number; color: string };
export type GlowDraft = { blur: number; color: string };

export type SpecialEffectsDraft = {
    opacity?: number;
    blur?: number;
    brightness?: number;
    contrast?: number;
    saturate?: number;
    hue?: number;
    grayscale?: number;
    sepia?: number;
    invert?: number;
    shadow?: ShadowDraft;
    glow?: GlowDraft;
    blend?: string;
    backdrop?: number;
};

export const SPECIAL_EFFECT_OPTIONS: { id: SpecialEffectId; label: string }[] = [
    { id: "opacity", label: "Opacity" },
    { id: "blur", label: "Blur" },
    { id: "brightness", label: "Brightness" },
    { id: "contrast", label: "Contrast" },
    { id: "saturate", label: "Saturation" },
    { id: "hue", label: "Hue" },
    { id: "grayscale", label: "Grayscale" },
    { id: "sepia", label: "Sepia" },
    { id: "invert", label: "Invert" },
    { id: "shadow", label: "Drop shadow" },
    { id: "glow", label: "Glow" },
    { id: "blend", label: "Blend" },
    { id: "backdrop", label: "Backdrop blur" },
];

export const EFFECT_DEFAULTS: Required<SpecialEffectsDraft> = {
    opacity: 0.85,
    blur: 8,
    brightness: 110,
    contrast: 110,
    saturate: 130,
    hue: 24,
    grayscale: 100,
    sepia: 70,
    invert: 100,
    shadow: { x: 0, y: 8, blur: 18, color: "rgba(0,0,0,0.45)" },
    glow: { blur: 16, color: "rgba(255,255,255,0.9)" },
    blend: "screen",
    backdrop: 8,
};

const SHADOW_KEYS = [FX.shadowX, FX.shadowY, FX.shadowBlur, FX.shadowColor] as const;

function has(style: Record<string, unknown>, key: string): boolean {
    return key in style && style[key] != null && style[key] !== "";
}

function readNumber(style: Record<string, unknown>, key: string, fallback: number): number {
    if (!has(style, key)) return fallback;
    const raw = style[key];
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function readSpecialEffects(style: Record<string, unknown> | undefined): SpecialEffectsDraft {
    const source = style && typeof style === "object" ? style : {};
    const draft: SpecialEffectsDraft = {};
    if (has(source, FX.opacity)) draft.opacity = clamp(readNumber(source, FX.opacity, 1), 0, 1);
    if (has(source, FX.blur)) draft.blur = Math.max(0, readNumber(source, FX.blur, 0));
    if (has(source, FX.brightness)) draft.brightness = clamp(readNumber(source, FX.brightness, 100), 0, 200);
    if (has(source, FX.contrast)) draft.contrast = clamp(readNumber(source, FX.contrast, 100), 0, 200);
    if (has(source, FX.saturate)) draft.saturate = clamp(readNumber(source, FX.saturate, 100), 0, 200);
    if (has(source, FX.hue)) draft.hue = clamp(readNumber(source, FX.hue, 0), 0, 360);
    if (has(source, FX.grayscale)) draft.grayscale = clamp(readNumber(source, FX.grayscale, 0), 0, 100);
    if (has(source, FX.sepia)) draft.sepia = clamp(readNumber(source, FX.sepia, 0), 0, 100);
    if (has(source, FX.invert)) draft.invert = clamp(readNumber(source, FX.invert, 0), 0, 100);
    if (SHADOW_KEYS.some((key) => has(source, key))) {
        const color = source[FX.shadowColor];
        draft.shadow = {
            x: readNumber(source, FX.shadowX, 0),
            y: readNumber(source, FX.shadowY, 0),
            blur: Math.max(0, readNumber(source, FX.shadowBlur, 0)),
            color: typeof color === "string" && color.trim() ? color : "rgba(0,0,0,0.45)",
        };
    }
    if (has(source, FX.glowBlur) || has(source, FX.glowColor)) {
        const color = source[FX.glowColor];
        draft.glow = {
            blur: Math.max(0, readNumber(source, FX.glowBlur, 0)),
            color: typeof color === "string" && color.trim() ? color : "#ffffff",
        };
    }
    const blend = source[FX.blend];
    if (has(source, FX.blend) && typeof blend === "string") draft.blend = blend;
    if (has(source, FX.backdropBlur)) draft.backdrop = Math.max(0, readNumber(source, FX.backdropBlur, 0));
    return draft;
}

export function effectEnabled(draft: SpecialEffectsDraft, id: SpecialEffectId): boolean {
    return draft[id] !== undefined;
}

/**
 * Write Special Effects onto a style object.
 * Unrelated keys (typography, placement, image look) are left in place.
 */
export function commitSpecialEffects(
    style: Record<string, unknown> | undefined,
    draft: SpecialEffectsDraft,
): Record<string, unknown> | undefined {
    const next: Record<string, unknown> = { ...(style && typeof style === "object" ? style : {}) };
    for (const key of SPECIAL_EFFECTS_STYLE_KEYS) delete next[key];

    if (draft.opacity !== undefined) next[FX.opacity] = clamp(draft.opacity, 0, 1);
    if (draft.blur !== undefined) next[FX.blur] = Math.max(0, draft.blur);
    if (draft.brightness !== undefined) next[FX.brightness] = clamp(draft.brightness, 0, 200);
    if (draft.contrast !== undefined) next[FX.contrast] = clamp(draft.contrast, 0, 200);
    if (draft.saturate !== undefined) next[FX.saturate] = clamp(draft.saturate, 0, 200);
    if (draft.hue !== undefined) next[FX.hue] = clamp(draft.hue, 0, 360);
    if (draft.grayscale !== undefined) next[FX.grayscale] = clamp(draft.grayscale, 0, 100);
    if (draft.sepia !== undefined) next[FX.sepia] = clamp(draft.sepia, 0, 100);
    if (draft.invert !== undefined) next[FX.invert] = clamp(draft.invert, 0, 100);
    if (draft.shadow) {
        next[FX.shadowX] = draft.shadow.x;
        next[FX.shadowY] = draft.shadow.y;
        next[FX.shadowBlur] = Math.max(0, draft.shadow.blur);
        next[FX.shadowColor] = draft.shadow.color;
    }
    if (draft.glow) {
        next[FX.glowBlur] = Math.max(0, draft.glow.blur);
        next[FX.glowColor] = draft.glow.color;
    }
    if (draft.blend) next[FX.blend] = draft.blend;
    if (draft.backdrop !== undefined) next[FX.backdropBlur] = Math.max(0, draft.backdrop);

    return Object.keys(next).length > 0 ? next : undefined;
}
