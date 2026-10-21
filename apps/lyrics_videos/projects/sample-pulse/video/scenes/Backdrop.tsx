import React from 'react';
import { AbsoluteFill } from 'remotion';
import {
  useBeat,
  useEnergy,
  useSongTime,
  type SceneProps,
} from '../../../../src/kit';

/** Full-song background: navy radial glow that breathes with loudness and kicks on beats. */
export const Backdrop: React.FC<SceneProps> = () => {
  const t = useSongTime();
  const energy = useEnergy();
  const { pulse } = useBeat(8);
  const hue = 225 + Math.sin(t * 0.25) * 15;
  const glow = 0.25 + energy * 0.45 + pulse * 0.15;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 55%, hsla(${hue}, 80%, 45%, ${glow}) 0%, hsl(${hue}, 60%, 6%) 65%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          transform: `scale(${1 + pulse * 0.03})`,
          opacity: 0.4 + energy * 0.4,
        }}
      />
    </AbsoluteFill>
  );
};
