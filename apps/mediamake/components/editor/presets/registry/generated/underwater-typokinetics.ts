/**
 * Underwater Typokinetics Preset
 *
 * Creates text that appears to float underwater with realistic drift, wave distortion,
 * and caustic light patterns. Text moves with ocean currents using serpentine (sine wave) 
 * motion paths, exhibits water warping effects via blur/distortion, and animates through 
 * deep blue to turquoise color shifts simulating changing water depth and light penetration.
 *
 * Features:
 * - Serpentine drift motion using sine wave calculations (translateX/translateY)
 * - Water distortion effects using blur filters that oscillate
 * - Caustic light overlays with animated opacity and transforms
 * - Color transitions from deep blue (rgb(0,50,100)) to turquoise (rgb(0,150,200))
 * - Rotation oscillation (-5deg to 5deg) for natural underwater movement
 * - Variable drift speeds to simulate different depths and current strengths
 * - Optional sentiment-based drift direction (positive = upward, negative = downward)
 * - Duration: 8-10 seconds per text element
 *
 * Use cases:
 * - Creating underwater title sequences
 * - Oceanic themed video content
 * - Nature documentary overlays
 * - Aquatic brand videos
 * - Meditation/relaxation content with water themes
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

// Parameter schema
const presetParams = z.object({
  // Text content (can be string or caption data)
  text: z
    .union([z.string(), z.array(z.any())])
    .optional()
    .describe(
      'Text content to display - either a string or array of caption objects with text/timing',
    ),
  captions: z
    .array(z.any())
    .optional()
    .describe('Caption data array with text, timing, and optional sentiment'),

  // Typography
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700")'),

  // Motion parameters
  driftIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for drift motion (higher = more movement)'),
  driftSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for drift cycles (higher = faster oscillation)'),
  rotationRange: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Maximum rotation in degrees for oscillation'),

  // Distortion parameters
  blurIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum blur amount in pixels for water distortion'),
  blurCycleSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed of blur oscillation cycles'),

  // Color parameters
  startColor: z
    .string()
    .default('rgb(0,50,100)')
    .describe('Starting color (deep water) - use rgb() format'),
  endColor: z
    .string()
    .default('rgb(0,150,200)')
    .describe('Ending color (surface/light) - use rgb() format'),

  // Caustic light parameters
  causticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Opacity of caustic light overlays'),
  causticSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed of caustic light animation'),

  // Timing
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(9)
    .describe('Duration in seconds for each text element'),

  // Sentiment-based drift
  useSentimentDrift: z
    .boolean()
    .default(false)
    .describe(
      'Use caption sentiment to determine drift direction (positive = upward, negative = downward)',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to create sine wave drift path
  const createDriftEffect = (
    targetId: string,
    duration: number,
    sentiment?: number,
  ): GenericEffectData => {
    const intensity = params.driftIntensity;
    const speed = params.driftSpeed;

    // Base horizontal drift amplitude (pixels)
    const horizontalAmplitude = 50 * intensity;

    // Vertical drift - affected by sentiment if enabled
    let verticalAmplitude = 30 * intensity;
    let verticalDirection = 1; // 1 = down, -1 = up

    if (params.useSentimentDrift && sentiment !== undefined) {
      if (sentiment > 0) {
        verticalDirection = -1; // Positive sentiment drifts upward
        verticalAmplitude *= 1 + sentiment * 0.5; // Increase amplitude
      } else if (sentiment < 0) {
        verticalDirection = 1; // Negative sentiment drifts downward
        verticalAmplitude *= 1 + Math.abs(sentiment) * 0.5;
      }
    }

    // Create serpentine motion using multiple keyframes
    const numKeyframes = 12;
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const angle = progress * Math.PI * 2 * speed;

      // Sine wave for horizontal drift
      const xOffset = Math.sin(angle) * horizontalAmplitude;

      // Cosine wave for vertical drift (90 degrees out of phase)
      const yOffset =
        Math.cos(angle * 1.3) * verticalAmplitude * verticalDirection;

      ranges.push({ key: 'translateX', val: xOffset, prog: progress });
      ranges.push({ key: 'translateY', val: yOffset, prog: progress });
    }

    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };

  // Helper function to create rotation oscillation effect
  const createRotationEffect = (
    targetId: string,
    duration: number,
  ): GenericEffectData => {
    const rotationRange = params.rotationRange;
    const speed = params.driftSpeed;

    const numKeyframes = 8;
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const angle = progress * Math.PI * 2 * speed;
      const rotation = Math.sin(angle) * rotationRange;

      ranges.push({ key: 'rotate', val: rotation, prog: progress });
    }

    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };

  // Helper function to create blur oscillation effect
  const createBlurEffect = (
    targetId: string,
    duration: number,
  ): GenericEffectData => {
    const maxBlur = params.blurIntensity;
    const speed = params.blurCycleSpeed;

    const numKeyframes = 10;
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const angle = progress * Math.PI * 2 * speed;
      const blurAmount = (Math.sin(angle) * 0.5 + 0.5) * maxBlur;

      ranges.push({
        key: 'filter',
        val: `blur(${blurAmount}px)`,
        prog: progress,
      });
    }

    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };

  // Helper function to create color transition effect
  const createColorEffect = (
    targetId: string,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'color', val: params.startColor, prog: 0 },
        { key: 'color', val: params.endColor, prog: 0.5 },
        { key: 'color', val: params.startColor, prog: 1 },
      ],
    };
  };

  // Helper function to create caustic light overlay effects
  const createCausticEffect = (
    targetId: string,
    duration: number,
    offsetPhase: number = 0,
  ): GenericEffectData => {
    const speed = params.causticSpeed;
    const numKeyframes = 10;
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const angle = (progress + offsetPhase) * Math.PI * 2 * speed;

      // Oscillating opacity
      const opacity = (Math.sin(angle) * 0.5 + 0.5) * params.causticIntensity;

      // Subtle movement
      const translateX = Math.sin(angle * 0.7) * 20;
      const translateY = Math.cos(angle * 0.9) * 15;

      ranges.push({ key: 'opacity', val: opacity, prog: progress });
      ranges.push({ key: 'translateX', val: translateX, prog: progress });
      ranges.push({ key: 'translateY', val: translateY, prog: progress });
    }

    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: ranges,
    };
  };

  // Build children data
  const childrenData: RenderableComponentData[] = [];

  // Caustic overlay 1
  const caustic1Id = 'underwater-caustic-1';
  childrenData.push({
    id: caustic1Id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.15) 0%, transparent 50%)',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'caustic-1-effect',
        componentId: 'generic',
        data: createCausticEffect(caustic1Id, params.duration, 0),
      },
    ],
    childrenData: [],
  } as RenderableComponentData);

  // Caustic overlay 2
  const caustic2Id = 'underwater-caustic-2';
  childrenData.push({
    id: caustic2Id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.12) 0%, transparent 50%)',
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'caustic-2-effect',
        componentId: 'generic',
        data: createCausticEffect(caustic2Id, params.duration, 0.5),
      },
    ],
    childrenData: [],
  } as RenderableComponentData);

  // Process text content
  let textElements: Array<{
    text: string;
    start: number;
    duration: number;
    sentiment?: number;
  }> = [];

  if (params.captions && params.captions.length > 0) {
    // Use caption data
    textElements = params.captions.map((caption: any) => ({
      text: caption.text || '',
      start: caption.absoluteStart || 0,
      duration: caption.duration || params.duration,
      sentiment: caption.metadata?.sentiment
        ? caption.metadata.sentiment === 'positive'
          ? 1
          : caption.metadata.sentiment === 'negative'
            ? -1
            : 0
        : undefined,
    }));
  } else if (params.text) {
    // Use simple text string
    const textStr = typeof params.text === 'string' ? params.text : 'Sample Text';
    textElements = [
      {
        text: textStr,
        start: 0,
        duration: params.duration,
        sentiment: undefined,
      },
    ];
  } else {
    // Default text
    textElements = [
      {
        text: 'Underwater Text',
        start: 0,
        duration: params.duration,
        sentiment: undefined,
      },
    ];
  }

  // Create text atoms with effects
  textElements.forEach((element, index) => {
    const textId = `underwater-text-${index}`;

    // Create text wrapper
    const textWrapper: RenderableComponentData = {
      id: `underwater-text-wrapper-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: element.start,
          duration: element.duration,
        },
      },
      childrenData: [
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: element.text,
            style: {
              fontSize: params.fontSize,
              fontWeight: params.fontWeight,
              color: params.startColor,
              textShadow: '0 0 20px rgba(0, 150, 200, 0.6)',
              filter: 'blur(0px)',
            },
            font: {
              family: params.fontFamily,
              weights: [params.fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: element.duration,
            },
          },
          effects: [
            {
              id: `drift-${textId}`,
              componentId: 'generic',
              data: createDriftEffect(
                textId,
                element.duration,
                element.sentiment,
              ),
            },
            {
              id: `rotation-${textId}`,
              componentId: 'generic',
              data: createRotationEffect(textId, element.duration),
            },
            {
              id: `blur-${textId}`,
              componentId: 'generic',
              data: createBlurEffect(textId, element.duration),
            },
            {
              id: `color-${textId}`,
              componentId: 'generic',
              data: createColorEffect(textId, element.duration),
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    childrenData.push(textWrapper);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'underwater-typokinetics-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-blue-900 via-blue-700 to-blue-500 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          textElements.length > 0
            ? Math.max(
                ...textElements.map((el) => el.start + el.duration),
                params.duration,
              )
            : params.duration,
      },
    },
    childrenData: childrenData,
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

const presetMetadata: PresetMetadata = {
  id: 'underwaterTypokinetics',
  title: 'Underwater Typokinetics',
  description:
    'Text floating underwater with realistic drift, wave distortion, caustic light patterns, and serpentine motion. Text moves with ocean currents using sine wave paths, exhibits water warping effects, and animates through deep blue to turquoise color shifts simulating changing water depth and light penetration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'underwater',
    'ocean',
    'floating',
    'drift',
    'wave',
    'distortion',
    'caustic',
    'serpentine',
    'motion',
    'water',
    'blue',
    'turquoise',
    'kinetic',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Underwater Text',
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    driftIntensity: 1,
    driftSpeed: 1,
    rotationRange: 5,
    blurIntensity: 2,
    blurCycleSpeed: 1,
    startColor: 'rgb(0,50,100)',
    endColor: 'rgb(0,150,200)',
    causticIntensity: 0.15,
    causticSpeed: 1,
    duration: 9,
    useSentimentDrift: false,
  },
};

export const underwaterTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
