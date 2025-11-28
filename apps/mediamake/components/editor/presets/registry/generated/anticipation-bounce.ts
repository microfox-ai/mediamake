/**
 * Anticipation Bounce Title Animation Preset
 *
 * This preset creates a professional title animation with an anticipation-pullback mechanic,
 * elastic burst-and-settle behavior, dynamic glow effect with text-shadow during peak,
 * and brightness pulse. Creates organic, breathable motion using multi-phase cubic-bezier easing.
 *
 * Features:
 * - **Anticipation Phase**: Text shrinks to 0.9 scale (gathering energy)
 * - **Burst Phase**: Text explodes to 1.25 scale (overshoot)
 * - **Settle Phase**: Text oscillates through 0.95 → 1.05 → 1.0 (elastic settle)
 * - **Glow Effect**: Text-shadow animation from 0 to 30px during burst, settling to 8px
 * - **Brightness Pulse**: Filter brightness from 100% to 150% at peak
 * - **Performance**: Uses will-change: transform, filter for compositing layers
 *
 * Use cases:
 * - Professional video titles with organic motion
 * - Impact text reveals for key moments
 * - Breathable, energetic branding animations
 * - Modern title cards for content creators
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ===========================
// PARAMETER SCHEMA
// ===========================

const presetParams = z.object({
  text: z.string().describe('Title text to animate'),
  fontSize: z
    .string()
    .optional()
    .describe('Font size (e.g., "72px", "64px", "96px")'),
  fontWeight: z
    .string()
    .optional()
    .describe('Font weight (e.g., "700", "800", "bold")'),
  color: z
    .string()
    .optional()
    .describe('Text color (e.g., "#ffffff", "rgba(255,255,255,0.9)")'),
  fontFamily: z
    .string()
    .optional()
    .describe(
      'Font family name (e.g., "Inter", "Montserrat", "Roboto")',
    ),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .optional()
    .describe(
      'Total animation duration in seconds (default: 1.2s)',
    ),
});

// ===========================
// PRESET EXECUTION
// ===========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const fontSize = params.fontSize || '72px';
  const fontWeight = params.fontWeight || '700';
  const color = params.color || '#ffffff';
  const fontFamily = params.fontFamily || 'Inter';
  const duration = params.duration || 1.2;

  // Component IDs
  const titleContainerId = 'anticipation-bounce-container';
  const titleTextId = 'anticipation-bounce-text';

  // ===========================
  // TIMING CALCULATIONS (Relative)
  // ===========================

  const anticipationStart = 0;
  const anticipationDuration = 0.18; // 0-15% of 1.2s = 0.18s

  const burstStart = 0.18; // 15% of 1.2s
  const burstDuration = 0.3; // 15-40% = 25% = 0.3s

  const settleStart = 0.48; // 40% of 1.2s
  const settleDuration = 0.72; // 40-100% = 60% = 0.72s

  // Glow effect timing
  const glowBuildupStart = 0.18;
  const glowBuildupDuration = 0.15; // 18%-33%

  const glowFadeoutStart = 0.33;
  const glowFadeoutDuration = 0.25; // 33%-58%

  // Brightness pulse timing (matches glow)
  const brightnessPulseUpStart = 0.18;
  const brightnessPulseUpDuration = 0.15;

  const brightnessPulseDownStart = 0.33;
  const brightnessPulseDownDuration = 0.25;

  // ===========================
  // EFFECTS CONSTRUCTION
  // ===========================

  // ANTICIPATION SCALE (1 → 0.9)
  const anticipationScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: anticipationStart,
    duration: anticipationDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.9, prog: 1 },
    ],
  };

  // BURST SCALE (0.9 → 1.25)
  const burstScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: burstStart,
    duration: burstDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'scale', val: 0.9, prog: 0 },
      { key: 'scale', val: 1.25, prog: 1 },
    ],
  };

  // SETTLE SCALE (1.25 → 0.95 → 1.05 → 1.0)
  const settleScaleEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: settleStart,
    duration: settleDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'scale', val: 1.25, prog: 0 },
      { key: 'scale', val: 0.95, prog: 0.3 },
      { key: 'scale', val: 1.05, prog: 0.6 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // GLOW BUILDUP (0px transparent → 30px rgba(255,255,255,0.8))
  const glowBuildupEffect: GenericEffectData = {
    type: 'ease-in',
    start: glowBuildupStart,
    duration: glowBuildupDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'textShadow', val: '0 0 0px transparent', prog: 0 },
      { key: 'textShadow', val: '0 0 30px rgba(255,255,255,0.8)', prog: 1 },
    ],
  };

  // GLOW FADEOUT (30px → 8px rgba(255,255,255,0.3))
  const glowFadeoutEffect: GenericEffectData = {
    type: 'ease-out',
    start: glowFadeoutStart,
    duration: glowFadeoutDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'textShadow', val: '0 0 30px rgba(255,255,255,0.8)', prog: 0 },
      { key: 'textShadow', val: '0 0 8px rgba(255,255,255,0.3)', prog: 1 },
    ],
  };

  // BRIGHTNESS PULSE UP (100% → 150%)
  const brightnessPulseUpEffect: GenericEffectData = {
    type: 'ease-in',
    start: brightnessPulseUpStart,
    duration: brightnessPulseUpDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'filter:brightness', val: 1, prog: 0 },
      { key: 'filter:brightness', val: 1.5, prog: 1 },
    ],
  };

  // BRIGHTNESS PULSE DOWN (150% → 100%)
  const brightnessPulseDownEffect: GenericEffectData = {
    type: 'ease-out',
    start: brightnessPulseDownStart,
    duration: brightnessPulseDownDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'filter:brightness', val: 1.5, prog: 0 },
      { key: 'filter:brightness', val: 1, prog: 1 },
    ],
  };

  // ===========================
  // COMPONENT STRUCTURE
  // ===========================

  const titleTextComponent: RenderableComponentData = {
    id: titleTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        textAlign: 'center',
        lineHeight: '1.2',
        willChange: 'transform, filter', // Performance optimization
      },
      font: {
        family: fontFamily,
        weights: ['700', '800'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'anticipation-scale',
        componentId: 'generic',
        data: anticipationScaleEffect,
      },
      {
        id: 'burst-scale',
        componentId: 'generic',
        data: burstScaleEffect,
      },
      {
        id: 'settle-scale',
        componentId: 'generic',
        data: settleScaleEffect,
      },
      {
        id: 'glow-buildup',
        componentId: 'generic',
        data: glowBuildupEffect,
      },
      {
        id: 'glow-fadeout',
        componentId: 'generic',
        data: glowFadeoutEffect,
      },
      {
        id: 'brightness-pulse-up',
        componentId: 'generic',
        data: brightnessPulseUpEffect,
      },
      {
        id: 'brightness-pulse-down',
        componentId: 'generic',
        data: brightnessPulseDownEffect,
      },
    ],
  };

  const titleContainer: RenderableComponentData = {
    id: titleContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [titleTextComponent] as RenderableComponentData[],
  };

  // ===========================
  // OUTPUT
  // ===========================

  return {
    output: {
      childrenData: [titleContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ===========================
// METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'anticipation-bounce',
  title: 'Anticipation Bounce Title Animation',
  description:
    'Professional title animation with anticipation-pullback mechanic (scale 0.9), elastic burst-and-settle behavior (scale 1.25 overshoot), dynamic glow effect with text-shadow during peak, and brightness pulse. Creates organic, breathable motion using multi-phase cubic-bezier easing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'text',
    'animation',
    'anticipation',
    'bounce',
    'elastic',
    'glow',
    'brightness',
    'professional',
    'kinetic',
    'organic',
    'burst',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Welcome',
    fontSize: '72px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter',
    duration: 1.2,
  },
};

// ===========================
// EXPORT
// ===========================

export const anticipationBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
