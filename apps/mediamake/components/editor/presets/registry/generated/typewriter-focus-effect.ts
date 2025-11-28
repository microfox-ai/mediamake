/**
 * Typewriter Focus Effect Preset
 *
 * A vintage typewriter-style focus effect where each character comes into sharp focus 
 * sequentially from left to right, mimicking the mechanical engagement of a typewriter.
 * Characters start heavily blurred and snap into focus with a mechanical, stepped animation,
 * accompanied by subtle shake, scale pop, and appearing text-shadow for depth.
 *
 * Features:
 * - **Mechanical Snap Animation**: Blur transitions with steps(1) easing for instant focus
 * - **Scale Pop Effect**: Characters scale from 0.8 → 1.1 → 1.0 for mechanical impact
 * - **Shake Effect**: Subtle random shake via translateX/Y to simulate mechanical impact
 * - **Text Shadow**: Shadow appears with focus to create depth (none → 2px 2px 4px rgba(0,0,0,0.3))
 * - **Rapid Succession Timing**: 80ms stagger between characters for typewriter rhythm
 * - **Flex Layout**: Horizontal flex-row layout with flex-wrap for text wrapping
 * - **Performance Optimized**: CSS containment on parent for better rendering performance
 *
 * Use cases:
 * - Creating vintage typewriter reveal effects
 * - Building mechanical text animations with editorial style
 * - Adding retro character-by-character text reveals
 * - Creating focus-based typography effects with mechanical feel
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
  TextAtomData,
} from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display with typewriter focus effect'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:700" for weight 700, or "Inter" for default)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  staggerDelay: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Delay between each character in milliseconds (typewriter rhythm)'),
  characterDuration: z
    .number()
    .min(100)
    .max(1000)
    .default(300)
    .describe('Duration of each character animation in milliseconds'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Intensity of shake effect in pixels'),
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .describe('Initial delay before animation starts in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to parse font string
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

  // Helper function to generate random shake offset
  const randomShake = (intensity: number) => {
    return (Math.random() - 0.5) * 2 * intensity;
  };

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);
  const characters = params.text.split('');
  const staggerDelay = params.staggerDelay / 1000; // Convert to seconds
  const charDuration = params.characterDuration / 1000; // Convert to seconds
  const totalDuration =
    (characters.length * staggerDelay) + charDuration + params.startDelay;

  // Create character components
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `typewriter-char-${index}`;
      const effectStart = params.startDelay + (index * staggerDelay);
      
      // Generate random shake offsets for this character
      const shakeX = randomShake(params.shakeIntensity);
      const shakeY = randomShake(params.shakeIntensity);

      // Create mechanical focus effect with stepped blur, scale pop, shake, and text-shadow
      const focusEffect: GenericEffectData = {
        type: 'linear', // Linear for mechanical feel
        start: effectStart,
        duration: charDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // Blur: 15px → 0px with stepped transition (mechanical snap)
          { key: 'blur', val: '15px', prog: 0 },
          { key: 'blur', val: '0px', prog: 0.4 },
          
          // Scale pop: 0.8 → 1.1 → 1.0
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.5 },
          { key: 'scale', val: 1.0, prog: 1 },
          
          // Shake effect (simulate mechanical impact)
          { key: 'translateX', val: shakeX, prog: 0.3 },
          { key: 'translateX', val: 0, prog: 0.6 },
          { key: 'translateY', val: shakeY, prog: 0.3 },
          { key: 'translateY', val: 0, prog: 0.6 },
          
          // Text shadow appears with focus
          { key: 'textShadow', val: 'none', prog: 0 },
          { key: 'textShadow', val: '2px 2px 4px rgba(0,0,0,0.3)', prog: 0.4 },
        ],
      };

      const charComponent: RenderableComponentData = {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Use non-breaking space for spaces
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            display: 'inline-block',
            filter: 'blur(15px)', // Start blurred
            transform: 'scale(0.8)', // Start scaled down
            textShadow: 'none', // Start without shadow
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `typewriter-focus-effect-${index}`,
            componentId: 'generic',
            data: focusEffect,
          },
        ],
      };

      return charComponent;
    },
  );

  // Root container with flex layout and CSS containment
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-focus-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center flex-wrap',
        style: {
          contain: 'layout style paint', // Performance optimization
          gap: '0px', // No gap between characters
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents as RenderableComponentData[],
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
  id: 'typewriter-focus-effect',
  title: 'Typewriter Focus Effect',
  description:
    'A typewriter-style focus effect where each character comes into sharp focus sequentially from left to right with mechanical snap animations. Characters start heavily blurred and snap into focus with stepped animation, scale pop (0.8 to 1.1 to 1.0), subtle shake, and appearing text-shadow for depth. Uses rapid 80ms staggered timing between characters to create vintage typewriter rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'typewriter',
    'focus',
    'mechanical',
    'vintage',
    'retro',
    'character-animation',
    'blur',
    'scale',
    'shake',
    'editorial',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'TYPEWRITER EFFECT',
    fontSize: 48,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    staggerDelay: 80,
    characterDuration: 300,
    shakeIntensity: 2,
    startDelay: 0,
  },
};

export const typewriterFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
