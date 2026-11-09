/** Preview-only outlines of where YouTube end-screen elements go (scenes draw them when `guides` is on). */
import React from 'react';
import { AbsoluteFill } from 'remotion';

export type Slot = { kind: 'video' | 'subscribe'; x: number; y: number; w: number; h?: number };

/** A YouTube end-screen video element is about a third of the player wide, 16:9. */
export const VIDEO_W = 620;
export const VIDEO_H = (VIDEO_W * 9) / 16;
export const SUB_D = 210;
/** Top of the card row: everything above it is the logo's. */
export const CARDS_Y = 600;

/** `color` as "r,g,b": a light blue suits dark scenes, a deeper blue light ones. */
export const Guides: React.FC<{ show?: boolean; slots: Slot[]; color?: string }> = ({ show, slots, color = '40,120,220' }) =>
  show ? (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {slots.map((s, i) => {
        const h = s.h ?? (s.kind === 'video' ? (s.w * 9) / 16 : s.w);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.w,
              height: h,
              border: `3px dashed rgba(${color},0.9)`,
              borderRadius: s.kind === 'subscribe' ? '50%' : 8,
              color: `rgba(${color},0.95)`,
              background: `rgba(${color},0.06)`,
              font: '600 22px sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {s.kind === 'video' ? 'VIDEO' : 'SUBSCRIBE'}
          </div>
        );
      })}
    </AbsoluteFill>
  ) : null;
