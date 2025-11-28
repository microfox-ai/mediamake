/**
 * Water Fill Text Animation Preset
 *
 * This preset creates a vertical bottom-to-top text fill animation that simulates
 * water rising inside hollow letter shapes. The effect mimics a gradient wipe with
 * a soft edge, creating an organic fill pattern with wave motion at the top edge.
 *
 * Features:
 * - Bottom-to-top fill animation using CSS gradient background
 * - Spring easing for natural, gravity-affected motion
 * - Wave-like liquid settling animation
 * - Subtle Y-axis scale oscillation to simulate liquid movement
 * - Shimmer effect within filled portion to enhance liquid metaphor
 * - Relative timing with 80% main fill, 20% settle animation
 * - Configurable colors, duration, and text properties
 *
 * Use cases:
 * - Creating liquid fill text effects for titles
 * - Adding water-themed animations to intros/outros
 * - Building organic, physics-based text reveals
 * - Creating engaging typography effects for social media
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
  text: z.string().default('WATER').describe('Text content to display'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(500)
    .default(120)
    .optional()
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700")'),
  fillColor: z
    .string()
    .default('#2563eb')
    .optional()
    .describe('Color of the water fill (hex or rgba)'),
  textStroke: z
    .string()
    .optional()
    .describe(
      'Text stroke/outline color for hollow letter effect (hex or rgba)',
    ),
  textStrokeWidth: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Text stroke width in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'water-fill-root';
  const textId = 'water-text-element';
  const shimmerOverlayId = 'shimmer-overlay';

  const fontSize = params.fontSize ?? 120;
  const fontWeight = params.fontWeight ?? '700';
  const fillColor = params.fillColor ?? '#2563eb';
  const totalDuration = params.duration;

  // Calculate timing phases
  const fillDuration = totalDuration * 0.8; // 80% for main fill
  const settleDuration = totalDuration * 0.2; // 20% for settle
  const fillStartTime = 0;
  const settleStartTime = fillDuration;
  const shimmerStartTime = totalDuration * 0.3; // Start shimmer at 30%
  const shimmerFadeDuration = totalDuration * 0.2; // 20% duration

  // Create fill animation effect (background position from bottom to top)
  const fillEffect: GenericEffectData = {
    type: 'spring', // Spring easing for natural, gravity-affected motion
    start: fillStartTime,
    duration: fillDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'backgroundPositionY', val: '100%', prog: 0 }, // Start at bottom (hidden)
      { key: 'backgroundPositionY', val: '0%', prog: 1 }, // End at top (fully filled)
    ],
  };

  // Create liquid settle effect (subtle Y-axis oscillation)
  const settleEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: settleStartTime,
    duration: settleDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: 0.98, prog: 0.3 }, // Compress slightly
      { key: 'scaleY', val: 1.02, prog: 0.6 }, // Expand slightly
      { key: 'scaleY', val: 1, prog: 1 }, // Back to normal
    ],
  };

  // Create shimmer fade-in effect
  const shimmerFadeEffect: GenericEffectData = {
    type: 'ease-in',
    start: shimmerStartTime,
    duration: shimmerFadeDuration,
    mode: 'provider',
    targetIds: [shimmerOverlayId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.4, prog: 1 }, // Fade to 40% opacity
    ],
  };

  // Create text atom with gradient background
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      font: {
        family: params.fontFamily ?? 'Inter',
        weights: [fontWeight],
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        // Gradient background for fill effect (bottom half is fill color, top half is transparent)
        background: `linear-gradient(to top, ${fillColor} 0%, ${fillColor} 50%, transparent 50%, transparent 100%)`,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '100% 200%', // Double height for gradient animation
        backgroundPosition: '0 100%', // Start at bottom
        filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))', // Subtle shadow for depth
        // Optional text stroke for hollow letter effect
        ...(params.textStroke
          ? {
              WebkitTextStroke: `${params.textStrokeWidth ?? 1}px ${params.textStroke}`,
            }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'water-fill-effect',
        componentId: 'generic',
        data: fillEffect,
      },
      {
        id: 'water-settle-effect',
        componentId: 'generic',
        data: settleEffect,
      },
    ],
  };

  // Create shimmer overlay using HTMLBlockAtom
  const shimmerOverlay: RenderableComponentData = {
    id: shimmerOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
          background-size: 200% 200%;
          animation: shimmer 2s ease-in-out infinite;
        "></div>
        <style>
          @keyframes shimmer {
            0%, 100% { background-position: 200% 200%; }
            50% { background-position: 0% 0%; }
          }
        </style>
      `,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'overlay',
        opacity: 0, // Start hidden, fade in via effect
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'shimmer-fade-in-effect',
        componentId: 'generic',
        data: shimmerFadeEffect,
      },
    ],
  };

  // Root container with relative positioning
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-flex items-end justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textAtom, shimmerOverlay] as RenderableComponentData[],
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
  id: 'water-fill-text-animation',
  title: 'Water Fill Text Animation',
  description:
    'Vertical bottom-to-top text fill animation simulating water rising inside hollow letter shapes. Features gradient background animation with spring easing for natural motion, subtle wave effects at the fill line, Y-axis scale oscillation for liquid movement, and shimmer effects within the filled portion to enhance the liquid metaphor. The animation feels weighty and physical with gravity-affected fill speed.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'water',
    'fill',
    'liquid',
    'gradient',
    'spring',
    'physics',
    'typography',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'WATER',
    duration: 5,
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '700',
    fillColor: '#2563eb',
    textStroke: undefined,
    textStrokeWidth: 1,
  },
};

// Export preset
export const waterFillTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
