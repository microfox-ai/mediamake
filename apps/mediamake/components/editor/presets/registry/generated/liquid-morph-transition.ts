/**
 * Liquid Morph Transition Preset
 *
 * Creates seamless morph transitions where images appear to melt and flow into each other
 * like liquid. Each transition uses creative masking, blend modes, particle dissolution effects,
 * warping transforms, and elastic timing to create organic, fluid connections between images.
 *
 * Features:
 * - **Liquid Flow Morphing**: CSS mask-image with animated gradients for melting effect
 * - **Creative Blend Modes**: Mix-blend-mode transitions (multiply/overlay) during morph
 * - **Particle Dissolution**: Images break apart into fragments that reassemble
 * - **Warping Transforms**: Perspective and rotation effects for bending/twisting
 * - **Elastic Timing**: cubic-bezier easing for organic, non-mechanical transitions
 * - **Color Bleeding**: Dominant color overlays that cross-fade between images
 *
 * Use cases:
 * - Creative image slideshows with organic transitions
 * - Fluid video montages with artistic morphing
 * - Abstract visual sequences with flowing imagery
 * - Artistic presentations with melting effects
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
        duration: z.number().describe('Display duration in seconds'),
        dominantColor: z
          .string()
          .optional()
          .describe('Dominant color for color bleeding effect (hex/rgb)'),
      }),
    )
    .min(2)
    .describe('Array of images to morph between (minimum 2)'),
  transitionDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.7)
    .describe('Duration of each morph transition in seconds'),
  particleCount: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Number of particle fragments per transition'),
  particleSize: z
    .number()
    .min(10)
    .max(50)
    .default(20)
    .describe('Size of particle fragments in pixels'),
  warpIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(15)
    .describe('Intensity of warping effect in degrees'),
  colorBleedIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of color bleeding overlay (0-1)'),
  trackName: z
    .string()
    .default('liquid-morph-track')
    .describe('Unique track name for component IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    transitionDuration,
    particleCount,
    particleSize,
    warpIntensity,
    colorBleedIntensity,
    trackName,
  } = params;

  // Helper: Extract dominant color or use default
  const getDominantColor = (image: (typeof images)[0], index: number): string => {
    if (image.dominantColor) return image.dominantColor;
    // Default colors if not provided
    const defaults = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
    return defaults[index % defaults.length];
  };

  // Helper: Generate random particle positions
  const generateParticlePositions = (count: number) => {
    const positions: Array<{ x: number; y: number; rotation: number }> = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: Math.random() * 200 - 100, // -100 to 100
        y: Math.random() * 200 - 100,
        rotation: Math.random() * 360,
      });
    }
    return positions;
  };

  // Calculate total duration
  let totalDuration = 0;
  images.forEach((img, index) => {
    totalDuration += img.duration;
    if (index < images.length - 1) {
      totalDuration -= transitionDuration * 0.5; // Overlap transitions
    }
  });

  const childrenData: RenderableComponentData[] = [];

  let currentTime = 0;

  images.forEach((image, imageIndex) => {
    const isFirst = imageIndex === 0;
    const isLast = imageIndex === images.length - 1;

    // Calculate timing for this image
    const imageStart = currentTime;
    const imageDuration = image.duration;

    // Transition overlap: images fade in/out during transition
    const fadeInStart = isFirst ? 0 : 0;
    const fadeInDuration = isFirst ? 0 : transitionDuration;
    const fadeOutStart = isLast
      ? imageDuration
      : imageDuration - transitionDuration;
    const fadeOutDuration = isLast ? 0 : transitionDuration;

    const imageId = `${trackName}-image-${imageIndex}`;
    const colorOverlayId = `${trackName}-color-overlay-${imageIndex}`;

    // Base image layer with mask morphing
    const imageEffects: any[] = [];

    // Fade in (for non-first images)
    if (!isFirst) {
      imageEffects.push({
        id: `${imageId}-fade-in`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: fadeInStart,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Liquid mask morphing (incoming)
      imageEffects.push({
        id: `${imageId}-mask-morph-in`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: fadeInStart,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            {
              key: 'maskImage',
              val: 'linear-gradient(to right, transparent 0%, black 0%, black 0%, transparent 0%)',
              prog: 0,
            },
            {
              key: 'maskImage',
              val: 'linear-gradient(to right, transparent 0%, black 50%, black 100%, transparent 100%)',
              prog: 0.5,
            },
            {
              key: 'maskImage',
              val: 'linear-gradient(to right, transparent 0%, black 100%, black 100%, transparent 100%)',
              prog: 1,
            },
          ],
        },
      });

      // Warp effect (incoming)
      imageEffects.push({
        id: `${imageId}-warp-in`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: fadeInStart,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            {
              key: 'transform',
              val: `perspective(1000px) rotateY(${warpIntensity}deg)`,
              prog: 0,
            },
            {
              key: 'transform',
              val: 'perspective(1000px) rotateY(0deg)',
              prog: 1,
            },
          ],
        },
      });

      // Blend mode transition (incoming)
      imageEffects.push({
        id: `${imageId}-blend-in`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: fadeInStart,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'mixBlendMode', val: 'multiply', prog: 0 },
            { key: 'mixBlendMode', val: 'multiply', prog: 0.5 },
            { key: 'mixBlendMode', val: 'normal', prog: 1 },
          ],
        },
      });
    }

    // Fade out (for non-last images)
    if (!isLast) {
      imageEffects.push({
        id: `${imageId}-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: fadeOutStart,
          duration: fadeOutDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // Liquid mask morphing (outgoing)
      imageEffects.push({
        id: `${imageId}-mask-morph-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: fadeOutStart,
          duration: fadeOutDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            {
              key: 'maskImage',
              val: 'linear-gradient(to right, transparent 0%, black 100%, black 100%, transparent 100%)',
              prog: 0,
            },
            {
              key: 'maskImage',
              val: 'linear-gradient(to right, transparent 0%, black 50%, black 100%, transparent 100%)',
              prog: 0.5,
            },
            {
              key: 'maskImage',
              val: 'linear-gradient(to right, transparent 100%, black 100%, black 100%, transparent 100%)',
              prog: 1,
            },
          ],
        },
      });

      // Warp effect (outgoing)
      imageEffects.push({
        id: `${imageId}-warp-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: fadeOutStart,
          duration: fadeOutDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            {
              key: 'transform',
              val: 'perspective(1000px) rotateY(0deg)',
              prog: 0,
            },
            {
              key: 'transform',
              val: `perspective(1000px) rotateY(-${warpIntensity}deg)`,
              prog: 1,
            },
          ],
        },
      });

      // Blend mode transition (outgoing)
      imageEffects.push({
        id: `${imageId}-blend-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: fadeOutStart,
          duration: fadeOutDuration,
          mode: 'provider',
          targetIds: [imageId],
          ranges: [
            { key: 'mixBlendMode', val: 'normal', prog: 0 },
            { key: 'mixBlendMode', val: 'overlay', prog: 0.5 },
            { key: 'mixBlendMode', val: 'overlay', prog: 1 },
          ],
        },
      });
    }

    // Image layer
    childrenData.push({
      id: imageId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 object-cover',
        style: {
          willChange: 'transform, opacity, mask-image',
        },
      },
      context: {
        timing: {
          start: imageStart,
          duration: imageDuration,
        },
      },
      effects: imageEffects,
    } as RenderableComponentData);

    // Color bleeding overlay
    const dominantColor = getDominantColor(image, imageIndex);
    const colorOverlayEffects: any[] = [];

    // Fade in color overlay (for non-first images)
    if (!isFirst) {
      colorOverlayEffects.push({
        id: `${colorOverlayId}-fade-in`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: fadeInStart,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: [colorOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: colorBleedIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    // Fade out color overlay (for non-last images)
    if (!isLast) {
      colorOverlayEffects.push({
        id: `${colorOverlayId}-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: fadeOutStart,
          duration: fadeOutDuration,
          mode: 'provider',
          targetIds: [colorOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: colorBleedIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    childrenData.push({
      id: colorOverlayId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: dominantColor,
            mixBlendMode: 'overlay',
            willChange: 'opacity',
          },
        },
      },
      context: {
        timing: {
          start: imageStart,
          duration: imageDuration,
        },
      },
      effects: colorOverlayEffects,
      childrenData: [],
    } as RenderableComponentData);

    // Particle dissolution effect (only during transitions)
    if (!isLast) {
      const particlePositions = generateParticlePositions(particleCount);
      const particleContainerId = `${trackName}-particles-${imageIndex}`;
      const particleChildren: RenderableComponentData[] = [];

      particlePositions.forEach((pos, particleIndex) => {
        const particleId = `${particleContainerId}-particle-${particleIndex}`;
        const particleEffects: any[] = [];

        // Particle scatter animation (outgoing image breaks apart)
        particleEffects.push({
          id: `${particleId}-scatter`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration * 0.6,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: pos.x, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: pos.y, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: pos.rotation, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        });

        const clipX = (particleIndex % 5) * 20;
        const clipY = Math.floor(particleIndex / 5) * 20;

        particleChildren.push({
          id: particleId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                width: `${particleSize}px`,
                height: `${particleSize}px`,
                left: `${50 + clipX - particleSize / 2}%`,
                top: `${50 + clipY - particleSize / 2}%`,
                backgroundImage: `url(${image.src})`,
                backgroundSize: '500% 500%',
                backgroundPosition: `${-clipX * 5}% ${-clipY * 5}%`,
                willChange: 'transform, opacity',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration * 0.6,
            },
          },
          effects: particleEffects,
          childrenData: [],
        } as RenderableComponentData);
      });

      childrenData.push({
        id: particleContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: imageStart + fadeOutStart,
            duration: transitionDuration * 0.6,
          },
        },
        childrenData: particleChildren,
      } as RenderableComponentData);
    }

    // Update current time for next image (with overlap)
    currentTime += imageDuration;
    if (!isLast) {
      currentTime -= transitionDuration * 0.5;
    }
  });

  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description:
    'Seamless morph transitions with liquid-like flowing effects, creative masking, blend modes, particle dissolution, warping transforms, elastic timing, and color bleeding between images',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'morph',
    'liquid',
    'flow',
    'particle',
    'warp',
    'blend',
    'organic',
  ],
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        duration: 3,
        dominantColor: '#4ecdc4',
      },
      {
        src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
        duration: 3,
        dominantColor: '#45b7d1',
      },
      {
        src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
        duration: 3,
        dominantColor: '#6c5ce7',
      },
    ],
    transitionDuration: 0.7,
    particleCount: 15,
    particleSize: 20,
    warpIntensity: 15,
    colorBleedIntensity: 0.3,
    trackName: 'liquid-morph-track',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
