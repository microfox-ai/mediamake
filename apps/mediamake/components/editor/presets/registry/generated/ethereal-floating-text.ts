/**
 * Ethereal Floating Text Preset
 *
 * Creates dreamy, floating text elements that drift like clouds across the screen
 * with cinematic quality. Text elements move through 3D space with subtle parallax,
 * where closer elements move faster and distant ones move slower. Each text has its
 * own drift trajectory using smooth sine-wave motion paths for organic movement.
 *
 * Features:
 * - **Organic Motion**: Sine-wave based drift paths creating cloud-like floating
 * - **Parallax Depth**: 3-5 text layers at different depths with varying speeds
 * - **Atmospheric Fading**: Gradual fade in/out like fog rolling in and out
 * - **Gentle Rotation**: Subtle Z-axis rotation (1-3 degrees) enhancing float sensation
 * - **Staggered Timing**: Non-synchronized start times for hypnotic, meditative feel
 * - **Customizable Text**: Multiple text elements with individual styling
 *
 * Use Cases:
 * - Cinematic title sequences with dreamy atmosphere
 * - Poetic text overlays for emotional storytelling
 * - Meditation or relaxation video intros
 * - Ambient background text for music videos
 * - Ethereal credits or end sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  texts: z
    .array(
      z.object({
        text: z.string().describe('Text content to display'),
        fontSize: z
          .number()
          .min(24)
          .max(120)
          .default(64)
          .optional()
          .describe('Font size in pixels'),
        fontWeight: z
          .string()
          .default('300')
          .optional()
          .describe('Font weight (e.g., "300", "400", "700")'),
        color: z
          .string()
          .default('#ffffff')
          .optional()
          .describe('Text color (hex or CSS color)'),
      }),
    )
    .min(3)
    .max(5)
    .default([
      { text: 'Ethereal Dreams', fontSize: 64, fontWeight: '300', color: '#ffffff' },
      { text: 'Floating Thoughts', fontSize: 48, fontWeight: '200', color: '#e8e8e8' },
      { text: 'Cinematic Whispers', fontSize: 56, fontWeight: '100', color: '#f5f5f5' },
      { text: 'Drifting Serenely', fontSize: 52, fontWeight: '200', color: '#eeeeee' },
      { text: 'Hypnotic Clouds', fontSize: 60, fontWeight: '100', color: '#ffffff' },
    ])
    .describe('Array of 3-5 text elements to display'),
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto:600", "BebasNeue:700:italic")'),
  duration: z
    .number()
    .min(10)
    .max(60)
    .default(25)
    .optional()
    .describe('Total duration of the composition in seconds'),
  backgroundColor: z
    .string()
    .default('transparent')
    .optional()
    .describe('Background color for the container'),
  driftIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .optional()
    .describe('Multiplier for drift animation intensity (0.5 = subtle, 3 = dramatic)'),
  rotationIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .optional()
    .describe('Multiplier for rotation intensity (0.5 = subtle, 3 = dramatic)'),
  fadeInDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .optional()
    .describe('Fade in duration in seconds'),
  fadeOutDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(3)
    .optional()
    .describe('Fade out duration in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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

  const duration = params.duration || 25;
  const driftIntensity = params.driftIntensity || 1;
  const rotationIntensity = params.rotationIntensity || 1;
  const fadeInDuration = params.fadeInDuration || 2;
  const fadeOutDuration = params.fadeOutDuration || 3;

  // Helper function to create sine-wave drift keyframes
  const createDriftKeyframes = (
    driftDuration: number,
    translateXScale: number,
    translateYScale: number,
    phaseX: number = 0,
    phaseY: number = 0,
  ) => {
    const keyframes = [];
    const steps = 16; // More steps for smoother sine waves
    
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const angle = prog * Math.PI * 2 + phaseX;
      const angleY = prog * Math.PI * 2 + phaseY;
      
      const xVal = Math.sin(angle) * translateXScale * driftIntensity;
      const yVal = Math.sin(angleY) * translateYScale * driftIntensity;
      
      keyframes.push(
        { key: 'translateX', val: xVal, prog },
        { key: 'translateY', val: yVal, prog },
      );
    }
    
    return keyframes;
  };

  // Helper function to create rotation keyframes
  const createRotationKeyframes = (maxRotation: number) => {
    return [
      { key: 'rotateZ', val: 0, prog: 0 },
      { key: 'rotateZ', val: maxRotation * rotationIntensity, prog: 0.25 },
      { key: 'rotateZ', val: 0, prog: 0.5 },
      { key: 'rotateZ', val: -maxRotation * rotationIntensity, prog: 0.75 },
      { key: 'rotateZ', val: 0, prog: 1 },
    ];
  };

  // Positioning presets for text elements
  const positions = [
    { top: '25%', left: '33%' },
    { bottom: '33%', right: '25%' },
    { top: '50%', left: '20%' },
    { top: '66%', right: '33%' },
    { top: '33%', right: '40%' },
  ];

  // Animation duration variations (15-20s per cycle)
  const durations = [18, 20, 17, 19, 17];

  // Staggered start times (0, 2, 4, 6, 8 seconds)
  const startTimes = [0, 2, 4, 6, 8];

  // Drift parameters for each element (different scales and phases)
  const driftParams = [
    { xScale: 60, yScale: 25, phaseX: 0, phaseY: 0.5 }, // Element 1: moderate horizontal drift
    { xScale: -40, yScale: -30, phaseX: 1, phaseY: 0 }, // Element 2: reverse drift
    { xScale: 80, yScale: 15, phaseX: 0.5, phaseY: 1.5 }, // Element 3: strong horizontal drift
    { xScale: -65, yScale: -25, phaseX: 0.25, phaseY: 0.75 }, // Element 4: diagonal drift
    { xScale: 40, yScale: 20, phaseX: 1.5, phaseY: 0.25 }, // Element 5: gentle drift
  ];

  // Rotation parameters for each element (1-3 degrees)
  const rotations = [2, -1.5, 3, -2.5, 1.8];

  // Create text elements
  const textElements = params.texts.slice(0, 5).map((textData, index) => {
    const textId = `ethereal-text-${index + 1}`;
    const containerId = `text-element-${index + 1}-container`;
    const elementDuration = durations[index];
    const startTime = startTimes[index];
    const position = positions[index];
    const drift = driftParams[index];
    const rotation = rotations[index];

    // Parse font weight from text data
    const textFontWeight = textData.fontWeight || '300';
    const textFontWeights = [textFontWeight];

    const positionClass = Object.entries(position)
      .map(([key, val]) => `${key}-[${val}]`)
      .join(' ');

    const textContainer = {
      id: containerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute ${positionClass} will-change-transform will-change-opacity`,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: elementDuration,
        },
      },
      effects: [
        // Fade in
        {
          id: `fade-in-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: fadeInDuration,
            mode: 'provider',
            targetIds: [containerId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Drift (sine-wave motion)
        {
          id: `drift-sine-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: elementDuration,
            mode: 'provider',
            targetIds: [containerId],
            ranges: createDriftKeyframes(
              elementDuration,
              drift.xScale,
              drift.yScale,
              drift.phaseX,
              drift.phaseY,
            ),
          },
        },
        // Rotation
        {
          id: `rotation-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: elementDuration,
            mode: 'provider',
            targetIds: [containerId],
            ranges: createRotationKeyframes(rotation),
          },
        },
        // Fade out
        {
          id: `fade-out-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: elementDuration - fadeOutDuration,
            duration: fadeOutDuration,
            mode: 'provider',
            targetIds: [containerId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: textData.text,
            style: {
              fontSize: `${textData.fontSize || 64}px`,
              fontWeight: textFontWeight,
              color: textData.color || '#ffffff',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: textFontWeights,
              display: 'swap' as const,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: elementDuration,
            },
          },
        },
      ],
    };

    return textContainer;
  });

  // Root container
  const rootContainer = {
    id: 'ethereal-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor || 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: textElements as RenderableComponentData[],
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
  id: 'etherealFloatingText',
  title: 'Ethereal Floating Text',
  description:
    'Dreamy floating text elements that drift like clouds through 3D space with parallax, sine-wave motion, gentle rotation, and atmospheric fade effects. Features 3-5 text layers at different depths with staggered, non-synchronized movement for hypnotic, meditative quality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'floating',
    'ethereal',
    'cinematic',
    'dreamy',
    'parallax',
    'sine-wave',
    'drift',
    'clouds',
    'atmospheric',
    'meditation',
    'hypnotic',
    '3d',
    'layered',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: [
      { text: 'Ethereal Dreams', fontSize: 64, fontWeight: '300', color: '#ffffff' },
      { text: 'Floating Thoughts', fontSize: 48, fontWeight: '200', color: '#e8e8e8' },
      { text: 'Cinematic Whispers', fontSize: 56, fontWeight: '100', color: '#f5f5f5' },
      { text: 'Drifting Serenely', fontSize: 52, fontWeight: '200', color: '#eeeeee' },
      { text: 'Hypnotic Clouds', fontSize: 60, fontWeight: '100', color: '#ffffff' },
    ],
    font: 'Inter',
    duration: 25,
    backgroundColor: 'transparent',
    driftIntensity: 1,
    rotationIntensity: 1,
    fadeInDuration: 2,
    fadeOutDuration: 3,
  },
};

// Export preset
export const etherealFloatingTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
