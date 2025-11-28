/**
 * News Ticker Typokinetic Preset
 *
 * A dynamic, high-energy kinetic typography preset that mimics breaking news tickers.
 * Text lines shoot up from the bottom with aggressive acceleration, stack tightly like
 * breaking news alerts, and feature impact effects (shake vibration) on arrival.
 *
 * Features:
 * - **Breaking News Aesthetic**: Black background with red accent borders
 * - **High-Energy Entry**: Fast ease-in translateY (100% → 0) in 0.3s
 * - **Impact Shake**: Rapid 3-frame oscillation (±5px translateX) on arrival
 * - **Red Glow Pulse**: 0.5s red text shadow that fades after entry
 * - **Tight Stacking**: Minimal spacing between lines for urgency
 * - **Instant Stack Repositioning**: Previous lines jump up immediately (no animation)
 * - **CNN Breaking News Energy**: Fast, attention-grabbing, slightly aggressive
 *
 * Use cases:
 * - Breaking news overlays
 * - Alert-style text reveals
 * - Urgent announcement graphics
 * - High-energy social media content
 * - News broadcast-style typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .describe(
      'Array of text lines to display as breaking news alerts (e.g., ["BREAKING: First alert", "UPDATE: Second alert"])',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(100)
    .default(28)
    .optional()
    .describe('Font size for text lines in pixels (default: 28px)'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:600")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (default: white)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color (default: black)'),
  borderColor: z
    .string()
    .default('#ef4444')
    .optional()
    .describe('Left border color for news ticker style (default: red)'),
  entryDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Duration of entry animation in seconds (default: 0.3s)'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(2)
    .default(0.15)
    .optional()
    .describe('Delay between each line entry in seconds (default: 0.15s)'),
  shakeIntensity: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .optional()
    .describe('Shake intensity in pixels (default: 5px)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Red glow intensity on arrival (0-1, default: 0.8)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 700;

  // Extract parameters
  const lines = params.lines;
  const fontSize = params.fontSize ?? 28;
  const textColor = params.textColor ?? '#ffffff';
  const backgroundColor = params.backgroundColor ?? '#000000';
  const borderColor = params.borderColor ?? '#ef4444';
  const entryDuration = params.entryDuration ?? 0.3;
  const staggerDelay = params.staggerDelay ?? 0.15;
  const shakeIntensity = params.shakeIntensity ?? 5;
  const glowIntensity = params.glowIntensity ?? 0.8;

  // Calculate total duration
  // Each line takes staggerDelay to start + entryDuration to enter + 0.1s shake + 0.5s glow
  const totalDuration =
    lines.length * staggerDelay + entryDuration + 0.1 + 0.5;

  // Build text lines with effects
  const textLineComponents: RenderableComponentData[] = [];
  const allEffects: any[] = [];

  lines.forEach((lineText, index) => {
    const lineId = `news-line-${index}`;
    const lineStart = index * staggerDelay;

    // Create text atom for this line
    const textAtom: RenderableComponentData = {
      id: lineId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: lineText,
        className: 'px-4 py-1 border-l-4',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          transformOrigin: 'bottom',
          borderLeftColor: borderColor,
          borderLeftWidth: '4px',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0, // All lines start at container start (already positioned by flex)
          duration: totalDuration, // All lines last for full duration
        },
      },
    };

    textLineComponents.push(textAtom);

    // Effect 1: Entry effect (translateY 100% → 0 with ease-in)
    const entryEffect = {
      id: `entry-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: lineStart, // Relative to container
        duration: entryDuration,
        mode: 'provider',
        targetIds: [lineId],
        ranges: [
          { key: 'translateY', val: 100, prog: 0, unit: '%' },
          { key: 'translateY', val: 0, prog: 1, unit: '%' },
        ],
      } as GenericEffectData,
    };

    // Effect 2: Shake effect (oscillation ±shakeIntensity px)
    const shakeDuration = 0.1;
    const shakeStart = lineStart + entryDuration;
    const shakeEffect = {
      id: `shake-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: shakeStart,
        duration: shakeDuration,
        mode: 'provider',
        targetIds: [lineId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0, unit: 'px' },
          { key: 'translateX', val: shakeIntensity, prog: 0.25, unit: 'px' },
          { key: 'translateX', val: -shakeIntensity, prog: 0.5, unit: 'px' },
          { key: 'translateX', val: shakeIntensity, prog: 0.75, unit: 'px' },
          { key: 'translateX', val: 0, prog: 1, unit: 'px' },
        ],
      } as GenericEffectData,
    };

    // Effect 3: Glow pulse (red text shadow fade)
    const glowDuration = 0.5;
    const glowStart = shakeStart;
    const glowEffect = {
      id: `glow-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: glowStart,
        duration: glowDuration,
        mode: 'provider',
        targetIds: [lineId],
        ranges: [
          {
            key: 'textShadow',
            val: `0 0 20px rgba(255,0,0,${glowIntensity})`,
            prog: 0,
          },
          {
            key: 'textShadow',
            val: '0 0 0px rgba(255,0,0,0)',
            prog: 1,
          },
        ],
      } as GenericEffectData,
    };

    allEffects.push(entryEffect, shakeEffect, glowEffect);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'news-ticker-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col justify-end items-stretch h-full',
        style: {
          backgroundColor: backgroundColor,
          gap: '2px', // Minimal spacing for urgency
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: allEffects,
    childrenData: textLineComponents,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'news-ticker-typokinetic',
  title: 'News Ticker Typokinetic',
  description:
    'Dynamic news ticker-style typokinetic preset with high-energy text lines shooting up from bottom, stacking tightly like breaking news alerts. Features acceleration entry (ease-in), impact shake vibration on arrival, red glow pulse effect, and instant stack repositioning for rapid-fire urgency.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'news',
    'ticker',
    'breaking',
    'alerts',
    'urgent',
    'cnn',
    'broadcast',
    'high-energy',
    'shake',
    'glow',
    'red',
    'acceleration',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: [
      'BREAKING: First news alert',
      'ALERT: Second breaking story',
      'UPDATE: Third urgent update',
    ],
    fontSize: 28,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    borderColor: '#ef4444',
    entryDuration: 0.3,
    staggerDelay: 0.15,
    shakeIntensity: 5,
    glowIntensity: 0.8,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const newsTickerTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
