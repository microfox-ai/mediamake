import React, { useMemo, useState, useEffect } from 'react';
import { continueRender, delayRender, Img, staticFile } from 'remotion';
import { BaseRenderableProps } from '../../core/types';
import { ComponentConfig } from '../../core/types';
import { useAnimatedStyles } from '../effects';
import { mergeCSSStyles } from '../effects/mergeCSSStyles';

interface ImageAtomProps extends BaseRenderableProps {
    data: {
        src: string;
        style?: React.CSSProperties;
        className?: string;
        proxySrc?: string; // Custom proxy endpoint for CORS handling
    };
}

// CORS proxy services - using reliable public proxies
const CORS_PROXIES = [
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];

/**
 * Utility function to get a CORS proxy URL for external images
 * @param url - The original image URL
 * @returns A proxied URL that should work with CORS
 */
const getCorsProxyUrl = (url: string): string => {
    // Use the first available proxy (cors-anywhere is most reliable)
    return `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;
};

/**
 * Hook to handle image loading with CORS fallback
 * @param src - The image source URL
 * @param proxySrc - Optional custom proxy endpoint
 * @returns Object containing the processed source and loading state
 */
const useImageSource = (src: string, proxySrc?: string) => {
    const [imageSource, setImageSource] = useState<string>(src);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);
    const [handle] = useState(() => delayRender('Loading image'));

    useEffect(() => {
        if (!src.startsWith('http')) {
            setImageSource(src);
            continueRender(handle);
            return;
        }

        // console.log('Loading image', src);

        setIsLoading(true);
        setHasError(false);

        // First, try the original URL
        const testImage = new Image();
        testImage.crossOrigin = 'anonymous';

        const handleSuccess = () => {
            setImageSource(src);
            setIsLoading(false);
            continueRender(handle);
        };

        const handleError = () => {
            // If original fails, try with custom proxy or fallback to CORS proxy
            let proxyUrl: string;

            if (proxySrc) {
                // Use custom proxy endpoint
                proxyUrl = `${proxySrc}?url=${encodeURIComponent(src)}`;
            } else {
                // Fallback to predefined CORS proxy
                proxyUrl = getCorsProxyUrl(src);
            }

            setImageSource(proxyUrl);
            setIsLoading(false);
            continueRender(handle);
        };

        testImage.onload = handleSuccess;
        testImage.onerror = handleError;
        testImage.src = src;

        // Cleanup
        return () => {
            testImage.onload = null;
            testImage.onerror = null;
        };
    }, [src, proxySrc, handle]);

    return { imageSource, isLoading, hasError };
};

export const Atom: React.FC<ImageAtomProps> = ({ data, id }) => {
    const overrideStyles = useAnimatedStyles(id);
    const { imageSource, isLoading, hasError } = useImageSource(data.src, data.proxySrc);

    const source = useMemo(() => {
        if (data.src.startsWith('http')) {
            return imageSource;
        }
        return staticFile(data.src);
    }, [data.src, imageSource]);

    const enhancedStyle = useMemo(
        () => mergeCSSStyles(data.style ?? {}, overrideStyles ?? {}),
        [data.style, overrideStyles, isLoading, hasError]
    );

    return (
        <Img
            className={data.className}
            src={source}
            style={enhancedStyle}
            crossOrigin={data.src.startsWith('http') ? "anonymous" : undefined}
            maxRetries={4}
            onError={() => {
                console.warn(`Failed to load image: ${data.src}`);
            }}
        />
    );
};

// Static config for ImageAtom
export const config: ComponentConfig = {
    displayName: 'ImageAtom',
    type: 'atom',
    isInnerSequence: false,
}; 