/** SVG filters and CSS filter strings the layers share (outlines, duotone, glows, shadows). */
import React from 'react';
import type { Color, Glow, Grade, Shadow } from '../spec.ts';

/** A CSS-safe id from React's useId. */
export const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

export const gradeFilter = (g?: Grade) =>
  g
    ? [
        g.brightness !== undefined && `brightness(${g.brightness})`,
        g.contrast !== undefined && `contrast(${g.contrast})`,
        g.saturate !== undefined && `saturate(${g.saturate})`,
        g.hue !== undefined && `hue-rotate(${g.hue}deg)`,
        g.grayscale !== undefined && `grayscale(${g.grayscale})`,
        g.sepia !== undefined && `sepia(${g.sepia})`,
        g.blur !== undefined && `blur(${g.blur}px)`,
      ]
        .filter(Boolean)
        .join(' ')
    : '';

export const glowFilter = (g?: Glow) => (g ? `drop-shadow(0 0 ${(g.size ?? 24) / 2}px ${g.color}) drop-shadow(0 0 ${g.size ?? 24}px ${g.color})` : '');

export const shadowFilter = (s?: Shadow) => (s ? `drop-shadow(${s.x ?? 0}px ${s.y ?? 6}px ${s.blur ?? 16}px ${s.color ?? 'rgba(0,0,0,0.6)'})` : '');

const rgb = (c: Color) => {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map(x => x + x).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3));
};

/** Luminance mapped from the dark colour to the light one. */
export const DuotoneFilter: React.FC<{ id: string; colors: [Color, Color] }> = ({ id, colors: [a, b] }) => {
  const [ra, ga, ba] = rgb(a);
  const [rb, gb, bb] = rgb(b);
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
      <feComponentTransfer>
        <feFuncR type="table" tableValues={`${ra} ${rb}`} />
        <feFuncG type="table" tableValues={`${ga} ${gb}`} />
        <feFuncB type="table" tableValues={`${ba} ${bb}`} />
      </feComponentTransfer>
    </filter>
  );
};

/** A solid outline around the opaque pixels (sticker edge). */
export const OutlineFilter: React.FC<{ id: string; width: number; color: Color }> = ({ id, width, color }) => (
  <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius={width} result="grown" />
    <feFlood floodColor={color} />
    <feComposite in2="grown" operator="in" result="edge" />
    <feMerge>
      <feMergeNode in="edge" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

export const Defs: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <defs>{children}</defs>
  </svg>
);
