/**
 * The review sheet: every variant of a job, grouped by style, each tile labelled with its ID (A1,
 * B3, …) so the user can pick one (or three for YouTube's A/B test). The small sheet shows them at
 * the size they appear in YouTube's feed or a streaming app's list, to judge legibility.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Thumbnail } from './Thumbnail.tsx';
import { CANVAS, type FontSpec, type ResolvedVariant } from './spec.ts';

export type SheetStyle = { id: string; name: string; idea?: string; variants: ResolvedVariant[] };
export type SheetProps = {
  job: string;
  title?: string;
  styles: SheetStyle[];
  fonts: FontSpec[];
  tile: number;
  /** the job's canvas */
  size?: [number, number];
  /** tiles per row before wrapping */
  perRow?: number;
  /** the line after the title */
  hint?: string;
};

const PAD = 40;
const GAP = 28;
const HEAD = 90;

const layoutOf = (styles: SheetStyle[], tile: number, size: [number, number], perRow: number) => {
  // labels shrink with the tile, but not below a readable size
  const k = Math.max(tile / 560, 0.6);
  const most = Math.max(1, ...styles.map(s => s.variants.length));
  const cols = Math.min(most, perRow);
  const th = (tile * size[1]) / size[0];
  const cellH = th + 40 * k + GAP / 2;
  const heights = styles.map(s => 50 * k + Math.ceil(Math.max(1, s.variants.length) / cols) * cellH);
  return { k, cols, th, cellH, heights };
};

export const sheetSize = (styles: SheetStyle[], tile: number, size: [number, number] = [CANVAS.w, CANVAS.h], perRow = 99) => {
  const { cols, heights } = layoutOf(styles, tile, size, perRow);
  const w = Math.max(PAD * 2 + cols * tile + (cols - 1) * GAP, 900);
  const h = HEAD + heights.reduce((a, x) => a + x + GAP, 0) + PAD;
  return { w: Math.round(w / 2) * 2, h: Math.round(h / 2) * 2 };
};

export const Sheet: React.FC<SheetProps> = ({ job, title, styles, fonts, tile, size = [CANVAS.w, CANVAS.h], perRow = 99, hint = 'pick 1, or 3 for an A/B test' }) => {
  const { k, cols, th, cellH, heights } = layoutOf(styles, tile, size, perRow);
  const headK = Math.max(k, 0.75);
  const s = tile / size[0];
  const tops = heights.map((_, i) => HEAD + heights.slice(0, i).reduce((a, x) => a + x + GAP, 0));
  return (
    <AbsoluteFill style={{ background: '#121214', fontFamily: 'Helvetica, Arial, sans-serif', color: '#eee' }}>
      <div style={{ position: 'absolute', left: PAD, top: 26, fontSize: 34 * headK, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {title ?? job} <span style={{ color: '#888', fontWeight: 400, fontSize: 24 * headK }}>· {job} · {hint}</span>
      </div>
      {styles.map((style, r) => (
        <div key={style.id} style={{ position: 'absolute', left: PAD, top: tops[r] }}>
          <div style={{ fontSize: 26 * k, fontWeight: 700, height: 44 * k, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#ffcc00' }}>{style.id}</span> {style.name}
            {style.idea && <span style={{ color: '#999', fontWeight: 400 }}> · {style.idea}</span>}
          </div>
          {style.variants.map((v, i) => (
            <div key={v.id} style={{ position: 'absolute', left: (i % cols) * (tile + GAP), top: 50 * k + Math.floor(i / cols) * cellH }}>
              <div style={{ width: tile, height: th, position: 'relative', overflow: 'hidden', borderRadius: 6 }}>
                <div style={{ width: size[0], height: size[1], position: 'absolute', transform: `scale(${s})`, transformOrigin: '0 0' }}>
                  <Thumbnail job={job} variant={v} fonts={fonts} size={size} />
                </div>
              </div>
              {/* the ID sits under the tile, so it never hides a corner logo */}
              <div style={{ width: tile, marginTop: 6 * k, display: 'flex', alignItems: 'center', gap: 10 * k, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{ background: '#ffcc00', color: '#000', fontWeight: 800, fontSize: 24 * k, padding: `0 ${8 * k}px`, borderRadius: 4 }}>{v.id}</span>
                <span style={{ fontSize: 18 * k, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.note ?? ''}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </AbsoluteFill>
  );
};
