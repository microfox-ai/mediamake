/**
 * Crosshatch Doodle Transition Preset
 *
 * This preset creates an artistic hand-drawn crosshatch transition effect between two videos.
 * It simulates rapid cross-hatching with marker strokes, building up density in the middle of
 * the transition. The effect starts with diagonal lines going one direction over the outgoing
 * video, then adds perpendicular lines that reveal the incoming video through the gaps.
 *
 * Features:
 * - Overlapping marker strokes creating textured grid patterns
 * - Organic line spacing and thickness variations (8-15px spacing, 2-5px stroke width)
 * - Staggered animation timing (first set at 45deg, second at -45deg)
 * - Hand-drawn irregularity with rotation variance (±5deg) and position offsets
 * - Mix-blend-mode multiply for authentic sketch overlays
 * - Paper-like background during transition
 * - Outgoing video fades to grayscale and reduced opacity
 * - Incoming video revealed through animated crosshatch pattern
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Adding sketch-like visual effects to video content
 * - Building creative transitions for artistic or educational videos
 * - Simulating hand-drawn animation transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of incoming video'),
  transitionDuration: z
    .number()
    .default(1.1)
    .describe('Duration of the crosshatch transition in seconds'),
  lineColor: z
    .string()
    .default('#333333')
    .describe('Color of the crosshatch lines (first set)'),
  lineColor2: z
    .string()
    .default('#444444')
    .describe('Color of the crosshatch lines (second set)'),
  paperBackground: z
    .string()
    .default('#f5f5f5')
    .describe('Background color simulating paper'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    lineColor,
    lineColor2,
    paperBackground,
  } = params;

  // Helper function to generate organic line variations
  const generateLineVariations = () => {
    const variations = [];
    const lineCount = 8; // Number of lines per direction

    for (let i = 0; i < lineCount; i++) {
      variations.push({
        spacing: Math.floor(Math.random() * 7) + 8, // 8-15px
        strokeWidth: Math.floor(Math.random() * 3) + 2, // 2-5px
        opacity: Math.random() * 0.3 + 0.6, // 0.6-0.9
        rotation: Math.random() * 10 - 5, // ±5deg
        offsetX: Math.floor(Math.random() * 6) - 3, // ±3px
        offsetY: Math.floor(Math.random() * 6) - 3, // ±3px
      });
    }

    return variations;
  };

  const firstSetVariations = generateLineVariations();
  const secondSetVariations = generateLineVariations();

  // Create first set of diagonal lines (45deg direction)
  const firstSetLines: RenderableComponentData[] = firstSetVariations.map(
    (variation, index) => {
      const lineId = `hatch-line-first-${index}`;
      const startDelay = index * 0.05; // Stagger by 0.05s
      const drawDuration = 0.5;

      return {
        id: lineId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg width='100%' height='100%' class='absolute inset-0' style='pointer-events: none;'><line x1='${index * 10}%' y1='0' x2='${100 + index * 10}%' y2='100%' stroke='${lineColor}' stroke-width='${variation.strokeWidth}' stroke-linecap='round' opacity='${variation.opacity}' stroke-dasharray='2000' stroke-dashoffset='2000' style='transform: rotate(${45 + variation.rotation}deg) translate(${variation.offsetX}px, ${variation.offsetY}px); transform-origin: center;' /></svg>`,
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none',
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
            id: `${lineId}-draw`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: startDelay,
              duration: drawDuration,
              mode: 'provider',
              targetIds: [lineId],
              ranges: [
                { key: 'strokeDashoffset', val: 2000, prog: 0 },
                { key: 'strokeDashoffset', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create second set of diagonal lines (-45deg direction)
  const secondSetLines: RenderableComponentData[] = secondSetVariations.map(
    (variation, index) => {
      const lineId = `hatch-line-second-${index}`;
      const startDelay = 0.3 + index * 0.05; // Start at 0.3s, stagger by 0.05s
      const drawDuration = 0.5;

      return {
        id: lineId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg width='100%' height='100%' class='absolute inset-0' style='pointer-events: none;'><line x1='${index * 10}%' y1='100%' x2='${100 + index * 10}%' y2='0' stroke='${lineColor2}' stroke-width='${variation.strokeWidth}' stroke-linecap='round' opacity='${variation.opacity}' stroke-dasharray='2000' stroke-dashoffset='2000' style='transform: rotate(${-45 + variation.rotation}deg) translate(${variation.offsetX}px, ${variation.offsetY}px); transform-origin: center;' /></svg>`,
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none',
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
            id: `${lineId}-draw`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: startDelay,
              duration: drawDuration,
              mode: 'provider',
              targetIds: [lineId],
              ranges: [
                { key: 'strokeDashoffset', val: 2000, prog: 0 },
                { key: 'strokeDashoffset', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Outgoing video layer
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
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
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
      {
        id: 'outgoing-grayscale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'filter:grayscale(%)', val: 0, prog: 0 },
            { key: 'filter:grayscale(%)', val: 100, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
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
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming video layer
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
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
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-opacity-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.3,
          duration: 0.8,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
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
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Crosshatch overlay layer
  const crosshatchOverlay: RenderableComponentData = {
    id: 'crosshatch-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [...firstSetLines, ...secondSetLines],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crosshatch-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: paperBackground,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingVideoLayer, incomingVideoLayer, crosshatchOverlay],
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
  id: 'crosshatch-doodle-transition',
  title: 'Crosshatch Doodle Transition',
  description:
    'Artistic hand-drawn crosshatch transition effect with overlapping marker strokes creating textured grid patterns between videos. Features organic line spacing, staggered diagonal hatching, and sketch-like irregularity for authentic artistic transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'crosshatch',
    'artistic',
    'hand-drawn',
    'sketch',
    'marker',
    'doodle',
    'video',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.1,
    lineColor: '#333333',
    lineColor2: '#444444',
    paperBackground: '#f5f5f5',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crosshatchDoodleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
