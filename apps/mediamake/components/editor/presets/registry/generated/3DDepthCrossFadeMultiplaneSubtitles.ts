/**
 * 3D Depth Cross-Fade Multiplane Subtitles Preset
 *
 * This preset creates a stunning 3D depth transition effect simulating movement through
 * parallax layers, like classic Disney multiplane camera work. The first caption line
 * recedes into the background (scaling down, fading, blurring) while the second line
 * approaches from depth (scaling up, focusing, brightening). Individual words have
 * different depth layers with staggered Z-axis animations, creating a multi-plane
 * animation effect that feels like flying through text in 3D space.
 *
 * Features:
 * - **3D Perspective Transform**: CSS perspective and transform3d for realistic depth
 * - **Multiplane Parallax**: Each word on a different Z-depth layer
 * - **Kinetic Energy**: Z-axis rotation (rotateY) and perspective transforms
 * - **Depth-Based Effects**: Scale, translateZ, opacity, blur, shadows change with depth
 * - **Smooth Transitions**: Ease-in-out timing for fluid depth movement
 * - **Staggered Animation**: Words animate at different speeds for cascading effect
 *
 * Use cases:
 * - Creating cinematic subtitle transitions with 3D depth
 * - Building engaging text animations for video content
 * - Adding professional parallax effects to captions
 * - Creating immersive "flying through text" experiences
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
        duration: z.number().describe('Caption duration in seconds'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z.number().describe('Word start time relative to caption'),
              duration: z.number().describe('Word duration'),
            }),
          )
          .optional()
          .describe('Word-level timing data'),
      }),
    )
    .describe('Array of caption objects with timing'),

  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of the 3D depth transition in seconds'),

  perspectiveDistance: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('CSS perspective distance in pixels'),

  maxTranslateZ: z
    .number()
    .min(100)
    .max(500)
    .default(300)
    .describe('Maximum Z-axis translation distance in pixels'),

  maxRotation: z
    .number()
    .min(0)
    .max(45)
    .default(25)
    .describe('Maximum rotation angle in degrees'),

  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum blur amount in pixels'),

  wordStaggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each word animation start in seconds'),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(64)
    .describe('Font size in pixels'),

  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700")'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),

  textShadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of depth-based text shadow (0-1)'),

  depthLayerCount: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Number of depth layers (affects translateZ variation)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    transitionDuration,
    perspectiveDistance,
    maxTranslateZ,
    maxRotation,
    maxBlur,
    wordStaggerDelay,
    fontSize,
    fontFamily,
    textColor,
    textShadowIntensity,
    depthLayerCount,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts[1] ? parseInt(parts[1], 10) : 700;
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };

  const fontConfig = parseFontString(fontFamily);

  // Calculate depth variation per layer
  const calculateDepthForLayer = (layerIndex: number, totalLayers: number) => {
    // Layer 0 = shallowest, last layer = deepest
    const layerRatio = layerIndex / Math.max(totalLayers - 1, 1);
    return maxTranslateZ * (0.7 + layerRatio * 0.6); // 0.7x to 1.3x variation
  };

  const childrenData: RenderableComponentData[] = [];

  // Process caption pairs for transitions
  for (let i = 0; i < captions.length; i++) {
    const currentCaption = captions[i];
    const nextCaption = captions[i + 1];

    if (!nextCaption) {
      // Last caption - no transition
      const words = currentCaption.words || [
        { text: currentCaption.text, start: 0, duration: currentCaption.duration },
      ];

      const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
        const wordId = `caption-${i}-word-${wordIndex}`;
        const layerIndex = wordIndex % depthLayerCount;

        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontConfig.weight,
              fontStyle: fontConfig.style as any,
              color: textColor,
              textShadow: `0 0 ${20 * textShadowIntensity}px rgba(255,255,255,${textShadowIntensity})`,
              marginRight: '0.3em',
            },
            font: {
              family: fontConfig.family,
              weights: [fontConfig.weight.toString()],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: currentCaption.duration,
            },
          },
        } as RenderableComponentData;
      });

      // Container for last caption (no transition)
      childrenData.push({
        id: `caption-${i}-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center gap-4',
            style: {
              perspective: `${perspectiveDistance}px`,
              perspectiveOrigin: 'center center',
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: currentCaption.absoluteStart,
            duration: currentCaption.duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData);

      continue;
    }

    // Create transition between current and next caption
    const transitionStart = currentCaption.absoluteStart + currentCaption.duration - transitionDuration;
    const transitionEnd = transitionStart + transitionDuration;

    // Split words for current caption (line 1 - receding)
    const currentWords = currentCaption.words || [
      { text: currentCaption.text, start: 0, duration: currentCaption.duration },
    ];

    const line1WordComponents: RenderableComponentData[] = currentWords.map((word, wordIndex) => {
      const wordId = `line1-caption-${i}-word-${wordIndex}`;
      const layerIndex = wordIndex % depthLayerCount;
      const depthZ = calculateDepthForLayer(layerIndex, depthLayerCount);
      const staggerStart = wordIndex * wordStaggerDelay;

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontConfig.weight,
            fontStyle: fontConfig.style as any,
            color: textColor,
            textShadow: `0 0 ${20 * textShadowIntensity}px rgba(255,255,255,${textShadowIntensity})`,
            marginRight: '0.3em',
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: currentCaption.duration,
          },
        },
        effects: [
          {
            id: `line1-word-${wordIndex}-depth-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: currentCaption.duration - transitionDuration + staggerStart,
              duration: transitionDuration - staggerStart,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Scale down
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.5, prog: 1 },
                // Move back in Z
                { key: 'translateZ', val: 0, prog: 0 },
                { key: 'translateZ', val: -depthZ, prog: 1 },
                // Fade out
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                // Blur
                { key: 'blur', val: 0, prog: 0 },
                { key: 'blur', val: maxBlur, prog: 1 },
                // Rotate
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: -(maxRotation * (layerIndex + 1) / depthLayerCount), prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });

    // Split words for next caption (line 2 - approaching)
    const nextWords = nextCaption.words || [
      { text: nextCaption.text, start: 0, duration: nextCaption.duration },
    ];

    const line2WordComponents: RenderableComponentData[] = nextWords.map((word, wordIndex) => {
      const wordId = `line2-caption-${i}-word-${wordIndex}`;
      const layerIndex = wordIndex % depthLayerCount;
      const depthZ = calculateDepthForLayer(layerIndex, depthLayerCount);
      const staggerStart = wordIndex * wordStaggerDelay;

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontConfig.weight,
            fontStyle: fontConfig.style as any,
            color: textColor,
            textShadow: `0 0 ${20 * textShadowIntensity}px rgba(255,255,255,${textShadowIntensity})`,
            marginRight: '0.3em',
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: nextCaption.duration,
          },
        },
        effects: [
          {
            id: `line2-word-${wordIndex}-depth-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: staggerStart,
              duration: transitionDuration - staggerStart,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Scale up
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                // Move forward in Z
                { key: 'translateZ', val: -depthZ, prog: 0 },
                { key: 'translateZ', val: 0, prog: 1 },
                // Fade in
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                // Unblur
                { key: 'blur', val: maxBlur, prog: 0 },
                { key: 'blur', val: 0, prog: 1 },
                // Rotate
                { key: 'rotateY', val: maxRotation * (layerIndex + 1) / depthLayerCount, prog: 0 },
                { key: 'rotateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });

    // Line 1 container (receding)
    childrenData.push({
      id: `line1-caption-${i}-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center gap-4',
          style: {
            transformStyle: 'preserve-3d',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: currentCaption.absoluteStart,
          duration: currentCaption.duration,
        },
      },
      childrenData: line1WordComponents,
    } as RenderableComponentData);

    // Line 2 container (approaching)
    childrenData.push({
      id: `line2-caption-${i}-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center gap-4',
          style: {
            transformStyle: 'preserve-3d',
            zIndex: 5,
          },
        },
      },
      context: {
        timing: {
          start: nextCaption.absoluteStart,
          duration: nextCaption.duration,
        },
      },
      childrenData: line2WordComponents,
    } as RenderableComponentData);
  }

  // Root perspective container
  const rootContainer: RenderableComponentData = {
    id: '3d-depth-crossfade-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspectiveDistance}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: [
      {
        id: '3d-transform-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              transformStyle: 'preserve-3d',
              width: '90%',
              height: 'auto',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'this',
          },
        },
        childrenData,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: '3DDepthCrossFadeMultiplaneSubtitles',
  title: '3D Depth Cross-Fade Multiplane Subtitles',
  description:
    'Simulates 3D space through depth-based cross-fade transitions with multiplane parallax animation. First caption line recedes into background (scale down, fade, blur, translateZ back) while second line approaches from depth (scale up, focus, brighten, translateZ forward). Individual words have different depth layers with staggered Z-axis animation, creating Disney multiplane camera effect. Features CSS perspective transforms, rotateY kinetic energy, and depth-based shadows for flying through text in 3D space.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    '3d',
    'depth',
    'parallax',
    'multiplane',
    'cross-fade',
    'perspective',
    'transform3d',
    'kinetic',
    'z-axis',
    'disney',
    'cinematic',
  ],
  defaultInputParams: {
    captions: [
      {
        text: 'Welcome to the show',
        absoluteStart: 0,
        duration: 3,
        words: [
          { text: 'Welcome', start: 0, duration: 1 },
          { text: 'to', start: 1, duration: 0.5 },
          { text: 'the', start: 1.5, duration: 0.5 },
          { text: 'show', start: 2, duration: 1 },
        ],
      },
      {
        text: 'This is amazing',
        absoluteStart: 3,
        duration: 3,
        words: [
          { text: 'This', start: 0, duration: 0.8 },
          { text: 'is', start: 0.8, duration: 0.7 },
          { text: 'amazing', start: 1.5, duration: 1.5 },
        ],
      },
      {
        text: 'Enjoy the experience',
        absoluteStart: 6,
        duration: 3,
        words: [
          { text: 'Enjoy', start: 0, duration: 1 },
          { text: 'the', start: 1, duration: 0.5 },
          { text: 'experience', start: 1.5, duration: 1.5 },
        ],
      },
    ],
    transitionDuration: 1.5,
    perspectiveDistance: 1000,
    maxTranslateZ: 300,
    maxRotation: 25,
    maxBlur: 8,
    wordStaggerDelay: 0.1,
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    textShadowIntensity: 0.8,
    depthLayerCount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const threeDepthCrossFadeMultiplaneSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
