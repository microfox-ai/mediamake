/**
 * Typokinetics Slow-Motion Cinematography Preset
 *
 * This preset creates hyper-detailed 6-phase character animations inspired by high-speed cinematography.
 * Each character emerges with exaggerated momentum through emergence, acceleration, overshoot, correction,
 * settle, and micro-adjustment phases. Features motion blur, lagging rotation, and 240fps-style slow-motion
 * detail revealing the physics of text movement.
 *
 * Features:
 * - **6-Phase Animation System**: Emergence, acceleration, overshoot, correction, settle, micro-adjustments
 * - **Hyper-Detailed Motion**: Each phase clearly visible as if shot at 240fps and played back in slow motion
 * - **Motion Blur**: Applied during fast movement phases for cinematic realism
 * - **Lagging Rotation**: Rotation lags behind vertical movement by 0.1s for realistic physics
 * - **Significant Mass & Momentum**: Characters feel weighty with detailed acceleration/deceleration
 * - **Character Stagger**: 0.2s delay between characters for sequential visibility
 * - **GPU-Optimized**: Uses transform-gpu and will-change-transform for smooth performance
 *
 * Use cases:
 * - High-impact title sequences with cinematic slow-motion feel
 * - Revealing text that emphasizes the physics of motion
 * - Dramatic typography animations for trailers or promos
 * - Creating a sense of weight and momentum in text animations
 * - Showcasing the usually-invisible details of character movement
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to animate with slow-motion cinematography'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto:700", "BebasNeue:600")'),
  textColor: z.string().default('#ffffff').describe('Text color'),
  duration: z
    .number()
    .min(3)
    .max(6)
    .default(4)
    .describe('Duration per character animation sequence (3-4s recommended)'),
  stagger: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Delay between characters in seconds'),
  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Overall intensity multiplier for effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into characters
  const characters = params.text.split('');

  // Calculate total duration including stagger
  const totalDuration =
    params.duration + params.stagger * (characters.length - 1);

  // Create character components with 6-phase animations
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `slowmo-char-${index}`;
      const charStart = index * params.stagger;

      // 6-Phase animation ranges
      // Phase 1 (0-15%): Emergence with scale (0 to 0.5) and opacity (0 to 0.3)
      // Phase 2 (15-40%): Acceleration with translateY (-50px to 10px) ease-in
      // Phase 3 (40-60%): Overshoot with translateY (10px to -5px) and scale (1.0 to 1.1)
      // Phase 4 (60-75%): Correction with translateY (-5px to 2px)
      // Phase 5 (75-90%): Settle with translateY (2px to 0px) ease-out
      // Phase 6 (90-100%): Micro-adjustments with translateY (±0.5px) oscillation

      const ranges: Array<{ key: string; val: any; prog: number }> = [
        // Phase 1: Emergence (0-15%)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.15 },
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 0.5, prog: 0.15 },

        // Phase 2: Acceleration (15-40%)
        { key: 'translateY', val: -50 * params.impact, prog: 0.15 },
        { key: 'translateY', val: 10 * params.impact, prog: 0.4 },
        { key: 'opacity', val: 0.5, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'scale', val: 0.5, prog: 0.15 },
        { key: 'scale', val: 1.0, prog: 0.4 },

        // Add motion blur during fast movement (Phase 2)
        { key: 'filter', val: 'blur(0px)', prog: 0.15 },
        { key: 'filter', val: `blur(${3 * params.impact}px)`, prog: 0.27 },
        { key: 'filter', val: 'blur(0px)', prog: 0.4 },

        // Phase 3: Overshoot (40-60%)
        { key: 'translateY', val: 10 * params.impact, prog: 0.4 },
        { key: 'translateY', val: -5 * params.impact, prog: 0.6 },
        { key: 'scale', val: 1.0, prog: 0.4 },
        { key: 'scale', val: 1.1, prog: 0.6 },

        // Phase 4: Correction (60-75%)
        { key: 'translateY', val: -5 * params.impact, prog: 0.6 },
        { key: 'translateY', val: 2 * params.impact, prog: 0.75 },
        { key: 'scale', val: 1.1, prog: 0.6 },
        { key: 'scale', val: 1.0, prog: 0.75 },

        // Phase 5: Settle (75-90%)
        { key: 'translateY', val: 2 * params.impact, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 0.9 },

        // Phase 6: Micro-adjustments (90-100%)
        { key: 'translateY', val: 0, prog: 0.9 },
        { key: 'translateY', val: 0.5 * params.impact, prog: 0.93 },
        { key: 'translateY', val: -0.3 * params.impact, prog: 0.96 },
        { key: 'translateY', val: 0, prog: 1 },

        // Lagging rotation (lags behind vertical movement by 0.1s relative progress)
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 0, prog: 0.2 }, // Rotation starts late
        { key: 'rotate', val: -3 * params.impact, prog: 0.35 },
        { key: 'rotate', val: 2 * params.impact, prog: 0.5 },
        { key: 'rotate', val: -1 * params.impact, prog: 0.65 },
        { key: 'rotate', val: 0.5 * params.impact, prog: 0.8 },
        { key: 'rotate', val: 0, prog: 0.95 },
      ];

      // Create 6-phase animation effect
      const charEffect: GenericEffectData = {
        type: 'linear', // Linear to show precise keyframe control
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [charId],
        ranges,
      };

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
          style: {
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight || 700,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
          className: 'transform-gpu will-change-transform transition-none',
        },
        context: {
          timing: {
            start: charStart,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `slowmo-effect-${index}`,
            componentId: 'generic',
            data: charEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'slowmo-cinematic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'slowmo-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-row items-center justify-center',
            style: {
              gap: '0.05em', // Tight character spacing
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-slowmo-cinematic',
  title: 'Typokinetics Slow-Motion Cinematography',
  description:
    'Hyper-detailed 6-phase character animation preset inspired by high-speed cinematography. Characters emerge with exaggerated momentum through emergence, acceleration, overshoot, correction, settle, and micro-adjustment phases. Features motion blur, lagging rotation, and 240fps-style slow-motion detail revealing the physics of text movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'slow-motion',
    'cinematography',
    '6-phase',
    'motion-blur',
    'physics',
    'momentum',
    'high-speed',
    'character-animation',
  ],
  defaultInputParams: {
    text: 'CINEMATIC',
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    duration: 4,
    stagger: 0.2,
    impact: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const typokineticsSlowmoCinematicPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
