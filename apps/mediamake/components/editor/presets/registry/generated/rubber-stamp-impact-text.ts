/**
 * Rubber Stamp Impact Text Preset
 *
 * A bold typokinetic preset where text stamps down with an impactful drop shadow
 * that bounces and settles like a rubber stamp. Features aggressive entrance with
 * scale bounce (1.3 → 0.95 → 1.0), translateY movement (-100px → 10px → 0), shadow
 * compression/expansion shockwave, screen shake at impact moment, and residual
 * vibration. Perfect for emphatic statements, call-to-action text, or any caption
 * that needs to command attention.
 *
 * Features:
 * - **Aggressive Entrance**: Text scales and drops down with bounce physics
 * - **Shadow Shockwave**: Multi-layer shadow animates with compression/expansion
 * - **Screen Shake**: Container shake effect at impact moment (±4px random)
 * - **Aftershock Vibration**: Residual scale oscillation after impact
 * - **Bouncy Physics**: Custom cubic-bezier(0.68, -0.6, 0.32, 1.6) timing
 * - **GPU Acceleration**: Transform-gpu for smooth high frame rate animation
 *
 * Use cases:
 * - Emphatic statements and exclamations
 * - Call-to-action text overlays
 * - Impact titles and headers
 * - Attention-commanding captions
 * - Dynamic text reveals with weight and presence
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- PARAMS SCHEMA ---

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with stamp impact effect'),
  
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(80)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter:900')
    .describe('Font family with optional weight and style (e.g., "Inter:900", "Roboto:700:italic")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Total duration of the stamp effect animation in seconds'),
  
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  
  impactIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for impact effects (0.5 = subtle, 2 = extreme)'),
  
  shadowColor: z
    .string()
    .default('rgba(0,0,0,0.6)')
    .describe('Shadow color for impact effect'),
  
  transformOrigin: z
    .enum(['center bottom', 'center center', 'center top'])
    .default('center bottom')
    .describe('Transform origin for the stamp animation'),
});

// --- EXECUTION FUNCTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
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

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);
  const impact = params.impactIntensity;

  // IDs
  const containerId = 'rubber-stamp-container';
  const textNodeId = 'stamp-text-node';

  // Effect timing configuration
  const entranceDuration = 0.6 * impact;
  const shakeStart = entranceDuration * 0.75;
  const shakeDuration = 0.15;
  const aftershockStart = entranceDuration;
  const aftershockDuration = 0.5;

  // --- STAMP ENTRANCE EFFECT (Scale + TranslateY with bounce) ---
  const stampEntranceEffect: RenderableComponentData = {
    id: 'stamp-entrance-effect',
    componentId: 'generic',
    type: 'effect' as const,
    data: {
      type: 'cubic-bezier',
      easingParams: [0.68, -0.6, 0.32, 1.6],
      start: 0,
      duration: entranceDuration,
      mode: 'provider',
      targetIds: [textNodeId],
      ranges: [
        // Scale: 1.3 → 0.95 → 1.0
        { key: 'scale', val: 1.3, prog: 0 },
        { key: 'scale', val: 0.95, prog: 0.5 },
        { key: 'scale', val: 1.0, prog: 1 },
        // TranslateY: -100px → 10px → 0
        { key: 'translateY', val: -100 * impact, prog: 0 },
        { key: 'translateY', val: 10 * impact, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- SHADOW IMPACT EFFECT (Multi-layer shadow compression/expansion) ---
  const shadowImpactEffect: RenderableComponentData = {
    id: 'shadow-impact-effect',
    componentId: 'generic',
    type: 'effect' as const,
    data: {
      type: 'cubic-bezier',
      easingParams: [0.68, -0.6, 0.32, 1.6],
      start: 0,
      duration: entranceDuration,
      mode: 'provider',
      targetIds: [textNodeId],
      ranges: [
        // Shadow: 2px blur/offset → 12px blur/offset (impact) → 6px blur/offset (settle)
        {
          key: 'textShadow',
          val: `0px ${2 * impact}px ${4 * impact}px ${params.shadowColor}`,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0px ${12 * impact}px ${20 * impact}px rgba(0,0,0,${0.6 * impact})`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: `0px ${6 * impact}px ${8 * impact}px rgba(0,0,0,${0.4 * impact})`,
          prog: 1,
        },
      ],
    } as GenericEffectData,
  };

  // --- CONTAINER SHAKE EFFECT (Screen shake at impact moment) ---
  const containerShakeEffect: RenderableComponentData = {
    id: 'container-shake-effect',
    componentId: 'generic',
    type: 'effect' as const,
    data: {
      type: 'linear',
      start: shakeStart,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [containerId],
      ranges: [
        // TranslateX shake: 0 → 4 → -3 → 2 → -1 → 0
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 4 * impact, prog: 0.2 },
        { key: 'translateX', val: -3 * impact, prog: 0.4 },
        { key: 'translateX', val: 2 * impact, prog: 0.6 },
        { key: 'translateX', val: -1 * impact, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 1 },
        // TranslateY shake: 0 → -3 → 2 → -1 → 0
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -3 * impact, prog: 0.25 },
        { key: 'translateY', val: 2 * impact, prog: 0.5 },
        { key: 'translateY', val: -1 * impact, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- AFTERSHOCK VIBRATION EFFECT (Residual scale oscillation) ---
  const aftershockVibrationEffect: RenderableComponentData = {
    id: 'aftershock-vibration-effect',
    componentId: 'generic',
    type: 'effect' as const,
    data: {
      type: 'ease-out',
      start: aftershockStart,
      duration: aftershockDuration,
      mode: 'provider',
      targetIds: [textNodeId],
      ranges: [
        // Scale oscillation: 1 → 1.02 → 0.995 → 1.008 → 0.998 → 1
        { key: 'scale', val: 1.0, prog: 0 },
        { key: 'scale', val: 1.02 * impact, prog: 0.15 },
        { key: 'scale', val: 0.995, prog: 0.35 },
        { key: 'scale', val: 1.008 * impact, prog: 0.55 },
        { key: 'scale', val: 0.998, prog: 0.75 },
        { key: 'scale', val: 1.0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- SETTLE PHASE EFFECT (Final stabilization) ---
  const settlePhaseEffect: RenderableComponentData = {
    id: 'settle-phase-effect',
    componentId: 'generic',
    type: 'effect' as const,
    data: {
      type: 'ease-out',
      start: aftershockStart + aftershockDuration,
      duration: 0.4,
      mode: 'provider',
      targetIds: [textNodeId],
      ranges: [
        { key: 'scale', val: 1.0, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // --- TEXT ATOM ---
  const textNode: RenderableComponentData = {
    id: textNodeId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontStyle.fontWeight || 900,
        fontStyle: fontStyle.fontStyle,
        color: params.textColor,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      stampEntranceEffect,
      shadowImpactEffect,
      aftershockVibrationEffect,
      settlePhaseEffect,
    ],
  };

  // --- ROOT CONTAINER ---
  const rootContainer: RenderableComponentData = {
    id: containerId,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          transformOrigin: params.transformOrigin,
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.duration,
      },
    },
    childrenData: [textNode],
    effects: [containerShakeEffect],
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

// --- METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'rubber-stamp-impact-text',
  title: 'Rubber Stamp Impact Text',
  description:
    'Bold typokinetic preset where text stamps down with impactful drop shadow that bounces and settles like a rubber stamp. Features aggressive entrance with scale bounce, shadow compression/expansion shockwave, screen shake, and residual vibration. Perfect for emphatic statements and call-to-action text.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'kinetic',
    'impact',
    'stamp',
    'bounce',
    'shadow',
    'shake',
    'emphasis',
    'call-to-action',
  ],
  defaultInputParams: {
    text: 'BOOM!',
    fontSize: 80,
    fontFamily: 'Inter:900',
    textColor: '#FFFFFF',
    duration: 2,
    startTime: 0,
    impactIntensity: 1,
    shadowColor: 'rgba(0,0,0,0.6)',
    transformOrigin: 'center bottom',
  },
  dependencies: {},
};

// --- EXPORT ---

export const rubberStampImpactTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
