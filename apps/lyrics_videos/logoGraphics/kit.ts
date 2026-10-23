/**
 * The contract for brand graphics. Each brand's source lives in brands/<brand>/graphics/
 * (gitignored, next to its exported kit); its index.tsx default-exports defineLogo({ id, ... }).
 * Every scene becomes the composition `<logo id>-<scene id>`, in a Studio folder named after the
 * logo. This folder (logoGraphics/) is the shared engine: Studio entry, this contract, lib/ and tools/.
 */
import type React from 'react';

/** Props a scene receives. `guides` draws layout guides (e.g. where YouTube end cards go) for previews only. */
export type SceneProps = { guides?: boolean };

export type LogoScene = {
  /** kebab-case; the composition id is `<logo id>-<scene id>` */
  id: string;
  component: React.FC<SceneProps>;
  seconds: number;
  /** no background: renders to ProRes 4444 with alpha (plus a preview on black) */
  transparent?: boolean;
  /** Studio sub-folder, e.g. 'explorations' */
  folder?: string;
  /** frame size when it differs from the logo's (YouTube banner, profile picture, a hi-res still) */
  width?: number;
  height?: number;
};

export type LogoGraphic = {
  /** must equal the folder name */
  id: string;
  fps: number;
  width: number;
  height: number;
  /** backdrop for previews and stills (default black), e.g. the paper a logo is printed on */
  preview?: string;
  scenes: LogoScene[];
};

export const defineLogo = (logo: LogoGraphic): LogoGraphic => logo;

/** Props of every logo composition. `background` paints a backdrop; previews use `preview` (the logo's). */
export type LogoCompositionProps = {
  background?: string;
  transparent?: boolean;
  guides?: boolean;
  preview?: string;
  /** the brand's folder under brands/, and the scene's id (the scripts use them to file outputs) */
  brand?: string;
  scene?: string;
};
