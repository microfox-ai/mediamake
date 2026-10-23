/**
 * Placing a brand's logo component in a scene by the lockup's centre and visible width, animating
 * from `from` seconds or held at its rest frame with `still`. The component fills its box and
 * keeps the aspect of `view` (its viewBox); `box` is the visible lockup inside it.
 */
import React from 'react';
import { Freeze, Sequence, useVideoConfig } from 'remotion';

type Rect = { x: number; y: number; w: number; h: number };
type Box = { x0: number; y0: number; x1: number; y1: number };

export const createPlacedLogo = <P extends object>({ Logo, view, box, stillAt }: { Logo: React.FC<P>; view: Rect; box: Box; stillAt: number }) => {
  const LOCKUP = { w: box.x1 - box.x0, h: box.y1 - box.y0 };
  /** Height of the lockup when shown `width` px wide. */
  const lockupH = (width: number) => (LOCKUP.h * width) / LOCKUP.w;
  /** Frame position of a point of the logo (in its own units) when placed at (cx, cy), `width` wide. */
  const logoPoint = (cx: number, cy: number, width: number, [sx, sy]: [number, number]): [number, number] => {
    const s = width / LOCKUP.w;
    return [cx + (sx - (box.x0 + box.x1) / 2) * s, cy + (sy - (box.y0 + box.y1) / 2) * s];
  };
  const PlacedLogo: React.FC<{ cx: number; cy: number; width: number; from?: number; still?: boolean; style?: React.CSSProperties; logoProps?: P }> = ({
    cx,
    cy,
    width,
    from = 0,
    still,
    style,
    logoProps,
  }) => {
    const { fps } = useVideoConfig();
    const s = width / LOCKUP.w;
    const w = view.w * s;
    const h = view.h * s;
    // the lockup's centre, not the viewBox's, sits on (cx, cy)
    const ox = (view.x + view.w / 2 - (box.x0 + box.x1) / 2) * s;
    const oy = (view.y + view.h / 2 - (box.y0 + box.y1) / 2) * s;
    const logo = <Logo {...((logoProps ?? {}) as P)} />;
    return (
      <Sequence from={still ? 0 : Math.round(from * fps)} layout="none">
        <div style={{ position: 'absolute', left: cx - w / 2 + ox, top: cy - h / 2 + oy, width: w, height: h, ...style }}>
          {still ? <Freeze frame={Math.round(stillAt * fps)}>{logo}</Freeze> : logo}
        </div>
      </Sequence>
    );
  };
  return { LOCKUP, lockupH, logoPoint, PlacedLogo };
};
