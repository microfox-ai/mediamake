import React, { useId, useMemo } from 'react';
import { createSmoothSvgPath } from '@remotion/media-utils';
import { Waveform, useWaveformContext } from './Waveform';
import { BaseRenderableData } from '../../core/types/renderable.types';
import { WaveformAudioSource, toSpectrumWaveformConfig } from './audio-source';
import { computeSmoothedSpectrum, computeSpectrumLineHeights } from './spectrum-line-math';

// Solid filled spectrum: a smooth crest with broad hills, closed down to the bottom edge.
// Quiet audio sits as a thin band; louder passages rise into rolling waves.
export interface WaveformSpectrumFillDataProps {
    audio: WaveformAudioSource;
    width?: number; // Defaults to the composition width
    height?: number; // Defaults to the composition height
    className?: string;
    style?: React.CSSProperties;

    fillColor?: string;
    gradientEndColor?: string;
    opacity?: number;
    strokeColor?: string;
    strokeWidth?: number;

    // Overlapping layers: layer 1 is the front (fillColor), later layers sit behind it
    layerCount?: number; // 1-4
    layer2Color?: string;
    layer3Color?: string;
    layer4Color?: string;
    layerMirror?: boolean; // Flip every other layer left-right so hills interleave
    layerFrameOffset?: number; // Each layer trails the one in front by this many frames

    // Layout
    restHeight?: number; // Thickness of the band when the spectrum is silent, in px
    baselineOffset?: number; // Distance of the fill's bottom edge from the container bottom, in px
    peakHeight?: number; // Fraction (0-1) of the space above the rest band a full-scale peak uses
    direction?: 'low-to-high' | 'high-to-low';
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
    temporalSmoothing?: number;
    smoothingFrames?: number;
}

export interface WaveformSpectrumFillProps extends BaseRenderableData {
    data: WaveformSpectrumFillDataProps;
}

export const WaveformSpectrumFill: React.FC<WaveformSpectrumFillProps> = ({ data }) => {
    const { audio, width, height, className = '', style = {}, ...fillProps } = data;
    const waveformConfig = useMemo(
        () => toSpectrumWaveformConfig(audio, width, height),
        [audio?.src, audio?.start, width, height]
    );
    return (
        <Waveform config={waveformConfig} className={className} style={style}>
            <WaveformSpectrumFillContent {...fillProps} />
        </Waveform>
    );
};

const WaveformSpectrumFillContent: React.FC<
    Omit<WaveformSpectrumFillDataProps, 'audio' | 'width' | 'height' | 'className' | 'style'>
> = ({
    fillColor = '#FFFFFF',
    gradientEndColor,
    opacity = 1,
    strokeColor,
    strokeWidth = 0,
    layerCount = 1,
    layer2Color = '#E3121B',
    layer3Color = '#8A0B12',
    layer4Color = '#4A0509',
    layerMirror = true,
    layerFrameOffset = 0,
    restHeight = 8,
    baselineOffset = 0,
    peakHeight = 1,
    direction = 'low-to-high',
    pointCount = 36,
    fftSize = 4096,
    minFrequency = 30,
    maxFrequency = 6000,
    frequencyScale = 'log',
    tilt = 0.2,
    gain = 14,
    noiseFloor = 0.03,
    sharpness = 0.7,
    spread = 6,
    temporalSmoothing = 0.7,
    smoothingFrames = 8,
}) => {
    const { audioData, audioFrame, fps, width, height } = useWaveformContext();
    const gradientId = `spectrum-fill-${useId().replace(/:/g, '')}`;

    const bottom = Math.max(0, height - Math.max(0, baselineOffset));
    const rest = Math.min(Math.max(0, restHeight), bottom);
    const crestBase = bottom - rest;
    const travel = crestBase * Math.min(1, Math.max(0, peakHeight));

    const layers = Math.min(4, Math.max(1, Math.round(layerCount)));
    const frameOffset = Math.max(0, Math.round(layerFrameOffset));

    const layerHeights = useMemo(() => {
        if (!audioData) return null;
        const byFrame = new Map<number, number[]>();
        const heightsAt = (frame: number) => {
            let values = byFrame.get(frame);
            if (!values) {
                const spectrum = computeSmoothedSpectrum({
                    channels: audioData.channelWaveforms,
                    sampleRate: audioData.sampleRate,
                    cacheKey: String(audioData.resultId),
                    frame,
                    fps,
                    fftSize,
                    smoothing: temporalSmoothing,
                    historyFrames: smoothingFrames,
                });
                values = computeSpectrumLineHeights(spectrum, audioData.sampleRate, {
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
                byFrame.set(frame, values);
            }
            return values;
        };
        return Array.from({ length: layers }, (_, layer) => {
            const values = heightsAt(Math.max(0, audioFrame - layer * frameOffset)).slice();
            const flipped = (direction === 'high-to-low') !== (layerMirror && layer % 2 === 1);
            return flipped ? values.reverse() : values;
        });
    }, [
        audioData,
        audioFrame,
        layers,
        frameOffset,
        layerMirror,
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

    const paths = useMemo(() => {
        const silent = new Array(Math.max(2, pointCount)).fill(0);
        return Array.from({ length: layers }, (_, layer) => {
            const values = layerHeights?.[layer] ?? silent;
            const lastIndex = Math.max(1, values.length - 1);
            const points = values.map((value, index) => ({
                x: (index / lastIndex) * width,
                y: Math.max(0, crestBase - value * travel),
            }));
            const crest = createSmoothSvgPath({ points });
            return {
                crestPath: crest,
                fillPath: `${crest} L ${width},${bottom} L 0,${bottom} Z`,
            };
        });
    }, [layerHeights, layers, pointCount, width, crestBase, travel, bottom]);

    const showGradient = Boolean(gradientEndColor);
    const layerColors = [fillColor, layer2Color, layer3Color, layer4Color];
    const layerFill = (layer: number) =>
        layer === 0 && showGradient ? `url(#${gradientId})` : layerColors[layer];

    return (
        <svg
            width={width}
            height={height}
            className="absolute inset-0"
            style={{ pointerEvents: 'none', overflow: 'hidden' }}
        >
            {showGradient && (
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor={fillColor} />
                        <stop offset="100%" stopColor={gradientEndColor} />
                    </linearGradient>
                </defs>
            )}
            {paths
                .map(({ fillPath, crestPath }, layer) => (
                    <g key={layer}>
                        <path d={fillPath} fill={layerFill(layer)} stroke="none" opacity={opacity} />
                        {strokeWidth > 0 && (
                            <path
                                d={crestPath}
                                fill="none"
                                stroke={strokeColor ?? layerColors[layer]}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={opacity}
                            />
                        )}
                    </g>
                ))
                .reverse()}
        </svg>
    );
};
