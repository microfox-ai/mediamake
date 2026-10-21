import React from 'react';
import { AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';
import { useLyrics, useSongTime, type SceneProps } from '../../../../src/kit';
import { body } from '../fonts';

type KineticLyricsProps = {
  accent: string;
  fontSize?: number;
};

/** Current line, word by word: sung words light up in the accent color and pop as they land. */
export const KineticLyrics: React.FC<SceneProps<KineticLyricsProps>> = ({
  accent,
  fontSize = 110,
}) => {
  const { fps } = useVideoConfig();
  const t = useSongTime();
  const { line, wordIndex, isSinging } = useLyrics();
  if (!line) return null;

  const enter = spring({
    frame: Math.round((t - line.start) * fps),
    fps,
    config: { damping: 18, mass: 0.6 },
  });
  const leave = isSinging
    ? 1
    : interpolate(t - line.end, [0, 0.4], [1, 0], {
        extrapolateRight: 'clamp',
      });

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', padding: 160 }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: `0 ${fontSize * 0.32}px`,
          fontFamily: body,
          fontWeight: 700,
          fontSize,
          lineHeight: 1.15,
          textAlign: 'center',
          opacity: leave,
          transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px)`,
        }}
      >
        {line.words.map((w, i) => {
          const sung = i <= wordIndex;
          const pop = spring({
            frame: Math.round((t - w.start) * fps),
            fps,
            config: { damping: 12, mass: 0.4 },
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                color: sung ? accent : 'rgba(255,255,255,0.35)',
                transform: `scale(${sung ? interpolate(pop, [0, 1], [1.12, 1]) : 1})`,
                textShadow: sung ? `0 0 40px ${accent}` : 'none',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
