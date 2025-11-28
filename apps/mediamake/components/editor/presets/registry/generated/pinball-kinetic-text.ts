/**
 * Pinball Kinetic Text Preset
 *
 * Ultra-dynamic pinball machine-inspired text preset with spring-loaded bouncing trajectories,
 * bumper collision effects, arcade strobe gradients, and multiball text duplication moments.
 * Words behave as pinballs with parabolic bounce physics, rotation on impact, scale reactions,
 * and tilt effects simulating invisible forces.
 *
 * Features:
 * - **Spring-Loaded Launch**: Text launches into frame with explosive energy
 * - **Parabolic Bounce Physics**: Multiple bounces with decreasing intensity
 * - **Bumper Collision Effects**: Sudden direction changes and rotation on impact
 * - **Multiball Moments**: Words temporarily split into multiple copies
 * - **Arcade Strobe Gradients**: Rapid color shifts between hot pink, electric blue, neon yellow
 * - **Tilt & Rotation**: Constant spring-like reactions to invisible forces
 * - **3D Depth**: Perspective transforms for pinball machine depth
 *
 * Use cases:
 * - High-energy title sequences
 * - Gaming and arcade content
 * - Dynamic social media posts
 * - Action-packed promotional videos
 * - Retro gaming aesthetic content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('PINBALL BOUNCE ARCADE')
    .describe('Text to display as pinball words'),
  font: z
    .string()
    .optional()
    .default('BebasNeue:700')
    .describe(
      'Font family with optional weight and style (e.g., "BebasNeue:700", "Inter:900")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(80)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Total duration of the animation in seconds'),
  bounceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for bounce effects'),
  rotationSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed multiplier for rotation effects'),
  multiballEnabled: z
    .boolean()
    .default(true)
    .describe('Enable multiball duplication effect'),
  strobeSpeed: z
    .enum(['slow', 'medium', 'fast'])
    .default('medium')
    .describe('Speed of arcade strobe gradient effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'BebasNeue:700';
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

  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Strobe speed timing
  const strobeTimings = {
    slow: 0.3,
    medium: 0.15,
    fast: 0.08,
  };
  const strobeInterval = strobeTimings[params.strobeSpeed];

  // Helper: Create parabolic bounce trajectory for a word
  const createBounceTrajectory = (
    wordIndex: number,
    wordId: string,
    launchDelay: number,
  ) => {
    const totalDuration = params.duration - launchDelay;
    const bounceCount = 3; // Number of bounces
    const bounceDecay = 0.6; // Each bounce is 60% of previous

    // Initial launch parameters
    const launchHeight = 300 * params.bounceIntensity;
    const horizontalTravel = 200;

    const ranges = [];

    // Launch phase (0-0.3s)
    const launchDuration = 0.3;

    // Starting position (off-screen bottom-left)
    ranges.push(
      { key: 'translateX', val: -100, prog: 0 },
      { key: 'translateY', val: 400, prog: 0 },
      { key: 'scale', val: 0.7, prog: 0 },
      { key: 'rotate', val: -45, prog: 0 },
      { key: 'opacity', val: 0, prog: 0 },
    );

    // After launch (peak of first arc)
    const launchProgress = launchDuration / totalDuration;
    ranges.push(
      {
        key: 'translateX',
        val: horizontalTravel * 0.3,
        prog: launchProgress,
      },
      { key: 'translateY', val: -launchHeight, prog: launchProgress },
      { key: 'scale', val: 1.2, prog: launchProgress },
      { key: 'rotate', val: 360 * params.rotationSpeed, prog: launchProgress },
      { key: 'opacity', val: 1, prog: launchProgress },
    );

    // Create bounces
    let currentHeight = launchHeight;
    let currentRotation = 360 * params.rotationSpeed;
    let currentX = horizontalTravel * 0.3;

    for (let i = 0; i < bounceCount; i++) {
      const bounceStartTime = launchDuration + i * 0.7;
      const bouncePeakTime = bounceStartTime + 0.3;
      const bounceEndTime = bounceStartTime + 0.6;

      // Decay height and movement
      currentHeight *= bounceDecay;
      currentX += horizontalTravel * 0.2;
      currentRotation += 180 * params.rotationSpeed * bounceDecay;

      // Peak of bounce
      const peakProgress = Math.min(bouncePeakTime / totalDuration, 1);
      ranges.push(
        { key: 'translateX', val: currentX, prog: peakProgress },
        { key: 'translateY', val: -currentHeight, prog: peakProgress },
        { key: 'scale', val: 1 + 0.2 * bounceDecay, prog: peakProgress },
        { key: 'rotate', val: currentRotation, prog: peakProgress },
      );

      // Landing (bumper hit)
      const landProgress = Math.min(bounceEndTime / totalDuration, 1);
      ranges.push(
        { key: 'translateX', val: currentX + 20, prog: landProgress }, // Bumper pushes sideways
        { key: 'translateY', val: 0, prog: landProgress },
        { key: 'scale', val: 0.9, prog: landProgress }, // Compress on impact
        { key: 'rotate', val: currentRotation + 30, prog: landProgress }, // Spin on hit
      );
    }

    // Settle position
    ranges.push(
      { key: 'translateX', val: wordIndex * 100 - 150, prog: 0.9 },
      { key: 'translateY', val: 0, prog: 0.9 },
      { key: 'scale', val: 1, prog: 0.9 },
      { key: 'rotate', val: 0, prog: 0.9 },
      { key: 'opacity', val: 1, prog: 1 },
    );

    // Add perspective tilt throughout
    ranges.push(
      { key: 'rotateX', val: -20, prog: 0 },
      { key: 'rotateX', val: 10, prog: 0.3 },
      { key: 'rotateX', val: -10, prog: 0.6 },
      { key: 'rotateX', val: 0, prog: 1 },
    );

    return {
      id: `bounce-effect-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: totalDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges,
      },
    };
  };

  // Helper: Create multiball effect
  const createMultiballEffect = (wordId: string, wordIndex: number) => {
    if (!params.multiballEnabled) return null;

    const multiballId = `${wordId}-multiball`;
    const startTime = 0.5 + wordIndex * 0.1;
    const duration = 1;

    return {
      id: `multiball-effect-${multiballId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration,
        mode: 'provider',
        targetIds: [multiballId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.3 },
          { key: 'opacity', val: 0.7, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1, prog: 0.3 },
          { key: 'scale', val: 1.5, prog: 1 },
          { key: 'translateX', val: -30, prog: 0 },
          { key: 'translateX', val: 30, prog: 1 },
          { key: 'translateY', val: -50, prog: 0 },
          { key: 'translateY', val: 50, prog: 1 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: 360, prog: 1 },
        ],
      },
    };
  };

  // Create word components
  const wordComponents: RenderableComponentData[] = [];

  words.forEach((word, index) => {
    const launchDelay = index * 0.2;
    const wordId = `pinball-word-${index}`;
    const multiballId = `${wordId}-multiball`;

    // Main word container
    const wordContainer: RenderableComponentData = {
      id: `word-container-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transformStyle: 'preserve-3d',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          },
        },
      },
      context: {
        timing: {
          start: launchDelay,
          duration: params.duration - launchDelay,
        },
      },
      childrenData: [
        // Main word text
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word,
            className: 'font-black uppercase',
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              textShadow:
                '0 0 20px rgba(255,20,147,0.8), 0 0 40px rgba(30,144,255,0.6), 0 0 60px rgba(255,255,0,0.4)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration - launchDelay,
            },
          },
          effects: [createBounceTrajectory(index, wordId, launchDelay)],
        } as RenderableComponentData,
        // Multiball duplicate
        ...(params.multiballEnabled
          ? [
              {
                id: multiballId,
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: word,
                  className: 'font-black uppercase absolute',
                  style: {
                    fontSize: params.fontSize,
                    color: params.textColor,
                    textShadow:
                      '0 0 20px rgba(255,20,147,0.8), 0 0 40px rgba(30,144,255,0.6)',
                    top: 0,
                    left: 0,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight
                      ? [fontStyle.fontWeight.toString()]
                      : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: params.duration - launchDelay,
                  },
                },
                effects: [createMultiballEffect(wordId, index)].filter(
                  Boolean,
                ) as any[],
              } as RenderableComponentData,
            ]
          : []),
      ],
    };

    wordComponents.push(wordContainer);
  });

  // Create strobe gradient overlay
  const strobeSteps = Math.floor(params.duration / strobeInterval);
  const strobeRanges = [];

  const colors = [
    '#FF1493', // Hot pink
    '#1E90FF', // Electric blue
    '#FFEB3B', // Neon yellow
  ];

  for (let i = 0; i <= strobeSteps; i++) {
    const prog = i / strobeSteps;
    const colorIndex = i % colors.length;
    const color = colors[colorIndex];

    strobeRanges.push({
      key: 'backgroundColor',
      val: color,
      prog,
    });
    strobeRanges.push({
      key: 'opacity',
      val: 0.15,
      prog,
    });
  }

  const strobeOverlay: RenderableComponentData = {
    id: 'strobe-gradient-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
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
        id: 'strobe-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: ['strobe-gradient-overlay'],
          ranges: strobeRanges,
        },
      },
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pinball-stage',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-purple-900 to-blue-900',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1200px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [strobeOverlay, ...wordComponents],
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
  id: 'pinball-kinetic-text',
  title: 'Pinball Kinetic Text',
  description:
    'Ultra-dynamic pinball machine-inspired text preset with spring-loaded bouncing trajectories, bumper collision effects, arcade strobe gradients, and multiball text duplication moments. Words behave as pinballs with parabolic bounce physics, rotation on impact, scale reactions, and tilt effects simulating invisible forces.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'kinetic',
    'pinball',
    'arcade',
    'bounce',
    'gaming',
    'retro',
    'dynamic',
    'multiball',
    'strobe',
    'physics',
    '3d',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PINBALL BOUNCE ARCADE',
    font: 'BebasNeue:700',
    fontSize: 80,
    textColor: '#ffffff',
    duration: 5,
    bounceIntensity: 1,
    rotationSpeed: 1.5,
    multiballEnabled: true,
    strobeSpeed: 'medium',
  },
};

export const pinballKineticTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
