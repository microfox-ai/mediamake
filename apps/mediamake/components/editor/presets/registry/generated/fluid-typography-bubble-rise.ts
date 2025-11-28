/**
 * Fluid Typography Bubble Rise Preset
 *
 * Water-inspired typography preset where text lines rise like air bubbles through liquid
 * with acceleration, oscillation, refractive distortion, blur transitions, color depth shifts,
 * and ripple displacement effects on existing lines.
 *
 * Features:
 * - **Bubble-like Rise Animation**: Text lines start slowly at bottom and accelerate as they ascend
 * - **Oscillation Effect**: Gentle bobbing motion when lines reach their position (2-3 cycles)
 * - **Refractive Quality**: ScaleX distortion (0.98-1.02) simulating water refraction
 * - **Blur Transition**: Lines start blurred (2px) and clear as they settle
 * - **Depth Simulation**: Blue-tinted color shift fading as text rises
 * - **Ripple Displacement**: Existing lines ripple when new lines pass through them
 * - **Configurable Timing**: 2s rise time with acceleration, 1s oscillation period with damping
 *
 * Use cases:
 * - Creating water-themed text animations
 * - Building fluid, organic text effects
 * - Adding physics-inspired motion to typography
 * - Creating depth and atmosphere in text presentations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
  TextAtomData,
} from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(z.any()),
      }),
    )
    .describe('Array of caption objects with text and timing information'),
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#1e3a8a')
    .describe('Initial text color (blue-tinted for depth)'),
  finalTextColor: z
    .string()
    .default('#1f2937')
    .describe('Final text color when settled (darker gray)'),
  riseDistance: z
    .number()
    .min(100)
    .max(1000)
    .default(500)
    .describe('Distance text rises from bottom (in pixels)'),
  riseDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of rise animation (seconds)'),
  oscillationDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of oscillation after rise (seconds)'),
  oscillationCycles: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Number of oscillation cycles (can be fractional)'),
  scaleDistortionIntensity: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Intensity of scaleX distortion (0.02 = ±2%)'),
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Initial blur amount in pixels'),
  rippleIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Intensity of ripple displacement (pixels)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Delay between each line appearing (seconds)'),
  verticalSpacing: z
    .number()
    .min(10)
    .max(200)
    .default(80)
    .describe('Vertical spacing between text lines (pixels)'),
  position: z
    .enum(['center', 'left', 'right'])
    .default('center')
    .describe('Horizontal alignment of text'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper function to create oscillation keyframes
  const createOscillationRanges = (
    cycles: number,
    baseAmplitude: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const steps = Math.ceil(cycles * 4); // 4 keyframes per cycle

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const cyclePosition = prog * cycles * 2 * Math.PI;
      const dampingFactor = 1 - prog * 0.7; // Damping decreases amplitude
      const amplitude = baseAmplitude * dampingFactor;
      const value = Math.sin(cyclePosition) * amplitude;

      ranges.push({
        key: 'translateY',
        val: value,
        prog: prog,
      });
    }

    return ranges;
  };

  // Helper function to create ripple effect for existing lines
  const createRippleEffect = (
    targetId: string,
    triggerTime: number,
    lineIndex: number,
  ): any => {
    const rippleDuration = 0.4;
    const rippleAmplitude = params.rippleIntensity * (1 - lineIndex * 0.1); // Weaker for lower lines

    return {
      id: `ripple-${targetId}-${triggerTime}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: triggerTime,
        duration: rippleDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: rippleAmplitude, prog: 0.3 },
          { key: 'translateY', val: -rippleAmplitude * 0.5, prog: 0.6 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Create text line components with effects
  const textLineComponents: RenderableComponentData[] = captions.map(
    (caption, index) => {
      const lineId = `line-${index}`;
      const startTime = index * params.staggerDelay;
      const totalDuration =
        params.riseDuration + params.oscillationDuration + 10; // Extended settle time

      // Calculate vertical position (from bottom to top)
      const verticalPosition = index * params.verticalSpacing;

      // Horizontal alignment
      let justifyContent = 'center';
      if (params.position === 'left') justifyContent = 'flex-start';
      if (params.position === 'right') justifyContent = 'flex-end';

      // Effects array
      const effects: any[] = [];

      // 1. Rise animation with custom acceleration curve
      effects.push({
        id: `rise-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.riseDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: [
            { key: 'translateY', val: params.riseDistance, prog: 0 },
            {
              key: 'translateY',
              val: params.riseDistance * 0.8,
              prog: 0.2,
            },
            {
              key: 'translateY',
              val: params.riseDistance * 0.5,
              prog: 0.5,
            },
            {
              key: 'translateY',
              val: params.riseDistance * 0.2,
              prog: 0.8,
            },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 2. Oscillation effect after rise
      effects.push({
        id: `oscillation-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: params.riseDuration,
          duration: params.oscillationDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: createOscillationRanges(params.oscillationCycles, -10),
        } as GenericEffectData,
      });

      // 3. ScaleX distortion (refractive quality)
      const phaseOffset = index * 0.3; // Random phase offset
      effects.push({
        id: `scale-distortion-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.riseDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: [
            {
              key: 'scaleX',
              val: 1 + params.scaleDistortionIntensity,
              prog: 0,
            },
            {
              key: 'scaleX',
              val: 1 - params.scaleDistortionIntensity,
              prog: 0.25 + phaseOffset * 0.1,
            },
            {
              key: 'scaleX',
              val: 1 + params.scaleDistortionIntensity * 0.5,
              prog: 0.5 + phaseOffset * 0.1,
            },
            {
              key: 'scaleX',
              val: 1 - params.scaleDistortionIntensity * 0.5,
              prog: 0.75 + phaseOffset * 0.1,
            },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 4. Blur transition
      effects.push({
        id: `blur-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.riseDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: [
            { key: 'blur', val: params.blurAmount, prog: 0 },
            { key: 'blur', val: params.blurAmount * 0.5, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 5. Opacity transition (depth simulation)
      effects.push({
        id: `opacity-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.riseDuration,
          mode: 'provider',
          targetIds: [lineId],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 0.85, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 6. Ripple effects from lines passing through
      // Add ripples for each subsequent line that passes through this position
      for (let j = index + 1; j < captions.length; j++) {
        const otherLineStartTime = j * params.staggerDelay;
        const passTime =
          otherLineStartTime + params.riseDuration * 0.6; // When other line is about 60% risen

        effects.push(createRippleEffect(lineId, passTime - startTime, index));
      }

      // Create text atom
      const textAtomData: TextAtomData = {
        text: caption.text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          ...fontStyle,
          textAlign: params.position,
          willChange: 'transform, filter',
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      };

      return {
        id: lineId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full',
            style: {
              bottom: `${verticalPosition}px`,
              display: 'flex',
              justifyContent: justifyContent,
              willChange: 'transform, filter',
            },
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: totalDuration,
          },
        },
        childrenData: [
          {
            id: `text-${lineId}`,
            type: 'atom',
            componentId: 'TextAtom',
            data: textAtomData,
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: effects,
      } as RenderableComponentData;
    },
  );

  // Calculate total duration
  const lastCaptionIndex = captions.length - 1;
  const totalDuration =
    lastCaptionIndex * params.staggerDelay +
    params.riseDuration +
    params.oscillationDuration +
    10;

  // Root container with gradient background
  const rootContainer = {
    id: 'fluid-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative h-full bg-gradient-to-b from-blue-50 to-blue-100 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: textLineComponents,
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
  id: 'fluid-typography-bubble-rise',
  title: 'Fluid Typography Bubble Rise',
  description:
    'Water-inspired typography preset where text lines rise like air bubbles through liquid with acceleration, oscillation, refractive distortion, blur transitions, color depth shifts, and ripple displacement effects on existing lines.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'fluid',
    'water',
    'bubble',
    'physics',
    'animation',
    'captions',
    'kinetic',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Rising like bubbles',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [],
      },
      {
        id: 'caption-2',
        text: 'Through liquid depths',
        start: 0,
        absoluteStart: 3,
        end: 3,
        absoluteEnd: 6,
        duration: 3,
        words: [],
      },
      {
        id: 'caption-3',
        text: 'With gentle motion',
        start: 0,
        absoluteStart: 6,
        end: 3,
        absoluteEnd: 9,
        duration: 3,
        words: [],
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#1e3a8a',
    finalTextColor: '#1f2937',
    riseDistance: 500,
    riseDuration: 2,
    oscillationDuration: 1,
    oscillationCycles: 2.5,
    scaleDistortionIntensity: 0.02,
    blurAmount: 2,
    rippleIntensity: 10,
    staggerDelay: 0.5,
    verticalSpacing: 80,
    position: 'center',
  },
  dependencies: {},
};

// Export preset
export const fluidTypographyBubbleRisePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
