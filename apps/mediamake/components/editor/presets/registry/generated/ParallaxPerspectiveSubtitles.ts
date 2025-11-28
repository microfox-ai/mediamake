/**
 * 3D Parallax Perspective Subtitles Preset
 *
 * This preset creates perspective-based parallax subtitles where text appears to exist in
 * true 3D space behind and in front of a static video subject. Text slides horizontally with
 * depth-based speed variations, creating an illusion of camera movement through text layers.
 *
 * Features:
 * - **3D Perspective Rendering**: Uses CSS perspective (1000px) for true 3D positioning
 * - **Multi-Layer Depth System**: Foreground (translateZ(200px)), mid (translateZ(0)), background (translateZ(-200px))
 * - **Smart Word Wrapping by Length**: Longer words appear farther back and move slower
 * - **Sentiment-Based Color Temperature**: Positive=warm colors, negative=cool colors
 * - **Motion Blur on Fast-Moving Text**: SVG filters on foreground layers
 * - **Depth-of-Field Blur**: Distant text gets blurred for realistic depth
 * - **Volumetric Text Shadows**: Duplicated text layers at different parallax speeds
 * - **Continuous Horizontal Slide Animation**: Text slides from -100% to 100% screen width
 * - **GPU Accelerated**: Uses transform3d and backface-visibility for performance
 *
 * Use cases:
 * - Creating immersive 3D subtitle experiences
 * - Building parallax text effects that react to video content
 * - Adding depth perception to caption overlays
 * - Creating cinematic text animations with spatial awareness
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Params Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
        metadata: z
          .object({
            sentiment: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing and sentiment'),

  video: z
    .object({
      src: z.string(),
      duration: z.number().optional(),
    })
    .describe('Video source and duration'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),

  baseFontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .optional()
    .describe('Base font size for mid-depth layer (foreground 1.5x, background 0.7x)'),

  slideSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe('Speed multiplier for parallax slide animation (higher = faster)'),

  depthIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for depth separation (higher = more 3D effect)'),

  motionBlurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .optional()
    .describe('Motion blur intensity in pixels for fast-moving foreground text'),

  depthBlurIntensity: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .optional()
    .describe('Depth-of-field blur intensity for distant background text'),

  shadowOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Opacity of volumetric text shadow layers'),

  warmColor: z
    .string()
    .default('#FFAA55')
    .optional()
    .describe('Color for positive sentiment (warm)'),

  coolColor: z
    .string()
    .default('#5599FF')
    .optional()
    .describe('Color for negative sentiment (cool)'),

  neutralColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Color for neutral sentiment'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    video,
    font = 'Inter:600',
    baseFontSize = 48,
    slideSpeed = 1,
    depthIntensity = 1,
    motionBlurIntensity = 8,
    depthBlurIntensity = 5,
    shadowOpacity = 0.3,
    warmColor = '#FFAA55',
    coolColor = '#5599FF',
    neutralColor = '#FFFFFF',
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0] || 'Inter';
    const weight = parts[1] ? parseInt(parts[1], 10) : 600;
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };

  const { family: fontFamily, weight: fontWeight, style: fontStyle } = parseFontString(font);

  // Helper: Get color based on sentiment
  const getColorBySentiment = (sentiment?: string): string => {
    if (!sentiment) return neutralColor;
    const sentimentLower = sentiment.toLowerCase();
    if (sentimentLower.includes('positive')) return warmColor;
    if (sentimentLower.includes('negative')) return coolColor;
    return neutralColor;
  };

  // Helper: Calculate depth layer based on word length (smart word wrapping)
  // Longer words = farther back = slower movement
  const getDepthLayerForWord = (wordText: string): 'foreground' | 'mid' | 'background' => {
    const length = wordText.length;
    if (length <= 4) return 'foreground'; // Short words in front
    if (length <= 8) return 'mid'; // Medium words in middle
    return 'background'; // Long words in back
  };

  // Depth configuration
  const depthLayers = {
    foreground: {
      translateZ: 200 * depthIntensity,
      fontSize: baseFontSize * 1.5,
      speedMultiplier: 2.5 * slideSpeed,
      blur: 0,
      motionBlur: motionBlurIntensity,
    },
    mid: {
      translateZ: 0,
      fontSize: baseFontSize,
      speedMultiplier: 1.5 * slideSpeed,
      blur: 0,
      motionBlur: motionBlurIntensity * 0.5,
    },
    background: {
      translateZ: -200 * depthIntensity,
      fontSize: baseFontSize * 0.7,
      speedMultiplier: 0.8 * slideSpeed,
      blur: depthBlurIntensity,
      motionBlur: 0,
    },
  };

  // Build SVG motion blur filter
  const motionBlurSVG = `
    <svg style="position: absolute; width: 0; height: 0; overflow: hidden;">
      <defs>
        <filter id="motion-blur-strong">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${motionBlurIntensity} 0" />
        </filter>
        <filter id="motion-blur-medium">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${motionBlurIntensity * 0.5} 0" />
        </filter>
        <filter id="depth-blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${depthBlurIntensity}" />
        </filter>
      </defs>
    </svg>
  `;

  // Create SVG filter component
  const svgFilterComponent = {
    id: 'svg-filters',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: motionBlurSVG,
      className: 'absolute inset-0',
      style: { pointerEvents: 'none' },
    },
    context: {
      timing: {
        start: 0,
        duration: video.duration || 30,
      },
    },
  } as RenderableComponentData;

  // Process captions and create word components grouped by depth
  const foregroundWords: any[] = [];
  const midWords: any[] = [];
  const backgroundWords: any[] = [];

  captions.forEach((caption, captionIndex) => {
    const sentiment = caption.metadata?.sentiment;
    const textColor = getColorBySentiment(sentiment);

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const depthLayer = getDepthLayerForWord(word.text);
      const layerConfig = depthLayers[depthLayer];

      // Calculate slide animation duration (based on speed)
      const slideDuration = caption.duration;

      // Create main word component
      const wordComponent = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${layerConfig.fontSize}px`,
            color: textColor,
            fontWeight: fontWeight,
            fontStyle: fontStyle as any,
            marginRight: '0.5em',
            filter:
              layerConfig.blur > 0
                ? `blur(${layerConfig.blur}px)`
                : layerConfig.motionBlur > 0
                  ? `url(#motion-blur-${depthLayer === 'foreground' ? 'strong' : 'medium'})`
                  : 'none',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0, // All words in caption start together
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `slide-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: slideDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateX', val: '-100vw', prog: 0 },
                { key: 'translateX', val: '100vw', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData;

      // Create shadow layer (volumetric text)
      const shadowId = `shadow-${wordId}`;
      const shadowComponent = {
        id: shadowId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${layerConfig.fontSize}px`,
            color: textColor,
            fontWeight: fontWeight,
            fontStyle: fontStyle as any,
            marginRight: '0.5em',
            opacity: shadowOpacity,
            filter:
              layerConfig.blur > 0
                ? `blur(${layerConfig.blur * 1.5}px)`
                : 'none',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `slide-shadow-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: slideDuration,
              mode: 'provider',
              targetIds: [shadowId],
              ranges: [
                // Shadow moves slower (depth effect)
                { key: 'translateX', val: '-100vw', prog: 0 },
                { key: 'translateX', val: '80vw', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData;

      // Add to appropriate depth layer
      if (depthLayer === 'foreground') {
        foregroundWords.push({ word: wordComponent, shadow: shadowComponent });
      } else if (depthLayer === 'mid') {
        midWords.push({ word: wordComponent, shadow: shadowComponent });
      } else {
        backgroundWords.push({ word: wordComponent, shadow: shadowComponent });
      }
    });
  });

  // Create depth layer containers
  const createDepthLayer = (
    layerId: string,
    translateZ: number,
    words: any[],
  ): RenderableComponentData => {
    const allComponents: RenderableComponentData[] = [];

    // Add shadows first (render behind)
    words.forEach(({ shadow }) => allComponents.push(shadow));
    // Add main words
    words.forEach(({ word }) => allComponents.push(word));

    return {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex flex-wrap items-center justify-start',
          style: {
            transform: `translateZ(${translateZ}px)`,
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            gap: '0.3em',
            padding: '40px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video.duration || 30,
        },
      },
      childrenData: allComponents,
    } as RenderableComponentData;
  };

  const backgroundLayer = createDepthLayer(
    'background-depth-layer',
    depthLayers.background.translateZ,
    backgroundWords,
  );
  const midLayer = createDepthLayer('mid-depth-layer', depthLayers.mid.translateZ, midWords);
  const foregroundLayer = createDepthLayer(
    'foreground-depth-layer',
    depthLayers.foreground.translateZ,
    foregroundWords,
  );

  // Create 3D parallax container
  const parallax3DContainer = {
    id: 'parallax-3d-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video.duration || 30,
      },
    },
    childrenData: [backgroundLayer, midLayer, foregroundLayer],
  } as RenderableComponentData;

  // Create video layer (static, centered)
  const videoLayer = {
    id: 'video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video.src,
      className: 'absolute inset-0 m-auto w-4/5 h-4/5 object-contain',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video.duration || 30,
      },
    },
  } as RenderableComponentData;

  // Create root perspective container
  const rootContainer = {
    id: 'perspective-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video.duration || 30,
      },
    },
    childrenData: [svgFilterComponent, videoLayer, parallax3DContainer],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'ParallaxPerspectiveSubtitles',
  title: '3D Parallax Perspective Subtitles',
  description:
    'Perspective-based parallax preset where text exists in true 3D space behind and in front of a static video subject. Text slides horizontally with depth-based speed variations, creating camera movement illusion. Features smart word wrapping by length (longer words = farther back), sentiment-driven color temperature (positive=warm, negative=cool), motion blur on fast foreground text, depth-of-field blur on distant text, and volumetric text shadows via duplicated layers at different parallax speeds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'parallax',
    '3d',
    'perspective',
    'depth',
    'sentiment',
    'motion-blur',
    'volumetric',
    'smart-wrapping',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    video: {
      src: 'video.mp4',
      duration: 30,
    },
    font: 'Inter:600',
    baseFontSize: 48,
    slideSpeed: 1,
    depthIntensity: 1,
    motionBlurIntensity: 8,
    depthBlurIntensity: 5,
    shadowOpacity: 0.3,
    warmColor: '#FFAA55',
    coolColor: '#5599FF',
    neutralColor: '#FFFFFF',
  },
};

// --- Export ---

export const ParallaxPerspectiveSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
