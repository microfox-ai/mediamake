/**
 * Tilt-Shift Miniature Effect Preset
 *
 * Creates a miniature/diorama effect by applying selective blur bands to the top and bottom
 * of the frame while enhancing saturation and contrast. This simulates the shallow depth-of-field
 * typically seen in macro photography, making real scenes appear like miniature models.
 *
 * Features:
 * - **Selective Blur Bands**: Gradient blur overlays on top and bottom regions
 * - **Enhanced Saturation**: Increases color saturation for a toy-like appearance
 * - **Adjustable Focus Area**: Control the size and position of the in-focus region
 * - **Blur Intensity Control**: Adjust the strength of the blur effect
 * - **Motion Effects**: Optional pan/zoom effects via imageloop integration
 *
 * Use Cases:
 * - Cityscape videos made to look like miniature models
 * - Aerial footage transformed into toy-like scenes
 * - Creative b-roll with unique visual style
 * - Establishing shots with miniature effect
 *
 * Technical Details:
 * - Uses backdrop-filter for blur (top and bottom bands with gradient masks)
 * - CSS filters applied to source media for color enhancement
 * - Integrates imageloop preset for optional motion effects
 * - All layers use relative timing to fit parent duration
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  src: z
    .string()
    .describe('Source image or video URL to apply the tilt-shift effect to'),
  duration: z
    .number()
    .default(5)
    .describe('Duration of the effect in seconds'),
  focusAreaTop: z
    .number()
    .min(10)
    .max(60)
    .default(35)
    .describe(
      'Height percentage of the top blur band (10-60). Higher values = more blur at top.',
    ),
  focusAreaBottom: z
    .number()
    .min(10)
    .max(60)
    .default(35)
    .describe(
      'Height percentage of the bottom blur band (10-60). Higher values = more blur at bottom.',
    ),
  blurIntensity: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe(
      'Blur strength in pixels (5-50). Higher values create stronger blur effect.',
    ),
  saturation: z
    .number()
    .min(1.0)
    .max(2.5)
    .default(1.5)
    .describe(
      'Color saturation multiplier (1.0-2.5). Higher values = more vibrant colors for miniature look.',
    ),
  contrast: z
    .number()
    .min(1.0)
    .max(1.5)
    .default(1.15)
    .describe(
      'Contrast multiplier (1.0-1.5). Enhances depth and definition.',
    ),
  brightness: z
    .number()
    .min(0.9)
    .max(1.3)
    .default(1.05)
    .describe(
      'Brightness multiplier (0.9-1.3). Slight increase enhances miniature appearance.',
    ),
  effect: z
    .enum(['none', 'pan-left', 'pan-right', 'pan-up', 'pan-down', 'zoom-in', 'zoom-out'])
    .default('none')
    .describe(
      'Optional motion effect to apply to the image (requires src to be an image)',
    ),
  effectImpact: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .describe(
      'Intensity multiplier for the motion effect (0.1-3.0). Higher values = more dramatic motion.',
    ),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets, config } = props;

  // Validate dependencies
  if (!presets || !presets['imageloop']) {
    throw new Error('Preset dependency "imageloop" not found');
  }

  const fps = config?.fps || 30;
  const durationInFrames = Math.round(params.duration * fps);

  // Call imageloop preset for source media handling
  const imageloopResult = await presets['imageloop'](
    {
      src: params.src,
      duration: params.duration,
      effect: params.effect,
      effectImpact: params.effectImpact,
    },
    props,
  );

  // Extract imageloop output
  const imageloopChildren = imageloopResult?.output?.childrenData || [];

  // Build the composition structure
  const rootContainer: RenderableComponentData = {
    id: 'tilt-shift-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        fitDurationTo: 'parent',
        durationInFrames: 0,
      },
    },
    childrenData: [
      // Source media container with saturation/contrast/brightness filters
      {
        id: 'tilt-shift-source-media',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              filter: `saturate(${params.saturation}) contrast(${params.contrast}) brightness(${params.brightness})`,
            },
          },
        },
        context: {
          timing: {
            fitDurationTo: 'parent',
            durationInFrames: 0,
          },
        },
        childrenData: imageloopChildren,
      },
      // Top blur band
      {
        id: 'tilt-shift-top-blur',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-x-0 top-0 pointer-events-none',
            style: {
              height: `${params.focusAreaTop}%`,
              backdropFilter: `blur(${params.blurIntensity}px)`,
              WebkitBackdropFilter: `blur(${params.blurIntensity}px)`,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            },
          },
        },
        context: {
          timing: {
            fitDurationTo: 'parent',
            durationInFrames: 0,
          },
        },
        childrenData: [],
      },
      // Bottom blur band
      {
        id: 'tilt-shift-bottom-blur',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-x-0 bottom-0 pointer-events-none',
            style: {
              height: `${params.focusAreaBottom}%`,
              backdropFilter: `blur(${params.blurIntensity}px)`,
              WebkitBackdropFilter: `blur(${params.blurIntensity}px)`,
              maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            },
          },
        },
        context: {
          timing: {
            fitDurationTo: 'parent',
            durationInFrames: 0,
          },
        },
        childrenData: [],
      },
    ],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'tilt-shift-miniature',
  title: 'Tilt-Shift Miniature Effect',
  description:
    'Adds blur bands and saturation to make scenes look miniature. Creates a shallow depth-of-field effect with enhanced saturation for a miniaturized appearance.',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'video', 'effects', 'blur', 'miniature', 'tilt-shift', 'visual'],
  defaultInputParams: {
    src: 'https://example.com/cityscape.jpg',
    duration: 5,
    focusAreaTop: 35,
    focusAreaBottom: 35,
    blurIntensity: 20,
    saturation: 1.5,
    contrast: 1.15,
    brightness: 1.05,
    effect: 'none',
    effectImpact: 1.0,
  },
  dependencies: {
    presets: ['imageloop'],
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const tiltShiftMiniaturePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
