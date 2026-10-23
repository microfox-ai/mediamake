/**
 * The contract for logo graphics: small, reusable brand animations, one folder per logo.
 * A logo folder holds the animated lockup as a component (transparent, no background) and,
 * later, its intro and ending scenes built around it.
 *
 * logoGraphics/<slug>/index.tsx default-exports defineLogo({ id: '<slug>', ... }).
 * Each scene becomes the composition `<slug>-<scene id>`, in a Studio folder named after the logo.
 */
import type React from 'react';

export type LogoScene = {
  /** kebab-case; the composition id is `<logo id>-<scene id>` */
  id: string;
  component: React.FC;
  seconds: number;
  /** no background: renders to ProRes 4444 with alpha (plus a preview on black) */
  transparent?: boolean;
  /** Studio sub-folder, e.g. 'explorations' */
  folder?: string;
};

export type LogoGraphic = {
  /** must equal the folder name */
  id: string;
  fps: number;
  width: number;
  height: number;
  scenes: LogoScene[];
};

export const defineLogo = (logo: LogoGraphic): LogoGraphic => logo;

/** Props of every logo composition. `background` paints a backdrop for previews. */
export type LogoCompositionProps = { background?: string; transparent?: boolean };
