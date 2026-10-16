import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { staticFile, useVideoConfig, OffthreadVideo, Video as Html5Video, Loop, continueRender, delayRender, useRemotionEnvironment } from 'remotion';
import { BaseRenderableProps, ComponentConfig } from '../../core/types';
import { getClientSideMediaTags } from '../../core/clientMediaTags';
import { useAnimatedStyles } from '../effects';
import { mergeCSSStyles } from '../effects/mergeCSSStyles';
import { calculateComponentDuration, resolveLoopSrcDuration } from '../../core';
import { atomCategory } from '../../atom-category';
import { VideoAtomDataProps } from './input-schemas';
import { mergeSpecialEffects } from './special-effects-style';
import { applyImageLook } from '../beatmade/image-style';

export { VideoAtomDataProps } from './input-schemas';

// ============================================================================
// PROPS & COMPONENT
// ============================================================================

/**
 * Props interface for the VideoAtom component
 * Extends base renderable props with video-specific data
 */
interface VideoAtomProps extends BaseRenderableProps {
    data: VideoAtomDataProps;
}

/**
 * Measures the source so a loop iteration matches it. A srcDuration longer
 * than the file (a timeline range copied onto the atom) holds the last frame
 * in a cloud render. Preview hides that with the browser's native loop.
 * A shorter srcDuration still loops that slice of a longer file.
 */
const useMeasuredSrcDuration = (
    data: VideoAtomDataProps,
    fps: number,
    needsLoopPeriod: boolean,
    warnOnMismatch: boolean
): number | undefined => {
    const { loop, srcDuration, src, startFrom, endAt, playbackRate } = data;
    const [measured, setMeasured] = useState<number | undefined>(undefined);

    // Claimed during the first render, not in the effect, so a render can never
    // capture the frame before the measurement is in.
    const [handle] = useState<number | null>(() =>
        needsLoopPeriod ? delayRender(`VideoAtom: measuring duration of ${src}`) : null
    );
    const releasedRef = useRef(false);
    const release = useCallback(() => {
        if (handle !== null && !releasedRef.current) {
            releasedRef.current = true;
            continueRender(handle);
        }
    }, [handle]);

    useEffect(() => {
        const shouldMeasure =
            Boolean(loop) &&
            (needsLoopPeriod || (warnOnMismatch && srcDuration !== undefined));
        // Nothing to measure, and nothing to warn about.
        if (!shouldMeasure) {
            release();
            return;
        }

        let cancelled = false;
        calculateComponentDuration({
            componentId: 'VideoAtom',
            data: { src, startFrom, endAt, playbackRate },
        })
            .then(duration => {
                if (cancelled || duration === undefined) {
                    if (!cancelled && needsLoopPeriod) release();
                    return;
                }
                if (needsLoopPeriod) {
                    setMeasured(duration);
                    return;
                }
                if (
                    srcDuration !== undefined &&
                    Math.abs(duration - srcDuration) > 1 / fps
                ) {
                    console.warn(
                        `VideoAtom: srcDuration is ${srcDuration}s but ${src} measures ` +
                        `${duration.toFixed(3)}s.`
                    );
                }
            })
            // Unreachable or unreadable source: keep the previous behaviour.
            .catch(() => {
                if (needsLoopPeriod) release();
            });

        return () => {
            cancelled = true;
        };
    }, [
        loop,
        needsLoopPeriod,
        warnOnMismatch,
        src,
        startFrom,
        endAt,
        playbackRate,
        srcDuration,
        fps,
        release,
    ]);

    // Release only after the measured length is committed, so the captured
    // frame uses that loop period and not the timeline range.
    useEffect(() => {
        if (needsLoopPeriod && measured !== undefined) release();
    }, [needsLoopPeriod, measured, release]);

    // Never leave a render waiting on an unmounted component.
    useEffect(() => release, [release]);

    return measured;
};

/**
 * VideoAtom Component
 * 
 * A Remotion component that renders video with advanced control features:
 * - Time-based trimming (start/end points)
 * - Playback rate and volume control
 * - Flexible styling and object fit options
 * - Loop functionality
 * 
 * @param data - Video configuration object containing all playback and styling settings
 * @returns Remotion Video component with applied configurations
 */
export const Atom: React.FC<VideoAtomProps> = ({ data, id, context }) => {
    const { fps } = useVideoConfig();
    const overrideStyles = useAnimatedStyles(id);
    const environment = useRemotionEnvironment();
    // Outside of rendering the element loops itself: <Loop> restarts the sequence,
    // which seeks the element back every iteration and stalls the player.
    // Rendering uses <Loop> with one iteration equal to the source length.
    const loopsNatively = Boolean(data.loop) && !environment.isRendering;
    const measuredSrcDuration = useMeasuredSrcDuration(
        data,
        fps,
        Boolean(data.loop) && !loopsNatively,
        !environment.isRendering
    );

    // Calculate video source with proper handling for local vs remote files
    const source = useMemo(() => {
        if (data.src.startsWith('http')) {
            return data.src;
        }
        return staticFile(data.src);
    }, [data.src]);

    // Calculate trim values in frames
    const trimBefore = useMemo(() => {
        return data.startFrom ? data.startFrom * fps : undefined;
    }, [data.startFrom, fps]);

    const trimAfter = useMemo(() => {
        return data.endAt ? data.endAt * fps : undefined;
    }, [data.endAt, fps]);

    // Animated filters/transforms merge with the base style so a preset filter
    // (including color tint) is kept when an effect adds another filter function.
    const videoStyle = useMemo(() => {
        const style = (data.style ?? {}) as Record<string, unknown>;
        const markedFit = typeof style['--mm-image-fit'] === 'string';
        const withFit = {
            ...(data.style ?? {}),
            ...(!markedFit && data.fit ? { objectFit: data.fit } : {}),
        };
        const looked = applyImageLook(withFit);
        const hasExplicitFit =
            markedFit || Boolean(data.fit) || typeof style.objectFit === 'string';
        const lookPatch: React.CSSProperties = {};
        if (hasExplicitFit && looked.objectFit) lookPatch.objectFit = looked.objectFit;
        if (looked.mixBlendMode) lookPatch.mixBlendMode = looked.mixBlendMode;
        if (typeof looked.opacity === 'number') lookPatch.opacity = looked.opacity;
        if (looked.filter) lookPatch.filter = looked.filter;
        return mergeCSSStyles(
            mergeSpecialEffects({
                ...withFit,
                ...lookPatch,
            }),
            data.containerClassName ? {} : (overrideStyles ?? {})
        );
    }, [data.style, data.fit, data.containerClassName, overrideStyles]);

    // <OffthreadVideo> throws in @remotion/web-renderer; see core/clientMediaTags.
    const clientTags = getClientSideMediaTags();
    const VideoTag: any =
        environment.isClientSideRendering && clientTags
            ? clientTags.Video
            // OffthreadVideo cannot carry the native loop flag; in preview both
            // resolve to the same element, so this costs nothing.
            : loopsNatively
                ? Html5Video
                : OffthreadVideo;

    // Create the video component with proper styles
    const videoComponent = (
        <VideoTag
            className={data.className}
            src={source}
            style={videoStyle}
            trimBefore={trimBefore}
            trimAfter={trimAfter}
            playbackRate={data.playbackRate}
            volume={data.volume}
            muted={data.muted}
            loop={loopsNatively || undefined}
        />
    );

    const videoWithStyles = videoComponent;

    if (data.loop && !loopsNatively) {
        const loopSeconds = resolveLoopSrcDuration(
            data.srcDuration,
            measuredSrcDuration,
            fps
        );
        const loopDurationInFrames =
            loopSeconds !== undefined
                ? Math.max(1, Math.round(loopSeconds * fps))
                : context.timing?.durationInFrames;

        return (
            <Loop times={Infinity} durationInFrames={loopDurationInFrames} layout="none">
                {data.containerClassName ? (
                    <div className={data.containerClassName} style={overrideStyles}>
                        {videoComponent}
                    </div>
                ) : (
                    videoWithStyles
                )}
            </Loop>
        );
    }

    return data.containerClassName ? (
        <div className={data.containerClassName} style={overrideStyles}>
            {videoComponent}
        </div>
    ) : (
        videoWithStyles
    );
};

// ============================================================================
// STATIC HELPERS
// ============================================================================

/**
 * Static helper functions for video data manipulation
 * Provides utility functions for working with VideoAtomDataProps outside of React components
 */
export const VideoDataHelper = {
    /**
     * Determines if a video should be trimmed at a given timestamp
     * 
     * @param data - Video configuration data
     * @param options - Options object containing timestamp and fps
     * @param options.timestamp - Time in seconds to check trim status (default: 0)
     * @param options.fps - Frames per second for frame calculation (default: 30)
     * @returns boolean indicating if video should be trimmed at the given timestamp
     */
    isTrimmed: (data: VideoAtomDataProps, options: {
        timestamp?: number;
        fps?: number;
    }) => {
        const { timestamp = 0, fps = 30 } = options;

        if (!data.startFrom || !data.endAt) return false;

        const currentTime = timestamp;
        const startTime = data.startFrom || 0;
        const endTime = data.endAt;

        if (endTime) {
            return currentTime < startTime || currentTime > endTime;
        }

        return currentTime < startTime;
    },

    /**
     * Calculates the effective duration of a video after trimming and playback rate adjustment
     * 
     * @param data - Video configuration data
     * @param originalDuration - Original video duration in seconds
     * @returns Effective duration in seconds after applying trim settings and playback rate
     */
    getEffectiveDuration: (data: VideoAtomDataProps, originalDuration: number) => {
        let effectiveDuration = originalDuration;

        // Apply trimming if specified
        if (data.startFrom || data.endAt) {
            const startTime = data.startFrom || 0;
            const endTime = data.endAt || originalDuration;
            effectiveDuration = Math.max(0, endTime - startTime);
        }

        // Factor in playback rate - if playback rate is > 1, duration is shorter
        // if playback rate is < 1, duration is longer
        const playbackRate = data.playbackRate || 1;
        return effectiveDuration / playbackRate;
    },

    /**
     * Validates video source URL format
     * 
     * @param src - Video source URL
     * @returns boolean indicating if the source URL is valid
     */
    isValidSource: (src: string) => {
        if (!src) return false;

        // Check for HTTP/HTTPS URLs
        if (src.startsWith('http://') || src.startsWith('https://')) {
            return true;
        }

        // Check for local file paths (basic validation)
        const validExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        return validExtensions.some(ext => src.toLowerCase().includes(ext));
    }
};

export const config: ComponentConfig = {
    displayName: 'VideoAtom',
    type: 'atom',
    isInnerSequence: false,
    inputSchema: VideoAtomDataProps,
    category: atomCategory('atoms'),
};