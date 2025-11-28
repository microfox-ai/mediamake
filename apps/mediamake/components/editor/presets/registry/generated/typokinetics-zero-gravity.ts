/**
 * Typokinetics Zero Gravity Preset
 *
 * This preset simulates words floating in zero gravity, drifting past like space debris.
 * Each word has its own trajectory, rotation, and tumbling motion as if floating freely in 3D space.
 *
 * Features:
 * - **Zero Gravity Physics**: Realistic floating and tumbling motions for each word
 * - **Multiple Depth Layers**: Parallax effect with far, mid, and near depth layers
 * - **3D Transformations**: Continuous rotation (rotateX, rotateY) and translation along various paths
 * - **Light Source Effect**: Subtle brightness gradient simulating directional lighting
 * - **Close Pass Effect**: Words occasionally drift very close to camera with blur effect
 * - **Physics Simulation**: Smooth directional changes using sine/cosine functions
 * - **Performance Optimized**: Limits active words to 10-12 for smooth rendering
 *
 * Use cases:
 * - Creating cinematic space-themed title sequences
 * - Building immersive zero-gravity text effects
 * - Adding sci-fi atmosphere to videos
 * - Creating dynamic floating word animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  words: z
    .array(z.string())
    .describe('Array of words to float in zero gravity'),
  duration: z
    .number()
    .default(30)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .default(48)
    .describe('Base font size for the words in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text'),
  maxActiveWords: z
    .number()
    .default(12)
    .describe('Maximum number of words active at once (10-12 recommended)'),
  closePassProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Probability (0-1) that a word will have a close pass effect'),
  lightSourceIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of the light source gradient effect (0-1)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    maxActiveWords,
    closePassProbability,
    lightSourceIntensity,
  } = params;

  // Helper function to generate random trajectory parameters
  const generateTrajectory = (index: number, seed: number) => {
    // Use index and seed for pseudo-random but deterministic values
    const random = (i: number) => {
      const x = Math.sin(i * seed * 12.9898 + index * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    // Random start position (off-screen)
    const startX = random(1) > 0.5 ? -20 : 120; // Left or right edge
    const startY = random(2) * 120 - 10; // Spread vertically

    // Random end position (opposite side)
    const endX = startX < 50 ? 120 : -20;
    const endY = random(3) * 120 - 10;

    // Random drift amount (sine/cosine wave amplitude)
    const driftAmplitudeX = random(4) * 15 + 5; // 5-20%
    const driftAmplitudeY = random(5) * 15 + 5; // 5-20%

    // Random rotation speeds (degrees per second)
    const rotateXSpeed = (random(6) - 0.5) * 60; // -30 to +30 deg/s
    const rotateYSpeed = (random(7) - 0.5) * 60; // -30 to +30 deg/s

    // Random depth (scale factor)
    const depth = random(8) * 1.0 + 0.5; // 0.5 to 1.5

    // Random duration (8-15s)
    const wordDuration = random(9) * 7 + 8; // 8-15s

    // Random delay before starting
    const startDelay = random(10) * (duration - wordDuration);

    // Close pass check
    const hasClosePass = random(11) < closePassProbability;

    return {
      startX,
      startY,
      endX,
      endY,
      driftAmplitudeX,
      driftAmplitudeY,
      rotateXSpeed,
      rotateYSpeed,
      depth,
      wordDuration,
      startDelay,
      hasClosePass,
    };
  };

  // Helper function to determine depth layer
  const getDepthLayer = (depth: number): 'far' | 'mid' | 'near' => {
    if (depth < 0.8) return 'far';
    if (depth < 1.2) return 'mid';
    return 'near';
  };

  // Helper function to create word component with effects
  const createWordComponent = (
    word: string,
    index: number,
    trajectory: ReturnType<typeof generateTrajectory>,
  ): RenderableComponentData => {
    const wordId = `word-${index}`;
    const {
      startX,
      startY,
      endX,
      endY,
      driftAmplitudeX,
      driftAmplitudeY,
      rotateXSpeed,
      rotateYSpeed,
      depth,
      wordDuration,
      startDelay,
      hasClosePass,
    } = trajectory;

    // Calculate scaled font size based on depth
    const scaledFontSize = fontSize * depth;

    // Create motion effects
    const effects: any[] = [];

    // Main translation effect (horizontal movement with sine wave drift)
    effects.push({
      id: `${wordId}-translate`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startDelay,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Horizontal movement (with sine wave variation)
          { key: 'translateX', val: `${startX}vw`, prog: 0 },
          { key: 'translateX', val: `${(startX + endX) / 2 + driftAmplitudeX}vw`, prog: 0.25 },
          { key: 'translateX', val: `${(startX + endX) / 2}vw`, prog: 0.5 },
          { key: 'translateX', val: `${(startX + endX) / 2 - driftAmplitudeX}vw`, prog: 0.75 },
          { key: 'translateX', val: `${endX}vw`, prog: 1 },
          // Vertical drift (with cosine wave variation)
          { key: 'translateY', val: `${startY}vh`, prog: 0 },
          { key: 'translateY', val: `${(startY + endY) / 2 - driftAmplitudeY}vh`, prog: 0.25 },
          { key: 'translateY', val: `${(startY + endY) / 2}vh`, prog: 0.5 },
          { key: 'translateY', val: `${(startY + endY) / 2 + driftAmplitudeY}vh`, prog: 0.75 },
          { key: 'translateY', val: `${endY}vh`, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Continuous rotation effect (tumbling)
    const totalRotationX = (rotateXSpeed * wordDuration) % 360;
    const totalRotationY = (rotateYSpeed * wordDuration) % 360;

    effects.push({
      id: `${wordId}-rotate`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startDelay,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'rotateX', val: 0, prog: 0 },
          { key: 'rotateX', val: totalRotationX, prog: 1 },
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: totalRotationY, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Fade in/out at start and end
    effects.push({
      id: `${wordId}-opacity`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startDelay,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.1 },
          { key: 'opacity', val: 1, prog: 0.9 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Close pass effect (scale up and blur)
    if (hasClosePass) {
      const closePassStart = startDelay + wordDuration * 0.4;
      const closePassDuration = wordDuration * 0.2;

      effects.push({
        id: `${wordId}-close-pass`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: closePassStart,
          duration: closePassDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Scale up dramatically
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 3, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur effect
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(10px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        } as GenericEffectData,
      });
    }

    // Create light source gradient based on rotation
    const lightAngle = 45; // Light source from top-left
    const brightness = 1 + lightSourceIntensity;
    const gradientStyle = `linear-gradient(${lightAngle}deg, rgba(255,255,255,${lightSourceIntensity}) 0%, ${textColor} 50%, rgba(0,0,0,${lightSourceIntensity * 0.5}) 100%)`;

    return {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: effects,
      childrenData: [
        {
          id: `${wordId}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${scaledFontSize}px`,
              fontWeight: fontWeight,
              color: textColor,
              textShadow: '0 0 20px rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap',
              background: gradientStyle,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Generate seed for deterministic randomness
  const seed = 0.12345;

  // Create word components with trajectories
  const activeWords = words.slice(0, maxActiveWords);
  const wordComponents: RenderableComponentData[] = [];

  // Group words by depth layer
  const depthLayers: Record<'far' | 'mid' | 'near', RenderableComponentData[]> = {
    far: [],
    mid: [],
    near: [],
  };

  activeWords.forEach((word, index) => {
    const trajectory = generateTrajectory(index, seed);
    const depthLayer = getDepthLayer(trajectory.depth);
    const wordComponent = createWordComponent(word, index, trajectory);
    depthLayers[depthLayer].push(wordComponent);
  });

  // Create depth layer containers
  const farLayer: RenderableComponentData = {
    id: 'depth-layer-far',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: depthLayers.far,
  };

  const midLayer: RenderableComponentData = {
    id: 'depth-layer-mid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: depthLayers.mid,
  };

  const nearLayer: RenderableComponentData = {
    id: 'depth-layer-near',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: depthLayers.near,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-zero-gravity-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [farLayer, midLayer, nearLayer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-zero-gravity',
  title: 'Typokinetics Zero Gravity',
  description:
    'Simulates words floating in zero gravity, drifting past like space debris. Each word has its own trajectory, rotation, and tumbling motion with realistic physics, parallax depth, light source effects, and close-pass blur.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'zero-gravity',
    'space',
    '3d',
    'floating',
    'physics',
    'parallax',
    'depth',
    'rotation',
    'tumbling',
    'sci-fi',
  ],
  dependencies: {},
  defaultInputParams: {
    words: [
      'GRAVITY',
      'SPACE',
      'FLOAT',
      'DRIFT',
      'COSMOS',
      'ORBIT',
      'STELLAR',
      'NEBULA',
      'VOID',
      'INFINITE',
      'UNIVERSE',
      'QUANTUM',
    ],
    duration: 30,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    maxActiveWords: 12,
    closePassProbability: 0.15,
    lightSourceIntensity: 0.3,
  },
};

// Export preset
export const typokineticZeroGravityPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
