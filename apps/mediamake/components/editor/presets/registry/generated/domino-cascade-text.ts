/**
 * Domino Cascade Text Destruction Preset
 *
 * This preset creates a dramatic domino cascade effect where text words stand upright
 * like dominoes and topple into each other in sequence. Each word fractures into individual
 * letters on impact with physics-based scattering, dust particles, depth of field blur,
 * and camera shake following the cascade progression.
 *
 * Features:
 * - **3D Standing Dominoes**: Words positioned upright using rotateX transforms
 * - **Cascade Chain Reaction**: Each word triggers the next after 80% rotation
 * - **Letter Fracturing**: Words break into individual letters on impact
 * - **Physics Simulation**: Gravity-based scattering with realistic acceleration
 * - **Depth of Field Blur**: Background elements blur based on distance
 * - **Camera Shake**: Subtle shake following cascade progression
 * - **Dust Particles**: Semi-transparent particle effects at impact points
 * - **Performance Optimized**: CSS will-change on active elements only
 *
 * Use cases:
 * - Creating dramatic text reveal sequences
 * - Building kinetic typography effects
 * - Adding physics-based text destruction
 * - Creating slow-motion impact effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  words: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['WORD', 'CASCADE', 'EFFECT'])
    .describe(
      'Array of words to display as dominoes (minimum 1, maximum 10 for performance)',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size for domino words in pixels'),
  font: z
    .string()
    .default('Inter:900')
    .describe(
      'Font family with optional weight (e.g., "Inter:900", "Roboto:700")',
    ),
  wordSpacing: z
    .number()
    .min(20)
    .max(200)
    .default(60)
    .describe('Horizontal spacing between domino words in pixels'),
  dominoColor: z
    .string()
    .default('#00d4ff')
    .describe('Base color for domino words (hex or rgb)'),
  backgroundColor: z
    .string()
    .default('#1a1a2e')
    .describe('Background color for the scene'),
  cascadeDelay: z
    .number()
    .min(200)
    .max(800)
    .default(400)
    .describe(
      'Delay between each domino fall in milliseconds (affects cascade speed)',
    ),
  fallDuration: z
    .number()
    .min(300)
    .max(1000)
    .default(600)
    .describe('Duration of each domino fall animation in milliseconds'),
  scatterIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for letter scattering physics'),
  dustParticleCount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Number of dust particles per impact (0 to disable)'),
  cameraShakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Intensity of camera shake effect in pixels'),
  depthBlurAmount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum blur amount for depth of field effect in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontWeight = '900';
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      if (parts.length > 1) {
        fontWeight = parts[1];
      }
    }
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(params.font);
  const words = params.words;
  const wordCount = words.length;

  // Calculate total duration (cascade delay + fall duration + scatter duration)
  const totalDuration =
    (wordCount * params.cascadeDelay + params.fallDuration + 1500) / 1000; // Convert to seconds

  // Container for all dominoes
  const dominoContainerId = 'domino-cascade-container';
  const childrenData: RenderableComponentData[] = [];

  // Generate color variants for each word
  const generateColor = (index: number): string => {
    const colors = [
      '#00d4ff',
      '#ff6b6b',
      '#4ecdc4',
      '#ffeb3b',
      '#ff9800',
      '#9c27b0',
      '#00bcd4',
      '#8bc34a',
      '#e91e63',
      '#03a9f4',
    ];
    return colors[index % colors.length];
  };

  // Helper: Create standing domino word with fall animation
  const createDominoWord = (
    word: string,
    index: number,
  ): RenderableComponentData[] => {
    const wordId = `domino-word-${index}`;
    const wordColor = generateColor(index);
    const startTime = (index * params.cascadeDelay) / 1000; // Relative start time
    const fallStart = startTime + 0.8; // Start falling at 80% of cascade delay
    const fallEnd = fallStart + params.fallDuration / 1000;
    const impactTime = fallEnd;
    const scatterEnd = impactTime + 1.1;

    const components: RenderableComponentData[] = [];

    // Standing domino word (visible until impact)
    const standingWordEffect: GenericEffectData = {
      type: 'ease-in',
      start: fallStart,
      duration: params.fallDuration / 1000,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Rotation from standing to fallen
        { key: 'rotateX', val: -15, prog: 0 },
        { key: 'rotateX', val: 90, prog: 0.95 },
        { key: 'rotateX', val: 95, prog: 1 }, // Slight bounce
        // Fade out
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.8 },
        { key: 'opacity', val: 0, prog: 1 },
        // Slight vertical drop
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 20, prog: 1 },
      ],
    };

    components.push({
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontWeight,
          color: wordColor,
          textShadow: `0 0 20px ${wordColor}80`,
          transformStyle: 'preserve-3d',
          transformOrigin: 'bottom center',
          position: 'relative',
          willChange: 'transform, opacity',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: impactTime,
        },
      },
      effects: [
        {
          id: `${wordId}-fall`,
          componentId: 'generic',
          data: standingWordEffect,
        },
      ],
    } as RenderableComponentData);

    // Fractured letters (appear at impact)
    const letters = word.split('');
    const letterContainerId = `${wordId}-letters`;

    const letterComponents: RenderableComponentData[] = letters.map(
      (letter, letterIndex) => {
        const letterId = `${wordId}-letter-${letterIndex}`;
        const letterCount = letters.length;
        const centerOffset = letterIndex - letterCount / 2;

        // Physics-based scatter calculation
        const scatterX = centerOffset * 40 * params.scatterIntensity;
        const scatterY =
          Math.random() * 100 * params.scatterIntensity + 50;
        const scatterRotate =
          (Math.random() - 0.5) * 360 * params.scatterIntensity;

        const letterScatterEffect: GenericEffectData = {
          type: 'ease-out',
          start: 0,
          duration: 1.1,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            // Initial position (stacked at impact point)
            {
              key: 'translateX',
              val: centerOffset * (params.fontSize * 0.6),
              prog: 0,
            },
            { key: 'translateX', val: scatterX, prog: 1 },
            // Gravity simulation (accelerating downward)
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: scatterY * 0.3, prog: 0.5 },
            { key: 'translateY', val: scatterY, prog: 1 },
            // Rotation tumble
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: scatterRotate, prog: 1 },
            // Scale down slightly
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        };

        return {
          id: letterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: fontWeight,
              color: wordColor,
              position: 'absolute',
              left: '0px',
              top: '0px',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 1.1,
            },
          },
          effects: [
            {
              id: `${letterId}-scatter`,
              componentId: 'generic',
              data: letterScatterEffect,
            },
          ],
        } as RenderableComponentData;
      },
    );

    components.push({
      id: letterContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transformStyle: 'preserve-3d',
            left: '0px',
            top: '0px',
          },
        },
      },
      context: {
        timing: {
          start: impactTime,
          duration: 1.1,
        },
      },
      childrenData: letterComponents,
    } as RenderableComponentData);

    // Dust particles at impact
    if (params.dustParticleCount > 0) {
      const dustContainerId = `${wordId}-dust`;
      const dustParticles: RenderableComponentData[] = [];

      for (let i = 0; i < params.dustParticleCount; i++) {
        const dustId = `${wordId}-dust-${i}`;
        const dustSize = 6 + Math.random() * 8;
        const dustX = (Math.random() - 0.5) * 60;
        const dustY = Math.random() * 40;
        const dustDuration = 0.6 + Math.random() * 0.4;

        const dustEffect: GenericEffectData = {
          type: 'ease-out',
          start: 0,
          duration: dustDuration,
          mode: 'provider',
          targetIds: [dustId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: dustX, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -dustY, prog: 1 },
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.5, prog: 1 },
          ],
        };

        dustParticles.push({
          id: dustId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${dustSize}px; height: ${dustSize}px; background: ${wordColor}99; border-radius: 50%;"></div>`,
            style: {
              position: 'absolute',
              left: '0px',
              top: '0px',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: dustDuration,
            },
          },
          effects: [
            {
              id: `${dustId}-float`,
              componentId: 'generic',
              data: dustEffect,
            },
          ],
        } as RenderableComponentData);
      }

      components.push({
        id: dustContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              pointerEvents: 'none',
              left: '0px',
              top: '0px',
            },
          },
        },
        context: {
          timing: {
            start: impactTime,
            duration: 0.8,
          },
        },
        childrenData: dustParticles,
      } as RenderableComponentData);
    }

    // Depth of field blur (applied to previous words)
    if (index > 0 && params.depthBlurAmount > 0) {
      const blurEffect: GenericEffectData = {
        type: 'linear',
        start: fallStart,
        duration: params.fallDuration / 1000,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          {
            key: 'filter',
            val: `blur(${params.depthBlurAmount}px)`,
            prog: 1,
          },
        ],
      };

      // Apply blur to self after falling
      if (components[0].effects) {
        components[0].effects.push({
          id: `${wordId}-blur`,
          componentId: 'generic',
          data: blurEffect,
        });
      }
    }

    return components;
  };

  // Generate all domino words
  words.forEach((word, index) => {
    const wordComponents = createDominoWord(word, index);
    childrenData.push(...wordComponents);
  });

  // Camera shake effect (follows cascade progression)
  const cameraShakeEffect: GenericEffectData = {
    type: 'linear',
    start: 0.8,
    duration: totalDuration - 0.8,
    mode: 'provider',
    targetIds: [dominoContainerId],
    ranges: [
      // Shake X (oscillating)
      { key: 'translateX', val: 0, prog: 0 },
      {
        key: 'translateX',
        val: params.cameraShakeIntensity * 0.5,
        prog: 0.1,
      },
      {
        key: 'translateX',
        val: -params.cameraShakeIntensity * 0.5,
        prog: 0.2,
      },
      {
        key: 'translateX',
        val: params.cameraShakeIntensity * 0.3,
        prog: 0.3,
      },
      {
        key: 'translateX',
        val: -params.cameraShakeIntensity * 0.3,
        prog: 0.4,
      },
      { key: 'translateX', val: 0, prog: 0.5 },
      // Shake Y (oscillating)
      { key: 'translateY', val: 0, prog: 0 },
      {
        key: 'translateY',
        val: params.cameraShakeIntensity * 0.3,
        prog: 0.15,
      },
      {
        key: 'translateY',
        val: -params.cameraShakeIntensity * 0.3,
        prog: 0.25,
      },
      { key: 'translateY', val: 0, prog: 0.35 },
    ],
  };

  // Domino container (holds all words with 3D perspective)
  const dominoContainer: RenderableComponentData = {
    id: dominoContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex flex-row items-end justify-center',
        style: {
          gap: `${params.wordSpacing}px`,
          bottom: '30%',
          transformStyle: 'preserve-3d',
          left: '50%',
          transform: 'translateX(-50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData,
    effects: [
      {
        id: 'camera-shake',
        componentId: 'generic',
        data: cameraShakeEffect,
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'domino-cascade-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          overflow: 'hidden',
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [dominoContainer],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'domino-cascade-text',
  title: 'Domino Cascade Text Destruction',
  description:
    'A dramatic domino cascade effect where text words stand upright like dominoes and topple into each other in sequence. Each word fractures into individual letters on impact with physics-based scattering, dust particles, depth of field blur, and camera shake following the cascade progression. Features 3D transforms, staggered timing, realistic gravity simulation, and slow-motion impact effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'kinetic',
    '3d',
    'cascade',
    'domino',
    'physics',
    'destruction',
    'particles',
    'camera-shake',
    'depth-of-field',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['WORD', 'CASCADE', 'EFFECT'],
    fontSize: 72,
    font: 'Inter:900',
    wordSpacing: 60,
    dominoColor: '#00d4ff',
    backgroundColor: '#1a1a2e',
    cascadeDelay: 400,
    fallDuration: 600,
    scatterIntensity: 1,
    dustParticleCount: 3,
    cameraShakeIntensity: 3,
    depthBlurAmount: 8,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const dominoCascadeTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
