/**
 * Spiral Iris Reveal Effect Preset
 *
 * A hypnotic spiral iris reveal effect that combines rotational motion with expansion,
 * similar to a camera shutter opening with a twist. The effect creates a dynamic reveal
 * where 8 triangular blade segments rotate clockwise 1.5 turns (540 degrees) while 
 * expanding outward from the center.
 *
 * Features:
 * - **8 Blade Segments**: Triangular shutter blades arranged in a circular pattern
 * - **Clockwise Rotation**: Each blade rotates 540 degrees (1.5 full turns)
 * - **Simultaneous Expansion**: Blades scale from center outward while rotating
 * - **Staggered Timing**: Each blade has slightly different timing for smooth, organic motion
 * - **Motion Blur**: Subtle blur effect during rotation for realism
 * - **Customizable Content**: Reveal any content (video, image, gradient, etc.)
 *
 * Technical Implementation:
 * - Uses 8 HTMLBlockAtom components with CSS clip-path for blade shapes
 * - Generic effects for rotation, scale, opacity, and blur
 * - Provider mode targeting for precise animation control
 * - Cubic bezier easing for smooth acceleration/deceleration
 *
 * Use cases:
 * - Energetic video intros and scene transitions
 * - Product reveals and unveilings
 * - Dynamic content transitions
 * - Attention-grabbing reveals for highlights or key moments
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.8)
    .describe('Total duration of the spiral reveal effect in seconds'),
  contentType: z
    .enum(['video', 'image', 'gradient', 'custom'])
    .default('gradient')
    .describe('Type of content to reveal'),
  contentSrc: z
    .string()
    .optional()
    .describe(
      'Source URL for video/image content (required if contentType is video or image)'
    ),
  gradientStart: z
    .string()
    .default('#9333ea')
    .describe('Start color for gradient (used if contentType is gradient)'),
  gradientEnd: z
    .string()
    .default('#f97316')
    .describe('End color for gradient (used if contentType is gradient)'),
  bladeColor: z
    .string()
    .default('#000000')
    .describe('Color of the spiral blades'),
  rotationDegrees: z
    .number()
    .min(180)
    .max(1080)
    .default(540)
    .describe('Total rotation in degrees (default: 540 = 1.5 turns)'),
  bladeStaggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each blade animation in seconds'),
  enableMotionBlur: z
    .boolean()
    .default(true)
    .describe('Enable subtle motion blur during rotation'),
  blurAmount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum blur amount in pixels'),
  trackName: z
    .string()
    .default('spiral-iris-reveal')
    .describe('Unique track name for component IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps
): PresetOutput => {
  const {
    duration,
    contentType,
    contentSrc,
    gradientStart,
    gradientEnd,
    bladeColor,
    rotationDegrees,
    bladeStaggerDelay,
    enableMotionBlur,
    blurAmount,
    trackName,
  } = params;

  const numberOfBlades = 8;
  const degreesPerBlade = 360 / numberOfBlades; // 45 degrees

  // Generate content layer based on contentType
  const getContentLayer = (): RenderableComponentData => {
    let contentComponent: RenderableComponentData;

    if (contentType === 'video' && contentSrc) {
      contentComponent = {
        id: `${trackName}-video-content`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: contentSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData;
    } else if (contentType === 'image' && contentSrc) {
      contentComponent = {
        id: `${trackName}-image-content`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: contentSrc,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData;
    } else if (contentType === 'gradient') {
      contentComponent = {
        id: `${trackName}-gradient-content`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="absolute inset-0" style="background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%);"></div>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData;
    } else {
      // Custom or fallback
      contentComponent = {
        id: `${trackName}-custom-content`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400"></div>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData;
    }

    return {
      id: `${trackName}-content-layer`,
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
          duration: duration,
        },
      },
      childrenData: [contentComponent],
    } as RenderableComponentData;
  };

  // Generate blade elements
  const blades: RenderableComponentData[] = [];

  for (let i = 0; i < numberOfBlades; i++) {
    const bladeId = `${trackName}-blade-${i}`;
    const initialRotation = i * degreesPerBlade;
    const finalRotation = initialRotation + rotationDegrees;
    const bladeDelay = i * bladeStaggerDelay;

    // Create blade effects
    const bladeEffects: any[] = [];

    // Rotation + Scale effect
    bladeEffects.push({
      id: `${bladeId}-rotate-scale`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: bladeDelay,
        duration: duration - bladeDelay,
        mode: 'provider',
        targetIds: [bladeId],
        ranges: [
          // Rotation
          { key: 'rotate', val: initialRotation, prog: 0 },
          { key: 'rotate', val: finalRotation, prog: 1 },
          // Scale (expand outward)
          { key: 'scale', val: 0.1, prog: 0 },
          { key: 'scale', val: 2.5, prog: 1 },
        ],
      },
    });

    // Opacity fade effect
    bladeEffects.push({
      id: `${bladeId}-opacity`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: bladeDelay,
        duration: duration - bladeDelay,
        mode: 'provider',
        targetIds: [bladeId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });

    // Motion blur effect (optional)
    if (enableMotionBlur) {
      const blurDuration = (duration - bladeDelay) * 0.5;
      bladeEffects.push({
        id: `${bladeId}-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: bladeDelay,
          duration: blurDuration,
          mode: 'provider',
          targetIds: [bladeId],
          ranges: [
            { key: 'filter', val: `blur(${blurAmount}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      });
    }

    // Create blade component with clip-path
    const blade: RenderableComponentData = {
      id: bladeId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="w-full h-full" style="clip-path: polygon(50% 50%, 50% 0%, 100% 0%); background: ${bladeColor}; transform-origin: center;"></div>`,
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: bladeEffects,
    } as RenderableComponentData;

    blades.push(blade);
  }

  // Create mask container with all blades
  const maskContainer: RenderableComponentData = {
    id: `${trackName}-mask-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: blades,
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [getContentLayer(), maskContainer],
  } as RenderableComponentData;

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
  id: 'spiral-iris-reveal',
  title: 'Spiral Iris Reveal Effect',
  description:
    'A hypnotic spiral iris reveal effect combining rotational motion with expansion. Features 8 triangular blade segments that rotate clockwise 1.5 turns (540deg) while expanding outward from center, with staggered timing for smooth organic motion and subtle motion blur.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'reveal',
    'transition',
    'spiral',
    'iris',
    'rotation',
    'camera-shutter',
    'dynamic',
    'hypnotic',
    'energetic',
  ],
  defaultInputParams: {
    duration: 1.8,
    contentType: 'gradient',
    gradientStart: '#9333ea',
    gradientEnd: '#f97316',
    bladeColor: '#000000',
    rotationDegrees: 540,
    bladeStaggerDelay: 0.05,
    enableMotionBlur: true,
    blurAmount: 2,
    trackName: 'spiral-iris-reveal',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralIrisRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
