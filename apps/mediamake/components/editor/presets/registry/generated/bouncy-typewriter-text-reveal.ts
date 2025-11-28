/**
 * Bouncy Typewriter Text Reveal Preset
 *
 * A modern typokinetic text preset featuring elastic scale-in animation with overshoot for each letter,
 * soft domino-style push effects on previous letters, synchronized glow pulses at impact frames,
 * and a dreamy ambient float after reveal completion.
 *
 * Features:
 * - **Elastic Letter Reveal**: Each letter materializes from scale 0 to 1 with overshoot (0 → 1.15 → 1)
 * - **Soft Domino Push**: Previous letters get gently nudged left (-5px) then spring back
 * - **Glow Pulse**: Each letter emits a synchronized glow pulse (textShadow) at reveal
 * - **Ambient Float**: Continuous dreamy floating animation after all letters are revealed
 * - **Dynamic Width Container**: Uses inline-flex for natural text width
 *
 * Use cases:
 * - Typewriter-inspired text reveals with modern bounce
 * - Layered animation tracks (reveal, glow, push, float)
 * - Soft, playful typography animations
 * - Dreamy, weightless text effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to animate with bouncy typewriter effect'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color in hex or rgba format'),
  glowColor: z
    .string()
    .default('rgba(255,255,255,0.8)')
    .optional()
    .describe('Glow pulse color (rgba recommended)'),
  letterDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .optional()
    .describe('Delay between each letter reveal in seconds'),
  bounceDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Duration of the bounce scale effect per letter'),
  glowPeakDelay: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .optional()
    .describe('Delay after letter reveal when glow peaks (seconds)'),
  pushDistance: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .optional()
    .describe('Distance in pixels to push previous letters left'),
  floatAmplitude: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Amplitude of floating animation in pixels (up/down)'),
  floatDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .optional()
    .describe('Duration of one float cycle in seconds'),
  startDelay: z
    .number()
    .min(0)
    .max(5)
    .default(0)
    .optional()
    .describe('Initial delay before animation starts'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    text,
    fontSize = 48,
    fontFamily = 'Inter',
    fontWeight = '700',
    textColor = '#FFFFFF',
    glowColor = 'rgba(255,255,255,0.8)',
    letterDelay = 0.1,
    bounceDuration = 0.4,
    glowPeakDelay = 0.1,
    pushDistance = 5,
    floatAmplitude = 2,
    floatDuration = 2,
    startDelay = 0,
  } = params;

  // Split text into individual letters
  const letters = text.split('');
  const letterCount = letters.length;

  // Calculate total reveal duration (time until last letter completes)
  const revealDuration = startDelay + letterCount * letterDelay + bounceDuration;

  // Helper: Create scale bounce effect (0 → 1.15 → 1)
  const createScaleBounceEffect = (
    letterId: string,
    relativeStart: number,
  ) => ({
    id: `scale-bounce-${letterId}`,
    componentId: 'generic',
    data: {
      type: 'ease-out', // Ease-out for bounce feel
      start: relativeStart,
      duration: bounceDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1.15, prog: 0.6 }, // Overshoot
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  });

  // Helper: Create glow pulse effect (textShadow animation)
  const createGlowPulseEffect = (
    letterId: string,
    relativeStart: number,
  ) => {
    const glowStart = relativeStart + glowPeakDelay;
    const glowDuration = 0.4; // Quick pulse

    return {
      id: `glow-pulse-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: glowStart,
        duration: glowDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          {
            key: 'textShadow',
            val: '0 0 0px rgba(255,255,255,0)',
            prog: 0,
          },
          {
            key: 'textShadow',
            val: `0 0 20px ${glowColor}`,
            prog: 0.5,
          },
          {
            key: 'textShadow',
            val: `0 0 5px ${glowColor.replace('0.8', '0.2')}`,
            prog: 1,
          },
        ],
      },
    };
  };

  // Helper: Create push effect for previous letter
  const createPushEffect = (letterId: string, relativeStart: number) => {
    const pushDuration = 0.3;

    return {
      id: `push-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'spring', // Spring easing for soft domino feel
        start: relativeStart,
        duration: pushDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -pushDistance, prog: 0.4 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create ambient float effect (continuous sine wave)
  const createAmbientFloatEffect = (letterId: string) => {
    const floatStart = revealDuration;

    return {
      id: `float-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear', // Linear for smooth continuous loop
        start: floatStart,
        duration: floatDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -floatAmplitude, prog: 0.25 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: floatAmplitude, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Build letter components with effects
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const letterStartTime = startDelay + index * letterDelay;

      const effects: any[] = [];

      // 1. Scale bounce effect (main reveal)
      effects.push(createScaleBounceEffect(letterId, letterStartTime));

      // 2. Glow pulse effect
      effects.push(createGlowPulseEffect(letterId, letterStartTime));

      // 3. Push effect for previous letter (if exists)
      if (index > 0) {
        const prevLetterId = `letter-${index - 1}`;
        effects.push(createPushEffect(prevLetterId, letterStartTime));
      }

      // 4. Ambient float effect (starts after reveal completes)
      effects.push(createAmbientFloatEffect(letterId));

      return {
        id: letterId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              display: 'inline-block',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: revealDuration + floatDuration, // Cover full animation
          },
        },
        effects: effects.filter(Boolean), // Remove nulls
        childrenData: [
          {
            id: `${letterId}-text`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space
              style: {
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                display: 'inline-block',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: revealDuration + floatDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bouncy-typewriter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-flex items-baseline',
        style: {
          gap: '0', // Letters touch each other
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this', // Auto-calculate from children
      },
    },
    childrenData: letterComponents,
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
  id: 'bouncy-typewriter-text-reveal',
  title: 'Bouncy Typewriter Text Reveal',
  description:
    'A modern typokinetic text preset featuring elastic scale-in animation with overshoot for each letter, soft domino-style push effects on previous letters, synchronized glow pulses at impact frames, and a dreamy ambient float after reveal completion. Combines multiple animation tracks: main reveal (scale bounce), glow track (textShadow pulse), push track (translateX nudge), and ambient float track (continuous translateY sine wave).',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'typewriter',
    'bounce',
    'elastic',
    'glow',
    'float',
    'text-reveal',
    'animated-text',
    'domino-effect',
  ],
  defaultInputParams: {
    text: 'Hello World',
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#FFFFFF',
    glowColor: 'rgba(255,255,255,0.8)',
    letterDelay: 0.1,
    bounceDuration: 0.4,
    glowPeakDelay: 0.1,
    pushDistance: 5,
    floatAmplitude: 2,
    floatDuration: 2,
    startDelay: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const bouncyTypewriterTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
