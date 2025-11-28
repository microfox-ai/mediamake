/**
 * Cylindrical Text Rotation - Typokinetics Preset
 *
 * Creates a 3D cylindrical text rotation effect that wraps text around a virtual column
 * with perspective distortion, dynamic brightness, and atmospheric fog. Text elements are
 * positioned around a cylinder surface using 3D transforms, rotating continuously to create
 * the effect of viewing through a spinning cylindrical display.
 *
 * Features:
 * - **3D Perspective**: Text wraps around invisible cylinder with perspective distortion
 * - **Continuous Rotation**: Full 360-degree rotation with smooth linear motion
 * - **Dynamic Compression**: Text at sides appears compressed (scaleX effect)
 * - **Brightness Modulation**: Text facing camera is brighter, dimming as it rotates away
 * - **Atmospheric Fog**: Radial gradient overlay obscures text moving to back of cylinder
 * - **Flexible Text Input**: Supports caption data or simple text array
 * - **Customizable Parameters**: Rotation speed, cylinder radius, number of segments, colors
 *
 * Use cases:
 * - Creating retro-futuristic text displays
 * - Building cinematic title sequences
 * - Adding depth to text animations
 * - Creating perspective-based text reveals
 * - Simulating holographic or cylindrical display effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .union([
      z.array(z.string()),
      z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          start: z.number(),
          absoluteStart: z.number(),
          duration: z.number(),
          words: z.array(z.any()).optional(),
        }),
      ),
    ])
    .optional()
    .describe(
      'Text content as array of strings or caption sentences. If not provided, uses default demo text.',
    ),
  rotationDuration: z
    .number()
    .min(5)
    .max(30)
    .default(12)
    .describe('Duration for one complete 360-degree rotation in seconds'),
  cylinderRadius: z
    .number()
    .min(100)
    .max(400)
    .default(200)
    .describe('Radius of the cylinder in pixels (affects depth)'),
  numberOfSegments: z
    .number()
    .min(6)
    .max(20)
    .default(12)
    .describe(
      'Number of text segments positioned around cylinder (evenly spaced)',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(96)
    .default(48)
    .describe('Font size for text elements in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color in hex or rgba format'),
  fogIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of atmospheric fog effect (0 = none, 1 = maximum)'),
  compressionMin: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.7)
    .describe('Minimum scaleX compression at cylinder sides (0.7 = 70% width)'),
  brightnessMin: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Minimum brightness at back of cylinder (0.5 = 50% brightness)'),
  perspectiveDistance: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective distance in pixels (affects 3D depth perception)'),
  startRotation: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe('Initial rotation angle in degrees (0-360)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    rotationDuration,
    cylinderRadius,
    numberOfSegments,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    fogIntensity,
    compressionMin,
    brightnessMin,
    perspectiveDistance,
    startRotation,
  } = params;

  const { config } = props;

  // Helper: Extract text array from input
  const extractTextArray = (): string[] => {
    if (!text || text.length === 0) {
      // Default demo text
      return [
        'ROTATING',
        'CYLINDER',
        'TEXT',
        'DISPLAY',
        'EFFECT',
        'VIRTUAL',
        'COLUMN',
        'SPINNING',
        'PERSPECTIVE',
        'DEPTH',
        'KINETIC',
        'TYPOGRAPHY',
      ];
    }

    // Check if text is array of strings
    if (typeof text[0] === 'string') {
      return text as string[];
    }

    // Extract from caption sentences (use first word or full text)
    const captions = text as TranscriptionSentence[];
    return captions.map((caption) => {
      if (caption.words && caption.words.length > 0) {
        return caption.words[0].text;
      }
      return caption.text.split(' ')[0] || caption.text;
    });
  };

  const textArray = extractTextArray();

  // Calculate angle step between segments
  const angleStep = 360 / numberOfSegments;

  // Create text segments positioned around cylinder
  const textSegments: RenderableComponentData[] = [];

  for (let i = 0; i < numberOfSegments; i++) {
    const segmentAngle = i * angleStep;
    const textIndex = i % textArray.length;
    const segmentText = textArray[textIndex];
    const segmentId = `text-segment-${i}`;

    // Calculate normalized angle for effects (0 at front, 0.5 at back)
    const normalizedAngle = ((segmentAngle % 360) / 360) * 2;
    const backFacingFactor = Math.abs(normalizedAngle - 1); // 0 at back (180deg), 1 at front (0/360deg)

    // Calculate scaleX based on angle (compressed at sides)
    const scaleX =
      compressionMin + (1 - compressionMin) * Math.pow(backFacingFactor, 2);

    // Calculate brightness based on angle (dimmer at back)
    const brightness =
      brightnessMin + (1 - brightnessMin) * Math.pow(backFacingFactor, 1.5);

    // Create effect for dynamic scaling
    const scaleEffect = {
      id: `scale-effect-${segmentId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: rotationDuration,
        mode: 'provider' as const,
        targetIds: [segmentId],
        ranges: [
          { key: 'scaleX', val: scaleX, prog: 0 },
          {
            key: 'scaleX',
            val:
              compressionMin +
              (1 - compressionMin) *
                Math.pow(
                  Math.abs(
                    (((segmentAngle + 360) % 360) / 360) * 2 - 1,
                  ),
                  2,
                ),
            prog: 1,
          },
        ],
      },
    };

    // Create effect for dynamic brightness
    const brightnessEffect = {
      id: `brightness-effect-${segmentId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: rotationDuration,
        mode: 'provider' as const,
        targetIds: [segmentId],
        ranges: [
          { key: 'filter', val: `brightness(${brightness})`, prog: 0 },
          {
            key: 'filter',
            val: `brightness(${
              brightnessMin +
              (1 - brightnessMin) *
                Math.pow(
                  Math.abs(
                    (((segmentAngle + 360) % 360) / 360) * 2 - 1,
                  ),
                  1.5,
                )
            })`,
            prog: 1,
          },
        ],
      },
    };

    textSegments.push({
      id: segmentId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: segmentText,
        className: 'absolute whitespace-nowrap',
        style: {
          transformStyle: 'preserve-3d',
          transform: `rotateY(${segmentAngle}deg) translateZ(${cylinderRadius}px)`,
          backfaceVisibility: 'hidden' as const,
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: rotationDuration,
        },
      },
      effects: [scaleEffect, brightnessEffect],
    } as RenderableComponentData);
  }

  // Create cylinder container with rotation effect
  const rotationEffect = {
    id: 'cylinder-rotation-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: rotationDuration,
      mode: 'provider' as const,
      targetIds: ['cylinder-container'],
      ranges: [
        { key: 'rotateY', val: startRotation, prog: 0 },
        { key: 'rotateY', val: startRotation + 360, prog: 1 },
      ],
    },
  };

  const cylinderContainer: RenderableComponentData = {
    id: 'cylinder-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
          transform: `rotateY(${startRotation}deg)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: rotationDuration,
      },
    },
    effects: [rotationEffect],
    childrenData: textSegments,
  };

  // Create fog overlay
  const fogOverlay: RenderableComponentData = {
    id: 'fog-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${fogIntensity * 0.4}) 70%, rgba(0,0,0,${fogIntensity * 0.8}) 100%)`,
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: rotationDuration,
      },
    },
    childrenData: [],
  };

  // Create perspective root container
  const rootContainer: RenderableComponentData = {
    id: 'cylindrical-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'perspective-[1000px] flex justify-center items-center absolute inset-0',
        style: {
          perspective: `${perspectiveDistance}px`,
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: rotationDuration,
      },
    },
    childrenData: [cylinderContainer, fogOverlay],
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
  id: 'cylindrical-text-rotation',
  title: 'Cylindrical Text Rotation - Typokinetics',
  description:
    '3D cylindrical text rotation preset that wraps text around a virtual column with perspective distortion, dynamic brightness, and atmospheric fog. Text elements are positioned around a cylinder surface using 3D transforms, rotating continuously to create the effect of viewing through a spinning cylindrical display.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'rotation',
    'cylinder',
    'perspective',
    'depth',
    'fog',
    'holographic',
    'display',
    'retro',
    'futuristic',
  ],
  dependencies: {},
  defaultInputParams: {
    rotationDuration: 12,
    cylinderRadius: 200,
    numberOfSegments: 12,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#FFFFFF',
    fogIntensity: 0.6,
    compressionMin: 0.7,
    brightnessMin: 0.5,
    perspectiveDistance: 1000,
    startRotation: 0,
  },
};

// Export preset
export const cylindricalTextRotationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
