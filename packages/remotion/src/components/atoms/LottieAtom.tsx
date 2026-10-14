import React, { useMemo, useState, useEffect } from 'react';
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Lottie, LottieAnimationData } from '@remotion/lottie';
import { BaseRenderableProps, ComponentConfig } from '../../core/types';
import { useAnimatedStyles } from '../effects';
import { LottieAtomDataProps } from './input-schemas';

export { LottieAtomDataProps } from './input-schemas';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to handle Lottie animation data loading
 * Supports both local files (via staticFile) and remote URLs
 * 
 * @param src - The Lottie JSON source URL or local path
 * @returns Object containing animation data and loading state
 */
const useLottieData = (src: string) => {
    const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const [handle] = useState(() => delayRender('Loading Lottie animation'));

    useEffect(() => {
        if (!src) {
            console.error('LottieAtom: No source provided');
            setHasError(true);
            setIsLoading(false);
            continueRender(handle);
            return;
        }

        setIsLoading(true);
        setHasError(false);

        // Determine the source URL
        const sourceUrl = src.startsWith('http') ? src : staticFile(src);

        // Fetch the Lottie JSON data with better error handling
        fetch(sourceUrl, {
            mode: 'cors',
            credentials: 'omit',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${sourceUrl}`);
                }
                return response.json();
            })
            .then((json) => {
                // Validate that we got valid Lottie data
                if (!json || typeof json !== 'object') {
                    throw new Error('Invalid Lottie JSON data');
                }
                setAnimationData(json);
                setIsLoading(false);
                continueRender(handle);
            })
            .catch((error) => {
                console.error(`Failed to load Lottie animation from ${sourceUrl}:`, error.message || error);
                setHasError(true);
                setIsLoading(false);
                continueRender(handle);
            });

        // Cleanup function
        return () => {
            // Note: continueRender is called in both success and error cases above
        };
    }, [src, handle]);

    return { animationData, isLoading, hasError };
};

// ============================================================================
// PROPS & COMPONENT
// ============================================================================

/**
 * Props interface for the LottieAtom component
 * Extends base renderable props with Lottie-specific data
 */
interface LottieAtomProps extends BaseRenderableProps {
    data: LottieAtomDataProps;
}

/**
 * LottieAtom Component
 * 
 * A Remotion component that renders Lottie animations with advanced control features:
 * - Supports both local and remote Lottie JSON files
 * - Playback rate control for speed adjustments
 * - Direction control (forward/reverse)
 * - Flexible styling options
 * - Integration with Remotion's animation effects system
 * 
 * @param data - Lottie configuration object containing all playback and styling settings
 * @param id - Unique identifier for the component (used for animation effects)
 * @returns Remotion Lottie component with applied configurations
 */
export const Atom: React.FC<LottieAtomProps> = ({ data, id }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const overrideStyles = useAnimatedStyles(id);
    const { animationData, isLoading, hasError } = useLottieData(data.src);

    // Calculate the effective frame based on playback rate and direction
    const effectiveFrame = useMemo(() => {
        const playbackRate = data.playbackRate || 1;
        const direction = data.direction || 'forward';
        
        if (direction === 'reverse') {
            // For reverse playback, we need to know the total duration
            // This is a simplified approach; you might need to adjust based on actual animation
            return frame * playbackRate * -1;
        }
        
        return frame * playbackRate;
    }, [frame, data.playbackRate, data.direction]);

    // Combine data styles with animated override styles
    const enhancedStyle = useMemo(() => ({
        ...data.style,
        ...overrideStyles,
    }), [data.style, overrideStyles]);

    // Handle loading state
    if (isLoading) {
        return (
            <div 
                className={data.className}
                style={{
                    ...enhancedStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5,
                }}
            >
                {/* Loading state - keep invisible to avoid flicker */}
            </div>
        );
    }

    // Handle error state
    if (hasError || !animationData) {
        console.warn(`LottieAtom: Failed to render animation from ${data.src}`);
        return (
            <div 
                className={data.className}
                style={{
                    ...enhancedStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    border: '2px dashed rgba(255, 0, 0, 0.3)',
                    color: 'red',
                    fontSize: 12,
                    textAlign: 'center',
                    padding: 10,
                }}
            >
                ⚠️ Lottie Error
            </div>
        );
    }

    return (
        <Lottie
            animationData={animationData}
            style={enhancedStyle}
            className={data.className}
        />
    );
};

// ============================================================================
// STATIC CONFIG
// ============================================================================

/**
 * Static configuration for LottieAtom
 * Used for component registration and identification
 */
export const config: ComponentConfig = {
    displayName: 'LottieAtom',
    type: 'atom',
    isInnerSequence: false,
    inputSchema: LottieAtomDataProps,
};

// ============================================================================
// STATIC HELPERS
// ============================================================================

/**
 * Static helper functions for Lottie data manipulation
 * Provides utility functions for working with LottieAtomDataProps outside of React components
 */
export const LottieDataHelper = {
    /**
     * Validates Lottie source URL format
     * 
     * @param src - Lottie JSON source URL or local path
     * @returns boolean indicating if the source is valid
     */
    isValidSource: (src: string) => {
        if (!src) return false;

        // Check for HTTP/HTTPS URLs
        if (src.startsWith('http://') || src.startsWith('https://')) {
            return true;
        }

        // Check for local file paths with .json extension
        return src.toLowerCase().endsWith('.json');
    },

    /**
     * Calculates the effective playback rate considering direction
     * 
     * @param data - Lottie configuration data
     * @returns Effective playback rate (negative for reverse)
     */
    getEffectivePlaybackRate: (data: LottieAtomDataProps) => {
        const playbackRate = data.playbackRate || 1;
        const direction = data.direction || 'forward';
        
        return direction === 'reverse' ? -playbackRate : playbackRate;
    },
};


