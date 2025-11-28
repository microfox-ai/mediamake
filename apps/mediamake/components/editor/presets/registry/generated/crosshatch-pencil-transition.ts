/**
 * Crosshatch Pencil Transition Preset
 *
 * This preset creates a smooth transition between two videos using animated crosshatch patterns
 * that mimic traditional pencil drawing techniques. The transition features two sets of diagonal
 * lines (45° and -45°) that intersect to create a crosshatch pattern, gradually revealing the
 * incoming video while applying a high-contrast pencil sketch effect to the outgoing video.
 *
 * Features:
 * - **Two-Set Diagonal Lines**: 12 lines at 45° and 12 lines at -45° creating crosshatch
 * - **Hand-Drawn Quality**: Lines have varying thickness (2px base) and opacity (0.6-0.9)
 * - **Staggered Animation**: Lines animate with 60ms offset (index * 0.06s) for organic feel
 * - **Pencil Sketch Effect**: Outgoing video progressively receives high-contrast effect
 * - **Smooth Reveal**: Incoming video revealed through composite mask created by crosshatch
 * - **1.6 Second Overlap**: Controlled transition duration for smooth scene change
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Adding hand-drawn aesthetic to video content
 * - Transitioning between scenes with traditional media feel
 * - Building stylized video montages with sketch effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of outgoing video'),
      duration: z.number().describe('Duration of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of incoming video'),
      duration: z.number().describe('Duration of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(1.6)
    .describe('Duration of transition overlap in seconds'),
  lineCount: z
    .number()
    .default(12)
    .describe('Number of lines per diagonal set (total = lineCount * 2)'),
  lineAnimationDuration: z
    .number()
    .default(0.8)
    .describe('Duration for each line animation in seconds'),
  lineStaggerDelay: z
    .number()
    .default(0.06)
    .describe('Delay between each line animation start in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    lineCount,
    lineAnimationDuration,
    lineStaggerDelay,
  } = params;

  // Calculate timing
  const outgoingDuration = outgoingVideo.duration + overlapDuration * 0.5;
  const incomingStart = outgoingVideo.duration - overlapDuration * 0.5;
  const incomingDuration = incomingVideo.duration + overlapDuration * 0.5;
  const crosshatchStart = outgoingVideo.duration - overlapDuration;
  const sketchEffectStart = outgoingVideo.duration - overlapDuration;

  // Total composition duration
  const totalDuration = outgoingVideo.duration + incomingVideo.duration;

  // Generate opacity variations (0.6-0.9)
  const generateOpacityVariations = (count: number): number[] => {
    const opacities = [0.7, 0.65, 0.8, 0.75, 0.85, 0.6, 0.9, 0.7, 0.65, 0.8, 0.75, 0.85];
    return Array(count)
      .fill(0)
      .map((_, i) => opacities[i % opacities.length]);
  };

  const opacities45 = generateOpacityVariations(lineCount);
  const opacitiesNeg45 = generateOpacityVariations(lineCount);

  // Create 45-degree lines
  const lines45: RenderableComponentData[] = Array(lineCount)
    .fill(0)
    .map((_, index) => {
      const lineId = `line-45-${index}`;
      const leftPosition = (index * 100) / lineCount;

      return {
        id: lineId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: 2px; height: 100%; background: #333;'></div>`,
          style: {
            position: 'absolute',
            left: `${leftPosition}%`,
            top: 0,
            opacity: opacities45[index],
            transformOrigin: 'top left',
            transform: 'scaleX(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${lineId}-anim`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              mode: 'provider',
              targetIds: [lineId],
              start: index * lineStaggerDelay,
              duration: lineAnimationDuration,
              ranges: [
                { key: 'scaleX', val: 0, prog: 0 },
                { key: 'scaleX', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });

  // Create -45-degree lines
  const linesNeg45: RenderableComponentData[] = Array(lineCount)
    .fill(0)
    .map((_, index) => {
      const lineId = `line-neg45-${index}`;
      const leftPosition = (index * 100) / lineCount;

      return {
        id: lineId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: 2px; height: 100%; background: #333;'></div>`,
          style: {
            position: 'absolute',
            left: `${leftPosition}%`,
            top: 0,
            opacity: opacitiesNeg45[index],
            transformOrigin: 'top left',
            transform: 'scaleX(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          {
            id: `${lineId}-anim`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              mode: 'provider',
              targetIds: [lineId],
              start: index * lineStaggerDelay,
              duration: lineAnimationDuration,
              ranges: [
                { key: 'scaleX', val: 0, prog: 0 },
                { key: 'scaleX', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });

  // 45-degree line container
  const lineSet45Container: RenderableComponentData = {
    id: 'line-set-45-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transform: 'rotate(45deg)',
          mixBlendMode: 'darken',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: lines45,
  };

  // -45-degree line container
  const lineSetNeg45Container: RenderableComponentData = {
    id: 'line-set-neg45-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transform: 'rotate(-45deg)',
          mixBlendMode: 'darken',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: linesNeg45,
  };

  // Crosshatch mask container
  const crosshatchMaskContainer: RenderableComponentData = {
    id: 'crosshatch-mask-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: crosshatchStart,
        duration: overlapDuration,
      },
    },
    childrenData: [lineSet45Container, lineSetNeg45Container],
  };

  // Outgoing video with sketch effect
  const outgoingVideoComponent: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'sketch-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          mode: 'provider',
          targetIds: ['outgoing-video'],
          start: sketchEffectStart,
          duration: overlapDuration,
          ranges: [
            { key: 'filter', val: 'contrast(1) brightness(1)', prog: 0 },
            { key: 'filter', val: 'contrast(3) brightness(1.4)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-container',
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
        duration: outgoingDuration,
      },
    },
    childrenData: [outgoingVideoComponent],
  };

  // Incoming video
  const incomingVideoComponent: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: incomingDuration,
      },
    },
  };

  // Incoming container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration,
      },
    },
    childrenData: [incomingVideoComponent],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crosshatch-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, crosshatchMaskContainer, incomingContainer],
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
  id: 'crosshatch-pencil-transition',
  title: 'Crosshatch Pencil Transition',
  description:
    'Scene transition using animated crosshatch pencil drawing patterns with two sets of diagonal lines (45° and -45°) that reveal incoming video while applying progressive pencil sketch effect to outgoing video',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crosshatch', 'pencil', 'sketch', 'artistic', 'drawing'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 1.6,
    lineCount: 12,
    lineAnimationDuration: 0.8,
    lineStaggerDelay: 0.06,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crosshatchPencilTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
