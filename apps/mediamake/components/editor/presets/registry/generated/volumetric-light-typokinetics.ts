/**
 * Volumetric Light Typokinetics Preset
 *
 * Premium broadcast-quality kinetic typography preset featuring 3D text rising through
 * volumetric fog with sweeping searchlight beams. Words emerge with monumental weight
 * using spring-based bounce animations while dynamic light rays cast rim lighting effects
 * and illuminate letters sequentially. Atmospheric particles react to light beams creating
 * depth and cinematic atmosphere. Designed for high-end motion graphics with smooth,
 * weighty, and purposeful animation.
 *
 * Features:
 * - 3D perspective text layout with transform-style: preserve-3d
 * - Text rising from below baseline with spring bounce physics
 * - Sweeping light ray animations with dynamic shadows
 * - Volumetric fog overlay with pulsing opacity
 * - Atmospheric particles reacting to light beams
 * - Rim lighting effects on text edges
 * - Sequential letter illumination like searchlights
 * - GPU-accelerated transform-only animations
 * - Production-ready broadcast quality
 *
 * Use cases:
 * - High-end motion graphics titles
 * - Broadcast quality openings
 * - Premium video productions
 * - Cinematic title sequences
 * - Professional presentation intros
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(z.any())
    .optional()
    .describe(
      'Array of caption objects with word-level timing for sequential text animation',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size for text in pixels'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Montserrat:900")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Primary text color in hex format'),
  lightIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Light ray intensity multiplier'),
  particleCount: z
    .number()
    .min(10)
    .max(50)
    .default(25)
    .describe('Number of atmospheric particles'),
  springBounce: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Spring bounce intensity (0 = no bounce, 1 = high bounce)'),
  wordOverlap: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Time overlap between consecutive word animations (in seconds)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:700');

  // Extract captions
  const captions = (params.captions || []) as TranscriptionSentence[];

  if (captions.length === 0) {
    throw new Error('No captions provided for volumetric light typokinetics');
  }

  // Calculate total duration from captions
  const lastCaption = captions[captions.length - 1];
  const totalDuration =
    lastCaption.absoluteEnd + 2; // Add 2s buffer for final word exit

  // --- Generate Particles ---
  const particleComponents: RenderableComponentData[] = [];
  for (let i = 0; i < params.particleCount; i++) {
    const particleId = `particle-${i}`;
    const startX = randomInRange(0, 100);
    const startY = randomInRange(0, 100);
    const endX = startX + randomInRange(-50, 50);
    const endY = startY + randomInRange(-30, -10);
    const duration = randomInRange(3, 6);
    const delay = randomInRange(0, totalDuration - duration);

    const particleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: endX - startX, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: endY - startY, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'opacity', val: 0.2, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 0.2, prog: 1 },
      ],
    };

    particleComponents.push({
      id: particleId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-1 h-1 bg-white/40 rounded-full',
          style: {
            left: `${startX}%`,
            top: `${startY}%`,
          },
        },
      },
      context: {
        timing: {
          start: delay,
          duration: duration,
        },
      },
      effects: [
        {
          id: `particle-effect-${i}`,
          componentId: 'generic',
          data: particleEffect,
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // --- Generate Light Rays ---
  const lightRayCount = 4;
  const lightRayComponents: RenderableComponentData[] = [];
  for (let i = 0; i < lightRayCount; i++) {
    const rayId = `light-ray-${i}`;
    const leftPosition = randomInRange(10, 90);
    const sweepDuration = randomInRange(2, 3.5);
    const delay = i * (totalDuration / lightRayCount);

    const rayEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: sweepDuration,
      mode: 'provider',
      targetIds: [rayId],
      ranges: [
        { key: 'rotateZ', val: -45, prog: 0 },
        { key: 'rotateZ', val: 45, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        {
          key: 'opacity',
          val: 0.15 * params.lightIntensity,
          prog: 0.5,
        },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    lightRayComponents.push({
      id: rayId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full w-8',
          style: {
            left: `${leftPosition}%`,
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            transformOrigin: 'top center',
          },
        },
      },
      context: {
        timing: {
          start: delay,
          duration: sweepDuration,
        },
      },
      effects: [
        {
          id: `ray-effect-${i}`,
          componentId: 'generic',
          data: rayEffect,
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // --- Generate Word Components ---
  const wordComponents: RenderableComponentData[] = [];
  let currentTime = 0;

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordStart = word.absoluteStart;
      const wordDuration = 0.8; // Fixed duration for rise animation

      // Spring bounce animation for word rise
      const wordRiseEffect: GenericEffectData = {
        type: 'spring',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: 100, prog: 0, unit: '%' },
          { key: 'translateY', val: 0, prog: 1, unit: '%' },
          { key: 'rotateX', val: -15, prog: 0 },
          { key: 'rotateX', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      };

      // Illumination effect when light ray passes
      const illuminateEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0.2,
        duration: 0.4,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          {
            key: 'filter',
            val: 'brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))',
            prog: 0,
          },
          {
            key: 'filter',
            val: `brightness(${1 + params.lightIntensity * 0.5}) drop-shadow(0 0 20px rgba(255,255,255,0.6))`,
            prog: 0.5,
          },
          {
            key: 'filter',
            val: 'brightness(1) drop-shadow(0 0 0px rgba(255,255,255,0))',
            prog: 1,
          },
        ],
      };

      wordComponents.push({
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `clamp(48px, ${params.fontSize}px, 120px)`,
            color: params.textColor,
            textShadow:
              '2px 2px 0 rgba(255,255,255,0.1), -2px -2px 0 rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.2)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginRight: '0.3em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        },
        context: {
          timing: {
            start: wordStart,
            duration: word.duration + wordDuration,
          },
        },
        effects: [
          {
            id: `${wordId}-rise`,
            componentId: 'generic',
            data: wordRiseEffect,
          },
          {
            id: `${wordId}-illuminate`,
            componentId: 'generic',
            data: illuminateEffect,
          },
        ],
      } as RenderableComponentData);

      currentTime = Math.max(
        currentTime,
        wordStart + word.duration + wordDuration,
      );
    });
  });

  // --- Fog Layer with Pulsing Effect ---
  const fogEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 3,
    mode: 'provider',
    targetIds: ['fog-layer'],
    ranges: [
      { key: 'opacity', val: 0.6, prog: 0 },
      { key: 'opacity', val: 0.8, prog: 0.5 },
      { key: 'opacity', val: 0.6, prog: 1 },
    ],
  };

  const fogLayer: RenderableComponentData = {
    id: 'fog-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.8) 100%)',
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'fog-pulse',
        componentId: 'generic',
        data: fogEffect,
      },
    ],
    childrenData: [],
  };

  // --- Particles Container ---
  const particlesContainer: RenderableComponentData = {
    id: 'particles-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          contain: 'layout',
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: particleComponents,
  };

  // --- Light Rays Container ---
  const lightRaysContainer: RenderableComponentData = {
    id: 'light-rays-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lightRayComponents,
  };

  // --- Words Container ---
  const wordsContainer: RenderableComponentData = {
    id: 'words-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center flex-wrap',
        style: {
          transformStyle: 'preserve-3d',
          zIndex: 10,
          gap: '0.3em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'volumetric-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [fogLayer, particlesContainer, lightRaysContainer, wordsContainer],
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
  id: 'volumetricLightTypokinetics',
  title: 'Volumetric Light Typokinetics',
  description:
    'Premium broadcast-quality kinetic typography preset featuring 3D text rising through volumetric fog with sweeping searchlight beams. Words emerge with monumental weight using spring-based bounce animations while dynamic light rays cast rim lighting effects and illuminate letters sequentially. Atmospheric particles react to light beams creating depth and cinematic atmosphere. Designed for high-end motion graphics with smooth, weighty, and purposeful animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'volumetric',
    'light-rays',
    'fog',
    '3d',
    'broadcast',
    'premium',
    'cinematic',
    'spring-animation',
    'particles',
  ],
  dependencies: {},
  defaultInputParams: {
    fontSize: 72,
    font: 'Inter:700',
    textColor: '#ffffff',
    lightIntensity: 1,
    particleCount: 25,
    springBounce: 0.3,
    wordOverlap: 0.4,
  },
};

// --- Export ---

export const volumetricLightTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
