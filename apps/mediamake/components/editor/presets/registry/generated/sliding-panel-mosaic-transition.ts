/**
 * Sliding Panel Mosaic Transition Preset
 *
 * This preset creates a complex weaving transition effect where the screen splits into vertical
 * and horizontal strips that slide in alternating directions. The outgoing video is fragmented
 * into 8 vertical panels that slide out (alternating up/down), while the incoming video is
 * carried by 6 horizontal panels that slide in from the sides (alternating left/right).
 * 
 * During a 1.2-second overlap period, both sets of panels cross each other, creating a dynamic
 * woven effect. Panels feature subtle shake effects at peak positions and elastic easing for
 * natural, playful motion. Z-index values swap mid-transition to create depth.
 *
 * Features:
 * - 8 vertical strips (outgoing video) sliding alternately up/down
 * - 6 horizontal strips (incoming video) sliding alternately left/right
 * - 1.2-second overlap period with crossing panels
 * - Elastic easing (cubic-bezier) for bouncy motion
 * - Subtle shake effects at peak positions
 * - Dynamic z-index swapping for depth perception
 * - Proper video positioning to maintain continuous image across strips
 *
 * Use cases:
 * - Dynamic video transitions with a woven/mosaic aesthetic
 * - Creative scene changes with playful motion
 * - Modern video editing with geometric transitions
 * - Building engaging content with complex animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the overlap/transition period in seconds'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the panel slide animations in seconds'),
  horizontalDelay: z
    .number()
    .default(0.3)
    .describe('Delay before horizontal panels start sliding in seconds'),
  shakeIntensity: z
    .number()
    .default(5)
    .describe('Intensity of shake effect in pixels'),
  shakeDuration: z
    .number()
    .default(0.2)
    .describe('Duration of shake effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    transitionDuration,
    horizontalDelay,
    shakeIntensity,
    shakeDuration,
  } = params;

  // Calculate base layout duration (sum of videos minus overlap)
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;

  // Elastic easing for bouncy effect
  const elasticEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  // Helper to generate random shake offset
  const getRandomShake = () => {
    return Math.random() * shakeIntensity * 2 - shakeIntensity;
  };

  // Create 8 vertical strips for outgoing video
  const verticalStrips: RenderableComponentData[] = [];
  for (let i = 0; i < 8; i++) {
    const stripLeft = `${i * 12.5}%`;
    const isOdd = i % 2 === 1;
    const slideDirection = isOdd ? '-120%' : '120%'; // Odd up, even down

    // Calculate when shake should occur (at peak of slide out)
    const shakeStart = transitionDuration;
    const shakeX = getRandomShake();
    const shakeY = getRandomShake();

    // Effects for vertical strip
    const effects = [
      // Main slide out effect
      {
        id: `vert-slide-out-${i}`,
        componentId: 'generic',
        data: {
          type: elasticEasing,
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [`vert-strip-${i}`],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: slideDirection, prog: 1 },
          ],
        },
      },
      // Shake effect at peak
      {
        id: `vert-shake-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: [`vert-strip-${i}`],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${shakeX}px`, prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
      // Z-index swap at 0.6s mark
      {
        id: `vert-zindex-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.6,
          duration: 0.01,
          mode: 'provider',
          targetIds: [`vert-strip-${i}`],
          ranges: [
            { key: 'zIndex', val: 20, prog: 0 },
            { key: 'zIndex', val: 10, prog: 1 },
          ],
        },
      },
    ];

    verticalStrips.push({
      id: `vert-strip-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full overflow-hidden',
          style: {
            left: stripLeft,
            width: '12.5%',
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects,
      childrenData: [
        {
          id: `video1-in-vert-${i}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            startFrom: 0,
            fit: 'cover',
            className: 'h-full',
            style: {
              width: '800%', // 8 strips × 100%
              height: '100%',
              objectPosition: `${-i * 12.5}% center`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Create 6 horizontal strips for incoming video
  const horizontalStrips: RenderableComponentData[] = [];
  for (let i = 0; i < 6; i++) {
    const stripTop = `${i * 16.67}%`;
    const isOdd = i % 2 === 1;
    const slideDirection = isOdd ? '-120%' : '120%'; // Odd left, even right

    // Calculate when shake should occur (at peak of slide in)
    const shakeStart = horizontalDelay + transitionDuration;
    const shakeX = getRandomShake();
    const shakeY = getRandomShake();

    // Effects for horizontal strip
    const effects = [
      // Main slide in effect
      {
        id: `horiz-slide-in-${i}`,
        componentId: 'generic',
        data: {
          type: elasticEasing,
          start: horizontalDelay,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [`horiz-strip-${i}`],
          ranges: [
            { key: 'translateX', val: slideDirection, prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
      // Shake effect at peak
      {
        id: `horiz-shake-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: [`horiz-strip-${i}`],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `${shakeY}px`, prog: 0.5 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
      // Z-index swap at 0.6s mark
      {
        id: `horiz-zindex-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.6,
          duration: 0.01,
          mode: 'provider',
          targetIds: [`horiz-strip-${i}`],
          ranges: [
            { key: 'zIndex', val: 10, prog: 0 },
            { key: 'zIndex', val: 20, prog: 1 },
          ],
        },
      },
    ];

    horizontalStrips.push({
      id: `horiz-strip-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full overflow-hidden',
          style: {
            top: stripTop,
            height: '16.67%',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: video2.duration + overlapDuration,
        },
      },
      effects,
      childrenData: [
        {
          id: `video2-in-horiz-${i}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            startFrom: 0,
            fit: 'cover',
            className: 'w-full',
            style: {
              width: '100%',
              height: '600%', // 6 strips × 100%
              objectPosition: `center ${-i * 16.67}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Combine all strips
  const childrenData: RenderableComponentData[] = [
    ...verticalStrips,
    ...horizontalStrips,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'sliding-panel-mosaic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-neutral-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'sliding-panel-mosaic-transition',
  title: 'Sliding Panel Mosaic Transition',
  description:
    'Complex weaving transition with 8 vertical panels sliding alternately up/down revealing 6 horizontal panels sliding left/right underneath. Features 1.2s overlap period, elastic easing, shake effects at peak positions, and dynamic z-index swapping for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'mosaic',
    'weaving',
    'panels',
    'strips',
    'vertical',
    'horizontal',
    'elastic',
    'shake',
    'dynamic',
    'complex',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 1.2,
    transitionDuration: 0.8,
    horizontalDelay: 0.3,
    shakeIntensity: 5,
    shakeDuration: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const slidingPanelMosaicTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
