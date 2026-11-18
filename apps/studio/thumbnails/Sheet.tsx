/**
 * The review sheet: every variant of a job, grouped by style, each tile tagged with its ID (A1,
 * B3, …) at its top-right corner, so the user can pick one (or three for YouTube's A/B test) in the
 * chat the sheet is sent to. The small sheet shows them at
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
  // a board (one variant a style) flows its styles side by side, so the whole board reads in one look in the chat
  const board = most === 1 && styles.length > 2;
  const blocks = board ? Math.max(1, Math.min(styles.length, perRow, Math.floor(1240 / (tile + GAP)))) : 1;
  const rows = Math.ceil(styles.length / blocks);
  const rowH = Array.from({ length: rows }, (_, r) => Math.max(...heights.slice(r * blocks, (r + 1) * blocks)));
  const place = styles.map((_, i) => {
    const r = Math.floor(i / blocks);
    return { left: PAD + (i % blocks) * (tile + GAP), top: HEAD + rowH.slice(0, r).reduce((a, x) => a + x + GAP, 0) };
  });
  const w = PAD * 2 + Math.max(cols, blocks) * tile + (Math.max(cols, blocks) - 1) * GAP;
  const h = HEAD + rowH.reduce((a, x) => a + x + GAP, 0) + PAD;
  return { k, cols, th, cellH, place, board, w, h };
};

export const sheetSize = (styles: SheetStyle[], tile: number, size: [number, number] = [CANVAS.w, CANVAS.h], perRow = 99) => {
  const { w, h } = layoutOf(styles, tile, size, perRow);
  return { w: Math.round(Math.max(w, 900) / 2) * 2, h: Math.round(h / 2) * 2 };
};

export const Sheet: React.FC<SheetProps> = ({ job, title, styles, fonts, tile, size = [CANVAS.w, CANVAS.h], perRow = 99, hint = 'pick 1, or 3 for an A/B test' }) => {
  const { k, cols, th, cellH, place, board } = layoutOf(styles, tile, size, perRow);
  const headK = Math.max(k, 0.75);
  const s = tile / size[0];
  return (
    <AbsoluteFill style={{ background: '#121214', fontFamily: 'Helvetica, Arial, sans-serif', color: '#eee' }}>
      <div style={{ position: 'absolute', left: PAD, top: 26, fontSize: 34 * headK, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {title ?? job} <span style={{ color: '#888', fontWeight: 400, fontSize: 24 * headK }}>· {job} · {hint}</span>
      </div>
      {styles.map((style, r) => (
        <div key={style.id} style={{ position: 'absolute', left: place[r].left, top: place[r].top }}>
          <div style={{ fontSize: 26 * k, fontWeight: 700, height: 44 * k, whiteSpace: 'nowrap', ...(board && { width: tile, overflow: 'hidden', textOverflow: 'ellipsis' }) }}>
            <span style={{ color: '#ffcc00' }}>{style.id}</span> {style.name}
            {style.idea && <span style={{ color: '#999', fontWeight: 400 }}> · {style.idea}</span>}
          </div>
          {style.variants.map((v, i) => (
            <div key={v.id} style={{ position: 'absolute', left: (i % cols) * (tile + GAP), top: 50 * k + Math.floor(i / cols) * cellH }}>
              <div style={{ width: tile, height: th, position: 'relative', overflow: 'hidden', borderRadius: 6 }}>
                <div style={{ width: size[0], height: size[1], position: 'absolute', transform: `scale(${s})`, transformOrigin: '0 0' }}>
                  <Thumbnail job={job} variant={v} fonts={fonts} size={size} />
                </div>
                {/* the ID tagged on the tile's top-right corner, so a pick in chat names it at a glance (a corner logo there shows in the single render) */}
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#ffcc00',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: 26 * k,
                    lineHeight: 1,
                    padding: `${6 * k}px ${10 * k}px`,
                    borderBottomLeftRadius: 8,
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.55)',
                  }}
                >
                  {v.id}
                </span>
              </div>
              <div style={{ width: tile, marginTop: 6 * k, display: 'flex', alignItems: 'center', gap: 10 * k, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{ fontSize: 18 * k, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.note ?? ''}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </AbsoluteFill>
  );
};
