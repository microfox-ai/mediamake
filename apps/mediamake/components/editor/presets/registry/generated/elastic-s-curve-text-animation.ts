/**
 * Elastic S-Curve Text Animation Preset
 *
 * Creates sophisticated elastic text animation where words trace an elegant S-curve path
 * across the screen, reminiscent of professional motion graphics in corporate videos.
 * Features smooth acceleration/deceleration, motion blur at peak velocity, glow effects
 * at curve peaks, and trailing ghost effects for premium quality.
 *
 * Features:
 * - **S-Curve Path**: Words follow continuous sine wave pattern
 * - **Smooth Motion**: Ease-in-out timing with natural acceleration/deceleration
 * - **Motion Blur**: Velocity-based blur (0-4px) during fastest segments
 * - **Glow Effect**: Intensifies at curve peaks using textShadow
 * - **Trail Effect**: 3 layers of fading ghosts (opacity 0.3, 0.2, 0.1) with timing delays
 * - **Performance**: Uses will-change and CSS containment
 *
 * Use Cases:
 * - Premium corporate video reveals
 * - Apple-style product announcements
 * - High-end brand presentations
 * - Sophisticated title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['PREMIUM', 'QUALITY', 'MOTION'])
    .describe('Array of words to animate along the S-curve path'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto", "Montserrat")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex or rgba format'),
  backgroundColor: z
    .string()
    .default('linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)')
    .describe('Background gradient or solid color for the scene'),
  totalDuration: z
    .number()
    .min(2)
    .max(10)
    .default(3.5)
    .describe('Total duration of the animation in seconds'),
  wordDelayOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Time offset between word animations in seconds'),
  curveAmplitude: z
    .number()
    .min(50)
    .max(200)
    .default(120)
    .describe('Vertical amplitude of the S-curve in pixels'),
  horizontalDistance: z
    .number()
    .min(800)
    .max(1920)
    .default(1200)
    .describe('Horizontal distance traveled by words in pixels'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Maximum blur intensity at peak velocity in pixels'),
  glowIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Glow effect intensity at curve peaks in pixels'),
  trailOpacities: z
    .array(z.number().min(0).max(1))
    .default([0.3, 0.2, 0.1])
    .describe('Opacity values for trail layers (3 layers)'),
  trailDelays: z
    .array(z.number().min(0).max(0.5))
    .default([0.1, 0.2, 0.3])
    .describe('Time delays for trail layers in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    backgroundColor,
    totalDuration,
    wordDelayOffset,
    curveAmplitude,
    horizontalDistance,
    blurIntensity,
    glowIntensity,
    trailOpacities,
    trailDelays,
  } = params;

  // Helper: Calculate S-curve keyframes (sine wave pattern)
  const calculateSCurveKeyframes = (
    numKeyframes: number = 9,
  ): Array<{ translateX: number; translateY: number; prog: number }> => {
    const keyframes: Array<{
      translateX: number;
      translateY: number;
      prog: number;
    }> = [];

    for (let i = 0; i < numKeyframes; i++) {
      const progress = i / (numKeyframes - 1); // 0 to 1
      const xPos = horizontalDistance * progress;
      // Sine wave: 2 full cycles for S-curve shape
      const yPos = Math.sin(progress * Math.PI * 2) * curveAmplitude;

      keyframes.push({
        translateX: xPos,
        translateY: yPos,
        prog: progress,
      });
    }

    return keyframes;
  };

  // Helper: Calculate blur keyframes (velocity-based)
  const calculateBlurKeyframes = (
    numKeyframes: number = 5,
  ): Array<{ blur: number; prog: number }> => {
    const keyframes: Array<{ blur: number; prog: number }> = [];

    // Blur peaks at inflection points (0.25, 0.5, 0.75)
    keyframes.push({ blur: 0, prog: 0 });
    keyframes.push({ blur: blurIntensity, prog: 0.25 });
    keyframes.push({ blur: 0, prog: 0.5 });
    keyframes.push({ blur: blurIntensity, prog: 0.75 });
    keyframes.push({ blur: 0, prog: 1 });

    return keyframes;
  };

  // Helper: Calculate glow keyframes (peaks at Y extremes)
  const calculateGlowKeyframes = (
    numKeyframes: number = 5,
  ): Array<{ glow: string; prog: number }> => {
    const keyframes: Array<{ glow: string; prog: number }> = [];

    // Glow peaks at curve peaks (0.25, 0.75)
    keyframes.push({
      glow: `0 0 0px rgba(255,255,255,0)`,
      prog: 0,
    });
    keyframes.push({
      glow: `0 0 ${glowIntensity}px rgba(255,255,255,0.8)`,
      prog: 0.25,
    });
    keyframes.push({
      glow: `0 0 0px rgba(255,255,255,0)`,
      prog: 0.5,
    });
    keyframes.push({
      glow: `0 0 ${glowIntensity}px rgba(255,255,255,0.8)`,
      prog: 0.75,
    });
    keyframes.push({
      glow: `0 0 0px rgba(255,255,255,0)`,
      prog: 1,
    });

    return keyframes;
  };

  // Helper: Create word component with effects
  const createWordComponent = (
    word: string,
    wordIndex: number,
    layerType: 'main' | 'trail',
    layerIndex: number = 0,
  ): RenderableComponentData => {
    const wordId = `${layerType}-word-${wordIndex}-layer-${layerIndex}`;

    // Calculate timing
    const startTime =
      layerType === 'main'
        ? wordIndex * wordDelayOffset
        : wordIndex * wordDelayOffset - trailDelays[layerIndex];
    const duration =
      layerType === 'main'
        ? totalDuration - wordIndex * wordDelayOffset
        : totalDuration - wordIndex * wordDelayOffset + trailDelays[layerIndex];

    // S-curve keyframes
    const sCurveKeyframes = calculateSCurveKeyframes(9);
    const translateRanges = sCurveKeyframes.flatMap((kf) => [
      { key: 'translateX', val: kf.translateX, prog: kf.prog },
      { key: 'translateY', val: kf.translateY, prog: kf.prog },
    ]);

    // Blur keyframes (only for main layer)
    const blurKeyframes =
      layerType === 'main' ? calculateBlurKeyframes(5) : [];
    const blurRanges = blurKeyframes.map((kf) => ({
      key: 'filter:blur',
      val: kf.blur,
      prog: kf.prog,
    }));

    // Glow keyframes (only for main layer)
    const glowKeyframes =
      layerType === 'main' ? calculateGlowKeyframes(5) : [];
    const glowRanges = glowKeyframes.map((kf) => ({
      key: 'textShadow',
      val: kf.glow,
      prog: kf.prog,
    }));

    const effects = [
      {
        id: `${wordId}-s-curve`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [wordId],
          type: 'ease-in-out',
          start: startTime,
          duration: duration,
          ranges: translateRanges,
        },
      },
    ];

    // Add blur effect for main layer
    if (layerType === 'main' && blurRanges.length > 0) {
      effects.push({
        id: `${wordId}-blur`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [wordId],
          type: 'ease-in-out',
          start: startTime,
          duration: duration,
          ranges: blurRanges,
        },
      });
    }

    // Add glow effect for main layer
    if (layerType === 'main' && glowRanges.length > 0) {
      effects.push({
        id: `${wordId}-glow`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [wordId],
          type: 'ease-in-out',
          start: startTime,
          duration: duration,
          ranges: glowRanges,
        },
      });
    }

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          position: 'absolute',
          left: '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          willChange: 'transform, filter',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
          subsets: ['latin'],
          display: 'swap',
          preload: true,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects,
    };
  };

  // Create trail layers
  const trailLayers = trailOpacities.map((opacity, layerIndex) => {
    const trailWords = words.map((word, wordIndex) =>
      createWordComponent(word, wordIndex, 'trail', layerIndex),
    );

    return {
      id: `trail-layer-${layerIndex}`,
      type: 'layout',
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
      effects: [
        {
          id: `trail-${layerIndex}-opacity`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`trail-layer-${layerIndex}`],
            type: 'linear',
            start: 0,
            duration: totalDuration,
            ranges: [
              { key: 'opacity', val: opacity, prog: 0 },
              { key: 'opacity', val: opacity, prog: 1 },
            ],
          },
        },
      ],
      childrenData: trailWords,
    } as RenderableComponentData;
  });

  // Create main layer
  const mainWords = words.map((word, wordIndex) =>
    createWordComponent(word, wordIndex, 'main'),
  );

  const mainLayer: RenderableComponentData = {
    id: 'main-layer',
    type: 'layout',
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
    childrenData: mainWords,
  };

  // Root container with all layers
  const rootContainer: RenderableComponentData = {
    id: 'elastic-s-curve-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...trailLayers.reverse(), mainLayer],
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

const presetMetadata: PresetMetadata = {
  id: 'elastic-s-curve-text-animation',
  title: 'Elastic S-Curve Text Animation',
  description:
    'Sophisticated elastic text animation where words trace an elegant S-curve path across the screen with smooth acceleration/deceleration, motion blur at peak velocity, glow effects at curve peaks, and trailing ghost effects. Reminiscent of premium motion graphics like Apple's product reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'elastic',
    's-curve',
    'motion-blur',
    'glow',
    'trail',
    'premium',
    'corporate',
    'smooth',
    'sine-wave',
  ],
  defaultInputParams: {
    words: ['PREMIUM', 'QUALITY', 'MOTION'],
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    backgroundColor: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    totalDuration: 3.5,
    wordDelayOffset: 0.15,
    curveAmplitude: 120,
    horizontalDistance: 1200,
    blurIntensity: 4,
    glowIntensity: 20,
    trailOpacities: [0.3, 0.2, 0.1],
    trailDelays: [0.1, 0.2, 0.3],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const elasticSCurveTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
