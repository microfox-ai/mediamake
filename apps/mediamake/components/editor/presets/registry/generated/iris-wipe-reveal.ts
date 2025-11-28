/**
 * Iris Wipe Reveal Preset
 *
 * Cinematic expanding circle reveal that mimics a classic iris wipe transition from film editing.
 * The circle starts from the exact center point as a tiny dot and expands outward in a smooth,
 * accelerating motion to reveal the underlying scene or image.
 *
 * Features:
 * - **Classic Iris Wipe**: Expands from center point like a camera aperture opening
 * - **Organic Motion**: Smooth ease-out curve with deliberate timing (1.5s default)
 * - **Front-loaded Animation**: 70% expansion in first 70% of duration
 * - **Edge Glow Effect**: Subtle border glow treatment simulating light bleed
 * - **GPU Accelerated**: Uses transform properties with will-change for optimal performance
 * - **Flexible Content**: Works with images, videos, or nested presets
 *
 * Use cases:
 * - Film-style scene transitions
 * - James Bond-style gun barrel sequences
 * - Dramatic content reveals
 * - Opening sequences for presentations or videos
 * - Vintage cinema-inspired transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  contentSrc: z
    .string()
    .optional()
    .describe(
      'Source URL for image or video content to reveal. If not provided, can be used with nested presets.',
    ),
  contentType: z
    .enum(['image', 'video'])
    .default('image')
    .describe('Type of content being revealed'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Total duration of the iris reveal animation in seconds'),
  edgeGlow: z
    .boolean()
    .default(true)
    .describe('Enable subtle edge glow effect around the expanding circle'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Intensity of the edge glow effect (0-1)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the mask/overlay'),
  trackName: z
    .string()
    .default('iris-wipe-reveal')
    .describe('Unique identifier for this preset instance'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    contentSrc,
    contentType,
    duration,
    edgeGlow,
    glowIntensity,
    backgroundColor,
    trackName,
  } = params;

  // Calculate animation timing - 70% expansion in first 70% of duration
  const expansionPoint = duration * 0.7;

  // Child components
  const childrenData: RenderableComponentData[] = [];

  // Add content layer if source provided
  if (contentSrc) {
    const contentComponent: RenderableComponentData = {
      id: `${trackName}-content`,
      type: 'atom',
      componentId: contentType === 'video' ? 'VideoAtom' : 'ImageAtom',
      data: {
        src: contentSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        ...(contentType === 'video' && {
          muted: false,
          volume: 1,
          playbackRate: 1,
        }),
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };
    childrenData.push(contentComponent);
  }

  // Mask container - holds the expanding circle mask
  const maskContainer: RenderableComponentData = {
    id: `${trackName}-mask-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'normal',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: `${trackName}-circle-mask`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: 200vmax; height: 200vmax; border-radius: 50%; background: ${backgroundColor}; ${edgeGlow ? `box-shadow: 0 0 60px 20px rgba(255,255,255,${glowIntensity});` : ''} will-change: transform;'></div>`,
          className: 'absolute top-1/2 left-1/2',
          style: {
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${trackName}-iris-reveal-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`${trackName}-circle-mask`],
              ranges: [
                {
                  key: 'scale',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'scale',
                  val: 0.15,
                  prog: 0.7,
                },
                {
                  key: 'scale',
                  val: 1.5,
                  prog: 1,
                },
              ],
            },
          },
          {
            id: `${trackName}-iris-glow-fade`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`${trackName}-circle-mask`],
              ranges: [
                {
                  key: 'opacity',
                  val: 1,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: 0.85,
                  prog: 0.7,
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
    ],
  };

  childrenData.push(maskContainer);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'iris-wipe-reveal',
  title: 'Iris Wipe Reveal',
  description:
    'Cinematic expanding circle reveal that mimics a classic iris wipe transition from film editing. The circle starts from the exact center as a tiny dot and expands outward with smooth acceleration to reveal the underlying content, similar to the opening of a camera aperture or the classic James Bond gun barrel sequence. Features organic motion with ease-out curve and optional subtle edge glow effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'reveal', 'iris', 'wipe', 'cinematic', 'circle'],
  defaultInputParams: {
    contentSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    contentType: 'image',
    duration: 1.5,
    edgeGlow: true,
    glowIntensity: 0.15,
    backgroundColor: '#000000',
    trackName: 'iris-wipe-reveal',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const irisWipeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
