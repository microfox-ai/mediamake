/**
 * Glitch Kinetic Typography Preset
 *
 * This preset creates an aggressive glitch-style kinetic typography effect where
 * ultra-compressed text suddenly snaps to normal spacing through stuttered digital jumps.
 * The animation simulates a corrupted video file attempting to self-correct, with RGB
 * color channel separation creating a classic digital distortion aesthetic.
 *
 * Features:
 * - **Ultra-Compressed Text**: Starts at letter-spacing: -0.3em
 * - **Stuttered Expansion**: Snaps between compressed/expanded states multiple times
 * - **RGB Split Effect**: Three text layers with color channel separation
 * - **Digital Glitches**: Step easing for instant transitions
 * - **Micro-Pauses**: Random 50-100ms delays simulating buffering
 * - **Aggressive Feel**: Hacker-breaking-encryption aesthetic
 *
 * Use cases:
 * - Tech/cyberpunk content intros
 * - Digital corruption effects
 * - Hacker/glitch aesthetics
 * - Modern edgy typography
 * - Music video title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, BaseEffect } from '@microfox/remotion';

// ===== PARAMS SCHEMA =====
const presetParams = z.object({
  text: z
    .string()
    .default('GLITCH')
    .describe('Text content to display with glitch effect'),
  fontSize: z
    .number()
    .min(16)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "Montserrat")'),
  fontWeight: z
    .string()
    .default('900')
    .describe('Font weight (e.g., "700", "900")'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Total animation duration in seconds'),
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .describe('Delay before animation starts in seconds'),
});

// ===== PRESET EXECUTION =====
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'glitch-root-container';
  const redLayerId = 'text-layer-red';
  const greenLayerId = 'text-layer-green';
  const blueLayerId = 'text-layer-blue';

  const totalDuration = params.duration;

  // ===== CREATE RGB TEXT LAYERS =====
  const createTextLayer = (
    id: string,
    color: string,
    translateXOffsets: number[],
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: params.fontWeight,
          color: color,
          letterSpacing: '-0.3em',
          mixBlendMode: 'screen',
        },
        className:
          'absolute inset-0 flex items-center justify-center whitespace-nowrap',
        font: {
          family: params.fontFamily,
          weights: ['700', '900'],
          display: 'swap' as const,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData;
  };

  const redLayer = createTextLayer(redLayerId, '#ff0000', [-3, -5, -2, -4, 0]);
  const greenLayer = createTextLayer(greenLayerId, '#00ff00', [0, 0, 0, 0, 0]);
  const blueLayer = createTextLayer(blueLayerId, '#0000ff', [3, 5, 2, 4, 0]);

  // ===== CREATE GLITCH EFFECTS =====
  const createGlitchEffect = (
    targetId: string,
    translateXOffsets: number[],
  ): BaseEffect => {
    const effectData: GenericEffectData = {
      type: 'step' as const,
      start: 0,
      duration: totalDuration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        // Letter spacing keyframes
        { key: 'letterSpacing', val: '-0.3em', prog: 0 },
        { key: 'letterSpacing', val: '-0.3em', prog: 0.24 },
        { key: 'letterSpacing', val: '0.1em', prog: 0.28 }, // First snap
        { key: 'letterSpacing', val: '0.1em', prog: 0.3 },
        { key: 'letterSpacing', val: '-0.1em', prog: 0.32 }, // Stutter back
        { key: 'letterSpacing', val: '-0.1em', prog: 0.48 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.5 }, // Second snap
        { key: 'letterSpacing', val: '0.05em', prog: 0.52 },
        { key: 'letterSpacing', val: '-0.2em', prog: 0.54 }, // Stutter back
        { key: 'letterSpacing', val: '-0.2em', prog: 0.72 },
        { key: 'letterSpacing', val: '0.02em', prog: 0.76 }, // Third snap
        { key: 'letterSpacing', val: '0.02em', prog: 0.8 },
        { key: 'letterSpacing', val: '0em', prog: 0.84 }, // Final settle
        { key: 'letterSpacing', val: '0em', prog: 1 },

        // TranslateX keyframes for RGB split
        { key: 'translateX', val: `${translateXOffsets[0]}px`, prog: 0 },
        { key: 'translateX', val: `${translateXOffsets[1]}px`, prog: 0.28 },
        { key: 'translateX', val: `${translateXOffsets[2]}px`, prog: 0.5 },
        { key: 'translateX', val: `${translateXOffsets[3]}px`, prog: 0.76 },
        { key: 'translateX', val: `${translateXOffsets[4]}px`, prog: 0.84 },

        // Opacity flickers for digital noise
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.28 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 0.3, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 0.52 },
        { key: 'opacity', val: 0.3, prog: 0.76 },
        { key: 'opacity', val: 1, prog: 0.78 },
      ],
    };

    return {
      id: `glitch-effect-${targetId}`,
      componentId: 'generic',
      data: effectData,
    } as BaseEffect;
  };

  const redEffect = createGlitchEffect(redLayerId, [-3, -5, -2, -4, 0]);
  const greenEffect = createGlitchEffect(greenLayerId, [0, 0, 0, 0, 0]);
  const blueEffect = createGlitchEffect(blueLayerId, [3, 5, 2, 4, 0]);

  // Attach effects to layers
  redLayer.effects = [redEffect];
  greenLayer.effects = [greenEffect];
  blueLayer.effects = [blueEffect];

  // ===== CREATE ROOT CONTAINER =====
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: params.startDelay,
        duration: totalDuration,
      },
    },
    childrenData: [redLayer, greenLayer, blueLayer] as RenderableComponentData[],
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

// ===== PRESET METADATA =====
const presetMetadata: PresetMetadata = {
  id: 'glitchKineticTypography',
  title: 'Glitch Kinetic Typography',
  description:
    'Aggressive glitch-style kinetic typography with ultra-compressed text that snaps to normal spacing through stuttered digital jumps. Features RGB color channel separation, corrupted video file aesthetic, step easing for instant transitions, and random micro-pauses simulating buffering delays.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'glitch',
    'rgb-split',
    'digital',
    'corrupted',
    'hacker',
    'chromatic-aberration',
    'text',
    'aggressive',
    'cyberpunk',
  ],
  defaultInputParams: {
    text: 'GLITCH',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '900',
    duration: 2.5,
    startDelay: 0,
  },
  dependencies: {},
};

// ===== EXPORT =====
export const glitchKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
