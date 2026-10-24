import React from 'react';
import { AbsoluteFill, Easing, interpolate } from 'remotion';
import { TextAtom } from '@microfox/remotion';
import type { SceneProps } from '../kit/contract';
import { useSection } from '../kit/hooks';

export type TrackTitleProps = {
  /** Defaults to the manifest title. */
  title?: string;
  /** Small boxed line under the title; defaults to the artist. */
  subtitle?: string;
  font?: string;
  subFont?: string;
  color?: string;
  size?: number;
  /** Where the block sits. Default 'center'. */
  placement?: 'center' | 'top' | 'bottom-left';
};

/**
 * Title and artist, in the layout of mediamake's waveform scene preset (big title, small boxed
 * caps line under it). Fades in and out with its layer.
 */
export const TrackTitle: React.FC<SceneProps<TrackTitleProps>> = ({
  manifest,
  title,
  subtitle,
  font = 'ProtestRevolution',
  subFont = 'Inter',
  color = '#FFFFFF',
  size = 180,
  placement = 'center',
}) => {
  const { elapsed, remaining } = useSection();
  const opacity = Math.min(
    interpolate(elapsed, [0, 0.8], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }),
    interpolate(remaining, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
  );
  const rise = interpolate(elapsed, [0, 1.2], [24, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.exp),
  });
  const align: React.CSSProperties =
    placement === 'top'
      ? { justifyContent: 'flex-start', alignItems: 'center', paddingTop: 120 }
      : placement === 'bottom-left'
        ? { justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 140px 120px' }
        : { justifyContent: 'center', alignItems: 'center' };
  const sub = subtitle ?? manifest.artist;

  return (
    <AbsoluteFill style={{ ...align, opacity, transform: `translateY(${rise}px)` }}>
      <TextAtom
        id="track-title"
        componentId="TextAtom"
        type="atom"
        data={{
          text: title ?? manifest.title,
          style: { fontSize: size, color, letterSpacing: 10, fontWeight: 400, lineHeight: 1 },
          font: { family: font },
        }}
      />
      {sub && (
        <div
          style={{
            marginTop: 28,
            padding: '14px 44px',
            borderRadius: 20,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <TextAtom
            id="track-subtitle"
            componentId="TextAtom"
            type="atom"
            data={{
              text: sub,
              style: {
                fontSize: 28,
                color: '#FFFFFF',
                textTransform: 'uppercase',
                letterSpacing: 10,
                fontWeight: 700,
              },
              font: { family: subFont },
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};
