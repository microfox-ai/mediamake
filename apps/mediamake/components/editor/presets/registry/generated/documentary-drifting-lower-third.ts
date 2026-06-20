/**
 * Documentary Drifting Lower-Third Preset
 *
 * This preset creates a documentary-style lower-third where text drifts down like archival
 * typewriter text on aged paper. Features Ken Burns-style movement with falling autumn leaves
 * physics - weathered appearance with slight rotation, varying speeds suggesting different
 * 'weights' of paper, paper texture, typewriter fonts, sepia toning, and variable opacity
 * mimicking old ink fading.
 *
 * Features:
 * - **Weathered Typography**: Typewriter fonts (Courier Prime, Special Elite) with varying opacity
 * - **Physics Simulation**: Gravity with air resistance, rotation during fall, paper flutter
 * - **Visual Style**: Sepia toning, paper texture overlay, aged aesthetic
 * - **Variable Timing**: Different fall speeds simulate paper weight differences
 * - **Nostalgic Effect**: Perfect for historical documentaries or nostalgic content
 *
 * Use cases:
 * - Historical documentary lower-thirds
 * - Archival footage captions
 * - Nostalgic storytelling overlays
 * - Ken Burns-style documentary effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  words: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['History', 'Archives', 'Memory', 'Time', 'Legacy'])
    .describe('Array of words to display as drifting text (1-10 words)'),
  
  font: z
    .enum(['Courier Prime', 'Special Elite'])
    .default('Courier Prime')
    .describe('Typewriter font family: Courier Prime or Special Elite'),
  
  fontSize: z
    .number()
    .min(24)
    .max(96)
    .default(48)
    .describe('Base font size in pixels (24-96)'),
  
  textColor: z
    .string()
    .default('#3e2723')
    .describe('Base text color (dark brown for aged ink effect)'),
  
  sepiaIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Sepia filter intensity (0-1, default 0.3)'),
  
  paperTextureUrl: z
    .string()
    .optional()
    .describe('URL to paper texture image (optional, uses default if not provided)'),
  
  paperTextureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Opacity of paper texture overlay (0-1)'),
  
  driftDuration: z
    .number()
    .min(5)
    .max(15)
    .default(8)
    .describe('Base duration for text drift animation in seconds (5-15)'),
  
  startPosition: z
    .enum(['top', 'random'])
    .default('random')
    .describe('Starting position of words: top (uniform) or random (varied heights)'),
  
  containerPosition: z
    .enum(['bottom-left', 'bottom-center', 'bottom-right', 'center'])
    .default('bottom-left')
    .describe('Position of the lower-third container on screen'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Generate random opacity (0.4-1.0 for ink fading effect)
  const randomOpacity = (): number => {
    return 0.4 + Math.random() * 0.6;
  };

  // Helper: Generate random rotation (-15 to 15 degrees)
  const randomRotation = (): number => {
    return randomInRange(-15, 15);
  };

  // Helper: Generate random start position
  const randomStartTop = (): string => {
    if (params.startPosition === 'random') {
      return `${randomInRange(-10, -30)}%`;
    }
    return '-20%';
  };

  // Helper: Generate container position styles
  const getContainerPositionStyles = (): Record<string, any> => {
    const positions: Record<string, any> = {
      'bottom-left': {
        bottom: '5%',
        left: '5%',
        right: 'auto',
        top: 'auto',
      },
      'bottom-center': {
        bottom: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        right: 'auto',
        top: 'auto',
      },
      'bottom-right': {
        bottom: '5%',
        right: '5%',
        left: 'auto',
        top: 'auto',
      },
      'center': {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        bottom: 'auto',
        right: 'auto',
      },
    };
    return positions[params.containerPosition] || positions['bottom-left'];
  };

  // Helper: Generate word data with randomized properties
  const generateWordData = (word: string, index: number) => {
    const baseDelay = index * 0.5; // Stagger start times
    const baseDuration = params.driftDuration;
    const durationVariation = randomInRange(0.8, 1.2); // 80%-120% of base
    const duration = baseDuration * durationVariation;
    
    const initialRotation = randomRotation();
    const rotationChange = randomInRange(-3, 3); // Slight rotation change during fall
    const finalRotation = initialRotation + rotationChange;
    
    const horizontalPosition = `${randomInRange(10, 80)}%`; // Random horizontal spread
    const startTop = randomStartTop();
    
    const flutterAmplitude = randomInRange(8, 12); // Paper flutter intensity
    const flutterFrequency = randomInRange(6, 10); // Flutter speed variation
    
    const baseOpacity = randomOpacity();
    const opacityVariation = randomInRange(-0.2, 0.2);
    const midOpacity = Math.max(0.4, Math.min(1, baseOpacity + opacityVariation));
    
    return {
      word,
      delay: baseDelay,
      duration,
      initialRotation,
      finalRotation,
      horizontalPosition,
      startTop,
      flutterAmplitude,
      flutterFrequency,
      baseOpacity,
      midOpacity,
    };
  };

  // Generate word components
  const words = params.words.slice(0, 10); // Limit to 10 words max
  const wordDataArray = words.map((word, index) => generateWordData(word, index));
  
  // Calculate total preset duration (longest word animation + delay)
  const totalDuration = Math.max(
    ...wordDataArray.map(w => w.delay + w.duration)
  );

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = wordDataArray.map((wordData, index) => {
    const wordId = `word-${index}`;
    const wordContainerId = `word-container-${index}`;

    // Drift effect (vertical movement + rotation with gravity simulation)
    const driftEffect: GenericEffectData = {
      type: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)' as any, // Custom easing for gravity
      start: wordData.delay,
      duration: wordData.duration,
      mode: 'provider',
      targetIds: [wordContainerId],
      ranges: [
        // Vertical drift (gravity simulation)
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 120, prog: 1 }, // Fall distance in vh
        // Rotation during fall
        { key: 'rotate', val: wordData.initialRotation, prog: 0 },
        { key: 'rotate', val: wordData.finalRotation, prog: 1 },
      ],
    };

    // Flutter effect (horizontal oscillation simulating paper flutter)
    const flutterEffect: GenericEffectData = {
      type: 'linear',
      start: wordData.delay,
      duration: wordData.duration,
      mode: 'provider',
      targetIds: [wordContainerId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: wordData.flutterAmplitude, prog: 0.25 },
        { key: 'translateX', val: 0, prog: 0.5 },
        { key: 'translateX', val: -wordData.flutterAmplitude, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    };

    // Opacity variation effect (simulating ink fading)
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: wordData.delay,
      duration: wordData.duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: wordData.baseOpacity, prog: 0 },
        { key: 'opacity', val: wordData.midOpacity, prog: 0.5 },
        { key: 'opacity', val: wordData.baseOpacity * 0.8, prog: 1 }, // Fade out at end
      ],
    };

    // Word container (handles position and transform origin)
    const wordContainer: RenderableComponentData = {
      id: wordContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: wordData.startTop,
            left: wordData.horizontalPosition,
            transformOrigin: 'center center',
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
          id: `drift-effect-${index}`,
          componentId: 'generic',
          data: driftEffect,
        },
        {
          id: `flutter-effect-${index}`,
          componentId: 'generic',
          data: flutterEffect,
        },
      ],
      childrenData: [
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: wordData.word,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: '400',
              color: params.textColor,
              letterSpacing: '0.05em',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            },
            font: {
              family: params.font,
              weights: ['400'],
              display: 'swap',
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
              id: `opacity-effect-${index}`,
              componentId: 'generic',
              data: opacityEffect,
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    return wordContainer;
  });

  // Paper texture overlay (if provided)
  const paperTextureLayer: RenderableComponentData | null = params.paperTextureUrl
    ? ({
        id: 'paper-texture-layer',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: params.paperTextureUrl,
          className: 'w-full h-full object-cover',
          style: {
            opacity: params.paperTextureOpacity,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Text container (holds all word containers)
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  // Root container with sepia filter and aged paper background
  const rootContainer: RenderableComponentData = {
    id: 'documentary-drifting-lower-third-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: 'linear-gradient(to bottom right, rgba(251, 243, 219, 0.1), rgba(254, 249, 195, 0.1))',
          filter: `sepia(${params.sepiaIntensity}) contrast(0.95) brightness(1.05)`,
          pointerEvents: 'none',
          ...getContainerPositionStyles(),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...(paperTextureLayer ? [paperTextureLayer] : []),
      textContainer,
    ] as RenderableComponentData[],
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
  id: 'documentaryDriftingLowerThird',
  title: 'Documentary Drifting Lower-Third',
  description:
    'Documentary-style lower-third preset with text drifting down like archival typewriter text on aged paper. Features weathered appearance with slight rotation, varying speeds, paper texture, sepia toning, and variable opacity mimicking old ink. Perfect for historical documentaries or nostalgic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'documentary',
    'lower-third',
    'typewriter',
    'archival',
    'vintage',
    'sepia',
    'paper-texture',
    'gravity',
    'drift',
    'nostalgic',
    'historical',
    'ken-burns',
    'weathered',
    'aged',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['History', 'Archives', 'Memory', 'Time', 'Legacy'],
    font: 'Courier Prime',
    fontSize: 48,
    textColor: '#3e2723',
    sepiaIntensity: 0.3,
    paperTextureOpacity: 0.15,
    driftDuration: 8,
    startPosition: 'random',
    containerPosition: 'bottom-left',
  },
};

// --- Export Preset ---

export const documentaryDriftingLowerThirdPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
