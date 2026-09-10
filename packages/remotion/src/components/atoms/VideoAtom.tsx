import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { staticFile, useVideoConfig, OffthreadVideo, Video as Html5Video, Loop, continueRender, delayRender, useRemotionEnvironment } from 'remotion';
import { BaseRenderableProps, ComponentConfig } from '../../core/types';
import { getClientSideMediaTags } from '../../core/clientMediaTags';
import { z } from 'zod';
import { useAnimatedStyles } from '../effects';
import { calculateComponentDuration } from '../../core';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================


export const VideoAtomDataProps = z.object({
    src: z.string(),                    // Video source URL
    srcDuration: z.number().optional(), // Video duration in seconds (or to say it more accurately, each iteration duration in a loop))
    style: z.record(z.string(), z.any()).optional(), // CSS styles object
    containerClassName: z.string().optional(),   // CSS class names
    className: z.string().optional(),   // CSS class names
    startFrom: z.number().optional(),   // Start playback from this time (seconds)
    endAt: z.number().optional(),       // End playback at this time (seconds)
    playbackRate: z.number().optional(), // Playback speed multiplier
    volume: z.number().optional(),      // Volume level (0-1)
    muted: z.boolean().optional(),      // Mute video audio
    loop: z.boolean().optional(),       // Whether to loop the video
    fit: z.enum(['contain', 'cover', 'fill', 'none', 'scale-down']).optional(), // Object fit style
});
export type VideoAtomDataProps = z.infer<typeof VideoAtomDataProps>;

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
 * Measures the source so a loop iteration matches it: a loop longer than the
 * source leaves the element on its last frame until the next iteration seeks it
 * back. `srcDuration` stays authoritative — this only measures when it is
 * absent, and otherwise warns when the two disagree.
 */
const useMeasuredSrcDuration = (
    data: VideoAtomDataProps,
    fps: number,
    needsLoopPeriod: boolean,
    warnOnMismatch: boolean
): number | undefined => {
    const { loop, srcDuration, src, startFrom, endAt, playbackRate } = data;
    const isNeeded = needsLoopPeriod && srcDuration === undefined;
    const [measured, setMeasured] = useState<number | undefined>(undefined);

    // Claimed during the first render, not in the effect, so a render can never
    // capture the frame before the measurement is in.
    const [handle] = useState<number | null>(() =>
        isNeeded ? delayRender(`VideoAtom: measuring duration of ${src}`) : null
    );
    const releasedRef = useRef(false);
    const release = useCallback(() => {
        if (handle !== null && !releasedRef.current) {
            releasedRef.current = true;
            continueRender(handle);
        }
    }, [handle]);

    useEffect(() => {
        // Nothing to measure, and nothing to warn about.
        if (!loop || (!isNeeded && (!warnOnMismatch || srcDuration === undefined))) {
            release();
            return;
        }

        let cancelled = false;
        calculateComponentDuration({
            componentId: 'VideoAtom',
            data: { src, startFrom, endAt, playbackRate },
        })
            .then(duration => {
                if (cancelled || duration === undefined) return;
                if (isNeeded) {
                    setMeasured(duration);
                } else if (
                    srcDuration !== undefined &&
                    Math.abs(duration - srcDuration) > 1 / fps
                ) {
                    console.warn(
                        `VideoAtom: srcDuration is ${srcDuration}s but ${src} measures ` +
                        `${duration.toFixed(3)}s. The loop will stall on the last frame ` +
                        `for the difference.`
                    );
                }
            })
            // Unreachable or unreadable source: keep the previous behaviour.
            .catch(() => undefined)
            .finally(release);

        return () => {
            cancelled = true;
        };
    }, [
        loop,
        isNeeded,
        warnOnMismatch,
        src,
        startFrom,
        endAt,
        playbackRate,
        srcDuration,
        fps,
        release,
    ]);

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
    // Rendering keeps <Loop>, so rendered output is unchanged.
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

    // Note: Animated styles (overrideStyles) are now applied to the wrapper div
    // while video-specific styles are applied directly to the video tag

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
            style={data.style ? { ...data.style, ...(data.fit ? { objectFit: data.fit } : {}) } : {}}
            trimBefore={trimBefore}
            trimAfter={trimAfter}
            playbackRate={data.playbackRate}
            volume={data.volume}
            muted={data.muted}
            loop={loopsNatively || undefined}
        />
    );

    // Apply animated styles directly to video if no container className is provided
    const videoWithStyles = data.containerClassName ? videoComponent : (
        <VideoTag
            className={data.className}
            src={source}
            style={data.style ? { ...data.style, ...(data.fit ? { objectFit: data.fit } : {}), ...overrideStyles } : overrideStyles}
            trimBefore={trimBefore}
            trimAfter={trimAfter}
            playbackRate={data.playbackRate}
            volume={data.volume}
            muted={data.muted}
            loop={loopsNatively || undefined}
        />
    );

    if (data.loop && !loopsNatively) {
        const loopDurationInFrames = data.srcDuration
            ? data.srcDuration * fps
            : measuredSrcDuration !== undefined
                ? Math.max(1, Math.round(measuredSrcDuration * fps))
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
};