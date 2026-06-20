/**
 * Heartbeat EKG Typography Preset
 *
 * A typokinetic preset inspired by heartbeat monitors and EKG rhythms.
 * Text exhibits a double-pulse expansion pattern (lub-dub) with:
 * - Stronger first pulse (scale 1.15) followed by weaker second pulse (scale 1.08)
 * - Subtle red tint during pulses via hue-rotate filter
 * - Rotation wobble for organic movement
 * - Polyrhythmic offset for multi-line text (each line offset by 1.5s)
 *
 * Perfect for medical drama title sequences, health-related content, or
 * dramatic tension-building typography.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(3)
    .default(['HEARTBEAT', 'MONITOR', 'TEXT'])
    .describe('Array of text lines to display (1-3 lines)'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or CSS color)'),
  duration: z
    .number()
    .min(3)
    .max(60)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  lubPulseScale: z
    .number()
    .min(1.0)
    .max(1.5)
    .default(1.15)
    .describe('Scale multiplier for first pulse (lub)'),
  dubPulseScale: z
    .number()
    .min(1.0)
    .max(1.3)
    .default(1.08)
    .describe('Scale multiplier for second pulse (dub)'),
  rotationWobble: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Rotation wobble range in degrees'),
  hueRotateIntensity: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Hue rotation intensity for red tint (degrees)'),
  polyrhythmicOffset: z
    .number()
    .min(0)
    .max(3)
    .default(1.5)
    .describe('Time offset between lines in seconds for polyrhythmic effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontWeight = '700';
  if (fontString.includes(':')) {
    const parts = fontString.split(':');
    if (parts.length > 1) {
      fontWeight = parts[1];
    }
  }

  // Heartbeat cycle timing (3 seconds per cycle)
  const cycleTime = 3;

  // Create effect for each line with polyrhythmic offset
  const createHeartbeatEffect = (lineId: string, lineIndex: number) => {
    const offset = lineIndex * params.polyrhythmicOffset;

    // Effect data with complex heartbeat keyframes
    return {
      id: `heartbeat-effect-${lineId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [lineId],
        ranges: [
          // Rest state (0% - 10%)
          { key: 'scale', val: 1, prog: 0 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },

          // First pulse - LUB (10% - 15%)
          { key: 'scale', val: params.lubPulseScale, prog: 0.1 + offset / params.duration },
          { key: 'rotate', val: params.rotationWobble, prog: 0.1 + offset / params.duration },
          {
            key: 'filter',
            val: `hue-rotate(-${params.hueRotateIntensity}deg)`,
            prog: 0.1 + offset / params.duration,
          },

          // Return to rest after LUB (15% - 20%)
          { key: 'scale', val: 1, prog: 0.15 + offset / params.duration },
          { key: 'rotate', val: 0, prog: 0.15 + offset / params.duration },
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0.15 + offset / params.duration },

          // Second pulse - DUB (20% - 25%)
          { key: 'scale', val: params.dubPulseScale, prog: 0.2 + offset / params.duration },
          { key: 'rotate', val: -params.rotationWobble, prog: 0.2 + offset / params.duration },
          {
            key: 'filter',
            val: `hue-rotate(-${params.hueRotateIntensity * 0.6}deg)`,
            prog: 0.2 + offset / params.duration,
          },

          // Return to rest after DUB (25% - 100%)
          { key: 'scale', val: 1, prog: 0.25 + offset / params.duration },
          { key: 'rotate', val: 0, prog: 0.25 + offset / params.duration },
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0.25 + offset / params.duration },

          // Long rest state until cycle repeats
          { key: 'scale', val: 1, prog: 1 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
        ],
      },
    };
  };

  // Create text line components with effects
  const lineComponents: RenderableComponentData[] = params.lines.map(
    (lineText, index) => {
      const lineId = `heartbeat-line-${index}`;

      return {
        id: `line-container-${index}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              transformOrigin: 'center',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [
          {
            id: lineId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: lineText,
              style: {
                fontSize: params.fontSize,
                fontWeight: fontWeight,
                color: params.textColor,
                transformOrigin: 'center',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [createHeartbeatEffect(lineId, index)],
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container with perspective and flex column layout
  const rootContainer: RenderableComponentData = {
    id: 'heartbeat-ekg-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-6',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: lineComponents,
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'heartbeat-ekg-typography',
  title: 'Heartbeat EKG Typography',
  description:
    'Typokinetic preset inspired by heartbeat monitors and EKG rhythms. Text exhibits a double-pulse expansion pattern (lub-dub) with a stronger first pulse (scale 1.15) followed by a weaker second pulse (scale 1.08), mimicking cardiac rhythm. Features subtle red tint during pulses via hue-rotate filter, rotation wobble for organic movement, and polyrhythmic offset for multi-line text where each line\'s heartbeat is offset by half a cycle (1.5s). Perfect for medical drama title sequences, health-related content, or dramatic tension-building typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'heartbeat',
    'ekg',
    'medical',
    'pulse',
    'rhythm',
    'dramatic',
    'organic',
    'polyrhythmic',
    'text',
    'title',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: ['HEARTBEAT', 'MONITOR', 'TEXT'],
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    duration: 10,
    lubPulseScale: 1.15,
    dubPulseScale: 1.08,
    rotationWobble: 1,
    hueRotateIntensity: 10,
    polyrhythmicOffset: 1.5,
  },
};

export const heartbeatEkgTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
