/**
 * Aurora Borealis Text Glow Preset
 *
 * Creates an atmospheric aurora borealis-inspired neon glow effect that dances and shifts
 * around text outlines like the northern lights. Features ethereal curtains of colored light
 * that wave and ripple around letterforms, with gradients that slowly shift through green,
 * blue, purple, and pink hues.
 *
 * The glow includes:
 * - Vertical wave motion that travels horizontally across the text
 * - Subtle particle effects that float upward like light ions
 * - Natural intensity ebb and flow with moments of brilliant color and softer glows
 * - Occasional 'solar flare' moments where the entire effect brightens dramatically
 *
 * Features:
 * - Multiple aurora curtain layers with independent animations
 * - Animated gradient rotation and wave motion
 * - Multi-layer text shadows that shift through aurora colors
 * - Floating particle effects with upward drift
 * - Solar flare brightness pulses
 * - Customizable text, colors, intensity, and timing
 *
 * Use cases:
 * - Creating mystical title cards
 * - Adding atmospheric text effects for sci-fi or fantasy content
 * - Building ethereal branding elements
 * - Creating mesmerizing text overlays for videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('{{text}}')
    .describe('Text to display with aurora effect'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .string()
    .default('6rem')
    .describe('Font size for the text (e.g., "6rem", "72px")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('300')
    .describe('Font weight (e.g., "300", "400", "700")'),
  textColor: z
    .string()
    .default('rgba(255, 255, 255, 0.9)')
    .describe('Base text color'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall effect intensity multiplier'),
  auroraSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for aurora animations'),
  particleCount: z
    .number()
    .min(0)
    .max(20)
    .default(6)
    .describe('Number of floating particles'),
  solarFlareEnabled: z
    .boolean()
    .default(true)
    .describe('Enable occasional solar flare brightness pulses'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    intensity,
    auroraSpeed,
    particleCount,
    solarFlareEnabled,
  } = params;

  // Generate unique IDs
  const rootId = 'aurora-root';
  const curtain1Id = 'aurora-curtain-1';
  const curtain2Id = 'aurora-curtain-2';
  const curtain3Id = 'aurora-curtain-3';
  const particleLayerId = 'particle-layer';
  const textContainerId = 'text-glow-container';
  const textId = 'aurora-text';
  const solarFlareId = 'solar-flare-overlay';

  // Calculate animation durations based on speed
  const curtain1Duration = 7 / auroraSpeed;
  const curtain2Duration = 9 / auroraSpeed;
  const curtain3Duration = 11 / auroraSpeed;
  const particleBaseDuration = 8 / auroraSpeed;

  // Generate particle components
  const generateParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    const positions = [10, 25, 45, 60, 78, 90];
    const colors = [
      'rgba(255, 255, 255, 0.3)',
      'rgba(0, 255, 100, 0.4)',
      'rgba(0, 100, 255, 0.35)',
      'rgba(100, 0, 255, 0.3)',
      'rgba(255, 0, 100, 0.35)',
      'rgba(0, 255, 255, 0.3)',
    ];

    for (let i = 0; i < Math.min(particleCount, 6); i++) {
      const particleId = `particle-${i + 1}`;
      const particleDuration = particleBaseDuration + i * 0.5;
      const particleDelay = (i * 0.4) % particleDuration;

      particles.push({
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 4px; height: 4px; background: ${colors[i]}; border-radius: 50%; filter: blur(1px);"></div>`,
          style: {
            position: 'absolute',
            left: `${positions[i]}%`,
            bottom: '0%',
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
            id: `${particleId}-float`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: particleDelay,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -1000, prog: 1 },
              ],
            },
          },
          {
            id: `${particleId}-drift`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: particleDelay,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateX', val: -20, prog: 0 },
                { key: 'translateX', val: 20, prog: 0.5 },
                { key: 'translateX', val: -20, prog: 1 },
              ],
            },
          },
          {
            id: `${particleId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: particleDelay,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.1 },
                { key: 'opacity', val: 1, prog: 0.9 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Build particle layer
  const particleLayer: RenderableComponentData = {
    id: particleLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: generateParticles(),
  };

  // Aurora curtain effects
  const curtain1Effects = [
    {
      id: `${curtain1Id}-rotate`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: curtain1Duration,
        mode: 'provider',
        targetIds: [curtain1Id],
        ranges: [{ key: 'rotate', val: 0, prog: 0 }, { key: 'rotate', val: 360, prog: 1 }],
      },
    },
    {
      id: `${curtain1Id}-skew`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 4,
        mode: 'provider',
        targetIds: [curtain1Id],
        ranges: [
          { key: 'skewY', val: -3, prog: 0 },
          { key: 'skewY', val: 3, prog: 0.5 },
          { key: 'skewY', val: -3, prog: 1 },
        ],
      },
    },
  ];

  const curtain2Effects = [
    {
      id: `${curtain2Id}-rotate`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: curtain2Duration,
        mode: 'provider',
        targetIds: [curtain2Id],
        ranges: [{ key: 'rotate', val: 15, prog: 0 }, { key: 'rotate', val: 375, prog: 1 }],
      },
    },
    {
      id: `${curtain2Id}-skew`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 4.5,
        mode: 'provider',
        targetIds: [curtain2Id],
        ranges: [
          { key: 'skewY', val: 2, prog: 0 },
          { key: 'skewY', val: -2, prog: 0.5 },
          { key: 'skewY', val: 2, prog: 1 },
        ],
      },
    },
  ];

  const curtain3Effects = [
    {
      id: `${curtain3Id}-rotate`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: curtain3Duration,
        mode: 'provider',
        targetIds: [curtain3Id],
        ranges: [{ key: 'rotate', val: -10, prog: 0 }, { key: 'rotate', val: 350, prog: 1 }],
      },
    },
    {
      id: `${curtain3Id}-skew`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 5,
        mode: 'provider',
        targetIds: [curtain3Id],
        ranges: [
          { key: 'skewY', val: 1, prog: 0 },
          { key: 'skewY', val: -4, prog: 0.5 },
          { key: 'skewY', val: 1, prog: 1 },
        ],
      },
    },
  ];

  // Text glow effects - color cycling
  const textGlowEffect = {
    id: `${textId}-glow`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: 6,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        {
          key: 'textShadow',
          val: `0 0 ${20 * intensity}px rgba(0, 255, 100, ${0.4 * intensity}), 0 0 ${40 * intensity}px rgba(0, 255, 100, ${0.2 * intensity}), 0 0 ${60 * intensity}px rgba(0, 100, 255, ${0.15 * intensity})`,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 ${20 * intensity}px rgba(100, 0, 255, ${0.4 * intensity}), 0 0 ${40 * intensity}px rgba(100, 0, 255, ${0.2 * intensity}), 0 0 ${60 * intensity}px rgba(255, 0, 100, ${0.15 * intensity})`,
          prog: 0.33,
        },
        {
          key: 'textShadow',
          val: `0 0 ${20 * intensity}px rgba(255, 0, 100, ${0.4 * intensity}), 0 0 ${40 * intensity}px rgba(255, 0, 100, ${0.2 * intensity}), 0 0 ${60 * intensity}px rgba(0, 200, 255, ${0.15 * intensity})`,
          prog: 0.66,
        },
        {
          key: 'textShadow',
          val: `0 0 ${20 * intensity}px rgba(0, 255, 100, ${0.4 * intensity}), 0 0 ${40 * intensity}px rgba(0, 255, 100, ${0.2 * intensity}), 0 0 ${60 * intensity}px rgba(0, 100, 255, ${0.15 * intensity})`,
          prog: 1,
        },
      ],
    },
  };

  // Solar flare effect
  const solarFlareEffects = solarFlareEnabled
    ? [
        {
          id: `${solarFlareId}-brightness`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 12,
            mode: 'provider',
            targetIds: [rootId],
            ranges: [
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 1.5 * intensity, prog: 0.08 },
              { key: 'brightness', val: 1, prog: 0.16 },
              { key: 'brightness', val: 1, prog: 0.5 },
              { key: 'brightness', val: 1.5 * intensity, prog: 0.58 },
              { key: 'brightness', val: 1, prog: 0.66 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
      ]
    : [];

  // Build composition
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-gray-950 to-blue-950 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: solarFlareEffects,
    childrenData: [
      {
        id: curtain1Id,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 opacity-60 mix-blend-screen',
            style: {
              background:
                'linear-gradient(0deg, transparent, rgba(0,255,100,0.3), rgba(0,100,255,0.3), transparent)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: curtain1Effects,
      } as RenderableComponentData,
      {
        id: curtain2Id,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 opacity-50 mix-blend-screen',
            style: {
              background:
                'linear-gradient(15deg, transparent, rgba(100,0,255,0.25), rgba(0,200,150,0.25), transparent)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: curtain2Effects,
      } as RenderableComponentData,
      {
        id: curtain3Id,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 opacity-40 mix-blend-screen',
            style: {
              background:
                'linear-gradient(-10deg, transparent, rgba(255,0,100,0.2), rgba(0,150,255,0.2), transparent)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: curtain3Effects,
      } as RenderableComponentData,
      particleLayer,
      {
        id: textContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center z-10',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          {
            id: textId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: text,
              className: 'relative',
              style: {
                fontSize: fontSize,
                fontWeight: fontWeight,
                letterSpacing: '0.1em',
                color: textColor,
                textShadow: `0 0 ${20 * intensity}px rgba(0, 255, 100, ${0.4 * intensity}), 0 0 ${40 * intensity}px rgba(0, 255, 100, ${0.2 * intensity}), 0 0 ${60 * intensity}px rgba(0, 100, 255, ${0.15 * intensity})`,
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
            effects: [textGlowEffect],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'aurora-borealis-text-glow',
  title: 'Aurora Borealis Text Glow',
  description:
    'An atmospheric northern lights-inspired neon glow effect that dances and shifts around text. Features ethereal curtains of colored light with gradients shifting through green, blue, purple, and pink hues, vertical wave motion, floating particle effects, natural intensity ebbs and flows, and occasional solar flare brightness moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glow',
    'aurora',
    'northern-lights',
    'neon',
    'atmospheric',
    'particles',
    'gradient',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: '{{text}}',
    duration: 10,
    fontSize: '6rem',
    fontFamily: 'Inter',
    fontWeight: '300',
    textColor: 'rgba(255, 255, 255, 0.9)',
    intensity: 1,
    auroraSpeed: 1,
    particleCount: 6,
    solarFlareEnabled: true,
  },
};

export const auroraBorealisTextGlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
