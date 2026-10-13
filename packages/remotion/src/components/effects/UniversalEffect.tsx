import React, { useMemo, createContext, useContext, ReactNode } from 'react';
import mergeCSSStyles from './mergeCSSStyles';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';
import { BaseRenderableProps } from '../../core/types/renderable.types';

// Animation range type for keyframe animations
export interface AnimationRange {
    key: string; // CSS property key (e.g., 'transform', 'opacity', 'scale')
    val: any; // Value for this keyframe
    prog: number; // Progress (0-1) when this keyframe should be active
}

// Universal effect data interface - extends any effect with provider capabilities
export interface UniversalEffectData {
    start?: number; // Start time in seconds
    duration?: number; // Duration in seconds
    type?: 'spring' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
    /**
     * What to draw outside the effect window.
     * - hold: start value before, end value after (default)
     * - none: no styles while inactive
     * - hold-end: nothing before, end value after
     * - hold-start: start value before, nothing after
     */
    inactiveBehavior?: 'hold' | 'none' | 'hold-end' | 'hold-start';
    ranges?: AnimationRange[]; // Animation keyframes
    targetIds?: string[]; // IDs of child components to target (for provider mode)
    mode?: 'wrapper' | 'provider'; // How the effect is applied
    props?: any; // Additional properties for the effect
    // Effect-specific properties (can be extended by any effect)
    [key: string]: any;
}

// Context for universal effect provider mode
interface UniversalEffectContextType {
    animatedStyles: React.CSSProperties;
    targetIds: string[];
    effectType: string;
}

const UniversalEffectContext = createContext<UniversalEffectContextType | null>(null);

// Hook to use the universal effect context
export const useUniversalEffect = () => {
    const context = useContext(UniversalEffectContext);
    if (!context) {
        throw new Error('useUniversalEffect must be used within a UniversalEffectProvider');
    }
    return context;
};

// Optional hook that returns null if no provider is found
export const useUniversalEffectOptional = () => {
    return useContext(UniversalEffectContext);
};

// Hook to check if a universal effect provider exists
export const useHasUniversalEffectProvider = (): boolean => {
    const context = useContext(UniversalEffectContext);
    return context !== null;
};

// Export the context so it can be used by other effect components
export { UniversalEffectContext };

// Parse duration from seconds to frames
const parseDuration = (duration: number | string | undefined, contextDuration: number, fps: number): number => {
    if (!duration) return contextDuration;

    if (typeof duration === 'number') {
        return duration * fps;
    }

    if (typeof duration === 'string' && duration.endsWith('%')) {
        const percentage = parseFloat(duration.replace('%', '')) / 100;
        return Math.floor(contextDuration * percentage);
    }

    return contextDuration;
};

// Parse delay from seconds to frames
const parseDelay = (delay: number | string | undefined, contextDuration: number, fps: number): number => {
    if (!delay) return 0;

    if (typeof delay === 'number') {
        return delay * fps;
    }

    if (typeof delay === 'string' && delay.endsWith('%')) {
        const percentage = parseFloat(delay) / 100;
        return Math.floor(contextDuration * percentage);
    }

    return 0;
};

// Easing function mapper
const getEasingFunction = (type: string) => {
    switch (type) {
        case 'linear':
            return Easing.linear;
        case 'ease-in':
            return Easing.in(Easing.ease);
        case 'ease-out':
            return Easing.out(Easing.ease);
        case 'ease-in-out':
            return Easing.inOut(Easing.ease);
        default:
            return Easing.linear;
    }
};

// Color parsing and interpolation utilities
interface ColorRGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

// Parse hex color to RGBA
const parseHexColor = (hex: string): ColorRGBA => {
    hex = hex.replace('#', '').toLowerCase();

    if (!/^[0-9a-f]+$/.test(hex)) {
        return { r: 0, g: 0, b: 0, a: 1 };
    }

    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length === 6) {
        return {
            r: Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16))),
            g: Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16))),
            b: Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16))),
            a: 1
        };
    }

    if (hex.length === 8) {
        return {
            r: Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16))),
            g: Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16))),
            b: Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16))),
            a: Math.max(0, Math.min(1, parseInt(hex.substr(6, 2), 16) / 255))
        };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
};

// Parse rgba color to RGBA
const parseRgbaColor = (rgba: string): ColorRGBA => {
    const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
    if (match) {
        let alpha = 1;
        if (match[4]) {
            const alphaValue = parseFloat(match[4]);
            // Handle percentage values (e.g., 75.6 means 0.756)
            if (alphaValue > 1) {
                alpha = Math.max(0, Math.min(1, alphaValue / 100));
            } else {
                alpha = Math.max(0, Math.min(1, alphaValue));
            }
        }
        return {
            r: Math.max(0, Math.min(255, parseInt(match[1], 10))),
            g: Math.max(0, Math.min(255, parseInt(match[2], 10))),
            b: Math.max(0, Math.min(255, parseInt(match[3], 10))),
            a: alpha
        };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
};

// Parse any color format to RGBA
const parseColor = (color: string): ColorRGBA => {
    const trimmedColor = color.trim();

    if (trimmedColor.startsWith('#')) {
        return parseHexColor(trimmedColor);
    } else if (trimmedColor.toLowerCase().startsWith('rgb')) {
        return parseRgbaColor(trimmedColor);
    }

    return { r: 0, g: 0, b: 0, a: 1 };
};

// Convert RGBA back to CSS color string
// Always use rgba format to preserve consistency
const rgbaToString = (color: ColorRGBA, preserveFormat?: { hasSpaces: boolean }): string => {
    const r = Math.round(color.r);
    const g = Math.round(color.g);
    const b = Math.round(color.b);
    const a = color.a;

    // If format preservation is requested, match the spacing
    if (preserveFormat) {
        if (preserveFormat.hasSpaces) {
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        } else {
            return `rgba(${r},${g},${b},${a})`;
        }
    }

    // Default: always use rgba with spaces for readability
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Interpolate between two colors
const interpolateColors = (color1: string, color2: string, progress: number, preserveFormat?: { hasSpaces: boolean }): string => {
    const parsedColor1 = parseColor(color1);
    const parsedColor2 = parseColor(color2);

    const interpolatedColor: ColorRGBA = {
        r: interpolate(progress, [0, 1], [parsedColor1.r, parsedColor2.r]),
        g: interpolate(progress, [0, 1], [parsedColor1.g, parsedColor2.g]),
        b: interpolate(progress, [0, 1], [parsedColor1.b, parsedColor2.b]),
        a: interpolate(progress, [0, 1], [parsedColor1.a, parsedColor2.a])
    };

    return rgbaToString(interpolatedColor, preserveFormat);
};

// Find all color patterns in a string (rgba, rgb, hex)
interface ColorMatch {
    fullMatch: string;
    color: string;
    startIndex: number;
    endIndex: number;
}

const findColorsInString = (str: string): ColorMatch[] => {
    const matches: ColorMatch[] = [];

    // Match rgba/rgb patterns: rgba(255, 68, 15, 0.5) or rgb(255, 68, 15)
    // Use a new regex instance each time to avoid global flag issues
    const rgbaPattern = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/g;
    let match;
    // Reset lastIndex to ensure we start from the beginning
    rgbaPattern.lastIndex = 0;
    while ((match = rgbaPattern.exec(str)) !== null) {
        matches.push({
            fullMatch: match[0],
            color: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }

    // Match hex patterns: #fff, #ffffff, #ffffffff
    const hexPattern = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
    hexPattern.lastIndex = 0;
    while ((match = hexPattern.exec(str)) !== null) {
        matches.push({
            fullMatch: match[0],
            color: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }

    // Sort by start index (ascending for easier debugging, we'll reverse when needed)
    return matches.sort((a, b) => a.startIndex - b.startIndex);
};

// Interpolate colors embedded within complex CSS property values
const interpolateColorsInString = (str1: string, str2: string, progress: number): string => {
    // Find all colors in both strings (already sorted ascending)
    const colors1 = findColorsInString(str1);
    const colors2 = findColorsInString(str2);

    // If no colors found, return the first string
    if (colors1.length === 0 && colors2.length === 0) {
        return str1;
    }

    // If only one string has colors, return the first string
    if (colors1.length === 0 || colors2.length === 0) {
        return str1;
    }

    const minLength = Math.min(colors1.length, colors2.length);

    // Create replacements array - we'll apply from end to start
    const replacements: Array<{ startIndex: number; endIndex: number; replacement: string }> = [];

    // Match colors by their order in the string (first with first, second with second, etc.)
    for (let i = 0; i < minLength; i++) {
        const color1 = colors1[i];
        const color2 = colors2[i];

        // Detect format from the original color (first string) - preserve exact spacing
        const originalColor = color1.color;
        // Check if original has spaces after commas by looking at the actual matched string
        const hasSpaces = originalColor.includes(', ');

        // Interpolate with format preservation - always use rgba format (never rgb)
        const interpolatedColor = interpolateColors(color1.color, color2.color, progress, { hasSpaces });

        replacements.push({
            startIndex: color1.startIndex,
            endIndex: color1.endIndex,
            replacement: interpolatedColor
        });
    }

    // Sort replacements by startIndex descending for safe replacement (end to start)
    replacements.sort((a, b) => b.startIndex - a.startIndex);

    // Apply replacements from end to start to preserve indices
    // Since we sorted by descending startIndex, we can safely replace from end to start
    let result = str1;
    for (const replacement of replacements) {
        // Verify we're replacing the correct substring
        const originalSubstring = result.substring(replacement.startIndex, replacement.endIndex);
        const expectedColor = colors1.find(c => c.startIndex === replacement.startIndex);

        // Only replace if the substring matches what we expect (or is a color value)
        if (expectedColor && (originalSubstring === expectedColor.color || originalSubstring.trim().match(/^rgba?\(/i))) {
            result = result.substring(0, replacement.startIndex) + replacement.replacement + result.substring(replacement.endIndex);
        } else {
            // If the string structure changed, try to find the color again
            const currentColors = findColorsInString(result);
            const matchingColor = currentColors.find(c =>
                Math.abs(c.startIndex - replacement.startIndex) < 30 // Allow some offset
            );
            if (matchingColor) {
                result = result.substring(0, matchingColor.startIndex) + replacement.replacement + result.substring(matchingColor.endIndex);
            }
        }
    }

    return result;
};

// Calculate animated value based on ranges and progress
const calculateAnimatedValue = (
    ranges: AnimationRange[],
    progress: number,
    key: string
): any => {
    const sortedRanges = [...ranges].sort((a, b) => a.prog - b.prog);

    if (sortedRanges.length === 0) return 0;
    if (sortedRanges.length === 1) return sortedRanges[0].val;

    // Clamp progress to 0-1 range for proper keyframe interpolation
    const clampedProgress = Math.max(0, Math.min(1, progress));

    if (clampedProgress <= sortedRanges[0].prog) {
        return sortedRanges[0].val;
    }

    if (clampedProgress >= sortedRanges[sortedRanges.length - 1].prog) {
        return sortedRanges[sortedRanges.length - 1].val;
    }

    for (let i = 0; i < sortedRanges.length - 1; i++) {
        const currentRange = sortedRanges[i];
        const nextRange = sortedRanges[i + 1];

        if (clampedProgress >= currentRange.prog && clampedProgress <= nextRange.prog) {
            const localProgress = (clampedProgress - currentRange.prog) / (nextRange.prog - currentRange.prog);
            const currentValue = currentRange.val;
            const nextValue = nextRange.val;

            if (typeof currentValue === 'number' && typeof nextValue === 'number') {
                if (isFinite(currentValue) && isFinite(nextValue) && !isNaN(currentValue) && !isNaN(nextValue)) {
                    const interpolatedValue = currentValue + (nextValue - currentValue) * localProgress;
                    if (isFinite(interpolatedValue) && !isNaN(interpolatedValue)) {
                        return interpolatedValue;
                    }
                }
                return currentValue;
            } else if (typeof currentValue === 'string' && typeof nextValue === 'string') {
                const isColor = (str: string) => {
                    const trimmed = str.trim().toLowerCase();
                    return trimmed.startsWith('#') || trimmed.startsWith('rgb');
                };

                // Check if both are simple color strings
                if (isColor(currentValue) && isColor(nextValue)) {
                    return interpolateColors(currentValue, nextValue, localProgress);
                }

                // Check if strings contain colors (e.g., drop-shadow, linear-gradient, etc.)
                const colors1 = findColorsInString(currentValue);
                const colors2 = findColorsInString(nextValue);

                if (colors1.length > 0 || colors2.length > 0) {
                    // If strings have similar structure and contain colors, interpolate the colors
                    // This handles cases like: drop-shadow(0 0 864px rgba(255,68,15,0))
                    return interpolateColorsInString(currentValue, nextValue, localProgress);
                }

                const getUnitAndValue = (str: string) => {
                    const units = ['vmax', 'vmin', 'rem', 'deg', 'bpm', 'vh', 'vw', 'px', 'em', 'ms', 'hz', 'db', 'fr', 's', '%'];

                    for (const unit of units) {
                        if (str.endsWith(unit)) {
                            const value = parseFloat(str.slice(0, -unit.length));
                            return {
                                value: isNaN(value) ? 0 : value,
                                unit: unit
                            };
                        }
                    }

                    const value = parseFloat(str);
                    return {
                        value: isNaN(value) ? 0 : value,
                        unit: ''
                    };
                };

                const current = getUnitAndValue(currentValue);
                const next = getUnitAndValue(nextValue);

                if (current.unit === next.unit && isFinite(current.value) && isFinite(next.value)) {
                    const interpolatedValue = interpolate(localProgress, [0, 1], [current.value, next.value]);
                    if (isFinite(interpolatedValue)) {
                        return current.unit ? `${interpolatedValue}${current.unit}` : interpolatedValue;
                    }
                }

                return currentValue;
            }

            return currentValue;
        }
    }

    return sortedRanges[0]?.val || 0;
};

// Convert animation ranges to CSS properties
const rangesToCSSProperties = (ranges: AnimationRange[], progress: number): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    // Safety check: ensure ranges is defined and is an array
    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
        return styles;
    }

    const rangesByKey = ranges.reduce((acc, range) => {
        if (!acc[range.key]) {
            acc[range.key] = [];
        }
        acc[range.key].push(range);
        return acc;
    }, {} as Record<string, AnimationRange[]>);

    Object.entries(rangesByKey).forEach(([key, keyRanges]) => {
        const value = calculateAnimatedValue(keyRanges, progress, key);

        switch (key) {
            case 'scale':
                styles.transform = `${styles.transform || ''} scale(${value})`.trim();
                break;
            case 'rotate':
                const rotateValue = typeof value === 'string' && value.includes('deg') ? value : `${value}deg`;
                styles.transform = `${styles.transform || ''} rotate(${rotateValue})`.trim();
                break;
            case 'translateX':
                const translateXValue = typeof value === 'string' && (value.includes('px') || value.includes('%') || value.includes('vw') || value.includes('vh')) ? value : `${value}px`;
                styles.transform = `${styles.transform || ''} translateX(${translateXValue})`.trim();
                break;
            case 'translateY':
                const translateYValue = typeof value === 'string' && (value.includes('px') || value.includes('%') || value.includes('vw') || value.includes('vh')) ? value : `${value}px`;
                styles.transform = `${styles.transform || ''} translateY(${translateYValue})`.trim();
                break;
            case 'opacity':
                const opacityValue = typeof value === 'number'
                    ? Math.max(0, Math.min(1, isFinite(value) && !isNaN(value) ? Math.round(value * 1000) / 1000 : 1))
                    : 1;
                styles.opacity = opacityValue;
                break;
            case 'blur':
                const blurValue = typeof value === 'string' && (value.includes('px') || value.includes('rem') || value.includes('em')) ? value : `${value}px`;
                styles.filter = `blur(${blurValue})`;
                break;
            case 'brightness':
                styles.filter = `${styles.filter || ''} brightness(${value})`.trim();
                break;
            case 'contrast':
                styles.filter = `${styles.filter || ''} contrast(${value})`.trim();
                break;
            case 'filter':
                styles.filter = value;
                break;
            case 'color':
                styles.color = value;
                break;
            case 'backgroundColor':
                styles.backgroundColor = value;
                break;
            default:
                (styles as any)[key] = value;
        }
    });

    return styles;
};

// A new hook to encapsulate the core animation logic
export const useUniversalAnimation = (data: UniversalEffectData, context?: any) => {
    // Safely get Remotion context with fallbacks
    let frame = 0;
    let fps = 30;

    try {
        frame = useCurrentFrame();
        const videoConfig = useVideoConfig();
        fps = videoConfig.fps;
    } catch (error) {
        console.warn('useUniversalAnimation used outside Remotion context, using fallback values');
    }

    const effectData = data as UniversalEffectData;
    const { timing } = context ?? {};
    const contextDuration = timing?.durationInFrames || 50;

    // Parse effect parameters
    const start = parseDelay(effectData?.start, contextDuration, fps);
    const duration = parseDuration(effectData?.duration, contextDuration, fps);
    const type = effectData?.type || 'linear';
    const ranges = effectData?.ranges || [];
    const targetIds = effectData?.targetIds || [];
    const mode = effectData?.mode || 'wrapper';

    // linear / ease* use interpolate. spring and bezier are clamped to 0–1
    // so a transition cannot overshoot past its end keyframe.
    let progress: number;
    if (type === 'spring') {
        const sprung = spring({
            frame: frame - start,
            fps,
            durationInFrames: Math.max(1, duration),
        });
        progress = Math.max(0, Math.min(1, sprung));
    } else {
        const easing = type === 'bezier'
            ? Easing.bezier(0.22, 1, 0.36, 1)
            : getEasingFunction(type);
        const raw = interpolate(
            frame - start,
            [0, duration],
            [0, 1],
            {
                easing,
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }
        );
        progress = Math.max(0, Math.min(1, raw));
    }

    // Determine if effect should contribute styles based on frame timing
    const isActive = frame >= start && frame <= (start + duration);

    // For "sticky" behavior: if not active, determine which value to use
    const isBeforeStart = frame < start;
    const isAfterEnd = frame > (start + duration);

    return {
        frame,
        fps,
        progress,
        isActive,
        isBeforeStart,
        isAfterEnd,
        start,
        duration,
        type,
        ranges,
        targetIds,
        mode,
        effectData,
    };
};

// Universal Effect Component - now a thin wrapper for provider/wrapper logic
export const UniversalEffect: React.FC<BaseRenderableProps & {
    effectType?: string;
    customAnimationLogic?: (effectData: UniversalEffectData, progress: number, frame: number) => React.CSSProperties;
}> = ({
    id,
    data,
    children,
    context,
    effectType = 'universal',
    customAnimationLogic
}) => {
        const { progress, isActive, isBeforeStart, isAfterEnd, frame, ranges, mode, targetIds, effectData } = useUniversalAnimation(data, context);
        const inactiveBehavior = effectData?.inactiveBehavior || 'hold';
        const styleProgress = isActive
            ? progress
            : inactiveBehavior === 'none'
                ? null
                : isBeforeStart
                    ? (inactiveBehavior === 'hold-end' ? null : 0)
                    : isAfterEnd
                        ? (inactiveBehavior === 'hold-start' ? null : 1)
                        : null;
        const parentContext = useUniversalEffectOptional();

        const animatedStyles: React.CSSProperties = useMemo(() => {
            const parentStyles = parentContext?.animatedStyles || {};

            let currentStyles = {} as React.CSSProperties;

            if (styleProgress !== null) {
                if (customAnimationLogic) {
                    currentStyles = customAnimationLogic(effectData, styleProgress, frame);
                } else if (ranges.length > 0) {
                    currentStyles = rangesToCSSProperties(ranges, styleProgress);
                }
            }

            // If we are at the boundary (progress 0), prefer parent on overlap
            // If >=1, also prefer parent as parent's effect likely finalized
            const preferParentOnOverlap = progress <= 0;

            if (parentContext && mode === 'provider') {
                const combinedStyles = mergeCSSStyles(
                    parentStyles,
                    currentStyles,
                    { preferParentOnOverlap: false }
                );
                return combinedStyles;
            }

            // No parent or not provider: just the current styles
            return currentStyles;
        }, [ranges, progress, styleProgress, parentContext?.animatedStyles, mode, customAnimationLogic, effectData, frame, isActive, isBeforeStart, isAfterEnd]);

        const contextValue: UniversalEffectContextType = useMemo(() => ({
            animatedStyles,
            targetIds,
            effectType,
        }), [animatedStyles, targetIds, effectType]);

        if (mode === 'provider') {
            return (
                <UniversalEffectContext.Provider value={contextValue}>
                    {children}
                </UniversalEffectContext.Provider>
            );
        } else {
            return (
                <div {...effectData.props} style={animatedStyles}>
                    {children}
                </div>
            );
        }
    };

// Provider component for standalone use
export const UniversalEffectProvider: React.FC<{
    children: ReactNode;
    data: UniversalEffectData;
    effectType?: string;
    customAnimationLogic?: (effectData: UniversalEffectData, progress: number, frame: number) => React.CSSProperties;
    id?: string;
    componentId?: string;
    type?: string;
}> = ({
    children,
    data,
    effectType = 'universal',
    customAnimationLogic,
    id = 'generic',
    componentId = 'generic',
    type = 'effect'
}) => {
        return (
            <UniversalEffect
                id={id}
                componentId={componentId}
                type={type as any}
                data={data}
                context={undefined}
                effectType={effectType}
                customAnimationLogic={customAnimationLogic}
            >
                {children}
            </UniversalEffect>
        );
    };

// Hook for child components to get their animated styles
export const useAnimatedStyles = (componentId: string): React.CSSProperties => {
    const context = useUniversalEffectOptional();

    if (!context) {
        return {};
    }

    const { animatedStyles, targetIds } = context;

    if (targetIds.includes(componentId)) {
        return animatedStyles;
    }

    return {};
};

export const config = {
    displayName: 'generic',
    description: 'Universal effect that can be extended for any effect type',
    isInnerSequence: false,
    props: {},
};
