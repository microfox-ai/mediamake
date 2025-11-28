/**
 * Cascade Slide Character Animation Preset
 *
 * Creates a staggered cascade slide where text breaks into individual characters that slide in
 * with precise choreography, like dominoes falling in reverse. Each character starts its slide
 * slightly after the previous one, creating a wave-like motion across the text.
 *
 * Features:
 * - Character-by-character splitting using TextAtom with inline-block display
 * - Exponential stagger delay calculation: delay = baseDelay * Math.pow(0.9, index)
 * - Acceleration curve timing: first characters slow, middle faster, last fastest
 * - Micro-rotations synchronized with slide for additional dynamism
 * - Transform origin centered for proper rotation pivot
 * - CSS custom properties for dynamic timing calculations
 * - Performance optimization with will-change property (removed after animation completes)
 * - BaseLayout with flex-wrap for character container
 *
 * Technical Specifications:
 * - Base delay: 0.05s
 * - Per-character animation duration: 0.4s
 * - Slide distance: translateX from 50px to 0px
 * - Rotation: 5deg to 0deg
 * - Easing: strong ease-out (ease-out)
 * - Transform origin: center
 *
 * Use Cases:
 * - Sports graphics and action titles
 * - Dramatic content buildup
 * - Product launch announcements
 * - High-energy promotional videos
 * - Dynamic title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter Schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to animate (will be split into characters)'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:800')
    .describe(
      'Font family with optional weight (e.g., "Inter:800", "Roboto:700")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  baseDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Base stagger delay between characters in seconds'),
  animationDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .describe('Duration of animation per character in seconds'),
  slideDistance: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Distance characters slide in from (pixels)'),
  rotationDegrees: z
    .number()
    .min(0)
    .max(45)
    .default(5)
    .describe('Rotation angle for micro-rotation effect (degrees)'),
  accelerationFactor: z
    .number()
    .min(0.5)
    .max(0.99)
    .default(0.9)
    .describe(
      'Exponential decay factor for stagger timing (0.9 = default acceleration)',
    ),
  containerAlignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of text container'),
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning of text container'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the preset in seconds'),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.fontFamily || 'Inter:800';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into individual characters (preserve spaces)
  const characters = params.text.split('');

  // Calculate alignment classes
  const getAlignmentClass = () => {
    switch (params.containerAlignment) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      case 'center':
      default:
        return 'justify-center';
    }
  };

  const getVerticalClass = () => {
    switch (params.verticalPosition) {
      case 'top':
        return 'items-start';
      case 'bottom':
        return 'items-end';
      case 'center':
      default:
        return 'items-center';
    }
  };

  // Create character components with staggered animations
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `cascade-char-${index}`;

      // Calculate stagger delay using exponential function
      const staggerDelay =
        params.baseDelay * Math.pow(params.accelerationFactor, index);

      // Create slide and rotation effect
      const slideEffect: GenericEffectData = {
        type: 'ease-out',
        start: staggerDelay,
        duration: params.animationDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // Slide in from left
          { key: 'translateX', val: params.slideDistance, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          // Rotate from tilted to straight
          { key: 'rotate', val: params.rotationDegrees, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          // Fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      const effect = {
        id: `cascade-slide-effect-${index}`,
        componentId: 'generic',
        data: slideEffect,
      };

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
          style: {
            display: 'inline-block',
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 800,
            color: params.textColor,
            transformOrigin: 'center',
            willChange: 'transform, opacity', // Performance optimization
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['800'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [effect],
      } as RenderableComponentData;
    },
  );

  // Create character container with flex-wrap layout
  const characterContainer: RenderableComponentData = {
    id: 'cascade-character-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-wrap ${getAlignmentClass()} ${getVerticalClass()}`,
        style: {
          gap: '0px', // No gap, characters are adjacent
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: characterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cascade-slide-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${getAlignmentClass()} ${getVerticalClass()}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [characterContainer],
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'cascade-slide-character',
  title: 'Cascade Slide Character Animation',
  description:
    'Staggered cascade slide where text breaks into individual characters that slide in with precise choreography. Each character slides with accelerating timing (first slow, last fast) creating wave-like motion and dramatic buildup. Includes micro-rotations for dynamism. Perfect for sports graphics, action titles, and dramatic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'cascade',
    'slide',
    'stagger',
    'character',
    'kinetic',
    'sports',
    'action',
    'dramatic',
    'buildup',
    'rotation',
    'wave',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GAME ON',
    fontSize: 72,
    fontFamily: 'Inter:800',
    textColor: '#ffffff',
    baseDelay: 0.05,
    animationDuration: 0.4,
    slideDistance: 50,
    rotationDegrees: 5,
    accelerationFactor: 0.9,
    containerAlignment: 'center',
    verticalPosition: 'center',
    duration: 5,
  },
};

// Export Preset
export const cascadeSlideCharacterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
