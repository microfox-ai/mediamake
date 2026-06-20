/**
 * Slinky Spring Text Animation Preset
 *
 * This preset creates a physics-based text animation where letters compress and extend
 * like a slinky toy going down stairs. Features momentum-driven motion with compression
 * at top, downward extension, bottom rebound, and spring-back motion.
 *
 * Features:
 * - Physics-based spring motion with compression/extension cycles
 * - Each letter has staggered timing creating wave propagation effect
 * - Rotational oscillation following spring motion (letters tilt forward/backward)
 * - Metallic sheen effect using animated gradients for authentic spring coil appearance
 * - Heavy, momentum-driven motion using physics-based easing
 * - Multiple animation phases: compress → extend → rebound → settle
 *
 * Use cases:
 * - Creating eye-catching text animations with physics-based motion
 * - Building engaging title sequences with spring effects
 * - Adding dynamic text effects for social media content
 * - Creating professional kinetic typography with realistic physics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('SLINKY')
    .describe('Text to animate with slinky spring effect'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:800')
    .describe('Font family with optional weight (e.g., "Inter:800", "Roboto:700")'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Total duration of the animation in seconds'),
  cycleDuration: z
    .number()
    .min(1)
    .max(5)
    .default(1.8)
    .describe('Duration of one slinky cycle in seconds'),
  letterDelay: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.08)
    .describe('Delay between each letter in seconds (creates wave effect)'),
  metallic: z
    .boolean()
    .default(true)
    .describe('Enable metallic sheen gradient effect'),
  baseColor: z
    .string()
    .default('#C0C0C0')
    .describe('Base color for metallic gradient'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:800';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 800;

  // Split text into letters
  const letters = params.text.split('');

  // Helper: Create metallic gradient style
  const createMetallicGradient = () => {
    if (!params.metallic) {
      return {
        color: params.baseColor,
      };
    }

    return {
      background: `linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 25%, #A9A9A9 50%, #D3D3D3 75%, #B8B8B8 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    };
  };

  // Create letter components with staggered effects
  const letterComponents = letters.map((letter, index) => {
    const letterId = `slinky-letter-${index}`;
    const effectId = `slinky-motion-${index}`;
    const shimmerEffectId = `slinky-shimmer-${index}`;

    // Calculate staggered start time for this letter
    const letterStart = index * params.letterDelay;

    // Slinky motion effect with translateY, scaleY, and rotateX
    const motionEffect: GenericEffectData = {
      type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' as any, // Momentum-driven easing
      start: letterStart,
      duration: params.cycleDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // TranslateY: compress → extend → rebound → settle
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -20, prog: 0.2 }, // Compress at top
        { key: 'translateY', val: 40, prog: 0.5 }, // Extend downward
        { key: 'translateY', val: -10, prog: 0.7 }, // Rebound
        { key: 'translateY', val: 5, prog: 0.85 },
        { key: 'translateY', val: 0, prog: 1 },

        // ScaleY: compress → extend → compress → settle
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 0.7, prog: 0.2 }, // Compress
        { key: 'scaleY', val: 1.3, prog: 0.5 }, // Extend
        { key: 'scaleY', val: 0.9, prog: 0.7 }, // Compress
        { key: 'scaleY', val: 1, prog: 1 }, // Settle

        // RotateX: tilt forward when extending, backward when compressing
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: -10, prog: 0.2 }, // Tilt backward (compress)
        { key: 'rotateX', val: 15, prog: 0.5 }, // Tilt forward (extend)
        { key: 'rotateX', val: -5, prog: 0.7 }, // Tilt backward (rebound)
        { key: 'rotateX', val: 0, prog: 1 }, // Settle
      ],
    };

    // Shimmer effect for metallic gradient (animate filter properties)
    const shimmerEffect: GenericEffectData | null = params.metallic
      ? {
          type: 'linear',
          start: letterStart,
          duration: params.cycleDuration,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 0 },
            {
              key: 'filter',
              val: 'hue-rotate(20deg) brightness(1.2)',
              prog: 0.25,
            },
            { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 0.5 },
            {
              key: 'filter',
              val: 'hue-rotate(-20deg) brightness(1.1)',
              prog: 0.75,
            },
            { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 1 },
          ],
        }
      : null;

    // Build effects array
    const effects = [
      {
        id: effectId,
        componentId: 'generic',
        data: motionEffect,
      },
    ];

    if (shimmerEffect) {
      effects.push({
        id: shimmerEffectId,
        componentId: 'generic',
        data: shimmerEffect,
      });
    }

    // Letter component
    const letterComponent: RenderableComponentData = {
      id: letterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontWeight,
          letterSpacing: '0.05em',
          ...createMetallicGradient(),
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects,
    };

    return letterComponent;
  });

  // Root container with flex layout
  const rootContainer: RenderableComponentData = {
    id: 'slinky-spring-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-end gap-1 justify-center absolute inset-0',
        style: {
          perspective: '1000px', // Enable 3D perspective for rotateX
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterComponents as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'slinky-spring-text-animation',
  title: 'Slinky Spring Text Animation',
  description:
    'Physics-based text animation where letters compress and extend like a slinky toy going down stairs. Features momentum-driven motion with compression at top, downward extension, bottom rebound, and spring-back. Each letter has staggered timing creating wave propagation. Includes rotational oscillation (letters tilt forward/backward following spring motion) and metallic sheen with animated gradients for authentic spring coil appearance. Motion feels heavy and momentum-driven with physics-based easing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'slinky',
    'spring',
    'physics',
    'kinetic',
    'typography',
    'metallic',
    'wave',
    'momentum',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SLINKY',
    fontSize: 80,
    fontFamily: 'Inter:800',
    duration: 5,
    cycleDuration: 1.8,
    letterDelay: 0.08,
    metallic: true,
    baseColor: '#C0C0C0',
  },
};

// Export preset
export const slinkySpringTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
