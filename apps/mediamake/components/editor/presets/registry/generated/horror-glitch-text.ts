/**
 * Horror Glitch Text Animation Preset
 *
 * Creates a horror-inspired stop motion text reveal where letters glitch into existence
 * through static, distortion, and chromatic aberration effects. Features multi-stage
 * animation: flicker phase with rapid opacity changes, distortion phase with random
 * position jumps, and continuous subtle shake post-reveal.
 *
 * Technical Implementation:
 * - Each letter rendered as individual TextAtom with position:relative
 * - Three sequential animation phases:
 *   1. Flicker phase (0-0.3s): Rapid opacity alternation with stepped easing
 *   2. Distortion phase (0.3-0.6s): Random translateX/Y jumps every 0.05s
 *   3. Continuous shake (0.6s+): Infinite subtle movement post-reveal
 * - Chromatic aberration via text-shadow with red/blue offsets
 * - CSS filters: contrast(2) brightness(1.5) during flickers
 * - Erratic timing: index * random(0.02, 0.3)s for chaotic reveal
 * - Scanline overlay for VHS aesthetic
 *
 * Use cases:
 * - Horror movie titles and credits
 * - Creepy VHS tape effects
 * - Corrupted video feed aesthetics
 * - Halloween and horror content
 * - Glitch art and experimental video
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to display with horror glitch effect'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('monospace').describe('Font family (monospace recommended for horror aesthetic)'),
  textColor: z.string().default('#ffffff').describe('Base text color'),
  duration: z.number().default(10).describe('Total duration in seconds'),
  glitchIntensity: z.number().min(0.1).max(3).default(1).describe('Intensity multiplier for glitch effects (0.1-3)'),
  flickerDuration: z.number().default(0.3).describe('Duration of flicker phase per letter in seconds'),
  distortionDuration: z.number().default(0.3).describe('Duration of distortion phase per letter in seconds'),
  chromaticAberrationStrength: z.number().default(2).describe('Chromatic aberration offset in pixels'),
  scanlineOpacity: z.number().min(0).max(1).default(0.15).describe('Opacity of scanline overlay (0-1)'),
  randomSeed: z.number().optional().describe('Random seed for reproducible chaos (optional)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    duration,
    glitchIntensity,
    flickerDuration,
    distortionDuration,
    chromaticAberrationStrength,
    scanlineOpacity,
    randomSeed,
  } = params;

  // Seeded random number generator for reproducible chaos
  const seededRandom = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  const rng = randomSeed !== undefined ? seededRandom(randomSeed) : Math.random;

  // Split text into individual letters
  const letters = text.split('');
  const letterComponents: RenderableComponentData[] = [];
  const letterIds: string[] = [];

  // Create letter components with chaotic timing
  letters.forEach((letter, index) => {
    const letterId = `horror-letter-${index}`;
    letterIds.push(letterId);

    // Chaotic stagger timing: index * random(0.02, 0.3)s
    const staggerDelay = index * (0.02 + rng() * 0.28) * glitchIntensity;

    // Phase 1: Flicker (rapid opacity changes with stepped easing)
    const flickerEffect: GenericEffectData = {
      type: 'linear',
      start: staggerDelay,
      duration: flickerDuration * glitchIntensity,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.14 },
        { key: 'opacity', val: 0.3, prog: 0.28 },
        { key: 'opacity', val: 1, prog: 0.42 },
        { key: 'opacity', val: 0, prog: 0.56 },
        { key: 'opacity', val: 0.8, prog: 0.71 },
        { key: 'opacity', val: 1, prog: 0.85 },
        { key: 'opacity', val: 1, prog: 1 },
        // Contrast and brightness during flicker
        { key: 'filter', val: 'contrast(2) brightness(1.5)', prog: 0 },
        { key: 'filter', val: 'contrast(1) brightness(1)', prog: 1 },
      ],
    };

    // Phase 2: Distortion (random position jumps)
    const distortionStartTime = staggerDelay + flickerDuration * glitchIntensity;
    const jumpIntensity = 10 * glitchIntensity;
    const distortionEffect: GenericEffectData = {
      type: 'linear',
      start: distortionStartTime,
      duration: distortionDuration * glitchIntensity,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'translateX', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0 },
        { key: 'translateY', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0 },
        { key: 'translateX', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.2 },
        { key: 'translateY', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.2 },
        { key: 'translateX', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.4 },
        { key: 'translateY', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.4 },
        { key: 'translateX', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.6 },
        { key: 'translateY', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.6 },
        { key: 'translateX', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.8 },
        { key: 'translateY', val: (rng() - 0.5) * jumpIntensity * 2, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // Phase 3: Continuous subtle shake (infinite loop)
    const shakeStartTime = distortionStartTime + distortionDuration * glitchIntensity;
    const shakeIntensity = 1.5 * glitchIntensity;
    const shakeDuration = 0.1 + rng() * 0.1; // 0.1-0.2s per shake cycle
    const shakeEffect: GenericEffectData = {
      type: 'linear',
      start: shakeStartTime,
      duration: duration - shakeStartTime, // Continue for rest of duration
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'translateX', val: (rng() - 0.5) * shakeIntensity, prog: 0 },
        { key: 'translateY', val: (rng() - 0.5) * shakeIntensity, prog: 0 },
        { key: 'translateX', val: (rng() - 0.5) * shakeIntensity, prog: 0.25 },
        { key: 'translateY', val: (rng() - 0.5) * shakeIntensity, prog: 0.25 },
        { key: 'translateX', val: (rng() - 0.5) * shakeIntensity, prog: 0.5 },
        { key: 'translateY', val: (rng() - 0.5) * shakeIntensity, prog: 0.5 },
        { key: 'translateX', val: (rng() - 0.5) * shakeIntensity, prog: 0.75 },
        { key: 'translateY', val: (rng() - 0.5) * shakeIntensity, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // Create letter component
    letterComponents.push({
      id: letterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          fontFamily,
          color: textColor,
          position: 'relative',
          display: 'inline-block',
          // Chromatic aberration via text-shadow
          textShadow: `${chromaticAberrationStrength}px 0 #ff0000, -${chromaticAberrationStrength}px 0 #00ffff`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${letterId}-flicker`,
          componentId: 'generic',
          data: flickerEffect,
        },
        {
          id: `${letterId}-distortion`,
          componentId: 'generic',
          data: distortionEffect,
        },
        {
          id: `${letterId}-shake`,
          componentId: 'generic',
          data: shakeEffect,
        },
      ],
    } as RenderableComponentData);
  });

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `repeating-linear-gradient(0deg, rgba(0,0,0,${scanlineOpacity}), rgba(0,0,0,${scanlineOpacity}) 1px, transparent 1px, transparent 2px)`,
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // Letters container
  const lettersContainer: RenderableComponentData = {
    id: 'letters-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          gap: '0.1em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: letterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'horror-glitch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black text-white font-mono overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [scanlineOverlay, lettersContainer],
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
  id: 'horror-glitch-text',
  title: 'Horror Glitch Text Animation',
  description:
    'Horror-inspired stop motion text reveal where letters glitch into existence through static, distortion, and chromatic aberration. Features multi-stage effects: flicker phase with rapid opacity changes, distortion phase with position jumps, and continuous shake. Creates unsettling VHS/corrupted video aesthetic with erratic timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'horror',
    'glitch',
    'vhs',
    'corrupted',
    'stop-motion',
    'chromatic-aberration',
    'distortion',
    'flicker',
    'creepy',
  ],
  defaultInputParams: {
    text: 'HORROR',
    fontSize: 72,
    fontFamily: 'monospace',
    textColor: '#ffffff',
    duration: 10,
    glitchIntensity: 1,
    flickerDuration: 0.3,
    distortionDuration: 0.3,
    chromaticAberrationStrength: 2,
    scanlineOpacity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const horrorGlitchTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
