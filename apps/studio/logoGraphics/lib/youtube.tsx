/** YouTube channel asset sizes, and a backdrop helper to fit a 1920×1080 scene into them. */
import React from 'react';

export const PROFILE = 800; // shown as a circle
export const BANNER = { w: 2560, h: 1440, safe: { w: 1546, h: 423 } }; // everything that matters in the safe area
export const WATERMARK = 150; // transparent

/** A 1920×1080 atmosphere scaled to cover another frame size and centred. */
export const Backdrop: React.FC<{ w: number; h: number; children: React.ReactNode }> = ({ w, h, children }) => {
  const s = Math.max(w / 1920, h / 1080);
  return (
    <div style={{ position: 'absolute', left: (w - 1920 * s) / 2, top: (h - 1080 * s) / 2, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
  );
};

/** The safe area's outline, for a guides still. */
export const BannerSafeArea: React.FC<{ show?: boolean; color?: string }> = ({ show, color = '40,120,220' }) =>
  show ? (
    <div
      style={{
        position: 'absolute',
        left: (BANNER.w - BANNER.safe.w) / 2,
        top: (BANNER.h - BANNER.safe.h) / 2,
        width: BANNER.safe.w,
        height: BANNER.safe.h,
        border: `4px dashed rgba(${color},0.9)`,
      }}
    />
  ) : null;
