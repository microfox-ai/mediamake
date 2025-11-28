/**
 * Multi-Spin Card Flip Transition Preset
 *
 * This preset creates a rapid multi-spin card flip transition where the YouTube thumbnail
 * spins multiple times (2-3 full rotations) before landing on the new image. This creates
 * a slot-machine or dramatic reveal effect.
 *
 * Features:
 * - Multi-spin rotation: Outgoing image spins 0° → 360° with acceleration
 * - Seamless swap at midpoint: Images swap at 50% of transition
 * - Continuing rotation: Incoming image spins 360° → 720° with deceleration
 * - Motion blur: Peak blur during fastest spinning phase
 * - Speed streak overlays: Horizontal motion lines during peak velocity
 * - Perspective depth: 800px perspective for 3D rotation effect
 *
 * Use cases:
 * - Dramatic transitions between video thumbnails
 * - Slot-machine reveal effects
 * - High-energy content transitions
 * - Gaming or sports content transitions
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
  image1: z
    .object({
      src: z.string().describe('Source URL of the first/outgoing image'),
      duration: z.number().describe('Duration in seconds for the first image'),
    })
    .describe('First image configuration'),
  image2: z
    .object({
      src: z.string().describe('Source URL of the second/incoming image'),
      duration: z.number().describe('Duration in seconds for the second image'),
    })
    .describe('Second image configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of the multi-spin transition overlap in seconds'),
  perspective: z
    .number()
    .min(400)
    .max(1200)
    .default(800)
    .describe('CSS perspective value for 3D rotation effect (in pixels)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(6)
    .describe('Maximum blur intensity during peak spinning phase (in pixels)'),
  speedLinesOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Maximum opacity of speed streak overlays'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image1,
    image2,
    transitionDuration,
    perspective,
    blurIntensity,
    speedLinesOpacity,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = image1.duration + image2.duration - transitionDuration;

  // Helper function to create speed line HTML
  const createSpeedLine = (top: string, height: string): string => {
    return `<div style="position:absolute;top:${top};left:0;width:100%;height:${height};background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)"></div>`;
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing image (first half: 0% → 50%)
    {
      id: 'outgoing-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'w-full h-full object-cover',
        style: {
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        // Rotate from 0deg → 360deg with ease-in (acceleration)
        {
          id: 'outgoing-rotate',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: image1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 360, prog: 1 },
            ],
          },
        },
        // Fade out sharply at the end (48% → 50%)
        {
          id: 'outgoing-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: image1.duration - transitionDuration * 0.04,
            duration: transitionDuration * 0.04,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Z-index swap at midpoint
        {
          id: 'outgoing-zindex',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: image1.duration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'zIndex', val: 10, prog: 0 },
              {
                key: 'zIndex',
                val: 10,
                prog: (image1.duration - transitionDuration / 2) / image1.duration,
              },
              {
                key: 'zIndex',
                val: 1,
                prog:
                  (image1.duration - transitionDuration / 2 + 0.001) /
                  image1.duration,
              },
            ],
          },
        },
        // Blur effect (0 → peak → 0) during rotation
        {
          id: 'outgoing-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: image1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'blur', val: 0, prog: 0 },
              { key: 'blur', val: blurIntensity, prog: 0.5 },
              { key: 'blur', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming image (second half: 50% → 100%)
    {
      id: 'incoming-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'w-full h-full object-cover',
        style: {
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: image1.duration - transitionDuration / 2,
          duration: image2.duration + transitionDuration / 2,
        },
      },
      effects: [
        // Continue rotation from 360deg → 720deg with ease-out (deceleration)
        {
          id: 'incoming-rotate',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'rotateY', val: 360, prog: 0 },
              { key: 'rotateY', val: 720, prog: 1 },
            ],
          },
        },
        // Fade in sharply at start (50% → 52%)
        {
          id: 'incoming-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration * 0.04,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Z-index swap at midpoint (becomes top layer)
        {
          id: 'incoming-zindex',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: image2.duration + transitionDuration / 2,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'zIndex', val: 1, prog: 0 },
              {
                key: 'zIndex',
                val: 1,
                prog:
                  (transitionDuration / 2) /
                  (image2.duration + transitionDuration / 2),
              },
              {
                key: 'zIndex',
                val: 10,
                prog:
                  (transitionDuration / 2 + 0.001) /
                  (image2.duration + transitionDuration / 2),
              },
            ],
          },
        },
        // Blur effect continuing from peak
        {
          id: 'incoming-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'blur', val: blurIntensity, prog: 0 },
              { key: 'blur', val: blurIntensity, prog: 0.5 },
              { key: 'blur', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Speed lines container (visible during fastest spinning phase)
    {
      id: 'speed-lines-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: image1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // Fade in and out during peak spinning (30% → 70%)
        {
          id: 'speed-lines-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['speed-lines-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.3 },
              { key: 'opacity', val: speedLinesOpacity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Speed line 1
        {
          id: 'speed-line-1',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: createSpeedLine('20%', '2px'),
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'speed-line-1-translate',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['speed-line-1'],
                ranges: [
                  { key: 'translateX', val: '-100%', prog: 0 },
                  { key: 'translateX', val: '100%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Speed line 2
        {
          id: 'speed-line-2',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: createSpeedLine('40%', '3px'),
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'speed-line-2-translate',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['speed-line-2'],
                ranges: [
                  { key: 'translateX', val: '-120%', prog: 0 },
                  { key: 'translateX', val: '120%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Speed line 3
        {
          id: 'speed-line-3',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: createSpeedLine('60%', '2px'),
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'speed-line-3-translate',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['speed-line-3'],
                ranges: [
                  { key: 'translateX', val: '-90%', prog: 0 },
                  { key: 'translateX', val: '90%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Speed line 4
        {
          id: 'speed-line-4',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: createSpeedLine('80%', '3px'),
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'speed-line-4-translate',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['speed-line-4'],
                ranges: [
                  { key: 'translateX', val: '-110%', prog: 0 },
                  { key: 'translateX', val: '110%', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'multi-spin-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: `${perspective}px`,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'multi-spin-card-flip',
  title: 'Multi-Spin Card Flip Transition',
  description:
    'Rapid multi-spin card flip transition where images spin 2-3 full rotations (720°) before landing. Creates a slot-machine or dramatic reveal effect with accelerating rotation, motion blur during peak velocity, and speed streak overlays. The outgoing image spins with acceleration (0→360°), swaps at midpoint, then incoming image continues spinning (360→720°) with deceleration. Includes radial motion lines during fastest spinning phase for enhanced dynamic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'spin', 'card-flip', 'dramatic', 'slot-machine', 'reveal'],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 1.2,
    perspective: 800,
    blurIntensity: 6,
    speedLinesOpacity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const multiSpinCardFlipPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
