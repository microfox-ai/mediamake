/**
 * Fashion Photography Studio Flash Transition Preset
 *
 * This preset recreates high-end editorial shooting conditions with sophisticated studio strobe lighting.
 * Features sequential flash heads (key light, fill light, rim light) that reveal different aspects
 * of the incoming video with varying intensities. Includes artistic prism effects at peak flash
 * and fashion photography color grading for a polished, editorial look.
 *
 * Features:
 * - Professional studio strobe simulation with pure, even white light
 * - Sequential flash sequence: key light → fill light → rim light
 * - Directional gradient patterns for realistic studio lighting
 * - Rainbow prism effect at peak flash for artistic flair
 * - Fashion photography color grading (desaturated, high contrast)
 * - Soft vignette overlay for editorial framing
 * - Precise timing control between flash pops
 * - Smooth falloff at edges using gradient feathering
 *
 * Use cases:
 * - High-end fashion video transitions
 * - Editorial content with sophisticated visual style
 * - Professional photography showcase reels
 * - Luxury brand video content
 * - Artistic video transitions with controlled elegance
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL or path of the outgoing video'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL or path of the incoming video'),
  outgoingVideoDuration: z
    .number()
    .positive()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .positive()
    .describe('Duration of the incoming video in seconds'),
  overlapDuration: z
    .number()
    .positive()
    .default(1.0)
    .describe(
      'Duration of the transition overlap in seconds (flash sequence timing)',
    ),
  keyLightIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1.0)
    .describe('Intensity of the key light flash (center, main light)'),
  fillLightIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of the fill light flash (left side, softer)'),
  rimLightIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the rim light flash (right edge, accent)'),
  prismIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of the rainbow prism effect at peak flash'),
  colorGradeDuration: z
    .number()
    .positive()
    .default(0.5)
    .describe('Duration for color grade normalization in seconds'),
  flashInterval: z
    .number()
    .positive()
    .default(0.2)
    .describe('Time interval between flash pops in seconds'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of the vignette overlay (0 = none, 1 = maximum)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    overlapDuration,
    keyLightIntensity,
    fillLightIntensity,
    rimLightIntensity,
    prismIntensity,
    colorGradeDuration,
    flashInterval,
    vignetteIntensity,
  } = params;

  // Calculate total transition duration (overlap period)
  const transitionDuration = overlapDuration;
  const totalDuration = outgoingVideoDuration + incomingVideoDuration;

  // Calculate flash timings (sequential)
  const keyLightStart = outgoingVideoDuration - transitionDuration;
  const fillLightStart = keyLightStart + flashInterval;
  const rimLightStart = fillLightStart + flashInterval;
  const prismPeakStart = keyLightStart + 0.15; // During key light decay

  // Flash durations
  const keyLightDuration = 0.35; // 0.15s attack + 0.2s decay
  const fillLightDuration = 0.25; // 0.1s attack + 0.15s decay
  const rimLightDuration = 0.25; // 0.1s attack + 0.15s decay
  const prismDuration = 0.3;

  // Incoming video starts during transition
  const incomingVideoStart = keyLightStart;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideoDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container with fashion color grade
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: incomingVideoDuration + (transitionDuration - incomingVideoStart + outgoingVideoDuration - transitionDuration),
        },
      },
      effects: [
        // Fashion color grade that normalizes over time
        {
          id: 'color-grade-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: colorGradeDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              {
                key: 'filter',
                val: 'contrast(1.2) saturate(0.8)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'contrast(1) saturate(1)',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideoDuration + (transitionDuration - incomingVideoStart + outgoingVideoDuration - transitionDuration),
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Key light flash (center, main strobe)
    {
      id: 'key-light-flash',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: radial-gradient(ellipse 120% 100% at 50% 50%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0) 70%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: keyLightStart,
          duration: keyLightDuration,
        },
      },
      effects: [
        {
          id: 'key-light-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: keyLightDuration,
            mode: 'provider',
            targetIds: ['key-light-flash'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: keyLightIntensity, prog: 0.43 }, // Peak at 0.15s
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Fill light flash (left side, softer)
    {
      id: 'fill-light-flash',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: radial-gradient(ellipse 80% 100% at 20% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0) 60%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: fillLightStart,
          duration: fillLightDuration,
        },
      },
      effects: [
        {
          id: 'fill-light-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: fillLightDuration,
            mode: 'provider',
            targetIds: ['fill-light-flash'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: fillLightIntensity, prog: 0.4 }, // Peak at 0.1s
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Rim light flash (right edge, accent)
    {
      id: 'rim-light-flash',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: linear-gradient(90deg, rgba(255,255,255,0) 70%, rgba(255,255,255,0.95) 90%, rgba(255,255,255,1) 100%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: rimLightStart,
          duration: rimLightDuration,
        },
      },
      effects: [
        {
          id: 'rim-light-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: rimLightDuration,
            mode: 'provider',
            targetIds: ['rim-light-flash'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: rimLightIntensity, prog: 0.4 }, // Peak at 0.1s
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Prism effect (rainbow gradient at peak)
    {
      id: 'prism-effect',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,0,0,0.15) 0%, rgba(255,165,0,0.15) 16%, rgba(255,255,0,0.15) 33%, rgba(0,255,0,0.15) 50%, rgba(0,0,255,0.15) 66%, rgba(75,0,130,0.15) 83%, rgba(238,130,238,0.15) 100%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: prismPeakStart,
          duration: prismDuration,
        },
      },
      effects: [
        {
          id: 'prism-animation',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: prismDuration,
            mode: 'provider',
            targetIds: ['prism-effect'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: prismIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Vignette overlay (persistent editorial framing)
    {
      id: 'vignette-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(0,0,0,${vignetteIntensity}) 100%);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'fashion-flash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'fashion-studio-flash-transition',
  title: 'Fashion Photography Studio Flash Transition',
  description:
    'High-end editorial flash transition recreating professional studio strobe lighting. Features sequential key, fill, and rim light flashes with directional gradients, prism/rainbow effect at peak flash, fashion photography color grading on incoming footage, and soft vignette overlay. Designed for sophisticated, elegant transitions with precise timing between flash pops.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'flash',
    'studio',
    'fashion',
    'editorial',
    'photography',
    'strobe',
    'lighting',
    'elegant',
    'sophisticated',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    overlapDuration: 1.0,
    keyLightIntensity: 1.0,
    fillLightIntensity: 0.6,
    rimLightIntensity: 0.8,
    prismIntensity: 0.3,
    colorGradeDuration: 0.5,
    flashInterval: 0.2,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const fashionStudioFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
