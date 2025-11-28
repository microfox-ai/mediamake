/**
 * Typographic Kinetics: Glass Wipe Reveal Preset
 * 
 * A motion graphics preset featuring text revealed by a wiping motion, as if cleaning
 * condensation or frost from glass. Text appears painted behind glass with liquid wobble
 * animations, elastic bounce reveals, and environmental particle effects (water droplets/frost).
 * Uses a squeegee-style wiper blade that moves across the screen with tactile, physical effects.
 * 
 * Features:
 * - **Glass Wipe Effect**: Wiper blade sweeps across screen revealing text progressively
 * - **Liquid Wobble**: Letters have organic oscillating animations with spring easing
 * - **Elastic Bounce**: Text springs to life as wiper passes with spring easing
 * - **Environmental Particles**: Water droplets/frost particles that fade and fall
 * - **Tactile Physics**: Physical feeling with blur, opacity, and scale transitions
 * - **Progressive Reveal**: Word-level timing for staggered text appearance
 * 
 * Use cases:
 * - Creating wiping reveal animations for text
 * - Building glass/window cleaning effects
 * - Adding tactile, physical motion graphics
 * - Creating liquid, organic typography animations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  textLines: z
    .array(
      z.object({
        text: z.string().describe('Text content for this line'),
        top: z.string().describe('Top position (e.g., "30%")'),
        left: z.string().describe('Left position (e.g., "10%")'),
        color: z.string().optional().describe('Text color (default: based on line)'),
      })
    )
    .min(1)
    .max(5)
    .default([
      { text: 'Your Message Here', top: '30%', left: '10%' },
      { text: 'Revealed By Motion', top: '50%', left: '15%' },
      { text: 'Behind The Glass', top: '70%', left: '20%' },
    ])
    .describe('Array of text lines with positioning'),
  
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(8)
    .describe('Total duration of the preset in seconds'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration for wiper to sweep across screen'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(60)
    .describe('Font size in pixels'),
  
  wobbleIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for wobble animations'),
  
  particleCount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Number of water droplet/frost particles'),
  
  backgroundColor: z
    .string()
    .default('from-gray-100 to-gray-200')
    .describe('Tailwind gradient classes for background'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    textLines,
    duration,
    transitionDuration,
    font,
    fontSize,
    wobbleIntensity,
    particleCount,
    backgroundColor,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:700';
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

  // Default colors for text lines
  const defaultColors = ['#1f2937', '#374151', '#4b5563'];

  // Create text line components
  const textComponents: RenderableComponentData[] = textLines.map((line, index) => {
    const textId = `glass-wipe-text-${index}`;
    const color = line.color || defaultColors[index % defaultColors.length];
    
    // Calculate reveal progress point (staggered based on position)
    const revealProgress = 0.3 + (index * 0.1);

    return {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: line.text,
        className: 'absolute font-bold',
        style: {
          top: line.top,
          left: line.left,
          color: color,
          fontSize: `${fontSize}px`,
          filter: 'blur(8px)',
          opacity: 0.3,
          transform: 'scale(0.95)',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        // Reveal effect (blur, opacity, scale)
        {
          id: `reveal-${textId}`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [textId],
            ranges: [
              { key: 'filter', val: 'blur(8px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: revealProgress },
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 1, prog: revealProgress },
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 1, prog: revealProgress },
            ],
          },
        },
        // Wobble effect (translateY and rotate)
        {
          id: `wobble-${textId}`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [textId],
            ranges: [
              // TranslateY oscillation
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -2 * wobbleIntensity, prog: 0.15 },
              { key: 'translateY', val: 1 * wobbleIntensity, prog: 0.35 },
              { key: 'translateY', val: -1 * wobbleIntensity, prog: 0.55 },
              { key: 'translateY', val: 0.5 * wobbleIntensity, prog: 0.75 },
              { key: 'translateY', val: 0, prog: 1 },
              // Rotate oscillation
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -0.5 * wobbleIntensity, prog: 0.2 },
              { key: 'rotate', val: 0.3 * wobbleIntensity, prog: 0.4 },
              { key: 'rotate', val: -0.2 * wobbleIntensity, prog: 0.6 },
              { key: 'rotate', val: 0.1 * wobbleIntensity, prog: 0.8 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create particle components
  const particlePositions = [
    { top: '20%', left: '30%', size: 'w-1 h-1', color: 'bg-blue-200/50', opacity: 0.8 },
    { top: '35%', left: '45%', size: 'w-1 h-1', color: 'bg-blue-200/50', opacity: 0.7 },
    { top: '55%', left: '60%', size: 'w-1 h-1', color: 'bg-blue-300/60', opacity: 0.6 },
    { top: '75%', left: '25%', size: 'w-1 h-1', color: 'bg-blue-200/50', opacity: 0.8 },
    { top: '15%', left: '70%', size: 'w-1.5 h-1.5', color: 'bg-blue-100/40', opacity: 0.5 },
    { top: '40%', left: '80%', size: 'w-1 h-1', color: 'bg-blue-300/50', opacity: 0.7 },
    { top: '65%', left: '50%', size: 'w-1 h-1', color: 'bg-blue-200/60', opacity: 0.6 },
    { top: '85%', left: '65%', size: 'w-1.5 h-1.5', color: 'bg-blue-100/50', opacity: 0.7 },
  ];

  const particleComponents: RenderableComponentData[] = particlePositions
    .slice(0, particleCount)
    .map((pos, index) => {
      const particleId = `particle-${index}`;
      const fallDuration = 0.4 + (index * 0.02);
      const fallDistance = 30 + (index * 2);

      return {
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="${pos.size} rounded-full ${pos.color}"></div>`,
          className: 'absolute',
          style: {
            top: pos.top,
            left: pos.left,
            opacity: pos.opacity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `particle-fall-${particleId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: fallDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'opacity', val: pos.opacity, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: fallDistance, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });

  // Create wiper blade component
  const wiperBlade: RenderableComponentData = {
    id: 'wiper-blade',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-y-0 left-0 w-4 bg-white/80 backdrop-blur-sm shadow-lg',
        style: {
          transform: 'translateX(-100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'wiper-sweep',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['wiper-blade'],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: 'calc(100vw + 100%)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glass-wipe-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full bg-gradient-to-br ${backgroundColor}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      ...textComponents,
      ...particleComponents,
      wiperBlade,
    ] as RenderableComponentData[],
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
  id: 'typographic-kinetics-glass-wipe',
  title: 'Typographic Kinetics: Glass Wipe Reveal',
  description:
    'A motion graphics preset featuring text revealed by a wiping motion, as if cleaning condensation or frost from glass. Text appears painted behind glass with liquid wobble animations, elastic bounce reveals, and environmental particle effects (water droplets/frost). Uses a squeegee-style wiper blade that moves across the screen with tactile, physical effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'glass',
    'wipe',
    'reveal',
    'motion-graphics',
    'liquid',
    'wobble',
    'particles',
    'spring',
    'tactile',
  ],
  defaultInputParams: {
    textLines: [
      { text: 'Your Message Here', top: '30%', left: '10%' },
      { text: 'Revealed By Motion', top: '50%', left: '15%' },
      { text: 'Behind The Glass', top: '70%', left: '20%' },
    ],
    duration: 8,
    transitionDuration: 2,
    font: 'Inter:700',
    fontSize: 60,
    wobbleIntensity: 1,
    particleCount: 8,
    backgroundColor: 'from-gray-100 to-gray-200',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const typographicKineticsGlassWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
