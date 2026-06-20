/**
 * Split-Screen Curtain Wipe Transition Preset
 *
 * Creates a minimalist split-screen wipe transition where videos transition through a clean vertical split
 * that opens from the center. The incoming video is revealed as two halves that slide apart from the middle:
 * - Left half slides left (translateX from 50% to 0%)
 * - Right half slides right (translateX from -50% to 0%)
 * Like theatrical curtains opening.
 *
 * Features:
 * - Clean geometric aesthetic with precise timing
 * - Two instances of incoming VideoAtom, each clipped to show only half
 * - Symmetric movement from center outward
 * - 0.6s smooth easing (ease-out)
 * - Outgoing video remains static underneath
 * - Optional 1px white line at center split for visual definition
 * - Supports multiple video clips with calculated overlap timing
 *
 * Use cases:
 * - Professional video transitions with theatrical flair
 * - Clean split reveals between video segments
 * - Minimalist geometric transitions
 * - Multi-clip sequences with consistent curtain-style transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  clips: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        duration: z.number().describe('Duration of this clip in seconds'),
        startFrom: z.number().optional().describe('Start time in source video'),
        endAt: z.number().optional().describe('End time in source video'),
      }),
    )
    .min(1)
    .describe('Array of video clips to transition between'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of curtain transition in seconds'),
  showCenterLine: z
    .boolean()
    .default(true)
    .describe('Show 1px white line at center split for definition'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { clips, transitionDuration, showCenterLine } = params;

  // Calculate total composition duration
  // Each transition overlaps by transitionDuration
  const totalDuration =
    clips.reduce((sum, clip) => sum + clip.duration, 0) -
    (clips.length - 1) * transitionDuration;

  const childrenData: RenderableComponentData[] = [];
  let currentTime = 0;

  clips.forEach((clip, index) => {
    const isFirst = index === 0;
    const clipId = `clip-${index}`;

    // Calculate timing
    const clipStart = isFirst ? 0 : currentTime - transitionDuration;
    const clipDuration = isFirst
      ? clip.duration
      : clip.duration + transitionDuration;

    if (isFirst) {
      // First clip: only outgoing (no incoming transition)
      childrenData.push({
        id: `${clipId}-outgoing`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: clip.src,
          startFrom: clip.startFrom || 0,
          endAt: clip.endAt,
          className: 'absolute inset-0 object-cover',
          style: {
            zIndex: 0,
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: clipStart,
            duration: clipDuration,
          },
        },
      } as RenderableComponentData);
    } else {
      // Subsequent clips: outgoing + incoming with curtain effect
      const prevClip = clips[index - 1];

      // Outgoing video (previous clip, continues playing underneath)
      childrenData.push({
        id: `${clipId}-outgoing`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: prevClip.src,
          startFrom: prevClip.startFrom || 0,
          endAt: prevClip.endAt,
          className: 'absolute inset-0 object-cover',
          style: {
            zIndex: 0,
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: currentTime - prevClip.duration,
            duration: prevClip.duration,
          },
        },
      } as RenderableComponentData);

      // Incoming video - LEFT HALF
      childrenData.push({
        id: `${clipId}-incoming-left`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: clip.src,
          startFrom: clip.startFrom || 0,
          endAt: clip.endAt,
          className: 'absolute inset-0 object-cover',
          style: {
            zIndex: 10,
            clipPath: 'inset(0 50% 0 0)', // Clip to left half
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: clipStart,
            duration: clipDuration,
          },
        },
        effects: [
          {
            id: `${clipId}-left-wipe-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0, // Relative to clip start
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`${clipId}-incoming-left`],
              ranges: [
                { key: 'translateX', val: 50, prog: 0, unit: '%' },
                { key: 'translateX', val: 0, prog: 1, unit: '%' },
              ],
            },
          },
        ],
      } as RenderableComponentData);

      // Incoming video - RIGHT HALF
      childrenData.push({
        id: `${clipId}-incoming-right`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: clip.src,
          startFrom: clip.startFrom || 0,
          endAt: clip.endAt,
          className: 'absolute inset-0 object-cover',
          style: {
            zIndex: 10,
            clipPath: 'inset(0 0 0 50%)', // Clip to right half
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: clipStart,
            duration: clipDuration,
          },
        },
        effects: [
          {
            id: `${clipId}-right-wipe-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0, // Relative to clip start
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`${clipId}-incoming-right`],
              ranges: [
                { key: 'translateX', val: -50, prog: 0, unit: '%' },
                { key: 'translateX', val: 0, prog: 1, unit: '%' },
              ],
            },
          },
        ],
      } as RenderableComponentData);

      // Optional center line
      if (showCenterLine) {
        childrenData.push({
          id: `${clipId}-center-line`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            className: 'absolute top-0 bottom-0 left-1/2 w-px bg-white',
            style: {
              zIndex: 15,
              transform: 'translateX(-50%)',
            },
          },
          context: {
            timing: {
              start: clipStart,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: `${clipId}-center-line-fade`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0, // Relative to line start
                duration: transitionDuration,
                mode: 'provider',
                targetIds: [`${clipId}-center-line`],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }
    }

    currentTime += clip.duration;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'split-screen-curtain-container',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'split-screen-curtain-wipe',
  title: 'Split-Screen Curtain Wipe Transition',
  description:
    'Minimalist split-screen wipe transition where videos reveal through a clean vertical split that opens from the center. The incoming video appears as two halves that slide apart symmetrically like theatrical curtains - left half slides left, right half slides right. Features precise geometric timing with 0.6s smooth easing, optional 1px center line, and support for multiple video clips with calculated overlap timing. Clean, theatrical, and precise.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'split-screen', 'curtain', 'wipe', 'geometric', 'minimalist', 'video'],
  defaultInputParams: {
    clips: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 5,
        startFrom: 0,
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 4,
        startFrom: 0,
      },
      {
        src: 'https://example.com/video3.mp4',
        duration: 6,
        startFrom: 0,
      },
    ],
    transitionDuration: 0.6,
    showCenterLine: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const splitScreenCurtainWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
