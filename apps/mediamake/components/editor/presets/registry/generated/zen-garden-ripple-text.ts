/**
 * Zen Garden Water Ripple Text Preset
 *
 * This preset creates text elements that float in a zen garden water ripple pattern.
 * Text behaves like lily pads on a pond surface with gentle bobbing, spiral drift
 * following concentric ripple effects, and peaceful fade transitions.
 *
 * Features:
 * - **Water Ripple Motion**: Text drifts in spiral patterns emanating from center
 * - **Vertical Bobbing**: Subtle undulation simulating water surface tension
 * - **Rotation Following Ripples**: Text rotates to follow spiral tangent angle
 * - **Peaceful Fade Effects**: Gradual fade in/out like morning mist and evening fog
 * - **Synchronized Pulsing**: Brief brightness boost simulating water droplets
 * - **Concentric Positioning**: Text elements positioned in polar coordinates
 *
 * Use cases:
 * - Creating zen/meditation content with floating text
 * - Peaceful nature-themed presentations
 * - Calm, relaxing social media content
 * - Meditative title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  texts: z
    .array(z.string())
    .default(['Zen', 'Peace', 'Harmony', 'Balance', 'Flow'])
    .describe('Array of text strings to display as lily pads'),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Total duration of the ripple animation in seconds'),
  fontSize: z
    .number()
    .min(16)
    .max(128)
    .default(32)
    .describe('Font size for text elements in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text (CSS color value)'),
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Roboto:600:italic")',
    ),
  maxRadius: z
    .number()
    .min(100)
    .max(800)
    .default(400)
    .describe('Maximum radial expansion distance in pixels'),
  bobbingAmplitude: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Vertical bobbing amplitude in pixels'),
  rotationRange: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .describe('Maximum rotation angle in degrees'),
  fadeInDuration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Fade in duration in seconds'),
  fadeOutDuration: z
    .number()
    .min(0.5)
    .max(10)
    .default(4)
    .describe('Fade out duration in seconds'),
  pulseInterval: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Interval between synchronized pulses in seconds'),
  pulseIntensity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Opacity boost during pulse (0 = no pulse, 0.5 = max)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    texts,
    duration,
    fontSize,
    textColor,
    font,
    maxRadius,
    bobbingAmplitude,
    rotationRange,
    fadeInDuration,
    fadeOutDuration,
    pulseInterval,
    pulseIntensity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
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

  // Helper: Convert polar coordinates to cartesian with centering
  const polarToCartesian = (
    radius: number,
    angle: number,
  ): { x: number; y: number } => {
    const x = radius * Math.cos((angle * Math.PI) / 180);
    const y = radius * Math.sin((angle * Math.PI) / 180);
    return { x, y };
  };

  // Helper: Create ripple motion effect (radial expansion + spiral rotation)
  const createRippleMotionEffect = (
    elementId: string,
    startAngle: number,
    startRadius: number,
  ): GenericEffectData => {
    const endAngle = startAngle + 360; // One full rotation
    const endRadius = maxRadius;

    // Calculate positions at key progress points
    const startPos = polarToCartesian(startRadius, startAngle);
    const midPos = polarToCartesian(
      (startRadius + endRadius) / 2,
      (startAngle + endAngle) / 2,
    );
    const endPos = polarToCartesian(endRadius, endAngle);

    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [elementId],
      ranges: [
        { key: 'translateX', val: startPos.x, prog: 0 },
        { key: 'translateX', val: midPos.x, prog: 0.5 },
        { key: 'translateX', val: endPos.x, prog: 1 },
        { key: 'translateY', val: startPos.y, prog: 0 },
        { key: 'translateY', val: midPos.y, prog: 0.5 },
        { key: 'translateY', val: endPos.y, prog: 1 },
      ],
    };
  };

  // Helper: Create vertical bobbing effect (sine wave)
  const createBobbingEffect = (
    elementId: string,
    phaseOffset: number,
  ): GenericEffectData => {
    // Create sine wave motion with phase offset
    const points = 20; // Number of keyframes for smooth sine wave
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= points; i++) {
      const prog = i / points;
      const angle = prog * Math.PI * 4 + phaseOffset; // 2 full cycles over duration
      const yOffset = Math.sin(angle) * bobbingAmplitude;
      ranges.push({ key: 'translateY', val: yOffset, prog });
    }

    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [elementId],
      ranges,
    };
  };

  // Helper: Create rotation effect following spiral tangent
  const createRotationEffect = (
    elementId: string,
    startAngle: number,
  ): GenericEffectData => {
    // Rotation follows the tangent of the spiral path
    const endAngle = startAngle + 360;
    const tangentStart = startAngle + 90; // Tangent is perpendicular to radial
    const tangentEnd = endAngle + 90;

    // Normalize rotation to range
    const normalizeAngle = (angle: number) => {
      const normalized = ((angle % 360) + 360) % 360;
      return normalized > 180 ? normalized - 360 : normalized;
    };

    const startRot =
      (normalizeAngle(tangentStart) / 180) * rotationRange - rotationRange / 2;
    const midRot =
      (normalizeAngle((tangentStart + tangentEnd) / 2) / 180) * rotationRange -
      rotationRange / 2;
    const endRot =
      (normalizeAngle(tangentEnd) / 180) * rotationRange - rotationRange / 2;

    return {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [elementId],
      ranges: [
        { key: 'rotate', val: startRot, prog: 0 },
        { key: 'rotate', val: midRot, prog: 0.5 },
        { key: 'rotate', val: endRot, prog: 1 },
      ],
    };
  };

  // Helper: Create fade in effect
  const createFadeInEffect = (elementId: string): GenericEffectData => {
    return {
      type: 'ease-out',
      start: 0,
      duration: fadeInDuration,
      mode: 'provider',
      targetIds: [elementId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.9, prog: 1 },
      ],
    };
  };

  // Helper: Create fade out effect
  const createFadeOutEffect = (elementId: string): GenericEffectData => {
    return {
      type: 'ease-in',
      start: duration - fadeOutDuration,
      duration: fadeOutDuration,
      mode: 'provider',
      targetIds: [elementId],
      ranges: [
        { key: 'opacity', val: 0.9, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // Helper: Create synchronized pulse effect
  const createPulseEffect = (elementId: string): GenericEffectData => {
    const pulseCount = Math.floor(duration / pulseInterval);
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= pulseCount; i++) {
      const pulseTime = i * pulseInterval;
      const progBefore = Math.max(0, (pulseTime - 0.1) / duration);
      const progPeak = pulseTime / duration;
      const progAfter = Math.min(1, (pulseTime + 0.1) / duration);

      if (progBefore >= 0 && progBefore <= 1) {
        ranges.push({ key: 'opacity', val: 0.9, prog: progBefore });
      }
      if (progPeak >= 0 && progPeak <= 1) {
        ranges.push({ key: 'opacity', val: 0.9 + pulseIntensity, prog: progPeak });
      }
      if (progAfter >= 0 && progAfter <= 1) {
        ranges.push({ key: 'opacity', val: 0.9, prog: progAfter });
      }
    }

    // Ensure start and end points
    if (ranges.length === 0 || ranges[0].prog > 0) {
      ranges.unshift({ key: 'opacity', val: 0.9, prog: 0 });
    }
    if (ranges[ranges.length - 1].prog < 1) {
      ranges.push({ key: 'opacity', val: 0.9, prog: 1 });
    }

    return {
      type: 'linear',
      start: fadeInDuration, // Start after fade in
      duration: duration - fadeInDuration - fadeOutDuration,
      mode: 'provider',
      targetIds: [elementId],
      ranges,
    };
  };

  // Create text elements positioned in concentric circles
  const textElements: RenderableComponentData[] = texts.map((text, index) => {
    const elementId = `zen-text-${index}`;

    // Calculate initial position in polar coordinates
    const angleStep = 360 / texts.length;
    const startAngle = index * angleStep;
    const startRadius = 50 + (index * 50) % 200; // Stagger starting radii

    // Calculate phase offset for bobbing based on initial position
    const phaseOffset = (index / texts.length) * Math.PI * 2;

    // Create all effects for this text element
    const effects = [
      {
        id: `${elementId}-ripple`,
        componentId: 'generic',
        data: createRippleMotionEffect(elementId, startAngle, startRadius),
      },
      {
        id: `${elementId}-bobbing`,
        componentId: 'generic',
        data: createBobbingEffect(elementId, phaseOffset),
      },
      {
        id: `${elementId}-rotation`,
        componentId: 'generic',
        data: createRotationEffect(elementId, startAngle),
      },
      {
        id: `${elementId}-fade-in`,
        componentId: 'generic',
        data: createFadeInEffect(elementId),
      },
      {
        id: `${elementId}-fade-out`,
        componentId: 'generic',
        data: createFadeOutEffect(elementId),
      },
    ];

    // Add pulse effect if intensity > 0
    if (pulseIntensity > 0) {
      effects.push({
        id: `${elementId}-pulse`,
        componentId: 'generic',
        data: createPulseEffect(elementId),
      });
    }

    return {
      id: elementId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transformOrigin: 'center',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['400'],
          subsets: ['latin'],
          display: 'swap' as const,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects,
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'zen-garden-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textElements,
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
  id: 'zen-garden-ripple-text',
  title: 'Zen Garden Water Ripple Text',
  description:
    'Text elements that float in a zen garden water ripple pattern. Text behaves like lily pads on a pond surface with gentle bobbing, spiral drift following concentric ripple effects, and peaceful fade transitions. Features synchronized pulsing that simulates water droplets hitting the surface.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'zen',
    'water',
    'ripple',
    'float',
    'peaceful',
    'meditation',
    'spiral',
    'bobbing',
    'fade',
    'pulse',
    'nature',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: ['Zen', 'Peace', 'Harmony', 'Balance', 'Flow'],
    duration: 20,
    fontSize: 32,
    textColor: '#ffffff',
    font: 'Inter',
    maxRadius: 400,
    bobbingAmplitude: 5,
    rotationRange: 15,
    fadeInDuration: 3,
    fadeOutDuration: 4,
    pulseInterval: 5,
    pulseIntensity: 0.1,
  },
};

// Export preset
export const zenGardenRippleTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
