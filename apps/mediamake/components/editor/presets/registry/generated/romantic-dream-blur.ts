/**
 * Romantic Dream Blur Preset
 *
 * Soft-focus romantic image transitions with gaussian blur dream sequences,
 * vintage Hollywood glamour aesthetic with tilt-shift edge blur, candlelight-like
 * brightness pulsing, warm golden hour color grading, and silk-stocking lens effect.
 * 
 * Features heavy edge blur with clearer center focus (tilt-shift style) and lingering
 * romantic transitions. Images emerge through gaussian blur like dream sequences with
 * warm sepia tones during peak blur moments.
 *
 * Technical approach:
 * - Uses imageloop preset for sequencing and transition orchestration
 * - Applies compound blur effects (25px→3px→25px) with slight blur at peak focus
 * - Brightness oscillation (0.9→1.1→0.9) simulates candlelight flickering
 * - Base filters: contrast(0.95) saturate(1.2) for warm color temperature
 * - Radial gradient overlay creates tilt-shift edge darkening
 * - Long transitions: 1.5s in + 3s hold + 1.5s out = 6s per image
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z
          .number()
          .optional()
          .describe('Duration for this image (defaults to imageDuration)'),
      }),
    )
    .describe('Array of images to display with romantic blur transitions'),
  imageDuration: z
    .number()
    .default(6)
    .describe('Default duration per image in seconds (includes transitions)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of blur fade-in/out transitions'),
  peakBlur: z
    .number()
    .default(25)
    .describe('Maximum blur amount in pixels at transition peaks'),
  focusBlur: z
    .number()
    .default(3)
    .describe('Minimum blur amount in pixels at center focus (slight blur)'),
  brightnessMin: z
    .number()
    .default(0.9)
    .describe('Minimum brightness (candlelight flicker low)'),
  brightnessMax: z
    .number()
    .default(1.1)
    .describe('Maximum brightness (candlelight flicker high)'),
  contrast: z
    .number()
    .default(0.95)
    .describe('Base contrast level for soft vintage look'),
  saturation: z
    .number()
    .default(1.2)
    .describe('Base saturation for warm color grading'),
  sepia: z
    .number()
    .default(0.3)
    .describe('Sepia filter intensity during transitions (0-1)'),
  tiltShiftIntensity: z
    .number()
    .default(0.3)
    .describe('Edge darkening intensity for tilt-shift effect (0-1)'),
  transitionImpact: z
    .number()
    .default(2.5)
    .describe('Transition impact multiplier for smooth-blur effect'),
  trackName: z
    .string()
    .default('romantic-dream')
    .describe('Track name for component IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;

  if (!presets || !presets.imageloop) {
    throw new Error('Preset dependency "imageloop" not found');
  }

  // Prepare imageloop parameters with romantic blur configuration
  const imageloopParams = {
    trackName: params.trackName,
    images: params.images.map((img) => ({
      src: img.src,
      duration: img.duration || params.imageDuration,
      fit: 'cover' as const,
      // Base style with warm color grading
      style: {
        filter: `contrast(${params.contrast}) saturate(${params.saturation})`,
      },
    })),
    imageDuration: params.imageDuration,
    transition: {
      type: 'smooth-blur' as const,
      impact: params.transitionImpact,
    },
    // Custom effect configuration for romantic blur
    customEffects: true,
  };

  // Call imageloop preset
  const imageloopResult = await presets.imageloop(imageloopParams, props);

  if (!imageloopResult?.output?.childrenData) {
    throw new Error('Invalid imageloop output');
  }

  // Extract image sequence container from imageloop
  const imageSequenceContainer = imageloopResult.output.childrenData[0];

  // Enhance each image with romantic blur effects
  if (
    imageSequenceContainer &&
    'childrenData' in imageSequenceContainer &&
    Array.isArray(imageSequenceContainer.childrenData)
  ) {
    imageSequenceContainer.childrenData.forEach((imageNode: any) => {
      if (imageNode && imageNode.type === 'atom') {
        const imageDuration = imageNode.context?.timing?.duration || params.imageDuration;
        const fadeInDuration = params.transitionDuration;
        const fadeOutDuration = params.transitionDuration;
        const holdDuration = imageDuration - fadeInDuration - fadeOutDuration;

        // Create compound romantic blur effect
        const romanticBlurEffect = {
          id: `${imageNode.id}-romantic-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: imageDuration,
            mode: 'provider' as const,
            targetIds: [imageNode.id],
            ranges: [
              // Blur transition: 25px → 3px → 25px
              { key: 'blur', val: `${params.peakBlur}px`, prog: 0 },
              {
                key: 'blur',
                val: `${params.focusBlur}px`,
                prog: fadeInDuration / imageDuration,
              },
              {
                key: 'blur',
                val: `${params.focusBlur}px`,
                prog: (fadeInDuration + holdDuration) / imageDuration,
              },
              { key: 'blur', val: `${params.peakBlur}px`, prog: 1 },
              
              // Brightness oscillation: 0.9 → 1.1 → 0.9
              { key: 'brightness', val: params.brightnessMin, prog: 0 },
              {
                key: 'brightness',
                val: params.brightnessMax,
                prog: fadeInDuration / imageDuration,
              },
              {
                key: 'brightness',
                val: params.brightnessMax,
                prog: (fadeInDuration + holdDuration) / imageDuration,
              },
              { key: 'brightness', val: params.brightnessMin, prog: 1 },
              
              // Sepia warmth during transitions
              { key: 'sepia', val: params.sepia, prog: 0 },
              {
                key: 'sepia',
                val: 0,
                prog: fadeInDuration / imageDuration,
              },
              {
                key: 'sepia',
                val: 0,
                prog: (fadeInDuration + holdDuration) / imageDuration,
              },
              { key: 'sepia', val: params.sepia, prog: 1 },
            ],
          },
        };

        // Add romantic blur effect to image
        if (!imageNode.effects) {
          imageNode.effects = [];
        }
        imageNode.effects.push(romanticBlurEffect);
      }
    });
  }

  // Calculate total duration from imageloop
  const totalDuration =
    imageSequenceContainer.context?.timing?.duration ||
    params.images.length * params.imageDuration;

  // Create tilt-shift overlay with radial gradient
  const tiltShiftOverlay: RenderableComponentData = {
    id: `${params.trackName}-tilt-shift-overlay`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, transparent 40%, rgba(0,0,0,${params.tiltShiftIntensity * 0.5}) 70%, rgba(0,0,0,${params.tiltShiftIntensity}) 100%)`,
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
  };

  // Create root container with warm gradient background
  const rootContainer: RenderableComponentData = {
    id: `${params.trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-amber-50/10 to-transparent',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      imageSequenceContainer as RenderableComponentData,
      tiltShiftOverlay,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'romantic-dream-blur',
  title: 'Romantic Dream Blur',
  description:
    'Soft-focus romantic image transitions with gaussian blur dream sequences, vintage Hollywood glamour aesthetic with tilt-shift edge blur, candlelight-like brightness pulsing, warm golden hour color grading, and silk-stocking lens effect. Features heavy edge blur with clearer center focus and lingering romantic transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'image',
    'romantic',
    'blur',
    'dream',
    'vintage',
    'hollywood',
    'glamour',
    'tilt-shift',
    'warm',
    'golden-hour',
    'transitions',
    'candlelight',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://picsum.photos/1920/1080?random=1' },
      { src: 'https://picsum.photos/1920/1080?random=2' },
      { src: 'https://picsum.photos/1920/1080?random=3' },
    ],
    imageDuration: 6,
    transitionDuration: 1.5,
    peakBlur: 25,
    focusBlur: 3,
    brightnessMin: 0.9,
    brightnessMax: 1.1,
    contrast: 0.95,
    saturation: 1.2,
    sepia: 0.3,
    tiltShiftIntensity: 0.3,
    transitionImpact: 2.5,
    trackName: 'romantic-dream',
  },
  dependencies: {
    presets: ['imageloop'],
  },
};

export const romanticDreamBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
