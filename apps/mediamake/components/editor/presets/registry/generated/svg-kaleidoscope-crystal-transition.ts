/**
 * Kaleidoscope Crystal Transition Preset
 *
 * Creates stunning crystalline transition effects that fragment images into symmetric geometric patterns
 * with prismatic color shifts and light refraction. Images break into crystalline shards that rotate
 * and refract like looking through a kaleidoscope prism, revealing the next image with rainbow edges
 * and specular highlights.
 *
 * Features:
 * - **Multiple Symmetry Patterns**: Hexagonal (6-way), square (4-way), triangular (3-way), octagonal (8-way)
 * - **Prismatic Effects**: Chromatic aberration, rainbow edges, color separation
 * - **Crystal Animation**: Simultaneous rotation with spring easing and organic variations
 * - **Light Refraction**: Specular highlights, gradient overlays, hue rotation
 * - **Audio Layers**: Glass shatter, rotation whoosh, crystalline chime effects
 * - **Performance Optimized**: GPU-accelerated transforms, pre-calculated geometry
 *
 * Use cases:
 * - Art gallery transitions treating each image as precious artwork
 * - Kaleidoscope-style photo slideshows with geometric beauty
 * - Premium video transitions with crystalline aesthetics
 * - Music video effects with prismatic color play
 */

import { z } from 'zod';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingImageSrc: z
    .string()
    .describe('Source URL of the current/outgoing image'),
  incomingImageSrc: z
    .string()
    .describe('Source URL of the next/incoming image'),
  symmetryPattern: z
    .enum(['hexagonal', 'square', 'triangular', 'octagonal'])
    .default('hexagonal')
    .describe(
      'Kaleidoscope symmetry pattern: hexagonal (6-way), square (4-way), triangular (3-way), or octagonal (8-way)',
    ),
  transitionDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Total duration of the crystal transition in seconds'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Intensity of chromatic aberration effect (0 = none, 1 = maximum)',
    ),
  rotationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Rotation speed multiplier for crystal segments'),
  glassShatterSoundSrc: z
    .string()
    .optional()
    .describe('Optional URL for glass shatter sound effect'),
  rotationWhooshSoundSrc: z
    .string()
    .optional()
    .describe('Optional URL for rotation whoosh sound effect'),
  crystalChimeSoundSrc: z
    .string()
    .optional()
    .describe('Optional URL for crystal chime sound effect'),
  soundVolume: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Master volume for all sound effects'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImageSrc,
    incomingImageSrc,
    symmetryPattern,
    transitionDuration,
    chromaticIntensity,
    rotationIntensity,
    glassShatterSoundSrc,
    rotationWhooshSoundSrc,
    crystalChimeSoundSrc,
    soundVolume,
  } = params;

  // Helper: Calculate clip path polygons based on symmetry pattern
  const calculateClipPaths = (
    pattern: string,
  ): Array<{ clipPath: string; rotation: number }> => {
    const segments: Array<{ clipPath: string; rotation: number }> = [];
    const center = '50% 50%';

    if (pattern === 'hexagonal') {
      // 6 triangular wedges at 60-degree intervals
      const angleStep = 60;
      for (let i = 0; i < 6; i++) {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
        const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
        const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
        const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
        segments.push({
          clipPath: `polygon(${center}, ${x1}% ${y1}%, ${x2}% ${y2}%)`,
          rotation: startAngle,
        });
      }
    } else if (pattern === 'square') {
      // 4 triangular wedges at 90-degree intervals
      const angleStep = 90;
      for (let i = 0; i < 4; i++) {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
        const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
        const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
        const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
        segments.push({
          clipPath: `polygon(${center}, ${x1}% ${y1}%, ${x2}% ${y2}%)`,
          rotation: startAngle,
        });
      }
    } else if (pattern === 'triangular') {
      // 3 triangular wedges at 120-degree intervals
      const angleStep = 120;
      for (let i = 0; i < 3; i++) {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
        const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
        const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
        const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
        segments.push({
          clipPath: `polygon(${center}, ${x1}% ${y1}%, ${x2}% ${y2}%)`,
          rotation: startAngle,
        });
      }
    } else if (pattern === 'octagonal') {
      // 8 triangular wedges at 45-degree intervals
      const angleStep = 45;
      for (let i = 0; i < 8; i++) {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
        const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
        const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
        const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
        segments.push({
          clipPath: `polygon(${center}, ${x1}% ${y1}%, ${x2}% ${y2}%)`,
          rotation: startAngle,
        });
      }
    }

    return segments;
  };

  // Helper: Generate random variation for organic feel (±50ms)
  const getRandomVariation = (): number => {
    return (Math.random() - 0.5) * 0.1; // ±0.05s variation
  };

  const clipPaths = calculateClipPaths(symmetryPattern);
  const segmentCount = clipPaths.length;
  const rotationAngle = 360 / segmentCount;

  // Phase timings
  const shatterDuration = 0.2;
  const rotateDuration = 0.3;
  const settleDuration = 0.1;
  const totalPhaseDuration = shatterDuration + rotateDuration + settleDuration;

  // Adjust durations to fit transitionDuration
  const durationScale = transitionDuration / totalPhaseDuration;

  // Create crystal segment components with effects
  const crystalSegments: RenderableComponentData[] = clipPaths.map(
    (segment, index) => {
      const segmentId = `crystal-segment-${index}`;
      const variation = getRandomVariation();

      // Phase 1: Shatter (0 - shatterDuration)
      const shatterEffect = {
        id: `shatter-effect-${index}`,
        componentId: segmentId,
        data: {
          type: 'ease-out',
          start: 0 + variation,
          duration: shatterDuration * durationScale,
          mode: 'provider' as const,
          targetIds: [segmentId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.95, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: segment.rotation * 0.1, prog: 1 },
          ],
        },
      };

      // Phase 2: Rotate (shatterDuration - shatterDuration + rotateDuration)
      const rotateEffect = {
        id: `rotate-effect-${index}`,
        componentId: segmentId,
        data: {
          type: 'spring',
          start: shatterDuration * durationScale + variation,
          duration: rotateDuration * durationScale,
          mode: 'provider' as const,
          targetIds: [segmentId],
          ranges: [
            { key: 'rotate', val: segment.rotation * 0.1, prog: 0 },
            {
              key: 'rotate',
              val: segment.rotation * 0.1 + rotationAngle * rotationIntensity,
              prog: 1,
            },
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 0.85, prog: 0.5 },
            { key: 'scale', val: 0.95, prog: 1 },
          ],
        },
      };

      // Phase 3: Settle (shatterDuration + rotateDuration - end)
      const settleEffect = {
        id: `settle-effect-${index}`,
        componentId: segmentId,
        data: {
          type: 'spring',
          start:
            (shatterDuration + rotateDuration) * durationScale + variation,
          duration: settleDuration * durationScale,
          mode: 'provider' as const,
          targetIds: [segmentId],
          ranges: [
            {
              key: 'rotate',
              val: segment.rotation * 0.1 + rotationAngle * rotationIntensity,
              prog: 0,
            },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };

      return {
        id: segmentId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: outgoingImageSrc,
          fit: 'cover' as const,
        },
        props: {
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            clipPath: segment.clipPath,
            transformOrigin: '50% 50%',
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [shatterEffect, rotateEffect, settleEffect],
      } as RenderableComponentData;
    },
  );

  // Chromatic aberration layers with effects
  const chromaticLayers: RenderableComponentData[] = [
    {
      id: 'red-channel',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: outgoingImageSrc,
        fit: 'cover' as const,
      },
      props: {
        className: 'absolute inset-0 w-full h-full object-cover mix-blend-screen',
        style: {
          filter: 'brightness(1.2) saturate(2) hue-rotate(-30deg)',
          transform: 'translate3d(-2px, 0, 0)',
          willChange: 'opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-red-effect',
          componentId: 'red-channel',
          data: {
            type: 'ease-in-out',
            start: shatterDuration * durationScale * 0.5,
            duration: rotateDuration * durationScale,
            mode: 'provider' as const,
            targetIds: ['red-channel'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3 * chromaticIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'green-channel',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: outgoingImageSrc,
        fit: 'cover' as const,
      },
      props: {
        className: 'absolute inset-0 w-full h-full object-cover mix-blend-screen',
        style: {
          filter: 'brightness(1.2) saturate(2) hue-rotate(90deg)',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-green-effect',
          componentId: 'green-channel',
          data: {
            type: 'ease-in-out',
            start: shatterDuration * durationScale * 0.5,
            duration: rotateDuration * durationScale,
            mode: 'provider' as const,
            targetIds: ['green-channel'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3 * chromaticIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'blue-channel',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: outgoingImageSrc,
        fit: 'cover' as const,
      },
      props: {
        className: 'absolute inset-0 w-full h-full object-cover mix-blend-screen',
        style: {
          filter: 'brightness(1.2) saturate(2) hue-rotate(210deg)',
          transform: 'translate3d(2px, 0, 0)',
          willChange: 'opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'chromatic-blue-effect',
          componentId: 'blue-channel',
          data: {
            type: 'ease-in-out',
            start: shatterDuration * durationScale * 0.5,
            duration: rotateDuration * durationScale,
            mode: 'provider' as const,
            targetIds: ['blue-channel'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3 * chromaticIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Crystal shine overlay with pulse effect
  const crystalShineOverlay: RenderableComponentData = {
    id: 'crystal-shine',
    type: 'layout',
    componentId: 'BaseLayout',
    props: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background:
          'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)',
        mixBlendMode: 'overlay',
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'shine-pulse-effect',
        componentId: 'crystal-shine',
        data: {
          type: 'ease-in-out',
          start: (shatterDuration + rotateDuration * 0.5) * durationScale,
          duration: (rotateDuration * 0.5 + settleDuration) * durationScale,
          mode: 'provider' as const,
          targetIds: ['crystal-shine'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Incoming image layer with fade-in
  const incomingImageLayer: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: incomingImageSrc,
      fit: 'cover' as const,
    },
    props: {
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-fade-effect',
        componentId: 'incoming-image',
        data: {
          type: 'ease-in',
          start: (shatterDuration + rotateDuration * 0.3) * durationScale,
          duration: (rotateDuration * 0.7 + settleDuration) * durationScale,
          mode: 'provider' as const,
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Outgoing image base layer with fade-out
  const outgoingImageLayer: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: outgoingImageSrc,
      fit: 'cover' as const,
    },
    props: {
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade-effect',
        componentId: 'outgoing-image',
        data: {
          type: 'ease-out',
          start: 0,
          duration: shatterDuration * durationScale,
          mode: 'provider' as const,
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Audio components (optional)
  const audioComponents: RenderableComponentData[] = [];

  if (glassShatterSoundSrc) {
    audioComponents.push({
      id: 'shatter-sound',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: glassShatterSoundSrc,
        volume: soundVolume * 0.6,
      },
      context: {
        timing: {
          start: 0,
          duration: 0.2,
        },
      },
    } as RenderableComponentData);
  }

  if (rotationWhooshSoundSrc) {
    audioComponents.push({
      id: 'whoosh-sound',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: rotationWhooshSoundSrc,
        volume: soundVolume * 0.4,
      },
      context: {
        timing: {
          start: shatterDuration * durationScale * 0.5,
          duration: rotateDuration * durationScale,
        },
      },
    } as RenderableComponentData);
  }

  if (crystalChimeSoundSrc) {
    audioComponents.push({
      id: 'chime-sound',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: crystalChimeSoundSrc,
        volume: soundVolume * 0.5,
      },
      context: {
        timing: {
          start: (shatterDuration + rotateDuration) * durationScale,
          duration: 0.2,
        },
      },
    } as RenderableComponentData);
  }

  // Chromatic aberration container
  const chromaticAberrationContainer: RenderableComponentData = {
    id: 'chromatic-aberration-container',
    type: 'layout',
    componentId: 'BaseLayout',
    props: {
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: chromaticLayers,
  } as RenderableComponentData;

  // Main root container
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-crystal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    props: {
      className: 'relative w-full h-full overflow-hidden bg-black',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingImageLayer,
      incomingImageLayer,
      ...crystalSegments,
      chromaticAberrationContainer,
      crystalShineOverlay,
      ...audioComponents,
    ],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'svg-kaleidoscope-crystal-transition',
  title: 'Kaleidoscope Crystal Transition',
  description:
    'SVG-based kaleidoscope transition effect that fragments images into crystalline patterns with symmetric rotations, prismatic color shifts, and light refraction. Supports hexagonal (6-way), triangular (3-way), square (4-way), and octagonal (8-way) patterns. Features chromatic aberration, specular highlights, and layered crystalline audio effects for a premium glass prism aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'kaleidoscope',
    'crystal',
    'geometric',
    'prismatic',
    'refraction',
    'svg',
    'image',
    'visual-effects',
  ],
  defaultInputParams: {
    outgoingImageSrc: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
    incomingImageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    symmetryPattern: 'hexagonal',
    transitionDuration: 0.8,
    chromaticIntensity: 0.5,
    rotationIntensity: 1,
    soundVolume: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const svgKaleidoscopeCrystalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
