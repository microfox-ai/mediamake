/**
 * Data Corruption Matrix Transition
 *
 * A digital data corruption transition effect that mimics binary/hex data visualization breaking apart.
 * Converts images to cascading green matrix-style characters that scatter and reform.
 *
 * Features:
 * - Grid overlay of animated hex/binary characters with matrix-style appearance
 * - Rainfall pattern with staggered delays creating cascade effect
 * - Individual character rotation and scale variations for depth
 * - Pulsing glow effects simulating data transmission
 * - Progressive reveal through opacity transitions
 * - Digital deconstruction and reconstruction narrative
 *
 * Use Cases:
 * - Tech/cyberpunk-themed transitions
 * - Data visualization sequences
 * - Hacker/digital aesthetic videos
 * - Sci-fi content transitions
 * - Matrix-style effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  sourceImage: z.object({
    src: z.string().describe('Source image URL or path'),
  }).describe('Source image to transition from'),
  
  destinationImage: z.object({
    src: z.string().describe('Destination image URL or path'),
  }).describe('Destination image to transition to'),
  
  transitionDuration: z.number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the transition in seconds'),
  
  gridConfig: z.object({
    cols: z.number().min(6).max(20).default(12).describe('Number of grid columns'),
    rows: z.number().min(4).max(12).default(8).describe('Number of grid rows'),
  }).optional().describe('Grid configuration for character matrix'),
  
  characterStyle: z.object({
    color: z.string().default('text-green-400').describe('Tailwind color class for characters'),
    fontSize: z.string().default('text-xs').describe('Tailwind font size class'),
    glowIntensity: z.number().min(0).max(1).default(0.8).describe('Glow effect intensity (0-1)'),
  }).optional().describe('Character styling configuration'),
  
  animationConfig: z.object({
    cascadeDelay: z.number().min(0.01).max(0.1).default(0.02).describe('Delay between character animations in seconds'),
    fallDistance: z.string().default('100vh').describe('Distance characters fall (CSS value)'),
    rotationRange: z.number().min(0).max(45).default(15).describe('Maximum rotation in degrees'),
    scaleMin: z.number().min(0.5).max(1).default(0.8).describe('Minimum scale value'),
    scaleMax: z.number().min(1).max(2).default(1.2).describe('Maximum scale value'),
  }).optional().describe('Animation configuration'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random hex characters
  const generateRandomHex = (): string => {
    const hexChars = '0123456789ABCDEF';
    const length = Math.random() > 0.5 ? 2 : 4; // Mix of 2 and 4 character hex
    let hex = '0x';
    for (let i = 0; i < length; i++) {
      hex += hexChars[Math.floor(Math.random() * hexChars.length)];
    }
    return hex;
  };

  // Extract configuration with defaults
  const gridCols = params.gridConfig?.cols ?? 12;
  const gridRows = params.gridConfig?.rows ?? 8;
  const totalCharacters = gridCols * gridRows;
  
  const charColor = params.characterStyle?.color ?? 'text-green-400';
  const charFontSize = params.characterStyle?.fontSize ?? 'text-xs';
  const glowIntensity = params.characterStyle?.glowIntensity ?? 0.8;
  
  const cascadeDelay = params.animationConfig?.cascadeDelay ?? 0.02;
  const fallDistance = params.animationConfig?.fallDistance ?? '100vh';
  const rotationRange = params.animationConfig?.rotationRange ?? 15;
  const scaleMin = params.animationConfig?.scaleMin ?? 0.8;
  const scaleMax = params.animationConfig?.scaleMax ?? 1.2;
  
  const duration = params.transitionDuration;

  // Generate text atoms for matrix characters
  const textAtoms: RenderableComponentData[] = [];
  
  for (let i = 0; i < totalCharacters; i++) {
    const randomRotation = (Math.random() * 2 - 1) * rotationRange; // -rotationRange to +rotationRange
    const randomScale = scaleMin + Math.random() * (scaleMax - scaleMin);
    const glowColor = `rgba(34, 197, 94, ${glowIntensity})`;
    
    const textAtomId = `matrix-char-${i}`;
    
    textAtoms.push({
      id: textAtomId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: generateRandomHex(),
        className: `${charColor} font-mono ${charFontSize}`,
        style: {
          textShadow: `0 0 10px ${glowColor}`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        // Rainfall animation
        {
          id: `fall-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: i * cascadeDelay,
            duration: duration - i * cascadeDelay,
            mode: 'provider',
            targetIds: [textAtomId],
            ranges: [
              { key: 'translateY', val: '-20px', prog: 0 },
              { key: 'translateY', val: fallDistance, prog: 1 },
            ],
          },
        },
        // Rotation variation
        {
          id: `rotate-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: i * cascadeDelay,
            duration: duration * 0.5,
            mode: 'provider',
            targetIds: [textAtomId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: randomRotation, prog: 1 },
            ],
          },
        },
        // Scale variation
        {
          id: `scale-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: i * cascadeDelay,
            duration: duration * 0.4,
            mode: 'provider',
            targetIds: [textAtomId],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: randomScale, prog: 1 },
            ],
          },
        },
        // Pulsing opacity for data transmission effect
        {
          id: `pulse-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: i * cascadeDelay,
            duration: duration - i * cascadeDelay,
            mode: 'provider',
            targetIds: [textAtomId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.15 },
              { key: 'opacity', val: 0.6, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.45 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 0.75 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create data grid overlay with characters
  const dataGridId = 'data-grid-overlay';
  const dataGrid: RenderableComponentData = {
    id: dataGridId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 grid grid-cols-${gridCols} grid-rows-${gridRows} pointer-events-none`,
        style: {
          transform: 'translateZ(0)', // Layer promotion for performance
        },
      },
      repeatChildrenProps: {
        className: 'flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textAtoms,
    effects: [
      // Grid fade-in
      {
        id: 'grid-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: [dataGridId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Source image component
  const sourceImageId = 'source-image';
  const sourceImage: RenderableComponentData = {
    id: sourceImageId,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.sourceImage.src,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Progressive fade out revealing data layer
      {
        id: 'source-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: duration * 0.6,
          mode: 'provider',
          targetIds: [sourceImageId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Destination image component
  const destImageId = 'destination-image';
  const destinationImage: RenderableComponentData = {
    id: destImageId,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.destinationImage.src,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Fade in as characters converge
      {
        id: 'dest-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: duration * 0.75,
          duration: duration * 0.25,
          mode: 'provider',
          targetIds: [destImageId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'data-corruption-matrix-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      sourceImage,
      dataGrid,
      destinationImage,
    ],
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
  id: 'data-corruption-matrix-transition',
  title: 'Data Corruption Matrix Transition',
  description: 'A digital data corruption transition effect that mimics binary/hex data visualization breaking apart - converts images to cascading green matrix-style characters that scatter and reform. Features grid of animated text with rainfall pattern, rotation, scale variations, and pulsing glow effects to simulate data transmission and digital deconstruction/reconstruction.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'matrix', 'data', 'corruption', 'tech', 'cyberpunk', 'hex', 'binary', 'glitch', 'digital'],
  defaultInputParams: {
    sourceImage: {
      src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&h=1080&fit=crop',
    },
    destinationImage: {
      src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&h=1080&fit=crop',
    },
    transitionDuration: 2,
    gridConfig: {
      cols: 12,
      rows: 8,
    },
    characterStyle: {
      color: 'text-green-400',
      fontSize: 'text-xs',
      glowIntensity: 0.8,
    },
    animationConfig: {
      cascadeDelay: 0.02,
      fallDistance: '100vh',
      rotationRange: 15,
      scaleMin: 0.8,
      scaleMax: 1.2,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dataCorruptionMatrixTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};