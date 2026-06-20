/**
 * Typokinetic Rack Focus Preset
 *
 * This preset creates a cinematic depth-of-field rack focus effect where typography
 * travels through Z-space while moving horizontally across the screen. Simulates
 * a dolly zoom combined with lateral camera movement.
 *
 * Features:
 * - **Z-space Movement**: Word travels toward/away from viewer using scale simulation
 * - **Horizontal Tracking**: Simultaneous lateral movement (-60% → 0% → 60%)
 * - **Dynamic Focus**: Blur effect matches Z-position (8px → 0px → 12px)
 * - **Chromatic Aberration**: RGB split at blur extremes simulating lens optics
 * - **Perspective Rotation**: rotateY (20deg → 0deg → -20deg) following camera angle
 * - **Track Rotation**: Subtle rotateZ (-5deg → 0deg → 5deg) for mounted track feel
 * - **Center Hold**: 0.5s pause at peak focus for readability
 *
 * Technical Implementation:
 * - 3D perspective space (perspective: 1000px)
 * - Scale-based depth simulation (0.3 → 1 → 2.5)
 * - Multi-phase animation with hold period
 * - Performance-optimized with will-change
 * - transform-style: preserve-3d for true 3D rendering
 *
 * Use Cases:
 * - Cinematic title sequences
 * - Film-style credits
 * - High-impact brand reveals
 * - Music video typography
 * - Trailer text effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z
    .number()
    .min(4)
    .max(10)
    .default(6.5)
    .describe('Total animation duration in seconds (4-10s recommended)'),
  fontSize: z
    .number()
    .min(32)
    .max(200)
    .default(96)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Bebas:800")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  holdDuration: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Hold duration at center focus in seconds'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Chromatic aberration intensity in pixels'),
  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(12)
    .describe('Maximum blur at extremes in pixels'),
  minBlur: z
    .number()
    .min(0)
    .max(10)
    .default(8)
    .describe('Minimum blur at background in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    textColor,
    holdDuration,
    chromaticIntensity,
    maxBlur,
    minBlur,
  } = params;

  // Parse font family and weight
  const fontParts = fontFamily.split(':');
  const family = fontParts[0] || 'Inter';
  const weight = fontParts[1] || '700';

  // Animation timing phases (all relative to container start)
  const phase1Duration = (duration - holdDuration) * 0.4; // Approach: 40%
  const phase2Start = phase1Duration;
  const phase2Duration = holdDuration; // Hold at center
  const phase3Start = phase1Duration + holdDuration;
  const phase3Duration = (duration - holdDuration) * 0.6; // Exit: 60%

  // Fade timing
  const fadeInDuration = 0.5;
  const fadeOutStart = duration - 0.5;
  const fadeOutDuration = 0.5;

  // Helper function to create chromatic aberration text-shadow
  const createChromaticShadow = (intensity: number): string => {
    const offset = intensity;
    return `${offset}px 0 0 rgba(255, 0, 0, 0.7), -${offset}px 0 0 rgba(0, 255, 255, 0.7)`;
  };

  // Component IDs
  const containerId = 'typokinetic-container';
  const wordContainerId = 'word-container';
  const textId = 'text-element';

  // Create the main movement effect with all transformations
  const movementEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [wordContainerId],
    ranges: [
      // Phase 1: Approach (0 → phase1Duration)
      // Scale: 0.3 → 1 (simulate depth)
      { key: 'scale', val: 0.3, prog: 0 },
      { key: 'scale', val: 1, prog: phase1Duration / duration },
      // Phase 2: Hold (phase1Duration → phase2Start + phase2Duration)
      { key: 'scale', val: 1, prog: phase2Start / duration },
      {
        key: 'scale',
        val: 1,
        prog: (phase2Start + phase2Duration) / duration,
      },
      // Phase 3: Exit (phase3Start → duration)
      { key: 'scale', val: 2.5, prog: 1 },

      // TranslateX: -60% → 0% → 60%
      { key: 'translateX', val: '-60%', prog: 0 },
      { key: 'translateX', val: '0%', prog: phase1Duration / duration },
      {
        key: 'translateX',
        val: '0%',
        prog: (phase2Start + phase2Duration) / duration,
      },
      { key: 'translateX', val: '60%', prog: 1 },

      // RotateY: 20deg → 0deg → -20deg (perspective shift)
      { key: 'rotateY', val: 20, prog: 0 },
      { key: 'rotateY', val: 0, prog: phase1Duration / duration },
      {
        key: 'rotateY',
        val: 0,
        prog: (phase2Start + phase2Duration) / duration,
      },
      { key: 'rotateY', val: -20, prog: 1 },

      // RotateZ: -5deg → 0deg → 5deg (track rotation)
      { key: 'rotateZ', val: -5, prog: 0 },
      { key: 'rotateZ', val: 0, prog: phase1Duration / duration },
      {
        key: 'rotateZ',
        val: 0,
        prog: (phase2Start + phase2Duration) / duration,
      },
      { key: 'rotateZ', val: 5, prog: 1 },
    ],
  };

  // Blur effect matching Z-position
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Phase 1: minBlur → 0 (coming into focus)
      { key: 'filter', val: `blur(${minBlur}px)`, prog: 0 },
      {
        key: 'filter',
        val: 'blur(0px)',
        prog: phase1Duration / duration,
      },
      // Phase 2: Hold at 0 blur
      {
        key: 'filter',
        val: 'blur(0px)',
        prog: (phase2Start + phase2Duration) / duration,
      },
      // Phase 3: 0 → maxBlur (going out of focus)
      { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
    ],
  };

  // Chromatic aberration effect at blur extremes
  const chromaticEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Phase 1: Full chromatic → none
      {
        key: 'textShadow',
        val: createChromaticShadow(chromaticIntensity),
        prog: 0,
      },
      {
        key: 'textShadow',
        val: createChromaticShadow(0),
        prog: phase1Duration / duration,
      },
      // Phase 2: Hold at no chromatic
      {
        key: 'textShadow',
        val: createChromaticShadow(0),
        prog: (phase2Start + phase2Duration) / duration,
      },
      // Phase 3: none → full chromatic
      {
        key: 'textShadow',
        val: createChromaticShadow(chromaticIntensity),
        prog: 1,
      },
    ],
  };

  // Opacity fade in/out
  const opacityEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Fade in at start
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: fadeInDuration / duration },
      // Hold
      { key: 'opacity', val: 1, prog: fadeOutStart / duration },
      // Fade out at end
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-6xl font-bold',
      style: {
        color: textColor,
        fontSize: `${fontSize}px`,
        fontWeight: weight,
        opacity: 0,
        willChange: 'transform, filter, opacity',
      },
      font: {
        family: family,
        weights: [weight],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Word container with movement effects
  const wordContainer: RenderableComponentData = {
    id: wordContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          willChange: 'transform, filter',
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
        id: 'movement-effect',
        componentId: 'generic',
        data: movementEffect,
      },
    ],
    childrenData: [textAtom],
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
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
    childrenData: [wordContainer],
  };

  // Apply blur, chromatic, and opacity effects to text atom
  textAtom.effects = [
    {
      id: 'blur-effect',
      componentId: 'generic',
      data: blurEffect,
    },
    {
      id: 'chromatic-effect',
      componentId: 'generic',
      data: chromaticEffect,
    },
    {
      id: 'opacity-effect',
      componentId: 'generic',
      data: opacityEffect,
    },
  ];

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
  id: 'typokinetic-rack-focus',
  title: 'Typokinetic Rack Focus',
  description:
    'Cinematic depth-of-field rack focus typography preset where the word travels through Z-space while moving horizontally. Simulates dolly zoom effect with the word starting small and blurred in background, coming into sharp focus at center, then becoming large and blurred as it passes through the camera. Features perspective distortion, chromatic aberration at blur extremes, and subtle rotation following the perspective shift as if mounted on a track.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'rack-focus',
    'depth-of-field',
    'cinematic',
    '3d',
    'perspective',
    'chromatic-aberration',
    'dolly-zoom',
    'z-space',
  ],
  defaultInputParams: {
    text: 'CINEMA',
    duration: 6.5,
    fontSize: 96,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    holdDuration: 0.5,
    chromaticIntensity: 3,
    maxBlur: 12,
    minBlur: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const typokineticRackFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
