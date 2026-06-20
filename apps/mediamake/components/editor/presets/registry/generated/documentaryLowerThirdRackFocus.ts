/**
 * Documentary Lower Third - Rack Focus Preset
 *
 * A sophisticated documentary-style lower third where text emerges from behind a blurred
 * foreground element that shifts focus. Features cinematic rack focus simulation, chromatic
 * aberration effects, and kinetic letter-spacing animation.
 *
 * Features:
 * - Cinematic rack focus effect (foreground blur increases, text sharpens)
 * - Chromatic aberration during focus transition for realism
 * - Kinetic typography with tracking (letter-spacing) adjustment
 * - Professional, clean animation with editorial feel
 * - Customizable foreground element (gradient or solid)
 * - Adjustable timing and intensity
 *
 * Use cases:
 * - Documentary lower thirds
 * - Professional video intros
 * - Interview name tags
 * - Editorial content overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .describe('Main text content to display in the lower third'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Roboto:400")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(128)
    .default(48)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),

  positionBottom: z
    .number()
    .min(0)
    .max(500)
    .default(80)
    .describe('Distance from bottom of screen in pixels'),

  positionLeft: z
    .number()
    .min(0)
    .max(500)
    .default(40)
    .describe('Distance from left of screen in pixels'),

  foregroundType: z
    .enum(['gradient', 'solid'])
    .default('gradient')
    .describe('Type of foreground blur element'),

  foregroundColor: z
    .string()
    .default('rgba(80, 80, 90, 0.6)')
    .describe('Foreground element color (for solid type)'),

  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of the rack focus transition in seconds'),

  holdDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration the lower third stays on screen'),

  chromaticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of chromatic aberration effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:300';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Default font weight if not specified
  if (!fontStyle.fontWeight) {
    fontStyle.fontWeight = 300;
  }

  const totalDuration = params.holdDuration;
  const transitionDuration = params.transitionDuration;

  // IDs
  const rootId = 'documentary-rack-focus-root';
  const textContainerId = 'text-container';
  const mainTextId = 'main-text';
  const chromaticRedId = 'chromatic-red';
  const chromaticBlueId = 'chromatic-blue';
  const foregroundId = 'foreground-blur-object';

  // Foreground HTML based on type
  const foregroundHtml =
    params.foregroundType === 'gradient'
      ? `<div style="width: 100%; height: 100%; background: radial-gradient(circle at 30% 40%, ${params.foregroundColor}, rgba(40, 40, 50, 0.3));"></div>`
      : `<div style="width: 100%; height: 100%; background: ${params.foregroundColor};"></div>`;

  // Main text component
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-4xl font-light',
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        letterSpacing: '0.2em',
        filter: 'blur(15px)',
        opacity: 0.4,
        fontWeight: fontStyle.fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '300'],
        display: 'swap',
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
        id: 'text-focus-transition',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [mainTextId],
          ranges: [
            { key: 'blur', val: 15, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'opacity', val: 0.4, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'letterSpacing', val: 0.2, prog: 0 },
            { key: 'letterSpacing', val: 0.05, prog: 1 },
          ],
        },
      },
    ],
  };

  // Chromatic aberration - red channel
  const chromaticRed: RenderableComponentData = {
    id: chromaticRedId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-4xl font-light absolute top-0 left-0 pointer-events-none',
      style: {
        fontSize: `${params.fontSize}px`,
        color: `rgba(255, 0, 0, ${params.chromaticIntensity * 0.6})`,
        textShadow: 'none',
        letterSpacing: '0.2em',
        filter: 'blur(15px)',
        opacity: 0,
        transform: 'translateX(-2px) translateY(-1px)',
        mixBlendMode: 'screen',
        fontWeight: fontStyle.fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '300'],
        display: 'swap',
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
        id: 'chromatic-red-transition',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.5,
          duration: transitionDuration - 0.5,
          mode: 'provider',
          targetIds: [chromaticRedId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: params.chromaticIntensity, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'blur', val: 15, prog: 0 },
            { key: 'blur', val: 8, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Chromatic aberration - blue channel
  const chromaticBlue: RenderableComponentData = {
    id: chromaticBlueId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-4xl font-light absolute top-0 left-0 pointer-events-none',
      style: {
        fontSize: `${params.fontSize}px`,
        color: `rgba(0, 100, 255, ${params.chromaticIntensity * 0.6})`,
        textShadow: 'none',
        letterSpacing: '0.2em',
        filter: 'blur(15px)',
        opacity: 0,
        transform: 'translateX(2px) translateY(1px)',
        mixBlendMode: 'screen',
        fontWeight: fontStyle.fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight?.toString() || '300'],
        display: 'swap',
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
        id: 'chromatic-blue-transition',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.5,
          duration: transitionDuration - 0.5,
          mode: 'provider',
          targetIds: [chromaticBlueId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: params.chromaticIntensity, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'blur', val: 15, prog: 0 },
            { key: 'blur', val: 8, prog: 0.5 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Text container (holds all text layers)
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute z-10',
        style: {
          bottom: `${params.positionBottom}px`,
          left: `${params.positionLeft}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [mainText, chromaticRed, chromaticBlue],
  };

  // Foreground blur object
  const foregroundBlur: RenderableComponentData = {
    id: foregroundId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: foregroundHtml,
      className: 'absolute inset-0 z-20',
      style: {
        filter: 'blur(0px)',
        opacity: 0.8,
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
        id: 'foreground-blur-transition',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [foregroundId],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 20, prog: 1 },
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textContainer, foregroundBlur],
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
  id: 'documentaryLowerThirdRackFocus',
  title: 'Documentary Lower Third - Rack Focus',
  description:
    'A sophisticated documentary-style lower third where text emerges from behind a blurred foreground element that shifts focus. Features cinematic rack focus simulation, chromatic aberration effects, and kinetic letter-spacing animation. The text starts hidden behind an out-of-focus foreground object, then as the "focus" pulls to the background, the text becomes sharp while the foreground blurs more. Includes professional typography with tracking adjustments and optional word-level wave sharpening for caption-based content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'lower-third',
    'documentary',
    'rack-focus',
    'chromatic-aberration',
    'kinetic-typography',
    'professional',
    'cinematic',
    'editorial',
  ],
  defaultInputParams: {
    text: 'Documentary Title',
    font: 'Inter:300',
    fontSize: 48,
    textColor: '#ffffff',
    positionBottom: 80,
    positionLeft: 40,
    foregroundType: 'gradient',
    foregroundColor: 'rgba(80, 80, 90, 0.6)',
    transitionDuration: 2.5,
    holdDuration: 5,
    chromaticIntensity: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const documentaryLowerThirdRackFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
