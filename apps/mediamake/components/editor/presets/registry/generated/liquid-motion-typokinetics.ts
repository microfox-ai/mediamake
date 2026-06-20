/**
 * Liquid Motion Typokinetics Preset
 *
 * Creates a dreamy, ethereal typography effect where text lines flow past each other
 * like streams of water caught in opposing currents. Features wave-like undulation,
 * fluid sine wave motion, and turbulence effects at intersection points with scale
 * and blur variations.
 *
 * Features:
 * - Multiple text streams flowing in opposing directions (left-to-right and right-to-left)
 * - Sine wave undulation creating organic, water-like motion
 * - Turbulence effects at crossing points with scale and blur variations
 * - Customizable text colors, fonts, and flow speeds
 * - Spring easing for organic, fluid feel
 * - Perfect for artistic, emotional, or atmospheric content
 *
 * Use cases:
 * - Artistic video intros/outros
 * - Emotional content overlays
 * - Music video typography
 * - Dreamy, ethereal presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  // Stream text content
  streamText1: z
    .string()
    .default('flowing waters')
    .describe('Text for stream 1 (left-to-right)'),
  streamText2: z
    .string()
    .default('liquid dreams')
    .describe('Text for stream 2 (right-to-left)'),
  streamText3: z
    .string()
    .default('ethereal currents')
    .describe('Text for stream 3 (left-to-right)'),
  streamText4: z
    .string()
    .default('fluid motion')
    .describe('Text for stream 4 (right-to-left)'),
  streamText5: z
    .string()
    .default('streaming light')
    .describe('Text for stream 5 (left-to-right)'),
  streamText6: z
    .string()
    .default('drifting waves')
    .describe('Text for stream 6 (right-to-left)'),

  // Timing
  duration: z.number().default(10).describe('Total duration in seconds'),

  // Colors and styling
  backgroundColor: z
    .string()
    .default('#0a0a1a')
    .describe('Background color (CSS color value)'),
  textColor1: z
    .string()
    .default('#ffffff')
    .describe('Color for stream 1 (CSS color value)'),
  textColor2: z
    .string()
    .default('#e0f0ff')
    .describe('Color for stream 2 (CSS color value)'),
  textColor3: z
    .string()
    .default('#c0e8ff')
    .describe('Color for stream 3 (CSS color value)'),

  // Font
  font: z
    .string()
    .default('Inter:600')
    .describe(
      'Font family with optional weight (e.g., "Inter:600", "Roboto:700")',
    ),

  // Motion parameters
  waveAmplitude: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Amplitude of wave motion in pixels'),
  flowSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for text flow'),
  turbulenceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of turbulence effects at intersection points'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:600';
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

  // Calculate adjusted duration based on flow speed
  const adjustedDuration = params.duration / params.flowSpeed;

  // Create text streams with opposing flows
  const streams = [
    {
      id: 'stream-left-1',
      text: params.streamText1,
      direction: 'left-to-right',
      top: '15%',
      fontSize: 48,
      color: params.textColor1,
      fontWeight: 600,
      wavePhase: 0,
    },
    {
      id: 'stream-right-1',
      text: params.streamText2,
      direction: 'right-to-left',
      top: '35%',
      fontSize: 56,
      color: params.textColor2,
      fontWeight: 700,
      wavePhase: 0.25,
    },
    {
      id: 'stream-left-2',
      text: params.streamText3,
      direction: 'left-to-right',
      top: '50%',
      fontSize: 40,
      color: params.textColor3,
      fontWeight: 500,
      wavePhase: 0.5,
    },
    {
      id: 'stream-right-2',
      text: params.streamText4,
      direction: 'right-to-left',
      top: '65%',
      fontSize: 52,
      color: params.textColor1,
      fontWeight: 600,
      wavePhase: 0.75,
    },
    {
      id: 'stream-left-3',
      text: params.streamText5,
      direction: 'left-to-right',
      top: '80%',
      fontSize: 44,
      color: params.textColor3,
      fontWeight: 500,
      wavePhase: 0.2,
    },
    {
      id: 'stream-right-3',
      text: params.streamText6,
      direction: 'right-to-left',
      top: '25%',
      fontSize: 36,
      color: params.textColor2,
      fontWeight: 400,
      wavePhase: 0.4,
    },
  ];

  // Build children data
  const childrenData: any[] = [];

  streams.forEach((stream) => {
    const streamContainerId = `${stream.id}-container`;
    const textId = `${stream.id}-text`;
    const effectId = `${stream.id}-effect`;

    // Calculate wave keyframes based on phase
    const waveKeyframes = [];
    for (let i = 0; i <= 4; i++) {
      const prog = i / 4;
      const wavePhase = stream.wavePhase + prog * Math.PI * 4;
      const yOffset = Math.sin(wavePhase) * params.waveAmplitude;
      waveKeyframes.push({
        key: 'translateY',
        val: yOffset,
        prog: prog,
      });
    }

    // Calculate horizontal motion
    const isLeftToRight = stream.direction === 'left-to-right';
    const startX = isLeftToRight ? -1200 : 1920;
    const endX = isLeftToRight ? 1920 : -1200;

    // Build animation ranges
    const ranges = [
      // Horizontal motion
      { key: 'translateX', val: startX, prog: 0 },
      { key: 'translateX', val: endX, prog: 1 },
      // Wave undulation
      ...waveKeyframes,
    ];

    // Add turbulence effects for opposing streams (right-to-left streams)
    if (!isLeftToRight) {
      ranges.push(
        // Scale turbulence at intersection point (around 50% progress)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.45 },
        {
          key: 'scale',
          val: 1 + 0.1 * params.turbulenceIntensity,
          prog: 0.5,
        },
        { key: 'scale', val: 1.05, prog: 0.55 },
        { key: 'scale', val: 1, prog: 1 },

        // Blur turbulence
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: 0, prog: 0.4 },
        { key: 'blur', val: 2 * params.turbulenceIntensity, prog: 0.5 },
        { key: 'blur', val: 0, prog: 0.6 },
        { key: 'blur', val: 0, prog: 1 },
      );
    }

    // Create text atom
    const textAtom = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: stream.text,
        style: {
          fontSize: `${stream.fontSize}px`,
          fontWeight: stream.fontWeight,
          color: stream.color,
          whiteSpace: 'nowrap',
          textShadow: `0 0 20px ${stream.color}80`,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: adjustedDuration,
        },
      },
    };

    // Create stream container
    const streamContainer = {
      id: streamContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute w-full will-change-transform transform-gpu overflow-visible',
          style: {
            top: stream.top,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: adjustedDuration,
        },
      },
      childrenData: [textAtom],
      effects: [
        {
          id: effectId,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: adjustedDuration,
            mode: 'provider',
            targetIds: [streamContainerId],
            ranges: ranges,
          },
        },
      ],
    };

    childrenData.push(streamContainer);
  });

  // Create root container
  const rootContainer = {
    id: 'liquid-typo-root',
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
        duration: adjustedDuration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-motion-typokinetics',
  title: 'Liquid Motion Typokinetics',
  description:
    'A dreamy, ethereal typography effect where text lines flow past each other like streams of water caught in opposing currents. Features wave-like undulation, turbulence effects at intersection points with scale and blur variations, and smooth spring easing for organic fluid motion. Perfect for artistic, emotional, or atmospheric content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'liquid',
    'motion',
    'water',
    'flow',
    'wave',
    'ethereal',
    'dreamy',
    'artistic',
    'emotional',
    'turbulence',
    'organic',
    'fluid',
  ],
  dependencies: {},
  defaultInputParams: {
    streamText1: 'flowing waters',
    streamText2: 'liquid dreams',
    streamText3: 'ethereal currents',
    streamText4: 'fluid motion',
    streamText5: 'streaming light',
    streamText6: 'drifting waves',
    duration: 10,
    backgroundColor: '#0a0a1a',
    textColor1: '#ffffff',
    textColor2: '#e0f0ff',
    textColor3: '#c0e8ff',
    font: 'Inter:600',
    waveAmplitude: 20,
    flowSpeed: 1,
    turbulenceIntensity: 1,
  },
};

// Export preset
export const liquidMotionTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
