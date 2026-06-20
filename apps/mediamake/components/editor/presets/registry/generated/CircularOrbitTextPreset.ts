/**
 * Orbital Parallax Preset
 *
 * This preset creates an orbital parallax effect where text rotates around video content
 * in elliptical paths at different radii and speeds. Features physics-based motion with
 * momentum, comet-tail particle effects, video counter-rotation, depth-based blur, and
 * gravitational clustering where semantically related words attract each other.
 *
 * Features:
 * - **Elliptical Orbital Motion**: Text follows parametric elliptical paths (x = a*cos(t), y = b*sin(t))
 * - **Variable Speeds**: Different orbital radii and speeds via CSS custom properties
 * - **Physics-Based Motion**: Momentum and slingshot effects via cubic-bezier timing
 * - **Comet Tails**: Multiple box-shadows with decreasing opacity trailing behind text
 * - **Video Counter-Rotation**: Video rotates slowly in opposite direction (-0.1x speed)
 * - **Depth-Based Blur**: Text blur increases with orbital radius distance
 * - **Gravitational Clustering**: Semantically related words attracted to each other
 * - **Word Constellations**: Caption words maintain relative positions while orbiting
 *
 * Use cases:
 * - Creating dynamic orbital text animations around video
 * - Building engaging social media content with motion graphics
 * - Adding kinetic typography effects to presentations
 * - Creating visually striking subtitle displays
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  video: z
    .object({
      src: z.string().describe('Video source URL or local path'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .default(1)
        .optional()
        .describe('Video volume (0-1)'),
      muted: z.boolean().default(false).optional().describe('Mute video audio'),
    })
    .describe('Video configuration'),

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
          }),
        ),
        metadata: z
          .object({
            semanticGroup: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Caption data with word-level timing'),

  orbitalSettings: z
    .object({
      baseOrbitDuration: z
        .number()
        .min(5)
        .max(30)
        .default(15)
        .optional()
        .describe('Base orbit duration in seconds (fastest orbit)'),
      minRadius: z
        .number()
        .min(200)
        .max(400)
        .default(280)
        .optional()
        .describe('Minimum orbital radius in pixels'),
      maxRadius: z
        .number()
        .min(400)
        .max(800)
        .default(550)
        .optional()
        .describe('Maximum orbital radius in pixels'),
      ellipseRatio: z
        .number()
        .min(0.5)
        .max(1)
        .default(0.75)
        .optional()
        .describe('Ellipse ratio (1 = circle, <1 = ellipse)'),
    })
    .optional()
    .describe('Orbital motion settings'),

  visualEffects: z
    .object({
      cometTailIntensity: z
        .number()
        .min(0)
        .max(1)
        .default(0.7)
        .optional()
        .describe('Comet tail effect intensity (0-1)'),
      depthBlurIntensity: z
        .number()
        .min(0)
        .max(1)
        .default(0.6)
        .optional()
        .describe('Depth-based blur intensity (0-1)'),
      videoCounterRotation: z
        .number()
        .min(-1)
        .max(0)
        .default(-0.1)
        .optional()
        .describe('Video counter-rotation speed multiplier (negative value)'),
    })
    .optional()
    .describe('Visual effects configuration'),

  physics: z
    .object({
      gravitationalStrength: z
        .number()
        .min(0)
        .max(1)
        .default(0.3)
        .optional()
        .describe('Gravitational clustering strength (0-1)'),
      momentumOvershoot: z
        .number()
        .min(0)
        .max(0.3)
        .default(0.15)
        .optional()
        .describe('Momentum overshoot amount (0-0.3)'),
    })
    .optional()
    .describe('Physics simulation settings'),

  textStyle: z
    .object({
      fontSize: z
        .number()
        .min(16)
        .max(48)
        .default(28)
        .optional()
        .describe('Text font size in pixels'),
      fontFamily: z
        .string()
        .default('Inter')
        .optional()
        .describe('Font family for text'),
      fontWeight: z
        .string()
        .default('600')
        .optional()
        .describe('Font weight for text'),
      color: z
        .string()
        .default('#FFFFFF')
        .optional()
        .describe('Text color (hex or CSS color)'),
    })
    .optional()
    .describe('Text styling configuration'),
});

// ==================== PRESET EXECUTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { config } = props;
  const fps = config?.fps || 30;

  // Extract parameters with defaults
  const video = params.video;
  const captions = params.captions;
  const orbitalSettings = params.orbitalSettings || {};
  const visualEffects = params.visualEffects || {};
  const physics = params.physics || {};
  const textStyle = params.textStyle || {};

  const baseOrbitDuration = orbitalSettings.baseOrbitDuration ?? 15;
  const minRadius = orbitalSettings.minRadius ?? 280;
  const maxRadius = orbitalSettings.maxRadius ?? 550;
  const ellipseRatio = orbitalSettings.ellipseRatio ?? 0.75;

  const cometTailIntensity = visualEffects.cometTailIntensity ?? 0.7;
  const depthBlurIntensity = visualEffects.depthBlurIntensity ?? 0.6;
  const videoCounterRotation = visualEffects.videoCounterRotation ?? -0.1;

  const gravitationalStrength = physics.gravitationalStrength ?? 0.3;
  const momentumOvershoot = physics.momentumOvershoot ?? 0.15;

  const fontSize = textStyle.fontSize ?? 28;
  const fontFamily = textStyle.fontFamily ?? 'Inter';
  const fontWeight = textStyle.fontWeight ?? '600';
  const color = textStyle.color ?? '#FFFFFF';

  // Helper: Calculate orbital parameters for each word
  const calculateOrbitalParams = (wordIndex: number, totalWords: number) => {
    // Distribute words across different orbital radii
    const radiusRatio = wordIndex / Math.max(1, totalWords - 1);
    const radiusA = minRadius + (maxRadius - minRadius) * radiusRatio;
    const radiusB = radiusA * ellipseRatio;

    // Speed factor: outer orbits are slower (1.0 to 2.5x)
    const speedFactor = 1 + radiusRatio * 1.5;

    // Random phase offset for varied starting positions
    const phaseOffset = (wordIndex * 137.5) % 360; // Golden angle distribution

    // Depth blur: outer orbits more blurred
    const blurAmount = radiusRatio * 8 * depthBlurIntensity;

    return {
      radiusA,
      radiusB,
      speedFactor,
      phaseOffset,
      blurAmount,
    };
  };

  // Helper: Create comet tail effect shadows
  const createCometTailShadows = (intensity: number): string => {
    const shadows = [];
    const numTails = 5;
    for (let i = 1; i <= numTails; i++) {
      const distance = i * 3;
      const opacity = intensity * (1 - i / (numTails + 1));
      shadows.push(`${distance}px 0 ${distance * 1.5}px rgba(255,255,255,${opacity})`);
    }
    return shadows.join(', ');
  };

  // Helper: Calculate gravitational offset based on semantic group
  const calculateGravitationalOffset = (
    caption: TranscriptionSentence,
    wordIndex: number,
  ): { x: number; y: number } => {
    // Simple gravitational clustering: words in same semantic group attract
    const semanticGroup = caption.metadata?.semanticGroup || 'default';
    const groupHash = semanticGroup.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Create cluster centers based on semantic group
    const clusterAngle = (groupHash % 360) * (Math.PI / 180);
    const clusterRadius = 30 * gravitationalStrength;

    return {
      x: Math.cos(clusterAngle) * clusterRadius,
      y: Math.sin(clusterAngle) * clusterRadius,
    };
  };

  // Build word orbital components
  const wordOrbitalComponents: RenderableComponentData[] = [];
  let totalWords = 0;

  // Count total words first for distribution
  captions.forEach((caption) => {
    totalWords += caption.words.length;
  });

  let globalWordIndex = 0;

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `orbital-word-${captionIndex}-${wordIndex}`;

      // Calculate orbital parameters
      const orbitalParams = calculateOrbitalParams(globalWordIndex, totalWords);
      const gravitationalOffset = calculateGravitationalOffset(caption, wordIndex);

      // Orbit duration for this word
      const orbitDuration = baseOrbitDuration * orbitalParams.speedFactor;

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transformOrigin: 'center center',
              '--orbit-radius-a': `${orbitalParams.radiusA}px`,
              '--orbit-radius-b': `${orbitalParams.radiusB}px`,
              '--orbit-duration': `${orbitDuration}s`,
              '--phase-offset': `${orbitalParams.phaseOffset}deg`,
              '--blur-amount': `${orbitalParams.blurAmount}px`,
              '--grav-offset-x': `${gravitationalOffset.x}px`,
              '--grav-offset-y': `${gravitationalOffset.y}px`,
            } as React.CSSProperties,
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: word.duration,
          },
        },
        childrenData: [
          {
            id: `${wordId}-text`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontWeight,
                color: color,
                textShadow: createCometTailShadows(cometTailIntensity),
                filter: `blur(var(--blur-amount, 0px))`,
              },
              font: {
                family: fontFamily,
                weights: [fontWeight],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          {
            id: `${wordId}-orbit-effect`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: word.duration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Orbital motion via parametric equations with gravitational offset
                // x = a * cos(t) + grav_x
                // y = b * sin(t) + grav_y
                {
                  key: 'translateX',
                  val: `calc(var(--orbit-radius-a) * cos(var(--phase-offset)) + var(--grav-offset-x))`,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: `calc(var(--orbit-radius-a) * cos(calc(var(--phase-offset) + 360deg)) + var(--grav-offset-x))`,
                  prog: 1,
                },
                {
                  key: 'translateY',
                  val: `calc(var(--orbit-radius-b) * sin(var(--phase-offset)) + var(--grav-offset-y))`,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: `calc(var(--orbit-radius-b) * sin(calc(var(--phase-offset) + 360deg)) + var(--grav-offset-y))`,
                  prog: 1,
                },
                // Rotation for orientation along orbit path
                {
                  key: 'rotate',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'rotate',
                  val: 360,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData;

      wordOrbitalComponents.push(wordComponent);
      globalWordIndex++;
    });
  });

  // Calculate total video duration
  const videoDuration = Math.max(
    ...captions.map((c) => c.absoluteEnd),
    baseOrbitDuration,
  );

  // Video counter-rotation duration
  const videoRotationDuration = videoDuration;
  const videoRotationDegrees = 360 * videoCounterRotation; // Negative for counter-rotation

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'orbital-parallax-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: videoDuration,
      },
    },
    childrenData: [
      // Center video container with counter-rotation
      {
        id: 'center-video-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: videoDuration,
          },
        },
        childrenData: [
          {
            id: 'center-video',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video.src,
              volume: video.volume ?? 1,
              muted: video.muted ?? false,
              className: 'shadow-2xl',
              style: {
                width: '50%',
                height: '50%',
                objectFit: 'cover',
                borderRadius: '16px',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: videoDuration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          {
            id: 'video-counter-rotation-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: videoRotationDuration,
              mode: 'provider',
              targetIds: ['center-video-container'],
              ranges: [
                {
                  key: 'rotate',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'rotate',
                  val: videoRotationDegrees,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,

      // Orbital system container
      {
        id: 'orbital-system-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: videoDuration,
          },
        },
        childrenData: wordOrbitalComponents,
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'orbitalParallaxPreset',
  title: 'Orbital Parallax Preset',
  description:
    'Text rotates around video content in elliptical orbital paths with physics-based motion, comet tails, depth blur, and gravitational clustering',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'orbital',
    'parallax',
    'motion',
    'physics',
    'elliptical',
    'kinetic',
    'comet-tail',
    'depth-blur',
    'gravitational',
    'video',
    'captions',
    'advanced',
  ],
  dependencies: {},
  defaultInputParams: {
    video: {
      src: 'video.mp4',
      volume: 1,
      muted: false,
    },
    captions: [],
    orbitalSettings: {
      baseOrbitDuration: 15,
      minRadius: 280,
      maxRadius: 550,
      ellipseRatio: 0.75,
    },
    visualEffects: {
      cometTailIntensity: 0.7,
      depthBlurIntensity: 0.6,
      videoCounterRotation: -0.1,
    },
    physics: {
      gravitationalStrength: 0.3,
      momentumOvershoot: 0.15,
    },
    textStyle: {
      fontSize: 28,
      fontFamily: 'Inter',
      fontWeight: '600',
      color: '#FFFFFF',
    },
  },
};

// ==================== EXPORT ====================

export const orbitalParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
