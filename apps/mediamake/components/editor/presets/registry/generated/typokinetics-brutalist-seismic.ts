/**
 * Typokinetics Brutalist Seismic Typography Preset
 *
 * This preset treats stencil text as brutalist architecture responding to seismic bass hits.
 * Letters act like concrete blocks that crack, shift, and realign when hit by kicks.
 * Massive stencil letters appear as if carved from concrete blocks that fracture along stress lines.
 *
 * Features:
 * - **Fault Line Effect**: Text splits into segments that shift independently
 * - **Horizontal Splits, Vertical Fractures, Diagonal Cracks**: Multiple fracture patterns
 * - **Seismic Impact**: Segments separate slightly (revealing background gaps) then slam back
 * - **Concrete Texture**: Realistic concrete visual with subtle noise
 * - **Dust Particles**: Shake loose on impact with opacity fade
 * - **Falling Debris**: Occasional debris pieces that fall
 * - **3D Blocking**: Heavy shadows enhance depth and weight
 * - **Monolithic Animation**: Heavy, weighted movement with momentum
 *
 * Technical Implementation:
 * - BaseLayout container with clip-path polygons for fracture lines
 * - Each segment in separate BaseLayout with position='absolute' for independent movement
 * - Split animations: translateX/Y for separation (-5 to 5px), rotation (-1 to 1deg)
 * - Dust particles: absolutely positioned divs with opacity fade and translateY
 * - Concrete texture: CSS background-image with multiply blend mode
 * - Heavy shadows: box-shadow for 3D depth
 * - Split timing: 100ms split, 100ms hold, 200ms slam back (total 400ms)
 * - Performance: transform3d for all movements, composite layers for segments
 *
 * Use cases:
 * - Industrial/brutalist design presentations
 * - Heavy bass music videos
 * - Architectural visualization
 * - Urban/gritty content
 * - Impact-heavy title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  textContent: z
    .string()
    .default('IMPACT')
    .describe('Text content to display as brutalist concrete blocks'),
  fontSize: z
    .number()
    .default(180)
    .describe('Font size in pixels for the stencil text'),
  textColor: z
    .string()
    .default('#d4d4d4')
    .describe('Base color of the concrete text (light gray default)'),
  backgroundColor: z
    .string()
    .default('#1f2937')
    .describe('Background color (dark gray-800 default)'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the effect in seconds'),
  impactTiming: z
    .array(z.number())
    .default([0, 1, 2, 3, 4])
    .describe(
      'Array of timestamps (in seconds) when seismic impacts occur - bass kick times',
    ),
  splitIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for segment separation (0.5 to 2)'),
  dustIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for dust particle generation (0.5 to 2)'),
  concreteTextureUrl: z
    .string()
    .optional()
    .describe(
      'Optional URL for concrete texture image (noise.png or grunge texture)',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    textContent,
    fontSize,
    textColor,
    backgroundColor,
    duration,
    impactTiming,
    splitIntensity,
    dustIntensity,
    concreteTextureUrl,
  } = params;

  // Generate unique IDs for segments and elements
  const segmentIds = {
    topLeft: 'segment-top-left',
    topRight: 'segment-top-right',
    middleLeft: 'segment-middle-left',
    middleRight: 'segment-middle-right',
    bottomLeft: 'segment-bottom-left',
    bottomRight: 'segment-bottom-right',
  };

  const textAtomIds = {
    topLeft: 'text-atom-segment-1',
    topRight: 'text-atom-segment-2',
    middleLeft: 'text-atom-segment-3',
    middleRight: 'text-atom-segment-4',
    bottomLeft: 'text-atom-segment-5',
    bottomRight: 'text-atom-segment-6',
  };

  const dustParticleIds = [
    'dust-particle-1',
    'dust-particle-2',
    'dust-particle-3',
    'dust-particle-4',
    'dust-particle-5',
  ];

  const debrisIds = ['debris-1', 'debris-2'];

  // Base text style for all text atoms
  const baseTextStyle = {
    fontSize: `${fontSize}px`,
    color: textColor,
    fontWeight: '900' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    textShadow: '5px 5px 20px rgba(0,0,0,0.8), -2px -2px 10px rgba(0,0,0,0.4)',
  };

  // Create segment separation effects for each impact timing
  const createSegmentEffects = (
    segmentId: string,
    translateX: number,
    translateY: number,
    rotation: number,
  ): GenericEffectData[] => {
    return impactTiming.map((impactTime, index) => ({
      type: 'ease-in-out' as const,
      start: impactTime,
      duration: 0.4, // 100ms split + 100ms hold + 200ms slam back
      mode: 'provider' as const,
      targetIds: [segmentId],
      ranges: [
        // Start position
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'rotate', val: 0, prog: 0 },
        // Split position (at 25% = 100ms)
        {
          key: 'translateX',
          val: translateX * splitIntensity,
          prog: 0.25,
        },
        {
          key: 'translateY',
          val: translateY * splitIntensity,
          prog: 0.25,
        },
        {
          key: 'rotate',
          val: rotation * splitIntensity,
          prog: 0.25,
        },
        // Hold position (at 50% = 200ms)
        {
          key: 'translateX',
          val: translateX * splitIntensity,
          prog: 0.5,
        },
        {
          key: 'translateY',
          val: translateY * splitIntensity,
          prog: 0.5,
        },
        {
          key: 'rotate',
          val: rotation * splitIntensity,
          prog: 0.5,
        },
        // Slam back (at 100% = 400ms)
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    }));
  };

  // Create dust particle effects for each impact
  const createDustEffects = (
    particleId: string,
    delayOffset: number,
  ): GenericEffectData[] => {
    return impactTiming.map((impactTime) => ({
      type: 'linear' as const,
      start: impactTime + delayOffset,
      duration: 0.5 + delayOffset * 0.2,
      mode: 'provider' as const,
      targetIds: [particleId],
      ranges: [
        {
          key: 'opacity',
          val: 0.6 * dustIntensity,
          prog: 0,
        },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -20 - delayOffset * 5, prog: 1 },
      ],
    }));
  };

  // Create debris fall effects for each impact
  const createDebrisEffects = (
    debrisId: string,
    rotationStart: number,
    delayOffset: number,
  ): GenericEffectData[] => {
    return impactTiming.map((impactTime) => ({
      type: 'ease-in' as const,
      start: impactTime + 0.15 + delayOffset,
      duration: 0.8 + delayOffset * 0.1,
      mode: 'provider' as const,
      targetIds: [debrisId],
      ranges: [
        { key: 'opacity', val: 0.8 * dustIntensity, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 40 + delayOffset * 10, prog: 1 },
        { key: 'rotate', val: rotationStart, prog: 0 },
        { key: 'rotate', val: rotationStart + 60, prog: 1 },
      ],
    }));
  };

  // Collect all effects for each segment
  const segmentEffects = {
    topLeft: createSegmentEffects(segmentIds.topLeft, -5, -3, -0.5),
    topRight: createSegmentEffects(segmentIds.topRight, 5, -2, 0.8),
    middleLeft: createSegmentEffects(segmentIds.middleLeft, -4, 2, -1),
    middleRight: createSegmentEffects(segmentIds.middleRight, 4, 3, 0.7),
    bottomLeft: createSegmentEffects(segmentIds.bottomLeft, -3, 4, -0.6),
    bottomRight: createSegmentEffects(segmentIds.bottomRight, 5, 5, 1),
  };

  // Collect all dust effects
  const dustEffects = dustParticleIds.map((id, index) =>
    createDustEffects(id, index * 0.05),
  );

  // Collect all debris effects
  const debrisEffects = [
    createDebrisEffects(debrisIds[0], 15, 0),
    createDebrisEffects(debrisIds[1], -20, 0.1),
  ];

  // Build text segments with clip-path
  const textSegmentsContainer: RenderableComponentData = {
    id: 'text-segments-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Top-left segment
      {
        id: segmentIds.topLeft,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              clipPath: 'polygon(0% 0%, 45% 0%, 42% 33%, 0% 33%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: segmentEffects.topLeft.map((effectData, index) => ({
          id: `effect-top-left-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
        childrenData: [
          {
            id: textAtomIds.topLeft,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: textContent,
              font: {
                family: 'Archivo Black',
                weights: ['900'],
              },
              style: baseTextStyle,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Top-right segment
      {
        id: segmentIds.topRight,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              clipPath: 'polygon(55% 0%, 100% 0%, 100% 33%, 58% 33%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: segmentEffects.topRight.map((effectData, index) => ({
          id: `effect-top-right-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
        childrenData: [
          {
            id: textAtomIds.topRight,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: textContent,
              font: {
                family: 'Archivo Black',
                weights: ['900'],
              },
              style: baseTextStyle,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Middle-left segment
      {
        id: segmentIds.middleLeft,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              clipPath: 'polygon(0% 33%, 38% 33%, 35% 66%, 0% 66%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: segmentEffects.middleLeft.map((effectData, index) => ({
          id: `effect-middle-left-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
        childrenData: [
          {
            id: textAtomIds.middleLeft,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: textContent,
              font: {
                family: 'Archivo Black',
                weights: ['900'],
              },
              style: baseTextStyle,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Middle-right segment
      {
        id: segmentIds.middleRight,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              clipPath: 'polygon(62% 33%, 100% 33%, 100% 66%, 65% 66%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: segmentEffects.middleRight.map((effectData, index) => ({
          id: `effect-middle-right-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
        childrenData: [
          {
            id: textAtomIds.middleRight,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: textContent,
              font: {
                family: 'Archivo Black',
                weights: ['900'],
              },
              style: baseTextStyle,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Bottom-left segment
      {
        id: segmentIds.bottomLeft,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              clipPath: 'polygon(0% 66%, 40% 66%, 45% 100%, 0% 100%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: segmentEffects.bottomLeft.map((effectData, index) => ({
          id: `effect-bottom-left-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
        childrenData: [
          {
            id: textAtomIds.bottomLeft,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: textContent,
              font: {
                family: 'Archivo Black',
                weights: ['900'],
              },
              style: baseTextStyle,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Bottom-right segment
      {
        id: segmentIds.bottomRight,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              clipPath: 'polygon(55% 66%, 100% 66%, 100% 100%, 60% 100%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: segmentEffects.bottomRight.map((effectData, index) => ({
          id: `effect-bottom-right-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
        childrenData: [
          {
            id: textAtomIds.bottomRight,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: textContent,
              font: {
                family: 'Archivo Black',
                weights: ['900'],
              },
              style: baseTextStyle,
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
    ] as RenderableComponentData[],
  };

  // Build dust particles container
  const dustParticlesContainer: RenderableComponentData = {
    id: 'dust-particles-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: dustParticleIds.map((id, index) => {
      const positions = [
        { top: '30%', left: '40%' },
        { top: '45%', left: '55%' },
        { top: '60%', left: '35%' },
        { top: '35%', left: '65%' },
        { top: '70%', left: '50%' },
      ];
      const sizes = [4, 3, 5, 4, 3];
      const opacities = [0.6, 0.5, 0.7, 0.6, 0.5];

      return {
        id: id,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: ${sizes[index]}px; height: ${sizes[index]}px; background: rgba(200,200,200,${opacities[index]}); border-radius: 50%;'></div>`,
          className: 'absolute',
          style: positions[index],
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: dustEffects[index].map((effectData, effectIndex) => ({
          id: `dust-effect-${id}-${effectIndex}`,
          componentId: 'generic',
          data: effectData,
        })),
      };
    }) as RenderableComponentData[],
  };

  // Build debris container
  const debrisContainer: RenderableComponentData = {
    id: 'debris-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
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
        id: debrisIds[0],
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 8px; height: 6px; background: rgba(160,160,160,0.8); transform: rotate(15deg);'></div>",
          className: 'absolute',
          style: {
            top: '50%',
            left: '48%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: debrisEffects[0].map((effectData, index) => ({
          id: `debris-effect-1-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
      },
      {
        id: debrisIds[1],
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 6px; height: 8px; background: rgba(160,160,160,0.7); transform: rotate(-20deg);'></div>",
          className: 'absolute',
          style: {
            top: '55%',
            left: '52%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: debrisEffects[1].map((effectData, index) => ({
          id: `debris-effect-2-${index}`,
          componentId: 'generic',
          data: effectData,
        })),
      },
    ] as RenderableComponentData[],
  };

  // Build concrete texture overlay
  const concreteTextureOverlay: RenderableComponentData = {
    id: 'concrete-texture-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: concreteTextureUrl
        ? `<div style='width: 100%; height: 100%; background-image: url(${concreteTextureUrl}); background-blend-mode: multiply; opacity: 0.3; pointer-events: none;'></div>`
        : `<div style='width: 100%; height: 100%; background: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px); opacity: 0.2; pointer-events: none;'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Build shadow layer
  const shadowLayer: RenderableComponentData = {
    id: 'shadow-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; box-shadow: inset 0 0 50px rgba(0,0,0,0.6); pointer-events: none;'></div>",
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-brutalist-seismic-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
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
      concreteTextureOverlay,
      textSegmentsContainer,
      dustParticlesContainer,
      debrisContainer,
      shadowLayer,
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-brutalist-seismic',
  title: 'Typokinetics Brutalist Seismic Typography',
  description:
    'Treats stencil text as brutalist architecture responding to seismic bass hits. Massive stencil letters act as concrete blocks that crack, shift, and realign along fault lines. Features segment-based fracturing with horizontal splits, vertical fractures, and diagonal cracks. Segments separate on bass kicks (revealing background gaps) then slam back with impact. Includes concrete texture overlay, dust particles, debris, and heavy shadows for 3D depth. Heavy, monolithic animations with realistic weight and momentum.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'brutalist',
    'seismic',
    'concrete',
    'stencil',
    'impact',
    'fracture',
    'heavy',
    'industrial',
    'kinetic',
    'bass',
    'architecture',
  ],
  defaultInputParams: {
    textContent: 'IMPACT',
    fontSize: 180,
    textColor: '#d4d4d4',
    backgroundColor: '#1f2937',
    duration: 5,
    impactTiming: [0, 1, 2, 3, 4],
    splitIntensity: 1,
    dustIntensity: 1,
  },
  dependencies: {},
};

export const typokineticsBrutalistSeismicPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
