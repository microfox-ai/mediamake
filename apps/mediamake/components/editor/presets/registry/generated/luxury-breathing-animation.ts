/**
 * Luxury Breathing Animation Preset
 *
 * An elegant, sophisticated breathing animation inspired by luxury brand motion design
 * and high-end video transitions. Features subtle scale animation (100% to 103-105%),
 * opacity shifts (100% to 94%), gentle blur (0 to 0.8px), and a soft glow effect.
 * The multi-layered approach creates a premium, polished feel with slow, deliberate
 * timing (5.5 second cycles) and smooth ease-in-out easing throughout.
 *
 * Perfect for hero text reveals, brand presentations, and high-end content.
 *
 * Features:
 * - Multi-dimensional breathing effect with scale, opacity, blur, and glow
 * - Slow, deliberate timing (5.5 second cycles by default)
 * - Premium luxury brand aesthetic
 * - Configurable impact multiplier for intensity control
 * - Smooth ease-in-out easing throughout
 * - Multiple synchronized layers for depth
 * - GPU-accelerated transforms for performance
 *
 * Use cases:
 * - Hero text reveals for brand videos
 * - Premium product presentations
 * - High-end fashion brand content
 * - Elegant title sequences
 * - Sophisticated logo animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  content: z
    .string()
    .default('LUXURY')
    .describe('Text content to display with breathing animation'),
  
  duration: z
    .number()
    .min(1)
    .default(5.5)
    .describe('Duration of one complete breathing cycle in seconds'),
  
  totalDuration: z
    .number()
    .min(1)
    .optional()
    .describe('Total duration of the animation (will loop breathing cycles). If not specified, uses single cycle duration'),
  
  fontSize: z
    .union([z.string(), z.number()])
    .default('72px')
    .describe('Font size for the text (e.g., "72px" or 72)'),
  
  fontWeight: z
    .union([z.string(), z.number()])
    .default('300')
    .describe('Font weight (e.g., "300", "400", "500", or numeric values)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  letterSpacing: z
    .string()
    .default('0.05em')
    .describe('Letter spacing for the text'),
  
  textTransform: z
    .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
    .default('uppercase')
    .describe('Text transformation style'),
  
  impact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Impact multiplier for effect intensity (0.1 = subtle, 3 = intense)'),
  
  scaleMin: z
    .number()
    .min(0.9)
    .max(1)
    .default(1)
    .describe('Minimum scale value (start and end of cycle)'),
  
  scaleMax: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.04)
    .describe('Maximum scale value (peak of cycle)'),
  
  opacityMin: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.94)
    .describe('Minimum opacity value (lowest point of cycle)'),
  
  opacityMax: z
    .number()
    .min(0.9)
    .max(1)
    .default(1)
    .describe('Maximum opacity value (peak of cycle)'),
  
  blurMax: z
    .number()
    .min(0)
    .max(5)
    .default(0.8)
    .describe('Maximum blur amount in pixels (peak of cycle)'),
  
  glowMaxSpread: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Maximum glow spread in pixels'),
  
  glowMaxOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Maximum glow opacity'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    content,
    duration,
    totalDuration,
    fontSize,
    fontWeight,
    textColor,
    letterSpacing,
    textTransform,
    impact,
    scaleMin,
    scaleMax,
    opacityMin,
    opacityMax,
    blurMax,
    glowMaxSpread,
    glowMaxOpacity,
  } = params;

  // Calculate effective values with impact multiplier
  const effectiveScaleRange = (scaleMax - scaleMin) * impact;
  const effectiveScaleMax = scaleMin + effectiveScaleRange;
  const effectiveOpacityRange = (opacityMax - opacityMin) * impact;
  const effectiveOpacityMin = opacityMax - effectiveOpacityRange;
  const effectiveBlurMax = blurMax * impact;
  const effectiveGlowSpread = glowMaxSpread * impact;
  const effectiveGlowOpacity = glowMaxOpacity * impact;

  // Use totalDuration if specified, otherwise use single cycle duration
  const animationDuration = totalDuration || duration;

  // IDs
  const rootContainerId = 'luxury-breathing-root';
  const backdropLayerId = 'luxury-breathing-backdrop';
  const mainContentLayerId = 'luxury-breathing-main-content';
  const heroTextId = 'luxury-breathing-hero-text';
  const glowLayerId = 'luxury-breathing-glow-layer';
  const glowTextId = 'luxury-breathing-glow-text';

  // Main content layer with text
  const heroText: RenderableComponentData = {
    id: heroTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: content,
      font: {
        family: 'Inter',
        weights: ['300', '400', '500'],
      },
      style: {
        fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
        fontWeight,
        color: textColor,
        letterSpacing,
        textTransform,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
  };

  const mainContentLayer: RenderableComponentData = {
    id: mainContentLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
    childrenData: [heroText],
    effects: [
      {
        id: 'main-content-breathing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [heroTextId],
          ranges: [
            { key: 'scale', val: scaleMin, prog: 0 },
            { key: 'scale', val: effectiveScaleMax, prog: 0.5 },
            { key: 'scale', val: scaleMin, prog: 1 },
          ],
        },
      },
      {
        id: 'main-content-breathing-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [heroTextId],
          ranges: [
            { key: 'opacity', val: opacityMax, prog: 0 },
            { key: 'opacity', val: effectiveOpacityMin, prog: 0.5 },
            { key: 'opacity', val: opacityMax, prog: 1 },
          ],
        },
      },
      {
        id: 'main-content-breathing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [heroTextId],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${effectiveBlurMax}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Glow layer with duplicate text for glow effect
  const glowText: RenderableComponentData = {
    id: glowTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: content,
      font: {
        family: 'Inter',
        weights: ['300', '400', '500'],
      },
      style: {
        fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
        fontWeight,
        color: 'transparent',
        letterSpacing,
        textTransform,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
  };

  const glowLayer: RenderableComponentData = {
    id: glowLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none transform-gpu',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
    childrenData: [glowText],
    effects: [
      {
        id: 'glow-breathing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [glowTextId],
          ranges: [
            { key: 'scale', val: scaleMin, prog: 0 },
            { key: 'scale', val: effectiveScaleMax, prog: 0.5 },
            { key: 'scale', val: scaleMin, prog: 1 },
          ],
        },
      },
      {
        id: 'glow-breathing-shadow',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [glowTextId],
          ranges: [
            {
              key: 'textShadow',
              val: '0 0 0px rgba(255,255,255,0)',
              prog: 0,
            },
            {
              key: 'textShadow',
              val: `0 0 ${effectiveGlowSpread}px rgba(255,255,255,${effectiveGlowOpacity})`,
              prog: 0.5,
            },
            {
              key: 'textShadow',
              val: '0 0 0px rgba(255,255,255,0)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Backdrop layer
  const backdropLayer: RenderableComponentData = {
    id: backdropLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 transform-gpu backdrop-blur-sm',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: animationDuration,
      },
    },
    childrenData: [backdropLayer, mainContentLayer, glowLayer],
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
  id: 'luxury-breathing-animation',
  title: 'Luxury Breathing Animation',
  description:
    'An elegant, sophisticated breathing animation inspired by luxury brand motion design and high-end video transitions. Features subtle scale animation (100% to 103-105%), opacity shifts (100% to 94%), gentle blur (0 to 0.8px), and a soft glow effect. The multi-layered approach creates a premium, polished feel with slow, deliberate timing (5.5 second cycles) and smooth ease-in-out easing throughout. Perfect for hero text reveals, brand presentations, and high-end content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'luxury',
    'premium',
    'breathing',
    'elegant',
    'sophisticated',
    'brand',
    'hero',
    'glow',
    'blur',
    'scale',
    'opacity',
  ],
  defaultInputParams: {
    content: 'LUXURY',
    duration: 5.5,
    fontSize: '72px',
    fontWeight: '300',
    textColor: '#FFFFFF',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    impact: 1,
    scaleMin: 1,
    scaleMax: 1.04,
    opacityMin: 0.94,
    opacityMax: 1,
    blurMax: 0.8,
    glowMaxSpread: 20,
    glowMaxOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const luxuryBreathingAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};