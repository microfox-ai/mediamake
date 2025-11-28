/**
 * Retro Arcade Stepped Rotation Subtitles Preset
 *
 * This preset creates arcade-style subtitles with pixelated aesthetics, stepped Y-axis rotation animation
 * (15-degree increments: -90, -75, -60, -45, -30, -15, 0), synchronized opacity progression (0, 0.14, 0.28, 0.42, 0.57, 0.71, 1.0),
 * neon glow pulse effect, CRT monitor distortion, and scanline overlays. Each word animates independently with
 * mechanical, rhythmic timing synchronized to 8-bit soundtracks.
 *
 * Features:
 * - **Stepped Y-Axis Rotation**: 15-degree increments for low-frame-rate animation feel
 * - **Synchronized Opacity**: Opacity increases in 7 steps matching rotation keyframes
 * - **Neon Glow Pulse**: Pulsing glow effect after text is fully visible
 * - **CRT Effects**: Monitor curve distortion and scanline overlay
 * - **Pixelated Font**: Press Start 2P or similar pixel font
 * - **Per-Word Animation**: Each word rotates in individually
 * - **Shake Effect**: Optional shake on impact words
 *
 * Use cases:
 * - Retro arcade video game titles and credits
 * - 8-bit style content and synthwave aesthetics
 * - Nostalgic gaming content
 * - Pixel art animations and overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Zod schema for input parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Start time relative to caption container (0 for first caption)'),
        absoluteStart: z.number().describe('Absolute start time in video timeline'),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Start time relative to caption start'),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          })
        ),
        metadata: z
          .object({
            impact: z.number().optional().describe('Effect intensity multiplier for this caption'),
          })
          .optional(),
      })
    )
    .describe('Array of caption objects with word-level timing'),

  font: z
    .string()
    .default('PressStart2P:400')
    .optional()
    .describe('Pixel font family with optional weight (e.g., "PressStart2P:400", "VT323:400")'),

  fontSize: z
    .number()
    .default(32)
    .describe('Font size in pixels for subtitle text'),

  textColor: z
    .string()
    .default('#00ff00')
    .describe('Text color for neon glow effect (e.g., "#00ff00" for green, "#ff00ff" for magenta)'),

  rotationDuration: z
    .number()
    .default(0.7)
    .describe('Total duration of stepped rotation animation in seconds (7 steps x 100ms = 700ms default)'),

  glowPulseDuration: z
    .number()
    .default(1.0)
    .describe('Duration of neon glow pulse cycle in seconds'),

  enableShakeOnImpact: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable shake effect on high-impact words'),

  shakeIntensity: z
    .number()
    .default(2)
    .optional()
    .describe('Shake intensity in pixels (1-5 recommended)'),

  scanlineOpacity: z
    .number()
    .default(0.6)
    .describe('Opacity of scanline overlay (0-1)'),

  crtCurveRadius: z
    .number()
    .default(3)
    .describe('Border radius percentage for CRT curve effect (0-10)'),

  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for arcade container'),

  impactThreshold: z
    .number()
    .default(0.7)
    .optional()
    .describe('Minimum intensity for shake effect (0-1)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    captions,
    font = 'PressStart2P:400',
    fontSize = 32,
    textColor = '#00ff00',
    rotationDuration = 0.7,
    glowPulseDuration = 1.0,
    enableShakeOnImpact = false,
    shakeIntensity = 2,
    scanlineOpacity = 0.6,
    crtCurveRadius = 3,
    backgroundColor = '#000000',
    impactThreshold = 0.7,
  } = params;

  // Parse font string
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontWeight = font.includes(':') ? parseInt(font.split(':')[1], 10) : 400;

  // Helper: Create stepped rotation effect with synchronized opacity
  const createSteppedRotationEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number
  ): any => {
    const effectData: GenericEffectData = {
      type: 'linear', // Use linear with steps(1, end) to create discrete jumps
      start: wordStart,
      duration: rotationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Stepped Y-axis rotation (15-degree increments)
        { key: 'rotateY', val: -90, prog: 0 },
        { key: 'rotateY', val: -75, prog: 0.143 },
        { key: 'rotateY', val: -60, prog: 0.286 },
        { key: 'rotateY', val: -45, prog: 0.429 },
        { key: 'rotateY', val: -30, prog: 0.571 },
        { key: 'rotateY', val: -15, prog: 0.714 },
        { key: 'rotateY', val: 0, prog: 1 },
        // Synchronized opacity progression
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.14, prog: 0.143 },
        { key: 'opacity', val: 0.28, prog: 0.286 },
        { key: 'opacity', val: 0.42, prog: 0.429 },
        { key: 'opacity', val: 0.57, prog: 0.571 },
        { key: 'opacity', val: 0.71, prog: 0.714 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    return {
      id: `stepped-rotation-${wordId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create neon glow pulse effect
  const createNeonGlowPulseEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number
  ): any => {
    const pulseStartTime = wordStart + rotationDuration;
    const pulseDuration = wordDuration - rotationDuration;

    if (pulseDuration <= 0) return null;

    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: pulseStartTime,
      duration: pulseDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Pulse glow using text-shadow intensity
        { key: 'filter', val: 'drop-shadow(0 0 10px currentColor)', prog: 0 },
        { key: 'filter', val: 'drop-shadow(0 0 20px currentColor) drop-shadow(0 0 30px currentColor)', prog: 0.5 },
        { key: 'filter', val: 'drop-shadow(0 0 10px currentColor)', prog: 1 },
      ],
    };

    return {
      id: `neon-pulse-${wordId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create shake effect for impact words
  const createShakeEffect = (wordId: string, wordStart: number): any => {
    const shakeDuration = 0.15;

    const effectData: GenericEffectData = {
      type: 'linear',
      start: wordStart,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Random-looking shake pattern within -shakeIntensity to +shakeIntensity
        { key: 'translateX', val: -shakeIntensity, prog: 0 },
        { key: 'translateX', val: shakeIntensity, prog: 0.25 },
        { key: 'translateX', val: -shakeIntensity, prog: 0.5 },
        { key: 'translateX', val: shakeIntensity, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: shakeIntensity, prog: 0 },
        { key: 'translateY', val: -shakeIntensity, prog: 0.33 },
        { key: 'translateY', val: shakeIntensity, prog: 0.66 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    return {
      id: `shake-${wordId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Build caption components
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;
    const captionImpact = caption.metadata?.impact ?? 1.0;

    // Create word components for this caption
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const isImpactWord = enableShakeOnImpact && captionImpact >= impactThreshold;

      // Build effects
      const effects: any[] = [];

      // Stepped rotation effect
      const rotationEffect = createSteppedRotationEffect(wordId, word.start, word.duration);
      effects.push(rotationEffect);

      // Neon glow pulse effect (starts after rotation completes)
      const glowEffect = createNeonGlowPulseEffect(wordId, word.start, word.duration);
      if (glowEffect) {
        effects.push(glowEffect);
      }

      // Shake effect (if enabled and word is impactful)
      if (isImpactWord) {
        const shakeEffect = createShakeEffect(wordId, word.start);
        effects.push(shakeEffect);
      }

      // Word wrapper with perspective for 3D rotation
      const wordWrapper: RenderableComponentData = {
        id: `${wordId}-wrapper`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block',
            style: {
              perspective: '1000px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                textShadow: `0 0 10px ${textColor}, 0 0 20px ${textColor}`,
                fontWeight: fontWeight,
                letterSpacing: '2px',
                display: 'inline-block',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight.toString()],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects,
          } as RenderableComponentData,
        ],
      };

      return wordWrapper;
    });

    // Caption container with word wrappers
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center gap-4',
          style: {
            zIndex: 5,
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
    };

    captionComponents.push(captionContainer);
  });

  // CRT effects layer
  const crtEffectsLayer: RenderableComponentData = {
    id: 'crt-effects-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: [
      // Scanline overlay
      {
        id: 'scanline-overlay',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px); pointer-events: none; opacity: ${scanlineOpacity};"></div>`,
        },
        context: {
          timing: {
            start: 0,
            duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
          },
        },
      } as RenderableComponentData,
      // CRT curve distortion
      {
        id: 'crt-curve-distortion',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="position: absolute; inset: 0; border-radius: ${crtCurveRadius}%; box-shadow: inset 0 0 50px rgba(0,0,0,0.5); pointer-events: none;"></div>`,
        },
        context: {
          timing: {
            start: 0,
            duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'arcade-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
          imageRendering: 'pixelated' as any,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: [crtEffectsLayer, ...captionComponents],
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
  id: 'RetroArcadeSubtitles',
  title: 'Retro Arcade Stepped Rotation Subtitles',
  description:
    'Arcade-style subtitles with pixelated aesthetics, stepped Y-axis rotation animation (15-degree increments), synchronized opacity progression, neon glow pulse effect, CRT monitor distortion, and scanline overlays. Each word animates independently with mechanical, rhythmic timing synchronized to 8-bit soundtracks.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'arcade',
    'retro',
    'pixel',
    'stepped',
    'rotation',
    'neon',
    'glow',
    'crt',
    'scanlines',
    '8-bit',
    'mechanical',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'GAME START',
        start: 0,
        absoluteStart: 0,
        end: 2,
        absoluteEnd: 2,
        duration: 2,
        words: [
          {
            id: 'word-1-1',
            text: 'GAME',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            id: 'word-1-2',
            text: 'START',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
          },
        ],
      },
    ],
    font: 'PressStart2P:400',
    fontSize: 32,
    textColor: '#00ff00',
    rotationDuration: 0.7,
    glowPulseDuration: 1.0,
    enableShakeOnImpact: false,
    shakeIntensity: 2,
    scanlineOpacity: 0.6,
    crtCurveRadius: 3,
    backgroundColor: '#000000',
    impactThreshold: 0.7,
  },
  dependencies: {},
};

// Export preset
export const RetroArcadeSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};