/** photo / cutout / image: a picture fitted into a box, graded, with sticker outlines and glows. */
import React, { useId } from 'react';
import { Img } from 'remotion';
import { src } from '../fonts.ts';
import { useFull } from '../canvas.tsx';
import type { PhotoLayer } from '../spec.ts';
import { Defs, DuotoneFilter, LevelsFilter, OutlineFilter, glowFilter, gradeFilter, safeId, shadowFilter } from './filters.tsx';

const fadeMask = (f: NonNullable<PhotoLayer['fade']>) => `linear-gradient(to ${f.side}, black ${(1 - (f.size ?? 0.5)) * 100}%, transparent 100%)`;

export const Photo: React.FC<{ job: string; layer: PhotoLayer }> = ({ job, layer }) => {
  const id = safeId(useId());
  const full = useFull();
  if (!layer.src) return null;
  const [x, y, w, h] = layer.box ?? full;
  const fit = layer.fit ?? (layer.type === 'image' ? 'contain' : 'cover');
  const [fx, fy] = layer.focus ?? [0.5, 0.5];
  const [ox, oy] = layer.offset ?? [0, 0];
  const zoom = layer.zoom ?? 1;
  const imgFilter = [layer.levels && `url(#${id}-lv)`, gradeFilter(layer.grade), layer.duotone && `url(#${id}-duo)`].filter(Boolean).join(' ');
  const outerFilter = [layer.outline && `url(#${id}-line)`, shadowFilter(layer.shadow), glowFilter(layer.glow)].filter(Boolean).join(' ');
  const mask = layer.fade ? fadeMask(layer.fade) : undefined;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: layer.opacity, mixBlendMode: layer.blend as React.CSSProperties['mixBlendMode'], transform: layer.rotate ? `rotate(${layer.rotate}deg)` : undefined, filter: outerFilter || undefined }}>
      <Defs>
        {layer.levels && <LevelsFilter id={`${id}-lv`} levels={layer.levels} />}
        {layer.duotone && <DuotoneFilter id={`${id}-duo`} colors={layer.duotone} />}
        {layer.outline && <OutlineFilter id={`${id}-line`} width={layer.outline.width} color={layer.outline.color} />}
      </Defs>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: layer.type === 'cutout' ? 'visible' : 'hidden',
          borderRadius: layer.radius,
          border: layer.border ? `${layer.border.width}px solid ${layer.border.color}` : undefined,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        <Img
          src={src(job, layer.src)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            objectPosition: `${fx * 100}% ${fy * 100}%`,
            transform: `translate(${ox}px, ${oy}px) scale(${zoom * (layer.flip ? -1 : 1)}, ${zoom})`,
            transformOrigin: `${fx * 100}% ${fy * 100}%`,
            filter: imgFilter || undefined,
          }}
        />
      </div>
    </div>
  );
};
