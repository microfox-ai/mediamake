import React from 'react';
import { AbsoluteFill } from 'remotion';
import { WaveformHistogramRanged } from '@microfox/remotion';
import type { SceneProps } from '../../../../src/kit';

type ChorusWaveProps = { color: string };

/** Reuses the @microfox/remotion waveform atom along the bottom edge. */
export const ChorusWave: React.FC<SceneProps<ChorusWaveProps>> = ({
  manifest,
  section,
  color,
}) => (
  <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
    <div style={{ height: 260, opacity: 0.85 }}>
      <WaveformHistogramRanged
        id={`chorus-wave-${section.label}`}
        componentId="WaveformHistogramRanged"
        type="atom"
        data={{
          // @microfox/remotion atoms call staticFile() themselves: pass the raw manifest path.
          audio: { src: manifest.audio.src, start: section.from },
          width: 1920,
          height: 260,
          barColor: color,
          barWidth: 10,
          barSpacing: 6,
          barBorderRadius: 5,
          histogramStyle: 'centered',
          horizontalSymmetry: true,
          numberOfSamples: 64,
        }}
      />
    </div>
  </AbsoluteFill>
);
