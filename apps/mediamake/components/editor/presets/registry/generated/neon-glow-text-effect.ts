/**
 * Neon Glow Text Effect Preset
 *
 * This preset creates an animated 80s-style neon sign text effect with multi-layered glows,
 * pulsing intensity animations, electrical flicker effects, and subtle hue shifting to simulate
 * plasma tube behavior. It uses the effects system for all animations with provider mode targeting
 * stacked TextAtom layers.
 *
 * Features:
 * - **Multi-Layered Glows**: Three glow layers with different blur radii (inner 2px, middle 8px, outer 20px)
 * - **Pulsing Intensity**: Each glow layer pulses at different rates for a dynamic effect
 * - **Electrical Flicker**: Random flicker effects at predetermined intervals to simulate electrical fluctuations
 * - **Hue Shifting**: Subtle hue rotation on each layer to simulate plasma tube color variations
 * - **GPU Accelerated**: Uses filter, opacity, and transform properties for optimal performance
 *
 * Use cases:
 * - Creating retro 80s neon sign aesthetics
 * - Adding eye-catching animated text overlays
 * - Building synthwave/vaporwave styled content
 * - Creating attention-grabbing title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with neon glow effect'),
  duration: z
    .number()
    .min(0.1)
    .default(3)
    .describe('Duration of one complete animation cycle in seconds'),
  fontSize: z
    .string()
    .default('96px')
    .describe('Font size for the neon text (e.g., "96px", "120px")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight for the text (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (Google Fonts name)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (usually white or light color)'),
  glowColor: z
    .string()
    .default('#00FFFF')
    .describe('Primary glow color (neon tube color like cyan, magenta, etc.)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontWeight,
    fontFamily,
    textColor,
    glowColor,
  } = params;

  // Generate unique IDs
  const containerId = 'neon-glow-root';
  const baseTextId = 'neon-base-text-layer';
  const innerGlowId = 'neon-inner-glow-layer';
  const middleGlowId = 'neon-middle-glow-layer';
  const outerGlowId = 'neon-outer-glow-layer';

  // Create base text layer
  const baseTextLayer: RenderableComponentData = {
    id: baseTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize,
        fontWeight,
        color: textColor,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create inner glow layer (sharp glow)
  const innerGlowLayer: RenderableComponentData = {
    id: innerGlowId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute',
      style: {
        fontSize,
        fontWeight,
        color: glowColor,
        filter: 'blur(2px)',
        opacity: 0.8,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create middle glow layer (medium glow)
  const middleGlowLayer: RenderableComponentData = {
    id: middleGlowId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute',
      style: {
        fontSize,
        fontWeight,
        color: glowColor,
        filter: 'blur(8px)',
        opacity: 0.6,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create outer glow layer (ambient glow)
  const outerGlowLayer: RenderableComponentData = {
    id: outerGlowId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute',
      style: {
        fontSize,
        fontWeight,
        color: glowColor,
        filter: 'blur(20px)',
        opacity: 0.4,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create effects array for the container
  const effects = [];

  // 1. Inner glow pulse effect (textShadow animation)
  const innerGlowPulseEffect = {
    id: 'inner-glow-pulse-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 2,
      mode: 'provider',
      targetIds: [innerGlowId],
      ranges: [
        {
          key: 'textShadow',
          val: `0 0 2px ${glowColor}, 0 0 4px ${glowColor}`,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 4px ${glowColor}, 0 0 8px ${glowColor}`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: `0 0 2px ${glowColor}, 0 0 4px ${glowColor}`,
          prog: 1,
        },
      ],
    } as GenericEffectData,
  };
  effects.push(innerGlowPulseEffect);

  // 2. Middle glow pulse effect (opacity animation)
  const middleGlowPulseEffect = {
    id: 'middle-glow-pulse-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 2.5,
      mode: 'provider',
      targetIds: [middleGlowId],
      ranges: [
        { key: 'opacity', val: 0.5, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 0.5, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(middleGlowPulseEffect);

  // 3. Outer glow pulse effect (opacity animation)
  const outerGlowPulseEffect = {
    id: 'outer-glow-pulse-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 3,
      mode: 'provider',
      targetIds: [outerGlowId],
      ranges: [
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 0.5, prog: 0.5 },
        { key: 'opacity', val: 0.3, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(outerGlowPulseEffect);

  // 4. Flicker effects at predetermined intervals
  const flickerTargets = [baseTextId, innerGlowId, middleGlowId, outerGlowId];

  // Flicker 1 at 0.3s
  const flicker1 = {
    id: 'flicker-effect-1',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0.3,
      duration: 0.1,
      mode: 'provider',
      targetIds: flickerTargets,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(flicker1);

  // Flicker 2 at 0.7s
  const flicker2 = {
    id: 'flicker-effect-2',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0.7,
      duration: 0.08,
      mode: 'provider',
      targetIds: flickerTargets,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.75, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(flicker2);

  // Flicker 3 at 1.4s
  const flicker3 = {
    id: 'flicker-effect-3',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 1.4,
      duration: 0.12,
      mode: 'provider',
      targetIds: flickerTargets,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.65, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(flicker3);

  // Flicker 4 at 2.1s
  const flicker4 = {
    id: 'flicker-effect-4',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 2.1,
      duration: 0.15,
      mode: 'provider',
      targetIds: flickerTargets,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(flicker4);

  // 5. Hue shift effects for each layer to simulate plasma
  const hueShiftInner = {
    id: 'hue-shift-inner-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 3,
      mode: 'provider',
      targetIds: [innerGlowId],
      ranges: [
        { key: 'filter', val: 'blur(2px) hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'blur(2px) hue-rotate(10deg)', prog: 0.25 },
        { key: 'filter', val: 'blur(2px) hue-rotate(-5deg)', prog: 0.5 },
        { key: 'filter', val: 'blur(2px) hue-rotate(8deg)', prog: 0.75 },
        { key: 'filter', val: 'blur(2px) hue-rotate(0deg)', prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(hueShiftInner);

  const hueShiftMiddle = {
    id: 'hue-shift-middle-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 3,
      mode: 'provider',
      targetIds: [middleGlowId],
      ranges: [
        { key: 'filter', val: 'blur(8px) hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'blur(8px) hue-rotate(10deg)', prog: 0.25 },
        { key: 'filter', val: 'blur(8px) hue-rotate(-5deg)', prog: 0.5 },
        { key: 'filter', val: 'blur(8px) hue-rotate(8deg)', prog: 0.75 },
        { key: 'filter', val: 'blur(8px) hue-rotate(0deg)', prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(hueShiftMiddle);

  const hueShiftOuter = {
    id: 'hue-shift-outer-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 3,
      mode: 'provider',
      targetIds: [outerGlowId],
      ranges: [
        { key: 'filter', val: 'blur(20px) hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'blur(20px) hue-rotate(10deg)', prog: 0.25 },
        { key: 'filter', val: 'blur(20px) hue-rotate(-5deg)', prog: 0.5 },
        { key: 'filter', val: 'blur(20px) hue-rotate(8deg)', prog: 0.75 },
        { key: 'filter', val: 'blur(20px) hue-rotate(0deg)', prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(hueShiftOuter);

  // Create root container with all layers
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-block flex items-center justify-center',
        style: {
          willChange: 'filter, opacity, transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects,
    childrenData: [
      outerGlowLayer,
      middleGlowLayer,
      innerGlowLayer,
      baseTextLayer,
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'neonGlowTextEffect',
  title: 'Neon Glow Text Effect',
  description:
    'An animated 80s-style neon sign text effect with multi-layered glows (inner 2px, middle 8px, outer 20px blur), pulsing intensity animations, electrical flicker effects at predetermined intervals, and subtle hue shifting to simulate plasma tube behavior. Uses the effects system for all animations with provider mode targeting stacked TextAtom layers.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'glow',
    '80s',
    'retro',
    'animated',
    'effects',
    'synthwave',
    'vaporwave',
  ],
  defaultInputParams: {
    text: 'NEON GLOW',
    duration: 3,
    fontSize: '96px',
    fontWeight: '700',
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    glowColor: '#00FFFF',
  },
  dependencies: {},
};

// Export preset
export const neonGlowTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
