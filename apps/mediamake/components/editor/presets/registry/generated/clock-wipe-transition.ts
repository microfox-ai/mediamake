/**
 * Clock Wipe Transition Preset
 *
 * Creates a minimalist clock wipe transition where videos transition through a radial sweep effect.
 * The incoming video is revealed through a pie-slice shaped mask that rotates clockwise from the
 * 12 o'clock position, completing a full 360-degree rotation in 0.8 seconds.
 *
 * Features:
 * - **Radial Sweep Transition**: Pie-slice mask rotates clockwise from 12 o'clock
 * - **Clean Sharp Edges**: Maintains crisp edges throughout the rotation
 * - **Consistent Angular Velocity**: Linear easing for constant rotation speed
 * - **Direction Alternation**: Supports alternating clockwise/counter-clockwise rotations
 * - **Multiple Clips**: Handles sequential transitions between multiple video clips
 * - **CSS Mask Implementation**: Uses conic-gradient for smooth rotational reveal
 * - **GPU Acceleration**: Optimized with will-change for smooth performance
 *
 * Use cases:
 * - Creating smooth clock-style transitions between video clips
 * - Building sequential video montages with radial wipe effects
 * - Adding professional rotational transitions to video sequences
 * - Creating time-themed transitions with alternating directions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  clips: z
    .array(
      z.object({
        src: z.string().describe('Video source URL or local path'),
        duration: z
          .number()
          .positive()
          .describe('Duration of the video clip in seconds'),
        direction: z
          .enum(['clockwise', 'counter-clockwise'])
          .optional()
          .describe('Direction of clock wipe rotation (auto-alternates if not specified)'),
      }),
    )
    .min(2)
    .describe('Array of video clips to transition between'),
  transitionDuration: z
    .number()
    .positive()
    .default(0.8)
    .describe('Duration of each clock wipe transition in seconds'),
  alternateDirection: z
    .boolean()
    .default(true)
    .describe('Automatically alternate between clockwise and counter-clockwise rotations'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { clips, transitionDuration, alternateDirection } = params;

  // Calculate total duration: sum of all clips minus overlaps
  const totalDuration =
    clips.reduce((sum, clip) => sum + clip.duration, 0) -
    (clips.length - 1) * transitionDuration;

  const childrenData: RenderableComponentData[] = [];
  let currentTime = 0;

  clips.forEach((clip, index) => {
    const isFirst = index === 0;
    const isLast = index === clips.length - 1;

    // Determine rotation direction
    let direction: 'clockwise' | 'counter-clockwise' = 'clockwise';
    if (clip.direction) {
      direction = clip.direction;
    } else if (alternateDirection) {
      direction = index % 2 === 0 ? 'clockwise' : 'counter-clockwise';
    }

    // Calculate timing for this clip
    const clipStart = isFirst ? 0 : currentTime - transitionDuration;
    const clipDuration = isFirst
      ? clip.duration
      : clip.duration + transitionDuration;

    // Outgoing video (for all clips except the last)
    if (!isLast) {
      childrenData.push({
        id: `clock-wipe-outgoing-${index}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: clip.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
            zIndex: 0,
          },
        },
        context: {
          timing: {
            start: clipStart,
            duration: clipDuration,
          },
        },
      } as RenderableComponentData);
    }

    // Incoming video (for all clips except the first)
    if (!isFirst) {
      const prevClip = clips[index - 1];
      const maskStartAngle = direction === 'clockwise' ? 0 : 360;
      const maskEndAngle = direction === 'clockwise' ? 360 : 0;

      // Calculate transition start time relative to incoming clip
      const transitionStartRelative = 0; // Starts immediately with the clip
      const transitionEndRelative = transitionDuration;

      childrenData.push({
        id: `clock-wipe-incoming-${index}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: clip.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
            zIndex: 10,
            willChange: 'mask',
            maskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black 0deg, transparent 0deg)`,
            WebkitMaskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black 0deg, transparent 0deg)`,
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          },
        },
        context: {
          timing: {
            start: clipStart,
            duration: clipDuration,
          },
        },
        effects: [
          {
            id: `clock-wipe-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: transitionStartRelative,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`clock-wipe-incoming-${index}`],
              ranges: [
                {
                  key: 'maskImage',
                  val:
                    direction === 'clockwise'
                      ? `conic-gradient(from -90deg at 50% 50%, black 0deg, black 0deg, transparent 0deg)`
                      : `conic-gradient(from -90deg at 50% 50%, black 360deg, black 360deg, transparent 360deg)`,
                  prog: 0,
                },
                {
                  key: 'maskImage',
                  val:
                    direction === 'clockwise'
                      ? `conic-gradient(from -90deg at 50% 50%, black 0deg, black 360deg, transparent 360deg)`
                      : `conic-gradient(from -90deg at 50% 50%, black 0deg, black 0deg, transparent 0deg)`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    } else {
      // First clip - no mask, just display
      childrenData.push({
        id: `clock-wipe-incoming-${index}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: clip.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          style: {
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: clipStart,
            duration: clipDuration,
          },
        },
      } as RenderableComponentData);
    }

    currentTime += clip.duration;
  });

  const rootContainer: RenderableComponentData = {
    id: 'clock-wipe-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
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

const presetMetadata: PresetMetadata = {
  id: 'clock-wipe-transition',
  title: 'Clock Wipe Transition',
  description:
    'Minimalist clock wipe transition where videos transition through a radial sweep effect. The incoming video is revealed through a pie-slice shaped mask rotating clockwise from 12 o'clock, completing a 360-degree rotation. Supports multiple clips with alternating directions and maintains sharp edges.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'clock', 'wipe', 'radial', 'video', 'mask'],
  defaultInputParams: {
    clips: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 5,
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 5,
      },
      {
        src: 'https://example.com/video3.mp4',
        duration: 5,
      },
    ],
    transitionDuration: 0.8,
    alternateDirection: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const clockWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
