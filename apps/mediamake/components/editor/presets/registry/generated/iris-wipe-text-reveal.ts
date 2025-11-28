/**
 * Iris Wipe Text Reveal Preset
 *
 * A cinematic typokinetic preset where text reveals through an iris wipe effect from center,
 * simulating a camera aperture opening. Features smooth clipPath animation from circle(0%) to circle(75%),
 * with subtle scale (0.95 to 1), blur (2px to 0px), and depth effects on the text for a professional
 * film title reveal aesthetic.
 *
 * Features:
 * - Circular mask expansion from center (iris wipe)
 * - Smooth edge feathering
 * - Text scale and blur animation simulating depth of field
 * - Cinematic film title reveal effect
 * - Customizable expansion duration and timing
 * - Optional glow layer for depth ambiance
 *
 * Use cases:
 * - Film title reveals
 * - Professional video intros
 * - Cinematic text transitions
 * - Documentary title sequences
 * - High-end brand videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  title: z
    .string()
    .default('CINEMATIC REVEAL')
    .describe('Text to reveal with iris wipe effect'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .string()
    .optional()
    .default('clamp(48px, 8vw, 120px)')
    .describe('Font size (responsive clamp recommended)'),
  
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color'),
  
  backgroundColor: z
    .string()
    .optional()
    .default('#000000')
    .describe('Background color'),
  
  irisDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Duration of iris expansion animation in seconds'),
  
  textSharpDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Delay before text sharpens (blur to clear) in seconds'),
  
  textSharpDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.3)
    .optional()
    .describe('Duration of text sharpening animation in seconds'),
  
  maxIrisRadius: z
    .number()
    .min(50)
    .max(100)
    .default(75)
    .optional()
    .describe('Maximum iris radius as percentage (75 = circle(75%))'),
  
  enableGlow: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable radial glow layer for depth ambiance'),
  
  glowOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .optional()
    .describe('Maximum opacity of glow layer'),
  
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .optional()
    .describe('Total duration of the effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
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

  // Component IDs
  const rootId = 'iris-wipe-root';
  const textLayerId = 'iris-text-layer';
  const textId = 'iris-main-text';
  const glowLayerId = 'iris-glow-layer';

  // Timing parameters
  const irisDuration = params.irisDuration ?? 1.5;
  const textSharpDelay = params.textSharpDelay ?? 0.2;
  const textSharpDuration = params.textSharpDuration ?? 1.3;
  const totalDuration = params.duration ?? 5;
  const maxIrisRadius = params.maxIrisRadius ?? 75;
  const enableGlow = params.enableGlow ?? true;
  const glowOpacity = params.glowOpacity ?? 0.05;

  // Iris expansion effect (clipPath animation)
  const irisEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: irisDuration,
    mode: 'provider',
    targetIds: [textLayerId],
    ranges: [
      { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
      { key: 'clipPath', val: `circle(${maxIrisRadius}% at 50% 50%)`, prog: 1 },
    ],
  };

  // Text scale effect (subtle zoom in as revealed)
  const textScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: textSharpDelay,
    duration: textSharpDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'scale', val: 0.95, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Text blur effect (depth of field simulation)
  const textBlurEffect: GenericEffectData = {
    type: 'ease-out',
    start: textSharpDelay,
    duration: textSharpDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'filter', val: 'blur(2px)', prog: 0 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  };

  // Glow layer fade-in effect (optional)
  const glowEffect: GenericEffectData = {
    type: 'ease-in',
    start: 0.5,
    duration: 1.0,
    mode: 'provider',
    targetIds: [glowLayerId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: glowOpacity, prog: 1 },
    ],
  };

  // Build text layer (with iris clip-path)
  const textLayer: RenderableComponentData = {
    id: textLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(0% at 50% 50%)',
        },
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
        id: 'iris-expand-effect',
        componentId: 'generic',
        data: irisEffect,
      },
    ],
    childrenData: [
      {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.title,
          className: 'text-center',
          style: {
            fontSize: params.fontSize ?? 'clamp(48px, 8vw, 120px)',
            fontWeight: fontStyle.fontWeight ?? 700,
            color: params.textColor ?? '#ffffff',
            textShadow:
              '0 0 40px rgba(255, 255, 255, 0.3), 0 0 80px rgba(255, 255, 255, 0.1)',
            letterSpacing: '0.02em',
            ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : { weights: ['700'] }),
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
            id: 'text-scale-effect',
            componentId: 'generic',
            data: textScaleEffect,
          },
          {
            id: 'text-blur-effect',
            componentId: 'generic',
            data: textBlurEffect,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Build glow layer (optional)
  const glowLayer: RenderableComponentData = {
    id: glowLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: enableGlow
      ? [
          {
            id: 'glow-fade-effect',
            componentId: 'generic',
            data: glowEffect,
          },
        ]
      : [],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor ?? '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textLayer, glowLayer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'irisWipeTextReveal',
  title: 'Iris Wipe Text Reveal',
  description:
    'A cinematic typokinetic preset where text reveals through an iris wipe effect from center, simulating a camera aperture opening. Features smooth clipPath animation from circle(0%) to circle(75%), with subtle scale (0.95 to 1), blur (2px to 0px), and depth effects on the text for a professional film title reveal aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'iris',
    'wipe',
    'reveal',
    'cinematic',
    'title',
    'aperture',
    'clippath',
    'film',
    'depth-of-field',
    'professional',
  ],
  dependencies: {},
  defaultInputParams: {
    title: 'CINEMATIC REVEAL',
    font: 'Inter:700',
    fontSize: 'clamp(48px, 8vw, 120px)',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    irisDuration: 1.5,
    textSharpDelay: 0.2,
    textSharpDuration: 1.3,
    maxIrisRadius: 75,
    enableGlow: true,
    glowOpacity: 0.05,
    duration: 5,
  },
};

// Export preset
export const irisWipeTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
