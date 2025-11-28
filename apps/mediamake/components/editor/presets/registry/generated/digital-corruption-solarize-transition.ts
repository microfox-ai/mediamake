/**
 * Digital Corruption Solarize Transition
 *
 * A grid-based transition effect with data moshing aesthetics. Creates a 0.7-second overlap
 * where both videos break into pixelated blocks with random color inversion (solarize effect).
 * Blocks freeze, glitch rapidly between normal and inverted states, and scatter-replace as
 * the incoming video takes over. Includes digital noise and compression artifacts during peak corruption.
 *
 * Features:
 * - **8x6 Grid System**: 48 blocks with individual clipping and animation control
 * - **Color Inversion Glitches**: Random blocks rapidly invert colors (0% ↔ 100%) at 50ms intervals
 * - **Frozen Blocks**: 30% of blocks freeze (pause video playback simulation via opacity/scale)
 * - **Scattered Reveal**: Incoming blocks appear with staggered timing over 700ms
 * - **Digital Noise Overlay**: Animated noise texture peaks at transition midpoint
 * - **Compression Artifacts**: Contrast/saturation filters simulate video compression glitches
 *
 * Use cases:
 * - Data moshing style transitions between video clips
 * - Glitch art video effects
 * - Corrupted VHS/digital aesthetic transitions
 * - Experimental video art and music videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time in seconds for outgoing video'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds for incoming video'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds'),
  gridCols: z.number().default(8).describe('Number of grid columns'),
  gridRows: z.number().default(6).describe('Number of grid rows'),
  freezeBlockPercentage: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Percentage of blocks to freeze (0-1)'),
  glitchUpdateFrequency: z
    .number()
    .default(0.05)
    .describe('Update frequency for color inversion glitches in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    gridCols,
    gridRows,
    freezeBlockPercentage,
    glitchUpdateFrequency,
  } = params;

  // Calculate grid dimensions
  const totalBlocks = gridCols * gridRows;
  const blockWidth = 100 / gridCols;
  const blockHeight = 100 / gridRows;

  // Helper: Generate noise texture as base64 SVG
  const generateNoiseSVG = (): string => {
    const noisePattern = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
      </filter>
      <rect width="200" height="200" filter="url(#noise)" opacity="0.8"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(noisePattern)}`;
  };

  // Helper: Random boolean with probability
  const randomBoolean = (probability: number): boolean => {
    return Math.random() < probability;
  };

  // Helper: Random int in range
  const randomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Generate grid blocks
  const gridBlocks: RenderableComponentData[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const blockIndex = row * gridCols + col;
      const blockId = `block-${blockIndex}`;

      // Determine if this block should freeze
      const isFrozen = randomBoolean(freezeBlockPercentage);

      // Staggered appearance timing for incoming video
      const appearDelay = (blockIndex / totalBlocks) * transitionDuration;

      // Random inversion pattern (50ms cycles during transition)
      const inversionCycles = Math.floor(transitionDuration / glitchUpdateFrequency);
      const inversionRanges: Array<{ key: string; val: string; prog: number }> = [];
      
      for (let i = 0; i <= inversionCycles; i++) {
        const prog = i / inversionCycles;
        const invert = randomBoolean(0.5) ? '100%' : '0%';
        inversionRanges.push({
          key: 'filter',
          val: `invert(${invert}) contrast(200%) saturate(${randomBoolean(0.3) ? '0%' : '100%'})`,
          prog,
        });
      }

      // Random scale glitch (1 to 1.2)
      const scaleGlitch = randomBoolean(0.4) ? 1 + Math.random() * 0.2 : 1;

      // Outgoing block (disappears during transition)
      const outgoingBlock: RenderableComponentData = {
        id: `${blockId}-outgoing`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute overflow-hidden',
            style: {
              left: `${col * blockWidth}%`,
              top: `${row * blockHeight}%`,
              width: `${blockWidth}%`,
              height: `${blockHeight}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [
          {
            id: `${blockId}-outgoing-video`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: outgoingVideo.src,
              startFrom: outgoingVideo.startFrom || 0,
              className: 'absolute',
              style: {
                width: `${gridCols * 100}%`,
                height: `${gridRows * 100}%`,
                left: `${-col * 100}%`,
                top: `${-row * 100}%`,
                objectFit: 'cover',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            effects: [
              // Color inversion glitches
              {
                id: `${blockId}-outgoing-inversion`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: [`${blockId}-outgoing-video`],
                  ranges: inversionRanges,
                },
              },
              // Opacity fade out (with random timing)
              {
                id: `${blockId}-outgoing-fade`,
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: Math.random() * transitionDuration * 0.5,
                  duration: transitionDuration * 0.5,
                  mode: 'provider',
                  targetIds: [`${blockId}-outgoing-video`],
                  ranges: [
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
              // Scale glitch
              ...(scaleGlitch > 1
                ? [
                    {
                      id: `${blockId}-outgoing-scale`,
                      componentId: 'generic',
                      data: {
                        type: 'linear',
                        start: 0,
                        duration: transitionDuration,
                        mode: 'provider',
                        targetIds: [`${blockId}-outgoing-video`],
                        ranges: [
                          { key: 'scale', val: 1, prog: 0 },
                          { key: 'scale', val: scaleGlitch, prog: 0.5 },
                          { key: 'scale', val: 1, prog: 1 },
                        ],
                      },
                    },
                  ]
                : []),
              // Freeze effect (reduced opacity flicker)
              ...(isFrozen
                ? [
                    {
                      id: `${blockId}-outgoing-freeze`,
                      componentId: 'generic',
                      data: {
                        type: 'linear',
                        start: transitionDuration * 0.3,
                        duration: transitionDuration * 0.4,
                        mode: 'provider',
                        targetIds: [`${blockId}-outgoing-video`],
                        ranges: [
                          { key: 'opacity', val: 1, prog: 0 },
                          { key: 'opacity', val: 0.3, prog: 0.5 },
                          { key: 'opacity', val: 1, prog: 1 },
                        ],
                      },
                    },
                  ]
                : []),
            ],
          } as RenderableComponentData,
        ],
      };

      // Incoming block (appears during transition)
      const incomingBlock: RenderableComponentData = {
        id: `${blockId}-incoming`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute overflow-hidden',
            style: {
              left: `${col * blockWidth}%`,
              top: `${row * blockHeight}%`,
              width: `${blockWidth}%`,
              height: `${blockHeight}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [
          {
            id: `${blockId}-incoming-video`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: incomingVideo.src,
              startFrom: incomingVideo.startFrom || 0,
              className: 'absolute',
              style: {
                width: `${gridCols * 100}%`,
                height: `${gridRows * 100}%`,
                left: `${-col * 100}%`,
                top: `${-row * 100}%`,
                objectFit: 'cover',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            effects: [
              // Staggered fade in
              {
                id: `${blockId}-incoming-fade`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: appearDelay,
                  duration: Math.min(transitionDuration * 0.3, transitionDuration - appearDelay),
                  mode: 'provider',
                  targetIds: [`${blockId}-incoming-video`],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
              // Inversion glitches (less intense than outgoing)
              {
                id: `${blockId}-incoming-inversion`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: appearDelay,
                  duration: transitionDuration - appearDelay,
                  mode: 'provider',
                  targetIds: [`${blockId}-incoming-video`],
                  ranges: inversionRanges.slice(0, Math.floor(inversionRanges.length * 0.5)),
                },
              },
            ],
          } as RenderableComponentData,
        ],
      };

      gridBlocks.push(outgoingBlock, incomingBlock);
    }
  }

  // Noise overlay
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 100,
          backgroundImage: `url(${generateNoiseSVG()})`,
          backgroundSize: '200px 200px',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'noise-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Artifact overlay (peak corruption effect)
  const artifactOverlay: RenderableComponentData = {
    id: 'artifact-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 99,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'artifact-flash',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['artifact-overlay'],
          ranges: [
            { key: 'filter', val: 'contrast(100%) saturate(100%)', prog: 0 },
            { key: 'filter', val: 'contrast(200%) saturate(0%)', prog: 0.5 },
            { key: 'filter', val: 'contrast(100%) saturate(100%)', prog: 1 },
          ],
        },
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'digital-corruption-solarize-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [...gridBlocks, noiseOverlay, artifactOverlay],
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
  id: 'digital-corruption-solarize-transition',
  title: 'Digital Corruption Solarize Transition',
  description:
    'A grid-based transition effect with data moshing aesthetics. Creates a 0.7-second overlap where both videos break into pixelated blocks with random color inversion (solarize effect). Blocks freeze, glitch rapidly between normal and inverted states, and scatter-replace as the incoming video takes over. Includes digital noise and compression artifacts during peak corruption.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'solarize',
    'data-moshing',
    'corruption',
    'grid',
    'video',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 0.7,
    gridCols: 8,
    gridRows: 6,
    freezeBlockPercentage: 0.3,
    glitchUpdateFrequency: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const digitalCorruptionSolarizeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
