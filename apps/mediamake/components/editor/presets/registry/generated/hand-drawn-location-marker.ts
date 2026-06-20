/**
 * Hand-Drawn Location Marker Preset
 *
 * An organic, hand-drawn style location marker that appears as if sketched on a treasure map.
 * Features a wobbly pin that draws itself, ink-wash ripple rings, pencil-line topographic
 * contours, handwritten coordinates, and cursive location name that reveals with pen-stroke effect.
 *
 * Visual Elements:
 * - Textured paper background with subtle noise overlay
 * - Topographic contours that sketch themselves sequentially
 * - Watercolor-style ripple rings that scale and fade
 * - Location pin with stroke-dasharray draw-on animation and wobble
 * - Handwritten coordinate numbers with tumbling rotation
 * - Cursive location name with clip-path pen-stroke reveal
 *
 * Technical Approach:
 * - Uses SVG paths for hand-drawn aesthetics with stroke-dasharray animation
 * - Apply subtle displacement filters for sketchy texture
 * - Earthy color palette: sepia, warm grays, cream background
 * - Slower timing (1.5-2s) with ease-in-out curves for organic feel
 * - CSS filters for grain/texture effects
 *
 * Use Cases:
 * - Travel content and location reveals
 * - Treasure map style animations
 * - Organic, hand-crafted visual style
 * - Vintage map aesthetics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for preset parameters
const presetParams = z.object({
  locationName: z
    .string()
    .describe('Name of the location to display in cursive'),
  coordinates: z
    .string()
    .describe('Coordinates to display (e.g., "37.7749° N, 122.4194° W")'),
  duration: z
    .number()
    .min(3)
    .max(30)
    .default(5)
    .describe('Duration of the preset in seconds'),
  backgroundColor: z
    .string()
    .default('#FAF5EF')
    .optional()
    .describe('Background color (cream/paper tone)'),
  primaryColor: z
    .string()
    .default('#704214')
    .optional()
    .describe('Primary color for pin and text (dark sepia)'),
  accentColor: z
    .string()
    .default('#B8956A')
    .optional()
    .describe('Accent color for contours (light sepia)'),
  locationFont: z
    .string()
    .default('DancingScript:600')
    .optional()
    .describe('Font for location name (cursive style)'),
  coordinatesFont: z
    .string()
    .default('Caveat:500')
    .optional()
    .describe('Font for coordinates (handwritten style)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    locationName,
    coordinates,
    duration,
    backgroundColor = '#FAF5EF',
    primaryColor = '#704214',
    accentColor = '#B8956A',
    locationFont = 'DancingScript:600',
    coordinatesFont = 'Caveat:500',
  } = params;

  // Parse font strings
  const parseFont = (fontString: string) => {
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] || '400',
    };
  };

  const locationFontParsed = parseFont(locationFont);
  const coordinatesFontParsed = parseFont(coordinatesFont);

  // === CHILD COMPONENTS ===

  // Noise overlay for paper texture
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute inset-0 opacity-20 pointer-events-none' style='background-image: url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noise\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.9\\" numOctaves=\\"4\\" stitchTiles=\\"stitch\\"/%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noise)\\"/%3E%3C/svg%3E"); mix-blend-mode: multiply;'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Topographic contours (3 layers)
  const contour1: RenderableComponentData = {
    id: 'contour-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width='100%' height='100%' viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg' class='absolute inset-0'><defs><filter id='pencil-texture'><feTurbulence baseFrequency='0.05' numOctaves='3' seed='1'/><feDisplacementMap in='SourceGraphic' scale='1'/></filter></defs><path d='M 400 250 Q 450 260 480 290 T 520 350 Q 530 380 520 410 T 480 460 Q 450 480 400 490 T 320 480 Q 280 460 260 420 T 250 350 Q 255 300 280 270 T 340 250 Q 370 245 400 250 Z' fill='none' stroke='${primaryColor}' stroke-width='1.5' stroke-linecap='round' stroke-dasharray='1130' stroke-dashoffset='1130' opacity='0.6' style='filter: url(#pencil-texture);' /></svg>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'contour-1-draw',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['contour-1'],
          ranges: [
            { key: 'strokeDashoffset', val: 1130, prog: 0 },
            { key: 'strokeDashoffset', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const contour2: RenderableComponentData = {
    id: 'contour-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width='100%' height='100%' viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg' class='absolute inset-0'><defs><filter id='pencil-texture-2'><feTurbulence baseFrequency='0.05' numOctaves='3' seed='2'/><feDisplacementMap in='SourceGraphic' scale='1.2'/></filter></defs><path d='M 400 200 Q 470 210 520 250 T 580 340 Q 590 390 580 440 T 520 530 Q 470 560 400 570 T 280 530 Q 220 490 200 430 T 190 340 Q 195 270 220 230 T 280 200 Q 340 190 400 200 Z' fill='none' stroke='${accentColor}' stroke-width='1.5' stroke-linecap='round' stroke-dasharray='1400' stroke-dashoffset='1400' opacity='0.5' style='filter: url(#pencil-texture-2);' /></svg>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'contour-2-draw',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.3,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['contour-2'],
          ranges: [
            { key: 'strokeDashoffset', val: 1400, prog: 0 },
            { key: 'strokeDashoffset', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const contour3: RenderableComponentData = {
    id: 'contour-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width='100%' height='100%' viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg' class='absolute inset-0'><defs><filter id='pencil-texture-3'><feTurbulence baseFrequency='0.05' numOctaves='3' seed='3'/><feDisplacementMap in='SourceGraphic' scale='1.5'/></filter></defs><path d='M 400 150 Q 490 165 560 230 T 640 360 Q 650 430 630 500 T 560 600 Q 490 640 400 655 T 240 600 Q 170 560 150 490 T 140 360 Q 148 270 180 220 T 240 160 Q 310 145 400 150 Z' fill='none' stroke='${accentColor}' stroke-width='1.5' stroke-linecap='round' stroke-dasharray='1700' stroke-dashoffset='1700' opacity='0.4' style='filter: url(#pencil-texture-3);' /></svg>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'contour-3-draw',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.6,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['contour-3'],
          ranges: [
            { key: 'strokeDashoffset', val: 1700, prog: 0 },
            { key: 'strokeDashoffset', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Ripple rings (3 layers with watercolor effect)
  const ripple1: RenderableComponentData = {
    id: 'ripple-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute rounded-full bg-amber-800/20 blur-sm' style='width: 80px; height: 80px; left: 50%; top: 50%; transform: translate(-50%, -50%);'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'ripple-1-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0.5,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['ripple-1'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      },
    ],
  };

  const ripple2: RenderableComponentData = {
    id: 'ripple-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute rounded-full bg-amber-700/15 blur-sm' style='width: 120px; height: 120px; left: 50%; top: 50%; transform: translate(-50%, -50%);'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'ripple-2-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0.8,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['ripple-2'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        },
      },
    ],
  };

  const ripple3: RenderableComponentData = {
    id: 'ripple-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class='absolute rounded-full bg-amber-600/10 blur-sm' style='width: 160px; height: 160px; left: 50%; top: 50%; transform: translate(-50%, -50%);'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'ripple-3-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 1.1,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['ripple-3'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0.4, prog: 1 },
          ],
        },
      },
    ],
  };

  // Location pin SVG with draw-on and wobble effects
  const pinSvg: RenderableComponentData = {
    id: 'pin-svg',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width='100' height='140' viewBox='0 0 100 140' xmlns='http://www.w3.org/2000/svg'><defs><filter id='pin-wobble'><feTurbulence baseFrequency='0.02' numOctaves='2' seed='5'/><feDisplacementMap in='SourceGraphic' scale='0.8'/></filter></defs><path d='M 50 10 Q 30 10 18 25 T 10 55 Q 10 75 30 95 L 50 130 L 70 95 Q 90 75 90 55 T 82 25 Q 70 10 50 10 Z M 50 70 Q 40 70 33 63 T 26 48 Q 26 38 33 31 T 50 24 Q 60 24 67 31 T 74 48 Q 74 58 67 65 T 50 70 Z' fill='none' stroke='${primaryColor}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' stroke-dasharray='400' stroke-dashoffset='400' style='filter: url(#pin-wobble);' /></svg>`,
      className: 'absolute',
      style: {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'pin-draw',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 1.2,
          duration: 1.8,
          mode: 'provider',
          targetIds: ['pin-svg'],
          ranges: [
            { key: 'strokeDashoffset', val: 400, prog: 0 },
            { key: 'strokeDashoffset', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'pin-wobble',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 2.2,
          duration: duration - 2.2,
          mode: 'provider',
          targetIds: ['pin-svg'],
          ranges: [
            { key: 'rotate', val: -2, prog: 0 },
            { key: 'rotate', val: 2, prog: 0.5 },
            { key: 'rotate', val: -2, prog: 1 },
          ],
        },
      },
    ],
  };

  // Coordinates text with handwritten font and tumbling effect
  const coordinatesText: RenderableComponentData = {
    id: 'coordinates-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: coordinates,
      className: 'text-amber-900/90 text-2xl tracking-wider',
      style: {
        fontWeight: coordinatesFontParsed.weight,
        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
      font: {
        family: coordinatesFontParsed.family,
        weights: [coordinatesFontParsed.weight],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'coordinates-tumble',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 1.8,
          duration: 1.2,
          mode: 'provider',
          targetIds: ['coordinates-text'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'rotate', val: -5, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'translateY', val: -20, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Location name with cursive font and clip-path pen-stroke reveal
  const locationNameText: RenderableComponentData = {
    id: 'location-name-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: locationName,
      className: 'text-amber-950 text-5xl mt-4',
      style: {
        fontWeight: locationFontParsed.weight,
        textShadow: '0 2px 4px rgba(0,0,0,0.15)',
      },
      font: {
        family: locationFontParsed.family,
        weights: [locationFontParsed.weight],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'location-name-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 2.5,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['location-name-text'],
          ranges: [
            { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
          ],
        },
      },
    ],
  };

  // === LAYOUT CONTAINERS ===

  // Text layer container
  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col items-center justify-end pb-24',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [coordinatesText, locationNameText],
  };

  // Pin layer container
  const pinLayer: RenderableComponentData = {
    id: 'pin-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [pinSvg],
  };

  // Ripple layer container
  const rippleLayer: RenderableComponentData = {
    id: 'ripple-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [ripple1, ripple2, ripple3],
  };

  // Contour layer container
  const contourLayer: RenderableComponentData = {
    id: 'contour-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [contour1, contour2, contour3],
  };

  // === ROOT CONTAINER ===
  const rootContainer: RenderableComponentData = {
    id: 'hand-drawn-location-marker-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: backgroundColor,
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(245, 222, 179, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(222, 184, 135, 0.2) 0%, transparent 50%)`,
          filter: 'contrast(1.02) brightness(1.01)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      noiseOverlay,
      contourLayer,
      rippleLayer,
      pinLayer,
      textLayer,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'hand-drawn-location-marker',
  title: 'Hand-Drawn Location Marker',
  description:
    'An organic, hand-drawn style location marker preset that feels like a treasure map coming to life. Features a sketched pin that draws itself with a wobbly line, ink-wash ripple rings with watercolor edges, pencil-line topographic contours, handwritten coordinate numbers that tumble and rotate, and a cursive location name that writes itself. Uses an earthy color palette with sepia, warm grays, and cream background.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'location',
    'marker',
    'hand-drawn',
    'organic',
    'treasure-map',
    'sketch',
    'watercolor',
    'topographic',
    'handwritten',
    'cursive',
    'pin',
    'coordinates',
    'map',
    'vintage',
    'earthy',
    'sepia',
  ],
  dependencies: {},
  defaultInputParams: {
    locationName: 'San Francisco',
    coordinates: '37.7749° N, 122.4194° W',
    duration: 5,
    backgroundColor: '#FAF5EF',
    primaryColor: '#704214',
    accentColor: '#B8956A',
    locationFont: 'DancingScript:600',
    coordinatesFont: 'Caveat:500',
  },
};

// Export preset
export const handDrawnLocationMarkerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
