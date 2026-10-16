/**
 * Text shadow is a single `text-shadow` layer: x, y, blur, color.
 * CSS has no spread and no inset for this property.
 */

export type TextShadow = {
    x: number;
    y: number;
    blur: number;
    color: string;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function textShadowCss(shadow: TextShadow): string {
    return `${shadow.x}px ${shadow.y}px ${Math.max(0, shadow.blur)}px ${shadow.color}`;
}

export function parseTextShadow(value: unknown): TextShadow | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const match = value
        .trim()
        .match(/^(-?\d*\.?\d+)px\s+(-?\d*\.?\d+)px\s+(-?\d*\.?\d+)px\s+(.+)$/i);
    if (!match) return undefined;
    return {
        x: Number(match[1]),
        y: Number(match[2]),
        blur: Math.max(0, Number(match[3])),
        color: match[4].trim(),
    };
}

export function readTextShadow(style: Record<string, unknown> | undefined): TextShadow | undefined {
    return parseTextShadow(style?.textShadow);
}

/** `undefined` textShadow clears the property. */
export function textShadowPatch(shadow: TextShadow | undefined): { textShadow: string | undefined } {
    if (!shadow || !shadow.color.trim()) return { textShadow: undefined };
    return {
        textShadow: textShadowCss({
            x: clamp(shadow.x, -200, 200),
            y: clamp(shadow.y, -200, 200),
            blur: clamp(shadow.blur, 0, 200),
            color: shadow.color,
        }),
    };
}
