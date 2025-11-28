/**
 * Orbital Text Animation Preset
 *
 * This preset creates a 3D orbital text animation where words rotate around an invisible sphere
 * before settling into a readable position. Text travels along a 3D arc path as if attached to
 * a spinning globe, with motion blur during fastest rotation and zoom scaling effects.
 *
 * Features:
 * - **3D Orbital Path**: Text rotates through 3D space using rotateY, translateZ, and translateY transforms
 * - **Motion Blur**: Trailing blur effect during fastest rotation (peaks at 40% duration)
 * - **Zoom Effect**: Scales from 0.7 → 1.2 → 1.0 with ease-in-out timing
 * - **Continuous Drift**: Subtle oscillating rotation after main animation (infinite loop)
 * - **Planetary Motion**: Smooth deceleration with cubic-bezier easing
 * - **3D Perspective**: Container uses perspective: 1200px for depth effect
 * - **Multi-line Support**: Optional staggered delays for multiple text lines orbiting at different speeds
 *
 * Use cases:
 * - Creating cinematic title sequences with 3D motion
 * - Adding planetary-style text reveals
 * - Building space-themed or sci-fi intro animations
 * - Creating dynamic text presentations with depth
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  TextAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display in the orbital animation'),
  duration: z
    .number()
    .min(3)
    .default(7)
    .describe(
      'Total duration of the animation in seconds (minimum 3s for proper orbital motion)',
    ),
  orbitDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe(
      'Duration of the main orbital rotation phase in seconds (before drift)',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "normal")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or CSS color name)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  rotationStart: z
    .number()
    .default(180)
    .describe('Starting rotation angle in degrees (default 180 = behind viewer)'),
  rotationEnd: z
    .number()
    .default(0)
    .describe('Ending rotation angle in degrees (default 0 = facing viewer)'),
  depthStart: z
    .number()
    .default(-200)
    .describe('Starting Z-axis depth in pixels (negative = away from viewer)'),
  depthEnd: z
    .number()
    .default(0)
    .describe('Ending Z-axis depth in pixels (0 = at viewer plane)'),
  heightStart: z
    .number()
    .default(-50)
    .describe('Starting Y-axis position in pixels (negative = above center)'),
  heightEnd: z
    .number()
    .default(0)
    .describe('Ending Y-axis position in pixels (0 = centered)'),
  scaleMin: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.7)
    .describe('Minimum scale value at animation start'),
  scaleMax: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.2)
    .describe('Maximum scale value at 60% of animation'),
  scaleFinal: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Final scale value at animation end'),
  blurMax: z
    .number()
    .min(0)
    .max(20)
    .default(3)
    .describe('Maximum blur amount in pixels during fastest rotation'),
  blurPeak: z
    .number()
    .min(0.1)
    .max(0.9)
    .default(0.4)
    .describe('Progress point (0-1) when blur reaches maximum (default 0.4 = 40%)'),
  driftAmount: z
    .number()
    .min(0)
    .max(45)
    .default(5)
    .describe('Drift rotation angle in degrees for post-animation oscillation'),
  driftDuration: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Duration of one complete drift cycle in seconds'),
  perspective: z
    .number()
    .min(500)
    .max(3000)
    .default(1200)
    .describe('3D perspective distance in pixels (affects depth intensity)'),
  enableDrift: z
    .boolean()
    .default(true)
    .describe('Enable continuous drift animation after main orbital motion'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const textAtomId = 'orbital-text';
  const containerId = 'orbital-container';

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Create orbital rotation effect
  const orbitalRotationEffect: GenericEffectData = {
    type: 'cubic-bezier',
    customBezier: [0.4, 0, 0.2, 1], // Smooth deceleration curve
    start: 0,
    duration: params.orbitDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'rotateY', val: params.rotationStart, prog: 0 },
      { key: 'rotateY', val: params.rotationEnd, prog: 1 },
      { key: 'translateZ', val: params.depthStart, prog: 0 },
      { key: 'translateZ', val: params.depthEnd, prog: 1 },
      { key: 'translateY', val: params.heightStart, prog: 0 },
      { key: 'translateY', val: params.heightEnd, prog: 1 },
    ],
  };

  // Create scale/zoom effect
  const scaleEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.orbitDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scale', val: params.scaleMin, prog: 0 },
      { key: 'scale', val: params.scaleMax, prog: 0.6 },
      { key: 'scale', val: params.scaleFinal, prog: 1 },
    ],
  };

  // Create motion blur effect
  const motionBlurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.orbitDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'blur', val: 0, prog: 0 },
      { key: 'blur', val: params.blurMax, prog: params.blurPeak },
      { key: 'blur', val: 0, prog: 1 },
    ],
  };

  // Create continuous drift effect (optional)
  const effects: any[] = [
    {
      id: 'orbital-rotation-effect',
      componentId: 'generic',
      data: orbitalRotationEffect,
    },
    {
      id: 'orbital-scale-effect',
      componentId: 'generic',
      data: scaleEffect,
    },
    {
      id: 'motion-blur-effect',
      componentId: 'generic',
      data: motionBlurEffect,
    },
  ];

  if (params.enableDrift) {
    const driftEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: params.orbitDuration,
      duration: params.driftDuration,
      mode: 'provider',
      targetIds: [textAtomId],
      loop: true,
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: params.driftAmount, prog: 0.5 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: 'continuous-drift-effect',
      componentId: 'generic',
      data: driftEffect,
    });
  }

  // Create text atom with 3D properties
  const textAtomData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: `${params.fontSize}px`,
      fontWeight: fontStyle.fontWeight || params.fontWeight,
      color: params.textColor,
      backfaceVisibility: 'hidden',
      transformStyle: 'preserve-3d',
      ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
    },
    font: {
      family: fontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight.toString()] }
        : {}),
    },
  };

  const textAtom = {
    id: textAtomId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects,
  };

  // Create container with perspective
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center h-screen',
        style: {
          perspective: `${params.perspective}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
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
  id: 'orbital-text-animation',
  title: 'Orbital Text Animation',
  description:
    '3D orbital text animation where words rotate around an invisible sphere before settling into readable position. Features planetary motion with rotateY, translateZ, and translateY transforms, motion blur during fastest rotation, zoom scaling effect, and subtle continuous drift after main animation completes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    '3d',
    'orbital',
    'rotation',
    'planetary',
    'cinematic',
    'sphere',
    'depth',
    'motion-blur',
    'zoom',
    'drift',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ORBITAL MOTION',
    duration: 7,
    orbitDuration: 3,
    fontSize: 64,
    fontWeight: 'bold',
    textColor: '#ffffff',
    font: 'Inter:700',
    rotationStart: 180,
    rotationEnd: 0,
    depthStart: -200,
    depthEnd: 0,
    heightStart: -50,
    heightEnd: 0,
    scaleMin: 0.7,
    scaleMax: 1.2,
    scaleFinal: 1.0,
    blurMax: 3,
    blurPeak: 0.4,
    driftAmount: 5,
    driftDuration: 4,
    perspective: 1200,
    enableDrift: true,
  },
};

// Export preset
export const orbitalTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
