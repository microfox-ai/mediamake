/**
 * Raindrop Letters Typography Preset
 *
 * A playful typography preset where text letters drop from the top of the screen one by one,
 * mimicking raindrops falling with gravity-like acceleration. Each letter features a bounce
 * effect upon landing, creating an organic and engaging animation.
 *
 * Features:
 * - **Gravity-Like Fall Animation**: Letters drop from above (-150% translateY) to their final position
 * - **Bounce Effect**: Custom cubic-bezier easing (0.34, 1.56, 0.64, 1) creates natural bounce on landing
 * - **Staggered Timing**: Sequential delays (index * 0.08s) create cascading left-to-right effect
 * - **Varied Duration**: Each letter has slightly different fall duration to avoid mechanical uniformity
 * - **Opacity Fade**: Letters fade in during the first 20% of fall animation
 * - **Scale Effect**: Letters scale from 0.8 to 1.0 during landing for impact emphasis
 * - **Dynamic Shadow**: Drop shadow grows as letters approach landing position for depth perception
 *
 * Use cases:
 * - Creating playful title animations with physics-based motion
 * - Building engaging intro sequences with kinetic typography
 * - Adding energetic text reveals for social media content
 * - Creating attention-grabbing animated headers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to animate with raindrop effect'),
  fontSize: z.number().default(72).optional().describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto:700", "BebasNeue")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.3)
    .default(0.08)
    .optional()
    .describe('Delay between each letter drop in seconds'),
  baseDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .optional()
    .describe('Base fall duration for first letter in seconds'),
  durationVariation: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .optional()
    .describe('Duration increment per letter to vary fall times'),
  containerClassName: z
    .string()
    .default('flex items-center justify-center')
    .optional()
    .describe('Additional CSS classes for container positioning'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize = 72,
    fontFamily = 'Inter',
    textColor = '#FFFFFF',
    staggerDelay = 0.08,
    baseDuration = 0.6,
    durationVariation = 0.02,
    containerClassName = 'flex items-center justify-center',
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontParts = fontString.split(':');
    const family = fontParts[0];
    const fontStyle: React.CSSProperties = {};

    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
    }

    return { family, fontStyle };
  };

  const { family: parsedFontFamily, fontStyle } = parseFontString(fontFamily);

  // Split text into individual letters
  const letters = text.split('');

  // Calculate total animation duration
  const totalLetters = letters.length;
  const maxLetterDuration = baseDuration + (totalLetters - 1) * durationVariation;
  const totalDuration = (totalLetters - 1) * staggerDelay + maxLetterDuration;

  // Create letter components with effects
  const letterComponents = letters.map((letter, index) => {
    const letterId = `raindrop-letter-${index}`;
    const letterStart = index * staggerDelay;
    const letterDuration = baseDuration + index * durationVariation;

    // Create raindrop effect for this letter
    const raindropEffect: GenericEffectData = {
      type: 'spring', // Custom cubic-bezier approximated with spring
      start: 0, // Effect starts relative to letter's timing
      duration: letterDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Fall animation: translateY from -150% to 0%
        { key: 'translateY', val: '-150%', prog: 0 },
        { key: 'translateY', val: '0%', prog: 1 },

        // Opacity fade in during first 20% of fall
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },

        // Scale effect: 0.8 to 1.0 during landing
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.0, prog: 0.8 },
        { key: 'scale', val: 1.0, prog: 1 },

        // Drop shadow grows as letter approaches landing
        { key: 'filter', val: 'drop-shadow(0 0 0 transparent)', prog: 0 },
        {
          key: 'filter',
          val: 'drop-shadow(0 2px 3px rgba(0,0,0,0.05))',
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
          prog: 1,
        },
      ],
    };

    const effect = {
      id: `raindrop-effect-${index}`,
      componentId: 'generic',
      data: raindropEffect,
    };

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          display: 'inline-block',
          ...fontStyle,
        },
        font: {
          family: parsedFontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      },
      context: {
        timing: {
          start: letterStart,
          duration: totalDuration - letterStart, // Each letter lasts until end of animation
        },
      },
      effects: [effect],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer = {
    id: 'raindrop-letters-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full overflow-hidden ${containerClassName}`,
      },
      repeatChildrenProps: {
        className: 'inline-block',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents as RenderableComponentData[],
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
  id: 'raindrop-letters-typography',
  title: 'Raindrop Letters Typography',
  description:
    'A playful typography preset where text letters drop from above the screen one by one like raindrops falling. Each letter animates from -150% translateY to 0% with spring easing that creates a natural bounce effect on landing. Letters fade in during the first 20% of fall, scale from 0.8 to 1.0. Staggered timing (letterIndex * 0.08s delay) creates a cascading left-to-right effect. Slight duration variation per letter avoids mechanical uniformity, making the animation feel organic and playful.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'animation',
    'raindrop',
    'falling',
    'bounce',
    'kinetic',
    'playful',
    'gravity',
    'staggered',
    'cascade',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HELLO WORLD',
    fontSize: 72,
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    staggerDelay: 0.08,
    baseDuration: 0.6,
    durationVariation: 0.02,
    containerClassName: 'flex items-center justify-center',
  },
};

// Export preset
export const raindropLettersTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
