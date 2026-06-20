/**
 * Plasma Disruption Text Effect Preset
 *
 * Creates a sci-fi force field collapse effect where text elements start in a stable
 * grid formation with subtle floating animation (like holographic UI elements), then
 * get disrupted by a visible energy wave that causes electromagnetic-style scatter.
 *
 * Features:
 * - Stable grid formation with subtle floating animation (hologram effect)
 * - Visible distortion wave traveling across screen
 * - Wave-triggered disruption with distance-based repulsion
 * - Chromatic aberration (RGB channel splitting) during disruption
 * - Electric arc effects between scattered elements
 * - Spring-based physics for natural scatter motion
 *
 * Use cases:
 * - Sci-fi title sequences
 * - Tech product reveals
 * - Game UI transitions
 * - Futuristic presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  words: z
    .array(z.string())
    .default([
      'PLASMA',
      'FIELD',
      'ENERGY',
      'MATRIX',
      'SYSTEM',
      'VECTOR',
      'PULSE',
      'FORCE',
      'CORE',
    ])
    .describe('Array of text elements to display in grid formation'),
  gridColumns: z
    .number()
    .min(1)
    .max(6)
    .default(3)
    .describe('Number of columns in grid formation'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(36)
    .describe('Font size for text elements in pixels'),
  textColor: z
    .string()
    .default('#00d4ff')
    .describe('Color for text elements (CSS color value)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text elements'),
  waveStartTime: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Time in seconds when wave disruption begins'),
  waveDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of wave travel across screen in seconds'),
  scatterDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of scatter animation after wave hit in seconds'),
  scatterIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for scatter distance'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Intensity of chromatic aberration effect in pixels'),
  floatAmplitude: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Amplitude of floating animation before disruption in pixels'),
  showElectricArcs: z
    .boolean()
    .default(true)
    .describe('Whether to show electric arc effects between elements'),
  totalDuration: z
    .number()
    .min(3)
    .max(30)
    .default(6)
    .describe('Total duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    gridColumns,
    fontSize,
    textColor,
    fontFamily,
    waveStartTime,
    waveDuration,
    scatterDuration,
    scatterIntensity,
    chromaticIntensity,
    floatAmplitude,
    showElectricArcs,
    totalDuration,
  } = params;

  // Helper: Calculate scatter vector based on position and wave center
  const calculateScatterVector = (
    index: number,
    totalWords: number,
  ): { x: number; y: number; rotation: number } => {
    const row = Math.floor(index / gridColumns);
    const col = index % gridColumns;
    const totalRows = Math.ceil(totalWords / gridColumns);

    // Calculate position in grid (normalized -0.5 to 0.5)
    const normalizedX = (col / (gridColumns - 1) - 0.5) * 2;
    const normalizedY = (row / (totalRows - 1) - 0.5) * 2;

    // Wave comes from left, so distance is primarily based on X position
    const distanceFromWaveOrigin = normalizedX + 1; // 0 to 2

    // Calculate scatter direction (away from wave origin, with some vertical variance)
    const baseAngle = 0; // Wave travels left to right, so scatter right
    const angleVariance = normalizedY * 30; // Vertical position adds angle variance
    const finalAngle = baseAngle + angleVariance;

    // Calculate scatter distance (further from wave origin = less scatter)
    const baseDistance = 300 * scatterIntensity;
    const distanceMultiplier = 1.5 - distanceFromWaveOrigin * 0.5; // 1.5 to 0.5
    const distance = baseDistance * distanceMultiplier;

    // Calculate x, y components
    const x = distance * Math.cos((finalAngle * Math.PI) / 180);
    const y = distance * Math.sin((finalAngle * Math.PI) / 180);

    // Rotation based on position (more extreme at edges)
    const rotation = (normalizedX * normalizedY * 90 + angleVariance) * 0.5;

    return { x, y, rotation };
  };

  // Helper: Calculate when each element gets hit by wave
  const calculateWaveHitTime = (index: number): number => {
    const col = index % gridColumns;
    const progress = col / (gridColumns - 1); // 0 to 1
    return waveStartTime + progress * waveDuration;
  };

  // Create text elements with effects
  const textElements: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `text-element-${index}`;
    const waveHitTime = calculateWaveHitTime(index);
    const scatter = calculateScatterVector(index, words.length);

    // Floating animation (0 to waveStartTime)
    const floatEffect = {
      id: `float-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: waveStartTime,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -floatAmplitude, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };

    // Scatter animation (triggered at waveHitTime)
    const scatterEffect = {
      id: `scatter-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'spring' as const,
        start: waveHitTime,
        duration: scatterDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          // Translation
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: scatter.x, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: scatter.y, prog: 1 },
          // Rotation
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: scatter.rotation, prog: 1 },
          // Scale distortion (brief squash/stretch)
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: 1.5, prog: 0.2 },
          { key: 'scaleX', val: 1, prog: 1 },
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: 0.5, prog: 0.2 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      },
    };

    // Chromatic aberration (brief pulse at wave hit)
    const chromaticEffect = {
      id: `chromatic-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: waveHitTime,
        duration: 0.5,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          {
            key: 'textShadow',
            val: `${chromaticIntensity}px 0 0 #ff0000, -${chromaticIntensity}px 0 0 #0000ff`,
            prog: 0.3,
          },
          { key: 'textShadow', val: '0 0 0 transparent', prog: 1 },
        ],
      },
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: '700',
          color: textColor,
          textShadow: `0 0 10px ${textColor}80`,
        },
        font: {
          family: fontFamily,
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [floatEffect, scatterEffect, chromaticEffect],
    };
  });

  // Wave distortion element
  const waveDistortion: RenderableComponentData = {
    id: 'wave-distortion',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 200px; height: 100vh; background: radial-gradient(circle, rgba(0, 200, 255, 0.3) 0%, transparent 70%); backdrop-filter: blur(20px); filter: brightness(1.5);"></div>`,
      className: 'absolute top-0 left-0 pointer-events-none',
      style: {
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: waveStartTime,
        duration: waveDuration,
      },
    },
    effects: [
      {
        id: 'wave-travel',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: waveDuration,
          mode: 'provider' as const,
          targetIds: ['wave-distortion'],
          ranges: [
            { key: 'translateX', val: '-200px', prog: 0 },
            { key: 'translateX', val: '100vw', prog: 1 },
          ],
        },
      },
    ],
  };

  // Electric arcs (optional)
  const electricArcs: RenderableComponentData[] = showElectricArcs
    ? [
        {
          id: 'arc-1',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 2px; height: 150px; background: linear-gradient(to bottom, transparent, ${textColor}, transparent); transform-origin: top center;"></div>`,
            className: 'absolute',
            style: {
              top: '40%',
              left: '35%',
            },
          },
          context: {
            timing: {
              start: waveStartTime + waveDuration * 0.4,
              duration: 0.8,
            },
          },
          effects: [
            {
              id: 'arc-1-flicker',
              componentId: 'generic',
              data: {
                type: 'linear' as const,
                start: 0,
                duration: 0.8,
                mode: 'provider' as const,
                targetIds: ['arc-1'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.1 },
                  { key: 'opacity', val: 0.3, prog: 0.3 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scaleY', val: 0.5, prog: 0 },
                  { key: 'scaleY', val: 1.5, prog: 0.5 },
                  { key: 'scaleY', val: 0, prog: 1 },
                ],
              },
            },
          ],
        },
        {
          id: 'arc-2',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 2px; height: 120px; background: linear-gradient(to bottom, transparent, ${textColor}, transparent); transform-origin: top center;"></div>`,
            className: 'absolute',
            style: {
              top: '45%',
              left: '55%',
            },
          },
          context: {
            timing: {
              start: waveStartTime + waveDuration * 0.6,
              duration: 0.9,
            },
          },
          effects: [
            {
              id: 'arc-2-flicker',
              componentId: 'generic',
              data: {
                type: 'linear' as const,
                start: 0,
                duration: 0.9,
                mode: 'provider' as const,
                targetIds: ['arc-2'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.15 },
                  { key: 'opacity', val: 0.4, prog: 0.4 },
                  { key: 'opacity', val: 1, prog: 0.6 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scaleY', val: 0.3, prog: 0 },
                  { key: 'scaleY', val: 1.2, prog: 0.5 },
                  { key: 'scaleY', val: 0, prog: 1 },
                ],
              },
            },
          ],
        },
        {
          id: 'arc-3',
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 2px; height: 100px; background: linear-gradient(to bottom, transparent, ${textColor}, transparent); transform-origin: top center;"></div>`,
            className: 'absolute',
            style: {
              top: '50%',
              left: '48%',
            },
          },
          context: {
            timing: {
              start: waveStartTime + waveDuration * 0.8,
              duration: 0.7,
            },
          },
          effects: [
            {
              id: 'arc-3-flicker',
              componentId: 'generic',
              data: {
                type: 'linear' as const,
                start: 0,
                duration: 0.7,
                mode: 'provider' as const,
                targetIds: ['arc-3'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.2 },
                  { key: 'opacity', val: 0.5, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scaleY', val: 0.4, prog: 0 },
                  { key: 'scaleY', val: 1, prog: 0.4 },
                  { key: 'scaleY', val: 0, prog: 1 },
                ],
              },
            },
          ],
        },
      ]
    : [];

  // Text grid container
  const textGridContainer: RenderableComponentData = {
    id: 'text-grid-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid gap-8`,
        style: {
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
          width: '800px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: textElements,
  };

  // Electricity container
  const electricityContainer: RenderableComponentData = {
    id: 'electricity-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: electricArcs,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'plasma-disruption-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [waveDistortion, textGridContainer, electricityContainer],
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

const presetMetadata: PresetMetadata = {
  id: 'plasma-disruption-text-effect',
  title: 'Plasma Disruption Text Effect',
  description:
    'Sci-fi force field collapse effect where text elements start in a stable grid formation with subtle floating animation, then get disrupted by a visible energy wave that causes electromagnetic-style scatter with chromatic aberration and electric arcs',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'sci-fi',
    'disruption',
    'plasma',
    'energy',
    'wave',
    'chromatic-aberration',
    'electric',
    'hologram',
    'force-field',
    'scatter',
    'glitch',
  ],
  dependencies: {},
  defaultInputParams: {
    words: [
      'PLASMA',
      'FIELD',
      'ENERGY',
      'MATRIX',
      'SYSTEM',
      'VECTOR',
      'PULSE',
      'FORCE',
      'CORE',
    ],
    gridColumns: 3,
    fontSize: 36,
    textColor: '#00d4ff',
    fontFamily: 'Inter',
    waveStartTime: 2,
    waveDuration: 2,
    scatterDuration: 1.5,
    scatterIntensity: 1,
    chromaticIntensity: 5,
    floatAmplitude: 5,
    showElectricArcs: true,
    totalDuration: 6,
  },
};

export const plasmaDisruptionTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
