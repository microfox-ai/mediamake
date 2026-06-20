/**
 * Vintage Film Strip Panorama Preset
 *
 * This preset emulates the look of 35mm film being pulled through a projector. Images appear
 * in film frame borders with sprocket holes on top and bottom. The movement simulates real
 * film transport with mechanical irregularities - minor speed variations and gentle vertical
 * wobble. Film grain overlay and occasional light leaks add authenticity, while subtle
 * flickering simulates projection.
 *
 * Features:
 * - **Film Strip Aesthetics**: Film frame borders with sprocket holes (top and bottom)
 * - **Mechanical Irregularities**: Speed variations and vertical wobble to simulate film transport
 * - **Film Grain Overlay**: Semi-transparent grain texture for authenticity
 * - **Light Leaks**: Occasional light leak effects between frames
 * - **Projection Flicker**: Subtle opacity flickering to simulate projection
 * - **Continuous Scrolling**: Right-to-left panoramic scrolling
 *
 * Use cases:
 * - Creating vintage film projector effects
 * - Nostalgic photo slideshows with film aesthetic
 * - Retro video transitions with film strip look
 * - Artistic film-style presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
      }),
    )
    .describe('Array of images to display in film strip'),
  duration: z
    .number()
    .min(1)
    .default(30)
    .optional()
    .describe('Total duration of the film strip animation in seconds'),
  frameWidth: z
    .number()
    .min(200)
    .default(400)
    .optional()
    .describe('Width of each film frame in pixels'),
  sprocketColor: z
    .string()
    .default('#2a2a2a')
    .optional()
    .describe('Color of the sprocket holes'),
  filmBorderColor: z
    .string()
    .default('#1a1a1a')
    .optional()
    .describe('Color of the film border'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of the film grain overlay (0-1)'),
  wobbleIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe('Intensity of vertical wobble in pixels'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .optional()
    .describe('Intensity of projection flicker (0-0.3)'),
  lightLeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Intensity of light leak effects (0-1)'),
  trackName: z
    .string()
    .default('film-strip')
    .optional()
    .describe('Name of the track for ID generation'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    duration = 30,
    frameWidth = 400,
    sprocketColor = '#2a2a2a',
    filmBorderColor = '#1a1a1a',
    grainIntensity = 0.3,
    wobbleIntensity = 2,
    flickerIntensity = 0.1,
    lightLeakIntensity = 0.8,
    trackName = 'film-strip',
  } = params;

  // Calculate total width of film strip
  const totalWidth = images.length * frameWidth;

  // Helper: Generate sprocket holes
  const generateSprocketHoles = (count: number, containerId: string) => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `${containerId}-sprocket-${i}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 8px; height: 8px; background-color: ${sprocketColor}; border-radius: 50%;"></div>`,
        className: 'flex-shrink-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    }));
  };

  // Create film frames
  const filmFrames = images.map((image, index) => {
    const frameId = `${trackName}-frame-${index}`;
    const topSprocketContainerId = `${frameId}-top-sprockets`;
    const bottomSprocketContainerId = `${frameId}-bottom-sprockets`;

    return {
      id: frameId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex flex-col flex-shrink-0',
          style: {
            width: `${frameWidth}px`,
            height: '100%',
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
        // Top sprocket container
        {
          id: topSprocketContainerId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row justify-around py-2',
              style: {
                backgroundColor: filmBorderColor,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: generateSprocketHoles(
            10,
            topSprocketContainerId,
          ) as RenderableComponentData[],
        },
        // Image
        {
          id: `${frameId}-image`,
          type: 'atom' as const,
          componentId: 'ImageAtom',
          data: {
            src: image.src,
            className: 'flex-1 mx-4 object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
        // Bottom sprocket container
        {
          id: bottomSprocketContainerId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row justify-around py-2',
              style: {
                backgroundColor: filmBorderColor,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: generateSprocketHoles(
            10,
            bottomSprocketContainerId,
          ) as RenderableComponentData[],
        },
      ] as RenderableComponentData[],
    };
  });

  // Film strip container ID
  const filmStripContainerId = `${trackName}-strip-container`;

  // --- Effects ---

  // Horizontal scroll effect (right to left with speed variations)
  const horizontalScrollEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [filmStripContainerId],
    ranges: [
      { key: 'translateX', val: 100, prog: 0, unit: '%' },
      { key: 'translateX', val: 30, prog: 0.25, unit: '%' },
      { key: 'translateX', val: -20, prog: 0.5, unit: '%' },
      { key: 'translateX', val: -50, prog: 0.7, unit: '%' },
      { key: 'translateX', val: -100, prog: 1, unit: '%' },
    ],
  };

  // Vertical wobble effect (simulates film transport wobble)
  const verticalWobbleEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [filmStripContainerId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0, unit: 'px' },
      { key: 'translateY', val: wobbleIntensity, prog: 0.15, unit: 'px' },
      { key: 'translateY', val: -wobbleIntensity / 2, prog: 0.35, unit: 'px' },
      { key: 'translateY', val: -wobbleIntensity, prog: 0.5, unit: 'px' },
      { key: 'translateY', val: wobbleIntensity / 2, prog: 0.65, unit: 'px' },
      { key: 'translateY', val: wobbleIntensity, prog: 0.85, unit: 'px' },
      { key: 'translateY', val: 0, prog: 1, unit: 'px' },
    ],
  };

  // Flicker effect (projection simulation)
  const flickerOverlayId = `${trackName}-flicker-overlay`;
  const flickerEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [flickerOverlayId],
    ranges: [
      { key: 'opacity', val: 0.05, prog: 0 },
      { key: 'opacity', val: 0.05 + flickerIntensity, prog: 0.1 },
      { key: 'opacity', val: 0.03, prog: 0.2 },
      { key: 'opacity', val: 0.1, prog: 0.35 },
      { key: 'opacity', val: 0.05, prog: 0.5 },
      { key: 'opacity', val: 0.05 + flickerIntensity * 0.7, prog: 0.7 },
      { key: 'opacity', val: 0.05, prog: 1 },
    ],
  };

  // Light leak effects (2 separate light leaks at different times)
  const lightLeak1Id = `${trackName}-light-leak-1`;
  const lightLeak2Id = `${trackName}-light-leak-2`;

  const lightLeak1Effect: GenericEffectData = {
    type: 'ease-in-out',
    start: duration * 0.3, // Appears 30% into animation
    duration: 0.5,
    mode: 'provider',
    targetIds: [lightLeak1Id],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: lightLeakIntensity, prog: 0.5 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  const lightLeak2Effect: GenericEffectData = {
    type: 'ease-in-out',
    start: duration * 0.7, // Appears 70% into animation
    duration: 0.6,
    mode: 'provider',
    targetIds: [lightLeak2Id],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: lightLeakIntensity * 0.7, prog: 0.5 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // --- Child Data Structure ---

  const childrenData: RenderableComponentData[] = [
    // Film strip container
    {
      id: filmStripContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full flex flex-row',
          style: {
            width: `${totalWidth}px`,
          },
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
          id: `${trackName}-horizontal-scroll`,
          componentId: 'generic',
          data: horizontalScrollEffect,
        },
        {
          id: `${trackName}-vertical-wobble`,
          componentId: 'generic',
          data: verticalWobbleEffect,
        },
      ],
      childrenData: filmFrames as RenderableComponentData[],
    },
    // Grain overlay
    {
      id: `${trackName}-grain-overlay`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: `rgba(255, 255, 255, ${grainIntensity * 0.02})`,
            opacity: grainIntensity,
            mixBlendMode: 'screen',
            backgroundImage:
              "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')",
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    },
    // Flicker overlay
    {
      id: flickerOverlayId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            mixBlendMode: 'screen',
          },
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
          id: `${trackName}-flicker`,
          componentId: 'generic',
          data: flickerEffect,
        },
      ],
      childrenData: [],
    },
    // Light leak 1
    {
      id: lightLeak1Id,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            width: '200px',
            height: '100%',
            right: '20%',
            top: 0,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255, 230, 180, 0.3) 50%, transparent 100%)',
            mixBlendMode: 'screen',
          },
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
          id: `${trackName}-light-leak-1-effect`,
          componentId: 'generic',
          data: lightLeak1Effect,
        },
      ],
      childrenData: [],
    },
    // Light leak 2
    {
      id: lightLeak2Id,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            width: '150px',
            height: '100%',
            left: '40%',
            top: 0,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255, 200, 150, 0.25) 50%, transparent 100%)',
            mixBlendMode: 'screen',
          },
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
          id: `${trackName}-light-leak-2-effect`,
          componentId: 'generic',
          data: lightLeak2Effect,
        },
      ],
      childrenData: [],
    },
    // Vignette overlay
    {
      id: `${trackName}-vignette-overlay`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.6) 100%)',
            mixBlendMode: 'multiply',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    },
  ];

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'vintage-film-strip-panorama',
  title: 'Vintage Film Strip Panorama',
  description:
    'Emulates 35mm film being pulled through a projector with film frame borders, sprocket holes, mechanical irregularities (speed variations and vertical wobble), film grain overlay, light leaks, and projection flickering. Images scroll continuously from right to left with authentic vintage effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'film',
    'vintage',
    'panorama',
    'film-strip',
    'projector',
    'retro',
    '35mm',
    'grain',
    'light-leak',
    'flicker',
  ],
  dependencies: {},
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e' },
      { src: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29' },
    ],
    duration: 30,
    frameWidth: 400,
    sprocketColor: '#2a2a2a',
    filmBorderColor: '#1a1a1a',
    grainIntensity: 0.3,
    wobbleIntensity: 2,
    flickerIntensity: 0.1,
    lightLeakIntensity: 0.8,
    trackName: 'film-strip',
  },
};

// --- Export Preset ---
export const vintageFilmStripPanoramaPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
