/**
 * DNA Helix Carousel Preset
 *
 * A spiraling 3D double helix carousel where images wrap around a DNA-like structure.
 * Features continuous corkscrew rotation, depth-based scaling and opacity fading,
 * CSS-based chromatic aberration effects at edges, and configurable spiral tightness
 * and rotation speed. Creates an organic, flowing vortex effect with images appearing
 * to float in space.
 *
 * Features:
 * - **3D Double Helix Structure**: Images positioned using sin/cos calculations for DNA-like spiral
 * - **Depth-Based Scaling**: Images scale from 0.5 to 1.0 based on z-position
 * - **Opacity Fading**: Images fade from 0.3 to 1.0 creating depth perception
 * - **Chromatic Aberration**: CSS-based color separation effects at edges for depth
 * - **Continuous Rotation**: Smooth, endless spiral animation via generic effects
 * - **Adjustable Parameters**: Configurable spiral tightness, speed, and image count
 * - **Optional Parallax**: Mouse/touch input for interactive depth perception (placeholder)
 *
 * Use cases:
 * - Creating dynamic 3D image galleries
 * - Building immersive product showcases
 * - Adding cinematic carousel effects
 * - Creating vortex-style visual presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .min(1)
    .describe('Array of images to display in the helix'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the carousel in seconds'),
  spiralRadius: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Radius of the helix spiral in pixels (controls tightness)'),
  verticalSpacing: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Vertical spacing between images in pixels'),
  rotationSpeed: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Rotation speed in seconds for one full rotation'),
  imageSize: z
    .number()
    .min(64)
    .max(256)
    .default(128)
    .describe('Size of each image in pixels (width/height)'),
  chromaticAberration: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Chromatic aberration offset in pixels'),
  imagesPerStrand: z
    .number()
    .min(3)
    .max(20)
    .default(10)
    .describe('Number of images per helix strand'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    duration,
    spiralRadius,
    verticalSpacing,
    rotationSpeed,
    imageSize,
    chromaticAberration,
    imagesPerStrand,
  } = params;

  // Helper function to create image nodes for a helix strand
  const createHelixStrand = (
    strandId: string,
    angleOffset: number,
  ): RenderableComponentData[] => {
    const nodes: RenderableComponentData[] = [];
    const totalImages = Math.min(images.length, imagesPerStrand);

    for (let i = 0; i < totalImages; i++) {
      const imageIndex = i % images.length;
      const image = images[imageIndex];

      // Calculate spiral position using parametric equations
      // angle progresses as we go down the helix
      const angleStep = (Math.PI * 2) / imagesPerStrand;
      const angle = angleOffset + i * angleStep;

      // Calculate 3D position
      const x = Math.cos(angle) * spiralRadius;
      const z = Math.sin(angle) * spiralRadius;
      const y = i * verticalSpacing;

      // Calculate depth-based scale and opacity
      // z goes from -radius to +radius, normalize to 0-1
      const depthProgress = (z + spiralRadius) / (spiralRadius * 2);
      const scale = 0.5 + 0.5 * depthProgress;
      const opacity = 0.3 + 0.7 * depthProgress;

      // Rotation to face viewer
      const rotateY = (angle * 180) / Math.PI;

      // Create chromatic aberration layers
      const imageNode: RenderableComponentData = {
        id: `${strandId}-image-${i}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${imageSize}px`,
              height: `${imageSize}px`,
              transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotateY}deg) scale(${scale})`,
              transformStyle: 'preserve-3d',
              opacity: opacity,
              left: '50%',
              top: '50%',
              marginLeft: `-${imageSize / 2}px`,
              marginTop: `-${imageSize / 2}px`,
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
          // Chromatic aberration group
          {
            id: `${strandId}-chromatic-group-${i}`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative w-full h-full',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            childrenData: [
              // Red channel (left offset)
              {
                id: `${strandId}-red-${i}`,
                type: 'atom' as const,
                componentId: 'ImageAtom',
                data: {
                  src: image.src,
                  className: 'absolute inset-0 rounded-lg',
                  style: {
                    transform: `translateX(-${chromaticAberration}px)`,
                    filter:
                      'grayscale(100%) brightness(40%) sepia(100%) hue-rotate(-50deg) saturate(600%)',
                    mixBlendMode: 'lighten',
                    opacity: 0.5,
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: duration,
                  },
                },
              },
              // Main image
              {
                id: `${strandId}-main-${i}`,
                type: 'atom' as const,
                componentId: 'ImageAtom',
                data: {
                  src: image.src,
                  className: 'absolute inset-0 rounded-lg shadow-lg',
                  style: {
                    objectFit: 'cover',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: duration,
                  },
                },
              },
              // Blue channel (right offset)
              {
                id: `${strandId}-blue-${i}`,
                type: 'atom' as const,
                componentId: 'ImageAtom',
                data: {
                  src: image.src,
                  className: 'absolute inset-0 rounded-lg',
                  style: {
                    transform: `translateX(${chromaticAberration}px)`,
                    filter:
                      'grayscale(100%) brightness(40%) sepia(100%) hue-rotate(180deg) saturate(600%)',
                    mixBlendMode: 'lighten',
                    opacity: 0.5,
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: duration,
                  },
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      nodes.push(imageNode);
    }

    return nodes;
  };

  // Create both helix strands (offset by 180 degrees / PI radians)
  const strandANodes = createHelixStrand('helix-strand-a', 0);
  const strandBNodes = createHelixStrand('helix-strand-b', Math.PI);

  // Create continuous rotation effect for the entire helix container
  const helixRotationEffect = {
    id: 'helix-rotation',
    componentId: 'generic' as const,
    data: {
      type: 'linear' as const,
      start: 0,
      duration: rotationSpeed,
      mode: 'provider' as const,
      targetIds: ['helix-3d-container'],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: 360, prog: 1 },
      ],
    },
  };

  // Build the complete structure
  const helixStrandA: RenderableComponentData = {
    id: 'helix-strand-a',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: strandANodes,
  };

  const helixStrandB: RenderableComponentData = {
    id: 'helix-strand-b',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: strandBNodes,
  };

  const helix3dContainer: RenderableComponentData = {
    id: 'helix-3d-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [helixRotationEffect],
    childrenData: [helixStrandA, helixStrandB],
  };

  const rootContainer: RenderableComponentData = {
    id: 'helix-carousel-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '800px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [helix3dContainer],
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
  id: 'dna-helix-carousel',
  title: 'DNA Helix Carousel',
  description:
    'A spiraling 3D double helix carousel where images wrap around a DNA-like structure. Features continuous corkscrew rotation, depth-based scaling and opacity fading, CSS-based chromatic aberration effects at edges, and configurable spiral tightness and rotation speed. Creates an organic, flowing vortex effect with images appearing to float in space.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'carousel',
    '3d',
    'helix',
    'dna',
    'spiral',
    'vortex',
    'images',
    'chromatic-aberration',
    'depth',
    'rotation',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://picsum.photos/200/200?random=1' },
      { src: 'https://picsum.photos/200/200?random=2' },
      { src: 'https://picsum.photos/200/200?random=3' },
      { src: 'https://picsum.photos/200/200?random=4' },
      { src: 'https://picsum.photos/200/200?random=5' },
      { src: 'https://picsum.photos/200/200?random=6' },
    ],
    duration: 10,
    spiralRadius: 200,
    verticalSpacing: 150,
    rotationSpeed: 20,
    imageSize: 128,
    chromaticAberration: 2,
    imagesPerStrand: 10,
  },
  dependencies: {},
};

// Export preset
export const dnaHelixCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
