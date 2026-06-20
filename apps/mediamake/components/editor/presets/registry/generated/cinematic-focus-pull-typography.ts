/**
 * Cinematic Focus Pull Typography Preset
 *
 * Professional cinema-style focus pull effect that transitions text from extreme bokeh blur (f/1.2 style) 
 * to crystal sharp clarity. Features:
 * - Realistic optical qualities with circular bokeh shapes
 * - Chromatic aberration during blur phase (split RGB channels)
 * - Subtle 3D perspective shifts as text comes into focus
 * - Organic camera shake mimicking manual follow-focus operation
 * - Word-by-word staggered focus pull for captions (wave effect)
 * - Physically accurate easing that mimics lens barrel resistance
 *
 * Use cases:
 * - Professional video intros with cinematic feel
 * - High-end product reveals
 * - Dramatic text reveals for storytelling
 * - Artistic subtitle presentations
 * - Cinematic title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Caption unique identifier'),
        text: z.string().describe('Full caption text'),
        start: z.number().describe('Caption start time (relative to caption start = 0)'),
        end: z.number().describe('Caption end time (relative)'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline (scene-relative)'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            id: z.string().optional().describe('Word unique identifier'),
            text: z.string().describe('Word text'),
            start: z.number().describe('Word start time (relative to caption)'),
            end: z.number().describe('Word end time (relative)'),
            duration: z.number().describe('Word duration'),
            absoluteStart: z.number().describe('Absolute start in caption timeline'),
            absoluteEnd: z.number().describe('Absolute end in caption timeline'),
            confidence: z.number().optional().describe('Speech recognition confidence'),
          }),
        ),
        metadata: z.any().optional().describe('Optional caption metadata'),
      }),
    )
    .describe('Array of captions with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),

  focusPullDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.5)
    .describe('Duration of focus pull animation in seconds'),

  wordStagger: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between word focus pulls in seconds (creates wave effect)'),

  blurIntensity: z
    .number()
    .min(5)
    .max(30)
    .default(20)
    .describe('Maximum blur intensity in pixels (simulates f/1.2 bokeh)'),

  chromaticAberrationIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Chromatic aberration intensity in pixels (RGB channel split)'),

  cameraShakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1.5)
    .describe('Camera shake intensity in pixels'),

  bokehOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of bokeh circle elements'),

  trackName: z
    .string()
    .default('focus-pull-track')
    .describe('Track name for unique IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    focusPullDuration,
    wordStagger,
    blurIntensity,
    chromaticAberrationIntensity,
    cameraShakeIntensity,
    bokehOpacity,
    trackName,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
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

  const rootChildren: RenderableComponentData[] = [];

  // ============================================================================
  // BOKEH BACKGROUND LAYER (Static decorative bokeh circles)
  // ============================================================================

  const bokehLayerId = `${trackName}-bokeh-layer`;
  const bokehCircles: RenderableComponentData[] = [
    // Bokeh circle 1 (top-left, white)
    {
      id: `${bokehLayerId}-circle-1`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,${bokehOpacity}) 0%, rgba(255,255,255,0) 70%); position: absolute; top: 15%; left: 20%;"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
        },
      },
    } as RenderableComponentData,
    // Bokeh circle 2 (bottom-right, warm)
    {
      id: `${bokehLayerId}-circle-2`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle, rgba(255,200,150,${bokehOpacity * 0.8}) 0%, rgba(255,200,150,0) 70%); position: absolute; top: 60%; right: 25%;"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
        },
      },
    } as RenderableComponentData,
    // Bokeh circle 3 (bottom-left, cool)
    {
      id: `${bokehLayerId}-circle-3`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle, rgba(150,200,255,${bokehOpacity * 0.7}) 0%, rgba(150,200,255,0) 70%); position: absolute; bottom: 20%; left: 30%;"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
        },
      },
    } as RenderableComponentData,
  ];

  const bokehLayer: RenderableComponentData = {
    id: bokehLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: bokehCircles,
  } as RenderableComponentData;

  rootChildren.push(bokehLayer);

  // ============================================================================
  // PROCESS CAPTIONS - Create word-by-word focus pull
  // ============================================================================

  captions.forEach((caption, captionIndex) => {
    const captionId = `${trackName}-caption-${captionIndex}`;
    const words = caption.words || [];

    // Create word components with staggered focus pull effects
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;
      
      // Calculate staggered effect start time (relative to caption start)
      const effectStart = word.start + (wordIndex * wordStagger);
      const effectDuration = Math.min(focusPullDuration, word.duration + wordStagger);

      // Focus pull effect: blur (20px → 0px), scale (1.05 → 1.0), perspective
      const focusPullEffect = {
        id: `${wordId}-focus-pull`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: effectStart,
          duration: effectDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Blur: extreme bokeh to sharp
            { key: 'blur', val: `${blurIntensity}px`, prog: 0 },
            { key: 'blur', val: '0px', prog: 1 },
            // Scale: slightly enlarged to normal
            { key: 'scale', val: 1.05, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // 3D perspective rotation
            { key: 'rotateX', val: 2, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            // Z-axis translation for depth
            { key: 'translateZ', val: 20, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
          ],
        },
      };

      // Chromatic aberration effect (RGB channel split)
      const chromaticEffect = {
        id: `${wordId}-chromatic`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: effectStart,
          duration: effectDuration * 0.8,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Text shadow simulating RGB split (red/cyan offset)
            { key: 'textShadow', val: `${chromaticAberrationIntensity}px 0 0 rgba(255,0,0,0.4), -${chromaticAberrationIntensity}px 0 0 rgba(0,255,255,0.4)`, prog: 0 },
            { key: 'textShadow', val: '0px 0 0 rgba(255,0,0,0), 0px 0 0 rgba(0,255,255,0)', prog: 1 },
          ],
        },
      };

      // Camera shake effect (subtle XY translation)
      const shakeEffect = {
        id: `${wordId}-shake`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: effectStart,
          duration: effectDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // X-axis shake
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: cameraShakeIntensity, prog: 0.2 },
            { key: 'translateX', val: -cameraShakeIntensity * 0.7, prog: 0.5 },
            { key: 'translateX', val: cameraShakeIntensity * 0.3, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
            // Y-axis shake
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -cameraShakeIntensity * 0.7, prog: 0.3 },
            { key: 'translateY', val: cameraShakeIntensity * 0.5, prog: 0.6 },
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
            marginRight: '0.3em',
            transform: 'translateZ(0)', // GPU acceleration
            willChange: 'filter, transform',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [focusPullEffect, chromaticEffect, shakeEffect],
      } as RenderableComponentData;
    });

    // Caption container with word flex layout
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            zIndex: 10,
            perspective: '1000px',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        {
          id: `${captionId}-word-group`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-wrap items-center justify-center gap-3 px-8',
              style: {
                maxWidth: '90%',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordComponents,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    rootChildren.push(captionContainer);
  });

  // ============================================================================
  // BOKEH FADE EFFECT (Fade out bokeh as text comes into focus)
  // ============================================================================

  const bokehFadeEffect = {
    id: `${bokehLayerId}-fade`,
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: Math.min(focusPullDuration * 0.8, 2),
      mode: 'provider' as const,
      targetIds: [
        `${bokehLayerId}-circle-1`,
        `${bokehLayerId}-circle-2`,
        `${bokehLayerId}-circle-3`,
      ],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Apply fade effect to bokeh layer
  if (bokehLayer.effects) {
    bokehLayer.effects.push(bokehFadeEffect);
  } else {
    bokehLayer.effects = [bokehFadeEffect];
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: rootChildren,
  } as RenderableComponentData;

  // ============================================================================
  // RETURN PRESET OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'cinematic-focus-pull-typography',
  title: 'Cinematic Focus Pull Typography',
  description:
    'Professional cinema-style focus pull effect that transitions text from extreme bokeh blur (f/1.2 style) to crystal sharp clarity. Features realistic optical qualities with circular bokeh, chromatic aberration during blur phase, subtle 3D perspective shifts, organic camera shake, and word-by-word staggered focus pull for captions. Mimics manual follow-focus operation with physically accurate easing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'cinematic',
    'focus-pull',
    'bokeh',
    'chromatic-aberration',
    '3d',
    'perspective',
    'camera-shake',
    'captions',
    'subtitles',
    'professional',
    'artistic',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Cinematic focus pull',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'Cinematic',
            start: 0,
            end: 1,
            duration: 1,
            absoluteStart: 0,
            absoluteEnd: 1,
          },
          {
            id: 'word-2',
            text: 'focus',
            start: 1,
            end: 2,
            duration: 1,
            absoluteStart: 1,
            absoluteEnd: 2,
          },
          {
            id: 'word-3',
            text: 'pull',
            start: 2,
            end: 3,
            duration: 1,
            absoluteStart: 2,
            absoluteEnd: 3,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 64,
    textColor: '#FFFFFF',
    focusPullDuration: 2.5,
    wordStagger: 0.1,
    blurIntensity: 20,
    chromaticAberrationIntensity: 2,
    cameraShakeIntensity: 1.5,
    bokehOpacity: 0.3,
    trackName: 'focus-pull-track',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const cinematicFocusPullTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
