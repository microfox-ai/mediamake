/**
 * Retro Arcade Neon Glow Text Preset
 *
 * A vintage arcade-style neon glow effect for text featuring authentic 60Hz flicker,
 * voltage fluctuations, chromatic aberration, hot spots, and segmented neon tube appearance.
 * Creates the nostalgic look of degraded neon signage on an old arcade cabinet with charming imperfections.
 *
 * Features:
 * - **Authentic 60Hz Flicker**: Rapid opacity keyframes looped over short intervals (0.048s cycle)
 * - **Voltage Fluctuations**: Random opacity drops at specific timestamps to simulate power surges
 * - **Chromatic Aberration**: Multiple text-shadow layers with offset colors (hot pink + electric blue)
 * - **Hot Spots**: Radial gradient overlays positioned at text edges for brighter neon burn areas
 * - **Segmented Glow**: Repeating linear gradient overlay to simulate individual neon tube segments
 * - **GPU Acceleration**: Transform: translateZ(0) for reduced flicker jank
 *
 * Use cases:
 * - Creating retro arcade-style title cards
 * - Building vintage neon signage effects
 * - Adding nostalgic CRT/neon aesthetic to videos
 * - Simulating degraded neon tube lighting
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  BaseLayoutData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().default('ARCADE').describe('Text to display with neon glow effect'),
  duration: z.number().default(10).describe('Duration of the text display in seconds'),
  neonColor: z
    .enum(['hotPink', 'electricBlue'])
    .default('hotPink')
    .describe('Primary neon color: hotPink (255,20,147) or electricBlue (30,144,255)'),
  flickerIntensity: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.92)
    .describe('Intensity of 60Hz flicker (0.5-1, lower = more flicker)'),
  voltageFluctuations: z
    .boolean()
    .default(true)
    .describe('Enable random voltage fluctuation effects'),
  hotSpots: z
    .boolean()
    .default(true)
    .describe('Enable hot spot overlays at text edges'),
  segmentedGlow: z
    .boolean()
    .default(true)
    .describe('Enable segmented neon tube appearance'),
  fontSize: z
    .string()
    .default('7rem')
    .describe('Font size for the text (e.g., "7rem", "120px")'),
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Press Start 2P:400")'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Press Start 2P';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Determine neon colors based on selection
  const neonColors =
    params.neonColor === 'hotPink'
      ? {
          primary: 'rgba(255,20,147,1)', // Hot pink
          primaryText: 'rgb(255,107,147)',
          secondary: 'rgba(30,144,255,0.3)', // Electric blue (secondary)
          shadow1: 'rgba(255,20,147,0.5)',
          shadow2: 'rgba(30,144,255,0.3)',
          glow1: 'rgba(255,20,147,0.8)',
          glow2: 'rgba(255,20,147,0.6)',
          glow3: 'rgba(255,20,147,0.4)',
          hotSpot: 'rgba(255,20,147,0.4)',
          segment: 'rgba(255,20,147,0.1)',
        }
      : {
          primary: 'rgba(30,144,255,1)', // Electric blue
          primaryText: 'rgb(100,180,255)',
          secondary: 'rgba(255,20,147,0.3)', // Hot pink (secondary)
          shadow1: 'rgba(30,144,255,0.5)',
          shadow2: 'rgba(255,20,147,0.3)',
          glow1: 'rgba(30,144,255,0.8)',
          glow2: 'rgba(30,144,255,0.6)',
          glow3: 'rgba(30,144,255,0.4)',
          hotSpot: 'rgba(30,144,255,0.4)',
          segment: 'rgba(30,144,255,0.1)',
        };

  // Create text atom ID for targeting
  const textAtomId = 'neon-text-atom';

  // Text shadow for chromatic aberration and glow
  const textShadow = `2px 2px 4px ${neonColors.shadow1}, -2px -2px 4px ${neonColors.shadow2}, 0 0 20px ${neonColors.glow1}, 0 0 40px ${neonColors.glow2}, 0 0 60px ${neonColors.glow3}`;

  // Create 60Hz flicker effect
  const flickerEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: params.flickerIntensity, prog: 0.016 / params.duration },
      { key: 'opacity', val: 1, prog: 0.032 / params.duration },
      { key: 'opacity', val: params.flickerIntensity, prog: 0.048 / params.duration },
      // Loop pattern throughout duration
      { key: 'opacity', val: 1, prog: 0.064 / params.duration },
      { key: 'opacity', val: params.flickerIntensity, prog: 0.08 / params.duration },
      { key: 'opacity', val: 1, prog: 0.096 / params.duration },
      { key: 'opacity', val: params.flickerIntensity, prog: 0.112 / params.duration },
      { key: 'opacity', val: 1, prog: 0.128 / params.duration },
      // Continue subtle flicker throughout
      { key: 'opacity', val: 0.96, prog: 0.2 },
      { key: 'opacity', val: 1, prog: 0.21 },
      { key: 'opacity', val: 0.94, prog: 0.4 },
      { key: 'opacity', val: 1, prog: 0.41 },
      { key: 'opacity', val: 0.97, prog: 0.6 },
      { key: 'opacity', val: 1, prog: 0.61 },
      { key: 'opacity', val: 0.95, prog: 0.8 },
      { key: 'opacity', val: 1, prog: 0.81 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Create voltage fluctuation effects
  const voltageEffects: GenericEffectData[] = [];
  if (params.voltageFluctuations && params.duration > 3) {
    // Random voltage drops at specific intervals
    const fluctuationTimes = [
      { time: params.duration * 0.23, intensity: 0.6 },
      { time: params.duration * 0.57, intensity: 0.7 },
      { time: params.duration * 0.78, intensity: 0.65 },
    ];

    fluctuationTimes.forEach((fluc, index) => {
      if (fluc.time < params.duration - 0.2) {
        voltageEffects.push({
          type: 'linear',
          start: fluc.time,
          duration: 0.1,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: fluc.intensity, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        });
      }
    });
  }

  // Combine all effects
  const allEffects = [
    {
      id: 'neon-flicker-effect',
      componentId: 'generic',
      data: flickerEffect,
    },
    ...voltageEffects.map((effect, index) => ({
      id: `voltage-fluctuation-${index}`,
      componentId: 'generic',
      data: effect,
    })),
  ];

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // Main text atom
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-7xl font-black uppercase tracking-wider',
      style: {
        color: neonColors.primaryText,
        textShadow: textShadow,
        transform: 'translateZ(0)', // GPU acceleration
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
        subsets: ['latin'],
        display: 'swap',
        preload: true,
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: allEffects,
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'neon-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center w-full h-full',
        style: {
          transform: 'translateZ(0)',
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
  };

  childrenData.push(textContainer);

  // Hot spot overlays
  if (params.hotSpots) {
    const hotSpot1: RenderableComponentData = {
      id: 'hot-spot-overlay-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `radial-gradient(ellipse 15% 30% at 10% 50%, ${neonColors.hotSpot} 0%, transparent 70%)`,
            mixBlendMode: 'screen',
          },
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [],
    };

    const hotSpot2: RenderableComponentData = {
      id: 'hot-spot-overlay-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `radial-gradient(ellipse 20% 25% at 90% 50%, ${neonColors.hotSpot} 0%, transparent 70%)`,
            mixBlendMode: 'screen',
          },
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [],
    };

    childrenData.push(hotSpot1, hotSpot2);
  }

  // Segmented glow overlay
  if (params.segmentedGlow) {
    const segmentedOverlay: RenderableComponentData = {
      id: 'segmented-glow-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `repeating-linear-gradient(90deg, transparent 0px, transparent 8px, ${neonColors.segment} 8px, ${neonColors.segment} 10px)`,
            mixBlendMode: 'overlay',
            opacity: 0.6,
          },
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [],
    };

    childrenData.push(segmentedOverlay);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-arcade-neon-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black p-8',
        style: {
          isolation: 'isolate',
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: childrenData,
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
  id: 'retro-arcade-neon-glow',
  title: 'Retro Arcade Neon Glow Text',
  description:
    'A vintage arcade-style neon glow effect for text featuring authentic 60Hz flicker, voltage fluctuations, chromatic aberration, hot spots, and segmented neon tube appearance. Creates the nostalgic look of degraded neon signage on an old arcade cabinet with charming imperfections.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'glow',
    'retro',
    'arcade',
    'vintage',
    'flicker',
    'effects',
    'chromatic-aberration',
    'crt',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ARCADE',
    duration: 10,
    neonColor: 'hotPink',
    flickerIntensity: 0.92,
    voltageFluctuations: true,
    hotSpots: true,
    segmentedGlow: true,
    fontSize: '7rem',
    font: 'Press Start 2P:400',
  },
};

export const retroArcadeNeonGlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
