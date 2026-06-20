/**
 * DNA Helix Transition Preset
 *
 * Creates a smooth helical DNA-twist transition where videos spiral around each other
 * like a double helix during a 2-second overlap. The outgoing video splits into two copies
 * that rotate in opposite directions (clockwise and counter-clockwise) while moving along
 * sine-wave paths horizontally. The incoming video does the same but with inverted phase.
 *
 * Features:
 * - **True 3D Rotation**: Uses transform3d with rotateY (0→180deg and 0→-180deg)
 * - **Perspective Depth**: 1000px perspective on container for 3D depth effect
 * - **Sine-Wave Movement**: Horizontal oscillation with translateX + vertical translateY
 * - **Motion Blur Effect**: 2-3 semi-transparent duplicates per main atom with time offsets
 * - **Helix Weaving**: Alternating z-indices create DNA double-helix crossing effect
 * - **Synchronized Fading**: Opacity transitions 1→0 (outgoing) and 0→1 (incoming)
 *
 * Technical Implementation:
 * - BaseLayout with perspective:1000px and transform-style:preserve-3d
 * - Four main VideoAtoms (2 per source video) with opposite rotations
 * - Eight motion trail duplicates (2 per main atom) at 0.05s and 0.1s offsets
 * - Opacity 0.3 and 0.2 for trail duplicates to create blur effect
 * - Sine-wave paths: translateX oscillates between -200px and +200px
 * - Vertical oscillation: translateY between -100px and +100px
 * - Z-index layering: incoming (z:5-8) over outgoing (z:1-4) for smooth transition
 *
 * Use Cases:
 * - Science/biology-themed video transitions
 * - Organic, flowing transitions between clips
 * - DNA/genetics content with thematic transitions
 * - High-impact transitions for modern video content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the helix transition overlap in seconds'),
  horizontalAmplitude: z
    .number()
    .default(200)
    .describe('Horizontal sine-wave amplitude in pixels'),
  verticalAmplitude: z
    .number()
    .default(100)
    .describe('Vertical oscillation amplitude in pixels'),
  perspective: z
    .number()
    .default(1000)
    .describe('Perspective depth in pixels for 3D effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// Main preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    horizontalAmplitude,
    verticalAmplitude,
    perspective,
  } = params;

  // Calculate total duration: sum of both videos minus overlap
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper to create a video atom with effects
  const createVideoAtom = (
    id: string,
    src: string,
    startTime: number,
    duration: number,
    zIndex: number,
    opacity: number,
    rotateDirection: 'clockwise' | 'counterclockwise',
    phaseInverted: boolean,
  ): RenderableComponentData => {
    const rotateYEnd = rotateDirection === 'clockwise' ? 180 : -180;

    // Sine wave keyframes for horizontal movement
    const xKeyframes = phaseInverted
      ? [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -horizontalAmplitude, prog: 0.25 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: horizontalAmplitude, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ]
      : [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: horizontalAmplitude, prog: 0.25 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: -horizontalAmplitude, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ];

    // Vertical oscillation keyframes
    const yKeyframes = phaseInverted
      ? [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: verticalAmplitude, prog: 0.25 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: -verticalAmplitude, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ]
      : [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -verticalAmplitude, prog: 0.25 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: verticalAmplitude, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ];

    return {
      id,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src,
        fit: 'cover',
        loop: false,
        className: 'w-full h-full',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex,
          opacity,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration,
        },
      },
      effects: [
        {
          id: `${id}-rotateY`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: rotateYEnd, prog: 1 },
            ],
          },
        },
        {
          id: `${id}-translateX`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [id],
            ranges: xKeyframes,
          },
        },
        {
          id: `${id}-translateY`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [id],
            ranges: yKeyframes,
          },
        },
      ],
    };
  };

  // Create all child atoms
  const childrenData: RenderableComponentData[] = [];

  // Outgoing video copy 1 (clockwise rotation, normal phase)
  const outgoingCopy1 = createVideoAtom(
    'outgoing-copy1',
    outgoingVideo.src,
    0,
    outgoingVideo.duration,
    4,
    1,
    'clockwise',
    false,
  );
  outgoingCopy1.effects!.push({
    id: 'outgoing-copy1-opacity',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: outgoingVideo.duration,
      mode: 'provider',
      targetIds: ['outgoing-copy1'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });
  childrenData.push(outgoingCopy1);

  // Outgoing copy 1 trail 1
  const outgoingCopy1Trail1 = createVideoAtom(
    'outgoing-copy1-trail1',
    outgoingVideo.src,
    0.05,
    outgoingVideo.duration - 0.05,
    3,
    0.3,
    'clockwise',
    false,
  );
  childrenData.push(outgoingCopy1Trail1);

  // Outgoing copy 1 trail 2
  const outgoingCopy1Trail2 = createVideoAtom(
    'outgoing-copy1-trail2',
    outgoingVideo.src,
    0.1,
    outgoingVideo.duration - 0.1,
    2,
    0.2,
    'clockwise',
    false,
  );
  childrenData.push(outgoingCopy1Trail2);

  // Outgoing video copy 2 (counterclockwise rotation, inverted phase)
  const outgoingCopy2 = createVideoAtom(
    'outgoing-copy2',
    outgoingVideo.src,
    0,
    outgoingVideo.duration,
    1,
    1,
    'counterclockwise',
    true,
  );
  outgoingCopy2.effects!.push({
    id: 'outgoing-copy2-opacity',
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: outgoingVideo.duration,
      mode: 'provider',
      targetIds: ['outgoing-copy2'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });
  childrenData.push(outgoingCopy2);

  // Outgoing copy 2 trail 1
  const outgoingCopy2Trail1 = createVideoAtom(
    'outgoing-copy2-trail1',
    outgoingVideo.src,
    0.05,
    outgoingVideo.duration - 0.05,
    0,
    0.3,
    'counterclockwise',
    true,
  );
  childrenData.push(outgoingCopy2Trail1);

  // Outgoing copy 2 trail 2
  const outgoingCopy2Trail2 = createVideoAtom(
    'outgoing-copy2-trail2',
    outgoingVideo.src,
    0.1,
    outgoingVideo.duration - 0.1,
    -1,
    0.2,
    'counterclockwise',
    true,
  );
  childrenData.push(outgoingCopy2Trail2);

  // Incoming video copy 1 (clockwise rotation, inverted phase)
  const incomingStartTime = outgoingVideo.duration - transitionDuration;
  const incomingDuration = incomingVideo.duration + transitionDuration;

  const incomingCopy1 = createVideoAtom(
    'incoming-copy1',
    incomingVideo.src,
    incomingStartTime,
    incomingDuration,
    8,
    1,
    'clockwise',
    true,
  );
  incomingCopy1.effects!.push({
    id: 'incoming-copy1-opacity',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: incomingDuration,
      mode: 'provider',
      targetIds: ['incoming-copy1'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });
  childrenData.push(incomingCopy1);

  // Incoming copy 1 trail 1
  const incomingCopy1Trail1 = createVideoAtom(
    'incoming-copy1-trail1',
    incomingVideo.src,
    incomingStartTime + 0.05,
    incomingDuration - 0.05,
    7,
    0.3,
    'clockwise',
    true,
  );
  childrenData.push(incomingCopy1Trail1);

  // Incoming copy 1 trail 2
  const incomingCopy1Trail2 = createVideoAtom(
    'incoming-copy1-trail2',
    incomingVideo.src,
    incomingStartTime + 0.1,
    incomingDuration - 0.1,
    6,
    0.2,
    'clockwise',
    true,
  );
  childrenData.push(incomingCopy1Trail2);

  // Incoming video copy 2 (counterclockwise rotation, normal phase)
  const incomingCopy2 = createVideoAtom(
    'incoming-copy2',
    incomingVideo.src,
    incomingStartTime,
    incomingDuration,
    5,
    1,
    'counterclockwise',
    false,
  );
  incomingCopy2.effects!.push({
    id: 'incoming-copy2-opacity',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: incomingDuration,
      mode: 'provider',
      targetIds: ['incoming-copy2'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });
  childrenData.push(incomingCopy2);

  // Incoming copy 2 trail 1
  const incomingCopy2Trail1 = createVideoAtom(
    'incoming-copy2-trail1',
    incomingVideo.src,
    incomingStartTime + 0.05,
    incomingDuration - 0.05,
    4,
    0.3,
    'counterclockwise',
    false,
  );
  childrenData.push(incomingCopy2Trail1);

  // Incoming copy 2 trail 2
  const incomingCopy2Trail2 = createVideoAtom(
    'incoming-copy2-trail2',
    incomingVideo.src,
    incomingStartTime + 0.1,
    incomingDuration - 0.1,
    3,
    0.2,
    'counterclockwise',
    false,
  );
  childrenData.push(incomingCopy2Trail2);

  // Root container with perspective and 3D transforms
  const rootContainer: RenderableComponentData = {
    id: 'dna-helix-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d',
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
    childrenData,
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
  id: 'dna-helix-transition',
  title: 'DNA Helix Transition',
  description:
    'Smooth helical DNA-twist transition where videos spiral around each other like a double helix during overlap. Outgoing and incoming videos split into dual copies that rotate in opposite directions (rotateY 0→180deg and 0→-180deg) while moving along horizontal sine-wave paths with vertical oscillations. Uses transform3d with perspective for depth, opacity transitions (1→0 and 0→1), and motion blur via semi-transparent time-offset duplicates. Perfect for organic, science-themed transitions with weaving z-index helix effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'dna', 'helix', '3d', 'rotation', 'science', 'organic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2,
    horizontalAmplitude: 200,
    verticalAmplitude: 100,
    perspective: 1000,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const dnaHelixTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
