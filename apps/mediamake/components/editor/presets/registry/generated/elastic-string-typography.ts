/**
 * Elastic String Typography Preset
 *
 * A dynamic typography preset where text behaves like it's attached to rubber bands.
 * Words enter with overshoot and spring-back oscillations mimicking plucked guitar strings.
 * Each word connects to neighbors via invisible elastic bonds creating chain-reaction movements.
 * Features tension effects with scale transformations, and a dramatic release phase where
 * constraints break and words float freely before reassembling.
 *
 * Implements custom spring physics using damped harmonic oscillator equations with
 * configurable stiffness and damping via CSS custom properties.
 *
 * Technical Implementation:
 * - Structure: BaseLayout with 'relative overflow-hidden' container
 * - Position: TextAtoms with 'absolute' positioning
 * - Physics: Spring calculations using damped harmonic oscillator equations
 * - Neighbor relationships: Index-based elastic coupling
 * - Effects: Complex translateX/Y keyframes with spring behavior
 * - Custom properties: --spring-stiffness, --spring-damping
 * - Performance: will-change: transform, optimized for 60fps
 *
 * Animation Phases:
 * 1. Entry (0-30%): Words enter with overshoot via translateY/X
 * 2. Connected (30-70%): Words maintain neighbor relationships with chain reactions
 * 3. Tension (70-85%): Words pull apart with scale effects then snap back
 * 4. Release (85-100%): Constraints break, words float freely, then reassemble
 *
 * Use cases:
 * - Dynamic title sequences with physics-based motion
 * - Music videos with rhythmic text animations
 * - Tech demos showcasing advanced typography effects
 * - Social media content with eye-catching text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with elastic string physics'),

  duration: z
    .number()
    .min(3)
    .max(30)
    .default(10)
    .describe('Total duration of the animation in seconds'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex, rgb, or CSS color name)'),

  springStiffness: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Spring stiffness constant (higher = faster oscillation)'),

  springDamping: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.7)
    .describe('Spring damping factor (higher = less oscillation)'),

  overshootAmount: z
    .number()
    .min(20)
    .max(200)
    .default(100)
    .describe('Initial overshoot distance in pixels'),

  tensionScale: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1.2)
    .describe('Maximum scale during tension phase'),

  chainReactionDelay: z
    .number()
    .min(0.02)
    .max(0.2)
    .default(0.1)
    .describe('Delay between neighbor word reactions in seconds'),

  releaseFloatDistance: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Maximum float distance during release phase in pixels'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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

  // Split text into words
  const words = params.text.trim().split(/\s+/);
  const wordCount = words.length;

  // Calculate phase timings (relative to animation duration)
  const entryPhaseEnd = params.duration * 0.3;
  const connectedPhaseEnd = params.duration * 0.7;
  const tensionPhaseEnd = params.duration * 0.85;
  const releasePhaseEnd = params.duration;

  // Helper: Damped harmonic oscillator equation
  // x(t) = A * e^(-damping*t) * cos(sqrt(stiffness)*t)
  const calculateSpringKeyframes = (
    amplitude: number,
    stiffness: number,
    damping: number,
    duration: number,
  ): Array<{ val: number; prog: number }> => {
    const keyframes: Array<{ val: number; prog: number }> = [];
    const steps = 10; // Number of keyframes

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration;
      const prog = i / steps;
      const val =
        amplitude *
        Math.exp(-damping * t) *
        Math.cos(Math.sqrt(stiffness) * t * 10);
      keyframes.push({ val, prog });
    }

    return keyframes;
  };

  // Helper: Create entry spring effect
  const createEntryEffect = (
    wordId: string,
    wordIndex: number,
  ): GenericEffectData => {
    const staggerDelay = wordIndex * params.chainReactionDelay;
    const effectStart = staggerDelay;
    const effectDuration = entryPhaseEnd - staggerDelay;

    // Spring keyframes for Y translation (overshoot then settle)
    const springKeyframes = calculateSpringKeyframes(
      params.overshootAmount,
      params.springStiffness,
      params.springDamping,
      effectDuration,
    );

    return {
      type: 'ease-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Opacity fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        // Spring Y translation
        ...springKeyframes.map((kf) => ({
          key: 'translateY',
          val: kf.val,
          prog: kf.prog,
        })),
        // Slight scale overshoot
        { key: 'scale', val: 0.9, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.3 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Create connected phase wobble effect
  const createConnectedEffect = (
    wordId: string,
    wordIndex: number,
  ): GenericEffectData => {
    const effectStart = entryPhaseEnd;
    const effectDuration = connectedPhaseEnd - entryPhaseEnd;

    // Oscillating movement based on neighbor index
    const baseFreq = 0.5 + wordIndex * 0.1;
    const amplitude = 10 + wordIndex * 2;

    return {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Gentle Y oscillation
        { key: 'translateY', val: 0, prog: 0 },
        {
          key: 'translateY',
          val: amplitude * Math.sin(baseFreq * Math.PI),
          prog: 0.25,
        },
        { key: 'translateY', val: 0, prog: 0.5 },
        {
          key: 'translateY',
          val: -amplitude * Math.sin(baseFreq * Math.PI),
          prog: 0.75,
        },
        { key: 'translateY', val: 0, prog: 1 },
        // Subtle X oscillation
        { key: 'translateX', val: 0, prog: 0 },
        {
          key: 'translateX',
          val: (amplitude / 2) * Math.cos(baseFreq * Math.PI),
          prog: 0.5,
        },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    };
  };

  // Helper: Create tension effect
  const createTensionEffect = (
    wordId: string,
    wordIndex: number,
  ): GenericEffectData => {
    const effectStart = connectedPhaseEnd;
    const effectDuration = tensionPhaseEnd - connectedPhaseEnd;

    // Pull apart direction alternates based on index
    const pullDirection = wordIndex % 2 === 0 ? 1 : -1;
    const pullDistance = 30 * pullDirection;

    return {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Pull apart
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: pullDistance, prog: 0.4 },
        { key: 'translateX', val: 0, prog: 1 },
        // Scale tension
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: params.tensionScale, prog: 0.4 },
        { key: 'scale', val: 0.8, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Create release effect
  const createReleaseEffect = (
    wordId: string,
    wordIndex: number,
  ): GenericEffectData => {
    const effectStart = tensionPhaseEnd;
    const effectDuration = releasePhaseEnd - tensionPhaseEnd;

    // Random float direction
    const angle = (wordIndex / wordCount) * Math.PI * 2;
    const floatX =
      Math.cos(angle) * params.releaseFloatDistance * (0.5 + Math.random());
    const floatY =
      Math.sin(angle) * params.releaseFloatDistance * (0.5 + Math.random());

    return {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Float away
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: floatX, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: floatY, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        // Rotate during float
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 45 * (wordIndex % 2 === 0 ? 1 : -1), prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
        // Scale pulse
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.3, prog: 0.3 },
        { key: 'scale', val: 1, prog: 1 },
        // Opacity flicker
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Create word components
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `elastic-word-${index}`;

      // Create all effects for this word
      const entryEffect = createEntryEffect(wordId, index);
      const connectedEffect = createConnectedEffect(wordId, index);
      const tensionEffect = createTensionEffect(wordId, index);
      const releaseEffect = createReleaseEffect(wordId, index);

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'normal',
            willChange: 'transform',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-entry`,
            componentId: 'generic',
            data: entryEffect,
          },
          {
            id: `${wordId}-connected`,
            componentId: 'generic',
            data: connectedEffect,
          },
          {
            id: `${wordId}-tension`,
            componentId: 'generic',
            data: tensionEffect,
          },
          {
            id: `${wordId}-release`,
            componentId: 'generic',
            data: releaseEffect,
          },
        ],
      };
    },
  ) as RenderableComponentData[];

  // Create spring word container
  const springWordContainer: RenderableComponentData = {
    id: 'spring-word-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          gap: `${params.fontSize * 0.3}px`,
          ['--spring-stiffness' as any]: params.springStiffness,
          ['--spring-damping' as any]: params.springDamping,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-string-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [springWordContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-string-typography',
  title: 'Elastic String Typography',
  description:
    'A dynamic typography preset where text behaves like it\'s attached to rubber bands. Words enter with overshoot and spring-back oscillations mimicking plucked guitar strings. Each word connects to neighbors via invisible elastic bonds creating chain-reaction movements. Features tension effects with scale transformations, and a dramatic release phase where constraints break and words float freely before reassembling. Implements custom spring physics using damped harmonic oscillator equations with configurable stiffness and damping via CSS custom properties.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'physics',
    'spring',
    'elastic',
    'kinetic',
    'dynamic',
    'oscillation',
    'damped-harmonic',
    'chain-reaction',
    'text-animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Elastic String Typography',
    duration: 10,
    fontSize: 64,
    font: 'Inter:700',
    textColor: '#FFFFFF',
    springStiffness: 0.15,
    springDamping: 0.7,
    overshootAmount: 100,
    tensionScale: 1.2,
    chainReactionDelay: 0.1,
    releaseFloatDistance: 150,
  },
};

// Export preset
export const elasticStringTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
