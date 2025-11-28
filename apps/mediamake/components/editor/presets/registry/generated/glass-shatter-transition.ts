/**
 * Glass Shatter Displacement Transition Preset
 *
 * Creates a liquid glass shatter effect where the outgoing video breaks into 9 fragments
 * (3x3 grid) that disperse outward with randomized physics, while the incoming video
 * reconstructs from scattered pieces. Features refraction effects via brightness/contrast
 * filters and a 1.2-second transition duration.
 *
 * Technical Implementation:
 * - 9 VideoAtom instances for outgoing video using clip-path to create fragments
 * - 9 VideoAtom instances for incoming video with inverse animations
 * - Each fragment has unique transform animations (translate, rotate, scale)
 * - Brightness and contrast filters simulate glass refraction
 * - Z-index layering for proper fragment stacking
 * - Overflow-visible container for dispersing fragments
 *
 * Use Cases:
 * - Dramatic scene transitions
 * - Impact moments in storytelling
 * - Creative video montages
 * - Dynamic media presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the glass shatter transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideoSrc, incomingVideoSrc, transitionDuration } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration =
    params.outgoingDuration + params.incomingDuration - transitionDuration;

  // Helper function to generate randomized transform values
  const generateRandomTransforms = () => {
    const translateX = Math.floor(Math.random() * 400) - 200; // -200 to 200
    const translateY = Math.floor(Math.random() * 400) - 200; // -200 to 200
    const rotate = Math.floor(Math.random() * 90) - 45; // -45 to 45
    const scale = 0.7 + Math.random() * 0.3; // 0.7 to 1.0
    return { translateX, translateY, rotate, scale };
  };

  // Fragment configuration: 3x3 grid with clip-path positions
  const fragmentConfigs = [
    // Row 1
    {
      id: 0,
      top: '0%',
      left: '0%',
      clipPath: 'inset(0% 66.67% 66.67% 0%)',
    },
    {
      id: 1,
      top: '0%',
      left: '-100%',
      clipPath: 'inset(0% 33.33% 66.67% 33.33%)',
    },
    {
      id: 2,
      top: '0%',
      left: '-200%',
      clipPath: 'inset(0% 0% 66.67% 66.67%)',
    },
    // Row 2
    {
      id: 3,
      top: '-100%',
      left: '0%',
      clipPath: 'inset(33.33% 66.67% 33.33% 0%)',
    },
    {
      id: 4,
      top: '-100%',
      left: '-100%',
      clipPath: 'inset(33.33% 33.33% 33.33% 33.33%)',
    },
    {
      id: 5,
      top: '-100%',
      left: '-200%',
      clipPath: 'inset(33.33% 0% 33.33% 66.67%)',
    },
    // Row 3
    {
      id: 6,
      top: '-200%',
      left: '0%',
      clipPath: 'inset(66.67% 66.67% 0% 0%)',
    },
    {
      id: 7,
      top: '-200%',
      left: '-100%',
      clipPath: 'inset(66.67% 33.33% 0% 33.33%)',
    },
    {
      id: 8,
      top: '-200%',
      left: '-200%',
      clipPath: 'inset(66.67% 0% 0% 66.67%)',
    },
  ];

  // Generate transform values for each fragment
  const fragmentTransforms = fragmentConfigs.map(() =>
    generateRandomTransforms(),
  );

  // Create outgoing video fragments
  const outgoingFragments: RenderableComponentData[] = fragmentConfigs.map(
    (config, index) => {
      const transforms = fragmentTransforms[index];
      const fragmentId = `outgoing-frag-${config.id}`;

      return {
        id: fragmentId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          muted: true,
          style: {
            position: 'absolute',
            width: '300%',
            height: '300%',
            top: config.top,
            left: config.left,
            clipPath: config.clipPath,
            zIndex: 10 + index,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.outgoingDuration,
          },
        },
        effects: [
          {
            id: `outgoing-effect-${config.id}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: params.outgoingDuration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: transforms.translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: transforms.translateY, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: transforms.rotate, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: transforms.scale, prog: 1 },
                { key: 'brightness', val: 1, prog: 0 },
                { key: 'brightness', val: 1.2, prog: 1 },
                { key: 'contrast', val: 1, prog: 0 },
                { key: 'contrast', val: 1.1, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create incoming video fragments (inverse animation)
  const incomingFragments: RenderableComponentData[] = fragmentConfigs.map(
    (config, index) => {
      const transforms = fragmentTransforms[index];
      const fragmentId = `incoming-frag-${config.id}`;

      return {
        id: fragmentId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          muted: true,
          style: {
            position: 'absolute',
            width: '300%',
            height: '300%',
            top: config.top,
            left: config.left,
            clipPath: config.clipPath,
            zIndex: 5 + index,
          },
        },
        context: {
          timing: {
            start: params.outgoingDuration - transitionDuration,
            duration: params.incomingDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: `incoming-effect-${config.id}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                { key: 'translateX', val: transforms.translateX, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: transforms.translateY, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'rotate', val: transforms.rotate, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
                { key: 'scale', val: transforms.scale, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                { key: 'brightness', val: 1.2, prog: 0 },
                { key: 'brightness', val: 1, prog: 1 },
                { key: 'contrast', val: 1.1, prog: 0 },
                { key: 'contrast', val: 1, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Outgoing container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.outgoingDuration,
      },
    },
    childrenData: outgoingFragments,
  };

  // Incoming container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: params.outgoingDuration - transitionDuration,
        duration: params.incomingDuration + transitionDuration,
      },
    },
    childrenData: incomingFragments,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glass-shatter-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'glass-shatter-transition',
  title: 'Glass Shatter Displacement Transition',
  description:
    'Creates a liquid glass shatter effect where the outgoing video breaks into 9 fragments (3x3 grid) that disperse with randomized physics, while the incoming video reconstructs from scattered pieces. Features refraction effects via brightness/contrast filters and 1.2-second transition duration.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glass', 'shatter', 'displacement', 'kinetic', 'video'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 5,
    incomingDuration: 5,
    transitionDuration: 1.2,
  },
  dependencies: {},
};

export const glassShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
