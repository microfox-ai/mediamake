/**
 * Organic Breathing Animation Preset
 *
 * This preset creates a smooth, organic breathing animation that mimics natural respiration patterns.
 * Think of this like applying a 'breathing' video effect in After Effects - the scale expands and
 * contracts rhythmically, creating a living, organic feel.
 *
 * Features:
 * - **Sine Wave Pattern**: Uses keyframes at [0, 0.5, 1] with values [1, 1.12, 1] for smooth expansion/contraction
 * - **Natural Motion**: ease-in-out easing creates natural breathing rhythm
 * - **Continuous Loop**: 3.5 second cycle with loop: true for infinite breathing
 * - **GPU Accelerated**: Uses transform-gpu class for smooth performance
 * - **Flexible Content**: Works with text (TextAtom) or any nested components
 * - **Relative Timing**: Effect timing is relative to parent component with fitDurationTo: 'self'
 *
 * Use cases:
 * - Focus elements and call-to-action buttons
 * - Highlighted text that needs subtle attention
 * - Creating meditative, calm visual rhythms
 * - Drawing attention without aggressive animations
 * - Background elements that need subtle life
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters schema
const presetParams = z.object({
  content: z
    .string()
    .default('Breathe')
    .describe('Text content to display with breathing animation'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .optional()
    .describe(
      'Total duration in seconds for the breathing effect to play (default: 10)',
    ),
  cycleDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3.5)
    .optional()
    .describe(
      'Duration of one complete breathing cycle in seconds (default: 3.5)',
    ),
  scaleMax: z
    .number()
    .min(1.05)
    .max(1.3)
    .default(1.12)
    .optional()
    .describe(
      'Maximum scale factor at peak of breath (default: 1.12 = 112%)',
    ),
  fontSize: z
    .number()
    .min(12)
    .default(48)
    .optional()
    .describe('Font size in pixels (default: 48)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (default: #FFFFFF)'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),
  fontWeight: z
    .string()
    .default('400')
    .optional()
    .describe('Font weight (default: 400)'),
  positioning: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .optional()
    .describe(
      'Position of the breathing element on screen (default: center)',
    ),
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for text container'),
  padding: z
    .string()
    .default('0px')
    .optional()
    .describe('Padding around text (e.g., "20px", "1rem")'),
  borderRadius: z
    .string()
    .default('0px')
    .optional()
    .describe('Border radius for text container (e.g., "8px", "50%")'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse parameters with defaults
  const content = params.content ?? 'Breathe';
  const duration = params.duration ?? 10;
  const cycleDuration = params.cycleDuration ?? 3.5;
  const scaleMax = params.scaleMax ?? 1.12;
  const fontSize = params.fontSize ?? 48;
  const textColor = params.textColor ?? '#FFFFFF';
  const fontFamily = params.fontFamily ?? 'Inter';
  const fontWeight = params.fontWeight ?? '400';
  const positioning = params.positioning ?? 'center';
  const backgroundColor = params.backgroundColor;
  const padding = params.padding ?? '0px';
  const borderRadius = params.borderRadius ?? '0px';

  // Parse font family from string format (e.g., "Inter:600:italic")
  const parseFontString = (fontString: string) => {
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      return {
        family: parts[0],
        weight: parts.length > 1 ? parts[1] : fontWeight,
        style:
          parts.length > 2
            ? (parts[2] as 'normal' | 'italic')
            : ('normal' as const),
      };
    }
    return {
      family: fontString,
      weight: fontWeight,
      style: 'normal' as const,
    };
  };

  const parsedFont = parseFontString(fontFamily);

  // Determine positioning classes
  const getPositioningClasses = (pos: string): string => {
    switch (pos) {
      case 'top':
        return 'absolute top-0 left-0 right-0 flex items-start justify-center pt-12';
      case 'bottom':
        return 'absolute bottom-0 left-0 right-0 flex items-end justify-center pb-12';
      case 'left':
        return 'absolute top-0 bottom-0 left-0 flex items-center justify-start pl-12';
      case 'right':
        return 'absolute top-0 bottom-0 right-0 flex items-center justify-end pr-12';
      case 'center':
      default:
        return 'absolute inset-0 flex items-center justify-center';
    }
  };

  // Component IDs
  const containerId = 'breathing-container';
  const textId = 'breathing-text';

  // Create breathing effect using generic effect system
  // Keyframes: [0, 0.5, 1] with scale values [1, scaleMax, 1]
  // This creates a smooth sine-wave-like breathing pattern
  const breathingEffect: GenericEffectData = {
    type: 'ease-in-out', // Natural breathing motion
    start: 0, // Start immediately (relative to component)
    duration: cycleDuration, // One complete breath cycle
    mode: 'provider', // Target specific component by ID
    targetIds: [textId], // Target the text element
    ranges: [
      // Scale animation: 1 → scaleMax → 1
      { key: 'scale', val: 1, prog: 0 }, // Start at normal size
      { key: 'scale', val: scaleMax, prog: 0.5 }, // Expand to max at midpoint
      { key: 'scale', val: 1, prog: 1 }, // Contract back to normal
    ],
    loop: true, // Continuous breathing loop
    props: {
      // Additional properties for effect optimization
      fitDurationTo: 'self', // Effect duration matches component duration
    },
  };

  const breathingEffectNode = {
    id: 'breathing-effect',
    componentId: 'generic',
    data: breathingEffect,
  };

  // Create text atom with breathing effect
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: content,
      style: {
        fontSize: fontSize,
        color: textColor,
        fontWeight: parseInt(parsedFont.weight, 10),
        fontStyle: parsedFont.style,
        textAlign: 'center' as const,
        display: 'inline-block',
        transformOrigin: 'center center',
        ...(backgroundColor && { backgroundColor }),
        padding,
        borderRadius,
      },
      font: {
        family: parsedFont.family,
        weights: [parsedFont.weight],
        display: 'swap' as const,
        preload: true,
      },
      className: 'inline-block',
    },
    context: {
      timing: {
        start: 0, // Relative to parent
        duration: duration, // Match parent duration
      },
    },
    effects: [breathingEffectNode], // Apply breathing effect
  };

  // Create container layout with GPU acceleration
  const containerLayout: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `${getPositioningClasses(positioning)} transform-gpu`,
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
  };

  // Return preset output
  return {
    output: {
      childrenData: [containerLayout] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'organic-breathing-effect',
  title: 'Organic Breathing Animation',
  description:
    'A smooth, organic breathing animation preset that mimics natural respiration patterns using sine-wave-like scale transitions. The animation creates a calm, meditative pulse effect with 3.5-second cycles, scaling from 100% to 112% and back. Perfect for focus elements, call-to-action buttons, or highlighted text. Uses GPU-accelerated transforms with ease-in-out easing for the most natural motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'animation',
    'breathing',
    'organic',
    'pulse',
    'scale',
    'loop',
    'text',
    'focus',
    'cta',
    'meditative',
    'smooth',
    'gpu-accelerated',
  ],
  dependencies: {},
  defaultInputParams: {
    content: 'Breathe',
    duration: 10,
    cycleDuration: 3.5,
    scaleMax: 1.12,
    fontSize: 48,
    textColor: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '400',
    positioning: 'center',
    padding: '0px',
    borderRadius: '0px',
  },
};

// Export preset
export const organicBreathingEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
