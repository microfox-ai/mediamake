/**
 * Destroyed Letterpress Text Effect Preset
 *
 * A weathered letterpress text effect featuring deep impression marks, ink pooling in damaged areas,
 * rust stains, scratches, and mechanical press motion reveal. Simulates printing plates that have been
 * damaged over time with minimal shake and sudden jolts mimicking a printing press hitting damaged plate sections.
 *
 * Features:
 * - **Deep Impression Marks**: Multiple text-shadow layers creating deep letterpress bite
 * - **Damaged Plate Sections**: Clip-path and overlay divs to simulate chunks missing from worn plates
 * - **Ink Pooling**: Absolute positioned elements at character corners for ink accumulation
 * - **Rust Stains**: Radial gradient overlays simulating oxidation and weathering
 * - **Metal Scratches**: Thin rotated divs crossing through text
 * - **Ink Blobs**: Random positioned dark blobs simulating ink rollover
 * - **Mechanical Press Motion**: Quick down-and-up reveal with brief pause at pressure point
 * - **Shake Effects**: Minimal baseline with sudden jolts at damaged sections
 * - **Paper Texture**: Amber background simulating aged paper
 *
 * Use cases:
 * - Vintage typography effects
 * - Industrial/grunge title cards
 * - Retro poster aesthetics
 * - Distressed print simulations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with destroyed letterpress effect'),
  duration: z.number().default(5).describe('Duration in seconds'),
  fontSize: z.number().default(96).describe('Font size in pixels (default: 96px for 6xl equivalent)'),
  textColor: z.string().default('#1F2937').describe('Text color (default: gray-900)'),
  paperColor: z.string().default('#FEF3C7').describe('Paper background color (default: amber-50)'),
  fontFamily: z.string().default('Libre Baskerville').describe('Serif font family for letterpress effect'),
  rustIntensity: z.number().min(0).max(1).default(0.3).describe('Rust stain opacity intensity (0-1)'),
  damageIntensity: z.number().min(0).max(1).default(0.8).describe('Damage/chunk visibility intensity (0-1)'),
  inkPoolingIntensity: z.number().min(0).max(1).default(0.7).describe('Ink pooling opacity (0-1)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    paperColor,
    fontFamily,
    rustIntensity,
    damageIntensity,
    inkPoolingIntensity,
  } = params;

  // Construct text shadow for deep impression
  const impressionShadow = [
    '0 1px 0 rgba(0,0,0,0.4)',
    '0 2px 0 rgba(0,0,0,0.3)',
    '0 3px 2px rgba(0,0,0,0.2)',
    '0 4px 3px rgba(0,0,0,0.15)',
    '0 6px 4px rgba(0,0,0,0.1)',
  ].join(', ');

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'destroyed-letterpress-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: paperColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'main-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          // Rust stain 1
          {
            id: 'rust-stain-1',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-32 h-32 rounded-full blur-md pointer-events-none',
              style: {
                background: 'radial-gradient(circle, rgba(180, 83, 9, 0.3) 0%, transparent 70%)',
                top: '15%',
                left: '20%',
                opacity: rustIntensity,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Rust stain 2
          {
            id: 'rust-stain-2',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-40 h-40 rounded-full blur-md pointer-events-none',
              style: {
                background: 'radial-gradient(circle, rgba(146, 64, 14, 0.3) 0%, transparent 70%)',
                top: '60%',
                right: '15%',
                opacity: rustIntensity * 0.85,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Rust stain 3
          {
            id: 'rust-stain-3',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-28 h-28 rounded-full blur-md pointer-events-none',
              style: {
                background: 'radial-gradient(circle, rgba(194, 65, 12, 0.3) 0%, transparent 70%)',
                bottom: '20%',
                left: '30%',
                opacity: rustIntensity * 0.7,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Scratch 1
          {
            id: 'scratch-1',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute h-px bg-gray-400 pointer-events-none',
              style: {
                width: '200px',
                top: '30%',
                left: '25%',
                transform: 'rotate(15deg)',
                opacity: 0.5,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Scratch 2
          {
            id: 'scratch-2',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute h-px bg-gray-400 pointer-events-none',
              style: {
                width: '150px',
                top: '55%',
                right: '30%',
                transform: 'rotate(-25deg)',
                opacity: 0.5,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Scratch 3
          {
            id: 'scratch-3',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute h-px bg-gray-400 pointer-events-none',
              style: {
                width: '180px',
                bottom: '25%',
                left: '20%',
                transform: 'rotate(8deg)',
                opacity: 0.5,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Scratch 4
          {
            id: 'scratch-4',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute h-px bg-gray-400 pointer-events-none',
              style: {
                width: '220px',
                top: '45%',
                left: '35%',
                transform: 'rotate(-12deg)',
                opacity: 0.5,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Ink blob 1
          {
            id: 'ink-blob-1',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-8 h-6 bg-black blur-sm pointer-events-none',
              style: {
                borderRadius: '40%',
                top: '35%',
                left: '45%',
                opacity: 0.8,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Ink blob 2
          {
            id: 'ink-blob-2',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-6 h-8 bg-black blur-sm pointer-events-none',
              style: {
                borderRadius: '40%',
                top: '60%',
                right: '40%',
                opacity: 0.8,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Main letterpress text
          {
            id: 'letterpress-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: text,
              className: 'relative z-10 font-serif font-bold',
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                textShadow: impressionShadow,
              },
              font: {
                family: fontFamily,
                weights: ['700'],
                subsets: ['latin'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Damage chunk 1
          {
            id: 'damage-chunk-1',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-12 h-8 pointer-events-none',
              style: {
                backgroundColor: paperColor,
                top: '48%',
                left: '42%',
                clipPath: 'polygon(20% 0%, 80% 10%, 90% 50%, 70% 100%, 10% 90%)',
                opacity: damageIntensity,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Damage chunk 2
          {
            id: 'damage-chunk-2',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-10 h-10 pointer-events-none',
              style: {
                backgroundColor: paperColor,
                top: '50%',
                right: '38%',
                clipPath: 'polygon(30% 0%, 100% 20%, 80% 80%, 20% 100%, 0% 60%)',
                opacity: damageIntensity,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Ink pool 1
          {
            id: 'ink-pool-1',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-4 h-4 bg-black rounded-full blur-sm pointer-events-none',
              style: {
                top: '47%',
                left: '41%',
                opacity: inkPoolingIntensity,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
          // Ink pool 2
          {
            id: 'ink-pool-2',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div></div>',
              className: 'absolute w-3 h-3 bg-black rounded-full blur-sm pointer-events-none',
              style: {
                top: '52%',
                right: '43%',
                opacity: inkPoolingIntensity,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ] as RenderableComponentData[],
        effects: [
          // Smooth shake baseline
          {
            id: 'shake-smooth',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0.8, // After press motion completes
              duration: 4.2,
              mode: 'provider',
              targetIds: ['main-text-container'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 1, prog: 0.1 },
                { key: 'translateX', val: -1, prog: 0.2 },
                { key: 'translateX', val: 0, prog: 0.3 },
                { key: 'translateX', val: 1, prog: 0.4 },
                { key: 'translateX', val: -1, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 0.6 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 1, prog: 0.15 },
                { key: 'translateY', val: -1, prog: 0.25 },
                { key: 'translateY', val: 0, prog: 0.35 },
                { key: 'translateY', val: 1, prog: 0.45 },
                { key: 'translateY', val: 0, prog: 0.55 },
              ],
            },
          },
          // Sudden jolt 1
          {
            id: 'shake-jolt-1',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 1.5,
              duration: 0.1,
              mode: 'provider',
              targetIds: ['main-text-container'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 5, prog: 0.5 },
                { key: 'translateX', val: -5, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -5, prog: 0.5 },
                { key: 'translateY', val: 5, prog: 1 },
              ],
            },
          },
          // Sudden jolt 2
          {
            id: 'shake-jolt-2',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 3.2,
              duration: 0.1,
              mode: 'provider',
              targetIds: ['main-text-container'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: -5, prog: 0.5 },
                { key: 'translateX', val: 5, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 5, prog: 0.5 },
                { key: 'translateY', val: -5, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
    effects: [
      // Press motion reveal on text
      {
        id: 'press-motion',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: ['letterpress-text'],
          ranges: [
            { key: 'translateY', val: -20, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.4 },
            { key: 'translateY', val: 0, prog: 0.6 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 0.4 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'destroyed-letterpress-text',
  title: 'Destroyed Letterpress Text Effect',
  description:
    'A weathered letterpress text effect featuring deep impression marks, ink pooling in damaged areas, rust stains, scratches, and mechanical press motion reveal. Simulates printing plates that have been damaged over time with minimal shake and sudden jolts mimicking a printing press hitting damaged plate sections.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'letterpress',
    'vintage',
    'grunge',
    'damaged',
    'weathered',
    'industrial',
    'print',
    'typography',
    'retro',
    'distressed',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'VINTAGE',
    duration: 5,
    fontSize: 96,
    textColor: '#1F2937',
    paperColor: '#FEF3C7',
    fontFamily: 'Libre Baskerville',
    rustIntensity: 0.3,
    damageIntensity: 0.8,
    inkPoolingIntensity: 0.7,
  },
};

// Export preset
export const destroyedLetterpressTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
