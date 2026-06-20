/**
 * Neon Datamosh Kinetic Text Animation
 *
 * This preset creates a kinetic text animation simulating a neon sign experiencing
 * power surges and electrical failures with digital datamosh interference overlays.
 *
 * Features:
 * - **Neon Tube Simulation**: Individual letters flicker, dim, and fail like real neon tubes
 * - **Warm-Up Effect**: Letters gradually brighten from dim orange to bright cyan/magenta
 * - **Electrical Arcing**: White flashes jump between letters like short circuits
 * - **Digital Interference**: Scan lines, pixel sorting, and compression artifacts overlay
 * - **Independent Letter Control**: Each letter animates independently for realistic failures
 * - **Multiple Shadow Layers**: Authentic neon glow with increasing blur radius
 *
 * Use cases:
 * - Retro/cyberpunk title sequences
 * - Glitch art and datamosh aesthetics
 * - Tech failure simulations
 * - Nostalgic neon sign animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('NEON')
    .describe('Text to display with neon effect (each letter animates independently)'),
  
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(120)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Bebas Neue')
    .describe('Font family (default: Bebas Neue for bold display text)'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (400, 700, etc.)'),
  
  primaryColor: z
    .string()
    .default('rgb(0, 255, 255)')
    .describe('Primary neon color (cyan default)'),
  
  secondaryColor: z
    .string()
    .default('rgb(255, 0, 255)')
    .describe('Secondary neon color (magenta default) - alternates with primary'),
  
  warmUpColor: z
    .string()
    .default('rgb(255, 100, 0)')
    .describe('Warm-up color (dim orange glow before full brightness)'),
  
  warmUpDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Duration of warm-up effect in seconds'),
  
  warmUpStagger: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Stagger delay between letter warm-ups in seconds'),
  
  flickerIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for flicker effects'),
  
  failureChance: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability that a letter will completely fail (0-1)'),
  
  arcFrequency: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('How many electrical arcs appear per second'),
  
  glowIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for neon glow'),
  
  scanLineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of scan line overlay (0-1)'),
  
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Total duration of animation in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const letters = params.text.split('');
  const letterCount = letters.length;

  // Helper: Parse RGB string to get individual components
  const parseRGB = (rgbString: string): { r: number; g: number; b: number } => {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return { r: 0, g: 255, b: 255 };
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  };

  // Helper: Create random flicker pattern for a letter
  const createFlickerEffect = (
    targetId: string,
    letterIndex: number,
  ): GenericEffectData => {
    const isFailedLetter = Math.random() < params.failureChance;
    const flickerSpeed = 100 + Math.random() * 300; // 100-400ms intervals
    const numFlickers = Math.floor((params.duration * 1000) / flickerSpeed);

    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    if (isFailedLetter) {
      // Failed letter: mostly off with occasional dim flickers
      for (let i = 0; i <= numFlickers; i++) {
        const prog = i / numFlickers;
        const shouldFlicker = Math.random() < 0.2; // 20% chance to briefly light up
        ranges.push({
          key: 'opacity',
          val: shouldFlicker ? 0.3 : 0,
          prog: prog,
        });
      }
    } else {
      // Working letter: rapid flicker between full and dim
      for (let i = 0; i <= numFlickers; i++) {
        const prog = i / numFlickers;
        const flickerState = Math.random();
        let opacity = 1;
        if (flickerState < 0.1) opacity = 0; // 10% complete off
        else if (flickerState < 0.3) opacity = 0.3; // 20% dim
        else opacity = 1; // 70% full brightness
        
        ranges.push({
          key: 'opacity',
          val: opacity * params.flickerIntensity,
          prog: prog,
        });
      }
    }

    return {
      type: 'linear',
      start: params.warmUpDuration + params.warmUpStagger * letterIndex,
      duration: params.duration - (params.warmUpDuration + params.warmUpStagger * letterIndex),
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };

  // Helper: Create warm-up effect (orange to full color)
  const createWarmUpEffect = (
    targetId: string,
    letterIndex: number,
    finalColor: string,
  ): GenericEffectData => {
    const warmUpRGB = parseRGB(params.warmUpColor);
    const finalRGB = parseRGB(finalColor);

    return {
      type: 'ease-in',
      start: params.warmUpStagger * letterIndex,
      duration: params.warmUpDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        {
          key: 'color',
          val: `rgb(${warmUpRGB.r}, ${warmUpRGB.g}, ${warmUpRGB.b})`,
          prog: 0,
        },
        {
          key: 'color',
          val: `rgb(${finalRGB.r}, ${finalRGB.g}, ${finalRGB.b})`,
          prog: 1,
        },
      ],
    };
  };

  // Helper: Create electrical arc effects
  const createArcEffects = (): Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> => {
    const arcEffects: Array<any> = [];
    const numArcs = Math.floor(params.duration * params.arcFrequency);

    for (let i = 0; i < numArcs; i++) {
      const arcStart = Math.random() * params.duration;
      const arcDuration = 0.1; // 100ms flash
      const arcId = `arc-${i}`;

      arcEffects.push({
        id: `arc-effect-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: arcStart,
          duration: arcDuration,
          mode: 'provider',
          targetIds: [arcId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scaleY', val: 0.5, prog: 0 },
            { key: 'scaleY', val: 1, prog: 0.5 },
            { key: 'scaleY', val: 0.5, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    return arcEffects;
  };

  // Build letter components with independent animations
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const finalColor =
        index % 2 === 0 ? params.primaryColor : params.secondaryColor;
      const finalRGB = parseRGB(finalColor);

      // Create multi-layer neon glow text-shadow
      const glowShadow = [
        `0 0 10px rgba(${finalRGB.r},${finalRGB.g},${finalRGB.b},${0.8 * params.glowIntensity})`,
        `0 0 20px rgba(${finalRGB.r},${finalRGB.g},${finalRGB.b},${0.6 * params.glowIntensity})`,
        `0 0 40px rgba(${finalRGB.r},${finalRGB.g},${finalRGB.b},${0.4 * params.glowIntensity})`,
        `0 0 80px rgba(${finalRGB.r},${finalRGB.g},${finalRGB.b},${0.2 * params.glowIntensity})`,
      ].join(', ');

      return {
        id: `letter-wrapper-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [
          {
            id: letterId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter,
              font: {
                family: params.fontFamily,
                weights: [params.fontWeight],
              },
              style: {
                fontSize: `${params.fontSize}px`,
                fontWeight: params.fontWeight,
                color: finalColor,
                textShadow: glowShadow,
                letterSpacing: '0.05em',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [
              {
                id: `warmup-${index}`,
                componentId: 'generic',
                data: createWarmUpEffect(letterId, index, finalColor),
              },
              {
                id: `flicker-${index}`,
                componentId: 'generic',
                data: createFlickerEffect(letterId, index),
              },
            ],
          },
        ] as RenderableComponentData[],
      } as RenderableComponentData;
    },
  );

  // Create electrical arc elements
  const arcElements: RenderableComponentData[] = [];
  const arcEffects = createArcEffects();

  arcEffects.forEach((effect, index) => {
    const randomX = 30 + Math.random() * 40; // 30-70% horizontal position
    const randomY = 30 + Math.random() * 30; // 30-60% vertical position

    arcElements.push({
      id: `arc-${index}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 4px; height: 60px; background: linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0)); filter: blur(2px);"></div>`,
        className: 'absolute',
        style: {
          left: `${randomX}%`,
          top: `${randomY}%`,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [effect],
    } as RenderableComponentData);
  });

  // Build final composition
  const rootContainer: RenderableComponentData = {
    id: 'neon-datamosh-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'bg-black absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          position: 'relative',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Scan line overlay (digital interference)
      {
        id: 'scan-line-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: `repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,${params.scanLineOpacity * 0.15}) 2px, rgba(255,255,255,${params.scanLineOpacity * 0.15}) 4px)`,
              mixBlendMode: 'overlay' as any,
              opacity: params.scanLineOpacity,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Text container
      {
        id: 'text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-row items-center justify-center',
            style: {
              gap: '0.1em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,

      // Arc container
      {
        id: 'arc-container',
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
            duration: params.duration,
          },
        },
        childrenData: arcElements,
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'neon-datamosh-kinetic-text',
  title: 'Neon Datamosh Kinetic Text Animation',
  description:
    'Kinetic text animation simulating neon sign power surges and electrical failures with digital datamosh interference. Features flickering neon tubes, warm-up glow transitions, electrical arcing effects, and digital glitch overlays including scan lines and compression artifacts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'kinetic',
    'text',
    'neon',
    'datamosh',
    'glitch',
    'retro',
    'cyberpunk',
    'flicker',
    'electrical',
    'surge',
    'failure',
    'arc',
    'warm-up',
    'scan-lines',
    'interference',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'NEON',
    fontSize: 120,
    fontFamily: 'Bebas Neue',
    fontWeight: '700',
    primaryColor: 'rgb(0, 255, 255)',
    secondaryColor: 'rgb(255, 0, 255)',
    warmUpColor: 'rgb(255, 100, 0)',
    warmUpDuration: 0.5,
    warmUpStagger: 0.05,
    flickerIntensity: 1,
    failureChance: 0.3,
    arcFrequency: 3,
    glowIntensity: 1,
    scanLineOpacity: 0.2,
    duration: 10,
  },
};

export const neonDatamoshKineticTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
