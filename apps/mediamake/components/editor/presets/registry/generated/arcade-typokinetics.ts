/**
 * Arcade Typokinetics Preset
 *
 * Retro arcade-inspired kinetic typography with pixel-perfect timing, 8-bit style transitions,
 * CRT effects (scanlines, curvature), chromatic aberration via RGB text layers, bass-driven
 * screen shake with 8px grid snapping, and a combo multiplier system that rewards consecutive
 * high-impact words with intensifying visual effects.
 *
 * Features:
 * - Pixel-perfect flash timing using step(1, end) easing for instant transitions
 * - Screen shake effect with 8px grid snapping based on bass distortion
 * - Rainbow chromatic aberration on edges using RGB text layers
 * - Scanline and CRT curvature overlays for retro aesthetic
 * - Combo multiplier system tracking consecutive high-impact words
 * - Pixelated scaling with nearest-neighbor interpolation aesthetics
 * - Press Start 2P font for authentic arcade look
 *
 * Use cases:
 * - Retro gaming content with 8-bit aesthetic
 * - Chiptune music videos
 * - Arcade-style title sequences
 * - Gaming commentary overlays
 * - Nostalgia-driven social media content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
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
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for bass distortion screen shake'),

  baseImpact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.0)
    .describe('Base impact multiplier for effects (0.1-3.0)'),

  comboThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Impact threshold for combo multiplier (words with impact > this value count towards combo)',
    ),

  enableScreenShake: z
    .boolean()
    .default(true)
    .describe('Enable bass-driven screen shake effect'),

  shakeIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1.0)
    .describe('Screen shake intensity multiplier'),

  enableChromaticAberration: z
    .boolean()
    .default(true)
    .describe('Enable RGB chromatic aberration on text edges'),

  chromaticOffset: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Chromatic aberration offset in pixels'),

  enableScanlines: z
    .boolean()
    .default(true)
    .describe('Enable CRT scanline overlay'),

  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Scanline overlay opacity (0-1)'),

  fontSize: z.number().min(24).max(200).default(72).describe('Base font size'),

  textColor: z
    .string()
    .default('#22c55e')
    .describe('Main text color (arcade green default)'),

  glowIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1.5)
    .describe('Text glow intensity multiplier'),

  comboCounterPosition: z
    .enum(['top-right', 'top-left', 'bottom-right', 'bottom-left'])
    .default('top-right')
    .describe('Position of combo counter overlay'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---
const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    audioSrc,
    baseImpact,
    comboThreshold,
    enableScreenShake,
    shakeIntensity,
    enableChromaticAberration,
    chromaticOffset,
    enableScanlines,
    scanlineOpacity,
    fontSize,
    textColor,
    glowIntensity,
    comboCounterPosition,
  } = params;

  const { config, fetcher } = props;
  const fps = config?.fps ?? 30;

  // Helper: Calculate combo multiplier for each caption
  const calculateComboMultiplier = (
    captionIndex: number,
  ): { multiplier: number; comboCount: number } => {
    let comboCount = 0;
    let multiplier = 1;

    // Look back at previous captions to count consecutive high-impact words
    for (let i = captionIndex; i >= 0; i--) {
      const caption = captions[i];
      const impact = caption.metadata?.impact ?? baseImpact;

      if (impact > comboThreshold) {
        comboCount++;
      } else {
        break; // Break combo streak
      }
    }

    // Calculate multiplier based on combo count
    if (comboCount >= 5) {
      multiplier = 3.0; // x3 multiplier
    } else if (comboCount >= 3) {
      multiplier = 2.0; // x2 multiplier
    } else if (comboCount >= 2) {
      multiplier = 1.5; // x1.5 multiplier
    } else {
      multiplier = 1.0; // x1 multiplier
    }

    return { multiplier, comboCount };
  };

  // Helper: Get combo counter position styles
  const getComboCounterPosition = (
    position: string,
  ): { top?: string; right?: string; bottom?: string; left?: string } => {
    switch (position) {
      case 'top-right':
        return { top: '32px', right: '32px' };
      case 'top-left':
        return { top: '32px', left: '32px' };
      case 'bottom-right':
        return { bottom: '32px', right: '32px' };
      case 'bottom-left':
        return { bottom: '32px', left: '32px' };
      default:
        return { top: '32px', right: '32px' };
    }
  };

  // Analyze audio for screen shake if enabled
  let audioAnalysis: any[] = [];
  if (enableScreenShake && audioSrc && fetcher) {
    try {
      const { analysis } = await fetcher('/api/analyze-audio', { audioSrc });
      audioAnalysis = analysis || [];
    } catch (error) {
      console.warn('Audio analysis failed:', error);
    }
  }

  // Helper: Get screen shake value at timestamp (8px grid snapping)
  const getScreenShakeValue = (timestamp: number): { x: number; y: number } => {
    if (!enableScreenShake || audioAnalysis.length === 0) {
      return { x: 0, y: 0 };
    }

    // Find nearest audio analysis beat
    const nearestBeat = audioAnalysis.reduce((prev, curr) => {
      return Math.abs(curr.timestamp - timestamp) <
        Math.abs(prev.timestamp - timestamp)
        ? curr
        : prev;
    }, audioAnalysis[0]);

    const intensity = nearestBeat?.intensity ?? 0;
    const baseShake = 16 * shakeIntensity * intensity;

    // Snap to 8px grid
    const snapToGrid = (value: number) =>
      Math.round(value / 8) * 8 * (Math.random() > 0.5 ? 1 : -1);

    return {
      x: snapToGrid(baseShake),
      y: snapToGrid(baseShake * 0.5),
    };
  };

  // Generate caption word components with chromatic aberration
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const { multiplier, comboCount } = calculateComboMultiplier(captionIndex);
    const impact = (caption.metadata?.impact ?? baseImpact) * multiplier;

    // Screen shake value at caption start
    const shakeValue = getScreenShakeValue(caption.absoluteStart);

    // Create screen shake container for this caption
    const screenShakeContainerId = `screen-shake-${captionIndex}`;

    // Word components for this caption
    const wordComponents: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = word.id || `word-${captionIndex}-${wordIndex}`;

      // Chromatic aberration layers (red, main, blue)
      const chromaticLayers: RenderableComponentData[] = [];

      if (enableChromaticAberration) {
        // Red layer (left offset)
        chromaticLayers.push({
          id: `${wordId}-red`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: 'font-mono',
            style: {
              color: '#ff0000',
              fontSize: `${fontSize * impact}px`,
              fontWeight: 'bold',
              textShadow: `0 0 ${10 * glowIntensity}px #ff0000`,
              imageRendering: 'pixelated',
              opacity: 0.7,
              position: 'absolute',
              left: `-${chromaticOffset}px`,
            },
            font: {
              family: 'Press Start 2P',
              weights: ['400'],
            },
          },
          context: {
            timing: {
              start: word.start,
              duration: word.duration,
            },
          },
        } as RenderableComponentData);

        // Blue layer (right offset)
        chromaticLayers.push({
          id: `${wordId}-blue`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: 'font-mono',
            style: {
              color: '#0088ff',
              fontSize: `${fontSize * impact}px`,
              fontWeight: 'bold',
              textShadow: `0 0 ${10 * glowIntensity}px #0088ff`,
              imageRendering: 'pixelated',
              opacity: 0.7,
              position: 'absolute',
              left: `${chromaticOffset}px`,
            },
            font: {
              family: 'Press Start 2P',
              weights: ['400'],
            },
          },
          context: {
            timing: {
              start: word.start,
              duration: word.duration,
            },
          },
        } as RenderableComponentData);
      }

      // Main green layer
      const mainLayer: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'font-mono',
          style: {
            color: textColor,
            fontSize: `${fontSize * impact}px`,
            fontWeight: 'bold',
            textShadow: `0 0 ${20 * glowIntensity * impact}px ${textColor}, 0 0 ${40 * glowIntensity * impact}px ${textColor}`,
            imageRendering: 'pixelated',
            position: 'relative',
            zIndex: 10,
          },
          font: {
            family: 'Press Start 2P',
            weights: ['400'],
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: [
          // Pixel-perfect flash effect (step timing)
          {
            id: `${wordId}-flash`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: word.start,
              duration: 0.1,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;

      // Word container with chromatic layers
      const wordContainer: RenderableComponentData = {
        id: `${wordId}-container`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              marginRight: '0.3em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [...chromaticLayers, mainLayer],
      } as RenderableComponentData;

      wordComponents.push(wordContainer);
    });

    // Caption container with screen shake
    const captionContainer: RenderableComponentData = {
      id: `caption-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: `translate(${shakeValue.x}px, ${shakeValue.y}px)`,
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
          id: `word-display-${captionIndex}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row flex-wrap items-center justify-center',
              style: {
                gap: '0.5em',
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

    captionComponents.push(captionContainer);

    // Combo counter for this caption (if combo count > 1)
    if (comboCount > 1) {
      const comboCounterPosition = getComboCounterPosition(
        params.comboCounterPosition,
      );

      const comboCounter: RenderableComponentData = {
        id: `combo-counter-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex flex-col items-end',
            style: {
              zIndex: 50,
              ...comboCounterPosition,
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
            id: `combo-multiplier-${captionIndex}`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: `x${multiplier.toFixed(1)}`,
              className: 'font-mono',
              style: {
                color: '#fbbf24',
                fontSize: `${48 * multiplier}px`,
                fontWeight: 'bold',
                textShadow: `0 0 ${15 * multiplier}px #fbbf24, 0 0 ${30 * multiplier}px #f59e0b`,
                imageRendering: 'pixelated',
              },
              font: {
                family: 'Press Start 2P',
                weights: ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
          {
            id: `combo-label-${captionIndex}`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: 'COMBO',
              className: 'font-mono',
              style: {
                color: '#fbbf24',
                fontSize: '16px',
                opacity: 0.8,
                imageRendering: 'pixelated',
              },
              font: {
                family: 'Press Start 2P',
                weights: ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      captionComponents.push(comboCounter);
    }
  });

  // CRT overlay components (scanlines and curvature)
  const crtOverlays: RenderableComponentData[] = [];

  if (enableScanlines) {
    crtOverlays.push({
      id: 'scanlines-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px); opacity: ${scanlineOpacity};"></div>`,
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 99,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'this',
        },
      },
    } as RenderableComponentData);
  }

  // CRT curvature overlay
  crtOverlays.push({
    id: 'crt-curvature-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 pointer-events-none" style="border-radius: 20px; box-shadow: inset 0 0 100px rgba(0,0,0,0.5); transform: perspective(500px) rotateX(1deg);"></div>`,
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: 100,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
  } as RenderableComponentData);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'arcade-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          imageRendering: 'pixelated',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: [...crtOverlays, ...captionComponents],
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
  id: 'arcade-typokinetics',
  title: 'Arcade Typokinetics',
  description:
    'Retro arcade-inspired kinetic typography with pixel-perfect timing, 8-bit style transitions, CRT effects (scanlines, curvature), chromatic aberration via RGB text layers, bass-driven screen shake with 8px grid snapping, and a combo multiplier system that rewards consecutive high-impact words with intensifying visual effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'typography',
    'kinetic',
    'arcade',
    'retro',
    '8-bit',
    'chiptune',
    'chromatic-aberration',
    'crt',
    'scanlines',
    'screen-shake',
    'combo',
    'pixel',
  ],
  defaultInputParams: {
    captions: [],
    baseImpact: 1.0,
    comboThreshold: 0.7,
    enableScreenShake: true,
    shakeIntensity: 1.0,
    enableChromaticAberration: true,
    chromaticOffset: 3,
    enableScanlines: true,
    scanlineOpacity: 0.6,
    fontSize: 72,
    textColor: '#22c55e',
    glowIntensity: 1.5,
    comboCounterPosition: 'top-right',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const arcadeTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
