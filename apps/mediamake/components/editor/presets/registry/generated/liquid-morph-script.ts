/**
 * Morphing Liquid Script Animation Preset
 *
 * Creates handwritten text that flows and reshapes like mercury or liquid metal.
 * Letters initially appear as droplets, then smoothly morph into script forms with
 * surface tension effects, metallic sheen, and drip animations.
 *
 * Features:
 * - Droplet-to-script morphing with elastic easing
 * - Surface tension wobble effects after formation
 * - Metallic sheen overlay with continuous movement
 * - Physics-based drip animations with elastic bounce
 * - GPU-accelerated rendering with metallic filters
 * - Beautiful calligraphy final state
 *
 * Use cases:
 * - Creating elegant liquid metal text effects
 * - Building organic fluid typography animations
 * - Adding mercury-like morphing text to videos
 * - Creating premium metallic text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('Liquid Script')
    .describe('Text content to display with liquid morphing effect'),
  font: z
    .string()
    .default('Dancing Script:700')
    .describe(
      'Font family with optional weight (e.g., "Dancing Script:700", "Allura:400")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#e0e0e0')
    .describe('Text color in hex format'),
  morphDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of the droplet-to-script morph animation in seconds'),
  wobbleDuration: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Duration of the surface tension wobble effect in seconds'),
  dripCount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Number of drip effects to generate'),
  totalDuration: z
    .number()
    .min(3)
    .max(30)
    .default(5)
    .describe('Total duration of the animation in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Dancing Script:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font weight from font string
  let fontWeight: number | undefined;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Component IDs
  const mainTextId = 'liquid-script-text';
  const textWrapperId = 'liquid-text-wrapper';
  const sheenOverlayId = 'metallic-sheen-overlay';

  // Create droplet morph effect
  const dropletMorphEffect: GenericEffectData = {
    type: 'cubic-bezier',
    easingParams: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
    start: 0,
    duration: params.morphDuration,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      // Start small (droplet)
      { key: 'scale', val: 0.3, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
      // Fade in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.6, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 1 },
      // Blur effect (liquid formation)
      { key: 'blur', val: 20, prog: 0 },
      { key: 'blur', val: 0, prog: 1 },
    ],
  };

  // Create surface tension wobble effect
  const surfaceTensionEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: params.morphDuration,
    duration: params.wobbleDuration,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      // ScaleX oscillation
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 1.05, prog: 0.25 },
      { key: 'scaleX', val: 0.95, prog: 0.5 },
      { key: 'scaleX', val: 1.02, prog: 0.75 },
      { key: 'scaleX', val: 1, prog: 1 },
      // ScaleY oscillation (inverse)
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: 0.95, prog: 0.25 },
      { key: 'scaleY', val: 1.05, prog: 0.5 },
      { key: 'scaleY', val: 0.98, prog: 0.75 },
      { key: 'scaleY', val: 1, prog: 1 },
    ],
  };

  // Create metallic sheen movement effect
  const sheenMovementEffect: GenericEffectData = {
    type: 'linear',
    start: params.morphDuration,
    duration: params.totalDuration - params.morphDuration,
    mode: 'provider',
    targetIds: [sheenOverlayId],
    ranges: [
      { key: 'translateX', val: -200, prog: 0 },
      { key: 'translateX', val: 200, prog: 1 },
    ],
  };

  // Generate drip components
  const generateDrips = (): RenderableComponentData[] => {
    const drips: RenderableComponentData[] = [];
    
    for (let i = 0; i < params.dripCount; i++) {
      const dripId = `drip-${i + 1}`;
      const dripSize = i === 0 ? 12 : 10;
      const dripLeft = i === 0 ? '45%' : '55%';
      const dripStart = 2 + i * 0.3;
      const fallDuration = 0.8 - i * 0.1;
      const bounceDuration = 0.7;
      const fallDistance = 120 - i * 20;

      // Drip fall effect
      const dripFallEffect: GenericEffectData = {
        type: 'ease-in',
        start: 0,
        duration: fallDuration,
        mode: 'provider',
        targetIds: [dripId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: fallDistance, prog: 1 },
        ],
      };

      // Drip bounce effect
      const dripBounceEffect: GenericEffectData = {
        type: 'cubic-bezier',
        easingParams: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
        start: fallDuration,
        duration: bounceDuration,
        mode: 'provider',
        targetIds: [dripId],
        ranges: [
          { key: 'translateY', val: fallDistance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      drips.push({
        id: dripId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${dripSize}px; height: ${dripSize}px; background: radial-gradient(circle, #e0e0e0, #a0a0a0); border-radius: 50%; filter: blur(1px);'></div>`,
          className: 'absolute',
          style: {
            left: dripLeft,
            top: '50%',
          },
        },
        context: {
          timing: {
            start: dripStart,
            duration: fallDuration + bounceDuration,
          },
        },
        effects: [
          {
            id: `drip-fall-${i + 1}`,
            componentId: 'generic',
            data: dripFallEffect,
          },
          {
            id: `drip-bounce-${i + 1}`,
            componentId: 'generic',
            data: dripBounceEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return drips;
  };

  // Build the composition structure
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      font: {
        family: fontFamily,
        weights: fontWeight ? [fontWeight.toString()] : ['700'],
        display: 'swap' as const,
      },
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontWeight || 700,
        color: params.textColor,
        filter: 'contrast(1.2) brightness(1.3) saturate(0.8)',
        textAlign: 'center' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    effects: [
      {
        id: 'droplet-morph-effect',
        componentId: 'generic',
        data: dropletMorphEffect,
      },
      {
        id: 'surface-tension-wobble',
        componentId: 'generic',
        data: surfaceTensionEffect,
      },
    ],
  } as RenderableComponentData;

  // Metallic sheen overlay
  const sheenOverlay: RenderableComponentData = {
    id: sheenOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%); pointer-events: none; width: 100%; height: 100%;'></div>",
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    effects: [
      {
        id: 'sheen-movement',
        componentId: 'generic',
        data: sheenMovementEffect,
      },
    ],
  } as RenderableComponentData;

  // Text wrapper container
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative filter drop-shadow-2xl',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [mainText, sheenOverlay],
  } as RenderableComponentData;

  // Generate drip components
  const drips = generateDrips();

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-script-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-gray-800 to-black overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [textWrapper, ...drips] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-morph-script',
  title: 'Morphing Liquid Script Animation',
  description:
    'Handwritten script text that flows and reshapes like mercury or liquid metal. Letters appear as droplets, morph into script forms with surface tension wobbles, metallic sheen, and drip effects that bounce back. Features organic liquid physics with elastic transformations and elegant calligraphy final state.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'liquid',
    'morph',
    'mercury',
    'metallic',
    'script',
    'handwriting',
    'calligraphy',
    'animation',
    'fluid',
    'organic',
    'elegant',
  ],
  defaultInputParams: {
    text: 'Liquid Script',
    font: 'Dancing Script:700',
    fontSize: 96,
    textColor: '#e0e0e0',
    morphDuration: 1.5,
    wobbleDuration: 1,
    dripCount: 2,
    totalDuration: 5,
  },
  dependencies: {},
};

// Export preset
export const liquidMorphScriptPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
