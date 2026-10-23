/**
 * Placement controls write plain CSS onto a style object.
 * Editor-only values live in `--mm-*` custom properties so anchors, flips,
 * and typed insets can be edited again without guessing from the computed CSS.
 */

export const POSITION_ANCHORS = [
    "top-left",
    "top-center",
    "top-right",
    "center-left",
    "center",
    "center-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
] as const;

export type PositionAnchor = (typeof POSITION_ANCHORS)[number];

export type AxisAlign = "start" | "center" | "end";

/** Which box model the open tab writes. The other tabs keep their typed values. */
export type PlacementMode = "normal" | "absolute" | "relative";

export type PlacementDraft = {
    mode: PlacementMode;
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
    width?: string;
    height?: string;
    align?: PositionAnchor;
    rotate: number;
    scaleX: number;
    scaleY: number;
    /** When locked, scale X and scale Y stay on the same value. */
    scaleLinked: boolean;
    flipX: boolean;
    flipY: boolean;
    /** Cross-axis alignment of children inside this box. */
    layoutX?: AxisAlign;
    /** Main-axis alignment of children inside this box. */
    layoutY?: AxisAlign;
    /** Where this box sits horizontally in its parent. */
    selfX?: AxisAlign;
    /** Where this box sits vertically in its parent. */
    selfY?: AxisAlign;
    clip: boolean;
};

type StyleMap = Record<string, unknown>;

const MM = {
    left: "--mm-left",
    right: "--mm-right",
    top: "--mm-top",
    bottom: "--mm-bottom",
    width: "--mm-width",
    height: "--mm-height",
    mode: "--mm-mode",
    align: "--mm-align",
    rotate: "--mm-rotate",
    /** Previous single scale marker. Stripped on write so it cannot disagree with X and Y. */
    scale: "--mm-scale",
    scaleX: "--mm-scale-x",
    scaleY: "--mm-scale-y",
    scaleLink: "--mm-scale-link",
    flipX: "--mm-flip-x",
    flipY: "--mm-flip-y",
    layoutX: "--mm-layout-x",
    layoutY: "--mm-layout-y",
    selfX: "--mm-self-x",
    selfY: "--mm-self-y",
    clip: "--mm-clip",
} as const;

const BOX_KEYS = ["left", "right", "top", "bottom", "width", "height"] as const;
type BoxKey = (typeof BOX_KEYS)[number];

/** CSS keys the Position section owns. Schema children with these keys are not rendered twice. */
export const POSITION_STYLE_KEYS = new Set<string>([
    "position",
    "left",
    "right",
    "top",
    "bottom",
    "width",
    "height",
    "transform",
    ...Object.values(MM).filter(
        (key) =>
            key !== MM.layoutX &&
            key !== MM.layoutY &&
            key !== MM.selfX &&
            key !== MM.selfY &&
            key !== MM.clip,
    ),
]);

/** CSS keys the Layout section owns, including the position keys. */
export const LAYOUT_STYLE_KEYS = new Set<string>([
    ...POSITION_STYLE_KEYS,
    "overflow",
    "display",
    "flexDirection",
    "alignItems",
    "justifyContent",
    "alignSelf",
    "justifySelf",
    "margin",
    "marginLeft",
    "marginRight",
    "marginTop",
    "marginBottom",
    MM.layoutX,
    MM.layoutY,
    MM.selfX,
    MM.selfY,
    MM.clip,
]);

const ANCHOR_EDGES: Record<
    PositionAnchor,
    { edges: Partial<Record<BoxKey, number | string>>; translateX: boolean; translateY: boolean }
> = {
    "top-left": { edges: { top: 0, left: 0 }, translateX: false, translateY: false },
    "top-center": { edges: { top: 0, left: "50%" }, translateX: true, translateY: false },
    "top-right": { edges: { top: 0, right: 0 }, translateX: false, translateY: false },
    "center-left": { edges: { top: "50%", left: 0 }, translateX: false, translateY: true },
    center: { edges: { top: "50%", left: "50%" }, translateX: true, translateY: true },
    "center-right": { edges: { top: "50%", right: 0 }, translateX: false, translateY: true },
    "bottom-left": { edges: { bottom: 0, left: 0 }, translateX: false, translateY: false },
    "bottom-center": { edges: { bottom: 0, left: "50%" }, translateX: true, translateY: false },
    "bottom-right": { edges: { bottom: 0, right: 0 }, translateX: false, translateY: false },
};

const round = (n: number) => Math.round(n * 10000) / 10000;

export function anchorLabel(anchor: PositionAnchor): string {
    return anchor
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function rotateBy90(current: number): number {
    const next = current + 90;
    return ((next % 360) + 360) % 360;
}

function isAnchor(value: unknown): value is PositionAnchor {
    return typeof value === "string" && (POSITION_ANCHORS as readonly string[]).includes(value);
}

function isAxis(value: unknown): value is AxisAlign {
    return value === "start" || value === "center" || value === "end";
}

/** `undefined` clears the key; `null` means the text was not a length. */
export function parseLength(raw: string): number | string | undefined | null {
    const text = raw.trim().toLowerCase();
    if (!text || text === "auto") return undefined;
    if (text.endsWith("%")) {
        const n = Number(text.slice(0, -1));
        return Number.isFinite(n) ? `${round(n)}%` : null;
    }
    const n = Number(text.replace(/px$/, ""));
    return Number.isFinite(n) ? round(n) : null;
}

export function formatLength(value: unknown): string {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value === "number" && Number.isFinite(value)) return String(round(value));
    const text = String(value).trim();
    if (text.endsWith("px")) {
        const n = Number(text.slice(0, -2));
        return Number.isFinite(n) ? String(round(n)) : text;
    }
    return text;
}

function sameLength(a: unknown, b: unknown): boolean {
    return formatLength(a) !== "" && formatLength(a) === formatLength(b);
}

function readNumber(value: unknown, fallback: number): number {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function parseTransform(value: unknown): {
    rotate: number;
    scaleX: number;
    scaleY: number;
    flipX: boolean;
    flipY: boolean;
} {
    const text = typeof value === "string" ? value : "";
    const rotateMatch = text.match(/rotate\(\s*(-?\d*\.?\d+)deg\s*\)/i);
    const scaleMatch = text.match(/scale\(\s*(-?\d*\.?\d+)(?:\s*,\s*(-?\d*\.?\d+))?\s*\)/i);
    const scaleXMatch = text.match(/scaleX\(\s*(-?\d*\.?\d+)\s*\)/i);
    const scaleYMatch = text.match(/scaleY\(\s*(-?\d*\.?\d+)\s*\)/i);
    let rotate = rotateMatch ? Number(rotateMatch[1]) : 0;
    let scaleX = 1;
    let scaleY = 1;
    let flipX = false;
    let flipY = false;
    const applyAxis = (raw: number, axis: "x" | "y") => {
        if (!Number.isFinite(raw)) return;
        if (axis === "x") {
            flipX = raw < 0;
            scaleX = Math.abs(raw);
        } else {
            flipY = raw < 0;
            scaleY = Math.abs(raw);
        }
    };
    if (scaleMatch) {
        const sx = Number(scaleMatch[1]);
        const sy = scaleMatch[2] !== undefined ? Number(scaleMatch[2]) : sx;
        applyAxis(sx, "x");
        applyAxis(sy, "y");
    }
    if (scaleXMatch) applyAxis(Number(scaleXMatch[1]), "x");
    if (scaleYMatch) applyAxis(Number(scaleYMatch[1]), "y");
    if (!Number.isFinite(rotate)) rotate = 0;
    return { rotate, scaleX, scaleY, flipX, flipY };
}

function readEdge(style: StyleMap, key: BoxKey, anchorValue: unknown): string | undefined {
    const marker = MM[key];
    if (Object.prototype.hasOwnProperty.call(style, marker)) {
        const marked = style[marker];
        if (marked === undefined || marked === null || marked === "") return undefined;
        return formatLength(marked);
    }
    if (style[key] === undefined || style[key] === "") return undefined;
    if (anchorValue !== undefined && sameLength(style[key], anchorValue)) return undefined;
    const formatted = formatLength(style[key]);
    // Generated by self alignment. The size fields stay empty so they are not saved as authored lengths.
    if (formatted === "auto" || formatted === "max-content" || formatted === "fit-content") return undefined;
    return formatted;
}

export function readPlacement(style: StyleMap | undefined): PlacementDraft {
    const source = style && typeof style === "object" ? style : {};
    const markedAlign = source[MM.align];
    const align = isAnchor(markedAlign) ? markedAlign : undefined;
    const anchor = align ? ANCHOR_EDGES[align].edges : {};
    const transform = parseTransform(source.transform);

    const rotate = Object.prototype.hasOwnProperty.call(source, MM.rotate)
        ? readNumber(source[MM.rotate], 0)
        : transform.rotate;
    const hasScaleX = Object.prototype.hasOwnProperty.call(source, MM.scaleX);
    const hasScaleY = Object.prototype.hasOwnProperty.call(source, MM.scaleY);
    const hasLegacyScale = Object.prototype.hasOwnProperty.call(source, MM.scale);
    let scaleX: number;
    let scaleY: number;
    let scaleLinked: boolean;
    if (hasScaleX || hasScaleY) {
        scaleX = hasScaleX ? readNumber(source[MM.scaleX], transform.scaleX) : transform.scaleX;
        scaleY = hasScaleY ? readNumber(source[MM.scaleY], transform.scaleY) : transform.scaleY;
        scaleLinked = source[MM.scaleLink] !== "0" && source[MM.scaleLink] !== 0;
    } else if (hasLegacyScale) {
        const scale = readNumber(source[MM.scale], 1);
        scaleX = scale;
        scaleY = scale;
        scaleLinked = true;
    } else {
        scaleX = transform.scaleX;
        scaleY = transform.scaleY;
        scaleLinked = scaleX === scaleY;
    }
    const flipX = Object.prototype.hasOwnProperty.call(source, MM.flipX)
        ? source[MM.flipX] === "-1" || source[MM.flipX] === -1
        : transform.flipX;
    const flipY = Object.prototype.hasOwnProperty.call(source, MM.flipY)
        ? source[MM.flipY] === "-1" || source[MM.flipY] === -1
        : transform.flipY;

    const markedLayoutX = source[MM.layoutX];
    const layoutX = isAxis(markedLayoutX)
        ? markedLayoutX
        : source.alignItems === "flex-start"
            ? "start"
            : source.alignItems === "center"
                ? "center"
                : source.alignItems === "flex-end"
                    ? "end"
                    : undefined;
    const markedLayoutY = source[MM.layoutY];
    const layoutY = isAxis(markedLayoutY)
        ? markedLayoutY
        : source.justifyContent === "flex-start"
            ? "start"
            : source.justifyContent === "center"
                ? "center"
                : source.justifyContent === "flex-end"
                    ? "end"
                    : undefined;
    const markedSelfX = source[MM.selfX];
    const selfX = isAxis(markedSelfX) ? markedSelfX : undefined;
    const markedSelfY = source[MM.selfY];
    const selfY = isAxis(markedSelfY) ? markedSelfY : undefined;

    const left = readEdge(source, "left", anchor.left);
    const right = readEdge(source, "right", anchor.right);
    const top = readEdge(source, "top", anchor.top);
    const bottom = readEdge(source, "bottom", anchor.bottom);
    const width = readEdge(source, "width", undefined);
    const height = readEdge(source, "height", undefined);

    return {
        mode: readMode(source, { align, right, bottom }),
        left,
        right,
        top,
        bottom,
        width,
        height,
        align,
        rotate,
        scaleX,
        scaleY,
        scaleLinked,
        flipX,
        flipY,
        layoutX,
        layoutY,
        selfX,
        selfY,
        clip: source[MM.clip] === "1" || source.overflow === "hidden",
    };
}

function isMode(value: unknown): value is PlacementMode {
    return value === "normal" || value === "absolute" || value === "relative";
}

function readMode(
    source: StyleMap,
    hints: { align?: PositionAnchor; right?: string; bottom?: string },
): PlacementMode {
    const markedMode = source[MM.mode];
    if (isMode(markedMode)) return markedMode;
    if (source.position === "relative") return "relative";
    if (hints.align) return "relative";
    if (hints.right || hints.bottom) return "absolute";
    return "normal";
}

function composeTransform(
    translate: string | undefined,
    rotate: number,
    scaleX: number,
    scaleY: number,
    flipX: boolean,
    flipY: boolean,
): string | undefined {
    const parts: string[] = [];
    if (translate) parts.push(translate);
    if (rotate) parts.push(`rotate(${round(rotate)}deg)`);
    const sx = (flipX ? -1 : 1) * scaleX;
    const sy = (flipY ? -1 : 1) * scaleY;
    if (sx !== 1 || sy !== 1) parts.push(`scale(${round(sx)}, ${round(sy)})`);
    return parts.length > 0 ? parts.join(" ") : undefined;
}

function flexValue(axis: AxisAlign | undefined): string | undefined {
    if (axis === "start") return "flex-start";
    if (axis === "center") return "center";
    if (axis === "end") return "flex-end";
    return undefined;
}

const CONTENT_SIZE = "max-content";

/**
 * Pin this box inside its parent.
 * A stretched axis (both edges) cannot show alignment, so the sized axis
 * shrinks to its content unless the position fields already set a size.
 * The other axis stays stretched when only one direction is set.
 * `right`/`left` of `auto` beats a leftover `inset-0` class.
 */
function applySelfAlignment(next: StyleMap, draft: PlacementDraft, mode: PlacementMode) {
    const x = draft.selfX;
    const y = draft.selfY;
    if (x) next[MM.selfX] = x;
    if (y) next[MM.selfY] = y;
    if (!x && !y) return;

    const relative = mode === "relative";
    const remember = (key: BoxKey, value: unknown) => {
        const formatted = formatLength(value);
        if (formatted) next[MM[key]] = formatted;
    };

    if (x === "start") {
        next.marginLeft = 0;
        next.marginRight = "auto";
        if (!relative) {
            if (next.left === undefined) next.left = 0;
            next.right = "auto";
            delete next[MM.right];
            remember("left", next.left);
        }
    } else if (x === "end") {
        next.marginLeft = "auto";
        next.marginRight = 0;
        if (!relative) {
            if (next.right === undefined) next.right = 0;
            next.left = "auto";
            delete next[MM.left];
            remember("right", next.right);
        }
    } else if (x === "center") {
        next.marginLeft = "auto";
        next.marginRight = "auto";
        if (!relative) {
            next.left = 0;
            next.right = 0;
            next[MM.left] = "0";
            next[MM.right] = "0";
        }
    }
    if (x && !relative && next.width === undefined) next.width = CONTENT_SIZE;

    if (y === "start") {
        next.marginTop = 0;
        next.marginBottom = "auto";
        if (!relative) {
            if (next.top === undefined) next.top = 0;
            next.bottom = "auto";
            delete next[MM.bottom];
            remember("top", next.top);
        }
    } else if (y === "end") {
        next.marginTop = "auto";
        next.marginBottom = 0;
        if (!relative) {
            if (next.bottom === undefined) next.bottom = 0;
            next.top = "auto";
            delete next[MM.top];
            remember("bottom", next.bottom);
        }
    } else if (y === "center") {
        next.marginTop = "auto";
        next.marginBottom = "auto";
        if (!relative) {
            next.top = 0;
            next.bottom = 0;
            next[MM.top] = "0";
            next[MM.bottom] = "0";
        }
    }
    if (y && !relative && next.height === undefined) next.height = CONTENT_SIZE;

    // One axis was pinned. Keep the other axis stretched when the box had no edges of its own.
    if (!relative && x && !y && next.top === undefined && next.bottom === undefined) {
        next.top = 0;
        next.bottom = 0;
    }
    if (!relative && y && !x && next.left === undefined && next.right === undefined) {
        next.left = 0;
        next.right = 0;
    }
}

/**
 * Items alignment packs children inside a container.
 * Self alignment places the layer in its parent.
 * Atoms have no container, so only self alignment applies.
 * Scenes and other container presets use both.
 */
export function alignmentColumns(metadata?: {
    placement?: string;
    role?: string;
} | null): { items: boolean; self: boolean } {
    if (metadata?.placement === "atom") return { items: false, self: true };
    if (metadata?.role === "scene" || metadata?.placement === "container") {
        return { items: true, self: true };
    }
    return { items: false, self: true };
}

/**
 * Write one draft onto `style`, preserving keys this section does not own
 * (colour, font, background, and so on).
 */
export function commitPlacement(
    style: StyleMap | undefined,
    draft: PlacementDraft,
    options: { layout: boolean; items?: boolean; self?: boolean },
): StyleMap | undefined {
    const source = style && typeof style === "object" ? style : {};
    const next: StyleMap = { ...source };
    const owned = options.layout ? LAYOUT_STYLE_KEYS : POSITION_STYLE_KEYS;
    for (const key of owned) delete next[key];

    const user: Partial<Record<BoxKey, number | string>> = {};
    for (const key of BOX_KEYS) {
        const parsed = draft[key] ? parseLength(draft[key] as string) : undefined;
        if (parsed !== undefined && parsed !== null) user[key] = parsed;
    }

    const mode = draft.mode || "normal";
    const edges: Partial<Record<BoxKey, number | string>> = {};
    if (mode === "normal") {
        if (user.left !== undefined) edges.left = user.left;
        if (user.bottom !== undefined) edges.bottom = user.bottom;
        if (user.width !== undefined) edges.width = user.width;
        if (user.height !== undefined) edges.height = user.height;
    } else if (mode === "absolute") {
        for (const key of ["left", "right", "top", "bottom"] as const) {
            if (user[key] !== undefined) edges[key] = user[key];
        }
    } else {
        if (user.width !== undefined) edges.width = user.width;
        if (user.height !== undefined) edges.height = user.height;
    }

    const scaleX = Number.isFinite(draft.scaleX) ? draft.scaleX : 1;
    const scaleY = Number.isFinite(draft.scaleY) ? draft.scaleY : 1;
    const transform = composeTransform(
        undefined,
        draft.rotate,
        scaleX,
        scaleY,
        draft.flipX,
        draft.flipY,
    );

    next.position = mode === "relative" ? "relative" : "absolute";
    for (const key of BOX_KEYS) {
        if (edges[key] !== undefined) next[key] = edges[key];
    }
    if (transform) next.transform = transform;

    for (const key of BOX_KEYS) {
        if (mode === "normal" && (key === "right" || key === "top")) continue;
        if (draft[key]) next[MM[key]] = draft[key];
    }
    if (draft.align) next[MM.align] = draft.align;
    next[MM.mode] = mode;
    if (draft.rotate) next[MM.rotate] = String(round(draft.rotate));
    if (scaleX !== 1) next[MM.scaleX] = String(round(scaleX));
    if (scaleY !== 1) next[MM.scaleY] = String(round(scaleY));
    if (!draft.scaleLinked) next[MM.scaleLink] = "0";
    if (draft.flipX) next[MM.flipX] = "-1";
    if (draft.flipY) next[MM.flipY] = "-1";

    if (options.layout) {
        const alignChildren = options.items !== false;
        if (alignChildren) {
            const alignItems = flexValue(draft.layoutX);
            const justifyContent = flexValue(draft.layoutY);
            if (alignItems || justifyContent) {
                next.display = "flex";
                next.flexDirection = "column";
                if (alignItems) next.alignItems = alignItems;
                if (justifyContent) next.justifyContent = justifyContent;
            } else if (source.display !== undefined && source.display !== "flex") {
                next.display = source.display;
                if (source.flexDirection !== undefined) next.flexDirection = source.flexDirection;
                if (source.alignItems !== undefined) next.alignItems = source.alignItems;
                if (source.justifyContent !== undefined) next.justifyContent = source.justifyContent;
            }
            if (draft.layoutX) next[MM.layoutX] = draft.layoutX;
            if (draft.layoutY) next[MM.layoutY] = draft.layoutY;
        }

        if (options.self !== false) applySelfAlignment(next, draft, mode);

        if (draft.clip) {
            next.overflow = "hidden";
            next[MM.clip] = "1";
        } else if (typeof source.overflow === "string" && source.overflow !== "hidden") {
            next.overflow = source.overflow;
        }
    }

    return Object.keys(next).length > 0 ? next : undefined;
}

export function inferPlacementTab(style: StyleMap | undefined): PlacementMode {
    return readPlacement(style).mode;
}
