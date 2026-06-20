/**
 * Parallax Zoom Text Layers Preset
 *
 * This preset creates depth through motion parallax with three text layers zooming
 * at different rates (background 100-101%, main 100-102%, foreground 100-103%).
 * Uses caption metadata to identify keywords for foreground layer, with opacity
 * and blur effects to enhance the depth illusion.
 *
 * Features:
 * - **Three-Layer Depth**: Background (slowest), main (medium), foreground (fastest) zoom rates
 * - **Keyword Detection**: Uses caption.metadata.keyword to identify emphasis words
 * - **Visual Depth Cues**: Background layer with blur and opacity, foreground with sharp text
 * - **Motion Parallax**: Different zoom speeds create cinematic depth effect
 * - **Flexible Typography**: Custom font families and styling options
 *
 * Use cases:
 * - Creating cinematic text reveals with depth
 * - Emphasizing keywords with parallax motion
 * - Building multi-plane camera effects for titles
 * - Adding professional depth to subtitle animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time within caption'),
        absoluteStart: z
          .number()
          .describe('Absolute start in caption timeline'),
        end: z.number().describe('Relative end time within caption'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        duration: z.number().describe('Caption duration'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z
              .number()
              .describe('Relative start time within caption (not absolute)'),
            absoluteStart: z
              .number()
              .describe('Absolute start in caption timeline'),
            end: z.number().describe('Relative end time within caption'),
            absoluteEnd: z
              .number()
              .describe('Absolute end in caption timeline'),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z
              .string()
              .optional()
              .describe('Keyword to place in foreground layer'),
            impact: z
              .number()
              .optional()
              .describe('Effect intensity multiplier'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),

  backgroundLayer: z
    .object({
      fontSize: z
        .number()
        .min(12)
        .max(200)
        .default(36)
        .describe('Font size for background layer text (px)'),
      color: z
        .string()
        .default('#FFFFFF')
        .describe('Text color for background layer'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.7)
        .describe('Opacity for background layer (0-1)'),
      blur: z
        .number()
        .min(0)
        .max(10)
        .default(0.5)
        .describe('Blur amount for background layer (px)'),
      zoomStart: z
        .number()
        .min(0.5)
        .max(2)
        .default(1.0)
        .describe('Starting scale for background layer'),
      zoomEnd: z
        .number()
        .min(0.5)
        .max(2)
        .default(1.01)
        .describe('Ending scale for background layer'),
    })
    .optional()
    .describe('Configuration for background layer (slowest zoom)'),

  mainLayer: z
    .object({
      fontSize: z
        .number()
        .min(12)
        .max(200)
        .default(48)
        .describe('Font size for main layer text (px)'),
      color: z
        .string()
        .default('#FFFFFF')
        .describe('Text color for main layer'),
      zoomStart: z
        .number()
        .min(0.5)
        .max(2)
        .default(1.0)
        .describe('Starting scale for main layer'),
      zoomEnd: z
        .number()
        .min(0.5)
        .max(2)
        .default(1.02)
        .describe('Ending scale for main layer'),
    })
    .optional()
    .describe('Configuration for main layer (medium zoom)'),

  foregroundLayer: z
    .object({
      fontSize: z
        .number()
        .min(12)
        .max(200)
        .default(64)
        .describe('Font size for foreground layer text (px)'),
      color: z
        .string()
        .default('#FFFFFF')
        .describe('Text color for foreground layer'),
      fontWeight: z
        .string()
        .default('600')
        .describe('Font weight for foreground emphasis words'),
      zoomStart: z
        .number()
        .min(0.5)
        .max(2)
        .default(1.0)
        .describe('Starting scale for foreground layer'),
      zoomEnd: z
        .number()
        .min(0.5)
        .max(2)
        .default(1.03)
        .describe('Ending scale for foreground layer'),
    })
    .optional()
    .describe('Configuration for foreground layer (fastest zoom)'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text layers'),

  containerPadding: z
    .number()
    .min(0)
    .max(200)
    .default(40)
    .describe('Padding around text container (px)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string
  const fontString = params.font || 'Inter';
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

  // Get layer configurations with defaults
  const backgroundConfig = params.backgroundLayer || {
    fontSize: 36,
    color: '#FFFFFF',
    opacity: 0.7,
    blur: 0.5,
    zoomStart: 1.0,
    zoomEnd: 1.01,
  };

  const mainConfig = params.mainLayer || {
    fontSize: 48,
    color: '#FFFFFF',
    zoomStart: 1.0,
    zoomEnd: 1.02,
  };

  const foregroundConfig = params.foregroundLayer || {
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: '600',
    zoomStart: 1.0,
    zoomEnd: 1.03,
  };

  // Helper function to create text atoms for a layer
  const createLayerWords = (
    caption: TranscriptionSentence,
    filterFn: (word: any, caption: TranscriptionSentence) => boolean,
    layerConfig: any,
    layerId: string,
  ): RenderableComponentData[] => {
    return caption.words
      .filter((word) => filterFn(word, caption))
      .map((word, idx) => {
        const wordId = `${layerId}-${caption.id}-word-${idx}`;

        const textAtomData: TextAtomData = {
          text: word.text,
          style: {
            fontSize: `${layerConfig.fontSize}px`,
            color: layerConfig.color,
            fontWeight: layerConfig.fontWeight || 'normal',
            marginRight: '0.3em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        };

        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: textAtomData,
          context: {
            timing: {
              start: 0, // All words use sentence-level timing
              duration: caption.duration,
            },
          },
        } as RenderableComponentData;
      });
  };

  // Helper function to create caption container for a layer
  const createCaptionContainer = (
    caption: TranscriptionSentence,
    words: RenderableComponentData[],
    layerId: string,
  ): RenderableComponentData => {
    return {
      id: `${layerId}-${caption.id}-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap items-center justify-center',
          style: {
            padding: `${params.containerPadding}px`,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: words,
    } as RenderableComponentData;
  };

  // Create layer data
  const backgroundWords: RenderableComponentData[] = [];
  const mainWords: RenderableComponentData[] = [];
  const foregroundWords: RenderableComponentData[] = [];

  captions.forEach((caption) => {
    const keyword = caption.metadata?.keyword?.toLowerCase();

    // Background layer: all non-keyword words
    const bgWords = createLayerWords(
      caption,
      (word) => !keyword || word.text.toLowerCase() !== keyword,
      backgroundConfig,
      'background',
    );
    if (bgWords.length > 0) {
      backgroundWords.push(createCaptionContainer(caption, bgWords, 'background'));
    }

    // Main layer: all words
    const mainLayerWords = createLayerWords(
      caption,
      () => true,
      mainConfig,
      'main',
    );
    if (mainLayerWords.length > 0) {
      mainWords.push(createCaptionContainer(caption, mainLayerWords, 'main'));
    }

    // Foreground layer: only keyword words
    if (keyword) {
      const fgWords = createLayerWords(
        caption,
        (word) => word.text.toLowerCase() === keyword,
        foregroundConfig,
        'foreground',
      );
      if (fgWords.length > 0) {
        foregroundWords.push(
          createCaptionContainer(caption, fgWords, 'foreground'),
        );
      }
    }
  });

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(
          ...captions.map((c) => c.absoluteStart + c.duration),
        )
      : 10;

  // Position class based on params
  const positionClass =
    params.position === 'top'
      ? 'items-start'
      : params.position === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Background layer with blur and opacity
  const backgroundLayer: RenderableComponentData = {
    id: 'parallax-background-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col justify-center ${positionClass}`,
        style: {
          opacity: backgroundConfig.opacity,
          filter: `blur(${backgroundConfig.blur}px)`,
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
        id: 'background-zoom-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['parallax-background-layer'],
          ranges: [
            { key: 'scale', val: backgroundConfig.zoomStart, prog: 0 },
            { key: 'scale', val: backgroundConfig.zoomEnd, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: backgroundWords,
  };

  // Main layer (normal opacity, no blur)
  const mainLayer: RenderableComponentData = {
    id: 'parallax-main-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col justify-center ${positionClass}`,
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
        id: 'main-zoom-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['parallax-main-layer'],
          ranges: [
            { key: 'scale', val: mainConfig.zoomStart, prog: 0 },
            { key: 'scale', val: mainConfig.zoomEnd, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: mainWords,
  };

  // Foreground layer (sharp, bold, fastest zoom)
  const foregroundLayer: RenderableComponentData = {
    id: 'parallax-foreground-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col justify-center ${positionClass}`,
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
        id: 'foreground-zoom-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['parallax-foreground-layer'],
          ranges: [
            { key: 'scale', val: foregroundConfig.zoomStart, prog: 0 },
            { key: 'scale', val: foregroundConfig.zoomEnd, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: foregroundWords,
  };

  // Root container with all three layers
  const rootContainer: RenderableComponentData = {
    id: 'parallax-zoom-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [backgroundLayer, mainLayer, foregroundLayer],
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
  id: 'ParallaxZoomTextLayers',
  title: 'Parallax Zoom Text Layers',
  description:
    'Creates depth through motion parallax with three text layers zooming at different rates (background 100-101%, main 100-102%, foreground 100-103%). Uses caption metadata to identify keywords for foreground layer, with opacity and blur effects to enhance depth illusion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'parallax',
    'zoom',
    'depth',
    'layers',
    'keywords',
    'emphasis',
    'motion',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter',
    backgroundLayer: {
      fontSize: 36,
      color: '#FFFFFF',
      opacity: 0.7,
      blur: 0.5,
      zoomStart: 1.0,
      zoomEnd: 1.01,
    },
    mainLayer: {
      fontSize: 48,
      color: '#FFFFFF',
      zoomStart: 1.0,
      zoomEnd: 1.02,
    },
    foregroundLayer: {
      fontSize: 64,
      color: '#FFFFFF',
      fontWeight: '600',
      zoomStart: 1.0,
      zoomEnd: 1.03,
    },
    position: 'center',
    containerPadding: 40,
  },
};

// Export preset
export const ParallaxZoomTextLayersPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
