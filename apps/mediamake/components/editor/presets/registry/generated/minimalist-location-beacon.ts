/**
 * Minimalist Location Beacon Preset
 *
 * A clean, geometric location beacon animation with Swiss design sensibility.
 * Features a morphing pin point, pulsing rings, self-drawing topographic lines,
 * flickering coordinates, and a compressing location name. All animations use
 * linear or ease-out easing for mechanical precision.
 *
 * Design Philosophy:
 * - Clean geometric shapes with clip-path morphing
 * - Metronome-like rhythm with synchronized pulsing
 * - Self-drawing topographic lines (horizontal wavy patterns)
 * - Monospace coordinate text with flicker effect
 * - Letter-spacing compression animation
 * - Apple Maps meets Swiss design aesthetic
 *
 * Technical Implementation:
 * - Single BaseLayout container with z-indexed layers
 * - Pin: Small dot expanding to full pin via scale transition
 * - Rings: Two circular borders scaling from 20% to 150% with opacity fade
 * - Topography: 3-4 horizontal lines revealed via width animation
 * - Coordinates: Monospace text with flicker effect
 * - Location name: Text with letter-spacing compression
 *
 * Use Cases:
 * - Location reveal animations
 * - Map-based transitions
 * - Geographic storytelling
 * - Clean editorial location markers
 * - Minimalist place introductions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for input parameters
const presetParams = z.object({
  coordinates: z
    .string()
    .default('37.7749° N, 122.4194° W')
    .describe('Geographic coordinates to display (e.g., "37.7749° N, 122.4194° W")'),
  locationName: z
    .string()
    .default('San Francisco')
    .describe('Name of the location'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the animation in seconds'),
  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color (default: near-black)'),
  foregroundColor: z
    .string()
    .default('#ffffff')
    .describe('Color for shapes and text (default: white)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    coordinates,
    locationName,
    duration,
    backgroundColor,
    foregroundColor,
  } = params;

  // Create unique IDs for all elements
  const rootContainerId = 'minimalist-location-beacon-container';
  const pinContainerId = 'pin-container';
  const pinShapeId = 'pin-shape';
  const ringsLayerId = 'rings-layer';
  const ring1Id = 'ring-1';
  const ring2Id = 'ring-2';
  const topographyLayerId = 'topography-layer';
  const topoLine1Id = 'topo-line-1';
  const topoLine2Id = 'topo-line-2';
  const topoLine3Id = 'topo-line-3';
  const topoLine4Id = 'topo-line-4';
  const textLayerId = 'text-layer';
  const coordinatesTextId = 'coordinates-text';
  const locationNameTextId = 'location-name-text';

  // Pin shape HTML (simple white dot)
  const pinShapeHTML = `<div style="width: 12px; height: 12px; background-color: ${foregroundColor}; border-radius: 50%;"></div>`;

  // Ring HTML (circular border)
  const createRingHTML = (size: number) =>
    `<div style="width: ${size}px; height: ${size}px; border: 2px solid ${foregroundColor}33; border-radius: 50%;"></div>`;

  // Topographic line HTML (horizontal line with wavy border - simulated via CSS)
  const createTopoLineHTML = (width: number) =>
    `<div style="width: 0; height: 2px; border-top: 1px solid ${foregroundColor}33; overflow: hidden;"></div>`;

  // Pin shape component (starts small, scales to normal)
  const pinShape: RenderableComponentData = {
    id: pinShapeId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: pinShapeHTML,
      className: 'flex items-center justify-center',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Pin container (holds the pin shape)
  const pinContainer: RenderableComponentData = {
    id: pinContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex items-center justify-center',
        style: {
          width: '60px',
          height: '60px',
          zIndex: 40,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [pinShape],
  };

  // Ring 1 component
  const ring1: RenderableComponentData = {
    id: ring1Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createRingHTML(60),
      className: 'absolute',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Ring 2 component (delayed pulse)
  const ring2: RenderableComponentData = {
    id: ring2Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createRingHTML(60),
      className: 'absolute',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Rings layer (holds both rings)
  const ringsLayer: RenderableComponentData = {
    id: ringsLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [ring1, ring2],
  };

  // Topographic lines (4 lines)
  const topoLine1: RenderableComponentData = {
    id: topoLine1Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createTopoLineHTML(300),
      className: '',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const topoLine2: RenderableComponentData = {
    id: topoLine2Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createTopoLineHTML(280),
      className: '',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const topoLine3: RenderableComponentData = {
    id: topoLine3Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createTopoLineHTML(260),
      className: '',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const topoLine4: RenderableComponentData = {
    id: topoLine4Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createTopoLineHTML(240),
      className: '',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Topography layer (holds all lines)
  const topographyLayer: RenderableComponentData = {
    id: topographyLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex flex-col items-center justify-center gap-3',
        style: {
          width: '100%',
          height: '100%',
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [topoLine1, topoLine2, topoLine3, topoLine4],
  };

  // Coordinates text component
  const coordinatesText: RenderableComponentData = {
    id: coordinatesTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: coordinates,
      className: 'font-mono text-xs tracking-widest',
      style: {
        color: `${foregroundColor}99`,
      },
      font: {
        family: 'Roboto Mono',
        weights: ['400'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Location name text component
  const locationNameText: RenderableComponentData = {
    id: locationNameTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: locationName,
      className: 'text-2xl font-light',
      style: {
        color: foregroundColor,
        letterSpacing: '0.5em',
      },
      font: {
        family: 'Inter',
        weights: ['300'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Text layer (holds coordinates and location name)
  const textLayer: RenderableComponentData = {
    id: textLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex flex-col items-center justify-center gap-4',
        style: {
          top: '60%',
          zIndex: 50,
        },
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

  // Effects for all animated elements

  // Pin morph effect (scale from 0.2 to 1, opacity 0 to 1)
  const pinMorphEffect = {
    id: 'pin-morph-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [pinShapeId],
      type: 'ease-out',
      start: 0,
      duration: 0.5,
      ranges: [
        { key: 'scale', val: 0.2, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Ring 1 pulse effect (scale 0.2 to 1.5, opacity 0.3 to 0)
  const ring1PulseEffect = {
    id: 'ring-1-pulse-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [ring1Id],
      type: 'linear',
      start: 0.2,
      duration: 0.6,
      ranges: [
        { key: 'scale', val: 0.2, prog: 0 },
        { key: 'scale', val: 1.5, prog: 1 },
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Ring 2 pulse effect (delayed 200ms)
  const ring2PulseEffect = {
    id: 'ring-2-pulse-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [ring2Id],
      type: 'linear',
      start: 0.4,
      duration: 0.6,
      ranges: [
        { key: 'scale', val: 0.2, prog: 0 },
        { key: 'scale', val: 1.5, prog: 1 },
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Topographic line draw effects (width 0 to full)
  const topoLine1DrawEffect = {
    id: 'topo-line-1-draw-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [topoLine1Id],
      type: 'linear',
      start: 0.3,
      duration: 0.5,
      ranges: [
        { key: 'width', val: '0%', prog: 0 },
        { key: 'width', val: '300px', prog: 1 },
      ],
    },
  };

  const topoLine2DrawEffect = {
    id: 'topo-line-2-draw-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [topoLine2Id],
      type: 'linear',
      start: 0.4,
      duration: 0.5,
      ranges: [
        { key: 'width', val: '0%', prog: 0 },
        { key: 'width', val: '280px', prog: 1 },
      ],
    },
  };

  const topoLine3DrawEffect = {
    id: 'topo-line-3-draw-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [topoLine3Id],
      type: 'linear',
      start: 0.5,
      duration: 0.5,
      ranges: [
        { key: 'width', val: '0%', prog: 0 },
        { key: 'width', val: '260px', prog: 1 },
      ],
    },
  };

  const topoLine4DrawEffect = {
    id: 'topo-line-4-draw-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [topoLine4Id],
      type: 'linear',
      start: 0.6,
      duration: 0.5,
      ranges: [
        { key: 'width', val: '0%', prog: 0 },
        { key: 'width', val: '240px', prog: 1 },
      ],
    },
  };

  // Coordinates flicker effect (opacity flicker pattern)
  const coordinatesFlickerEffect = {
    id: 'coordinates-flicker-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [coordinatesTextId],
      type: 'linear',
      start: 0.5,
      duration: 0.2,
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 0.6 },
        { key: 'opacity', val: 0.6, prog: 1 },
      ],
    },
  };

  // Location name letter-spacing compression effect
  const locationNameLetterSpaceEffect = {
    id: 'location-name-letterspace-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [locationNameTextId],
      type: 'ease-out',
      start: 0.6,
      duration: 0.4,
      ranges: [
        { key: 'letterSpacing', val: '0.5em', prog: 0 },
        { key: 'letterSpacing', val: '0.05em', prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Attach effects to components
  pinShape.effects = [pinMorphEffect];
  ring1.effects = [ring1PulseEffect];
  ring2.effects = [ring2PulseEffect];
  topoLine1.effects = [topoLine1DrawEffect];
  topoLine2.effects = [topoLine2DrawEffect];
  topoLine3.effects = [topoLine3DrawEffect];
  topoLine4.effects = [topoLine4DrawEffect];
  coordinatesText.effects = [coordinatesFlickerEffect];
  locationNameText.effects = [locationNameLetterSpaceEffect];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
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
      pinContainer,
      ringsLayer,
      topographyLayer,
      textLayer,
    ] as RenderableComponentData[],
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
  id: 'minimalist-location-beacon',
  title: 'Minimalist Location Beacon',
  description:
    'A minimalist location beacon preset with clean geometric animations. Features a morphing pin point, pulsing rings, self-drawing topographic lines, flickering coordinates, and compressing location name. Swiss design meets Apple Maps with mechanical precision using linear and ease-out curves.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'location',
    'beacon',
    'minimalist',
    'geometric',
    'swiss-design',
    'apple-maps',
    'editorial',
    'clean',
    'precise',
  ],
  defaultInputParams: {
    coordinates: '37.7749° N, 122.4194° W',
    locationName: 'San Francisco',
    duration: 10,
    backgroundColor: '#0a0a0a',
    foregroundColor: '#ffffff',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const minimalistLocationBeaconPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
