/**
 * Oil Paint Palette Knife Transition Preset
 *
 * Creates a realistic oil painting transition that smears one video into the next using
 * thick, impasto-style palette knife strokes. Features dimensional paint texture with
 * highlights and shadows, angular marks characteristic of palette knife painting, and
 * physical paint thickness built up through layered strokes. Includes subtle color mixing
 * at stroke intersections for an authentic fine art painting aesthetic.
 *
 * Features:
 * - **Impasto-style strokes**: 8-12 large angular strokes with varying dimensions
 * - **3D dimensional appearance**: Uses perspective and transform effects (rotateX/rotateY)
 * - **Physical paint thickness**: Multiple layered strokes with position offsets and opacity variations
 * - **Highlight and shadow effects**: Drop shadows and highlight accents on stroke edges
 * - **Color mixing**: Uses mix-blend-mode for authentic paint mixing at overlaps
 * - **Dynamic stroke animation**: Strokes slide in from different angles with staggered timing
 * - **Professional quality**: Suitable for high-end video production and art documentaries
 *
 * Use cases:
 * - Art documentary transitions
 * - Fine art video production
 * - Creative agency reels
 * - Museum/gallery presentations
 * - Artistic brand videos
 * - High-end commercial productions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (first video)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (second video)'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.3)
    .describe(
      'Duration of the transition effect in seconds (default: 1.3s for oil paint effect)',
    ),
  strokeCount: z
    .number()
    .min(8)
    .max(12)
    .default(10)
    .optional()
    .describe('Number of palette knife strokes (8-12, default: 10)'),
  strokeDelayIncrement: z
    .number()
    .default(0.1)
    .optional()
    .describe(
      'Time delay between each stroke animation in seconds (default: 0.1s)',
    ),
  colorMixIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of color mixing overlay (0-1, default: 0.3)'),
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
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    strokeCount = 10,
    strokeDelayIncrement = 0.1,
    colorMixIntensity = 0.3,
  } = params;

  // Calculate total duration (outgoing + incoming - overlap)
  const totalDuration = outgoingVideoDuration + incomingVideoDuration;

  // Transition occurs during the last part of outgoing video
  const transitionStart = outgoingVideoDuration - transitionDuration;

  // Helper function: Create palette knife stroke configuration
  const createStrokeConfig = (index: number) => {
    // Alternating sides for strokes
    const isLeftSide = index % 2 === 0;

    // Varying dimensions (100-200px width, 50-100px height)
    const width = 100 + Math.floor((index % 5) * 20);
    const height = 50 + Math.floor((index % 3) * 16.67);

    // Position along vertical axis
    const topPercent = 5 + index * 9;

    // Rotation angles for dimensional appearance
    const skewX = isLeftSide ? -15 + (index % 3) * 5 : 10 + (index % 3) * 5;
    const rotateX = -6 + (index % 3) * 4;
    const rotateY = isLeftSide ? -5 + (index % 2) * 3 : 4 + (index % 2) * 3;

    // Opacity variations for layering (0.7-1)
    const opacity = 0.7 + (index % 4) * 0.075;

    // Starting position (off-screen)
    const startPosition = isLeftSide ? '-200px' : '-200px';

    // Animation delay (staggered)
    const animationDelay = index * strokeDelayIncrement;

    // Gradient direction (alternating)
    const gradientDeg = 120 + (index % 4) * 10;

    return {
      width,
      height,
      topPercent,
      skewX,
      rotateX,
      rotateY,
      opacity,
      startPosition,
      animationDelay,
      gradientDeg,
      isLeftSide,
    };
  };

  // Create stroke groups
  const strokeGroups: RenderableComponentData[] = [];

  for (let i = 0; i < strokeCount; i++) {
    const config = createStrokeConfig(i);
    const strokeId = `stroke-group-${i + 1}`;
    const strokeBaseId = `stroke-${i + 1}-base`;
    const strokeHighlightId = `stroke-${i + 1}-highlight`;

    // Stroke group container
    const strokeGroup: RenderableComponentData = {
      id: strokeId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: `${config.topPercent}%`,
            [config.isLeftSide ? 'left' : 'right']: config.startPosition,
            width: `${config.width}px`,
            height: `${config.height}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [
        // Stroke base (main paint body)
        {
          id: strokeBaseId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div></div>`,
            className: 'absolute inset-0 rounded-sm',
            style: {
              background: `linear-gradient(${config.gradientDeg}deg, #ffffff 0%, #d1d5db 50%, #9ca3af 100%)`,
              transform: `skewX(${config.skewX}deg) rotateX(${config.rotateX}deg) rotateY(${config.rotateY}deg)`,
              filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
              opacity: config.opacity,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
        // Highlight accent on stroke edge
        {
          id: strokeHighlightId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div></div>`,
            className: 'absolute rounded-sm',
            style: {
              background: 'rgba(255,255,255,0.6)',
              transform: `skewX(${config.skewX}deg)`,
              top: '0',
              [config.isLeftSide ? 'left' : 'right']: '0',
              width: '33%',
              height: '25%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Slide in animation for stroke group
        {
          id: `${strokeId}-slide-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionStart + config.animationDelay,
            duration: 0.4,
            mode: 'provider',
            targetIds: [strokeId],
            ranges: [
              {
                key: config.isLeftSide ? 'translateX' : 'translateX',
                val: config.isLeftSide ? '-200px' : '200px',
                prog: 0,
              },
              {
                key: config.isLeftSide ? 'translateX' : 'translateX',
                val: '960px',
                prog: 1,
              },
            ],
          },
        },
        // Highlight fade in
        {
          id: `${strokeHighlightId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionStart + config.animationDelay + 0.1,
            duration: 0.2,
            mode: 'provider',
            targetIds: [strokeHighlightId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    strokeGroups.push(strokeGroup);
  }

  // Build child data structure
  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'video-outgoing',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover',
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
    } as RenderableComponentData,

    // Incoming video (starts during transition, extends beyond)
    {
      id: 'video-incoming-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'video-incoming',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideoDuration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Reveal incoming video by animating clipPath
        {
          id: 'incoming-reveal',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['video-incoming-container'],
            ranges: [
              {
                key: 'clipPath',
                val: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Strokes container (3D perspective)
    {
      id: 'strokes-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: strokeGroups,
    } as RenderableComponentData,

    // Color mixing overlay
    {
      id: 'color-mix-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'color-burn',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [
        {
          id: 'color-mix-gradient',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div></div>`,
            className: 'absolute inset-0',
            style: {
              background:
                'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'color-mix-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart + transitionDuration - 0.4,
            duration: 0.4,
            mode: 'provider',
            targetIds: ['color-mix-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: colorMixIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'oil-paint-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'oil-paint-palette-knife-transition',
  title: 'Oil Paint Palette Knife Transition',
  description:
    'An artistic video transition that simulates oil painting with palette knife technique. Features thick impasto-style strokes that smear across the screen, revealing the incoming video beneath. Includes dimensional paint texture with realistic highlights and shadows, angular palette knife marks, physical paint thickness through layered strokes, and subtle color mixing at intersections. Ideal for fine art videos, art documentaries, and high-end creative productions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'oil-paint',
    'palette-knife',
    'impasto',
    'art',
    'painting',
    'texture',
    'dimensional',
    'fine-art',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 1.3,
    strokeCount: 10,
    strokeDelayIncrement: 0.1,
    colorMixIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const oilPaintPaletteKnifeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
