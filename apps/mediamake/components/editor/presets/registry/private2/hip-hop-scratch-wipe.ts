import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  trackId: z
    .string()
    .default('hip-hop-scratch-wipe')
    .describe('Unique ID for this track.'),
  start: z.number().min(0).default(0).describe('Start time in seconds.'),
  duration: z
    .number()
    .min(0)
    .default(1)
    .describe('Total duration of the wipe transition.'),
  direction: z
    .enum(['left-to-right', 'right-to-left', 'both'])
    .default('both')
    .describe('Wipe direction.'),
  intensity: z
    .enum(['mild', 'medium', 'aggressive'])
    .default('aggressive')
    .describe('Intensity of the scratch effect.'),
  layerCount: z
    .number()
    .min(2)
    .max(5)
    .default(4)
    .describe('Number of overlapping mask layers.'),
  scratchBounce: z
    .boolean()
    .default(true)
    .describe('Add bounce-back effect at transitions.'),
  rotationAmount: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Rotation degrees for turntable simulation.'),
  edgeJaggedness: z
    .number()
    .min(1)
    .max(10)
    .default(7)
    .describe('Jaggedness of the wipe edge (1-10).'),
  rhythmPattern: z
    .enum(['steady', 'stutter', 'syncopated'])
    .default('stutter')
    .describe('Timing rhythm pattern.'),
  glitchAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Amount of glitch/layering effect (0-1).'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: { config: InputCompositionProps['config'] },
): Promise<Partial<PresetOutput>> => {
  const {
    trackId,
    start,
    duration,
    direction,
    intensity,
    layerCount,
    scratchBounce,
    rotationAmount,
    edgeJaggedness,
    rhythmPattern,
    glitchAmount,
  } = params;
  const { fps } = props.config ?? { fps: 30 };

  // Calculate timing values based on rhythm pattern
  const getTimingMultipliers = () => {
    switch (rhythmPattern) {
      case 'steady':
        return { primary: 1, secondary: 1, tertiary: 1 };
      case 'stutter':
        return { primary: 0.7, secondary: 1.3, tertiary: 0.85 };
      case 'syncopated':
        return { primary: 0.6, secondary: 1.4, tertiary: 1.1 };
      default:
        return { primary: 1, secondary: 1, tertiary: 1 };
    }
  };

  const timingMultipliers = getTimingMultipliers();

  // Generate SVG path for jagged edge
  const generateJaggedPath = (seed: number, complexity: number) => {
    const points = 8 + Math.floor(complexity * 2);
    const height = 1080;
    const segmentHeight = height / points;

    let path = `M 0 0`;
    for (let i = 0; i < points; i++) {
      const y = i * segmentHeight;
      const offset = (Math.sin(seed + i) * 0.5 + 0.5) * 80 * (complexity / 10);
      const zigzag = i % 2 === 0 ? offset : -offset;
      path += ` L ${20 + zigzag} ${y}`;
    }
    path += ` L 0 ${height} Z`;
    return path;
  };

  // Create animation keyframes with scratch motion
  const createScratchAnimation = (layerIndex: number) => {
    const baseDelay = layerIndex * 50; // 50ms stagger
    const directionMultiplier = direction === 'right-to-left' ? -1 : 1;
    const bounceEffect = scratchBounce
      ? 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      : 'cubic-bezier(0.77, 0, 0.175, 1)';

    return `
            @keyframes scratch-wipe-${layerIndex} {
                0% {
                    transform: translateX(${directionMultiplier * -120}%) rotate(${-rotationAmount}deg);
                }
                ${
                  direction === 'both'
                    ? `
                15% {
                    transform: translateX(${directionMultiplier * -80}%) rotate(${-rotationAmount * 0.7}deg);
                }
                25% {
                    transform: translateX(${directionMultiplier * -100}%) rotate(${-rotationAmount * 0.8}deg);
                }`
                    : ''
                }
                40% {
                    transform: translateX(${directionMultiplier * 0}%) rotate(0deg);
                }
                ${
                  direction === 'both'
                    ? `
                55% {
                    transform: translateX(${directionMultiplier * 20}%) rotate(${rotationAmount * 0.3}deg);
                }
                65% {
                    transform: translateX(${directionMultiplier * 10}%) rotate(${rotationAmount * 0.2}deg);
                }`
                    : ''
                }
                80% {
                    transform: translateX(${directionMultiplier * 120}%) rotate(${rotationAmount}deg);
                }
                100% {
                    transform: translateX(${directionMultiplier * 120}%) rotate(${rotationAmount}deg);
                }
            }
        `;
  };

  // Generate styles for all layers
  const generateLayerStyles = () => {
    let styles = '';
    for (let i = 0; i < layerCount; i++) {
      styles += createScratchAnimation(i);
    }
    return styles;
  };

  // Generate SVG clip paths
  const generateClipPaths = () => {
    const paths = [];
    for (let i = 0; i < layerCount; i++) {
      paths.push({
        id: `scratch-clip-${i}`,
        path: generateJaggedPath(i * 2.5, edgeJaggedness),
      });
    }
    return paths;
  };

  const clipPaths = generateClipPaths();

  // Calculate animation duration adjustments
  const getLayerDuration = (index: number) => {
    const baseMs = duration * 1000;
    if (rhythmPattern === 'steady') return baseMs;

    const multipliers = [
      timingMultipliers.primary,
      timingMultipliers.secondary,
      timingMultipliers.tertiary,
    ];
    const multiplier = multipliers[index % multipliers.length];
    return baseMs * multiplier;
  };

  const component = {
    id: trackId,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: 'transparent',
        },
      },
      repeatChildrenProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: { start, duration },
    },
    childrenData: [
      // Combined styles and SVG definitions
      {
        id: `${trackId}-styles-and-defs`,
        componentId: 'HTMLBlockAtom',
        type: 'atom' as const,
        data: {
          html: `
                        <style>
                            ${generateLayerStyles()}
                            
                            .scratch-layer {
                                will-change: transform;
                                pointer-events: none;
                            }
                            
                            .scratch-layer-overlay {
                                position: absolute;
                                inset: 0;
                                background: rgba(0, 0, 0, ${0.05 + glitchAmount * 0.15});
                                mix-blend-mode: multiply;
                            }
                        </style>
                        <svg width="0" height="0" style="position: absolute; pointer-events: none;">
                            <defs>
                                ${clipPaths
                                  .map(
                                    cp => `
                                    <clipPath id="${cp.id}" clipPathUnits="objectBoundingBox">
                                        <path d="${cp.path}" transform="scale(0.000926, 0.000926)" />
                                    </clipPath>
                                `,
                                  )
                                  .join('')}
                            </defs>
                        </svg>
                    `,
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 1000,
          },
        },
      },
      // Layer masks
      ...Array.from({ length: layerCount }, (_, i) => ({
        id: `${trackId}-layer-${i}`,
        componentId: 'HTMLBlockAtom',
        type: 'atom' as const,
        data: {
          html: `
                        <div 
                            class="scratch-layer" 
                            style="
                                position: absolute;
                                inset: 0;
                                background: white;
                                clip-path: url(#scratch-clip-${i});
                                animation: scratch-wipe-${i} ${getLayerDuration(i)}ms cubic-bezier(0.77, 0, 0.175, 1) forwards;
                                animation-delay: ${i * 50}ms;
                                z-index: ${layerCount - i};
                                opacity: ${1 - i * glitchAmount * 0.15};
                            "
                        >
                            <div class="scratch-layer-overlay"></div>
                        </div>
                    `,
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: layerCount - i,
          },
        },
      })),
    ],
  };

  return {
    output: {
      childrenData: [component],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'hip-hop-scratch-wipe',
  title: 'Hip-Hop Scratch Wipe',
  description:
    'Dynamic wipe transition effect that emulates classic hip-hop video scratch/turntable motions with jagged, angular wipes and stutter-step rhythm',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'wipe',
    'hip-hop',
    'scratch',
    'turntable',
    'effect',
    'svg',
    'glitch',
  ],
  defaultInputParams: {
    trackId: 'hip-hop-scratch-wipe-1',
    start: 0,
    duration: 1.2,
    direction: 'both',
    intensity: 'aggressive',
    layerCount: 4,
    scratchBounce: true,
    rotationAmount: 5,
    edgeJaggedness: 7,
    rhythmPattern: 'stutter',
    glitchAmount: 0.3,
  },
};

export const hipHopScratchWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
