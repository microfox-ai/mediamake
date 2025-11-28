/**
 * Shutter Burst Transition Preset
 *
 * Creates a rapid shutter-speed burst transition that mimics high-speed camera capture between
 * YouTube thumbnail images. The effect simulates a camera firing in burst mode with 6 rapid
 * flash frames (100ms each cycle) during a 600ms transition.
 *
 * Features:
 * - **Burst Mode Simulation**: 6 rapid cycles with alternating image visibility
 * - **Flash Overlays**: White flash effects at each shutter click moment
 * - **Mechanical Feel**: Sharp, snappy timing with linear easing (no curves)
 * - **Shake Effect**: Subtle horizontal shake on each shutter click
 * - **Staccato Rhythm**: 100ms cycles (50ms outgoing, 50ms incoming)
 * - **Energetic & Technical**: Perfect for tech reviews or photography channel content
 *
 * Technical Implementation:
 * - BaseLayout duration = media1.duration + media2.duration - 0.6s (overlap period)
 * - 6 rapid cycles during 600ms overlap: each cycle is 100ms
 * - Outgoing image opacity: [1,0,1,0,1,0,0] at [0%, 16%, 33%, 50%, 66%, 83%, 100%]
 * - Incoming image opacity: inverse pattern [0,1,0,1,0,1,1]
 * - White flash overlay with opacity spikes (0->0.7->0) at each transition point
 * - Shake effect: translateX oscillating ±3px with 50ms period
 * - All easing is linear for mechanical feel
 * - Z-index managed through opacity, not z-index changes
 *
 * Use cases:
 * - Tech review transitions between product shots
 * - Photography channel content with dynamic image changes
 * - Energetic YouTube thumbnail sequences
 * - High-energy content transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) image'),
    duration: z.number().describe('Duration of the first image in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Duration of the second image in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the burst transition in seconds (default: 0.6s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration (overlap reduces total duration)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Create outgoing media (media1) with burst fade and shake effects
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: media1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      // Burst fade effect - outgoing image flickers during transition
      {
        id: 'outgoing-shutter-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 }, // 0ms - visible
            { key: 'opacity', val: 0, prog: 0.16 }, // 96ms - hidden
            { key: 'opacity', val: 1, prog: 0.33 }, // 198ms - visible
            { key: 'opacity', val: 0, prog: 0.5 }, // 300ms - hidden
            { key: 'opacity', val: 1, prog: 0.66 }, // 396ms - visible
            { key: 'opacity', val: 0, prog: 0.83 }, // 498ms - hidden
            { key: 'opacity', val: 0, prog: 1 }, // 600ms - hidden
          ],
        },
      },
      // Shake effect - horizontal oscillation ±3px
      {
        id: 'outgoing-shutter-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 }, // 0ms
            { key: 'translateX', val: 3, prog: 0.08 }, // 48ms
            { key: 'translateX', val: 0, prog: 0.16 }, // 96ms
            { key: 'translateX', val: -3, prog: 0.25 }, // 150ms
            { key: 'translateX', val: 0, prog: 0.33 }, // 198ms
            { key: 'translateX', val: 3, prog: 0.42 }, // 252ms
            { key: 'translateX', val: 0, prog: 0.5 }, // 300ms
            { key: 'translateX', val: -3, prog: 0.58 }, // 348ms
            { key: 'translateX', val: 0, prog: 0.66 }, // 396ms
            { key: 'translateX', val: 3, prog: 0.75 }, // 450ms
            { key: 'translateX', val: 0, prog: 0.83 }, // 498ms
            { key: 'translateX', val: -3, prog: 0.92 }, // 552ms
            { key: 'translateX', val: 0, prog: 1 }, // 600ms
          ],
        },
      },
    ],
  };

  // Create incoming media (media2) with inverse burst fade and shake effects
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: media2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: media2.duration,
      },
    },
    effects: [
      // Burst fade effect - incoming image inverse pattern
      {
        id: 'incoming-shutter-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 }, // 0ms - hidden
            { key: 'opacity', val: 1, prog: 0.16 }, // 96ms - visible
            { key: 'opacity', val: 0, prog: 0.33 }, // 198ms - hidden
            { key: 'opacity', val: 1, prog: 0.5 }, // 300ms - visible
            { key: 'opacity', val: 0, prog: 0.66 }, // 396ms - hidden
            { key: 'opacity', val: 1, prog: 0.83 }, // 498ms - visible
            { key: 'opacity', val: 1, prog: 1 }, // 600ms - visible
          ],
        },
      },
      // Shake effect - same pattern as outgoing
      {
        id: 'incoming-shutter-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 }, // 0ms
            { key: 'translateX', val: 3, prog: 0.08 }, // 48ms
            { key: 'translateX', val: 0, prog: 0.16 }, // 96ms
            { key: 'translateX', val: -3, prog: 0.25 }, // 150ms
            { key: 'translateX', val: 0, prog: 0.33 }, // 198ms
            { key: 'translateX', val: 3, prog: 0.42 }, // 252ms
            { key: 'translateX', val: 0, prog: 0.5 }, // 300ms
            { key: 'translateX', val: -3, prog: 0.58 }, // 348ms
            { key: 'translateX', val: 0, prog: 0.66 }, // 396ms
            { key: 'translateX', val: 3, prog: 0.75 }, // 450ms
            { key: 'translateX', val: 0, prog: 0.83 }, // 498ms
            { key: 'translateX', val: -3, prog: 0.92 }, // 552ms
            { key: 'translateX', val: 0, prog: 1 }, // 600ms
          ],
        },
      },
    ],
  };

  // Create white flash overlay with 6 flash bursts
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background-color: white;"></div>',
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      // Flash burst 1 (0-100ms)
      {
        id: 'flash-burst-1',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Flash burst 2 (100-200ms)
      {
        id: 'flash-burst-2',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.1,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Flash burst 3 (200-300ms)
      {
        id: 'flash-burst-3',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.2,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Flash burst 4 (300-400ms)
      {
        id: 'flash-burst-4',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.3,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Flash burst 5 (400-500ms)
      {
        id: 'flash-burst-5',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.4,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Flash burst 6 (500-600ms)
      {
        id: 'flash-burst-6',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.5,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'shutter-burst-transition-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingMedia, incomingMedia, flashOverlay],
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
  id: 'shutter-burst-transition',
  title: 'Shutter Burst Transition',
  description:
    'Rapid shutter-speed burst transition that mimics high-speed camera capture between two images. Creates 6 rapid flash frames (100ms each) during a 600ms transition with alternating image visibility, white flash overlays, and subtle shake effects. Features sharp, linear timing with no easing for a mechanical camera feel. Perfect for tech reviews, photography channels, or energetic content transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shutter', 'burst', 'camera', 'photography', 'tech'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const shutterBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
