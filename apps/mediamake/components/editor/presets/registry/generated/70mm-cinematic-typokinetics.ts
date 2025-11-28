/**
 * 70mm Cinematic Typokinetics Preset
 *
 * This preset emulates the grandeur of 70mm film presentations with sweeping panoramic text reveals.
 * Features include:
 * - Ultra-widescreen 2.39:1 aspect ratio container
 * - Anamorphic lens characteristics: horizontal stretch that snaps to correct proportions
 * - Curtain-parting rectangular mask reveal (horizontal expansion)
 * - Vintage light leaks: warm amber and cool blue tones bleeding from frame edges
 * - Gate weave: subtle jitter (±1px X, ±0.5px Y) for film camera authenticity
 * - Projection flicker: subtle opacity oscillation (0.95-1.0)
 * - Dimensional text with drop shadows for projection depth
 * - Floating dust motes for atmospheric depth
 * - Bold condensed typography (Oswald:700) for period-appropriate impact
 *
 * Use cases:
 * - Epic title sequences for premium content
 * - Vintage film aesthetic overlays
 * - Dramatic text reveals with cinematic flair
 * - Retro film projection simulations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, BaseEffect } from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('CINEMATIC')
    .describe('The text to display with 70mm cinematic effects'),
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(5)
    .describe('Total duration of the preset in seconds'),
  textColor: z
    .string()
    .default('#f5f5f5')
    .describe('Text color (hex or rgb)'),
  font: z
    .string()
    .default('Oswald:700')
    .optional()
    .describe('Font family with optional weight (e.g., "Oswald:700", "Anton:400")'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(120)
    .describe('Font size in pixels (responsive via clamp)'),
  anamorphicDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of the anamorphic unsqueeze animation in seconds'),
  curtainDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of the curtain reveal animation in seconds'),
  gateWeaveIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for gate weave effect'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .describe('Intensity of projection flicker (0 = no flicker, 1 = max flicker)'),
  lightLeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Opacity intensity of light leak overlays'),
  dustMotesCount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Number of floating dust mote particles'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    font,
    fontSize,
    anamorphicDuration,
    curtainDuration,
    gateWeaveIntensity,
    flickerIntensity,
    lightLeakIntensity,
    dustMotesCount,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Oswald:700');

  // IDs
  const rootId = '70mm-root-container';
  const gateWeaveId = '70mm-gate-weave-container';
  const flickerContainerId = '70mm-projection-flicker-container';
  const curtainMaskId = '70mm-curtain-mask-container';
  const anamorphicContainerId = '70mm-anamorphic-text-container';
  const mainTextId = '70mm-main-text';
  const warmLightLeakId = '70mm-warm-light-leak';
  const coolLightLeakId = '70mm-cool-light-leak';
  const dustMotesContainerId = '70mm-dust-motes-container';

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Gate weave: subtle jitter loop (±1px X, ±0.5px Y)
  const gateWeaveEffect: BaseEffect = {
    id: 'gate-weave-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 0.2,
      mode: 'provider',
      targetIds: [gateWeaveId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: gateWeaveIntensity * 1, prog: 0.25 },
        { key: 'translateX', val: 0, prog: 0.5 },
        { key: 'translateX', val: -gateWeaveIntensity * 1, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: gateWeaveIntensity * 0.5, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Projection flicker: subtle opacity oscillation
  const projectionFlickerEffect: BaseEffect = {
    id: 'projection-flicker-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: 0.15,
      mode: 'provider',
      targetIds: [flickerContainerId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1 - flickerIntensity, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Curtain mask reveal: clip-path from inset(0 50% 0 50%) to inset(0 0 0 0)
  const curtainRevealEffect: BaseEffect = {
    id: 'curtain-reveal-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: curtainDuration,
      mode: 'provider',
      targetIds: [curtainMaskId],
      ranges: [
        { key: 'clipPath', val: 'inset(0 50% 0 50%)', prog: 0 },
        { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Anamorphic unsqueeze: scaleX(2) scaleY(0.5) → scale(1)
  const anamorphicEffect: BaseEffect = {
    id: 'anamorphic-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0.3, // Slight delay for dramatic staging
      duration: anamorphicDuration,
      mode: 'provider',
      targetIds: [anamorphicContainerId],
      ranges: [
        { key: 'scaleX', val: 2, prog: 0 },
        { key: 'scaleX', val: 1, prog: 1 },
        { key: 'scaleY', val: 0.5, prog: 0 },
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Warm light leak fade in
  const warmLightLeakEffect: BaseEffect = {
    id: 'warm-light-leak-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0.5,
      duration: 1.5,
      mode: 'provider',
      targetIds: [warmLightLeakId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: lightLeakIntensity, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Cool light leak fade in
  const coolLightLeakEffect: BaseEffect = {
    id: 'cool-light-leak-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 1,
      duration: 1.5,
      mode: 'provider',
      targetIds: [coolLightLeakId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: lightLeakIntensity, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Dust motes floating animation
  const createDustMoteEffect = (
    dustMoteId: string,
    startDelay: number,
    floatDuration: number,
  ): BaseEffect => ({
    id: `dust-mote-effect-${dustMoteId}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: startDelay,
      duration: floatDuration,
      mode: 'provider',
      targetIds: [dustMoteId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: '-100vh', prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.1 },
        { key: 'opacity', val: 0.6, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  });

  // ============================================================================
  // DUST MOTES
  // ============================================================================

  const dustMoteVariants = [
    { className: 'w-1 h-1 bg-yellow-100/60', left: '10%', bottom: '-5%' },
    { className: 'w-1.5 h-1.5 bg-amber-100/50', left: '25%', bottom: '-10%' },
    { className: 'w-0.5 h-0.5 bg-yellow-50/70', left: '40%', bottom: '-3%' },
    { className: 'w-1 h-1 bg-orange-100/55', left: '55%', bottom: '-8%' },
    { className: 'w-1.5 h-1.5 bg-yellow-100/45', left: '70%', bottom: '-6%' },
    { className: 'w-0.5 h-0.5 bg-amber-50/65', left: '82%', bottom: '-4%' },
    { className: 'w-1 h-1 bg-yellow-100/50', left: '18%', bottom: '-12%' },
    { className: 'w-1.5 h-1.5 bg-orange-50/40', left: '92%', bottom: '-7%' },
  ];

  const dustMotes: RenderableComponentData[] = [];
  const limitedDustMotesCount = Math.min(
    dustMotesCount,
    dustMoteVariants.length,
  );

  for (let i = 0; i < limitedDustMotesCount; i++) {
    const variant = dustMoteVariants[i];
    const dustMoteId = `dust-mote-${i + 1}`;
    const startDelay = (i * 0.5) % 4; // Stagger start times 0-4s
    const floatDuration = 15 + Math.random() * 5; // 15-20s duration

    dustMotes.push({
      id: dustMoteId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute ${variant.className} rounded-full`,
          style: {
            left: variant.left,
            bottom: variant.bottom,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createDustMoteEffect(dustMoteId, startDelay, floatDuration)],
    } as RenderableComponentData);
  }

  // ============================================================================
  // COMPONENT TREE
  // ============================================================================

  // Main text atom
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : { weights: ['700'] }),
      },
      style: {
        fontSize: `clamp(48px, 8vw, ${fontSize}px)`,
        fontWeight: fontStyle.fontWeight || 700,
        color: textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textShadow:
          '4px 4px 8px rgba(0,0,0,0.7), 8px 8px 16px rgba(0,0,0,0.5)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Anamorphic text container
  const anamorphicTextContainer: RenderableComponentData = {
    id: anamorphicContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
        style: {
          transform: 'scaleX(2) scaleY(0.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [anamorphicEffect],
    childrenData: [mainText],
  } as RenderableComponentData;

  // Curtain mask container
  const curtainMaskContainer: RenderableComponentData = {
    id: curtainMaskId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'inset(0 50% 0 50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [curtainRevealEffect],
    childrenData: [anamorphicTextContainer],
  } as RenderableComponentData;

  // Projection flicker container
  const projectionFlickerContainer: RenderableComponentData = {
    id: flickerContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [projectionFlickerEffect],
    childrenData: [curtainMaskContainer],
  } as RenderableComponentData;

  // Gate weave container
  const gateWeaveContainer: RenderableComponentData = {
    id: gateWeaveId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [gateWeaveEffect],
    childrenData: [projectionFlickerContainer],
  } as RenderableComponentData;

  // Warm light leak overlay
  const warmLightLeak: RenderableComponentData = {
    id: warmLightLeakId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(135deg, rgba(255,107,53,0.4) 0%, rgba(247,147,30,0.2) 30%, transparent 60%)',
          mixBlendMode: 'screen',
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [warmLightLeakEffect],
  } as RenderableComponentData;

  // Cool light leak overlay
  const coolLightLeak: RenderableComponentData = {
    id: coolLightLeakId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(315deg, rgba(0,153,220,0.35) 0%, rgba(0,102,204,0.15) 25%, transparent 55%)',
          mixBlendMode: 'screen',
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [coolLightLeakEffect],
  } as RenderableComponentData;

  // Dust motes container
  const dustMotesContainer: RenderableComponentData = {
    id: dustMotesContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: dustMotes,
  } as RenderableComponentData;

  // Root container (2.39:1 aspect ratio)
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full bg-gradient-to-b from-zinc-950 to-black overflow-hidden',
        style: {
          aspectRatio: '2.39/1',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      gateWeaveContainer,
      warmLightLeak,
      coolLightLeak,
      dustMotesContainer,
    ],
  } as RenderableComponentData;

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: '70mm-cinematic-typokinetics',
  title: '70mm Cinematic Typokinetics',
  description:
    'A dramatic typokinetic preset emulating 70mm film presentations with sweeping panoramic text reveals. Features anamorphic lens characteristics with horizontal stretch animation, curtain-parting rectangular mask reveals, vintage light leaks in warm amber and cool blue tones, authentic gate weave jitter, projection flicker, dimensional drop shadows, and floating dust motes for atmospheric depth. Designed for ultra-widescreen 2.39:1 aspect ratio with bold condensed typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'cinematic',
    '70mm',
    'anamorphic',
    'widescreen',
    'vintage',
    'film',
    'light-leaks',
    'gate-weave',
    'projection',
    'retro',
    'dust-motes',
    'curtain-reveal',
  ],
  defaultInputParams: {
    text: 'CINEMATIC',
    duration: 5,
    textColor: '#f5f5f5',
    font: 'Oswald:700',
    fontSize: 120,
    anamorphicDuration: 2,
    curtainDuration: 1.5,
    gateWeaveIntensity: 1,
    flickerIntensity: 0.05,
    lightLeakIntensity: 0.4,
    dustMotesCount: 8,
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const seventyMmCinematicTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
