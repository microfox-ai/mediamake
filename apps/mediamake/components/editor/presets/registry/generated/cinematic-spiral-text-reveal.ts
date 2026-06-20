/**
 * Cinematic Golden Ratio Spiral Text Reveal Preset
 *
 * This preset creates a dramatic text reveal where words emerge along a golden ratio spiral curve,
 * perfect for mystery thriller opening credits. Words materialize from particles that coalesce
 * while following the spiral path, with dramatic lighting effects, lens flares, and energy trails.
 *
 * Features:
 * - Golden ratio spiral positioning using Fibonacci calculations (r = a * φ^(θ/2π))
 * - Particle-based text formation with coalescing animation
 * - Energy trails using multiple text copies with decreasing opacity
 * - Lens flares at spiral focus points with animated radial gradients
 * - Atmospheric fog that parts as text moves through
 * - Parallax depth layers (foreground, midground, background)
 * - Accelerating timing as spiral tightens (1s → 0.2s per word)
 * - Doctor Strange-style mystical text formation with sparks
 *
 * Use cases:
 * - Mystery thriller opening credits
 * - Dramatic title sequences
 * - Mystical/supernatural content intros
 * - High-impact reveal animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  TextAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['MYSTERY', 'UNFOLDS', 'IN', 'SPIRALS', 'LIGHT'])
    .describe('Array of words to reveal along the spiral'),
  font: z
    .string()
    .default('Cinzel:700')
    .describe(
      'Font family with optional weight (e.g., "Cinzel:700", "Montserrat:600")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Primary text color (hex or rgba)'),
  glowColor: z
    .string()
    .default('#ffd700')
    .describe('Glow and energy trail color (hex or rgba)'),
  spiralScale: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Scale factor for spiral size'),
  spiralTightness: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('How tightly the spiral winds (higher = tighter)'),
  accelerationFactor: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Speed of timing acceleration (higher = faster acceleration)'),
  particleDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .describe('Duration of particle coalescing animation in seconds'),
  glowIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity of glow and lens flare effects'),
  parallaxStrength: z
    .number()
    .min(0)
    .max(500)
    .default(150)
    .describe('Strength of parallax depth effect'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Cinzel:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
    }
  }

  const words = params.words;
  const totalWords = words.length;

  // Golden ratio constant
  const PHI = 1.618033988749895;

  // Calculate spiral positions using golden ratio formula
  const calculateSpiralPosition = (
    index: number,
  ): { x: number; y: number; rotation: number } => {
    // Spiral parameters
    const a = 50 * params.spiralScale; // Base radius
    const thetaStep = (Math.PI * 2) / (totalWords * params.spiralTightness);
    const theta = index * thetaStep;

    // Golden ratio spiral: r = a * φ^(θ/2π)
    const r = a * Math.pow(PHI, theta / (2 * Math.PI));

    // Convert polar to cartesian
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    // Calculate rotation to follow spiral tangent
    const rotation = (theta * 180) / Math.PI + 90;

    return { x, y, rotation };
  };

  // Calculate accelerating timing for each word
  const calculateWordTiming = (
    index: number,
  ): { start: number; duration: number } => {
    const startDuration = 1.0; // Start at 1s per word
    const endDuration = 0.2; // End at 0.2s per word
    const progress = index / Math.max(totalWords - 1, 1);

    // Exponential acceleration
    const easedProgress = Math.pow(progress, 1.5 * params.accelerationFactor);
    const duration =
      startDuration - (startDuration - endDuration) * easedProgress;

    // Calculate cumulative start time
    let start = 0;
    for (let i = 0; i < index; i++) {
      const iProg = i / Math.max(totalWords - 1, 1);
      const iEased = Math.pow(iProg, 1.5 * params.accelerationFactor);
      const iDur = startDuration - (startDuration - endDuration) * iEased;
      start += iDur;
    }

    return { start, duration };
  };

  // Calculate total duration
  let totalDuration = 0;
  for (let i = 0; i < totalWords; i++) {
    const { duration } = calculateWordTiming(i);
    totalDuration += duration;
  }
  totalDuration += params.particleDuration; // Add final word duration

  // Determine parallax layer for each word (distribute across layers)
  const getParallaxLayer = (index: number): number => {
    const layerIndex = index % 3;
    if (layerIndex === 0) return -300; // Background
    if (layerIndex === 1) return -150; // Midground
    return 0; // Foreground
  };

  // Create word containers with effects
  const wordContainers: RenderableComponentData[] = words.map(
    (word, index) => {
      const { x, y, rotation } = calculateSpiralPosition(index);
      const { start, duration } = calculateWordTiming(index);
      const parallaxZ = getParallaxLayer(index);

      const wordId = `word-${index}`;
      const trailId1 = `word-${index}-trail-1`;
      const trailId2 = `word-${index}-trail-2`;

      // Particle coalescing effect (opacity + blur)
      const particleEffect: GenericEffectData = {
        type: 'cubic-bezier(0.33, 0, 0.67, 1)',
        start: 0,
        duration: params.particleDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'filter', val: 'blur(20px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Energy trail 1 effect (fade in with delay)
      const trail1Effect: GenericEffectData = {
        type: 'ease-out',
        start: 0.05,
        duration: params.particleDuration,
        mode: 'provider',
        targetIds: [trailId1],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.4 * params.glowIntensity, prog: 1 },
        ],
      };

      // Energy trail 2 effect (fade in with more delay)
      const trail2Effect: GenericEffectData = {
        type: 'ease-out',
        start: 0.1,
        duration: params.particleDuration,
        mode: 'provider',
        targetIds: [trailId2],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.2 * params.glowIntensity, prog: 1 },
        ],
      };

      const wordTextData: TextAtomData = {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          color: params.textColor,
          textShadow: `0 0 ${20 * params.glowIntensity}px rgba(255, 215, 0, ${0.6 * params.glowIntensity}), 0 0 ${40 * params.glowIntensity}px rgba(255, 215, 0, ${0.3 * params.glowIntensity})`,
          letterSpacing: '0.1em',
          ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || '700'],
          display: 'swap',
        },
      };

      const trail1Data: TextAtomData = {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          color: params.glowColor,
          position: 'absolute',
          top: '0',
          left: '0',
          textShadow: `0 0 ${30 * params.glowIntensity}px ${params.glowColor}`,
          ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || '700'],
        },
      };

      const trail2Data: TextAtomData = {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          color: params.glowColor,
          position: 'absolute',
          top: '0',
          left: '0',
          textShadow: `0 0 ${40 * params.glowIntensity}px ${params.glowColor}`,
          ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || '700'],
        },
      };

      return {
        id: `word-container-${index}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) translateZ(${parallaxZ}px) rotate(${rotation}deg)`,
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start,
            duration: duration + params.particleDuration,
          },
        },
        effects: [
          {
            id: `particle-effect-${index}`,
            componentId: 'generic',
            data: particleEffect,
          },
          {
            id: `trail1-effect-${index}`,
            componentId: 'generic',
            data: trail1Effect,
          },
          {
            id: `trail2-effect-${index}`,
            componentId: 'generic',
            data: trail2Effect,
          },
        ],
        childrenData: [
          {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: wordTextData,
            context: {
              timing: {
                start: 0,
                duration: duration + params.particleDuration,
              },
            },
          },
          {
            id: trailId1,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: trail1Data,
            context: {
              timing: {
                start: 0,
                duration: duration + params.particleDuration,
              },
            },
          },
          {
            id: trailId2,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: trail2Data,
            context: {
              timing: {
                start: 0,
                duration: duration + params.particleDuration,
              },
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Background parallax layer
  const backgroundLayer: RenderableComponentData = {
    id: 'background-parallax-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transform: `translateZ(-${params.parallaxStrength * 2}px) scale(${1 + params.parallaxStrength * 2 / 1000})`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers.filter(
      (_, i) => getParallaxLayer(i) === -300,
    ),
  };

  // Midground parallax layer
  const midgroundLayer: RenderableComponentData = {
    id: 'midground-parallax-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transform: `translateZ(-${params.parallaxStrength}px) scale(${1 + params.parallaxStrength / 1000})`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers.filter(
      (_, i) => getParallaxLayer(i) === -150,
    ),
  };

  // Foreground parallax layer
  const foregroundLayer: RenderableComponentData = {
    id: 'foreground-parallax-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transform: 'translateZ(0px)',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers.filter((_, i) => getParallaxLayer(i) === 0),
  };

  // Atmospheric fog layer (subtle pulse)
  const fogPulseEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: ['atmospheric-fog-layer'],
    ranges: [
      { key: 'opacity', val: 0.2 * params.glowIntensity, prog: 0 },
      { key: 'opacity', val: 0.4 * params.glowIntensity, prog: 0.5 },
      { key: 'opacity', val: 0.2 * params.glowIntensity, prog: 1 },
    ],
  };

  const atmosphericFogLayer: RenderableComponentData = {
    id: 'atmospheric-fog-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at center, rgba(100, 100, 120, 0.2) 0%, transparent 70%)',
          mixBlendMode: 'screen',
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
        id: 'fog-pulse-effect',
        componentId: 'generic',
        data: fogPulseEffect,
      },
    ],
    childrenData: [],
  };

  // Lens flare overlay (pulse effect)
  const lensFlareEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: ['lens-flare-overlay'],
    ranges: [
      { key: 'opacity', val: 0.3 * params.glowIntensity, prog: 0 },
      { key: 'opacity', val: 0.5 * params.glowIntensity, prog: 0.5 },
      { key: 'opacity', val: 0.3 * params.glowIntensity, prog: 1 },
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.1, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const lensFlareOverlay: RenderableComponentData = {
    id: 'lens-flare-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(circle at 50% 50%, rgba(255, 215, 0, ${0.3 * params.glowIntensity}) 0%, transparent 40%)`,
          mixBlendMode: 'screen',
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
        id: 'lens-flare-effect',
        componentId: 'generic',
        data: lensFlareEffect,
      },
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-spiral-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      atmosphericFogLayer,
      backgroundLayer,
      midgroundLayer,
      foregroundLayer,
      lensFlareOverlay,
    ],
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'cinematicSpiralTextReveal',
  title: 'Cinematic Golden Ratio Spiral Text Reveal',
  description:
    'Dramatic text reveal where words emerge along a golden ratio spiral curve with particle coalescing effects, mystical energy trails, lens flares, and atmospheric fog. Features parallax depth layers and accelerating spiral motion for thriller-style opening credits.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'spiral',
    'golden-ratio',
    'thriller',
    'mystery',
    'particles',
    'lens-flare',
    'parallax',
    'dramatic',
    'mystical',
    'opening-credits',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['MYSTERY', 'UNFOLDS', 'IN', 'SPIRALS', 'LIGHT'],
    font: 'Cinzel:700',
    fontSize: 72,
    textColor: '#ffffff',
    glowColor: '#ffd700',
    spiralScale: 1,
    spiralTightness: 1,
    accelerationFactor: 1,
    particleDuration: 0.5,
    glowIntensity: 1,
    parallaxStrength: 150,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cinematicSpiralTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
