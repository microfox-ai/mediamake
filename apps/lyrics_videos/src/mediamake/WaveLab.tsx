/**
 * The `wave-lab` composition: renders any Look on any project's song and picture, with an ID badge
 * in the corner. scripts/wave-lab.ts shoots the catalog and a project's storyboard candidates with it.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, type CalculateMetadataFunction } from 'remotion';
import type { Manifest } from '../kit/manifest';
import { makeProjectVideo } from '../kit/ProjectVideo';
import type { Look } from './look';
import { lookVideo } from './lookVideo';

export type WaveLabProps = {
  manifest: Manifest | null;
  look: Look | null;
  /** Drawn top left, e.g. "W3 · side-bars-red". */
  label?: string | null;
};

export const WaveLab: React.FC<WaveLabProps> = ({ manifest, look, label }) => {
  const Video = useMemo(() => (look ? makeProjectVideo(lookVideo('wave-lab', look)) : null), [look]);
  if (!Video || !manifest) {
    throw new Error('wave-lab renders with inputProps { manifest, look }: use npm run wave-lab -w lyrics_videos');
  }
  return (
    <AbsoluteFill>
      <Video manifest={manifest} edits={null} />
      {label && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 28,
            padding: '10px 22px',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.72)',
            color: '#fff',
            font: '600 34px/1.1 Helvetica, Arial, sans-serif',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const waveLabMetadata: CalculateMetadataFunction<WaveLabProps> = ({ props }) => {
  const fps = props.look?.fps ?? 30;
  return {
    fps,
    width: props.look?.width ?? 1920,
    height: props.look?.height ?? 1080,
    durationInFrames: props.manifest ? Math.max(1, Math.ceil(props.manifest.audio.duration * fps)) : 1,
  };
};
