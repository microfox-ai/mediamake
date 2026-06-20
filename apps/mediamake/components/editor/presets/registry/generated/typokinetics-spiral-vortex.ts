/**
 * Typokinetics Spiral Vortex Preset
 *
 * A hypnotic typography preset where text spirals inward from the outer edge to the center
 * like water going down a drain. Features parametric spiral motion using polar coordinates
 * (3 complete rotations with 24 keyframes), simultaneous rotation for spinning motion,
 * scaling from 1.5x to 0.6x, accelerating rotation simulating angular momentum conservation,
 * hue-rotate color shift from cool to warm tones (0-180deg), motion blur effect that sharpens
 * at center, and a final hold with fade-out. Creates a mesmerizing vortex/whirlpool effect
 * perfect for dramatic title reveals or hypnotic transitions.
 *
 * Technical Features:
 * - Spiral motion: 24 keyframes with parametric equations (translateX = radius * cos(angle), translateY = radius * sin(angle))
 * - Radius: Decreases from 45% to 0% of viewport
 * - Angle: Increases from 0 to 1080deg (3 complete rotations)
 * - Simultaneous rotation: 0deg → 1080deg for spinning effect
 * - Scale: 1.5 → 0.6 as word spirals inward
 * - Non-linear easing: ease-out start, ease-in final approach
 * - Hue rotation: 0deg → 180deg (cool to warm tones)
 * - Blur: 0px → 3px → 0px (sharp focus at center)
 * - Final hold: 1 second at center with opacity fade (1 → 0) over last 0.5s
 *
 * Use Cases:
 * - Dramatic title reveals
 * - Hypnotic transitions
 * - Whirlpool/vortex effects
 * - Eye-catching text animations
 * - Music video typography
 * - Social media attention-grabbers
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  word: z.string().describe('The word or text to animate in spiral motion'),
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(80)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family (e.g., "Inter:600" for weight 600)'),
  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Initial text color (will shift via hue-rotate)'),
  spiralDuration: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Duration of spiral animation in seconds'),
  holdDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Duration to hold at center before fade-out in seconds'),
  fadeOutDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Duration of final fade-out in seconds'),
  rotations: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of complete spiral rotations'),
  startRadius: z
    .number()
    .min(30)
    .max(60)
    .default(45)
    .describe('Starting radius as percentage of viewport size'),
  endRadius: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe('Ending radius as percentage of viewport size'),
  startScale: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Starting scale multiplier'),
  endScale: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Ending scale multiplier'),
  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Maximum blur amount in pixels during motion'),
  hueRotateStart: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe('Starting hue rotation in degrees'),
  hueRotateEnd: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .describe('Ending hue rotation in degrees (cool to warm)'),
  backgroundColor: z
    .string()
    .optional()
    .default('#000000')
    .describe('Background color for the container'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(
    params.fontFamily || 'Inter',
  );

  // Calculate timing
  const totalDuration =
    params.spiralDuration + params.holdDuration + params.fadeOutDuration;
  const spiralEnd = params.spiralDuration;
  const holdEnd = spiralEnd + params.holdDuration;
  const fadeStart = holdEnd - params.fadeOutDuration;

  // Calculate keyframes for spiral motion
  const numKeyframes = 24; // 24 keyframes for smooth motion
  const angleStep = (params.rotations * 360) / numKeyframes;
  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;
  const viewportSize = Math.min(viewportWidth, viewportHeight);

  // Helper function to convert polar to cartesian
  const polarToCartesian = (
    radius: number,
    angle: number,
  ): { x: number; y: number } => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: radius * Math.cos(radians),
      y: radius * Math.sin(radians),
    };
  };

  // Generate keyframes
  const generateSpiralKeyframes = () => {
    const translateXRanges: Array<{ key: string; val: string; prog: number }> =
      [];
    const translateYRanges: Array<{ key: string; val: string; prog: number }> =
      [];
    const scaleRanges: Array<{ key: string; val: number; prog: number }> = [];
    const rotateRanges: Array<{ key: string; val: string; prog: number }> = [];
    const blurRanges: Array<{ key: string; val: string; prog: number }> = [];
    const hueRotateRanges: Array<{ key: string; val: string; prog: number }> =
      [];

    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const angle = angleStep * i;

      // Calculate radius (linear decrease)
      const radiusPercent =
        params.startRadius +
        (params.endRadius - params.startRadius) * progress;
      const radius = (radiusPercent / 100) * viewportSize;

      // Calculate position
      const position = polarToCartesian(radius, angle);

      // Calculate scale (linear decrease)
      const scale =
        params.startScale + (params.endScale - params.startScale) * progress;

      // Calculate rotation (same as angle for spinning effect)
      const rotation = angle;

      // Calculate blur (increase to max at midpoint, then decrease to 0)
      const blurProgress = Math.sin(progress * Math.PI); // 0 → 1 → 0
      const blur = params.maxBlur * blurProgress;

      // Calculate hue rotation (linear increase)
      const hueRotate =
        params.hueRotateStart +
        (params.hueRotateEnd - params.hueRotateStart) * progress;

      // Add keyframes
      translateXRanges.push({
        key: 'translateX',
        val: `${position.x}px`,
        prog: progress,
      });
      translateYRanges.push({
        key: 'translateY',
        val: `${position.y}px`,
        prog: progress,
      });
      scaleRanges.push({ key: 'scale', val: scale, prog: progress });
      rotateRanges.push({
        key: 'rotate',
        val: `${rotation}deg`,
        prog: progress,
      });
      blurRanges.push({
        key: 'filter',
        val: `blur(${blur}px)`,
        prog: progress,
      });
      hueRotateRanges.push({
        key: 'filter',
        val: `hue-rotate(${hueRotate}deg)`,
        prog: progress,
      });
    }

    return {
      translateXRanges,
      translateYRanges,
      scaleRanges,
      rotateRanges,
      blurRanges,
      hueRotateRanges,
    };
  };

  const {
    translateXRanges,
    translateYRanges,
    scaleRanges,
    rotateRanges,
    blurRanges,
    hueRotateRanges,
  } = generateSpiralKeyframes();

  // Component IDs
  const textId = 'spiral-text';

  // Create spiral motion effect (ease-out for initial spiral)
  const spiralEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.spiralDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      ...translateXRanges,
      ...translateYRanges,
      ...scaleRanges,
      ...rotateRanges,
    ],
  };

  // Create blur effect (separate for better control)
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.spiralDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: blurRanges,
  };

  // Create hue rotation effect
  const hueRotateEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.spiralDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: hueRotateRanges,
  };

  // Create fade-out effect
  const fadeOutEffect: GenericEffectData = {
    type: 'ease-in',
    start: fadeStart,
    duration: params.fadeOutDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Build text component
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.word,
      className: 'text-5xl font-semibold',
      style: {
        position: 'absolute',
        color: params.textColor,
        fontSize: params.fontSize,
        willChange: 'transform, filter, opacity',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['600'],
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
        id: 'spiral-motion',
        componentId: 'generic',
        data: spiralEffect,
      },
      {
        id: 'blur-motion',
        componentId: 'generic',
        data: blurEffect,
      },
      {
        id: 'hue-rotate',
        componentId: 'generic',
        data: hueRotateEffect,
      },
      {
        id: 'fade-out',
        componentId: 'generic',
        data: fadeOutEffect,
      },
    ],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-spiral-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
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
    childrenData: [textComponent],
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
  id: 'typokinetics-spiral-vortex',
  title: 'Typokinetics Spiral Vortex',
  description:
    'A hypnotic typography preset where text spirals inward from the outer edge to the center like water going down a drain. Features parametric spiral motion (3 rotations, 24 keyframes), scaling from 1.5x to 0.6x, accelerating rotation simulating angular momentum, hue-rotate color shift from cool to warm tones (0-180deg), motion blur effect that sharpens at center, and a final hold with fade-out. Creates a mesmerizing vortex/whirlpool effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'spiral',
    'vortex',
    'whirlpool',
    'hypnotic',
    'rotation',
    'dramatic',
    'title',
    'reveal',
  ],
  defaultInputParams: {
    word: 'VORTEX',
    fontSize: 80,
    fontFamily: 'Inter:600',
    textColor: '#FFFFFF',
    spiralDuration: 5,
    holdDuration: 1,
    fadeOutDuration: 0.5,
    rotations: 3,
    startRadius: 45,
    endRadius: 0,
    startScale: 1.5,
    endScale: 0.6,
    maxBlur: 3,
    hueRotateStart: 0,
    hueRotateEnd: 180,
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
