/**
 * Typokinetics Wave Rider Preset
 *
 * A kinetic typography preset where text follows a smooth sine wave pattern across the screen.
 * Features liquid distortion effects, wave-synchronized rotation, dynamic letter-spacing compression,
 * shimmer effects at wave peaks, and vertical stretch animation. The word appears to be made of
 * flexible material responding to ocean wave forces as it undulates through 2 complete wave cycles.
 *
 * Features:
 * - Smooth sine wave motion (2 complete waves across screen width)
 * - Liquid distortion with skewY effect synchronized to wave phase
 * - Wave-derivative rotation (tilts more on steeper slopes)
 * - Dynamic letter-spacing (expands in troughs, contracts at peaks)
 * - Shimmer/brightness effect at wave peaks
 * - Vertical stretch/compression (scaleY oscillation)
 * - Organic cubic-bezier easing for natural wave motion
 * - Optional subtle hue-rotate for color shimmer
 *
 * Use Cases:
 * - Kinetic typography animations
 * - Wave-based text motion graphics
 * - Ocean/water-themed text effects
 * - Flexible material simulation
 * - Dynamic logo animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('WAVE RIDER')
    .describe('Text to display with wave motion'),
  duration: z
    .number()
    .min(5)
    .max(15)
    .default(7.5)
    .describe('Animation duration in seconds (7-8 seconds recommended)'),
  font: z
    .string()
    .optional()
    .default('Inter:500')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:500", "Roboto:700")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex format)'),
  backgroundColor: z
    .string()
    .default('#0a1628')
    .describe('Background color (hex format)'),
  waveAmplitude: z
    .number()
    .min(5)
    .max(25)
    .default(15)
    .describe('Wave amplitude as percentage of screen height (default: 15%)'),
  rotationRange: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Maximum rotation angle in degrees (default: 10deg)'),
  skewRange: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Maximum skew angle for liquid distortion (default: 5deg)'),
  letterSpacingMin: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Minimum letter-spacing in em at wave peaks (default: 0.05em)'),
  letterSpacingMax: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Maximum letter-spacing in em at wave troughs (default: 0.15em)'),
  shimmerIntensity: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.3)
    .describe('Brightness multiplier at wave peaks (default: 1.3 = 130%)'),
  scaleYMin: z
    .number()
    .min(0.8)
    .max(1)
    .default(0.95)
    .describe('Minimum vertical scale (compression, default: 0.95)'),
  scaleYMax: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .describe('Maximum vertical scale (stretch, default: 1.05)'),
  enableHueRotate: z
    .boolean()
    .default(false)
    .describe('Enable subtle hue-rotate color shimmer effect'),
  hueRotateRange: z
    .number()
    .min(0)
    .max(30)
    .default(15)
    .describe('Hue rotation range in degrees (default: 15deg)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration;
  const waveAmplitude = params.waveAmplitude;
  const rotationRange = params.rotationRange;
  const skewRange = params.skewRange;
  const letterSpacingMin = params.letterSpacingMin;
  const letterSpacingMax = params.letterSpacingMax;
  const shimmerIntensity = params.shimmerIntensity;
  const scaleYMin = params.scaleYMin;
  const scaleYMax = params.scaleYMax;
  const enableHueRotate = params.enableHueRotate;
  const hueRotateRange = params.hueRotateRange;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:500';
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

  const textAtomId = 'wave-text';

  // Calculate keyframes for sine wave motion (2 complete waves)
  // Wave follows: y = sin(4πt) * amplitude
  // We'll create keyframes at strategic points for smooth cubic-bezier interpolation

  const numKeyframes = 25; // More keyframes for smoother wave
  const waveRanges: any[] = [];

  for (let i = 0; i <= numKeyframes; i++) {
    const prog = i / numKeyframes; // 0 to 1
    const phase = prog * 2 * Math.PI * 2; // 4π total (2 complete waves)

    // Sine wave for vertical position
    const yOffset = Math.sin(phase) * waveAmplitude; // -amplitude to +amplitude

    // Cosine (derivative of sine) for rotation (steeper climb = more tilt)
    const derivative = Math.cos(phase); // -1 to 1
    const rotation = derivative * rotationRange; // -rotationRange to +rotationRange

    // Skew alternates with wave phase (in phase with sine)
    const skew = Math.sin(phase) * skewRange; // -skewRange to +skewRange

    // Letter-spacing inversely proportional to wave height
    // At peaks (y > 0), spacing is minimum; at troughs (y < 0), spacing is maximum
    const normalizedHeight = (yOffset + waveAmplitude) / (2 * waveAmplitude); // 0 to 1
    const letterSpacing =
      letterSpacingMax - normalizedHeight * (letterSpacingMax - letterSpacingMin);

    // Shimmer at peaks (when sin(phase) is near 1)
    const shimmer =
      1 + (Math.max(0, Math.sin(phase)) * (shimmerIntensity - 1));

    // ScaleY oscillates with wave phase
    const scaleY = scaleYMin + (Math.sin(phase) + 1) * 0.5 * (scaleYMax - scaleYMin);

    // Hue rotation (optional)
    const hueRotate = enableHueRotate
      ? Math.sin(phase) * hueRotateRange
      : 0;

    // Add keyframes
    waveRanges.push(
      { key: 'translateX', val: (prog - 0.5) * 200, prog }, // -100% to 100% (centered at 0.5)
      { key: 'translateY', val: yOffset, prog },
      { key: 'rotateZ', val: rotation, prog },
      { key: 'skewY', val: skew, prog },
      { key: 'letterSpacing', val: `${letterSpacing}em`, prog },
      { key: 'brightness', val: shimmer, prog },
      { key: 'scaleY', val: scaleY, prog },
    );

    if (enableHueRotate) {
      waveRanges.push({ key: 'hueRotate', val: hueRotate, prog });
    }
  }

  // Add subtle textShadow glow at peaks (combine with brightness)
  // We'll add textShadow to the initial style and let brightness amplify the effect

  const waveEffect: GenericEffectData = {
    type: 'linear', // Use linear for precise control; cubic-bezier applied at range level
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: waveRanges,
  };

  const effect = {
    id: 'wave-motion-effect',
    componentId: 'generic',
    data: waveEffect,
  };

  // Text atom data
  const textAtomData = {
    text: params.text,
    className: 'text-5xl font-medium',
    style: {
      color: params.textColor,
      whiteSpace: 'nowrap' as const,
      textShadow: '0 0 20px rgba(255, 255, 255, 0.3)', // Subtle glow
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight.toString()] }
        : { weights: ['500'] }),
    },
  };

  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [effect],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-wave-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
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
  id: 'typokinetics-wave-rider',
  title: 'Typokinetics Wave Rider',
  description:
    'A kinetic typography preset where text follows a smooth sine wave pattern across the screen, featuring liquid distortion effects, wave-synchronized rotation, dynamic letter-spacing compression, shimmer effects at wave peaks, and vertical stretch animation. The word appears to be made of flexible material responding to ocean wave forces as it undulates through 2 complete wave cycles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'wave',
    'motion',
    'animation',
    'distortion',
    'liquid',
    'ocean',
    'text-effects',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'WAVE RIDER',
    duration: 7.5,
    font: 'Inter:500',
    textColor: '#ffffff',
    backgroundColor: '#0a1628',
    waveAmplitude: 15,
    rotationRange: 10,
    skewRange: 5,
    letterSpacingMin: 0.05,
    letterSpacingMax: 0.15,
    shimmerIntensity: 1.3,
    scaleYMin: 0.95,
    scaleYMax: 1.05,
    enableHueRotate: false,
    hueRotateRange: 15,
  },
};

// Export preset
export const typokineticWaveRiderPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
