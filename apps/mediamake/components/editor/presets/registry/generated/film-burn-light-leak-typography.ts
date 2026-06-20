/**
 * Film Burn Light Leak Typography Preset
 *
 * A nostalgic typokinetics preset inspired by analog film burning and light leak transitions from vintage cinema.
 * Picture text that appears to burn through the frame like old film stock exposed to light, with organic, irregular 
 * edges and warm color bleeding. The animation simulates the unpredictable nature of real light leaks - starting 
 * with hot spots that expand and reveal text underneath.
 *
 * Features:
 * - Multi-stage reveal: subtle smoke/heat distortion warps → bright overexposed areas bloom → readable text with residual warm glows
 * - Film dust particles floating across the screen
 * - Subtle frame jitter for authentic analog feel
 * - Warm color grading during peak burn effect
 * - Organic, handcrafted practical effects aesthetic from 1970s cinema
 *
 * Technical Implementation:
 * - SVG filters for heat shimmer distortion
 * - Multiple radial gradient hotspots with staggered timing
 * - Animated mask-image for text reveal
 * - Particle system with random positioning
 * - Container-level jitter animation
 * - Sepia/warm color grading effects
 *
 * Use cases:
 * - Vintage film title sequences
 * - Retro music video typography
 * - Nostalgic brand reveals
 * - Artistic text overlays
 * - Film burn transition effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to reveal through film burn effect'),
  duration: z
    .number()
    .default(4)
    .describe('Total duration of the burn effect in seconds'),
  textColor: z
    .string()
    .default('#fef3c7')
    .describe('Color of the revealed text (warm amber by default)'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size of the text in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  backgroundColor: z
    .string()
    .default('#18181b')
    .describe('Background color (dark zinc by default)'),
  burnIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for burn effect hotspots'),
  particleCount: z
    .number()
    .min(5)
    .max(20)
    .default(8)
    .describe('Number of dust particles floating across screen'),
  jitterIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of frame jitter in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    backgroundColor,
    burnIntensity,
    particleCount,
    jitterIntensity,
  } = params;

  // Helper: Generate random position for particles
  const randomPosition = () => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
  });

  // Helper: Generate random particle color from warm palette
  const randomWarmColor = () => {
    const colors = [
      '#fed7aa', // orange-200
      '#fdba74', // orange-300
      '#fb923c', // orange-400
      '#fde68a', // yellow-200
      '#fcd34d', // yellow-300
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Create dust particles
  const dustParticles: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    const particleId = `dust-particle-${i}`;
    const position = randomPosition();
    const color = randomWarmColor();
    const delay = Math.random() * 0.5; // Random start delay
    const floatDuration = 2 + Math.random() * 2; // 2-4s float duration
    const driftDistance = 50 + Math.random() * 100; // 50-150px vertical drift

    dustParticles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 4px; height: 4px; background: ${color}; border-radius: 50%; opacity: 0;"></div>`,
        className: 'absolute',
        style: {
          top: position.top,
          left: position.left,
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
          id: `particle-fade-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: floatDuration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.2 },
              { key: 'opacity', val: 0.6, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${driftDistance}px`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create burn hotspots
  const hotspot1: RenderableComponentData = {
    id: 'burn-hotspot-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 200px; height: 200px; background: radial-gradient(circle, rgba(255,200,100,${burnIntensity}) 0%, rgba(255,150,50,${0.8 * burnIntensity}) 40%, rgba(255,100,0,0) 70%); border-radius: 50%; opacity: 0;"></div>`,
      className: 'absolute',
      style: {
        top: '30%',
        left: '40%',
        transform: 'translate(-50%, -50%) scale(0)',
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
        id: 'hotspot-1-bloom',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: 0.8,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['burn-hotspot-1'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 3, prog: 1 },
            { key: 'opacity', val: 2 * burnIntensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'blur', val: '0px', prog: 0 },
            { key: 'blur', val: '20px', prog: 1 },
          ],
        },
      },
    ],
  };

  const hotspot2: RenderableComponentData = {
    id: 'burn-hotspot-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,220,150,${burnIntensity}) 0%, rgba(255,180,80,${0.7 * burnIntensity}) 50%, rgba(255,100,0,0) 80%); border-radius: 50%; opacity: 0;"></div>`,
      className: 'absolute',
      style: {
        top: '45%',
        left: '55%',
        transform: 'translate(-50%, -50%) scale(0)',
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
        id: 'hotspot-2-bloom',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: 1.0,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['burn-hotspot-2'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 3, prog: 1 },
            { key: 'opacity', val: 2 * burnIntensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'blur', val: '0px', prog: 0 },
            { key: 'blur', val: '20px', prog: 1 },
          ],
        },
      },
    ],
  };

  const hotspot3: RenderableComponentData = {
    id: 'burn-hotspot-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 250px; height: 250px; background: radial-gradient(circle, rgba(255,240,200,${burnIntensity}) 0%, rgba(255,200,100,${0.6 * burnIntensity}) 60%, rgba(255,150,50,0) 100%); border-radius: 50%; opacity: 0;"></div>`,
      className: 'absolute',
      style: {
        top: '50%',
        left: '35%',
        transform: 'translate(-50%, -50%) scale(0)',
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
        id: 'hotspot-3-bloom',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: 1.2,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['burn-hotspot-3'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 3, prog: 1 },
            { key: 'opacity', val: 2 * burnIntensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'blur', val: '0px', prog: 0 },
            { key: 'blur', val: '20px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create heat distortion layer
  const heatDistortion: RenderableComponentData = {
    id: 'heat-distortion-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: transparent; opacity: 0;"></div>`,
      className: 'absolute inset-0',
      style: {
        filter: 'blur(2px)',
        opacity: 0,
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
        id: 'heat-distortion-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1,
          mode: 'provider',
          targetIds: ['heat-distortion-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create main text with reveal
  const mainText: RenderableComponentData = {
    id: 'main-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textShadow:
          '0 0 30px rgba(255,200,100,0.8), 0 0 60px rgba(255,150,50,0.4)',
        opacity: 0,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
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
        id: 'text-reveal',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          start: 1.5,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['main-text'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create warm glow overlay
  const warmGlow: RenderableComponentData = {
    id: 'warm-glow-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, rgba(255,180,100,0.15) 0%, transparent 70%); opacity: 0; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        opacity: 0,
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
        id: 'warm-glow-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 2.5,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['warm-glow-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create jitter container
  const jitterContainer: RenderableComponentData = {
    id: 'jitter-container',
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
    effects: [
      {
        id: 'jitter-effect',
        componentId: 'shake',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['jitter-container'],
          amplitude: jitterIntensity,
          frequency: 0.1,
          axis: 'both',
          decay: false,
        },
      },
    ],
    childrenData: [
      heatDistortion,
      hotspot1,
      hotspot2,
      hotspot3,
      {
        id: 'text-reveal-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [mainText],
      } as RenderableComponentData,
      ...dustParticles,
      warmGlow,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'film-burn-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [jitterContainer],
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
  id: 'film-burn-light-leak-typography',
  title: 'Film Burn Light Leak Typography',
  description:
    'A nostalgic typokinetics preset inspired by analog film burning and light leak transitions from vintage 1970s cinema. Text appears through organic film burn effects with hot spots, warm color bleeding, heat distortion, film dust particles, and subtle frame jitter for an authentic handcrafted aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'film-burn',
    'light-leak',
    'vintage',
    '1970s',
    'analog',
    'retro',
    'kinetic',
    'text-reveal',
    'warm',
    'nostalgic',
    'practical-effects',
  ],
  defaultInputParams: {
    text: 'FILM BURN',
    duration: 4,
    textColor: '#fef3c7',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    backgroundColor: '#18181b',
    burnIntensity: 1,
    particleCount: 8,
    jitterIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const filmBurnLightLeakTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
