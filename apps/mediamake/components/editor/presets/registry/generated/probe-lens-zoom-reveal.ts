/**
 * Probe Lens Zoom Reveal Preset
 *
 * This preset simulates the unique perspective of a probe/laowa lens that can get impossibly close
 * to subjects. The text emerges from within itself - imagine the camera traveling through the
 * letterforms themselves.
 *
 * Features:
 * - **Extreme Scale Animation**: Starts at 20x magnification focused on center of text
 * - **Exponential Zoom-Out**: Smooth exponential ease-out from 20x to 1x over 2 seconds
 * - **Dynamic Radial Blur**: Heavy blur on edges (15px) that gradually sharpens (0px)
 * - **Particle Light Streaks**: Multiple particle streaks pass by to simulate movement through space
 * - **Organic Rotation**: Subtle rotation from 3deg to 0 for natural camera movement
 * - **Radial Vignette**: Dark vignette overlay for depth perception
 *
 * Use cases:
 * - Dramatic product reveals with extreme close-up effect
 * - Title sequences with immersive zoom-out animation
 * - Logo reveals that emerge from microscopic scale
 * - Cinematic text introductions with probe lens aesthetic
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('REVEAL')
    .describe('Text content to display with probe lens zoom reveal'),

  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(120)
    .describe('Font size in pixels for the main text'),

  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family for the text (e.g., "Inter", "Roboto", "BebasNeue")',
    ),

  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "normal", "bold", "700")'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text in hex format'),

  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Duration of the zoom reveal animation in seconds'),

  initialScale: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Initial zoom scale (20x = extreme close-up)'),

  maxBlur: z
    .number()
    .min(0)
    .max(30)
    .default(15)
    .describe('Maximum blur radius at the start (in pixels)'),

  rotationAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Initial rotation amount in degrees for organic movement'),

  particleCount: z
    .number()
    .min(4)
    .max(20)
    .default(8)
    .describe('Number of particle light streaks passing by'),

  vignetteOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Opacity of the radial vignette overlay (0-1)'),
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
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    duration,
    initialScale,
    maxBlur,
    rotationAmount,
    particleCount,
    vignetteOpacity,
  } = params;

  // Helper function to generate random particle positions
  const generateParticleData = (index: number, total: number) => {
    // Seed-based random for consistency
    const seed = index * 137.508; // Golden angle for distribution
    const topPercent = ((seed % 100) + 10) % 90; // 10-90%
    const leftPercent = ((seed * 1.618) % 100 + 5) % 90; // 5-90%
    const widthOptions = [16, 20, 24, 28, 32]; // w-16, w-20, w-24, w-28, w-32
    const width = widthOptions[index % widthOptions.length];
    const opacity = 0.4 + (index % 5) * 0.1; // 0.4-0.8
    const blur = 0.5 + (index % 4) * 0.5; // 0.5-2.5px
    const delay = (index / total) * 0.2; // Stagger start times
    const speed = 1 + (index % 3) * 0.3; // Varying speeds

    return {
      top: `${topPercent}%`,
      left: `${leftPercent}%`,
      width: `${width * 4}px`, // Convert to pixels (w-16 = 64px)
      opacity,
      blur: `${blur}px`,
      delay,
      speed,
    };
  };

  // Generate particle streak components
  const particleStreaks: RenderableComponentData[] = [];

  for (let i = 0; i < particleCount; i++) {
    const particleData = generateParticleData(i, particleCount);
    const particleId = `particle-streak-${i + 1}`;

    // Particle streak component
    const particleStreak: RenderableComponentData = {
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="h-px bg-white"></div>',
        className: 'absolute',
        style: {
          top: particleData.top,
          left: particleData.left,
          width: particleData.width,
          opacity: particleData.opacity,
          filter: `blur(${particleData.blur})`,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `particle-streak-${i + 1}-effect`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: particleData.delay,
            duration: duration - particleData.delay,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              // Move horizontally across screen
              {
                key: 'translateX',
                val: -200 * particleData.speed,
                prog: 0,
              },
              {
                key: 'translateX',
                val: 200 * particleData.speed,
                prog: 1,
              },
              // Fade in and out
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: particleData.opacity, prog: 0.1 },
              { key: 'opacity', val: particleData.opacity, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    particleStreaks.push(particleStreak);
  }

  // Particle layer container
  const particleLayer: RenderableComponentData = {
    id: 'particle-layer',
    type: 'layout' as const,
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
    childrenData: particleStreaks,
  };

  // Vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(circle at center, transparent 30%, rgba(0,0,0,${vignetteOpacity * 0.4}) 70%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Text content component
  const textContentId = 'text-content';
  const textContent: RenderableComponentData = {
    id: textContentId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center',
        transformOrigin: 'center center',
        willChange: 'transform, filter',
      },
      className: 'absolute inset-0 flex items-center justify-center',
      font: {
        family: fontFamily,
        weights: [fontWeight === 'bold' ? '700' : '400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'probe-zoom-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textContentId],
          ranges: [
            // Zoom from extreme close-up to normal
            { key: 'scale', val: initialScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur from heavy to sharp
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            // Subtle rotation for organic movement
            { key: 'rotate', val: rotationAmount, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'probe-lens-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full overflow-hidden bg-gradient-radial from-transparent to-black/30',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      vignetteOverlay,
      particleLayer,
      textContent,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'probe-lens-zoom-reveal',
  title: 'Probe Lens Zoom Reveal',
  description:
    'A probe/laowa lens-style zoom reveal that simulates extreme close-up perspective. Text emerges from within itself as the camera pulls back from 20x magnification. Features exponential zoom-out animation, dynamic radial blur using CSS filters, particle light streaks with parallax depth, and subtle rotation for organic movement. Perfect for dramatic product reveals, title sequences, and immersive text introductions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'zoom',
    'reveal',
    'probe-lens',
    'laowa',
    'cinematic',
    'macro',
    'particles',
    'blur',
    'dramatic',
    'immersive',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'REVEAL',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    textColor: '#ffffff',
    duration: 2,
    initialScale: 20,
    maxBlur: 15,
    rotationAmount: 3,
    particleCount: 8,
    vignetteOpacity: 0.7,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const probeLensZoomRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: JSON.parse(JSON.stringify(z.toJSONSchema(presetParams))),
};
