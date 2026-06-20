/**
 * Portal Dimension Reveal Preset
 *
 * Doctor Strange inspired portal reveal effect where cutout images appear through
 * swirling, rotating geometric portals. Features 4 concentric rings rotating at
 * different speeds for parallax depth, glowing cyan/purple/blue edges with screen
 * blend mode, and energy particles pulsing around the portal.
 *
 * Features:
 * - 4 concentric portal rings with different rotation speeds and directions
 * - Glowing edges with energy particles and screen blend mode
 * - Image reveal through expanding circular mask synchronized with captions
 * - Caption sentence boundaries trigger new portal opening sequences
 * - GPU-accelerated transforms for smooth 60fps performance
 * - Parallax depth effect through varied rotation speeds
 *
 * Use cases:
 * - Dramatic product reveals with sci-fi aesthetic
 * - Speaker introductions with portal entrance effects
 * - Magical transformations and dimension-hopping transitions
 * - Creative content reveals with high visual impact
 *
 * Technical approach:
 * - Uses caption timing data to trigger portal sequences
 * - Each caption sentence opens a new portal with synchronized image reveal
 * - Portal rings use CSS keyframe animations for continuous rotation
 * - Image clip-path animates from circle(0%) to circle(50%) via effects
 * - Particles positioned around portal edges with pulsing animations
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  trackId: z
    .string()
    .default('portal-dimension-reveal-track')
    .describe('Unique ID for this preset instance'),
  
  captions: z
    .array(z.any())
    .describe('Array of caption objects with timing and text data for triggering portal sequences'),
  
  imageSrc: z
    .string()
    .describe('Source URL for the cutout image to reveal through the portal'),
  
  imageFit: z
    .enum(['cover', 'contain', 'fill', 'none'])
    .default('cover')
    .describe('How the image should fit within the container'),
  
  portalOpenDuration: z
    .number()
    .default(0.5)
    .describe('Duration in seconds for portal opening animation'),
  
  portalCloseDuration: z
    .number()
    .default(0.3)
    .describe('Duration in seconds for portal closing animation'),
  
  imageRevealDuration: z
    .number()
    .default(0.6)
    .describe('Duration in seconds for image circular mask reveal animation'),
  
  outerRingSize: z
    .number()
    .default(80)
    .describe('Size of outer portal ring in vmin units'),
  
  middleRingSize: z
    .number()
    .default(60)
    .describe('Size of middle portal ring in vmin units'),
  
  innerRingSize: z
    .number()
    .default(40)
    .describe('Size of inner portal ring in vmin units'),
  
  coreRingSize: z
    .number()
    .default(20)
    .describe('Size of core portal ring in vmin units'),
  
  outerRingColor: z
    .string()
    .default('cyan')
    .describe('Tailwind color name for outer ring (e.g., "cyan", "purple", "blue")'),
  
  middleRingColor: z
    .string()
    .default('purple')
    .describe('Tailwind color name for middle ring'),
  
  innerRingColor: z
    .string()
    .default('blue')
    .describe('Tailwind color name for inner ring'),
  
  coreRingColor: z
    .string()
    .default('white')
    .describe('Tailwind color name for core ring'),
  
  particleCount: z
    .number()
    .default(8)
    .describe('Number of energy particles to render around portal edges'),
  
  backgroundColor: z
    .string()
    .default('black')
    .describe('Background color for the portal scene'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    trackId,
    captions,
    imageSrc,
    imageFit,
    portalOpenDuration,
    portalCloseDuration,
    imageRevealDuration,
    outerRingSize,
    middleRingSize,
    innerRingSize,
    coreRingSize,
    outerRingColor,
    middleRingColor,
    innerRingColor,
    coreRingColor,
    particleCount,
    backgroundColor,
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;

  // Helper function to convert color name to RGB values for shadows
  const getColorRgb = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      cyan: '0, 255, 255',
      purple: '168, 85, 247',
      blue: '96, 165, 250',
      white: '255, 255, 255',
      red: '239, 68, 68',
      green: '34, 197, 94',
      yellow: '250, 204, 21',
      pink: '236, 72, 153',
      orange: '251, 146, 60',
    };
    return colorMap[colorName] || '255, 255, 255';
  };

  // Helper function to get Tailwind color class
  const getColorClass = (colorName: string, shade: number = 400): string => {
    return `border-${colorName}-${shade}`;
  };

  // Parse captions
  const parsedCaptions: TranscriptionSentence[] = captions.map((cap: any, index: number) => {
    const start = cap.start ?? cap.absoluteStart ?? 0;
    const end = cap.end ?? cap.absoluteEnd ?? (cap.duration ? start + cap.duration : start + 3);
    const duration = end - start;
    
    return {
      id: cap.id || `caption-${index}`,
      text: cap.text || '',
      start: 0,
      absoluteStart: start,
      end: duration,
      absoluteEnd: end,
      duration: duration,
      words: cap.words || [],
    };
  });

  // Calculate total duration
  const totalDuration = parsedCaptions.length > 0
    ? Math.max(...parsedCaptions.map((c) => c.absoluteEnd))
    : 10;

  // Build component tree
  const childrenData: RenderableComponentData[] = [];

  // Process each caption to create portal sequences
  parsedCaptions.forEach((caption, captionIndex) => {
    const captionStart = caption.absoluteStart;
    const captionDuration = caption.duration;

    // Portal root container for this caption
    const portalRootId = `${trackId}-portal-root-${captionIndex}`;
    const imageLayerId = `${trackId}-image-layer-${captionIndex}`;
    const cutoutImageId = `${trackId}-cutout-image-${captionIndex}`;
    const portalContainerId = `${trackId}-portal-container-${captionIndex}`;
    const particleLayerId = `${trackId}-particle-layer-${captionIndex}`;

    // Create portal rings
    const portalRings: RenderableComponentData[] = [
      // Outer ring
      {
        id: `${trackId}-portal-ring-outer-${captionIndex}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          className: `absolute rounded-full ${getColorClass(outerRingColor, 400)} border-4`,
          style: {
            width: `${outerRingSize}vmin`,
            height: `${outerRingSize}vmin`,
            mixBlendMode: 'screen',
            boxShadow: `0 0 30px rgba(${getColorRgb(outerRingColor)}, 0.6), inset 0 0 30px rgba(${getColorRgb(outerRingColor)}, 0.3)`,
            transformOrigin: 'center center',
            animation: 'spin 4s linear infinite',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
        effects: [
          {
            id: `${trackId}-outer-ring-open-${captionIndex}`,
            componentId: `${trackId}-portal-ring-outer-${captionIndex}`,
            data: {
              type: 'ease-out',
              start: 0,
              duration: portalOpenDuration,
              mode: 'provider',
              targetIds: [`${trackId}-portal-ring-outer-${captionIndex}`],
              ranges: [
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.2, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      
      // Middle ring
      {
        id: `${trackId}-portal-ring-middle-${captionIndex}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          className: `absolute rounded-full ${getColorClass(middleRingColor, 500)} border-4`,
          style: {
            width: `${middleRingSize}vmin`,
            height: `${middleRingSize}vmin`,
            mixBlendMode: 'screen',
            boxShadow: `0 0 25px rgba(${getColorRgb(middleRingColor)}, 0.6), inset 0 0 25px rgba(${getColorRgb(middleRingColor)}, 0.3)`,
            transformOrigin: 'center center',
            animation: 'spin 3s linear infinite reverse',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
        effects: [
          {
            id: `${trackId}-middle-ring-open-${captionIndex}`,
            componentId: `${trackId}-portal-ring-middle-${captionIndex}`,
            data: {
              type: 'ease-out',
              start: 0,
              duration: portalOpenDuration,
              mode: 'provider',
              targetIds: [`${trackId}-portal-ring-middle-${captionIndex}`],
              ranges: [
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.2, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      
      // Inner ring
      {
        id: `${trackId}-portal-ring-inner-${captionIndex}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          className: `absolute rounded-full ${getColorClass(innerRingColor, 400)} border-4`,
          style: {
            width: `${innerRingSize}vmin`,
            height: `${innerRingSize}vmin`,
            mixBlendMode: 'screen',
            boxShadow: `0 0 20px rgba(${getColorRgb(innerRingColor)}, 0.6), inset 0 0 20px rgba(${getColorRgb(innerRingColor)}, 0.3)`,
            transformOrigin: 'center center',
            animation: 'spin 2s linear infinite',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
        effects: [
          {
            id: `${trackId}-inner-ring-open-${captionIndex}`,
            componentId: `${trackId}-portal-ring-inner-${captionIndex}`,
            data: {
              type: 'ease-out',
              start: 0,
              duration: portalOpenDuration,
              mode: 'provider',
              targetIds: [`${trackId}-portal-ring-inner-${captionIndex}`],
              ranges: [
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.2, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      
      // Core ring
      {
        id: `${trackId}-portal-ring-core-${captionIndex}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          className: `absolute rounded-full ${getColorClass(coreRingColor)} border-2`,
          style: {
            width: `${coreRingSize}vmin`,
            height: `${coreRingSize}vmin`,
            mixBlendMode: 'screen',
            boxShadow: `0 0 40px rgba(${getColorRgb(coreRingColor)}, 0.8), inset 0 0 20px rgba(${getColorRgb(coreRingColor)}, 0.5)`,
            transformOrigin: 'center center',
            animation: 'pulse 1.5s ease-in-out infinite',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
        effects: [
          {
            id: `${trackId}-core-ring-open-${captionIndex}`,
            componentId: `${trackId}-portal-ring-core-${captionIndex}`,
            data: {
              type: 'ease-out',
              start: 0,
              duration: portalOpenDuration,
              mode: 'provider',
              targetIds: [`${trackId}-portal-ring-core-${captionIndex}`],
              ranges: [
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ];

    // Create particles
    const particles: RenderableComponentData[] = [];
    const particlePositions = [
      { top: '20%', left: '45%' },
      { top: '30%', right: '35%' },
      { bottom: '25%', left: '30%' },
      { top: '50%', right: '25%' },
      { top: '65%', left: '40%' },
      { bottom: '35%', right: '40%' },
      { top: '40%', left: '25%' },
      { bottom: '20%', right: '30%' },
    ];

    const particleColors = [outerRingColor, middleRingColor, innerRingColor, coreRingColor];
    
    for (let i = 0; i < particleCount && i < particlePositions.length; i++) {
      const particleColor = particleColors[i % particleColors.length];
      const particleSize = [2, 1, 3, 2, 1, 2, 1, 3][i] || 2;
      
      particles.push({
        id: `${trackId}-particle-${captionIndex}-${i}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          className: `absolute w-${particleSize} h-${particleSize} rounded-full bg-${particleColor}-400 animate-pulse`,
          style: {
            ...particlePositions[i],
            boxShadow: `0 0 ${particleSize * 5}px rgba(${getColorRgb(particleColor)}, 0.8)`,
            mixBlendMode: 'screen',
            animationDelay: `${i * 0.1}s`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
      } as RenderableComponentData);
    }

    // Portal container with rings
    const portalContainer: RenderableComponentData = {
      id: portalContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      childrenData: portalRings,
    };

    // Particle layer
    const particleLayer: RenderableComponentData = {
      id: particleLayerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      childrenData: particles,
    };

    // Image with circular reveal
    const cutoutImage: RenderableComponentData = {
      id: cutoutImageId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'w-full h-full object-cover',
        style: {
          clipPath: 'circle(0%)',
        },
        fit: imageFit,
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      effects: [
        {
          id: `${trackId}-image-reveal-${captionIndex}`,
          componentId: cutoutImageId,
          data: {
            type: 'ease-out',
            start: 0,
            duration: imageRevealDuration,
            mode: 'provider',
            targetIds: [cutoutImageId],
            ranges: [
              { key: 'clipPath', val: 'circle(0%)', prog: 0 },
              { key: 'clipPath', val: 'circle(50%)', prog: 1 },
            ],
          },
        },
      ],
    };

    // Image layer
    const imageLayer: RenderableComponentData = {
      id: imageLayerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      childrenData: [cutoutImage],
    };

    // Portal root for this caption
    const portalRoot: RenderableComponentData = {
      id: portalRootId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex items-center justify-center bg-${backgroundColor} overflow-hidden`,
        },
      },
      context: {
        timing: {
          start: captionStart,
          duration: captionDuration,
        },
      },
      childrenData: [imageLayer, portalContainer, particleLayer],
    };

    childrenData.push(portalRoot);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-main-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          // Add keyframe animations via style tag injection (handled by runtime)
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'portal-dimension-reveal',
  title: 'Portal Dimension Reveal',
  description:
    'Doctor Strange inspired portal reveal effect where cutout images appear through swirling, rotating geometric portals. Features 4 concentric rings rotating at different speeds for parallax depth, glowing cyan/purple/blue edges with screen blend mode, and energy particles pulsing around the portal. Each caption sentence triggers a new portal opening sequence with the image revealed through an expanding circular mask. Perfect for dramatic product reveals, speaker introductions, or magical transformations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'portal',
    'reveal',
    'sci-fi',
    'doctor-strange',
    'dimensional',
    'geometric',
    'rotation',
    'parallax',
    'glow',
    'particles',
    'energy',
    'wormhole',
    'captions',
    'image',
    'dramatic',
  ],
  defaultInputParams: {
    trackId: 'portal-dimension-reveal-track',
    captions: [
      {
        id: 'caption-1',
        text: 'Welcome to another dimension',
        absoluteStart: 0,
        absoluteEnd: 3,
        duration: 3,
        start: 0,
        end: 3,
        words: [],
      },
      {
        id: 'caption-2',
        text: 'Where reality bends and shifts',
        absoluteStart: 3.5,
        absoluteEnd: 6.5,
        duration: 3,
        start: 0,
        end: 3,
        words: [],
      },
    ],
    imageSrc:
      'https://images.unsplash.com/photo-1618022325802-7e5e732d97a1?w=800&h=800&fit=crop',
    imageFit: 'cover',
    portalOpenDuration: 0.5,
    portalCloseDuration: 0.3,
    imageRevealDuration: 0.6,
    outerRingSize: 80,
    middleRingSize: 60,
    innerRingSize: 40,
    coreRingSize: 20,
    outerRingColor: 'cyan',
    middleRingColor: 'purple',
    innerRingColor: 'blue',
    coreRingColor: 'white',
    particleCount: 8,
    backgroundColor: 'black',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const portalDimensionRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z
    .object(presetParams.shape)
    .passthrough()
    .transform((val) => val),
};
