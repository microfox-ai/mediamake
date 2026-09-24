/**
 * Precision Stagger Reveal Preset
 *
 * This preset creates a high-precision letter-by-letter stagger reveal animation where each
 * character unfolds with Swiss watch accuracy. Letters rotate in from a 90-degree fold (like
 * pages in a book) with individual timing offsets creating a wave effect across the text.
 *
 * Features:
 * - **Alternating Fold Axis**: Odd letters rotate from rotateY(-90deg), even letters from rotateY(90deg)
 * - **Precision Timing**: Each letter animates for exactly 400ms with a 25ms stagger
 * - **Mathematically Predictable**: Total cascade time = (textLength - 1) * staggerInterval + rotationDuration
 * - **Double-Layered Timing**: Rotation effect (400ms, 25ms stagger) + brightness pulse (30ms stagger)
 * - **3D Depth**: Uses perspective for authentic 3D rotation effects
 * - **Customizable Parameters**: Stagger timing, fold angle, and brightness pulse intensity
 *
 * Use cases:
 * - High-tech product launch videos requiring exact timing control
 * - Premium brand reveals with precise choreography
 * - Luxury product showcases with refined animations
 * - Corporate presentations with professional polish
 * - Tech demos requiring mathematical precision
 *
 * Technical Implementation:
 * - Uses BaseLayout with perspective: '1000px' for 3D depth
 * - Individual span elements for each character using text.split('')
 * - Each letter has transform-style: 'preserve-3d' and backface-visibility: 'hidden'
 * - Rotation effect: 400ms duration, 25ms * index delay, ease-in-out easing
 * - Brightness effect: brightness(0.5) → brightness(1.2) → brightness(1), 30ms * index delay
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('PRECISION')
    .describe('Text to animate with stagger reveal effect'),
  
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(64)
    .optional()
    .describe('Font size in pixels'),
  
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "bold")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex, rgb, or CSS color name)'),
  
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto:700", "Montserrat:600:italic")'),
  
  rotationDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .optional()
    .describe('Duration of rotation animation per letter in seconds (default: 0.4s / 400ms)'),
  
  staggerInterval: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.025)
    .optional()
    .describe('Delay between each letter animation in seconds (default: 0.025s / 25ms)'),
  
  foldAngle: z
    .number()
    .min(45)
    .max(180)
    .default(90)
    .optional()
    .describe('Rotation angle for fold effect in degrees (default: 90 degrees)'),
  
  brightnessStagger: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.03)
    .optional()
    .describe('Delay between each letter brightness pulse in seconds (default: 0.03s / 30ms)'),
  
  brightnessPulseIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .optional()
    .describe('Peak brightness intensity for pulse effect (default: 1.2)'),
  
  letterSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .optional()
    .describe('Letter spacing in pixels'),
  
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .optional()
    .describe('Perspective distance for 3D effect in pixels (default: 1000px)'),
  
  startDelay: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .optional()
    .describe('Delay before animation starts in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Extract parameters
  const text = params.text || 'PRECISION';
  const fontSize = params.fontSize || 64;
  const fontWeight = params.fontWeight || '700';
  const textColor = params.textColor || '#ffffff';
  const rotationDuration = params.rotationDuration || 0.4;
  const staggerInterval = params.staggerInterval || 0.025;
  const foldAngle = params.foldAngle || 90;
  const brightnessStagger = params.brightnessStagger || 0.03;
  const brightnessPulseIntensity = params.brightnessPulseIntensity || 1.2;
  const letterSpacing = params.letterSpacing || 0;
  const perspective = params.perspective || 1000;
  const startDelay = params.startDelay || 0;

  // Calculate total duration
  const letters = text.split('');
  const totalDuration = (letters.length - 1) * staggerInterval + rotationDuration + startDelay;

  // Generate unique IDs
  const containerId = 'precision-stagger-container';
  const lettersContainerId = 'letters-flex-container';

  // Create letter components
  const letterComponents: RenderableComponentData[] = letters.map((char, index) => {
    const letterId = `letter-${index}`;
    const isEven = index % 2 === 0;
    
    // Rotation effect: alternating fold direction
    const rotationEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: startDelay + index * staggerInterval,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        {
          key: 'rotateY',
          val: isEven ? foldAngle : -foldAngle, // Alternate direction
          prog: 0,
        },
        {
          key: 'rotateY',
          val: 0,
          prog: 1,
        },
      ],
    };

    // Brightness pulse effect
    const brightnessEffect: GenericEffectData = {
      type: 'ease-out',
      start: startDelay + index * brightnessStagger,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        {
          key: 'brightness',
          val: 0.5,
          prog: 0,
        },
        {
          key: 'brightness',
          val: brightnessPulseIntensity,
          prog: 0.5,
        },
        {
          key: 'brightness',
          val: 1,
          prog: 1,
        },
      ],
    };

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char === ' ' ? '\u00A0' : char, // Use non-breaking space for spaces
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontStyle.fontWeight || fontWeight,
          fontStyle: fontStyle.fontStyle || 'normal',
          color: textColor,
          position: 'relative',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          ...(letterSpacing > 0 ? { marginRight: `${letterSpacing}px` } : {}),
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || fontWeight],
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
          id: `rotation-effect-${index}`,
          componentId: 'generic',
          data: rotationEffect,
        },
        {
          id: `brightness-effect-${index}`,
          componentId: 'generic',
          data: brightnessEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Letters container with flexbox layout
  const lettersContainer: RenderableComponentData = {
    id: lettersContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row',
        style: {
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
    childrenData: letterComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center absolute inset-0',
        style: {
          perspective: `${perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [lettersContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'precision-stagger-reveal',
  title: 'Precision Stagger Reveal',
  description:
    'High-precision letter-by-letter stagger reveal preset where each character unfolds with Swiss watch accuracy. Features alternating 3D rotation from ±90deg fold axes (like book pages), double-layered timing (rotation + brightness pulse), and mathematically predictable cascade timing. Perfect for high-tech product launches requiring exact timing control.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'stagger',
    'reveal',
    '3d',
    'rotation',
    'precision',
    'high-tech',
    'product-launch',
    'animation',
    'wave',
    'cascade',
    'fold',
    'brightness',
    'pulse',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PRECISION',
    fontSize: 64,
    fontWeight: '700',
    textColor: '#ffffff',
    font: 'Inter',
    rotationDuration: 0.4,
    staggerInterval: 0.025,
    foldAngle: 90,
    brightnessStagger: 0.03,
    brightnessPulseIntensity: 1.2,
    letterSpacing: 0,
    perspective: 1000,
    startDelay: 0,
  },
};

// Export preset
export const precisionStaggerRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
