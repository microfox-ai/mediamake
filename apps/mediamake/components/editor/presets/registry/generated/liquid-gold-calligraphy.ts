/**
 * Liquid Gold Calligraphy Preset
 *
 * A flowing calligraphy-inspired typography preset where text appears as if being painted
 * by an invisible brush with liquid gold ink. Each letter has natural brush stroke thickness
 * variation (thin start, swelling middle, tapering end), and the animation follows natural
 * handwriting stroke order with sequential letter painting.
 *
 * Features:
 * - Sequential letter painting animation with brush stroke thickness variation
 * - Subtle ink splatter effects at the beginning of each word
 * - Gentle drips on descender letters (g, j, p, q, y)
 * - Warm luminous metallic gold effect with soft pulsing highlights
 * - Ornate serif font (Cinzel Decorative) with golden gradient text effect
 *
 * Use cases:
 * - Luxury brand titles and elegant captions
 * - High-end product reveals and premium content
 * - Wedding invitations and special event titles
 * - Sophisticated intro/outro sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, RenderableComponentData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with calligraphy effect'),
  font: z
    .string()
    .default('Cinzel Decorative:600')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Cinzel Decorative:600", "Playfair Display:700")',
    ),
  fontSize: z
    .number()
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  duration: z
    .number()
    .optional()
    .describe(
      'Total duration in seconds (auto-calculated if not provided based on letter count)',
    ),
  letterDelay: z
    .number()
    .default(0.15)
    .optional()
    .describe('Time delay between each letter animation in seconds'),
  showSplatters: z
    .boolean()
    .default(true)
    .optional()
    .describe('Show ink splatter effects at word beginnings'),
  showDrips: z
    .boolean()
    .default(true)
    .optional()
    .describe('Show ink drip effects on descender letters'),
  glowPulse: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable gentle glow pulse effect after text is revealed'),
  primaryColor: z
    .string()
    .default('#FFD700')
    .optional()
    .describe('Primary gold color (default: #FFD700)'),
  secondaryColor: z
    .string()
    .default('#FFA500')
    .optional()
    .describe('Secondary gold color for gradient (default: #FFA500)'),
  position: z
    .object({
      horizontal: z
        .enum(['left', 'center', 'right'])
        .default('center')
        .optional(),
      vertical: z.enum(['top', 'center', 'bottom']).default('center').optional(),
    })
    .default({ horizontal: 'center', vertical: 'center' })
    .optional()
    .describe('Position of the text on screen'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Cinzel Decorative:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 600;

  // Constants
  const text = params.text;
  const fontSize = params.fontSize || 72;
  const letterDelay = params.letterDelay || 0.15;
  const primaryColor = params.primaryColor || '#FFD700';
  const secondaryColor = params.secondaryColor || '#FFA500';
  const showSplatters = params.showSplatters !== false;
  const showDrips = params.showDrips !== false;
  const glowPulse = params.glowPulse !== false;

  // Helper function: Calculate position classes
  const getPositionClasses = (): string => {
    const horizontal =
      params.position?.horizontal || 'center';
    const vertical = params.position?.vertical || 'center';

    const hClass =
      horizontal === 'left'
        ? 'justify-start'
        : horizontal === 'right'
          ? 'justify-end'
          : 'justify-center';
    const vClass =
      vertical === 'top'
        ? 'items-start'
        : vertical === 'bottom'
          ? 'items-end'
          : 'items-center';

    return `${hClass} ${vClass}`;
  };

  // Split text into letters
  const letters = text.split('');
  const letterCount = letters.length;

  // Calculate total duration
  const totalDuration =
    params.duration ||
    letterCount * letterDelay + 2.5; // Buffer for effects + pulse

  // Helper: Detect descender letters
  const isDescender = (char: string): boolean => {
    return ['g', 'j', 'p', 'q', 'y'].includes(char.toLowerCase());
  };

  // Helper: Detect word boundaries (space or punctuation)
  const isWordStart = (index: number): boolean => {
    if (index === 0) return true;
    const prevChar = letters[index - 1];
    return prevChar === ' ' || /[.,!?;:]/.test(prevChar);
  };

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map(
    (char, index) => {
      const letterId = `letter-${index}`;
      const letterStart = index * letterDelay;
      const letterRevealDuration = 0.4;

      // Letter reveal effect (brush stroke)
      const letterRevealEffect: GenericEffectData = {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
        start: letterStart,
        duration: letterRevealDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Opacity fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
          // Horizontal scale (brush stroke)
          { key: 'scaleX', val: 0.3, prog: 0 },
          { key: 'scaleX', val: 1, prog: 0.7 },
          { key: 'scaleX', val: 1, prog: 1 },
          // Vertical scale (thickness variation)
          { key: 'scaleY', val: 0.8, prog: 0 },
          { key: 'scaleY', val: 1.15, prog: 0.4 }, // Swell in middle
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      };

      return {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          className: 'inline-block',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: `0 0 10px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3), 0 0 30px rgba(255, 215, 0, 0.2)`,
            opacity: 0,
            transform: 'scale(1)',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
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
            id: `reveal-${letterId}`,
            componentId: 'generic',
            data: letterRevealEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create splatter effects for word starts
  const splatterEffects: RenderableComponentData[] = [];
  if (showSplatters) {
    letters.forEach((char, index) => {
      if (isWordStart(index) && char !== ' ') {
        const splatterId = `splatter-${index}`;
        const splatterStart = index * letterDelay;

        // Random positions around letter start
        const offsetX = Math.random() * 20 - 10;
        const offsetY = Math.random() * 20 - 10;

        const splatterEffect: GenericEffectData = {
          type: 'ease-out' as any,
          start: splatterStart,
          duration: 0.4,
          mode: 'provider',
          targetIds: [splatterId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        };

        splatterEffects.push({
          id: splatterId,
          type: 'atom' as const,
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            color: primaryColor,
            style: {
              position: 'absolute',
              width: `${4 + Math.random() * 4}px`,
              height: `${4 + Math.random() * 4}px`,
              borderRadius: '50%',
              opacity: 0,
              left: `${index * (fontSize * 0.6) + offsetX}px`,
              top: `${offsetY}px`,
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
              id: `splatter-effect-${index}`,
              componentId: 'generic',
              data: splatterEffect,
            },
          ],
        } as RenderableComponentData);
      }
    });
  }

  // Create drip effects for descender letters
  const dripEffects: RenderableComponentData[] = [];
  if (showDrips) {
    letters.forEach((char, index) => {
      if (isDescender(char)) {
        const dripId = `drip-${index}`;
        const letterStart = index * letterDelay;
        const dripStart = letterStart + 0.4; // Start after letter reveal

        const dripEffect: GenericEffectData = {
          type: 'ease-in' as any,
          start: dripStart,
          duration: 0.6,
          mode: 'provider',
          targetIds: [dripId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 15, prog: 1 },
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1.3, prog: 0.5 },
            { key: 'scaleY', val: 0.7, prog: 1 },
          ],
        };

        dripEffects.push({
          id: dripId,
          type: 'atom' as const,
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            color: primaryColor,
            style: {
              position: 'absolute',
              width: '3px',
              height: '10px',
              borderRadius: '2px',
              opacity: 0,
              left: `${index * (fontSize * 0.6) + fontSize * 0.3}px`,
              top: `${fontSize * 0.8}px`,
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
              id: `drip-effect-${index}`,
              componentId: 'generic',
              data: dripEffect,
            },
          ],
        } as RenderableComponentData);
      }
    });
  }

  // Create glow pulse effect (applied to entire text container)
  const glowPulseEffects: RenderableComponentData['effects'] = [];
  if (glowPulse) {
    const textRevealCompleteTime = letterCount * letterDelay + 0.4;
    const pulseCount = Math.floor(
      (totalDuration - textRevealCompleteTime) / 2,
    );

    for (let i = 0; i < pulseCount; i++) {
      const pulseStart = textRevealCompleteTime + i * 2;
      const pulseEffect: GenericEffectData = {
        type: 'ease-in-out' as any,
        start: pulseStart,
        duration: 2,
        mode: 'provider',
        targetIds: ['letters-container'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.02, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          {
            key: 'filter',
            val: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))',
            prog: 0.5,
          },
          {
            key: 'filter',
            val: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))',
            prog: 1,
          },
        ],
      };

      glowPulseEffects.push({
        id: `glow-pulse-${i}`,
        componentId: 'generic',
        data: pulseEffect,
      });
    }
  }

  // Build the composition
  const rootContainer: RenderableComponentData = {
    id: 'liquid-gold-calligraphy-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${getPositionClasses()}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Letters container
      {
        id: 'letters-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex items-baseline',
            style: {
              gap: '0.05em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: letterComponents as RenderableComponentData[],
        effects: glowPulseEffects,
      } as RenderableComponentData,
      // Splatter effects container
      {
        id: 'splatter-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none overflow-visible',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: splatterEffects as RenderableComponentData[],
      } as RenderableComponentData,
      // Drip effects container
      {
        id: 'drip-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none overflow-visible',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: dripEffects as RenderableComponentData[],
      } as RenderableComponentData,
    ],
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
  id: 'liquid-gold-calligraphy',
  title: 'Liquid Gold Calligraphy',
  description:
    'A flowing calligraphy-inspired typography preset where text appears as if being painted by an invisible brush with liquid gold ink. Features natural brush stroke thickness variation, sequential letter painting animation, ink splatter effects, gentle drips on descenders, and a warm luminous metallic gold effect with soft pulsing highlights. Perfect for luxury brand titles and elegant captions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'calligraphy',
    'luxury',
    'gold',
    'elegant',
    'brush-stroke',
    'ink',
    'metallic',
    'animated',
    'title',
    'text-effect',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Luxury Brand',
    font: 'Cinzel Decorative:600',
    fontSize: 72,
    letterDelay: 0.15,
    showSplatters: true,
    showDrips: true,
    glowPulse: true,
    primaryColor: '#FFD700',
    secondaryColor: '#FFA500',
    position: {
      horizontal: 'center',
      vertical: 'center',
    },
  },
};

// Export preset
export const liquidGoldCalligraphyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
