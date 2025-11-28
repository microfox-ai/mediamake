/**
 * Glitch Disintegration Text Preset
 *
 * A digital decay effect where text shrinks in stuttering, glitchy steps while corrupting and fading.
 * Simulates damaged video footage where frames skip and digital artifacts appear.
 *
 * Features:
 * - Stepped scale animation: 100% → 85% → 60% → 30% → 0%
 * - RGB channel splits via text-shadow during pauses
 * - Position jitter (X/Y) between scale jumps
 * - Hue rotation for color glitches
 * - Opacity flicker between steps
 * - Abrupt signal-cutout ending
 *
 * Perfect for cyberpunk or tech-themed content with a digital corruption aesthetic.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ========== PRESET PARAMETERS ==========

const presetParams = z.object({
  text: z.string().describe('Text content to display and disintegrate'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the glitch disintegration effect in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the text'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or CSS color)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
});

// ========== PRESET EXECUTION ==========

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

  const textId = 'glitch-text';
  const rootContainerId = 'glitch-disintegration-container';

  // Scale steps: 100% → 85% → 60% → 30% → 0%
  // Timing: 0%, 25%, 50%, 75%, 95%, 100%
  const scaleEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Step 1: 100%
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1, prog: 0.25 },
      // Step 2: 85%
      { key: 'scale', val: 0.85, prog: 0.25 },
      { key: 'scale', val: 0.85, prog: 0.5 },
      // Step 3: 60%
      { key: 'scale', val: 0.6, prog: 0.5 },
      { key: 'scale', val: 0.6, prog: 0.75 },
      // Step 4: 30%
      { key: 'scale', val: 0.3, prog: 0.75 },
      { key: 'scale', val: 0.3, prog: 0.95 },
      // Step 5: 0% (signal cutout)
      { key: 'scale', val: 0, prog: 1 },
    ],
  };

  // Opacity flicker: flicker between 0.7-1 during steps, hard cut to 0 at end
  const opacityEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: 0.85, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.05 },
      { key: 'opacity', val: 0.7, prog: 0.1 },
      { key: 'opacity', val: 1, prog: 0.15 },
      { key: 'opacity', val: 0.85, prog: 0.25 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 0.75, prog: 0.4 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: 0.8, prog: 0.6 },
      { key: 'opacity', val: 1, prog: 0.7 },
      { key: 'opacity', val: 0.85, prog: 0.85 },
      { key: 'opacity', val: 0.7, prog: 0.95 },
      // Hard cut to 0 (signal cutout)
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Position jitter X: random values between -2px and 2px
  const jitterXEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 2, prog: 0.05 },
      { key: 'translateX', val: -1, prog: 0.1 },
      { key: 'translateX', val: 0, prog: 0.15 },
      { key: 'translateX', val: -2, prog: 0.25 },
      { key: 'translateX', val: 1, prog: 0.3 },
      { key: 'translateX', val: 0, prog: 0.4 },
      { key: 'translateX', val: 2, prog: 0.5 },
      { key: 'translateX', val: -2, prog: 0.6 },
      { key: 'translateX', val: 1, prog: 0.7 },
      { key: 'translateX', val: 0, prog: 0.8 },
      { key: 'translateX', val: -1, prog: 0.9 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Position jitter Y: random values between -2px and 2px
  const jitterYEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -1, prog: 0.05 },
      { key: 'translateY', val: 2, prog: 0.1 },
      { key: 'translateY', val: 0, prog: 0.15 },
      { key: 'translateY', val: 1, prog: 0.25 },
      { key: 'translateY', val: -2, prog: 0.3 },
      { key: 'translateY', val: 0, prog: 0.4 },
      { key: 'translateY', val: -1, prog: 0.5 },
      { key: 'translateY', val: 2, prog: 0.6 },
      { key: 'translateY', val: 0, prog: 0.7 },
      { key: 'translateY', val: 1, prog: 0.8 },
      { key: 'translateY', val: -1, prog: 0.9 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Hue rotation for color glitch (random values)
  const hueRotateEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'filter:hue-rotate', val: 0, prog: 0 },
      { key: 'filter:hue-rotate', val: 15, prog: 0.1 },
      { key: 'filter:hue-rotate', val: 0, prog: 0.2 },
      { key: 'filter:hue-rotate', val: -20, prog: 0.35 },
      { key: 'filter:hue-rotate', val: 10, prog: 0.5 },
      { key: 'filter:hue-rotate', val: 0, prog: 0.6 },
      { key: 'filter:hue-rotate', val: 25, prog: 0.75 },
      { key: 'filter:hue-rotate', val: -15, prog: 0.9 },
      { key: 'filter:hue-rotate', val: 0, prog: 1 },
    ],
  };

  // Text component with RGB split text-shadow
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontStyle.fontWeight || 'bold',
        color: params.textColor,
        textAlign: 'center',
        // RGB channel split via text-shadow
        textShadow: '2px 0 #ff0000, -2px 0 #00ffff',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'scale-effect',
        componentId: 'generic',
        data: scaleEffect,
      },
      {
        id: 'opacity-effect',
        componentId: 'generic',
        data: opacityEffect,
      },
      {
        id: 'jitter-x-effect',
        componentId: 'generic',
        data: jitterXEffect,
      },
      {
        id: 'jitter-y-effect',
        componentId: 'generic',
        data: jitterYEffect,
      },
      {
        id: 'hue-rotate-effect',
        componentId: 'generic',
        data: hueRotateEffect,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textComponent] as RenderableComponentData[],
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

// ========== PRESET METADATA ==========

const presetMetadata: PresetMetadata = {
  id: 'glitch-disintegration-text',
  title: 'Glitch Disintegration Text',
  description:
    'Text shrinks in stuttering, glitchy steps (100% → 85% → 60% → 30% → 0%) with digital decay effects including RGB channel splits via text-shadow, position jitters, hue rotation, and opacity flickers between steps. Creates a cyberpunk digital corruption effect perfect for tech-themed content with an abrupt signal-cutout ending.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'disintegration',
    'cyberpunk',
    'tech',
    'corruption',
    'digital-decay',
    'rgb-split',
    'chromatic-aberration',
    'stuttering',
    'stepped-animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SYSTEM ERROR',
    duration: 3,
    fontSize: 72,
    textColor: '#ffffff',
    font: 'Inter:700',
  },
};

// ========== PRESET EXPORT ==========

export const glitchDisintegrationTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
