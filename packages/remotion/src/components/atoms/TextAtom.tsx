import React, { useEffect, useMemo, useState } from 'react';
import { delayRender, continueRender } from 'remotion';
import { BaseRenderableProps } from '../../core/types';
import { ComponentConfig } from '../../core/types';
import { useFont } from '../../hooks/useFontLoader';
import { useAnimatedStyles } from '../effects';
import { TextAtomInput } from './input-schemas';

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
    const [renderHandle] = useState(() =>
        delayRender(`Loading font: ${data.font?.family}`)
    );

    // Font loading logic with delayRender support
    const { isLoaded, error, isReady, fontFamily } = useFont(
        data.font?.family || 'Inter',
        {
            weights: data.font?.weights || ['400'],
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
        if (data.font?.family) {
            if (isReady || isLoaded) {
                setIsFontLoading(false);
            } else if (!isReady && !isLoaded && !error) {
                setIsFontLoading(true);
            }
        }
    }, [data.font, isReady, isLoaded, error]);

    // Enhanced style with font loading support and gradient text
    const enhancedStyle: React.CSSProperties = useMemo(() => {
        const baseStyle: React.CSSProperties = {
            fontFamily,
            ...data.style,
        };

        // Apply gradient text effect if gradient is provided
        if (data.gradient) {
            return {
                ...baseStyle,
                backgroundImage: data.gradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                ...overrideStyles,
            };
        }

        return {
            ...baseStyle,
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
            data-font-family={data.font?.family || 'system'}
        >
            {data.text}
        </div>
    );
};

// Static config for TextAtom
export const config: ComponentConfig = {
    displayName: 'TextAtom',
    type: 'atom',
    isInnerSequence: false,
    inputSchema: TextAtomInput,
};