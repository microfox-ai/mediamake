/**
 * Matrix Digital Rain Transition Preset
 *
 * A matrix-style digital rain pixel corruption transition where videos dissolve into cascading data streams.
 * During the 2.5-second overlap, the outgoing video breaks apart into falling pixel columns that cascade 
 * downward like corrupted data packets. Implement vertical columns that fragment and fall at different rates, 
 * with brightness variations suggesting data decay. The incoming video materializes from rising data streams 
 * that construct from bottom to top. Add a subtle green tint and terminal-style monospace number overlays 
 * during peak corruption to enhance the digital aesthetic.
 *
 * Features:
 * - **Vertical Column Grid**: 45 columns that fragment and fall independently
 * - **Staggered Cascading**: Outgoing columns fall at varying speeds (1.5-2.5s durations)
 * - **Rising Reconstruction**: Incoming columns rise from bottom to top (reverse cascade)
 * - **Brightness Decay**: Columns fade from 100% to 50% brightness during fall
 * - **Green Tint**: Digital matrix aesthetic with hue-rotate filter
 * - **Terminal Overlay**: Random number/character grid during peak corruption
 * - **Configurable Overlap**: Default 2.5s transition duration
 *
 * Use cases:
 * - Cyberpunk/tech video transitions
 * - Data visualization sequences
 * - Sci-fi content transitions
 * - Digital corruption effects
 * - Matrix-style visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  columnCount: z
    .number()
    .min(30)
    .max(60)
    .default(45)
    .describe('Number of vertical columns to create (30-60)'),
  greenTintIntensity: z
    .number()
    .min(0)
    .max(180)
    .default(120)
    .describe('Hue rotation for green tint effect (0-180 degrees)'),
  corruptionOverlay: z
    .boolean()
    .default(true)
    .describe('Show terminal-style number overlay during corruption'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    columnCount,
    greenTintIntensity,
    corruptionOverlay,
  } = params;

  // Helper: Generate random alphanumeric characters for overlay
  const generateRandomChars = (count: number): string => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < count; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Calculate timing
  const overlapStart = outgoingVideo.duration - transitionDuration;
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Calculate column width
  const columnWidth = 100 / columnCount; // Percentage

  // Generate outgoing video columns with staggered fall animations
  const outgoingColumns: RenderableComponentData[] = [];
  
  for (let i = 0; i < columnCount; i++) {
    const columnId = `outgoing-column-${i}`;
    const staggerDelay = (i / columnCount) * 1.0; // 0 to 1s stagger
    const fallDuration = 1.5 + Math.random(); // Random 1.5-2.5s
    const effectStart = overlapStart + staggerDelay;

    // Create video clip for this column
    const columnClip: RenderableComponentData = {
      id: `${columnId}-clip`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        muted: false,
        volume: i === 0 ? 1 : 0, // Only first column has audio
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
    };

    // Wrapper for column with clipping
    const column: RenderableComponentData = {
      id: columnId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            left: `${i * columnWidth}%`,
            width: `${columnWidth}%`,
            top: 0,
            height: '100%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [columnClip],
      effects: [
        {
          id: `${columnId}-fall`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: effectStart,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [columnId],
            ranges: [
              { key: 'translateY', val: '0vh', prog: 0 },
              { key: 'translateY', val: '100vh', prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: 'brightness(0.5)', prog: 1 },
            ],
          },
        },
      ],
    };

    outgoingColumns.push(column);
  }

  // Generate incoming video columns with rising animations
  const incomingColumns: RenderableComponentData[] = [];
  
  for (let i = 0; i < columnCount; i++) {
    const columnId = `incoming-column-${i}`;
    const staggerDelay = (i / columnCount) * 1.0; // 0 to 1s stagger
    const riseDuration = 1.5 + Math.random(); // Random 1.5-2.5s
    const effectStart = staggerDelay;

    // Create video clip for this column
    const columnClip: RenderableComponentData = {
      id: `${columnId}-clip`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        muted: false,
        volume: i === 0 ? 1 : 0, // Only first column has audio
      },
      context: {
        timing: {
          start: 0,
          duration: incomingVideo.duration,
        },
      },
    };

    // Wrapper for column with clipping
    const column: RenderableComponentData = {
      id: columnId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            left: `${i * columnWidth}%`,
            width: `${columnWidth}%`,
            top: 0,
            height: '100%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: incomingVideo.duration,
        },
      },
      childrenData: [columnClip],
      effects: [
        {
          id: `${columnId}-rise`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: effectStart,
            duration: riseDuration,
            mode: 'provider',
            targetIds: [columnId],
            ranges: [
              { key: 'translateY', val: '-100vh', prog: 0 },
              { key: 'translateY', val: '0vh', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    incomingColumns.push(column);
  }

  // Create outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'matrix-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      {
        id: 'matrix-outgoing-grid',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              filter: `hue-rotate(${greenTintIntensity}deg) brightness(1.2)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        childrenData: outgoingColumns,
      },
    ],
  };

  // Create incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'matrix-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: overlapStart,
        duration: incomingVideo.duration,
      },
    },
    childrenData: [
      {
        id: 'matrix-incoming-grid',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration,
          },
        },
        childrenData: incomingColumns,
      },
    ],
  };

  // Create corruption overlay (terminal text grid)
  const corruptionOverlayNode: RenderableComponentData | null =
    corruptionOverlay
      ? {
          id: 'matrix-corruption-overlay',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className:
                'absolute inset-0 pointer-events-none flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: overlapStart + 0.5,
              duration: 1.5, // Peak corruption period
            },
          },
          childrenData: [
            {
              id: 'matrix-corruption-text',
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: `
                  <div class="grid grid-cols-8 gap-2 text-green-400 font-mono text-xs w-full h-full p-8">
                    ${Array.from({ length: 64 }, () => `<div class="opacity-70">${generateRandomChars(4)}</div>`).join('')}
                  </div>
                `,
                className: 'w-full h-full',
              },
              context: {
                timing: {
                  start: 0,
                  duration: 1.5,
                },
              },
              effects: [
                {
                  id: 'corruption-fade',
                  componentId: 'generic',
                  data: {
                    type: 'ease-in-out',
                    start: 0,
                    duration: 1.5,
                    mode: 'provider',
                    targetIds: ['matrix-corruption-text'],
                    ranges: [
                      { key: 'opacity', val: 0, prog: 0 },
                      { key: 'opacity', val: 0.7, prog: 0.3 },
                      { key: 'opacity', val: 0.7, prog: 0.7 },
                      { key: 'opacity', val: 0, prog: 1 },
                    ],
                  },
                },
              ],
            },
          ],
        }
      : null;

  // Build final child array
  const children: RenderableComponentData[] = [
    outgoingContainer,
    incomingContainer,
  ];
  if (corruptionOverlayNode) {
    children.push(corruptionOverlayNode);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'matrix-digital-rain-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: children,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'matrix-digital-rain-transition',
  title: 'Matrix Digital Rain Transition',
  description:
    'A matrix-style digital rain pixel corruption transition where videos dissolve into cascading data streams. Features vertical columns that fragment and fall at different rates with brightness variations, green tint, and terminal-style monospace overlays during peak corruption. Designed for dynamic video transitions with a cyberpunk aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'matrix',
    'digital-rain',
    'cascade',
    'corruption',
    'cyberpunk',
    'tech',
    'vertical-columns',
    'green-tint',
    'terminal',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 2.5,
    columnCount: 45,
    greenTintIntensity: 120,
    corruptionOverlay: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const matrixDigitalRainTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
