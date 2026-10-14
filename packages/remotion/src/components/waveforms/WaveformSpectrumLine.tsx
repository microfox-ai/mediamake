import React, { useId, useMemo } from 'react';
import { createSmoothSvgPath } from '@remotion/media-utils';
import { Waveform, useWaveformContext } from './Waveform';
import { BaseRenderableData } from '../../core/types/renderable.types';
import { WaveformAudioSource, toSpectrumWaveformConfig } from './audio-source';
import { computeSmoothedSpectrum, computeSpectrumLineHeights } from './spectrum-line-math';

// Thin single-stroke spectrum line: flat baseline with smooth upward-only peaks
export interface WaveformSpectrumLineDataProps {
    audio: WaveformAudioSource;
    width?: number; // Defaults to the composition width
    height?: number; // Defaults to the composition height
    className?: string;
    style?: React.CSSProperties;

    // Line styling
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
    glowColor?: string;
    glowBlur?: number;

    // Layout
    baselineOffset?: number; // Distance of the flat baseline from the bottom edge, in px
    peakHeight?: number; // Fraction (0-1) of the available height a full-scale peak reaches
    direction?: 'low-to-high' | 'high-to-low'; // Bass on the left (default) or on the right
    pointCount?: number;

    // Spectrum analysis
    fftSize?: 1024 | 2048 | 4096 | 8192 | 16384;
    minFrequency?: number;
    maxFrequency?: number;
    frequencyScale?: 'log' | 'linear';
    tilt?: number;
    gain?: number;
    noiseFloor?: number;
    sharpness?: number;
    spread?: number;
    temporalSmoothing?: number; // 0-0.95, how long peaks linger
    smoothingFrames?: number;
}

export interface WaveformSpectrumLineProps extends BaseRenderableData {
    data: WaveformSpectrumLineDataProps;
}

export const WaveformSpectrumLine: React.FC<WaveformSpectrumLineProps> = ({ data }) => {
    const { audio, width, height, className = '', style = {}, ...lineProps } = data;
    const waveformConfig = useMemo(
        () => toSpectrumWaveformConfig(audio, width, height),
        [audio?.src, audio?.start, width, height]
    );
    return (
        <Waveform config={waveformConfig} className={className} style={style}>
            <WaveformSpectrumLineContent {...lineProps} />
        </Waveform>
    );
};

const WaveformSpectrumLineContent: React.FC<
    Omit<WaveformSpectrumLineDataProps, 'audio' | 'width' | 'height' | 'className' | 'style'>
> = ({
    strokeColor = '#FFFFFF',
    strokeWidth = 5,
    opacity = 1,
    glowColor,
    glowBlur = 0,
    baselineOffset,
    peakHeight = 1,
    direction = 'low-to-high',
    pointCount = 200,
    fftSize = 8192,
    minFrequency = 20,
    maxFrequency = 2200,
    frequencyScale = 'log',
    tilt = 0.3,
    gain = 15,
    noiseFloor = 0.02,
    sharpness = 1.6,
    spread = 1,
    temporalSmoothing = 0.5,
    smoothingFrames = 4,
}) => {
    const { audioData, audioFrame, fps, width, height } = useWaveformContext();
    const glowFilterId = `spectrum-line-glow-${useId().replace(/:/g, '')}`;

    const baselineY = height - (baselineOffset ?? strokeWidth);
    const maxPeakPx = Math.max(0, baselineY - strokeWidth) * Math.min(1, Math.max(0, peakHeight));

    const heights = useMemo(() => {
        if (!audioData) return null;
        const spectrum = computeSmoothedSpectrum({
            channels: audioData.channelWaveforms,
            sampleRate: audioData.sampleRate,
            cacheKey: String(audioData.resultId),
            frame: audioFrame,
            fps,
            fftSize,
            smoothing: temporalSmoothing,
            historyFrames: smoothingFrames,
        });
        const values = computeSpectrumLineHeights(spectrum, audioData.sampleRate, {
            pointCount,
            minFrequency,
            maxFrequency,
            frequencyScale,
            tilt,
            gain,
            noiseFloor,
            sharpness,
            spread,
        });
        return direction === 'high-to-low' ? values.reverse() : values;
    }, [
        audioData,
        audioFrame,
        fps,
        fftSize,
        temporalSmoothing,
        smoothingFrames,
        pointCount,
        minFrequency,
        maxFrequency,
        frequencyScale,
        tilt,
        gain,
        noiseFloor,
        sharpness,
        spread,
        direction,
    ]);

    const path = useMemo(() => {
        const values = heights ?? new Array(Math.max(2, pointCount)).fill(0);
        const lastIndex = Math.max(1, values.length - 1);
        return createSmoothSvgPath({
            points: values.map((value, index) => ({
                x: (index / lastIndex) * width,
                y: baselineY - value * maxPeakPx,
            })),
        });
    }, [heights, pointCount, width, baselineY, maxPeakPx]);

    const showGlow = glowBlur > 0;

    return (
        <svg
            width={width}
            height={height}
            className="absolute inset-0"
            style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
            {showGlow && (
                <defs>
                    <filter id={glowFilterId} x="-10%" y="-50%" width="120%" height="200%">
                        <feGaussianBlur stdDeviation={glowBlur} />
                    </filter>
                </defs>
            )}
            {showGlow && (
                <path
                    d={path}
                    fill="none"
                    stroke={glowColor ?? strokeColor}
                    strokeWidth={strokeWidth * 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={opacity * 0.6}
                    filter={`url(#${glowFilterId})`}
                />
            )}
            <path
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={opacity}
            />
        </svg>
    );
};
