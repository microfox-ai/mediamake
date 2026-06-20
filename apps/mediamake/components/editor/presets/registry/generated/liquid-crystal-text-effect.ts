/**
 * Liquid Crystal Display Text Effect Preset
 *
 * This preset creates a mesmerizing liquid crystal display text effect where typography appears to be made of 
 * flowing liquid crystal material. The text exhibits iridescent colors that shift based on viewing angle and 
 * movement, mimicking the rainbow patterns seen in soap bubbles or oil on water.
 *
 * Features:
 * - Multiple layered text with different blend modes for iridescence
 * - Rapid color flow using hue-rotation animations on different cycles
 * - Viewing angle simulation with skew transforms
 * - Polarization effects with opacity flickering (crystals rotating out of alignment)
 * - Liquid movement with subtle scale pulsing
 * - High-frequency color oscillations creating rainbow shimmer
 * - Gradient flow animations for continuous color shifting
 * - Shimmer overlay for added light interaction
 * - Phase-in animation where text aligns from chaotic to readable
 *
 * Use cases:
 * - Creating futuristic tech-inspired text effects
 * - Building eye-catching social media content
 * - Adding premium liquid crystal aesthetics to titles
 * - Creating mesmerizing animated typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  userText: z.string().describe('Text content to display with liquid crystal effect'),
  fontSize: z.string().or(z.number()).default('96px').describe('Font size for the text (e.g., "96px" or 96)'),
  fontFamily: z.string().default('Inter').describe('Font family for the text'),
  duration: z.number().default(10).describe('Duration of the effect in seconds'),
  colorCycleSpeed: z.number().min(0.1).max(5).default(0.5).describe('Speed of color cycle animation (0.5s default for rapid oscillations)'),
  phaseInDuration: z.number().min(0.1).max(2).default(0.3).describe('Duration of phase-in alignment animation'),
  polarizationSpeed: z.number().min(1).max(10).default(3).describe('Speed of polarization flicker effect (seconds per cycle)'),
  liquidMovementSpeed: z.number().min(0.5).max(3).default(1.2).describe('Speed of liquid movement pulsing'),
  viewingAngleSpeed: z.number().min(0.5).max(5).default(2).describe('Speed of viewing angle skew oscillation'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    userText,
    fontSize,
    fontFamily,
    duration,
    colorCycleSpeed,
    phaseInDuration,
    polarizationSpeed,
    liquidMovementSpeed,
    viewingAngleSpeed,
  } = params;

  // Convert fontSize to string if needed
  const fontSizeStr = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;

  // Base text layer (foundation)
  const baseTextLayer: RenderableComponentData = {
    id: 'base-text-layer',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: userText,
      style: {
        fontSize: fontSizeStr,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        position: 'absolute',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Iridescent layer 1 (gradient with blend mode)
  const iridescentLayer1: RenderableComponentData = {
    id: 'iridescent-layer-1',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: userText,
      style: {
        fontSize: fontSizeStr,
        fontWeight: 'bold',
        color: 'transparent',
        textAlign: 'center',
        position: 'absolute',
        backgroundImage: 'linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #9d00ff, #ff0080)',
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        mixBlendMode: 'screen',
        filter: 'contrast(150%) brightness(120%) saturate(150%)',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Iridescent layer 2 (different gradient and blend mode)
  const iridescentLayer2: RenderableComponentData = {
    id: 'iridescent-layer-2',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: userText,
      style: {
        fontSize: fontSizeStr,
        fontWeight: 'bold',
        color: 'transparent',
        textAlign: 'center',
        position: 'absolute',
        backgroundImage: 'linear-gradient(135deg, #00ff88, #0088ff, #ff00ff, #ffff00, #00ff88)',
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        mixBlendMode: 'color-dodge',
        filter: 'contrast(150%) brightness(120%) saturate(150%)',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Shimmer overlay layer
  const shimmerLayer: RenderableComponentData = {
    id: 'shimmer-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; position: absolute; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%); background-size: 200% 100%; mix-blend-mode: overlay; pointer-events: none;"></div>',
      style: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Phase-in effect for base layer
  const phaseInEffectBase = {
    id: 'phase-in-effect-base',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
      start: 0,
      duration: phaseInDuration,
      mode: 'provider',
      targetIds: ['base-text-layer'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'skewX', val: 15, prog: 0 },
        { key: 'skewX', val: 0, prog: 1 },
        { key: 'skewY', val: -10, prog: 0 },
        { key: 'skewY', val: 0, prog: 1 },
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Phase-in effect for layer 1
  const phaseInEffectLayer1 = {
    id: 'phase-in-effect-layer1',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
      start: 0.05,
      duration: phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-1'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'skewX', val: 20, prog: 0 },
        { key: 'skewX', val: 0, prog: 1 },
        { key: 'skewY', val: -15, prog: 0 },
        { key: 'skewY', val: 0, prog: 1 },
        { key: 'scale', val: 0.9, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Phase-in effect for layer 2
  const phaseInEffectLayer2 = {
    id: 'phase-in-effect-layer2',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
      start: 0.1,
      duration: phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-2'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'skewX', val: -18, prog: 0 },
        { key: 'skewX', val: 0, prog: 1 },
        { key: 'skewY', val: 12, prog: 0 },
        { key: 'skewY', val: 0, prog: 1 },
        { key: 'scale', val: 0.92, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Hue rotation for layer 1 (color cycling)
  const hueRotationLayer1 = {
    id: 'hue-rotation-layer1',
    componentId: 'generic',
    data: {
      type: 'linear' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-1'],
      ranges: [
        { key: 'filter:hue-rotate', val: 0, prog: 0, unit: 'deg' },
        { key: 'filter:hue-rotate', val: 360, prog: 1, unit: 'deg' },
      ],
    },
  };

  // Hue rotation for layer 2 (different cycle speed)
  const hueRotationLayer2 = {
    id: 'hue-rotation-layer2',
    componentId: 'generic',
    data: {
      type: 'linear' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-2'],
      ranges: [
        { key: 'filter:hue-rotate', val: 0, prog: 0, unit: 'deg' },
        { key: 'filter:hue-rotate', val: 360, prog: 1, unit: 'deg' },
      ],
    },
  };

  // Gradient flow for layer 1
  const gradientFlowLayer1 = {
    id: 'gradient-flow-layer1',
    componentId: 'generic',
    data: {
      type: 'linear' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-1'],
      ranges: [
        { key: 'backgroundPositionX', val: 0, prog: 0, unit: '%' },
        { key: 'backgroundPositionX', val: -200, prog: 1, unit: '%' },
      ],
    },
  };

  // Gradient flow for layer 2
  const gradientFlowLayer2 = {
    id: 'gradient-flow-layer2',
    componentId: 'generic',
    data: {
      type: 'linear' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-2'],
      ranges: [
        { key: 'backgroundPositionX', val: 0, prog: 0, unit: '%' },
        { key: 'backgroundPositionX', val: -200, prog: 1, unit: '%' },
      ],
    },
  };

  // Shimmer sweep effect
  const shimmerSweep = {
    id: 'shimmer-sweep',
    componentId: 'generic',
    data: {
      type: 'linear' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['shimmer-layer'],
      ranges: [
        { key: 'backgroundPositionX', val: -200, prog: 0, unit: '%' },
        { key: 'backgroundPositionX', val: 200, prog: 1, unit: '%' },
      ],
    },
  };

  // Polarization flicker for layer 1
  const polarizationFlickerLayer1 = {
    id: 'polarization-flicker-layer1',
    componentId: 'generic',
    data: {
      type: 'linear' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-1'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0.4, prog: 0.75 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Polarization flicker for layer 2
  const polarizationFlickerLayer2 = {
    id: 'polarization-flicker-layer2',
    componentId: 'generic',
    data: {
      type: 'linear' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-2'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.5, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 0.6 },
        { key: 'opacity', val: 0.35, prog: 0.8 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Liquid movement for layer 1 (scale pulse)
  const liquidMovementLayer1 = {
    id: 'liquid-movement-layer1',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-1'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.03, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Liquid movement for layer 2 (scale pulse opposite)
  const liquidMovementLayer2 = {
    id: 'liquid-movement-layer2',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-2'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.97, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Viewing angle skew for layer 1
  const viewingAngleSkewLayer1 = {
    id: 'viewing-angle-skew-layer1',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-1'],
      ranges: [
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: 3, prog: 0.25 },
        { key: 'skewX', val: 0, prog: 0.5 },
        { key: 'skewX', val: -3, prog: 0.75 },
        { key: 'skewX', val: 0, prog: 1 },
        { key: 'skewY', val: 0, prog: 0 },
        { key: 'skewY', val: -2, prog: 0.25 },
        { key: 'skewY', val: 0, prog: 0.5 },
        { key: 'skewY', val: 2, prog: 0.75 },
        { key: 'skewY', val: 0, prog: 1 },
      ],
    },
  };

  // Viewing angle skew for layer 2
  const viewingAngleSkewLayer2 = {
    id: 'viewing-angle-skew-layer2',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as any,
      start: phaseInDuration,
      duration: duration - phaseInDuration,
      mode: 'provider',
      targetIds: ['iridescent-layer-2'],
      ranges: [
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: -4, prog: 0.25 },
        { key: 'skewX', val: 0, prog: 0.5 },
        { key: 'skewX', val: 4, prog: 0.75 },
        { key: 'skewX', val: 0, prog: 1 },
        { key: 'skewY', val: 0, prog: 0 },
        { key: 'skewY', val: 3, prog: 0.25 },
        { key: 'skewY', val: 0, prog: 0.5 },
        { key: 'skewY', val: -3, prog: 0.75 },
        { key: 'skewY', val: 0, prog: 1 },
      ],
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-crystal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      baseTextLayer,
      iridescentLayer1,
      iridescentLayer2,
      shimmerLayer,
    ] as RenderableComponentData[],
    effects: [
      phaseInEffectBase,
      phaseInEffectLayer1,
      phaseInEffectLayer2,
      hueRotationLayer1,
      hueRotationLayer2,
      gradientFlowLayer1,
      gradientFlowLayer2,
      shimmerSweep,
      polarizationFlickerLayer1,
      polarizationFlickerLayer2,
      liquidMovementLayer1,
      liquidMovementLayer2,
      viewingAngleSkewLayer1,
      viewingAngleSkewLayer2,
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
  id: 'liquid-crystal-text-effect',
  title: 'Liquid Crystal Display Text Effect',
  description: 'Iridescent text effect simulating flowing liquid crystal material with rainbow shimmer, viewing angle shifts, and polarization effects. Text phases in from chaotic to readable with high-frequency color oscillations and transparent crystal rotation effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'effects', 'liquid', 'crystal', 'iridescent', 'rainbow', 'shimmer', 'gradient', 'animated', 'futuristic'],
  dependencies: {},
  defaultInputParams: {
    userText: 'LIQUID CRYSTAL',
    fontSize: '96px',
    fontFamily: 'Inter',
    duration: 10,
    colorCycleSpeed: 0.5,
    phaseInDuration: 0.3,
    polarizationSpeed: 3,
    liquidMovementSpeed: 1.2,
    viewingAngleSpeed: 2,
  },
};

export const liquidCrystalTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
