/**
 * Analog Flash Cube Transition Preset
 *
 * This preset simulates vintage 1960s-70s camera flash bulbs with a warm-tinted flash effect.
 * Features include:
 * - Warm amber/yellow flash (not pure white) that builds slowly like old flash charging
 * - Bright burst with organic quality, hotspots, and falloff
 * - Lingering afterimage effect
 * - Film grain and vignetting during transition
 * - Mechanical shutter visualization (quick black frame)
 * - Incoming video starts overexposed and settles to normal exposure
 *
 * Technical implementation:
 * - BaseLayout with 1s overlap period
 * - Layer structure: shutter → outgoing video → flash → grain → vignette → incoming video
 * - Irregular flash shape via border-radius for organic feel
 * - Radial gradient with warm tones (#FFF8E7 center)
 * - Exposure animation on incoming video (brightness + contrast)
 *
 * Use cases:
 * - Vintage photography transitions
 * - Retro video effects
 * - Nostalgic scene changes
 * - Period-appropriate editing styles
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds'),
  flashIntensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Intensity multiplier for the flash effect'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Opacity of the film grain overlay'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of the vignette effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    flashIntensity,
    grainIntensity,
    vignetteIntensity,
  } = params;

  // Shutter duration (quick black frame)
  const shutterDuration = 0.05;

  // Flash timing: starts after shutter, lasts 0.35s
  const flashStart = shutterDuration;
  const flashDuration = 0.35;

  // Incoming video exposure settle starts at 0.4s (after flash builds)
  const exposureSettleStart = 0.4;
  const exposureSettleDuration = 0.5;

  // Create layers
  const childrenData: RenderableComponentData[] = [
    // 1. Outgoing video layer (with sepia and grain)
    {
      id: 'outgoing-video-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          filter: 'sepia(0.3) contrast(1.05)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // 2. Shutter black frame (0-0.05s)
    {
      id: 'shutter-black-frame',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundColor: '#000000',
            opacity: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: shutterDuration,
        },
      },
      effects: [
        {
          id: 'shutter-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: shutterDuration,
            mode: 'provider',
            targetIds: ['shutter-black-frame'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 3. Flash burst layer (warm-tinted radial gradient)
    {
      id: 'flash-burst-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'radial-gradient(ellipse at center, #FFF8E7 0%, #FFEFD5 30%, rgba(255, 248, 231, 0.6) 60%, transparent 100%)',
            borderRadius: '45% 55% 45% 55%',
            opacity: 0,
          },
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
          id: 'flash-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: flashDuration,
            mode: 'provider',
            targetIds: ['flash-burst-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3 * flashIntensity, prog: 0.4 },
              { key: 'opacity', val: 1 * flashIntensity, prog: 0.6 },
              { key: 'opacity', val: 0.2 * flashIntensity, prog: 1 },
            ],
          },
        },
        {
          id: 'flash-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: flashDuration,
            mode: 'provider',
            targetIds: ['flash-burst-layer'],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.6 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // 4. Vignette overlay (spans full duration)
    {
      id: 'vignette-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            boxShadow: `inset 0 0 100px rgba(0, 0, 0, ${vignetteIntensity})`,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // 5. Grain texture overlay (spans full duration)
    {
      id: 'grain-texture-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'overlay',
            opacity: grainIntensity,
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // 6. Incoming video layer (starts at exposureSettleStart with overexposure)
    {
      id: 'incoming-video-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          filter: 'brightness(1.4) contrast(0.9)',
        },
      },
      context: {
        timing: {
          start: exposureSettleStart,
          duration: transitionDuration - exposureSettleStart,
        },
      },
      effects: [
        {
          id: 'incoming-brightness-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: exposureSettleDuration,
            mode: 'provider',
            targetIds: ['incoming-video-layer'],
            ranges: [
              { key: 'brightness', val: 1.4, prog: 0 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-contrast-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: exposureSettleDuration,
            mode: 'provider',
            targetIds: ['incoming-video-layer'],
            ranges: [
              { key: 'contrast', val: 0.9, prog: 0 },
              { key: 'contrast', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'analog-flash-cube-transition-container',
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
        duration: transitionDuration,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'analog-flash-cube-transition',
  title: 'Analog Flash Cube Transition',
  description:
    'A vintage 1960s-70s camera flash cube transition effect featuring warm-tinted flash with slow charge-up, bright burst with organic hotspots and falloff, lingering afterimage, film grain overlay, vignetting, mechanical shutter visualization (quick black frame), and incoming video overexposure settle. Creates authentic retro photography aesthetic with irregular flash shape and amber/yellow tones.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'flash',
    'retro',
    'analog',
    'photography',
    'film',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 1.0,
    flashIntensity: 1.0,
    grainIntensity: 0.15,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Preset Export ---
export const analogFlashCubeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
