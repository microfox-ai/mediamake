/**
 * Dimensional Drift Typokinetics Preset
 *
 * This preset creates a cinematic depth-based text dissolution effect where words break apart
 * into multiple parallax z-depth layers that drift through 3D space before snapping back together.
 * Each word splits into 4 depth layers (near, mid-near, mid-far, far) with independent velocities,
 * chromatic aberration, depth-of-field blur, and scale perspective based on Z position.
 *
 * Features:
 * - **Parallax Z-Space Drift**: Words split into 4 z-layers with different translateZ values
 * - **Chromatic Aberration**: RGB channel splits on distant layers
 * - **Depth-of-Field Blur**: Dynamic blur based on Z distance
 * - **Scale Perspective**: Far layers scale down (0.8), near layers scale up (1.2)
 * - **Lateral Drift**: Layers drift in X/Y based on depth (far layers move more)
 * - **Staggered Animation**: Layers animate sequentially (furthest first)
 * - **Smooth Snap-Back**: Smooth cubic-bezier transitions
 *
 * Use cases:
 * - Film title sequences with cinematic depth
 * - Dramatic text reveals for trailers
 * - 3D typography effects for motion graphics
 * - Depth-based text dissolution animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        end: z.number().optional(),
        duration: z.number(),
        absoluteStart: z.number().describe('Absolute start in scene timeline'),
        absoluteEnd: z.number().optional(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative to caption'),
            end: z.number().optional(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(48)
    .optional()
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color for all layers'),

  driftDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .optional()
    .describe('Duration of drift animation in seconds'),

  impactMultiplier: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Global intensity multiplier for drift effects'),

  chromaticIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe('Intensity of chromatic aberration on far layers (in pixels)'),

  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .optional()
    .describe('Maximum blur for far layers (in pixels)'),

  layerStagger: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .optional()
    .describe('Delay between layer animations in seconds'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:700',
    fontSize = 48,
    textColor = '#FFFFFF',
    driftDuration = 2.5,
    impactMultiplier = 1,
    chromaticIntensity = 2,
    maxBlur = 4,
    layerStagger = 0.1,
    position = 'center',
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Position classes
  const positionClasses = {
    top: 'items-start pt-20',
    center: 'items-center justify-center',
    bottom: 'items-end pb-20',
  };

  // Layer configuration
  const layerConfig = [
    {
      name: 'near',
      initialZ: 100,
      finalZ: 200,
      scale: 1.2,
      zIndex: 10,
      blur: 0,
      chromaticShift: 0,
      lateralDriftX: 20,
      lateralDriftY: 10,
    },
    {
      name: 'mid-near',
      initialZ: 50,
      finalZ: 100,
      scale: 1.05,
      zIndex: 5,
      blur: 1,
      chromaticShift: 0.5,
      lateralDriftX: 30,
      lateralDriftY: 15,
    },
    {
      name: 'mid-far',
      initialZ: -50,
      finalZ: -100,
      scale: 0.95,
      zIndex: 3,
      blur: 2,
      chromaticShift: 1,
      lateralDriftX: -40,
      lateralDriftY: -20,
    },
    {
      name: 'far',
      initialZ: -150,
      finalZ: -300,
      scale: 0.8,
      zIndex: 1,
      blur: maxBlur,
      chromaticShift: chromaticIntensity,
      lateralDriftX: -60,
      lateralDriftY: -30,
    },
  ];

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption) => {
      // Build word groups
      const wordGroups: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = word.id || `word-${caption.id}-${wordIndex}`;
          const impact =
            (caption.metadata?.impact ?? 1) * impimpactMultiplier;

          // Build z-layers for this word
          const zLayers: RenderableComponentData[] = layerConfig.map(
            (layer, layerIndex) => {
              const layerId = `${wordId}-${layer.name}`;
              const animationDelay = layerStagger * (3 - layerIndex); // Far layer starts first
              const effectDuration = driftDuration * impact;

              // Create chromatic aberration filter
              const chromaticFilter =
                layer.chromaticShift > 0
                  ? `drop-shadow(${-layer.chromaticShift}px 0 0 rgba(255,0,0,0.8)) drop-shadow(${layer.chromaticShift}px 0 0 rgba(0,0,255,0.8))`
                  : '';

              // Create blur filter
              const blurFilter =
                layer.blur > 0 ? `blur(${layer.blur}px)` : '';

              // Combine filters
              const combinedFilter = [chromaticFilter, blurFilter]
                .filter((f) => f)
                .join(' ');

              // Build effect for this layer
              const layerEffect = {
                id: `${layerId}-drift`,
                componentId: 'generic',
                data: {
                  type: 'cubic-bezier(0.23, 1, 0.32, 1)' as any,
                  start: animationDelay,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [layerId],
                  ranges: [
                    // TranslateZ animation (drift outward)
                    {
                      key: 'translateZ',
                      val: `${layer.initialZ}px`,
                      prog: 0,
                    },
                    {
                      key: 'translateZ',
                      val: `${layer.finalZ}px`,
                      prog: 0.5,
                    },
                    {
                      key: 'translateZ',
                      val: `${layer.initialZ}px`,
                      prog: 1,
                    },
                    // TranslateX animation (lateral drift)
                    {
                      key: 'translateX',
                      val: '0px',
                      prog: 0,
                    },
                    {
                      key: 'translateX',
                      val: `${layer.lateralDriftX * impact}px`,
                      prog: 0.5,
                    },
                    {
                      key: 'translateX',
                      val: '0px',
                      prog: 1,
                    },
                    // TranslateY animation (vertical drift)
                    {
                      key: 'translateY',
                      val: '0px',
                      prog: 0,
                    },
                    {
                      key: 'translateY',
                      val: `${layer.lateralDriftY * impact}px`,
                      prog: 0.5,
                    },
                    {
                      key: 'translateY',
                      val: '0px',
                      prog: 1,
                    },
                    // Scale animation (perspective scale)
                    {
                      key: 'scale',
                      val: layer.scale,
                      prog: 0,
                    },
                    {
                      key: 'scale',
                      val: layer.scale * 1.1,
                      prog: 0.5,
                    },
                    {
                      key: 'scale',
                      val: layer.scale,
                      prog: 1,
                    },
                    // Opacity animation (slight fade for far layers)
                    {
                      key: 'opacity',
                      val: layer.blur > 2 ? 0.7 : 1,
                      prog: 0,
                    },
                    {
                      key: 'opacity',
                      val: layer.blur > 2 ? 0.5 : 0.9,
                      prog: 0.5,
                    },
                    {
                      key: 'opacity',
                      val: layer.blur > 2 ? 0.7 : 1,
                      prog: 1,
                    },
                  ],
                },
              };

              // Build TextAtom for this layer
              return {
                id: layerId,
                type: 'atom' as const,
                componentId: 'TextAtom',
                data: {
                  text: word.text,
                  className: 'absolute top-0 left-0',
                  style: {
                    fontSize: `${fontSize}px`,
                    fontWeight: fontStyle.fontWeight || 700,
                    color: textColor,
                    zIndex: layer.zIndex,
                    transform: `translateZ(${layer.initialZ}px) scale(${layer.scale})`,
                    willChange: 'transform, filter',
                    filter: combinedFilter || undefined,
                    ...(fontStyle.fontStyle
                      ? { fontStyle: fontStyle.fontStyle }
                      : {}),
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight
                      ? [fontStyle.fontWeight.toString()]
                      : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: caption.duration,
                  },
                },
                effects: [layerEffect],
              } as RenderableComponentData;
            },
          );

          // Build word group container
          return {
            id: `${wordId}-group`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative inline-block',
                style: {
                  transformStyle: 'preserve-3d',
                  margin: '0 8px',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: zLayers as RenderableComponentData[],
          } as RenderableComponentData;
        },
      );

      // Build words container
      const wordsContainer: RenderableComponentData = {
        id: `${caption.id}-words-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex ${positionClasses[position]}`,
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordGroups as RenderableComponentData[],
      };

      // Build caption root container
      return {
        id: `${caption.id}-root`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              perspective: '800px',
              perspectiveOrigin: 'center center',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [wordsContainer] as RenderableComponentData[],
      } as RenderableComponentData;
    },
  );

  return {
    output: {
      childrenData: captionContainers as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'dimensional-drift-typokinetics',
  title: 'Dimensional Drift Typokinetics',
  description:
    'Text breaks apart into 4 parallax z-depth layers that drift through 3D space with chromatic aberration, depth-of-field blur, and scale perspective. Each word splits into near/mid-near/mid-far/far layers with independent velocities creating cinematic depth-based dissolution perfect for film titles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    '3d',
    'parallax',
    'z-space',
    'depth',
    'chromatic-aberration',
    'blur',
    'cinematic',
    'film-titles',
    'typokinetics',
    'drift',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Dimensional Drift',
        start: 0,
        duration: 5,
        absoluteStart: 0,
        absoluteEnd: 5,
        words: [
          {
            id: 'word-1',
            text: 'Dimensional',
            start: 0,
            duration: 2.5,
            absoluteStart: 0,
            absoluteEnd: 2.5,
          },
          {
            id: 'word-2',
            text: 'Drift',
            start: 2.5,
            duration: 2.5,
            absoluteStart: 2.5,
            absoluteEnd: 5,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    driftDuration: 2.5,
    impactMultiplier: 1,
    chromaticIntensity: 2,
    maxBlur: 4,
    layerStagger: 0.1,
    position: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dimensionalDriftTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
