/**
 * Wind Tunnel Typokinetics Preset
 *
 * Creates a dynamic typokinetics effect simulating text floating through a wind tunnel
 * with aerodynamic drift, turbulence, and particle-like physics. Text elements enter
 * from edges, get caught in circular wind patterns, spiral through 3D space with
 * multi-axis rotation, and exit with natural motion blur.
 *
 * Features:
 * - **3D Spatial Movement**: translateX/Y/Z for realistic depth and position changes
 * - **Multi-axis Rotation**: rotateX/Y/Z tumbling effect simulating air currents
 * - **Velocity-based Motion Blur**: Dynamic blur calculated from movement speed
 * - **Spiral Path Animation**: Parametric equations for circular wind patterns
 * - **Scale Variation**: Size changes suggesting movement toward/away from viewer
 * - **Opacity Modulation**: Simulates density changes in air currents
 * - **Turbulence Intensity**: Uses impact scores from caption metadata for effect strength
 * - **Staggered Entry/Exit**: Continuous flow effect with varied timings
 *
 * Use cases:
 * - High-energy tech videos and product launches
 * - Dynamic title sequences and motion graphics
 * - Music video lyrics with kinetic energy
 * - Social media content with attention-grabbing motion
 * - Brand videos requiring modern, energetic typography
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
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
        words: z.array(z.any()).optional(),
        metadata: z
          .object({
            impact: z
              .number()
              .min(0.1)
              .max(3.0)
              .optional()
              .describe('Effect intensity multiplier for this caption'),
          })
          .passthrough()
          .optional(),
      }),
    )
    .min(1)
    .describe('Array of caption objects with text, timing, and optional metadata'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),

  textShadow: z
    .string()
    .optional()
    .default('0 0 20px rgba(255,255,255,0.5)')
    .describe('Text shadow for glow effect'),

  turbulenceIntensity: z
    .number()
    .min(0.1)
    .max(2.0)
    .default(1.0)
    .describe('Global turbulence intensity multiplier'),

  duration: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('Base duration for each text element animation (seconds)'),

  staggerDelay: z
    .number()
    .min(0)
    .max(5)
    .default(0.5)
    .describe('Delay between each text element entry (seconds)'),

  motionBlurIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .describe('Maximum blur amount in pixels during rapid movements'),

  depthRange: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe('Range of Z-axis movement in pixels (depth effect)'),

  scaleMin: z
    .number()
    .min(0.5)
    .max(1.0)
    .default(0.8)
    .describe('Minimum scale value (distance effect)'),

  scaleMax: z
    .number()
    .min(1.0)
    .max(2.0)
    .default(1.3)
    .describe('Maximum scale value (distance effect)'),

  rotationMultiplier: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Multiplier for rotation speeds on all axes'),

  opacityMin: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum opacity (air density simulation)'),

  spiralIntensity: z
    .number()
    .min(50)
    .max(500)
    .default(150)
    .describe('Radius of circular wind patterns in pixels'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? fontParts[1] : '700';
  const fontStyle = fontParts.length > 2 ? fontParts[2] : 'normal';

  // Helper: Create wind tunnel effect for a text element
  const createWindTunnelEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    index: number,
    impact: number,
  ): GenericEffectData => {
    // Vary animation parameters based on index for unique paths
    const pathVariant = index % 3;
    const directionMultiplier = index % 2 === 0 ? 1 : -1;

    // Calculate turbulence-adjusted values
    const intensityMultiplier = impact * params.turbulenceIntensity;
    const spiralRadius = params.spiralIntensity * intensityMultiplier;
    const depthVariation = params.depthRange * intensityMultiplier;
    const blurMax = params.motionBlurIntensity * intensityMultiplier;

    // Define keyframe ranges for complex wind tunnel path
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    // TranslateX - Spiral horizontal movement
    if (pathVariant === 0) {
      ranges.push(
        { key: 'translateX', val: -400 * directionMultiplier, prog: 0 },
        { key: 'translateX', val: spiralRadius * directionMultiplier, prog: 0.25 },
        { key: 'translateX', val: -spiralRadius * directionMultiplier, prog: 0.5 },
        { key: 'translateX', val: spiralRadius * 0.5 * directionMultiplier, prog: 0.75 },
        { key: 'translateX', val: 500 * directionMultiplier, prog: 1 },
      );
    } else if (pathVariant === 1) {
      ranges.push(
        { key: 'translateX', val: 450 * directionMultiplier, prog: 0 },
        { key: 'translateX', val: -spiralRadius * 0.8 * directionMultiplier, prog: 0.3 },
        { key: 'translateX', val: spiralRadius * 0.6 * directionMultiplier, prog: 0.6 },
        { key: 'translateX', val: -550 * directionMultiplier, prog: 1 },
      );
    } else {
      ranges.push(
        { key: 'translateX', val: -350 * directionMultiplier, prog: 0 },
        { key: 'translateX', val: spiralRadius * directionMultiplier, prog: 0.2 },
        { key: 'translateX', val: -spiralRadius * 0.7 * directionMultiplier, prog: 0.5 },
        { key: 'translateX', val: spiralRadius * 0.4 * directionMultiplier, prog: 0.8 },
        { key: 'translateX', val: 450 * directionMultiplier, prog: 1 },
      );
    }

    // TranslateY - Vertical turbulence
    if (pathVariant === 0) {
      ranges.push(
        { key: 'translateY', val: -100 * intensityMultiplier, prog: 0 },
        { key: 'translateY', val: 200 * intensityMultiplier, prog: 0.35 },
        { key: 'translateY', val: -150 * intensityMultiplier, prog: 0.65 },
        { key: 'translateY', val: 100 * intensityMultiplier, prog: 1 },
      );
    } else if (pathVariant === 1) {
      ranges.push(
        { key: 'translateY', val: 150 * intensityMultiplier, prog: 0 },
        { key: 'translateY', val: -180 * intensityMultiplier, prog: 0.4 },
        { key: 'translateY', val: 120 * intensityMultiplier, prog: 0.7 },
        { key: 'translateY', val: -80 * intensityMultiplier, prog: 1 },
      );
    } else {
      ranges.push(
        { key: 'translateY', val: 180 * intensityMultiplier, prog: 0 },
        { key: 'translateY', val: -200 * intensityMultiplier, prog: 0.3 },
        { key: 'translateY', val: 100 * intensityMultiplier, prog: 0.6 },
        { key: 'translateY', val: -120 * intensityMultiplier, prog: 1 },
      );
    }

    // TranslateZ - Depth movement
    ranges.push(
      { key: 'translateZ', val: -depthVariation * 0.75, prog: 0 },
      { key: 'translateZ', val: depthVariation, prog: 0.4 },
      { key: 'translateZ', val: -depthVariation * 0.5, prog: 0.7 },
      { key: 'translateZ', val: depthVariation * 0.5, prog: 1 },
    );

    // Scale - Distance effect
    ranges.push(
      { key: 'scale', val: params.scaleMin, prog: 0 },
      { key: 'scale', val: params.scaleMax, prog: 0.4 },
      { key: 'scale', val: (params.scaleMin + params.scaleMax) / 2, prog: 0.7 },
      { key: 'scale', val: params.scaleMax * 0.9, prog: 1 },
    );

    // RotateX - Tumbling around X-axis
    const rotateXMax = 720 * params.rotationMultiplier;
    ranges.push(
      { key: 'rotateX', val: 0, prog: 0 },
      { key: 'rotateX', val: rotateXMax * 0.4, prog: 0.5 },
      { key: 'rotateX', val: rotateXMax, prog: 1 },
    );

    // RotateY - Tumbling around Y-axis
    const rotateYMax = 540 * params.rotationMultiplier;
    ranges.push(
      { key: 'rotateY', val: 0, prog: 0 },
      { key: 'rotateY', val: rotateYMax * 0.5, prog: 0.5 },
      { key: 'rotateY', val: rotateYMax, prog: 1 },
    );

    // RotateZ - Spinning around Z-axis
    const rotateZMax = 360 * params.rotationMultiplier;
    ranges.push(
      { key: 'rotateZ', val: 0, prog: 0 },
      { key: 'rotateZ', val: rotateZMax * 0.5, prog: 0.4 },
      { key: 'rotateZ', val: rotateZMax, prog: 1 },
    );

    // Motion Blur - Based on velocity (simulated by progress changes)
    if (pathVariant === 0) {
      ranges.push(
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: blurMax, prog: 0.25 },
        { key: 'blur', val: 0, prog: 0.5 },
        { key: 'blur', val: blurMax * 0.7, prog: 0.75 },
        { key: 'blur', val: 0, prog: 1 },
      );
    } else if (pathVariant === 1) {
      ranges.push(
        { key: 'blur', val: blurMax * 0.3, prog: 0 },
        { key: 'blur', val: blurMax, prog: 0.2 },
        { key: 'blur', val: 0, prog: 0.45 },
        { key: 'blur', val: blurMax * 0.8, prog: 0.7 },
        { key: 'blur', val: 0, prog: 1 },
      );
    } else {
      ranges.push(
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: blurMax * 0.8, prog: 0.15 },
        { key: 'blur', val: 0, prog: 0.4 },
        { key: 'blur', val: blurMax, prog: 0.6 },
        { key: 'blur', val: 0, prog: 0.85 },
        { key: 'blur', val: blurMax * 0.3, prog: 1 },
      );
    }

    // Opacity - Air density simulation
    ranges.push(
      { key: 'opacity', val: params.opacityMin, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: params.opacityMin + 0.1, prog: 0.6 },
      { key: 'opacity', val: 1, prog: 1 },
    );

    return {
      type: 'cubic-bezier',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Build composition
  const childrenData: RenderableComponentData[] = [];

  // Calculate total scene duration
  const lastCaption = captions[captions.length - 1];
  const totalDuration =
    lastCaption.absoluteStart +
    params.duration +
    params.staggerDelay * captions.length;

  // Create text elements for each caption
  captions.forEach((caption, index) => {
    const textId = `wind-text-${index}`;
    const effectId = `wind-effect-${index}`;

    // Get impact from caption metadata or use default
    const impact = caption.metadata?.impact ?? 1.0;

    // Calculate staggered entry time
    const entryTime = caption.absoluteStart + index * params.staggerDelay;

    // Vary duration slightly per caption
    const durationVariation = 0.5 + (index % 3) * 0.25; // 0.5 to 1.0
    const captionDuration = params.duration * durationVariation;

    // Create text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: caption.text,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight,
          fontStyle: fontStyle as any,
          color: params.textColor,
          textShadow: params.textShadow,
          textAlign: 'center',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: entryTime,
          duration: captionDuration,
        },
      },
      effects: [
        {
          id: effectId,
          componentId: 'generic',
          data: createWindTunnelEffect(
            textId,
            0, // Effect starts when text appears (relative to text timing)
            captionDuration,
            index,
            impact,
          ),
        },
      ],
    };

    childrenData.push(textAtom);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'wind-tunnel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
          perspective: '1000px', // Enable 3D perspective
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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
  id: 'windTunnelTypokinetics',
  title: 'Wind Tunnel Typokinetics',
  description:
    'Advanced typokinetics preset simulating text floating through a wind tunnel with aerodynamic drift, turbulence effects, and particle-like physics. Text elements enter from edges, get caught in circular wind patterns, spiral through 3D space with multi-axis rotation, and exit with natural motion blur. Features parametric spiral paths, velocity-based blur calculations, depth movement (translateZ), and dynamic opacity for air density simulation. Perfect for high-energy tech videos, motion graphics, and dynamic title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'wind-tunnel',
    'turbulence',
    'aerodynamic',
    '3d',
    'spiral',
    'motion-blur',
    'particle-physics',
    'dynamic',
    'high-energy',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'DYNAMIC',
        start: 0,
        absoluteStart: 0,
        end: 2,
        absoluteEnd: 2,
        duration: 2,
        words: [],
      },
      {
        id: 'caption-2',
        text: 'MOTION',
        start: 0,
        absoluteStart: 2.5,
        end: 2,
        absoluteEnd: 4.5,
        duration: 2,
        words: [],
      },
      {
        id: 'caption-3',
        text: 'FLOW',
        start: 0,
        absoluteStart: 5,
        end: 2,
        absoluteEnd: 7,
        duration: 2,
        words: [],
      },
    ],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    textShadow: '0 0 20px rgba(255,255,255,0.5)',
    turbulenceIntensity: 1.0,
    duration: 6,
    staggerDelay: 0.5,
    motionBlurIntensity: 3,
    depthRange: 200,
    scaleMin: 0.8,
    scaleMax: 1.3,
    rotationMultiplier: 1.0,
    opacityMin: 0.7,
    spiralIntensity: 150,
  },
};

// Export preset
export const windTunnelTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
