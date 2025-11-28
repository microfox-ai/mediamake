/**
 * Vintage VHS Tracking Effect Preset
 *
 * This internal effect preset simulates authentic VHS tracking errors with horizontal displacement waves,
 * RGB channel shifts, scan line interruptions, and brightness flickering. The effect creates the characteristic
 * "rolling" motion of VHS tracking distortion that moves vertically through the video frame.
 *
 * Features:
 * - **Horizontal Displacement Waves**: translateX animations that create wave-like distortions
 * - **RGB Channel Splitting**: Simulates chroma bleed using drop-shadow filters
 * - **Scan Line Interruptions**: clip-path animations that create horizontal bar artifacts
 * - **Brightness Flickering**: Subtle brightness variations that accompany tracking errors
 * - **Rolling Motion**: Custom cubic-bezier timing for authentic VHS playback feel
 * - **Staggered Timing**: Multiple scan lines with offset timings for realistic tracking effect
 *
 * ARRAY OF EFFECTS:
 * This preset returns an array of generic effects that combine to create the complete VHS tracking distortion.
 * Effects include displacement waves, chroma separation, scan line artifacts, and brightness fluctuations.
 *
 * Use cases:
 * - Creating retro VHS aesthetic effects
 * - Simulating analog video playback errors
 * - Adding nostalgic video artifacts to modern footage
 * - Creating glitch transitions with VHS character
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the VHS tracking effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the VHS tracking effect in seconds'),
  trackingIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe(
      'Intensity multiplier for horizontal displacement (0.1-3, default: 1)',
    ),
  scanLineCount: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe(
      'Number of horizontal scan line interruptions (1-10, default: 3)',
    ),
  chromaBleed: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe(
      'Amount of RGB channel separation in pixels (0-10, default: 2)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const trackingIntensity = params.trackingIntensity ?? 1;
  const scanLineCount = params.scanLineCount ?? 3;
  const chromaBleed = params.chromaBleed ?? 2;
  const baseEffectId = params.effectId || `vhs-tracking-${params.targetId}`;

  // Helper function to generate cubic-bezier for rolling motion
  const generateRollingEasing = (): string => {
    // Custom cubic-bezier that creates the characteristic VHS "rolling" feel
    // Slightly uneven acceleration/deceleration
    return 'cubic-bezier(0.45, 0.05, 0.55, 0.95)';
  };

  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  // 1. Horizontal Displacement Wave Effect
  // Creates the main tracking distortion with horizontal translation
  const displacementEffect = {
    id: `${baseEffectId}-displacement`,
    componentId: 'generic',
    data: {
      type: generateRollingEasing() as any,
      start: params.effectStart,
      duration: params.effectDuration,
      mode: 'provider' as const,
      targetIds: [params.targetId],
      ranges: [
        {
          key: 'transform',
          val: 'translateX(0px)',
          prog: 0,
        },
        {
          key: 'transform',
          val: `translateX(${10 * trackingIntensity}px)`,
          prog: 0.25,
        },
        {
          key: 'transform',
          val: 'translateX(0px)',
          prog: 0.5,
        },
        {
          key: 'transform',
          val: `translateX(${-10 * trackingIntensity}px)`,
          prog: 0.75,
        },
        {
          key: 'transform',
          val: 'translateX(0px)',
          prog: 1,
        },
      ],
    } as GenericEffectData,
  };
  effects.push(displacementEffect);

  // 2. RGB Channel Shift Effect (Chroma Bleed)
  // Simulates color separation using drop-shadow filters
  if (chromaBleed > 0) {
    const chromaEffect = {
      id: `${baseEffectId}-chroma`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: params.effectStart,
        duration: params.effectDuration,
        mode: 'provider' as const,
        targetIds: [params.targetId],
        ranges: [
          {
            key: 'filter',
            val: `drop-shadow(${chromaBleed}px 0 0 rgba(255,0,0,0.5)) drop-shadow(${-chromaBleed}px 0 0 rgba(0,255,255,0.5))`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `drop-shadow(${chromaBleed * 0.5}px 0 0 rgba(255,0,0,0.3)) drop-shadow(${-chromaBleed * 0.5}px 0 0 rgba(0,255,255,0.3))`,
            prog: 0.5,
          },
          {
            key: 'filter',
            val: `drop-shadow(${chromaBleed}px 0 0 rgba(255,0,0,0.5)) drop-shadow(${-chromaBleed}px 0 0 rgba(0,255,255,0.5))`,
            prog: 1,
          },
        ],
      } as GenericEffectData,
    };
    effects.push(chromaEffect);
  }

  // 3. Scan Line Interruption Effects (Clip-path)
  // Creates horizontal bars that roll through the frame
  const scanLineDuration = params.effectDuration / scanLineCount;
  for (let i = 0; i < scanLineCount; i++) {
    const scanLineStart =
      params.effectStart + (i * params.effectDuration) / scanLineCount;
    const verticalOffset = (i / scanLineCount) * 100;

    const scanLineEffect = {
      id: `${baseEffectId}-scanline-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: scanLineStart,
        duration: scanLineDuration,
        mode: 'provider' as const,
        targetIds: [params.targetId],
        ranges: [
          {
            key: 'clipPath',
            val: `inset(${verticalOffset}% 0 ${100 - verticalOffset - 5}% 0)`,
            prog: 0,
          },
          {
            key: 'clipPath',
            val: `inset(${(verticalOffset + 20) % 100}% 0 ${100 - ((verticalOffset + 20) % 100) - 5}% 0)`,
            prog: 0.5,
          },
          {
            key: 'clipPath',
            val: `inset(${(verticalOffset + 40) % 100}% 0 ${100 - ((verticalOffset + 40) % 100) - 5}% 0)`,
            prog: 1,
          },
        ],
      } as GenericEffectData,
    };
    effects.push(scanLineEffect);
  }

  // 4. Brightness Flickering Effect
  // Subtle brightness variations that accompany tracking errors
  const brightnessEffect = {
    id: `${baseEffectId}-brightness`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: params.effectStart,
      duration: params.effectDuration,
      mode: 'provider' as const,
      targetIds: [params.targetId],
      ranges: [
        {
          key: 'brightness',
          val: 1,
          prog: 0,
        },
        {
          key: 'brightness',
          val: 0.85,
          prog: 0.15,
        },
        {
          key: 'brightness',
          val: 1.05,
          prog: 0.35,
        },
        {
          key: 'brightness',
          val: 0.9,
          prog: 0.6,
        },
        {
          key: 'brightness',
          val: 1.1,
          prog: 0.8,
        },
        {
          key: 'brightness',
          val: 1,
          prog: 1,
        },
      ],
    } as GenericEffectData,
  };
  effects.push(brightnessEffect);

  // Create container structure with all effects
  const rootContainer: RenderableComponentData = {
    id: `${baseEffectId}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    effects: effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: params.effectStart + params.effectDuration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'vintage-vhs-tracking',
  title: 'Vintage VHS Tracking Effect',
  description:
    'Internal effect preset that simulates VHS tracking errors with horizontal displacement waves, RGB channel shifts, scan line interruptions via clip-path, and brightness flickering. Returns effect objects for dynamic application to target elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'vhs', 'glitch', 'retro', 'analog'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 3,
    trackingIntensity: 1,
    scanLineCount: 3,
    chromaBleed: 2,
  },
};

export const vintageVhsTrackingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
