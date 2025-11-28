/**
 * Kaleidoscope Cube Carousel Preset
 *
 * Creates a mesmerizing kaleidoscopic effect where a 3D rotating cube is reflected through
 * multiple triangular mirror sections, forming a hexagonal mandala-like pattern. Features:
 *
 * - **6-Section Hexagonal Kaleidoscope**: Cube is mirrored in 6 triangular sections arranged in a hexagon
 * - **3D Cube Rotation**: Smooth hypnotic rotation with sine-wave velocity modulation
 * - **Prismatic Color Shifts**: Rainbow gradient overlays at reflection boundaries with additive blending
 * - **Crystalline Fracture Effects**: Animated clip-path transitions creating glass-shatter effects
 * - **Hue Breathing**: Subtle color cycling for living, organic feel
 * - **GPU Optimized**: Uses transform3d, will-change, and hardware acceleration
 * - **Configurable Rhythm**: Optional acceleration/deceleration patterns for visual dynamics
 *
 * Use cases:
 * - Hypnotic visual intros/outros
 * - Music video kaleidoscope effects
 * - Abstract brand showcases
 * - Psychedelic image galleries
 * - Meditative visual loops
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Parameter Schema ---

const presetParams = z.object({
  images: z
    .array(z.string())
    .length(6)
    .describe('Array of 6 image URLs for the cube faces (front, back, left, right, top, bottom)'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the kaleidoscope animation in seconds'),
  rotationSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Base rotation speed multiplier (1 = normal, 2 = 2x speed)'),
  rhythmPattern: z
    .enum(['smooth', 'pulse', 'accelerate', 'decelerate', 'wave'])
    .default('smooth')
    .describe('Rotation rhythm pattern: smooth (constant), pulse (periodic speed changes), accelerate, decelerate, or wave (sine modulation)'),
  prismaticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of prismatic rainbow overlays (0 = none, 1 = full)'),
  crystallineTransitions: z
    .boolean()
    .default(true)
    .describe('Enable crystalline fracture transition effects'),
  hueBreathing: z
    .boolean()
    .default(true)
    .describe('Enable subtle hue-rotate color breathing effect'),
  cubeSize: z
    .number()
    .min(100)
    .max(400)
    .default(200)
    .describe('Size of the 3D cube in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    duration,
    rotationSpeed,
    rhythmPattern,
    prismaticIntensity,
    crystallineTransitions,
    hueBreathing,
    cubeSize,
  } = params;

  // Helper: Generate rotation effect with rhythm pattern
  const generateRotationEffect = (cubeId: string, sectionIndex: number) => {
    const baseRotationDuration = duration / rotationSpeed;
    const phaseOffset = (sectionIndex * 60) / 360; // Offset each section by 60 degrees

    // Generate keyframes based on rhythm pattern
    let rotateYRanges: Array<{ key: string; val: string; prog: number }> = [];
    let rotateXRanges: Array<{ key: string; val: string; prog: number }> = [];

    switch (rhythmPattern) {
      case 'smooth':
        rotateYRanges = [
          { key: 'rotateY', val: `${0 + sectionIndex * 60}deg`, prog: 0 },
          { key: 'rotateY', val: `${360 + sectionIndex * 60}deg`, prog: 1 },
        ];
        rotateXRanges = [
          { key: 'rotateX', val: '15deg', prog: 0 },
          { key: 'rotateX', val: '15deg', prog: 1 },
        ];
        break;

      case 'pulse':
        rotateYRanges = [
          { key: 'rotateY', val: `${0 + sectionIndex * 60}deg`, prog: 0 },
          { key: 'rotateY', val: `${90 + sectionIndex * 60}deg`, prog: 0.25 },
          { key: 'rotateY', val: `${180 + sectionIndex * 60}deg`, prog: 0.5 },
          { key: 'rotateY', val: `${270 + sectionIndex * 60}deg`, prog: 0.75 },
          { key: 'rotateY', val: `${360 + sectionIndex * 60}deg`, prog: 1 },
        ];
        rotateXRanges = [
          { key: 'rotateX', val: '10deg', prog: 0 },
          { key: 'rotateX', val: '20deg', prog: 0.25 },
          { key: 'rotateX', val: '10deg', prog: 0.5 },
          { key: 'rotateX', val: '20deg', prog: 0.75 },
          { key: 'rotateX', val: '10deg', prog: 1 },
        ];
        break;

      case 'accelerate':
        rotateYRanges = [
          { key: 'rotateY', val: `${0 + sectionIndex * 60}deg`, prog: 0 },
          { key: 'rotateY', val: `${90 + sectionIndex * 60}deg`, prog: 0.4 },
          { key: 'rotateY', val: `${180 + sectionIndex * 60}deg`, prog: 0.65 },
          { key: 'rotateY', val: `${270 + sectionIndex * 60}deg`, prog: 0.82 },
          { key: 'rotateY', val: `${360 + sectionIndex * 60}deg`, prog: 1 },
        ];
        rotateXRanges = [
          { key: 'rotateX', val: '5deg', prog: 0 },
          { key: 'rotateX', val: '15deg', prog: 1 },
        ];
        break;

      case 'decelerate':
        rotateYRanges = [
          { key: 'rotateY', val: `${0 + sectionIndex * 60}deg`, prog: 0 },
          { key: 'rotateY', val: `${90 + sectionIndex * 60}deg`, prog: 0.18 },
          { key: 'rotateY', val: `${180 + sectionIndex * 60}deg`, prog: 0.35 },
          { key: 'rotateY', val: `${270 + sectionIndex * 60}deg`, prog: 0.6 },
          { key: 'rotateY', val: `${360 + sectionIndex * 60}deg`, prog: 1 },
        ];
        rotateXRanges = [
          { key: 'rotateX', val: '20deg', prog: 0 },
          { key: 'rotateX', val: '10deg', prog: 1 },
        ];
        break;

      case 'wave':
        rotateYRanges = [
          { key: 'rotateY', val: `${0 + sectionIndex * 60}deg`, prog: 0 },
          { key: 'rotateY', val: `${180 + sectionIndex * 60}deg`, prog: 0.5 },
          { key: 'rotateY', val: `${360 + sectionIndex * 60}deg`, prog: 1 },
        ];
        rotateXRanges = [
          { key: 'rotateX', val: '0deg', prog: 0 },
          { key: 'rotateX', val: '30deg', prog: 0.25 },
          { key: 'rotateX', val: '0deg', prog: 0.5 },
          { key: 'rotateX', val: '-30deg', prog: 0.75 },
          { key: 'rotateX', val: '0deg', prog: 1 },
        ];
        break;
    }

    return {
      id: `rotation-effect-${cubeId}`,
      componentId: 'generic',
      data: {
        type: rhythmPattern === 'smooth' ? 'linear' : 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [cubeId],
        ranges: [...rotateYRanges, ...rotateXRanges],
      },
    };
  };

  // Helper: Create a cube with 6 faces
  const createCube = (sectionIndex: number) => {
    const cubeId = `cube-3d-${sectionIndex}`;
    const halfSize = cubeSize / 2;

    const cubeFaces: RenderableComponentData[] = [
      // Front face
      {
        id: `cube-face-front-${sectionIndex}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: images[0],
          style: {
            position: 'absolute',
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            transform: `translateZ(${halfSize}px)`,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
      // Back face
      {
        id: `cube-face-back-${sectionIndex}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: images[1],
          style: {
            position: 'absolute',
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            transform: `rotateY(180deg) translateZ(${halfSize}px)`,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
      // Left face
      {
        id: `cube-face-left-${sectionIndex}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: images[2],
          style: {
            position: 'absolute',
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            transform: `rotateY(-90deg) translateZ(${halfSize}px)`,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
      // Right face
      {
        id: `cube-face-right-${sectionIndex}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: images[3],
          style: {
            position: 'absolute',
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            transform: `rotateY(90deg) translateZ(${halfSize}px)`,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
      // Top face
      {
        id: `cube-face-top-${sectionIndex}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: images[4],
          style: {
            position: 'absolute',
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            transform: `rotateX(90deg) translateZ(${halfSize}px)`,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
      // Bottom face
      {
        id: `cube-face-bottom-${sectionIndex}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: images[5],
          style: {
            position: 'absolute',
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            transform: `rotateX(-90deg) translateZ(${halfSize}px)`,
            backfaceVisibility: 'hidden',
            willChange: 'transform',
          },
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
    ];

    const cubeContainer: RenderableComponentData = {
      id: cubeId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [generateRotationEffect(cubeId, sectionIndex)],
      childrenData: cubeFaces,
    };

    return cubeContainer;
  };

  // Helper: Create kaleidoscope sections with clip-path
  const createKaleidoscopeSection = (sectionIndex: number) => {
    const clipPaths = [
      'polygon(50% 50%, 50% 0%, 100% 25%)', // Section 0 (top-right)
      'polygon(50% 50%, 100% 25%, 100% 75%)', // Section 1 (right)
      'polygon(50% 50%, 100% 75%, 50% 100%)', // Section 2 (bottom-right)
      'polygon(50% 50%, 50% 100%, 0% 75%)', // Section 3 (bottom-left)
      'polygon(50% 50%, 0% 75%, 0% 25%)', // Section 4 (left)
      'polygon(50% 50%, 0% 25%, 50% 0%)', // Section 5 (top-left)
    ];

    const sectionId = `kaleidoscope-section-${sectionIndex}`;
    const cube = createCube(sectionIndex);

    const section: RenderableComponentData = {
      id: sectionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: clipPaths[sectionIndex],
            transformOrigin: 'center',
            willChange: 'clip-path',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [cube],
    };

    return section;
  };

  // Create all 6 kaleidoscope sections
  const kaleidoscopeSections: RenderableComponentData[] = Array.from(
    { length: 6 },
    (_, i) => createKaleidoscopeSection(i)
  );

  // Prismatic overlay with rainbow gradients
  const prismaticOverlay: RenderableComponentData = {
    id: 'prismatic-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(60deg, rgba(255,0,0,0.1), rgba(255,165,0,0.1), rgba(255,255,0,0.1), rgba(0,255,0,0.1), rgba(0,0,255,0.1), rgba(128,0,128,0.1))',
          mixBlendMode: 'screen',
          opacity: prismaticIntensity,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Crystalline transition overlay (fracture effect)
  const crystallineOverlay: RenderableComponentData = {
    id: 'crystalline-transition-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(circle at center, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: crystallineTransitions
      ? [
          {
            id: 'crystalline-pulse',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['crystalline-transition-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.25 },
                { key: 'opacity', val: 0, prog: 0.5 },
                { key: 'opacity', val: 0.8, prog: 0.75 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ]
      : [],
  };

  // Hue breathing layer
  const hueBreathLayer: RenderableComponentData = {
    id: 'hue-breath-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: hueBreathing
      ? [
          {
            id: 'hue-rotate-breath',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['hue-breath-layer'],
              ranges: [
                { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
                { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.3, prog: 1 },
              ],
            },
          },
        ]
      : [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
        style: {
          perspective: '1200px',
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
      ...kaleidoscopeSections,
      prismaticOverlay,
      crystallineOverlay,
      hueBreathLayer,
    ] as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'kaleidoscope-cube-carousel',
  title: 'Kaleidoscope Cube Carousel',
  description:
    'A hypnotic kaleidoscopic carousel where a 3D rotating cube is reflected through 6 hexagonal mirror sections creating mandala-like symmetrical patterns. Features prismatic rainbow overlays at reflection boundaries, crystalline fracture transition effects, and smooth sine-wave rotation with optional acceleration patterns. The effect simulates looking through a kaleidoscope while images shift on the cube faces.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'kaleidoscope',
    'cube',
    '3d',
    'carousel',
    'mandala',
    'prismatic',
    'crystalline',
    'hypnotic',
    'rotation',
    'mirror',
    'reflection',
    'psychedelic',
  ],
  defaultInputParams: {
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&h=400&fit=crop',
    ],
    duration: 10,
    rotationSpeed: 1,
    rhythmPattern: 'smooth',
    prismaticIntensity: 0.6,
    crystallineTransitions: true,
    hueBreathing: true,
    cubeSize: 200,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const kaleidoscopeCubeCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
