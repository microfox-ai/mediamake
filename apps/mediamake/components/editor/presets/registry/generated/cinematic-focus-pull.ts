/**
 * Cinematic Focus Pull Text Effect Preset
 *
 * A cinematic rack focus effect where text transitions from heavily blurred (out of focus)
 * to crystal sharp clarity, mimicking real camera lens behavior. Features smooth blur animation
 * from 10px to 0px with ease-out easing, subtle scale animation from 1.02 to 1.0 for settling
 * sensation, and optional brightness boost during focus transition. Uses GPU-accelerated
 * transforms for optimal performance.
 *
 * Features:
 * - Cinematic rack focus blur animation (10px → 0px)
 * - Subtle scale animation for organic settling (1.02 → 1.0)
 * - Optional brightness boost simulating light transmission increase
 * - GPU-accelerated with will-change and translateZ(0)
 * - Ease-out curve with slight overshoot feel
 * - Smooth 2.5 second transition duration
 * - Fully customizable text styling and timing
 *
 * Use cases:
 * - Cinematic title reveals
 * - Professional intro sequences
 * - Film-style text emphasis
 * - Documentary-style subtitles
 * - Dramatic quote presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with focus pull effect'),
  fontSize: z
    .string()
    .default('72px')
    .describe('Font size of the text (e.g., "72px", "4rem")'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", 600)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family name for the text (Google Font or system font)',
    ),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (e.g., "#FFFFFF", "rgb(255,255,255)")'),
  duration: z
    .number()
    .default(2.5)
    .describe('Total duration of the focus pull effect in seconds'),
  startBlur: z
    .number()
    .default(10)
    .describe('Initial blur amount in pixels (out of focus state)'),
  startScale: z
    .number()
    .default(1.02)
    .describe('Initial scale value (slight zoom before settling)'),
  enableBrightness: z
    .boolean()
    .default(true)
    .describe(
      'Enable brightness boost during focus transition (simulates light transmission)',
    ),
  brightnessStart: z
    .number()
    .default(0.9)
    .describe('Initial brightness value (0-2, default: 0.9)'),
  brightnessEnd: z
    .number()
    .default(1.0)
    .describe('Final brightness value (0-2, default: 1.0)'),
  blurAnimationEnd: z
    .number()
    .default(0.9)
    .describe(
      'Progress point (0-1) where blur animation ends (default: 0.9 for 90% of duration)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    fontFamily,
    color,
    duration,
    startBlur,
    startScale,
    enableBrightness,
    brightnessStart,
    brightnessEnd,
    blurAnimationEnd,
  } = params;

  // Generate unique IDs
  const containerId = 'cinematic-focus-pull-container';
  const textId = 'cinematic-focus-pull-text';

  // Construct filter strings
  const startFilterBlur = `blur(${startBlur}px)`;
  const endFilterBlur = 'blur(0px)';

  // Optional brightness filter
  const startFilterBrightness = enableBrightness
    ? `blur(${startBlur}px) brightness(${brightnessStart})`
    : startFilterBlur;
  const endFilterBrightness = enableBrightness
    ? `blur(0px) brightness(${brightnessEnd})`
    : endFilterBlur;

  // Create combined focus pull effect (blur + scale + optional brightness)
  const focusPullEffect = {
    id: 'focus-pull-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Blur animation (0-90% by default)
        { key: 'filter', val: startFilterBrightness, prog: 0 },
        { key: 'filter', val: endFilterBrightness, prog: blurAnimationEnd },
        { key: 'filter', val: endFilterBrightness, prog: 1 },
        // Scale animation (0-100% for full settling)
        { key: 'scale', val: startScale, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
      ],
    },
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        willChange: 'filter, transform',
        transform: 'translateZ(0)', // GPU acceleration
      },
      font: {
        family: fontFamily,
        weights: ['400', '500', '600', '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [focusPullEffect],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
        style: {
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
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
  id: 'cinematic-focus-pull',
  title: 'Cinematic Focus Pull Text Effect',
  description:
    'A cinematic rack focus effect where text transitions from heavily blurred (out of focus) to crystal sharp clarity, mimicking real camera lens behavior. Features smooth blur animation from 10px to 0px with ease-out easing, subtle scale animation from 1.02 to 1.0 for settling sensation, and optional brightness boost during focus transition. Uses GPU-accelerated transforms for optimal performance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'focus',
    'blur',
    'rack-focus',
    'camera',
    'lens',
    'title',
    'reveal',
    'organic',
  ],
  defaultInputParams: {
    text: 'Cinematic Focus',
    fontSize: '72px',
    fontWeight: 'bold',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    duration: 2.5,
    startBlur: 10,
    startScale: 1.02,
    enableBrightness: true,
    brightnessStart: 0.9,
    brightnessEnd: 1.0,
    blurAnimationEnd: 0.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicFocusPullPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
