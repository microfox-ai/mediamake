/**
 * Tilt-Shift Zoom Reveal Text Effect Preset
 *
 * This preset creates a miniature/diorama effect on text using a simulated tilt-shift lens.
 * The text starts with heavy blur on the top and bottom edges (shallow depth of field) and a slight zoom.
 * As the animation progresses, the blur gradually clears from the edges inward while the text zooms to normal scale.
 * Increased saturation and contrast during the reveal mimic the toy-like appearance of tilt-shift photography.
 *
 * Features:
 * - **Tilt-Shift Simulation**: Heavy blur on top and bottom edges with transparent center
 * - **Zoom Reveal**: Text scales from 1.3x to normal size with ease-out easing
 * - **Gradient Blur Masks**: Linear gradients create smooth blur falloff from edges
 * - **Enhanced Colors**: Saturation (150% → 120%) and contrast (110% → 105%) for toy-like effect
 * - **Vignetting**: Optional radial gradient overlay for depth
 * - **Natural Focus Pull**: Ease-out easing creates natural lens focus feeling
 *
 * Use cases:
 * - Creating miniature/diorama text effects
 * - Simulating tilt-shift lens photography on text
 * - Building toy-like visual aesthetics
 * - Adding depth-of-field effects to typography
 * - Creating focus-pull reveal animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z
    .number()
    .default(1.5)
    .describe('Duration of the reveal animation in seconds'),
  fontSize: z
    .string()
    .default('96px')
    .describe('Font size of the text (e.g., "96px", "8rem")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (e.g., "#FFFFFF", "rgb(255,255,255)")'),
  initialScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .describe('Initial zoom scale multiplier (1.3 = 130%)'),
  initialBlur: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Initial blur intensity in pixels'),
  blurMaskHeight: z
    .string()
    .default('33.333%')
    .describe('Height of blur masks (top and bottom) as percentage or pixels'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Vignette darkness intensity (0 = none, 1 = black edges)'),
  initialSaturation: z
    .number()
    .min(100)
    .max(200)
    .default(150)
    .describe('Initial saturation percentage (150 = 150%)'),
  finalSaturation: z
    .number()
    .min(100)
    .max(200)
    .default(120)
    .describe('Final saturation percentage (120 = 120%)'),
  initialContrast: z
    .number()
    .min(100)
    .max(150)
    .default(110)
    .describe('Initial contrast percentage (110 = 110%)'),
  finalContrast: z
    .number()
    .min(100)
    .max(150)
    .default(105)
    .describe('Final contrast percentage (105 = 105%)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    color,
    initialScale,
    initialBlur,
    blurMaskHeight,
    vignetteIntensity,
    initialSaturation,
    finalSaturation,
    initialContrast,
    finalContrast,
  } = params;

  // Generate unique IDs
  const containerId = 'tilt-shift-container';
  const vignetteId = 'vignette-overlay';
  const blurTopId = 'blur-top-mask';
  const blurBottomId = 'blur-bottom-mask';
  const textId = 'text-element';

  // Create vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: vignetteId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, ${vignetteIntensity}) 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Create top blur mask
  const blurTopMask: RenderableComponentData = {
    id: blurTopId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 w-full pointer-events-none',
        style: {
          height: blurMaskHeight,
          background: 'linear-gradient(to bottom, black 0%, transparent 70%)',
          backdropFilter: `blur(${initialBlur}px)`,
        },
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
        id: `${blurTopId}-blur-clear`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [blurTopId],
          ranges: [
            { key: 'backdropFilter', val: `blur(${initialBlur}px)`, prog: 0 },
            { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Create bottom blur mask
  const blurBottomMask: RenderableComponentData = {
    id: blurBottomId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-0 w-full pointer-events-none',
        style: {
          height: blurMaskHeight,
          background: 'linear-gradient(to top, black 0%, transparent 70%)',
          backdropFilter: `blur(${initialBlur}px)`,
        },
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
        id: `${blurBottomId}-blur-clear`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [blurBottomId],
          ranges: [
            {
              key: 'backdropFilter',
              val: `blur(${initialBlur}px)`,
              prog: 0,
            },
            { key: 'backdropFilter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Create text element with zoom and filter effects
  const textElement: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        textAlign: 'center',
        filter: `saturate(${initialSaturation}%) contrast(${initialContrast}%)`,
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
    effects: [
      {
        id: `${textId}-zoom-reveal`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            // Zoom from initialScale to 1.0
            { key: 'scale', val: initialScale, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
            // Saturation transition
            {
              key: 'filter',
              val: `saturate(${initialSaturation}%) contrast(${initialContrast}%)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `saturate(${finalSaturation}%) contrast(${finalContrast}%)`,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [vignetteOverlay, blurTopMask, blurBottomMask, textElement],
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
  id: 'tilt-shift-text-reveal',
  title: 'Tilt-Shift Zoom Reveal Text Effect',
  description:
    'Creates a miniature/diorama effect on text using simulated tilt-shift lens characteristics. Text starts zoomed with heavy blur on top and bottom edges (shallow depth of field), then reveals with clearing blur from edges inward while zooming to normal scale. Enhanced saturation and contrast mimic the toy-like appearance of tilt-shift photography with optional vignetting.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'tilt-shift',
    'miniature',
    'diorama',
    'blur',
    'zoom',
    'reveal',
    'depth-of-field',
    'photography',
    'toy-like',
    'focus-pull',
  ],
  defaultInputParams: {
    text: 'MINIATURE WORLD',
    duration: 1.5,
    fontSize: '96px',
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    initialScale: 1.3,
    initialBlur: 10,
    blurMaskHeight: '33.333%',
    vignetteIntensity: 0.3,
    initialSaturation: 150,
    finalSaturation: 120,
    initialContrast: 110,
    finalContrast: 105,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tiltShiftTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
