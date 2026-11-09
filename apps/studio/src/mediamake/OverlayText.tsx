import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { TextAtom } from '@microfox/remotion';
import type { SceneProps } from '../kit/contract';
import { useSection } from '../kit/hooks';

export type OverlayTextProps = {
  text: string;
  /** Google font as mediamake names it: 'Inter:600', 'Ponnala', 'NothingYouCouldDo'. */
  font?: string;
  size?: number;
  color?: string;
  /** px */
  letterSpacing?: number;
  textTransform?: React.CSSProperties['textTransform'];
  /** Box in px or percent. Default: the whole frame. */
  box?: { left?: number | string; right?: number | string; top?: number | string; bottom?: number | string };
  /** Where the text sits in its box, top to bottom. Default 'center'. */
  align?: 'top' | 'center' | 'bottom';
  /** Seconds of blur-in / blur-out at the layer's ends. */
  fadeIn?: number;
  fadeOut?: number;
  shadow?: boolean;
};

/**
 * A text line with mediamake's text-overlay blur-in / blur-out transitions: channel tags
 * ("Anime Music Zone"), titles ("శుభోదయం!"), credits. Place it with `at: { from, to }`.
 */
export const OverlayText: React.FC<SceneProps<OverlayTextProps>> = ({
  text,
  font = 'Inter:600',
  size = 24,
  color = '#FFFFFF',
  letterSpacing = 0,
  textTransform = 'uppercase',
  box,
  align = 'center',
  fadeIn = 1,
  fadeOut = 1,
  shadow = true,
}) => {
  const { elapsed, remaining } = useSection();
  const inT = fadeIn > 0 ? interpolate(elapsed, [0, fadeIn], [0, 1], { extrapolateRight: 'clamp' }) : 1;
  const outT = fadeOut > 0 ? interpolate(remaining, [0, fadeOut], [0, 1], { extrapolateRight: 'clamp' }) : 1;
  const t = Math.min(inT, outT);
  const [family, weight] = font.split(':');

  return (
    <AbsoluteFill
      style={{
        ...(box ? { ...box, width: 'auto', height: 'auto' } : {}),
        justifyContent: align === 'top' ? 'flex-start' : align === 'bottom' ? 'flex-end' : 'center',
        alignItems: 'center',
        opacity: t,
        filter: `blur(${(1 - t) * 12}px)`,
      }}
    >
      <TextAtom
        id={`overlay-${text}`}
        componentId="TextAtom"
        type="atom"
        data={{
          text,
          style: {
            fontSize: size,
            color,
            letterSpacing,
            textTransform,
            textAlign: 'center',
            fontWeight: weight ? Number(weight) : 400,
            textShadow: shadow ? '0 2px 4px rgba(0,0,0,0.5)' : undefined,
          },
          font: { family },
        }}
      />
    </AbsoluteFill>
  );
};
