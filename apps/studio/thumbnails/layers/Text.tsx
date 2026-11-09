/**
 * Headlines. Each line measures itself (canvas, with the job's fonts loaded) and is sized to its
 * box: `each` makes every line fill the width, `block` uses the largest size all lines fit, `none`
 * takes `size`. The stack is then fitted and centred by its ink (the letters' real bounds, not the
 * font's line box), so every font sits the same way, and `attach`ed lines (kickers, subs,
 * overlays) sit against those bounds. Stroke, extrusion and shadow are drawn on a copy behind the
 * letters, so gradient and texture fills stay clean on top.
 */
import React, { useId } from 'react';
import { useFull } from '../canvas.tsx';
import { CANVAS, type Box, type Layer, type Line, type TextLayer } from '../spec.ts';
import { glowFilter, safeId } from './filters.tsx';

type Seg = { t: string; accent: boolean };
type Item = { segs: Seg[]; text: string; font: string; weight: number; italic: boolean; color?: string; scale: number; fill?: string };
/** Metrics at 100 px: advance width (without the trailing letter spacing), font ascent/descent, ink ascent/descent. */
type Metrics = { w: number; fa: number; fd: number; ia: number; id: number };

let ctx: CanvasRenderingContext2D | null = null;
const measure = (it: Item, tracking: number): Metrics => {
  ctx ??= document.createElement('canvas').getContext('2d')!;
  ctx.font = `${it.italic ? 'italic ' : ''}${it.weight} 100px "${it.font}"`;
  ctx.letterSpacing = `${tracking * 100}px`;
  const m = ctx.measureText(it.text);
  return { w: Math.max(1, m.width - tracking * 100), fa: m.fontBoundingBoxAscent, fd: m.fontBoundingBoxDescent, ia: m.actualBoundingBoxAscent, id: m.actualBoundingBoxDescent };
};

const parse = (line: string, upper: boolean): Seg[] =>
  line
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map(s => {
      const accent = s.startsWith('*') && s.endsWith('*');
      const t = accent ? s.slice(1, -1) : s;
      return { t: upper ? t.toUpperCase() : t, accent };
    });

const items = (layer: TextLayer): Item[] => {
  const lines: Line[] = typeof layer.lines === 'string' ? layer.lines.split('\n') : layer.lines;
  const upper = layer.upper ?? true;
  return lines.map(l => {
    const o = typeof l === 'string' ? { t: l } : l;
    const segs = parse(o.t, upper);
    return {
      segs,
      text: segs.map(s => s.t).join(''),
      font: o.font ?? layer.font ?? 'sans-serif',
      weight: o.weight ?? layer.weight ?? 400,
      italic: layer.italic ?? false,
      color: o.color,
      scale: o.scale ?? 1,
      fill: o.fill,
    };
  });
};

/** One laid-out line: its CSS line box, font size, letter spacing, text width and ink top/bottom. */
export type LineBox = { x: number; y: number; w: number; h: number; size: number; textW: number; spacing: number; inkTop: number; inkBottom: number };
export type TextLayout = { items: Item[]; boxes: LineBox[]; inkTop: number; inkBottom: number };

/** Sizes and positions of each line; `layers` resolves `attach` targets; `full` is the canvas. */
export const layout = (layer: TextLayer, layers: Layer[] = [], depth = 0, full: Box = [0, 0, CANVAS.w, CANVAS.h]): TextLayout => {
  const target = layer.attach && depth < 4 ? (layers.find(l => l.type === 'text' && l.id === layer.attach!.to) as TextLayer | undefined) : undefined;
  const targetLayout = target ? layout(target, layers, depth + 1, full) : undefined;
  const its = items(layer);
  const [bx, by, bw, bh] = layer.box ?? target?.box ?? full;
  const tracking = layer.tracking ?? 0;
  const gapEm = layer.gap ?? 0.15;
  const fit = layer.spread ? 'none' : (layer.fit ?? 'each');
  const ms = its.map(it => measure(it, tracking));
  const blockSize = Math.min(...ms.map(m => (bw / m.w) * 100));
  let sizes = its.map((it, i) => {
    const s = fit === 'each' ? (bw / ms[i].w) * 100 : fit === 'block' ? blockSize : (layer.size ?? 100);
    const capped = fit !== 'none' && layer.size ? Math.min(s, layer.size) : s;
    return capped * it.scale;
  });
  // stack the lines by their ink (each line's letters `gap` below the previous line's), from y = 0
  const stack = (sz: number[]) => {
    let inkY = 0;
    return sz.map((size, i) => {
      const h = size * 1.2;
      const k = size / 100;
      if (i > 0) inkY += gapEm * Math.min(size, sz[i - 1]);
      // where the letters sit inside a CSS line box of height h
      const inkTopInBox = (h - (ms[i].fa + ms[i].fd) * k) / 2 + (ms[i].fa - ms[i].ia) * k;
      const line = { y: inkY - inkTopInBox, h, inkTop: inkY, inkBottom: inkY + (ms[i].ia + ms[i].id) * k };
      inkY = line.inkBottom;
      return line;
    });
  };
  let lines = stack(sizes);
  const inkH = () => lines[lines.length - 1].inkBottom - lines[0].inkTop;
  if (!target && inkH() > bh) {
    sizes = sizes.map(s => (s * bh) / inkH());
    lines = stack(sizes);
  }
  const top0 = lines[0].inkTop;
  const bottom0 = lines[lines.length - 1].inkBottom;
  let dy: number;
  if (target && targetLayout) {
    const gap = layer.attach!.gap ?? Math.max(8, sizes[0] * 0.45);
    const t = targetLayout.boxes;
    if (layer.attach!.side === 'above') dy = targetLayout.inkTop - gap - bottom0;
    else if (layer.attach!.side === 'between' && t.length > 1) dy = (t[0].inkBottom + t[1].inkTop) / 2 - (top0 + bottom0) / 2;
    else dy = targetLayout.inkBottom + gap - top0;
  } else dy = layer.valign === 'top' ? by - top0 : layer.valign === 'bottom' ? by + bh - bottom0 : by + (bh - (bottom0 - top0)) / 2 - top0;

  const boxes: LineBox[] = sizes.map((size, i) => {
    const textW = (ms[i].w * size) / 100;
    const chars = [...its[i].text].length;
    // spread: letter spacing that makes the line exactly as wide as the box
    const spacing = layer.spread && chars > 1 ? (bw - textW) / (chars - 1) + tracking * size : tracking * size;
    return { x: bx, y: lines[i].y + dy, w: bw, h: lines[i].h, size, textW: layer.spread ? bw : textW, spacing, inkTop: lines[i].inkTop + dy, inkBottom: lines[i].inkBottom + dy };
  });
  return { items: its, boxes, inkTop: top0 + dy, inkBottom: bottom0 + dy };
};

const extrudeShadow = (e: NonNullable<TextLayer['extrude']>, size: number) => {
  const a = ((e.angle ?? 45) * Math.PI) / 180;
  const depth = (e.depth * size) / 200;
  const steps = Math.ceil(depth);
  return Array.from({ length: steps }, (_, i) => `${(Math.cos(a) * (i + 1) * depth) / steps}px ${(Math.sin(a) * (i + 1) * depth) / steps}px 0 ${e.color}`);
};

export const Text: React.FC<{ layer: TextLayer; layers: Layer[]; ready: boolean }> = ({ layer, layers, ready }) => {
  const id = safeId(useId());
  const full = useFull();
  if (!ready) return null;
  const { items: its, boxes, inkTop, inkBottom } = layout(layer, layers, 0, full);
  const cx = boxes[0].x + boxes[0].w / 2;
  const cy = (inkTop + inkBottom) / 2;
  const align = layer.align ?? 'center';
  const plate = layer.plate;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: layer.opacity,
        mixBlendMode: layer.blend as React.CSSProperties['mixBlendMode'],
        transform: [layer.rotate && `rotate(${layer.rotate}deg)`, layer.skew && `skewX(${layer.skew}deg)`].filter(Boolean).join(' ') || undefined,
        transformOrigin: `${cx}px ${cy}px`,
        filter: glowFilter(layer.glow) || undefined,
      }}
    >
      {its.map((it, i) => {
        const b = boxes[i];
        const font: React.CSSProperties = {
          fontFamily: `"${it.font}"`,
          fontWeight: it.weight,
          fontStyle: it.italic ? 'italic' : 'normal',
          fontSize: b.size,
          letterSpacing: b.spacing,
          lineHeight: `${b.h}px`,
          whiteSpace: 'pre',
        };
        // cancel the spacing after the last letter, so centred and right-aligned lines sit true
        const trail: React.CSSProperties = { marginRight: -b.spacing };
        if (plate?.knockout) return <Knockout key={i} id={`${id}-${i}`} layer={layer} item={it} box={b} align={align} />;
        const shadows = [...(layer.extrude ? extrudeShadow(layer.extrude, b.size) : []), layer.shadow && `${layer.shadow.x ?? 0}px ${layer.shadow.y ?? 6}px ${layer.shadow.blur ?? 16}px ${layer.shadow.color ?? 'rgba(0,0,0,0.6)'}`].filter(
          Boolean,
        );
        const fill = it.fill ?? layer.fill;
        const color = it.color ?? layer.color ?? '#fff';
        const front: React.CSSProperties = fill ? { backgroundImage: fill, backgroundSize: '100% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { color };
        return (
          <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, textAlign: align, ...font }}>
            <span style={{ position: 'relative', display: 'inline-block', ...trail }}>
              {plate && (
                <span
                  style={{
                    position: 'absolute',
                    left: -(plate.padX ?? 20),
                    right: -(plate.padX ?? 20) + b.spacing,
                    top: b.inkTop - b.y - (plate.padY ?? 6),
                    height: b.inkBottom - b.inkTop + 2 * (plate.padY ?? 6),
                    background: plate.background ?? plate.color ?? '#000',
                    borderRadius: plate.radius,
                    transform: plate.skew ? `skewX(${plate.skew}deg)` : undefined,
                  }}
                />
              )}
              {(layer.stroke || shadows.length > 0) && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    color: layer.stroke?.color ?? 'transparent',
                    WebkitTextStroke: layer.stroke ? `${layer.stroke.width * 2}px ${layer.stroke.color}` : undefined,
                    textShadow: shadows.join(', ') || undefined,
                  }}
                >
                  {it.text}
                </span>
              )}
              <span style={{ position: 'relative', ...front }}>
                {it.segs.map((s, j) => (
                  <span key={j} style={s.accent ? { color: layer.accent ?? '#ff2a2a', WebkitTextFillColor: layer.accent ?? '#ff2a2a' } : undefined}>
                    {s.t}
                  </span>
                ))}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** The plate with the words cut out of it (SVG mask), so the picture shows through the letters. */
const Knockout: React.FC<{ id: string; layer: TextLayer; item: Item; box: LineBox; align: string }> = ({ id, layer, item, box, align }) => {
  const plate = layer.plate!;
  const padX = plate.padX ?? 20;
  const padY = plate.padY ?? 6;
  const w = box.textW + padX * 2;
  const h = box.inkBottom - box.inkTop + padY * 2;
  const left = align === 'left' ? box.x - padX : align === 'right' ? box.x + box.w - box.textW - padX : box.x + (box.w - box.textW) / 2 - padX;
  // the baseline sits where the ink's bottom is (caps); descenders are rare in knockout words
  return (
    <svg style={{ position: 'absolute', left, top: box.inkTop - padY, overflow: 'visible', transform: plate.skew ? `skewX(${plate.skew}deg)` : undefined }} width={w} height={h}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
          <rect width={w} height={h} fill="white" rx={plate.radius} />
          <text
            x={padX}
            y={h - padY}
            fill="black"
            style={{ fontFamily: `"${item.font}"`, fontWeight: item.weight, fontStyle: item.italic ? 'italic' : 'normal', fontSize: box.size, letterSpacing: box.spacing }}
          >
            {item.text}
          </text>
        </mask>
      </defs>
      <rect width={w} height={h} fill={plate.color ?? '#000'} rx={plate.radius} mask={`url(#${id})`} />
    </svg>
  );
};
