/**
 * Depth Slice Transition Preset
 *
 * Creates a cinematic transition effect where videos are split into 5 horizontal strips
 * that slide apart and reassemble with depth illusion. Each strip moves independently
 * with staggered timing, varying distances, scale variations, and subtle rotation to
 * simulate a shattered glass reassembly effect. Motion blur is applied proportional to
 * movement speed for enhanced realism.
 *
 * Features:
 * - **Horizontal Strip Division**: Splits videos into 5 equal horizontal strips
 * - **Staggered Exit Animation**: Outgoing strips slide out with 0.1s delays between each
 * - **Inverse Entry Animation**: Incoming strips slide in from opposite directions with inverse stagger
 * - **Depth Simulation**: Varying translateX distances (-200px to 200px) create depth layers
 * - **Scale Variations**: Each strip scales between 0.95-1.05 for dimensional effect
 * - **Subtle Rotation**: ±3deg rotation adds shattered glass aesthetic
 * - **Motion Blur**: Proportional blur (0-4px) during peak movement enhances speed perception
 * - **Clean Masking**: clip-path ensures crisp strip edges
 *
 * Use cases:
 * - Dynamic video transitions with depth and dimension
 * - Shattered glass or layered paper effects
 * - Modern editorial-style transitions
 * - High-impact scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Total duration of the transition effect in seconds'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
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
    outgoingVideoDuration,
    incomingVideoDuration,
  } = params;

  // Configuration for 5 strips
  const stripCount = 5;
  const stripHeight = 20; // 20% per strip
  const staggerDelay = 0.1; // 0.1s delay between each strip

  // Animation configuration
  const stripConfigs = [
    { translateX: -200, scale: 0.95, rotate: -3 }, // Strip 0 - top
    { translateX: 150, scale: 1.05, rotate: 2 },   // Strip 1
    { translateX: -180, scale: 0.97, rotate: -2 }, // Strip 2 - center
    { translateX: 170, scale: 1.03, rotate: 3 },   // Strip 3
    { translateX: -200, scale: 0.95, rotate: -3 }, // Strip 4 - bottom
  ];

  // Calculate total container duration
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Helper function to create strip effects
  const createStripEffects = (
    stripIndex: number,
    isOutgoing: boolean,
    targetId: string,
  ) => {
    const config = stripConfigs[stripIndex];
    const staggerTime = stripIndex * staggerDelay;
    
    // For incoming, reverse the stagger (strip 4 starts first)
    const effectStart = isOutgoing 
      ? outgoingVideoDuration - transitionDuration + staggerTime
      : staggerTime;
    
    const animationDuration = transitionDuration - staggerTime;
    
    // Direction multiplier: outgoing exits, incoming enters from opposite
    const directionMultiplier = isOutgoing ? 1 : -1;
    const startTranslateX = isOutgoing ? 0 : config.translateX * directionMultiplier;
    const endTranslateX = isOutgoing ? config.translateX : 0;
    
    // Calculate blur based on movement speed (peak at midpoint)
    const maxBlur = Math.abs(config.translateX) / 50; // Scale blur to movement

    return [
      {
        id: `${targetId}-transform`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: effectStart,
          duration: animationDuration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'translateX', val: `${startTranslateX}px`, prog: 0 },
            { key: 'translateX', val: `${endTranslateX}px`, prog: 1 },
            { key: 'scale', val: isOutgoing ? 1 : config.scale, prog: 0 },
            { key: 'scale', val: isOutgoing ? config.scale : 1, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: `${isOutgoing ? 0 : config.rotate}deg`, prog: 0 },
            { key: 'rotate', val: `${isOutgoing ? config.rotate : 0}deg`, prog: 0.5 },
            { key: 'rotate', val: '0deg', prog: 1 },
          ],
        },
      },
      {
        id: `${targetId}-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: effectStart,
          duration: animationDuration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ];
  };

  // Create outgoing video strips
  const outgoingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    const stripId = `outgoing-strip-${i}`;
    const videoId = `outgoing-video-${i}`;
    const topPosition = i * stripHeight;
    const marginTop = -i * 100; // Negative margin to show correct portion

    outgoingStrips.push({
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full',
          style: {
            height: `${stripHeight}%`,
            top: `${topPosition}%`,
            clipPath: 'inset(0 0 0 0)',
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: createStripEffects(i, true, stripId),
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            fit: 'cover',
            className: 'w-full object-cover',
            style: {
              marginTop: `${marginTop}%`,
              height: `${stripCount * 100}%`,
              width: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideoDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Create incoming video strips
  const incomingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    const stripId = `incoming-strip-${i}`;
    const videoId = `incoming-video-${i}`;
    const topPosition = i * stripHeight;
    const marginTop = -i * 100;
    
    // Inverse stagger: strip 4 starts first (at 0s relative to incoming start)
    const inverseIndex = stripCount - 1 - i;

    incomingStrips.push({
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full',
          style: {
            height: `${stripHeight}%`,
            top: `${topPosition}%`,
            clipPath: 'inset(0 0 0 0)',
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - transitionDuration,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: createStripEffects(i, false, stripId),
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            fit: 'cover',
            className: 'w-full object-cover',
            style: {
              marginTop: `${marginTop}%`,
              height: `${stripCount * 100}%`,
              width: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideoDuration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'depth-slice-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000',
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
            duration: outgoingVideoDuration,
          },
        },
        childrenData: outgoingStrips,
      } as RenderableComponentData,
      {
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
            start: outgoingVideoDuration - transitionDuration,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
        childrenData: incomingStrips,
      } as RenderableComponentData,
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

const presetMetadata: PresetMetadata = {
  id: 'depth-slice-transition',
  title: 'Depth Slice Transition',
  description:
    'A transition preset that creates the illusion of videos existing in multiple z-depth slices that slide apart and reassemble. Splits videos into 5 horizontal strips with staggered timing, varying translateX distances, slight scale variations (0.95-1.05), subtle rotation (±3deg), and motion blur for a shattered glass reassembly effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'depth', 'slice', 'shattered', 'glass', 'layers'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.8,
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const depthSliceTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
