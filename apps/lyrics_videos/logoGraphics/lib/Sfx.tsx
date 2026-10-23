/**
 * Sound effects lined up with the picture by analysis. A brand's sounds live in
 * brands/<brand>/graphics/public/sfx/ (normalised to a −1 dBFS peak by tools/sfx.py, which also
 * measures each file's onset, attack and loudest point into graphics/sound/sfx.json). <Sfx> starts
 * a file so that the chosen moment lands exactly on scene time `at`; tools/sync_check.py verifies
 * it on the rendered MP4.
 *
 *   export const { Sfx } = createSfx({ brand: 'subhodayam', meta, latency: config.latency });
 */
import React, { createContext, useContext } from 'react';
import { Audio } from '@remotion/media';
import { Sequence, staticFile, useVideoConfig } from 'remotion';
import { clamp01, prog, soft } from './motion';

/** One file's measurements, from tools/sfx.py (seconds from the start of the file). */
export type SfxMeta = { duration: number; onset: number; attack?: number; peak: number; hits: number[]; rmsDb?: number; peakDb?: number };

/** A scene's mix level, so scenes can sit at an even loudness. Mixes multiply when nested; 0 mutes. */
const MixGain = createContext(1);
export const SfxMix: React.FC<{ gain: number; children: React.ReactNode }> = ({ gain, children }) => {
  const parent = useContext(MixGain);
  return <MixGain.Provider value={parent * gain}>{children}</MixGain.Provider>;
};

export type SfxProps<Name extends string> = {
  name: Name;
  /** scene time (s) the aligned moment should land on */
  at: number;
  /** which moment of the file: its detected onset, its precise attack, its loudest point, or a time (s) into the file */
  align?: 'onset' | 'attack' | 'peak' | number;
  volume?: number;
  /** fade in over this many seconds from where it starts (eased) */
  fadeIn?: number;
  /** fade out between these scene times (s), eased; default: the scene's last half second */
  fadeOut?: [number, number];
  /** playback speed (also shifts pitch), for variations of one sound */
  rate?: number;
};

/**
 * `latency`: how much later than scheduled files play in rendered MP4s. Measure it with
 * tools/sync_check.py (cross-correlation against the mix) and store it in the brand's
 * sound/sfx.config.json; it has differed per brand (47 ms, 66 ms).
 */
export const createSfx = <Meta extends Record<string, SfxMeta>>({ brand, meta, latency }: { brand: string; meta: Meta; latency: number }) => {
  type Name = Extract<keyof Meta, string>;
  const Sfx: React.FC<SfxProps<Name>> = ({ name, at, align = 'onset', volume = 1, fadeIn = 0, fadeOut, rate = 1 }) => {
    const { fps, durationInFrames } = useVideoConfig();
    const gain = useContext(MixGain);
    const end = durationInFrames / fps;
    const [out0, out1] = fadeOut ?? [end - 0.5, end];
    const m = meta[name];
    const key = typeof align === 'number' ? align : align === 'attack' ? (m.attack ?? m.onset) : m[align];
    const start = at - key / rate - latency; // scene time where the file starts
    const from = Math.round(Math.max(0, start) * fps);
    const trim = start < 0 ? Math.round(-start * fps * rate) : 0;
    if (gain === 0) return null;
    return (
      <Sequence from={from} layout="none">
        <Audio
          src={staticFile(`${brand}/sfx/${name}.mp3`)}
          trimBefore={trim || undefined}
          playbackRate={rate}
          volume={f => {
            const t = from / fps + f / fps; // scene time
            const fin = fadeIn > 0 ? soft(clamp01((t - Math.max(0, start)) / fadeIn)) : 1;
            return gain * volume * fin * (1 - prog(t, out0, out1, soft));
          }}
        />
      </Sequence>
    );
  };
  return { Sfx };
};
