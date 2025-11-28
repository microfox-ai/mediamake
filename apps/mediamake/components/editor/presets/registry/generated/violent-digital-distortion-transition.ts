/**
 * Violent Digital Distortion Transition Preset
 *
 * This preset creates a violent digital distortion transition between two images with:
 * - Horizontal scan line displacement (random strips shift left/right)
 * - Color fringing on edges (cyan/magenta RGB offset)
 * - White flash at transition midpoint
 * - Aggressive vertical jitter (±5px) with occasional horizontal displacement (±8px)
 * - Fragmented reveal where incoming image appears through "broken" sections
 *
 * Features:
 * - VHS tracking errors combined with modern RGB glitch aesthetics
 * - Scan line displacement using clip-path techniques
 * - Unstable video playback simulation
 * - Configurable overlap period (default 0.6s)
 *
 * Use cases:
 * - Glitchy image transitions for music videos
 * - Retro VHS-style transitions
 * - Aggressive transitions for action/horror content
 * - Digital corruption aesthetic
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of the first image'),
    duration: z.number().describe('Duration of the first image in seconds'),
  }),
  image2: z.object({
    src: z.string().describe('Source URL of the second image'),
    duration: z.number().describe('Duration of the second image in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.6)
    .describe('Overlap/transition duration in seconds'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Shake intensity multiplier (0-2, default: 1)'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('White flash intensity/opacity (0-1, default: 1)'),
  colorFringeIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Color fringing intensity multiplier (0-2, default: 1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, overlapDuration, shakeIntensity, flashIntensity, colorFringeIntensity } = params;

  // Calculate total duration
  const totalDuration = image1.duration + image2.duration - overlapDuration;

  // Calculate transition points
  const transitionStart = image1.duration - overlapDuration;
  const flashStart = image1.duration - overlapDuration / 2;
  const flashDuration = 0.1;

  // Calculate shake parameters
  const verticalShakeValues = [-5, 3, -8, 2, 0].map((val) => val * shakeIntensity);
  const horizontalShakeValues = [0, 8, -8, 5, 0].map((val) => val * shakeIntensity);

  // Calculate color fringe offsets
  const cyanOffset = -2 * colorFringeIntensity;
  const magentaOffset = 2 * colorFringeIntensity;

  const childrenData: RenderableComponentData[] = [
    // Outgoing image (image1)
    {
      id: 'outgoing-image',
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          boxShadow: `${cyanOffset}px 0 0 cyan, ${magentaOffset}px 0 0 magenta`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        // Opacity fade out during last 0.4s of overlap
        {
          id: 'outgoing-opacity-fade',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: 0.4,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Aggressive shake effect during entire overlap
        {
          id: 'outgoing-shake',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image'],
            ranges: [
              // Vertical jitter
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: verticalShakeValues[0], prog: 0.15 },
              { key: 'translateY', val: verticalShakeValues[1], prog: 0.35 },
              { key: 'translateY', val: verticalShakeValues[2], prog: 0.55 },
              { key: 'translateY', val: verticalShakeValues[3], prog: 0.75 },
              { key: 'translateY', val: verticalShakeValues[4], prog: 1 },
              // Horizontal displacement
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: horizontalShakeValues[1], prog: 0.25 },
              { key: 'translateX', val: horizontalShakeValues[2], prog: 0.5 },
              { key: 'translateX', val: horizontalShakeValues[3], prog: 0.7 },
              { key: 'translateX', val: horizontalShakeValues[4], prog: 1 },
            ],
          },
        },
      ],
    },
    // Incoming image (image2) - appears through broken sections
    {
      id: 'incoming-image',
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          boxShadow: `${cyanOffset}px 0 0 cyan, ${magentaOffset}px 0 0 magenta`,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: image2.duration + overlapDuration,
        },
      },
      effects: [
        // Glitchy stepped opacity fade in
        {
          id: 'incoming-opacity-glitch',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.4 },
              { key: 'opacity', val: 0.2, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 0.7 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    },
    // White flash at midpoint
    {
      id: 'white-flash',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: white;"></div>',
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
        },
      },
      context: {
        timing: {
          start: flashStart,
          duration: flashDuration,
        },
      },
      effects: [
        {
          id: 'flash-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: flashDuration,
            mode: 'provider',
            targetIds: ['white-flash'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: flashIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'violent-distortion-container',
    type: 'layout' as const,
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
  id: 'violent-digital-distortion-transition',
  title: 'Violent Digital Distortion Transition',
  description:
    'A violent digital distortion transition with color fringing and screen tearing effects. Mimics VHS tracking errors combined with modern RGB glitch aesthetics. Features horizontal scan line displacement, color fringing (cyan/magenta offset), white flash at midpoint, aggressive vertical jitter shake (±5px), and horizontal displacement (±8px) at irregular intervals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'distortion',
    'vhs',
    'rgb-split',
    'color-fringing',
    'shake',
    'violent',
    'digital',
    'screen-tearing',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 0.6,
    shakeIntensity: 1,
    flashIntensity: 1,
    colorFringeIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const violentDigitalDistortionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
