import React, { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import {
  WaveformSpectrumFill,
  WaveformSpectrumLine,
  type WaveformSpectrumFillDataProps,
  type WaveformSpectrumLineDataProps,
} from '@microfox/remotion';
import type { SceneProps } from '../kit/contract';
import { applyContainerLayout, presetTree, runPreset } from './presets';
import { PresetTree } from './PresetTree';

/** The looks of mediamake's "Wave Look" action for WaveformSpectrumFill. */
export type WaveLook =
  | 'single-wave'
  | 'double-hit-wave'
  | 'triple-wave'
  | 'quadruple-wave'
  | 'fearless-beats';

const LAYERS: Record<Exclude<WaveLook, 'fearless-beats'>, [number, number]> = {
  'single-wave': [1, 0],
  'double-hit-wave': [2, 0],
  'triple-wave': [3, 2],
  'quadruple-wave': [4, 2],
};

const round = (v: number, digits = 3) => Number(v.toFixed(digits));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Motion and analysis fields for a look, as mediamake's waveformSpectrumFillChoice action
 * (apps/mediamake/components/editor/presets/actions/registry/waveform-spectrum-fill-choice.ts)
 * fills them. Colors, opacity, outline and size are left to the caller.
 */
export const waveLook = (
  look: WaveLook,
  impact = 0.5,
  spansFrame = false,
): Partial<WaveformSpectrumFillDataProps> => {
  const shared = {
    layerMirror: true,
    direction: 'low-to-high' as const,
    restHeight: 10,
    baselineOffset: 0,
    fftSize: 4096 as const,
    minFrequency: 40,
    maxFrequency: 5000,
    frequencyScale: 'log' as const,
    tilt: 0.25,
    noiseFloor: round(lerp(0.08, 0.02, impact)),
    sharpness: 0.85,
    spread: 8,
    temporalSmoothing: round(lerp(0.75, 0.45, impact)),
    smoothingFrames: 6,
  };
  if (look === 'fearless-beats') {
    return {
      ...shared,
      layerCount: 2,
      layerFrameOffset: Math.round(lerp(4, 22, impact)),
      peakHeight: round(lerp(0.22, 0.62, impact)),
      pointCount: 37,
      gain: round(lerp(8, 22, impact), 2),
    };
  }
  const [layerCount, layerFrameOffset] = LAYERS[look];
  return {
    ...shared,
    layerCount,
    layerFrameOffset,
    peakHeight: round(spansFrame ? lerp(0.06, 0.22, impact) : lerp(0.45, 1, impact)),
    pointCount: 24,
    gain: round(lerp(6, 24, impact), 2),
  };
};

type Box = {
  /** px from the bottom of the frame. Default 0. */
  bottom?: number;
  /** px; default 300 (fill/line) */
  height?: number;
  /** px; default the frame width */
  width?: number;
  /** px from the left; default centered */
  left?: number;
  opacity?: number;
  /** Flip vertically, for a wave hanging from the top edge. */
  flip?: boolean;
  /** Extra CSS transform on the box, e.g. 'rotate(270deg)' for a wave up the side. */
  transform?: string;
  mixBlendMode?: React.CSSProperties['mixBlendMode'];
};

export type WaveformLayerProps =
  | {
      kind: 'spectrum-fill';
      look?: WaveLook;
      /** 0..1, how hard the look hits (the action's impact slider). Default 0.5. */
      impact?: number;
      data?: Partial<WaveformSpectrumFillDataProps>;
      box?: Box;
    }
  | {
      kind: 'spectrum-line';
      data?: Partial<WaveformSpectrumLineDataProps>;
      box?: Box;
    }
  | {
      /** mediamake's `waveform-audio` preset: 'waves' = WaveformHistogram, 'static' = HistogramRanged. */
      kind: 'waveform-audio';
      waveform?: Record<string, unknown> & { type?: 'waves' | 'static' };
      container?: Record<string, unknown>;
      /** The editor's layout box around the preset (a timeline node's containerProps). */
      containerProps?: { style?: Record<string, unknown> };
    };

/**
 * An audio-reactive waveform that follows the song, with mediamake's waveform atoms and presets.
 * The song is not played again: the kit already plays it under every layer.
 */
export const WaveformLayer: React.FC<SceneProps<WaveformLayerProps>> = props => {
  const { manifest, section } = props;
  const { width: frameWidth, height: frameHeight } = useVideoConfig();
  // @microfox/remotion atoms call staticFile() themselves: pass the raw manifest path.
  const audio = { src: manifest.audio.src, start: section.from };

  const presetNodes = useMemo(() => {
    if (props.kind !== 'waveform-audio') return null;
    const output = runPreset(
      'waveform-audio',
      { audio, waveform: { type: 'waves', ...props.waveform }, container: props.container },
      { config: { width: frameWidth, height: frameHeight, duration: section.to - section.from } },
    );
    return applyContainerLayout(
      presetTree(output).filter(node => node.componentId !== 'AudioAtom'),
      props.containerProps,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.kind, manifest.audio.src, section.from, section.to, frameWidth, frameHeight,
    props.kind === 'waveform-audio' ? props.waveform : null,
    props.kind === 'waveform-audio' ? props.container : null,
    props.kind === 'waveform-audio' ? props.containerProps : null]);

  if (props.kind === 'waveform-audio') {
    return <PresetTree tree={presetNodes ?? []} duration={section.to - section.from} />;
  }

  const box = props.box ?? {};
  const width = box.width ?? frameWidth;
  const height = box.height ?? 300;
  const wrapper: React.CSSProperties = {
    position: 'absolute',
    bottom: box.bottom ?? 0,
    left: box.left ?? (frameWidth - width) / 2,
    width,
    height,
    opacity: box.opacity ?? 1,
    mixBlendMode: box.mixBlendMode,
    transform: [box.transform, box.flip ? 'scaleY(-1)' : ''].filter(Boolean).join(' ') || undefined,
  };

  return (
    <AbsoluteFill>
      <div style={wrapper}>
        {props.kind === 'spectrum-fill' ? (
          <WaveformSpectrumFill
            id={`wave-fill-${section.label}`}
            componentId="WaveformSpectrumFill"
            type="atom"
            data={{
              audio,
              width,
              height,
              ...waveLook(props.look ?? 'fearless-beats', props.impact ?? 0.5, false),
              ...props.data,
            }}
          />
        ) : (
          <WaveformSpectrumLine
            id={`wave-line-${section.label}`}
            componentId="WaveformSpectrumLine"
            type="atom"
            data={{ audio, width, height, ...props.data }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
