/**
 * Liquid Text Melt Preset
 *
 * This preset creates an organic liquid text effect where words maintain their form briefly
 * then melt and drip downward like wax or heavy oil. The animation uses multi-phase transitions
 * with vertical stretching, opacity fading, and individual drip elements that simulate viscosity.
 *
 * Features:
 * - **Multi-Phase Animation**: Stable micro-vibrations → vertical stretch → accelerated fall
 * - **Viscosity Simulation**: Drip elements with staggered timing and varying heights
 * - **Surface Tension Effects**: Slight elastic behavior before final liquefaction
 * - **Pure CSS Transforms**: Uses scaleY, translateY, and opacity (no SVG filters for performance)
 * - **Heavy Font Weight**: Uses Oswald 700 for better distortion visibility
 * - **Gooey Effect**: Filter blur combined with contrast for liquid appearance
 *
 * Use cases:
 * - Horror movie titles and trailers
 * - Artistic video projects requiring organic, unsettling movement
 * - Music videos with dark or experimental themes
 * - Transition effects that suggest decay or transformation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to display and melt'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the liquid melt effect in seconds'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the melting text'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text and drips (hex or CSS color)'),
  font: z
    .string()
    .default('Oswald:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Oswald:700", "Inter:600")',
    ),
  dripCount: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of drip elements to create'),
  viscosityVariation: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Multiplier for drip height variation (higher = more varied drips)',
    ),
  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Intensity multiplier for the overall melting effect (higher = more dramatic)',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    font,
    dripCount,
    viscosityVariation,
    impact,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font || 'Oswald:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 700;

  // Component IDs
  const rootContainerId = 'liquid-text-root-container';
  const mainTextContainerId = 'liquid-text-main-container';
  const mainTextId = 'liquid-text-main';
  const dripsContainerId = 'liquid-text-drips-container';

  // Phase timings (relative to duration)
  const phase1End = duration * 0.4; // Stable with micro-vibrations
  const phase2End = duration * 0.7; // Vertical stretch
  const phase3End = duration; // Accelerated fall

  // Create main text effect: multi-phase animation
  const textEffects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  // Phase 1 (0-40%): Stable with micro-vibrations
  textEffects.push({
    id: `${mainTextId}-phase1`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: phase1End,
      mode: 'provider',
      targetIds: [mainTextContainerId],
      ranges: [
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 1.02, prog: 0.25 },
        { key: 'scaleY', val: 1, prog: 0.5 },
        { key: 'scaleY', val: 1.02, prog: 0.75 },
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    },
  });

  // Phase 2 (40-70%): Vertical stretch with gravity
  const phase2Start = phase1End;
  const phase2Duration = phase2End - phase1End;
  textEffects.push({
    id: `${mainTextId}-phase2`,
    componentId: 'generic',
    data: {
      type: 'spring',
      start: phase2Start,
      duration: phase2Duration,
      mode: 'provider',
      targetIds: [mainTextContainerId],
      ranges: [
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 1.5 * impact, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 50 * impact, prog: 1 },
      ],
    },
  });

  // Phase 3 (70-100%): Accelerated fall with opacity fade
  const phase3Start = phase2End;
  const phase3Duration = phase3End - phase2End;
  textEffects.push({
    id: `${mainTextId}-phase3`,
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: phase3Start,
      duration: phase3Duration,
      mode: 'provider',
      targetIds: [mainTextContainerId],
      ranges: [
        { key: 'scaleY', val: 1.5 * impact, prog: 0 },
        { key: 'scaleY', val: 3.5 * impact, prog: 1 },
        { key: 'translateY', val: 50 * impact, prog: 0 },
        { key: 'translateY', val: 300 * impact, prog: 1 },
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });

  // Main text component
  const mainTextComponent: RenderableComponentData = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center',
        filter: 'blur(0.5px) contrast(20) blur(0.5px)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Main text container (receives effects)
  const mainTextContainer: RenderableComponentData = {
    id: mainTextContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          transformOrigin: 'center top',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: textEffects,
    childrenData: [mainTextComponent],
  };

  // Create drip elements
  const dripComponents: RenderableComponentData[] = [];
  const dripStartTime = phase1End; // Drips start when melting begins
  const dripDuration = duration - dripStartTime;

  for (let i = 0; i < dripCount; i++) {
    const dripId = `liquid-drip-${i}`;
    const dripWidth = 6 + Math.random() * 8; // Random width 6-14px
    const dripHeight = (50 + Math.random() * 100) * viscosityVariation; // Random height
    const dripLeft = 20 + Math.random() * 60; // Random horizontal position (20-80%)
    const dripDelay = (Math.random() * 0.15 * duration) / dripCount; // Staggered start
    const dripSpeed = 0.8 + Math.random() * 0.4; // Speed variation 0.8-1.2

    const dripEffect: {
      id: string;
      componentId: string;
      data: GenericEffectData;
    } = {
      id: `${dripId}-fall`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: dripDelay,
        duration: dripDuration * dripSpeed,
        mode: 'provider',
        targetIds: [dripId],
        ranges: [
          { key: 'scaleY', val: 0, prog: 0 },
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    const dripComponent: RenderableComponentData = {
      id: dripId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${dripWidth}px; height: ${dripHeight}px; background: ${textColor}; border-radius: 0 0 50% 50%; transform-origin: top center;"></div>`,
        className: 'absolute',
        style: {
          left: `${dripLeft}%`,
          top: '0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: dripDuration,
        },
      },
      effects: [dripEffect],
    };

    dripComponents.push(dripComponent);
  }

  // Drips container
  const dripsContainer: RenderableComponentData = {
    id: dripsContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          top: '55%',
        },
      },
    },
    context: {
      timing: {
        start: dripStartTime,
        duration: dripDuration,
      },
    },
    childrenData: dripComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: 'transparent',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mainTextContainer, dripsContainer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'liquidTextMelt',
  title: 'Liquid Text Melt',
  description:
    'Organic liquid text preset where words melt and drip downward like wax or heavy oil. Text maintains form briefly then liquefies, stretching vertically as it falls. Features multi-phase animation: stable micro-vibrations, vertical stretch with gravity, and accelerated fall with opacity fade. Includes drip elements with staggered timing for viscosity simulation. Suitable for horror titles or artistic projects requiring organic, unsettling movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'liquid',
    'melt',
    'drip',
    'horror',
    'artistic',
    'organic',
    'viscosity',
    'surface-tension',
    'transform',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID',
    duration: 5,
    fontSize: 120,
    textColor: '#FFFFFF',
    font: 'Oswald:700',
    dripCount: 5,
    viscosityVariation: 1,
    impact: 1,
  },
};

export const liquidTextMeltPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
