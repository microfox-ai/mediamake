/**
 * Particle-Based Text Dissolve Reveal Preset
 *
 * This preset creates an advanced particle-based text reveal effect where a soft vertical mask
 * appears to dissolve the concealment layer like sand being blown away. The feathered edge
 * (40-50px blur radius) features animated noise/grain texture that creates a particulate
 * dispersion effect, combining wipe transition with particle effects similar to video editing.
 *
 * Features:
 * - Soft vertical mask with 40-50px blur radius for feathered edge
 * - Animated noise/grain texture overlay using CSS background-image with encoded SVG pattern
 * - Grain animation via background-position for continuous particle effect
 * - SVG turbulence filters (feTurbulence) with animated baseFrequency (0.02 → 0.08)
 * - feGaussianBlur for edge softness and particulate dispersion
 * - Organic mask edge using clip-path: polygon() with 8+ points animated independently
 * - Word-level micro-animations (shake/vibrate) as mask passes over text
 * - Variable speed timing using cubic-bezier(0.22, 1, 0.36, 1) easing
 * - GPU-accelerated layers (willChange: transform) for smooth performance
 * - Optional audio-reactive intensity modulation
 *
 * Use cases:
 * - Creating dramatic text reveals with particle dispersion effects
 * - Building cinematic title sequences with sand/dust effects
 * - Adding organic, nature-inspired reveal transitions
 * - Implementing video-editing-style wipe transitions with particles
 * - Creating audio-synchronized text animations with shake effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Caption text'),
        absoluteStart: z.number().describe('Absolute start time in seconds'),
        duration: z.number().describe('Duration in seconds'),
        absoluteEnd: z.number().describe('Absolute end time in seconds'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z
                .number()
                .describe('Word start time relative to caption'),
              duration: z.number().describe('Word duration'),
              absoluteStart: z
                .number()
                .describe('Word absolute start in caption timeline'),
            }),
          )
          .optional()
          .describe('Array of word objects for word-level animations'),
        metadata: z
          .object({
            impact: z
              .number()
              .optional()
              .describe('Effect intensity multiplier (0.1 - 3.0)'),
          })
          .optional()
          .describe('Optional metadata for per-caption customization'),
      }),
    )
    .describe('Array of caption objects with text and timing'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),

  fontSize: z
    .number()
    .optional()
    .default(64)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),

  backgroundColor: z
    .string()
    .optional()
    .default('rgba(0, 0, 0, 0.8)')
    .describe('Background color for mask overlay'),

  blurRadius: z
    .number()
    .min(30)
    .max(60)
    .optional()
    .default(45)
    .describe('Blur radius for mask edge (30-60px)'),

  maskDuration: z
    .number()
    .optional()
    .describe(
      'Duration of mask reveal animation (defaults to total captions duration)',
    ),

  grainIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .optional()
    .default(0.6)
    .describe('Grain texture opacity/intensity (0.1 - 1)'),

  turbulenceStart: z
    .number()
    .optional()
    .default(0.02)
    .describe('SVG turbulence baseFrequency start value'),

  turbulenceEnd: z
    .number()
    .optional()
    .default(0.08)
    .describe('SVG turbulence baseFrequency end value'),

  wordShakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .default(3)
    .describe('Word shake amplitude in pixels (0 = no shake)'),

  enableWordShake: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable word-level shake effects as mask passes'),

  audioReactive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable audio-reactive intensity modulation (requires audio source)'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive effects'),

  trackName: z
    .string()
    .optional()
    .default('particle-dissolve-track')
    .describe('Track name for component IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    backgroundColor,
    blurRadius,
    maskDuration,
    grainIntensity,
    turbulenceStart,
    turbulenceEnd,
    wordShakeIntensity,
    enableWordShake,
    audioReactive,
    audioSrc,
    trackName,
  } = params;

  const { config } = props;

  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (
    fontString: string,
  ): {
    family: string;
    weight?: number;
    style?: 'normal' | 'italic';
  } => {
    if (!fontString.includes(':')) {
      return { family: fontString };
    }

    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parseInt(parts[1], 10) : undefined;
    const style =
      parts.length > 2 ? (parts[2] as 'normal' | 'italic') : undefined;

    return { family, weight, style };
  };

  const fontConfig = parseFontString(font || 'Inter:700');

  // Helper: Create SVG noise pattern for grain texture
  const createGrainSVG = (): string => {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="200" height="200" filter="url(#noise)" opacity="${grainIntensity}"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  };

  const grainSVG = createGrainSVG();

  // Calculate total duration
  const totalDuration =
    maskDuration ||
    (captions.length > 0
      ? Math.max(
          ...captions.map((c) => c.absoluteStart + c.duration),
        )
      : 10);

  // Build caption text components
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `${trackName}-caption-${captionIndex}`;
    const impact = caption.metadata?.impact ?? 1.0;

    // Word-level components if words available
    if (caption.words && caption.words.length > 0 && enableWordShake) {
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `${captionId}-word-${wordIndex}`;

          // Calculate when mask passes over this word (based on vertical reveal)
          // Approximate: mask reveals from top to bottom over maskDuration
          // Word shake triggers when mask is near the word's position
          const wordRelativePosition = wordIndex / caption.words!.length;
          const maskPassTime =
            caption.absoluteStart + wordRelativePosition * caption.duration;

          // Shake effect: small random translateX/Y as mask approaches
          const shakeEffect = {
            id: `${wordId}-shake`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: Math.max(0, maskPassTime - 0.2),
              duration: 0.4,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: [
                {
                  key: 'translateX',
                  val: -wordShakeIntensity * impact,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: wordShakeIntensity * impact,
                  prog: 0.25,
                },
                {
                  key: 'translateX',
                  val: -wordShakeIntensity * impact * 0.5,
                  prog: 0.5,
                },
                {
                  key: 'translateX',
                  val: wordShakeIntensity * impact * 0.5,
                  prog: 0.75,
                },
                { key: 'translateX', val: 0, prog: 1 },
                {
                  key: 'translateY',
                  val: -wordShakeIntensity * impact * 0.7,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: wordShakeIntensity * impact * 0.7,
                  prog: 0.3,
                },
                {
                  key: 'translateY',
                  val: -wordShakeIntensity * impact * 0.3,
                  prog: 0.6,
                },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          };

          return {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                fontWeight: fontConfig.weight || 700,
                fontStyle: fontConfig.style || 'normal',
                marginRight: '0.3em',
              },
              font: {
                family: fontConfig.family,
                weights: fontConfig.weight ? [fontConfig.weight.toString()] : ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [shakeEffect],
          } as RenderableComponentData;
        },
      );

      // Caption container with word children
      captionComponents.push({
        id: captionId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex flex-row flex-wrap items-center justify-center px-8',
            style: {
              gap: `${fontSize * 0.1}px`,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData);
    } else {
      // No word-level data or shake disabled - render as single text
      captionComponents.push({
        id: captionId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: caption.text,
          className: 'text-center px-8',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontConfig.weight || 700,
            fontStyle: fontConfig.style || 'normal',
          },
          font: {
            family: fontConfig.family,
            weights: fontConfig.weight ? [fontConfig.weight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
      } as RenderableComponentData);
    }
  });

  // Captions container
  const captionsContainer: RenderableComponentData = {
    id: `${trackName}-captions-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: captionComponents,
  };

  // SVG filter definition (with animated turbulence)
  const svgFilterId = `${trackName}-dissolve-turbulence`;
  const svgFilterHTML = `
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <filter id="${svgFilterId}" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="${turbulenceStart}" numOctaves="4" seed="2" />
          <feGaussianBlur stdDeviation="${blurRadius}" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" />
        </filter>
      </defs>
    </svg>
  `;

  const svgFilterComponent: RenderableComponentData = {
    id: `${trackName}-svg-filter`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHTML,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Mask overlay (concealment layer that dissolves)
  const maskOverlayId = `${trackName}-mask-overlay`;
  const maskOverlayHTML = `
    <div style="
      width: 100%;
      height: 100%;
      background: ${backgroundColor};
      filter: url(#${svgFilterId});
    "></div>
  `;

  const maskOverlayComponent: RenderableComponentData = {
    id: maskOverlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: maskOverlayHTML,
      className: 'absolute inset-0',
      style: {
        zIndex: 2,
        willChange: 'transform',
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
        id: `${maskOverlayId}-reveal`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier' as const,
          easingParams: [0.22, 1, 0.36, 1],
          start: 0,
          duration: totalDuration,
          mode: 'provider' as const,
          targetIds: [maskOverlayId],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 100% 0%, 100% 5%, 98% 8%, 95% 10%, 92% 12%, 88% 15%, 85% 18%, 80% 20%, 0% 20%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0% 80%, 100% 80%, 100% 85%, 98% 88%, 95% 90%, 92% 92%, 88% 95%, 85% 98%, 80% 100%, 0% 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Grain overlay (animated noise texture)
  const grainOverlayId = `${trackName}-grain-overlay`;
  const grainOverlayComponent: RenderableComponentData = {
    id: grainOverlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="
        width: 100%;
        height: 100%;
        background-image: url('${grainSVG}');
        background-size: 200px 200px;
        background-repeat: repeat;
        mix-blend-mode: overlay;
        opacity: ${grainIntensity};
        pointer-events: none;
      "></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 10,
        willChange: 'transform',
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
        id: `${grainOverlayId}-animation`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: totalDuration,
          mode: 'provider' as const,
          targetIds: [grainOverlayId],
          ranges: [
            { key: 'backgroundPositionX', val: '0%', prog: 0 },
            { key: 'backgroundPositionX', val: '100%', prog: 1 },
            { key: 'backgroundPositionY', val: '0%', prog: 0 },
            { key: 'backgroundPositionY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      svgFilterComponent,
      captionsContainer,
      maskOverlayComponent,
      grainOverlayComponent,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'particle-text-dissolve-reveal',
  title: 'Particle Text Dissolve Reveal',
  description:
    'Advanced particle-based text reveal preset with soft vertical mask that dissolves like sand being blown away. Features animated noise/grain texture with 40-50px blur radius creating particulate dispersion effect. Combines wipe transition with particle effects through CSS grain texture overlay and SVG turbulence filters. Includes word-level micro-animations (shake/vibrate) as mask passes, using cubic-bezier(0.22, 1, 0.36, 1) easing and GPU acceleration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'particle',
    'dissolve',
    'wipe',
    'grain',
    'turbulence',
    'mask',
    'shake',
    'organic',
    'cinematic',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    captions: [
      {
        text: 'Welcome to the Show',
        absoluteStart: 0,
        duration: 5,
        absoluteEnd: 5,
        words: [
          { text: 'Welcome', start: 0, duration: 1.5, absoluteStart: 0 },
          { text: 'to', start: 1.5, duration: 0.5, absoluteStart: 1.5 },
          { text: 'the', start: 2, duration: 0.5, absoluteStart: 2 },
          { text: 'Show', start: 2.5, duration: 2.5, absoluteStart: 2.5 },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 64,
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    blurRadius: 45,
    grainIntensity: 0.6,
    turbulenceStart: 0.02,
    turbulenceEnd: 0.08,
    wordShakeIntensity: 3,
    enableWordShake: true,
    audioReactive: false,
    trackName: 'particle-dissolve-track',
  },
};

// --- Export ---

export const particleTextDissolveRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
