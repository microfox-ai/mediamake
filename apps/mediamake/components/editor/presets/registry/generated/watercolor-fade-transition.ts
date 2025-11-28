/**
 * Watercolor Fade Transition Preset
 *
 * This preset creates an artistic watercolor transition where videos blend like wet watercolor
 * paints merging on paper. Features a 3-second slow overlap with semi-transparent videos, color
 * mixing via blend modes, noise texture overlay for paper grain, animated wet spots that simulate
 * watercolor pooling and drying, and gentle organic movements (rotation and scale) that mimic
 * paint settling on wet paper. The overall effect is dreamy and artistic rather than precise.
 *
 * Features:
 * - **3-Second Overlap**: Both videos overlap for 3 seconds with opacity animations
 * - **Color Mixing**: Uses mix-blend-mode: screen for natural watercolor color blending
 * - **Paper Texture**: Semi-transparent noise overlay simulates paper grain
 * - **Wet Spots**: 5-7 animated wet spots with radial gradients that scale and fade
 * - **Organic Movement**: Subtle rotation (±1deg) and scale (0.98-1.02) with long durations (4-6s)
 * - **Dreamy Aesthetic**: Soft, artistic transitions perfect for creative content
 *
 * Use cases:
 * - Creating artistic video transitions with watercolor aesthetics
 * - Building dreamy, creative video content with organic movements
 * - Adding unique, painterly transitions to videos
 * - Professional artistic video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1Src: z.string().describe('Source URL of the first (outgoing) video'),
  video1Duration: z.number().describe('Duration of the first video in seconds'),
  video2Src: z.string().describe('Source URL of the second (incoming) video'),
  video2Duration: z.number().describe('Duration of the second video in seconds'),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of the watercolor transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1Src, video1Duration, video2Src, video2Duration, transitionDuration } = params;

  // Calculate total duration: sum of both videos minus overlap
  const totalDuration = video1Duration + video2Duration - transitionDuration;

  // Helper: Create wet spot components
  const createWetSpots = (): RenderableComponentData[] => {
    const wetSpotConfigs = [
      { size: 150, top: '15%', left: '20%', delay: 0, duration: 5 },
      { size: 200, top: '45%', right: '25%', delay: 0.3, duration: 6 },
      { size: 180, bottom: '20%', left: '30%', delay: 0.6, duration: 5.5 },
      { size: 160, top: '30%', left: '50%', delay: 0.9, duration: 5 },
      { size: 170, bottom: '35%', right: '15%', delay: 1.2, duration: 6 },
      { size: 140, top: '60%', left: '40%', delay: 1.5, duration: 5.5 },
      { size: 190, top: '10%', right: '35%', delay: 1.8, duration: 6 },
    ];

    return wetSpotConfigs.map((config, index) => {
      const wetSpotId = `wet-spot-${index + 1}`;
      const positionStyle: Record<string, string> = {};
      
      if (config.top) positionStyle.top = config.top;
      if (config.bottom) positionStyle.bottom = config.bottom;
      if (config.left) positionStyle.left = config.left;
      if (config.right) positionStyle.right = config.right;

      return {
        id: wetSpotId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${config.size}px; height: ${config.size}px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);"></div>`,
          className: 'absolute pointer-events-none',
          style: positionStyle,
        },
        context: {
          timing: {
            start: video1Duration - transitionDuration + config.delay,
            duration: transitionDuration - config.delay,
          },
        },
        effects: [
          {
            id: `${wetSpotId}-animation`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: config.duration,
              mode: 'provider',
              targetIds: [wetSpotId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.5, prog: 0.5 },
                { key: 'scale', val: 1.2, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.3, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Outgoing video (video1)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1Src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      muted: false,
    },
    context: {
      timing: {
        start: 0,
        duration: video1Duration,
      },
    },
    effects: [
      // Fade out during transition
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1Duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Subtle rotation during transition
      {
        id: 'outgoing-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1Duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -1, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Subtle scale during transition
      {
        id: 'outgoing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1Duration - transitionDuration,
          duration: 4,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.98, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video (video2)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2Src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      muted: false,
      style: {
        mixBlendMode: 'screen', // Color mixing effect
      },
    },
    context: {
      timing: {
        start: video1Duration - transitionDuration,
        duration: video2Duration + transitionDuration,
      },
    },
    effects: [
      // Fade in during transition
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Subtle rotation during transition
      {
        id: 'incoming-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 1, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Subtle scale during transition
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 5,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 1.02, prog: 0 },
            { key: 'scale', val: 1, prog: 0.5 },
            { key: 'scale', val: 1.02, prog: 1 },
          ],
        },
      },
    ],
  };

  // Paper texture overlay
  const paperTexture: RenderableComponentData = {
    id: 'paper-texture',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-white/5 to-transparent',
      },
    },
    context: {
      timing: {
        start: video1Duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: [],
  };

  // Wet spots container
  const wetSpotsContainer: RenderableComponentData = {
    id: 'wet-spots-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: video1Duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: createWetSpots(),
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-transition-root',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideo,
      incomingVideo,
      paperTexture,
      wetSpotsContainer,
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
  id: 'watercolor-fade-transition',
  title: 'Watercolor Fade Transition',
  description:
    'An artistic watercolor transition where videos blend like wet paint merging on paper. Features 3-second overlap with semi-transparency, color mixing via blend modes, noise texture for paper grain, animated wet spots that spread and fade, and gentle organic movements (rotation, scale) that mimic paint settling on wet paper. Dreamy and artistic aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'watercolor',
    'artistic',
    'fade',
    'blend',
    'organic',
    'dreamy',
    'creative',
  ],
  defaultInputParams: {
    video1Src: 'https://example.com/video1.mp4',
    video1Duration: 8,
    video2Src: 'https://example.com/video2.mp4',
    video2Duration: 8,
    transitionDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const watercolorFadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
