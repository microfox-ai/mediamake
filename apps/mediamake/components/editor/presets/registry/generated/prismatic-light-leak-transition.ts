/**
 * Prismatic Light Leak Transition Preset
 *
 * Creates a prismatic transition effect where video appears to refract through a prism.
 * Features diagonal rainbow bands sweeping at 45-degree angles with RGB channel separation.
 *
 * Features:
 * - Diagonal rainbow spectrum bands (7 colors: red through violet)
 * - RGB channel separation effects on outgoing/incoming videos
 * - Varied sweep speeds for prismatic dispersion effect
 * - Customizable transition duration and intensity
 * - Smooth blend modes for additive color mixing
 *
 * Use cases:
 * - Creative transitions between video clips
 * - Music video effects and color transitions
 * - Light-based scene changes
 * - Artistic video montages
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('The video transitioning out'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('The video transitioning in'),
  
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Duration of the prismatic transition effect in seconds'),
  
  prismIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of the prismatic color bands (0-1)'),
  
  rgbSeparation: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Amount of RGB channel separation in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- EXECUTION ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    prismIntensity,
    rgbSeparation,
  } = params;

  // Calculate total duration (videos overlap during transition)
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Create RGB channel layers
  const createRGBLayers = (
    video: { src: string; duration: number },
    prefix: 'outgoing' | 'incoming',
    startTime: number,
    layerDuration: number,
  ): RenderableComponentData[] => {
    const isOutgoing = prefix === 'outgoing';
    
    return [
      // Red channel (hue-rotate: 0deg)
      {
        id: `${prefix}-rgb-red`,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          fit: 'cover',
          className: 'absolute inset-0 mix-blend-screen',
          style: {
            filter: 'hue-rotate(0deg)',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: layerDuration,
          },
        },
        effects: [
          {
            id: `${prefix}-red-effect`,
            componentId: 'generic',
            data: {
              type: isOutgoing ? 'ease-out' : 'ease-in',
              start: isOutgoing ? layerDuration - transitionDuration : 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`${prefix}-rgb-red`],
              ranges: [
                {
                  key: 'opacity',
                  val: isOutgoing ? 0.6 : 0,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: isOutgoing ? 0 : 0.6,
                  prog: 1,
                },
                {
                  key: 'translateX',
                  val: isOutgoing ? 0 : -rgbSeparation,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: isOutgoing ? -rgbSeparation : 0,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      
      // Green channel (hue-rotate: 120deg)
      {
        id: `${prefix}-rgb-green`,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          fit: 'cover',
          className: 'absolute inset-0 mix-blend-screen',
          style: {
            filter: 'hue-rotate(120deg)',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: layerDuration,
          },
        },
        effects: [
          {
            id: `${prefix}-green-effect`,
            componentId: 'generic',
            data: {
              type: isOutgoing ? 'ease-out' : 'ease-in',
              start: isOutgoing ? layerDuration - transitionDuration : 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`${prefix}-rgb-green`],
              ranges: [
                {
                  key: 'opacity',
                  val: isOutgoing ? 0.6 : 0,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: isOutgoing ? 0 : 0.6,
                  prog: 1,
                },
                {
                  key: 'translateX',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: 0,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      
      // Blue channel (hue-rotate: 240deg)
      {
        id: `${prefix}-rgb-blue`,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          fit: 'cover',
          className: 'absolute inset-0 mix-blend-screen',
          style: {
            filter: 'hue-rotate(240deg)',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: layerDuration,
          },
        },
        effects: [
          {
            id: `${prefix}-blue-effect`,
            componentId: 'generic',
            data: {
              type: isOutgoing ? 'ease-out' : 'ease-in',
              start: isOutgoing ? layerDuration - transitionDuration : 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`${prefix}-rgb-blue`],
              ranges: [
                {
                  key: 'opacity',
                  val: isOutgoing ? 0.6 : 0,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: isOutgoing ? 0 : 0.6,
                  prog: 1,
                },
                {
                  key: 'translateX',
                  val: isOutgoing ? 0 : rgbSeparation,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: isOutgoing ? rgbSeparation : 0,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ];
  };

  // Helper: Create prism band
  const createPrismBand = (
    color: string,
    index: number,
    speedMultiplier: number,
  ): RenderableComponentData => {
    const topOffset = -8 + index * 2; // Stagger bands vertically
    
    return {
      id: `prism-band-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: 100%; height: 100%; background: linear-gradient(to bottom right, ${color}, rgba(0,0,0,0));'></div>`,
        className: 'absolute w-full h-32 transform rotate-45',
        style: {
          top: `${topOffset}rem`,
          left: '-50%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `prism-sweep-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration * speedMultiplier,
            mode: 'provider',
            targetIds: [`prism-band-${index}`],
            ranges: [
              {
                key: 'translateX',
                val: 0,
                prog: 0,
              },
              {
                key: 'translateX',
                val: 300,
                prog: 1,
              },
              {
                key: 'translateY',
                val: 0,
                prog: 0,
              },
              {
                key: 'translateY',
                val: 300,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Spectrum colors with opacity based on prismIntensity
  const spectrumColors = [
    `rgba(255, 0, 0, ${prismIntensity})`,      // Red
    `rgba(255, 165, 0, ${prismIntensity})`,    // Orange
    `rgba(255, 255, 0, ${prismIntensity})`,    // Yellow
    `rgba(0, 255, 0, ${prismIntensity})`,      // Green
    `rgba(0, 0, 255, ${prismIntensity})`,      // Blue
    `rgba(75, 0, 130, ${prismIntensity})`,     // Indigo
    `rgba(148, 0, 211, ${prismIntensity})`,    // Violet
  ];

  // Speed multipliers for varied sweep speeds (1.0 to 0.57)
  const speedMultipliers = [1.0, 0.93, 0.86, 0.79, 0.71, 0.64, 0.57];

  // Create prism bands
  const prismBands = spectrumColors.map((color, index) =>
    createPrismBand(color, index, speedMultipliers[index])
  );

  // Build composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing video base layer
    {
      id: 'outgoing-video-base',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-base-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-base'],
            ranges: [
              {
                key: 'opacity',
                val: 1,
                prog: 0,
              },
              {
                key: 'opacity',
                val: 0,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Outgoing RGB layers
    ...createRGBLayers(
      outgoingVideo,
      'outgoing',
      0,
      outgoingVideo.duration
    ),
    
    // Incoming video base layer
    {
      id: 'incoming-video-base',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'absolute inset-0',
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-base-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-base'],
            ranges: [
              {
                key: 'opacity',
                val: 0,
                prog: 0,
              },
              {
                key: 'opacity',
                val: 1,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Incoming RGB layers
    ...createRGBLayers(
      incomingVideo,
      'incoming',
      outgoingVideo.duration - transitionDuration,
      incomingVideo.duration + transitionDuration
    ),
    
    // Prism bands container
    {
      id: 'prism-bands-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: prismBands,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'prismatic-light-leak-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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

// --- METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'prismatic-light-leak-transition',
  title: 'Prismatic Light Leak Transition',
  description:
    'A 1.4-second prismatic transition where video refracts through a prism with diagonal rainbow bands and RGB channel separation effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'prism',
    'rainbow',
    'rgb-split',
    'light-leak',
    'chromatic',
    'refraction',
    'spectrum',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.4,
    prismIntensity: 0.6,
    rgbSeparation: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- EXPORT ---

export const prismaticLightLeakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
