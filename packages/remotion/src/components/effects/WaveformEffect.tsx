import React, { useMemo } from 'react';
import { BaseRenderableProps } from '../../core/types/renderable.types';
import {
    UniversalEffectData,
    useUniversalAnimation,
    UniversalEffectContext,
    useUniversalEffectOptional,
} from './UniversalEffect';
import mergeCSSStyles from './mergeCSSStyles';
import { useWaveformData } from '../../templates/waveform/hooks/useWaveformData';

// Waveform effect data interface
export interface WaveformEffectData extends UniversalEffectData {
    // Audio source configuration
    audioSrc: string; // Audio source URL or ref:componentId
    numberOfSamples?: number; // Must be power of 2 (default: 128)
    windowInSeconds?: number; // Time window for analysis (default: 1/fps)
    dataOffsetInSeconds?: number; // Audio offset
    normalize?: boolean; // Normalize wave data
    useFrequencyData?: boolean; // Enable frequency analysis

    // Audio property to react to
    audioProperty?: 'bass' | 'mid' | 'treble' | 'waveform' | 'frequency'; // Which audio property to use
    sensitivity?: number; // Sensitivity multiplier (default: 1)
    threshold?: number; // Minimum value to trigger effect (default: 0)
    smoothing?: number; // Smoothing factor (0-1, default: 0.5)
    smoothNormalisation?: number; // Frame-based smoothing control (0 = no smoothing, 1 = current, >1 = more smoothing, default: 1)

    // Effect type configuration
    effectType?: 'zoom' | 'shake' | 'exposure' | 'blur' | 'scale' | 'rotate' | 'translateX' | 'translateY';

    // Effect-specific parameters
    intensity?: number; // Effect intensity multiplier (default: 1)
    minValue?: number; // Minimum effect value (default: 0 or 1 depending on effect)
    maxValue?: number; // Maximum effect value (default: varies by effect type)

    // For shake effect
    shakeAxis?: 'x' | 'y' | 'both';

    // For zoom/scale effect
    baseScale?: number; // Base scale value (default: 1)

    // For exposure effect
    baseBrightness?: number; // Base brightness value (default: 1)

    // For rotation effect
    rotationRange?: number; // Maximum rotation in degrees (default: 15)
}

// Waveform Effect Component using the new hook for maximum flexibility
export const WaveformEffect: React.FC<BaseRenderableProps> = ({
    id,
    componentId,
    type,
    data,
    children,
    context,
}) => {
    // 1. Use the core animation hook to get progress, frame, etc.
    const { progress, frame, mode, targetIds, effectData, fps } = useUniversalAnimation(data, context);
    const {
        audioSrc,
        numberOfSamples = 128,
        windowInSeconds,
        dataOffsetInSeconds = 0,
        normalize = false,
        useFrequencyData = true,
        audioProperty = 'bass',
        sensitivity = 1,
        threshold = 0,
        smoothing = 0.5,
        smoothNormalisation = 1,
        effectType = 'zoom',
        intensity = 1,
        minValue,
        maxValue,
        shakeAxis = 'both',
        baseScale = 1,
        baseBrightness = 1,
        rotationRange = 15,
    } = effectData as WaveformEffectData;
    const parentContext = useUniversalEffectOptional();

    // 2. Get waveform data - use original window size when smoothNormalisation is 0
    // When smoothNormalisation is 0, use original behavior (1/fps window)
    // When smoothNormalisation > 0, use larger window for smoother data
    const analysisWindow = smoothNormalisation === 0
        ? (windowInSeconds || 1 / fps) // Original behavior
        : (windowInSeconds || Math.max(1 / fps, 0.05)); // Minimum 50ms window for smoother data
    const { bass, mid, treble, waveformData } = useWaveformData({
        audioSrc,
        numberOfSamples,
        windowInSeconds: analysisWindow,
        dataOffsetInSeconds,
        normalize,
        frame,
        fps,
        includeFrequencyData: useFrequencyData,
        smoothNormalisation,
    });

    // 3. Calculate audio intensity value based on selected property
    const audioIntensity = useMemo(() => {
        let rawValue = 0;

        switch (audioProperty) {
            case 'bass':
                rawValue = bass || 0;
                break;
            case 'mid':
                rawValue = mid || 0;
                break;
            case 'treble':
                rawValue = treble || 0;
                break;
            case 'waveform':
                if (waveformData && waveformData.length > 0) {
                    // Calculate average amplitude
                    rawValue = waveformData.reduce((sum, val) => sum + Math.abs(val), 0) / waveformData.length;
                }
                break;
            case 'frequency':
                // Use bass as default for frequency
                rawValue = bass || 0;
                break;
            default:
                rawValue = bass || 0;
        }

        // Apply threshold
        const thresholdedValue = Math.max(0, rawValue - threshold);

        // Apply sensitivity
        const sensitizedValue = thresholdedValue * sensitivity;

        // Clamp to 0-1 range
        return Math.min(1, Math.max(0, sensitizedValue));
    }, [audioProperty, bass, mid, treble, waveformData, threshold, sensitivity]);

    // 4. Apply smoothing using interpolation with easing
    // Since we can't maintain state between frames, we smooth by:
    // 1. Using larger analysis window (done above)
    // 2. Applying easing curve to reduce rapid changes
    // If smoothNormalisation is 0, skip all smoothing to match original behavior
    const smoothedIntensity = useMemo(() => {
        // If smoothNormalisation is 0, return raw intensity (original behavior)
        if (smoothNormalisation === 0) {
            return audioIntensity;
        }

        // Apply smoothing through easing - higher smoothing value = more gradual transitions
        // Use a power curve that reduces the impact of sudden spikes
        const smoothingPower = 1 + (smoothing * 2); // Maps 0-1 to 1-3 power curve
        const smoothed = Math.pow(audioIntensity, smoothingPower);

        // Also apply a simple low-pass filter effect by mixing with a baseline
        // This reduces jitter from rapid audio changes
        const baseline = 0.1; // Small baseline to prevent zero values
        const filtered = smoothed * (1 - baseline * smoothing) + baseline * smoothing;

        return Math.min(1, Math.max(0, filtered));
    }, [audioIntensity, smoothing, smoothNormalisation]);

    // 5. Implement custom animation logic based on effect type
    const animatedStyles = useMemo(() => {
        // Use smoothed intensity directly - smoothing is already applied above
        const intensityValue = smoothedIntensity || audioIntensity;

        // Calculate effect value based on min/max or defaults
        let effectValue = intensityValue * intensity;

        // Apply min/max constraints if provided
        if (minValue !== undefined || maxValue !== undefined) {
            const defaultMin = effectType === 'zoom' || effectType === 'scale' ? baseScale : 0;
            const defaultMax = effectType === 'zoom' || effectType === 'scale' ? baseScale + intensity : intensity;

            const min = minValue !== undefined ? minValue : defaultMin;
            const max = maxValue !== undefined ? maxValue : defaultMax;

            effectValue = min + (intensityValue * (max - min));
        } else {
            // Use defaults based on effect type
            switch (effectType) {
                case 'zoom':
                case 'scale':
                    effectValue = baseScale + (intensityValue * intensity);
                    break;
                case 'exposure':
                    effectValue = baseBrightness + (intensityValue * intensity);
                    break;
                case 'blur':
                    effectValue = intensityValue * intensity * 10; // pixels
                    break;
                case 'rotate':
                    effectValue = (intensityValue - 0.5) * 2 * rotationRange; // degrees
                    break;
                case 'translateX':
                case 'translateY':
                    effectValue = (intensityValue - 0.5) * 2 * intensity * 50; // pixels
                    break;
                default:
                    effectValue = intensityValue * intensity;
            }
        }

        const styles: React.CSSProperties = {};

        switch (effectType) {
            case 'zoom':
            case 'scale':
                styles.transform = `scale(${effectValue})`;
                break;

            case 'shake':
                // Use deterministic shake based on frame and intensity for smooth animation
                // This creates smooth, predictable shake patterns instead of random jitter
                const shakeFrequency = 0.1; // Frequency of shake oscillation
                const shakeTime = frame * shakeFrequency;
                const shakeAmplitude = intensityValue * intensity * 20;

                // Use sine/cosine for smooth, continuous shake motion
                const shakeX = shakeAxis === 'x' || shakeAxis === 'both'
                    ? Math.sin(shakeTime * 2.3) * shakeAmplitude
                    : 0;
                const shakeY = shakeAxis === 'y' || shakeAxis === 'both'
                    ? Math.cos(shakeTime * 1.7) * shakeAmplitude
                    : 0;
                styles.transform = `translateX(${shakeX}px) translateY(${shakeY}px)`;
                break;

            case 'exposure':
                styles.filter = `brightness(${effectValue})`;
                break;

            case 'blur':
                styles.filter = `blur(${effectValue}px)`;
                break;

            case 'rotate':
                styles.transform = `rotate(${effectValue}deg)`;
                break;

            case 'translateX':
                styles.transform = `translateX(${effectValue}px)`;
                break;

            case 'translateY':
                styles.transform = `translateY(${effectValue}px)`;
                break;

            default:
                styles.transform = `scale(${effectValue})`;
        }

        if (parentContext && mode === 'provider') {
            const combinedStyles = mergeCSSStyles(parentContext.animatedStyles, styles);
            return combinedStyles;
        }

        return styles;
    }, [
        smoothedIntensity,
        audioIntensity,
        effectType,
        intensity,
        minValue,
        maxValue,
        baseScale,
        baseBrightness,
        rotationRange,
        shakeAxis,
        mode,
        parentContext?.animatedStyles,
        frame, // Add frame dependency for shake effect
    ]);

    // 6. Handle provider/wrapper logic
    const contextValue = useMemo(
        () => ({
            animatedStyles,
            targetIds,
            effectType: 'waveform',
        }),
        [animatedStyles, targetIds]
    );

    if (mode === 'provider') {
        return (
            <UniversalEffectContext.Provider value={contextValue}>
                {children}
            </UniversalEffectContext.Provider>
        );
    }

    return (
        <div {...effectData.props} style={animatedStyles}>
            {children}
        </div>
    );
};

export const config = {
    displayName: 'waveform',
    description: 'Waveform-driven effect that reacts to audio data (bass, mid, treble, waveform)',
    isInnerSequence: false,
    props: {
        audioSrc: {
            type: 'string',
            required: true,
            description: 'Audio source URL or ref:componentId',
        },
        audioProperty: {
            type: 'enum',
            values: ['bass', 'mid', 'treble', 'waveform', 'frequency'],
            default: 'bass',
            description: 'Which audio property to react to',
        },
        effectType: {
            type: 'enum',
            values: ['zoom', 'shake', 'exposure', 'blur', 'scale', 'rotate', 'translateX', 'translateY'],
            default: 'zoom',
            description: 'Type of effect to apply',
        },
        intensity: {
            type: 'number',
            default: 1,
            description: 'Effect intensity multiplier',
        },
        sensitivity: {
            type: 'number',
            default: 1,
            description: 'Sensitivity multiplier for audio detection',
        },
        threshold: {
            type: 'number',
            default: 0,
            description: 'Minimum audio value to trigger effect',
        },
        smoothing: {
            type: 'number',
            default: 0.5,
            description: 'Smoothing factor (0-1) for audio data',
        },
        smoothNormalisation: {
            type: 'number',
            default: 1,
            description: 'Frame-based smoothing control (0 = no smoothing, 1 = default, >1 = more smoothing)',
        },
    },
};

