/**
 * ChromaticBloom Internal Effect Preset
 *
 * This internal effect preset produces a rainbow-like chromatic aberration bloom effect
 * by splitting light into RGB components that bloom at different rates. The effect simulates
 * the prismatic dispersion of light through a lens, creating colorful halos around bright areas.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple effect objects (red, green, blue channels + scale) that create the
 * chromatic bloom sequence. When enablePulse is true, channels animate in staggered sequence;
 * when false, all channels animate simultaneously for a uniform bloom effect.
 *
 * Features:
 * - RGB channel separation with independent hue-rotate and blur animations
 * - Configurable aberration strength (pixel offset)
 * - Adjustable bloom radius for blur intensity
 * - Animation duration control
 * - Pulse mode for cascading rainbow bloom sequence
 * - Scale effect for subtle zoom during bloom peak
 *
 * Perfect for creating psychedelic or dream-like visual effects on images and videos.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  aberrationStrength: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Pixel offset strength for chromatic aberration effect'),
  bloomRadius: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Blur radius in pixels for the bloom effect'),
  animationDuration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Duration of the bloom animation in seconds'),
  enablePulse: z
    .boolean()
    .default(true)
    .describe(
      'Enable pulsed sequence mode (RGB channels animate in staggered sequence)',
    ),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the chromatic bloom effect to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    aberrationStrength,
    bloomRadius,
    animationDuration,
    enablePulse,
    targetIds,
  } = params;

  // Calculate blur values for each channel (scaled by aberrationStrength)
  const redBlur = bloomRadius * aberrationStrength;
  const greenBlur = bloomRadius * aberrationStrength * 0.8;
  const blueBlur = bloomRadius * aberrationStrength * 0.6;

  // Calculate start times for staggered pulse mode
  const redStart = 0;
  const greenStart = enablePulse ? animationDuration * 0.15 : 0;
  const blueStart = enablePulse ? animationDuration * 0.3 : 0;

  // Red channel effect (hue-rotate -60deg, maximum blur)
  const redChannelEffect = {
    id: 'chromatic-bloom-red-channel',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: redStart,
      duration: animationDuration,
      mode: 'provider' as const,
      targetIds: targetIds,
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg) blur(0px) brightness(1)', prog: 0 },
        {
          key: 'filter',
          val: `hue-rotate(-60deg) blur(${redBlur}px) brightness(1.3)`,
          prog: 0.3,
        },
        { key: 'filter', val: 'hue-rotate(0deg) blur(0px) brightness(1)', prog: 1 },
      ],
    },
  };

  // Green channel effect (hue-rotate +60deg, medium blur)
  const greenChannelEffect = {
    id: 'chromatic-bloom-green-channel',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: greenStart,
      duration: animationDuration,
      mode: 'provider' as const,
      targetIds: targetIds,
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg) blur(0px) brightness(1)', prog: 0 },
        {
          key: 'filter',
          val: `hue-rotate(60deg) blur(${greenBlur}px) brightness(1.25)`,
          prog: 0.35,
        },
        { key: 'filter', val: 'hue-rotate(0deg) blur(0px) brightness(1)', prog: 1 },
      ],
    },
  };

  // Blue channel effect (hue-rotate +120deg, minimal blur)
  const blueChannelEffect = {
    id: 'chromatic-bloom-blue-channel',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: blueStart,
      duration: animationDuration,
      mode: 'provider' as const,
      targetIds: targetIds,
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg) blur(0px) brightness(1)', prog: 0 },
        {
          key: 'filter',
          val: `hue-rotate(120deg) blur(${blueBlur}px) brightness(1.2)`,
          prog: 0.4,
        },
        { key: 'filter', val: 'hue-rotate(0deg) blur(0px) brightness(1)', prog: 1 },
      ],
    },
  };

  // Scale effect for subtle zoom during bloom peak
  const scaleEffect = {
    id: 'chromatic-bloom-scale-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: animationDuration,
      mode: 'provider' as const,
      targetIds: targetIds,
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1 + aberrationStrength * 0.05, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Container structure for effect extraction
  const effectContainer = {
    id: 'chromatic-bloom-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    effects: [redChannelEffect, greenChannelEffect, blueChannelEffect, scaleEffect],
    childrenData: [] as RenderableComponentData[],
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
      _extractedEffects: [
        redChannelEffect,
        greenChannelEffect,
        blueChannelEffect,
        scaleEffect,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'chromatic-bloom-internal-effect',
  title: 'ChromaticBloom Internal Effect',
  description:
    'Internal effect preset that produces a rainbow-like chromatic aberration bloom effect, splitting light into RGB components that bloom at different rates. Creates colorful halos around bright areas simulating prismatic dispersion of light through a lens. Perfect for psychedelic or dream-like visual effects on images and videos.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'chromatic', 'bloom', 'rainbow', 'internal', 'generic', 'rgb', 'psychedelic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    aberrationStrength: 1,
    bloomRadius: 10,
    animationDuration: 2,
    enablePulse: true,
    targetIds: ['component-1'],
  },
};

export const chromaticBloomInternalEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
