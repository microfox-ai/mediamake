/**
 * Spiral Wipe Transition Preset
 *
 * Creates a hypnotic spiral wipe transition that rotates inward from the edges like a vortex.
 * The spiral starts as a thin line at the outer edge and contracts inward with increasing speed,
 * creating a mesmerizing drill-like effect that draws attention to the center before revealing
 * the next image. The spiral maintains consistent spacing between its arms as it rotates and
 * contracts, creating a smooth mathematical progression reminiscent of golden ratio spirals.
 *
 * Features:
 * - Rotating spiral mask that contracts from edges to center
 * - Accelerating ease-in timing for vortex effect
 * - Consistent spacing between spiral arms
 * - Depth effect with optional blur and brightness filters
 * - Smooth reveal of incoming image through spiral pattern
 * - Central circular expansion for final reveal
 *
 * Use cases:
 * - Creating hypnotic transitions between images/videos
 * - Building attention-grabbing scene changes
 * - Adding mathematical/geometric visual interest
 * - Creating drill-like or vortex entry effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  beforeImage: z.object({
    src: z.string().describe('Source URL of the outgoing image'),
    type: z.enum(['image', 'video']).default('image').describe('Media type'),
  }),
  afterImage: z.object({
    src: z.string().describe('Source URL of the incoming image'),
    type: z.enum(['image', 'video']).default('image').describe('Media type'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the spiral transition in seconds'),
  spiralArms: z
    .number()
    .min(4)
    .max(18)
    .default(9)
    .describe('Number of spiral arms (affects density)'),
  rotationSpeed: z
    .number()
    .min(360)
    .max(1440)
    .default(720)
    .describe('Total rotation in degrees during transition'),
  addDepthEffects: z
    .boolean()
    .default(true)
    .describe('Add blur and brightness filters for depth effect'),
  spiralColor: z
    .string()
    .default('#000000')
    .describe('Color of the spiral mask'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    beforeImage,
    afterImage,
    transitionDuration,
    spiralArms,
    rotationSpeed,
    addDepthEffects,
    spiralColor,
  } = params;

  // Helper function to create conic gradient spiral pattern
  const createSpiralGradient = (arms: number, color: string): string => {
    const segmentAngle = 360 / (arms * 2);
    const stops: string[] = [];

    for (let i = 0; i < arms * 2; i++) {
      const startAngle = i * segmentAngle;
      const endAngle = (i + 1) * segmentAngle;

      if (i % 2 === 0) {
        // Transparent segment
        stops.push(`transparent ${startAngle}deg`);
        stops.push(`transparent ${endAngle}deg`);
      } else {
        // Colored segment
        stops.push(`${color} ${startAngle}deg`);
        stops.push(`${color} ${endAngle}deg`);
      }
    }

    return `conic-gradient(from 0deg, ${stops.join(', ')})`;
  };

  const spiralGradient = createSpiralGradient(spiralArms, spiralColor);

  // Determine component IDs based on media type
  const beforeComponentId =
    beforeImage.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const afterComponentId =
    afterImage.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create spiral gradient layer as HTMLBlockAtom
  const spiralGradientHTML = `
    <div style="
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
      background: ${spiralGradient};
      transform-origin: center center;
    "></div>
  `;

  // Create center reveal circle as HTMLBlockAtom
  const centerRevealHTML = `
    <div style="
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 0%, transparent 50%, ${spiralColor} 50%, ${spiralColor} 100%);
      transform-origin: center center;
    "></div>
  `;

  const childrenData: RenderableComponentData[] = [
    // Before image (outgoing) - visible throughout
    {
      id: 'before-image',
      type: 'atom',
      componentId: beforeComponentId,
      data: {
        src: beforeImage.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    // After image (incoming) - underneath, revealed by spiral
    {
      id: 'after-image',
      type: 'atom',
      componentId: afterComponentId,
      data: {
        src: afterImage.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    // Spiral mask container
    {
      id: 'spiral-mask-container',
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
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Spiral gradient layer
        {
          id: 'spiral-gradient-layer',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: spiralGradientHTML,
            className: 'absolute inset-0',
            style: {
              transformOrigin: 'center center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Rotation effect
            {
              id: 'spiral-rotation',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['spiral-gradient-layer'],
                ranges: [
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: rotationSpeed, prog: 1 },
                ],
              },
            },
            // Scale effect (contracts inward)
            {
              id: 'spiral-scale',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['spiral-gradient-layer'],
                ranges: [
                  { key: 'scale', val: 2.5, prog: 0 },
                  { key: 'scale', val: 0, prog: 1 },
                ],
              },
            },
            // Optional depth effects
            ...(addDepthEffects
              ? [
                  {
                    id: 'spiral-blur',
                    componentId: 'generic',
                    data: {
                      type: 'ease-in',
                      start: 0,
                      duration: transitionDuration,
                      mode: 'provider',
                      targetIds: ['spiral-gradient-layer'],
                      ranges: [
                        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 0 },
                        {
                          key: 'filter',
                          val: 'blur(8px) brightness(1.5)',
                          prog: 0.5,
                        },
                        { key: 'filter', val: 'blur(15px) brightness(2)', prog: 1 },
                      ],
                    },
                  },
                ]
              : []),
          ],
        } as RenderableComponentData,
        // Center reveal circle (expands after spiral completes)
        {
          id: 'center-reveal-circle',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: centerRevealHTML,
            className: 'absolute inset-0',
            style: {
              transformOrigin: 'center center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Scale effect (expands from center)
            {
              id: 'center-reveal-scale',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: transitionDuration * 0.7, // Start at 70% of transition
                duration: transitionDuration * 0.3,
                mode: 'provider',
                targetIds: ['center-reveal-circle'],
                ranges: [
                  { key: 'scale', val: 0, prog: 0 },
                  { key: 'scale', val: 3, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'spiral-wipe-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
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

const presetMetadata: PresetMetadata = {
  id: 'spiral-wipe-transition',
  title: 'Spiral Wipe Transition',
  description:
    'A hypnotic spiral wipe transition that rotates inward from the edges like a vortex, revealing the next image with mathematically precise spacing and accelerating rotation. The spiral maintains golden ratio-like progression as it contracts toward the center, creating a mesmerizing drill-like effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'spiral', 'wipe', 'vortex', 'geometric', 'hypnotic'],
  defaultInputParams: {
    beforeImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
    },
    afterImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
    },
    transitionDuration: 2,
    spiralArms: 9,
    rotationSpeed: 720,
    addDepthEffects: true,
    spiralColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
