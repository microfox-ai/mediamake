/**
 * Focus Pull Typography Preset
 *
 * This preset creates a cinematic 'focus pull' effect that mimics camera rack-focusing techniques.
 * Text starts extremely blurred (20px blur) and at reduced scale (70%), then simultaneously scales
 * to 100% while the blur reduces to 0, creating a beautiful 'coming into focus' effect.
 *
 * Features:
 * - **Cinematic Focus Effect**: Text transitions from extreme blur (20px) to crisp focus
 * - **Scale Animation**: Simultaneous scale from 70% to 100% for depth perception
 * - **Brightness Modulation**: Subtle brightness boost during focus transition (80% → 110% → 100%)
 * - **Opacity Fade**: Smooth fade-in from 30% to 100% opacity
 * - **GPU Acceleration**: Uses transform3d and will-change for smooth performance
 * - **Optional Vignette**: Cinematic vignette overlay that fades out with text focus
 * - **Customizable Timing**: Adjustable focus duration and easing for different moods
 *
 * Use cases:
 * - Documentary titles and opening sequences
 * - Photography portfolio text overlays
 * - Cinematic film title sequences
 * - Depth-of-field text transitions
 * - Professional video intros with rack-focus aesthetic
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
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family (e.g., "Roboto:700", "Inter:600", or just "BebasNeue")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),

  // Focus effect parameters
  focusDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration of the focus pull effect in seconds'),
  initialBlur: z
    .number()
    .min(10)
    .max(30)
    .default(20)
    .describe('Initial blur amount in pixels (start of focus)'),
  initialScale: z
    .number()
    .min(0.5)
    .max(0.9)
    .default(0.7)
    .describe('Initial scale multiplier (0.7 = 70%)'),
  initialOpacity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Initial opacity (0.3 = 30%)'),

  // Brightness effect parameters
  brightnessBoost: z
    .number()
    .min(1.0)
    .max(1.3)
    .default(1.1)
    .describe('Peak brightness multiplier during focus transition (1.1 = 110%)'),

  // Timing parameters
  startTime: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  totalDuration: z
    .number()
    .default(5)
    .describe('Total duration the text remains visible'),

  // Vignette parameters
  showVignette: z
    .boolean()
    .default(true)
    .describe('Whether to show the cinematic vignette overlay'),
  vignetteIntensity: z
    .number()
    .min(0.1)
    .max(0.6)
    .default(0.4)
    .describe('Vignette darkness intensity (0.4 = 40% opacity at edges)'),
  vignetteFadeDuration: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.6)
    .describe('Duration for vignette fade-out in seconds'),

  // Easing
  easingType: z
    .enum(['ease-in-out', 'ease-out', 'ease-in', 'linear'])
    .default('ease-in-out')
    .describe('Easing function for the focus animation'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font family and extract weight if included
  const parseFontString = (fontString: string) => {
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      return {
        family: parts[0],
        weight: parts[1] || params.fontWeight,
      };
    }
    return {
      family: fontString,
      weight: params.fontWeight,
    };
  };

  const { family: fontFamily, weight: fontWeight } = parseFontString(
    params.fontFamily,
  );

  const textId = 'focus-pull-text';
  const containerId = 'focus-pull-container';
  const vignetteId = 'focus-pull-vignette';

  // Create focus pull effect
  const focusEffect = {
    id: 'focus-pull-effect',
    componentId: 'generic',
    data: {
      type: params.easingType,
      start: 0,
      duration: params.focusDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Blur: 20px → 0px
        { key: 'filter', val: `blur(${params.initialBlur}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        // Scale: 0.7 → 1.0
        { key: 'scale', val: params.initialScale, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
        // Opacity: 0.3 → 1.0
        { key: 'opacity', val: params.initialOpacity, prog: 0 },
        { key: 'opacity', val: 1.0, prog: 1 },
        // Brightness: 0.8 → 1.1 → 1.0 (boost during transition)
        { key: 'brightness', val: 0.8, prog: 0 },
        { key: 'brightness', val: params.brightnessBoost, prog: 0.5 },
        { key: 'brightness', val: 1.0, prog: 1 },
      ],
    },
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontWeight,
        color: params.textColor,
        textAlign: 'center',
        willChange: 'filter, transform, opacity',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    effects: [focusEffect],
  };

  // Create text container
  const textContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          willChange: 'filter, transform, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [textAtom],
  };

  const childrenData: RenderableComponentData[] = [];

  // Add vignette if enabled
  if (params.showVignette) {
    const vignetteEffect = {
      id: 'vignette-fade-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0.1, // Start fading slightly after focus begins
        duration: params.vignetteFadeDuration,
        mode: 'provider',
        targetIds: [vignetteId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    const vignette: RenderableComponentData = {
      id: vignetteId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${params.vignetteIntensity}) 100%)`,
            opacity: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.totalDuration,
        },
      },
      effects: [vignetteEffect],
    };

    childrenData.push(vignette);
  }

  childrenData.push(textContainer);

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'focus-pull-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          transform: 'translate3d(0,0,0)',
          willChange: 'filter, transform',
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.totalDuration,
      },
    },
    childrenData,
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
  id: 'focus-pull-typography',
  title: 'Focus Pull Typography',
  description:
    'A refined cinematic typography preset that mimics camera rack-focusing techniques. Text starts extremely blurred (20px) at reduced scale (70%), then smoothly animates to crisp focus (0px blur, 100% scale) with brightness modulation. Creates beautiful depth-of-field transitions perfect for documentary titles, photography portfolios, and cinematic text overlays. Supports optional vignette overlay for enhanced cinematic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'cinematic',
    'focus-pull',
    'rack-focus',
    'documentary',
    'film',
    'depth-of-field',
    'blur',
    'scale',
    'brightness',
    'vignette',
  ],
  defaultInputParams: {
    text: 'Cinematic Title',
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    fontWeight: '700',
    focusDuration: 0.8,
    initialBlur: 20,
    initialScale: 0.7,
    initialOpacity: 0.3,
    brightnessBoost: 1.1,
    startTime: 0,
    totalDuration: 5,
    showVignette: true,
    vignetteIntensity: 0.4,
    vignetteFadeDuration: 0.6,
    easingType: 'ease-in-out',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const focusPullTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
