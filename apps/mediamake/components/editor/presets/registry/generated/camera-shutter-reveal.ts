/**
 * Camera Shutter Reveal Preset
 *
 * This preset creates a mechanical camera shutter/iris opening effect that reveals content.
 * Features 8 triangular blade segments that rotate and expand outward from the center,
 * creating a precise mechanical motion. The content is revealed with a photographic exposure
 * effect, starting overexposed (bright) and gradually normalizing to simulate a camera
 * adjusting to light.
 *
 * Features:
 * - 8 rotating and expanding triangular shutter blades with metallic sheen
 * - Synchronized rotation (60deg) and scale (0.1 to 1.5) animations
 * - Staggered blade animations (0.05s intervals) for organic mechanical feel
 * - Metallic gradient effect on blades for realistic appearance
 * - Content exposure adjustment (brightness 2→1, contrast 0.5→1)
 * - Smooth ease-in-out timing for mechanical elegance
 * - 1.8s total duration: 1.2s blade opening + 0.6s exposure normalization
 *
 * Use cases:
 * - Professional video intros with mechanical aesthetic
 * - Product reveals with technical precision
 * - Photography-themed content transitions
 * - Creative scene transitions with photographic effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  trackName: z
    .string()
    .default('camera-shutter-reveal')
    .describe('Unique identifier for this shutter reveal track'),
  totalDuration: z
    .number()
    .default(1.8)
    .describe('Total duration of the shutter reveal animation in seconds'),
  bladeDuration: z
    .number()
    .default(1.2)
    .describe('Duration of blade opening animation in seconds'),
  exposureDuration: z
    .number()
    .default(0.6)
    .describe('Duration of content exposure adjustment in seconds'),
  numberOfBlades: z
    .number()
    .default(8)
    .describe('Number of shutter blades (6-8 recommended)'),
  bladeRotation: z
    .number()
    .default(60)
    .describe('Rotation angle in degrees for each blade during opening'),
  bladeScaleStart: z
    .number()
    .default(0.1)
    .describe('Starting scale factor for blades'),
  bladeScaleEnd: z
    .number()
    .default(1.5)
    .describe('Ending scale factor for blades'),
  staggerDelay: z
    .number()
    .default(0.05)
    .describe('Delay in seconds between each blade animation start'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color behind the shutter'),
  bladeColor1: z
    .string()
    .default('#2a2a2a')
    .describe('First color in blade metallic gradient'),
  bladeColor2: z
    .string()
    .default('#4a4a4a')
    .describe('Second color in blade metallic gradient (sheen)'),
  exposureBrightnessStart: z
    .number()
    .default(2)
    .describe('Starting brightness value for exposure effect'),
  exposureBrightnessEnd: z
    .number()
    .default(1)
    .describe('Ending brightness value for exposure effect (normalized)'),
  exposureContrastStart: z
    .number()
    .default(0.5)
    .describe('Starting contrast value for exposure effect'),
  exposureContrastEnd: z
    .number()
    .default(1)
    .describe('Ending contrast value for exposure effect (normalized)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackName,
    totalDuration,
    bladeDuration,
    exposureDuration,
    numberOfBlades,
    bladeRotation,
    bladeScaleStart,
    bladeScaleEnd,
    staggerDelay,
    backgroundColor,
    bladeColor1,
    bladeColor2,
    exposureBrightnessStart,
    exposureBrightnessEnd,
    exposureContrastStart,
    exposureContrastEnd,
  } = params;

  // Calculate blade angles evenly distributed around 360 degrees
  const angleStep = 360 / numberOfBlades;
  const clipPathWidth = 100 / numberOfBlades; // Width of each triangular blade

  // Create shutter blade components
  const bladeComponents = Array.from({ length: numberOfBlades }).map(
    (_, index) => {
      const initialAngle = index * angleStep;
      const bladeId = `${trackName}-blade-${index}`;

      // Create blade with metallic gradient
      const blade: RenderableComponentData = {
        id: bladeId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, ${bladeColor1} 0%, ${bladeColor2} 50%, ${bladeColor1} 100%);"></div>`,
          className: 'absolute top-1/2 left-1/2 origin-center',
          style: {
            width: '150%',
            height: '150%',
            clipPath: `polygon(50% 50%, 50% 0%, ${50 + clipPathWidth / 2}% 0%)`,
            transform: `translate(-50%, -50%) rotate(${initialAngle}deg) scale(${bladeScaleStart})`,
            willChange: 'transform',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `${bladeId}-open-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: index * staggerDelay,
              duration: bladeDuration,
              mode: 'provider',
              targetIds: [bladeId],
              ranges: [
                { key: 'rotate', val: initialAngle, prog: 0 },
                { key: 'rotate', val: initialAngle + bladeRotation, prog: 1 },
                { key: 'scale', val: bladeScaleStart, prog: 0 },
                { key: 'scale', val: bladeScaleEnd, prog: 1 },
              ],
            },
          },
        ],
      };

      return blade;
    },
  );

  // Content layer with exposure effect
  const contentLayerId = `${trackName}-content-layer`;
  const contentLayer: RenderableComponentData = {
    id: contentLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: `${contentLayerId}-exposure-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: bladeDuration,
          duration: exposureDuration,
          mode: 'provider',
          targetIds: [contentLayerId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            {
              key: 'brightness',
              val: exposureBrightnessStart,
              prog: 0,
            },
            {
              key: 'brightness',
              val: exposureBrightnessEnd,
              prog: 1,
            },
            {
              key: 'contrast',
              val: exposureContrastStart,
              prog: 0,
            },
            {
              key: 'contrast',
              val: exposureContrastEnd,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Shutter blades container
  const bladesContainerId = `${trackName}-blades-container`;
  const bladesContainer: RenderableComponentData = {
    id: bladesContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: bladeComponents as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [contentLayer, bladesContainer] as RenderableComponentData[],
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
  id: 'camera-shutter-reveal',
  title: 'Camera Shutter Reveal',
  description:
    'Mechanical camera shutter/iris opening effect with 8 rotating and expanding triangular blades. Features metallic sheen effect and photographic exposure adjustment (overexposed to normalized) for elegant content reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'reveal',
    'shutter',
    'camera',
    'iris',
    'mechanical',
    'photography',
    'exposure',
    'cinematic',
  ],
  defaultInputParams: {
    trackName: 'camera-shutter-reveal',
    totalDuration: 1.8,
    bladeDuration: 1.2,
    exposureDuration: 0.6,
    numberOfBlades: 8,
    bladeRotation: 60,
    bladeScaleStart: 0.1,
    bladeScaleEnd: 1.5,
    staggerDelay: 0.05,
    backgroundColor: '#000000',
    bladeColor1: '#2a2a2a',
    bladeColor2: '#4a4a4a',
    exposureBrightnessStart: 2,
    exposureBrightnessEnd: 1,
    exposureContrastStart: 0.5,
    exposureContrastEnd: 1,
  },
  dependencies: {},
};

export const cameraShutterRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
