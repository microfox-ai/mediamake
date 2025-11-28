/**
 * Paint Stroke Typewriter Preset
 *
 * A typewriter-style text reveal where each character is painted on with a smooth brush motion.
 * Combines vintage typewriter rhythmic timing with modern kinetic typography - each character
 * space fills with an elegant paint stroke animation that overshoots slightly for a paint splash
 * effect. Includes subtle ink splatter particles on letter completion and impact shake effects
 * for added dynamism.
 *
 * Features:
 * - Paint stroke animation with overshoot effect (scaleY: 0 → 1.2 → 1)
 * - Character-by-character reveal with typewriter timing (0.1s interval default)
 * - Ink splatter particles triggered on each letter completion
 * - Subtle shake effect on character impact
 * - Caption timing support (uses word-level or character-level timing if available)
 * - Customizable ink color, font, and timing parameters
 * - Performance optimized with will-change hints
 *
 * Use cases:
 * - Vintage typewriter aesthetic with artistic paint strokes
 * - Kinetic typography animations with mechanical timing
 * - Dynamic text reveals with paint splash effects
 * - Creative title sequences and artistic text displays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  text: z
    .string()
    .optional()
    .describe('Text to display (used if captions not provided)'),
  
  captions: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        words: z
          .array(
            z.object({
              text: z.string(),
              start: z.number(),
              duration: z.number(),
              absoluteStart: z.number(),
            })
          )
          .optional(),
      })
    )
    .optional()
    .describe('Caption data with word-level timing'),

  characterInterval: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.1)
    .describe('Time interval between each character reveal (seconds)'),

  paintDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.15)
    .describe('Duration of paint stroke animation (seconds)'),

  inkColor: z
    .string()
    .default('#000000')
    .describe('Color of paint stroke and ink splatters (hex or CSS color)'),

  textColor: z
    .string()
    .default('#000000')
    .describe('Color of text characters (hex or CSS color)'),

  font: z
    .string()
    .default('Courier Prime')
    .describe('Font family (e.g., "Courier Prime:400", "Courier New:700")'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),

  splatters: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(4)
    .describe('Number of ink splatter particles per character'),

  shakeMagnitude: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Magnitude of impact shake effect in pixels'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),

  containerWidth: z
    .number()
    .min(100)
    .max(1920)
    .default(1200)
    .describe('Maximum width of text container in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    text,
    captions,
    characterInterval,
    paintDuration,
    inkColor,
    textColor,
    font,
    fontSize,
    splatters,
    shakeMagnitude,
    position,
    containerWidth,
  } = params;

  // Parse font string (format: "FontName:weight")
  const fontString = font || 'Courier Prime';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 400;

  // Helper: Generate random position for splatter particles
  const generateSplatterPosition = (index: number, seed: number) => {
    // Deterministic random based on index and seed
    const randomValue = (Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453) % 1;
    const angle = randomValue * Math.PI * 2;
    const distance = 20 + (randomValue * 20); // 20-40px from center
    const x = 50 + Math.cos(angle) * distance;
    const y = 50 + Math.sin(angle) * distance;
    const size = 2 + (randomValue * 4); // 2-6px
    return { x, y, size };
  };

  // Helper: Extract characters with timing
  const extractCharacters = () => {
    const characters: Array<{ char: string; start: number }> = [];

    if (captions && captions.length > 0) {
      // Use caption timing
      captions.forEach((caption) => {
        const captionText = caption.text;
        const words = caption.words || [];

        if (words.length > 0) {
          // Use word-level timing
          words.forEach((word) => {
            const wordChars = word.text.split('');
            const charDuration = word.duration / wordChars.length;
            wordChars.forEach((char, charIndex) => {
              characters.push({
                char,
                start: word.start + charIndex * charDuration,
              });
            });
            // Add space after word
            characters.push({
              char: ' ',
              start: word.start + word.duration,
            });
          });
        } else {
          // Use caption-level timing, distribute characters evenly
          const captionChars = captionText.split('');
          const charDuration = caption.duration / captionChars.length;
          captionChars.forEach((char, charIndex) => {
            characters.push({
              char,
              start: caption.start + charIndex * charDuration,
            });
          });
        }
      });
    } else if (text) {
      // Use plain text with characterInterval
      const chars = text.split('');
      chars.forEach((char, index) => {
        characters.push({
          char,
          start: index * characterInterval,
        });
      });
    }

    return characters;
  };

  const characters = extractCharacters();

  if (characters.length === 0) {
    throw new Error('No text or captions provided');
  }

  // Calculate total duration
  const lastCharStart = characters[characters.length - 1].start;
  const totalDuration = lastCharStart + paintDuration + 0.5; // Add buffer

  // Create character components
  const characterComponents: RenderableComponentData[] = characters.map(
    (charData, charIndex) => {
      const { char, start: charStart } = charData;
      const charId = `char-${charIndex}`;
      const strokeId = `stroke-${charIndex}`;
      const textId = `text-${charIndex}`;

      // Paint stroke effect
      const strokeEffect: GenericEffectData = {
        type: 'spring',
        start: charStart,
        duration: paintDuration,
        mode: 'provider',
        targetIds: [strokeId],
        ranges: [
          { key: 'scaleY', val: 0, prog: 0 },
          { key: 'scaleY', val: 1.2, prog: 0.7 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      };

      // Text fade-in effect (starts at 80% of stroke completion)
      const textFadeStart = charStart + paintDuration * 0.8;
      const textFadeEffect: GenericEffectData = {
        type: 'ease-out',
        start: textFadeStart,
        duration: paintDuration * 0.2,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Impact shake effect (at stroke completion)
      const shakeStart = charStart + paintDuration;
      const shakeDuration = 0.05;
      const shakeEffect: GenericEffectData = {
        type: 'linear',
        start: shakeStart,
        duration: shakeDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'translateX', val: shakeMagnitude, prog: 0 },
          { key: 'translateX', val: -shakeMagnitude, prog: 0.25 },
          { key: 'translateX', val: shakeMagnitude, prog: 0.5 },
          { key: 'translateX', val: -shakeMagnitude, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: -shakeMagnitude, prog: 0 },
          { key: 'translateY', val: shakeMagnitude, prog: 0.25 },
          { key: 'translateY', val: -shakeMagnitude, prog: 0.5 },
          { key: 'translateY', val: shakeMagnitude, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Create ink splatter particles
      const splatterComponents: RenderableComponentData[] = [];
      for (let i = 0; i < splatters; i++) {
        const splatterId = `splatter-${charIndex}-${i}`;
        const splatterPos = generateSplatterPosition(i, charIndex);
        const splatterStart = charStart + paintDuration * 0.93 + i * 0.01; // Stagger

        const splatterEffect: GenericEffectData = {
          type: 'ease-out',
          start: splatterStart,
          duration: 0.1,
          mode: 'provider',
          targetIds: [splatterId],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 0.5 },
            { key: 'scale', val: 0.8, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        };

        splatterComponents.push({
          id: splatterId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${splatterPos.size}px; height: ${splatterPos.size}px; background: ${inkColor}; border-radius: 50%;"></div>`,
            className: 'absolute',
            style: {
              top: `${splatterPos.y}%`,
              left: `${splatterPos.x}%`,
              transform: 'translate(-50%, -50%)',
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
              id: `splatter-effect-${charIndex}-${i}`,
              componentId: 'generic',
              data: splatterEffect,
            },
          ],
        } as RenderableComponentData);
      }

      // Paint stroke (background rectangle)
      const strokeComponent: RenderableComponentData = {
        id: strokeId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: ${inkColor};"></div>`,
          className: 'absolute inset-0',
          style: {
            transformOrigin: 'bottom center',
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
            id: `stroke-effect-${charIndex}`,
            componentId: 'generic',
            data: strokeEffect,
          },
        ],
      } as RenderableComponentData;

      // Text character
      const textComponent: RenderableComponentData = {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight,
            fontFamily: `${fontFamily}, monospace`,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
            fallback: ['Courier New', 'monospace'],
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
            id: `text-fade-${charIndex}`,
            componentId: 'generic',
            data: textFadeEffect,
          },
          {
            id: `text-shake-${charIndex}`,
            componentId: 'generic',
            data: shakeEffect,
          },
        ],
      } as RenderableComponentData;

      // Splatter container
      const splatterContainer: RenderableComponentData = {
        id: `splatter-container-${charIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: splatterComponents,
      } as RenderableComponentData;

      // Character container
      return {
        id: charId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative overflow-hidden',
            style: {
              width: char === ' ' ? `${fontSize * 0.3}px` : `${fontSize * 0.6}px`,
              height: `${fontSize * 1.2}px`,
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [strokeComponent, textComponent, splatterContainer],
      } as RenderableComponentData;
    }
  );

  // Position mapping
  const positionClass =
    position === 'top'
      ? 'items-start'
      : position === 'bottom'
      ? 'items-end'
      : 'items-center';

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paint-typewriter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${positionClass} justify-center`,
        style: {
          willChange: 'transform, opacity',
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
      {
        id: 'paint-typewriter-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap',
            style: {
              maxWidth: `${containerWidth}px`,
              gap: '0px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: characterComponents,
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

const presetMetadata: PresetMetadata = {
  id: 'paint-stroke-typewriter',
  title: 'Paint Stroke Typewriter',
  description:
    'A typewriter-style text reveal where each character is painted on with a smooth brush motion. Combines vintage typewriter rhythmic timing with modern kinetic typography - each character space fills with an elegant paint stroke animation that overshoots slightly for a paint splash effect. Includes subtle ink splatter particles on letter completion and impact shake effects for added dynamism.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'typewriter',
    'paint',
    'kinetic',
    'stroke',
    'artistic',
    'vintage',
    'modern',
    'splash',
    'particles',
    'animation',
  ],
  defaultInputParams: {
    text: 'Hello World',
    characterInterval: 0.1,
    paintDuration: 0.15,
    inkColor: '#000000',
    textColor: '#000000',
    font: 'Courier Prime:400',
    fontSize: 48,
    splatters: 4,
    shakeMagnitude: 2,
    position: 'center',
    containerWidth: 1200,
  },
  dependencies: {},
};

export const paintStrokeTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
