/**
 * Mimeograph Machine Text Effect Preset
 *
 * This preset creates an authentic spirit duplicator text effect with distinctive purple-ink aesthetic,
 * uneven ink density, wet ink shine that gradually dries, mechanical drum-like shake, ink bleeding around edges,
 * random ink spots and smudges, and rolling reveal animation simulating a rotating duplicator drum.
 *
 * Features:
 * - Distinctive purple-blue ink color (#7E22CE, #6B21A8) with opacity variations
 * - Uneven ink density using multiple text-shadow layers
 * - Wet ink shine effect that gradually fades over 2 seconds
 * - Mechanical drum shake (2-3 Hz oscillation, ±2-3px amplitude)
 * - Ink bleeding effect (blur filter)
 * - Random ink spots scattered around the composition
 * - Ink smudges near text edges
 * - Rolling reveal animation (circular clip-path expand)
 * - Paper texture overlay for authenticity
 *
 * Use cases:
 * - Retro/vintage title cards
 * - Nostalgic office aesthetic
 * - Educational content about historical printing methods
 * - Artistic text effects with analog feel
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  text: z
    .string()
    .default('MIMEOGRAPH')
    .describe('Text to display with mimeograph effect'),
  font: z
    .string()
    .default('Playfair Display:700')
    .describe(
      'Font family with optional weight and style (e.g., "Playfair Display:700", "Georgia:400:italic")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(80)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#7E22CE')
    .describe('Base purple ink color (e.g., "#7E22CE")'),
  backgroundColor: z
    .string()
    .default('#F9FAFB')
    .describe('Background color (e.g., "#F9FAFB" for gray-50)'),
  duration: z
    .number()
    .min(2)
    .max(20)
    .default(6)
    .describe('Total duration in seconds'),
  rollingRevealDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration of rolling reveal animation in seconds'),
  wetShineDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration of wet shine drying effect in seconds'),
  mechanicalShakeAmplitude: z
    .number()
    .min(0)
    .max(10)
    .default(2.5)
    .describe('Amplitude of mechanical shake in pixels'),
  inkSpotCount: z
    .number()
    .min(0)
    .max(20)
    .default(6)
    .describe('Number of random ink spots to generate'),
  inkSmudgeCount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Number of ink smudges to generate'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Playfair Display:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Generate random ink spot positions
  const generateInkSpotPosition = (index: number) => {
    // Pseudo-random but deterministic based on index
    const seedX = (index * 37 + 13) % 100;
    const seedY = (index * 73 + 29) % 100;
    return {
      top: `${15 + (seedY % 70)}%`,
      left: `${10 + (seedX % 80)}%`,
    };
  };

  // Helper: Generate random ink smudge positions
  const generateInkSmudgePosition = (index: number) => {
    const positions = [
      { top: '48%', left: '15%', width: '60px', height: '8px', skewX: '-12deg' },
      { top: '52%', right: '20%', width: '45px', height: '10px', skewX: '15deg' },
      { bottom: '40%', left: '50%', width: '50px', height: '7px', skewX: '-8deg', transform: 'skewX(-8deg) translateX(-50%)' },
    ];
    return positions[index % positions.length];
  };

  // Generate ink spots
  const inkSpots: RenderableComponentData[] = [];
  for (let i = 0; i < params.inkSpotCount; i++) {
    const position = generateInkSpotPosition(i);
    const size = i % 2 === 0 ? 'w-2 h-2' : 'w-3 h-3';
    const opacity = 20 + (i % 3) * 5; // 20, 25, 30
    const delay = i * 0.08; // Staggered delays

    inkSpots.push({
      id: `ink-spot-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: `${size} bg-purple-800/${opacity} rounded-full blur-sm`,
        style: {
          position: 'absolute',
          top: position.top,
          left: position.left,
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
          id: `spot-${i}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: 0.2,
            mode: 'provider',
            targetIds: [`ink-spot-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Generate ink smudges
  const inkSmudges: RenderableComponentData[] = [];
  for (let i = 0; i < params.inkSmudgeCount; i++) {
    const position = generateInkSmudgePosition(i);
    const opacity = 15 + (i % 2) * 3; // 15, 18
    const delay = 0.8 + i * 0.1; // Staggered delays

    inkSmudges.push({
      id: `ink-smudge-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: `bg-purple-800/${opacity} blur-md`,
        style: {
          position: 'absolute',
          ...position,
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
          id: `smudge-${i}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: 0.3,
            mode: 'provider',
            targetIds: [`ink-smudge-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create mechanical shake effect (sine wave oscillation)
  const shakeKeyframes = [];
  const shakeFrequency = 2.5; // Hz
  const shakeAmplitude = params.mechanicalShakeAmplitude;
  const shakeDuration = params.duration - params.rollingRevealDuration;
  const shakeSteps = 16; // Number of keyframes for smooth oscillation

  for (let i = 0; i <= shakeSteps; i++) {
    const prog = i / shakeSteps;
    const phase = prog * 2 * Math.PI * shakeFrequency * (shakeDuration / params.duration);
    const yOffset = Math.sin(phase) * shakeAmplitude;
    shakeKeyframes.push({ key: 'translateY', val: yOffset, prog });
  }

  // Text atom with mimeograph styling
  const textAtomId = 'mimeograph-text';
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-purple-800 opacity-90 font-serif font-bold',
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        textShadow: `0 0 2px rgba(126, 34, 206, 0.4), 1px 1px 3px rgba(126, 34, 206, 0.2), 0 0 8px rgba(126, 34, 206, 0.15)`,
        filter: 'blur(0.8px)',
        letterSpacing: '0.02em',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Rolling reveal animation
      {
        id: 'text-rolling-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.rollingRevealDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
          ],
        },
      },
      // Ink bleeding effect
      {
        id: 'text-ink-bleed',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.rollingRevealDuration + 0.2,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'filter', val: 'blur(2px)', prog: 0 },
            { key: 'filter', val: 'blur(0.8px)', prog: 1 },
          ],
        },
      },
      // Mechanical shake
      {
        id: 'text-mechanical-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: params.rollingRevealDuration,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: shakeKeyframes,
        },
      },
    ],
  } as RenderableComponentData;

  // Wet shine overlay
  const wetShineOverlay: RenderableComponentData = {
    id: 'wet-shine-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='position: absolute; inset: 0; background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%); pointer-events: none;'></div>",
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
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
        id: 'wet-shine-drying',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: params.rollingRevealDuration,
          duration: params.wetShineDuration,
          mode: 'provider',
          targetIds: ['wet-shine-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'mimeograph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: params.backgroundColor,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px)',
          backgroundBlendMode: 'multiply',
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
      // Ink spots layer
      {
        id: 'ink-spots-layer',
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
        childrenData: inkSpots,
      } as RenderableComponentData,
      // Text container
      {
        id: 'text-container',
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
            duration: params.duration,
          },
        },
        childrenData: [textAtom],
      } as RenderableComponentData,
      // Ink smudges layer
      {
        id: 'ink-smudges-layer',
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
        childrenData: inkSmudges,
      } as RenderableComponentData,
      // Wet shine overlay
      wetShineOverlay,
    ],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'mimeographTextEffect',
  title: 'Mimeograph Machine Text Effect',
  description:
    'Authentic spirit duplicator text effect with purple-ink aesthetic, uneven ink density, wet ink shine that gradually dries, mechanical drum-like shake, ink bleeding around edges, random ink spots and smudges, and rolling reveal animation simulating a rotating duplicator drum.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effect',
    'mimeograph',
    'spirit-duplicator',
    'purple-ink',
    'vintage',
    'retro',
    'analog',
    'ink-bleeding',
    'mechanical-shake',
    'rolling-reveal',
    'wet-shine',
  ],
  defaultInputParams: {
    text: 'MIMEOGRAPH',
    font: 'Playfair Display:700',
    fontSize: 80,
    textColor: '#7E22CE',
    backgroundColor: '#F9FAFB',
    duration: 6,
    rollingRevealDuration: 1,
    wetShineDuration: 2,
    mechanicalShakeAmplitude: 2.5,
    inkSpotCount: 6,
    inkSmudgeCount: 3,
  },
  dependencies: {},
};

// --- Export Preset ---

export const mimeographTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z
    .object({
      text: z.string(),
      font: z.string(),
      fontSize: z.number(),
      textColor: z.string(),
      backgroundColor: z.string(),
      duration: z.number(),
      rollingRevealDuration: z.number(),
      wetShineDuration: z.number(),
      mechanicalShakeAmplitude: z.number(),
      inkSpotCount: z.number(),
      inkSmudgeCount: z.number(),
    })
    .toJSON(),
};
