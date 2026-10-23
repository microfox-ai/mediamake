import {
    IMAGE_BLEND_MODES,
    IMAGE_FILTERS,
    IMAGE_FITS,
    readImageLookSafe,
    type ImageBlendMode,
    type ImageFilter,
    type ImageFit,
} from "./image-style";

export { IMAGE_BLEND_MODES, IMAGE_FILTERS, IMAGE_FITS };
export type { ImageBlendMode, ImageFilter, ImageFit };

const MM = {
    fit: "--mm-image-fit",
    filter: "--mm-image-filter",
    blend: "--mm-image-blend",
    tint: "--mm-image-tint",
    opacity: "--mm-image-opacity",
} as const;

/** Keep in sync with FILTER_ADJUST_VARS in packages/remotion image-style. */
export const FILTER_ADJUST_VARS = {
    blur: "--mm-adj-blur",
    brightness: "--mm-adj-brightness",
    contrast: "--mm-adj-contrast",
    saturate: "--mm-adj-saturate",
    grayscale: "--mm-adj-grayscale",
    sepia: "--mm-adj-sepia",
    hueRotate: "--mm-adj-hue",
    invert: "--mm-adj-invert",
} as const;

export type FilterAdjustKey = keyof typeof FILTER_ADJUST_VARS;

export type FilterAdjust = Record<FilterAdjustKey, number>;

export const FILTER_ADJUST_DEFAULT: FilterAdjust = {
    blur: 0,
    brightness: 1,
    contrast: 1,
    saturate: 1,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0,
    invert: 0,
};

const PRESETS: Record<ImageFilter, FilterAdjust> = {
    none: { ...FILTER_ADJUST_DEFAULT },
    blur: { ...FILTER_ADJUST_DEFAULT, blur: 2 },
    brightness: { ...FILTER_ADJUST_DEFAULT, brightness: 1.2 },
    contrast: { ...FILTER_ADJUST_DEFAULT, contrast: 1.3 },
    saturate: { ...FILTER_ADJUST_DEFAULT, saturate: 1.5 },
    grayscale: { ...FILTER_ADJUST_DEFAULT, grayscale: 1 },
    sepia: { ...FILTER_ADJUST_DEFAULT, sepia: 1 },
    "hue-rotate": { ...FILTER_ADJUST_DEFAULT, hueRotate: 180 },
    invert: { ...FILTER_ADJUST_DEFAULT, invert: 1 },
    distorted: { ...FILTER_ADJUST_DEFAULT, contrast: 1.5, saturate: 1.3, hueRotate: 15 },
    vintage: { ...FILTER_ADJUST_DEFAULT, sepia: 0.5, contrast: 1.2, brightness: 0.9, saturate: 1.1 },
    dramatic: { ...FILTER_ADJUST_DEFAULT, contrast: 1.4, saturate: 1.3, brightness: 0.8 },
    soft: { ...FILTER_ADJUST_DEFAULT, blur: 0.5, brightness: 1.1, contrast: 0.9 },
    sharp: { ...FILTER_ADJUST_DEFAULT, contrast: 1.2, saturate: 1.1, brightness: 1.05 },
};

/** Atom fields the video section owns, so the generic form does not render them again. */
export const VIDEO_ATOM_FIELD_KEYS = [
    "src",
    "srcDuration",
    "className",
    "containerClassName",
    "startFrom",
    "endAt",
    "playbackRate",
    "volume",
    "muted",
    "loop",
    "fit",
] as const;

/** Atom fields the audio section owns, so the generic form does not render them again. */
export const AUDIO_ATOM_FIELD_KEYS = [
    "src",
    "startFrom",
    "endAt",
    "volume",
    "muted",
    "playbackRate",
] as const;

/** Flat item fields replaced by an imageStyle / videoStyle object. */
export const PRESET_LOOK_FLAT_KEYS = ["fit", "filter", "blendMode", "opacity", "colorTint"] as const;

/** Style keys written by the video look, including per-filter ranges. */
export const VIDEO_LOOK_KEYS = new Set<string>([
    "objectFit",
    "filter",
    "mixBlendMode",
    "opacity",
    ...Object.values(MM),
    ...Object.values(FILTER_ADJUST_VARS),
]);

export type VideoFilterName = ImageFilter | "custom";

export type VideoLookDraft = {
    fit: ImageFit;
    blendMode: ImageBlendMode;
    opacity: number;
    colorTint?: string;
    filter: VideoFilterName;
    adjust: FilterAdjust;
};

export type VideoPlayback = {
    startFrom?: number;
    endAt?: number;
    volume: number;
    muted: boolean;
    loop: boolean;
    srcDuration?: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

function neutral(): FilterAdjust {
    return { ...FILTER_ADJUST_DEFAULT };
}

export function presetAdjust(filter: VideoFilterName): FilterAdjust {
    if (filter === "custom") return neutral();
    return { ...PRESETS[filter] };
}

function formatAdjustNumber(value: number): string {
    return String(round3(value));
}

/** Same function order as `adjustmentsToCss` in the remotion package. */
export function adjustmentsToCss(adjust: FilterAdjust): string | undefined {
    const parts: string[] = [];
    if (Math.abs(adjust.blur) > 0.001) parts.push(`blur(${formatAdjustNumber(adjust.blur)}px)`);
    if (Math.abs(adjust.brightness - 1) > 0.001) {
        parts.push(`brightness(${formatAdjustNumber(adjust.brightness)})`);
    }
    if (Math.abs(adjust.contrast - 1) > 0.001) {
        parts.push(`contrast(${formatAdjustNumber(adjust.contrast)})`);
    }
    if (Math.abs(adjust.saturate - 1) > 0.001) {
        parts.push(`saturate(${formatAdjustNumber(adjust.saturate)})`);
    }
    if (Math.abs(adjust.grayscale) > 0.001) {
        parts.push(`grayscale(${Math.round(adjust.grayscale * 100)}%)`);
    }
    if (Math.abs(adjust.sepia) > 0.001) parts.push(`sepia(${Math.round(adjust.sepia * 100)}%)`);
    if (Math.abs(adjust.hueRotate) > 0.001) {
        parts.push(`hue-rotate(${formatAdjustNumber(adjust.hueRotate)}deg)`);
    }
    if (Math.abs(adjust.invert) > 0.001) parts.push(`invert(${Math.round(adjust.invert * 100)}%)`);
    return parts.length > 0 ? parts.join(" ") : undefined;
}

function unitAmount(raw: string, percent: boolean): number {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return percent ? n / 100 : n;
}

export function parseFilterCss(css: string | undefined): FilterAdjust | undefined {
    if (!css || css === "none") return undefined;
    const adjust = neutral();
    let matched = false;
    const take = (re: RegExp): RegExpMatchArray | undefined => {
        const found = css.match(re);
        if (!found) return undefined;
        matched = true;
        return found;
    };
    const blur = take(/blur\(\s*([-\d.]+)px\s*\)/i);
    if (blur) adjust.blur = Number(blur[1]);
    const brightness = take(/brightness\(\s*([-\d.]+)\s*(%?)\s*\)/i);
    if (brightness) adjust.brightness = unitAmount(brightness[1], brightness[2] === "%");
    const contrast = take(/contrast\(\s*([-\d.]+)\s*(%?)\s*\)/i);
    if (contrast) adjust.contrast = unitAmount(contrast[1], contrast[2] === "%");
    const saturate = take(/saturate\(\s*([-\d.]+)\s*(%?)\s*\)/i);
    if (saturate) adjust.saturate = unitAmount(saturate[1], saturate[2] === "%");
    const grayscale = take(/grayscale\(\s*([-\d.]+)\s*(%?)\s*\)/i);
    if (grayscale) adjust.grayscale = unitAmount(grayscale[1], grayscale[2] === "%");
    const sepia = take(/sepia\(\s*([-\d.]+)\s*(%?)\s*\)/i);
    if (sepia) adjust.sepia = unitAmount(sepia[1], sepia[2] === "%");
    const hue = take(/hue-rotate\(\s*([-\d.]+)deg\s*\)/i);
    if (hue) adjust.hueRotate = Number(hue[1]);
    const invert = take(/invert\(\s*([-\d.]+)\s*(%?)\s*\)/i);
    if (invert) adjust.invert = unitAmount(invert[1], invert[2] === "%");
    return matched ? adjust : undefined;
}

function readAdjust(style: Record<string, unknown>): FilterAdjust | undefined {
    const present = (Object.values(FILTER_ADJUST_VARS) as string[]).some(
        (key) => typeof style[key] === "number",
    );
    if (!present) return undefined;
    const next = neutral();
    (Object.keys(FILTER_ADJUST_VARS) as FilterAdjustKey[]).forEach((key) => {
        const value = style[FILTER_ADJUST_VARS[key]];
        if (typeof value === "number" && Number.isFinite(value)) next[key] = value;
    });
    return next;
}

function isFit(value: unknown): value is ImageFit {
    return typeof value === "string" && (IMAGE_FITS as readonly string[]).includes(value);
}

function isFilter(value: unknown): value is ImageFilter {
    return typeof value === "string" && (IMAGE_FILTERS as readonly string[]).includes(value);
}

export function readVideoLook(
    style: Record<string, unknown> | undefined,
    atomFit?: unknown,
): VideoLookDraft {
    const source = style && typeof style === "object" ? style : {};
    const base = readImageLookSafe(source);
    const marked = source[MM.filter];
    let filter: VideoFilterName = base.filter;
    let adjust = presetAdjust(base.filter);
    if (marked === "custom") {
        filter = "custom";
        adjust = readAdjust(source)
            ?? parseFilterCss(typeof source.filter === "string" ? source.filter : undefined)
            ?? neutral();
    } else if (isFilter(marked)) {
        filter = marked;
        adjust = presetAdjust(marked);
    } else if (typeof source.filter === "string" && source.filter && source.filter !== "none") {
        const parsed = parseFilterCss(source.filter);
        if (parsed) {
            filter = "custom";
            adjust = parsed;
        }
    }
    const fit = !source[MM.fit] && !isFit(source.objectFit) && isFit(atomFit) ? atomFit : base.fit;
    return {
        fit,
        blendMode: base.blendMode,
        opacity: base.opacity,
        colorTint: base.colorTint,
        filter,
        adjust,
    };
}

export function commitVideoLook(
    style: Record<string, unknown> | undefined,
    draft: VideoLookDraft,
): Record<string, unknown> {
    const next: Record<string, unknown> = { ...(style && typeof style === "object" ? style : {}) };
    for (const key of VIDEO_LOOK_KEYS) delete next[key];

    next.objectFit = draft.fit;
    next[MM.fit] = draft.fit;

    if (draft.blendMode && draft.blendMode !== "normal") {
        next.mixBlendMode = draft.blendMode;
        next[MM.blend] = draft.blendMode;
    }
    if (draft.opacity !== 1 && Number.isFinite(draft.opacity)) {
        next.opacity = draft.opacity;
        next[MM.opacity] = draft.opacity;
    }
    if (draft.colorTint && draft.colorTint.trim()) next[MM.tint] = draft.colorTint.trim();

    const filterName = draft.filter === "custom" ? "custom" : draft.filter;
    if (filterName !== "none") next[MM.filter] = filterName;

    const adjust = filterName === "custom" ? draft.adjust : presetAdjust(filterName);
    (Object.keys(FILTER_ADJUST_VARS) as FilterAdjustKey[]).forEach((key) => {
        const value = adjust[key];
        const fallback = FILTER_ADJUST_DEFAULT[key];
        if (Math.abs(value - fallback) > 0.001) next[FILTER_ADJUST_VARS[key]] = round3(value);
    });
    if (filterName === "custom") {
        const css = adjustmentsToCss(adjust);
        if (css) next.filter = css;
    }
    return next;
}

const LOOK_MARKERS = [MM.fit, MM.filter, MM.blend, MM.tint, MM.opacity] as const;

export function styleHasLookMarkers(style: unknown): style is Record<string, unknown> {
    if (!style || typeof style !== "object") return false;
    const record = style as Record<string, unknown>;
    return LOOK_MARKERS.some((key) => record[key] !== undefined && record[key] !== "");
}

/**
 * Show legacy flat fit / filter / blend / opacity / tint in the look editor
 * until the item is saved as a style object.
 */
export function readPresetLookStyle(
    style: Record<string, unknown> | undefined,
    legacy?: Record<string, unknown>,
): Record<string, unknown> {
    const next: Record<string, unknown> = { ...(style ?? {}) };
    const item = legacy ?? {};
    if (next[MM.fit] == null && isFit(item.fit)) {
        next[MM.fit] = item.fit;
        if (!isFit(next.objectFit)) next.objectFit = item.fit;
    }
    if (next[MM.filter] == null && next.filter == null && isFilter(item.filter)) {
        next[MM.filter] = item.filter;
    }
    if (next[MM.blend] == null && next.mixBlendMode == null && typeof item.blendMode === "string") {
        next[MM.blend] = item.blendMode;
        if (item.blendMode !== "normal") next.mixBlendMode = item.blendMode;
    }
    if (next[MM.opacity] == null && typeof next.opacity !== "number" && typeof item.opacity === "number") {
        next[MM.opacity] = item.opacity;
        next.opacity = item.opacity;
    }
    if (next[MM.tint] == null && typeof item.colorTint === "string" && item.colorTint.trim()) {
        next[MM.tint] = item.colorTint;
    }
    return next;
}

export function readVideoPlayback(atom: Record<string, unknown> | undefined): VideoPlayback {
    const source = atom && typeof atom === "object" ? atom : {};
    const volume = typeof source.volume === "number" && Number.isFinite(source.volume) ? source.volume : 1;
    const srcDuration = typeof source.srcDuration === "number" && source.srcDuration > 0
        ? source.srcDuration
        : undefined;
    return {
        startFrom: typeof source.startFrom === "number" && Number.isFinite(source.startFrom)
            ? source.startFrom
            : undefined,
        endAt: typeof source.endAt === "number" && Number.isFinite(source.endAt) ? source.endAt : undefined,
        volume,
        muted: source.muted === true,
        loop: source.loop === true,
        srcDuration,
    };
}

/** Audio mute is `{ type: 'full', value }` or a range. The button is the full mute. */
export function readAudioMuted(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    const record = value as { type?: unknown; value?: unknown };
    return record.type === "full" && record.value === true;
}

export function readAudioPlayback(atom: Record<string, unknown> | undefined): VideoPlayback {
    const playback = readVideoPlayback(atom);
    return {
        ...playback,
        muted: readAudioMuted(atom?.muted),
        loop: false,
    };
}

export function audioMutedValue(muted: boolean): { type: "full"; value: true } | null {
    return muted ? { type: "full", value: true } : null;
}

/** `null` clears the atom field. End equal to the source duration is cleared too. */
export function clampTrim(
    start: number,
    end: number,
    duration?: number,
): { startFrom: number | null; endAt: number | null } {
    let left = Number.isFinite(start) ? Math.max(0, start) : 0;
    let right = Number.isFinite(end) ? Math.max(0, end) : left;
    if (duration !== undefined && duration > 0) {
        left = Math.min(left, duration);
        right = Math.min(right, duration);
    }
    if (right < left) right = left;
    const startFrom = left <= 0.005 ? null : round2(left);
    const endAt = duration !== undefined && duration > 0 && right >= duration - 0.005
        ? null
        : round2(right);
    return { startFrom, endAt };
}

export function isFullClip(playback: VideoPlayback, duration?: number): boolean {
    const startFull = playback.startFrom === undefined || playback.startFrom <= 0.005;
    const endFull = playback.endAt === undefined
        || (duration !== undefined && playback.endAt >= duration - 0.005);
    return startFull && endFull;
}
