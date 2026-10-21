import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { useBeat, useSection, type SceneProps } from '../../../../src/kit';
import { body, display } from '../fonts';

type TitleCardProps = { subtitle?: string };

/** Title and artist; springs in, fades out over the last second of its section. */
export const TitleCard: React.FC<SceneProps<TitleCardProps>> = ({
  manifest,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { remaining } = useSection();
  const { pulse } = useBeat(5);

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exit = interpolate(remaining, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        opacity: Math.min(enter, exit),
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          border: '3px solid rgba(124, 204, 255, 0.6)',
          transform: `scale(${0.9 + pulse * 0.25})`,
          opacity: 0.3 + pulse * 0.7,
        }}
      />
      <div
        style={{
          fontFamily: display,
          fontSize: 220,
          color: 'white',
          letterSpacing: interpolate(enter, [0, 1], [40, 12]),
          transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
        }}
      >
        {manifest.title.toUpperCase()}
      </div>
      <div
        style={{
          fontFamily: body,
          fontSize: 40,
          color: 'rgba(255,255,255,0.7)',
          marginTop: 8,
        }}
      >
        {subtitle ?? manifest.artist}
      </div>
    </AbsoluteFill>
  );
};
