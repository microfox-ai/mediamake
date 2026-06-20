/**
 * Deteriorating Film Stock Transition Preset
 *
 * This preset creates a realistic film deterioration transition that progressively degrades
 * from pristine to heavily damaged film stock, simulating years of wear, chemical deterioration,
 * and poor storage conditions. The outgoing video develops increasing amounts of vinegar syndrome
 * artifacts (wavy distortions), color fading (particularly in reds/magentas), and emulsion
 * bubbling effects. As the damage peaks, the incoming video emerges from beneath the deteriorating
 * layer, initially showing its own wear patterns before gradually clearing up.
 *
 * Features:
 * - Vinegar syndrome wavy distortions (CSS transform skew/scale)
 * - Progressive color fading (sepia, contrast reduction, brightness increase)
 * - Emulsion bubbling effects (multiple circular overlays with blur)
 * - Silver mirroring (metallic sheen in dark areas via gradient overlay)
 * - Base scratches that accumulate over time (vertical lines increasing in opacity)
 * - Brittleness artifacts of deteriorating acetate film
 * - 2.5s overlap duration for gradual deterioration
 * - Incoming video starts with moderate damage and cleans up over 1s
 *
 * Technical Implementation:
 * - BaseLayout with 2.5s total duration
 * - Outgoing video: Progressive filter animations over 1.8s
 * - Deterioration overlay layer with emulsion bubbles, scratches, and silver mirroring
 * - Incoming video: Emerges at 1.2s with damage effects that clear up
 * - All effects use mode: 'provider' with targetIds
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;

  // Calculate timing
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;
  const outgoingDuration = 1.8; // Progressive deterioration duration
  const incomingStart = 1.2; // When incoming video emerges
  const incomingDuration = 1.3; // Incoming video cleanup duration

  // Helper function to create emulsion bubbles
  const createEmulsionBubbles = (): RenderableComponentData[] => {
    const bubbles = [
      { size: 40, top: '15%', left: '20%', opacity: 0.5, delay: 0, duration: 1.5 },
      { size: 30, top: '45%', left: '65%', opacity: 0.4, delay: 0.1, duration: 1.4 },
      { size: 50, top: '70%', left: '30%', opacity: 0.6, delay: 0.2, duration: 1.3 },
      { size: 35, top: '25%', left: '80%', opacity: 0.45, delay: 0.3, duration: 1.2 },
      { size: 45, top: '55%', left: '10%', opacity: 0.55, delay: 0.4, duration: 1.1 },
      { size: 38, top: '85%', left: '75%', opacity: 0.48, delay: 0.5, duration: 1.0 },
      { size: 42, top: '35%', left: '45%', opacity: 0.52, delay: 0.6, duration: 0.9 },
      { size: 32, top: '60%', left: '90%', opacity: 0.42, delay: 0.7, duration: 0.8 },
    ];

    return bubbles.map((bubble, index) => ({
      id: `bubble-${index + 1}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${bubble.size}px; height: ${bubble.size}px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), rgba(200,200,200,0.3)); filter: blur(2px);"></div>`,
        className: 'absolute',
        style: {
          top: bubble.top,
          left: bubble.left,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: bubble.delay,
          duration: bubble.duration,
        },
      },
      effects: [
        {
          id: `bubble-${index + 1}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.6,
            mode: 'provider',
            targetIds: [`bubble-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: bubble.opacity, prog: 1 },
            ],
          },
        },
        ...(index === 0 ? [{
          id: `bubble-${index + 1}-scale-pulse`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0.3,
            duration: 1.2,
            mode: 'provider',
            targetIds: [`bubble-${index + 1}`],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 0.9, prog: 1 },
            ],
          },
        }] : []),
      ],
    }));
  };

  // Helper function to create scratches
  const createScratches = (): RenderableComponentData[] => {
    const scratches = [
      { height: '100%', top: '0%', left: '25%', opacity: 0.6, delay: 0, duration: 2.0 },
      { height: '70%', top: '10%', left: '55%', opacity: 0.5, delay: 0.2, duration: 1.8 },
      { height: '80%', top: '5%', left: '78%', opacity: 0.55, delay: 0.4, duration: 1.6 },
      { height: '90%', top: '0%', left: '12%', opacity: 0.58, delay: 0.6, duration: 1.4 },
      { height: '85%', top: '8%', left: '42%', opacity: 0.52, delay: 0.8, duration: 1.2 },
      { height: '75%', top: '12%', left: '88%', opacity: 0.48, delay: 1.0, duration: 1.0 },
    ];

    return scratches.map((scratch, index) => ({
      id: `scratch-${index + 1}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 1px; height: ${scratch.height}; background: rgba(255,255,255,0.4);"></div>`,
        className: 'absolute',
        style: {
          top: scratch.top,
          left: scratch.left,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: scratch.delay,
          duration: scratch.duration,
        },
      },
      effects: [
        {
          id: `scratch-${index + 1}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: Math.min(1.2, scratch.duration),
            mode: 'provider',
            targetIds: [`scratch-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: scratch.opacity, prog: 1 },
            ],
          },
        },
      ],
    }));
  };

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video layer
    {
      id: 'outgoing-video-layer',
      type: 'layout' as const,
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
          start: 0,
          duration: outgoingDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
          effects: [
            {
              id: 'outgoing-video-sepia',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: outgoingDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'sepia', val: 0, prog: 0 },
                  { key: 'sepia', val: 0.4, prog: 1 },
                ],
              },
            },
            {
              id: 'outgoing-video-contrast',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: outgoingDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'contrast', val: 1, prog: 0 },
                  { key: 'contrast', val: 0.7, prog: 1 },
                ],
              },
            },
            {
              id: 'outgoing-video-brightness',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: outgoingDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'brightness', val: 1, prog: 0 },
                  { key: 'brightness', val: 1.3, prog: 1 },
                ],
              },
            },
            {
              id: 'outgoing-video-warp-skew',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0.5,
                duration: 1.3,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'skewY', val: 0, prog: 0 },
                  { key: 'skewY', val: 1.5, prog: 0.5 },
                  { key: 'skewY', val: -1, prog: 1 },
                ],
              },
            },
            {
              id: 'outgoing-video-scale-warp',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0.5,
                duration: 1.3,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'scaleX', val: 1, prog: 0 },
                  { key: 'scaleX', val: 1.02, prog: 0.3 },
                  { key: 'scaleX', val: 0.98, prog: 0.7 },
                  { key: 'scaleX', val: 1.01, prog: 1 },
                ],
              },
            },
            {
              id: 'outgoing-video-opacity-fade',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 1.3,
                duration: 0.5,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    },

    // Deterioration overlay layer
    {
      id: 'deterioration-overlay-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      childrenData: [
        // Emulsion bubbles container
        {
          id: 'emulsion-bubbles-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: 0.5,
              duration: 1.5,
            },
          },
          childrenData: createEmulsionBubbles(),
        },

        // Scratches container
        {
          id: 'scratches-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: 0.3,
              duration: 2.0,
            },
          },
          childrenData: createScratches(),
        },

        // Silver mirroring overlay
        {
          id: 'silver-mirroring-overlay',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(192,192,192,0.4) 0%, rgba(128,128,128,0.2) 30%, transparent 60%); mix-blend-mode: screen; pointer-events: none;"></div>',
            className: 'absolute inset-0',
            style: {
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0.8,
              duration: 1.2,
            },
          },
          effects: [
            {
              id: 'silver-mirror-fade-in',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: 1.0,
                mode: 'provider',
                targetIds: ['silver-mirroring-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.3, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    },

    // Incoming video layer
    {
      id: 'incoming-video-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 0,
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
          effects: [
            {
              id: 'incoming-video-initial-sepia',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 1.0,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'sepia', val: 0.2, prog: 0 },
                  { key: 'sepia', val: 0, prog: 1 },
                ],
              },
            },
            {
              id: 'incoming-video-initial-blur',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 1.0,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'blur', val: 3, prog: 0 },
                  { key: 'blur', val: 0, prog: 1 },
                ],
              },
            },
            {
              id: 'incoming-video-opacity-fade-in',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: 0.5,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'film-deterioration-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
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
  id: 'film-deterioration-transition',
  title: 'Deteriorating Film Stock Transition',
  description:
    'A realistic film deterioration transition that progressively degrades from pristine to heavily damaged (vinegar syndrome, color fading, emulsion bubbles, silver mirroring, scratches) before the incoming video emerges and clears up. Uses authentic acetate film aging effects with warping, distortions, and chemical deterioration artifacts.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'film', 'deterioration', 'vintage', 'vinegar-syndrome', 'acetate', 'damage', 'aging'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const filmDeteriorationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
