// kinetictype: a kinetic-typography edit from data (projects/<slug>/video/edit.json), the make-kinetictype
// skills' engine. A project's video/index.tsx is three lines:
//
//   import edit from './edit.json';
//   import { defineKinetic, type KineticEdit } from '../../../src/kinetictype';
//   export default defineKinetic('<slug>', edit as KineticEdit);
//
// Each shot becomes its own layer (named "<id> <label>" in the Studio timeline) and draws one device
// (shots.tsx); an overlay adds grain, white flashes on the section hits, and the corner labels.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { defineProject, layer, type SceneProps } from '../kit';
import { Grain, Label, W, kick, useFonts, useTime } from './fx';
import { Burst, Crack, Faces, Flash, Letters, Open, Poster, Rise, Slam, Strobe } from './shots';
import type { KineticEdit, Shot } from './spec';

export * from './spec';
export * from './fx';
export { C } from './shots';

export const ShotScene: React.FC<SceneProps<{ shot: Shot }>> = ({ section, shot }) => {
  const t = useTime(section);
  if (!useFonts()) return null;
  switch (shot.type) {
    case 'open':
      return <Open s={shot} t={t} />;
    case 'slam':
      return <Slam s={shot} t={t} at={shot.from} amp={shot.amp} seed={shot.id} />;
    case 'strobe':
      return <Strobe s={shot} t={t} />;
    case 'letters':
      return <Letters s={shot} t={t} />;
    case 'crack':
      return <Crack s={shot} t={t} />;
    case 'burst':
      return <Burst s={shot} t={t} />;
    case 'faces':
      return <Faces s={shot} t={t} />;
    case 'rise':
      return <Rise s={shot} t={t} />;
    case 'flash':
      return <Flash s={shot} t={t} />;
    case 'poster':
      return <Poster s={shot} t={t} />;
  }
};

export const OverlayScene: React.FC<SceneProps<{ label?: string; flashes: number[] }>> = ({ section, label, flashes }) => {
  const t = useTime(section);
  if (!useFonts()) return null;
  const tc = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 30)).padStart(2, '0')}`;
  const ink = 'rgba(255,255,255,0.8)';
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Grain opacity={0.2} />
      <AbsoluteFill style={{ background: '#fff', opacity: kick(t, flashes, 0.07) * 0.85 }} />
      {label !== '' && (
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'difference' }}>
          {label && <Label text={label} x={60} y={64} color={ink} size={20} />}
          <Label text={tc} x={W - 60} y={64} anchor="right" color={ink} size={20} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** The layers of an edit: one per shot, then the overlay over the whole video. */
export const kineticLayers = (edit: KineticEdit) => {
  const end = Math.max(...edit.shots.map(s => s.to));
  return [
    ...edit.shots.map(s => layer({ scene: ShotScene, at: { from: s.from, to: s.to }, name: `${s.id} ${s.label ?? s.type}`, props: { shot: s } })),
    layer({ scene: OverlayScene, at: { from: 0, to: end }, name: 'grain, flashes, labels', props: { label: edit.label, flashes: edit.flashes ?? [] } }),
  ];
};

/** A whole kinetic-type project from its edit.json (the song is the manifest's audio). */
export const defineKinetic = (id: string, edit: KineticEdit) =>
  defineProject({ id, fps: edit.fps ?? 30, width: edit.width ?? 1080, height: edit.height ?? 1920, layers: kineticLayers(edit) });
