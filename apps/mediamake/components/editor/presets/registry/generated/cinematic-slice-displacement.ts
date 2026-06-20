/**
 * Cinematic Horizontal Slice Displacement Transition Preset
 *
 * This preset creates a sophisticated horizontal slice displacement transition with a controlled,
 * rhythmic glitch aesthetic. It splits the frame into exactly 5 horizontal bands that offset in
 * an alternating wave-like pattern (top slice moves right, second moves left, etc.), creating
 * an elegant 'shutter' or 'blinds' effect.
 *
 * Features:
 * - 5 horizontal bands with alternating displacement directions
 * - Smooth ease-in-out curve with 60px maximum offset
 * - Subtle blur (2-4px) during movement for motion effect
 * - Slight scale reduction (0.98) for depth perception
 * - Opposite direction animation for incoming image
 * - Subtle vignette darkening that pulses during transition
 * - Staggered timing (0.08s per outgoing band, 0.1s per incoming band)
 * - 1.2 second transition duration
 *
 * Use cases:
 * - YouTube content transitions
 * - Professional video editing
 * - Cinematic scene changes
 * - Image slideshow transitions
 * - Dynamic visual storytelling
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
    src: z.string().describe('Source URL of the outgoing media (image or video)'),
    type: z.enum(['image', 'video']).describe('Type of the first media'),
    duration: z.number().describe('Duration of the first media in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the incoming media (image or video)'),
    type: z.enum(['image', 'video']).describe('Type of the second media'),
    duration: z.number().describe('Duration of the second media in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  maxOffset: z
    .number()
    .default(60)
    .describe('Maximum horizontal offset for slice displacement in pixels'),
  blurAmount: z
    .number()
    .default(3)
    .describe('Maximum blur amount during transition in pixels'),
  scaleReduction: z
    .number()
    .default(0.98)
    .describe('Scale reduction factor for depth effect (0-1)'),
  outgoingStagger: z
    .number()
    .default(0.08)
    .describe('Stagger delay between outgoing bands in seconds'),
  incomingStagger: z
    .number()
    .default(0.1)
    .describe('Stagger delay between incoming bands in seconds'),
  vignetteIntensity: z
    .number()
    .default(0.6)
    .describe('Maximum vignette opacity during transition (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    maxOffset,
    blurAmount,
    scaleReduction,
    outgoingStagger,
    incomingStagger,
    vignetteIntensity,
  } = params;

  // Calculate base layout duration (sum minus overlap)
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Helper function to create slice clip paths (5 bands, 20% height each)
  const getClipPath = (bandIndex: number): string => {
    const topPercent = bandIndex * 20;
    const bottomPercent = 100 - (bandIndex + 1) * 20;
    return `inset(${topPercent}% 0 ${bottomPercent}% 0)`;
  };

  // Helper function to determine component ID based on media type
  const getComponentId = (type: string): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Helper function to create outgoing band effects
  const createOutgoingBandEffects = (bandIndex: number, bandId: string) => {
    const direction = bandIndex % 2 === 0 ? maxOffset : -maxOffset; // Alternating pattern
    const staggerDelay = bandIndex * outgoingStagger;
    const effectStart = media1.duration - transitionDuration + staggerDelay;

    return [
      // Translate effect
      {
        id: `${bandId}-translate`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: effectStart,
          duration: transitionDuration - staggerDelay,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: direction, prog: 1 },
          ],
        },
      },
      // Blur effect
      {
        id: `${bandId}-blur`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: effectStart,
          duration: transitionDuration - staggerDelay,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'filter:blur', val: 0, prog: 0 },
            { key: 'filter:blur', val: blurAmount, prog: 0.5 },
            { key: 'filter:blur', val: 0, prog: 1 },
          ],
        },
      },
      // Scale effect
      {
        id: `${bandId}-scale`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: effectStart,
          duration: transitionDuration - staggerDelay,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleReduction, prog: 0.5 },
            { key: 'scale', val: scaleReduction - 0.02, prog: 1 },
          ],
        },
      },
      // Opacity effect
      {
        id: `${bandId}-opacity`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: effectStart,
          duration: transitionDuration - staggerDelay,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];
  };

  // Helper function to create incoming band effects
  const createIncomingBandEffects = (bandIndex: number, bandId: string) => {
    const direction = bandIndex % 2 === 0 ? -maxOffset : maxOffset; // Opposite pattern
    const staggerDelay = bandIndex * incomingStagger;

    return [
      // Translate effect
      {
        id: `${bandId}-translate`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: staggerDelay,
          duration: transitionDuration - staggerDelay,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'translateX', val: direction, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Blur effect
      {
        id: `${bandId}-blur`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: staggerDelay,
          duration: transitionDuration - staggerDelay,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'filter:blur', val: blurAmount, prog: 0 },
            { key: 'filter:blur', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity effect
      {
        id: `${bandId}-opacity`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: staggerDelay,
          duration: transitionDuration - staggerDelay,
          mode: 'provider',
          targetIds: [bandId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ];
  };

  // Create outgoing media bands (5 bands)
  const outgoingBands: RenderableComponentData[] = Array.from({ length: 5 }, (_, i) => {
    const bandId = `outgoing-band-${i + 1}`;
    return {
      id: bandId,
      type: 'atom',
      componentId: getComponentId(media1.type),
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          clipPath: getClipPath(i),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: createOutgoingBandEffects(i, bandId),
    } as RenderableComponentData;
  });

  // Create incoming media bands (5 bands)
  const incomingBands: RenderableComponentData[] = Array.from({ length: 5 }, (_, i) => {
    const bandId = `incoming-band-${i + 1}`;
    return {
      id: bandId,
      type: 'atom',
      componentId: getComponentId(media2.type),
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          clipPath: getClipPath(i),
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration + i * incomingStagger,
          duration: media2.duration + transitionDuration - i * incomingStagger,
        },
      },
      effects: createIncomingBandEffects(i, bandId),
    } as RenderableComponentData;
  });

  // Create vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: {
        boxShadow: `inset 0 0 100px 40px rgba(0, 0, 0, ${vignetteIntensity * 0.5})`,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'vignette-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: vignetteIntensity, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Combine all children
  const childrenData: RenderableComponentData[] = [
    ...outgoingBands,
    ...incomingBands,
    vignetteOverlay,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'cinematic-slice-displacement-container',
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
  id: 'cinematic-slice-displacement',
  title: 'Cinematic Horizontal Slice Displacement Transition',
  description:
    'A sophisticated horizontal slice displacement transition with 5 bands that create an elegant shutter/blinds effect. Features alternating wave-like offset patterns, smooth ease-in-out timing, subtle blur and scale effects, and a pulsing vignette overlay. Perfect for YouTube content and cinematic transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'slice',
    'displacement',
    'cinematic',
    'youtube',
    'shutter',
    'blinds',
    'glitch',
    'rhythmic',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/image1.jpg',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/image2.jpg',
      type: 'image',
      duration: 5,
    },
    transitionDuration: 1.2,
    maxOffset: 60,
    blurAmount: 3,
    scaleReduction: 0.98,
    outgoingStagger: 0.08,
    incomingStagger: 0.1,
    vignetteIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicSliceDisplacementPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
