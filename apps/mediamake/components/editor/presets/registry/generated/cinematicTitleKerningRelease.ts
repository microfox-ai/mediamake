/**
 * Cinematic Title Card - Thriller Kerning Release Preset
 *
 * This preset creates a dramatic title card with ultra-tight kerning that slowly releases
 * like opening credits in a thriller movie. The expansion is barely perceptible at first,
 * accelerates midway through, then slows to a crawl as it reaches normal spacing.
 *
 * Features:
 * - **Ultra-tight kerning release**: -0.4em to 0.01em with custom easing
 * - **Synchronized vignette lightening**: 0.6 to 0.2 opacity
 * - **Vertical drift**: 10px to 0 (translateY) for floating, ethereal quality
 * - **Brightness increase**: 0.8 to 1 for enhanced visibility
 * - **Focus pull effect**: 0.5px to 0 blur for sharpening
 * - **Long duration**: 5-7 seconds for maximum suspense
 * - **Custom easing curve**: cubic-bezier(0.25, 0.46, 0.45, 0.94) for dramatic build-up
 *
 * Use cases:
 * - Dramatic movie opening credits
 * - Documentary title reveals
 * - Thriller/suspense video intros
 * - High-tension narrative titles
 * - Cinematic storytelling introductions
 *
 * Technical details:
 * - All effects synchronized with same easing curve
 * - Provider mode effects targeting specific components
 * - Relative timing throughout
 * - Option to fit duration to scene for full-length reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  text: z
    .string()
    .default('DRAMATIC TITLE')
    .describe('The title text to display'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),

  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family (e.g., "Inter", "Roboto", "Montserrat:700" with optional weight)',
    ),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),

  duration: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('Duration of the kerning release animation in seconds'),

  fitToScene: z
    .boolean()
    .default(false)
    .describe('If true, fits duration to scene for full-length reveal'),

  initialKerning: z
    .number()
    .min(-0.8)
    .max(0)
    .default(-0.4)
    .describe('Initial letter spacing in em units (negative for tight)'),

  finalKerning: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.01)
    .describe('Final letter spacing in em units (slightly loose for drama)'),

  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Initial vignette opacity (0-1)'),

  verticalDrift: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Initial vertical offset in pixels for floating effect'),

  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable focus pull blur effect'),

  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or rgba)'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold for dramatic titles
  }

  // IDs for targeting
  const rootContainerId = 'cinematic-title-root';
  const vignetteId = 'vignette-overlay';
  const textContainerId = 'text-container';
  const titleTextId = 'title-text';

  // Duration calculation
  const duration = params.fitToScene ? 0 : params.duration;
  const effectDuration = params.duration; // Always use explicit duration for effects

  // Custom easing curve for suspenseful release
  const easingType = 'ease-out' as const; // Closest to cubic-bezier(0.25, 0.46, 0.45, 0.94)

  // --- Text Atom Data ---
  const textAtomData = {
    text: params.text,
    style: {
      fontSize: `${params.fontSize}px`,
      fontWeight: fontStyle.fontWeight || 700,
      color: params.textColor,
      letterSpacing: `${params.initialKerning}em`,
      textAlign: 'center' as const,
      textTransform: 'uppercase' as const,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      subsets: ['latin'],
      display: 'swap' as const,
    },
  };

  // --- Effects ---

  // Effect 1: Letter spacing release (kerning expansion)
  const letterSpacingEffect: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [titleTextId],
    ranges: [
      { key: 'letterSpacing', val: `${params.initialKerning}em`, prog: 0 },
      { key: 'letterSpacing', val: `${params.finalKerning}em`, prog: 1 },
    ],
  };

  // Effect 2: Vertical drift (translateY)
  const verticalDriftEffect: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      { key: 'translateY', val: params.verticalDrift, prog: 0 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Effect 3: Brightness increase
  const brightnessEffect: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      { key: 'brightness', val: 0.8, prog: 0 },
      { key: 'brightness', val: 1, prog: 1 },
    ],
  };

  // Effect 4: Focus pull (blur)
  const blurEffect: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      { key: 'blur', val: '0.5px', prog: 0 },
      { key: 'blur', val: '0px', prog: 1 },
    ],
  };

  // Effect 5: Vignette opacity fade
  const vignetteEffect: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [vignetteId],
    ranges: [
      { key: 'opacity', val: params.vignetteIntensity, prog: 0 },
      { key: 'opacity', val: 0.2, prog: 1 },
    ],
  };

  // Combine filter effects (brightness + blur) into single filter string
  // We need to merge them into text container effects
  const textContainerEffects = [
    verticalDriftEffect,
    // Combine brightness and blur into one filter effect
    {
      type: easingType,
      start: 0,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [textContainerId],
      ranges: [
        {
          key: 'filter',
          val: params.enableBlur
            ? 'blur(0.5px) brightness(0.8)'
            : 'brightness(0.8)',
          prog: 0,
        },
        {
          key: 'filter',
          val: params.enableBlur ? 'blur(0px) brightness(1)' : 'brightness(1)',
          prog: 1,
        },
      ],
    } as GenericEffectData,
  ];

  // --- Component Tree Structure ---

  const titleTextComponent: RenderableComponentData = {
    id: titleTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
        ...(params.fitToScene && { fitDurationTo: 'scene' }),
      },
    },
    effects: [
      {
        id: `letter-spacing-effect-${titleTextId}`,
        componentId: 'generic',
        data: letterSpacingEffect,
      },
    ],
  };

  const textContainerComponent: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
        ...(params.fitToScene && { fitDurationTo: 'scene' }),
      },
    },
    childrenData: [titleTextComponent],
    effects: textContainerEffects.map((effectData, index) => ({
      id: `text-container-effect-${index}`,
      componentId: 'generic',
      data: effectData,
    })),
  };

  const vignetteOverlay: RenderableComponentData = {
    id: vignetteId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(0, 0, 0, ${params.vignetteIntensity}) 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
        ...(params.fitToScene && { fitDurationTo: 'scene' }),
      },
    },
    effects: [
      {
        id: `vignette-effect-${vignetteId}`,
        componentId: 'generic',
        data: vignetteEffect,
      },
    ],
    childrenData: [],
  };

  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-full w-full flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
        ...(params.fitToScene && { fitDurationTo: 'scene' }),
      },
    },
    childrenData: [vignetteOverlay, textContainerComponent],
  };

  // --- Return Output ---

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'cinematicTitleKerningRelease',
  title: 'Cinematic Title Card - Thriller Kerning Release',
  description:
    'Cinematic title card preset with ultra-tight kerning that slowly releases like opening credits in a thriller movie. Features synchronized vignette lightening, vertical drift, brightness increase, and focus pull effect. Perfect for dramatic reveals or documentary titles with suspenseful build-up over 6 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'cinematic',
    'thriller',
    'dramatic',
    'kerning',
    'typography',
    'suspense',
    'documentary',
    'opening-credits',
    'vignette',
    'vertical-drift',
    'focus-pull',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'DRAMATIC TITLE',
    fontSize: 72,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    duration: 6,
    fitToScene: false,
    initialKerning: -0.4,
    finalKerning: 0.01,
    vignetteIntensity: 0.6,
    verticalDrift: 10,
    enableBlur: true,
    backgroundColor: '#000000',
  },
};

// --- Export Preset ---

export const cinematicTitleKerningReleasePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
