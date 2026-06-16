/**
 * Risograph Print Registration Error Text Effect Preset
 *
 * This preset creates an authentic risograph print aesthetic with intentional
 * misregistration between color separations (cyan, magenta, purple). Features
 * include coarse grain texture, halftone dot patterns, minimal mechanical shake,
 * and sequential color layer reveals simulating the drum printing process.
 *
 * Features:
 * - **Color Separations**: 3 overlapping text layers (cyan, magenta, purple)
 * - **Misregistration**: Intentional offset between layers for authentic riso look
 * - **Grain Texture**: Coarser noise pattern simulating riso printing
 * - **Halftone Dots**: Characteristic dot pattern overlay
 * - **Mechanical Shake**: Minimal vibration effects
 * - **Sequential Reveal**: Layers appear one at a time like actual printing
 * - **Color Bleeding**: Subtle blur at edges where layers overlap
 * - **Registration Drift**: Slow position drift over time
 *
 * Use cases:
 * - Creating vintage print aesthetics
 * - Adding authentic analog texture to titles
 * - Simulating printing process artifacts
 * - Artistic text effects for creative projects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with riso effect'),
  duration: z
    .number()
    .min(1)
    .default(8)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .default(96)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('Inter:900')
    .describe('Font family with weight (e.g., "Inter:900", "Roboto:700")'),
  cyanOffset: z
    .object({
      x: z.number().default(2).describe('Horizontal offset in pixels'),
      y: z.number().default(-2).describe('Vertical offset in pixels'),
    })
    .optional()
    .default({ x: 2, y: -2 })
    .describe('Offset for cyan layer'),
  magentaOffset: z
    .object({
      x: z.number().default(-2).describe('Horizontal offset in pixels'),
      y: z.number().default(2).describe('Vertical offset in pixels'),
    })
    .optional()
    .default({ x: -2, y: 2 })
    .describe('Offset for magenta layer'),
  purpleOffset: z
    .object({
      x: z.number().default(0).describe('Horizontal offset in pixels'),
      y: z.number().default(0).describe('Vertical offset in pixels'),
    })
    .optional()
    .default({ x: 0, y: 0 })
    .describe('Offset for purple layer'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Intensity of mechanical shake effect (0-5)'),
  driftIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Intensity of registration drift effect (0-5)'),
  grainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Opacity of grain texture overlay (0-1)'),
  halftoneOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Opacity of halftone dot pattern (0-1)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 900;

  // Base text style
  const baseTextStyle = {
    fontSize: `${params.fontSize}px`,
    fontWeight: fontWeight,
    fontFamily: fontFamily,
  };

  // Color layer offsets
  const cyanOffset = params.cyanOffset || { x: 2, y: -2 };
  const magentaOffset = params.magentaOffset || { x: -2, y: 2 };
  const purpleOffset = params.purpleOffset || { x: 0, y: 0 };

  // Shake and drift intensities
  const shakeIntensity = params.shakeIntensity ?? 1;
  const driftIntensity = params.driftIntensity ?? 1;

  // Create text layers with sequential timing
  const cyanLayerId = 'riso-text-layer-cyan';
  const magentaLayerId = 'riso-text-layer-magenta';
  const purpleLayerId = 'riso-text-layer-purple';

  // Cyan layer (appears first)
  const cyanLayer = {
    id: cyanLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute inset-0 flex items-center justify-center text-cyan-500',
      style: {
        ...baseTextStyle,
        mixBlendMode: 'multiply' as const,
        transform: `translate(${cyanOffset.x}px, ${cyanOffset.y}px)`,
        filter: 'blur(0.5px)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [],
  };

  // Magenta layer (appears second)
  const magentaLayer = {
    id: magentaLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute inset-0 flex items-center justify-center text-pink-500',
      style: {
        ...baseTextStyle,
        mixBlendMode: 'multiply' as const,
        transform: `translate(${magentaOffset.x}px, ${magentaOffset.y}px)`,
        filter: 'blur(0.5px)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0.3,
        duration: params.duration - 0.3,
      },
    },
    effects: [],
  };

  // Purple layer (appears third)
  const purpleLayer = {
    id: purpleLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute inset-0 flex items-center justify-center text-purple-600 opacity-80',
      style: {
        ...baseTextStyle,
        mixBlendMode: 'multiply' as const,
        transform: `translate(${purpleOffset.x}px, ${purpleOffset.y}px)`,
        filter: 'blur(0.5px)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0.6,
        duration: params.duration - 0.6,
      },
    },
    effects: [],
  };

  // Halftone pattern overlay
  const halftoneOverlay = {
    id: 'riso-halftone-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: radial-gradient(circle, black 1px, transparent 1px); background-size: 4px 4px; opacity: ${params.halftoneOpacity}; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Grain texture overlay
  const grainOverlay = {
    id: 'riso-grain-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background-image: url('data:image/svg+xml,%3Csvg viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noiseFilter\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"2.5\\" numOctaves=\\"4\\" stitchTiles=\\"stitch\\"/%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noiseFilter)\\"/%3E%3C/svg%3E'); opacity: ${params.grainOpacity}; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Create fade-in effects for each layer
  const fadeInCyan = {
    id: 'riso-fade-in-cyan',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: 0.5,
      mode: 'provider' as const,
      targetIds: [cyanLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  const fadeInMagenta = {
    id: 'riso-fade-in-magenta',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: 0.5,
      mode: 'provider' as const,
      targetIds: [magentaLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  const fadeInPurple = {
    id: 'riso-fade-in-purple',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: 0.5,
      mode: 'provider' as const,
      targetIds: [purpleLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Create shake effects (minimal mechanical vibration)
  const createShakeEffect = (
    targetId: string,
    effectId: string,
    startTime: number,
    xOffset: number,
    yOffset: number,
  ) => ({
    id: effectId,
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: startTime,
      duration: 0.2,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: xOffset * shakeIntensity, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: yOffset * shakeIntensity, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  });

  // Create drift effects (slow registration drift)
  const createDriftEffect = (
    targetId: string,
    effectId: string,
    startTime: number,
    duration: number,
    xDrift: number,
    yDrift: number,
  ) => ({
    id: effectId,
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: startTime,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: xDrift * driftIntensity, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: yDrift * driftIntensity, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  });

  // Apply effects to layers
  cyanLayer.effects = [
    fadeInCyan,
    createShakeEffect(cyanLayerId, 'riso-shake-cyan-1', 0.5, 1, -0.5),
    createShakeEffect(cyanLayerId, 'riso-shake-cyan-2', 0.9, -1, 0.5),
    createDriftEffect(cyanLayerId, 'riso-drift-cyan', 1.5, 3, 2, -1),
  ];

  magentaLayer.effects = [
    fadeInMagenta,
    createShakeEffect(magentaLayerId, 'riso-shake-magenta-1', 0.6, -1, 0.5),
    createShakeEffect(magentaLayerId, 'riso-shake-magenta-2', 1.0, 1, -0.5),
    createDriftEffect(magentaLayerId, 'riso-drift-magenta', 2, 3.5, -1.5, 2),
  ];

  purpleLayer.effects = [
    fadeInPurple,
    createShakeEffect(purpleLayerId, 'riso-shake-purple-1', 0.8, 0.5, 0.5),
    createShakeEffect(purpleLayerId, 'riso-shake-purple-2', 1.2, -0.5, -0.5),
    createDriftEffect(purpleLayerId, 'riso-drift-purple', 2.5, 4, 1, 1.5),
  ];

  // Root container
  const rootContainer = {
    id: 'riso-print-text-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-yellow-50',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      cyanLayer,
      magentaLayer,
      purpleLayer,
      halftoneOverlay,
      grainOverlay,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'risoPrintTextEffect',
  title: 'Risograph Print Registration Error Text Effect',
  description:
    'A charming riso print aesthetic with intentional misregistration between color layers (cyan, magenta, purple), coarse grain texture, halftone dot patterns, minimal mechanical shake, and sequential color layer reveals that simulate the drum printing process',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'riso',
    'risograph',
    'print',
    'vintage',
    'analog',
    'texture',
    'grain',
    'halftone',
    'misregistration',
    'color-separation',
    'glitch',
    'artistic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RISO PRINT',
    duration: 8,
    fontSize: 96,
    font: 'Inter:900',
    cyanOffset: { x: 2, y: -2 },
    magentaOffset: { x: -2, y: 2 },
    purpleOffset: { x: 0, y: 0 },
    shakeIntensity: 1,
    driftIntensity: 1,
    grainOpacity: 0.15,
    halftoneOpacity: 0.1,
  },
};

// Export preset
export const risoPrintTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
