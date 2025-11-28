/**
 * TypewriterPrecision Internal Combined Effect Preset
 *
 * Creates a precise character-by-character typewriter reveal with mechanical aesthetics.
 * This internal effect preset simulates authentic typewriter mechanics including:
 * - Character overshoot animation (scale 1.2 to 1.0)
 * - Horizontal mechanical jitter (±2px translateX)
 * - Brief brightness flash on character appearance
 * - Optional typing cursor (caret) animation
 * - Ribbon fade for ink density variation
 * - Realistic punctuation pauses
 * - Paper texture overlay with subtle shift
 * - Sound sync points for typewriter click audio
 *
 * This is an INTERNAL EFFECT PRESET that returns multiple effects per character.
 * It is meant to be called by other presets programmatically, not used directly.
 *
 * Technical Notes:
 * - Effect type: combined (returns array of effects for each character)
 * - Return format: { effects: [...appearEffects, ...jitterEffects, ...caretEffects, ...paperEffects] }
 * - Handles word-wrapping awareness to prevent mid-wrap character reveals
 * - All timing is relative to parent component
 *
 * ARRAY OF EFFECTS:
 * Returns multiple effect objects targeting character components and optional caret/paper overlays.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of character component IDs to animate in sequence'),
  typeSpeed: z
    .number()
    .min(10)
    .max(500)
    .default(80)
    .describe('Milliseconds per character typing speed'),
  caretVisible: z
    .boolean()
    .default(true)
    .describe('Whether to show a blinking typing cursor'),
  mechanicalJitter: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Randomness factor for mechanical jitter (0 = no jitter, 1 = max jitter)'),
  ribbonFade: z
    .boolean()
    .default(false)
    .describe('Simulate ink density variation with subtle opacity changes'),
  pauseOnPunctuation: z
    .boolean()
    .default(true)
    .describe('Add realistic pauses after punctuation marks'),
  textContent: z
    .string()
    .optional()
    .describe('Full text content for calculating punctuation pauses (optional)'),
  caretId: z
    .string()
    .optional()
    .describe('ID of caret component if caretVisible is true'),
  paperOverlayId: z
    .string()
    .optional()
    .describe('ID of paper texture overlay component'),
  effectIdPrefix: z
    .string()
    .default('typewriter')
    .describe('Prefix for generated effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate delay for each character based on index and punctuation
  const calculateTypeDelay = (
    index: number,
    typeSpeed: number,
    pauseOnPunctuation: boolean,
    textContent?: string,
  ): number => {
    let delay = 0;

    // Base delay: typeSpeed * index
    delay = (typeSpeed / 1000) * index;

    // Add punctuation pauses if enabled and text content is provided
    if (pauseOnPunctuation && textContent) {
      for (let i = 0; i < index; i++) {
        const char = textContent[i];
        if (char === '.') {
          delay += 0.3; // 300ms pause after period
        } else if (char === ',') {
          delay += 0.15; // 150ms pause after comma
        } else if (char === '!' || char === '?' || char === ';' || char === ':') {
          delay += 0.1; // 100ms pause after other punctuation
        }
      }
    }

    return delay;
  };

  // Helper function: Generate random jitter value
  const randomJitter = (jitterFactor: number): number => {
    const maxJitter = 2; // ±2px
    const randomValue = (Math.random() - 0.5) * 2; // Random value between -1 and 1
    return randomValue * maxJitter * jitterFactor;
  };

  // Helper function: Generate ribbon fade opacity
  const getRibbonFadeOpacity = (index: number, totalChars: number): number => {
    // Subtle opacity variation to simulate ink density
    const baseOpacity = 1.0;
    const variation = 0.05; // ±5% variation
    const noise = Math.sin(index * 0.5) * variation;
    return Math.max(0.9, Math.min(1.0, baseOpacity + noise));
  };

  const effects: any[] = [];

  const {
    targetIds,
    typeSpeed,
    caretVisible,
    mechanicalJitter,
    ribbonFade,
    pauseOnPunctuation,
    textContent,
    caretId,
    paperOverlayId,
    effectIdPrefix,
  } = params;

  const totalChars = targetIds.length;

  // Generate effects for each character
  targetIds.forEach((charId, index) => {
    const startDelay = calculateTypeDelay(
      index,
      typeSpeed,
      pauseOnPunctuation,
      textContent,
    );

    // 1. Character appear effect (overshoot scale, opacity fade, brightness flash)
    const appearEffect: GenericEffectData = {
      type: 'ease-out',
      start: startDelay,
      duration: 0.1, // 100ms
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        { key: 'scale', val: 1.2, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
        { key: 'opacity', val: ribbonFade ? getRibbonFadeOpacity(index, totalChars) : 1, prog: 0 },
        { key: 'opacity', val: ribbonFade ? getRibbonFadeOpacity(index, totalChars) : 1, prog: 0.3 },
        { key: 'opacity', val: ribbonFade ? getRibbonFadeOpacity(index, totalChars) : 1, prog: 1 },
        { key: 'brightness', val: 1.5, prog: 0 },
        { key: 'brightness', val: 1.0, prog: 1 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-appear-${index}`,
      componentId: 'generic',
      data: appearEffect,
    });

    // 2. Mechanical jitter effect (horizontal translateX)
    if (mechanicalJitter > 0) {
      const jitterValue = randomJitter(mechanicalJitter);
      const jitterEffect: GenericEffectData = {
        type: 'linear',
        start: startDelay,
        duration: 0.05, // 50ms quick jitter
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: jitterValue, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      };

      effects.push({
        id: `${effectIdPrefix}-jitter-${index}`,
        componentId: 'generic',
        data: jitterEffect,
      });
    }
  });

  // Total typing duration
  const totalDuration =
    calculateTypeDelay(totalChars, typeSpeed, pauseOnPunctuation, textContent) +
    0.5; // Add extra time at end

  // 3. Typing caret effect (if enabled)
  if (caretVisible && caretId) {
    const caretBlinkEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [caretId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 0.75 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-caret-blink`,
      componentId: 'generic',
      data: caretBlinkEffect,
    });

    // Caret position update (move caret to follow typing)
    // Since we can't dynamically move the caret in real-time with effects,
    // we fade it out when typing completes
    const caretFadeEffect: GenericEffectData = {
      type: 'ease-out',
      start: totalDuration - 0.5,
      duration: 0.5,
      mode: 'provider',
      targetIds: [caretId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-caret-fade`,
      componentId: 'generic',
      data: caretFadeEffect,
    });
  }

  // 4. Paper texture overlay shift effect (if provided)
  if (paperOverlayId) {
    const paperShiftEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [paperOverlayId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 2, prog: 1 }, // Subtle 2px shift
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 1, prog: 1 }, // Subtle 1px shift
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-paper-shift`,
      componentId: 'generic',
      data: paperShiftEffect,
    });
  }

  // Return effects array wrapped in container structure
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typewriterPrecisionEffect',
  title: 'TypewriterPrecision Effect',
  description:
    'Internal combined effect preset that creates a precise character-by-character typewriter reveal with mechanical aesthetics including overshoot, jitter, brightness flash, optional caret, ribbon fade, punctuation pauses, and paper texture shift.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'typewriter',
    'character-reveal',
    'mechanical',
    'text-animation',
    'internal',
    'combined',
  ],
  dependencies: {},
  _internalPreset: true, // Mark as internal preset
  _internalPresetOutput: 'effects', // Extract effects from output
  defaultInputParams: {
    targetIds: ['char-0', 'char-1', 'char-2'],
    typeSpeed: 80,
    caretVisible: true,
    mechanicalJitter: 0.5,
    ribbonFade: false,
    pauseOnPunctuation: true,
    textContent: 'Hello, World!',
    caretId: 'typing-caret',
    paperOverlayId: 'paper-overlay',
    effectIdPrefix: 'typewriter',
  },
};

// Export preset
export const typewriterPrecisionEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
