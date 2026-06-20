/**
 * Quantum Superposition Typokinetics Preset
 *
 * Advanced quantum-inspired text animation where characters exist in multiple probability 
 * states simultaneously before collapsing into final text. Features probability ghosts with 
 * quantum jitter, interference patterns, wave function collapse, and measurement scanning effects.
 *
 * Features:
 * - Multiple probability states per character (4 states)
 * - Quantum uncertainty visualization with micro-vibrations
 * - Phase flickering between probability states
 * - Measurement scan line that triggers wave function collapse
 * - Interference patterns where probability waves overlap
 * - Screen blend mode for quantum superposition effect
 * - Smooth collapse animation with brightness flash
 *
 * Technical Implementation:
 * - Base text layer with original content
 * - 4 probability ghost layers with different colors and transforms
 * - Each state has unique offset and animation timing
 * - Scan line sweeps across triggering collapse
 * - All states converge to base position on collapse
 *
 * Use Cases:
 * - Quantum physics content visualization
 * - Sci-fi themed presentations
 * - Tech product launches
 * - Creative typography effects
 * - Educational quantum mechanics content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display with quantum effects'),
  fontSize: z
    .union([z.string(), z.number()])
    .default('48px')
    .describe('Font size of the text (e.g., "48px" or 48)'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds (2.5-3s recommended)'),
  primaryColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the base/final text state'),
  stateColors: z
    .array(z.string())
    .default(['#00ffff', '#ff00ff', '#ffff00', '#00ff00'])
    .describe('Colors for the 4 probability states (cyan, magenta, yellow, green)'),
  scanLineColor: z
    .string()
    .default('#00ffff')
    .describe('Color of the measurement scan line'),
  numberOfStates: z
    .number()
    .min(3)
    .max(5)
    .default(4)
    .describe('Number of probability ghost states (3-5, default 4)'),
  quantumJitterIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Intensity of quantum uncertainty vibration (0.5-3)'),
  collapseFlashIntensity: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Brightness intensity of collapse flash (1-3)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 700;

  // Parse font size
  const fontSize =
    typeof params.fontSize === 'number'
      ? `${params.fontSize}px`
      : params.fontSize;

  // Animation timing breakdown (relative to duration)
  const totalDuration = params.duration;
  const phase1Duration = totalDuration * 0.6; // 0-60%: Probability flickering
  const phase2Start = totalDuration * 0.6; // 60%: Scan starts
  const phase2Duration = totalDuration * 0.2; // 60-80%: Scanning
  const phase3Start = totalDuration * 0.8; // 80%: Collapse starts
  const phase3Duration = totalDuration * 0.2; // 80-100%: Collapse

  const scanStart = totalDuration * 0.33; // Scan starts at 1s mark (33% for 3s duration)
  const scanDuration = totalDuration * 0.2; // Scan takes 20% of duration

  // Helper to generate random offset for probability states
  const generateStateOffset = (index: number) => {
    const baseOffsetX = (index % 2 === 0 ? 1 : -1) * (5 + index * 2);
    const baseOffsetY = (index % 3 === 0 ? 1 : -1) * (3 + index);
    const baseRotate = (index % 2 === 0 ? 1 : -1) * (2 + index);
    return { x: baseOffsetX, y: baseOffsetY, rotate: baseRotate };
  };

  // Helper to create flickering opacity keyframes for a state
  const createFlickerEffect = (
    stateId: string,
    stateIndex: number,
  ): GenericEffectData => {
    const jitterIntensity = params.quantumJitterIntensity;
    const offset = generateStateOffset(stateIndex);

    // Opacity flicker pattern (different for each state)
    const opacityPattern = [0.2, 0.6, 0.3, 0.5, 0.4];
    const baseOpacity = opacityPattern[stateIndex % opacityPattern.length];

    return {
      type: 'linear',
      start: 0,
      duration: phase1Duration,
      mode: 'provider',
      targetIds: [stateId],
      ranges: [
        // Opacity flickering
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: baseOpacity, prog: 0.1 },
        { key: 'opacity', val: baseOpacity * 0.7, prog: 0.25 },
        { key: 'opacity', val: baseOpacity * 1.2, prog: 0.4 },
        { key: 'opacity', val: baseOpacity * 0.8, prog: 0.55 },
        { key: 'opacity', val: baseOpacity, prog: 0.7 },
        { key: 'opacity', val: baseOpacity * 0.9, prog: 0.85 },
        { key: 'opacity', val: baseOpacity, prog: 1 },
        // Position offset (quantum uncertainty)
        {
          key: 'translateX',
          val: offset.x - 2 * jitterIntensity,
          prog: 0,
        },
        {
          key: 'translateX',
          val: offset.x + 2 * jitterIntensity,
          prog: 0.2,
        },
        {
          key: 'translateX',
          val: offset.x - 1 * jitterIntensity,
          prog: 0.4,
        },
        {
          key: 'translateX',
          val: offset.x + 1.5 * jitterIntensity,
          prog: 0.6,
        },
        { key: 'translateX', val: offset.x, prog: 0.8 },
        {
          key: 'translateX',
          val: offset.x + 1 * jitterIntensity,
          prog: 1,
        },
        {
          key: 'translateY',
          val: offset.y - 1.5 * jitterIntensity,
          prog: 0,
        },
        {
          key: 'translateY',
          val: offset.y + 1 * jitterIntensity,
          prog: 0.25,
        },
        {
          key: 'translateY',
          val: offset.y - 1 * jitterIntensity,
          prog: 0.5,
        },
        {
          key: 'translateY',
          val: offset.y + 1.5 * jitterIntensity,
          prog: 0.75,
        },
        { key: 'translateY', val: offset.y, prog: 1 },
        // Rotation jitter
        {
          key: 'rotate',
          val: offset.rotate - 1 * jitterIntensity,
          prog: 0,
        },
        {
          key: 'rotate',
          val: offset.rotate + 1 * jitterIntensity,
          prog: 0.3,
        },
        {
          key: 'rotate',
          val: offset.rotate - 0.5 * jitterIntensity,
          prog: 0.6,
        },
        { key: 'rotate', val: offset.rotate, prog: 1 },
        // Hue rotation for phase shift
        { key: 'hue-rotate', val: 0, prog: 0 },
        { key: 'hue-rotate', val: 15, prog: 0.5 },
        { key: 'hue-rotate', val: 30, prog: 1 },
      ],
    };
  };

  // Helper to create collapse effect
  const createCollapseEffect = (
    stateId: string,
    stateIndex: number,
  ): GenericEffectData => {
    const offset = generateStateOffset(stateIndex);
    const flashIntensity = params.collapseFlashIntensity;

    return {
      type: 'ease-out',
      start: phase3Start,
      duration: phase3Duration,
      mode: 'provider',
      targetIds: [stateId],
      ranges: [
        // Converge to center
        { key: 'translateX', val: offset.x, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: offset.y, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'rotate', val: offset.rotate, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },
        // Fade out
        { key: 'opacity', val: 0.5, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
        // Brightness flash at collapse
        { key: 'brightness', val: 1, prog: 0 },
        { key: 'brightness', val: flashIntensity, prog: 0.3 },
        { key: 'brightness', val: 1, prog: 1 },
      ],
    };
  };

  // Create probability state containers with effects
  const stateContainers: RenderableComponentData[] = [];
  const numStates = Math.min(params.numberOfStates, params.stateColors.length);

  for (let i = 0; i < numStates; i++) {
    const stateId = `state-${i + 1}-text`;
    const containerId = `state-${i + 1}-container`;

    const flickerEffect = createFlickerEffect(stateId, i);
    const collapseEffect = createCollapseEffect(stateId, i);

    stateContainers.push({
      id: containerId,
      type: 'layout',
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
      effects: [
        {
          id: `flicker-${i + 1}`,
          componentId: 'generic',
          data: flickerEffect,
        },
        {
          id: `collapse-${i + 1}`,
          componentId: 'generic',
          data: collapseEffect,
        },
      ],
      childrenData: [
        {
          id: stateId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: params.text,
            style: {
              fontSize: fontSize,
              fontWeight: fontWeight,
              color: params.stateColors[i] || params.stateColors[0],
              textShadow: `0 0 15px ${params.stateColors[i] || params.stateColors[0]}99`,
            },
            font: {
              family: fontFamily,
              weights: [fontWeight.toString()],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData);
  }

  // Create scan line effect
  const scanLineEffect: GenericEffectData = {
    type: 'linear',
    start: scanStart,
    duration: scanDuration,
    mode: 'provider',
    targetIds: ['scan-line'],
    ranges: [
      { key: 'translateX', val: -50, prog: 0 },
      { key: 'translateX', val: 1920, prog: 1 },
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.5, prog: 0.1 },
      { key: 'opacity', val: 0.5, prog: 0.9 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Create interference overlay effect
  const interferenceEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: phase1Duration,
    mode: 'provider',
    targetIds: ['interference-overlay'],
    ranges: [
      { key: 'opacity', val: 0.1, prog: 0 },
      { key: 'opacity', val: 0.2, prog: 0.25 },
      { key: 'opacity', val: 0.15, prog: 0.5 },
      { key: 'opacity', val: 0.25, prog: 0.75 },
      { key: 'opacity', val: 0.15, prog: 1 },
    ],
  };

  // Build component tree
  const rootContainer: RenderableComponentData = {
    id: 'quantum-superposition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Quantum text container with all layers
      {
        id: 'quantum-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          // Base text (final state)
          {
            id: 'base-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: params.text,
              style: {
                fontSize: fontSize,
                fontWeight: fontWeight,
                color: params.primaryColor,
                textShadow: `0 0 20px ${params.primaryColor}cc`,
              },
              font: {
                family: fontFamily,
                weights: [fontWeight.toString()],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          },
          // Probability state layers
          ...stateContainers,
        ] as RenderableComponentData[],
      },
      // Scan line
      {
        id: 'scan-line-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
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
            id: 'scan-line-sweep',
            componentId: 'generic',
            data: scanLineEffect,
          },
        ],
        childrenData: [
          {
            id: 'scan-line',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute h-full w-1',
                style: {
                  backgroundColor: params.scanLineColor,
                  boxShadow: `0 0 10px ${params.scanLineColor}cc`,
                  left: 0,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          },
        ] as RenderableComponentData[],
      },
      // Interference overlay
      {
        id: 'interference-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              mixBlendMode: 'overlay',
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            },
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
            id: 'interference-pulse',
            componentId: 'generic',
            data: interferenceEffect,
          },
        ],
      },
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'quantum-superposition-typokinetics',
  title: 'Quantum Superposition Typokinetics',
  description:
    'Advanced quantum-inspired text animation where characters exist in multiple probability states simultaneously before collapsing into final text. Features probability ghosts with quantum jitter, interference patterns, wave function collapse, and measurement scanning effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'quantum',
    'superposition',
    'animation',
    'kinetic',
    'sci-fi',
    'advanced',
    'probability',
    'wave-function',
    'measurement',
    'interference',
    'glitch',
    'tech',
  ],
  defaultInputParams: {
    text: 'QUANTUM TEXT',
    fontSize: '48px',
    font: 'Inter:700',
    duration: 3,
    primaryColor: '#ffffff',
    stateColors: ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'],
    scanLineColor: '#00ffff',
    numberOfStates: 4,
    quantumJitterIntensity: 1,
    collapseFlashIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quantumSuperpositionTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
