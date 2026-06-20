/**
 * Staggered Cascade Reveal Preset
 *
 * This preset creates a crescendo-style text reveal animation where three lines
 * fade in with progressively faster durations (1s, 0.8s, 0.6s) and decreasing
 * delays (0.5s, 0.3s, 0.1s) to create narrative momentum and excitement.
 *
 * Features:
 * - **Progressive Timing**: Each line animates faster than the previous one
 * - **Accelerating Delays**: Decreasing gaps between lines (0.5s → 0.3s → 0.1s)
 * - **Multi-Property Animation**: Opacity (0→1), Scale (0.95→1.0), TranslateY (10px→0)
 * - **Ease-out Easing**: Punchy animation with fast start, smooth end
 * - **GPU Acceleration**: Transform optimization with translateZ(0)
 * - **Responsive Typography**: Scales from mobile to desktop
 *
 * Use cases:
 * - Trailer text builds
 * - Teaser reveals
 * - Dramatic title sequences
 * - Marketing video intros
 * - Call-to-action reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  line1Text: z
    .string()
    .default('First Line')
    .describe('Text for the first line (slowest reveal)'),
  line2Text: z
    .string()
    .default('Second Line')
    .describe('Text for the second line (medium speed)'),
  line3Text: z
    .string()
    .default('Third Line')
    .describe('Text for the third line (fastest reveal)'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (e.g., "#FFFFFF", "rgb(255,255,255)")'),
  
  gradient: z
    .string()
    .optional()
    .describe('CSS gradient string for gradient text effect (overrides textColor)'),
  
  duration1: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Duration for first line fade-in (seconds)'),
  
  duration2: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.8)
    .describe('Duration for second line fade-in (seconds)'),
  
  duration3: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.6)
    .describe('Duration for third line fade-in (seconds)'),
  
  delay1: z
    .number()
    .min(0)
    .max(5)
    .default(0.5)
    .describe('Delay before second line starts (seconds)'),
  
  delay2: z
    .number()
    .min(0)
    .max(5)
    .default(0.3)
    .describe('Delay before third line starts after second (seconds)'),
  
  totalDuration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration the preset should be visible (seconds)'),
  
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for the container'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

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
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate start times for each line (relative to parent container)
  const line1Start = 0;
  const line2Start = params.duration1 + params.delay1;
  const line3Start = line2Start + params.duration2 + params.delay2;

  // Create text atom data for each line
  const createTextAtom = (
    id: string,
    text: string,
    startTime: number,
  ): RenderableComponentData => {
    return {
      id: id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'text-2xl sm:text-4xl lg:text-6xl font-bold uppercase tracking-wider',
        style: {
          color: params.gradient ? undefined : params.textColor,
          ...fontStyle,
          willChange: 'transform, opacity',
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
        gradient: params.gradient,
      },
      context: {
        timing: {
          start: 0, // All lines use same duration (sentence-level timing)
          duration: params.totalDuration,
        },
      },
    } as RenderableComponentData;
  };

  // Create effect for each line
  const createCascadeEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'ease-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Opacity: 0 → 1
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        // Scale: 0.95 → 1.0
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
        // TranslateY: 10px → 0
        { key: 'translateY', val: 10, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Create text atoms
  const line1 = createTextAtom('cascade-line-1', params.line1Text, line1Start);
  const line2 = createTextAtom('cascade-line-2', params.line2Text, line2Start);
  const line3 = createTextAtom('cascade-line-3', params.line3Text, line3Start);

  // Create effects for each line
  const effect1 = {
    id: 'cascade-effect-1',
    componentId: 'generic',
    data: createCascadeEffect('cascade-line-1', line1Start, params.duration1),
  };

  const effect2 = {
    id: 'cascade-effect-2',
    componentId: 'generic',
    data: createCascadeEffect('cascade-line-2', line2Start, params.duration2),
  };

  const effect3 = {
    id: 'cascade-effect-3',
    componentId: 'generic',
    data: createCascadeEffect('cascade-line-3', line3Start, params.duration3),
  };

  // Attach effects to each line
  line1.effects = [effect1];
  line2.effects = [effect2];
  line3.effects = [effect3];

  // Create root container
  const rootContainer = {
    id: 'staggered-cascade-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-col items-center justify-center min-h-screen gap-2',
        style: {
          ...(params.backgroundColor
            ? { backgroundColor: params.backgroundColor }
            : {}),
          transform: 'translateZ(0)', // GPU acceleration
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [line1, line2, line3] as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'staggeredCascadeReveal',
  title: 'Staggered Cascade Reveal',
  description:
    'A crescendo-style text reveal where three lines fade in with progressively faster durations (1s, 0.8s, 0.6s) and decreasing delays (0.5s, 0.3s, 0.1s) to create narrative momentum. Each line animates from opacity 0 to 1, scale 0.95 to 1.0, and translateY 10px to 0 with ease-out easing for punch. Includes GPU acceleration for smooth performance. Perfect for trailer editing and building excitement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'cascade',
    'crescendo',
    'trailer',
    'animation',
    'staggered',
    'momentum',
  ],
  dependencies: {},
  defaultInputParams: {
    line1Text: 'First Line',
    line2Text: 'Second Line',
    line3Text: 'Third Line',
    font: 'Inter:700',
    textColor: '#FFFFFF',
    duration1: 1,
    duration2: 0.8,
    duration3: 0.6,
    delay1: 0.5,
    delay2: 0.3,
    totalDuration: 10,
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const staggeredCascadeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};