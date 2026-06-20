/**
 * Glitch Typokinetic Text Reveal Preset
 *
 * A cyberpunk-inspired glitch text effect with corrupted Y-axis rotations, RGB channel separation,
 * opacity strobing, and digital scan lines. Text flickers into existence with stuttered hologram-like
 * stabilization effects, perfect for tech and futuristic content.
 *
 * Features:
 * - **Corrupted Y-axis Rotations**: Micro-rotations on Y-axis (-5deg to 5deg) for hologram effect
 * - **RGB Channel Separation**: Red/blue/green layers with different rotation values and blend modes
 * - **Opacity Strobing**: Non-linear fade-in: 0 → 100% → 30% → 100% → 80% → 100%
 * - **Digital Scan Lines**: Repeating gradient overlay that fades out as text stabilizes
 * - **X-axis Jitter**: Random translateX movements (-2px to 2px) during glitch phase
 * - **Cyberpunk Aesthetics**: Black background, screen blend modes, stuttered animations
 *
 * Use cases:
 * - Tech product reveals and launches
 * - Cyberpunk and futuristic content
 * - Gaming streams and esports overlays
 * - Digital art and creative tech videos
 * - Sci-fi themed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('GLITCH TEXT')
    .describe('Text content to display with glitch effect'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Orbitron')
    .optional()
    .describe('Font family (e.g., "Orbitron:700", "RobotoMono:600")'),
  duration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Total duration of glitch effect in seconds'),
  glitchDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Duration of the main glitch phase in seconds'),
  position: z
    .object({
      horizontal: z
        .enum(['left', 'center', 'right'])
        .default('center')
        .optional(),
      vertical: z.enum(['top', 'center', 'bottom']).default('center').optional(),
    })
    .default({ horizontal: 'center', vertical: 'center' })
    .optional()
    .describe('Position of text on screen'),
  rgbIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('RGB separation intensity multiplier'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse parameters
  const text = params.text;
  const fontSize = params.fontSize ?? 72;
  const glitchDuration = params.glitchDuration ?? 0.4;
  const totalDuration = params.duration ?? 0.5;
  const rgbIntensity = params.rgbIntensity ?? 1;
  const position = params.position ?? {
    horizontal: 'center',
    vertical: 'center',
  };

  // Parse font (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Orbitron';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontWeight = 700;
  if (fontString.includes(':')) {
    const parts = fontString.split(':');
    if (parts.length > 1) {
      fontWeight = parseInt(parts[1], 10) || 700;
    }
  }

  // Position classes
  const horizontalClass =
    position.horizontal === 'left'
      ? 'justify-start'
      : position.horizontal === 'right'
        ? 'justify-end'
        : 'justify-center';
  const verticalClass =
    position.vertical === 'top'
      ? 'items-start'
      : position.vertical === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Component IDs
  const rootContainerId = 'glitch-root-container';
  const scanlineOverlayId = 'scanline-overlay';
  const rgbContainerId = 'rgb-split-container';
  const textRedId = 'text-layer-red';
  const textGreenId = 'text-layer-green';
  const textBlueId = 'text-layer-blue';

  // RGB rotation values
  const redRotateStart = -5 * rgbIntensity;
  const blueRotateStart = 5 * rgbIntensity;

  // Create RGB rotation effects
  const redRotateEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: glitchDuration,
    mode: 'provider',
    targetIds: [textRedId],
    ranges: [
      { key: 'rotateY', val: redRotateStart, prog: 0 },
      { key: 'rotateY', val: 0, prog: 1 },
    ],
  };

  const greenRotateEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: glitchDuration,
    mode: 'provider',
    targetIds: [textGreenId],
    ranges: [
      { key: 'rotateY', val: 0, prog: 0 },
      { key: 'rotateY', val: 0, prog: 1 },
    ],
  };

  const blueRotateEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: glitchDuration,
    mode: 'provider',
    targetIds: [textBlueId],
    ranges: [
      { key: 'rotateY', val: blueRotateStart, prog: 0 },
      { key: 'rotateY', val: 0, prog: 1 },
    ],
  };

  // Opacity strobe effect (non-linear: 0 → 1 → 0.3 → 1 → 0.8 → 1)
  const opacityStrobeEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: glitchDuration,
    mode: 'provider',
    targetIds: [rgbContainerId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.15 },
      { key: 'opacity', val: 0.3, prog: 0.35 },
      { key: 'opacity', val: 1, prog: 0.6 },
      { key: 'opacity', val: 0.8, prog: 0.8 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // X-axis jitter effects for red and blue channels
  const jitterRedEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: glitchDuration,
    mode: 'provider',
    targetIds: [textRedId],
    ranges: [
      { key: 'translateX', val: -2, prog: 0 },
      { key: 'translateX', val: 1, prog: 0.2 },
      { key: 'translateX', val: -1, prog: 0.4 },
      { key: 'translateX', val: 2, prog: 0.6 },
      { key: 'translateX', val: -1, prog: 0.8 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  const jitterBlueEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: glitchDuration,
    mode: 'provider',
    targetIds: [textBlueId],
    ranges: [
      { key: 'translateX', val: 2, prog: 0 },
      { key: 'translateX', val: -1, prog: 0.2 },
      { key: 'translateX', val: 1, prog: 0.4 },
      { key: 'translateX', val: -2, prog: 0.6 },
      { key: 'translateX', val: 1, prog: 0.8 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Scanline fade-out effect
  const scanlineFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0.2,
    duration: glitchDuration - 0.2,
    mode: 'provider',
    targetIds: [scanlineOverlayId],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Create RGB text layers
  const textRedLayer = {
    id: textRedId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight.toString(),
        color: '#ff0000',
        mixBlendMode: 'screen',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${textRedId}-rotate`,
        componentId: 'generic',
        data: redRotateEffect,
      },
      {
        id: `${textRedId}-jitter`,
        componentId: 'generic',
        data: jitterRedEffect,
      },
    ],
  } as RenderableComponentData;

  const textGreenLayer = {
    id: textGreenId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight.toString(),
        color: '#00ff00',
        mixBlendMode: 'screen',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${textGreenId}-rotate`,
        componentId: 'generic',
        data: greenRotateEffect,
      },
    ],
  } as RenderableComponentData;

  const textBlueLayer = {
    id: textBlueId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight.toString(),
        color: '#0000ff',
        mixBlendMode: 'screen',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${textBlueId}-rotate`,
        componentId: 'generic',
        data: blueRotateEffect,
      },
      {
        id: `${textBlueId}-jitter`,
        componentId: 'generic',
        data: jitterBlueEffect,
      },
    ],
  } as RenderableComponentData;

  // RGB container with opacity strobe
  const rgbContainer = {
    id: rgbContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textRedLayer, textGreenLayer, textBlueLayer],
    effects: [
      {
        id: `${rgbContainerId}-opacity`,
        componentId: 'generic',
        data: opacityStrobeEffect,
      },
    ],
  } as RenderableComponentData;

  // Scanline overlay
  const scanlineOverlay = {
    id: scanlineOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.03) 3px)',
          opacity: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: `${scanlineOverlayId}-fade`,
        componentId: 'generic',
        data: scanlineFadeEffect,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full bg-black overflow-hidden flex ${horizontalClass} ${verticalClass}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [scanlineOverlay, rgbContainer],
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
  id: 'glitch-typokinetic-preset',
  title: 'Glitch Typokinetic Text Reveal',
  description:
    'A cyberpunk-inspired glitch text preset featuring corrupted Y-axis rotations, RGB channel separation, opacity strobing, and digital scan lines. Text flickers into existence with stuttered hologram-like stabilization effects, perfect for tech and futuristic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'typokinetic',
    'cyberpunk',
    'rgb-split',
    'hologram',
    'tech',
    'futuristic',
    'reveal',
    'rotation',
    'strobe',
    'scanlines',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH TEXT',
    fontSize: 72,
    fontFamily: 'Orbitron:700',
    duration: 0.5,
    glitchDuration: 0.4,
    position: {
      horizontal: 'center',
      vertical: 'center',
    },
    rgbIntensity: 1,
  },
};

// Export preset
export const glitchTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
