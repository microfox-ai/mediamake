/** fill, shape, fx and logo layers. */
import React from 'react';
import { Img } from 'remotion';
import { src } from '../fonts.ts';
import { CANVAS, type Box, type FillLayer, type FxLayer, type LogoLayer, type ShapeLayer } from '../spec.ts';
import { glowFilter, shadowFilter } from './filters.tsx';

const FULL: Box = [0, 0, CANVAS.w, CANVAS.h];

const common = (l: { opacity?: number; blend?: string; rotate?: number }): React.CSSProperties => ({
  opacity: l.opacity,
  mixBlendMode: l.blend as React.CSSProperties['mixBlendMode'],
  transform: l.rotate ? `rotate(${l.rotate}deg)` : undefined,
});

const at = ([x, y, w, h]: Box): React.CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h });

export const Fill: React.FC<{ layer: FillLayer }> = ({ layer }) => {
  const r = layer.rays;
  const step = r ? 360 / (r.count ?? 16) : 0;
  const rays = r && `repeating-conic-gradient(from 0deg at ${(r.at?.[0] ?? 0.5) * 100}% ${(r.at?.[1] ?? 0.5) * 100}%, ${r.color} 0deg ${step * (r.duty ?? 0.5)}deg, transparent ${step * (r.duty ?? 0.5)}deg ${step}deg)`;
  return <div style={{ ...at(layer.box ?? FULL), ...common(layer), backgroundColor: layer.color, backgroundImage: [rays, layer.background].filter(Boolean).join(', ') || undefined }} />;
};

export const Shape: React.FC<{ layer: ShapeLayer }> = ({ layer }) => {
  const color = layer.color ?? '#fff';
  const filter = [shadowFilter(layer.shadow), glowFilter(layer.glow)].filter(Boolean).join(' ') || undefined;
  if (layer.kind === 'arrow' || layer.kind === 'line') {
    const [x1, y1] = layer.from ?? [0, 0];
    const [x2, y2] = layer.to ?? [100, 0];
    const t = layer.thickness ?? 16;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const head = layer.kind === 'arrow' ? t * 2.6 : 0;
    const shaft = `M0 ${-t / 2} L${len - head} ${-t / 2} L${len - head} ${t / 2} L0 ${t / 2} Z`;
    const tip = `M${len - head} ${-t * 1.6} L${len} 0 L${len - head} ${t * 1.6} Z`;
    return (
      <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', filter, ...common(layer), transform: undefined }} width={CANVAS.w} height={CANVAS.h}>
        <g transform={`translate(${x1} ${y1}) rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI})`}>
          <path d={layer.kind === 'arrow' ? `${shaft} ${tip}` : shaft} fill={color} stroke={layer.stroke?.color} strokeWidth={layer.stroke?.width} strokeLinejoin="round" paintOrder="stroke" />
        </g>
      </svg>
    );
  }
  const box = layer.box ?? FULL;
  const transform = [layer.rotate && `rotate(${layer.rotate}deg)`, layer.skew && `skewX(${layer.skew}deg)`].filter(Boolean).join(' ') || undefined;
  if (layer.kind === 'burst') {
    const n = layer.points ?? 14;
    const pts = Array.from({ length: n * 2 }, (_, i) => {
      const r = i % 2 ? 0.36 : 0.5;
      const a = (i * Math.PI) / n - Math.PI / 2;
      return `${50 + Math.cos(a) * r * 100},${50 + Math.sin(a) * r * 100}`;
    }).join(' ');
    return (
      <svg style={{ ...at(box), ...common(layer), transform, filter, overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={pts} fill={color} stroke={layer.stroke?.color} strokeWidth={layer.stroke ? (layer.stroke.width * 100) / box[2] : 0} strokeLinejoin="round" />
      </svg>
    );
  }
  const stripes = layer.kind === 'stripes' && `repeating-linear-gradient(${layer.angle ?? 45}deg, ${color} 0 ${layer.thickness ?? 20}px, transparent ${layer.thickness ?? 20}px ${(layer.thickness ?? 20) * 2}px)`;
  return (
    <div
      style={{
        ...at(box),
        ...common(layer),
        transform,
        filter,
        borderRadius: layer.kind === 'circle' || layer.kind === 'ring' ? '50%' : layer.radius,
        background: layer.kind === 'ring' ? undefined : (stripes || layer.background || color),
        border: layer.kind === 'ring' ? `${layer.thickness ?? 12}px solid ${color}` : layer.stroke ? `${layer.stroke.width}px solid ${layer.stroke.color}` : undefined,
      }}
    />
  );
};

export const Fx: React.FC<{ layer: FxLayer }> = ({ layer }) => {
  const s = layer.strength ?? 0.5;
  const color = layer.color ?? '#000';
  const box = at(layer.box ?? FULL);
  const [ax, ay] = layer.at ?? [0.5, 0.5];
  switch (layer.kind) {
    case 'vignette':
      return <div style={{ ...box, ...common(layer), background: `radial-gradient(ellipse at ${ax * 100}% ${ay * 100}%, transparent 40%, rgba(0,0,0,${s}) 100%)` }} />;
    case 'light':
      return <div style={{ ...box, mixBlendMode: 'screen', ...common(layer), opacity: s, background: `radial-gradient(circle at ${ax * 100}% ${ay * 100}%, ${color} 0%, transparent ${layer.size ?? 45}%)` }} />;
    case 'tint':
      return <div style={{ ...box, mixBlendMode: 'soft-light', ...common(layer), opacity: s, background: color }} />;
    case 'scanlines':
      return <div style={{ ...box, ...common(layer), opacity: s, background: `repeating-linear-gradient(0deg, ${color} 0 2px, transparent 2px ${layer.size ?? 5}px)` }} />;
    case 'halftone':
      return (
        <div
          style={{ ...box, mixBlendMode: 'multiply', ...common(layer), opacity: s, backgroundImage: `radial-gradient(${color} 30%, transparent 32%)`, backgroundSize: `${layer.size ?? 8}px ${layer.size ?? 8}px` }}
        />
      );
    case 'letterbox': {
      const bar = layer.size ?? 70;
      return (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, width: CANVAS.w, height: bar, background: color, ...common(layer) }} />
          <div style={{ position: 'absolute', left: 0, bottom: 0, width: CANVAS.w, height: bar, background: color, ...common(layer) }} />
        </>
      );
    }
    case 'speedlines':
      return (
        <div
          style={{
            ...box,
            ...common(layer),
            opacity: s,
            background: `repeating-conic-gradient(from 0deg at ${ax * 100}% ${ay * 100}%, ${layer.color ?? '#fff'} 0deg 0.6deg, transparent 0.6deg 4deg)`,
            WebkitMaskImage: `radial-gradient(circle at ${ax * 100}% ${ay * 100}%, transparent ${layer.size ?? 30}%, black 75%)`,
            maskImage: `radial-gradient(circle at ${ax * 100}% ${ay * 100}%, transparent ${layer.size ?? 30}%, black 75%)`,
          }}
        />
      );
    case 'grain':
      return (
        <svg style={{ ...box, mixBlendMode: 'overlay', ...common(layer), opacity: s }} width={CANVAS.w} height={CANVAS.h}>
          <filter id="thumb-grain">
            <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={7} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#thumb-grain)" />
        </svg>
      );
  }
};

const ANCHOR: Record<NonNullable<LogoLayer['anchor']>, (m: number) => React.CSSProperties> = {
  tl: m => ({ left: m, top: m }),
  tc: m => ({ left: '50%', top: m, transform: 'translateX(-50%)' }),
  tr: m => ({ right: m, top: m }),
  ml: m => ({ left: m, top: '50%', transform: 'translateY(-50%)' }),
  mc: () => ({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }),
  mr: m => ({ right: m, top: '50%', transform: 'translateY(-50%)' }),
  bl: m => ({ left: m, bottom: m }),
  bc: m => ({ left: '50%', bottom: m, transform: 'translateX(-50%)' }),
  br: m => ({ right: m, bottom: m }),
};

export const Logo: React.FC<{ job: string; layer: LogoLayer }> = ({ job, layer }) => {
  const m = layer.margin ?? 34;
  const place: React.CSSProperties = layer.at ? { left: layer.at[0], top: layer.at[1], transform: 'translate(-50%, -50%)' } : ANCHOR[layer.anchor ?? 'tl'](m);
  const plate = layer.plate;
  const pad = plate?.pad ?? 14;
  return (
    <div style={{ position: 'absolute', ...place, opacity: layer.opacity, mixBlendMode: layer.blend as React.CSSProperties['mixBlendMode'] }}>
      <div
        style={{
          padding: plate ? pad : 0,
          background: plate?.color,
          borderRadius: plate?.shape === 'circle' ? '50%' : plate?.shape === 'pill' ? 999 : 8,
          transform: layer.rotate ? `rotate(${layer.rotate}deg)` : undefined,
          filter: [shadowFilter(layer.shadow), glowFilter(layer.glow)].filter(Boolean).join(' ') || undefined,
          display: 'flex',
        }}
      >
        <Img src={src(job, layer.src)} style={{ width: layer.width ?? 150, height: 'auto', display: 'block' }} />
      </div>
    </div>
  );
};
