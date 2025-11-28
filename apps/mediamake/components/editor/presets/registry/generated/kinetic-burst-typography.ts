/**
 * Kinetic Burst Typography Preset
 *
 * This preset creates dynamic kinetic typography inspired by modern music video editing.
 * Each word bursts onto screen with explosive energy, scaling up with bounce overshoot.
 * Features continuous camera shake, pulsing warm glow effects, random light streak effects,
 * and a slowly rocking Dutch angle rotation for nervous, dancing energy.
 *
 * Features:
 * - **Explosive Word Animations**: Each word scales from 0 to 100% with bounce overshoot
 * - **Camera Shake**: Continuous subtle jitter effect for nervous energy
 * - **Pulsing Glow**: Warm glow that pulses in intensity, synchronized with word timing
 * - **Light Streaks**: Horizontal light streaks that zip across text at random intervals
 * - **Dutch Angle**: Slight rotation (3-5 degrees) that slowly rocks back and forth
 * - **Warm Filter**: Sepia and saturation filters for warmth
 * - **Beat Drop Energy**: Typography that dances - each word is a beat drop
 *
 * Use cases:
 * - Creating energetic music video style captions
 * - Building high-energy social media content
 * - Adding kinetic typography to promotional videos
 * - Creating beat-synchronized text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Params Schema ---
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
        end: z.number().describe('Relative end time'),
        absoluteEnd: z
          .number()
          .describe('Absolute end time in caption timeline'),
        duration: z.number().describe('Duration of the caption'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start time within caption'),
            absoluteStart: z
              .number()
              .describe('Absolute start time in caption timeline'),
            end: z.number().describe('Relative end time within caption'),
            absoluteEnd: z
              .number()
              .describe('Absolute end time in caption timeline'),
            duration: z.number().describe('Duration of the word'),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of caption sentence objects with word-level timing'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700:normal", "BebasNeue:400")',
    ),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (e.g., "#FFFFFF", "rgb(255,255,255)")'),
  glowColor: z
    .string()
    .default('rgba(255,180,100,0.8)')
    .optional()
    .describe('Glow effect color (warm color)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Camera shake intensity in pixels'),
  dutchAngle: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .optional()
    .describe('Dutch angle rotation in degrees (will oscillate ±this value)'),
  streakCount: z
    .number()
    .min(3)
    .max(15)
    .default(7)
    .optional()
    .describe('Number of light streak effects'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:700',
    fontSize = 72,
    textColor = '#FFFFFF',
    glowColor = 'rgba(255,180,100,0.8)',
    shakeIntensity = 2,
    dutchAngle = 4,
    streakCount = 7,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  // Calculate total duration from captions
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map(c => c.absoluteEnd))
      : 10;

  // Helper: Create camera shake effect (continuous subtle jitter)
  const createCameraShakeEffect = (containerId: string) => {
    // Create randomized shake keyframes every 0.1s
    const shakeDuration = 0.1;
    const numKeyframes = 20; // 20 keyframes for varied shake
    const ranges: any[] = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      const randomX = (Math.random() - 0.5) * 2 * shakeIntensity;
      const randomY = (Math.random() - 0.5) * 2 * shakeIntensity;

      ranges.push({ key: 'translateX', val: randomX, prog });
      ranges.push({ key: 'translateY', val: randomY, prog });
    }

    return {
      id: `camera-shake-effect`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: totalDuration,
        mode: 'provider',
        targetIds: [containerId],
        ranges,
      },
    };
  };

  // Helper: Create Dutch angle rocking effect
  const createDutchAngleEffect = (containerId: string) => {
    return {
      id: `dutch-angle-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: totalDuration,
        mode: 'provider',
        targetIds: [containerId],
        ranges: [
          { key: 'rotate', val: -dutchAngle, prog: 0 },
          { key: 'rotate', val: dutchAngle, prog: 0.5 },
          { key: 'rotate', val: -dutchAngle, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create light streak elements
  const createLightStreaks = () => {
    const streaks: RenderableComponentData[] = [];

    for (let i = 0; i < streakCount; i++) {
      const streakId = `light-streak-${i}`;
      const randomStart = Math.random() * (totalDuration - 0.8);
      const randomTop = Math.random() * 80 + 10; // 10% to 90% from top
      const randomDelay = Math.random() * 2;

      // Light streak HTML
      const streakHtml = `
        <div style="
          position: absolute;
          top: ${randomTop}%;
          left: -100%;
          width: 200px;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(255, 200, 120, 0.8), transparent);
          opacity: 0.6;
        "></div>
      `;

      const streakComponent = {
        id: streakId,
        componentId: 'HTMLBlockAtom',
        type: 'atom' as const,
        data: {
          html: streakHtml,
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: randomStart + randomDelay,
            duration: 0.8,
          },
        },
        effects: [
          {
            id: `streak-animate-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 0.8,
              mode: 'provider',
              targetIds: [streakId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: '200vw', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;

      streaks.push(streakComponent);
    }

    return streaks;
  };

  // Helper: Create word burst effect (scale + glow pulse)
  const createWordEffects = (wordId: string, word: any, caption: any) => {
    const effects: any[] = [];

    // Scale burst animation: 0 -> 1.1 -> 1 (with spring easing)
    effects.push({
      id: `scale-burst-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: word.start,
        duration: 0.3,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.7 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });

    // Glow pulse effect (synchronized with word appearance)
    const glowPulseDuration = 0.5;
    const glowCycles = Math.floor(word.duration / glowPulseDuration);

    for (let i = 0; i < glowCycles; i++) {
      effects.push({
        id: `glow-pulse-${wordId}-${i}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: word.start + i * glowPulseDuration,
          duration: glowPulseDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            {
              key: 'textShadow',
              val: `0 0 10px ${glowColor}`,
              prog: 0,
            },
            {
              key: 'textShadow',
              val: `0 0 30px ${glowColor}, 0 0 50px ${glowColor}`,
              prog: 0.5,
            },
            {
              key: 'textShadow',
              val: `0 0 10px ${glowColor}`,
              prog: 1,
            },
          ],
        },
      });
    }

    return effects;
  };

  // Build caption word components
  const captionComponents: RenderableComponentData[] = captions.map(caption => {
    const captionId = `caption-container-${caption.id}`;

    // Create word components
    const wordComponents: RenderableComponentData[] = caption.words.map(
      (word, wordIndex) => {
        const wordId = `word-${caption.id}-${wordIndex}`;

        const wordEffects = createWordEffects(wordId, word, caption);

        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: fontStyle.fontWeight || 700,
              fontStyle: fontStyle.fontStyle || 'normal',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
            font: {
              family: fontFamily,
              weights: [
                fontStyle.fontWeight
                  ? fontStyle.fontWeight.toString()
                  : '700',
              ],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: wordEffects,
        } as RenderableComponentData;
      },
    );

    return {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
        repeatChildrenProps: {
          className: 'inline-flex flex-wrap gap-4 items-center justify-center',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  });

  // Create light streaks
  const lightStreaks = createLightStreaks();

  // Build root structure
  const cameraShakeContainerId = 'camera-shake-container';
  const dutchAngleContainerId = 'dutch-angle-container';

  const cameraShakeEffect = createCameraShakeEffect(cameraShakeContainerId);
  const dutchAngleEffect = createDutchAngleEffect(dutchAngleContainerId);

  const rootContainer = {
    id: dutchAngleContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          filter: 'sepia(0.2) saturate(1.3)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [dutchAngleEffect],
    childrenData: [
      {
        id: cameraShakeContainerId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [cameraShakeEffect],
        childrenData: [
          {
            id: 'words-layout-container',
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
            childrenData: captionComponents,
          } as RenderableComponentData,
          {
            id: 'light-streaks-container',
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none overflow-hidden',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            childrenData: lightStreaks,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
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
  id: 'kinetic-burst-typography',
  title: 'Kinetic Burst Typography',
  description:
    'Dynamic kinetic typography preset inspired by modern music video editing - fast, punchy, and rhythmic. Each word bursts onto screen with explosive energy, scaling up with bounce overshoot. Features continuous camera shake, pulsing warm glow effects, random light streak effects, and a slowly rocking Dutch angle rotation for nervous, dancing energy.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'kinetic',
    'typography',
    'music-video',
    'burst',
    'glow',
    'shake',
    'dutch-angle',
    'light-streaks',
    'energetic',
    'dynamic',
    'beat-drop',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'WELCOME TO THE SHOW',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            text: 'WELCOME',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            text: 'TO',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 0.2,
          },
          {
            text: 'THE',
            start: 1.0,
            absoluteStart: 1.0,
            end: 1.3,
            absoluteEnd: 1.3,
            duration: 0.3,
          },
          {
            text: 'SHOW',
            start: 1.3,
            absoluteStart: 1.3,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.2,
          },
        ],
      },
      {
        id: 'caption-2',
        text: 'LETS GO',
        start: 3.0,
        absoluteStart: 3.0,
        end: 4.5,
        absoluteEnd: 4.5,
        duration: 1.5,
        words: [
          {
            text: 'LETS',
            start: 0,
            absoluteStart: 3.0,
            end: 0.7,
            absoluteEnd: 3.7,
            duration: 0.7,
          },
          {
            text: 'GO',
            start: 0.7,
            absoluteStart: 3.7,
            end: 1.5,
            absoluteEnd: 4.5,
            duration: 0.8,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    glowColor: 'rgba(255,180,100,0.8)',
    shakeIntensity: 2,
    dutchAngle: 4,
    streakCount: 7,
  },
};

// --- Export ---
export const kineticBurstTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
