import React from 'react';
import { Audio, interpolate, Sequence } from 'remotion';
import type { SceneProps } from '../../../../src/kit';
import { Vo } from '../parts';
import { f, src } from '../theme';
import { MUSIC, vo, VO_AT } from '../timeline';

/** the voice's spans (song seconds), to duck the music under it */
const SPANS = VO_AT.map(([id, at]) => [at, at + vo(id).duration] as const);
const duck = (s: number) => {
  let d = 0;
  for (const [a, b] of SPANS) {
    d = Math.max(d, interpolate(s, [a - 0.18, a - 0.02, b + 0.05, b + 0.3], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  }
  return 1 - 0.55 * d;
};
const LEVEL: Record<string, number> = { cold: 0.85, there: 0.7, pantry: 0.62 };

/** The whole video's voice and music (the opener and the end card bring their own sound). */
export const Sound: React.FC<SceneProps> = () => (
  <>
    {VO_AT.map(([id, at]) => (
      <Vo key={id} id={id} at={at} />
    ))}
    {MUSIC.map(m => {
      const len = f(m.until - m.at);
      return (
        <Sequence key={m.name} from={f(m.at)} durationInFrames={len} layout="none" name={`theme · ${m.name}`}>
          <Audio
            src={src('sfx2/intro-theme-i3.wav')}
            startFrom={f(m.offset)}
            volume={fr => LEVEL[m.name] * duck(m.at + fr / 30) * interpolate(fr, [0, 2, len - 4, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          />
        </Sequence>
      );
    })}
  </>
);
