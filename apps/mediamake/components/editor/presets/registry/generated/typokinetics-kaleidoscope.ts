/**
 * Typokinetics Kaleidoscope Preset
 *
 * This preset simulates text being viewed through a kaleidoscope with symmetrical patterns
 * and prismatic drift effects. It creates a multi-layer mirrored composition where text is
 * duplicated and reflected across multiple axes, creating beautiful symmetrical patterns that
 * shift and morph.
 *
 * Features:
 * - Hexagonal symmetry using 6 mirrored segments (60-degree intervals)
 * - Radial drift animation from center outward
 * - Prismatic color shifting effects (hue rotation)
 * - Scale pulsing synchronized with radial distance
 * - Subtle twist distortion on the entire pattern
 * - Smooth fade out as elements reach edges
 *
 * Use cases:
 * - Creating mesmerizing visual effects for music videos
 * - Artistic title sequences and transitions
 * - Psychedelic visual presentations
 * - Abstract text animations with symmetrical patterns
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
    .default('KALEIDOSCOPE')
    .describe('Text to display in kaleidoscope pattern'),
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(8)
    .describe('Duration of the kaleidoscope animation in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .describe('Font size for the text in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (will be affected by hue rotation)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the kaleidoscope'),
  maxRadius: z
    .number()
    .min(100)
    .max(500)
    .default(300)
    .describe('Maximum radial distance for outward drift in pixels'),
  rotationAmount: z
    .number()
    .min(0)
    .max(720)
    .default(360)
    .describe('Amount of rotation during drift animation in degrees'),
  twistAmount: z
    .number()
    .min(0)
    .max(180)
    .default(45)
    .describe('Amount of spiral twist on the entire pattern in degrees'),
  minScale: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Minimum scale at center'),
  maxScale: z
    .number()
    .min(1)
    .max(3)
    .default(1.2)
    .describe('Maximum scale at edges'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const duration = params.duration;
  const numSegments = 6; // Hexagonal symmetry

  // Create 6 text instances (one for each symmetry segment)
  const textInstances = Array.from({ length: numSegments }, (_, index) => {
    const textId = `kaleidoscope-text-${index}`;
    const rotation = (360 / numSegments) * index; // 0, 60, 120, 180, 240, 300

    // Radial drift effect: move outward from center
    const radialDriftEffect = {
      id: `radial-drift-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          // Start at center (0, 0)
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateY', val: 0, prog: 0 },
          // Move outward based on polar coordinates
          // For segment 0 (0 degrees): move right
          // Calculate X and Y based on angle
          {
            key: 'translateX',
            val: params.maxRadius * Math.cos((rotation * Math.PI) / 180),
            prog: 1,
          },
          {
            key: 'translateY',
            val: params.maxRadius * Math.sin((rotation * Math.PI) / 180),
            prog: 1,
          },
          // Rotation during drift
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: params.rotationAmount, prog: 1 },
        ],
      },
    };

    // Scale animation synchronized with radial distance
    const scaleEffect = {
      id: `scale-pulse-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'scale', val: params.minScale, prog: 0 },
          { key: 'scale', val: params.maxScale, prog: 1 },
        ],
      },
    };

    // Hue rotation for prismatic color shifting
    const hueRotateEffect = {
      id: `hue-rotate-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
          { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
        ],
      },
    };

    // Opacity fade as elements reach edges
    const opacityFadeEffect = {
      id: `opacity-fade-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    return {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight || 700,
          color: params.textColor,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [radialDriftEffect, scaleEffect, hueRotateEffect, opacityFadeEffect],
    };
  });

  // Create symmetry segment containers (each rotated by 60 degrees)
  const symmetrySegments = textInstances.map((textInstance, index) => {
    const rotation = (360 / numSegments) * index;

    return {
      id: `symmetry-segment-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transformOrigin: 'center center',
            transform: `rotate(${rotation}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [textInstance],
    } as RenderableComponentData;
  });

  // Twist effect on the kaleidoscope container (subtle spiral)
  const twistEffect = {
    id: 'kaleidoscope-twist',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['kaleidoscope-container'],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: params.twistAmount, prog: 1 },
      ],
    },
  };

  // Kaleidoscope container (holds all symmetry segments)
  const kaleidoscopeContainer: RenderableComponentData = {
    id: 'kaleidoscope-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [twistEffect],
    childrenData: symmetrySegments as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [kaleidoscopeContainer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokineticsKaleidoscope',
  title: 'Typokinetics Kaleidoscope',
  description:
    'A mesmerizing typokinetics preset featuring text viewed through a kaleidoscope with hexagonal symmetry, radial drift animations, prismatic color shifting, scale pulsing, and spiral twist distortion. Text elements expand outward from center along 60-degree axes while rotating and cycling through spectrum colors.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kaleidoscope',
    'symmetry',
    'hexagonal',
    'prismatic',
    'drift',
    'color-shift',
    'spiral',
    'twist',
    'animated',
    'mesmerizing',
    'psychedelic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'KALEIDOSCOPE',
    duration: 8,
    fontSize: 64,
    font: 'Inter:700',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    maxRadius: 300,
    rotationAmount: 360,
    twistAmount: 45,
    minScale: 0.5,
    maxScale: 1.2,
  },
};

// Export preset
export const typokineticsKaleidoscopePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
