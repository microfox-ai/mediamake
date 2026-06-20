/**
 * Action Impact Title Card Preset
 *
 * This preset recreates the visceral impact of action movie title cards with explosive light burst reveals.
 * Features kinetic text that punches through the frame with radial light explosions emanating from each letter's
 * center point. The animation hits hard and fast initially, then settles with aftershock vibrations.
 *
 * Features:
 * - **Explosive Impact Animation**: Text explodes onto screen with scale overshoot (0 → 1.15 → 0.98 → 1)
 * - **Radial Light Bursts**: Multiple radial gradient explosions emanating from text center points
 * - **Shockwave Ripple**: Expanding circular shockwave that distorts background momentarily
 * - **Aftershock Vibrations**: Rapid micro-movements (±3px) after initial impact for percussive feel
 * - **Dynamic Lens Flares**: Streaking linear gradient flares across frame during impact
 * - **Particle Debris**: 15-20 light fragments scattering from impact points with random trajectories
 * - **Elastic Tension**: Text overshoots final position then snaps back with spring physics
 * - **Cinematic Quality**: Professional-grade timing and easing for movie-quality reveals
 *
 * Use cases:
 * - Action movie title cards
 * - High-energy brand reveals
 * - Sports event intros
 * - Gaming content titles
 * - Explosive product launches
 * - Trailer title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('IMPACT')
    .describe('Main title text to display with impact animation'),
  fontSize: z
    .number()
    .min(50)
    .max(300)
    .default(120)
    .describe('Font size in pixels for the title text'),
  fontFamily: z
    .string()
    .default('Inter:900')
    .describe(
      'Font family with optional weight (e.g., "Inter:900", "Roboto:700")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the title text (hex or rgba)'),
  impactDuration: z
    .number()
    .min(0.2)
    .max(1.0)
    .default(0.3)
    .describe('Duration of initial impact phase in seconds'),
  overshootScale: z
    .number()
    .min(1.05)
    .max(1.3)
    .default(1.15)
    .describe('Maximum scale during overshoot phase'),
  aftershockDuration: z
    .number()
    .min(0.2)
    .max(0.5)
    .default(0.3)
    .describe('Duration of aftershock vibration phase in seconds'),
  aftershockIntensity: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Intensity of aftershock vibrations in pixels'),
  burstCount: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of radial light burst explosions'),
  burstDuration: z
    .number()
    .min(0.4)
    .max(1.0)
    .default(0.6)
    .describe('Duration of radial burst animations in seconds'),
  particleCount: z
    .number()
    .min(10)
    .max(30)
    .default(15)
    .describe('Number of particle debris fragments'),
  shockwaveDuration: z
    .number()
    .min(0.5)
    .max(1.2)
    .default(0.8)
    .describe('Duration of shockwave expansion in seconds'),
  lensFlareCount: z
    .number()
    .min(1)
    .max(4)
    .default(2)
    .describe('Number of lens flare streaks'),
  totalDuration: z
    .number()
    .min(1.5)
    .max(5.0)
    .default(2.0)
    .describe('Total duration of the entire title card animation'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    impactDuration,
    overshootScale,
    aftershockDuration,
    aftershockIntensity,
    burstCount,
    burstDuration,
    particleCount,
    shockwaveDuration,
    lensFlareCount,
    totalDuration,
  } = params;

  // Parse font family and weight
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

  const { fontFamily: parsedFontFamily, fontStyle } =
    parseFontString(fontFamily);

  // Generate unique IDs
  const containerId = 'impact-root-container';
  const textId = 'impact-text';
  const shockwaveId = 'shockwave-ring';

  // Create radial burst elements
  const createRadialBursts = () => {
    const bursts: RenderableComponentData[] = [];
    const burstPositions = [
      { left: '40%', top: '50%' },
      { left: '50%', top: '50%' },
      { left: '60%', top: '50%' },
      { left: '45%', top: '45%' },
      { left: '55%', top: '55%' },
    ];

    for (let i = 0; i < burstCount; i++) {
      const position = burstPositions[i % burstPositions.length];
      const burstId = `radial-burst-${i}`;
      const staggerDelay = i * 0.05;

      bursts.push({
        id: burstId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 150px; height: 150px; background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%); border-radius: 50%;"></div>`,
          className: 'absolute',
          style: {
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: staggerDelay,
            duration: burstDuration,
          },
        },
        effects: [
          {
            id: `burst-${i}-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: burstDuration,
              mode: 'provider',
              targetIds: [burstId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 3, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'blur', val: 0, prog: 0 },
                { key: 'blur', val: 10, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return bursts;
  };

  // Create particle debris
  const createParticles = () => {
    const particles: RenderableComponentData[] = [];
    const trajectories = [
      { x: -180, y: -120 },
      { x: 200, y: -80 },
      { x: -100, y: 150 },
      { x: 160, y: 100 },
      { x: -220, y: 50 },
      { x: 120, y: -160 },
      { x: -50, y: -200 },
      { x: 250, y: 30 },
      { x: -280, y: -40 },
      { x: 80, y: 180 },
      { x: -150, y: 90 },
      { x: 190, y: -110 },
      { x: -30, y: 140 },
      { x: 300, y: -20 },
      { x: -200, y: -70 },
    ];

    for (let i = 0; i < particleCount; i++) {
      const particleId = `particle-${i}`;
      const trajectory = trajectories[i % trajectories.length];
      const size = 4 + Math.floor((i % 3) * 2);
      const staggerDelay = 0.06 + (i % 5) * 0.02;
      const particleDuration = 0.8 + (i % 4) * 0.1;

      particles.push({
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: white; border-radius: 50%;"></div>`,
          className: 'absolute',
          style: {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: staggerDelay,
            duration: particleDuration,
          },
        },
        effects: [
          {
            id: `particle-${i}-trajectory`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: trajectory.x, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: trajectory.y, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.3 + (i % 3) * 0.2, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Create lens flares
  const createLensFlares = () => {
    const flares: RenderableComponentData[] = [];
    const flareConfigs = [
      {
        width: 300,
        height: 4,
        top: '48%',
        gradient:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
        delay: 0.1,
        duration: 0.4,
      },
      {
        width: 200,
        height: 3,
        top: '52%',
        gradient:
          'linear-gradient(90deg, transparent 0%, rgba(200,220,255,0.7) 50%, transparent 100%)',
        delay: 0.15,
        duration: 0.35,
      },
      {
        width: 250,
        height: 4,
        top: '50%',
        gradient:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
        delay: 0.12,
        duration: 0.38,
      },
      {
        width: 180,
        height: 2,
        top: '49%',
        gradient:
          'linear-gradient(90deg, transparent 0%, rgba(255,200,200,0.5) 50%, transparent 100%)',
        delay: 0.18,
        duration: 0.32,
      },
    ];

    for (let i = 0; i < lensFlareCount; i++) {
      const config = flareConfigs[i % flareConfigs.length];
      const flareId = `lens-flare-${i}`;

      flares.push({
        id: flareId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${config.width}px; height: ${config.height}px; background: ${config.gradient};"></div>`,
          className: 'absolute',
          style: {
            top: config.top,
            left: `-${config.width}px`,
          },
        },
        context: {
          timing: {
            start: config.delay,
            duration: config.duration,
          },
        },
        effects: [
          {
            id: `flare-${i}-streak`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: config.duration,
              mode: 'provider',
              targetIds: [flareId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 1920, prog: 1 },
                { key: 'opacity', val: 0.9, prog: 0 },
                { key: 'opacity', val: 0.9, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return flares;
  };

  // Create main text with impact animation
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontStyle.fontWeight || 900,
        color: textColor,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        textShadow:
          '0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(255,255,255,0.3)',
      },
      font: {
        family: parsedFontFamily,
        weights: fontStyle.fontWeight ? [String(fontStyle.fontWeight)] : ['900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Main impact entrance with spring overshoot
      {
        id: 'text-impact-entrance',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: impactDuration + 0.5,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: overshootScale, prog: 0.4 },
            { key: 'scale', val: 0.98, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.15 },
          ],
        },
      },
      // Aftershock vibrations
      {
        id: 'text-aftershock',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: impactDuration,
          duration: aftershockDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: aftershockIntensity, prog: 0.1 },
            { key: 'translateX', val: -aftershockIntensity * 0.7, prog: 0.2 },
            { key: 'translateX', val: aftershockIntensity * 0.7, prog: 0.35 },
            { key: 'translateX', val: -aftershockIntensity * 0.3, prog: 0.5 },
            { key: 'translateX', val: aftershockIntensity * 0.3, prog: 0.7 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -aftershockIntensity * 0.7, prog: 0.15 },
            { key: 'translateY', val: aftershockIntensity * 0.7, prog: 0.3 },
            { key: 'translateY', val: -aftershockIntensity * 0.3, prog: 0.55 },
            { key: 'translateY', val: aftershockIntensity * 0.3, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create shockwave
  const shockwaveComponent: RenderableComponentData = {
    id: shockwaveId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 200%; height: 200%; border: 4px solid rgba(255,255,255,0.3); border-radius: 50%;"></div>',
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      style: {
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0.1,
        duration: shockwaveDuration,
      },
    },
    effects: [
      {
        id: 'shockwave-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: shockwaveDuration,
          mode: 'provider',
          targetIds: [shockwaveId],
          ranges: [
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 2, prog: 1 },
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Assemble all children
  const radialBursts = createRadialBursts();
  const particles = createParticles();
  const lensFlares = createLensFlares();

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Shockwave layer (behind everything)
      {
        id: 'shockwave-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [shockwaveComponent],
      },
      // Radial bursts layer
      {
        id: 'radial-burst-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: radialBursts,
      },
      // Particle layer
      {
        id: 'particle-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: particles,
      },
      // Lens flare layer
      {
        id: 'lens-flare-container',
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
            duration: totalDuration,
          },
        },
        childrenData: lensFlares,
      },
      // Main text layer (on top)
      {
        id: 'main-text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [textComponent],
      },
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'actionImpactTitleCard',
  title: 'Action Impact Title Card',
  description:
    'Cinematic typokinetic preset recreating action movie title card reveals with explosive light bursts, shockwave ripples, particle debris, lens flares, and elastic overshoot text animation. Features percussive impact timing with aftershock vibrations for visceral, high-energy reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'action',
    'impact',
    'explosion',
    'kinetic',
    'shockwave',
    'particles',
    'lens-flare',
    'overshoot',
    'cinematic',
    'movie',
    'trailer',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'IMPACT',
    fontSize: 120,
    fontFamily: 'Inter:900',
    textColor: '#ffffff',
    impactDuration: 0.3,
    overshootScale: 1.15,
    aftershockDuration: 0.3,
    aftershockIntensity: 3,
    burstCount: 3,
    burstDuration: 0.6,
    particleCount: 15,
    shockwaveDuration: 0.8,
    lensFlareCount: 2,
    totalDuration: 2.0,
  },
};

// --- Export ---
export const actionImpactTitleCardPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        default: 'IMPACT',
        description: 'Main title text to display with impact animation',
      },
      fontSize: {
        type: 'number',
        minimum: 50,
        maximum: 300,
        default: 120,
        description: 'Font size in pixels for the title text',
      },
      fontFamily: {
        type: 'string',
        default: 'Inter:900',
        description:
          'Font family with optional weight (e.g., "Inter:900", "Roboto:700")',
      },
      textColor: {
        type: 'string',
        default: '#ffffff',
        description: 'Color of the title text (hex or rgba)',
      },
      impactDuration: {
        type: 'number',
        minimum: 0.2,
        maximum: 1.0,
        default: 0.3,
        description: 'Duration of initial impact phase in seconds',
      },
      overshootScale: {
        type: 'number',
        minimum: 1.05,
        maximum: 1.3,
        default: 1.15,
        description: 'Maximum scale during overshoot phase',
      },
      aftershockDuration: {
        type: 'number',
        minimum: 0.2,
        maximum: 0.5,
        default: 0.3,
        description: 'Duration of aftershock vibration phase in seconds',
      },
      aftershockIntensity: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        default: 3,
        description: 'Intensity of aftershock vibrations in pixels',
      },
      burstCount: {
        type: 'number',
        minimum: 1,
        maximum: 5,
        default: 3,
        description: 'Number of radial light burst explosions',
      },
      burstDuration: {
        type: 'number',
        minimum: 0.4,
        maximum: 1.0,
        default: 0.6,
        description: 'Duration of radial burst animations in seconds',
      },
      particleCount: {
        type: 'number',
        minimum: 10,
        maximum: 30,
        default: 15,
        description: 'Number of particle debris fragments',
      },
      shockwaveDuration: {
        type: 'number',
        minimum: 0.5,
        maximum: 1.2,
        default: 0.8,
        description: 'Duration of shockwave expansion in seconds',
      },
      lensFlareCount: {
        type: 'number',
        minimum: 1,
        maximum: 4,
        default: 2,
        description: 'Number of lens flare streaks',
      },
      totalDuration: {
        type: 'number',
        minimum: 1.5,
        maximum: 5.0,
        default: 2.0,
        description: 'Total duration of the entire title card animation',
      },
    },
    required: [],
    additionalProperties: false,
  },
};
