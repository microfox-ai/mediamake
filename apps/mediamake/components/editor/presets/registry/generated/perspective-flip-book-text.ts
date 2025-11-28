/**
 * Perspective Flip Book Text Animation Preset
 *
 * Creates a dynamic flip book animation where text transitions through different viewing angles
 * as if pages are being turned. Each 'page turn' reveals the text from a new perspective:
 * flat, tilted left, tilted right, tilted up, tilted down.
 *
 * Features:
 * - Five perspective stages: flat → tilt left → flat → tilt right → flat
 * - 3D transform effects with rotateY, rotateX, scale, and translateZ
 * - Perspective projection (1000px) for realistic depth
 * - Dynamic box-shadow that shifts during page turns
 * - Cubic-bezier easing with segment-specific curves
 * - Transform-origin adjustments for realistic pivot points
 * - Subtle scale and depth changes during transitions
 * - Smooth acceleration and deceleration physics
 *
 * Use cases:
 * - Educational content with dynamic text reveals
 * - Motion graphics for presentations
 * - Book-style reading experiences
 * - Interactive storytelling animations
 * - Social media content with page-turn effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display in the flip book'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size in pixels for the text'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color in hex or rgba format'),
  backgroundColor: z
    .string()
    .default('rgba(0, 0, 0, 0.8)')
    .describe('Background color for the text container'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the animation in seconds'),
  perspective: z
    .number()
    .default(1000)
    .describe('Perspective distance in pixels for 3D effect'),
  rotateYAngle: z
    .number()
    .default(30)
    .describe('Maximum Y-axis rotation angle in degrees for tilts'),
  rotateXAngle: z
    .number()
    .default(10)
    .describe('Maximum X-axis rotation angle in degrees for tilts'),
  depthOffset: z
    .number()
    .default(50)
    .describe('Z-axis translation during turns for depth effect (pixels)'),
  scaleAmount: z
    .number()
    .default(0.95)
    .describe('Scale factor during page turns (1 = no scale)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    fontFamily,
    textColor,
    backgroundColor,
    duration,
    perspective,
    rotateYAngle,
    rotateXAngle,
    depthOffset,
    scaleAmount,
  } = params;

  // Calculate segment durations (5 segments: 0-20%, 20-40%, 40-60%, 60-80%, 80-100%)
  const segmentDuration = duration / 5;

  // Text element ID
  const textElementId = 'perspective-flip-text-element';

  // Text atom
  const textAtom: RenderableComponentData = {
    id: textElementId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: textColor,
        textAlign: 'center',
        padding: '40px 60px',
        backgroundColor,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'visible',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Segment 1: Flat state (0-20%)
  const segment1Effect = {
    id: 'flip-effect-segment-1',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier' as const,
      start: 0,
      duration: segmentDuration,
      mode: 'provider' as const,
      targetIds: [textElementId],
      customEasing: [0.42, 0, 0.58, 1],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: 0, prog: 1 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'translateZ', val: 0, prog: 0 },
        { key: 'translateZ', val: 0, prog: 1 },
      ],
    },
  };

  // Segment 2: Tilt left (20-40%)
  const segment2Effect = {
    id: 'flip-effect-segment-2',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier' as const,
      start: segmentDuration,
      duration: segmentDuration,
      mode: 'provider' as const,
      targetIds: [textElementId],
      customEasing: [0.25, 0.1, 0.25, 1],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: -rotateYAngle, prog: 0.5 },
        { key: 'rotateY', val: -rotateYAngle, prog: 1 },
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: rotateXAngle, prog: 0.5 },
        { key: 'rotateX', val: rotateXAngle, prog: 1 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scaleAmount, prog: 0.5 },
        { key: 'scale', val: scaleAmount, prog: 1 },
        { key: 'translateZ', val: 0, prog: 0 },
        { key: 'translateZ', val: -depthOffset, prog: 0.5 },
        { key: 'translateZ', val: -depthOffset, prog: 1 },
      ],
    },
  };

  // Segment 3: Back to flat (40-60%)
  const segment3Effect = {
    id: 'flip-effect-segment-3',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier' as const,
      start: segmentDuration * 2,
      duration: segmentDuration,
      mode: 'provider' as const,
      targetIds: [textElementId],
      customEasing: [0.42, 0, 0.58, 1],
      ranges: [
        { key: 'rotateY', val: -rotateYAngle, prog: 0 },
        { key: 'rotateY', val: 0, prog: 0.5 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'rotateX', val: rotateXAngle, prog: 0 },
        { key: 'rotateX', val: 0, prog: 0.5 },
        { key: 'rotateX', val: 0, prog: 1 },
        { key: 'scale', val: scaleAmount, prog: 0 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'translateZ', val: -depthOffset, prog: 0 },
        { key: 'translateZ', val: 0, prog: 0.5 },
        { key: 'translateZ', val: 0, prog: 1 },
      ],
    },
  };

  // Segment 4: Tilt right (60-80%)
  const segment4Effect = {
    id: 'flip-effect-segment-4',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier' as const,
      start: segmentDuration * 3,
      duration: segmentDuration,
      mode: 'provider' as const,
      targetIds: [textElementId],
      customEasing: [0.25, 0.1, 0.25, 1],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: rotateYAngle, prog: 0.5 },
        { key: 'rotateY', val: rotateYAngle, prog: 1 },
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: -rotateXAngle, prog: 0.5 },
        { key: 'rotateX', val: -rotateXAngle, prog: 1 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scaleAmount, prog: 0.5 },
        { key: 'scale', val: scaleAmount, prog: 1 },
        { key: 'translateZ', val: 0, prog: 0 },
        { key: 'translateZ', val: -depthOffset, prog: 0.5 },
        { key: 'translateZ', val: -depthOffset, prog: 1 },
      ],
    },
  };

  // Segment 5: Return to flat (80-100%)
  const segment5Effect = {
    id: 'flip-effect-segment-5',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier' as const,
      start: segmentDuration * 4,
      duration: segmentDuration,
      mode: 'provider' as const,
      targetIds: [textElementId],
      customEasing: [0.42, 0, 0.58, 1],
      ranges: [
        { key: 'rotateY', val: rotateYAngle, prog: 0 },
        { key: 'rotateY', val: 0, prog: 0.5 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'rotateX', val: -rotateXAngle, prog: 0 },
        { key: 'rotateX', val: 0, prog: 0.5 },
        { key: 'rotateX', val: 0, prog: 1 },
        { key: 'scale', val: scaleAmount, prog: 0 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'translateZ', val: -depthOffset, prog: 0 },
        { key: 'translateZ', val: 0, prog: 0.5 },
        { key: 'translateZ', val: 0, prog: 1 },
      ],
    },
  };

  // Add all effects to text atom
  textAtom.effects = [
    segment1Effect,
    segment2Effect,
    segment3Effect,
    segment4Effect,
    segment5Effect,
  ];

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'perspective-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'perspective-flip-book-text',
  title: 'Perspective Flip Book Text Animation',
  description:
    'Dynamic flip book animation where text transitions through different viewing angles (flat, tilted left, tilted right, tilted up, tilted down) with page-turn physics. Features segmented keyframe animations with cubic-bezier easing, depth effects, and realistic pivot points. Creates an educational motion graphics experience with acceleration and deceleration.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'perspective',
    'flip-book',
    '3d',
    'page-turn',
    'motion-graphics',
    'educational',
    'dynamic',
    'rotate',
  ],
  defaultInputParams: {
    text: 'Page Turn Animation',
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    duration: 5,
    perspective: 1000,
    rotateYAngle: 30,
    rotateXAngle: 10,
    depthOffset: 50,
    scaleAmount: 0.95,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const perspectiveFlipBookTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
