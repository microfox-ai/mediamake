/**
 * Cinematic Text Drift Preset
 *
 * A minimalist typokinetics preset inspired by classic film title sequences.
 * Features an ultra-thin, refined text element that drifts horizontally across
 * the screen with imperceptible slowness, creating a meditative, cinematic quality.
 * 
 * The text floats like smoke in still air with a subtle opacity breathing effect
 * that gives it an organic, living quality without being distracting.
 *
 * Features:
 * - Ultra-slow horizontal drift animation (like a long dolly shot)
 * - Continuous translateX motion from off-screen right to off-screen left
 * - Perfect horizontal alignment throughout (no vertical drift)
 * - Subtle opacity pulse (98%-100%) for gentle "breathing" effect
 * - Clean overflow handling for smooth entry/exit
 * - GPU-accelerated transforms for smooth motion
 * - Configurable font, colors, and animation parameters
 *
 * Use cases:
 * - Film title sequences and credits
 * - Minimalist opening/closing text
 * - Meditative, slow-paced visual poetry
 * - Cinematic title cards
 * - Ambient text overlays for atmospheric content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .default('CINEMATIC DRIFT')
    .describe('Text content to display'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Helvetica Neue:100", "Inter:100:normal")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(400)
    .default(64)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  
  letterSpacing: z
    .string()
    .default('0.1em')
    .describe('Letter spacing (CSS value)'),
  
  textTransform: z
    .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
    .default('uppercase')
    .describe('Text transformation'),
  
  startX: z
    .number()
    .default(105)
    .describe('Starting X position (percentage, 105 = off-screen right)'),
  
  endX: z
    .number()
    .default(-105)
    .describe('Ending X position (percentage, -105 = off-screen left)'),
  
  duration: z
    .number()
    .min(5)
    .max(300)
    .default(60)
    .describe('Duration of the drift animation in seconds'),
  
  opacityMin: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.98)
    .describe('Minimum opacity for breathing effect'),
  
  opacityMax: z
    .number()
    .min(0.5)
    .max(1)
    .default(1)
    .describe('Maximum opacity for breathing effect'),
  
  breathingDuration: z
    .number()
    .min(1)
    .max(20)
    .default(8)
    .describe('Duration of one complete breathing cycle in seconds'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or rgba)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Helvetica Neue:100';
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

  // Create component IDs
  const rootId = 'cinematic-drift-container';
  const textId = 'drift-text';
  const driftEffectId = 'drift-effect';
  const breathingEffectId = 'breathing-effect';

  // Create horizontal drift effect (translateX from startX to endX)
  const driftEffect: GenericEffectData = {
    type: 'linear', // Linear easing for constant velocity
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateX', val: `${params.startX}%`, prog: 0 },
      { key: 'translateX', val: `${params.endX}%`, prog: 1 },
    ],
  };

  // Create subtle opacity breathing effect (oscillating pattern)
  const breathingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.breathingDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: params.opacityMax, prog: 0 },
      { key: 'opacity', val: params.opacityMin, prog: 0.5 },
      { key: 'opacity', val: params.opacityMax, prog: 1 },
    ],
  };

  // Create text atom data
  const textAtomData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: `${params.fontSize}px`,
      color: params.textColor,
      letterSpacing: params.letterSpacing,
      textTransform: params.textTransform as any,
      willChange: 'transform, opacity',
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight.toString()] }
        : {}),
    },
  };

  // Create text atom component
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: driftEffectId,
        componentId: 'generic',
        data: driftEffect,
      },
      {
        id: breathingEffectId,
        componentId: 'generic',
        data: breathingEffect,
      },
    ],
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
      repeatChildrenProps: {
        className: 'absolute top-1/2 left-1/2 -translate-y-1/2 whitespace-nowrap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
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
  id: 'cinematic-text-drift',
  title: 'Cinematic Text Drift',
  description:
    'A minimalist typokinetics preset inspired by classic film title sequences. Features an ultra-thin, refined text element that drifts horizontally across the screen with imperceptible slowness, creating a meditative, cinematic quality. The text floats like smoke in still air with a subtle opacity breathing effect that gives it an organic, living quality without being distracting.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'cinematic',
    'drift',
    'minimalist',
    'slow-motion',
    'title-sequence',
    'film',
    'ambient',
    'meditative',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CINEMATIC DRIFT',
    font: 'Helvetica Neue:100',
    fontSize: 64,
    textColor: '#FFFFFF',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    startX: 105,
    endX: -105,
    duration: 60,
    opacityMin: 0.98,
    opacityMax: 1,
    breathingDuration: 8,
    backgroundColor: '#000000',
  },
};

// Export preset
export const cinematicTextDriftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
