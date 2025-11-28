/**
 * Tilt-Shift Miniature Text Focus Preset
 *
 * This preset creates a tilt-shift photography effect for text that simulates miniature model focus.
 * Text transitions from dreamy peripheral blur (top/bottom) to sharp center focus with expanding focus band.
 * Features gradient-based blur zones, vignette lightening, and saturation boost for toy-like miniature aesthetic.
 * Perfect for lifestyle, travel, and whimsical content.
 *
 * Technical Details:
 * - Gradient mask overlays create blur zones at top and bottom
 * - Central horizontal band remains sharp, expanding as animation progresses
 * - Vignette overlay lightens during focus pull
 * - Saturation boost enhances toy-like miniature effect
 * - Subtle scale growth adds depth during focus pull
 * - All effects use ease-out timing for natural camera adjustment feel
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display with tilt-shift effect'),
  fontSize: z
    .string()
    .optional()
    .default('48px')
    .describe('Font size for the text (e.g., "48px", "4rem")'),
  fontWeight: z
    .string()
    .optional()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  color: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  duration: z
    .number()
    .optional()
    .default(2.5)
    .describe('Duration of the tilt-shift focus animation in seconds'),
  blurIntensity: z
    .number()
    .optional()
    .default(20)
    .describe('Initial blur intensity at top/bottom (0-50, default 20)'),
  vignetteStrength: z
    .number()
    .optional()
    .default(0.4)
    .describe(
      'Initial vignette darkness (0-1, default 0.4, final opacity will be 0.3x this)',
    ),
  saturationBoost: z
    .number()
    .optional()
    .default(1.3)
    .describe('Final saturation multiplier for toy-like effect (1.0-2.0)'),
  scaleGrowth: z
    .number()
    .optional()
    .default(1.01)
    .describe('Subtle scale growth during focus (1.0-1.1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize = '48px',
    fontWeight = '700',
    fontFamily = 'Inter',
    color = '#ffffff',
    duration = 2.5,
    blurIntensity = 20,
    vignetteStrength = 0.4,
    saturationBoost = 1.3,
    scaleGrowth = 1.01,
  } = params;

  // Text container ID
  const textContainerId = 'tilt-shift-text-container';
  const textAtomId = 'tilt-shift-main-text';
  const blurTopId = 'tilt-shift-blur-top';
  const blurBottomId = 'tilt-shift-blur-bottom';
  const vignetteId = 'tilt-shift-vignette';

  // Text atom component
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize,
        fontWeight,
        color,
        textAlign: 'center',
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Text container with centered layout
  const textContainer: RenderableComponentData = {
    id: textContainerId,
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
        duration,
      },
    },
    childrenData: [textAtom],
  };

  // Top blur gradient overlay
  const blurTopOverlay: RenderableComponentData = {
    id: blurTopId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 left-0 w-full pointer-events-none',
        style: {
          height: '40%',
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, transparent 100%)',
          backdropFilter: `blur(${blurIntensity}px)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Bottom blur gradient overlay
  const blurBottomOverlay: RenderableComponentData = {
    id: blurBottomId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-0 left-0 w-full pointer-events-none',
        style: {
          height: '40%',
          background:
            'linear-gradient(to top, rgba(255,255,255,0.15) 0%, transparent 100%)',
          backdropFilter: `blur(${blurIntensity}px)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: vignetteId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,' +
            vignetteStrength +
            ') 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create effects
  const effects = [
    // Saturation boost effect on text
    {
      id: 'saturation-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'saturate', val: 1, prog: 0 },
          { key: 'saturate', val: saturationBoost, prog: 1 },
        ],
      },
    },
    // Subtle scale growth on text
    {
      id: 'scale-growth-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: scaleGrowth, prog: 1 },
        ],
      },
    },
    // Vignette fade out
    {
      id: 'vignette-fade-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [vignetteId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      },
    },
    // Top blur fade out
    {
      id: 'blur-top-fade-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [blurTopId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
    // Bottom blur fade out
    {
      id: 'blur-bottom-fade-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration,
        mode: 'provider',
        targetIds: [blurBottomId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'tilt-shift-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects,
    childrenData: [
      textContainer,
      blurTopOverlay,
      blurBottomOverlay,
      vignetteOverlay,
    ],
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
  id: 'tilt-shift-text-focus',
  title: 'Tilt-Shift Miniature Text Focus',
  description:
    'A tilt-shift photography effect for text that simulates miniature model focus. Text transitions from dreamy peripheral blur (top/bottom) to sharp center focus with expanding focus band. Features gradient-based blur zones, vignette lightening, and saturation boost for toy-like miniature aesthetic. Perfect for lifestyle, travel, and whimsical content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'tilt-shift',
    'miniature',
    'focus',
    'blur',
    'gradient',
    'vignette',
    'saturation',
    'depth',
    'cinematic',
    'whimsical',
    'lifestyle',
    'travel',
  ],
  defaultInputParams: {
    text: 'Your Text Here',
    fontSize: '48px',
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#ffffff',
    duration: 2.5,
    blurIntensity: 20,
    vignetteStrength: 0.4,
    saturationBoost: 1.3,
    scaleGrowth: 1.01,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tiltShiftTextFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
