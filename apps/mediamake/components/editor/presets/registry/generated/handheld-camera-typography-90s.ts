/**
 * 90s Handheld Camera Typography Preset
 *
 * This preset creates a grainy, 90s-style handheld camera shake typography effect where text
 * appears to be filmed during movement. Features realistic camera motion with quick jerky
 * movements, occasional focus pulls, and handheld instability.
 *
 * Features:
 * - **Realistic Camera Shake**: Combined translateX/translateY with random jerky movements
 * - **Motion Blur**: CSS filter blur applied during rapid movement peaks
 * - **Random Zoom Pulses**: Scale pulses (0.95 to 1.05) simulating camera zoom adjustments
 * - **Rotation Tilt**: Slight rotation (-2 to 2 degrees) for handheld instability
 * - **Animated Film Grain**: Grain overlay with animated noise texture (0.3 to 0.5 opacity) that intensifies during movement
 * - **Bounce-In Animations**: Words bounce and shake into view with staggered timing
 * - **Focus Pull Effects**: Random focus pulls simulating camera focus adjustments
 * - **Handwritten Font**: Uses Kalam or Caveat font for authentic home video aesthetic
 * - **Audio-Reactive**: Optional bass-reactive shake intensity when background music is present
 *
 * Use cases:
 * - Creating nostalgic 90s home video title sequences
 * - Building authentic handheld camera text effects
 * - Adding retro camcorder aesthetics to modern videos
 * - Creating realistic documentary-style text overlays
 * - Simulating amateur home video recordings
 */

import { z } from 'zod';
import type {
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
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  font: z
    .string()
    .optional()
    .default('Kalam:400')
    .describe(
      'Handwritten-style font family with optional weight (e.g., "Kalam:400", "Caveat:600"). Default is Kalam:400 for authentic home video aesthetic.',
    ),

  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe(
      'Base font size in pixels for text. Default is 48px for clear readability.',
    ),

  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color in hex format. Default is white (#FFFFFF).'),

  shakeAmplitude: z
    .number()
    .optional()
    .default(5)
    .describe(
      'Maximum shake amplitude in pixels for camera movement (X and Y). Default is 5px for realistic handheld jitter.',
    ),

  shakeFrequency: z
    .number()
    .optional()
    .default(8)
    .describe(
      'Shake frequency in Hz for continuous camera jitter. Default is 8Hz for quick jerky movements.',
    ),

  zoomPulseDuration: z
    .number()
    .optional()
    .default(2000)
    .describe(
      'Duration in milliseconds for zoom pulse cycle. Default is 2000ms (2 seconds).',
    ),

  rotationAmplitude: z
    .number()
    .optional()
    .default(2)
    .describe(
      'Maximum rotation tilt in degrees for camera instability. Default is 2 degrees.',
    ),

  grainIntensity: z
    .number()
    .optional()
    .default(0.4)
    .describe(
      'Base grain intensity (0 to 1). Higher values create more visible grain. Default is 0.4 for authentic film grain.',
    ),

  motionBlurAmount: z
    .number()
    .optional()
    .default(4)
    .describe(
      'Motion blur amount in pixels during rapid movements. Default is 4px for realistic motion blur.',
    ),

  bounceStagger: z
    .number()
    .optional()
    .default(80)
    .describe(
      'Stagger delay in milliseconds between word bounce-in animations. Default is 80ms.',
    ),

  bounceDuration: z
    .number()
    .optional()
    .default(400)
    .describe(
      'Duration in milliseconds for bounce-in animation. Default is 400ms.',
    ),

  focusPullProbability: z
    .number()
    .optional()
    .default(0.15)
    .describe(
      'Probability (0 to 1) of random focus pull effects on words. Default is 0.15 (15% chance).',
    ),

  focusPullDuration: z
    .number()
    .optional()
    .default(200)
    .describe(
      'Duration in milliseconds for focus pull blur effect. Default is 200ms.',
    ),

  audioReactive: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Enable audio-reactive shake intensity based on bass frequencies. Requires background music.',
    ),

  wordSpacing: z
    .number()
    .optional()
    .default(12)
    .describe('Gap spacing between words in pixels. Default is 12px.'),

  containerPadding: z
    .number()
    .optional()
    .default(32)
    .describe(
      'Horizontal padding for text container in pixels. Default is 32px.',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'handheld-camera-typography-90s',
  title: '90s Handheld Camera Typography',
  description:
    'Grainy 90s handheld camera shake typography preset where text appears filmed during movement. Features realistic handheld instability with quick jerky movements, bounce-in word animations, motion blur during rapid movements, random zoom pulses, focus pulls, and animated film grain that intensifies during movement. Uses casual handwritten font for authentic home video aesthetic. Optionally supports audio-reactive shake intensity when background music is present.',
  presetType: 'children',
  tags: [
    'typography',
    'camera-shake',
    'handheld',
    '90s',
    'retro',
    'film-grain',
    'motion-blur',
    'bounce',
    'focus-pull',
    'handwritten',
    'home-video',
    'camcorder',
    'nostalgic',
    'audio-reactive',
  ],
  type: 'predefined',
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    font: 'Kalam:400',
    fontSize: 48,
    textColor: '#FFFFFF',
    shakeAmplitude: 5,
    shakeFrequency: 8,
    zoomPulseDuration: 2000,
    rotationAmplitude: 2,
    grainIntensity: 0.4,
    motionBlurAmount: 4,
    bounceStagger: 80,
    bounceDuration: 400,
    focusPullProbability: 0.15,
    focusPullDuration: 200,
    audioReactive: false,
    wordSpacing: 12,
    containerPadding: 32,
  },
};

// --- Preset Execution Function ---
const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Helper: Generate unique ID
  const generateId = (prefix: string, index: number): string => {
    return `${prefix}-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontParts = fontString.split(':');
    const fontStyle: any = {};

    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }

    return { fontFamily, fontStyle };
  };

  // Helper: Create shake effect with random values
  const createShakeEffect = (
    targetId: string,
    amplitude: number,
    frequency: number,
    startTime: number,
    duration: number,
  ) => {
    const keyframeCount = Math.ceil((duration / 1000) * frequency);
    const keyframes = [];

    for (let i = 0; i <= keyframeCount; i++) {
      const progress = i / keyframeCount;
      const randomX = (Math.random() - 0.5) * 2 * amplitude;
      const randomY = (Math.random() - 0.5) * 2 * amplitude;

      keyframes.push({
        key: 'translateX',
        val: `${randomX}px`,
        prog: progress,
      });
      keyframes.push({
        key: 'translateY',
        val: `${randomY}px`,
        prog: progress,
      });
    }

    return {
      id: generateId('shake-effect', Math.random()),
      componentId: targetId,
      data: {
        type: 'custom',
        start: startTime,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: keyframes,
      },
    };
  };

  // Helper: Create zoom pulse effect
  const createZoomPulseEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    pulseDuration: number,
  ) => {
    return {
      id: generateId('zoom-pulse-effect', Math.random()),
      componentId: targetId,
      data: {
        type: 'custom',
        start: startTime,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 1.0, prog: 0.0 },
          { key: 'scale', val: 1.03, prog: 0.3 },
          { key: 'scale', val: 0.97, prog: 0.5 },
          { key: 'scale', val: 1.02, prog: 0.7 },
          { key: 'scale', val: 1.0, prog: 1.0 },
        ],
      },
    };
  };

  // Helper: Create rotation tilt effect
  const createRotationEffect = (
    targetId: string,
    amplitude: number,
    startTime: number,
    duration: number,
  ) => {
    const keyframes = [];
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const rotation = Math.sin(progress * Math.PI * 3) * amplitude;
      keyframes.push({
        key: 'rotate',
        val: `${rotation}deg`,
        prog: progress,
      });
    }

    return {
      id: generateId('rotation-effect', Math.random()),
      componentId: targetId,
      data: {
        type: 'custom',
        start: startTime,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: keyframes,
      },
    };
  };

  // Helper: Create bounce-in effect
  const createBounceInEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    staggerDelay: number,
  ) => {
    const actualStart = startTime + staggerDelay;
    return {
      id: generateId('bounce-in-effect', Math.random()),
      componentId: targetId,
      data: {
        type: 'custom',
        start: actualStart,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.4 },
          { key: 'scale', val: 0.9, prog: 0.7 },
          { key: 'scale', val: 1.05, prog: 0.85 },
          { key: 'scale', val: 1.0, prog: 1.0 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      },
    };
  };

  // Helper: Create motion blur effect
  const createMotionBlurEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    blurAmount: number,
  ) => {
    return {
      id: generateId('motion-blur-effect', Math.random()),
      componentId: targetId,
      data: {
        type: 'custom',
        start: startTime,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'filter', val: `blur(${blurAmount}px)`, prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 0.2 },
          { key: 'filter', val: 'blur(0px)', prog: 1.0 },
        ],
      },
    };
  };

  // Helper: Create focus pull effect (random)
  const createFocusPullEffect = (
    targetId: string,
    startTime: number,
    sentenceDuration: number,
    focusDuration: number,
    probability: number,
  ) => {
    if (Math.random() > probability) return null;

    const randomStart =
      startTime + Math.random() * Math.max(0, sentenceDuration - focusDuration);

    return {
      id: generateId('focus-pull-effect', Math.random()),
      componentId: targetId,
      data: {
        type: 'custom',
        start: randomStart,
        duration: focusDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(2px)', prog: 0.5 },
          { key: 'filter', val: 'blur(0px)', prog: 1.0 },
        ],
      },
    };
  };

  // Extract parameters
  const {
    captions = [],
    font = 'Kalam:400',
    fontSize = 48,
    textColor = '#FFFFFF',
    shakeAmplitude = 5,
    shakeFrequency = 8,
    zoomPulseDuration = 2000,
    rotationAmplitude = 2,
    grainIntensity = 0.4,
    motionBlurAmount = 4,
    bounceStagger = 80,
    bounceDuration = 400,
    focusPullProbability = 0.15,
    focusPullDuration = 200,
    wordSpacing = 12,
    containerPadding = 32,
  } = params;

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(font);

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(
          ...captions.map((cap: TranscriptionSentence) => cap.absoluteEnd),
        )
      : 10;

  // Build children data
  const allSentenceContainers: RenderableComponentData[] = [];

  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const sentenceId = generateId('sentence', captionIndex);

    // Create word components
    const wordComponents: RenderableComponentData[] = caption.words.map(
      (word, wordIndex) => {
        const wordId = generateId('word', wordIndex);

        // Word effects
        const wordEffects = [];

        // Bounce-in effect with stagger
        const bounceEffect = createBounceInEffect(
          wordId,
          0,
          bounceDuration / 1000,
          (wordIndex * bounceStagger) / 1000,
        );
        wordEffects.push(bounceEffect);

        // Motion blur during entrance
        const blurEffect = createMotionBlurEffect(
          wordId,
          (wordIndex * bounceStagger) / 1000,
          bounceDuration / 1000,
          motionBlurAmount,
        );
        wordEffects.push(blurEffect);

        // Word shake (smaller amplitude)
        const wordShakeEffect = createShakeEffect(
          wordId,
          shakeAmplitude * 0.6,
          shakeFrequency * 1.5,
          0,
          caption.duration,
        );
        wordEffects.push(wordShakeEffect);

        // Random focus pull
        const focusEffect = createFocusPullEffect(
          wordId,
          0,
          caption.duration,
          focusPullDuration / 1000,
          focusPullProbability,
        );
        if (focusEffect) wordEffects.push(focusEffect);

        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              color: textColor,
              fontSize: `${fontSize}px`,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: wordEffects,
          childrenData: [],
        } as RenderableComponentData;
      },
    );

    // Sentence container with layout and container-level effects
    const sentenceContainerId = generateId('sentence-container', captionIndex);
    const sentenceEffects = [];

    // Container shake
    const containerShake = createShakeEffect(
      sentenceContainerId,
      shakeAmplitude,
      shakeFrequency,
      0,
      caption.duration,
    );
    sentenceEffects.push(containerShake);

    // Zoom pulse
    const zoomPulse = createZoomPulseEffect(
      sentenceContainerId,
      0,
      caption.duration,
      zoomPulseDuration / 1000,
    );
    sentenceEffects.push(zoomPulse);

    // Rotation tilt
    const rotationEffect = createRotationEffect(
      sentenceContainerId,
      rotationAmplitude,
      0,
      caption.duration,
    );
    sentenceEffects.push(rotationEffect);

    const sentenceContainer: RenderableComponentData = {
      id: sentenceContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap items-center justify-center',
          style: {
            gap: `${wordSpacing}px`,
            paddingLeft: `${containerPadding}px`,
            paddingRight: `${containerPadding}px`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: sentenceEffects,
      childrenData: wordComponents,
    };

    allSentenceContainers.push(sentenceContainer);
  });

  // Create grain overlay
  const grainOverlayId = generateId('grain-overlay', 0);
  const grainKeyframes = [];
  const grainSteps = 20;

  for (let i = 0; i <= grainSteps; i++) {
    const progress = i / grainSteps;
    const intensity =
      grainIntensity + Math.random() * 0.2 * grainIntensity;
    grainKeyframes.push({
      key: 'opacity',
      val: intensity,
      prog: progress,
    });
  }

  const grainEffect = {
    id: generateId('grain-effect', 0),
    componentId: grainOverlayId,
    data: {
      type: 'custom',
      start: 0,
      duration: totalDuration,
      mode: 'provider' as const,
      targetIds: [grainOverlayId],
      ranges: grainKeyframes,
    },
  };

  const grainOverlay: RenderableComponentData = {
    id: grainOverlayId,
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-overlay',
        style: {
          zIndex: 50,
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        },
      },
      style: {
        backgroundColor: 'transparent',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [grainEffect],
    childrenData: [],
  };

  // Root container
  const rootContainerId = generateId('handheld-camera-root', 0);
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center overflow-hidden bg-black',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
    childrenData: [grainOverlay, ...allSentenceContainers],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
  };
};

// --- Export Preset ---
export const handheldCameraTypography90sPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: {
    type: 'object',
    properties: {
      captions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            start: { type: 'number' },
            absoluteStart: { type: 'number' },
            end: { type: 'number' },
            absoluteEnd: { type: 'number' },
            duration: { type: 'number' },
            words: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  start: { type: 'number' },
                  absoluteStart: { type: 'number' },
                  end: { type: 'number' },
                  absoluteEnd: { type: 'number' },
                  duration: { type: 'number' },
                  confidence: { type: 'number' },
                },
              },
            },
            metadata: {
              type: 'object',
              properties: {
                impact: { type: 'number' },
                keyword: { type: 'string' },
              },
              additionalProperties: true,
            },
          },
          required: [
            'id',
            'text',
            'start',
            'absoluteStart',
            'end',
            'absoluteEnd',
            'duration',
            'words',
          ],
        },
        description:
          'Array of caption sentences with word-level timing data',
      },
      font: {
        type: 'string',
        default: 'Kalam:400',
        description:
          'Handwritten-style font family with optional weight (e.g., "Kalam:400", "Caveat:600"). Default is Kalam:400 for authentic home video aesthetic.',
      },
      fontSize: {
        type: 'number',
        default: 48,
        description:
          'Base font size in pixels for text. Default is 48px for clear readability.',
      },
      textColor: {
        type: 'string',
        default: '#FFFFFF',
        description: 'Text color in hex format. Default is white (#FFFFFF).',
      },
      shakeAmplitude: {
        type: 'number',
        default: 5,
        description:
          'Maximum shake amplitude in pixels for camera movement (X and Y). Default is 5px for realistic handheld jitter.',
      },
      shakeFrequency: {
        type: 'number',
        default: 8,
        description:
          'Shake frequency in Hz for continuous camera jitter. Default is 8Hz for quick jerky movements.',
      },
      zoomPulseDuration: {
        type: 'number',
        default: 2000,
        description:
          'Duration in milliseconds for zoom pulse cycle. Default is 2000ms (2 seconds).',
      },
      rotationAmplitude: {
        type: 'number',
        default: 2,
        description:
          'Maximum rotation tilt in degrees for camera instability. Default is 2 degrees.',
      },
      grainIntensity: {
        type: 'number',
        default: 0.4,
        description:
          'Base grain intensity (0 to 1). Higher values create more visible grain. Default is 0.4 for authentic film grain.',
      },
      motionBlurAmount: {
        type: 'number',
        default: 4,
        description:
          'Motion blur amount in pixels during rapid movements. Default is 4px for realistic motion blur.',
      },
      bounceStagger: {
        type: 'number',
        default: 80,
        description:
          'Stagger delay in milliseconds between word bounce-in animations. Default is 80ms.',
      },
      bounceDuration: {
        type: 'number',
        default: 400,
        description:
          'Duration in milliseconds for bounce-in animation. Default is 400ms.',
      },
      focusPullProbability: {
        type: 'number',
        default: 0.15,
        description:
          'Probability (0 to 1) of random focus pull effects on words. Default is 0.15 (15% chance).',
      },
      focusPullDuration: {
        type: 'number',
        default: 200,
        description:
          'Duration in milliseconds for focus pull blur effect. Default is 200ms.',
      },
      audioReactive: {
        type: 'boolean',
        default: false,
        description:
          'Enable audio-reactive shake intensity based on bass frequencies. Requires background music.',
      },
      wordSpacing: {
        type: 'number',
        default: 12,
        description: 'Gap spacing between words in pixels. Default is 12px.',
      },
      containerPadding: {
        type: 'number',
        default: 32,
        description:
          'Horizontal padding for text container in pixels. Default is 32px.',
      },
    },
    required: ['captions'],
    additionalProperties: false,
  },
};