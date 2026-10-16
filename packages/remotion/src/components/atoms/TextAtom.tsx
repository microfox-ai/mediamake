import React, { useEffect, useMemo, useState } from 'react';
import { delayRender, continueRender } from 'remotion';
import { BaseRenderableProps } from '../../core/types';
import { ComponentConfig } from '../../core/types';
import { useFont } from '../../hooks/useFontLoader';
import { useAnimatedStyles } from '../effects';
import { atomCategory } from '../../atom-category';
import { TextAtomInput } from './input-schemas';
import { applyTextFillStyle } from './text-fill-style';
import { mergeSpecialEffects } from './special-effects-style';

export { TextAtomInput } from './input-schemas';

// Simplified font loading approach - similar to Remotion Google Fonts:
// const { fontFamily } = useFont('Inter', { weights: ['400', '700'] });
// 
// The fontFamily value is now directly usable in CSS:
// style={{ fontFamily }}

interface FontConfig {
    family: string;
    weights?: string[];
    subsets?: string[];
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
    preload?: boolean;
}

export interface TextAtomData {
    text: string;
    style?: React.CSSProperties;
    className?: string;
    gradient?: string; // CSS gradient string (e.g., "linear-gradient(red, blue)")
    font?: FontConfig;
    fallbackFonts?: string[];
    loadingState?: {
        showLoadingIndicator?: boolean;
        loadingText?: string;
        loadingStyle?: React.CSSProperties;
    };
    errorState?: {
        showErrorIndicator?: boolean;
        errorText?: string;
        errorStyle?: React.CSSProperties;
    };
}

interface TextAtomProps extends BaseRenderableProps {
    data: TextAtomData;
}

/** Set by the editor Typography section; CSS has no paragraph-spacing property. */
const PARAGRAPH_SPACING_VAR = '--paragraph-spacing';

/** Markup from the HTML text editor (`<b>`, `<span>`, `<br/>`, …). */
function isHtmlText(text: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(text.trim());
}

/** Drop wrapping `<p>` so default paragraph margins don't add extra gaps. */
function htmlForRender(text: string): string {
    return text
        .replace(/<\/p>\s*<p[^>]*>/gi, '<br/>')
        .replace(/<\/?p[^>]*>/gi, '');
}

/** A single family name in `style.fontFamily` (not a CSS stack) is loaded as a Google Font. */
function loadableStyleFamily(style?: React.CSSProperties): string | undefined {
    const family = style?.fontFamily;
    if (typeof family !== 'string' || family.includes(',')) return undefined;
    const name = family.replace(/["']/g, '').trim();
    return name || undefined;
}

/**
 * Enhanced TextAtom with comprehensive dynamic font loading capabilities
 * 
 * Features:
 * - Dynamic Google Font loading with simplified API
 * - Loading states with visual indicators
 * - Error handling with fallbacks
 * - Multiple font weights and subsets support
 * - Font preloading for performance
 * - Graceful degradation to system fonts
 */
export const Atom: React.FC<TextAtomProps> = ({ id, data }) => {
    const overrideStyles = useAnimatedStyles(id);
    const [isFontLoading, setIsFontLoading] = useState(false);
    const familyToLoad = loadableStyleFamily(data.style) || data.font?.family || 'Inter';
    const [renderHandle] = useState(() =>
        delayRender(`Loading font: ${familyToLoad}`)
    );

    // Font loading logic with delayRender support
    const { isLoaded, error, isReady, fontFamily } = useFont(
        familyToLoad,
        {
            weights: data.style?.fontWeight != null
                ? [String(data.style.fontWeight)]
                : data.font?.weights || ['400'],
            style: data.style?.fontStyle === 'italic' ? 'italic' : undefined,
            subsets: data.font?.subsets || ['latin'],
            display: data.font?.display || 'swap',
            preload: data.font?.preload !== false,
            onLoad: (family, cssValue) => {
                // console.log(`Font ${family} loaded successfully with CSS value: ${cssValue}`);
                setIsFontLoading(false);
                continueRender(renderHandle);
            },
            onError: (family, error) => {
                // console.warn(`Font ${family} failed to load:`, error);
                setIsFontLoading(false);
                continueRender(renderHandle);
            },
        }
    );

    // Update loading state when font status changes
    useEffect(() => {
        if (familyToLoad) {
            if (isReady || isLoaded) {
                setIsFontLoading(false);
            } else if (!isReady && !isLoaded && !error) {
                setIsFontLoading(true);
            }
        }
    }, [familyToLoad, isReady, isLoaded, error]);

    const listStyleType = data.style?.listStyleType;
    const isList = typeof listStyleType === 'string' && listStyleType !== 'none';
    const hasParagraphSpacing =
        (data.style as Record<string, unknown> | undefined)?.[PARAGRAPH_SPACING_VAR] !== undefined;
    const html = isHtmlText(data.text);

    const content = useMemo(() => {
        if (html) return null;
        if (!isList && !hasParagraphSpacing) return data.text;
        return data.text.split('\n').map((paragraph, index) => (
            <div
                key={index}
                style={{
                    display: isList ? 'list-item' : undefined,
                    marginTop: index > 0 ? `var(${PARAGRAPH_SPACING_VAR}, 0px)` : undefined,
                    whiteSpace: 'pre-wrap',
                }}
            >
                {paragraph || '\u00a0'}
            </div>
        ));
    }, [data.text, html, isList, hasParagraphSpacing]);

    // Enhanced style with font loading support and gradient text
    const enhancedStyle: React.CSSProperties = useMemo(() => {
        const baseStyle: React.CSSProperties = mergeSpecialEffects({
            ...data.style,
            fontFamily,
            ...applyTextFillStyle(data.style),
        });
        const clipsText =
            baseStyle.backgroundClip === 'text' ||
            baseStyle.WebkitBackgroundClip === 'text';
        const truncated =
            baseStyle.textOverflow === 'ellipsis' ||
            baseStyle.WebkitLineClamp != null;
        const whiteSpace =
            baseStyle.whiteSpace ?? (truncated ? undefined : 'pre-wrap');

        // Legacy `data.gradient` still clips to the glyphs. A fill authored on
        // `style` (background-clip: text) wins, so the editor Fill control is
        // not overwritten.
        if (data.gradient && !clipsText) {
            return {
                ...baseStyle,
                backgroundImage: data.gradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                whiteSpace,
                ...overrideStyles,
            };
        }

        return {
            ...baseStyle,
            whiteSpace,
            ...overrideStyles,
        };
    }, [fontFamily, data.style, data.gradient, overrideStyles]);

    // Loading state
    if (isFontLoading && data.loadingState?.showLoadingIndicator) {
        return (
            <div style={enhancedStyle} className={data.className}>
                <span style={data.loadingState.loadingStyle}>
                    {data.loadingState.loadingText || 'Loading...'}
                </span>
            </div>
        );
    }

    // Error state
    if (error && data.errorState?.showErrorIndicator) {
        return (
            <div style={enhancedStyle} className={data.className}>
                <span style={data.errorState.errorStyle}>
                    {data.errorState.errorText || data.text}
                </span>
            </div>
        );
    }

    return (
        <div
            style={enhancedStyle}
            className={data.className}
            data-font-loading={isFontLoading}
            data-font-loaded={isReady || isLoaded}
            data-font-error={!!error}
            data-font-family={familyToLoad}
            {...(html
                ? { dangerouslySetInnerHTML: { __html: htmlForRender(data.text) } }
                : { children: content })}
        />
    );
};

// Static config for TextAtom
export const config: ComponentConfig = {
    displayName: 'TextAtom',
    type: 'atom',
    isInnerSequence: false,
    inputSchema: TextAtomInput,
    category: atomCategory('atoms'),
};