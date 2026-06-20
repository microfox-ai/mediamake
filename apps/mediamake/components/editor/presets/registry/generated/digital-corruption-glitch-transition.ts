/**
 * Digital Corruption Glitch Transition
 *
 * A horizontal slice glitch transition that creates a cascading digital corruption effect.
 * Features 6 asynchronous horizontal segments that displace left/right with varying delays,
 * RGB channel separation during overlap, and scattered assembly of incoming images.
 *
 * Features:
 * - 6 horizontal slice regions with randomized displacement patterns
 * - Asynchronous cascading glitch effect with staggered timing
 * - RGB channel separation using multiple image copies with blend modes
 * - Glitch-assembly animation for incoming image
 * - Random white flash frames simulating digital interference
 * - 0.5 second transition overlap period
 *
 * Use cases:
 * - Digital corruption/glitch transition effects
 * - Tech-themed video transitions
 * - Cyberpunk or futuristic content
 * - Music video transitions
 * - Social media content with edgy aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  scene1: z.object({
    src: z.string().describe('Source URL of the first scene/image'),
    type: z.enum(['image', 'video']).default('image').describe('Media type for scene 1'),
    duration: z.number().describe('Duration of scene 1 in seconds'),
  }).describe('First scene configuration'),
  scene2: z.object({
    src: z.string().describe('Source URL of the second scene/image'),
    type: z.enum(['image', 'video']).default('image').describe('Media type for scene 2'),
    duration: z.number().describe('Duration of scene 2 in seconds'),
  }).describe('Second scene configuration'),
  transitionDuration: z.number().default(0.5).describe('Duration of the transition overlap in seconds'),
  glitchIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity multiplier for glitch displacement'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { scene1, scene2, transitionDuration, glitchIntensity } = params;

  // Calculate total duration
  const totalDuration = scene1.duration + scene2.duration - transitionDuration;

  // Transition timing
  const transitionStart = scene1.duration - transitionDuration;

  // Randomized horizontal displacements for 6 slices
  const sliceDisplacements = [-40, 60, -25, 45, -55, 30].map(
    val => val * (glitchIntensity || 1)
  );

  // Staggered start times for slice effects (relative to transition start)
  const sliceStarts = [0, 0.08, 0.15, 0.22, 0.3, 0.4];

  // RGB channel separation offsets
  const rgbOffsets = {
    red: -3,
    blue: 3,
  };

  // White flash timings (random intervals during transition)
  const flashTimings = [0.1, 0.25, 0.42]; // Relative to transition start

  // Helper: Create slice effect for outgoing image
  const createSliceEffect = (
    sliceIndex: number,
    targetId: string,
  ) => {
    return {
      id: `outgoing-slice-${sliceIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: transitionStart + sliceStarts[sliceIndex],
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: `${sliceDisplacements[sliceIndex]}px`, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.8 },
        ],
      },
    };
  };

  // Create 6 slice containers for outgoing image
  const outgoingSlices = Array.from({ length: 6 }, (_, i) => {
    const sliceHeight = 100 / 6;
    const sliceTop = i * sliceHeight;

    return {
      id: `outgoing-slice-container-${i}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            top: `${sliceTop}%`,
            left: 0,
            width: '100%',
            height: `${sliceHeight}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: scene1.duration,
        },
      },
      childrenData: [
        {
          id: `outgoing-slice-image-${i}`,
          type: 'atom' as const,
          componentId: scene1.type === 'video' ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: scene1.src,
            className: 'absolute inset-0 w-full h-full object-cover',
            style: {
              top: `${-sliceTop}%`,
              height: '600%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: scene1.duration,
            },
          },
          effects: [createSliceEffect(i, `outgoing-slice-image-${i}`)],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // RGB channel layers (red and blue)
  const rgbChannels: RenderableComponentData[] = [
    {
      id: 'outgoing-red-channel',
      type: 'atom' as const,
      componentId: scene1.type === 'video' ? 'VideoAtom' : 'ImageAtom',
      data: {
        src: scene1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: scene1.duration,
        },
      },
      effects: [
        {
          id: 'red-channel-effect',
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: ['outgoing-red-channel'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${rgbOffsets.red}px`, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'outgoing-blue-channel',
      type: 'atom' as const,
      componentId: scene1.type === 'video' ? 'VideoAtom' : 'ImageAtom',
      data: {
        src: scene1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'multiply',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: scene1.duration,
        },
      },
      effects: [
        {
          id: 'blue-channel-effect',
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider' as const,
            targetIds: ['outgoing-blue-channel'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${rgbOffsets.blue}px`, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Incoming image with glitch assembly
  const incomingImage: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom' as const,
    componentId: scene2.type === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: scene2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: scene2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-glitch-assembly',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'translateX', val: '80px', prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.2 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // White flash elements
  const whiteFlashes = flashTimings.map((timing, index) => {
    return {
      id: `white-flash-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 bg-white pointer-events-none',
          style: {
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart + timing,
          duration: 0.05,
        },
      },
      effects: [
        {
          id: `flash-effect-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: 0,
            duration: 0.05,
            mode: 'provider' as const,
            targetIds: [`white-flash-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'digital-corruption-glitch-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...outgoingSlices,
      ...rgbChannels,
      incomingImage,
      ...whiteFlashes,
    ] as RenderableComponentData[],
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
  id: 'digital-corruption-glitch-transition',
  title: 'Digital Corruption Glitch Transition',
  description:
    'A horizontal slice glitch transition with RGB channel separation, random displacement patterns, and digital interference flashes. Features 6 asynchronous horizontal segments that displace left/right with cascading delays, chromatic aberration effects during 0.5s overlap, and scattered assembly of incoming images with satisfying snap-in feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'digital',
    'corruption',
    'rgb-separation',
    'chromatic-aberration',
    'horizontal-slices',
    'cyberpunk',
  ],
  defaultInputParams: {
    scene1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    scene2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    transitionDuration: 0.5,
    glitchIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const digitalCorruptionGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
