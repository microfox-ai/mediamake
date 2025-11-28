/**
 * Glitch Location Lock Preset
 *
 * High-energy cyberpunk location lock animation with RGB split, glitch effects,
 * digital distortion rings, ASCII topography, aggressive glitch typography,
 * and screen-shake effects. Features electric blue, hot pink, and black color
 * scheme with chromatic aberration and purposeful chaos.
 *
 * Features:
 * - RGB split pin icon that glitches into existence
 * - Expanding rings with digital distortion and flickering
 * - ASCII/dot-matrix topographic lines that rapidly assemble
 * - Coordinates with aggressive glitch typography
 * - Location name with screen-shake and chromatic aberration
 * - High contrast colors: electric blue (#00ffff), hot pink (#ff00ff), black
 *
 * Use cases:
 * - Location reveals in travel content
 * - Map transitions in vlogs
 * - Geographic info displays
 * - Cyberpunk-style location services
 * - Tech/gaming content location markers
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  locationName: z
    .string()
    .default('SAN FRANCISCO')
    .describe('Location name to display (uppercase recommended)'),
  coordinates: z
    .string()
    .default("37°46'N 122°25'W")
    .describe('Coordinates to display'),
  duration: z
    .number()
    .default(4)
    .describe('Total duration of the animation in seconds'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of glitch transitions in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { locationName, coordinates, duration, transitionDuration } = params;

  // Pin container with RGB split layers
  const pinContainer: RenderableComponentData = {
    id: 'pin-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 1.2,
      },
    },
    childrenData: [
      // Cyan pin layer
      {
        id: 'pin-cyan',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 48px; height: 48px; border-radius: 50% 50% 50% 0; border: 4px solid #00ffff; transform: rotate(-45deg); mix-blend-mode: screen;'></div>",
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 1.2,
          },
        },
        effects: [
          {
            id: 'pin-cyan-glitch-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.8,
              mode: 'provider',
              targetIds: ['pin-cyan'],
              ranges: [
                { key: 'translateX', val: -10, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Magenta pin layer
      {
        id: 'pin-magenta',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 48px; height: 48px; border-radius: 50% 50% 50% 0; border: 4px solid #ff00ff; transform: rotate(-45deg); mix-blend-mode: screen;'></div>",
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 1.2,
          },
        },
        effects: [
          {
            id: 'pin-magenta-glitch-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.8,
              mode: 'provider',
              targetIds: ['pin-magenta'],
              ranges: [
                { key: 'translateX', val: 4, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 4, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Yellow pin layer
      {
        id: 'pin-yellow',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 48px; height: 48px; border-radius: 50% 50% 50% 0; border: 4px solid #ffff00; transform: rotate(-45deg); mix-blend-mode: screen;'></div>",
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 1.2,
          },
        },
        effects: [
          {
            id: 'pin-yellow-glitch-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.8,
              mode: 'provider',
              targetIds: ['pin-yellow'],
              ranges: [
                { key: 'translateX', val: 10, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: -4, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

  // Rings container with glitch distortion
  const ringsContainer: RenderableComponentData = {
    id: 'rings-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0.6,
        duration: 2,
      },
    },
    childrenData: [
      // Ring 1 - Cyan
      {
        id: 'ring-1',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 120px; height: 120px; border: 3px solid #00ffff; border-radius: 50%; mix-blend-mode: screen;'></div>",
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 2,
          },
        },
        effects: [
          {
            id: 'ring-1-expand',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 1.5,
              mode: 'provider',
              targetIds: ['ring-1'],
              ranges: [
                { key: 'scale', val: 0.4, prog: 0 },
                { key: 'scale', val: 2, prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ring 2 - Magenta
      {
        id: 'ring-2',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 120px; height: 120px; border: 3px solid #ff00ff; border-radius: 50%; mix-blend-mode: screen;'></div>",
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0.3,
            duration: 2,
          },
        },
        effects: [
          {
            id: 'ring-2-expand',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 1.5,
              mode: 'provider',
              targetIds: ['ring-2'],
              ranges: [
                { key: 'scale', val: 0.4, prog: 0 },
                { key: 'scale', val: 2, prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ring 3 - Yellow
      {
        id: 'ring-3',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 120px; height: 120px; border: 3px solid #ffff00; border-radius: 50%; mix-blend-mode: screen;'></div>",
          className: 'absolute',
          style: {
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0.6,
            duration: 2,
          },
        },
        effects: [
          {
            id: 'ring-3-expand',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 1.5,
              mode: 'provider',
              targetIds: ['ring-3'],
              ranges: [
                { key: 'scale', val: 0.4, prog: 0 },
                { key: 'scale', val: 2, prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

  // Topography grid with ASCII characters
  const topographyContainer: RenderableComponentData = {
    id: 'topography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {},
      },
    },
    context: {
      timing: {
        start: 1.2,
        duration: 1.5,
      },
    },
    childrenData: [
      {
        id: 'topography-grid',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: "▓▒░ ··· ─── ··· ░▒▓\n░▒▓ ─·· ··─ ·─· ▓▒░\n▓▒░ ··─ ─·─ ─·· ░▒▓\n░▒▓ ·─· ··· ·── ▓▒░",
          className: 'text-cyan-400 font-mono text-xs leading-tight',
          style: {
            whiteSpace: 'pre',
            letterSpacing: '0.3em',
            textShadow: '0 0 10px #00ffff',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 1.5,
          },
        },
        effects: [
          {
            id: 'topography-assemble',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.8,
              mode: 'provider',
              targetIds: ['topography-grid'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 0.8, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

  // Coordinates with glitch typography
  const coordinatesContainer: RenderableComponentData = {
    id: 'coordinates-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-8 left-8',
        style: {},
      },
    },
    context: {
      timing: {
        start: 1.8,
        duration: 2.2,
      },
    },
    childrenData: [
      {
        id: 'coordinates-text',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: coordinates,
          className: 'text-cyan-400 font-mono text-lg font-bold',
          style: {
            textShadow: '0 0 8px #00ffff, 2px 2px 0 #ff00ff',
            letterSpacing: '0.1em',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 2.2,
          },
        },
        effects: [
          {
            id: 'coordinates-glitch',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 0.6,
              mode: 'provider',
              targetIds: ['coordinates-text'],
              ranges: [
                { key: 'translateX', val: -4, prog: 0 },
                { key: 'translateX', val: 4, prog: 0.25 },
                { key: 'translateX', val: -2, prog: 0.5 },
                { key: 'translateX', val: 2, prog: 0.75 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

  // Location name with screen-shake and chromatic aberration
  const locationNameContainer: RenderableComponentData = {
    id: 'location-name-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute bottom-16 left-0 right-0 flex items-center justify-center',
        style: {},
      },
    },
    context: {
      timing: {
        start: 2.4,
        duration: 1.6,
      },
    },
    childrenData: [
      {
        id: 'location-name-text',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: locationName,
          className:
            'text-pink-500 font-black text-5xl uppercase tracking-wider',
          style: {
            textShadow:
              '0 0 20px #ff00ff, 3px 0 0 #00ffff, -3px 0 0 #ffff00',
            WebkitTextStroke: '2px #000',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 1.6,
          },
        },
        effects: [
          {
            id: 'location-shake',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.5,
              mode: 'provider',
              targetIds: ['location-name-text'],
              ranges: [
                { key: 'translateX', val: -5, prog: 0 },
                { key: 'translateX', val: 5, prog: 0.2 },
                { key: 'translateX', val: -3, prog: 0.4 },
                { key: 'translateX', val: 3, prog: 0.6 },
                { key: 'translateX', val: -1, prog: 0.8 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: -5, prog: 0 },
                { key: 'translateY', val: 3, prog: 0.2 },
                { key: 'translateY', val: -2, prog: 0.4 },
                { key: 'translateY', val: 2, prog: 0.6 },
                { key: 'translateY', val: -1, prog: 0.8 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'scale', val: 1.2, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-location-lock-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
        style: {},
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
      ringsContainer,
      topographyContainer,
      coordinatesContainer,
      locationNameContainer,
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

const presetMetadata: PresetMetadata = {
  id: 'glitch-location-lock',
  title: 'Glitch Location Lock Preset',
  description:
    'High-energy cyberpunk location lock animation with RGB split, glitch effects, digital distortion rings, ASCII topography, aggressive glitch typography, and screen-shake effects. Features electric blue, hot pink, and black color scheme with chromatic aberration and purposeful chaos.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'location',
    'glitch',
    'cyberpunk',
    'rgb-split',
    'chromatic-aberration',
    'screen-shake',
    'typography',
    'effects',
    'high-energy',
  ],
  defaultInputParams: {
    locationName: 'SAN FRANCISCO',
    coordinates: "37°46'N 122°25'W",
    duration: 4,
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchLocationLockPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
