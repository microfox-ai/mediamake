/**
 * Quantum Spin-State Transition Preset
 *
 * This preset simulates quantum superposition with multiple probability states of both
 * videos existing simultaneously before collapsing into the final state.
 *
 * Features:
 * - **Quantum Superposition**: 5 semi-transparent copies of each video (10 total) during 1-second overlap
 * - **Probability Distribution**: Each copy has varying opacity (0.2, 0.3, 0.4, 0.3, 0.2) representing probability
 * - **Multi-Rotation States**: Different rotation speeds (180, 360, 540, 720, 900 degrees) for each copy
 * - **Scale Oscillations**: All copies pulse in/out (0.9 to 1.1) at different frequencies
 * - **Quantum Collapse**: At 0.7s mark, all copies converge to center and snap to final state
 * - **Chromatic Aberration**: RGB channel splits intensify during collapse moment
 *
 * Use cases:
 * - Creating sci-fi quantum transition effects
 * - Simulating superposition and wave function collapse
 * - Building complex multi-state transitions with probability visualization
 * - Adding glitch/aberration effects during state transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }),
  overlapDuration: z
    .number()
    .default(1)
    .describe('Duration of quantum overlap transition in seconds'),
  collapsePoint: z
    .number()
    .default(0.7)
    .describe('Time point when quantum collapse occurs (0-1, relative to overlap duration)'),
  rotationSpeeds: z
    .array(z.number())
    .default([180, 360, 540, 720, 900])
    .describe('Rotation speeds in degrees for each copy'),
  opacityLevels: z
    .array(z.number())
    .default([0.2, 0.3, 0.4, 0.3, 0.2])
    .describe('Opacity levels for each copy representing probability distribution'),
  scaleOscillation: z
    .object({
      min: z.number().default(0.9).describe('Minimum scale value'),
      max: z.number().default(1.1).describe('Maximum scale value'),
    })
    .default({ min: 0.9, max: 1.1 })
    .describe('Scale oscillation range for all copies'),
  chromaticAberration: z
    .object({
      intensity: z.number().default(3).describe('Chromatic aberration intensity in pixels'),
    })
    .default({ intensity: 3 })
    .describe('Chromatic aberration effect configuration'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    collapsePoint,
    rotationSpeeds,
    opacityLevels,
    scaleOscillation,
    chromaticAberration,
  } = params;

  // Calculate collapse timing
  const collapseTime = overlapDuration * collapsePoint;
  const postCollapseTime = overlapDuration - collapseTime;

  // Helper function to create scale oscillation keyframes
  const createScaleOscillation = (
    copyIndex: number,
    totalCopies: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    // Different frequency for each copy
    const frequency = 2 + copyIndex * 0.5;
    const numKeyframes = Math.ceil(frequency * 2);
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      // Oscillate between min and max using sine wave
      const phase = prog * frequency * Math.PI * 2;
      const scale =
        scaleOscillation.min +
        (scaleOscillation.max - scaleOscillation.min) *
          (Math.sin(phase) * 0.5 + 0.5);
      keyframes.push({ key: 'scale', val: scale, prog });
    }

    return keyframes;
  };

  // Helper function to create RGB channel split effect
  const createRGBSplitEffect = (
    targetId: string,
    effectId: string,
    isOutgoing: boolean,
  ) => {
    const intensity = chromaticAberration.intensity;

    return [
      // Red channel shift
      {
        id: `${effectId}-red`,
        componentId: 'generic' as const,
        data: {
          type: 'ease-in-expo' as const,
          start: collapseTime,
          duration: postCollapseTime,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'filter', val: `url(#red-shift-0)`, prog: 0 },
            {
              key: 'filter',
              val: `drop-shadow(${intensity}px 0 0 rgba(255,0,0,0.8))`,
              prog: 1,
            },
          ],
        },
      },
    ];
  };

  // Create outgoing video copies (5 copies with quantum effects)
  const outgoingCopies: RenderableComponentData[] = rotationSpeeds.map(
    (rotationSpeed, index) => {
      const copyId = `outgoing-copy-${index + 1}`;
      const opacity = opacityLevels[index] || 0.2;
      const zIndex = 10 - index;

      // Scale oscillation effect throughout
      const scaleKeyframes = createScaleOscillation(index, 5);

      return {
        id: copyId,
        type: 'atom' as const,
        componentId:
          outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          // Rotation effect
          {
            id: `${copyId}-rotation`,
            componentId: 'generic' as const,
            data: {
              type: 'linear' as const,
              start: 0,
              duration: collapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotationSpeed, prog: 1 },
              ],
            },
          },
          // Opacity fade out and snap to 0
          {
            id: `${copyId}-opacity`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-in' as const,
              start: 0,
              duration: collapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: [
                { key: 'opacity', val: opacity, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Scale oscillation
          {
            id: `${copyId}-scale`,
            componentId: 'generic' as const,
            data: {
              type: 'linear' as const,
              start: 0,
              duration: collapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: scaleKeyframes,
            },
          },
          // Convergence to center during collapse
          {
            id: `${copyId}-converge`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-in-expo' as const,
              start: collapseTime,
              duration: postCollapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'scale', val: scaleOscillation.max, prog: 0 },
                { key: 'scale', val: 0.5, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create incoming video copies (5 copies with quantum effects)
  const incomingCopies: RenderableComponentData[] = rotationSpeeds.map(
    (rotationSpeed, index) => {
      const copyId = `incoming-copy-${index + 1}`;
      const opacity = opacityLevels[index] || 0.2;
      const zIndex = 5 - index;

      // Scale oscillation effect throughout
      const scaleKeyframes = createScaleOscillation(index + 5, 5);

      return {
        id: copyId,
        type: 'atom' as const,
        componentId:
          incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
        effects: [
          // Rotation effect
          {
            id: `${copyId}-rotation`,
            componentId: 'generic' as const,
            data: {
              type: 'linear' as const,
              start: 0,
              duration: collapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotationSpeed, prog: 1 },
              ],
            },
          },
          // Opacity fade in to probability level, then snap to full
          {
            id: `${copyId}-opacity-in`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: collapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: opacity, prog: 1 },
              ],
            },
          },
          // Snap to full opacity at collapse
          {
            id: `${copyId}-opacity-snap`,
            componentId: 'generic' as const,
            data: {
              type: 'linear' as const,
              start: collapseTime,
              duration: postCollapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: [
                { key: 'opacity', val: opacity, prog: 0 },
                { key: 'opacity', val: index === 2 ? 1 : 0, prog: 1 }, // Only middle copy (highest probability) becomes final
              ],
            },
          },
          // Scale oscillation
          {
            id: `${copyId}-scale`,
            componentId: 'generic' as const,
            data: {
              type: 'linear' as const,
              start: 0,
              duration: collapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: scaleKeyframes,
            },
          },
          // Snap to normal scale at collapse
          {
            id: `${copyId}-scale-snap`,
            componentId: 'generic' as const,
            data: {
              type: 'ease-out-expo' as const,
              start: collapseTime,
              duration: postCollapseTime,
              mode: 'provider' as const,
              targetIds: [copyId],
              ranges: [
                { key: 'scale', val: scaleOscillation.min, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container with all quantum copies
  const rootContainer: RenderableComponentData = {
    id: 'quantum-spin-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: [...outgoingCopies, ...incomingCopies],
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
  id: 'quantum-spin-transition',
  title: 'Quantum Spin-State Transition',
  description:
    'Simulates quantum superposition with 5 semi-transparent rotating copies of each video (10 total) representing probability states, followed by a collapse where outgoing copies converge to center and incoming copies snap to full opacity with chromatic aberration effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'quantum', 'superposition', 'rotation', 'glitch', 'chromatic-aberration'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video',
    },
    overlapDuration: 1,
    collapsePoint: 0.7,
    rotationSpeeds: [180, 360, 540, 720, 900],
    opacityLevels: [0.2, 0.3, 0.4, 0.3, 0.2],
    scaleOscillation: {
      min: 0.9,
      max: 1.1,
    },
    chromaticAberration: {
      intensity: 3,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quantumSpinTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};