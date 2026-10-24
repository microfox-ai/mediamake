import type { CSSProperties } from 'react';

export const DEFAULT_FONT_FAMILY = 'Inter';
export const DEFAULT_FONT_SIZE = 64;

/** A single family name in `style.fontFamily` (not a CSS stack) is loaded as a Google Font. */
export function loadableStyleFamily(style?: CSSProperties): string | undefined {
    const family = style?.fontFamily;
    if (typeof family !== 'string' || family.includes(',')) return undefined;
    const name = family.replace(/["']/g, '').trim();
    return name || undefined;
}

/**
 * The family to load: `style.fontFamily`, then `font.family`, then Inter.
 * Read from the authored style. A style already filled with the default
 * would hide `font.family`, which most presets use.
 */
export function familyToLoad(style?: CSSProperties, fontFamily?: string): string {
    const fromFont = typeof fontFamily === 'string' ? fontFamily.trim() : '';
    return loadableStyleFamily(style) || fromFont || DEFAULT_FONT_FAMILY;
}

/** First add often has no style yet. A missing family or size is what the player errors on. */
export function styleWithDefaults(style: CSSProperties | undefined, family: string): CSSProperties {
    const authored = typeof style?.fontFamily === 'string' ? style.fontFamily.trim() : '';
    const size = style?.fontSize;
    return {
        ...style,
        fontFamily: authored || family,
        fontSize: size == null || size === '' ? DEFAULT_FONT_SIZE : size,
    };
}
